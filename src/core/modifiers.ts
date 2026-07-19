/**
 * Modifier registry (docs/specs/economy-and-roster.md §4).
 *
 * Modifiers live in `state.modifiers` (key -> number). Known keys have a
 * default used when the key is absent; unknown keys are stored but inert —
 * nothing in `core` reads them, they simply round-trip.
 */
export const MODIFIER_DEFAULTS = {
  incomeMult: 1,
  researchBonus: 0,
  healRate: 0,
  // Bonus materials added to income each endDay (facilities spec §3). Default 0.
  materialsPerDay: 0,
} as const;

export type ModifierKey = keyof typeof MODIFIER_DEFAULTS;

/** Current value of a modifier: stored value, or its default (0 if unknown). */
export function getModifier(modifiers: Record<string, number>, key: string): number {
  const stored = modifiers[key];
  if (stored !== undefined) return stored;
  return key in MODIFIER_DEFAULTS ? MODIFIER_DEFAULTS[key as ModifierKey] : 0;
}
