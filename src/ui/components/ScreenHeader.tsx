/**
 * Sticky screen header (tasks 2.3, 2.4): a back control and a title, shared by
 * the tech, roster, and worldgate screens so navigation stays consistent.
 * Touch target ≥ 44px (ARCHITECTURE §10).
 */
import { buttonStyle, theme } from "../theme.js";

export function ScreenHeader({ title, onBack }: { title: string; onBack: () => void }) {
  return (
    <header
      style={{
        position: "sticky",
        top: 0,
        zIndex: 1,
        display: "flex",
        alignItems: "center",
        gap: "0.5rem",
        padding: "0.5rem 0.75rem",
        background: theme.surface,
        borderBottom: `1px solid ${theme.border}`,
      }}
    >
      <button type="button" style={buttonStyle("ghost")} onClick={onBack}>
        ← Base
      </button>
      <h1 style={{ margin: 0, fontSize: "1.15rem", flex: 1 }}>{title}</h1>
    </header>
  );
}
