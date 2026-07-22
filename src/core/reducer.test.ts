import { describe, expect, it } from "vitest";
import { ContentBundle, type ContentBundleT, type GameStateT } from "../data/schemas.js";
import { newCampaign } from "./campaign.js";
import { RuleError } from "./errors.js";
import { apply, type ReducerCtx } from "./reducer.js";
import { mulberry32 } from "./rng.js";
import { serialize } from "./serialize.js";
import { loadTestContent } from "../test/content.js";

const EMPTY_CONTENT: ContentBundleT = ContentBundle.parse({
  heroes: [],
  injuries: [],
  techs: [],
  abilities: [],
  unitTypes: [],
  maps: [],
  events: [],
  missions: [],
  facilities: [],
});

const CTX: ReducerCtx = { content: EMPTY_CONTENT, rng: mulberry32(1) };

function baseState(): GameStateT {
  return {
    version: 2,
    campaign: { day: 1, seed: 42 },
    settings: { showLockedOptions: false, textAnimation: "on" },
    resources: { funds: 100, materials: 50, intel: 0, exotics: 0 },
    variables: { support: 50 },
    flags: {},
    journal: [],
    modifiers: {},
    heroes: [],
    personnel: { total: 3, assignments: { logistics: 1, research: 1, infirmary: 1 } },
    research: { current: null, completed: [] },
    construction: { current: null, built: [] },
    missions: { available: [], completed: [], queuedEvents: [] },
    deployment: null,
    activeMission: null,
  };
}

describe("apply (reducer skeleton)", () => {
  it("noop returns an equal, still-serializable state", () => {
    const state = baseState();
    const next = apply(state, { type: "noop" }, CTX);
    expect(next).toEqual(state);
    // Result stays a valid GameState.
    expect(() => serialize(next)).not.toThrow();
  });

  it("does not mutate the input state", () => {
    const state = baseState();
    const snapshot = serialize(state);
    apply(state, { type: "noop" }, CTX);
    expect(serialize(state)).toBe(snapshot);
  });

  it("updateSettings patches settings without touching the rest of the state", () => {
    const state = baseState();
    const next = apply(state, { type: "updateSettings", patch: { textAnimation: "off" } }, CTX);
    expect(next.settings).toEqual({ showLockedOptions: false, textAnimation: "off" });
    // Only settings changed; the input is untouched (pure reducer).
    expect(state.settings.textAnimation).toBe("on");
    expect({ ...next, settings: state.settings }).toEqual(state);
  });
});

describe("apply — Phase 1 economy actions dispatch to their handlers", () => {
  const REAL_CTX: ReducerCtx = { content: loadTestContent(), rng: mulberry32(1) };

  it("endDay advances the day and applies income/upkeep", () => {
    const state = newCampaign(1);
    const next = apply(state, { type: "endDay" }, REAL_CTX);
    expect(next.campaign.day).toBe(2);
    // income 36 (support 5) − upkeep 28 (20 + 4 heroes × 2) = net +8 (Roster-Erweiterung).
    expect(next.resources.funds).toBe(108);
  });

  it("startResearch sets research.current", () => {
    const state = newCampaign(1);
    const next = apply(state, { type: "startResearch", tech: "t_gate_stabilizer" }, REAL_CTX);
    expect(next.research.current).toEqual({ tech: "t_gate_stabilizer", progress: 0 });
  });

  it("startResearch on an invalid tech throws RuleError through apply", () => {
    const state = newCampaign(1);
    expect(() => apply(state, { type: "startResearch", tech: "t_nope" }, REAL_CTX)).toThrow(RuleError);
  });

  it("assignPersonnel updates assignments", () => {
    const state = newCampaign(1);
    const next = apply(
      state,
      { type: "assignPersonnel", assignments: { logistics: 10, research: 5, infirmary: 5 } },
      REAL_CTX,
    );
    expect(next.personnel.assignments).toEqual({ logistics: 10, research: 5, infirmary: 5 });
  });

  it("assignPersonnel over budget throws RuleError through apply", () => {
    const state = newCampaign(1);
    expect(() =>
      apply(
        state,
        { type: "assignPersonnel", assignments: { logistics: 100, research: 0, infirmary: 0 } },
        REAL_CTX,
      ),
    ).toThrow(RuleError);
  });
});
