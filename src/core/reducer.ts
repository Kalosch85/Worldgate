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
import { launchMission } from "./missions.js";
import { chooseEventOption } from "./narrative.js";
import type { Rng } from "./rng.js";
import { applyBattleAction, type BattleAction } from "./tactics.js";

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
 * The action union. `noop` is the task-0.3 placeholder; the economy trio are
 * Phase 1's actions (docs/specs/economy-and-roster.md §3); `launchMission` is
 * the task-2.4 mission hand-off (docs/specs/narrative-engine.md §2–§3).
 * `chooseEventOption` is the Phase 3 narrative traversal (spec §5). The four
 * `battle*` actions are the Phase 4 tactical engine (docs/specs/tactics-engine.md
 * §4), all handled by the tactics reducer.
 */
export type Action =
  | { type: "noop" }
  | { type: "endDay" }
  | { type: "startResearch"; tech: string }
  | { type: "assignPersonnel"; assignments: PersonnelAssignments }
  | { type: "launchMission"; mission: string; squad: string[] }
  | { type: "chooseEventOption"; option: string }
  | BattleAction;

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
    case "launchMission":
      return launchMission(state, ctx.content, action.mission, action.squad);
    case "chooseEventOption":
      return chooseEventOption(state, ctx, action.option);
    case "battleMove":
    case "battleAbility":
    case "battleInteract":
    case "battleEndTurn":
      return applyBattleAction(state, action, ctx);
    default: {
      const _exhaustive: never = action;
      throw new Error(`apply: unhandled action ${JSON.stringify(_exhaustive)}`);
    }
  }
}
