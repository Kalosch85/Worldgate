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
 * The single next mission of the running operation, for the post-mission
 * summary's "Weiter" button (veyra-kaempfe spec §2a). Returns a mission id only
 * when (a) a deployment is active and (b) exactly ONE of the just-unlocked
 * missions belongs to that operation. Otherwise null — the summary falls back to
 * returning to base. Pure; `newlyUnlocked` is the `newlyUnlockedMissions` diff.
 */
export function deploymentNextMission(
  state: GameStateT,
  content: ContentBundleT,
  newlyUnlocked: readonly string[],
): string | null {
  const deployment = state.deployment;
  if (deployment === null) return null;
  const ofOperation = newlyUnlocked.filter((id) => {
    const def = content.missions.find((m) => m.id === id);
    return def?.operation === deployment.operation;
  });
  return ofOperation.length === 1 ? ofOperation[0]! : null;
}

/**
 * Shared validation for the guards that apply to EVERY mission, regardless of
 * payload kind (§3): the mission is available, no mission is active, the squad
 * size fits the MissionDef, and every squad id is a known, non-duplicate,
 * non-exhausted hero. Returns the resolved MissionDef, or a RuleError-ready
 * failure reason. Injured-but-not-exhausted heroes may launch.
 */
/**
 * A mission continues a running operation when it is tagged with the same
 * `operation` as the active deployment (veyra-kaempfe spec §2). Such a launch
 * reuses `deployment.squad` and skips squad selection.
 */
function isDeploymentContinuation(state: GameStateT, def: MissionDefT): boolean {
  return (
    state.deployment !== null && def.operation !== undefined && def.operation === state.deployment.operation
  );
}

function validateLaunch(
  state: GameStateT,
  content: ContentBundleT,
  mission: string,
  squad: readonly string[],
): { ok: true; def: MissionDefT; squad: readonly string[] } | { ok: false; code: string; message: string } {
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
  // §2: within a running operation the squad is fixed — ignore the requested
  // squad and reuse the locked one; the exhausted lock no longer applies (the
  // team must see the operation through, tired or not).
  const continuing = isDeploymentContinuation(state, def);
  const effectiveSquad = continuing ? state.deployment!.squad : squad;
  if (effectiveSquad.length < def.squad.min || effectiveSquad.length > def.squad.max) {
    return {
      ok: false,
      code: "squad_size",
      message: `${def.name} erfordert einen Trupp von ${def.squad.min}–${def.squad.max}.`,
    };
  }
  const seen = new Set<string>();
  for (const heroId of effectiveSquad) {
    if (seen.has(heroId)) {
      return { ok: false, code: "squad_duplicate", message: `Doppeltes Truppmitglied '${heroId}'.` };
    }
    seen.add(heroId);
    const heroState = state.heroes.find((h) => h.hero === heroId);
    if (!heroState) {
      return { ok: false, code: "squad_unknown_hero", message: `Unbekannter Held '${heroId}'.` };
    }
    if (!continuing && isExhausted(heroState)) {
      return {
        ok: false,
        code: "squad_exhausted",
        message: `${heroId} ist erschöpft und kann nicht entsandt werden.`,
      };
    }
  }
  return { ok: true, def, squad: effectiveSquad };
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
 * True when the operation deployment must OPEN on this launch (veyra-kaempfe
 * spec §2): the mission carries an `operation` and none is running yet. On a
 * continuation the deployment already exists and is left untouched.
 */
function opensDeployment(state: GameStateT, def: MissionDefT): boolean {
  return def.operation !== undefined && state.deployment === null;
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
  // §2: the effective squad is the requested one, or — within a running
  // operation — the locked deployment squad.
  const effectiveSquad = result.squad;

  // §2: the first operation mission opens the deployment and locks its squad.
  const openDeployment = (draft: GameStateT): void => {
    if (opensDeployment(draft, def)) {
      draft.deployment = { operation: def.operation!, squad: [...effectiveSquad] };
    }
  };

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
    const battle = createBattleState(draft, content, def, effectiveSquad);
    draft.activeMission = { kind: "tactical", mission, squad: [...effectiveSquad], battle };
    openDeployment(draft);
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
    squad: [...effectiveSquad],
    gatedSeen: false,
  };
  openDeployment(draft);
  return draft;
}
