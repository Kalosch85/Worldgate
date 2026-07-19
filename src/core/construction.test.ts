import { describe, expect, it } from "vitest";
import type { GameStateT } from "../data/schemas.js";
import { loadTestContent } from "../test/content.js";
import { newCampaign } from "./campaign.js";
import { build, canBuild, facilityStatuses } from "./construction.js";
import { endDay } from "./economy.js";
import { applyEffects } from "./effects.js";
import { RuleError } from "./errors.js";
import { getModifier } from "./modifiers.js";
import { apply, type ReducerCtx } from "./reducer.js";
import { mulberry32 } from "./rng.js";

/**
 * Base construction tests (docs/specs/facilities.md §6). Costs, guards, the
 * endDay completion tick and its step-ordering, the materialsPerDay income
 * flow, and the personnel-delta clamp order.
 */
const CONTENT = loadTestContent();

function ctx(seed = 1): ReducerCtx {
  return { content: CONTENT, rng: mulberry32(seed) };
}

function tick(state: GameStateT, times: number): GameStateT {
  let s = state;
  for (let i = 0; i < times; i++) s = endDay(s, ctx());
  return s;
}

describe("build guard / RuleError per invalid path (§2)", () => {
  const codeOf = (fn: () => unknown): string | undefined => {
    try {
      fn();
    } catch (e) {
      return e instanceof RuleError ? e.code : undefined;
    }
    return undefined;
  };

  it("unknown facility id", () => {
    expect(() => build(newCampaign(1), CONTENT, "fac_nope")).toThrow(RuleError);
    expect(codeOf(() => build(newCampaign(1), CONTENT, "fac_nope"))).toBe("build/unknown");
  });

  it("already built", () => {
    const state: GameStateT = {
      ...newCampaign(1),
      construction: { current: null, built: ["fac_medbay"] },
    };
    expect(codeOf(() => build(state, CONTENT, "fac_medbay"))).toBe("build/already_built");
  });

  it("construction already in progress (one at a time)", () => {
    const state: GameStateT = {
      ...newCampaign(1),
      construction: { current: { facility: "fac_quarters", daysRemaining: 2 }, built: [] },
    };
    expect(codeOf(() => build(state, CONTENT, "fac_medbay"))).toBe("build/in_progress");
  });

  it("prerequisites unmet (fac_gate_lab needs t_gate_stabilizer)", () => {
    expect(codeOf(() => build(newCampaign(1), CONTENT, "fac_gate_lab"))).toBe("build/prerequisites");
    // …and once the tech is researched, the prerequisite clears.
    const researched: GameStateT = {
      ...newCampaign(1),
      research: { current: null, completed: ["t_gate_stabilizer"] },
    };
    expect(canBuild(researched, CONTENT, "fac_gate_lab")).toBe(true);
  });

  it("insufficient funds/materials", () => {
    const broke: GameStateT = {
      ...newCampaign(1),
      resources: { funds: 10, materials: 40, intel: 0, exotics: 0 },
    };
    expect(codeOf(() => build(broke, CONTENT, "fac_quarters"))).toBe("build/insufficient");
    const noMats: GameStateT = {
      ...newCampaign(1),
      resources: { funds: 100, materials: 5, intel: 0, exotics: 0 },
    };
    expect(codeOf(() => build(noMats, CONTENT, "fac_quarters"))).toBe("build/insufficient");
  });

  it("canBuild guard agrees with the throw behavior", () => {
    const fresh = newCampaign(1);
    expect(canBuild(fresh, CONTENT, "fac_quarters")).toBe(true);
    expect(canBuild(fresh, CONTENT, "fac_gate_lab")).toBe(false); // prereq
    expect(canBuild(fresh, CONTENT, "fac_nope")).toBe(false); // unknown
  });
});

describe("costs deducted on build, not completion (§2, §6)", () => {
  it("pays funds+materials immediately and opens construction without completing", () => {
    const next = build(newCampaign(1), CONTENT, "fac_medbay"); // 35 funds / 10 mat, 3 days
    expect(next.resources.funds).toBe(100 - 35);
    expect(next.resources.materials).toBe(40 - 10);
    expect(next.construction.current).toEqual({ facility: "fac_medbay", daysRemaining: 3 });
    expect(next.construction.built).toEqual([]); // not yet complete
  });

  it("does not mutate the input state", () => {
    const state = newCampaign(1);
    const before = JSON.stringify(state);
    build(state, CONTENT, "fac_medbay");
    expect(JSON.stringify(state)).toBe(before);
  });

  it("dispatches through the reducer's build action", () => {
    const next = apply(newCampaign(1), { type: "build", facility: "fac_medbay" }, ctx());
    expect(next.construction.current).toEqual({ facility: "fac_medbay", daysRemaining: 3 });
    expect(() => apply(newCampaign(1), { type: "build", facility: "fac_nope" }, ctx())).toThrow(RuleError);
  });
});

describe("golden: fac_quarters completes during the 4th endDay (§6)", () => {
  it("completes on the 4th tick with personnel total 25 and a journal entry", () => {
    const started = build(newCampaign(1), CONTENT, "fac_quarters"); // 4 buildDays, personnel +5

    // Not yet complete after three ticks.
    const afterThree = tick(started, 3);
    expect(afterThree.construction.built).not.toContain("fac_quarters");
    expect(afterThree.construction.current).toEqual({ facility: "fac_quarters", daysRemaining: 1 });
    expect(afterThree.personnel.total).toBe(20);

    // The 4th endDay completes it.
    const done = endDay(afterThree, ctx());
    expect(done.construction.built).toContain("fac_quarters");
    expect(done.construction.current).toBeNull();
    expect(done.personnel.total).toBe(25);
    expect(done.journal.some((j) => j.text === "Expanded Quarters completed.")).toBe(true);
  });
});

describe("workshop: materialsPerDay flows into the income step (§3, §6)", () => {
  it("sets the modifier on completion, then adds materials each subsequent endDay", () => {
    const started = build(newCampaign(1), CONTENT, "fac_workshop"); // 50f/20m, 5 days, materialsPerDay +2
    const matAfterBuild = started.resources.materials; // 40 - 20 = 20

    // materialsPerDay is 0 while building, so income adds no materials for 5 ticks.
    const built = tick(started, 5);
    expect(built.construction.built).toContain("fac_workshop");
    expect(getModifier(built.modifiers, "materialsPerDay")).toBe(2);
    expect(built.resources.materials).toBe(matAfterBuild);

    // The next income step adds floor(2) materials.
    const nextDay = endDay(built, ctx());
    expect(nextDay.resources.materials).toBe(matAfterBuild + 2);
  });
});

describe("personnel-delta clamp reduces infirmary → research → logistics (§1, §6)", () => {
  it("sheds infirmary first, then research, leaving logistics intact", () => {
    const state: GameStateT = {
      ...newCampaign(1),
      personnel: { total: 10, assignments: { logistics: 4, research: 3, infirmary: 3 } },
    };
    // total drops to 6; assignments (sum 10) exceed it by 4.
    const next = applyEffects(state, [{ type: "personnel", delta: -4 }], ctx());
    expect(next.personnel.total).toBe(6);
    // infirmary drained (3), then research reduced by the remaining 1 → 2; logistics untouched.
    expect(next.personnel.assignments).toEqual({ logistics: 4, research: 2, infirmary: 0 });
    // Assignments never exceed the reduced total.
    const a = next.personnel.assignments;
    expect(a.logistics + a.research + a.infirmary).toBeLessThanOrEqual(next.personnel.total);
  });

  it("floors personnel.total at 0", () => {
    const state: GameStateT = {
      ...newCampaign(1),
      personnel: { total: 3, assignments: { logistics: 2, research: 1, infirmary: 0 } },
    };
    const next = applyEffects(state, [{ type: "personnel", delta: -10 }], ctx());
    expect(next.personnel.total).toBe(0);
    expect(next.personnel.assignments).toEqual({ logistics: 0, research: 0, infirmary: 0 });
  });
});

describe("endDay step order: construction completes after research in the same tick (§3, §6)", () => {
  it("research resolves before construction within one endDay", () => {
    const state: GameStateT = {
      ...newCampaign(1),
      research: { current: { tech: "t_gate_stabilizer", progress: 15 }, completed: [] }, // +6/tick ⇒ 21 ≥ 20
      construction: { current: { facility: "fac_medbay", daysRemaining: 1 }, built: [] },
    };
    const next = endDay(state, ctx());

    // Both resolved this tick.
    expect(next.research.completed).toContain("t_gate_stabilizer");
    expect(next.construction.built).toContain("fac_medbay");
    expect(getModifier(next.modifiers, "healRate")).toBe(1);

    // Journal order proves the ordering: research entry precedes construction entry.
    const researchIdx = next.journal.findIndex((j) => j.text === "Research complete: Gate Stabilizer.");
    const constructionIdx = next.journal.findIndex((j) => j.text === "Medical Bay completed.");
    expect(researchIdx).toBeGreaterThanOrEqual(0);
    expect(constructionIdx).toBeGreaterThan(researchIdx);
  });
});

describe("facilityStatuses selector (§5)", () => {
  it("reports built / building / prereq / affordability for the UI", () => {
    const state: GameStateT = {
      ...newCampaign(1),
      construction: { current: { facility: "fac_workshop", daysRemaining: 3 }, built: ["fac_medbay"] },
    };
    const byId = new Map(facilityStatuses(state, CONTENT).map((s) => [s.def.id, s]));

    expect(byId.get("fac_medbay")?.built).toBe(true);
    expect(byId.get("fac_workshop")?.building).toBe(true);
    // Another build cannot start while one is in progress.
    expect(byId.get("fac_quarters")?.buildable).toBe(false);
    // Gate lab's prerequisite is unmet on a fresh campaign.
    expect(byId.get("fac_gate_lab")?.prereqMet).toBe(false);
  });
});
