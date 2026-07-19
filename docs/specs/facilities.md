# Spec: Facilities (Base Construction) — v1.0, Fable-authored

Restores base construction to the prototype (revises the plan's cut; log as
D-8). One Opus session. Reuses the Effect/Condition vocabulary throughout.

## 1. Sanctioned schema changes (Fable authorization)

- New content type + `ContentBundle.facilities`:

```ts
export const FacilityDef = z.object({
  id: Id,
  name: z.string(),
  description: z.string(),
  cost: z.object({ funds: z.number().int().min(0), materials: z.number().int().min(0) }),
  buildDays: z.number().int().min(1),
  prerequisites: z.array(ConditionSchema).default([]),
  effects: z.array(EffectSchema).default([]),
});
```

- `GameState` gains:

```ts
construction: z.object({
  current: z.object({ facility: Id, daysRemaining: z.number().int().min(0) }).nullable(),
  built: z.array(Id),
}),
```

Initial state: `{ current: null, built: [] }`.

- New effect kind: `{ type: "personnel", delta: number }` — adjusts
  `personnel.total`, floor 0. If assignments then exceed total, reduce
  infirmary → research → logistics until valid.
- New modifier key: `materialsPerDay` (default 0).
- Update the property-test generator; version stays 1. No other edits.

## 2. Action

`{ type: "build"; facility: string }` + guard `canBuild`. RuleErrors:
unknown id, already built, construction in progress (one at a time),
prerequisites unmet, insufficient funds/materials. Costs are paid
immediately on action. No cancel in v1.

## 3. endDay integration

- Income step additionally: `materials += floor(materialsPerDay)`.
- New step between Research and Recovery: if construction.current,
  `daysRemaining −= 1`; at 0: move to built, apply effects in order,
  journal entry "<name> completed."

## 4. Content (facilities.json) — exact values

| id           | name              | funds | mat | days | prereq                           | effects                        |
| ------------ | ----------------- | ----- | --- | ---- | -------------------------------- | ------------------------------ |
| fac_quarters | Expanded Quarters | 40    | 15  | 4    | —                                | personnel +5                   |
| fac_medbay   | Medical Bay       | 35    | 10  | 3    | —                                | modifier healRate add 1        |
| fac_workshop | Workshop          | 50    | 20  | 5    | —                                | modifier materialsPerDay add 2 |
| fac_gate_lab | Gate Annex        | 60    | 25  | 6    | techResearched t_gate_stabilizer | modifier researchBonus add 2   |

(Starting 40 materials cannot cover all builds — ordering is the decision.
No facility upkeep in v1; revisit in 6.3.)

## 5. UI (base screen panel)

Built list; buildable list with costs, days, unmet-prereq state (shown
greyed — facilities are not narrative options, D-1 does not apply); progress
row while building. validate-content: facility effect/prereq refs checked.

## 6. Required tests

- Guard/RuleError per invalid path; costs deducted on build, not completion.
- Golden: build fac_quarters day 1 ⇒ completes during 4th endDay, total 25,
  journal entry present.
- Workshop: materialsPerDay flows into income step.
- personnel-delta clamp: constructed state where assignments exceed reduced
  total reduces in the specified order.
- endDay step order: construction completes after research in the same tick.
