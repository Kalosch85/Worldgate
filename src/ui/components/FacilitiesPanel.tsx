/**
 * Facilities panel (facilities spec §5). Base construction on the strategic
 * home screen: the built list, the current build's progress row, and the
 * buildable list with costs, build time, and unmet-prerequisite state.
 *
 * Facilities are not narrative options — D-1 does not apply, so locked
 * (prereq-unmet) facilities are always shown, greyed. All rules come from the
 * `construction.ts` selectors; the panel only dispatches `build` (ARCHITECTURE §1).
 */
import { facilityStatuses } from "../../core/construction.js";
import type { Action } from "../../core/reducer.js";
import type { ContentBundleT, GameStateT } from "../../data/schemas.js";
import { buttonStyle, panelStyle, theme } from "../theme.js";

export function FacilitiesPanel({
  state,
  content,
  dispatch,
}: {
  state: GameStateT;
  content: ContentBundleT;
  dispatch: (action: Action) => void;
}) {
  const statuses = facilityStatuses(state, content);
  const built = statuses.filter((s) => s.built);
  const buildable = statuses.filter((s) => !s.built && !s.building);

  const current = state.construction.current;
  const currentStatus = statuses.find((s) => s.building);

  return (
    <section style={panelStyle} aria-label="Facilities">
      <header style={{ marginBottom: "0.75rem" }}>
        <h2 style={{ margin: 0, fontSize: "1.05rem" }}>Facilities</h2>
      </header>

      {current && currentStatus && (
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "baseline",
            gap: "0.75rem",
            padding: "0.6rem 0.75rem",
            marginBottom: "0.75rem",
            borderRadius: 10,
            background: theme.surfaceAlt,
            border: `1px solid ${theme.accent}`,
          }}
        >
          <span style={{ fontWeight: 600 }}>Building: {currentStatus.def.name}</span>
          <span style={{ color: theme.textDim, fontSize: "0.85rem" }}>
            {current.daysRemaining} day{current.daysRemaining === 1 ? "" : "s"} left
          </span>
        </div>
      )}

      {built.length > 0 && (
        <div style={{ marginBottom: "0.75rem" }}>
          <div style={{ fontSize: "0.75rem", color: theme.textDim, marginBottom: "0.35rem" }}>Built</div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: "0.4rem" }}>
            {built.map((s) => (
              <span
                key={s.def.id}
                style={{
                  padding: "0.25rem 0.6rem",
                  borderRadius: 999,
                  background: theme.surfaceAlt,
                  border: `1px solid ${theme.border}`,
                  color: theme.good,
                  fontSize: "0.8rem",
                }}
              >
                ✓ {s.def.name}
              </span>
            ))}
          </div>
        </div>
      )}

      <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
        {buildable.map((s) => (
          <div
            key={s.def.id}
            style={{
              display: "flex",
              alignItems: "center",
              gap: "0.75rem",
              opacity: s.prereqMet ? 1 : 0.5,
            }}
          >
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontWeight: 600 }}>{s.def.name}</div>
              <div style={{ fontSize: "0.75rem", color: theme.textDim }}>
                {s.def.cost.funds}⨎ · {s.def.cost.materials}▪ · {s.def.buildDays}d
                {!s.prereqMet && " · locked"}
              </div>
            </div>
            <button
              type="button"
              style={{ ...buttonStyle("ghost"), opacity: s.buildable ? 1 : 0.4 }}
              disabled={!s.buildable}
              onClick={() => dispatch({ type: "build", facility: s.def.id })}
            >
              Build
            </button>
          </div>
        ))}
      </div>
    </section>
  );
}
