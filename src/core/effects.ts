/**
 * Effects interpreter (docs/specs/economy-and-roster.md §6, ARCHITECTURE §5).
 *
 * One interpreter for the universal Effect vocabulary, shared by techs, event
 * options/outcomes, and mission rewards. Effects apply in array order;
 * clamping (resources floor at 0, fatigue clamps 0..100, variables
 * unclamped) is this interpreter's job.
 */
import type { Effect, GameStateT } from "../data/schemas.js";
import type { ReducerCtx } from "./reducer.js";
import { getModifier } from "./modifiers.js";

export function applyEffects(
  state: GameStateT,
  effects: readonly Effect[],
  ctx: ReducerCtx,
  squad?: readonly string[],
): GameStateT {
  let draft = structuredClone(state);
  for (const effect of effects) {
    draft = applyOne(draft, effect, ctx, squad);
  }
  return draft;
}

function applyOne(
  state: GameStateT,
  effect: Effect,
  ctx: ReducerCtx,
  squad: readonly string[] | undefined,
): GameStateT {
  switch (effect.type) {
    case "resource": {
      const current = state.resources[effect.resource];
      state.resources[effect.resource] = Math.max(0, Math.floor(current + effect.delta));
      return state;
    }
    case "flag": {
      state.flags[effect.flag] = effect.value;
      return state;
    }
    case "variable": {
      state.variables[effect.variable] = (state.variables[effect.variable] ?? 0) + effect.delta;
      return state;
    }
    case "modifier": {
      state.modifiers[effect.key] =
        effect.mode === "set" ? effect.value : getModifier(state.modifiers, effect.key) + effect.value;
      return state;
    }
    case "fatigue": {
      for (const heroId of squad ?? []) {
        const heroState = state.heroes.find((h) => h.hero === heroId);
        if (!heroState) continue;
        heroState.fatigue = Math.min(100, Math.max(0, heroState.fatigue + effect.delta));
      }
      return state;
    }
    case "xp": {
      for (const heroId of squad ?? []) {
        const heroState = state.heroes.find((h) => h.hero === heroId);
        if (!heroState) continue;
        heroState.xp += effect.amount;
      }
      return state;
    }
    case "injury": {
      const roster = squad ?? [];
      if (roster.length === 0) return state;
      const pick = roster[ctx.rng.int(0, roster.length - 1)]!;
      const heroState = state.heroes.find((h) => h.hero === pick);
      if (!heroState) return state;
      const injuryDef = ctx.content.injuries.find((i) => i.id === effect.injury);
      if (!injuryDef) throw new Error(`applyEffects: unknown injury '${effect.injury}'`);
      heroState.injuries.push({ injury: injuryDef.id, daysRemaining: injuryDef.daysToHeal });
      return state;
    }
    case "queueEvent": {
      state.missions.queuedEvents.push({
        event: effect.event,
        fireOnDay: state.campaign.day + effect.delayDays,
      });
      return state;
    }
    case "unlockMission": {
      if (!state.missions.available.includes(effect.mission)) {
        state.missions.available.push(effect.mission);
      }
      return state;
    }
    case "log": {
      state.journal.push({ day: state.campaign.day, text: effect.text });
      return state;
    }
  }
}
