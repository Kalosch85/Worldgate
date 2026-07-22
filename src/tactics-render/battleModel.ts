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
import {
  abilityRangeTiles,
  hitChance,
  nextInteractables,
  reachableTiles,
  threatenedTiles,
  visibleTargets,
} from "../core/tactics.js";
import { HERO_MAX_HP } from "../core/tacticsConstants.js";
import type { ContentBundleT, GameStateT, PosT } from "../data/schemas.js";
import { strings } from "../ui/strings.js";

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
  /** Player-facing name by sequence position: first is "Console A", etc. */
  name: string;
  pos: PosT;
  isNext: boolean; // the next console the interactSequence expects
  reachableNext: boolean; // isNext AND the selected unit is on/adjacent with AP
  /** Why the selected unit can't activate this console right now (§11 feedback),
   * or null when it is eligible / there is nothing to report. */
  blockedReason: string | null;
}

export interface AbilityBarItem {
  id: string;
  name: string;
  apCost: number;
  cooldown: number; // remaining turns; 0 = ready
  ready: boolean; // has AP + off cooldown
  targeting: "enemy" | "ally" | "self" | "tile";
  active: boolean; // currently the selected mode
  /** Why the ability is shown but unusable right now, or null when ready. The
   * bar keeps it visible-but-disabled with this reason (tuning v3 §2). */
  disabledReason: string | null;
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
  /** Tiles inside the selected ability's range + LOS (ability mode) — the §4a
   * coverage overlay, drawn distinctly from movement. Exactly the core guard's
   * output; never recomputed here. */
  abilityRange: PosT[];
  /** Threat zone of the inspected enemy (§4b): every tile it could reach and
   * attack from next turn. Empty unless an enemy is inspected. Exactly the core
   * guard's output. */
  threatZone: PosT[];
  /** The enemy whose threat zone is shown, or null. */
  inspectedEnemy: string | null;
  round: number;
  phase: "player" | "enemy";
  banner: string;
  objective: string;
  log: readonly string[];
  abilities: AbilityBarItem[];
  canInteract: boolean; // selected unit is adjacent to the next console with AP
  canEndTurn: boolean;
}

/** The tap outcome the renderer acts on: change selection, dispatch, surface a
 * feedback message (§11 — a console tap is never a silent no-op), or ignore. */
export type TapResult =
  | { kind: "select"; unit: string }
  | { kind: "action"; action: BattleAction }
  | { kind: "message"; text: string }
  // §4b: toggle the threat-zone overlay for an enemy (or clear it on empty tap).
  | { kind: "inspect"; enemy: string | null }
  | { kind: "none" };

export interface BattleUi {
  selectedUnit: string | null;
  mode: Mode;
  /** Enemy whose threat zone to show (§4b). null / absent = none. */
  inspectedEnemy?: string | null;
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
  // Heroes use the flat hero maxHp; enemies AND player-side allies (spec §1a/§4)
  // take theirs from the UnitTypeDef.
  if (u.side === "player" && u.hero !== undefined) return HERO_MAX_HP;
  return content.unitTypes.find((t) => t.id === u.unitType)?.maxHp ?? u.hp;
}

/** The ability id list a selected player unit fights with: a hero's authored
 * abilities, or — for a UnitTypeDef-blocked ally (spec §4) — the unit type's. */
function abilityIdsFor(content: ContentBundleT, u: BattleUnitT): readonly string[] {
  if (u.hero !== undefined) return content.heroes.find((h) => h.id === u.hero)?.abilities ?? [];
  return content.unitTypes.find((t) => t.id === u.unitType)?.abilities ?? [];
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
  // The ability id is passed to hitChance so its accuracyBonus (§1) is in the
  // previewed number too — preview stays == resolution.
  const targets: TargetView[] = [];
  const abilityRange: PosT[] = [];
  if (selectablePlayer && ui.mode.kind === "ability" && selectablePlayer.ap > 0) {
    const abilityId = ui.mode.ability;
    const ids = safe(() => visibleTargets(state, content, selectablePlayer.id, abilityId), []);
    const ability = content.abilities.find((a) => a.id === abilityId);
    for (const id of ids) {
      const t = battle.units.find((u) => u.id === id);
      if (!t) continue;
      const hitPct =
        ability?.targeting === "enemy"
          ? safe(() => hitChance(state, content, selectablePlayer.id, id, abilityId), 0)
          : 100; // ally abilities always land (spec §7: no roll)
      targets.push({ unit: id, pos: { x: t.pos.x, y: t.pos.y }, hitPct });
    }
    // §4a coverage overlay: the reachable-by-this-ability tiles (range + LOS),
    // straight from the core guard — no second range implementation here.
    abilityRange.push(...safe(() => abilityRangeTiles(state, content, selectablePlayer.id, abilityId), []));
  }

  // §4b threat-zone overlay: an inspected enemy's reach-and-attack tiles, from
  // the core guard. Only for a living enemy; a stale/dead id yields nothing.
  const inspected = ui.inspectedEnemy ?? null;
  const inspectedUnit = inspected ? battle.units.find((u) => u.id === inspected) : undefined;
  const threatZone: PosT[] =
    inspectedUnit && inspectedUnit.side === "enemy" && inspectedUnit.hp > 0
      ? safe(() => threatenedTiles(state, content, inspected!), [])
      : [];

  // Player-facing console names by sequence position ("Console A", "Console B",
  // …) and the id each sequence expects next — both drive §11 tap feedback.
  const nameById = new Map<string, string>();
  const nextIdInSeqOf = new Map<string, string | undefined>(); // console id → its sequence's next id
  for (const o of map.objectives) {
    if (o.kind !== "interactSequence") continue;
    const prog = Number(battle.objectiveProgress[o.id] ?? 0);
    const nextId = o.interactables[prog];
    o.interactables.forEach((id, i) => {
      nameById.set(id, strings.battle.consoleName(String.fromCharCode(65 + i)));
      nextIdInSeqOf.set(id, nextId);
    });
  }
  const consoleName = (id: string): string => nameById.get(id) ?? id;

  // The next console each interactSequence expects, and whether the selected
  // unit could activate it right now (on the tile or adjacent + has AP). When it
  // can't, `blockedReason` states the single reason (§11 feedback).
  const nextIds = new Set(safe(() => nextInteractables(state, content), []));
  const consoles: ConsoleView[] = map.interactables.map((it) => {
    const isNext = nextIds.has(it.id);
    const onOrAdjacent = selectablePlayer !== undefined && manhattan(selectablePlayer.pos, it.pos) <= 1;
    const reachableNext = isNext && selectablePlayer !== undefined && selectablePlayer.ap > 0 && onOrAdjacent;

    let blockedReason: string | null = null;
    if (!reachableNext) {
      if (!selectablePlayer) {
        blockedReason = strings.battle.selectUnitFirst;
      } else if (!isNext) {
        // Part of a sequence but not the one it expects next → wrong order.
        const nextId = nextIdInSeqOf.get(it.id);
        blockedReason = nextId ? strings.battle.activateFirst(consoleName(nextId)) : null;
      } else if (selectablePlayer.ap === 0) {
        blockedReason = strings.battle.noApLeft;
      } else {
        blockedReason = strings.battle.moveCloser;
      }
    }

    return {
      id: it.id,
      name: consoleName(it.id),
      pos: { x: it.pos.x, y: it.pos.y },
      isNext,
      reachableNext,
      blockedReason,
    };
  });
  const canInteract = consoles.some((c) => c.reachableNext);

  const abilities: AbilityBarItem[] = [];
  if (selectablePlayer) {
    for (const abId of abilityIdsFor(content, selectablePlayer)) {
      const def = content.abilities.find((a) => a.id === abId);
      if (!def) continue;
      const cd = selectablePlayer.cooldowns[abId] ?? 0;
      const hasAp = selectablePlayer.ap >= def.apCost;
      const ready = hasAp && cd === 0;
      // The single reason the ability is shown-but-disabled (tuning v3 §2):
      // cooldown takes precedence, then insufficient AP (the "needs N AP — no
      // moving in the same turn" case for the 2-AP Präzisionsschuss).
      const disabledReason = ready
        ? null
        : cd > 0
          ? strings.battle.onCooldown(cd)
          : strings.battle.needsAp(def.apCost);
      abilities.push({
        id: abId,
        name: def.name,
        apCost: def.apCost,
        cooldown: cd,
        ready,
        targeting: def.targeting,
        active: ui.mode.kind === "ability" && ui.mode.ability === abId,
        disabledReason,
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
    abilityRange,
    threatZone,
    inspectedEnemy: inspected,
    round: battle.round,
    phase: battle.activeSide,
    banner: strings.battle.round(battle.round),
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
        parts.push(strings.battle.consoles(done, o.interactables.length));
        break;
      }
      case "eliminateAll":
        parts.push(strings.battle.enemiesLeft(enemiesLeft));
        break;
      case "surviveRounds": {
        const done = Number(battle.objectiveProgress[o.id] ?? 0);
        parts.push(strings.battle.surviveRounds(done, o.rounds));
        break;
      }
      case "reachZone":
        parts.push(
          battle.objectiveProgress[o.id] === true ? strings.battle.zoneReached : strings.battle.reachZone,
        );
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

  // An active ability target commits the shot before anything else.
  if (selected && view.mode.kind === "ability") {
    const target = view.targets.find((t) => t.pos.x === x && t.pos.y === y);
    if (target) {
      return {
        kind: "action",
        action: { type: "battleAbility", unit: selected, ability: view.mode.ability, target: target.unit },
      };
    }
  }

  // A tap on a living enemy toggles its threat-zone inspection (§4b): a fresh
  // enemy shows it, re-tapping the same one clears it. (An enemy that was a
  // valid ability target is already handled above.)
  const enemy = view.units.find((u) => u.side === "enemy" && u.alive && u.pos.x === x && u.pos.y === y);
  if (enemy) {
    return { kind: "inspect", enemy: enemy.id === view.inspectedEnemy ? null : enemy.id };
  }

  // A tap on a console: activate if eligible, otherwise ALWAYS say why (§11 —
  // never a silent no-op). An eligible interact wins even over reselecting the
  // unit standing on the console tile.
  const console = view.consoles.find((c) => c.pos.x === x && c.pos.y === y);
  if (console && console.reachableNext && selected) {
    return { kind: "action", action: { type: "battleInteract", unit: selected, interactable: console.id } };
  }

  // Selecting a *different* living player unit takes priority over console
  // feedback (a unit may be standing on the console tile).
  const player = view.units.find((u) => u.side === "player" && u.alive && u.pos.x === x && u.pos.y === y);
  if (player && player.id !== selected) return { kind: "select", unit: player.id };

  if (console) {
    return { kind: "message", text: console.blockedReason ?? strings.battle.alreadyActive(console.name) };
  }

  if (selected && view.mode.kind === "move") {
    if (view.reachable.some((p) => p.x === x && p.y === y)) {
      return { kind: "action", action: { type: "battleMove", unit: selected, to: { x, y } } };
    }
  }

  if (player) return { kind: "select", unit: player.id };
  // A tap into empty space dismisses any threat-zone overlay (§4b).
  if (view.inspectedEnemy) return { kind: "inspect", enemy: null };
  return { kind: "none" };
}

/**
 * Feedback for pressing the Interact button (§11): activate the eligible next
 * console, else return the single reason the next console can't be used — so the
 * button is a feedback affordance, never a silent disabled no-op.
 */
export function interactButtonTap(view: BattleView): TapResult {
  const eligible = view.consoles.find((c) => c.reachableNext);
  if (eligible && view.selectedUnit) {
    return {
      kind: "action",
      action: { type: "battleInteract", unit: view.selectedUnit, interactable: eligible.id },
    };
  }
  const next = view.consoles.find((c) => c.isNext) ?? view.consoles.find((c) => c.blockedReason);
  if (next?.blockedReason) return { kind: "message", text: next.blockedReason };
  return { kind: "message", text: strings.battle.noConsoleToActivate };
}
