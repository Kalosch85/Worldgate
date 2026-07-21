/**
 * Tactical battle engine (docs/specs/tactics-engine.md, ARCHITECTURE §7).
 *
 * Headless, pure sim logic (task 4.2). The renderer (task 4.3) is a separate
 * layer that only reads BattleState and replays `log`; nothing here touches the
 * DOM, Pixi, or React, and all randomness flows through the derived battle
 * stream (never Math.random). This module owns:
 *   - `createBattleState`: battle initialization (§3), called by launchMission.
 *   - the guards `reachableTiles` / `visibleTargets` / `hitChance` (§4) — the
 *     preview functions the UI shows ARE the resolution functions (§7).
 *   - `applyBattleAction`: the four battle actions (§4–§8) plus the enemy phase
 *     (§10) and battle → strategic resolution (§9).
 *
 * Determinism (§7): the battle rng is a single stream seeded by
 * hash(campaign.seed, day, missionId). BattleState stores no cursor, so the
 * stream position is reconstructed each reducer call by counting the rolls
 * already recorded in `log` (every line beginning "roll: " is exactly one
 * draw). This is what keeps the golden battle test stable across the many
 * reducer calls a battle spans.
 */
import type { ContentBundleT, GameStateT, PosT } from "../data/schemas.js";
import { applyEffects } from "./effects.js";
import { RuleError } from "./errors.js";
import { deriveBattleSeed } from "./hash.js";
import { evalCondition } from "./narrative.js";
import type { ReducerCtx } from "./reducer.js";
import { mulberry32, type Rng } from "./rng.js";
import { effectiveSkills } from "./roster.js";
import {
  ABILITY_ENDS_AP,
  AI_ATTACK_BASE,
  AI_ATTACK_HIT_WEIGHT,
  AI_LETHAL_BONUS,
  AI_MOVE_APPROACH_WEIGHT,
  AI_MOVE_COVER_WEIGHT,
  AI_MOVE_HIT_WEIGHT,
  AI_PASS_SCORE,
  AP_PER_TURN,
  COVER_BONUS_HIGH,
  COVER_BONUS_LOW,
  COVER_BONUS_NONE,
  HERO_AIM_BASE,
  HERO_AIM_PER_COMBAT,
  HERO_DMG_MAX,
  HERO_DMG_MIN,
  HERO_MAX_HP,
  HERO_MOBILITY,
  HIT_MAX,
  HIT_MIN,
  INTERACT_AP_COST,
  MOVE_AP_COST,
  RANGE_PENALTY_PER_TILE,
} from "./tacticsConstants.js";

// ------------------------------------------------------------------- types
type TacticalActiveT = Extract<NonNullable<GameStateT["activeMission"]>, { kind: "tactical" }>;
type BattleStateT = TacticalActiveT["battle"];
type BattleUnitT = BattleStateT["units"][number];
type MapDefT = ContentBundleT["maps"][number];
type AbilityDefT = ContentBundleT["abilities"][number];
type MissionDefT = ContentBundleT["missions"][number];

/** The four tactical actions (§4). Dispatched through the reducer. */
export type BattleAction =
  | { type: "battleMove"; unit: string; to: { x: number; y: number } }
  | { type: "battleAbility"; unit: string; ability: string; target: string | { x: number; y: number } }
  | { type: "battleInteract"; unit: string; interactable: string }
  | { type: "battleEndTurn" };

/** Battlefield stats a unit fights with (§2). Derived, never stored. */
interface UnitStats {
  maxHp: number;
  aim: number;
  mobility: number;
  dmgMin: number;
  dmgMax: number;
  abilities: readonly string[];
}

// --------------------------------------------------------------- map helpers
const DIRS: ReadonlyArray<readonly [number, number]> = [
  [1, 0],
  [-1, 0],
  [0, 1],
  [0, -1],
];

function tileAt(map: MapDefT, x: number, y: number): string {
  if (x < 0 || y < 0 || x >= map.width || y >= map.height) return "#";
  return map.tiles[y]?.[x] ?? "#";
}

function coverBonusAt(map: MapDefT, x: number, y: number): number {
  const t = tileAt(map, x, y);
  if (t === "-") return COVER_BONUS_LOW;
  if (t === "+") return COVER_BONUS_HIGH;
  return COVER_BONUS_NONE;
}

/** §6: only "#" and "+" block line of sight; "-" and floor never do. */
function blocksLos(t: string): boolean {
  return t === "#" || t === "+";
}

function manhattan(a: PosT, b: PosT): number {
  return Math.abs(a.x - b.x) + Math.abs(a.y - b.y);
}

function tileIndex(map: MapDefT, p: PosT): number {
  return p.y * map.width + p.x;
}

function clampInt(min: number, max: number, v: number): number {
  return Math.min(max, Math.max(min, v));
}

const posKey = (p: PosT): string => `${p.x},${p.y}`;
function parseKey(k: string): PosT {
  const [x, y] = k.split(",").map(Number);
  return { x: x ?? 0, y: y ?? 0 };
}

/**
 * §6: LOS by Bresenham between tile centers. Only intervening "#"/"+" tiles
 * block — the two endpoints never do, so a unit standing on high cover is
 * targetable (at its cover bonus).
 */
function hasLos(map: MapDefT, a: PosT, b: PosT): boolean {
  let x = a.x;
  let y = a.y;
  const dx = Math.abs(b.x - a.x);
  const dy = Math.abs(b.y - a.y);
  const sx = a.x < b.x ? 1 : -1;
  const sy = a.y < b.y ? 1 : -1;
  let err = dx - dy;
  for (;;) {
    const isEndpoint = (x === a.x && y === a.y) || (x === b.x && y === b.y);
    if (!isEndpoint && blocksLos(tileAt(map, x, y))) return false;
    if (x === b.x && y === b.y) break;
    const e2 = 2 * err;
    if (e2 > -dy) {
      err -= dy;
      x += sx;
    }
    if (e2 < dx) {
      err += dx;
      y += sy;
    }
  }
  return true;
}

// -------------------------------------------------------------- state access
function tacticalBattle(state: GameStateT): { active: TacticalActiveT; battle: BattleStateT } {
  const am = state.activeMission;
  if (am === null || am.kind !== "tactical") {
    throw new RuleError("battle/no_active_battle", "No tactical battle is active.");
  }
  return { active: am, battle: am.battle };
}

function mapOf(content: ContentBundleT, battle: BattleStateT): MapDefT {
  const map = content.maps.find((m) => m.id === battle.map);
  if (!map) throw new Error(`tactics: unknown map '${battle.map}'`);
  return map;
}

function unitById(battle: BattleStateT, id: string): BattleUnitT | undefined {
  return battle.units.find((u) => u.id === id);
}

function statsOf(state: GameStateT, content: ContentBundleT, unit: BattleUnitT): UnitStats {
  // A player-side unit is either a hero (hero id) or an allied combatant blocked
  // out by a UnitTypeDef (veyra-kaempfe spec §1a/§4 — e.g. Seryn). Only the hero
  // branch derives from campaign HeroState; the ally falls through to the shared
  // UnitTypeDef lookup below, exactly like an enemy.
  if (unit.side === "player" && unit.hero !== undefined) {
    const heroId = unit.hero;
    const heroState = state.heroes.find((h) => h.hero === heroId);
    const def = content.heroes.find((h) => h.id === heroId);
    if (!heroState || !def) throw new Error(`tactics: unknown hero '${heroId}'`);
    const effCombat = effectiveSkills(heroState, def, content.injuries).combat;
    return {
      maxHp: HERO_MAX_HP,
      aim: HERO_AIM_BASE + HERO_AIM_PER_COMBAT * effCombat,
      mobility: HERO_MOBILITY,
      dmgMin: HERO_DMG_MIN,
      dmgMax: HERO_DMG_MAX,
      abilities: def.abilities,
    };
  }
  const utId = unit.unitType;
  const ut = content.unitTypes.find((u) => u.id === utId);
  if (!ut) throw new Error(`tactics: unknown unitType '${utId}'`);
  return {
    maxHp: ut.maxHp,
    aim: ut.aim,
    mobility: ut.mobility,
    dmgMin: ut.damage.min,
    dmgMax: ut.damage.max,
    abilities: ut.abilities,
  };
}

// ------------------------------------------------------------- §6 movement
/**
 * BFS reachable set (§6): orthogonal steps, never entering "#" or a tile held
 * by another living unit, at most `mobility` tiles. Excludes the unit's own
 * tile. Returns key→distance so callers can enumerate destinations.
 */
function reachSet(battle: BattleStateT, map: MapDefT, unitId: string, mobility: number): Map<string, number> {
  const self = unitById(battle, unitId);
  if (!self) return new Map();
  const blocked = new Set(battle.units.filter((u) => u.id !== unitId && u.hp > 0).map((u) => posKey(u.pos)));
  const dist = new Map<string, number>([[posKey(self.pos), 0]]);
  const queue: PosT[] = [self.pos];
  while (queue.length > 0) {
    const cur = queue.shift()!;
    const d = dist.get(posKey(cur))!;
    if (d >= mobility) continue;
    for (const [dx, dy] of DIRS) {
      const nx = cur.x + dx;
      const ny = cur.y + dy;
      const nk = `${nx},${ny}`;
      if (nx < 0 || ny < 0 || nx >= map.width || ny >= map.height) continue;
      if (tileAt(map, nx, ny) === "#") continue;
      if (blocked.has(nk)) continue;
      if (dist.has(nk)) continue;
      dist.set(nk, d + 1);
      queue.push({ x: nx, y: ny });
    }
  }
  dist.delete(posKey(self.pos));
  return dist;
}

/** Guard (§4): every tile `unitId` can move to this action. */
export function reachableTiles(state: GameStateT, content: ContentBundleT, unitId: string): PosT[] {
  const { battle } = tacticalBattle(state);
  const map = mapOf(content, battle);
  const u = unitById(battle, unitId);
  if (!u) throw new RuleError("battle/unknown_unit", `Unknown unit '${unitId}'.`);
  const mob = statsOf(state, content, u).mobility;
  return [...reachSet(battle, map, unitId, mob).keys()].map(parseKey);
}

// --------------------------------------------------------------- §7 combat
function hitChanceFromPos(
  state: GameStateT,
  content: ContentBundleT,
  map: MapDefT,
  attacker: BattleUnitT,
  fromPos: PosT,
  target: BattleUnitT,
): number {
  const aim = statsOf(state, content, attacker).aim;
  const cover = coverBonusAt(map, target.pos.x, target.pos.y);
  const dist = Math.abs(fromPos.x - target.pos.x) + Math.abs(fromPos.y - target.pos.y);
  return clampInt(HIT_MIN, HIT_MAX, aim - cover - RANGE_PENALTY_PER_TILE * dist);
}

function hitChanceInternal(
  state: GameStateT,
  content: ContentBundleT,
  map: MapDefT,
  attacker: BattleUnitT,
  target: BattleUnitT,
): number {
  return hitChanceFromPos(state, content, map, attacker, attacker.pos, target);
}

/**
 * Guard (§4, §7): the exact hit% the UI previews. This IS the number the
 * resolver rolls against — there is no second implementation.
 */
export function hitChance(
  state: GameStateT,
  content: ContentBundleT,
  attackerId: string,
  targetId: string,
): number {
  const { battle } = tacticalBattle(state);
  const map = mapOf(content, battle);
  const a = unitById(battle, attackerId);
  const t = unitById(battle, targetId);
  if (!a || !t) throw new RuleError("battle/unknown_unit", "Unknown attacker or target.");
  return hitChanceInternal(state, content, map, a, t);
}

/** Legal targets for `abilityId` from `unitId` (§4, §6). Attacks need LOS and
 * range; ally abilities need range only. */
export function visibleTargets(
  state: GameStateT,
  content: ContentBundleT,
  unitId: string,
  abilityId: string,
): string[] {
  const { battle } = tacticalBattle(state);
  const map = mapOf(content, battle);
  const u = unitById(battle, unitId);
  const ab = content.abilities.find((a) => a.id === abilityId);
  if (!u || !ab) return [];
  const out: string[] = [];
  for (const v of battle.units) {
    if (v.hp <= 0) continue;
    if (ab.targeting === "enemy") {
      if (v.side === u.side) continue;
      if (manhattan(u.pos, v.pos) > ab.range) continue;
      if (!hasLos(map, u.pos, v.pos)) continue;
      out.push(v.id);
    } else if (ab.targeting === "ally") {
      if (v.side !== u.side || v.id === u.id) continue;
      if (manhattan(u.pos, v.pos) > ab.range) continue;
      out.push(v.id);
    }
  }
  return out;
}

// ------------------------------------------------------------ §8 objectives
/** The next interactable each incomplete interactSequence objective expects
 * (§8 — "guard exposes which is next"). */
export function nextInteractables(state: GameStateT, content: ContentBundleT): string[] {
  const { battle } = tacticalBattle(state);
  const map = mapOf(content, battle);
  const out: string[] = [];
  for (const o of map.objectives) {
    if (o.kind !== "interactSequence") continue;
    const prog = Number(battle.objectiveProgress[o.id] ?? 0);
    const next = o.interactables[prog];
    if (next !== undefined) out.push(next);
  }
  return out;
}

function objectiveComplete(obj: MapDefT["objectives"][number], battle: BattleStateT): boolean {
  const prog = battle.objectiveProgress[obj.id];
  switch (obj.kind) {
    case "eliminateAll":
      return battle.units.filter((u) => u.side === "enemy").every((u) => u.hp === 0);
    case "interactSequence":
      return Number(prog ?? 0) >= obj.interactables.length;
    case "surviveRounds":
      return Number(prog ?? 0) >= obj.rounds;
    case "reachZone":
      return prog === true;
  }
}

/** §8: victory when every objective is complete; defeat when the whole squad is
 * downed. Victory is checked first (a squad that just won is by definition not
 * all-downed). */
function battleOutcome(battle: BattleStateT, map: MapDefT): "victory" | "defeat" | null {
  if (map.objectives.every((o) => objectiveComplete(o, battle))) return "victory";
  const players = battle.units.filter((u) => u.side === "player");
  if (players.length > 0 && players.every((p) => p.hp === 0)) return "defeat";
  return null;
}

function updateReachZone(battle: BattleStateT, map: MapDefT): void {
  for (const o of map.objectives) {
    if (o.kind !== "reachZone") continue;
    if (battle.objectiveProgress[o.id] === true) continue;
    // Veyra-kaempfe spec §6 (sanctioned semantics): a reachZone is complete when
    // ALL living (non-downed) player units — squad heroes and any allies — stand
    // in the zone. The latch requires at least one living player, so it can never
    // fire on a wiped squad (which is a defeat, checked separately).
    const livingPlayers = battle.units.filter((u) => u.side === "player" && u.hp > 0);
    const inZone = (u: BattleUnitT): boolean => o.zone.some((z) => z.x === u.pos.x && z.y === u.pos.y);
    if (livingPlayers.length > 0 && livingPlayers.every(inZone)) {
      battle.objectiveProgress[o.id] = true;
    }
  }
}

// ------------------------------------------------------------- battle rng
/** Reconstruct the battle stream: mulberry32(seed) advanced past every roll
 * already logged (one "roll: " line == one draw, in strict order). */
function battleRngFor(battle: BattleStateT): Rng {
  const priorDraws = battle.log.reduce((n, line) => n + (line.startsWith("roll: ") ? 1 : 0), 0);
  const rng = mulberry32(battle.seed);
  for (let i = 0; i < priorDraws; i++) rng.next();
  return rng;
}

// -------------------------------------------------------------- resolution
/**
 * Resolve one attack on the battle stream in the strict §7 draw order: hit roll
 * (1–100, hit if ≤ hit%), then — only on a hit — a damage roll. Every roll is
 * logged with the "roll: " prefix so the stream position stays reconstructable.
 */
function resolveAttack(
  state: GameStateT,
  content: ContentBundleT,
  map: MapDefT,
  battle: BattleStateT,
  rng: Rng,
  attacker: BattleUnitT,
  target: BattleUnitT,
  ab: AbilityDefT,
): void {
  const chance = hitChanceInternal(state, content, map, attacker, target);
  const hitRoll = rng.int(1, 100);
  const hit = hitRoll <= chance;
  battle.log.push(`roll: ${attacker.id}->${target.id} hit ${hitRoll}/${chance} ${hit ? "HIT" : "MISS"}`);
  if (!hit) return;
  const stats = statsOf(state, content, attacker);
  const dmgRoll = rng.int(stats.dmgMin, stats.dmgMax);
  const bonus = ab.power - 1;
  const total = dmgRoll + bonus;
  const maxHp = statsOf(state, content, target).maxHp;
  target.hp = Math.max(0, target.hp - total);
  battle.log.push(
    `roll: ${target.id} dmg ${dmgRoll}${bonus > 0 ? `+${bonus}` : ""}=${total} (hp ${target.hp}/${maxHp})`,
  );
  if (target.hp === 0) battle.log.push(`${target.id} is down`);
}

function requirePlayerActable(u: BattleUnitT | undefined, unitId: string): asserts u is BattleUnitT {
  if (!u) throw new RuleError("battle/unknown_unit", `Unknown unit '${unitId}'.`);
  if (u.side !== "player") throw new RuleError("battle/not_player", `Unit '${unitId}' is not a player unit.`);
  if (u.hp <= 0) throw new RuleError("battle/downed", `Unit '${unitId}' is down and cannot act.`);
}

// ------------------------------------------------------------ player actions
function doMove(
  state: GameStateT,
  content: ContentBundleT,
  battle: BattleStateT,
  map: MapDefT,
  action: Extract<BattleAction, { type: "battleMove" }>,
): void {
  const u = unitById(battle, action.unit);
  requirePlayerActable(u, action.unit);
  if (u.ap < MOVE_AP_COST) throw new RuleError("battle/no_ap", `Unit '${u.id}' has no AP to move.`);
  const mob = statsOf(state, content, u).mobility;
  const reach = reachSet(battle, map, u.id, mob);
  if (!reach.has(posKey(action.to))) {
    throw new RuleError("battle/unreachable", `(${action.to.x},${action.to.y}) is not reachable.`);
  }
  u.pos = { x: action.to.x, y: action.to.y };
  u.ap -= MOVE_AP_COST;
  battle.log.push(`${u.id} moves to (${u.pos.x},${u.pos.y})`);
  updateReachZone(battle, map);
}

function doAbility(
  state: GameStateT,
  content: ContentBundleT,
  battle: BattleStateT,
  map: MapDefT,
  rng: Rng,
  action: Extract<BattleAction, { type: "battleAbility" }>,
): void {
  const u = unitById(battle, action.unit);
  requirePlayerActable(u, action.unit);
  const stats = statsOf(state, content, u);
  if (!stats.abilities.includes(action.ability)) {
    throw new RuleError("battle/unknown_ability", `Unit '${u.id}' cannot use '${action.ability}'.`);
  }
  const ab = content.abilities.find((a) => a.id === action.ability);
  if (!ab) throw new Error(`tactics: unknown ability '${action.ability}'`);
  if (u.ap < ab.apCost) throw new RuleError("battle/no_ap", `Unit '${u.id}' lacks AP for '${ab.id}'.`);
  if ((u.cooldowns[ab.id] ?? 0) > 0) {
    throw new RuleError("battle/on_cooldown", `'${ab.id}' is on cooldown for '${u.id}'.`);
  }

  if (ab.targeting === "enemy") {
    if (typeof action.target !== "string")
      throw new RuleError("battle/bad_target", "Attack needs a unit target.");
    const t = unitById(battle, action.target);
    if (!t || t.side === u.side || t.hp <= 0) {
      throw new RuleError("battle/bad_target", `Invalid attack target '${String(action.target)}'.`);
    }
    if (manhattan(u.pos, t.pos) > ab.range)
      throw new RuleError("battle/out_of_range", "Target out of range.");
    if (!hasLos(map, u.pos, t.pos)) throw new RuleError("battle/no_los", "No line of sight to target.");
    resolveAttack(state, content, map, battle, rng, u, t, ab);
  } else if (ab.targeting === "ally") {
    if (typeof action.target !== "string")
      throw new RuleError("battle/bad_target", "Ability needs a unit target.");
    const t = unitById(battle, action.target);
    if (!t || t.side !== u.side || t.id === u.id || t.hp <= 0) {
      throw new RuleError("battle/bad_target", `Invalid ally target '${String(action.target)}'.`);
    }
    if (manhattan(u.pos, t.pos) > ab.range) throw new RuleError("battle/out_of_range", "Ally out of range.");
    const tmax = statsOf(state, content, t).maxHp;
    const newHp = Math.min(tmax, t.hp + ab.power);
    const healed = newHp - t.hp;
    t.hp = newHp;
    battle.log.push(`${u.id} patches ${t.id} +${healed} (hp ${t.hp}/${tmax})`);
  } else {
    throw new RuleError("battle/unsupported", `Targeting '${ab.targeting}' is not supported in v1.`);
  }

  // §5: using any ability ends the unit's activation, and arms the cooldown.
  u.ap = ABILITY_ENDS_AP;
  u.cooldowns[ab.id] = ab.cooldown;
}

function doInteract(
  battle: BattleStateT,
  map: MapDefT,
  action: Extract<BattleAction, { type: "battleInteract" }>,
): void {
  const u = unitById(battle, action.unit);
  requirePlayerActable(u, action.unit);
  if (u.ap < INTERACT_AP_COST) throw new RuleError("battle/no_ap", `Unit '${u.id}' has no AP to interact.`);
  const it = map.interactables.find((i) => i.id === action.interactable);
  if (!it)
    throw new RuleError("battle/unknown_interactable", `Unknown interactable '${action.interactable}'.`);
  // §8 (Fable amendment): eligible when standing on the interactable's own tile
  // OR orthogonally adjacent to it (Manhattan ≤ 1).
  if (manhattan(u.pos, it.pos) > 1) {
    throw new RuleError("battle/too_far", `'${u.id}' is too far from '${it.id}'.`);
  }

  // §8: an interact only lands if it is the next in a sequence's order.
  let advanced = false;
  let partOfSequence = false;
  for (const obj of map.objectives) {
    if (obj.kind !== "interactSequence") continue;
    if (obj.interactables.includes(it.id)) partOfSequence = true;
    const prog = Number(battle.objectiveProgress[obj.id] ?? 0);
    if (obj.interactables[prog] === it.id) {
      battle.objectiveProgress[obj.id] = prog + 1;
      advanced = true;
      break;
    }
  }
  if (!advanced) {
    if (partOfSequence) {
      throw new RuleError("battle/interact_out_of_order", `'${it.id}' is not the next console in sequence.`);
    }
    throw new RuleError("battle/interact_no_objective", `'${it.id}' is not part of any objective.`);
  }

  // §5: interact costs 1 AP but does NOT end the activation.
  u.ap -= INTERACT_AP_COST;
  battle.log.push(`${u.id} activates ${it.id}`);
}

// ----------------------------------------------------------------- §10 AI
type EnemyChoice =
  { kind: "attack"; ability: string; target: string } | { kind: "move"; to: PosT } | { kind: "pass" };

function minDistToPlayers(pos: PosT, players: readonly BattleUnitT[]): number {
  let best = Infinity;
  for (const p of players) best = Math.min(best, manhattan(pos, p.pos));
  return best;
}

/** Best hit% this unit could reach against any player from `from` (§10 move
 * scoring term). 0 when nothing is in range/LOS. */
function bestHitFromTile(
  state: GameStateT,
  content: ContentBundleT,
  map: MapDefT,
  unit: BattleUnitT,
  from: PosT,
  players: readonly BattleUnitT[],
): number {
  const stats = statsOf(state, content, unit);
  let maxRange = 0;
  for (const abId of stats.abilities) {
    const ab = content.abilities.find((a) => a.id === abId);
    if (ab && ab.targeting === "enemy") maxRange = Math.max(maxRange, ab.range);
  }
  if (maxRange === 0) return 0;
  let best = 0;
  for (const p of players) {
    if (manhattan(from, p.pos) > maxRange) continue;
    if (!hasLos(map, from, p.pos)) continue;
    best = Math.max(best, hitChanceFromPos(state, content, map, unit, from, p));
  }
  return best;
}

/**
 * §10 utility scoring. Enumerate every attack and every reachable move,
 * score each, and pick the best; ties go to attacks over moves, then to the
 * lowest board index (y × width + x). A real action must beat the pass floor.
 * Deterministic: scoring reads no rng.
 */
function chooseEnemyAction(
  state: GameStateT,
  content: ContentBundleT,
  map: MapDefT,
  battle: BattleStateT,
  e: BattleUnitT,
): EnemyChoice {
  const stats = statsOf(state, content, e);
  const players = battle.units.filter((u) => u.side === "player" && u.hp > 0);
  if (players.length === 0) return { kind: "pass" };

  type Cand =
    | { type: "attack"; score: number; tie: number; ability: string; target: string }
    | { type: "move"; score: number; tie: number; to: PosT };
  const cands: Cand[] = [];

  // Attacks.
  for (const abId of stats.abilities) {
    const ab = content.abilities.find((a) => a.id === abId);
    if (!ab || ab.targeting !== "enemy") continue;
    if (e.ap < ab.apCost) continue;
    if ((e.cooldowns[ab.id] ?? 0) > 0) continue;
    for (const p of players) {
      if (manhattan(e.pos, p.pos) > ab.range) continue;
      if (!hasLos(map, e.pos, p.pos)) continue;
      const hit = hitChanceInternal(state, content, map, e, p);
      const lethal = p.hp <= stats.dmgMax + ab.power - 1 ? AI_LETHAL_BONUS : 0;
      const score = AI_ATTACK_BASE + AI_ATTACK_HIT_WEIGHT * hit + lethal;
      cands.push({ type: "attack", score, tie: tileIndex(map, p.pos), ability: ab.id, target: p.id });
    }
  }

  // Moves.
  if (e.ap >= MOVE_AP_COST) {
    const reach = reachSet(battle, map, e.id, stats.mobility);
    const distNow = minDistToPlayers(e.pos, players);
    for (const k of reach.keys()) {
      const to = parseKey(k);
      const distTile = minDistToPlayers(to, players);
      const cover = coverBonusAt(map, to.x, to.y);
      const bestHit = bestHitFromTile(state, content, map, e, to, players);
      const score =
        AI_MOVE_COVER_WEIGHT * cover +
        AI_MOVE_APPROACH_WEIGHT * (distNow - distTile) +
        AI_MOVE_HIT_WEIGHT * bestHit;
      cands.push({ type: "move", score, tie: tileIndex(map, to), to });
    }
  }

  if (cands.length === 0) return { kind: "pass" };
  cands.sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score;
    if (a.type !== b.type) return a.type === "attack" ? -1 : 1;
    return a.tie - b.tie;
  });
  const best = cands[0]!;
  if (best.score <= AI_PASS_SCORE) return { kind: "pass" };
  return best.type === "attack"
    ? { kind: "attack", ability: best.ability, target: best.target }
    : { kind: "move", to: best.to };
}

function decrementCooldowns(u: BattleUnitT): void {
  for (const k of Object.keys(u.cooldowns)) {
    u.cooldowns[k] = Math.max(0, (u.cooldowns[k] ?? 0) - 1);
  }
}

/**
 * §5 battleEndTurn: run the whole enemy phase in-reducer, then advance the
 * round and hand back to the player. Enemies act in ascending unit-id order,
 * each repeating while it has AP (§10). All rolls go on the battle stream so
 * the renderer can replay the phase from the log.
 */
function doEndTurn(
  state: GameStateT,
  content: ContentBundleT,
  battle: BattleStateT,
  map: MapDefT,
  rng: Rng,
): void {
  battle.log.push(`-- enemy phase (round ${battle.round}) --`);
  for (const e of battle.units) {
    if (e.side !== "enemy" || e.hp <= 0) continue;
    e.ap = AP_PER_TURN;
    decrementCooldowns(e);
  }

  const enemies = battle.units
    .filter((u) => u.side === "enemy")
    .sort((a, b) => (a.id < b.id ? -1 : a.id > b.id ? 1 : 0));
  for (const e of enemies) {
    while (e.hp > 0 && e.ap > 0) {
      if (!battle.units.some((u) => u.side === "player" && u.hp > 0)) return; // squad wiped
      const choice = chooseEnemyAction(state, content, map, battle, e);
      if (choice.kind === "pass") break;
      if (choice.kind === "attack") {
        const ab = content.abilities.find((a) => a.id === choice.ability)!;
        const target = unitById(battle, choice.target)!;
        resolveAttack(state, content, map, battle, rng, e, target, ab);
        e.ap = ABILITY_ENDS_AP;
        e.cooldowns[ab.id] = ab.cooldown;
      } else {
        e.pos = choice.to;
        e.ap -= MOVE_AP_COST;
        battle.log.push(`${e.id} moves to (${e.pos.x},${e.pos.y})`);
      }
    }
  }

  battle.round += 1;
  for (const o of map.objectives) {
    if (o.kind === "surviveRounds") {
      battle.objectiveProgress[o.id] = Number(battle.objectiveProgress[o.id] ?? 0) + 1;
    }
  }
  battle.log.push(`-- round ${battle.round} --`);

  // §5 player phase start: refresh AP and tick down player cooldowns.
  for (const p of battle.units) {
    if (p.side !== "player" || p.hp <= 0) continue;
    p.ap = AP_PER_TURN;
    decrementCooldowns(p);
  }
}

// ------------------------------------------------------ §9 strategic resolve
/**
 * Battle → strategic resolution (§9). Downed heroes take inj_wounded (D-3: not
 * dead); the mission's victory/defeat effects apply with the launched squad as
 * context; the mission is recorded and activeMission cleared. Pure: mutates the
 * private clone it was handed, then threads through applyEffects.
 */
function resolveBattle(draft: GameStateT, ctx: ReducerCtx, outcome: "victory" | "defeat"): GameStateT {
  const { active, battle } = tacticalBattle(draft);
  const missionId = active.mission;
  const squad = active.squad;
  const def = ctx.content.missions.find((m) => m.id === missionId);
  if (!def) throw new Error(`resolveBattle: unknown mission '${missionId}'`);
  const day = draft.campaign.day;

  const woundDef = ctx.content.injuries.find((i) => i.id === "inj_wounded");
  if (!woundDef) throw new Error("resolveBattle: content is missing injury 'inj_wounded'");
  for (const u of battle.units) {
    if (u.side !== "player" || u.hp !== 0 || u.hero === undefined) continue;
    const hs = draft.heroes.find((h) => h.hero === u.hero);
    if (!hs) continue;
    hs.injuries.push({ injury: woundDef.id, daysRemaining: woundDef.daysToHeal });
    const hd = ctx.content.heroes.find((h) => h.id === u.hero);
    draft.journal.push({ day, text: `${hd?.name ?? u.hero} wurde im Einsatz verwundet.` });
  }

  const effects = outcome === "victory" ? def.victoryEffects : def.defeatEffects;
  const next = applyEffects(draft, effects, ctx, squad);

  // Veyra-kaempfe spec §2: a `retryOnDefeat` mission stays on the available list
  // after a loss so it can be re-attempted; defeatEffects still apply and the
  // attempt is recorded. Every other outcome removes the mission as usual.
  const keepAvailable = outcome === "defeat" && def.retryOnDefeat === true;
  if (!keepAvailable) {
    next.missions.available = next.missions.available.filter((id) => id !== missionId);
  }
  next.missions.completed.push({ mission: missionId, outcome, day });
  // The stored `outcome` stays an English identifier ("victory"/"defeat", read
  // by save/load and tests); only the player-visible journal line is localized.
  const outcomeLabel = outcome === "victory" ? "Sieg" : "Niederlage";
  next.journal.push({ day, text: `${def.name}: ${outcomeLabel}` });
  next.activeMission = null;
  return next;
}

// ------------------------------------------------------------------- §3 init
/**
 * Build the initial BattleState (§3). Called by launchMission after the
 * narrative-spec validations and the materials cost. Heroes take squadSpawns in
 * squad order (validate-content guarantees enough spawns); enemies come from the
 * map's enemyGroups. Pure — reads the campaign seed/day but no rng.
 */
export function createBattleState(
  state: GameStateT,
  content: ContentBundleT,
  def: MissionDefT,
  squad: readonly string[],
): BattleStateT {
  if (def.payload.kind !== "tactical") throw new Error(`createBattleState: '${def.id}' is not tactical`);
  const map = content.maps.find((m) => m.id === (def.payload as { map: string }).map);
  if (!map) throw new Error(`createBattleState: unknown map '${(def.payload as { map: string }).map}'`);

  const seed = deriveBattleSeed(state.campaign.seed, state.campaign.day, def.id);
  const units: BattleUnitT[] = [];

  squad.forEach((heroId, i) => {
    const spawn = map.squadSpawns[i];
    if (!spawn) throw new Error(`createBattleState: map '${map.id}' has no spawn for squad slot ${i}`);
    units.push({
      id: `u_${heroId}`,
      side: "player",
      hero: heroId,
      pos: { x: spawn.x, y: spawn.y },
      hp: HERO_MAX_HP,
      ap: AP_PER_TURN,
      cooldowns: {},
    });
  });

  for (const g of map.enemyGroups) {
    const ut = content.unitTypes.find((u) => u.id === g.unitType);
    if (!ut) throw new Error(`createBattleState: unknown unitType '${g.unitType}'`);
    g.positions.forEach((pos, n) => {
      units.push({
        id: `u_${g.id}_${n}`,
        side: "enemy",
        unitType: g.unitType,
        pos: { x: pos.x, y: pos.y },
        hp: ut.maxHp,
        ap: AP_PER_TURN,
        cooldowns: {},
      });
    });
  }

  // Veyra-kaempfe spec §1a/§4: player-side allies whose conditions pass at
  // battle init (empty ⇒ always). Player-controlled like heroes, but stat-blocked
  // by a UnitTypeDef; evaluated against (state, squad). Skipped for maps that
  // declare none (map_relay et al.), so existing battles are unchanged.
  map.allyUnits.forEach((ally, n) => {
    if (!ally.conditions.every((cond) => evalCondition(state, content, squad, cond))) return;
    const ut = content.unitTypes.find((u) => u.id === ally.unitType);
    if (!ut) throw new Error(`createBattleState: unknown allyUnit unitType '${ally.unitType}'`);
    units.push({
      id: `u_ally_${ally.unitType}_${n}`,
      side: "player",
      unitType: ally.unitType,
      pos: { x: ally.pos.x, y: ally.pos.y },
      hp: ut.maxHp,
      ap: AP_PER_TURN,
      cooldowns: {},
    });
  });

  const objectiveProgress: Record<string, boolean | number> = {};
  for (const o of map.objectives) {
    objectiveProgress[o.id] = o.kind === "reachZone" ? false : o.kind === "eliminateAll" ? false : 0;
  }

  return { map: map.id, seed, round: 1, activeSide: "player", units, objectiveProgress, log: [] };
}

// --------------------------------------------------------------- reducer entry
/**
 * Apply one battle action (§4). Validates a tactical battle is active, mutates a
 * private clone, then — per §8 — checks the outcome after the state change and
 * resolves to the strategic layer (§9) on victory or defeat. Pure.
 */
export function applyBattleAction(state: GameStateT, action: BattleAction, ctx: ReducerCtx): GameStateT {
  tacticalBattle(state); // validate context before cloning
  const draft = structuredClone(state);
  const { battle } = tacticalBattle(draft);
  const map = mapOf(ctx.content, battle);
  const rng = battleRngFor(battle);

  switch (action.type) {
    case "battleMove":
      doMove(draft, ctx.content, battle, map, action);
      break;
    case "battleAbility":
      doAbility(draft, ctx.content, battle, map, rng, action);
      break;
    case "battleInteract":
      doInteract(battle, map, action);
      break;
    case "battleEndTurn":
      doEndTurn(draft, ctx.content, battle, map, rng);
      break;
    default: {
      const _exhaustive: never = action;
      throw new Error(`applyBattleAction: unhandled ${JSON.stringify(_exhaustive)}`);
    }
  }

  const outcome = battleOutcome(battle, map);
  if (outcome) return resolveBattle(draft, ctx, outcome);
  return draft;
}
