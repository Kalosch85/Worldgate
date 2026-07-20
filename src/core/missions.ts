/**
 * Mission launch (docs/specs/narrative-engine.md §3). The strategic → mission
 * hand-off: validate the squad against the MissionDef, then open the mission.
 *
 * Scope note: narrative traversal (chooseEventOption), completion, and
 * queued-event firing live in the Phase 3 interpreter (narrative.ts). As of
 * task 4.2 a tactical launch builds a real BattleState (tactics-engine spec §3)
 * via `createBattleState`; the battle is then driven by the `battle*` actions.
 */
import type { ContentBundleT, GameStateT } from "../data/schemas.js";
import { TACTICAL_LAUNCH_COST } from "./economy.js";
import { RuleError } from "./errors.js";
import { isExhausted } from "./roster.js";
import { createBattleState } from "./tactics.js";

type MissionDefT = ContentBundleT["missions"][number];

/**
 * The mission ids newly present in `after`'s available list that were absent
 * from `before`'s — i.e. the missions a just-resolved action (a mission
 * completion, a research unlock, a queued event) opened up. Pure; the returned
 * order follows `after.missions.available`. The just-completed mission is a
 * removal, not an addition, so it never appears here. Powers the post-mission
 * summary's auto-derived "Next:" section.
 */
export function newlyUnlockedMissions(before: GameStateT, after: GameStateT): string[] {
  const had = new Set(before.missions.available);
  return after.missions.available.filter((id) => !had.has(id));
}

/**
 * Shared validation for the guards that apply to EVERY mission, regardless of
 * payload kind (§3): the mission is available, no mission is active, the squad
 * size fits the MissionDef, and every squad id is a known, non-duplicate,
 * non-exhausted hero. Returns the resolved MissionDef, or a RuleError-ready
 * failure reason. Injured-but-not-exhausted heroes may launch.
 */
function validateLaunch(
  state: GameStateT,
  content: ContentBundleT,
  mission: string,
  squad: readonly string[],
): { ok: true; def: MissionDefT } | { ok: false; code: string; message: string } {
  if (state.activeMission !== null) {
    return { ok: false, code: "mission_active", message: "Es läuft bereits eine Mission." };
  }
  if (!state.missions.available.includes(mission)) {
    return { ok: false, code: "mission_unavailable", message: `Mission '${mission}' ist nicht verfügbar.` };
  }
  const def = content.missions.find((m) => m.id === mission);
  if (!def) {
    return { ok: false, code: "mission_unknown", message: `Unbekannte Mission '${mission}'.` };
  }
  if (squad.length < def.squad.min || squad.length > def.squad.max) {
    return {
      ok: false,
      code: "squad_size",
      message: `${def.name} erfordert einen Trupp von ${def.squad.min}–${def.squad.max}.`,
    };
  }
  const seen = new Set<string>();
  for (const heroId of squad) {
    if (seen.has(heroId)) {
      return { ok: false, code: "squad_duplicate", message: `Doppeltes Truppmitglied '${heroId}'.` };
    }
    seen.add(heroId);
    const heroState = state.heroes.find((h) => h.hero === heroId);
    if (!heroState) {
      return { ok: false, code: "squad_unknown_hero", message: `Unbekannter Held '${heroId}'.` };
    }
    if (isExhausted(heroState)) {
      return {
        ok: false,
        code: "squad_exhausted",
        message: `${heroId} ist erschöpft und kann nicht entsandt werden.`,
      };
    }
  }
  return { ok: true, def };
}

/**
 * UI pre-validation guard (§3). True when {@link launchMission} would accept
 * this mission and squad. For a tactical mission it additionally checks the
 * materials cost; the reducer then builds a real BattleState (tactics-engine
 * §3) and the worldgate UI deploys the squad to the battle screen (task 4.3).
 */
export function canLaunchMission(
  state: GameStateT,
  content: ContentBundleT,
  mission: string,
  squad: readonly string[],
): boolean {
  const result = validateLaunch(state, content, mission, squad);
  if (!result.ok) return false;
  if (result.def.payload.kind === "tactical") {
    return state.resources.materials >= (result.def.launchCost ?? TACTICAL_LAUNCH_COST);
  }
  return true;
}

/**
 * Launch a mission (§3). Re-validates every guard and throws RuleError on any
 * failure. On success:
 *  - narrative: opens `activeMission` at the event script's entry node.
 *  - tactical: debits the materials cost and opens `activeMission` on a fresh
 *    BattleState (tactics-engine spec §3).
 * Pure: returns a new GameState, never mutates.
 */
export function launchMission(
  state: GameStateT,
  content: ContentBundleT,
  mission: string,
  squad: readonly string[],
): GameStateT {
  const result = validateLaunch(state, content, mission, squad);
  if (!result.ok) {
    throw new RuleError(`launchMission/${result.code}`, result.message);
  }
  const def = result.def;

  if (def.payload.kind === "tactical") {
    // D-9: a MissionDef may override the default cost (0 = free spine battle).
    const launchCost = def.launchCost ?? TACTICAL_LAUNCH_COST;
    if (state.resources.materials < launchCost) {
      throw new RuleError(
        "launchMission/insufficient_materials",
        `${def.name} benötigt ${launchCost} Material für den Einsatz.`,
      );
    }
    const draft = structuredClone(state);
    draft.resources.materials -= launchCost;
    const battle = createBattleState(draft, content, def, squad);
    draft.activeMission = { kind: "tactical", mission, squad: [...squad], battle };
    return draft;
  }

  const scriptId = def.payload.eventScript;
  const script = content.events.find((e) => e.id === scriptId);
  if (!script) {
    throw new RuleError(
      "launchMission/unknown_script",
      `Mission '${mission}' verweist auf unbekanntes Ereignisskript '${scriptId}'.`,
    );
  }

  const draft = structuredClone(state);
  draft.activeMission = {
    kind: "narrative",
    mission,
    script: scriptId,
    node: script.entryNode,
    squad: [...squad],
    gatedSeen: false,
  };
  return draft;
}
