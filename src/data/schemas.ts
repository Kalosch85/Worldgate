/**
 * Worldgate prototype — canonical data schemas (task 0.2).
 *
 * OWNERSHIP: This file is Fable/Opus-tier. Sonnet sessions must NOT modify it.
 * If an implementation task appears to require a schema change, stop and
 * escalate (see ARCHITECTURE.md §12).
 *
 * Def vs State: *Def types describe immutable content (src/data/content/*.json).
 * GameState holds mutable campaign state and references Defs by id.
 */
import { z } from "zod";

// ---------------------------------------------------------------- primitives
export const Id = z.string().min(1);
export type IdT = z.infer<typeof Id>;

export const Pos = z.object({ x: z.number().int().min(0), y: z.number().int().min(0) });
export type PosT = z.infer<typeof Pos>;

export const ResourceId = z.enum(["funds", "materials", "intel", "exotics"]);
export type ResourceIdT = z.infer<typeof ResourceId>;

export const SkillId = z.enum(["combat", "science", "engineering", "diplomacy", "resolve"]);
export type SkillIdT = z.infer<typeof SkillId>;

export const ArchetypeTag = z.enum(["soldier", "scientist", "engineer", "diplomat", "scout"]);
export type ArchetypeTagT = z.infer<typeof ArchetypeTag>;

export const Comparator = z.enum([">=", "<=", ">", "<", "==", "!="]);
export type ComparatorT = z.infer<typeof Comparator>;

const Skills = z.object({
  combat: z.number().int().min(0).max(10),
  science: z.number().int().min(0).max(10),
  engineering: z.number().int().min(0).max(10),
  diplomacy: z.number().int().min(0).max(10),
  resolve: z.number().int().min(0).max(10),
});

const ResourceAmounts = z.object({
  funds: z.number(),
  materials: z.number(),
  intel: z.number(),
  exotics: z.number(),
});

// -------------------------------------------------------------- conditions
// Universal condition vocabulary. Evaluated against (GameState, squad).
// Squad-scoped conditions ("squadHasArchetype", "squadSkillAtLeast") look at
// the squad on the active mission; outside a mission they evaluate false.
export type Condition =
  | { type: "flag"; flag: string; value: boolean }
  | { type: "variable"; variable: string; op: ComparatorT; value: number }
  | { type: "resource"; resource: ResourceIdT; min: number }
  | { type: "techResearched"; tech: string }
  | { type: "squadHasArchetype"; tag: ArchetypeTagT }
  | { type: "squadSkillAtLeast"; skill: SkillIdT; min: number }
  | { type: "all"; conditions: Condition[] }
  | { type: "any"; conditions: Condition[] }
  | { type: "not"; condition: Condition };

export const ConditionSchema: z.ZodType<Condition> = z.lazy(() =>
  z.union([
    z.object({ type: z.literal("flag"), flag: Id, value: z.boolean() }),
    z.object({ type: z.literal("variable"), variable: Id, op: Comparator, value: z.number() }),
    z.object({ type: z.literal("resource"), resource: ResourceId, min: z.number() }),
    z.object({ type: z.literal("techResearched"), tech: Id }),
    z.object({ type: z.literal("squadHasArchetype"), tag: ArchetypeTag }),
    z.object({ type: z.literal("squadSkillAtLeast"), skill: SkillId, min: z.number().int() }),
    z.object({ type: z.literal("all"), conditions: z.array(ConditionSchema) }),
    z.object({ type: z.literal("any"), conditions: z.array(ConditionSchema) }),
    z.object({ type: z.literal("not"), condition: ConditionSchema }),
  ]),
);

// ----------------------------------------------------------------- effects
// Universal effect vocabulary. One interpreter in core applies these for
// techs, event options, event outcomes, and mission rewards.
// Effects apply in array order. Clamping rules (core responsibility):
// resources floor at 0, fatigue clamps to 0..100, variables unclamped.
export const EffectSchema = z.union([
  z.object({ type: z.literal("resource"), resource: ResourceId, delta: z.number() }),
  z.object({ type: z.literal("flag"), flag: Id, value: z.boolean() }),
  z.object({ type: z.literal("variable"), variable: Id, delta: z.number() }),
  z.object({ type: z.literal("modifier"), key: Id, mode: z.enum(["set", "add"]), value: z.number() }),
  z.object({ type: z.literal("fatigue"), scope: z.enum(["squad"]), delta: z.number() }),
  z.object({ type: z.literal("xp"), scope: z.enum(["squad"]), amount: z.number().int().min(0) }),
  z.object({
    type: z.literal("injury"),
    scope: z.enum(["randomSquadMember"]),
    injury: Id, // InjuryDef id
  }),
  z.object({ type: z.literal("queueEvent"), event: Id, delayDays: z.number().int().min(0) }),
  z.object({ type: z.literal("unlockMission"), mission: Id }),
  // Adjusts personnel.total (floor 0). If assignments then exceed the new
  // total, core reduces infirmary → research → logistics until valid
  // (facilities spec §1). Used by facility completion effects.
  z.object({ type: z.literal("personnel"), delta: z.number() }),
  // Arc content (docs/story/arc-veyra.md §8). `addHero` pushes a fresh
  // HeroState for a heroes.json hero not already on the roster; `addPersonnel`
  // raises personnel.total (floor 0).
  z.object({ type: z.literal("addHero"), hero: Id }),
  z.object({ type: z.literal("addPersonnel"), amount: z.number().int() }),
  z.object({ type: z.literal("log"), text: z.string() }), // campaign journal / debrief line
]);
export type Effect = z.infer<typeof EffectSchema>;

// ------------------------------------------------------------ content defs
export const HeroDef = z.object({
  id: Id,
  name: z.string(),
  archetypes: z.array(ArchetypeTag).min(1),
  skills: Skills,
  // Battlefield abilities (tactics-engine spec §1). Defaults to the basic Shot
  // so a hero without an authored list is still combat-capable.
  abilities: z.array(Id).default(["ab_shot"]),
  bio: z.string().optional(),
});
export type HeroDefT = z.infer<typeof HeroDef>;

export const InjuryDef = z.object({
  id: Id,
  name: z.string(),
  daysToHeal: z.number().int().min(1),
  // additive skill penalties while injured, e.g. { combat: -2 }
  skillPenalties: z.partialRecord(SkillId, z.number().int()).optional(),
});

export const TechDef = z.object({
  id: Id,
  name: z.string(),
  description: z.string(),
  cost: z.number().int().min(1), // research points
  prerequisites: z.array(Id).default([]),
  effects: z.array(EffectSchema).default([]), // applied once on completion
});

export const AbilityDef = z.object({
  id: Id,
  name: z.string(),
  apCost: z.number().int().min(1).max(2),
  range: z.number().int().min(1),
  targeting: z.enum(["enemy", "ally", "self", "tile"]),
  // interpretation of `power` per targeting kind is defined in docs/specs/tactics.md
  power: z.number().int().min(0),
  cooldown: z.number().int().min(0).default(0),
});

export const UnitTypeDef = z.object({
  id: Id,
  name: z.string(),
  maxHp: z.number().int().min(1),
  aim: z.number().int().min(0).max(100),
  mobility: z.number().int().min(1), // tiles per move action
  damage: z.object({ min: z.number().int().min(0), max: z.number().int().min(0) }),
  abilities: z.array(Id).default([]),
});

// Tile legend for TacticalMap.tiles (one string per row):
//   "." floor   "#" wall (blocks movement + LOS)
//   "-" low cover (half)   "+" high cover (full)
export const TacticalMapDef = z.object({
  id: Id,
  name: z.string(),
  width: z.number().int().min(4),
  height: z.number().int().min(4),
  tiles: z.array(z.string()),
  squadSpawns: z.array(Pos).min(1),
  enemyGroups: z.array(z.object({ id: Id, unitType: Id, positions: z.array(Pos).min(1) })),
  interactables: z.array(z.object({ id: Id, pos: Pos, kind: z.enum(["console"]) })).default([]),
  objectives: z
    .array(
      z.union([
        z.object({ id: Id, kind: z.literal("eliminateAll") }),
        z.object({ id: Id, kind: z.literal("interactSequence"), interactables: z.array(Id).min(1) }),
        z.object({ id: Id, kind: z.literal("surviveRounds"), rounds: z.number().int().min(1) }),
        z.object({ id: Id, kind: z.literal("reachZone"), zone: z.array(Pos).min(1) }),
      ]),
    )
    .min(1),
});

// ---------------------------------------------------------- event scripts
// Deterministic node graph (D-5). Branch-and-bottleneck (D-6): divergence is
// carried by flags/variables, paths reconverge at authored nodes/outcomes.
// Option eligibility is always computed by the engine; whether ineligible
// options are rendered is a UI concern (settings.showLockedOptions, D-1).
export const EventOption = z.object({
  id: Id,
  text: z.string(),
  requirements: z.array(ConditionSchema).default([]),
  effects: z.array(EffectSchema).default([]),
  next: z.union([
    z.object({ kind: z.literal("node"), node: Id }),
    z.object({ kind: z.literal("end"), outcome: Id }),
  ]),
});

export const EventNode = z.object({
  id: Id,
  speaker: z.string().optional(),
  text: z.string(),
  options: z.array(EventOption).min(1),
});

export const EventOutcome = z.object({
  id: Id,
  label: z.string(),
  effects: z.array(EffectSchema).default([]),
});

export const EventScriptDef = z.object({
  id: Id,
  title: z.string(),
  entryNode: Id,
  nodes: z.array(EventNode).min(1),
  outcomes: z.array(EventOutcome).min(1),
});

// --------------------------------------------------------------- missions
export const MissionDef = z.object({
  id: Id,
  name: z.string(),
  description: z.string(),
  availability: z.array(ConditionSchema).default([]),
  squad: z.object({ min: z.number().int().min(1), max: z.number().int().min(1) }),
  payload: z.union([
    z.object({ kind: z.literal("tactical"), map: Id }),
    z.object({ kind: z.literal("narrative"), eventScript: Id }),
  ]),
  // Tactical only; narrative outcomes carry their own effects.
  victoryEffects: z.array(EffectSchema).default([]),
  defeatEffects: z.array(EffectSchema).default([]),
});

// ------------------------------------------------------------- facilities
// Base construction (facilities spec §1). A facility costs funds+materials,
// takes buildDays to complete, may gate on Conditions (prerequisites), and
// applies its Effect[] once on completion — the same universal vocabulary as
// techs. One build at a time; no upkeep in v1.
export const FacilityDef = z.object({
  id: Id,
  name: z.string(),
  description: z.string(),
  cost: z.object({ funds: z.number().int().min(0), materials: z.number().int().min(0) }),
  buildDays: z.number().int().min(1),
  prerequisites: z.array(ConditionSchema).default([]),
  effects: z.array(EffectSchema).default([]),
});
export type FacilityDefT = z.infer<typeof FacilityDef>;

// The full content directory, validated as one bundle in CI.
export const ContentBundle = z.object({
  heroes: z.array(HeroDef),
  injuries: z.array(InjuryDef),
  techs: z.array(TechDef),
  abilities: z.array(AbilityDef),
  unitTypes: z.array(UnitTypeDef),
  maps: z.array(TacticalMapDef),
  events: z.array(EventScriptDef),
  missions: z.array(MissionDef),
  facilities: z.array(FacilityDef),
});
export type ContentBundleT = z.infer<typeof ContentBundle>;

// -------------------------------------------------------------- game state
export const HeroState = z.object({
  hero: Id, // HeroDef id
  xp: z.number().int().min(0),
  level: z.number().int().min(1),
  fatigue: z.number().min(0).max(100),
  injuries: z.array(z.object({ injury: Id, daysRemaining: z.number().int().min(0) })),
  // permanent level-up bonuses, additive to HeroDef.skills
  skillBonuses: z.partialRecord(SkillId, z.number().int()).default({}),
});

export const BattleUnit = z.object({
  id: Id,
  side: z.enum(["player", "enemy"]),
  hero: Id.optional(), // player units
  unitType: Id.optional(), // enemy units
  pos: Pos,
  hp: z.number().int().min(0),
  ap: z.number().int().min(0).max(2),
  cooldowns: z.record(Id, z.number().int()).default({}),
});

export const BattleState = z.object({
  map: Id,
  seed: z.number().int(), // derived: hash(campaign.seed, day, missionId)
  round: z.number().int().min(1),
  activeSide: z.enum(["player", "enemy"]), // side-based turns, XCOM style
  units: z.array(BattleUnit),
  // objective id -> progress (bool for binary, number for counters)
  objectiveProgress: z.record(Id, z.union([z.boolean(), z.number()])),
  log: z.array(z.string()),
});

export const GameState = z.object({
  version: z.literal(1), // save-format version; prototype policy: bump = new campaign
  campaign: z.object({ day: z.number().int().min(1), seed: z.number().int() }),
  settings: z.object({ showLockedOptions: z.boolean() }), // D-1: default false
  resources: ResourceAmounts,
  variables: z.record(Id, z.number()), // must contain "support"; numeric stance tracks
  flags: z.record(Id, z.boolean()),
  journal: z.array(z.object({ day: z.number().int().min(1), text: z.string() })), // campaign log (task 1.1)
  modifiers: z.record(Id, z.number()), // tech/system modifiers, e.g. incomeMult
  heroes: z.array(HeroState),
  personnel: z.object({
    total: z.number().int().min(0),
    assignments: z.object({
      logistics: z.number().int().min(0), // drives income
      research: z.number().int().min(0), // drives research points/day
      infirmary: z.number().int().min(0), // drives healing/fatigue recovery
    }),
  }),
  research: z.object({
    current: z.object({ tech: Id, progress: z.number().min(0) }).nullable(),
    completed: z.array(Id),
  }),
  // Base construction (facilities spec §1). One facility builds at a time;
  // `built` accumulates completed facility ids. Initial: { current: null, built: [] }.
  construction: z.object({
    current: z.object({ facility: Id, daysRemaining: z.number().int().min(0) }).nullable(),
    built: z.array(Id),
  }),
  missions: z.object({
    available: z.array(Id),
    completed: z.array(z.object({ mission: Id, outcome: Id.optional(), day: z.number().int() })),
    queuedEvents: z.array(z.object({ event: Id, fireOnDay: z.number().int() })),
  }),
  activeMission: z
    .union([
      // `mission` optional: queue-fired incidents have no MissionDef wrapper.
      // `gatedSeen` powers the debrief hint (narrative-engine spec §1, §6).
      z.object({
        kind: z.literal("narrative"),
        mission: Id.optional(),
        script: Id,
        node: Id,
        squad: z.array(Id),
        gatedSeen: z.boolean(),
      }),
      z.object({ kind: z.literal("tactical"), mission: Id, squad: z.array(Id), battle: BattleState }),
    ])
    .nullable(),
});
export type GameStateT = z.infer<typeof GameState>;
