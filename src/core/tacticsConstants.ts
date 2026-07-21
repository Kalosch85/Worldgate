/**
 * Tactical engine tunables (tactics-engine spec — every value marked (T)).
 *
 * Task 6.3 (balance pass) owns these numbers; the engine reads them from here
 * and nowhere else, so a balance session touches exactly one file. Nothing in
 * here is content — content lives in src/data/content/*.json.
 *
 * Leitplanke (veyra-kaempfe tuning v3 §6): (T)-Werte werden nur mit
 * gleichzeitiger Aktualisierung von docs/specs/veyra-kaempfe.md geändert; Spec
 * und Content dürfen nicht divergieren.
 */

// ------------------------------------------------------------ §2 hero stats
/** Flat max HP for every player hero (T). */
export const HERO_MAX_HP = 5;
/** aim = HERO_AIM_BASE + HERO_AIM_PER_COMBAT × effectiveCombat (T).
 * Balance-Rebase v3 (veyra-kaempfe §3a): 55 → 60 — Helden fühlen sich
 * kompetenter an, die Formel bleibt 60 + 5 × effCombat. */
export const HERO_AIM_BASE = 60;
export const HERO_AIM_PER_COMBAT = 5;
/** Tiles a hero may move per move action (T). */
export const HERO_MOBILITY = 4;
/** Hero weapon damage roll range, inclusive (T). */
export const HERO_DMG_MIN = 1;
export const HERO_DMG_MAX = 2;

// -------------------------------------------------------------- §5 AP costs
export const MOVE_AP_COST = 1;
export const INTERACT_AP_COST = 1;
/** AP a unit is left with after using any ability — the "ability ends the
 * activation" rule (§5). */
export const ABILITY_ENDS_AP = 0;
/** AP every unit receives at the start of its side's phase (§3, §5). */
export const AP_PER_TURN = 2;

// ------------------------------------------------------- §7 combat / cover
/** hit% = clamp(HIT_MIN, HIT_MAX, aim − coverBonus − RANGE_PENALTY × dist). */
export const HIT_MIN = 5;
export const HIT_MAX = 95;
export const RANGE_PENALTY_PER_TILE = 2;
/** Cover bonus subtracted from the attacker's hit% by the target's tile (T). */
export const COVER_BONUS_LOW = 20; // "-"
export const COVER_BONUS_HIGH = 40; // "+"
export const COVER_BONUS_NONE = 0; // "." and everything else

// ---------------------------------------------------------- §10 enemy AI v0
/** attack score = ATTACK_BASE + ATTACK_HIT_WEIGHT × hit% + (lethal ? LETHAL_BONUS : 0). */
export const AI_ATTACK_BASE = 40;
export const AI_ATTACK_HIT_WEIGHT = 0.4;
export const AI_LETHAL_BONUS = 25;
/** move score = MOVE_COVER_WEIGHT × coverBonus(tile)
 *             + MOVE_APPROACH_WEIGHT × (distNow − distTile)
 *             + MOVE_HIT_WEIGHT × bestHit%FromTile. */
export const AI_MOVE_COVER_WEIGHT = 0.3;
export const AI_MOVE_APPROACH_WEIGHT = 2;
export const AI_MOVE_HIT_WEIGHT = 0.2;
/** Score of doing nothing — the floor a real action must beat. */
export const AI_PASS_SCORE = 5;
