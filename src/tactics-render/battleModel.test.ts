import { describe, expect, it } from "vitest";
import { newCampaign } from "../core/campaign.js";
import { launchMission } from "../core/missions.js";
import { apply, type ReducerCtx } from "../core/reducer.js";
import { mulberry32 } from "../core/rng.js";
import { hitChance, reachableTiles } from "../core/tactics.js";
import { loadTestContent } from "../test/content.js";
import type { GameStateT } from "../data/schemas.js";
import { actablePlayers, buildBattleView, interpretTap } from "./battleModel.js";

/**
 * Pure view-model tests (task 4.3). `buildBattleView` must surface exactly the
 * core guards' reachable tiles / targets / hit% (spec §11 labels targets with
 * the shared value), and `interpretTap` must map a tile tap to the right
 * `battle*` action or selection. No Pixi here — this is the rules-free glue.
 */
const CONTENT = loadTestContent();
const ctx: ReducerCtx = { content: CONTENT, rng: mulberry32(1) };

function launched(): GameStateT {
  const s = newCampaign(4242);
  s.missions.available.push("m_relay");
  s.resources.materials = 50;
  return launchMission(s, CONTENT, "m_relay", ["h_mercer", "h_okafor"]);
}

function battle(s: GameStateT) {
  if (s.activeMission?.kind !== "tactical") throw new Error("no battle");
  return s.activeMission.battle;
}

describe("buildBattleView (§11)", () => {
  it("returns null when no tactical battle is active", () => {
    expect(
      buildBattleView(newCampaign(1), CONTENT, { selectedUnit: null, mode: { kind: "move" } }),
    ).toBeNull();
  });

  it("mirrors the map, units, and the move overlay from the core guard", () => {
    const s = launched();
    const view = buildBattleView(s, CONTENT, { selectedUnit: "u_h_mercer", mode: { kind: "move" } })!;
    expect(view.width).toBe(8);
    expect(view.height).toBe(6);
    expect(view.units).toHaveLength(4);
    // The move overlay is exactly reachableTiles() — same set, order-independent.
    const guard = reachableTiles(s, CONTENT, "u_h_mercer")
      .map((p) => `${p.x},${p.y}`)
      .sort();
    expect(view.reachable.map((p) => `${p.x},${p.y}`).sort()).toEqual(guard);
  });

  it("labels ability targets with the exact shared hit%", () => {
    // Move Mercer into firing position (the golden-battle opener) so a raider
    // is in range + LOS.
    const s = apply(launched(), { type: "battleMove", unit: "u_h_mercer", to: { x: 3, y: 1 } }, ctx);
    const view = buildBattleView(s, CONTENT, {
      selectedUnit: "u_h_mercer",
      mode: { kind: "ability", ability: "ab_shot" },
    })!;
    const target = view.targets.find((t) => t.unit === "u_eg_guards_0");
    expect(target).toBeDefined();
    expect(target!.hitPct).toBe(hitChance(s, CONTENT, "u_h_mercer", "u_eg_guards_0"));
    // Move overlay is suppressed in ability mode.
    expect(view.reachable).toHaveLength(0);
  });

  it("flags every living player unit with AP as canAct (the §11 badge)", () => {
    const s = launched();
    const view = buildBattleView(s, CONTENT, { selectedUnit: null, mode: { kind: "move" } })!;
    const players = view.units.filter((u) => u.side === "player");
    expect(players.every((u) => u.canAct)).toBe(true); // both fresh, ap 2
    expect(view.units.filter((u) => u.side === "enemy").every((u) => !u.canAct)).toBe(true);
  });

  it("drops a unit from canAct / actablePlayers once its AP is spent", () => {
    const s = launched();
    battle(s).units.find((u) => u.id === "u_h_mercer")!.ap = 0;
    const view = buildBattleView(s, CONTENT, { selectedUnit: null, mode: { kind: "move" } })!;
    expect(view.units.find((u) => u.id === "u_h_mercer")!.canAct).toBe(false);
    // Only Okafor can still act, and the helper returns it in unit-id order.
    expect(actablePlayers(view).map((u) => u.id)).toEqual(["u_h_okafor"]);
  });

  it("actablePlayers returns living player units with AP in unit-id order", () => {
    const s = launched();
    const view = buildBattleView(s, CONTENT, { selectedUnit: null, mode: { kind: "move" } })!;
    expect(actablePlayers(view).map((u) => u.id)).toEqual(["u_h_mercer", "u_h_okafor"]);
  });

  it("exposes the next console and interact-readiness when adjacent", () => {
    const s = launched();
    // Place Mercer next to console A (7,0); the sequence expects con_a first.
    battle(s).units.find((u) => u.id === "u_h_mercer")!.pos = { x: 6, y: 0 };
    const view = buildBattleView(s, CONTENT, { selectedUnit: "u_h_mercer", mode: { kind: "interact" } })!;
    const conA = view.consoles.find((c) => c.id === "con_a")!;
    expect(conA.isNext).toBe(true);
    expect(conA.reachableNext).toBe(true);
    expect(view.canInteract).toBe(true);
    // Console B is not next yet.
    expect(view.consoles.find((c) => c.id === "con_b")!.isNext).toBe(false);
  });
});

describe("interpretTap (§11)", () => {
  it("selects a living player unit tapped in move mode", () => {
    const s = launched();
    const view = buildBattleView(s, CONTENT, { selectedUnit: "u_h_mercer", mode: { kind: "move" } })!;
    // Two-hero squad: Mercer at (0,0), Okafor at spawn slot 2 = (1,0). Okafor's
    // tile is occupied, so it is not a move destination — the tap selects him.
    expect(interpretTap(view, 1, 0)).toEqual({ kind: "select", unit: "u_h_okafor" });
  });

  it("turns a tap on a reachable tile into a move", () => {
    const s = launched();
    const view = buildBattleView(s, CONTENT, { selectedUnit: "u_h_mercer", mode: { kind: "move" } })!;
    const dest = view.reachable[0]!;
    expect(interpretTap(view, dest.x, dest.y)).toEqual({
      kind: "action",
      action: { type: "battleMove", unit: "u_h_mercer", to: { x: dest.x, y: dest.y } },
    });
  });

  it("turns a tap on a highlighted target into an ability", () => {
    const s = apply(launched(), { type: "battleMove", unit: "u_h_mercer", to: { x: 3, y: 1 } }, ctx);
    const view = buildBattleView(s, CONTENT, {
      selectedUnit: "u_h_mercer",
      mode: { kind: "ability", ability: "ab_shot" },
    })!;
    expect(interpretTap(view, 6, 4)).toEqual({
      kind: "action",
      action: { type: "battleAbility", unit: "u_h_mercer", ability: "ab_shot", target: "u_eg_guards_0" },
    });
  });

  it("turns a tap on the next console into an interact", () => {
    const s = launched();
    battle(s).units.find((u) => u.id === "u_h_mercer")!.pos = { x: 6, y: 0 };
    const view = buildBattleView(s, CONTENT, { selectedUnit: "u_h_mercer", mode: { kind: "interact" } })!;
    expect(interpretTap(view, 7, 0)).toEqual({
      kind: "action",
      action: { type: "battleInteract", unit: "u_h_mercer", interactable: "con_a" },
    });
  });

  it("ignores a tap on empty floor with nothing selectable", () => {
    const s = launched();
    const view = buildBattleView(s, CONTENT, { selectedUnit: "u_h_mercer", mode: { kind: "move" } })!;
    // (7,2) is floor, out of Mercer's reach, no unit — nothing happens.
    expect(interpretTap(view, 7, 2)).toEqual({ kind: "none" });
  });
});
