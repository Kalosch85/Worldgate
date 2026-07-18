# Spec: Economy & Roster (Phase 1) — v1.0, Fable-authored

Binding for tasks 1.1, 1.2, 1.3. Numbers here are the only source of balance
values; implementation sessions must not invent or "reasonably adjust" them.
All resource quantities are integers; every daily flow is floored.

## 1. Sanctioned schema change (Fable authorization)

`GameState` gains a campaign journal. Apply exactly this change to
`src/data/schemas.ts` (this is a §12-tier decision, decided here; typing it
is delegated):

```ts
// inside GameState, after `flags`:
journal: z.array(z.object({ day: z.number().int().min(1), text: z.string() })),
```

Initial state: `journal: []`. `version` stays 1 (no user saves exist yet).
No other schema edits are authorized.

## 2. Initial campaign state (factory `newCampaign(seed)`)

day 1 · funds 100 · materials 40 · intel 0 · exotics 0 ·
variables `{ support: 5, trust_rival: 0 }` · flags `{}` · modifiers `{}` ·
journal `[]` · personnel total 20, assignments `{ logistics: 12, research: 6,
infirmary: 2 }` · heroes: `h_mercer`, `h_okafor` (xp 0, level 1, fatigue 0,
no injuries, empty skillBonuses) · research `{ current: null, completed: [] }` ·
missions `{ available: ["m_survey"], completed: [], queuedEvents: [] }` ·
activeMission null · settings `{ showLockedOptions: false }`.

## 3. Actions added in Phase 1

```ts
| { type: "endDay" }
| { type: "startResearch"; tech: string }
| { type: "assignPersonnel"; assignments: { logistics: number; research: number; infirmary: number } }
```

Rule-invalid actions throw `RuleError` (typed, with a string `code`); UI must
pre-validate via exported guards (`canStartResearch(state, content, tech)`,
`canAssignPersonnel(state, assignments)`). Structurally impossible input is a
programmer error and may throw anything.

- `startResearch`: tech must exist, not be completed, and all prerequisites
  completed. Starting a new tech while another is in progress is allowed and
  **discards** the old progress (journal entry notes it).
- `assignPersonnel`: each value ≥ 0 and sum ≤ personnel.total. Unassigned
  personnel are idle (no effect, no upkeep discount).

## 4. Modifier registry

Modifiers live in `state.modifiers` (key → number). `modifier` effects with
`mode:"add"` add to the current value (missing key = default), `mode:"set"`
overwrite. Known keys and defaults:

| key | default | meaning |
| --- | --- | --- |
| incomeMult | 1 | multiplies funds income |
| researchBonus | 0 | flat extra RP/day |
| healRate | 0 | see fatigue/injury recovery |

Unknown keys are stored but inert.

## 5. endDay — exact order of operations

1. **Income.** `funds += floor(logistics × 3 × supportMult × incomeMult)`
   where `supportMult = clamp(0.5, 1.5, 0.75 + 0.05 × variables.support)`.
   (support 5 ⇒ ×1.0; support 0 ⇒ ×0.75.)
2. **Upkeep.** `cost = personnel.total × 1 + heroCount × 2`. Subtract from
   funds. If funds would go below 0: set funds to 0, `variables.support -= 1`,
   journal entry "Payroll missed."
3. **Research.** If `research.current`: `progress += research assignment × 1
   + researchBonus`. If `progress ≥ cost`: move tech to completed, set current
   null, apply the tech's `effects` in array order, journal entry. Excess
   progress is discarded.
4. **Recovery.** For every hero: `fatigue = max(0, fatigue − (5 + 2 ×
   infirmary + 5 × healRate))`; every injury `daysRemaining −= 1` (remove at
   0, journal entry).
5. **Advance.** `day += 1`.
6. **Queued events: NOT consumed in Phase 1.** Leave `queuedEvents`
   untouched; firing semantics arrive with the Phase 3 spec (open item owned
   by Fable). Add a `// TODO(phase3)` marker only.

## 6. Effects interpreter (task 1.1 scope, §5 of ARCHITECTURE)

Implement `applyEffects(state, effects, ctx, squad?)` covering the full
vocabulary in schemas.ts. Notes: `resource` floors at 0; `fatigue` clamps
0–100 and applies to the given squad; `xp` applies to squad; `injury
randomSquadMember` picks uniformly via `ctx.rng` (campaign stream) and adds
the injury at its full `daysToHeal`; `log` appends `{ day, text }` to
journal; `unlockMission` appends to `missions.available` if absent;
`queueEvent` appends `{ event, fireOnDay: day + delayDays }`.

## 7. Roster rules (task 1.2)

- **Effective skill** = HeroDef.skills + skillBonuses + injury penalties +
  fatigue penalty. Selector, never stored.
- **Fatigue:** ≥ 50 ("tired"): −1 to every effective skill. ≥ 80
  ("exhausted"): hero cannot be added to a squad.
- **XP → level** (cumulative thresholds, cap level 5): L2 25 · L3 75 ·
  L4 150 · L5 250. On each level-up: `skillBonuses[k] += 1` where k is the
  hero's highest **base** skill; ties break by schema enum order (combat,
  science, engineering, diplomacy, resolve). No player choice (logged future
  extension).
- **Tactical launch cost** (constant, enforced when `launchMission` lands in
  a later phase): `TACTICAL_LAUNCH_COST = 5` materials; narrative missions
  free. Define the constant now, do not implement the action.

## 8. Golden scenarios — required tests, exact values

- **A. Idle:** newCampaign, 5× endDay ⇒ day 6, funds 160 (income 36, upkeep
  24, net +12/day), materials 40.
- **B. Research:** startResearch `t_gate_stabilizer` on day 1, 4× endDay ⇒
  completed during the 4th tick (RP 6/day: 6,12,18,24 ≥ 20), `m_relay` in
  available, journal contains the tech's log line, funds 148, day 5.
- **C. Low support:** state with support 0, one endDay ⇒ income
  floor(36 × 0.75) = 27, funds +3 net.
- **D. Insolvency:** funds 0, support −5 (mult clamps at 0.5): one endDay ⇒
  income 18, upkeep 24, funds 0, support −6, journal has "Payroll missed."

Plus: effects-interpreter unit tests per effect kind, and RuleError tests for
each invalid action path.
