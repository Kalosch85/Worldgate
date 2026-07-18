/**
 * GameState reducer skeleton (task 0.3, ARCHITECTURE §3).
 *
 * All game-state changes go through this pure function:
 *
 *   apply(state, action, ctx): GameState
 *
 * SCOPE (task 0.3): this is a skeleton. It defines the reducer signature, the
 * injected context shape (`content` + `rng`, ARCHITECTURE §3/§4), the
 * no-mutation contract, and the exhaustive-switch pattern future actions must
 * follow. It ships a SINGLE placeholder action (`noop`). Real actions
 * (`endDay`, `startResearch`, `launchMission`, …) arrive with their Phase 1
 * specs — do NOT invent them here.
 */
import type { ContentBundleT, GameStateT } from "../data/schemas.js";
import type { Rng } from "./rng.js";

/**
 * Everything a reducer may read besides the state: immutable content and the
 * injected RNG stream. The core takes its randomness and content from here,
 * never from module-level globals.
 */
export interface ReducerCtx {
  content: ContentBundleT;
  rng: Rng;
}

/**
 * The action union. Placeholder-only for task 0.3 — every real member is
 * introduced together with the Phase 1 spec that defines its contract.
 */
export type Action = { type: "noop" };

/**
 * Pure reducer. Returns the next GameState; never mutates `state` in place.
 * The switch is exhaustive: adding an `Action` member without a matching case
 * is a compile error at `assertNever`, which is exactly the guard rail future
 * tasks rely on.
 */
export function apply(state: GameStateT, action: Action, _ctx: ReducerCtx): GameStateT {
  switch (action.type) {
    case "noop":
      // Identity transition: proves the pipeline end-to-end without changing state.
      return state;
    default:
      // Runtime guard while `Action` has a single member. Once Phase 1 adds a
      // second action, replace this with a compile-time exhaustiveness check —
      // `const _exhaustive: never = action;` — which only narrows correctly for
      // multi-member unions (TS cannot narrow a single-literal discriminant).
      throw new Error(`apply: unhandled action ${JSON.stringify(action)}`);
  }
}
