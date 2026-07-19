import { describe, expect, it } from "vitest";
import { ContentBundle, type ContentBundleT, type GameStateT } from "../data/schemas.js";
import { applyEffects } from "./effects.js";
import type { ReducerCtx } from "./reducer.js";
import { mulberry32 } from "./rng.js";

const CONTENT: ContentBundleT = ContentBundle.parse({
  heroes: [],
  injuries: [{ id: "inj_wounded", name: "Wounded", daysToHeal: 5, skillPenalties: { combat: -2 } }],
  techs: [],
  abilities: [],
  unitTypes: [],
  maps: [],
  events: [],
  missions: [],
  facilities: [],
});

function ctx(seed = 1): ReducerCtx {
  return { content: CONTENT, rng: mulberry32(seed) };
}

function baseState(): GameStateT {
  return {
    version: 1,
    campaign: { day: 3, seed: 1 },
    settings: { showLockedOptions: false },
    resources: { funds: 10, materials: 10, intel: 0, exotics: 0 },
    variables: { support: 5 },
    flags: {},
    journal: [],
    modifiers: {},
    heroes: [
      { hero: "h_a", xp: 0, level: 1, fatigue: 50, injuries: [], skillBonuses: {} },
      { hero: "h_b", xp: 0, level: 1, fatigue: 10, injuries: [], skillBonuses: {} },
    ],
    personnel: { total: 5, assignments: { logistics: 1, research: 1, infirmary: 1 } },
    research: { current: null, completed: [] },
    construction: { current: null, built: [] },
    missions: { available: ["m_existing"], completed: [], queuedEvents: [] },
    activeMission: null,
  };
}

describe("applyEffects", () => {
  it("resource: adds a positive delta", () => {
    const s = applyEffects(baseState(), [{ type: "resource", resource: "materials", delta: 5 }], ctx());
    expect(s.resources.materials).toBe(15);
  });

  it("resource: floors at 0 on a large negative delta", () => {
    const s = applyEffects(baseState(), [{ type: "resource", resource: "funds", delta: -100 }], ctx());
    expect(s.resources.funds).toBe(0);
  });

  it("flag: sets the value", () => {
    const s = applyEffects(baseState(), [{ type: "flag", flag: "met_rival", value: true }], ctx());
    expect(s.flags.met_rival).toBe(true);
  });

  it("variable: adds delta, unclamped (can go negative)", () => {
    const s = applyEffects(baseState(), [{ type: "variable", variable: "support", delta: -10 }], ctx());
    expect(s.variables.support).toBe(-5);
  });

  it("modifier add: missing key starts from the registry default", () => {
    const s = applyEffects(
      baseState(),
      [{ type: "modifier", key: "incomeMult", mode: "add", value: 0.5 }],
      ctx(),
    );
    expect(s.modifiers.incomeMult).toBe(1.5);
  });

  it("modifier set: overwrites regardless of prior value", () => {
    const s = applyEffects(
      baseState(),
      [
        { type: "modifier", key: "researchBonus", mode: "add", value: 2 },
        { type: "modifier", key: "researchBonus", mode: "set", value: 3 },
      ],
      ctx(),
    );
    expect(s.modifiers.researchBonus).toBe(3);
  });

  it("fatigue: applies to every squad member and clamps at 100", () => {
    const s = applyEffects(baseState(), [{ type: "fatigue", scope: "squad", delta: 60 }], ctx(), [
      "h_a",
      "h_b",
    ]);
    expect(s.heroes.find((h) => h.hero === "h_a")!.fatigue).toBe(100);
    expect(s.heroes.find((h) => h.hero === "h_b")!.fatigue).toBe(70);
  });

  it("fatigue: clamps at 0 on the low end", () => {
    const s = applyEffects(baseState(), [{ type: "fatigue", scope: "squad", delta: -100 }], ctx(), ["h_a"]);
    expect(s.heroes.find((h) => h.hero === "h_a")!.fatigue).toBe(0);
  });

  it("fatigue: heroes outside the squad are untouched", () => {
    const s = applyEffects(baseState(), [{ type: "fatigue", scope: "squad", delta: -100 }], ctx(), ["h_a"]);
    expect(s.heroes.find((h) => h.hero === "h_b")!.fatigue).toBe(10);
  });

  it("xp: adds the amount to every squad member", () => {
    const s = applyEffects(baseState(), [{ type: "xp", scope: "squad", amount: 15 }], ctx(), ["h_a", "h_b"]);
    expect(s.heroes.find((h) => h.hero === "h_a")!.xp).toBe(15);
    expect(s.heroes.find((h) => h.hero === "h_b")!.xp).toBe(15);
  });

  it("injury randomSquadMember: injures exactly one squad member at full daysToHeal", () => {
    const s = applyEffects(
      baseState(),
      [{ type: "injury", scope: "randomSquadMember", injury: "inj_wounded" }],
      ctx(7),
      ["h_a", "h_b"],
    );
    const injured = s.heroes.filter((h) => h.injuries.length > 0);
    expect(injured).toHaveLength(1);
    expect(injured[0]!.injuries).toEqual([{ injury: "inj_wounded", daysRemaining: 5 }]);
  });

  it("injury randomSquadMember: no-op without a squad", () => {
    const s = applyEffects(
      baseState(),
      [{ type: "injury", scope: "randomSquadMember", injury: "inj_wounded" }],
      ctx(),
    );
    expect(s.heroes.every((h) => h.injuries.length === 0)).toBe(true);
  });

  it("queueEvent: appends with fireOnDay = campaign.day + delayDays", () => {
    const s = applyEffects(baseState(), [{ type: "queueEvent", event: "ev_x", delayDays: 4 }], ctx());
    expect(s.missions.queuedEvents).toContainEqual({ event: "ev_x", fireOnDay: 7 });
  });

  it("unlockMission: appends if absent", () => {
    const s = applyEffects(baseState(), [{ type: "unlockMission", mission: "m_new" }], ctx());
    expect(s.missions.available).toEqual(["m_existing", "m_new"]);
  });

  it("unlockMission: does not duplicate an already-available mission", () => {
    const s = applyEffects(baseState(), [{ type: "unlockMission", mission: "m_existing" }], ctx());
    expect(s.missions.available).toEqual(["m_existing"]);
  });

  it("log: appends { day, text } to the journal", () => {
    const s = applyEffects(baseState(), [{ type: "log", text: "Something happened." }], ctx());
    expect(s.journal).toEqual([{ day: 3, text: "Something happened." }]);
  });

  it("applies effects in array order", () => {
    const s = applyEffects(
      baseState(),
      [
        { type: "resource", resource: "funds", delta: 10 },
        { type: "resource", resource: "funds", delta: -5 },
      ],
      ctx(),
    );
    expect(s.resources.funds).toBe(15);
  });

  it("does not mutate the input state", () => {
    const state = baseState();
    const before = JSON.stringify(state);
    applyEffects(state, [{ type: "resource", resource: "funds", delta: -100 }], ctx());
    expect(JSON.stringify(state)).toBe(before);
  });
});
