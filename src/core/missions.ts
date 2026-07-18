/**
 * Mission launch (docs/specs/narrative-engine.md §3). The strategic → mission
 * hand-off: validate the squad against the MissionDef, then open the mission.
 *
 * Scope note: this is the task-2.4 "launchMission portion" only. Event
 * traversal (chooseEventOption), completion, and queued-event firing arrive
 * with the Phase 3 interpreter (§5–§7); until then a launched narrative
 * mission simply sits in `activeMission` and a launched tactical mission is
 * refused with RuleError("tactical_not_implemented") (§3).
 */
import type { ContentBundleT, GameStateT } from "../data/schemas.js";
import { TACTICAL_LAUNCH_COST } from "./economy.js";
import { RuleError } from "./errors.js";
import { isExhausted } from "./roster.js";

type MissionDefT = ContentBundleT["missions"][number];

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
    return { ok: false, code: "mission_active", message: "A mission is already in progress." };
  }
  if (!state.missions.available.includes(mission)) {
    return { ok: false, code: "mission_unavailable", message: `Mission '${mission}' is not available.` };
  }
  const def = content.missions.find((m) => m.id === mission);
  if (!def) {
    return { ok: false, code: "mission_unknown", message: `Unknown mission '${mission}'.` };
  }
  if (squad.length < def.squad.min || squad.length > def.squad.max) {
    return {
      ok: false,
      code: "squad_size",
      message: `${def.name} requires a squad of ${def.squad.min}–${def.squad.max}.`,
    };
  }
  const seen = new Set<string>();
  for (const heroId of squad) {
    if (seen.has(heroId)) {
      return { ok: false, code: "squad_duplicate", message: `Duplicate squad member '${heroId}'.` };
    }
    seen.add(heroId);
    const heroState = state.heroes.find((h) => h.hero === heroId);
    if (!heroState) {
      return { ok: false, code: "squad_unknown_hero", message: `Unknown hero '${heroId}'.` };
    }
    if (isExhausted(heroState)) {
      return {
        ok: false,
        code: "squad_exhausted",
        message: `${heroId} is exhausted and cannot be deployed.`,
      };
    }
  }
  return { ok: true, def };
}

/**
 * UI pre-validation guard (§3). True when {@link launchMission} would accept
 * this mission and squad. For a tactical mission it additionally checks the
 * materials cost — but note the reducer still refuses tactical launches with
 * RuleError("tactical_not_implemented") until the Phase 4 battle spec lands, so
 * the worldgate UI presents tactical missions as "coming" rather than launching
 * them.
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
    return state.resources.materials >= TACTICAL_LAUNCH_COST;
  }
  return true;
}

/**
 * Launch a mission (§3). Re-validates every guard and throws RuleError on any
 * failure. On success:
 *  - narrative: opens `activeMission` at the event script's entry node.
 *  - tactical: enforces the materials cost, then throws
 *    RuleError("tactical_not_implemented") — battle init is Phase 4's spec.
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
    if (state.resources.materials < TACTICAL_LAUNCH_COST) {
      throw new RuleError(
        "launchMission/insufficient_materials",
        `${def.name} needs ${TACTICAL_LAUNCH_COST} materials to deploy.`,
      );
    }
    // Battle initialization is owned by the Phase 4 tactics spec. Until it
    // lands, tactical launches are refused (§3). The materials debit that will
    // accompany a real launch is therefore not applied here.
    throw new RuleError("tactical_not_implemented", "Tactical missions require field systems (coming).");
  }

  const scriptId = def.payload.eventScript;
  const script = content.events.find((e) => e.id === scriptId);
  if (!script) {
    throw new RuleError(
      "launchMission/unknown_script",
      `Mission '${mission}' references unknown event script '${scriptId}'.`,
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
