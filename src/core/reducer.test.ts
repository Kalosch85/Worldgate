import { describe, expect, it } from "vitest";
import { ContentBundle, type ContentBundleT, type GameStateT } from "../data/schemas.js";
import { apply, type ReducerCtx } from "./reducer.js";
import { mulberry32 } from "./rng.js";
import { serialize } from "./serialize.js";

const EMPTY_CONTENT: ContentBundleT = ContentBundle.parse({
  heroes: [],
  injuries: [],
  techs: [],
  abilities: [],
  unitTypes: [],
  maps: [],
  events: [],
  missions: [],
});

const CTX: ReducerCtx = { content: EMPTY_CONTENT, rng: mulberry32(1) };

function baseState(): GameStateT {
  return {
    version: 1,
    campaign: { day: 1, seed: 42 },
    settings: { showLockedOptions: false },
    resources: { funds: 100, materials: 50, intel: 0, exotics: 0 },
    variables: { support: 50 },
    flags: {},
    modifiers: {},
    heroes: [],
    personnel: { total: 3, assignments: { logistics: 1, research: 1, infirmary: 1 } },
    research: { current: null, completed: [] },
    missions: { available: [], completed: [], queuedEvents: [] },
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
});
