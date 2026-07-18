import { describe, expect, it } from "vitest";
import type { GameStateT } from "../data/schemas.js";
import { loadTestContent } from "../test/content.js";
import { newCampaign } from "./campaign.js";
import { launchMission } from "./missions.js";
import { apply, type Action, type ReducerCtx } from "./reducer.js";
import { mulberry32 } from "./rng.js";
import { hitChance, nextInteractables, reachableTiles, visibleTargets } from "./tactics.js";

/**
 * Tactical engine tests (docs/specs/tactics-engine.md §13). The battle stream is
 * derived internally from BattleState.seed + log, so the strategic-side ctx.rng
 * here only matters for §9 effect resolution (m_relay's effects draw none).
 */
const CONTENT = loadTestContent();
const ctx: ReducerCtx = { content: CONTENT, rng: mulberry32(1) };

type Tactical = Extract<NonNullable<GameStateT["activeMission"]>, { kind: "tactical" }>;
type BUnit = Tactical["battle"]["units"][number];

/** Build a GameState sitting on a hand-placed battle for focused assertions. */
function game(
  units: BUnit[],
  progress: Record<string, boolean | number>,
  opts: { seed?: number; round?: number; squad?: string[]; available?: string[]; log?: string[] } = {},
): GameStateT {
  const s = newCampaign(777);
  if (opts.available) s.missions.available = [...opts.available];
  s.activeMission = {
    kind: "tactical",
    mission: "m_relay",
    squad: opts.squad ?? units.filter((u) => u.side === "player").map((u) => u.hero!),
    battle: {
      map: "map_relay",
      seed: opts.seed ?? 5,
      round: opts.round ?? 1,
      activeSide: "player",
      units,
      objectiveProgress: progress,
      log: opts.log ?? [],
    },
  };
  return s;
}

const player = (id: string, hero: string, x: number, y: number, over: Partial<BUnit> = {}): BUnit => ({
  id,
  side: "player",
  hero,
  pos: { x, y },
  hp: 5,
  ap: 2,
  cooldowns: {},
  ...over,
});
const enemy = (id: string, x: number, y: number, over: Partial<BUnit> = {}): BUnit => ({
  id,
  side: "enemy",
  unitType: "ut_raider",
  pos: { x, y },
  hp: 4,
  ap: 2,
  cooldowns: {},
  ...over,
});

const battleOf = (s: GameStateT) => (s.activeMission?.kind === "tactical" ? s.activeMission.battle : null);
const unit = (s: GameStateT, id: string) => battleOf(s)!.units.find((u) => u.id === id)!;

// ============================================================ golden battle
describe("golden battle (§13)", () => {
  /** Fixed campaign → derived seed, a scripted firefight on map_relay. Locks
   * every unit's hp/pos and the exact hit/miss sequence from the log. */
  const GOLDEN: Action[] = [
    { type: "battleMove", unit: "u_h_mercer", to: { x: 3, y: 1 } },
    { type: "battleAbility", unit: "u_h_mercer", ability: "ab_shot", target: "u_eg_guards_0" },
    { type: "battleMove", unit: "u_h_okafor", to: { x: 5, y: 0 } },
    { type: "battleMove", unit: "u_h_okafor", to: { x: 6, y: 3 } },
    { type: "battleEndTurn" },
    { type: "battleAbility", unit: "u_h_mercer", ability: "ab_shot", target: "u_eg_guards_0" },
    { type: "battleAbility", unit: "u_h_okafor", ability: "ab_shot", target: "u_eg_guards_0" },
    { type: "battleEndTurn" },
    { type: "battleAbility", unit: "u_h_mercer", ability: "ab_shot", target: "u_eg_guards_0" },
    { type: "battleAbility", unit: "u_h_okafor", ability: "ab_shot", target: "u_eg_guards_1" },
    { type: "battleEndTurn" },
    { type: "battleAbility", unit: "u_h_mercer", ability: "ab_shot", target: "u_eg_guards_1" },
    { type: "battleAbility", unit: "u_h_okafor", ability: "ab_shot", target: "u_eg_guards_1" },
    { type: "battleEndTurn" },
    { type: "battleAbility", unit: "u_h_mercer", ability: "ab_shot", target: "u_eg_guards_1" },
  ];

  function launched(): GameStateT {
    const s = newCampaign(12345);
    s.missions.available.push("m_relay");
    s.resources.materials = 50;
    return launchMission(s, CONTENT, "m_relay", ["h_mercer", "h_okafor"]);
  }

  it("reproduces the exact end-state and log", () => {
    let s = launched();
    for (const a of GOLDEN) s = apply(s, a, ctx);
    const b = battleOf(s)!;

    expect(b.units.map((u) => ({ id: u.id, pos: u.pos, hp: u.hp, ap: u.ap }))).toEqual([
      { id: "u_h_mercer", pos: { x: 3, y: 1 }, hp: 5, ap: 0 },
      { id: "u_h_okafor", pos: { x: 6, y: 3 }, hp: 2, ap: 2 },
      { id: "u_eg_guards_0", pos: { x: 6, y: 4 }, hp: 0, ap: 0 },
      { id: "u_eg_guards_1", pos: { x: 7, y: 5 }, hp: 0, ap: 0 },
    ]);
    expect(b.round).toBe(5);
    expect(b.log).toEqual([
      "u_h_mercer moves to (3,1)",
      "roll: u_h_mercer->u_eg_guards_0 hit 75/73 MISS",
      "u_h_okafor moves to (5,0)",
      "u_h_okafor moves to (6,3)",
      "-- enemy phase (round 1) --",
      "roll: u_eg_guards_0->u_h_okafor hit 8/63 HIT",
      "roll: u_h_okafor dmg 1=1 (hp 4/5)",
      "roll: u_eg_guards_1->u_h_okafor hit 77/59 MISS",
      "-- round 2 --",
      "roll: u_h_mercer->u_eg_guards_0 hit 6/73 HIT",
      "roll: u_eg_guards_0 dmg 1=1 (hp 3/4)",
      "roll: u_h_okafor->u_eg_guards_0 hit 43/63 HIT",
      "roll: u_eg_guards_0 dmg 1=1 (hp 2/4)",
      "-- enemy phase (round 2) --",
      "roll: u_eg_guards_0->u_h_okafor hit 69/63 MISS",
      "roll: u_eg_guards_1->u_h_okafor hit 59/59 HIT",
      "roll: u_h_okafor dmg 2=2 (hp 2/5)",
      "-- round 3 --",
      "roll: u_h_mercer->u_eg_guards_0 hit 63/73 HIT",
      "roll: u_eg_guards_0 dmg 2=2 (hp 0/4)",
      "u_eg_guards_0 is down",
      "roll: u_h_okafor->u_eg_guards_1 hit 5/59 HIT",
      "roll: u_eg_guards_1 dmg 2=2 (hp 2/4)",
      "-- enemy phase (round 3) --",
      "roll: u_eg_guards_1->u_h_okafor hit 63/59 MISS",
      "-- round 4 --",
      "roll: u_h_mercer->u_eg_guards_1 hit 26/69 HIT",
      "roll: u_eg_guards_1 dmg 1=1 (hp 1/4)",
      "roll: u_h_okafor->u_eg_guards_1 hit 61/59 MISS",
      "-- enemy phase (round 4) --",
      "roll: u_eg_guards_1->u_h_okafor hit 73/59 MISS",
      "-- round 5 --",
      "roll: u_h_mercer->u_eg_guards_1 hit 32/69 HIT",
      "roll: u_eg_guards_1 dmg 2=2 (hp 0/4)",
      "u_eg_guards_1 is down",
    ]);
  });

  it("is fully deterministic — same campaign runs identically twice", () => {
    let a = launched();
    let b = launched();
    for (const act of GOLDEN) {
      a = apply(a, act, ctx);
      b = apply(b, act, ctx);
    }
    expect(JSON.stringify(battleOf(a))).toBe(JSON.stringify(battleOf(b)));
  });
});

// ======================================================== hit% & preview===res
describe("hit% (§7)", () => {
  it("clamps to the upper bound of 95", () => {
    // mercer with a big combat bonus: aim = 55 + 5 × effectiveCombat.
    const s = game([player("u_h_mercer", "h_mercer", 2, 1), enemy("u_e", 2, 2)], { obj_consoles: 0 });
    s.heroes.find((h) => h.hero === "h_mercer")!.skillBonuses = { combat: 5 }; // effCombat 11 → aim 110
    // dist 1, no cover → 110 − 0 − 2 = 108, clamped to 95.
    expect(hitChance(s, CONTENT, "u_h_mercer", "u_e")).toBe(95);
  });

  it("clamps to the lower bound of 5", () => {
    // okafor ground-down: tired (−1) + wounded (−2) → effCombat −1 → aim 50.
    const s = game([player("u_h_okafor", "h_okafor", 7, 5), enemy("u_e", 3, 2)], { obj_consoles: 0 });
    const okf = s.heroes.find((h) => h.hero === "h_okafor")!;
    okf.fatigue = 60;
    okf.injuries = [{ injury: "inj_wounded", daysRemaining: 5 }];
    // target on "+" (cover 40), dist 7 → 50 − 40 − 14 = −4, clamped to 5.
    expect(hitChance(s, CONTENT, "u_h_okafor", "u_e")).toBe(5);
  });

  it("preview IS resolution — the rolled chance equals hitChance()", () => {
    const s = game([player("u_h_mercer", "h_mercer", 4, 4), enemy("u_e", 6, 4)], { obj_consoles: 0 });
    const chance = hitChance(s, CONTENT, "u_h_mercer", "u_e"); // 85 − 0 − 4 = 81
    const next = apply(
      s,
      { type: "battleAbility", unit: "u_h_mercer", ability: "ab_shot", target: "u_e" },
      ctx,
    );
    const rollLine = battleOf(next)!.log.find((l) => l.includes("u_h_mercer->u_e hit"))!;
    expect(rollLine).toContain(`/${chance} `);
    expect(chance).toBe(81);
  });
});

// ============================================================ movement (§6)
describe("movement (§6)", () => {
  it("caps a move at `mobility` tiles", () => {
    const s = game([player("u_h_mercer", "h_mercer", 0, 0), enemy("u_e", 7, 5)], { obj_consoles: 0 });
    const reach = reachableTiles(s, CONTENT, "u_h_mercer").map((p) => `${p.x},${p.y}`);
    expect(reach).toContain("4,0"); // 4 tiles east — exactly mobility
    expect(reach).not.toContain("5,0"); // 5 tiles — beyond mobility
    expect(reach).not.toContain("0,0"); // own tile excluded
  });

  it("never routes through or onto a tile held by another unit", () => {
    // A blocker sits directly east; the mover must detour around it.
    const s = game([player("u_h_mercer", "h_mercer", 0, 0), player("u_block", "h_okafor", 2, 0)], {
      obj_consoles: 0,
    });
    const reach = reachableTiles(s, CONTENT, "u_h_mercer").map((p) => `${p.x},${p.y}`);
    expect(reach).not.toContain("2,0"); // occupied — never a destination
    expect(reach).toContain("1,0"); // near side still reachable
    // Past the blocker: (3,0) needs 5 steps around it (beyond mobility 4), but
    // (3,1) is reachable in 4 — proof the BFS routes around rather than through.
    expect(reach).not.toContain("3,0");
    expect(reach).toContain("3,1");
  });

  it("never enters a wall tile", () => {
    // (1,3) and (1,4) are "#"; from (2,4) they are adjacent but unenterable.
    const s = game([player("u_h_mercer", "h_mercer", 2, 4), enemy("u_e", 7, 5)], { obj_consoles: 0 });
    const reach = reachableTiles(s, CONTENT, "u_h_mercer").map((p) => `${p.x},${p.y}`);
    expect(reach).not.toContain("1,4");
    expect(reach).not.toContain("1,3");
    expect(reach).toContain("2,3"); // walkable neighbour
  });

  it("rejects a move to an unreachable tile", () => {
    const s = game([player("u_h_mercer", "h_mercer", 0, 0), enemy("u_e", 7, 5)], { obj_consoles: 0 });
    expect(() => apply(s, { type: "battleMove", unit: "u_h_mercer", to: { x: 5, y: 0 } }, ctx)).toThrow(
      /reachable/,
    );
  });
});

// ================================================================= LOS (§6)
describe("line of sight (§6)", () => {
  it('"#" blocks line of sight', () => {
    // (5,1) is a wall between (4,1) and (6,1).
    const s = game([player("u_h_mercer", "h_mercer", 4, 1), enemy("u_e", 6, 1)], { obj_consoles: 0 });
    expect(visibleTargets(s, CONTENT, "u_h_mercer", "ab_shot")).toEqual([]);
  });

  it('"+" blocks through it but its own occupant stays targetable', () => {
    // (3,2) is high cover. A shooter behind it at (3,0) is blocked from (3,4)…
    const blocked = game([player("u_h_mercer", "h_mercer", 3, 0), enemy("u_e", 3, 4)], { obj_consoles: 0 });
    expect(visibleTargets(blocked, CONTENT, "u_h_mercer", "ab_shot")).toEqual([]);
    // …but an enemy standing ON the high cover is targetable (endpoint never blocks).
    const onCover = game([player("u_h_mercer", "h_mercer", 3, 0), enemy("u_e", 3, 2)], { obj_consoles: 0 });
    expect(visibleTargets(onCover, CONTENT, "u_h_mercer", "ab_shot")).toEqual(["u_e"]);
    // and the cover bonus (40) is applied to the hit%.
    expect(hitChance(onCover, CONTENT, "u_h_mercer", "u_e")).toBe(85 - 40 - 2 * 2);
  });

  it('"-" low cover never blocks', () => {
    // (1,1) is low cover between (1,0) and (1,2).
    const s = game([player("u_h_mercer", "h_mercer", 1, 0), enemy("u_e", 1, 2)], { obj_consoles: 0 });
    expect(visibleTargets(s, CONTENT, "u_h_mercer", "ab_shot")).toEqual(["u_e"]);
  });
});

// ==================================================== activation & cooldown (§5,§7)
describe("activation & cooldowns (§5, §7)", () => {
  it("using an ability ends the unit's activation (ap → 0)", () => {
    const s = game([player("u_h_mercer", "h_mercer", 4, 4), enemy("u_e", 6, 4)], { obj_consoles: 0 });
    const next = apply(
      s,
      { type: "battleAbility", unit: "u_h_mercer", ability: "ab_shot", target: "u_e" },
      ctx,
    );
    expect(unit(next, "u_h_mercer").ap).toBe(0); // had 2 AP, spent one shot, activation ends
  });

  it("interacting costs 1 AP but does NOT end the activation", () => {
    const s = game([player("u_h_mercer", "h_mercer", 6, 0), enemy("u_e", 7, 5)], { obj_consoles: 0 });
    const next = apply(s, { type: "battleInteract", unit: "u_h_mercer", interactable: "con_a" }, ctx);
    expect(unit(next, "u_h_mercer").ap).toBe(1); // 2 − 1, still able to act
  });

  it("a cooldown ability is unusable until it ticks back to 0 across phases", () => {
    const s = game(
      [player("u_h_okafor", "h_okafor", 2, 2, { hp: 3 }), player("u_h_mercer", "h_mercer", 2, 1, { hp: 3 })],
      { obj_consoles: 0 },
    );
    // Patch: restores power(2) hp, arms cooldown(2), ends activation.
    let g = apply(
      s,
      { type: "battleAbility", unit: "u_h_okafor", ability: "ab_patch", target: "u_h_mercer" },
      ctx,
    );
    expect(unit(g, "u_h_mercer").hp).toBe(5);
    expect(unit(g, "u_h_okafor").ap).toBe(0);
    expect(unit(g, "u_h_okafor").cooldowns.ab_patch).toBe(2);

    g = apply(g, { type: "battleEndTurn" }, ctx); // player phase start: cd 2 → 1
    expect(unit(g, "u_h_okafor").cooldowns.ab_patch).toBe(1);
    expect(() =>
      apply(g, { type: "battleAbility", unit: "u_h_okafor", ability: "ab_patch", target: "u_h_mercer" }, ctx),
    ).toThrow(/cooldown/);

    g = apply(g, { type: "battleEndTurn" }, ctx); // cd 1 → 0
    expect(unit(g, "u_h_okafor").cooldowns.ab_patch).toBe(0);
    expect(() =>
      apply(g, { type: "battleAbility", unit: "u_h_okafor", ability: "ab_patch", target: "u_h_mercer" }, ctx),
    ).not.toThrow();
  });
});

// ============================================== interactables & objectives (§8)
describe("interact order & objectives (§8)", () => {
  it("enforces the interact sequence and exposes what is next", () => {
    // A hero adjacent to con_b (7,4) but con_a is the next required console.
    const s = game([player("u_h_mercer", "h_mercer", 7, 3)], { obj_consoles: 0 }, { squad: ["h_mercer"] });
    expect(nextInteractables(s, CONTENT)).toEqual(["con_a"]);
    expect(() =>
      apply(s, { type: "battleInteract", unit: "u_h_mercer", interactable: "con_b" }, ctx),
    ).toThrow(/next console|sequence/);
  });

  it("advances the sequence after the correct console and requires adjacency", () => {
    const s = game([player("u_h_mercer", "h_mercer", 6, 0)], { obj_consoles: 0 }, { squad: ["h_mercer"] });
    // Not adjacent to con_b — rejected.
    expect(() =>
      apply(s, { type: "battleInteract", unit: "u_h_mercer", interactable: "con_b" }, ctx),
    ).toThrow();
    const next = apply(s, { type: "battleInteract", unit: "u_h_mercer", interactable: "con_a" }, ctx);
    expect(battleOf(next)!.objectiveProgress.obj_consoles).toBe(1);
    expect(nextInteractables(next, CONTENT)).toEqual(["con_b"]);
  });

  it("wins on the final console and resolves to the strategic layer (§8, §9)", () => {
    const s = game(
      [player("u_h_mercer", "h_mercer", 7, 3), player("u_h_okafor", "h_okafor", 0, 0, { hp: 0, ap: 0 })],
      { obj_consoles: 1 }, // con_a already done
      { squad: ["h_mercer", "h_okafor"], available: ["m_survey", "m_relay"] },
    );
    const next = apply(s, { type: "battleInteract", unit: "u_h_mercer", interactable: "con_b" }, ctx);

    expect(next.activeMission).toBeNull(); // battle resolved
    expect(next.missions.completed).toContainEqual({ mission: "m_relay", outcome: "victory", day: 1 });
    expect(next.missions.available).toEqual(["m_survey"]); // m_relay removed
    // victoryEffects: intel +5, xp +15 (squad), fatigue +20 (squad).
    expect(next.resources.intel).toBe(5);
    const merc = next.heroes.find((h) => h.hero === "h_mercer")!;
    expect(merc.xp).toBe(15);
    expect(merc.fatigue).toBe(20);
    // §9: the downed hero (okafor) takes inj_wounded, not death.
    const okf = next.heroes.find((h) => h.hero === "h_okafor")!;
    expect(okf.injuries).toContainEqual({ injury: "inj_wounded", daysRemaining: 5 });
    expect(next.journal.map((j) => j.text)).toContain("Dr. A. Okafor was wounded in action.");
    expect(next.journal.map((j) => j.text)).toContain("Secure the Relay: victory");
  });

  it("loses when the whole squad is down, and wounds every downed hero (§8, §9)", () => {
    // seed 0 lands the raider's shot on a lone 1-hp hero during the enemy phase.
    const s = game(
      [player("u_h_mercer", "h_mercer", 2, 1, { hp: 1 }), enemy("u_eg_guards_0", 2, 2)],
      { obj_consoles: 0 },
      { seed: 0, squad: ["h_mercer"] },
    );
    const next = apply(s, { type: "battleEndTurn" }, ctx);

    expect(next.activeMission).toBeNull();
    expect(next.missions.completed).toContainEqual({ mission: "m_relay", outcome: "defeat", day: 1 });
    // defeatEffects: support −1 (started at 5).
    expect(next.variables.support).toBe(4);
    const merc = next.heroes.find((h) => h.hero === "h_mercer")!;
    expect(merc.injuries).toContainEqual({ injury: "inj_wounded", daysRemaining: 5 });
    expect(next.journal.map((j) => j.text)).toContain("Secure the Relay: defeat");
  });
});

// ================================================================ enemy AI (§10)
describe("enemy AI v0 (§10)", () => {
  it("is deterministic — same state + seed twice ⇒ identical sequence", () => {
    const build = () =>
      game(
        [
          player("u_h_mercer", "h_mercer", 3, 5, { hp: 3 }),
          enemy("u_eg_guards_0", 6, 5),
          enemy("u_eg_guards_1", 7, 5),
        ],
        { obj_consoles: 0 },
        { seed: 42, squad: ["h_mercer"] },
      );
    const a = apply(build(), { type: "battleEndTurn" }, ctx);
    const b = apply(build(), { type: "battleEndTurn" }, ctx);
    expect(JSON.stringify(battleOf(a))).toBe(JSON.stringify(battleOf(b)));
    // and the enemies actually did something this phase (moved and/or fired).
    expect(battleOf(a)!.log.some((l) => l.includes("u_eg_guards_0"))).toBe(true);
  });

  it("closes distance when no player is in range", () => {
    const s = game(
      [player("u_h_mercer", "h_mercer", 0, 0), enemy("u_eg_guards_0", 7, 5)],
      { obj_consoles: 0 },
      { seed: 7, squad: ["h_mercer"] },
    );
    const before = 7 + 5; // manhattan from (7,5) to (0,0)
    const next = apply(s, { type: "battleEndTurn" }, ctx);
    const e = unit(next, "u_eg_guards_0");
    const after = Math.abs(e.pos.x - 0) + Math.abs(e.pos.y - 0);
    expect(after).toBeLessThan(before); // it advanced toward the squad
    expect(battleOf(next)!.log.some((l) => l.startsWith("u_eg_guards_0 moves to"))).toBe(true);
  });

  it("prefers a lethal shot over moving to cover when both are available", () => {
    // Enemy at (2,2) can shoot the adjacent 1-hp hero (lethal) OR step onto the
    // (3,2) high-cover tile. §10 attack scoring (≈90) dwarfs the cover move (≈22).
    const s = game(
      [player("u_h_mercer", "h_mercer", 2, 1, { hp: 1 }), enemy("u_eg_guards_0", 2, 2)],
      { obj_consoles: 0 },
      { seed: 3, squad: ["h_mercer"] },
    );
    const next = apply(s, { type: "battleEndTurn" }, ctx);
    // Resolution may end in victory-less defeat; read the log either way.
    const log = (next.activeMission?.kind === "tactical" ? next.activeMission.battle.log : []) as string[];
    // If it resolved (hero downed) the battle log is gone; assert via outcome instead.
    if (next.activeMission === null) {
      expect(next.missions.completed).toContainEqual({ mission: "m_relay", outcome: "defeat", day: 1 });
    } else {
      expect(log.some((l) => l.includes("u_eg_guards_0->u_h_mercer hit"))).toBe(true);
      expect(unit(next, "u_eg_guards_0").pos).toEqual({ x: 2, y: 2 }); // shot, did not move to cover
    }
  });
});
