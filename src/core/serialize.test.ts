import { describe, expect, it } from "vitest";
import { GameState, type GameStateT } from "../data/schemas.js";
import { deserialize, serialize } from "./serialize.js";
import { mulberry32, type Rng } from "./rng.js";

/**
 * Property test (ARCHITECTURE §9): for every generated GameState,
 * deserialize(serialize(state)) deep-equals the original.
 *
 * The generator is driven by mulberry32 — the same seeded PRNG this task
 * ships — so the suite is exhaustive-ish yet fully reproducible: a failure at
 * iteration N reproduces from the same seed every run. Every field is always
 * populated (including those with schema `.default()`s such as `skillBonuses`
 * and `cooldowns`) so equality is exact rather than default-filled.
 */
describe("GameState serialize/deserialize round-trip", () => {
  it("round-trips 300 generated states exactly", () => {
    for (let seed = 0; seed < 300; seed++) {
      const state = genGameState(mulberry32(seed));
      const restored = deserialize(serialize(state));
      expect(restored).toEqual(state);
    }
  });

  it("round-trips each activeMission shape (null / narrative / tactical)", () => {
    for (const kind of ["none", "narrative", "tactical"] as const) {
      const state = genGameState(mulberry32(kind.length + 1), kind);
      expect(deserialize(serialize(state))).toEqual(state);
    }
  });

  it("rejects malformed JSON", () => {
    expect(() => deserialize("{not json")).toThrow();
  });

  it("rejects a structurally invalid save (wrong version)", () => {
    // Version 1 is the pre-D-9 format — stale saves must be rejected loudly
    // (bump = new campaign).
    const bad = { ...genGameState(mulberry32(1)), version: 1 };
    expect(() => deserialize(JSON.stringify(bad))).toThrow();
  });
});

// --------------------------------------------------------------- generators

type ActiveKind = "none" | "narrative" | "tactical";

function genGameState(rng: Rng, activeKind?: ActiveKind): GameStateT {
  const kind = activeKind ?? pick(rng, ["none", "narrative", "tactical"] as const);
  const state: GameStateT = {
    version: 2,
    campaign: { day: rng.int(1, 5000), seed: rng.int(-2_000_000, 2_000_000) },
    settings: {
      showLockedOptions: bool(rng),
      textAnimation: pick(rng, ["on", "fast", "off"] as const),
    },
    resources: {
      funds: num(rng),
      materials: num(rng),
      intel: num(rng),
      exotics: num(rng),
    },
    variables: { support: num(rng), ...numberRecord(rng, "var") },
    flags: boolRecord(rng, "flag"),
    journal: list(rng, 0, 4, () => ({ day: rng.int(1, 5000), text: `entry ${rng.int(0, 999)}` })),
    modifiers: numberRecord(rng, "mod"),
    heroes: list(rng, 0, 3, () => genHeroState(rng)),
    personnel: {
      total: rng.int(0, 50),
      assignments: {
        logistics: rng.int(0, 20),
        research: rng.int(0, 20),
        infirmary: rng.int(0, 20),
      },
    },
    research: {
      current: bool(rng) ? { tech: id(rng, "t"), progress: nonNeg(rng) } : null,
      completed: list(rng, 0, 4, () => id(rng, "t")),
    },
    construction: {
      current: bool(rng) ? { facility: id(rng, "fac"), daysRemaining: rng.int(0, 10) } : null,
      built: list(rng, 0, 4, () => id(rng, "fac")),
    },
    missions: {
      available: list(rng, 0, 4, () => id(rng, "m")),
      completed: list(rng, 0, 3, () => {
        const c: { mission: string; outcome?: string; day: number } = {
          mission: id(rng, "m"),
          day: rng.int(1, 5000),
        };
        if (bool(rng)) c.outcome = id(rng, "out");
        return c;
      }),
      queuedEvents: list(rng, 0, 3, () => ({ event: id(rng, "ev"), fireOnDay: rng.int(1, 5000) })),
    },
    // Deployment: null, or a running operation with a locked squad (spec §1c).
    deployment: bool(rng) ? { operation: id(rng, "op"), squad: list(rng, 1, 4, () => id(rng, "h")) } : null,
    activeMission: genActiveMission(rng, kind),
  };
  return state;
}

function genHeroState(rng: Rng): GameStateT["heroes"][number] {
  return {
    hero: id(rng, "h"),
    xp: rng.int(0, 100_000),
    level: rng.int(1, 20),
    fatigue: rng.int(0, 10_000) / 100, // 0..100 with decimals
    injuries: list(rng, 0, 3, () => ({ injury: id(rng, "inj"), daysRemaining: rng.int(0, 30) })),
    skillBonuses: partialSkillRecord(rng),
  };
}

function genActiveMission(rng: Rng, kind: ActiveKind): GameStateT["activeMission"] {
  if (kind === "none") return null;
  if (kind === "narrative") {
    // `mission` is optional (queue-fired incidents omit it); `gatedSeen`
    // powers the debrief hint (narrative-engine spec §1). Cover both variants.
    const narrative: NonNullable<GameStateT["activeMission"]> & { kind: "narrative" } = {
      kind: "narrative",
      script: id(rng, "ev"),
      node: id(rng, "n"),
      squad: list(rng, 1, 4, () => id(rng, "h")),
      gatedSeen: bool(rng),
    };
    if (bool(rng)) narrative.mission = id(rng, "m");
    return narrative;
  }
  return {
    kind: "tactical",
    mission: id(rng, "m"),
    squad: list(rng, 1, 4, () => id(rng, "h")),
    battle: {
      map: id(rng, "map"),
      seed: rng.int(-2_000_000, 2_000_000),
      round: rng.int(1, 30),
      activeSide: pick(rng, ["player", "enemy"] as const),
      units: list(rng, 1, 5, () => genBattleUnit(rng)),
      objectiveProgress: objectiveProgress(rng),
      log: list(rng, 0, 4, () => `line ${rng.int(0, 999)}`),
    },
  };
}

function genBattleUnit(rng: Rng): {
  id: string;
  side: "player" | "enemy";
  hero?: string;
  unitType?: string;
  pos: { x: number; y: number };
  hp: number;
  ap: number;
  cooldowns: Record<string, number>;
} {
  const side = pick(rng, ["player", "enemy"] as const);
  const unit: ReturnType<typeof genBattleUnit> = {
    id: id(rng, "u"),
    side,
    pos: { x: rng.int(0, 11), y: rng.int(0, 9) },
    hp: rng.int(0, 20),
    ap: rng.int(0, 2),
    cooldowns: cooldowns(rng),
  };
  if (side === "player") unit.hero = id(rng, "h");
  else unit.unitType = id(rng, "ut");
  return unit;
}

// ------------------------------------------------------------------ helpers

const SKILLS = ["combat", "science", "engineering", "diplomacy", "resolve"] as const;

function bool(rng: Rng): boolean {
  return rng.next() < 0.5;
}

/** Any finite number, with decimals, that round-trips exactly through JSON. */
function num(rng: Rng): number {
  return rng.int(-1_000_000, 1_000_000) / 100;
}

function nonNeg(rng: Rng): number {
  return rng.int(0, 1_000_000) / 100;
}

function id(rng: Rng, prefix: string): string {
  return `${prefix}_${rng.int(0, 9999)}`;
}

function pick<T>(rng: Rng, options: readonly T[]): T {
  return options[rng.int(0, options.length - 1)]!;
}

function list<T>(rng: Rng, min: number, max: number, make: () => T): T[] {
  return Array.from({ length: rng.int(min, max) }, make);
}

function numberRecord(rng: Rng, prefix: string): Record<string, number> {
  const out: Record<string, number> = {};
  for (let i = 0, n = rng.int(0, 3); i < n; i++) out[id(rng, prefix)] = num(rng);
  return out;
}

function boolRecord(rng: Rng, prefix: string): Record<string, boolean> {
  const out: Record<string, boolean> = {};
  for (let i = 0, n = rng.int(0, 3); i < n; i++) out[id(rng, prefix)] = bool(rng);
  return out;
}

function cooldowns(rng: Rng): Record<string, number> {
  const out: Record<string, number> = {};
  for (let i = 0, n = rng.int(0, 2); i < n; i++) out[id(rng, "ab")] = rng.int(0, 5);
  return out;
}

function objectiveProgress(rng: Rng): Record<string, boolean | number> {
  const out: Record<string, boolean | number> = {};
  for (let i = 0, n = rng.int(1, 3); i < n; i++) {
    out[id(rng, "obj")] = bool(rng) ? bool(rng) : rng.int(0, 5);
  }
  return out;
}

function partialSkillRecord(rng: Rng): Partial<Record<(typeof SKILLS)[number], number>> {
  const out: Partial<Record<(typeof SKILLS)[number], number>> = {};
  for (const skill of SKILLS) {
    if (bool(rng)) out[skill] = rng.int(-3, 3);
  }
  return out;
}

// Sanity check the generator against the schema itself, so a malformed
// generator fails loudly here rather than masking a serialize bug.
describe("generator sanity", () => {
  it("produces schema-valid states", () => {
    for (let seed = 0; seed < 20; seed++) {
      expect(() => GameState.parse(genGameState(mulberry32(seed)))).not.toThrow();
    }
  });
});
