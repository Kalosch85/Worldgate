import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { newCampaign } from "../core/campaign.js";
import { launchMission } from "../core/missions.js";
import type { Action } from "../core/reducer.js";
import { loadTestContent } from "../test/content.js";
import type { GameStateT } from "../data/schemas.js";
import { BattleScreen } from "./BattleScreen.js";

/**
 * BattleScreen HUD smoke test (task 4.3; ARCHITECTURE §9 keeps UI thin — smoke
 * only). Pixi needs WebGL, which jsdom lacks, so the renderer is mocked; the
 * assertions cover the HTML HUD (turn/round banner, ability bar with AP state,
 * End Turn wiring). The board interaction itself is covered purely in
 * battleModel.test.ts via interpretTap.
 */
vi.mock("pixi.js", () => {
  class Application {
    stage = { addChild() {}, eventMode: "", hitArea: null as unknown, on() {} };
    renderer = { resize() {} };
    canvas = document.createElement("canvas");
    async init() {}
    destroy() {}
  }
  class Container {
    children: unknown[] = [];
    scale = { set() {} };
    position = { set() {} };
    addChild(c: unknown) {
      this.children.push(c);
      return c;
    }
    addChildAt(c: unknown, i: number) {
      this.children.splice(i, 0, c);
      return c;
    }
    removeChildren() {
      const c = this.children;
      this.children = [];
      return c;
    }
    destroy() {}
  }
  class Graphics {
    rect() {
      return this;
    }
    circle() {
      return this;
    }
    roundRect() {
      return this;
    }
    fill() {
      return this;
    }
    stroke() {
      return this;
    }
    moveTo() {
      return this;
    }
    lineTo() {
      return this;
    }
    closePath() {
      return this;
    }
    destroy() {}
  }
  class Text {
    anchor = { set() {} };
    width = 10;
    height = 10;
    x = 0;
    y = 0;
    destroy() {}
  }
  class Sprite {
    anchor = { set() {} };
    scale = { set() {} };
    texture = { width: 64, height: 64 };
    x = 0;
    y = 0;
    width = 0;
    height = 0;
    constructor(texture?: unknown) {
      if (texture) this.texture = texture as { width: number; height: number };
    }
    destroy() {}
  }
  const Assets = {
    async load() {
      return { width: 64, height: 64, source: { scaleMode: "" } };
    },
  };
  const Texture = class {};
  return { Application, Assets, Container, Graphics, Sprite, Text, Texture };
});

const CONTENT = loadTestContent();

function launched(): GameStateT {
  const s = newCampaign(99);
  s.missions.available.push("m_relay");
  s.resources.materials = 50;
  return launchMission(s, CONTENT, "m_relay", ["h_mercer", "h_okafor"]);
}

describe("BattleScreen HUD", () => {
  let container: HTMLDivElement;
  let root: Root;
  const dispatched: Action[] = [];

  beforeEach(() => {
    dispatched.length = 0;
    container = document.createElement("div");
    document.body.appendChild(container);
    root = createRoot(container);
  });

  afterEach(() => {
    act(() => root.unmount());
    container.remove();
  });

  const renderBattle = (state: GameStateT) =>
    act(() => {
      root.render(
        <BattleScreen
          state={state}
          content={CONTENT}
          dispatch={(a) => dispatched.push(a)}
          newlyUnlocked={[]}
          onExit={() => {}}
        />,
      );
    });

  const click = (label: string) => {
    const btn = [...container.querySelectorAll("button")].find((b) => (b.textContent ?? "").includes(label));
    if (!btn) throw new Error(`No button matching "${label}"`);
    act(() => btn.dispatchEvent(new MouseEvent("click", { bubbles: true })));
  };

  it("shows the round banner, turn state, and the objective", () => {
    renderBattle(launched());
    expect(container.textContent).toContain("Runde 1");
    expect(container.textContent).toContain("Dein Zug");
    expect(container.textContent).toContain("Konsolen 0/2");
  });

  it("renders the ability bar for the auto-selected unit with AP state", () => {
    renderBattle(launched());
    // Mercer is auto-selected (first in squad order); his bar shows Move + Shot.
    expect(container.textContent).toContain("Bewegen");
    expect(container.textContent).toContain("Schuss");
    expect(container.textContent).toContain("1 AP");
    expect(container.textContent).toContain("Zug beenden");
  });

  it("ends the turn immediately, with no confirmation, when all AP is spent", () => {
    const s = launched();
    if (s.activeMission?.kind !== "tactical") throw new Error("no battle");
    for (const u of s.activeMission.battle.units) if (u.side === "player") u.ap = 0;
    renderBattle(s);
    click("Zug beenden");
    expect(dispatched).toContainEqual({ type: "battleEndTurn" });
    expect((container.textContent ?? "").toLowerCase()).not.toContain("zug trotzdem beenden");
  });

  it("confirms before ending the turn while units can still act, then resolves identically", () => {
    renderBattle(launched()); // both heroes have 2 AP
    click("Zug beenden");
    // The button opens the confirmation instead of ending the turn outright.
    expect(dispatched).not.toContainEqual({ type: "battleEndTurn" });
    expect(container.textContent).toContain("können noch handeln — Zug trotzdem beenden?");
    expect(container.textContent).toContain("2 Einheiten");
    // Confirming dispatches the exact same action as the no-dialog path.
    click("Zug trotzdem beenden");
    expect(dispatched).toContainEqual({ type: "battleEndTurn" });
  });

  it("cancels the end-turn confirmation without dispatching", () => {
    renderBattle(launched());
    click("Zug beenden");
    click("Abbrechen");
    expect(dispatched).not.toContainEqual({ type: "battleEndTurn" });
    expect((container.textContent ?? "").toLowerCase()).not.toContain("zug trotzdem beenden");
  });

  it("toggles the scrolling log open", () => {
    renderBattle(launched());
    click("Protokoll");
    // The log panel is present (empty at battle start, but the toggle flipped).
    const hideBtn = [...container.querySelectorAll("button")].some((b) =>
      (b.textContent ?? "").includes("Protokoll verbergen"),
    );
    expect(hideBtn).toBe(true);
  });
});
