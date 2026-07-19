/**
 * Battle view model (task 4.3, tactics-engine spec §11). Pure functions that
 * turn a tactical `GameState` plus the renderer's transient UI selection into a
 * flat, render-ready `BattleView`, and interpret a tile tap into either a new
 * selection or a `battle*` action.
 *
 * This module implements NO rules (ARCHITECTURE §1): every reachable tile,
 * legal target, and hit% comes from the core guards `reachableTiles`,
 * `visibleTargets`, `hitChance`, and `nextInteractables` — the exact
 * preview===resolution functions the reducer uses (spec §4). The renderer draws
 * what this returns and dispatches what `interpretTap` yields; nothing here
 * touches Pixi, the DOM, or randomness.
 */
import { RuleError } from "../core/errors.js";
import type { BattleAction } from "../core/tactics.js";
import { hitChance, nextInteractables, reachableTiles, visibleTargets } from "../core/tactics.js";
import { HERO_MAX_HP } from "../core/tacticsConstants.js";
import type { ContentBundleT, GameStateT, PosT } from "../data/schemas.js";

type TacticalActiveT = Extract<NonNullable<GameStateT["activeMission"]>, { kind: "tactical" }>;
type BattleStateT = TacticalActiveT["battle"];
type BattleUnitT = BattleStateT["units"][number];
type MapDefT = ContentBundleT["maps"][number];

/** What the selected unit is currently aiming to do. `move` is the default a
 * fresh selection lands in; abilities and interact are chosen from the bar. */
export type Mode = { kind: "move" } | { kind: "ability"; ability: string } | { kind: "interact" };

export interface UnitView {
  id: string;
  side: "player" | "enemy";
  pos: PosT;
  hp: number;
  maxHp: number;
  ap: number;
  name: string;
  alive: boolean;
  selected: boolean;
  /** Hero id for player units (undefined for enemies) — lets the renderer pick
   * the matching hero billboard. */
  hero?: string;
  /** Living player unit that still has AP — drives the §11 "can act" badge,
   * the auto-advance order, and the End-Turn confirmation list. */
  canAct: boolean;
}

/** A legal target with the exact shared hit% (spec §11 labels targets with it). */
export interface TargetView {
  unit: string;
  pos: PosT;
  hitPct: number;
}

export interface ConsoleView {
  id: string;
  pos: PosT;
  isNext: boolean; // the next console the interactSequence expects
  reachableNext: boolean; // isNext AND the selected unit is adjacent with AP
}

export interface AbilityBarItem {
  id: string;
  name: string;
  apCost: number;
  cooldown: number; // remaining turns; 0 = ready
  ready: boolean; // has AP + off cooldown
  targeting: "enemy" | "ally" | "self" | "tile";
  active: boolean; // currently the selected mode
}

export interface BattleView {
  width: number;
  height: number;
  tiles: string[];
  units: UnitView[];
  consoles: ConsoleView[];
  selectedUnit: string | null;
  mode: Mode;
  /** Highlighted move destinations (move mode + a player unit with AP). */
  reachable: PosT[];
  /** Highlighted attack/ability targets (ability mode). */
  targets: TargetView[];
  round: number;
  phase: "player" | "enemy";
  banner: string;
  objective: string;
  log: readonly string[];
  abilities: AbilityBarItem[];
  canInteract: boolean; // selected unit is adjacent to the next console with AP
  canEndTurn: boolean;
}

/** The tap outcome the renderer acts on: change selection, dispatch, or ignore. */
export type TapResult =
  { kind: "select"; unit: string } | { kind: "action"; action: BattleAction } | { kind: "none" };

export interface BattleUi {
  selectedUnit: string | null;
  mode: Mode;
}

function activeTactical(state: GameStateT): TacticalActiveT | null {
  return state.activeMission?.kind === "tactical" ? state.activeMission : null;
}

function mapOf(content: ContentBundleT, battle: BattleStateT): MapDefT | undefined {
  return content.maps.find((m) => m.id === battle.map);
}

function unitName(content: ContentBundleT, u: BattleUnitT): string {
  if (u.side === "player" && u.hero !== undefined) {
    return content.heroes.find((h) => h.id === u.hero)?.name ?? u.hero;
  }
  if (u.unitType !== undefined) {
    return content.unitTypes.find((t) => t.id === u.unitType)?.name ?? u.unitType;
  }
  return u.id;
}

function maxHpOf(content: ContentBundleT, u: BattleUnitT): number {
  if (u.side === "player") return HERO_MAX_HP;
  return content.unitTypes.find((t) => t.id === u.unitType)?.maxHp ?? u.hp;
}

const manhattan = (a: PosT, b: PosT): number => Math.abs(a.x - b.x) + Math.abs(a.y - b.y);

/** Guards throw a RuleError outside a legal context (e.g. a downed unit); the
 * renderer should just show no overlay, so swallow it into an empty result. */
function safe<T>(fn: () => T, fallback: T): T {
  try {
    return fn();
  } catch (err) {
    if (err instanceof RuleError) return fallback;
    throw err;
  }
}

/**
 * Build the render-ready view for the current battle and UI selection. Returns
 * null when no tactical battle is active (the renderer shows nothing).
 */
export function buildBattleView(state: GameStateT, content: ContentBundleT, ui: BattleUi): BattleView | null {
  const active = activeTactical(state);
  if (!active) return null;
  const battle = active.battle;
  const map = mapOf(content, battle);
  if (!map) return null;

  const selectedId = ui.selectedUnit;
  const selected = selectedId ? battle.units.find((u) => u.id === selectedId) : undefined;
  const selectablePlayer = selected && selected.side === "player" && selected.hp > 0 ? selected : undefined;

  const units: UnitView[] = battle.units.map((u) => ({
    id: u.id,
    side: u.side,
    pos: { x: u.pos.x, y: u.pos.y },
    hp: u.hp,
    maxHp: maxHpOf(content, u),
    ap: u.ap,
    name: unitName(content, u),
    alive: u.hp > 0,
    selected: u.id === selectedId,
    hero: u.hero,
    canAct: u.side === "player" && u.hp > 0 && u.ap > 0,
  }));

  // Move overlay: only in move mode, for a living player unit that still has AP.
  const reachable: PosT[] =
    selectablePlayer && ui.mode.kind === "move" && selectablePlayer.ap > 0
      ? safe(() => reachableTiles(state, content, selectablePlayer.id), [])
      : [];

  // Target overlay: only in ability mode, using the shared visibleTargets +
  // hitChance guards so the labels equal what the reducer will roll against.
  const targets: TargetView[] = [];
  if (selectablePlayer && ui.mode.kind === "ability" && selectablePlayer.ap > 0) {
    const abilityId = ui.mode.ability;
    const ids = safe(() => visibleTargets(state, content, selectablePlayer.id, abilityId), []);
    const ability = content.abilities.find((a) => a.id === abilityId);
    for (const id of ids) {
      const t = battle.units.find((u) => u.id === id);
      if (!t) continue;
      const hitPct =
        ability?.targeting === "enemy"
          ? safe(() => hitChance(state, content, selectablePlayer.id, id), 0)
          : 100; // ally abilities always land (spec §7: no roll)
      targets.push({ unit: id, pos: { x: t.pos.x, y: t.pos.y }, hitPct });
    }
  }

  // The next console each interactSequence expects, and whether the selected
  // unit could activate it right now (adjacent + has AP).
  const nextIds = new Set(safe(() => nextInteractables(state, content), []));
  const consoles: ConsoleView[] = map.interactables.map((it) => {
    const isNext = nextIds.has(it.id);
    const reachableNext =
      isNext &&
      selectablePlayer !== undefined &&
      selectablePlayer.ap > 0 &&
      manhattan(selectablePlayer.pos, it.pos) === 1;
    return { id: it.id, pos: { x: it.pos.x, y: it.pos.y }, isNext, reachableNext };
  });
  const canInteract = consoles.some((c) => c.reachableNext);

  const abilities: AbilityBarItem[] = [];
  if (selectablePlayer) {
    const heroDef =
      selectablePlayer.hero !== undefined
        ? content.heroes.find((h) => h.id === selectablePlayer.hero)
        : undefined;
    for (const abId of heroDef?.abilities ?? []) {
      const def = content.abilities.find((a) => a.id === abId);
      if (!def) continue;
      const cd = selectablePlayer.cooldowns[abId] ?? 0;
      abilities.push({
        id: abId,
        name: def.name,
        apCost: def.apCost,
        cooldown: cd,
        ready: selectablePlayer.ap >= def.apCost && cd === 0,
        targeting: def.targeting,
        active: ui.mode.kind === "ability" && ui.mode.ability === abId,
      });
    }
  }

  const enemiesLeft = battle.units.filter((u) => u.side === "enemy" && u.hp > 0).length;
  const objective = describeObjective(map, battle, enemiesLeft);

  return {
    width: map.width,
    height: map.height,
    tiles: map.tiles,
    units,
    consoles,
    selectedUnit: selectedId,
    mode: ui.mode,
    reachable,
    targets,
    round: battle.round,
    phase: battle.activeSide,
    banner: `Round ${battle.round}`,
    objective,
    log: battle.log,
    abilities,
    canInteract,
    canEndTurn: true,
  };
}

function describeObjective(map: MapDefT, battle: BattleStateT, enemiesLeft: number): string {
  const parts: string[] = [];
  for (const o of map.objectives) {
    switch (o.kind) {
      case "interactSequence": {
        const done = Number(battle.objectiveProgress[o.id] ?? 0);
        parts.push(`Consoles ${done}/${o.interactables.length}`);
        break;
      }
      case "eliminateAll":
        parts.push(`Enemies left: ${enemiesLeft}`);
        break;
      case "surviveRounds": {
        const done = Number(battle.objectiveProgress[o.id] ?? 0);
        parts.push(`Survive ${done}/${o.rounds} rounds`);
        break;
      }
      case "reachZone":
        parts.push(battle.objectiveProgress[o.id] === true ? "Zone reached" : "Reach the zone");
        break;
    }
  }
  return parts.join(" · ");
}

/**
 * Living player units that still have AP, in unit-id order (spec §11). These are
 * the units the "can act" badge marks, the round-robin the renderer auto-advances
 * through, and the list the End-Turn confirmation shows. Pure — no rules.
 */
export function actablePlayers(view: BattleView): UnitView[] {
  return view.units.filter((u) => u.canAct).sort((a, b) => (a.id < b.id ? -1 : a.id > b.id ? 1 : 0));
}

/**
 * Interpret a tap at tile (x, y) against the current view. Priority: an active
 * ability/move/interact target commits the action; otherwise a tap on a living
 * player unit selects it; otherwise nothing. Pure — returns the intent, the
 * renderer dispatches it.
 */
export function interpretTap(view: BattleView, x: number, y: number): TapResult {
  const selected = view.selectedUnit;

  if (selected) {
    if (view.mode.kind === "ability") {
      const target = view.targets.find((t) => t.pos.x === x && t.pos.y === y);
      if (target) {
        return {
          kind: "action",
          action: { type: "battleAbility", unit: selected, ability: view.mode.ability, target: target.unit },
        };
      }
    } else if (view.mode.kind === "move") {
      if (view.reachable.some((p) => p.x === x && p.y === y)) {
        return { kind: "action", action: { type: "battleMove", unit: selected, to: { x, y } } };
      }
    } else if (view.mode.kind === "interact") {
      const console = view.consoles.find((c) => c.reachableNext && c.pos.x === x && c.pos.y === y);
      if (console) {
        return {
          kind: "action",
          action: { type: "battleInteract", unit: selected, interactable: console.id },
        };
      }
    }
  }

  const player = view.units.find((u) => u.side === "player" && u.alive && u.pos.x === x && u.pos.y === y);
  if (player) return { kind: "select", unit: player.id };
  return { kind: "none" };
}
