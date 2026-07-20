import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { App } from "./App.js";

/**
 * UI smoke tests (ARCHITECTURE §9: keep UI thin, smoke-test only). These drive
 * the app-shell wiring — new-campaign flow, personnel steppers, end-day, and
 * save/load round-trip — not sim rules, which are covered in src/core.
 *
 * D-12: the UI and content are German; button clicks and text assertions match
 * the strings module (src/ui/strings.ts) and the translated content JSON.
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
    click("Neue Kampagne");
    click("Hinunter.");
    click("Mit der Wissenschaft beginnen");
    click("Jetzt die Bedrohungen. Mercer.");
    click("Zur Wählebene.");
    click("Wir holen sie heim.");
    click("Zurück zur Basis");
  };

  it("shows the main menu with a New Campaign action", () => {
    render();
    expect(container!.textContent).toContain("Worldgate");
    expect(container!.textContent).toContain("Neue Kampagne");
  });

  it("opens a new campaign on the intro event (D-9) and reaches base after it", () => {
    render();
    click("Neue Kampagne");
    // The intro incident takes over before any base screen.
    expect(container!.textContent).toContain("Ich wusste nicht, was mich erwartete, als ich unterschrieb");
    click("Hinunter.");
    click("Mit den Bedrohungen beginnen");
    expect(container!.textContent).toContain("Recon One");
    click("Jetzt die Wissenschaft. Okafor.");
    click("Zur Wählebene.");
    click("beim ersten Zeichen von Ärger");
    expect(container!.textContent).toContain("Rettungssprung genehmigt");
    click("Zurück zur Basis");
    expect(container!.textContent).toContain("Mittel");
    expect(container!.textContent).toContain("Personal");
    expect(container!.textContent).toContain("Journal");
    expect(container!.textContent).toContain("Tag beenden");
  });

  it("advances the day when End Day is pressed", () => {
    render();
    startCampaign();
    expect(container!.textContent).toContain("Tag");
    // newCampaign starts on day 1; ending a day advances the counter.
    click("Tag beenden");
    // Day 2 chip now present.
    const dayChip = [...container!.querySelectorAll("div")].some((d) => d.textContent === "Tag2");
    expect(dayChip).toBe(true);
  });

  it("reassigns personnel through the assignPersonnel action", () => {
    render();
    startCampaign();
    // logistics starts at 12; +1 should move an idle worker in.
    click("Einen zu Logistik hinzufügen");
    // 12 + 6 + 2 = 20 assigned, 0 idle → chip reads "0 untätig / 20".
    expect(container!.textContent).toContain("0 untätig / 20");
  });

  it("opens the roster screen and shows a hero card with skills", () => {
    render();
    startCampaign();
    click("Team");
    expect(container!.textContent).toContain("Mercer");
    expect(container!.textContent).toContain("Kampf");
    expect(container!.textContent).toContain("Fit");
    click("Basis"); // back to base
    expect(container!.textContent).toContain("Personal");
  });

  it("opens the research screen and starts research", () => {
    render();
    startCampaign();
    click("Forschung");
    expect(container!.textContent).toContain("Tor-Stabilisator");
    click("Forschung beginnen");
    // Current-research panel now reflects the in-progress tech.
    expect(container!.textContent).toContain("/ 20 FP");
  });

  it("launches the arrival mission and plays the quiet path to completion", () => {
    render();
    startCampaign();
    click("Weltentor");
    expect(container!.textContent).toContain("Das stille Tal");
    // m_vy_arrival requires both heroes.
    click("Mercer");
    click("Okafor");
    click("Mission starten");
    // The event screen takes over with the arrival node's body text.
    expect(container!.textContent).toContain("Recon Ones Markierungsbake");
    click("Der Straße talaufwärts folgen");
    click("Ihnen vertrauen.");
    // The alien-procession reveal node (n_va_procession).
    expect(container!.textContent).toContain("Insekten wenigstens zweineinhalb Meter groß");
    click("Unten bleiben, bis die letzte fort ist");
    click("Ihn in Deckung bringen");
    click("in Sicherheit führen lassen");
    click("Mit der Adresse heimkehren");
    // Completion panel shows the outcome and a return control.
    expect(container!.textContent).toContain("Die Adresse, freiwillig gegeben");
    // Authored debrief (schema `debrief`) is shown on the summary.
    expect(container!.textContent).toContain("Ihr gingt mit den Feldfamilien in Deckung");
    // Auto-derived "Next:" section lists the mission this outcome unlocked.
    expect(container!.textContent).toContain("Als Nächstes");
    expect(container!.textContent).toContain("Das Verzeichnis der Genommenen");
    click("Zurück zur Basis");
    // Back on the base screen; the mission is resolved.
    expect(container!.textContent).toContain("Personal");
    expect(container!.textContent).not.toContain("Eine Mission läuft");
  });

  it("plays the arrival fight path to its own outcome", () => {
    render();
    startCampaign();
    click("Weltentor");
    click("Mercer");
    click("Okafor");
    click("Mission starten");
    expect(container!.textContent).toContain("Recon Ones Markierungsbake");
    click("Der Straße talaufwärts folgen");
    click("Losreißen");
    click("Erstarren.");
    click("Die Schnur einstecken");
    click("Heimkehren.");
    expect(container!.textContent).toContain("Eine mit Blut erkaufte Stille");
    click("Zurück zur Basis");
    expect(container!.textContent).toContain("Personal");
  });

  it("pulses the worldgate nav for a new mission and clears it once looked at", () => {
    render();
    startCampaign();
    // The intro unlocked The Silent Valley — the worldgate nav draws attention.
    expect(container!.querySelector('[aria-label="Neue Mission verfügbar"]')).not.toBeNull();
    // Opening the worldgate marks it seen; back at base the pulse is gone.
    click("Weltentor");
    click("Basis");
    expect(container!.querySelector('[aria-label="Neue Mission verfügbar"]')).toBeNull();
  });

  it("pulses the research nav while idle and clears it once research starts", () => {
    render();
    startCampaign();
    // Nothing under research yet, and Gate Stabilizer is available → pulse.
    expect(container!.querySelector('[aria-label="Keine Forschung aktiv"]')).not.toBeNull();
    click("Forschung");
    click("Forschung beginnen");
    click("Basis");
    expect(container!.querySelector('[aria-label="Keine Forschung aktiv"]')).toBeNull();
  });

  it("builds a facility from the base screen and shows the progress row", () => {
    render();
    startCampaign();
    expect(container!.textContent).toContain("Einrichtungen");
    // The first buildable facility is Expanded Quarters (starting resources cover it).
    click("Bauen");
    expect(container!.textContent).toContain("Im Bau: Erweiterte Quartiere");
    expect(container!.textContent).toContain("übrig");
  });

  it("persists the campaign to localStorage and restores it on reload", () => {
    render();
    startCampaign();
    click("Tag beenden"); // now on day 2, autosaved

    // Simulate a reload: fresh root over a fresh App reading localStorage.
    act(() => root!.unmount());
    root = createRoot(container!);
    render();
    // Menu offers Continue because a save was restored into memory.
    expect(container!.textContent).toContain("Fortsetzen");
    click("Fortsetzen");
    const dayChip = [...container!.querySelectorAll("div")].some((d) => d.textContent === "Tag2");
    expect(dayChip).toBe(true);
  });
});
