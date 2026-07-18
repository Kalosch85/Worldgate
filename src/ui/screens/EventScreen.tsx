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
import type { ContentBundleT, Effect, GameStateT, ResourceIdT } from "../../data/schemas.js";
import { buttonStyle, panelStyle, theme } from "../theme.js";

const RESOURCE_LABELS: Record<ResourceIdT, string> = {
  funds: "Funds",
  materials: "Materials",
  intel: "Intel",
  exotics: "Exotics",
};

interface Delta {
  label: string;
  delta: number;
}

interface Completion {
  label: string;
  deltas: Delta[];
  debrief: boolean;
}

/** Prettify a variable id for display: `trust_rival` → "Trust rival". */
function variableLabel(name: string): string {
  const spaced = name.replace(/_/g, " ");
  return spaced.charAt(0).toUpperCase() + spaced.slice(1);
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
  onDone,
}: {
  state: GameStateT;
  content: ContentBundleT;
  dispatch: (action: Action) => void;
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
      const debrief = (active.gatedSeen || nodeGated) && !state.settings.showLockedOptions;
      setCompletion({
        label: outcome?.label ?? "",
        deltas: visibleDeltas([...option.effects, ...(outcome?.effects ?? [])]),
        debrief,
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
      <section style={panelStyle} aria-label="Mission outcome">
        <div
          style={{
            fontSize: "0.7rem",
            fontWeight: 700,
            textTransform: "uppercase",
            letterSpacing: "0.05em",
            color: theme.accent,
          }}
        >
          Mission complete
        </div>
        <h2 style={{ margin: "0.35rem 0 0.75rem", fontSize: "1.3rem" }}>{completion.label}</h2>
        <DeltaList deltas={completion.deltas} emptyText="No immediate change." />
        {completion.debrief && (
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
            A different team composition might have opened other approaches.
          </p>
        )}
        <button
          type="button"
          style={{ ...buttonStyle("primary"), width: "100%", marginTop: "1rem" }}
          onClick={onDone}
        >
          Return to base
        </button>
      </section>,
    );
  }

  // Defensive: no active narrative mission and no captured completion.
  if (!active || !node) {
    return shell(
      <section style={panelStyle}>
        <p style={{ margin: 0, color: theme.textDim }}>No active mission.</p>
        <button
          type="button"
          style={{ ...buttonStyle("primary"), width: "100%", marginTop: "1rem" }}
          onClick={onDone}
        >
          Return to base
        </button>
      </section>,
    );
  }

  const showLocked = state.settings.showLockedOptions;

  return shell(
    <>
      <section style={panelStyle} aria-label="Narrative">
        {node.speaker && (
          <div style={{ fontWeight: 700, color: theme.accent, marginBottom: "0.35rem" }}>{node.speaker}</div>
        )}
        <p style={{ margin: 0, lineHeight: 1.5 }}>{node.text}</p>
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

      <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
        {node.options.map((option) => {
          const status = eligibility.get(option.id);
          const eligible = status?.eligible ?? false;
          if (!eligible && !showLocked) return null; // D-1: hide ineligible by default
          return (
            <button
              key={option.id}
              type="button"
              disabled={!eligible}
              onClick={() => choose(option.id)}
              style={{
                ...buttonStyle("ghost"),
                width: "100%",
                height: "auto",
                minHeight: theme.touch,
                padding: "0.6rem 0.8rem",
                textAlign: "left",
                opacity: eligible ? 1 : 0.4,
              }}
            >
              {eligible ? option.text : `🔒 ${option.text}`}
            </button>
          );
        })}
      </div>
    </>,
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
