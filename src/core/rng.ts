/**
 * Seeded PRNG for the sim core (task 0.3, ARCHITECTURE §4).
 *
 * All nondeterminism in `src/core` flows through an injected `Rng`; the core
 * never calls `Math.random` (ESLint enforces this). A campaign owns one seed;
 * per-battle streams are derived, not stored ad hoc — see `hash.ts`.
 */

/**
 * A deterministic random source. `mulberry32` is the only implementation in
 * the prototype, but consumers depend on this interface so the generator stays
 * swappable and tests can inject fakes.
 */
export interface Rng {
  /** Next float in the half-open range [0, 1). */
  next(): number;
  /** Uniform integer in the inclusive range [min, max]. Requires min <= max. */
  int(min: number, max: number): number;
}

/**
 * mulberry32 — a small, fast 32-bit seeded generator. The `seed` is coerced to
 * an unsigned 32-bit integer, so the same seed always yields the same stream.
 */
export function mulberry32(seed: number): Rng {
  let state = seed >>> 0;

  const next = (): number => {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };

  return {
    next,
    int(min: number, max: number): number {
      if (max < min) throw new RangeError(`mulberry32.int: max (${max}) < min (${min})`);
      return min + Math.floor(next() * (max - min + 1));
    },
  };
}
