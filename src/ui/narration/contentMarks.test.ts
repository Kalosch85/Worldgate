import { describe, expect, it } from "vitest";
import { loadTestContent } from "../../test/content.js";
import { parseNarration } from "./parseNarration.js";

/**
 * Regression guard for the D-13 pause marks that live in authored content
 * (src/data/content/events.json). The marks (" & " / " && ") are invisible once
 * rendered, so a content sweep could strip them and nothing else would notice.
 * This suite pins the canonical passages (restored from docs/story/review/
 * veyra-patch.md via mark-stripped text matching) and verifies the display
 * parser consumes every mark in the whole content set.
 */
const content = loadTestContent();

const MARK = /\s(&&|&)\s/g;

function nodeText(eventId: string, nodeId: string): string {
  const ev = content.events.find((e) => e.id === eventId);
  if (!ev) throw new Error(`event ${eventId} not found`);
  const node = ev.nodes.find((n) => n.id === nodeId);
  if (!node) throw new Error(`node ${nodeId} not found in ${eventId}`);
  return node.text;
}

/** Every player-visible narration string in the content (node bodies + options). */
function allNarrationTexts(): string[] {
  const out: string[] = [];
  for (const ev of content.events) {
    for (const n of ev.nodes) {
      out.push(n.text);
      for (const o of n.options) out.push(o.text);
    }
  }
  return out;
}

describe("canonical pause marks in content (D-13 regression guard)", () => {
  it("keeps a LONG pause in the intro monologue before 'Egal — seit Cassy'", () => {
    const text = nodeText("ev_intro", "n_in_sign");
    expect(text).toMatch(/&&\s+Egal — seit Cassy/);
    const { fullText, tokens } = parseNarration(text);
    expect(fullText).not.toContain("&");
    const egal = tokens.findIndex((t) => t.text === "Egal");
    expect(tokens[egal - 1]?.pauseAfter).toBe("long");
  });

  it("keeps a SHORT pause in a valley node (n_va_procession)", () => {
    const text = nodeText("ev_vy_arrival", "n_va_procession");
    expect(text).toContain(" & ");
    expect(parseNarration(text).fullText).not.toContain("&");
  });

  it("keeps the SHORT pause in the Signaltürme lead-in beats (tuning v3 §5)", () => {
    // The beat inserted immediately before m_vy_intercept unlocks, on both the
    // transport and the pilgrim crossing paths — Okafor's " & Es sei denn …".
    for (const nodeId of ["n_vl_spires_transport", "n_vl_spires_pilgrims"]) {
      const text = nodeText("ev_vy_ledger", nodeId);
      expect(text).toMatch(/schließen\. & Es sei denn/);
      const { fullText, tokens } = parseNarration(text);
      expect(fullText).not.toContain("&");
      const esSei = tokens.findIndex((t) => t.text === "Es");
      expect(esSei).toBeGreaterThan(0);
      expect(tokens[esSei - 1]?.pauseAfter).toBe("short");
    }
  });

  it("keeps a SHORT pause in the homecoming node (n_vy_home, veyra-kaempfe §6)", () => {
    const text = nodeText("ev_vy_homecoming", "n_vy_home");
    expect(text).toMatch(/hat\. & Was ihr auf Veyra/);
    expect(parseNarration(text).fullText).not.toContain("&");
  });

  it("keeps the lost confirmation beat 'Sie leben. & Noch.' on the ledger node", () => {
    const text = nodeText("ev_vy_ledger", "n_vl_ledger");
    expect(text).toMatch(/Sie leben\. & Noch\./);
    const { fullText, tokens } = parseNarration(text);
    expect(fullText).not.toContain("&");
    // "Sie leben." carries a short pause before "Noch."
    const noch = tokens.findIndex((t) => t.text === "Noch.");
    expect(noch).toBeGreaterThan(0);
    expect(tokens[noch - 1]?.pauseAfter).toBe("short");
  });

  it("keeps both marks in the cell-block reunion (n_vy2_a_cells, patch-restored)", () => {
    const text = nodeText("ev_vy_penitence", "n_vy2_a_cells");
    expect(text).toContain(" & "); // before „Captain Mercer.“
    expect(text).toContain(" && "); // before „Barros senkt die Stimme“
    expect(parseNarration(text).fullText).not.toContain("&");
  });

  it("the display parser consumes EVERY mark in the whole content set (never rendered)", () => {
    let total = 0;
    for (const text of allNarrationTexts()) {
      const marks = text.match(MARK);
      if (marks) total += marks.length;
      // Whatever marks a node carries, the rendered text must contain no '&'.
      expect(parseNarration(text).fullText).not.toContain("&");
    }
    // Anti-strip tripwire: a future sweep that removes marks drops this below the
    // floor and fails loudly. Raise the floor when more marks are authored.
    // +2 for the tuning v3 §5 Signaltürme beats (n_vl_spires_transport/pilgrims).
    expect(total).toBeGreaterThanOrEqual(21);
  });
});
