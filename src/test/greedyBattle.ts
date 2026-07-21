/**
 * Test-only greedy battle driver (docs/specs/veyra-kaempfe.md §8 verification).
 *
 * A small goal-seeking planner that drives the REAL tactics reducer (`apply`)
 * through a whole battle, so a "scripted victory" in a test is genuine play
 * against the live enemy AI rather than a hand-tuned action list. Lives under
 * src/test (not src/core) so the sim core stays free of test scaffolding.
 */
import { apply, type Action, type ReducerCtx } from "../core/reducer.js";
import { hitChance, nextInteractables, reachableTiles, visibleTargets } from "../core/tactics.js";
import type { ContentBundleT, GameStateT, PosT } from "../data/schemas.js";

type Tactical = Extract<NonNullable<GameStateT["activeMission"]>, { kind: "tactical" }>;
type MapDef = ContentBundleT["maps"][number];
type Unit = Tactical["battle"]["units"][number];

const key = (p: PosT): string => `${p.x},${p.y}`;
const manhattan = (a: PosT, b: PosT): number => Math.abs(a.x - b.x) + Math.abs(a.y - b.y);
const coverAt = (map: MapDef, p: PosT): number => {
  const t = map.tiles[p.y]?.[p.x] ?? "#";
  return t === "+" ? 40 : t === "-" ? 20 : 0;
};

export function battleOf(s: GameStateT): Tactical["battle"] {
  if (s.activeMission?.kind !== "tactical") throw new Error("no tactical battle");
  return s.activeMission.battle;
}

/** Multi-source BFS distance field from every `goal` over walkable tiles. */
function distField(map: MapDef, goals: PosT[]): Map<string, number> {
  const dist = new Map<string, number>(goals.map((g) => [key(g), 0]));
  const q: PosT[] = [...goals];
  const dirs = [
    [1, 0],
    [-1, 0],
    [0, 1],
    [0, -1],
  ] as const;
  while (q.length) {
    const cur = q.shift()!;
    const d = dist.get(key(cur))!;
    for (const [dx, dy] of dirs) {
      const nx = cur.x + dx;
      const ny = cur.y + dy;
      if (nx < 0 || ny < 0 || nx >= map.width || ny >= map.height) continue;
      if ((map.tiles[ny]?.[nx] ?? "#") === "#") continue;
      const k = `${nx},${ny}`;
      if (dist.has(k)) continue;
      dist.set(k, d + 1);
      q.push({ x: nx, y: ny });
    }
  }
  return dist;
}

function attackAbility(content: ContentBundleT, unit: Unit): string | null {
  const list =
    unit.hero !== undefined
      ? (content.heroes.find((h) => h.id === unit.hero)?.abilities ?? [])
      : (content.unitTypes.find((u) => u.id === unit.unitType)?.abilities ?? []);
  for (const abId of list) {
    if (content.abilities.find((a) => a.id === abId)?.targeting === "enemy") return abId;
  }
  return null;
}

/** One greedy player action, or null to end the phase. Consoles: advance onto
 * cover, then activate. Zone: thin drones in range first, then close — every
 * unit must physically reach the zone. Pinned units shoot the softest target. */
export function chooseAction(state: GameStateT, content: ContentBundleT): Action | null {
  const battle = battleOf(state);
  const map = content.maps.find((m) => m.id === battle.map)!;
  const players = battle.units
    .filter((u) => u.side === "player" && u.hp > 0 && u.ap > 0)
    .sort((a, b) => (a.id < b.id ? -1 : 1));
  if (players.length === 0) return null;

  const seqNext = nextInteractables(state, content);
  for (const u of players) {
    for (const nid of seqNext) {
      const it = map.interactables.find((i) => i.id === nid);
      if (it && manhattan(u.pos, it.pos) <= 1) {
        return { type: "battleInteract", unit: u.id, interactable: nid };
      }
    }
  }

  const zoneObj = map.objectives.find((o) => o.kind === "reachZone");
  const forZone = zoneObj !== undefined;
  const enemiesLeft = battle.units.some((e) => e.side === "enemy" && e.hp > 0);
  for (const u of players) {
    let goals: PosT[] = [];
    if (seqNext.length > 0) {
      goals = [map.interactables.find((i) => i.id === seqNext[0])!.pos];
    } else if (zoneObj && zoneObj.kind === "reachZone") {
      goals = [...zoneObj.zone];
    }
    if (goals.length === 0) continue;
    const ab = attackAbility(content, u);
    const targets = ab ? visibleTargets(state, content, u.id, ab) : [];
    const shoot = (): Action | null => {
      if (!ab || targets.length === 0) return null;
      const best = [...targets]
        .map((id) => battle.units.find((t) => t.id === id)!)
        .sort(
          (a, b) =>
            a.hp - b.hp || hitChance(state, content, u.id, b.id) - hitChance(state, content, u.id, a.id),
        )[0]!;
      return { type: "battleAbility", unit: u.id, ability: ab, target: best.id };
    };
    const move = (): Action | null => {
      const field = distField(map, goals);
      const curD = field.get(key(u.pos)) ?? Infinity;
      let best: PosT | null = null;
      let bestD = curD;
      let bestCover = -1;
      for (const t of reachableTiles(state, content, u.id)) {
        const d = field.get(key(t)) ?? Infinity;
        if (d >= curD) continue;
        const c = forZone ? 0 : coverAt(map, t);
        if (d < bestD || (d === bestD && c > bestCover)) {
          bestD = d;
          bestCover = c;
          best = t;
        }
      }
      return best ? { type: "battleMove", unit: u.id, to: best } : null;
    };

    if (forZone && enemiesLeft) {
      return shoot() ?? move() ?? null;
    }
    const m = move() ?? shoot();
    if (m) return m;
  }
  return null;
}

/** Drive a live battle to resolution (or a passive loss). Returns the resolved
 * state and the outcome from the completed log. */
export function playBattle(
  state: GameStateT,
  content: ContentBundleT,
  ctx: ReducerCtx,
  opts: { passive?: boolean; maxRounds?: number } = {},
): { state: GameStateT; outcome: "victory" | "defeat" } {
  let s = state;
  const cap = opts.maxRounds ?? 40;
  let guard = 0;
  while (s.activeMission?.kind === "tactical") {
    if (guard++ > cap * 40) throw new Error("battle did not resolve (planner stalled)");
    if (battleOf(s).round > cap) throw new Error(`battle exceeded ${cap} rounds`);
    const action = opts.passive ? null : chooseAction(s, content);
    s = apply(s, action ?? { type: "battleEndTurn" }, ctx);
  }
  const last = s.missions.completed[s.missions.completed.length - 1];
  return { state: s, outcome: last?.outcome === "defeat" ? "defeat" : "victory" };
}
