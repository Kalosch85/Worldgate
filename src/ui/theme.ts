/**
 * Minimal dark-UI design tokens (ARCHITECTURE §10: touch-first, no component
 * library). Plain constants — screens compose inline styles from these so the
 * look stays consistent without a CSS framework.
 */
import type { CSSProperties } from "react";

export const theme = {
  bg: "#0b0f1a",
  surface: "#141a2a",
  surfaceAlt: "#1c2438",
  border: "#2a3450",
  text: "#e8ecf5",
  textDim: "#93a0bd",
  accent: "#4d7cff",
  accentText: "#ffffff",
  danger: "#ff6b6b",
  good: "#4fd18b",
  fontFamily: "system-ui, -apple-system, Segoe UI, Roboto, sans-serif",
  /** Minimum touch target per ARCHITECTURE §10. */
  touch: 44,
} as const;

/** Base button — always meets the 44px touch minimum. */
export function buttonStyle(variant: "primary" | "ghost" | "danger" = "ghost"): CSSProperties {
  const base: CSSProperties = {
    minHeight: theme.touch,
    minWidth: theme.touch,
    padding: "0 1rem",
    borderRadius: 10,
    border: `1px solid ${theme.border}`,
    fontSize: "1rem",
    fontFamily: theme.fontFamily,
    cursor: "pointer",
    background: theme.surfaceAlt,
    color: theme.text,
    touchAction: "manipulation",
  };
  if (variant === "primary") {
    return {
      ...base,
      background: theme.accent,
      borderColor: theme.accent,
      color: theme.accentText,
      fontWeight: 600,
    };
  }
  if (variant === "danger") {
    return { ...base, borderColor: theme.danger, color: theme.danger };
  }
  return base;
}

export const panelStyle: CSSProperties = {
  background: theme.surface,
  border: `1px solid ${theme.border}`,
  borderRadius: 14,
  padding: "1rem",
};
