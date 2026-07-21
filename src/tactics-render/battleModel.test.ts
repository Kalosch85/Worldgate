import { describe, expect, it } from "vitest";
import { newCampaign } from "../core/campaign.js";
import { launchMission } from "../core/missions.js";
import { apply, type ReducerCtx } from "../core/reducer.js";
import { mulberry32 } from "../core/rng.js";
import { abilityRangeTiles, hitChance, reachableTiles, threatenedTiles } from "../core/tactics.js";
import { loadTestContent } from "../test/content.js";
import type { GameStateT } from "../data/schemas.js";
import { actablePlayers, buildBattleView, interactButtonTap, interpretTap } from "./battleModel.js";

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

// tuning v3 §4: the range/threat overlays are exactly the core guards' output —
// the view never recomputes range or LOS.
describe("range & threat overlays (§4)", () => {
  const sortKeys = (ps: { x: number; y: number }[]): string[] => ps.map((p) => `${p.x},${p.y}`).sort();

  it("the ability-range overlay equals abilityRangeTiles() (§4a)", () => {
    const s = apply(launched(), { type: "battleMove", unit: "u_h_mercer", to: { x: 3, y: 1 } }, ctx);
    const view = buildBattleView(s, CONTENT, {
      selectedUnit: "u_h_mercer",
      mode: { kind: "ability", ability: "ab_shot" },
    })!;
    expect(sortKeys(view.abilityRange)).toEqual(
      sortKeys(abilityRangeTiles(s, CONTENT, "u_h_mercer", "ab_shot")),
    );
    expect(view.abilityRange.length).toBeGreaterThan(0);
    // No ability selected → no coverage overlay.
    const moveView = buildBattleView(s, CONTENT, { selectedUnit: "u_h_mercer", mode: { kind: "move" } })!;
    expect(moveView.abilityRange).toHaveLength(0);
  });

  it("the threat-zone overlay equals threatenedTiles() for the inspected enemy (§4b)", () => {
    const s = launched();
    const view = buildBattleView(s, CONTENT, {
      selectedUnit: "u_h_mercer",
      mode: { kind: "move" },
      inspectedEnemy: "u_eg_guards_0",
    })!;
    expect(view.inspectedEnemy).toBe("u_eg_guards_0");
    expect(sortKeys(view.threatZone)).toEqual(sortKeys(threatenedTiles(s, CONTENT, "u_eg_guards_0")));
    expect(view.threatZone.length).toBeGreaterThan(0);
    // No inspection → no threat overlay.
    const plain = buildBattleView(s, CONTENT, { selectedUnit: "u_h_mercer", mode: { kind: "move" } })!;
    expect(plain.threatZone).toHaveLength(0);
  });

  it("tapping an enemy toggles its inspection; re-tap or empty tap clears it (§4b)", () => {
    const s = launched(); // raiders at (6,4) and (7,5)
    const fresh = buildBattleView(s, CONTENT, { selectedUnit: "u_h_mercer", mode: { kind: "move" } })!;
    // First tap on the enemy tile → inspect it.
    expect(interpretTap(fresh, 6, 4)).toEqual({ kind: "inspect", enemy: "u_eg_guards_0" });
    // With it inspected, tapping the same enemy again clears it.
    const inspecting = buildBattleView(s, CONTENT, {
      selectedUnit: "u_h_mercer",
      mode: { kind: "move" },
      inspectedEnemy: "u_eg_guards_0",
    })!;
    expect(interpretTap(inspecting, 6, 4)).toEqual({ kind: "inspect", enemy: null });
    // Tapping empty floor while inspecting also dismisses it.
    expect(interpretTap(inspecting, 7, 2)).toEqual({ kind: "inspect", enemy: null });
  });
});

// tuning v3 §2: a 2-AP ability stays visible on the bar, disabled, with a reason.
describe("ability bar (§2)", () => {
  it("keeps Präzisionsschuss visible-but-disabled with a reason below 2 AP", () => {
    const s = launched();
    battle(s).units.find((u) => u.id === "u_h_mercer")!.ap = 1; // one AP left — can't afford apCost 2
    const view = buildBattleView(s, CONTENT, { selectedUnit: "u_h_mercer", mode: { kind: "move" } })!;
    const precision = view.abilities.find((a) => a.id === "ab_precision_shot")!;
    expect(precision).toBeDefined(); // still shown
    expect(precision.ready).toBe(false); // but disabled
    expect(precision.disabledReason).toBe("Benötigt 2 AP — kein Bewegen im selben Zug");
    // The plain shot (1 AP) is still ready.
    expect(view.abilities.find((a) => a.id === "ab_shot")!.ready).toBe(true);
  });

  it("Präzisionsschuss is ready with 2 AP off cooldown (no reason)", () => {
    const s = launched();
    const view = buildBattleView(s, CONTENT, { selectedUnit: "u_h_mercer", mode: { kind: "move" } })!;
    const precision = view.abilities.find((a) => a.id === "ab_precision_shot")!;
    expect(precision.ready).toBe(true);
    expect(precision.disabledReason).toBeNull();
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

  it("activates from ON the console tile (Fable §8: on-tile or adjacent)", () => {
    const s = launched();
    // Mercer standing directly on console A's tile (7,0), 1 AP left.
    const m = battle(s).units.find((u) => u.id === "u_h_mercer")!;
    m.pos = { x: 7, y: 0 };
    m.ap = 1;
    const view = buildBattleView(s, CONTENT, { selectedUnit: "u_h_mercer", mode: { kind: "move" } })!;
    expect(view.consoles.find((c) => c.id === "con_a")!.reachableNext).toBe(true);
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

// §11 (Fable amendment): tapping an interactable is never a silent no-op — an
// ineligible tap returns the single blocking reason.
describe("interactable feedback (§11)", () => {
  it("a unit that arrived on the console with no AP sees the no-AP reason", () => {
    const s = launched();
    // Mercer reached console A's tile (7,0) but two moves spent all his AP.
    const m = battle(s).units.find((u) => u.id === "u_h_mercer")!;
    m.pos = { x: 7, y: 0 };
    m.ap = 0;
    const view = buildBattleView(s, CONTENT, { selectedUnit: "u_h_mercer", mode: { kind: "move" } })!;
    expect(view.consoles.find((c) => c.id === "con_a")!.reachableNext).toBe(false);
    expect(interpretTap(view, 7, 0)).toEqual({ kind: "message", text: "Keine AP übrig" });
    // The button reports the same reason instead of sitting silently disabled.
    expect(interactButtonTap(view)).toEqual({ kind: "message", text: "Keine AP übrig" });
  });

  it("tapping the wrong console (out of order) names the one to activate first", () => {
    const s = launched();
    // Mercer adjacent to console B (7,4) with AP, but the sequence expects A.
    const m = battle(s).units.find((u) => u.id === "u_h_mercer")!;
    m.pos = { x: 6, y: 4 };
    const view = buildBattleView(s, CONTENT, { selectedUnit: "u_h_mercer", mode: { kind: "move" } })!;
    expect(view.consoles.find((c) => c.id === "con_b")!.reachableNext).toBe(false);
    expect(interpretTap(view, 7, 4)).toEqual({ kind: "message", text: "Zuerst Konsole A aktivieren" });
  });

  it("tapping the next console from a distance says to move closer", () => {
    const s = launched();
    const m = battle(s).units.find((u) => u.id === "u_h_mercer")!;
    m.pos = { x: 3, y: 0 }; // has AP, far from console A (7,0)
    const view = buildBattleView(s, CONTENT, { selectedUnit: "u_h_mercer", mode: { kind: "move" } })!;
    expect(interpretTap(view, 7, 0)).toEqual({ kind: "message", text: "Näher herangehen" });
  });
});
