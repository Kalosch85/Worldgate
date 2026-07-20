/**
 * New-campaign factory (docs/specs/economy-and-roster.md §2, amended by D-9).
 * The only source of these starting values — do not invent or "reasonably
 * adjust" numbers here.
 *
 * D-9 (early-campaign restructure, Fable-sanctioned): a new campaign opens on
 * the intro narrative event (`ev_intro`) as the active mission, reusing the
 * queued-incident shape — no MissionDef wrapper, squad = every starting hero.
 * Resolving the script's entry node requires the content bundle, so the intro
 * only launches when `content` is provided; callers that need the bare
 * strategic state (core unit tests) omit it. The app shell always passes it.
 */
import type { ContentBundleT, GameStateT } from "../data/schemas.js";

/** The event script a new campaign auto-launches (D-9). */
export const INTRO_EVENT = "ev_intro";

export function newCampaign(seed: number, content?: ContentBundleT): GameStateT {
  const state: GameStateT = {
    version: 2,
    campaign: { day: 1, seed },
    settings: { showLockedOptions: false },
    resources: { funds: 100, materials: 40, intel: 0, exotics: 0 },
    variables: { support: 5, trust_andara: 0 },
    flags: {},
    journal: [],
    modifiers: {},
    heroes: [
      { hero: "h_mercer", xp: 0, level: 1, fatigue: 0, injuries: [], skillBonuses: {} },
      { hero: "h_okafor", xp: 0, level: 1, fatigue: 0, injuries: [], skillBonuses: {} },
    ],
    personnel: { total: 20, assignments: { logistics: 12, research: 6, infirmary: 2 } },
    research: { current: null, completed: [] },
    construction: { current: null, built: [] },
    missions: { available: [], completed: [], queuedEvents: [] },
    activeMission: null,
  };
  if (!content) return state;

  const script = content.events.find((e) => e.id === INTRO_EVENT);
  if (!script) throw new Error(`newCampaign: content is missing intro event '${INTRO_EVENT}'`);
  state.activeMission = {
    kind: "narrative",
    mission: undefined,
    script: script.id,
    node: script.entryNode,
    squad: state.heroes.map((h) => h.hero),
    gatedSeen: false,
  };
  return state;
}
