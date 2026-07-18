/**
 * New-campaign factory (docs/specs/economy-and-roster.md §2). The only
 * source of these starting values — do not invent or "reasonably adjust"
 * numbers here.
 */
import type { GameStateT } from "../data/schemas.js";

export function newCampaign(seed: number): GameStateT {
  return {
    version: 1,
    campaign: { day: 1, seed },
    settings: { showLockedOptions: false },
    resources: { funds: 100, materials: 40, intel: 0, exotics: 0 },
    variables: { support: 5, trust_rival: 0 },
    flags: {},
    journal: [],
    modifiers: {},
    heroes: [
      { hero: "h_mercer", xp: 0, level: 1, fatigue: 0, injuries: [], skillBonuses: {} },
      { hero: "h_okafor", xp: 0, level: 1, fatigue: 0, injuries: [], skillBonuses: {} },
    ],
    personnel: { total: 20, assignments: { logistics: 12, research: 6, infirmary: 2 } },
    research: { current: null, completed: [] },
    missions: { available: ["m_survey"], completed: [], queuedEvents: [] },
    activeMission: null,
  };
}
