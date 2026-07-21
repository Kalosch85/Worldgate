import { describe, expect, it } from "vitest";
import { loadTestContent } from "../../test/content.js";
import { parseNarration } from "./parseNarration.js";

/**
 * Regression guard for the D-13 pause marks that live in authored content
 * (src/data/content/events.json). A content sweep or a careless edit could
 * silently strip the freestanding " & " / " && " marks — the marks are
 * invisible once rendered, so nothing else would catch their loss. This test
 * pins three canonical passages and verifies the parser still consumes them
 * (marks never rendered, pause tagged on the preceding word).
 *
 * Note (see the recovery PR's forensic section): the originally-requested
 * confirmation passage "Sie leben. & Noch." does not exist anywhere in the
 * repository's content or history, so the third pinned case uses the homecoming
 * node's short mark instead — a mark that actually exists.
 */
const content = loadTestContent();

function nodeText(eventId: string, nodeId: string): string {
  const ev = content.events.find((e) => e.id === eventId);
  if (!ev) throw new Error(`event ${eventId} not found`);
  const node = ev.nodes.find((n) => n.id === nodeId);
  if (!node) throw new Error(`node ${nodeId} not found in ${eventId}`);
  return node.text;
}

describe("canonical pause marks in content (D-13 regression guard)", () => {
  it("keeps a LONG pause in the intro monologue before 'Egal — seit Cassy'", () => {
    const text = nodeText("ev_intro", "n_in_sign");
    expect(text).toContain(" && ");
    expect(text).toMatch(/&&\s+Egal — seit Cassy/);

    const { fullText, tokens } = parseNarration(text);
    expect(fullText).not.toContain("&"); // the mark is never rendered
    const egal = tokens.findIndex((t) => t.text === "Egal");
    expect(egal).toBeGreaterThan(0);
    expect(tokens[egal - 1]?.pauseAfter).toBe("long");
  });

  it("keeps a SHORT pause in a valley node (n_va_procession)", () => {
    const text = nodeText("ev_vy_arrival", "n_va_procession");
    expect(text).toContain(" & ");
    expect(text).not.toContain(" && "); // it's a short mark, not a long one

    const { fullText, tokens } = parseNarration(text);
    expect(fullText).not.toContain("&");
    expect(tokens.some((t) => t.pauseAfter === "short")).toBe(true);
  });

  it("keeps a SHORT pause in the homecoming node (n_vy3_exfil_end)", () => {
    const text = nodeText("ev_vy_first_blade", "n_vy3_exfil_end");
    expect(text).toMatch(/hat\. & Was ihr auf Veyra/);
    expect(parseNarration(text).fullText).not.toContain("&");
  });
});
