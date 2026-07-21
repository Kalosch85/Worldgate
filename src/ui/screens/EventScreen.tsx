/**
 * Narrative event screen (task 3.3, docs/specs/narrative-engine.md §8). The
 * full-screen pane a launched narrative mission (or a fired incident) takes
 * over until it resolves: speaker line, body text, and option buttons (eligible
 * only by default, D-1). Each choice runs through the `chooseEventOption` action
 * — the UI implements no rules (ARCHITECTURE §1) — and surfaces an immediate
 * consequence toast of the resource/variable deltas the player can see (flags
 * and queued events stay silent by design, D-2). On the terminal option a
 * completion panel shows the outcome, its visible effects, and the debrief hint.
 *
 * Completion note: `chooseEventOption` clears `activeMission` on the terminal
 * choice, so the completion summary is captured locally from the chosen option
 * and its outcome and rendered even though the mission is already gone from
 * state. Portrait-friendly, touch targets ≥ 44px (ARCHITECTURE §10).
 */
import { useMemo, useState, type ReactNode } from "react";
import { eligibleOptions } from "../../core/narrative.js";
import type { Action } from "../../core/reducer.js";
import type { ContentBundleT, Effect, GameStateT, TextAnimationT } from "../../data/schemas.js";
import { NextMissions } from "../components/NextMissions.js";
import { SummaryActions } from "../components/SummaryActions.js";
import { WORD_FADE_MS } from "../narration/parseNarration.js";
import { useNarration } from "../narration/useNarration.js";
import { RESOURCE_LABELS, strings, variableLabel } from "../strings.js";
import { buttonStyle, panelStyle, theme } from "../theme.js";

/** Cycle order for the text-speed toggle (D-13.4). */
const TEXT_MODES: readonly TextAnimationT[] = ["on", "fast", "off"];

/**
 * D-13 fade: each revealed word fades in on mount. Injected once as a real
 * stylesheet because the animation needs @keyframes (the app is otherwise
 * inline-styled). prefers-reduced-motion drops the animation entirely.
 */
const NARRATION_CSS = `
@keyframes wg-word-fade { from { opacity: 0; } to { opacity: 1; } }
.wg-word-fade { animation: wg-word-fade ${WORD_FADE_MS}ms ease-out both; }
@media (prefers-reduced-motion: reduce) { .wg-word-fade { animation: none; } }
`;

interface Delta {
  label: string;
  delta: number;
}

interface Completion {
  label: string;
  deltas: Delta[];
  /** The D-1 team-composition hint (an anonymous one-liner, not authored). */
  hint: boolean;
  /** Optional authored recap line from the outcome (schema `debrief`). */
  debriefText?: string;
}

/**
 * The player-visible deltas of an effect list (§8): resource and variable
 * changes only. Flags, queued events, fatigue, xp, and the rest are silent by
 * design (economy of information, D-2).
 */
function visibleDeltas(effects: readonly Effect[]): Delta[] {
  const out: Delta[] = [];
  for (const e of effects) {
    if (e.type === "resource") out.push({ label: RESOURCE_LABELS[e.resource], delta: e.delta });
    else if (e.type === "variable") out.push({ label: variableLabel(e.variable), delta: e.delta });
  }
  return out;
}

function signed(delta: number): string {
  return `${delta > 0 ? "+" : "−"}${Math.abs(delta)}`;
}

export function EventScreen({
  state,
  content,
  dispatch,
  newlyUnlocked,
  onDone,
}: {
  state: GameStateT;
  content: ContentBundleT;
  dispatch: (action: Action) => void;
  newlyUnlocked: readonly string[];
  onDone: () => void;
}) {
  const [completion, setCompletion] = useState<Completion | null>(null);
  const [toast, setToast] = useState<Delta[] | null>(null);

  const active = state.activeMission?.kind === "narrative" ? state.activeMission : null;
  const script = active ? content.events.find((e) => e.id === active.script) : undefined;
  const node = active && script ? script.nodes.find((n) => n.id === active.node) : undefined;

  // Per-option eligibility + squad-gating for the current node (core selector).
  const eligibility = useMemo(() => {
    const map = new Map<string, { eligible: boolean; gatedBySquad: boolean }>();
    for (const o of eligibleOptions(state, content)) {
      map.set(o.option, { eligible: o.eligible, gatedBySquad: o.gatedBySquad });
    }
    return map;
  }, [state, content]);

  // D-13: node text animates word-by-word in the UI layer (never the reducer).
  // Only the narrative node body animates — the completion summary, option
  // labels, and journal appear at once (D-13.5).
  const mode = state.settings.textAnimation;
  const narration = useNarration(node?.text ?? "", mode);

  const cycleTextAnimation = () => {
    const next = TEXT_MODES[(TEXT_MODES.indexOf(mode) + 1) % TEXT_MODES.length] ?? "on";
    dispatch({ type: "updateSettings", patch: { textAnimation: next } });
  };

  const choose = (optionId: string) => {
    if (!node || !script || !active) return;
    const option = node.options.find((o) => o.id === optionId);
    if (!option) return;

    const next = option.next;
    if (next.kind === "end") {
      const outcome = script.outcomes.find((o) => o.id === next.outcome);
      // The debrief hint arms if this node has a squad-gated option now, or
      // gatedSeen was already set on a prior node (mirrors reducer §5.2/§6).
      const nodeGated = node.options.some((o) => eligibility.get(o.id)?.gatedBySquad);
      const hint = (active.gatedSeen || nodeGated) && !state.settings.showLockedOptions;
      setCompletion({
        label: outcome?.label ?? "",
        deltas: visibleDeltas([...option.effects, ...(outcome?.effects ?? [])]),
        hint,
        debriefText: outcome?.debrief,
      });
      setToast(null);
    } else {
      setToast(visibleDeltas(option.effects));
    }
    dispatch({ type: "chooseEventOption", option: optionId });
  };

  const shell = (children: ReactNode) => (
    <div
      style={{ minHeight: "100dvh", background: theme.bg, color: theme.text, fontFamily: theme.fontFamily }}
    >
      <main
        style={{
          display: "flex",
          flexDirection: "column",
          gap: "0.75rem",
          padding: "1rem 0.75rem",
          maxWidth: 640,
          margin: "0 auto",
        }}
      >
        {children}
      </main>
    </div>
  );

  // Completion panel — outcome label, visible effect summary, debrief hint.
  if (completion) {
    return shell(
      <section style={panelStyle} aria-label={strings.event.outcomeAriaLabel}>
        <div
          style={{
            fontSize: "0.7rem",
            fontWeight: 700,
            textTransform: "uppercase",
            letterSpacing: "0.05em",
            color: theme.accent,
          }}
        >
          {strings.event.missionComplete}
        </div>
        <h2 style={{ margin: "0.35rem 0 0.75rem", fontSize: "1.3rem" }}>{completion.label}</h2>
        {completion.debriefText && (
          <p style={{ margin: "0 0 0.75rem", lineHeight: 1.5, color: theme.text }}>
            {completion.debriefText}
          </p>
        )}
        <DeltaList deltas={completion.deltas} emptyText={strings.event.noImmediateChange} />
        <NextMissions missionIds={newlyUnlocked} content={content} />
        {completion.hint && (
          <p
            style={{
              margin: "0.9rem 0 0",
              padding: "0.6rem 0.7rem",
              borderRadius: 8,
              background: theme.surfaceAlt,
              border: `1px solid ${theme.border}`,
              color: theme.textDim,
              fontSize: "0.85rem",
            }}
          >
            {strings.event.teamCompositionHint}
          </p>
        )}
        <SummaryActions
          state={state}
          content={content}
          newlyUnlocked={newlyUnlocked}
          onContinue={(missionId) => {
            // §2a: launch the operation's next mission directly. Clear the local
            // completion so the freshly-launched mission renders (a narrative→
            // narrative hop keeps this screen mounted).
            setCompletion(null);
            dispatch({ type: "launchMission", mission: missionId, squad: state.deployment?.squad ?? [] });
          }}
          onReturn={onDone}
        />
      </section>,
    );
  }

  // Defensive: no active narrative mission and no captured completion.
  if (!active || !node) {
    return shell(
      <section style={panelStyle}>
        <p style={{ margin: 0, color: theme.textDim }}>{strings.event.noActiveMission}</p>
        <button
          type="button"
          style={{ ...buttonStyle("primary"), width: "100%", marginTop: "1rem" }}
          onClick={onDone}
        >
          {strings.common.returnToBase}
        </button>
      </section>,
    );
  }

  const showLocked = state.settings.showLockedOptions;

  return shell(
    <>
      <style>{NARRATION_CSS}</style>
      <div style={{ display: "flex", justifyContent: "flex-end" }}>
        <TextSpeedToggle mode={mode} onCycle={cycleTextAnimation} />
      </div>

      {/* D-13: tapping the box during the reveal fills the rest of the text and
          unlocks the options; a tap once complete does nothing destructive. */}
      <section
        style={{ ...panelStyle, cursor: narration.complete ? "default" : "pointer" }}
        aria-label={strings.event.narrativeAriaLabel}
        onClick={narration.complete ? undefined : narration.skip}
      >
        {node.speaker && (
          <div style={{ fontWeight: 700, color: theme.accent, marginBottom: "0.35rem" }}>{node.speaker}</div>
        )}
        <p style={{ margin: 0, lineHeight: 1.5 }}>
          {narration.words.map((word, i) => (
            // Stable index key: already-mounted words don't re-animate on the
            // next word's arrival — only the freshly added span fades in. A
            // leading space (except the first) keeps rendered text === node text.
            <span key={i} className={mode === "off" ? undefined : "wg-word-fade"}>
              {(i > 0 ? " " : "") + word}
            </span>
          ))}
        </p>
        {!narration.complete && (
          <p style={{ margin: "0.6rem 0 0", fontSize: "0.8rem", color: theme.textDim, fontStyle: "italic" }}>
            {strings.event.skipHint}
          </p>
        )}
      </section>

      {toast && toast.length > 0 && (
        <div
          role="status"
          style={{
            display: "flex",
            flexWrap: "wrap",
            gap: "0.4rem",
            padding: "0.5rem 0.6rem",
            borderRadius: 8,
            background: theme.surfaceAlt,
            border: `1px solid ${theme.border}`,
          }}
        >
          {toast.map((d, i) => (
            <DeltaChip key={i} delta={d} />
          ))}
        </div>
      )}

      {/* D-13.1: options only appear once the node text is fully revealed
          (animation finished, mode "off", or skipped). */}
      {narration.complete && (
        <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
          {node.options.map((option) => {
            const status = eligibility.get(option.id);
            const eligible = status?.eligible ?? false;
            if (!eligible && !showLocked) return null; // hide ineligible when D-15 off
            // D-15: a locked option is greyed out with its authored reason, or a
            // generic hint when the option carries none.
            const lockedReason = eligible
              ? undefined
              : (option.lockedReason ?? strings.event.lockedGenericReason);
            return (
              <button
                key={option.id}
                type="button"
                disabled={!eligible}
                onClick={() => choose(option.id)}
                style={{
                  ...buttonStyle("ghost"),
                  display: "flex",
                  flexDirection: "column",
                  gap: "0.2rem",
                  width: "100%",
                  height: "auto",
                  minHeight: theme.touch,
                  padding: "0.6rem 0.8rem",
                  textAlign: "left",
                  opacity: eligible ? 1 : 0.4,
                }}
              >
                <span>{eligible ? option.text : `🔒 ${option.text}`}</span>
                {lockedReason && (
                  <span style={{ fontSize: "0.8rem", color: theme.textDim, fontStyle: "italic" }}>
                    {lockedReason}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      )}
    </>,
  );
}

/** D-13.4: a compact toggle cycling narration speed on → fast → off. */
function TextSpeedToggle({ mode, onCycle }: { mode: TextAnimationT; onCycle: () => void }) {
  return (
    <button
      type="button"
      onClick={onCycle}
      aria-label={`${strings.event.textSpeedLabel}: ${strings.event.textSpeedMode[mode]}`}
      style={{
        ...buttonStyle("ghost"),
        padding: "0 0.8rem",
        fontSize: "0.85rem",
        color: theme.textDim,
      }}
    >
      {strings.event.textSpeedLabel}: {strings.event.textSpeedMode[mode]}
    </button>
  );
}

function DeltaChip({ delta }: { delta: Delta }) {
  const positive = delta.delta > 0;
  return (
    <span
      style={{
        fontSize: "0.8rem",
        fontWeight: 600,
        color: positive ? theme.good : theme.danger,
        background: theme.surface,
        border: `1px solid ${theme.border}`,
        borderRadius: 6,
        padding: "0.15rem 0.5rem",
      }}
    >
      {delta.label} {signed(delta.delta)}
    </span>
  );
}

function DeltaList({ deltas, emptyText }: { deltas: Delta[]; emptyText: string }) {
  if (deltas.length === 0) {
    return <p style={{ margin: 0, color: theme.textDim, fontSize: "0.85rem" }}>{emptyText}</p>;
  }
  return (
    <div style={{ display: "flex", flexWrap: "wrap", gap: "0.4rem" }}>
      {deltas.map((d, i) => (
        <DeltaChip key={i} delta={d} />
      ))}
    </div>
  );
}
