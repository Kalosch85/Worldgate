import { describe, expect, it } from "vitest";
import {
  BASE_WORD_MS,
  LONG_PAUSE_MS,
  SHORT_PAUSE_MS,
  parseNarration,
  wordDelayMs,
} from "./parseNarration.js";

/**
 * D-13.2 mark grammar. The mandatory cases: " & " pauses, " && " pauses longer,
 * a bare "A&B" / "Tom & Jerry" distinction (only the freestanding ampersand is a
 * mark), and marked text renders without any mark characters.
 */
describe("parseNarration — pause marks", () => {
  it("treats a freestanding ' & ' as a short pause and drops the mark", () => {
    const { fullText, tokens } = parseNarration("Tom & Jerry");
    expect(fullText).toBe("Tom Jerry");
    expect(fullText).not.toContain("&");
    expect(tokens.map((t) => t.text)).toEqual(["Tom", "Jerry"]);
    // The pause is tagged on the word before the mark.
    expect(tokens[0]?.pauseAfter).toBe("short");
    expect(tokens[1]?.pauseAfter).toBeNull();
  });

  it("treats a freestanding ' && ' as a long pause and drops the mark", () => {
    const { fullText, tokens } = parseNarration("Warte && lauf");
    expect(fullText).toBe("Warte lauf");
    expect(fullText).not.toContain("&");
    expect(tokens[0]?.pauseAfter).toBe("long");
  });

  it("a long pause dwells longer than a short pause", () => {
    const short = parseNarration("a & b").tokens;
    const long = parseNarration("a && b").tokens;
    // The delay before the second word carries the preceding mark's dwell.
    expect(wordDelayMs(long, 1, "on")).toBeGreaterThan(wordDelayMs(short, 1, "on"));
    expect(wordDelayMs(short, 1, "on")).toBe(BASE_WORD_MS + SHORT_PAUSE_MS);
    expect(wordDelayMs(long, 1, "on")).toBe(BASE_WORD_MS + LONG_PAUSE_MS);
  });

  it("keeps an ampersand with no flanking space as ordinary text (A&B)", () => {
    const { fullText, tokens } = parseNarration("A&B");
    expect(fullText).toBe("A&B");
    expect(tokens).toEqual([{ text: "A&B", pauseAfter: null }]);
  });

  it("keeps an ampersand missing a space on one side as ordinary text", () => {
    // Only one side has whitespace → not a mark.
    expect(parseNarration("A &B").fullText).toBe("A &B");
    expect(parseNarration("A& B").fullText).toBe("A& B");
  });

  it("distinguishes the freestanding case from the joined case in one string", () => {
    // "Tom & Jerry" (mark) vs "A&B" (literal) side by side.
    const { fullText, tokens } = parseNarration("Tom & Jerry mag A&B");
    expect(fullText).toBe("Tom Jerry mag A&B");
    expect(fullText).not.toMatch(/ & /); // the freestanding mark is gone
    expect(fullText).toContain("A&B"); // the literal ampersand survives
    const tom = tokens.find((t) => t.text === "Tom");
    expect(tom?.pauseAfter).toBe("short");
  });

  it("renders marked text with the mark characters removed", () => {
    const { fullText } = parseNarration("Die Nacht & fällt && und alles wird still");
    expect(fullText).toBe("Die Nacht fällt und alles wird still");
    expect(fullText).not.toContain("&");
  });

  it("leaves plain text (no marks) untouched", () => {
    const text = "Recon One meldet Bewegung im Tal.";
    const { fullText, tokens } = parseNarration(text);
    expect(fullText).toBe(text);
    expect(tokens.every((t) => t.pauseAfter === null)).toBe(true);
  });
});

describe("wordDelayMs — mode scaling", () => {
  const tokens = parseNarration("a & b").tokens;

  it("is instant in 'off' mode", () => {
    expect(wordDelayMs(tokens, 0, "off")).toBe(0);
    expect(wordDelayMs(tokens, 1, "off")).toBe(0);
  });

  it("halves every timing in 'fast' mode", () => {
    expect(wordDelayMs(tokens, 0, "fast")).toBe(BASE_WORD_MS / 2);
    expect(wordDelayMs(tokens, 1, "fast")).toBe((BASE_WORD_MS + SHORT_PAUSE_MS) / 2);
  });

  it("uses full timing in 'on' mode", () => {
    expect(wordDelayMs(tokens, 0, "on")).toBe(BASE_WORD_MS);
  });
});
