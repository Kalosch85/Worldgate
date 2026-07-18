import { describe, expect, it } from "vitest";
import type { ContentBundleT, GameStateT, HeroDefT } from "../data/schemas.js";
import { loadTestContent } from "../test/content.js";
import { applyEffects } from "./effects.js";
import type { ReducerCtx } from "./reducer.js";
import { mulberry32 } from "./rng.js";
import {
  applyLevelUps,
  canBeSelectedForSquad,
  effectiveSkill,
  effectiveSkills,
  FATIGUE_EXHAUSTED,
  FATIGUE_TIRED,
  isExhausted,
  isTired,
  levelForXp,
  levelUpSkill,
  MAX_LEVEL,
  XP_THRESHOLDS,
} from "./roster.js";

const CONTENT = loadTestContent();
type HeroStateT = GameStateT["heroes"][number];
type InjuryDefT = ContentBundleT["injuries"][number];

const INJURIES: readonly InjuryDefT[] = CONTENT.injuries;
const MERCER = CONTENT.heroes.find((h) => h.id === "h_mercer")!; // combat 6 highest
const OKAFOR = CONTENT.heroes.find((h) => h.id === "h_okafor")!; // science 7 highest

function hero(overrides: Partial<HeroStateT> = {}): HeroStateT {
  return { hero: "h_mercer", xp: 0, level: 1, fatigue: 0, injuries: [], skillBonuses: {}, ...overrides };
}

function ctx(seed = 1): ReducerCtx {
  return { content: CONTENT, rng: mulberry32(seed) };
}

// --------------------------------------------------------------- effective skill

describe("effectiveSkills selector (§7)", () => {
  it("is base + skillBonuses + injury penalties + fatigue penalty", () => {
    const h = hero({
      fatigue: 50, // tired -> -1 to every skill
      skillBonuses: { combat: 2 },
      injuries: [{ injury: "inj_wounded", daysRemaining: 3 }], // combat -2
    });
    const eff = effectiveSkills(h, MERCER, INJURIES);
    // combat: base 6 + bonus 2 + injury -2 + tired -1 = 5
    expect(eff.combat).toBe(5);
    // resolve: base 5 + tired -1 = 4 (no bonus / injury)
    expect(eff.resolve).toBe(4);
    // science: base 1 + tired -1 = 0
    expect(eff.science).toBe(0);
  });

  it("equals raw base skills for a fresh, rested, uninjured hero", () => {
    const eff = effectiveSkills(hero(), MERCER, INJURIES);
    expect(eff).toEqual(MERCER.skills);
  });

  it("stacks penalties from multiple injuries", () => {
    const h = hero({
      injuries: [
        { injury: "inj_wounded", daysRemaining: 4 }, // combat -2
        { injury: "inj_shaken", daysRemaining: 2 }, // resolve -2
      ],
    });
    const eff = effectiveSkills(h, MERCER, INJURIES);
    expect(eff.combat).toBe(MERCER.skills.combat - 2);
    expect(eff.resolve).toBe(MERCER.skills.resolve - 2);
  });

  it("leaves effective values unclamped (may go below zero)", () => {
    // science base 1, tired -1, and a synthetic -2 penalty via injury on science
    const injuries: InjuryDefT[] = [
      { id: "inj_x", name: "X", daysToHeal: 2, skillPenalties: { science: -2 } },
    ];
    const h = hero({ fatigue: FATIGUE_TIRED, injuries: [{ injury: "inj_x", daysRemaining: 1 }] });
    expect(effectiveSkill(h, MERCER, injuries, "science")).toBe(1 - 1 - 2); // -2
  });

  it("effectiveSkill wrapper matches the map entry", () => {
    const h = hero({ skillBonuses: { engineering: 3 } });
    expect(effectiveSkill(h, MERCER, INJURIES, "engineering")).toBe(
      effectiveSkills(h, MERCER, INJURIES).engineering,
    );
  });
});

// --------------------------------------------------------------- fatigue thresholds

describe("fatigue thresholds (§7)", () => {
  it("boundary: tired starts exactly at 50, not at 49", () => {
    expect(isTired(hero({ fatigue: 49 }))).toBe(false);
    expect(isTired(hero({ fatigue: FATIGUE_TIRED }))).toBe(true); // 50
    expect(effectiveSkill(hero({ fatigue: 49 }), MERCER, INJURIES, "combat")).toBe(6);
    expect(effectiveSkill(hero({ fatigue: 50 }), MERCER, INJURIES, "combat")).toBe(5);
  });

  it("boundary: exhausted starts exactly at 80, not at 79", () => {
    expect(isExhausted(hero({ fatigue: 79 }))).toBe(false);
    expect(isExhausted(hero({ fatigue: FATIGUE_EXHAUSTED }))).toBe(true); // 80
  });

  it("tired but not exhausted between 50 and 79", () => {
    const h = hero({ fatigue: 79 });
    expect(isTired(h)).toBe(true);
    expect(isExhausted(h)).toBe(false);
    expect(canBeSelectedForSquad(h)).toBe(true); // still selectable, just -1
  });

  it("exhausted (>=80) blocks squad selection; below 80 allows it", () => {
    expect(canBeSelectedForSquad(hero({ fatigue: 79 }))).toBe(true);
    expect(canBeSelectedForSquad(hero({ fatigue: 80 }))).toBe(false);
    expect(canBeSelectedForSquad(hero({ fatigue: 100 }))).toBe(false);
  });

  it("the tired penalty still applies while exhausted (single -1, not doubled)", () => {
    expect(effectiveSkill(hero({ fatigue: 90 }), MERCER, INJURIES, "combat")).toBe(5);
  });
});

// --------------------------------------------------------------- XP -> level

describe("levelForXp thresholds (§7)", () => {
  it("matches the exact cumulative thresholds 25/75/150/250, cap 5", () => {
    expect(XP_THRESHOLDS).toEqual([0, 25, 75, 150, 250]);
    expect(MAX_LEVEL).toBe(5);
  });

  it("holds level 1 below the first threshold and reaches 2 exactly at 25", () => {
    expect(levelForXp(0)).toBe(1);
    expect(levelForXp(24)).toBe(1);
    expect(levelForXp(25)).toBe(2);
  });

  it("each boundary flips at exactly the threshold, not one before", () => {
    expect(levelForXp(74)).toBe(2);
    expect(levelForXp(75)).toBe(3);
    expect(levelForXp(149)).toBe(3);
    expect(levelForXp(150)).toBe(4);
    expect(levelForXp(249)).toBe(4);
    expect(levelForXp(250)).toBe(5);
  });

  it("caps at level 5 beyond the top threshold", () => {
    expect(levelForXp(250)).toBe(5);
    expect(levelForXp(1000)).toBe(5);
  });
});

// --------------------------------------------------------------- level-up + tie-break

describe("levelUpSkill tie-break (§7)", () => {
  it("picks the highest base skill (Mercer -> combat, Okafor -> science)", () => {
    expect(levelUpSkill(MERCER)).toBe("combat");
    expect(levelUpSkill(OKAFOR)).toBe("science");
  });

  it("breaks ties by schema enum order: combat < science < engineering < diplomacy < resolve", () => {
    const tied = (skills: HeroDefT["skills"]): HeroDefT => ({
      id: "h_t",
      name: "T",
      archetypes: ["soldier"],
      skills,
      abilities: ["ab_shot"],
    });
    // science and engineering both 5 (max) -> science wins (earlier in enum)
    expect(levelUpSkill(tied({ combat: 3, science: 5, engineering: 5, diplomacy: 1, resolve: 2 }))).toBe(
      "science",
    );
    // all equal -> combat (first enum member)
    expect(levelUpSkill(tied({ combat: 4, science: 4, engineering: 4, diplomacy: 4, resolve: 4 }))).toBe(
      "combat",
    );
    // resolve alone is the max even though it is last in enum order
    expect(levelUpSkill(tied({ combat: 1, science: 1, engineering: 1, diplomacy: 1, resolve: 9 }))).toBe(
      "resolve",
    );
  });
});

describe("applyLevelUps (§7)", () => {
  it("is a no-op when XP has not crossed the next threshold", () => {
    const h = hero({ xp: 24, level: 1 });
    expect(applyLevelUps(h, MERCER)).toBe(h);
  });

  it("levels up by one and adds +1 to the level-up skill", () => {
    const leveled = applyLevelUps(hero({ xp: 25, level: 1 }), MERCER);
    expect(leveled.level).toBe(2);
    expect(leveled.skillBonuses).toEqual({ combat: 1 });
  });

  it("a multi-level jump adds the whole delta to the single level-up skill", () => {
    // 0 -> 250 xp crosses to level 5 (4 levels) in one application
    const leveled = applyLevelUps(hero({ xp: 250, level: 1 }), OKAFOR);
    expect(leveled.level).toBe(5);
    expect(leveled.skillBonuses).toEqual({ science: 4 });
  });

  it("accumulates onto pre-existing skillBonuses", () => {
    const leveled = applyLevelUps(hero({ xp: 25, level: 1, skillBonuses: { combat: 2 } }), MERCER);
    expect(leveled.skillBonuses).toEqual({ combat: 3 });
  });

  it("does not mutate the input hero", () => {
    const h = hero({ xp: 75, level: 1 });
    const before = JSON.stringify(h);
    applyLevelUps(h, MERCER);
    expect(JSON.stringify(h)).toBe(before);
  });
});

// -------------------------------------------------- integration via the xp effect

describe("xp effect drives level-up through applyEffects (§6 + §7)", () => {
  it("awards XP to the squad and levels the hero, bumping the level-up skill", () => {
    const base = newHeroState();
    const next = applyEffects(base, [{ type: "xp", scope: "squad", amount: 25 }], ctx(), ["h_mercer"]);
    const m = next.heroes.find((h) => h.hero === "h_mercer")!;
    expect(m.xp).toBe(25);
    expect(m.level).toBe(2);
    expect(m.skillBonuses).toEqual({ combat: 1 });
  });

  it("leaves heroes outside the squad untouched", () => {
    const base = newHeroState();
    const next = applyEffects(base, [{ type: "xp", scope: "squad", amount: 250 }], ctx(), ["h_mercer"]);
    const o = next.heroes.find((h) => h.hero === "h_okafor")!;
    expect(o.xp).toBe(0);
    expect(o.level).toBe(1);
  });

  it("crosses multiple thresholds when a single award is large", () => {
    const base = newHeroState();
    const next = applyEffects(base, [{ type: "xp", scope: "squad", amount: 300 }], ctx(), ["h_okafor"]);
    const o = next.heroes.find((h) => h.hero === "h_okafor")!;
    expect(o.level).toBe(5); // capped
    expect(o.skillBonuses).toEqual({ science: 4 });
  });
});

function newHeroState(): GameStateT {
  // Minimal state carrying just the two seeded heroes for xp-effect tests.
  return {
    version: 1,
    campaign: { day: 1, seed: 1 },
    settings: { showLockedOptions: false },
    resources: { funds: 0, materials: 0, intel: 0, exotics: 0 },
    variables: { support: 0 },
    flags: {},
    journal: [],
    modifiers: {},
    heroes: [
      { hero: "h_mercer", xp: 0, level: 1, fatigue: 0, injuries: [], skillBonuses: {} },
      { hero: "h_okafor", xp: 0, level: 1, fatigue: 0, injuries: [], skillBonuses: {} },
    ],
    personnel: { total: 20, assignments: { logistics: 12, research: 6, infirmary: 2 } },
    research: { current: null, completed: [] },
    missions: { available: [], completed: [], queuedEvents: [] },
    activeMission: null,
  };
}
