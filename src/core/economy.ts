/**
 * Economy actions and end-of-day tick (docs/specs/economy-and-roster.md §3, §5, §7).
 *
 * Rule-invalid actions throw `RuleError`; UI must pre-validate via the
 * exported guards. Structurally impossible input is a programmer error.
 */
import type { ContentBundleT, GameStateT } from "../data/schemas.js";
import type { ReducerCtx } from "./reducer.js";
import { advanceConstruction } from "./construction.js";
import { applyEffects } from "./effects.js";
import { RuleError } from "./errors.js";
import { getModifier } from "./modifiers.js";
import { evalCondition, fireDueIncident } from "./narrative.js";

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

/**
 * Whether a tech is listed in the research UI (arc-veyra.md §2.2). A tech shows
 * when every `visibleIf` condition passes — evaluated with empty squad context,
 * so squad-scoped conditions read false — or when it is already completed
 * (completed techs always display). Empty `visibleIf` ⇒ always visible.
 */
export function techVisible(state: GameStateT, content: ContentBundleT, tech: string): boolean {
  const def = content.techs.find((t) => t.id === tech);
  if (!def) return false;
  if (state.research.completed.includes(tech)) return true;
  const gates = def.visibleIf ?? [];
  return gates.every((c) => evalCondition(state, content, [], c));
}

export function canStartResearch(state: GameStateT, content: ContentBundleT, tech: string): boolean {
  const def = content.techs.find((t) => t.id === tech);
  if (!def) return false;
  if (state.research.completed.includes(tech)) return false;
  // Hidden techs cannot be started until their visibility gate opens (§2.2).
  if (!techVisible(state, content, tech)) return false;
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
      `Forschung an '${tech}' nicht möglich: unbekannte Technologie, bereits abgeschlossen oder Voraussetzungen nicht erfüllt.`,
    );
  }
  const def = content.techs.find((t) => t.id === tech)!;
  const draft = structuredClone(state);
  if (draft.research.current) {
    draft.journal.push({
      day: draft.campaign.day,
      text: `Forschung an '${draft.research.current.tech}' verworfen, um '${def.name}' zu beginnen.`,
    });
  }
  draft.research.current = { tech, progress: 0 };
  return draft;
}

export function assignPersonnel(state: GameStateT, assignments: PersonnelAssignments): GameStateT {
  if (!canAssignPersonnel(state, assignments)) {
    throw new RuleError(
      "assignPersonnel/invalid",
      "Zuteilungswerte müssen jeweils ≥ 0 sein und dürfen in Summe personnel.total nicht überschreiten.",
    );
  }
  const draft = structuredClone(state);
  draft.personnel.assignments = { ...assignments };
  return draft;
}

/** endDay — exact step order per spec §5. */
export function endDay(state: GameStateT, ctx: ReducerCtx): GameStateT {
  // A launched mission must be resolved before time advances
  // (narrative-engine spec §3).
  if (state.activeMission !== null) {
    throw new RuleError("mission_active", "Schließe die aktive Mission ab, bevor der Tag beendet wird.");
  }

  let draft = structuredClone(state);

  // 1. Income.
  const supportMult = clamp(0.5, 1.5, 0.75 + 0.05 * (draft.variables.support ?? 0));
  const incomeMult = getModifier(draft.modifiers, "incomeMult");
  const income = Math.floor(draft.personnel.assignments.logistics * 3 * supportMult * incomeMult);
  draft.resources.funds += income;
  // Workshop and other facilities add materials each day (facilities spec §3).
  draft.resources.materials += Math.floor(getModifier(draft.modifiers, "materialsPerDay"));

  // 2. Upkeep.
  const upkeep = draft.personnel.total * 1 + draft.heroes.length * 2;
  const afterUpkeep = draft.resources.funds - upkeep;
  if (afterUpkeep < 0) {
    draft.resources.funds = 0;
    draft.variables.support = (draft.variables.support ?? 0) - 1;
    draft.journal.push({ day: draft.campaign.day, text: "Zahltag verpasst." });
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
      draft.journal.push({ day: draft.campaign.day, text: `Forschung abgeschlossen: ${def.name}.` });
      draft = applyEffects(draft, def.effects, ctx);
    } else {
      draft.research.current.progress = progress;
    }
  }

  // 3b. Construction (facilities spec §3): between Research and Recovery.
  // A facility completing here has already benefited from this tick's research.
  draft = advanceConstruction(draft, ctx);

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
          text: `${heroDef?.name ?? hero.hero} hat sich von ${injuryDef?.name ?? injury.injury} erholt.`,
        });
      } else {
        remaining.push({ injury: injury.injury, daysRemaining });
      }
    }
    hero.injuries = remaining;
  }

  // 5. Advance.
  draft.campaign.day += 1;

  // 6. Queued events (narrative-engine spec §7): fire at most one due incident,
  // opening it as a narrative mission the player must resolve before further
  // play (guaranteed by the §3 endDay guard above).
  draft = fireDueIncident(draft, ctx.content);

  return draft;
}
