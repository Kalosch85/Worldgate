/**
 * Battle screen (task 4.3, tactics-engine spec §11). The React host for a
 * tactical mission: it mounts the PixiJS board (BattleCanvas), owns the
 * transient UI selection (which unit, which action mode), turns taps into
 * `battle*` actions through the shared guards, replays the enemy phase from the
 * log at ~300ms per action, and shows the §9 battle-end summary before handing
 * back to the strategic layer.
 *
 * No rules live here (ARCHITECTURE §1): reachable tiles, targets, and hit% all
 * come from `buildBattleView`/`interpretTap` (which call the core guards), and
 * every state change is a dispatched action. Landscape-friendly, touch targets
 * ≥ 44px (§10).
 */
import { useEffect, useMemo, useRef, useState } from "react";
import type { Action } from "../core/reducer.js";
import type { ContentBundleT, Effect, GameStateT } from "../data/schemas.js";
import { NextMissions } from "../ui/components/NextMissions.js";
import { SummaryActions } from "../ui/components/SummaryActions.js";
import { RESOURCE_LABELS, strings, variableLabel } from "../ui/strings.js";
import { buttonStyle, panelStyle, theme } from "../ui/theme.js";
import { BattleCanvas } from "./BattleCanvas.js";
import {
  actablePlayers,
  buildBattleView,
  interactButtonTap,
  interpretTap,
  type Mode,
  type TapResult,
} from "./battleModel.js";
import { buildReplay, type ReplayFrame, type ReplayUnit } from "./replay.js";

/** Ability-bar icons, keyed by ability id and served from `public/assets/`
 * under the Vite base ("/Worldgate/" in production). Abilities without an entry
 * (or whose icon fails to load) simply show the text label. */
const ABILITY_ICONS: Record<string, string> = {
  ab_shot: `${import.meta.env.BASE_URL}assets/abilities/ab-shot.png`,
  ab_patch: `${import.meta.env.BASE_URL}assets/abilities/ab-patch.png`,
};

interface HeroResult {
  name: string;
  hp: number;
  maxHp: number;
  downed: boolean;
  injuries: string[];
}

interface Summary {
  outcome: "victory" | "defeat";
  missionName: string;
  heroes: HeroResult[];
  deltas: { label: string; delta: number }[];
  /** Optional authored recap line from the MissionDef (schema `debrief`). */
  debriefText?: string;
}

/** Player-visible deltas of the mission's victory/defeat effects (mirrors the
 * event screen's rule: resource + variable changes only). */
function visibleDeltas(effects: readonly Effect[]): { label: string; delta: number }[] {
  const out: { label: string; delta: number }[] = [];
  for (const e of effects) {
    if (e.type === "resource") out.push({ label: RESOURCE_LABELS[e.resource], delta: e.delta });
    else if (e.type === "variable") out.push({ label: variableLabel(e.variable), delta: e.delta });
  }
  return out;
}

const signed = (d: number): string => `${d > 0 ? "+" : "−"}${Math.abs(d)}`;

type ReplayState = { frames: ReplayFrame[]; index: number; baseLogLen: number };

export function BattleScreen({
  state,
  content,
  dispatch,
  newlyUnlocked,
  onExit,
}: {
  state: GameStateT;
  content: ContentBundleT;
  dispatch: (action: Action) => void;
  newlyUnlocked: readonly string[];
  onExit: () => void;
}) {
  const active = state.activeMission?.kind === "tactical" ? state.activeMission : null;

  const [selectedUnit, setSelectedUnit] = useState<string | null>(null);
  const [mode, setMode] = useState<Mode>({ kind: "move" });
  const [replay, setReplay] = useState<ReplayState | null>(null);
  const [summary, setSummary] = useState<Summary | null>(null);
  const [showLog, setShowLog] = useState(false);
  // Non-null while the unspent-AP confirmation is open: the names of the units
  // that can still act (spec §11).
  const [confirmEnd, setConfirmEnd] = useState<string[] | null>(null);
  // Transient feedback for an interactable tap that couldn't act (§11): the
  // reason text, shown as a brief toast. A counter keys each show so repeated
  // identical messages still re-trigger the auto-dismiss.
  const [toast, setToast] = useState<{ text: string; key: number } | null>(null);
  const toastSeq = useRef(0);

  // Battle-end capture: the last live battle (pre-terminal action), the launched
  // squad, the mission id, and each hero's wound count at battle start — enough
  // to reconstruct the §9 summary once the reducer clears activeMission.
  const lastBattleRef = useRef<GameStateT["activeMission"]>(null);
  const startWoundsRef = useRef<Map<string, number> | null>(null);
  const missionRef = useRef<{ id: string; squad: string[] } | null>(null);
  const pendingEndTurnRef = useRef<{ prevUnits: ReplayUnit[]; prevLogLen: number } | null>(null);

  // Snapshot per-hero wound counts once, when the battle first appears.
  if (active && startWoundsRef.current === null) {
    const m = new Map<string, number>();
    for (const heroId of active.squad) {
      const hs = state.heroes.find((h) => h.hero === heroId);
      m.set(heroId, hs ? hs.injuries.filter((i) => i.injury === "inj_wounded").length : 0);
    }
    startWoundsRef.current = m;
    missionRef.current = { id: active.mission, squad: [...active.squad] };
  }
  if (active) lastBattleRef.current = active;

  const replaying = replay !== null;

  // The view the canvas draws. During a replay we drop the selection so no
  // move/target overlay shows over the enemy's turn.
  const view = useMemo(
    () => buildBattleView(state, content, { selectedUnit: replaying ? null : selectedUnit, mode }),
    [state, content, selectedUnit, mode, replaying],
  );

  // Activation flow (spec §11): keep the current unit selected while it still
  // has AP; the moment its activation ends (ability used → ap 0, or AP
  // exhausted) auto-advance to the next player unit with AP in unit-id order
  // (round-robin, wrapping). On entry this lands on the first actable unit.
  // When nobody can act, keep a living player selected so the board still shows
  // a unit.
  useEffect(() => {
    if (replaying || !view) return;
    const cur = view.units.find((u) => u.id === selectedUnit && u.side === "player" && u.alive);
    if (cur && cur.ap > 0) return;
    const actable = actablePlayers(view);
    const next = actable.find((u) => u.id > (selectedUnit ?? "")) ?? actable[0];
    if (next) {
      if (next.id !== selectedUnit) {
        setSelectedUnit(next.id);
        setMode({ kind: "move" });
      }
      return;
    }
    if (cur) return; // spent, but still a valid unit to display
    const anyPlayer = view.units.find((u) => u.side === "player" && u.alive);
    setSelectedUnit(anyPlayer ? anyPlayer.id : null);
    setMode({ kind: "move" });
  }, [view, selectedUnit, replaying]);

  // Latest tap handler in a ref so the stable canvas callback always sees fresh
  // view/mode without re-instantiating Pixi.
  const showToast = (text: string) => {
    toastSeq.current += 1;
    setToast({ text, key: toastSeq.current });
  };

  const applyTap = (result: TapResult) => {
    if (result.kind === "select") {
      setSelectedUnit(result.unit);
      setMode({ kind: "move" });
    } else if (result.kind === "action") {
      dispatchBattle(result.action);
    } else if (result.kind === "message") {
      showToast(result.text);
    }
  };

  const tapRef = useRef<(x: number, y: number) => void>(() => {});
  tapRef.current = (x, y) => {
    if (replaying || summary || !view) return;
    applyTap(interpretTap(view, x, y));
  };

  // Auto-dismiss the feedback toast shortly after it appears.
  useEffect(() => {
    if (!toast) return;
    const id = setTimeout(() => setToast(null), 1800);
    return () => clearTimeout(id);
  }, [toast]);

  // Mount Pixi once; tear it down on unmount.
  const hostRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<BattleCanvas | null>(null);
  const [ready, setReady] = useState(false);
  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;
    const canvas = new BattleCanvas(host, { onTap: (x, y) => tapRef.current(x, y) });
    canvasRef.current = canvas;
    let cancelled = false;
    void canvas.init().then(() => {
      if (!cancelled) setReady(true);
    });
    return () => {
      cancelled = true;
      canvas.destroy();
      canvasRef.current = null;
    };
  }, []);

  // Draw whenever the view or the replay frame changes. In the brief render
  // between dispatching End Turn and the replay being built, draw the pre-phase
  // board (prevUnits) so the enemy's final positions don't flash before the
  // replay rewinds to the start.
  const override: readonly ReplayUnit[] | null = replay
    ? (replay.frames[Math.min(replay.index, replay.frames.length - 1)]?.units ?? null)
    : (pendingEndTurnRef.current?.prevUnits ?? null);
  useEffect(() => {
    if (!ready || !view) return;
    canvasRef.current?.render(view, override);
  }, [ready, view, override]);

  // Step the replay one frame per its delay; clear it when the phase is done.
  useEffect(() => {
    if (!replay) return;
    if (replay.index >= replay.frames.length) {
      const id = setTimeout(() => setReplay(null), 250);
      return () => clearTimeout(id);
    }
    const frame = replay.frames[replay.index]!;
    const id = setTimeout(() => {
      setReplay((r) => (r ? { ...r, index: r.index + 1 } : null));
    }, frame.delayMs);
    return () => clearTimeout(id);
  }, [replay]);

  /** End Turn is always enabled (spec §5: unspent AP is legal). If any living
   * player unit still has AP, confirm first, listing them; otherwise end the
   * turn immediately. The confirm path dispatches the identical action. */
  const requestEndTurn = () => {
    if (replaying || !view) return;
    const canStillAct = actablePlayers(view);
    if (canStillAct.length === 0) {
      dispatchBattle({ type: "battleEndTurn" });
      return;
    }
    setConfirmEnd(canStillAct.map((u) => u.name));
  };

  const confirmEndTurn = () => {
    setConfirmEnd(null);
    dispatchBattle({ type: "battleEndTurn" });
  };

  /** Dispatch a battle action, arming enemy-phase replay for End Turn and the
   * §9 summary if the action ends the battle. */
  const dispatchBattle = (action: Action) => {
    if (action.type === "battleEndTurn" && active) {
      pendingEndTurnRef.current = {
        prevUnits: active.battle.units.map((u) => ({ id: u.id, pos: { ...u.pos }, hp: u.hp })),
        prevLogLen: active.battle.log.length,
      };
    }
    dispatch(action);
  };

  // React to the post-dispatch state: start a replay, or build the summary.
  useEffect(() => {
    const nowActive = state.activeMission?.kind === "tactical" ? state.activeMission : null;

    if (!nowActive) {
      // Battle resolved — build the summary once (spec §9).
      if (!summary && missionRef.current) {
        pendingEndTurnRef.current = null;
        setSummary(buildSummary());
      }
      return;
    }

    // Battle continues — if that was an End Turn, replay the enemy phase.
    const pending = pendingEndTurnRef.current;
    if (pending) {
      pendingEndTurnRef.current = null;
      const newLines = nowActive.battle.log.slice(pending.prevLogLen);
      const frames = buildReplay(pending.prevUnits, newLines);
      if (frames.length > 0) {
        setReplay({ frames, index: 0, baseLogLen: pending.prevLogLen });
        setShowLog(true);
      }
    }
  }, [state]);

  function buildSummary(): Summary {
    const ref = missionRef.current!;
    const def = content.missions.find((m) => m.id === ref.id);
    const lastBattle = lastBattleRef.current?.kind === "tactical" ? lastBattleRef.current.battle : null;
    const completed = state.missions.completed[state.missions.completed.length - 1];
    const outcome = completed?.outcome === "defeat" ? "defeat" : "victory";
    const startWounds = startWoundsRef.current ?? new Map<string, number>();

    const heroes: HeroResult[] = ref.squad.map((heroId) => {
      const heroDef = content.heroes.find((h) => h.id === heroId);
      const hs = state.heroes.find((h) => h.hero === heroId);
      const unit = lastBattle?.units.find((u) => u.hero === heroId);
      const woundsNow = hs ? hs.injuries.filter((i) => i.injury === "inj_wounded").length : 0;
      const woundedThisBattle = woundsNow > (startWounds.get(heroId) ?? 0);
      const downed = (unit?.hp ?? 0) === 0 || woundedThisBattle;
      return {
        name: heroDef?.name ?? heroId,
        hp: downed ? 0 : (unit?.hp ?? 0),
        maxHp: 5,
        downed,
        injuries: (hs?.injuries ?? [])
          .map((i) => content.injuries.find((d) => d.id === i.injury)?.name ?? i.injury)
          .filter((v, idx, arr) => arr.indexOf(v) === idx),
      };
    });

    const effects = def ? (outcome === "victory" ? def.victoryEffects : def.defeatEffects) : [];
    return {
      outcome,
      missionName: def?.name ?? ref.id,
      heroes,
      deltas: visibleDeltas(effects),
      // A MissionDef carries a single recap line — the mission's success
      // debrief. A defeat is already communicated by the outcome banner and
      // effects, so the authored recap only shows on victory.
      debriefText: outcome === "victory" ? def?.debrief : undefined,
    };
  }

  // ------------------------------------------------------------------ summary
  if (summary) {
    return (
      <SummaryScreen
        summary={summary}
        state={state}
        newlyUnlocked={newlyUnlocked}
        content={content}
        onExit={onExit}
        onContinue={(missionId) => {
          // §2a: launch the operation's next mission directly with the locked
          // squad. Reset the battle-capture refs so a fresh battle rebuilds
          // cleanly; the screen unmounts for a tactical→narrative hop anyway.
          setSummary(null);
          missionRef.current = null;
          startWoundsRef.current = null;
          lastBattleRef.current = null;
          dispatch({ type: "launchMission", mission: missionId, squad: state.deployment?.squad ?? [] });
        }}
      />
    );
  }

  // A battle just resolved but the summary effect hasn't committed yet — render
  // a neutral placeholder for that one frame instead of flashing "No battle".
  if ((!active || !view) && missionRef.current) {
    return <Shell />;
  }

  // Defensive: no tactical battle ever started and no captured summary.
  if (!active || !view) {
    return (
      <Shell>
        <section style={{ ...panelStyle, margin: "1rem" }}>
          <p style={{ margin: 0, color: theme.textDim }}>{strings.battle.noActiveBattle}</p>
          <button
            type="button"
            style={{ ...buttonStyle("primary"), width: "100%", marginTop: "1rem" }}
            onClick={onExit}
          >
            {strings.common.returnToBase}
          </button>
        </section>
      </Shell>
    );
  }

  const visibleLog = replay
    ? view.log.slice(
        0,
        replay.baseLogLen + (replay.frames[Math.min(replay.index, replay.frames.length - 1)]?.revealed ?? 0),
      )
    : view.log;

  const interactConsole = view.consoles.find((c) => c.reachableNext);

  return (
    <Shell>
      {/* Turn / round banner */}
      <header
        style={{
          display: "flex",
          alignItems: "center",
          gap: "0.6rem",
          padding: "0.5rem 0.75rem",
          background: theme.surface,
          borderBottom: `1px solid ${theme.border}`,
        }}
      >
        <strong style={{ fontSize: "1.05rem" }}>{view.banner}</strong>
        <span
          style={{
            fontSize: "0.7rem",
            fontWeight: 700,
            textTransform: "uppercase",
            letterSpacing: "0.05em",
            color: replaying ? theme.danger : theme.good,
          }}
        >
          {replaying ? strings.battle.enemyPhase : strings.battle.yourTurn}
        </span>
        <span style={{ marginLeft: "auto", fontSize: "0.8rem", color: theme.textDim }}>{view.objective}</span>
      </header>

      {/* Board — the Pixi canvas fills this area; it centers the map and owns
          pinch-zoom + two-finger pan internally (spec §11), so no DOM scroll or
          flex centering here (that clipped the outer rows/columns). */}
      <div style={{ flex: 1, minHeight: 0, background: theme.bg }}>
        <div ref={hostRef} style={{ width: "100%", height: "100%", touchAction: "none", lineHeight: 0 }} />
      </div>

      {/* Scrolling log (toggle) */}
      {showLog && (
        <div
          ref={(el) => {
            if (el) el.scrollTop = el.scrollHeight;
          }}
          style={{
            maxHeight: 96,
            overflowY: "auto",
            padding: "0.4rem 0.75rem",
            fontSize: "0.75rem",
            lineHeight: 1.5,
            color: theme.textDim,
            background: theme.surface,
            borderTop: `1px solid ${theme.border}`,
            fontFamily: "ui-monospace, Menlo, monospace",
          }}
        >
          {visibleLog.map((line, i) => (
            <div key={i}>{line}</div>
          ))}
        </div>
      )}

      {/* Ability bar */}
      <footer
        style={{
          display: "flex",
          flexWrap: "wrap",
          gap: "0.4rem",
          padding: "0.5rem 0.6rem",
          background: theme.surface,
          borderTop: `1px solid ${theme.border}`,
        }}
      >
        <BarButton
          label={strings.battle.move}
          hint={view.selectedUnit ? "" : strings.battle.selectAUnit}
          active={mode.kind === "move"}
          disabled={replaying || !view.selectedUnit}
          onClick={() => setMode({ kind: "move" })}
        />
        {view.abilities.map((ab) => (
          <BarButton
            key={ab.id}
            label={ab.name}
            icon={ABILITY_ICONS[ab.id]}
            hint={ab.cooldown > 0 ? strings.battle.cooldown(ab.cooldown) : strings.battle.ap(ab.apCost)}
            active={ab.active}
            disabled={replaying || !ab.ready}
            onClick={() => setMode({ kind: "ability", ability: ab.id })}
          />
        ))}
        <BarButton
          label={strings.battle.interact}
          hint={interactConsole ? strings.battle.ap(1) : "—"}
          active={mode.kind === "interact"}
          // §11: a feedback affordance, not a silent disabled no-op. Enabled
          // whenever a console still needs activating; press surfaces the reason.
          disabled={replaying || !view.consoles.some((c) => c.isNext)}
          onClick={() => applyTap(interactButtonTap(view))}
        />
        <button
          type="button"
          style={{ ...buttonStyle("ghost"), minWidth: 44 }}
          onClick={() => setShowLog((s) => !s)}
          aria-pressed={showLog}
        >
          {showLog ? strings.battle.hideLog : strings.battle.log}
        </button>
        <button
          type="button"
          style={{ ...buttonStyle("primary"), marginLeft: "auto", opacity: replaying ? 0.5 : 1 }}
          disabled={replaying}
          onClick={requestEndTurn}
        >
          {strings.battle.endTurn}
        </button>
      </footer>

      {confirmEnd && (
        <EndTurnConfirm names={confirmEnd} onCancel={() => setConfirmEnd(null)} onConfirm={confirmEndTurn} />
      )}

      {toast && <Toast key={toast.key} text={toast.text} />}
    </Shell>
  );
}

/** Brief, non-blocking feedback for an interact tap that couldn't act (§11). */
function Toast({ text }: { text: string }) {
  return (
    <div
      role="status"
      style={{
        position: "fixed",
        left: "50%",
        bottom: "5.5rem",
        transform: "translateX(-50%)",
        maxWidth: "90%",
        padding: "0.5rem 0.9rem",
        borderRadius: 8,
        background: "rgba(0,0,0,0.82)",
        color: theme.text,
        border: `1px solid ${theme.border}`,
        fontSize: "0.85rem",
        fontWeight: 600,
        textAlign: "center",
        pointerEvents: "none",
        zIndex: 60,
      }}
    >
      {text}
    </div>
  );
}

/** Unspent-AP confirmation (spec §11). Lists the units that can still act and
 * offers cancel / end-turn; confirming dispatches the same `battleEndTurn`. */
function EndTurnConfirm({
  names,
  onCancel,
  onConfirm,
}: {
  names: string[];
  onCancel: () => void;
  onConfirm: () => void;
}) {
  const count = names.length;
  return (
    <div
      role="dialog"
      aria-modal="true"
      style={{
        position: "fixed",
        inset: 0,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "1rem",
        background: "rgba(0,0,0,0.6)",
        zIndex: 50,
      }}
      onClick={onCancel}
    >
      <section style={{ ...panelStyle, maxWidth: 360, width: "100%" }} onClick={(e) => e.stopPropagation()}>
        <p style={{ margin: "0 0 0.6rem", fontWeight: 600 }}>{strings.battle.stillActPrompt(count)}</p>
        <p style={{ margin: "0 0 1rem", fontSize: "0.85rem", color: theme.textDim }}>{names.join(", ")}</p>
        <div style={{ display: "flex", gap: "0.5rem" }}>
          <button type="button" style={{ ...buttonStyle("ghost"), flex: 1 }} onClick={onCancel}>
            {strings.battle.cancel}
          </button>
          <button type="button" style={{ ...buttonStyle("primary"), flex: 1 }} onClick={onConfirm}>
            {strings.battle.endTurnAnyway}
          </button>
        </div>
      </section>
    </div>
  );
}

function Shell({ children }: { children?: React.ReactNode }) {
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        height: "100dvh",
        background: theme.bg,
        color: theme.text,
        fontFamily: theme.fontFamily,
      }}
    >
      {children}
    </div>
  );
}

function BarButton({
  label,
  hint,
  active,
  disabled,
  onClick,
  icon,
}: {
  label: string;
  hint: string;
  active: boolean;
  disabled: boolean;
  onClick: () => void;
  icon?: string;
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      style={{
        ...buttonStyle(active ? "primary" : "ghost"),
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        gap: 0,
        padding: "0.3rem 0.7rem",
        opacity: disabled ? 0.4 : 1,
      }}
    >
      {icon && (
        <img
          src={icon}
          alt=""
          aria-hidden="true"
          width={22}
          height={22}
          style={{ imageRendering: "pixelated", marginBottom: 1 }}
        />
      )}
      <span style={{ fontWeight: 600, fontSize: "0.9rem" }}>{label}</span>
      {hint && <span style={{ fontSize: "0.62rem", opacity: 0.8 }}>{hint}</span>}
    </button>
  );
}

function SummaryScreen({
  summary,
  state,
  newlyUnlocked,
  content,
  onExit,
  onContinue,
}: {
  summary: Summary;
  state: GameStateT;
  newlyUnlocked: readonly string[];
  content: ContentBundleT;
  onExit: () => void;
  onContinue: (missionId: string) => void;
}) {
  const win = summary.outcome === "victory";
  return (
    <Shell>
      <main
        style={{
          display: "flex",
          flexDirection: "column",
          gap: "0.75rem",
          padding: "1rem 0.75rem",
          maxWidth: 640,
          margin: "0 auto",
          width: "100%",
          boxSizing: "border-box",
        }}
      >
        <section style={panelStyle}>
          <div
            style={{
              fontSize: "0.7rem",
              fontWeight: 700,
              textTransform: "uppercase",
              letterSpacing: "0.05em",
              color: win ? theme.good : theme.danger,
            }}
          >
            {win ? strings.battle.victory : strings.battle.defeat}
          </div>
          <h2 style={{ margin: "0.35rem 0 0.75rem", fontSize: "1.3rem" }}>{summary.missionName}</h2>

          {summary.debriefText && (
            <p style={{ margin: "0 0 0.75rem", lineHeight: 1.5, color: theme.text }}>{summary.debriefText}</p>
          )}

          <h3 style={{ margin: "0.5rem 0 0.4rem", fontSize: "0.95rem", color: theme.textDim }}>
            {strings.battle.squad}
          </h3>
          <div style={{ display: "flex", flexDirection: "column", gap: "0.4rem" }}>
            {summary.heroes.map((h) => (
              <div
                key={h.name}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "0.5rem",
                  padding: "0.4rem 0.6rem",
                  borderRadius: 8,
                  background: theme.surfaceAlt,
                  border: `1px solid ${theme.border}`,
                }}
              >
                <span style={{ fontWeight: 600, flex: 1 }}>{h.name}</span>
                {h.downed ? (
                  <span style={{ color: theme.danger, fontSize: "0.8rem", fontWeight: 700 }}>
                    {strings.battle.wounded}
                  </span>
                ) : (
                  <span style={{ display: "flex", gap: 2 }} aria-label={strings.battle.hpAria(h.hp, h.maxHp)}>
                    {Array.from({ length: h.maxHp }, (_, i) => (
                      <span
                        key={i}
                        style={{
                          width: 10,
                          height: 10,
                          borderRadius: 2,
                          background: i < h.hp ? theme.good : theme.border,
                        }}
                      />
                    ))}
                  </span>
                )}
              </div>
            ))}
          </div>

          {summary.deltas.length > 0 && (
            <>
              <h3 style={{ margin: "0.9rem 0 0.4rem", fontSize: "0.95rem", color: theme.textDim }}>
                {strings.battle.results}
              </h3>
              <div style={{ display: "flex", flexWrap: "wrap", gap: "0.4rem" }}>
                {summary.deltas.map((d, i) => (
                  <span
                    key={i}
                    style={{
                      fontSize: "0.8rem",
                      fontWeight: 600,
                      color: d.delta > 0 ? theme.good : theme.danger,
                      background: theme.surface,
                      border: `1px solid ${theme.border}`,
                      borderRadius: 6,
                      padding: "0.15rem 0.5rem",
                    }}
                  >
                    {d.label} {signed(d.delta)}
                  </span>
                ))}
              </div>
            </>
          )}

          <NextMissions missionIds={newlyUnlocked} content={content} />

          <SummaryActions
            state={state}
            content={content}
            newlyUnlocked={newlyUnlocked}
            onContinue={onContinue}
            onReturn={onExit}
          />
        </section>
      </main>
    </Shell>
  );
}
