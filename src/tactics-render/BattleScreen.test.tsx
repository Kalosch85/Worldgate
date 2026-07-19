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
    addChild(c: unknown) {
      this.children.push(c);
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
  return { Application, Container, Graphics, Text };
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
    expect(container.textContent).toContain("Round 1");
    expect(container.textContent).toContain("Your turn");
    expect(container.textContent).toContain("Consoles 0/2");
  });

  it("renders the ability bar for the auto-selected unit with AP state", () => {
    renderBattle(launched());
    // Mercer is auto-selected (first in squad order); his bar shows Move + Shot.
    expect(container.textContent).toContain("Move");
    expect(container.textContent).toContain("Shot");
    expect(container.textContent).toContain("1 AP");
    expect(container.textContent).toContain("End Turn");
  });

  it("dispatches battleEndTurn when End Turn is pressed", () => {
    renderBattle(launched());
    click("End Turn");
    expect(dispatched).toContainEqual({ type: "battleEndTurn" });
  });

  it("toggles the scrolling log open", () => {
    renderBattle(launched());
    click("Log");
    // The log panel is present (empty at battle start, but the toggle flipped).
    const hideBtn = [...container.querySelectorAll("button")].some((b) =>
      (b.textContent ?? "").includes("Hide log"),
    );
    expect(hideBtn).toBe(true);
  });
});
