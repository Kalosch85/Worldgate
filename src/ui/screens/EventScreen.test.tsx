import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { EventScreen } from "./EventScreen.js";
import { newCampaign } from "../../core/campaign.js";
import { loadTestContent } from "../../test/content.js";
import { parseNarration } from "../narration/parseNarration.js";
import type { Action } from "../../core/reducer.js";
import type { GameStateT, TextAnimationT } from "../../data/schemas.js";

/**
 * D-13 word-by-word narration in the event screen. Behavioural coverage of the
 * animation itself — the reveal cadence, the options-until-complete gate, the
 * tap-to-skip, the "off" instant path, and the settings toggle. The mark
 * grammar is unit-tested in ../narration/parseNarration.test.ts.
 *
 * Uses the intro event (ev_intro) a fresh campaign auto-launches as a real
 * narrative node, deriving its expected text at runtime rather than pinning it.
 */
const content = loadTestContent();

/** The entry-node text of the intro event a new campaign opens on. */
const NODE_TEXT = (() => {
  const s = newCampaign(1, content);
  const active = s.activeMission;
  if (active?.kind !== "narrative") throw new Error("intro is not a narrative mission");
  const script = content.events.find((e) => e.id === active.script)!;
  return script.nodes.find((n) => n.id === active.node)!.text;
})();

const FULL = parseNarration(NODE_TEXT).fullText;
const FIRST_WORD = FULL.split(" ")[0]!;
const INTRO_OPTION = "Hinunter."; // the entry node's single option

function stateWithMode(mode: TextAnimationT): GameStateT {
  const s = newCampaign(1, content);
  return { ...s, settings: { ...s.settings, textAnimation: mode } };
}

describe("EventScreen narration (D-13)", () => {
  let container: HTMLDivElement;
  let root: Root;
  let actions: Action[];

  beforeEach(() => {
    vi.useFakeTimers({ toFake: ["setTimeout", "clearTimeout"] });
    container = document.createElement("div");
    document.body.appendChild(container);
    root = createRoot(container);
    actions = [];
  });

  afterEach(() => {
    act(() => root.unmount());
    container.remove();
    vi.useRealTimers();
  });

  const render = (mode: TextAnimationT) =>
    act(() =>
      root.render(
        <EventScreen
          state={stateWithMode(mode)}
          content={content}
          dispatch={(a) => actions.push(a)}
          newlyUnlocked={[]}
          onDone={() => {}}
        />,
      ),
    );

  const optionButton = () =>
    [...container.querySelectorAll("button")].find((b) => (b.textContent ?? "").includes(INTRO_OPTION));

  const narrationBox = () => container.querySelector('[aria-label="Erzählung"]')!;
  const advance = (ms: number) => act(() => vi.advanceTimersByTime(ms));

  // Each word's timer is re-armed by a passive effect that only flushes at the
  // end of an act(), so one advance reveals one word. Loop until the options
  // unlock (or a generous cap) to run the whole reveal.
  const runToComplete = () => {
    for (let i = 0; i < 1000 && optionButton() === undefined; i++) advance(2_000);
  };

  it("reveals the node text word-by-word and hides options until it finishes", () => {
    render("on");
    // Nothing revealed yet; the option is gated.
    expect(optionButton()).toBeUndefined();

    // A single tick shows the first word but not the whole node, and still no option.
    advance(200);
    const paragraph = narrationBox().querySelector("p")!;
    expect(paragraph.textContent).toContain(FIRST_WORD);
    expect(paragraph.textContent!.length).toBeLessThan(FULL.length);
    expect(optionButton()).toBeUndefined();

    // Once every word is out, the full text stands and the option appears.
    runToComplete();
    expect(narrationBox().querySelector("p")!.textContent).toBe(FULL);
    expect(optionButton()).toBeDefined();
  });

  it("fills the text and reveals the options when the box is tapped (skip)", () => {
    render("on");
    expect(optionButton()).toBeUndefined();
    act(() => narrationBox().dispatchEvent(new MouseEvent("click", { bubbles: true })));
    expect(narrationBox().querySelector("p")!.textContent).toBe(FULL);
    expect(optionButton()).toBeDefined();
  });

  it("shows the full text and options immediately when animation is off", () => {
    render("off");
    // No timer advance: everything is already present (no layout jump vs. skip).
    expect(narrationBox().querySelector("p")!.textContent).toBe(FULL);
    expect(optionButton()).toBeDefined();
  });

  it("cycles the text speed through updateSettings when the toggle is pressed", () => {
    render("on");
    const toggle = [...container.querySelectorAll("button")].find((b) =>
      (b.textContent ?? "").includes("Texttempo"),
    )!;
    act(() => toggle.dispatchEvent(new MouseEvent("click", { bubbles: true })));
    expect(actions).toEqual([{ type: "updateSettings", patch: { textAnimation: "fast" } }]);
  });
});
