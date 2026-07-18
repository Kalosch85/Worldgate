/**
 * Resources bar (task 2.2). Day + the four campaign resources + the support
 * meter (variables.support, which gates income — ARCHITECTURE §5, economy §5).
 * Renders as a wrapping row of chips so it stays readable in portrait.
 */
import type { CSSProperties } from "react";
import type { GameStateT } from "../../data/schemas.js";
import { theme } from "../theme.js";

const chip: CSSProperties = {
  display: "flex",
  flexDirection: "column",
  gap: 2,
  minWidth: 64,
  padding: "0.4rem 0.7rem",
  borderRadius: 10,
  background: theme.surfaceAlt,
  border: `1px solid ${theme.border}`,
};

const labelStyle: CSSProperties = {
  fontSize: "0.7rem",
  letterSpacing: "0.06em",
  textTransform: "uppercase",
  color: theme.textDim,
};

const valueStyle: CSSProperties = { fontSize: "1.1rem", fontWeight: 600, color: theme.text };

function Stat({ label, value }: { label: string; value: number | string }) {
  return (
    <div style={chip}>
      <span style={labelStyle}>{label}</span>
      <span style={valueStyle}>{value}</span>
    </div>
  );
}

export function ResourceBar({ state }: { state: GameStateT }) {
  const { funds, materials, intel, exotics } = state.resources;
  const support = state.variables.support ?? 0;
  return (
    <div
      style={{
        display: "flex",
        flexWrap: "wrap",
        gap: "0.5rem",
        padding: "0.75rem",
        background: theme.surface,
        borderBottom: `1px solid ${theme.border}`,
      }}
    >
      <Stat label="Day" value={state.campaign.day} />
      <Stat label="Funds" value={funds} />
      <Stat label="Materials" value={materials} />
      <Stat label="Intel" value={intel} />
      <Stat label="Exotics" value={exotics} />
      <Stat label="Support" value={support} />
    </div>
  );
}
