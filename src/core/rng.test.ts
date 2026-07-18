import { describe, expect, it } from "vitest";
import { mulberry32, type Rng } from "./rng.js";

describe("mulberry32", () => {
  it("is deterministic: same seed ⇒ same stream", () => {
    const a = collect(mulberry32(12345), 100);
    const b = collect(mulberry32(12345), 100);
    expect(a).toEqual(b);
  });

  it("different seeds ⇒ different streams", () => {
    const a = collect(mulberry32(1), 100);
    const b = collect(mulberry32(2), 100);
    expect(a).not.toEqual(b);
  });

  it("next() stays in [0, 1)", () => {
    const rng = mulberry32(0xdecafbad);
    for (let i = 0; i < 10_000; i++) {
      const v = rng.next();
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThan(1);
    }
  });

  it("coerces the seed to uint32, so 0 is a valid seed", () => {
    expect(collect(mulberry32(0), 10)).toEqual(collect(mulberry32(0), 10));
    // Seeds differing only above 32 bits collapse to the same stream.
    expect(collect(mulberry32(7), 10)).toEqual(collect(mulberry32(7 + 2 ** 32), 10));
  });

  describe("int(min, max)", () => {
    it("stays within the inclusive range and covers both ends", () => {
      const rng = mulberry32(99);
      let sawMin = false;
      let sawMax = false;
      for (let i = 0; i < 10_000; i++) {
        const v = rng.int(3, 8);
        expect(Number.isInteger(v)).toBe(true);
        expect(v).toBeGreaterThanOrEqual(3);
        expect(v).toBeLessThanOrEqual(8);
        if (v === 3) sawMin = true;
        if (v === 8) sawMax = true;
      }
      expect(sawMin).toBe(true);
      expect(sawMax).toBe(true);
    });

    it("returns the single value when min === max", () => {
      const rng = mulberry32(1);
      expect(rng.int(5, 5)).toBe(5);
    });

    it("throws when max < min", () => {
      const rng = mulberry32(1);
      expect(() => rng.int(8, 3)).toThrow(RangeError);
    });
  });
});

function collect(rng: Rng, n: number): number[] {
  return Array.from({ length: n }, () => rng.next());
}
