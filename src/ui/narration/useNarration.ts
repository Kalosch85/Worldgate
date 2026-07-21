/**
 * The timer-driven word reveal behind the event screen's narration (D-13).
 *
 * ARCHITECTURE §1/D-13.6: the animation lives entirely in the UI layer and runs
 * on `setTimeout` — never in the reducer. The hook owns how many words are
 * shown; the reducer and GameState are untouched. On completion (or "off", or a
 * skip) the rendered string equals `fullText` exactly, so there is no layout
 * jump between the animated, skipped, and instant paths (D-13.6).
 */
import { useEffect, useMemo, useState } from "react";
import type { TextAnimationT } from "../../data/schemas.js";
import { parseNarration, wordDelayMs } from "./parseNarration.js";

export interface Narration {
  /** The text to render right now — a prefix of `fullText` that grows to it. */
  text: string;
  /** True once every word is shown (immediately so when the mode is "off"). */
  complete: boolean;
  /** Reveal the remaining text at once (tap-to-skip); a no-op once complete. */
  skip: () => void;
}

export function useNarration(source: string, mode: TextAnimationT): Narration {
  const { fullText, tokens } = useMemo(() => parseNarration(source), [source]);
  const total = tokens.length;

  const [count, setCount] = useState(() => (mode === "off" ? total : 0));

  // A new node (source change) restarts the reveal; "off" opens complete.
  useEffect(() => {
    setCount(mode === "off" ? total : 0);
    // Restart is intentionally keyed on the node text alone.
  }, [source]);

  // Flipping the setting to "off" mid-reveal jumps straight to the end.
  useEffect(() => {
    if (mode === "off") setCount(total);
  }, [mode, total]);

  // Reveal the next word after its mode-scaled delay. Clearing on every change
  // means a skip, a mode flip, an unmount, or a node change cancels the pending
  // timer — no stray setState after teardown.
  useEffect(() => {
    if (count >= total) return;
    const id = setTimeout(() => setCount((c) => c + 1), wordDelayMs(tokens, count, mode));
    return () => clearTimeout(id);
  }, [count, total, tokens, mode]);

  const complete = count >= total;
  const text = complete
    ? fullText
    : tokens
        .slice(0, count)
        .map((t) => t.text)
        .join(" ");

  return { text, complete, skip: () => setCount(total) };
}
