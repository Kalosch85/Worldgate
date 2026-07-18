# Worldgate Prototype — Architecture

Binding for all implementation sessions. Changes to this document or to
`src/data/schemas.ts` are Fable/Opus-tier decisions only (see §12).
Companion: `DEVELOPMENT_PLAN.md` (phases, tasks, decisions log).

## 1. Layers and import rules

```
src/core            simulation: strategic + tactical rules, reducers, interpreters
src/data            schemas.ts (contracts) + content/*.json (all game content)
src/ui              React strategic screens + narrative event UI
src/tactics-render  PixiJS canvas renderer + touch input for battles
scripts             validate-content.ts and other tooling
docs/specs          system specs (written before implementation)
docs/story          story bible, mission outlines
docs/decisions      logged design decisions (mirrors plan D-numbers)
```

Import rules, enforced by ESLint (`import/no-restricted-paths`):

- `src/core` imports only from `src/core` and `src/data` (types/schemas). Never from `ui`, `tactics-render`, or anything DOM/Pixi.
- `src/core` never uses `Math.random`, `Date.now`, `new Date()`, timers, or I/O. RNG and clock are injected. ESLint bans these globals in `core`.
- `ui` and `tactics-render` never implement rules. They dispatch actions and render state. If a screen needs a computation, it belongs in `core` as a selector.

## 2. Def vs State

Content Defs (`HeroDef`, `TechDef`, `EventScriptDef`, …) are immutable JSON,
validated by zod at load and in CI. `GameState` holds only mutable campaign
data and references Defs by id. Never copy Def fields into state; derive via
selectors (e.g. effective skill = `HeroDef.skills + HeroState.skillBonuses +
injury penalties`).

## 3. State management

One serializable `GameState` object. All changes go through pure reducers:

```ts
apply(state: GameState, action: Action, ctx: { content: ContentBundle; rng: Rng }): GameState
```

- Actions are a typed discriminated union (`endDay`, `startResearch`,
  `launchMission`, `chooseEventOption`, `battleMove`, `battleAbility`, …).
- No mutation outside reducers. UI state (selected tile, open panel) lives in
  React and is never persisted.
- Save = `JSON.stringify(GameState)` to localStorage + exportable string.
  `version` field; prototype migration policy: version bump = new campaign.

## 4. Determinism and RNG

- Campaign seed set at new-campaign. PRNG: mulberry32 (or equivalent small
  seeded generator) behind an `Rng` interface.
- Battle seed derived, not stored ad hoc: `hash(campaign.seed, day, missionId)`.
  Same campaign + same inputs ⇒ same battle. This is what makes golden-path
  tests, headless balance simulation (task 6.3), and future replay/roguelite cheap.
- Narrative layer consumes no RNG (D-5). The only sanctioned exception is the
  `injury: randomSquadMember` effect, which draws from the campaign stream.

## 5. Effects and Conditions — the universal vocabulary

Techs, event options, event outcomes, and mission rewards all express
consequences as `Effect[]` and gates as `Condition[]` (see `schemas.ts`).
One interpreter for each lives in `core`. Rules:

- Effects apply in array order.
- Clamping is the interpreter's job: resources floor at 0, fatigue clamps to
  0–100. Variables are unclamped (design reads them with thresholds).
- `support` is not a special system; it is `variables.support` (D-6 keeps the
  future politics system as data, not new code).
- New effect/condition kinds require a schema change ⇒ escalation (§12).

## 6. Narrative model

- Deterministic node graphs, branch-and-bottleneck (D-6): 2–3 real divergence
  points per mission write to flags/variables; paths reconverge at authored
  nodes. Cross-mission reactivity comes from `availability` conditions,
  option `requirements`, and `queueEvent` — not from path multiplication.
- Flags = discrete facts ("abandoned_rivals"). Variables = accumulating
  stances ("trust_rival", "support"). Prefer variables when a thing can grow.
- Option eligibility is always computed by the engine and returned per option.
  Rendering ineligible options is purely a UI decision:
  `settings.showLockedOptions` (D-1: default `false`, no UI toggle in the
  prototype). The debrief-hint hook: mission resolution reports whether any
  eligible-if-roster-differed options existed, as an anonymous one-liner.

## 7. Tactical model (shapes fixed here, numbers in docs/specs/tactics.md)

Square grid, side-based turns (player moves all units, then enemy), 2 AP per
unit, move/shoot/ability/interact. LOS by grid raycast; tile legend in
`schemas.ts`. Hit chance = clamp(5, 95, base + aim mod − cover mod − range
mod), rolled on the battle stream. Exact formulas, AP costs, and AI scoring
are task 4.1's spec and must not be invented ad hoc by implementation sessions.

## 8. Content pipeline

- All content in `src/data/content/*.json`. `scripts/validate-content.ts`
  runs shape validation plus referential integrity (event node/outcome refs,
  tech prereqs, map bounds, mission payload refs) and is a required CI step.
- AI-assisted authoring is sanctioned; runtime LLM calls are not (D-7).
  Every generated batch passes the validator and a human/Fable canon review
  against `docs/story/` before merge.

## 9. Testing strategy

- `core`: Vitest unit tests per system; property test for GameState
  serialize/deserialize round-trip; golden-path tests that script a full
  narrative mission or battle with a fixed seed and assert the end state.
- Content: validator in CI (already implemented).
- UI: keep thin; smoke tests only in the prototype. Fun is playtested, not
  unit-tested.
- CI on every push: typecheck → tests → validate-content → build → deploy
  to GitHub Pages.

## 10. UI constraints

Touch-first, phone browser is the primary playtest device. Touch targets
≥ 44px. Strategic screens portrait-friendly; tactics landscape-friendly.
No hover-dependent interactions anywhere.

## 11. Conventions

TypeScript strict, `noUncheckedIndexedAccess`, no `any` (use `unknown` +
narrowing). Content ids prefixed by kind: `h_`, `t_`, `ab_`, `ut_`, `map_`,
`ev_`, `m_`, `inj_`, `n_`/`o_`/`out_` inside event scripts. Zod v4 note:
enum-keyed records are exhaustive; use `z.partialRecord` for sparse maps.

## 12. Session protocol and model tiers

Every implementation session references its task id in `DEVELOPMENT_PLAN.md`
and the relevant `docs/specs/*.md`. DoD everywhere: tests green, CI deploy
succeeds, task checked off.

| Work                                                                                              | Model  |
| ------------------------------------------------------------------------------------------------- | ------ |
| Architecture, schemas.ts, event/tactics system design, story bible, canon review                  | Fable  |
| Core systems (reducers, interpreters), save/load, enemy AI, balance simulation, tricky debugging  | Opus   |
| UI screens, renderer features against specs, content entry, tests for specced behavior, CI wiring | Sonnet |

Escalation triggers — a Sonnet session must stop and hand up (to Opus, or
Fable if contracts change) instead of improvising, when:

1. The task seems to require editing `schemas.ts`, `ARCHITECTURE.md`, or any
   reducer's action contract.
2. A spec is ambiguous or two specs conflict.
3. A change would cross layer boundaries (§1) or touch RNG/determinism (§4).
4. Game-balance numbers are needed that no spec provides.
5. The same bug survives two fix attempts.

De-escalation: once an Opus/Fable session produces the spec or contract
change, implementation returns to Sonnet.
