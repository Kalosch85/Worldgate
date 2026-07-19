import { describe, expect, it } from "vitest";
import type { ContentBundleT, GameStateT } from "../data/schemas.js";
import { newCampaign } from "./campaign.js";
import { RuleError } from "./errors.js";
import { canLaunchMission, launchMission } from "./missions.js";
import { loadTestContent } from "../test/content.js";

/**
 * launchMission (docs/specs/narrative-engine.md §3): squad validation, the
 * narrative hand-off, and the tactical placeholder. Every RuleError path in §3
 * plus the §9-required tactical_not_implemented and materials checks.
 */
const CONTENT: ContentBundleT = loadTestContent();

/** A fresh campaign with the ev_first_contact side mission unlocked (D-9: it
 * is unlocked mid-campaign, so tests add it to `available` explicitly). */
function stateWith(overrides?: Partial<GameStateT>): GameStateT {
  const state = { ...newCampaign(1), ...overrides };
  if (!state.missions.available.includes("m_rival_stranded")) {
    state.missions = {
      ...state.missions,
      available: [...state.missions.available, "m_rival_stranded"],
    };
  }
  return state;
}

/** Run `launchMission` and return the thrown RuleError (or fail). */
function launchError(state: GameStateT, mission: string, squad: string[]): RuleError {
  try {
    launchMission(state, CONTENT, mission, squad);
  } catch (err) {
    if (err instanceof RuleError) return err;
    throw err;
  }
  throw new Error("expected launchMission to throw");
}

describe("launchMission — narrative hand-off", () => {
  it("opens the narrative mission at the event script's entry node", () => {
    const state = stateWith();
    const next = launchMission(state, CONTENT, "m_rival_stranded", ["h_mercer", "h_okafor"]);
    expect(next.activeMission).toEqual({
      kind: "narrative",
      mission: "m_rival_stranded",
      script: "ev_first_contact",
      node: "n_intro", // ev_first_contact.entryNode
      squad: ["h_mercer", "h_okafor"],
      gatedSeen: false,
    });
  });

  it("does not mutate the input state", () => {
    const state = stateWith();
    const before = JSON.stringify(state);
    launchMission(state, CONTENT, "m_rival_stranded", ["h_mercer", "h_okafor"]);
    expect(JSON.stringify(state)).toBe(before);
  });

  it("allows an injured-but-not-exhausted hero to launch", () => {
    const state = stateWith();
    const mercer = state.heroes.find((h) => h.hero === "h_mercer")!;
    mercer.injuries = [{ injury: "inj_wounded", daysRemaining: 3 }];
    mercer.fatigue = 79; // injured and tired, but below the 80 exhausted line
    const next = launchMission(state, CONTENT, "m_rival_stranded", ["h_mercer", "h_okafor"]);
    expect(next.activeMission?.kind).toBe("narrative");
  });
});

describe("launchMission — RuleError guards (§3)", () => {
  it("rejects a mission not in missions.available", () => {
    // m_relay is not unlocked in a fresh campaign.
    expect(launchError(stateWith(), "m_relay", ["h_mercer", "h_okafor"]).code).toBe(
      "launchMission/mission_unavailable",
    );
  });

  it("rejects launching while a mission is already active", () => {
    const state = stateWith({
      activeMission: {
        kind: "narrative",
        mission: "m_rival_stranded",
        script: "ev_first_contact",
        node: "n_intro",
        squad: ["h_mercer", "h_okafor"],
        gatedSeen: false,
      },
    });
    expect(launchError(state, "m_rival_stranded", ["h_mercer", "h_okafor"]).code).toBe(
      "launchMission/mission_active",
    );
  });

  it("rejects a squad smaller than the mission minimum", () => {
    // m_rival_stranded min is 1; an empty squad is the only size below it.
    expect(launchError(stateWith(), "m_rival_stranded", []).code).toBe("launchMission/squad_size");
  });

  it("allows a solo squad (m_rival_stranded min is 1)", () => {
    const next = launchMission(stateWith(), CONTENT, "m_rival_stranded", ["h_mercer"]);
    expect(next.activeMission?.squad).toEqual(["h_mercer"]);
  });

  it("rejects a squad larger than the mission maximum", () => {
    // m_rival_stranded max is 3; feed four ids (size guard runs before hero lookup).
    expect(launchError(stateWith(), "m_rival_stranded", ["h_mercer", "h_okafor", "h_x", "h_y"]).code).toBe(
      "launchMission/squad_size",
    );
  });

  it("rejects an unknown hero id", () => {
    expect(launchError(stateWith(), "m_rival_stranded", ["h_mercer", "h_ghost"]).code).toBe(
      "launchMission/squad_unknown_hero",
    );
  });

  it("rejects a duplicate hero id", () => {
    expect(launchError(stateWith(), "m_rival_stranded", ["h_mercer", "h_mercer"]).code).toBe(
      "launchMission/squad_duplicate",
    );
  });

  it("rejects an exhausted hero (fatigue ≥ 80)", () => {
    const state = stateWith();
    state.heroes.find((h) => h.hero === "h_okafor")!.fatigue = 80;
    expect(launchError(state, "m_rival_stranded", ["h_mercer", "h_okafor"]).code).toBe(
      "launchMission/squad_exhausted",
    );
  });
});

describe("launchMission — tactical launch (§3)", () => {
  /** A campaign with m_relay (tactical) unlocked and both heroes fit. */
  function tacticalState(materials: number): GameStateT {
    const state = stateWith();
    state.missions.available.push("m_relay");
    state.resources.materials = materials;
    return state;
  }

  it("opens a tactical battle and debits the materials cost", () => {
    const next = launchMission(tacticalState(50), CONTENT, "m_relay", ["h_mercer", "h_okafor"]);
    expect(next.resources.materials).toBe(45); // 50 − TACTICAL_LAUNCH_COST(5)
    expect(next.activeMission?.kind).toBe("tactical");
    const battle = next.activeMission?.kind === "tactical" ? next.activeMission.battle : null;
    expect(battle?.map).toBe("map_relay");
    expect(battle?.round).toBe(1);
    expect(battle?.activeSide).toBe("player");
    // 2 heroes + 2 raiders on the map.
    expect(battle?.units.map((u) => u.id)).toEqual([
      "u_h_mercer",
      "u_h_okafor",
      "u_eg_guards_0",
      "u_eg_guards_1",
    ]);
    // Heroes on the first two squadSpawns in squad order, hp = HERO_MAX_HP(5).
    expect(battle?.units[0]).toMatchObject({
      side: "player",
      hero: "h_mercer",
      pos: { x: 0, y: 0 },
      hp: 5,
      ap: 2,
    });
    expect(battle?.units[1]).toMatchObject({
      side: "player",
      hero: "h_okafor",
      pos: { x: 1, y: 0 },
      hp: 5,
      ap: 2,
    });
    // Raiders from the enemy group, hp = UnitTypeDef.maxHp(4).
    expect(battle?.units[2]).toMatchObject({
      side: "enemy",
      unitType: "ut_raider",
      pos: { x: 6, y: 4 },
      hp: 4,
    });
    expect(battle?.objectiveProgress).toEqual({ obj_consoles: 0 });
    expect(battle?.log).toEqual([]);
  });

  it("rejects a tactical launch below the materials cost", () => {
    // TACTICAL_LAUNCH_COST is 5; 4 is short.
    const err = launchError(tacticalState(4), "m_relay", ["h_mercer", "h_okafor"]);
    expect(err.code).toBe("launchMission/insufficient_materials");
  });

  it("does not mutate the input state on a tactical launch", () => {
    const state = tacticalState(50);
    const before = JSON.stringify(state);
    launchMission(state, CONTENT, "m_relay", ["h_mercer", "h_okafor"]);
    expect(JSON.stringify(state)).toBe(before);
    expect(state.activeMission).toBeNull();
  });

  it("never opens activeMission when the launch is refused", () => {
    const state = tacticalState(4); // below cost -> throws, state untouched
    expect(() => launchMission(state, CONTENT, "m_relay", ["h_mercer", "h_okafor"])).toThrow(RuleError);
    expect(state.activeMission).toBeNull();
  });

  it("honors MissionDef.launchCost 0 — the spine battle launches at 0 materials (D-9)", () => {
    // m_vy_intercept is mandatory; a materials price on it would be a
    // reachable permanent soft-lock (materials have no unconditional income).
    const state = stateWith();
    state.missions.available.push("m_vy_intercept");
    state.resources.materials = 0;
    expect(canLaunchMission(state, CONTENT, "m_vy_intercept", ["h_mercer", "h_okafor"])).toBe(true);
    const next = launchMission(state, CONTENT, "m_vy_intercept", ["h_mercer", "h_okafor"]);
    expect(next.resources.materials).toBe(0); // nothing debited
    expect(next.activeMission?.kind).toBe("tactical");
    const battle = next.activeMission?.kind === "tactical" ? next.activeMission.battle : null;
    expect(battle?.map).toBe("map_vy_intercept");
    expect(battle?.units.filter((u) => u.side === "enemy").map((u) => u.unitType)).toEqual([
      "ut_tender",
      "ut_tender",
    ]);
  });
});

describe("canLaunchMission — UI guard", () => {
  it("true for a valid narrative launch", () => {
    expect(canLaunchMission(stateWith(), CONTENT, "m_rival_stranded", ["h_mercer", "h_okafor"])).toBe(true);
  });

  it("false for an unavailable mission", () => {
    expect(canLaunchMission(stateWith(), CONTENT, "m_relay", ["h_mercer", "h_okafor"])).toBe(false);
  });

  it("false when the squad is the wrong size", () => {
    // m_rival_stranded accepts 1–3; a 4-hero squad exceeds the maximum.
    expect(
      canLaunchMission(stateWith(), CONTENT, "m_rival_stranded", ["h_mercer", "h_okafor", "h_x", "h_y"]),
    ).toBe(false);
  });

  it("false when a squad member is exhausted", () => {
    const state = stateWith();
    state.heroes.find((h) => h.hero === "h_okafor")!.fatigue = 90;
    expect(canLaunchMission(state, CONTENT, "m_rival_stranded", ["h_mercer", "h_okafor"])).toBe(false);
  });

  it("tracks the tactical materials cost", () => {
    const rich = stateWith();
    rich.missions.available.push("m_relay");
    rich.resources.materials = 5;
    expect(canLaunchMission(rich, CONTENT, "m_relay", ["h_mercer", "h_okafor"])).toBe(true);
    rich.resources.materials = 4;
    expect(canLaunchMission(rich, CONTENT, "m_relay", ["h_mercer", "h_okafor"])).toBe(false);
  });
});
