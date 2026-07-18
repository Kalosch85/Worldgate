/**
 * Economy actions and end-of-day tick (docs/specs/economy-and-roster.md §3, §5, §7).
 *
 * Rule-invalid actions throw `RuleError`; UI must pre-validate via the
 * exported guards. Structurally impossible input is a programmer error.
 */
import type { ContentBundleT, GameStateT } from "../data/schemas.js";
import type { ReducerCtx } from "./reducer.js";
import { applyEffects } from "./effects.js";
import { RuleError } from "./errors.js";
import { getModifier } from "./modifiers.js";

/** §7: materials cost of a tactical mission launch. Narrative missions are free.
 * The constant only — `launchMission` itself lands in a later phase. */
export const TACTICAL_LAUNCH_COST = 5;

export interface PersonnelAssignments {
  logistics: number;
  research: number;
  infirmary: number;
}

function clamp(min: number, max: number, v: number): number {
  return Math.min(max, Math.max(min, v));
}

// -------------------------------------------------------------------- guards

export function canStartResearch(state: GameStateT, content: ContentBundleT, tech: string): boolean {
  const def = content.techs.find((t) => t.id === tech);
  if (!def) return false;
  if (state.research.completed.includes(tech)) return false;
  return def.prerequisites.every((p) => state.research.completed.includes(p));
}

export function canAssignPersonnel(state: GameStateT, assignments: PersonnelAssignments): boolean {
  const { logistics, research, infirmary } = assignments;
  if (logistics < 0 || research < 0 || infirmary < 0) return false;
  return logistics + research + infirmary <= state.personnel.total;
}

// ------------------------------------------------------------------- actions

export function startResearch(state: GameStateT, content: ContentBundleT, tech: string): GameStateT {
  if (!canStartResearch(state, content, tech)) {
    throw new RuleError(
      "startResearch/invalid",
      `Cannot start research on '${tech}': unknown tech, already completed, or prerequisites unmet.`,
    );
  }
  const def = content.techs.find((t) => t.id === tech)!;
  const draft = structuredClone(state);
  if (draft.research.current) {
    draft.journal.push({
      day: draft.campaign.day,
      text: `Research on '${draft.research.current.tech}' discarded to start '${def.name}'.`,
    });
  }
  draft.research.current = { tech, progress: 0 };
  return draft;
}

export function assignPersonnel(state: GameStateT, assignments: PersonnelAssignments): GameStateT {
  if (!canAssignPersonnel(state, assignments)) {
    throw new RuleError(
      "assignPersonnel/invalid",
      "Assignment values must each be >= 0 and sum to at most personnel.total.",
    );
  }
  const draft = structuredClone(state);
  draft.personnel.assignments = { ...assignments };
  return draft;
}

/** endDay — exact step order per spec §5. */
export function endDay(state: GameStateT, ctx: ReducerCtx): GameStateT {
  let draft = structuredClone(state);

  // 1. Income.
  const supportMult = clamp(0.5, 1.5, 0.75 + 0.05 * (draft.variables.support ?? 0));
  const incomeMult = getModifier(draft.modifiers, "incomeMult");
  const income = Math.floor(draft.personnel.assignments.logistics * 3 * supportMult * incomeMult);
  draft.resources.funds += income;

  // 2. Upkeep.
  const upkeep = draft.personnel.total * 1 + draft.heroes.length * 2;
  const afterUpkeep = draft.resources.funds - upkeep;
  if (afterUpkeep < 0) {
    draft.resources.funds = 0;
    draft.variables.support = (draft.variables.support ?? 0) - 1;
    draft.journal.push({ day: draft.campaign.day, text: "Payroll missed." });
  } else {
    draft.resources.funds = afterUpkeep;
  }

  // 3. Research.
  if (draft.research.current) {
    const techId = draft.research.current.tech;
    const def = ctx.content.techs.find((t) => t.id === techId);
    if (!def) throw new Error(`endDay: unknown tech '${techId}' in research.current`);
    const researchBonus = getModifier(draft.modifiers, "researchBonus");
    const progress =
      draft.research.current.progress + draft.personnel.assignments.research * 1 + researchBonus;
    if (progress >= def.cost) {
      draft.research.completed.push(techId);
      draft.research.current = null;
      draft.journal.push({ day: draft.campaign.day, text: `Research complete: ${def.name}.` });
      draft = applyEffects(draft, def.effects, ctx);
    } else {
      draft.research.current.progress = progress;
    }
  }

  // 4. Recovery.
  const infirmary = draft.personnel.assignments.infirmary;
  const healRate = getModifier(draft.modifiers, "healRate");
  const recoveryAmount = 5 + 2 * infirmary + 5 * healRate;
  for (const hero of draft.heroes) {
    hero.fatigue = Math.max(0, hero.fatigue - recoveryAmount);
    const remaining: typeof hero.injuries = [];
    for (const injury of hero.injuries) {
      const daysRemaining = injury.daysRemaining - 1;
      if (daysRemaining <= 0) {
        const heroDef = ctx.content.heroes.find((h) => h.id === hero.hero);
        const injuryDef = ctx.content.injuries.find((i) => i.id === injury.injury);
        draft.journal.push({
          day: draft.campaign.day,
          text: `${heroDef?.name ?? hero.hero} recovered from ${injuryDef?.name ?? injury.injury}.`,
        });
      } else {
        remaining.push({ injury: injury.injury, daysRemaining });
      }
    }
    hero.injuries = remaining;
  }

  // 5. Advance.
  draft.campaign.day += 1;

  // 6. Queued events: NOT consumed in Phase 1 — firing semantics arrive with
  // the Phase 3 spec.
  // TODO(phase3): fire missions.queuedEvents whose fireOnDay <= draft.campaign.day.

  return draft;
}
