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

  /** D-9: a new campaign opens on the intro event — play it to the base screen. */
  const startCampaign = () => {
    click("New Campaign");
    click("Go down.");
    click("Start with the science");
    click("Show me the dialing floor");
    click("Assemble the team. We bring them home.");
    click("Return to base");
  };

  it("shows the main menu with a New Campaign action", () => {
    render();
    expect(container!.textContent).toContain("Worldgate");
    expect(container!.textContent).toContain("New Campaign");
  });

  it("opens a new campaign on the intro event (D-9) and reaches base after it", () => {
    render();
    click("New Campaign");
    // The intro incident takes over before any base screen.
    expect(container!.textContent).toContain("I didn't know what to expect when I signed");
    click("Go down.");
    click("Start with the threats");
    expect(container!.textContent).toContain("Recon One");
    click("Show me the dialing floor");
    click("Assemble the team — but at the first sign of trouble, they come back.");
    expect(container!.textContent).toContain("Rescue crossing authorized");
    click("Return to base");
    expect(container!.textContent).toContain("Funds");
    expect(container!.textContent).toContain("Personnel");
    expect(container!.textContent).toContain("Journal");
    expect(container!.textContent).toContain("End Day");
  });

  it("advances the day when End Day is pressed", () => {
    render();
    startCampaign();
    expect(container!.textContent).toContain("Day");
    // newCampaign starts on day 1; ending a day advances the counter.
    click("End Day");
    // Day 2 chip now present.
    const dayChip = [...container!.querySelectorAll("div")].some((d) => d.textContent === "Day2");
    expect(dayChip).toBe(true);
  });

  it("reassigns personnel through the assignPersonnel action", () => {
    render();
    startCampaign();
    // logistics starts at 12; +1 should move an idle worker in.
    click("Add one to Logistics");
    // 12 + 6 + 2 = 20 assigned, 0 idle → chip reads "0 idle / 20".
    expect(container!.textContent).toContain("0 idle / 20");
  });

  it("opens the roster screen and shows a hero card with skills", () => {
    render();
    startCampaign();
    click("Roster");
    expect(container!.textContent).toContain("Mercer");
    expect(container!.textContent).toContain("Combat");
    expect(container!.textContent).toContain("Fit");
    click("Base"); // back to base
    expect(container!.textContent).toContain("Personnel");
  });

  it("opens the research screen and starts research", () => {
    render();
    startCampaign();
    click("Research");
    expect(container!.textContent).toContain("Gate Stabilizer");
    click("Start research");
    // Current-research panel now reflects the in-progress tech.
    expect(container!.textContent).toContain("/ 20 RP");
  });

  it("launches the arrival mission and plays the quiet path to completion", () => {
    render();
    startCampaign();
    click("Worldgate");
    expect(container!.textContent).toContain("The Silent Valley");
    // m_vy_arrival requires both heroes.
    click("Mercer");
    click("Okafor");
    click("Launch mission");
    // The event screen takes over with the arrival node's body text.
    expect(container!.textContent).toContain("Recon One's marker beacon");
    click("Follow the road up-valley");
    click("Trust them. Get off the road.");
    expect(container!.textContent).toContain("Tenders");
    click("Stay down until the last one is gone");
    click("Go home with the lead");
    // Completion panel shows the outcome and a return control.
    expect(container!.textContent).toContain("The taken go up the road");
    click("Return to base");
    // Back on the base screen; the mission is resolved.
    expect(container!.textContent).toContain("Personnel");
    expect(container!.textContent).not.toContain("A mission is in progress");
  });

  it("plays the arrival fight path to its own outcome", () => {
    render();
    startCampaign();
    click("Worldgate");
    click("Mercer");
    click("Okafor");
    click("Launch mission");
    expect(container!.textContent).toContain("Recon One's marker beacon");
    click("Follow the road up-valley");
    click("Break free");
    click("Freeze.");
    click("Pocket the cord");
    click("Go home.");
    expect(container!.textContent).toContain("A silence bought in blood");
    click("Return to base");
    expect(container!.textContent).toContain("Personnel");
  });

  it("builds a facility from the base screen and shows the progress row", () => {
    render();
    startCampaign();
    expect(container!.textContent).toContain("Facilities");
    // The first buildable facility is Expanded Quarters (starting resources cover it).
    click("Build");
    expect(container!.textContent).toContain("Building: Expanded Quarters");
    expect(container!.textContent).toContain("days left");
  });

  it("persists the campaign to localStorage and restores it on reload", () => {
    render();
    startCampaign();
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
