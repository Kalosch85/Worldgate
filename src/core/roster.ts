/**
 * Roster rules (docs/specs/economy-and-roster.md §7, ARCHITECTURE §2).
 *
 * Effective skill is a SELECTOR — base + level-up bonuses + injury penalties +
 * fatigue penalty, computed on read and NEVER stored (ARCHITECTURE §2). Only
 * `level` and `skillBonuses` are stored, and they change solely on level-up;
 * this module is the single place that derives skills and applies level-ups.
 */
import {
  SkillId,
  type ContentBundleT,
  type GameStateT,
  type HeroDefT,
  type SkillIdT,
} from "../data/schemas.js";

type HeroStateT = GameStateT["heroes"][number];
type InjuryDefT = ContentBundleT["injuries"][number];

/**
 * Cumulative XP needed to REACH each level (index = level − 1); level caps at 5.
 * L2 25 · L3 75 · L4 150 · L5 250 (§7).
 */
export const XP_THRESHOLDS = [0, 25, 75, 150, 250] as const;
export const MAX_LEVEL = XP_THRESHOLDS.length; // 5

/** Fatigue thresholds (§7). */
export const FATIGUE_TIRED = 50; // ≥ : −1 to every effective skill
export const FATIGUE_EXHAUSTED = 80; // ≥ : hero cannot be added to a squad

/** Schema enum order — the level-up tie-break for equal base skills (§7). */
const SKILL_ORDER: readonly SkillIdT[] = SkillId.options;

/** Level earned by an XP total, clamped to the level-5 cap (§7). */
export function levelForXp(xp: number): number {
  let level = 1;
  for (let i = 1; i < XP_THRESHOLDS.length; i++) {
    if (xp >= XP_THRESHOLDS[i]!) level = i + 1;
  }
  return level;
}

/**
 * The skill a hero improves on level-up: their highest BASE skill (HeroDef,
 * excluding bonuses), ties broken by schema enum order (§7). Fixed per hero, so
 * every level-up feeds the same skill.
 */
export function levelUpSkill(def: HeroDefT): SkillIdT {
  let best = SKILL_ORDER[0]!;
  for (const skill of SKILL_ORDER) {
    // strictly-greater keeps the enum-earliest skill on a tie
    if (def.skills[skill] > def.skills[best]) best = skill;
  }
  return best;
}

export function isTired(hero: HeroStateT): boolean {
  return hero.fatigue >= FATIGUE_TIRED;
}

export function isExhausted(hero: HeroStateT): boolean {
  return hero.fatigue >= FATIGUE_EXHAUSTED;
}

/** §7: an exhausted hero cannot be added to a squad. */
export function canBeSelectedForSquad(hero: HeroStateT): boolean {
  return !isExhausted(hero);
}

/**
 * Effective skills for a hero: base + level-up bonuses + injury penalties +
 * a flat −1 to every skill while tired (§7). Computed, never stored. Values are
 * left unclamped — design reads them with thresholds.
 */
export function effectiveSkills(
  hero: HeroStateT,
  def: HeroDefT,
  injuryDefs: readonly InjuryDefT[],
): Record<SkillIdT, number> {
  const tiredPenalty = isTired(hero) ? -1 : 0;
  const result = {} as Record<SkillIdT, number>;
  for (const skill of SKILL_ORDER) {
    let value = def.skills[skill] + (hero.skillBonuses[skill] ?? 0) + tiredPenalty;
    for (const injury of hero.injuries) {
      const idef = injuryDefs.find((i) => i.id === injury.injury);
      const penalty = idef?.skillPenalties?.[skill];
      if (penalty) value += penalty;
    }
    result[skill] = value;
  }
  return result;
}

/** Single-skill convenience wrapper over {@link effectiveSkills}. */
export function effectiveSkill(
  hero: HeroStateT,
  def: HeroDefT,
  injuryDefs: readonly InjuryDefT[],
  skill: SkillIdT,
): number {
  return effectiveSkills(hero, def, injuryDefs)[skill];
}

/**
 * Bring a hero up to the level their current XP earns, applying skill bonuses
 * for each level gained (§7). Pure: returns a new HeroState (updated `level` and
 * `skillBonuses`) and never mutates. A no-op when no level was crossed. A jump
 * of several levels at once adds the whole delta to the hero's level-up skill.
 */
export function applyLevelUps(hero: HeroStateT, def: HeroDefT): HeroStateT {
  const target = levelForXp(hero.xp);
  if (target <= hero.level) return hero;
  const k = levelUpSkill(def);
  const gained = target - hero.level;
  return {
    ...hero,
    level: target,
    skillBonuses: { ...hero.skillBonuses, [k]: (hero.skillBonuses[k] ?? 0) + gained },
  };
}
