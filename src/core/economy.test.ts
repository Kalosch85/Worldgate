import { describe, expect, it } from "vitest";
import type { ContentBundleT, GameStateT } from "../data/schemas.js";
import { loadTestContent } from "../test/content.js";
import { newCampaign } from "./campaign.js";
import {
  assignPersonnel,
  canAssignPersonnel,
  canStartResearch,
  endDay,
  startResearch,
  TACTICAL_LAUNCH_COST,
} from "./economy.js";
import { RuleError } from "./errors.js";
import type { ReducerCtx } from "./reducer.js";
import { mulberry32 } from "./rng.js";

const CONTENT = loadTestContent();

function ctx(seed = 1): ReducerCtx {
  return { content: CONTENT, rng: mulberry32(seed) };
}

function tick(state: GameStateT, times: number): GameStateT {
  let s = state;
  for (let i = 0; i < times; i++) s = endDay(s, ctx());
  return s;
}

describe("golden scenarios (docs/specs/economy-and-roster.md §8)", () => {
  it("A. Idle: 5x endDay -> day 6, funds 160 (net +12/day), materials 40", () => {
    const state = tick(newCampaign(1), 5);
    expect(state.campaign.day).toBe(6);
    expect(state.resources.funds).toBe(160);
    expect(state.resources.materials).toBe(40);
  });

  it("B. Research: startResearch then 4x endDay completes on the 4th tick", () => {
    const started = startResearch(newCampaign(1), CONTENT, "t_gate_stabilizer");
    const state = tick(started, 4);
    expect(state.research.completed).toContain("t_gate_stabilizer");
    expect(state.research.current).toBeNull();
    expect(state.missions.available).toContain("m_relay");
    expect(
      state.journal.some((j) => j.text === "The gate holds a stable connection for the first time."),
    ).toBe(true);
    expect(state.resources.funds).toBe(148);
    expect(state.campaign.day).toBe(5);
  });

  it("C. Low support: income floor(36 x 0.75) = 27, funds +3 net", () => {
    const base = newCampaign(1);
    const state: GameStateT = { ...base, variables: { ...base.variables, support: 0 } };
    const next = endDay(state, ctx());
    expect(next.resources.funds).toBe(state.resources.funds + 3);
  });

  it("D. Insolvency: income 18, upkeep 24, funds clamp to 0, support -6, journal notes missed payroll", () => {
    const base = newCampaign(1);
    const state: GameStateT = {
      ...base,
      resources: { ...base.resources, funds: 0 },
      variables: { ...base.variables, support: -5 },
    };
    const next = endDay(state, ctx());
    expect(next.resources.funds).toBe(0);
    expect(next.variables.support).toBe(-6);
    expect(next.journal.some((j) => j.text === "Payroll missed.")).toBe(true);
  });
});

describe("startResearch", () => {
  it("throws a RuleError (with a string code) for an unknown tech", () => {
    expect(() => startResearch(newCampaign(1), CONTENT, "t_nope")).toThrow(RuleError);
    try {
      startResearch(newCampaign(1), CONTENT, "t_nope");
      expect.unreachable();
    } catch (e) {
      expect(e).toBeInstanceOf(RuleError);
      expect(typeof (e as RuleError).code).toBe("string");
    }
  });

  it("throws RuleError when prerequisites are unmet", () => {
    expect(() => startResearch(newCampaign(1), CONTENT, "t_field_medicine")).toThrow(RuleError);
  });

  it("throws RuleError when the tech is already completed", () => {
    const state = newCampaign(1);
    const completed: GameStateT = {
      ...state,
      research: { ...state.research, completed: ["t_gate_stabilizer"] },
    };
    expect(() => startResearch(completed, CONTENT, "t_gate_stabilizer")).toThrow(RuleError);
  });

  it("allows switching techs mid-progress and discards + logs the old progress", () => {
    const state = newCampaign(1);
    const eligible: GameStateT = {
      ...state,
      research: {
        current: { tech: "t_gate_stabilizer", progress: 12 },
        completed: ["t_gate_stabilizer"], // satisfies t_field_medicine's prerequisite
      },
    };
    const next = startResearch(eligible, CONTENT, "t_field_medicine");
    expect(next.research.current).toEqual({ tech: "t_field_medicine", progress: 0 });
    expect(next.journal.some((j) => j.text.includes("discarded"))).toBe(true);
  });

  it("canStartResearch guard agrees with the throw behavior", () => {
    const state = newCampaign(1);
    expect(canStartResearch(state, CONTENT, "t_gate_stabilizer")).toBe(true);
    expect(canStartResearch(state, CONTENT, "t_field_medicine")).toBe(false);
    expect(canStartResearch(state, CONTENT, "t_nope")).toBe(false);
  });
});

describe("prerequisite chains (task 1.3)", () => {
  // A -> B -> C is a three-deep chain; D requires BOTH A and B (multi-prereq).
  const CHAIN_TECHS: ContentBundleT["techs"] = [
    { id: "t_a", name: "A", description: "root", cost: 10, prerequisites: [], effects: [] },
    { id: "t_b", name: "B", description: "needs A", cost: 10, prerequisites: ["t_a"], effects: [] },
    { id: "t_c", name: "C", description: "needs B", cost: 10, prerequisites: ["t_b"], effects: [] },
    {
      id: "t_d",
      name: "D",
      description: "needs A and B",
      cost: 10,
      prerequisites: ["t_a", "t_b"],
      effects: [],
    },
  ];
  const chain: ContentBundleT = { ...CONTENT, techs: CHAIN_TECHS };

  function withCompleted(completed: string[]): GameStateT {
    const state = newCampaign(1);
    return { ...state, research: { ...state.research, completed } };
  }

  it("blocks a tech whose direct prerequisite is not completed (each chain depth)", () => {
    const fresh = newCampaign(1);
    expect(canStartResearch(fresh, chain, "t_a")).toBe(true); // no prereq
    expect(canStartResearch(fresh, chain, "t_b")).toBe(false); // needs A
    expect(canStartResearch(fresh, chain, "t_c")).toBe(false); // needs B
    expect(() => startResearch(fresh, chain, "t_b")).toThrow(RuleError);
    expect(() => startResearch(fresh, chain, "t_c")).toThrow(RuleError);
  });

  it("a completed deeper prereq does not skip an incomplete shallower one", () => {
    // C's prereq is B; completing A alone must not unlock C.
    const onlyA = withCompleted(["t_a"]);
    expect(canStartResearch(onlyA, chain, "t_b")).toBe(true);
    expect(canStartResearch(onlyA, chain, "t_c")).toBe(false);
  });

  it("unlocks each tech only once its immediate prerequisite is completed", () => {
    expect(canStartResearch(withCompleted(["t_a"]), chain, "t_b")).toBe(true);
    expect(canStartResearch(withCompleted(["t_a", "t_b"]), chain, "t_c")).toBe(true);
  });

  it("requires ALL prerequisites for a multi-prereq tech, not just one", () => {
    expect(canStartResearch(withCompleted(["t_a"]), chain, "t_d")).toBe(false); // missing B
    expect(canStartResearch(withCompleted(["t_b"]), chain, "t_d")).toBe(false); // missing A
    expect(canStartResearch(withCompleted(["t_a", "t_b"]), chain, "t_d")).toBe(true);
    expect(() => startResearch(withCompleted(["t_a"]), chain, "t_d")).toThrow(RuleError);
  });

  it("progresses a chain end to end via endDay, unlocking the next link each time", () => {
    // research assignment 6/day, cost 10 -> each tech completes on its 2nd tick.
    const chainCtx: ReducerCtx = { content: chain, rng: mulberry32(1) };
    let s = startResearch(newCampaign(1), chain, "t_a");
    s = endDay(s, chainCtx); // A: 6
    s = endDay(s, chainCtx); // A: 12 >= 10 -> completed
    expect(s.research.completed).toContain("t_a");
    expect(s.research.current).toBeNull();

    expect(canStartResearch(s, chain, "t_b")).toBe(true);
    s = startResearch(s, chain, "t_b");
    s = endDay(s, chainCtx);
    s = endDay(s, chainCtx);
    expect(s.research.completed).toContain("t_b");

    expect(canStartResearch(s, chain, "t_c")).toBe(true);
    expect(canStartResearch(s, chain, "t_d")).toBe(true); // both A and B now done
  });
});

describe("assignPersonnel", () => {
  it("throws RuleError when a value is negative", () => {
    const state = newCampaign(1);
    expect(() => assignPersonnel(state, { logistics: -1, research: 0, infirmary: 0 })).toThrow(RuleError);
  });

  it("throws RuleError when the sum exceeds personnel.total", () => {
    const state = newCampaign(1);
    expect(() => assignPersonnel(state, { logistics: 15, research: 10, infirmary: 0 })).toThrow(RuleError);
  });

  it("updates assignments when valid; unassigned personnel stay idle", () => {
    const state = newCampaign(1);
    const next = assignPersonnel(state, { logistics: 5, research: 5, infirmary: 5 });
    expect(next.personnel.assignments).toEqual({ logistics: 5, research: 5, infirmary: 5 });
    expect(next.personnel.total).toBe(20);
  });

  it("canAssignPersonnel guard agrees with the throw behavior", () => {
    const state = newCampaign(1);
    expect(canAssignPersonnel(state, { logistics: 20, research: 0, infirmary: 0 })).toBe(true);
    expect(canAssignPersonnel(state, { logistics: 21, research: 0, infirmary: 0 })).toBe(false);
    expect(canAssignPersonnel(state, { logistics: -1, research: 0, infirmary: 0 })).toBe(false);
  });
});

describe("endDay recovery (step 4)", () => {
  it("reduces fatigue by 5 + 2*infirmary + 5*healRate, floored at 0", () => {
    const state = newCampaign(1);
    const withFatigue: GameStateT = { ...state, heroes: state.heroes.map((h) => ({ ...h, fatigue: 10 })) };
    // default infirmary assignment is 2 -> recovery = 5 + 2*2 + 5*0 = 9
    const next = endDay(withFatigue, ctx());
    expect(next.heroes.every((h) => h.fatigue === 1)).toBe(true);
  });

  it("decrements injury daysRemaining and removes + logs recovery at 0", () => {
    const state = newCampaign(1);
    const injured: GameStateT = {
      ...state,
      heroes: state.heroes.map((h, i) =>
        i === 0 ? { ...h, injuries: [{ injury: "inj_wounded", daysRemaining: 1 }] } : h,
      ),
    };
    const next = endDay(injured, ctx());
    expect(next.heroes[0]!.injuries).toEqual([]);
    expect(next.journal.some((j) => j.text.includes("recovered from"))).toBe(true);
  });

  it("keeps an injury with remaining days, just decremented", () => {
    const state = newCampaign(1);
    const injured: GameStateT = {
      ...state,
      heroes: state.heroes.map((h, i) =>
        i === 0 ? { ...h, injuries: [{ injury: "inj_wounded", daysRemaining: 3 }] } : h,
      ),
    };
    const next = endDay(injured, ctx());
    expect(next.heroes[0]!.injuries).toEqual([{ injury: "inj_wounded", daysRemaining: 2 }]);
  });
});

describe("endDay does not mutate the input state", () => {
  it("leaves the original state object untouched", () => {
    const state = newCampaign(1);
    const before = JSON.stringify(state);
    endDay(state, ctx());
    expect(JSON.stringify(state)).toBe(before);
  });
});

describe("TACTICAL_LAUNCH_COST", () => {
  it("is 5 materials (§7); no launchMission action exists yet", () => {
    expect(TACTICAL_LAUNCH_COST).toBe(5);
  });
});
