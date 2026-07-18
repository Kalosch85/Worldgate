/**
 * Personnel assignment (task 2.2). Steppers over the three assignment tracks,
 * dispatching `assignPersonnel` (economy §3). Pre-validates with the exported
 * guard so out-of-range moves are simply disabled rather than throwing.
 */
import type { CSSProperties } from "react";
import { canAssignPersonnel, type PersonnelAssignments } from "../../core/economy.js";
import type { GameStateT } from "../../data/schemas.js";
import type { Action } from "../../core/reducer.js";
import { buttonStyle, panelStyle, theme } from "../theme.js";

type Track = keyof PersonnelAssignments;

const TRACKS: { key: Track; label: string; drives: string }[] = [
  { key: "logistics", label: "Logistics", drives: "funds income" },
  { key: "research", label: "Research", drives: "research points / day" },
  { key: "infirmary", label: "Infirmary", drives: "fatigue & injury recovery" },
];

const stepBtn: CSSProperties = {
  ...buttonStyle("ghost"),
  minWidth: theme.touch,
  padding: 0,
  fontSize: "1.4rem",
};

export function PersonnelPanel({
  state,
  dispatch,
}: {
  state: GameStateT;
  dispatch: (action: Action) => void;
}) {
  const assignments = state.personnel.assignments;
  const assigned = assignments.logistics + assignments.research + assignments.infirmary;
  const idle = state.personnel.total - assigned;

  const set = (key: Track, delta: number) => {
    const next: PersonnelAssignments = { ...assignments, [key]: assignments[key] + delta };
    if (!canAssignPersonnel(state, next)) return;
    dispatch({ type: "assignPersonnel", assignments: next });
  };

  return (
    <section style={panelStyle} aria-label="Personnel">
      <header
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "baseline",
          marginBottom: "0.75rem",
        }}
      >
        <h2 style={{ margin: 0, fontSize: "1.05rem" }}>Personnel</h2>
        <span style={{ color: idle > 0 ? theme.good : theme.textDim, fontSize: "0.9rem" }}>
          {idle} idle / {state.personnel.total}
        </span>
      </header>

      <div style={{ display: "flex", flexDirection: "column", gap: "0.6rem" }}>
        {TRACKS.map(({ key, label, drives }) => {
          const value = assignments[key];
          return (
            <div key={key} style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontWeight: 600 }}>{label}</div>
                <div style={{ fontSize: "0.75rem", color: theme.textDim }}>{drives}</div>
              </div>
              <button
                type="button"
                aria-label={`Remove one from ${label}`}
                style={{ ...stepBtn, opacity: value <= 0 ? 0.4 : 1 }}
                disabled={value <= 0}
                onClick={() => set(key, -1)}
              >
                −
              </button>
              <span style={{ minWidth: "2ch", textAlign: "center", fontSize: "1.2rem", fontWeight: 600 }}>
                {value}
              </span>
              <button
                type="button"
                aria-label={`Add one to ${label}`}
                style={{ ...stepBtn, opacity: idle <= 0 ? 0.4 : 1 }}
                disabled={idle <= 0}
                onClick={() => set(key, 1)}
              >
                +
              </button>
            </div>
          );
        })}
      </div>
    </section>
  );
}
