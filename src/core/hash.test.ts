import { describe, expect, it } from "vitest";
import { deriveBattleSeed, hashString } from "./hash.js";
import { mulberry32 } from "./rng.js";

describe("hashString", () => {
  it("is deterministic", () => {
    expect(hashString("m_1|7")).toBe(hashString("m_1|7"));
  });

  it("returns an unsigned 32-bit integer", () => {
    for (const s of ["", "a", "m_intro", "42|1|m_boss", "🜁 exotic"]) {
      const h = hashString(s);
      expect(Number.isInteger(h)).toBe(true);
      expect(h).toBeGreaterThanOrEqual(0);
      expect(h).toBeLessThanOrEqual(0xffffffff);
    }
  });

  it("distinguishes small input changes", () => {
    expect(hashString("m_1")).not.toBe(hashString("m_2"));
    expect(hashString("ab")).not.toBe(hashString("ba"));
  });
});

describe("deriveBattleSeed", () => {
  it("is deterministic for the same (seed, day, mission)", () => {
    expect(deriveBattleSeed(1234, 5, "m_raid")).toBe(deriveBattleSeed(1234, 5, "m_raid"));
  });

  it("same campaign + same inputs ⇒ same battle stream (ARCHITECTURE §4)", () => {
    const a = mulberry32(deriveBattleSeed(777, 3, "m_raid"));
    const b = mulberry32(deriveBattleSeed(777, 3, "m_raid"));
    const streamA = Array.from({ length: 20 }, () => a.next());
    const streamB = Array.from({ length: 20 }, () => b.next());
    expect(streamA).toEqual(streamB);
  });

  it("varying any input changes the derived seed", () => {
    const base = deriveBattleSeed(777, 3, "m_raid");
    expect(deriveBattleSeed(778, 3, "m_raid")).not.toBe(base);
    expect(deriveBattleSeed(777, 4, "m_raid")).not.toBe(base);
    expect(deriveBattleSeed(777, 3, "m_other")).not.toBe(base);
  });

  it("avoids field-boundary collisions via the separator", () => {
    // Without an unambiguous separator these two would share a concatenation.
    expect(deriveBattleSeed(1, 23, "m_x")).not.toBe(deriveBattleSeed(12, 3, "m_x"));
  });
});
