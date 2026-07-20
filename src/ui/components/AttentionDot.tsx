/**
 * Attention affordance — a small pulsing dot the strategic nav overlays on a
 * button that needs the player's attention (research idle, a new mission
 * available). Touch-first and hover-free (ARCHITECTURE §10): the pulse is the
 * whole signal, so it reads on a phone with no pointer.
 *
 * Keyframes can't live in an inline style, so the component ships its own scoped
 * `<style>`. The rule is idempotent — repeating an identical `@keyframes` across
 * instances is harmless — and honors `prefers-reduced-motion`.
 */
import { theme } from "../theme.js";

const PULSE_CSS = `
@keyframes wg-attention-pulse {
  0%, 100% { transform: scale(1); opacity: 1; }
  50% { transform: scale(1.5); opacity: 0.5; }
}
.wg-attention-dot { animation: wg-attention-pulse 1.6s ease-in-out infinite; }
@media (prefers-reduced-motion: reduce) {
  .wg-attention-dot { animation: none; }
}
`;

/** A pulsing dot, positioned by its parent (the nav button is `position:
 * relative`; this sits at its top-right corner). `label` names it for assistive
 * tech and for tests. */
export function AttentionDot({ label }: { label: string }) {
  return (
    <>
      <style>{PULSE_CSS}</style>
      <span
        className="wg-attention-dot"
        role="status"
        aria-label={label}
        style={{
          position: "absolute",
          top: -4,
          right: -4,
          width: 12,
          height: 12,
          borderRadius: "50%",
          background: theme.accent,
          border: `2px solid ${theme.surface}`,
          boxShadow: `0 0 6px ${theme.accent}`,
          pointerEvents: "none",
        }}
      />
    </>
  );
}
