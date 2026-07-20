/**
 * Narrative interpreter (docs/specs/narrative-engine.md §4–§7, ARCHITECTURE §6).
 *
 * Deterministic node-graph execution (D-5: the narrative layer consumes no
 * RNG — the only sanctioned draw is the `injury: randomSquadMember` effect,
 * handled inside the shared effects interpreter). This module owns:
 *   - `evalCondition`: the single condition evaluator used everywhere (§4).
 *   - `eligibleOptions`: per-option eligibility + squad-gating for the UI (§5).
 *   - `chooseEventOption`: the traversal reducer (§5) and completion (§6).
 *   - `fireDueIncident`: the queued-event firing endDay calls (§7).
 *
 * Pure throughout: every reducer returns a fresh GameState and never mutates
 * its input (ARCHITECTURE §3).
 */
import type { Condition, ContentBundleT, GameStateT } from "../data/schemas.js";
import { applyEffects } from "./effects.js";
import { RuleError } from "./errors.js";
import type { ReducerCtx } from "./reducer.js";
import { effectiveSkills, isExhausted } from "./roster.js";

type EventScriptT = ContentBundleT["events"][number];
type EventNodeT = EventScriptT["nodes"][number];
type EventOptionT = EventNodeT["options"][number];

// ------------------------------------------------------------- §4 conditions

/**
 * Evaluate a single condition against (state, squad) — the one evaluator shared
 * by mission availability, option requirements, and everything else (§4).
 * Squad-scoped conditions read the effective-skill selector, so fatigue and
 * injuries matter in narrative; an empty squad makes both squad conditions
 * false. Empty `all` is true, empty `any` is false.
 */
export function evalCondition(
  state: GameStateT,
  content: ContentBundleT,
  squad: readonly string[],
  cond: Condition,
): boolean {
  switch (cond.type) {
    case "flag":
      // Missing flag reads as false.
      return (state.flags[cond.flag] ?? false) === cond.value;
    case "variable": {
      const v = state.variables[cond.variable] ?? 0;
      switch (cond.op) {
        case ">=":
          return v >= cond.value;
        case "<=":
          return v <= cond.value;
        case ">":
          return v > cond.value;
        case "<":
          return v < cond.value;
        case "==":
          return v === cond.value;
        case "!=":
          return v !== cond.value;
      }
      return false;
    }
    case "resource":
      return state.resources[cond.resource] >= cond.min;
    case "techResearched":
      return state.research.completed.includes(cond.tech);
    case "squadHasArchetype": {
      for (const heroId of squad) {
        const def = content.heroes.find((h) => h.id === heroId);
        if (def?.archetypes.includes(cond.tag)) return true;
      }
      return false;
    }
    case "squadSkillAtLeast": {
      let best = -Infinity;
      for (const heroId of squad) {
        const hero = state.heroes.find((h) => h.hero === heroId);
        const def = content.heroes.find((h) => h.id === heroId);
        if (!hero || !def) continue;
        const eff = effectiveSkills(hero, def, content.injuries)[cond.skill];
        if (eff > best) best = eff;
      }
      return best >= cond.min; // empty squad ⇒ -Infinity, always false
    }
    case "all":
      return cond.conditions.every((c) => evalCondition(state, content, squad, c));
    case "any":
      return cond.conditions.some((c) => evalCondition(state, content, squad, c));
    case "not":
      return !evalCondition(state, content, squad, cond.condition);
  }
}

// ------------------------------------------------------------ §5 eligibility

/** True when every requirement holds (requirements are an implicit `all`, §4). */
function optionEligible(
  state: GameStateT,
  content: ContentBundleT,
  squad: readonly string[],
  option: EventOptionT,
): boolean {
  return option.requirements.every((c) => evalCondition(state, content, squad, c));
}

/** Whether a squad-scoped leaf appears anywhere in the condition tree. */
function referencesSquad(cond: Condition): boolean {
  switch (cond.type) {
    case "squadHasArchetype":
    case "squadSkillAtLeast":
      return true;
    case "all":
    case "any":
      return cond.conditions.some(referencesSquad);
    case "not":
      return referencesSquad(cond.condition);
    default:
      return false;
  }
}

/**
 * Does a squad-scoped condition contribute to `cond` currently being false?
 * Returns false when `cond` is satisfied. For `all`/`any` a failing squad-scoped
 * child means composition matters; for `not` an inner squad reference means a
 * different squad could flip the (currently-satisfied) inner condition (§5).
 */
function squadContributesToFailure(
  state: GameStateT,
  content: ContentBundleT,
  squad: readonly string[],
  cond: Condition,
): boolean {
  if (evalCondition(state, content, squad, cond)) return false;
  switch (cond.type) {
    case "squadHasArchetype":
    case "squadSkillAtLeast":
      return true;
    case "flag":
    case "variable":
    case "resource":
    case "techResearched":
      return false;
    case "all":
    case "any":
      return cond.conditions.some((c) => squadContributesToFailure(state, content, squad, c));
    case "not":
      return referencesSquad(cond.condition);
  }
}

/** An ineligible option is squad-gated when a squad-scoped requirement fails (§5). */
function optionGatedBySquad(
  state: GameStateT,
  content: ContentBundleT,
  squad: readonly string[],
  option: EventOptionT,
): boolean {
  if (optionEligible(state, content, squad, option)) return false;
  return option.requirements.some((c) => squadContributesToFailure(state, content, squad, c));
}

/**
 * Per-option eligibility for the current node (§5). `gatedBySquad` is true when
 * an option is ineligible and at least one failing requirement is squad-scoped
 * (squadHasArchetype / squadSkillAtLeast, including nested in all/any/not). The
 * UI renders ineligible options per `settings.showLockedOptions` (D-1). Returns
 * `[]` when no narrative mission is active.
 */
export function eligibleOptions(
  state: GameStateT,
  content: ContentBundleT,
): Array<{ option: string; eligible: boolean; gatedBySquad: boolean }> {
  const node = currentNode(state, content);
  if (!node) return [];
  const squad = activeNarrative(state)!.squad;
  return node.options.map((o) => {
    const eligible = optionEligible(state, content, squad, o);
    return {
      option: o.id,
      eligible,
      gatedBySquad: eligible ? false : optionGatedBySquad(state, content, squad, o),
    };
  });
}

// --------------------------------------------------------------- traversal

type ActiveNarrativeT = Extract<NonNullable<GameStateT["activeMission"]>, { kind: "narrative" }>;

function activeNarrative(state: GameStateT): ActiveNarrativeT | null {
  const am = state.activeMission;
  return am !== null && am.kind === "narrative" ? am : null;
}

/** Resolve the node the active narrative mission currently sits on. */
function currentNode(state: GameStateT, content: ContentBundleT): EventNodeT | null {
  const am = activeNarrative(state);
  if (!am) return null;
  const script = content.events.find((e) => e.id === am.script);
  return script?.nodes.find((n) => n.id === am.node) ?? null;
}

/**
 * Apply the player's choice at the current node (§5). Validates that a narrative
 * mission is active, the option belongs to the current node, and the option is
 * eligible — else RuleError. Records the debrief flag (`gatedSeen`) before
 * applying, runs the option's effects, then either advances the node or ends the
 * mission (§6). Pure.
 */
export function chooseEventOption(state: GameStateT, ctx: ReducerCtx, optionId: string): GameStateT {
  const am = activeNarrative(state);
  if (!am) {
    throw new RuleError("chooseEventOption/no_active_mission", "No narrative mission is active.");
  }
  const script = ctx.content.events.find((e) => e.id === am.script);
  if (!script) throw new Error(`chooseEventOption: unknown script '${am.script}'`);
  const node = script.nodes.find((n) => n.id === am.node);
  if (!node) throw new Error(`chooseEventOption: unknown node '${am.node}' in '${am.script}'`);

  const option = node.options.find((o) => o.id === optionId);
  if (!option) {
    throw new RuleError(
      "chooseEventOption/unknown_option",
      `Option '${optionId}' gehört nicht zum aktuellen Knoten.`,
    );
  }
  if (!optionEligible(state, ctx.content, am.squad, option)) {
    throw new RuleError("chooseEventOption/ineligible", `Option '${optionId}' ist nicht verfügbar.`);
  }

  // §5.2: if any option of this node is squad-gated, the debrief hint arms —
  // checked against the pre-choice state, before the effects are applied.
  const armDebrief = node.options.some((o) => optionGatedBySquad(state, ctx.content, am.squad, o));

  let draft = structuredClone(state);
  if (armDebrief) activeNarrative(draft)!.gatedSeen = true;

  // §5.3: apply the option's effects in order, with squad context.
  draft = applyEffects(draft, option.effects, ctx, am.squad);

  // §5.4: follow `next`.
  const next = option.next;
  if (next.kind === "node") {
    activeNarrative(draft)!.node = next.node;
    return draft;
  }
  const outcome = script.outcomes.find((o) => o.id === next.outcome);
  if (!outcome) {
    throw new Error(`chooseEventOption: unknown outcome '${next.outcome}' in '${am.script}'`);
  }
  draft = applyEffects(draft, outcome.effects, ctx, am.squad);
  return completeNarrative(draft, script, outcome.id, outcome.label);
}

/**
 * Mission completion for a narrative mission (§6). Records the completed
 * mission (queue-fired incidents have no MissionDef wrapper, so none), writes
 * the `"<title>: <label>"` journal line and the D-1 debrief hint, then clears
 * `activeMission`. Mutates `draft` in place — it is already a private clone.
 */
function completeNarrative(
  draft: GameStateT,
  script: EventScriptT,
  outcomeId: string,
  outcomeLabel: string,
): GameStateT {
  const am = activeNarrative(draft)!;
  const day = draft.campaign.day;

  if (am.mission !== undefined) {
    draft.missions.available = draft.missions.available.filter((id) => id !== am.mission);
    draft.missions.completed.push({ mission: am.mission, outcome: outcomeId, day });
  }

  draft.journal.push({ day, text: `${script.title}: ${outcomeLabel}` });

  if (am.gatedSeen && !draft.settings.showLockedOptions) {
    draft.journal.push({
      day,
      text: "Debrief: Eine andere Teamzusammenstellung hätte vielleicht andere Wege eröffnet.",
    });
  }

  draft.activeMission = null;
  return draft;
}

// ------------------------------------------------------ §7 queued incidents

/**
 * Fire at most one due queued incident (§7). Called by endDay after the day
 * advances: with no mission active and a queued entry due (`fireOnDay ≤ day`),
 * pop exactly one — lowest fireOnDay, ties by queue order — and open it as a
 * narrative mission whose squad is every non-exhausted hero (fatigue < 80).
 * Remaining due entries wait for a later day. Pure; a no-op (returns `state`)
 * when a mission is active or nothing is due.
 */
export function fireDueIncident(state: GameStateT, content: ContentBundleT): GameStateT {
  if (state.activeMission !== null) return state;

  let pick = -1;
  for (let i = 0; i < state.missions.queuedEvents.length; i++) {
    const entry = state.missions.queuedEvents[i]!;
    if (entry.fireOnDay > state.campaign.day) continue;
    // strictly-less keeps the earliest queue index on a fireOnDay tie
    if (pick === -1 || entry.fireOnDay < state.missions.queuedEvents[pick]!.fireOnDay) {
      pick = i;
    }
  }
  if (pick === -1) return state;

  const draft = structuredClone(state);
  const [entry] = draft.missions.queuedEvents.splice(pick, 1);
  const script = content.events.find((e) => e.id === entry!.event);
  if (!script) throw new Error(`fireDueIncident: unknown queued event '${entry!.event}'`);

  draft.activeMission = {
    kind: "narrative",
    mission: undefined,
    script: script.id,
    node: script.entryNode,
    squad: draft.heroes.filter((h) => !isExhausted(h)).map((h) => h.hero),
    gatedSeen: false,
  };
  return draft;
}
