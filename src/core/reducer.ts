/**
 * GameState reducer (task 0.3 skeleton; Phase 1 actions per
 * docs/specs/economy-and-roster.md §3, ARCHITECTURE §3).
 *
 * All game-state changes go through this pure function:
 *
 *   apply(state, action, ctx): GameState
 */
import type { ContentBundleT, GameStateT } from "../data/schemas.js";
import { assignPersonnel, endDay, startResearch, type PersonnelAssignments } from "./economy.js";
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
 * The action union. `noop` is the task-0.3 placeholder; the other three are
 * Phase 1's economy actions (docs/specs/economy-and-roster.md §3).
 */
export type Action =
  | { type: "noop" }
  | { type: "endDay" }
  | { type: "startResearch"; tech: string }
  | { type: "assignPersonnel"; assignments: PersonnelAssignments };

/**
 * Pure reducer. Returns the next GameState; never mutates `state` in place.
 * The switch is exhaustive: adding an `Action` member without a matching case
 * is a compile error at `assertNever`.
 */
export function apply(state: GameStateT, action: Action, ctx: ReducerCtx): GameStateT {
  switch (action.type) {
    case "noop":
      // Identity transition: proves the pipeline end-to-end without changing state.
      return state;
    case "endDay":
      return endDay(state, ctx);
    case "startResearch":
      return startResearch(state, ctx.content, action.tech);
    case "assignPersonnel":
      return assignPersonnel(state, action.assignments);
    default: {
      const _exhaustive: never = action;
      throw new Error(`apply: unhandled action ${JSON.stringify(_exhaustive)}`);
    }
  }
}
