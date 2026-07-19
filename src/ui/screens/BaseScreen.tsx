/**
 * Base screen (task 2.2): resources bar, personnel assignment, end-day button,
 * and the journal. The strategic home the player returns to between missions.
 * Portrait-friendly, touch targets ≥ 44px (ARCHITECTURE §10).
 */
import type { Action } from "../../core/reducer.js";
import type { ContentBundleT, GameStateT } from "../../data/schemas.js";
import { ResourceBar } from "../components/ResourceBar.js";
import { PersonnelPanel } from "../components/PersonnelPanel.js";
import { FacilitiesPanel } from "../components/FacilitiesPanel.js";
import { Journal } from "../components/Journal.js";
import { buttonStyle, theme } from "../theme.js";

export function BaseScreen({
  state,
  content,
  dispatch,
  onOpenMenu,
  onNavigate,
}: {
  state: GameStateT;
  content: ContentBundleT;
  dispatch: (action: Action) => void;
  onOpenMenu: () => void;
  onNavigate: (screen: "tech" | "roster" | "worldgate") => void;
}) {
  const missionActive = state.activeMission !== null;

  return (
    <div
      style={{ minHeight: "100dvh", background: theme.bg, color: theme.text, fontFamily: theme.fontFamily }}
    >
      <div style={{ position: "sticky", top: 0, zIndex: 1 }}>
        <ResourceBar state={state} />
        <div
          style={{
            display: "flex",
            gap: "0.5rem",
            padding: "0.5rem 0.75rem",
            background: theme.surface,
            borderBottom: `1px solid ${theme.border}`,
          }}
        >
          <button type="button" style={buttonStyle("ghost")} onClick={onOpenMenu}>
            ☰ Menu
          </button>
          <button
            type="button"
            style={{ ...buttonStyle("primary"), flex: 1, opacity: missionActive ? 0.4 : 1 }}
            disabled={missionActive}
            onClick={() => dispatch({ type: "endDay" })}
          >
            End Day →
          </button>
        </div>
      </div>

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
        {missionActive && (
          <p style={{ margin: 0, color: theme.danger }}>
            A mission is in progress. Resolve it before advancing the day.
          </p>
        )}

        <nav style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "0.5rem" }}>
          <button type="button" style={buttonStyle("ghost")} onClick={() => onNavigate("worldgate")}>
            🌐 Worldgate
          </button>
          <button type="button" style={buttonStyle("ghost")} onClick={() => onNavigate("roster")}>
            👥 Roster
          </button>
          <button type="button" style={buttonStyle("ghost")} onClick={() => onNavigate("tech")}>
            🔬 Research
          </button>
        </nav>

        <PersonnelPanel state={state} dispatch={dispatch} />
        <FacilitiesPanel state={state} content={content} dispatch={dispatch} />
        <Journal state={state} />
      </main>
    </div>
  );
}
