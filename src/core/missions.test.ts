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

/** A campaign where h_okafor is exhausted and h_mercer is injured but fit. */
function stateWith(overrides?: Partial<GameStateT>): GameStateT {
  return { ...newCampaign(1), ...overrides };
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
    const next = launchMission(state, CONTENT, "m_survey", ["h_mercer", "h_okafor"]);
    expect(next.activeMission).toEqual({
      kind: "narrative",
      mission: "m_survey",
      script: "ev_first_contact",
      node: "n_intro", // ev_first_contact.entryNode
      squad: ["h_mercer", "h_okafor"],
      gatedSeen: false,
    });
  });

  it("does not mutate the input state", () => {
    const state = stateWith();
    const before = JSON.stringify(state);
    launchMission(state, CONTENT, "m_survey", ["h_mercer", "h_okafor"]);
    expect(JSON.stringify(state)).toBe(before);
  });

  it("allows an injured-but-not-exhausted hero to launch", () => {
    const state = stateWith();
    const mercer = state.heroes.find((h) => h.hero === "h_mercer")!;
    mercer.injuries = [{ injury: "inj_wounded", daysRemaining: 3 }];
    mercer.fatigue = 79; // injured and tired, but below the 80 exhausted line
    const next = launchMission(state, CONTENT, "m_survey", ["h_mercer", "h_okafor"]);
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
        mission: "m_survey",
        script: "ev_first_contact",
        node: "n_intro",
        squad: ["h_mercer", "h_okafor"],
        gatedSeen: false,
      },
    });
    expect(launchError(state, "m_survey", ["h_mercer", "h_okafor"]).code).toBe(
      "launchMission/mission_active",
    );
  });

  it("rejects a squad smaller than the mission minimum", () => {
    // m_survey min is 1; an empty squad is the only size below it.
    expect(launchError(stateWith(), "m_survey", []).code).toBe("launchMission/squad_size");
  });

  it("allows a solo squad (m_survey min is 1)", () => {
    const next = launchMission(stateWith(), CONTENT, "m_survey", ["h_mercer"]);
    expect(next.activeMission?.squad).toEqual(["h_mercer"]);
  });

  it("rejects a squad larger than the mission maximum", () => {
    // m_survey max is 3; feed four ids (size guard runs before hero lookup).
    expect(launchError(stateWith(), "m_survey", ["h_mercer", "h_okafor", "h_x", "h_y"]).code).toBe(
      "launchMission/squad_size",
    );
  });

  it("rejects an unknown hero id", () => {
    expect(launchError(stateWith(), "m_survey", ["h_mercer", "h_ghost"]).code).toBe(
      "launchMission/squad_unknown_hero",
    );
  });

  it("rejects a duplicate hero id", () => {
    expect(launchError(stateWith(), "m_survey", ["h_mercer", "h_mercer"]).code).toBe(
      "launchMission/squad_duplicate",
    );
  });

  it("rejects an exhausted hero (fatigue ≥ 80)", () => {
    const state = stateWith();
    state.heroes.find((h) => h.hero === "h_okafor")!.fatigue = 80;
    expect(launchError(state, "m_survey", ["h_mercer", "h_okafor"]).code).toBe(
      "launchMission/squad_exhausted",
    );
  });
});

describe("launchMission — tactical placeholder (§3)", () => {
  /** A campaign with m_relay (tactical) unlocked and both heroes fit. */
  function tacticalState(materials: number): GameStateT {
    const state = stateWith();
    state.missions.available.push("m_relay");
    state.resources.materials = materials;
    return state;
  }

  it("refuses a tactical launch with tactical_not_implemented when materials suffice", () => {
    const err = launchError(tacticalState(50), "m_relay", ["h_mercer", "h_okafor"]);
    expect(err.code).toBe("tactical_not_implemented");
  });

  it("rejects a tactical launch below the materials cost", () => {
    // TACTICAL_LAUNCH_COST is 5; 4 is short.
    const err = launchError(tacticalState(4), "m_relay", ["h_mercer", "h_okafor"]);
    expect(err.code).toBe("launchMission/insufficient_materials");
  });

  it("never opens activeMission for a tactical mission", () => {
    // Both the sufficient and insufficient paths throw — state is untouched.
    const state = tacticalState(50);
    expect(() => launchMission(state, CONTENT, "m_relay", ["h_mercer", "h_okafor"])).toThrow(RuleError);
    expect(state.activeMission).toBeNull();
  });
});

describe("canLaunchMission — UI guard", () => {
  it("true for a valid narrative launch", () => {
    expect(canLaunchMission(stateWith(), CONTENT, "m_survey", ["h_mercer", "h_okafor"])).toBe(true);
  });

  it("false for an unavailable mission", () => {
    expect(canLaunchMission(stateWith(), CONTENT, "m_relay", ["h_mercer", "h_okafor"])).toBe(false);
  });

  it("false when the squad is the wrong size", () => {
    // m_survey accepts 1–3; a 4-hero squad exceeds the maximum.
    expect(canLaunchMission(stateWith(), CONTENT, "m_survey", ["h_mercer", "h_okafor", "h_x", "h_y"])).toBe(
      false,
    );
  });

  it("false when a squad member is exhausted", () => {
    const state = stateWith();
    state.heroes.find((h) => h.hero === "h_okafor")!.fatigue = 90;
    expect(canLaunchMission(state, CONTENT, "m_survey", ["h_mercer", "h_okafor"])).toBe(false);
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
