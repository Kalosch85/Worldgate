# Spec: Tactical Engine (Phase 4) — v1.0, Fable-authored

Binding for tasks 4.2 (core + AI, Opus), 4.3 (renderer, Sonnet), 4.4 (content).
Shapes live in schemas.ts; this defines semantics and all numbers. Constants
marked (T) are tunable in task 6.3 and must live in one `tacticsConstants.ts`.

## 1. Sanctioned schema & content changes (Fable authorization)

- `HeroDef` gains `abilities: z.array(Id).default(["ab_shot"])`.
- Content: h_mercer `["ab_shot"]`; h_okafor `["ab_shot", "ab_patch"]`.
- validate-content: new check — every map's `squadSpawns.length ≥` the max
  squad of every tactical mission referencing it.
No other schema edits are authorized.

## 2. Derived hero battle stats

maxHp = 5 (T, flat) · aim = 55 + 5 × effectiveCombat (T) · mobility = 4 (T) ·
damage 1–2 (T). Enemies use UnitTypeDef values directly. Effective skills per
economy spec §7 (so fatigue and injuries reduce battlefield performance).

## 3. Battle initialization (replaces tactical_not_implemented in launchMission)

After the §3 narrative-spec validations and materials cost: build BattleState —
`seed = hash(campaign.seed, day, missionId)` (0.3 hash util); squad heroes on
`squadSpawns` in squad order (unit id `u_<heroId>`); enemies per `enemyGroups`
(id `u_<groupId>_<n>`); all units ap 2, hp = max; round 1, activeSide player;
objectiveProgress initialized (interactSequence: 0, surviveRounds: 0,
reachZone: false); empty log. Set activeMission tactical.

## 4. Actions

```ts
| { type: "battleMove"; unit: string; to: { x: number; y: number } }
| { type: "battleAbility"; unit: string; ability: string; target: string | { x: number; y: number } }
| { type: "battleInteract"; unit: string; interactable: string }
| { type: "battleEndTurn" }
```

Guards exported for UI: `reachableTiles(unit)`, `visibleTargets(unit,
ability)`, `hitChance(attacker, target)` — the preview function IS the
resolution function; never two implementations.

## 5. Turn structure

- Player phase start: all player units ap = 2; player cooldowns −1 (floor 0).
- Player acts in any unit order. **Move**: 1 AP. **Ability**: listed apCost,
  and using any ability sets that unit's ap to 0 (ends its activation — the
  XCOM "shoot ends turn" essence without special-case rules). **Interact**:
  1 AP, does not end activation.
- `battleEndTurn`: resolves the entire enemy phase in-reducer (enemy AP
  refresh, enemy cooldowns −1, AI runs §10, all deterministic given
  state + battle rng stream), then round += 1, surviveRounds progress += 1,
  back to player phase start. Renderer replays enemy actions from the log.
- **Unspent AP is legal (Fable addendum).** Ending the player phase while
  player units still have AP is an intentional, supported play — a future
  reaction system depends on the player being able to hold AP through the
  enemy phase. `battleEndTurn` must never hard-block on remaining AP; the
  reducer resolves identically whether or not AP was spent. The renderer may
  *warn* (§11 confirmation) but the core imposes no gate.

## 6. Movement & LOS

- Orthogonal 4-directional only (v1 non-goal: diagonals). Path via BFS; may
  not enter "#" or occupied tiles; cover tiles are walkable; max `mobility`
  tiles per move action.
- Range/distance = Manhattan. LOS = Bresenham between tile centers; blocked
  by intervening "#" and "+" tiles only — the target's own tile never blocks
  (so a unit on high cover can be shot, at its cover bonus).
- No fog of war in v1: map fully visible; LOS gates shooting only.

## 7. Combat resolution & RNG draw order

`hit% = clamp(5, 95, attackerAim − coverBonus(target tile) − 2 × manhattanDist)`
coverBonus: "-" = 20, "+" = 40, else 0. (T)

Strict draw order on the battle stream, also for AI-initiated attacks:
1. hit roll: integer 1–100, hit if ≤ hit%.
2. if hit: damage roll uniform [dmgMin, dmgMax], total = roll + (ability
   power − 1). Subtract from target hp (floor 0). Log every roll.
Never draw a roll that isn't consumed; never reorder. This is what keeps the
golden battle test stable.

ab_patch (targeting ally, range 1): restores `power` hp up to max, no rolls.
Cooldown: after use, `cooldowns[ability] = cooldown`; usable at 0/absent.

## 8. Interactables & objectives

Interact requires orthogonal adjacency and 1 AP. interactSequence must follow
the listed order; out-of-order attempts are RuleError (guard exposes which is
next). Objective completion checked after every state change: **victory**
when all map objectives complete; **defeat** when all player units are at
0 hp.

## 9. Battle end → strategic resolution

- Downed heroes (hp 0) are not dead (D-3): each gains `inj_wounded` at full
  daysToHeal, journal entry per hero.
- Victory: apply MissionDef.victoryEffects (squad context = launched squad,
  including downed — simplicity over punishment, revisit in 6.3). Defeat:
  defeatEffects likewise.
- Remove mission from available; append `{ mission, outcome:
  "victory" | "defeat", day }` to completed; journal entry; clear
  activeMission. UI shows a summary screen (results, per-hero hp/injuries,
  effect list) before returning to base.

## 10. Enemy AI v0 (deterministic utility scoring)

Per enemy unit in ascending unit-id order, repeat while ap > 0: enumerate
candidates —
- each attack on a visible in-range player unit with an available ability:
  score = 40 + 0.4 × hit% + (target hp ≤ dmgMax + power − 1 ? 25 : 0)
- each move to a tile reachable this action:
  score = 0.3 × coverBonus(tile) + 2 × (distToNearestPlayer(now) −
  distToNearestPlayer(tile)) + 0.2 × bestHit%FromTile
- pass: score = 5
Pick highest; ties: attacks before moves, then lowest target/tile index
(y × width + x). All constants (T). Determinism test required: same state +
seed twice ⇒ identical action sequence.

## 11. Renderer (task 4.3, Sonnet)

PixiJS canvas: tap unit → reachable-tile overlay + targets labeled with exact
hit% from the shared function; tap-to-confirm; ability bar with AP/cooldown
state; hp pips; turn/round banner; scrolling log; enemy phase replayed with
~300ms per action. Landscape-friendly, touch targets ≥ 44px.

**Art pass (addendum).** The 4.3 renderer shipped with colored shapes only; an
art pass since then wires sprites/textures without changing any rules or layout:

- Board tiles (floor / `#` wall / `-` low cover / `+` high cover) draw top-down
  textures from `public/assets/tiles/` (nearest-neighbour), each with a
  flat-colour fallback until its texture loads, and a faint grid overlay on top.
- Units draw billboards (`public/assets/units/`): the matching hero sprite for
  each player (by hero id), the insect for enemies — loaded async with a
  colored-shape fallback.
- The ability bar shows per-ability icons (`public/assets/abilities/`) beside
  their labels.

Consoles and the hp/AP indicators stay colored shapes. Assets are sliced from the `art-src/` source sheets by
`scripts/slice-art.py`; sheets with no true alpha are keyed to transparency at
slice time, while the top-down tile pack already carries real alpha.

**Activation flow & unspent-AP confirmation (Fable addendum).**

- **AP badge.** Every living player unit that still has AP shows a visible
  "can act" badge on the board (marks its remaining AP). The badge is a pure
  function of the unit's state (`side === "player"`, `hp > 0`, `ap > 0`);
  suppress it during the enemy-phase replay.
- **Auto-advance.** When a unit's activation ends — an ability was used (sets
  ap 0, §5) or its AP is otherwise exhausted — the renderer auto-selects the
  next living player unit that still has AP, in unit-id order (round-robin,
  wrapping). On battle entry it selects the first such unit. When no player
  unit has AP left, it keeps the current unit selected (nothing to advance to).
- **Board pan & zoom.** The Pixi canvas fills the board area and owns its own
  camera: the map is centered when it fits, and the player can **pinch-zoom**
  (two-finger spread/pinch) and **two-finger pan** to move around a board
  larger than the viewport. Zoom-out is bounded to the whole-map fit and
  zoom-in to a fixed cap; panning is edge-clamped so the board can't drift
  off-screen (this replaces the old DOM scroll, which clipped the outer
  rows/columns). A single-finger tap still selects/acts; the tap→tile mapping
  runs through the live camera transform so it stays correct at any zoom/pan.
  The camera math is pure and unit-tested (`viewport.ts`); the Pixi layer only
  wires pointer events to it.
- **End-Turn confirmation.** The End-Turn button is *always enabled* (§5:
  unspent AP is legal). But if any living player unit (`hp > 0`) still has AP,
  pressing it first shows a confirmation that lists those units — e.g.
  "2 units can still act — end turn anyway?" — with cancel / confirm. When no
  unit has AP the button ends the turn immediately with no dialog. The confirm
  path dispatches the exact same `battleEndTurn` action as the no-dialog path;
  the two resolve identically (test: no dialog when all AP spent; confirmed
  end-turn === direct end-turn).

## 12. Non-goals v1 (do not implement, do not scaffold)

Overwatch/reaction fire, diagonal movement, flanking bonuses, destructible
terrain, elevation, fog of war, AoE abilities, inventory/equipment, enemy
reinforcements, extraction/retreat, friendly fire.

## 13. Required tests

- Golden battle: fixed seed on map_relay, scripted action list, exact
  end-state assertion (every unit's hp/pos, hit/miss sequence from log).
- hit% clamp bounds; preview===resolution equality test.
- Movement: wall routing, unit blocking, mobility cap. LOS: "#" blocks, "+"
  blocks through but occupant targetable, "-" never blocks.
- Ability ends activation; interact does not; cooldown timing across phases.
- Interact order enforcement; victory on final console; defeat on squad
  down; downed → inj_wounded in strategic state.
- AI determinism (§10); AI prefers lethal shot over cover move when both
  available (constructed scenario).
