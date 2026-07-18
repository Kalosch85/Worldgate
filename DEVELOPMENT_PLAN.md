# Worldgate Prototype — Development Plan v0.1

Status: v0.2 — stack confirmed (TypeScript web). Task 0.2 delivered: `ARCHITECTURE.md`, `src/data/schemas.ts`, `scripts/validate-content.ts`, seed content (verified: strict compile, content validation incl. negative test, GameState round-trip).

## Hypothesis under test
The loop *mission (tactical or narrative) → rewards (XP, fatigue, resources, flags) → base/tech progression → next mission* is fun. Everything not testing this is cut from the prototype but gets an architectural hook.

**Cut from prototype:** politics system, elections, public opinion, mixed-style missions, roguelite, permadeath, base construction (facilities are fixed; personnel assignment only).
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
- **0.1 [S] Repo + toolchain.** Vite/React/TS strict, Vitest, ESLint, CI pipeline to Pages. Verify the Claude Code cloud environment can `npm install` and run tests (abort criterion: if npm registry unreachable, revisit stack). DoD: hello-world deployed, one passing test in CI.
- **0.2 [F] ARCHITECTURE.md + core schemas.** ✅ DONE. Delivered: ARCHITECTURE.md, schemas.ts (incl. campaign variables, universal Effect/Condition vocabulary, D-1 display flag), validate-content.ts with referential integrity, seed content. Verified green.
- **0.3 [S] Utilities.** ✅ DONE. Delivered in `src/core/`: seeded PRNG (`mulberry32` behind the `Rng` interface, `rng.ts`); battle-seed derivation `hash(campaign.seed, day, missionId)` (`hash.ts`, ARCHITECTURE §4); `serialize`/`deserialize` with schema-validated load (`serialize.ts`); `apply(state, action, ctx)` reducer skeleton with a single placeholder `noop` action (`reducer.ts`) — real actions arrive with Phase 1 specs. Tests: PRNG determinism/range, hash determinism/collision-avoidance, GameState round-trip property test (300 generated states across all union branches), reducer no-op/no-mutation. Verified: typecheck, lint, test, validate-content, build all green.

## Phase 1 — Strategic sim-core
- **1.1 [O spec, S impl] Resources + time.** Day tick, income calc (personnel assignments × support meter modifier), costs. DoD: unit tests incl. edge cases.
- **1.2 [S] Roster.** Hero creation from JSON, XP/level curve, fatigue (mission +N, rest −M per day, threshold → stat penalty, hard cap → unavailable), injury slots. Personnel as counts per assignment. DoD: tests.
- **1.3 [S] Tech tree.** JSON defs with prerequisites + cost, research progress per tick, unlock effects as flags/modifiers. DoD: tests incl. prerequisite chains.

## Phase 2 — Strategic UI
- **2.1 [S] App shell.** Routing between screens, save/load UI, new-campaign flow.
- **2.2 [S] Base screen.** Resources bar, personnel assignment, end-day button, event log.
- **2.3 [S] Tech + roster screens.** Research selection; hero cards with stats/fatigue/XP.
- **2.4 [S] Worldgate screen.** Available missions from JSON (type, difficulty, squad requirements), squad select respecting fatigue/injury, launch.
- DoD each: playable on phone browser, touch targets ≥ 44px, state survives reload.

## Phase 3 — Narrative mission engine
- **3.1 [F] Event DSL spec.** Node graph: text, options; option requirements (archetype tag, skill ≥ X, flag, resource); option display rule (see D-1); effects (resources, fatigue, injury, set flag, queue follow-up event, jump node); mission end payloads. Deterministic — no rolls.
- **3.2 [O] Interpreter.** Executes EventScript against GameState. DoD: golden-path tests (scripted playthroughs asserting end state) + invalid-script rejection tests.
- **3.3 [S] Event UI.** Text panel, option buttons with requirement labels, consequence toast for immediate effects.
- **3.4 [F outline, S entry] Two authored missions.** ~15 nodes each; each contains ≥1 moral trade-off with a hidden delayed flag and ≥2 archetype-specific options with different costs.

## Phase 4 — Tactical engine
- **4.1 [F/O] Tactics spec.** Square grid ~10×12; 2 AP per unit; move/shoot/ability/interact; LOS via grid raycast; half/full cover; hit% = base accuracy + range + cover mods (RNG, seeded); 2–3 abilities total; interactable puzzle objects (multi-step objectives); no overwatch in v1; simple utility-based enemy AI. Explicit non-goals listed.
- **4.2 [O] Tactical core.** Full rules engine, headless. DoD: scripted battle simulations with fixed seeds asserting outcomes; hit-chance math property tests.
- **4.3 [S] Renderer + input.** PixiJS grid, unit sprites (colored shapes ok), tap-select → range overlay → tap-confirm, ability bar, turn banner.
- **4.4 [O] Enemy AI v0.** Score moves by damage potential, survival, objective threat. DoD: AI beats a passive squad, loses to a scripted competent squad.
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
