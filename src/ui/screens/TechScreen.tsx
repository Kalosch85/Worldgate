/**
 * Tech screen (task 2.3): the research tree. Shows each tech's cost, prereqs,
 * and status; starting research dispatches `startResearch` (economy §3),
 * pre-validated with `canStartResearch` so ineligible techs are disabled rather
 * than throwing. Switching techs is allowed and discards current progress — the
 * UI warns before it does. Portrait-friendly, touch targets ≥ 44px.
 */
import { canStartResearch } from "../../core/economy.js";
import type { ContentBundleT, GameStateT } from "../../data/schemas.js";
import type { Action } from "../../core/reducer.js";
import { ScreenHeader } from "../components/ScreenHeader.js";
import { buttonStyle, panelStyle, theme } from "../theme.js";

type TechDefT = ContentBundleT["techs"][number];
type TechStatus = "completed" | "inProgress" | "available" | "locked";

function statusOf(state: GameStateT, tech: TechDefT, content: ContentBundleT): TechStatus {
  if (state.research.completed.includes(tech.id)) return "completed";
  if (state.research.current?.tech === tech.id) return "inProgress";
  return canStartResearch(state, content, tech.id) ? "available" : "locked";
}

const STATUS_META: Record<TechStatus, { label: string; color: string }> = {
  completed: { label: "Researched", color: theme.good },
  inProgress: { label: "In progress", color: theme.accent },
  available: { label: "Available", color: theme.text },
  locked: { label: "Locked", color: theme.textDim },
};

export function TechScreen({
  state,
  content,
  dispatch,
  onBack,
}: {
  state: GameStateT;
  content: ContentBundleT;
  dispatch: (action: Action) => void;
  onBack: () => void;
}) {
  const current = state.research.current;
  const currentDef = current ? content.techs.find((t) => t.id === current.tech) : undefined;

  return (
    <div
      style={{ minHeight: "100dvh", background: theme.bg, color: theme.text, fontFamily: theme.fontFamily }}
    >
      <ScreenHeader title="Research" onBack={onBack} />
      <main
        style={{
          display: "flex",
          flexDirection: "column",
          gap: "0.75rem",
          padding: "0.75rem",
          maxWidth: 640,
          margin: "0 auto",
        }}
      >
        <section style={panelStyle} aria-label="Current research">
          <h2 style={{ margin: "0 0 0.4rem", fontSize: "1rem" }}>Current research</h2>
          {current && currentDef ? (
            <>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                <span style={{ fontWeight: 600 }}>{currentDef.name}</span>
                <span style={{ color: theme.textDim, fontVariantNumeric: "tabular-nums" }}>
                  {Math.floor(current.progress)} / {currentDef.cost} RP
                </span>
              </div>
              <div
                style={{
                  height: 8,
                  borderRadius: 999,
                  background: theme.surfaceAlt,
                  border: `1px solid ${theme.border}`,
                  overflow: "hidden",
                }}
              >
                <div
                  style={{
                    height: "100%",
                    width: `${Math.min(100, (current.progress / currentDef.cost) * 100)}%`,
                    background: theme.accent,
                  }}
                />
              </div>
            </>
          ) : (
            <p style={{ margin: 0, color: theme.textDim }}>
              Nothing under research. Pick a tech below to begin.
            </p>
          )}
        </section>

        {content.techs.map((tech) => {
          const status = statusOf(state, tech, content);
          const meta = STATUS_META[status];
          const canStart = status === "available";
          // Starting a new tech while another is in progress discards the old
          // progress (economy §3) — warn so the choice is informed.
          const willDiscard = canStart && current !== null && current.tech !== tech.id;
          return (
            <section key={tech.id} style={panelStyle} aria-label={tech.name}>
              <header style={{ display: "flex", alignItems: "baseline", gap: "0.5rem", flexWrap: "wrap" }}>
                <h3 style={{ margin: 0, fontSize: "1.05rem", flex: 1, minWidth: 0 }}>{tech.name}</h3>
                <span style={{ fontSize: "0.75rem", fontWeight: 700, color: meta.color }}>{meta.label}</span>
              </header>
              <p style={{ margin: "0.35rem 0", fontSize: "0.85rem", color: theme.textDim }}>
                {tech.description}
              </p>
              <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap", alignItems: "center" }}>
                <span style={{ fontSize: "0.8rem", color: theme.textDim }}>{tech.cost} RP</span>
                {tech.prerequisites.length > 0 && (
                  <span style={{ fontSize: "0.8rem", color: theme.textDim }}>
                    · Requires:{" "}
                    {tech.prerequisites
                      .map((p) => {
                        const pdef = content.techs.find((t) => t.id === p);
                        const met = state.research.completed.includes(p);
                        return `${pdef?.name ?? p}${met ? " ✓" : " ✗"}`;
                      })
                      .join(", ")}
                  </span>
                )}
              </div>
              {status !== "completed" && (
                <button
                  type="button"
                  style={{
                    ...buttonStyle(canStart ? "primary" : "ghost"),
                    width: "100%",
                    marginTop: "0.6rem",
                    opacity: canStart ? 1 : 0.4,
                  }}
                  disabled={!canStart}
                  onClick={() => dispatch({ type: "startResearch", tech: tech.id })}
                >
                  {status === "inProgress"
                    ? "Researching…"
                    : willDiscard
                      ? "Switch research (discards progress)"
                      : "Start research"}
                </button>
              )}
            </section>
          );
        })}
      </main>
    </div>
  );
}
