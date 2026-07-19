/**
 * Base construction (docs/specs/facilities.md §2–§3). Facilities reuse the
 * universal Effect/Condition vocabulary: a build costs funds+materials paid
 * immediately, runs for `buildDays`, and applies its Effect[] once on
 * completion — one build at a time, no upkeep in v1.
 *
 * This module owns the `build` action + `canBuild` guard (§2) and the endDay
 * construction step `advanceConstruction` (§3, called between Research and
 * Recovery). Pure throughout: reducers return a fresh GameState and never
 * mutate their input (ARCHITECTURE §3).
 */
import type { ContentBundleT, FacilityDefT, GameStateT } from "../data/schemas.js";
import { applyEffects } from "./effects.js";
import { RuleError } from "./errors.js";
import { evalCondition } from "./narrative.js";
import type { ReducerCtx } from "./reducer.js";

/**
 * A structured reason why {@link build} would reject, or `null` when it would
 * accept. Facility prerequisites are base-level Conditions with no squad
 * context, so they evaluate against an empty squad (§2).
 */
function rejectReason(
  state: GameStateT,
  content: ContentBundleT,
  facility: string,
): { code: string; message: string } | null {
  const def = content.facilities.find((f) => f.id === facility);
  if (!def) return { code: "unknown", message: `Unknown facility '${facility}'.` };
  if (state.construction.built.includes(facility)) {
    return { code: "already_built", message: `${def.name} is already built.` };
  }
  if (state.construction.current !== null) {
    return { code: "in_progress", message: "Another facility is already under construction." };
  }
  if (!def.prerequisites.every((c) => evalCondition(state, content, [], c))) {
    return { code: "prerequisites", message: `${def.name}'s prerequisites are not met.` };
  }
  if (state.resources.funds < def.cost.funds || state.resources.materials < def.cost.materials) {
    return {
      code: "insufficient",
      message: `${def.name} needs ${def.cost.funds} funds and ${def.cost.materials} materials.`,
    };
  }
  return null;
}

/** UI pre-validation guard (§2). True when {@link build} would accept. */
export function canBuild(state: GameStateT, content: ContentBundleT, facility: string): boolean {
  return rejectReason(state, content, facility) === null;
}

/**
 * Start construction of a facility (§2). Re-validates every guard and throws
 * RuleError on any failure (unknown id, already built, construction in
 * progress, prerequisites unmet, insufficient funds/materials). Costs are paid
 * immediately; the facility then builds over `buildDays` endDay ticks. Pure.
 */
export function build(state: GameStateT, content: ContentBundleT, facility: string): GameStateT {
  const reason = rejectReason(state, content, facility);
  if (reason) throw new RuleError(`build/${reason.code}`, reason.message);
  const def = content.facilities.find((f) => f.id === facility)!;

  const draft = structuredClone(state);
  draft.resources.funds -= def.cost.funds;
  draft.resources.materials -= def.cost.materials;
  draft.construction.current = { facility, daysRemaining: def.buildDays };
  return draft;
}

/**
 * endDay construction step (§3): if a facility is under construction, decrement
 * its remaining days; on reaching 0 move it to `built`, apply its effects in
 * order, and journal "<name> completed." No-op (returns `state`) when nothing
 * is building. Pure.
 */
export function advanceConstruction(state: GameStateT, ctx: ReducerCtx): GameStateT {
  if (state.construction.current === null) return state;

  let draft = structuredClone(state);
  const current = draft.construction.current!;
  current.daysRemaining -= 1;
  if (current.daysRemaining > 0) return draft;

  const def = ctx.content.facilities.find((f) => f.id === current.facility);
  if (!def) throw new Error(`advanceConstruction: unknown facility '${current.facility}'`);
  draft.construction.built.push(def.id);
  draft.construction.current = null;
  // Effects apply in array order (ARCHITECTURE §5); applyEffects returns a
  // fresh draft, so the journal line is appended to that result.
  draft = applyEffects(draft, def.effects, ctx);
  draft.journal.push({ day: draft.campaign.day, text: `${def.name} completed.` });
  return draft;
}

// ---------------------------------------------------------------- selectors

/** Per-facility strategic status for the base screen (§5). Read-only. */
export interface FacilityStatus {
  def: FacilityDefT;
  built: boolean;
  building: boolean;
  prereqMet: boolean;
  affordable: boolean;
  /** True when {@link build} would accept right now (guards + no active build). */
  buildable: boolean;
}

/**
 * Status of every facility for the UI (§5): which are built, which is under
 * construction, and for the rest whether prerequisites are met, whether the
 * player can afford them, and whether a build could start now. Rules live here,
 * not in the screen (ARCHITECTURE §1).
 */
export function facilityStatuses(state: GameStateT, content: ContentBundleT): FacilityStatus[] {
  return content.facilities.map((def) => {
    const built = state.construction.built.includes(def.id);
    const building = state.construction.current?.facility === def.id;
    const prereqMet = def.prerequisites.every((c) => evalCondition(state, content, [], c));
    const affordable =
      state.resources.funds >= def.cost.funds && state.resources.materials >= def.cost.materials;
    return {
      def,
      built,
      building,
      prereqMet,
      affordable,
      buildable: canBuild(state, content, def.id),
    };
  });
}
