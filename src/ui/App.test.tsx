import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { App } from "./App.js";

/**
 * UI smoke tests (ARCHITECTURE §9: keep UI thin, smoke-test only). These drive
 * the app-shell wiring — new-campaign flow, personnel steppers, end-day, and
 * save/load round-trip — not sim rules, which are covered in src/core.
 */
describe("App shell", () => {
  let container: HTMLDivElement | null = null;
  let root: Root | null = null;

  beforeEach(() => {
    localStorage.clear();
    container = document.createElement("div");
    document.body.appendChild(container);
    root = createRoot(container);
  });

  afterEach(() => {
    if (root) act(() => root!.unmount());
    container?.remove();
    root = null;
    container = null;
    localStorage.clear();
  });

  const render = () => act(() => root!.render(<App />));

  /** Click the first button whose text or aria-label contains `label`. */
  const click = (label: string) => {
    const btn = [...container!.querySelectorAll("button")].find(
      (b) => (b.textContent ?? "").includes(label) || (b.getAttribute("aria-label") ?? "").includes(label),
    );
    if (!btn) throw new Error(`No button matching "${label}"`);
    act(() => btn.dispatchEvent(new MouseEvent("click", { bubbles: true })));
  };

  it("shows the main menu with a New Campaign action", () => {
    render();
    expect(container!.textContent).toContain("Worldgate");
    expect(container!.textContent).toContain("New Campaign");
  });

  it("starts a campaign and lands on the base screen with resources", () => {
    render();
    click("New Campaign");
    expect(container!.textContent).toContain("Funds");
    expect(container!.textContent).toContain("Personnel");
    expect(container!.textContent).toContain("Journal");
    expect(container!.textContent).toContain("End Day");
  });

  it("advances the day when End Day is pressed", () => {
    render();
    click("New Campaign");
    expect(container!.textContent).toContain("Day");
    // newCampaign starts on day 1; ending a day advances the counter.
    click("End Day");
    // Day 2 chip now present.
    const dayChip = [...container!.querySelectorAll("div")].some((d) => d.textContent === "Day2");
    expect(dayChip).toBe(true);
  });

  it("reassigns personnel through the assignPersonnel action", () => {
    render();
    click("New Campaign");
    // logistics starts at 12; +1 should move an idle worker in.
    click("Add one to Logistics");
    // 12 + 6 + 2 = 20 assigned, 0 idle → chip reads "0 idle / 20".
    expect(container!.textContent).toContain("0 idle / 20");
  });

  it("persists the campaign to localStorage and restores it on reload", () => {
    render();
    click("New Campaign");
    click("End Day"); // now on day 2, autosaved

    // Simulate a reload: fresh root over a fresh App reading localStorage.
    act(() => root!.unmount());
    root = createRoot(container!);
    render();
    // Menu offers Continue because a save was restored into memory.
    expect(container!.textContent).toContain("Continue");
    click("Continue");
    const dayChip = [...container!.querySelectorAll("div")].some((d) => d.textContent === "Day2");
    expect(dayChip).toBe(true);
  });
});
