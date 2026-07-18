# Spec: Narrative Engine & Mission Launch (Phase 3) — v1.0, Fable-authored

Binding for tasks 2.4 (launchMission portion), 3.2, 3.3. Shapes live in
schemas.ts; this spec defines runtime semantics. No balance numbers may be
invented outside this document.

## 1. Sanctioned schema changes (Fable authorization)

In `GameState.activeMission`, the narrative branch becomes:

```ts
z.object({ kind: z.literal("narrative"), mission: Id.optional(), script: Id,
  node: Id, squad: z.array(Id), gatedSeen: z.boolean() })
```

(`mission` optional: queue-fired incidents have no MissionDef wrapper.
`gatedSeen` powers the debrief hint, §6.) Update the 0.3 property-test
generator to cover both variants. No other schema edits are authorized.

## 2. New actions

```ts
| { type: "launchMission"; mission: string; squad: string[] }
| { type: "chooseEventOption"; option: string }
```

## 3. launchMission semantics

Guard `canLaunchMission(state, content, mission, squad)`; reducer re-validates
and throws RuleError on: mission not in `missions.available`; activeMission
not null; squad size outside MissionDef.squad min/max; unknown or duplicate
hero ids; any squad hero exhausted (fatigue ≥ 80, per economy spec §7).
Injured-but-not-exhausted heroes may launch.

- Narrative payload: set activeMission `{ kind: "narrative", mission,
  script: payload.eventScript, node: script.entryNode, squad,
  gatedSeen: false }`.
- Tactical payload: additionally require `materials ≥ TACTICAL_LAUNCH_COST`
  and subtract it; battle initialization is owned by the Phase 4 spec — until
  that lands, the tactical branch throws RuleError("tactical_not_implemented")
  and the UI shows the mission as "requires field systems (coming)".
- `endDay` gains a guard: throws RuleError("mission_active") if activeMission
  is not null. A launched mission must be resolved before time advances.

## 4. Condition evaluation (single evaluator, used everywhere)

`evalCondition(state, content, squad, condition) → boolean`:
- flag: `flags[name] === value`; missing flag reads as false.
- variable: compare `variables[name] ?? 0` with op/value.
- resource: `resources[r] ≥ min`.
- techResearched: tech in `research.completed`.
- squadHasArchetype: any squad hero's HeroDef.archetypes includes tag.
- squadSkillAtLeast: max **effective** skill (economy spec §7 selector —
  fatigue and injuries therefore matter in narrative) among squad ≥ min.
  Empty squad ⇒ both squad conditions false.
- all / any / not: standard; empty `all` is true, empty `any` is false.
An option's `requirements` array is an implicit `all`.

## 5. Event traversal (chooseEventOption)

Export `eligibleOptions(state, content) → Array<{ option, eligible,
gatedBySquad }>` for the current node; `gatedBySquad` is true when the option
is ineligible and at least one failing condition is squad-scoped
(squadHasArchetype / squadSkillAtLeast, including inside all/any/not). UI
renders per settings.showLockedOptions (D-1: default hides ineligible).

Reducer on chooseEventOption:
1. Validate: narrative activeMission exists; option id belongs to the current
   node; option eligible. Else RuleError.
2. If any option of the current node has `gatedBySquad`, set
   `gatedSeen = true` (checked before applying the choice).
3. Apply the option's `effects` in order (applyEffects with squad context).
4. `next`:
   - node: set `activeMission.node`.
   - end: apply the outcome's `effects`; then complete (§6).

## 6. Mission completion (narrative)

- If `mission` is set: remove it from `missions.available`, append
  `{ mission, outcome, day }` to `missions.completed`. Queue-fired incidents
  (no mission id) get no completed entry.
- Journal entry: `"<script title>: <outcome label>"`.
- Debrief hint (D-1 mitigation): if `gatedSeen` and
  `settings.showLockedOptions` is false, append journal entry exactly:
  `"Debrief: a different team composition might have opened other
  approaches."` At most once per mission.
- Clear activeMission.

## 7. Queued-event firing (replaces the Phase 1 TODO in endDay step 6)

After day advance: if activeMission is null and any queued entry has
`fireOnDay ≤ day`, pop exactly one — lowest fireOnDay, ties by queue order —
and set activeMission `{ kind: "narrative", mission: undefined,
script: entry.event, node: entryNode, squad: <all heroes with fatigue < 80>,
gatedSeen: false }`. At most one incident fires per endDay; remaining due
entries wait. The UI must present the incident before any further play
(guaranteed by the §3 endDay guard).

## 8. Event UI (task 3.3, Sonnet)

Full-screen narrative pane: speaker line (if any), body text, option buttons
(eligible only, by default), immediate-effect toast after each choice
(resource/variable deltas the player can see; flags and queued events are
silent by design, economy of information per D-2). Completion screen shows
outcome label + visible effect summary + debrief hint if journaled. Touch
targets ≥ 44px; portrait-friendly.

## 9. Required tests

- Golden paths: ev_first_contact via o_help route and o_leave route with
  exact end-state assertions (resources, trust_rival, flags, queued entry
  fireOnDay = day + 30, journal lines).
- Gating: squad [h_mercer] hides o_interrogate and o_data
  (gatedBySquad true); squad [h_okafor] at fatigue 55 fails science 5+
  (effective 7−1=6… choose fatigue such that it flips: base 7, tired −1 ⇒ 6,
  still ≥ 5 — so instead assert with an injury: inj_shaken does not affect
  science; use a constructed hero or assert the −1 arithmetic directly in a
  selector test and the flip with min 7).
- Incident firing: queued entry due ⇒ fires exactly one, squad excludes an
  exhausted hero, endDay blocked while active.
- launchMission RuleError paths, including tactical_not_implemented and the
  materials check.
