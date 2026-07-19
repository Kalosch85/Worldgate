# Worldgate Prototype — Development Plan v0.1

Status: v0.2 — stack confirmed (TypeScript web). Task 0.2 delivered: `ARCHITECTURE.md`, `src/data/schemas.ts`, `scripts/validate-content.ts`, seed content (verified: strict compile, content validation incl. negative test, GameState round-trip).

## Hypothesis under test

The loop _mission (tactical or narrative) → rewards (XP, fatigue, resources, flags) → base/tech progression → next mission_ is fun. Everything not testing this is cut from the prototype but gets an architectural hook.

**Cut from prototype:** politics system, elections, public opinion, mixed-style missions, roguelite, permadeath. (Base construction was cut here but restored by user veto — see D-8.)
**Kept:** heroes (stats, archetypes, XP, fatigue), small tech tree, two separate mission types, support meter stub (single number gating income).

## Tech stack

- TypeScript strict, Vite, React (strategic UI), PixiJS canvas (tactical grid), Vitest (headless tests), zod (JSON content validation), ESLint + Prettier.
- GitHub repo. GitHub Actions on every push to main: typecheck → tests → build → deploy to GitHub Pages. Playtest URL opens in phone browser.
- Sim-core: pure TS, zero DOM imports, seeded PRNG (one seed per battle / campaign), single serializable GameState object. Save = localStorage + exportable string.
- Touch-first UI. Tactics screen designed landscape-friendly; strategic screens portrait-friendly.

## Architecture rules (enforced in review)

1. `src/core/` never imports from `src/ui/` or `src/tactics-render/`. No Date.now, no Math.random — injected clock and PRNG only.
2. All content (heroes, techs, events, maps, missions) lives in `src/data/*.json`, validated by zod schemas at load and in CI.
3. Every effect on game state goes through typed actions/reducers on GameState — this is what makes save/load, tests, and later replays trivial.
4. Specs before code: no Opus/Sonnet implementation session starts without a spec file in `docs/specs/`.

## Repo layout

```
/src/core        sim logic (strategic + tactical rules)
/src/data        JSON content + zod schemas
/src/ui          React strategic screens + event UI
/src/tactics-render  canvas renderer + touch input
/docs/specs      system specs (written by Fable/Opus)
/docs/story      story bible, mission outlines (Fable)
/docs/decisions  logged design decisions
ARCHITECTURE.md  DEVELOPMENT_PLAN.md
```

## Workflow

- Each task below = one Claude Code session. Session prompt references the spec file(s). Definition of done (DoD) for every task: tests green, CI deploy succeeds, task checked off here.
- Model tiers: **[F]** Fable (architecture, schemas, story, system design), **[O]** Opus (sim systems, interpreters, AI, save/load), **[S]** Sonnet (UI, features against specs, content entry, tests).

---

## Phase 0 — Foundation

- **0.1 [S] Repo + toolchain.** ✅ DONE. Vite/React/TS strict, Vitest, ESLint + Prettier, CI pipeline (format → typecheck → lint → test → validate-content → build) deploying `dist/` to GitHub Pages on `main`. Hello-world shell with one passing test. Verified green in CI.
- **0.2 [F] ARCHITECTURE.md + core schemas.** ✅ DONE. Delivered: ARCHITECTURE.md, schemas.ts (incl. campaign variables, universal Effect/Condition vocabulary, D-1 display flag), validate-content.ts with referential integrity, seed content. Verified green.
- **0.3 [S] Utilities.** ✅ DONE. Delivered in `src/core/`: seeded PRNG (`mulberry32` behind the `Rng` interface, `rng.ts`); battle-seed derivation `hash(campaign.seed, day, missionId)` (`hash.ts`, ARCHITECTURE §4); `serialize`/`deserialize` with schema-validated load (`serialize.ts`); `apply(state, action, ctx)` reducer skeleton with a single placeholder `noop` action (`reducer.ts`) — real actions arrive with Phase 1 specs. Tests: PRNG determinism/range, hash determinism/collision-avoidance, GameState round-trip property test (300 generated states across all union branches), reducer no-op/no-mutation. Verified: typecheck, lint, test, validate-content, build all green.

## Phase 1 — Strategic sim-core

- **1.1 [O spec, S impl] Resources + time.** Day tick, income calc (personnel assignments × support meter modifier), costs. DoD: unit tests incl. edge cases.
- **1.2 [S] Roster.** ✅ DONE. Delivered `src/core/roster.ts`: effective-skill selector (base + skillBonuses + injury penalties + fatigue penalty, computed never stored, per ARCHITECTURE §2); fatigue thresholds (tired ≥50 → −1 to every effective skill, exhausted ≥80 → `canBeSelectedForSquad` false); XP→level curve (L2 25/L3 75/L4 150/L5 250, cap 5) with level-up bonus to the highest **base** skill, ties by schema enum order; `applyLevelUps` wired into the `xp` effect so awards cross thresholds through the reducer. Hero creation from JSON + personnel counts already in `newCampaign` (spec §2). Tests: `roster.test.ts` covers each rule and every fatigue/XP boundary, plus the effect-path integration. Verified green (typecheck, lint, test, validate-content, format, build).
- **1.3 [S] Tech tree.** ✅ DONE. Implementation delivered with task 1.1 (JSON defs with prerequisites + cost via `TechDef`; research progress per tick in `endDay` step 3; unlock effects as flags/modifiers through the effects interpreter). This task added the remaining prerequisite-chain edge-case tests in `economy.test.ts` (three-deep chain gating, deeper-prereq-does-not-skip-shallower, multi-prerequisite requiring all, and an end-to-end chain progression via `endDay`). Verified green.

## Phase 2 — Strategic UI

- **2.1 [S] App shell.** ✅ DONE. Delivered `src/ui/App.tsx` (routing between the main menu and base screen via a `Screen` union), `src/ui/screens/MainMenu.tsx` (new-campaign flow with a random 32-bit seed, Continue, export/import save UI), `src/ui/persistence.ts` (localStorage autosave + copy-out/paste-in export string, both through core's schema-validated serialize/deserialize), and `src/data/loadContent.ts` (browser content loader over the same zod bundle, no `node:fs`). Every dispatch runs through `apply` and autosaves; `RuleError` surfaces as a banner. Minimal dark UI, no component library, touch targets ≥ 44px (ARCHITECTURE §10). Verified green (format, typecheck, lint, test, validate-content, build).
- **2.2 [S] Base screen.** ✅ DONE. Delivered `src/ui/screens/BaseScreen.tsx` with `ResourceBar` (day + four resources + support), `PersonnelPanel` (logistics/research/infirmary steppers dispatching `assignPersonnel`, pre-validated with `canAssignPersonnel`), an End-Day button (`endDay`), and `Journal` (campaign log, newest first). Sticky header, portrait-friendly. Smoke tests in `src/ui/App.test.tsx` cover the new-campaign flow, personnel reassignment, day advance, and the save/localStorage reload round-trip. Verified green.
- **2.3 [S] Tech + roster screens.** ✅ DONE. Delivered `src/ui/screens/TechScreen.tsx` (tech list with per-tech status — researched / in-progress / available / locked — prerequisite met/unmet readout, a current-research progress meter, and a `startResearch` button gated by the `canStartResearch` guard that warns when switching would discard progress) and `src/ui/screens/RosterScreen.tsx` (a card per hero: effective skills from the `roster.ts` selector with the fatigue/injury delta surfaced, fatigue state Fit/Tired/Exhausted with the threshold legend, an XP-to-next-level meter + level badge, and injury chips). Shared `ScreenHeader` for back-nav; both screens read-only, every value via a core selector (ARCHITECTURE §1/§2). Verified green (format, typecheck, lint, test, validate-content, build).
- **2.4 [S] Worldgate screen.** ✅ DONE. Sanctioned schema change (narrative-engine §1): the `activeMission` narrative branch is now `{ mission?, script, node, squad, gatedSeen }` and the 0.3 property-test generator covers both the mission-present and queue-incident variants. Core `src/core/missions.ts`: `canLaunchMission` guard + `launchMission` reducer (narrative-engine §3) validating availability, single-active, squad size, and unknown/duplicate/exhausted heroes; the narrative payload opens `activeMission` at the script's entry node, the tactical payload enforces `TACTICAL_LAUNCH_COST` then throws `tactical_not_implemented` until the Phase 4 battle spec lands. `endDay` gains the `mission_active` guard; the new `launchMission` action is wired through `apply`. `src/ui/screens/WorldgateScreen.tsx` lists missions from `missions.available`, offers squad select respecting the exhausted rule, and launches narrative missions (tactical shows "requires field systems (coming)"). Tests: `missions.test.ts` covers every §3 RuleError path (incl. `tactical_not_implemented` and the materials check), the narrative happy path, non-mutation, and the guard; plus the endDay-guard test and UI smoke tests for each screen and the launch flow. Verified green. Note: narrative resolution (chooseEventOption) is task 3.3 — a launched narrative mission awaits the Phase 3 interpreter.
- DoD each: playable on phone browser, touch targets ≥ 44px, state survives reload.

## Phase 3 — Narrative mission engine

- **3.1 [F] Event DSL spec.** Node graph: text, options; option requirements (archetype tag, skill ≥ X, flag, resource); option display rule (see D-1); effects (resources, fatigue, injury, set flag, queue follow-up event, jump node); mission end payloads. Deterministic — no rolls.
- **3.2 [O] Interpreter.** ✅ DONE. Delivered `src/core/narrative.ts`: the single §4 condition evaluator (`evalCondition` — squad conditions read the effective-skill selector so fatigue/injuries matter; empty squad ⇒ squad conditions false, empty `all` true / `any` false); `eligibleOptions` (§5) returning per-option `eligible` + `gatedBySquad`, where gating detects a squad-scoped requirement contributing to failure even nested in all/any/not; the `chooseEventOption` reducer (§5) validating active-mission/option/eligibility, arming `gatedSeen` before applying, running option then outcome effects through the shared interpreter, and completing (§6: prune available, append completed, `"<title>: <label>"` journal line, D-1 debrief hint at most once, clear `activeMission`); and `fireDueIncident` (§7) firing exactly one due queued incident (lowest fireOnDay, ties by queue order, squad = non-exhausted heroes), wired into `endDay` step 6 and `chooseEventOption` into `apply`. Tests (`narrative.test.ts`): condition evaluator per kind, gating incl. the fatigue-flip (base 7, tired −1 ⇒ 6 fails min 7), both golden paths (o_help/out_contact and o_leave/out_cold) with exact end-state assertions (resources, trust_rival, flags, queued fireOnDay = day+30, journal), debrief arm + suppression, invalid-input RuleErrors, and the incident-firing/endDay-block integration. Verified green (typecheck, lint, test, validate-content, format, build).
- **3.3 [S] Event UI.** ✅ DONE. Delivered `src/ui/screens/EventScreen.tsx` (§8): full-screen narrative pane with optional speaker line, body text, and option buttons (eligible only by default per D-1, ineligible shown 🔒-locked when `settings.showLockedOptions`); an immediate consequence toast of the resource/variable deltas the player can see (flags/queued events silent, D-2); and a completion panel with outcome label, visible effect summary, and the debrief hint. Every choice dispatches `chooseEventOption` (no rules in the UI, ARCHITECTURE §1); eligibility comes from the `eligibleOptions` core selector. App shell wiring: a narrative mission (launched or a queued incident fired by `endDay`) routes to the event screen and holds there until it resolves (§7), then returns to base; the completion summary is captured locally since the reducer clears `activeMission` on the terminal choice. Touch targets ≥ 44px, portrait-friendly. Smoke test drives launch → play → completion → return; `WorldgateScreen`/`App` navigation updated. Verified green.
- **3.4 [F outline, S entry] Two authored missions.** ~15 nodes each; each contains ≥1 moral trade-off with a hidden delayed flag and ≥2 archetype-specific options with different costs.

## Phase 4 — Tactical engine

- **4.1 [F/O] Tactics spec.** ✅ DONE. Delivered `docs/specs/tactics-engine.md` (v1.0, Fable-authored): derived hero battle stats (§2), battle init (§3), the four `battle*` actions + UI guards (§4), turn structure (§5), movement/LOS (§6), combat with the strict RNG draw order (§7), interactables/objectives (§8), strategic resolution (§9), enemy AI v0 utility scoring (§10), non-goals (§12), and the required test list (§13). Sanctioned schema/content changes scoped in §1.
- **4.2 [O] Tactical core.** ✅ DONE. Delivered `src/core/tactics.ts` (headless rules engine per docs/specs/tactics-engine.md) and `src/core/tacticsConstants.ts` (every (T) tunable in one file). Sanctioned schema change: `HeroDef.abilities` (default `["ab_shot"]`; h_mercer/h_okafor content updated); validate-content now asserts every tactical map has ≥ `squad.max` spawns (map_relay gained a 4th spawn to satisfy it). `launchMission` builds a real `BattleState` (§3) replacing `tactical_not_implemented`, debiting the materials cost; the four `battle*` actions are wired through `apply`. Combat runs on a single battle stream seeded by `hash(campaign.seed, day, missionId)`, its position reconstructed each reducer call by counting logged rolls (no schema cursor field), keeping the golden battle stable. Guards `reachableTiles`/`visibleTargets`/`hitChance` are the exact preview===resolution functions (BFS movement, Bresenham LOS, clamp(5,95) hit math). §9 downed→`inj_wounded` + victory/defeat effect resolution clears `activeMission`. Tests (`tactics.test.ts`): the golden battle (fixed campaign seed, scripted firefight, exact hp/pos + full hit/miss log), hit% clamp bounds, preview===resolution, movement (wall routing, unit blocking, mobility cap), LOS (`#` blocks / `+` blocks-through-but-occupant-targetable / `-` never blocks), ability-ends-activation vs interact-does-not, cross-phase cooldown timing, interact order enforcement, victory-on-final-console, defeat-on-squad-down, downed→inj_wounded, AI determinism, enemy approach, and AI-prefers-lethal-shot. Verified green (format, typecheck, lint, test, validate-content, build). Renderer is 4.3 (out of scope).
- **4.3 [S] Renderer + input.** PixiJS grid, unit sprites (colored shapes ok), tap-select → range overlay → tap-confirm, ability bar, turn banner.
- **4.4 [O] Enemy AI v0.** ✅ DONE (delivered with 4.2). Deterministic utility scoring in `src/core/tactics.ts` per tactics-engine spec §10 (attack/move/pass candidates, tie-break attacks-before-moves then lowest board index), run in-reducer during `battleEndTurn`. DoD covered by the AI determinism, enemy-approach, and prefers-lethal-shot tests in `tactics.test.ts`.
- **4.5 [S] Map 1.** One map with puzzle objective under fire (e.g., activate consoles in sequence).

## Phase 5 — Loop integration

- **5.1 [S] Mission resolution.** Battle/event results → XP, fatigue, injuries, resources, flags → strategic layer.
- **5.2 [S] Campaign flow.** Mission availability over calendar, rest days, follow-up events fired by flags.
- **5.3 [S] Support meter stub.** One number, modified by mission outcomes and select event options, multiplies income. Document hooks for the future politics system in `docs/specs/politics-hooks.md`.

## Phase 6 — Content & story

- **6.1 [F] Story bible.** Original setting: portal network premise, sponsoring institution, 2 factions, campaign arc skeleton; the going-public/election arc reserved as act 2 (post-prototype). Legal rule: genre premise yes, no borrowed names/characters/specific plotlines.
- **6.2 [F design, S entry] Content pass.** 4 heroes (distinct archetypes), ~10 techs, 2 tactical maps, 4 narrative events pool, 6–8 campaign missions.
- **6.3 [O] Balance pass.** Headless simulated campaign runs; tune income, XP curve, fatigue rates.
- **6.4 [S] Squad-composition tutorial.** Contextual, first narrative mission: show how archetypes/skills open paths (uses a one-off scripted reveal, not the global display flag). Includes the post-mission debrief hint hook.

## Phase 7 — Playtest gate

Play 2–3 full campaigns on phone. Evaluate hypothesis. Then decide, in order: politics system scope, mixed-style missions, roguelite structure. No new systems before this gate.

---

## Design decisions log

- **D-1 RESOLVED:** Locked archetype options are hidden (default). Engine always computes eligibility; `settings.showLockedOptions` exists as a config flag for a later playstyle option, no UI toggle in prototype. Mitigations: post-mission debrief hint (anonymous one-liner) + squad-composition tutorial (6.4).
- **D-6:** Narrative structure is branch-and-bottleneck: 2–3 divergence points per mission feeding flags/numeric campaign variables (incl. `support`, `trust_*`); cross-mission reactivity via availability conditions, requirements, and queued events — not path multiplication.
- **D-7:** AI-assisted authoring at dev time yes (validator + canon review gate every batch); runtime LLM generation no. Revisitable post-prototype as a separate experiment.
- **D-2 default:** Immediate option costs visible; delayed consequences hidden behind flags.
- **D-3 default:** Injuries persist across missions; no permadeath in prototype.
- **D-4 default:** Squad size 4; grid ~10×12; tactics landscape orientation.
- **D-5 default:** RNG in combat (seeded), deterministic narrative.
- **D-8 RESOLVED (user veto):** Base construction restored to prototype scope, reversing the earlier cut (see "Cut from prototype"). Facilities are content (`FacilityDef` + `facilities.json`) reusing the universal Effect/Condition vocabulary; one build at a time, costs paid on the `build` action, effects applied on completion during the endDay construction step (between Research and Recovery); no upkeep in v1 (revisit in 6.3). Spec: `docs/specs/facilities.md`.
