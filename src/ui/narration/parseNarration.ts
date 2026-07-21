/**
 * Word-by-word narration parsing (D-13, presentation only — ARCHITECTURE §1).
 *
 * Pure, DOM-free helpers the event screen uses to animate node text. Kept out
 * of `src/core` because this is UI presentation, not simulation, but factored
 * into a module of its own so the mark grammar is unit-testable without a
 * React render.
 *
 * Pause marks (D-13.2) are standalone " & " / " && " tokens — an ampersand run
 * flanked by whitespace on BOTH sides. That both-sides rule is exactly what
 * separates a mark from a literal ampersand: "A&B" and "A &B" keep the "&",
 * only the freestanding "Tom & Jerry" case is a pause. Marks are never
 * rendered; each collapses to a single space between the surrounding words.
 */
import type { TextAnimationT } from "../../data/schemas.js";

/** Base reveal cadence: ms between words at normal speed (T — tunable). */
export const BASE_WORD_MS = 180;
/** Extra dwell for a " & " short-pause mark, in ms (T — tunable). */
export const SHORT_PAUSE_MS = 600;
/** Extra dwell for a " && " long-pause mark, in ms (T — tunable). */
export const LONG_PAUSE_MS = 1400;

export type PauseKind = "short" | "long";

export interface NarrationToken {
  /** A single word to reveal (no surrounding whitespace). */
  text: string;
  /** A pause mark that immediately followed this word, or null. */
  pauseAfter: PauseKind | null;
}

export interface ParsedNarration {
  /** The finished text: marks stripped, words single-spaced. */
  fullText: string;
  /** Word tokens in reveal order, each tagging any pause that follows it. */
  tokens: NarrationToken[];
}

/**
 * A standalone pause mark: one-or-more whitespace, a run of one or two
 * ampersands, one-or-more whitespace. The flanking whitespace is required on
 * both sides, which is what makes "A&B" ordinary text.
 */
const MARK = /\s+(&&|&)\s+/g;

export function parseNarration(input: string): ParsedNarration {
  const tokens: NarrationToken[] = [];

  // Push a run of plain text as word tokens; the trailing word (if any) carries
  // the pause mark that followed the run.
  const pushSegment = (segment: string, pauseAfter: PauseKind | null): void => {
    const words = segment.split(/\s+/).filter((w) => w.length > 0);
    words.forEach((w, i) => {
      tokens.push({ text: w, pauseAfter: i === words.length - 1 ? pauseAfter : null });
    });
  };

  let cursor = 0;
  let match: RegExpExecArray | null;
  MARK.lastIndex = 0;
  while ((match = MARK.exec(input)) !== null) {
    pushSegment(input.slice(cursor, match.index), match[1] === "&&" ? "long" : "short");
    cursor = MARK.lastIndex;
  }
  pushSegment(input.slice(cursor), null);

  return { fullText: tokens.map((t) => t.text).join(" "), tokens };
}

/** The dwell (ms) of a pause mark. */
export function pauseMs(kind: PauseKind): number {
  return kind === "long" ? LONG_PAUSE_MS : SHORT_PAUSE_MS;
}

/**
 * The delay before revealing the word at `index`, honoring the mode: "off" is
 * instant (0), "fast" halves every timing, and a pause tagged on the PRECEDING
 * word is added to that word's base cadence.
 */
export function wordDelayMs(tokens: readonly NarrationToken[], index: number, mode: TextAnimationT): number {
  if (mode === "off") return 0;
  const prev = index > 0 ? tokens[index - 1] : undefined;
  const pause = prev?.pauseAfter ? pauseMs(prev.pauseAfter) : 0;
  const scale = mode === "fast" ? 0.5 : 1;
  return (BASE_WORD_MS + pause) * scale;
}
