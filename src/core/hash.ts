/**
 * Deterministic seed derivation (task 0.3, ARCHITECTURE §4).
 *
 * Battle seeds are derived, never stored ad hoc: `hash(campaign.seed, day,
 * missionId)`. Same campaign + same inputs ⇒ same battle stream, which is what
 * makes golden-path tests, headless balance simulation (task 6.3), and future
 * replay cheap.
 */

/**
 * xmur3 string hash → unsigned 32-bit integer. A standard companion to
 * mulberry32: it spreads an arbitrary string into a well-distributed 32-bit
 * seed. Deterministic and dependency-free.
 */
export function hashString(str: string): number {
  let h = 1779033703 ^ str.length;
  for (let i = 0; i < str.length; i++) {
    h = Math.imul(h ^ str.charCodeAt(i), 3432918353);
    h = (h << 13) | (h >>> 19);
  }
  h = Math.imul(h ^ (h >>> 16), 2246822507);
  h = Math.imul(h ^ (h >>> 13), 3266489909);
  return (h ^ (h >>> 16)) >>> 0;
}

/**
 * Derive a battle seed from the campaign seed and the battle's inputs. The
 * inputs are joined into a single key with an unambiguous separator so that,
 * e.g., (day 12, mission "m_1") and (day 1, mission "2m_1") never collide.
 */
export function deriveBattleSeed(campaignSeed: number, day: number, missionId: string): number {
  return hashString(`${campaignSeed >>> 0}|${day}|${missionId}`);
}
