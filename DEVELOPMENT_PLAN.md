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
- **4.3 [S] Renderer + input.** ✅ DONE. Delivered `src/tactics-render/` (the PixiJS layer, tactics-engine spec §11): `BattleCanvas.ts` draws the grid from the map tile legend (walls/low/high cover), consoles (next-in-sequence highlighted), colored-shape units with hp pips, the move-reachable overlay, and target rings labeled with the exact shared `hitChance` value; `battleModel.ts` is the rules-free glue — `buildBattleView`/`interpretTap` surface the core guards (`reachableTiles`/`visibleTargets`/`hitChance`/`nextInteractables`) and turn a tile tap into a `battle*` action or a selection; `replay.ts` reconstructs the enemy phase from the log for ~300ms-per-action playback; `BattleScreen.tsx` hosts the canvas, owns selection/mode, plays the replay, and shows the §9 battle-end summary (per-hero hp/injuries, effect list). App routes a tactical `activeMission` straight to the battle screen (matching the narrative rule) and `WorldgateScreen` now deploys tactical missions (the "coming" stub removed). Landscape-friendly, touch targets ≥ 44px, colored shapes only (§10–§11). Tests: `battleModel.test.ts` (view mirrors the guards; tap → move/shoot/interact/select), `replay.test.ts` (one beat per action, dmg/down folded, no input mutation), `BattleScreen.test.tsx` (HUD smoke with Pixi mocked). Verified green (format, typecheck, lint, test, validate-content, build) and rendered end-to-end in a real headless Chromium (WebGL board, hit% labels, reachable overlay).
- **4.4 [O] Enemy AI v0.** ✅ DONE (delivered with 4.2). Deterministic utility scoring in `src/core/tactics.ts` per tactics-engine spec §10 (attack/move/pass candidates, tie-break attacks-before-moves then lowest board index), run in-reducer during `battleEndTurn`. DoD covered by the AI determinism, enemy-approach, and prefers-lethal-shot tests in `tactics.test.ts`.
- **4.5 [S] Map 1.** ✅ DONE (verified). `map_relay` (Relay Station, 8×6) already satisfies the brief — a puzzle objective under fire: an `interactSequence` objective (activate `con_a` then `con_b`) with two raiders holding the consoles. Verified playable end-to-end: consoles are reachable and the raiders engageable, and a headless playthrough (engage → activate consoles in sequence) wins on 6 of 7 sampled seeds with a genuine loss risk, awarding the mission's victory effects; the core already tests victory-on-final-console, interact-order enforcement, and defeat-on-squad-down. No map JSON change needed.

## Phase 5 — Loop integration

- **5.1 [S] Mission resolution.** Battle/event results → XP, fatigue, injuries, resources, flags → strategic layer.
- **5.2 [S] Campaign flow.** Mission availability over calendar, rest days, follow-up events fired by flags.
- **5.3 [S] Support meter stub.** One number, modified by mission outcomes and select event options, multiplies income. Document hooks for the future politics system in `docs/specs/politics-hooks.md`.

## Phase 6 — Content & story

- **6.1 [F] Story bible.** ✅ DONE. Delivered `docs/story/story-bible.md` (v1.0, Fable-authored): premise (Worldgate Command, the Vault, sponsor consortium), binding originality rules, deep canon (Stewards, Tenders, Raiders), 4 Earth-side factions, cast of 3 named heroes plus 2 planned recruits and generics, 3-act structure (Act 1 Establishment in scope, Act 2 Exposure and Act 3 The Network reserved post-prototype per Phase 7 gate), writing rules for all content sessions, vocabulary list, and a backlog (B-1..B-5) of content seeds for later tasks. Legal rule honored: genre premise only, no borrowed names/characters/plotlines.
- **6.2 [F design, S entry] Content pass.** 4 heroes (distinct archetypes), ~10 techs, 2 tactical maps, 4 narrative events pool, 6–8 campaign missions. The Veyra arc (`docs/story/arc-veyra.md`) is the spine of this pass; its implementation tasks are tracked as **6.2-A1..A3** below (renumbered out of the arc doc's "§7 task N" space so nothing reads as plan Phase 7.x — Phase 7 is the playtest gate; per the Fable M4–M5 resolution E, the gate is never renumbered).
  - **6.2-A1 [S] Arc schema + effects.** ✅ DONE. `addHero` / `addPersonnel` effects (arc §8) + interpreter cases + validator refs (PR #20).
  - **6.2-A2 [S] Arc content M1–M3.** ✅ DONE. `h_seryn`, `ev_vy_pilgrim_roads` / `ev_vy_penitence` / `ev_vy_first_blade`, `m_vy_1..3`, `m_relay` arc-unlock (PR #21).
  - **6.2-A3 [S] Arc content M4–M5 + follow-ups.** ✅ DONE. Sanctioned schema change (resolution B): `TechDef.visibleIf: Condition[]` — techs list only when every gate passes (empty squad ctx); `canStartResearch` additionally requires visibility; completed techs always show; wired into `techVisible` selector, `TechScreen`, and `validate-content`. Content: `t_radiance_cell` (gate `f_vy_godtech`) + `t_projection_theory` (prereq radiance, gate `f_vy_watched_god`); `m_vy_4` "Relic Vault" + `m_vy_5` "The Luminous One" (both narrative — ARC-D3 fallback, see arc-veyra §M4 note); follow-ups `ev_vy_seryn_oath`, `ev_vy_gratitude`, `ev_vy_dessik_word` (kept-promise queue wired into M2 free-Ilo). M4/M5 text follows story-bible §3 Steward framing and §7 rules (≤80 words, tragic reveal). §6 full-arc golden tests deferred (resolution C — after balance tuning); visibility gating unit-tested in `economy.test.ts`. Verified: format, typecheck, lint, 223 tests, validate-content, build, and a scripted end-to-end run of every M4/M5 branch through the real reducers.
  - **6.2-A4 [F] Early-campaign restructure (D-9).** ✅ DONE. New spine:
    `ev_intro` auto-launches at newCampaign (incident form, core change in
    `campaign.ts` — `newCampaign(seed, content?)`) → `m_vy_arrival` "The
    Silent Valley" → `m_vy_ledger` "The Ledger of the Taken" →
    `m_vy_intercept` "The Tribute Call" (first tactical: `map_vy_intercept`
    reusing map_relay geometry, new `ut_tender`; `launchCost: 0` and defeat
    queues `ev_vy_regroup` +1d which re-unlocks it — both are required for
    the no-softlock guarantee, since materials have no unconditional income)
    → `m_vy_1..5` (the missing M3 → m_vy_4 unlock mandated by arc-veyra §M3
    is wired in here). "Second Expedition" → **Recon One** arc-wide;
    `m_relay` repositioned as an optional tech-gated side op;
    `ev_first_contact` moved to `m_rival_stranded` "Distress: Address 11"
    (unlocked on intercept victory; trust_rival flow and the +30d B-1 queue
    preserved). Winnability hand-verified through the real reducer: fresh
    2-hero squad 23/25 seeds, tired (fatigue 55) 19/25. Save version bumped
    1 → 2 (pre-D-9 saves cannot progress the new spine; policy: bump = new
    campaign). Bible §10 + §7.7 + B-6/B-7 added. Verified green (format,
    typecheck, lint, tests, validate-content, build) plus an adversarial
    4-lens review workflow over the final diff.
  - **6.2-A5 [F] Restructure 2 — "The Shut Door" (D-10).** ✅ DONE. Content
    and prose only. Two-world split (Andara / Veyra, bible §10–§11
    gazetteer); the warded Door (inbound free, outbound temple-held —
    canon for Recon One's silence; deployment lock deferred, hook
    `f_vy_call_intercepted`); valley-mission drama rewrite (falling boy:
    HIDE/RUN beside the violent branch, `trust_andara` +2/0/−3, three-way
    convergence on the Veyra address, vy_spare_address folded out);
    Veyra-side recognition of the boy and father (three trust variants);
    Recon One rescue rewritten as a reunion (roster named, Barros–Mercer
    connection); the Portion/Graced sacrament + Seryn withdrawal arc
    (t_radiance_cell now visible on any(f_vy_sacrament_dose,
    f_vy_godtech)); intro voice pass with the approved Mercer/Okafor
    lines + order-only fork (science first +4 intel / threats first +4
    materials); ev_first_contact, m_rival_stranded, and trust_rival
    deleted end-to-end (bible §4 reduced to a dormant seed; B-1/B-3
    deleted, B-7 retired, B-8 reserved); bible §7 rule 8
    (mission-earns-its-slot); `docs/story/gap-list.md` committed. Tests
    ported off deleted content per narrative-engine §9 (D-10 note).
- **6.3 [O] Balance pass.** Headless simulated campaign runs; tune income, XP curve, fatigue rates. **Carry-in:** M1–M3 unreachable-diplomacy dead content (confirmed real, resolution D) is deferred here, not fixed in 6.2-A3.
  - **6.3-T-v3 [O] Veyra-Kämpfe Tuning v3.** ✅ DONE. (1) Sanctioned schema add: `AbilityDef.accuracyBonus: int, default 0` — added to the attacker's hit% BEFORE the 5–95 clamp on the shared preview===resolution path (`hitChance` now takes the ability id; existing abilities stay 0). (2) New ability `ab_precision_shot` (Präzisionsschuss: apCost 2, range 8, power 2, accuracyBonus 20, cooldown 3), assigned to `h_mercer` alongside `ab_shot`; ability bar keeps it visible-but-disabled below 2 AP with the reason "Benötigt 2 AP — kein Bewegen im selben Zug". (3) **Balance-Rebase v3** (replaces the PR #41 aim-48 workaround, authorized Fable decision): `HERO_AIM_BASE` 55→60 and `ut_tender_guard` aim 48→60; specs (veyra-kaempfe §3, tactics-engine §2) synced; golden `map_relay` battle re-recorded once (now a deterministic console victory, stable over two runs, no 0-hp unit acts); §8 scenarios re-verified headless (intercept 2er seed 1 / 4er seed 3, breakout mit Seryn seed 1 / ohne Seryn 3er seed 1; deployment chain now the spec-canonical 4-vs-6 without Seryn, seed 3 — "eng, aber schaffbar" holds). (4) Battle-renderer overlays: ability-range+LOS coverage (§4a) and enemy threat-zone (§4b), both from new core guards `abilityRangeTiles`/`threatenedTiles` (no second range impl in the renderer; overlays === guard output, tested). (5) Signaltürme lead-in narrative beat inserted immediately before every `m_vy_intercept` unlock in `ev_vy_ledger` (chain otherwise unchanged); mark-protection test extended for the new " & " marks. (6) (T)-value guardrail added to veyra-kaempfe.md head and `tacticsConstants.ts`. Verified: format:check, typecheck, lint, 300 tests, validate-content, build.
  - **6.3-T-v3-Nachtrag [O] Spielerfalle „Unterbesetzte Operation".** ✅ DONE. Squad-Auswahl-UI (`WorldgateScreen`) zeigt bei jeder Mission mit `operation`-Feld den Hinweis „Operation ohne Rückkehr — empfohlene Teamstärke: 4"; veyra-kaempfe §7 entsprechend erweitert; App-Smoke-Test deckt den Hinweis ab. **Abweichung + Begründung (Fable-Freigabe empfohlen):** Der angefragte harte `m_vy_arrival` squad.min 2 → 3 wurde NICHT umgesetzt — er erzeugt einen **Softlock**: der Startkader hat nur zwei Helden (Mercer, Okafor), und der einzige weitere Held (Seryn) tritt erst über `ev_vy_first_blade` (tief in derselben Operation, nach `m_vy_arrival`) bei; kein weiterer Held existiert. min 3 macht die Erstmission — den Hauptstrang — im echten Spiel unstartbar (max. fieldbare Squad = 2) und lässt die App-Smoke-Tests des Ankunfts-Pfads unlösbar rot (DoD-Verstoß). Die Falle wird daher über die Empfehlung/Warnung geschlossen (spielbar, alle Gates grün); ein echter min-3-Gate braucht zuerst einen dritten früh verfügbaren Held (Content/Kanon, Fable-Tier).
  - **6.3-T-v3-Hotfix [O] Roster-Erweiterung (Softlock-Fix) — löst den Nachtrag-Blocker auf.** ✅ DONE. Fable-autorisiert. (1) Zwei neue Starthelden in `heroes.json`: `h_brandt` (I. Brandt, engineer, eng 7) und `h_okonkwo` (R. Okonkwo, scout). (2) `newCampaign`-Startkader = `[h_mercer, h_okafor, h_brandt, h_okonkwo]`; economy-and-roster §2 synchron (Upkeep `20 + 4×2 = 28`); §8-Goldszenarien mit neuen Kanon-Werten (A: funds 140 net +8; B: funds 132, Tag 5; C: support 0 → income 27, net −1, funds 99, Basis defizitär; D: income 18, funds 0, support −6, „Zahltag verpasst."). (3) `m_vy_arrival` squad.min **bleibt 3** (Softlock jetzt behoben); neuer **Startbarkeits-Invariant-Test** (`missions.test`): jede Pflichtmission `squad.min ≤` fieldbare Helden, konkret Tal + Breakout mit dem Startkader startbar. (4) Breakout „ohne Seryn" headless mit exakt dem 4er-Start-Roster bestätigt (Sieg, `m_vy_home` freigeschaltet). (5) story-bible §5: Brandt/Okonkwo von geplanten Rekruten zu aktiven Starthelden, Okonkwos Herkunft ohne Rivalenblock-Bezug. (6) Roster-Screen zeigt vier Helden (App-Smoke-Test), Tal-Squad-Auswahl erlaubt 3–4. Verified: format:check, typecheck, lint, 305 tests, validate-content, build.
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
- **D-9 (Fable): Early-campaign restructure ("Recon One").** The campaign
  opens in media res: `newCampaign` launches `ev_intro` as the active
  narrative incident (player-approved fixed text; `intro_cautious` flag),
  and the pre-arc spine is intro → arrival → ledger → intercept → m_vy_1.
  The captured **Recon One** team (renamed from "Second Expedition") is the
  arc through-line: reported missing in the intro, confirmed alive in the
  ledger mission, found in M2's cells, freed by end of M3. The Tender
  procession in `m_vy_arrival` is the game's first alien image (no combat).
  `m_relay` demoted to optional side content; its old `m_vy_1` unlock is
  superseded. `ev_first_contact` repositioned to optional `m_rival_stranded`
  at Address 11. Sanctioned core/schema changes: `newCampaign(seed,
content?)` (the intro reuses the existing incident shape);
  `MissionDef.launchCost` (optional int ≥ 0 overriding TACTICAL_LAUNCH_COST
  — `m_vy_intercept` sets 0 so the mandatory first battle can never be
  priced out of reach); save `version` 1 → 2 (stale pre-D-9 saves are
  rejected loudly per the bump-=-new-campaign policy, instead of loading
  into a spine that can no longer progress). Interactable kind stays
  `"console"` for the spires (renaming the enum is schema churn; flavored
  via mission/journal text instead). New canon in story-bible §10.
- **D-10 (Fable): Restructure 2 — "The Shut Door."** Player-locked canon:
  two worlds (**Andara**, Address 04, the valley; **Veyra**, Address 09,
  the god's seat where tribute flows and the taken are held); Veyra's gate
  (**the Door**) warded — inbound free, outbound only by the temple's word
  — as the canonical reason Recon One went silent and the way home is shut
  (mechanical deployment lock ships separately; `f_vy_call_intercepted`
  reserved as its hook); Seryn one of the **Graced**, sustained by **the
  Portion** (refined gate-light), his defection a withdrawal arc; a
  captured dose (`f_vy_sacrament_dose`, set on every M3 branch) joins
  `f_vy_godtech` in t_radiance_cell's visibleIf; **no rival gate program
  exists** — ev_first_contact and m_rival_stranded deleted with every
  trust_rival read/write (campaign seed now `trust_andara: 0`), Rival Bloc
  reduced to a dormant Act 2 seed, backlog B-1/B-3 deleted, B-8 reserved
  ("the weapon lowered first / memorizing every face"); valley mission
  rewritten around the falling boy (HIDE `trust_andara +2` / RUN 0 /
  violent −3) with all three routes converging on the one Veyra address
  (vy_spare_address folded out, B-7 retired); the rescue is a reunion —
  Recon One named (Ehlan, Barros, Kade, Imura; Barros served under
  Mercer); bible §7 rule 8: every mission must earn its slot. Story-gap
  list committed at `docs/story/gap-list.md`.
- **D-8 RESOLVED (user veto):** Base construction restored to prototype scope, reversing the earlier cut (see "Cut from prototype"). Facilities are content (`FacilityDef` + `facilities.json`) reusing the universal Effect/Condition vocabulary; one build at a time, costs paid on the `build` action, effects applied on completion during the endDay construction step (between Research and Recovery); no upkeep in v1 (revisit in 6.3). Spec: `docs/specs/facilities.md`.
- **D-12 (Opus): Spielsprache Deutsch.** Player-facing language is German; code stays English. Rules: (1) all player-visible UI strings live in one module `src/ui/strings.ts` (imported by `src/ui` and `src/tactics-render`) — no i18n framework, a future language is a file swap; (2) the player-visible strings the pure core writes (journal lines, banner-surfaced `RuleError` messages, the localized tactical outcome word) are German literals inside `src/core`, since ARCHITECTURE §1 forbids `core` importing from `ui`; (3) `src/data/content/*.json` remains a single-language German master — IDs/flags/variables/schemas unchanged; (4) technical docs (`ARCHITECTURE.md`, `docs/specs/*`) stay English, but spec-pinned canonical strings ("Zahltag verpasst.", the debrief line, etc.) are updated to their German canon together with the golden tests that assert them; (5) story docs under `docs/story/` are translated (structure, §-numbers, code tokens, and Mermaid node IDs preserved). Out of scope, documented: the low-level tactical combat log (a monospace debug readout using raw unit IDs, machine-parsed by `replay.ts`) and the unreachable battle-action `RuleError` diagnostics in `tactics.ts` stay English. Glossary: `docs/story/glossary-de.md`.
  - **D-12 follow-up (player terminology calls):** the Vault glossary was revised per player review — crossing → **Sprung/springen** (jump; incl. `Rettungsübergang` → `Rettungssprung`), the Luminous One → **der Erleuchtete** (was der Leuchtende; the lowercase adjective "leuchtend…" is untouched), sacrament → **die Segnung**, wardhouse/wardens → **das Wachhaus / die Wachen** (sing. die Wache), offworlder → **Außenweltler**, the Penitence → **die Bußstätte**. Applied across content JSON and story docs; the affected pinned test string (`Rettungssprung genehmigt`) updated with its golden tests.
- **D-13 (Präsentation): Wort-für-Wort-Texteinblendung im Erzähl-UI.** Aller
  Knotentext im Event-Screen erscheint Wort für Wort; Optionen werden erst
  eingeblendet, wenn der Text vollständig ist oder übersprungen wurde. Reine
  Präsentation im UI-Layer — der Sim-Core bleibt unberührt, die Animation läuft
  über `setTimeout` im UI, niemals im Reducer (ARCHITECTURE §1). Umsetzung:
  - **Konstanten (T, tunable)** in `src/ui/narration/parseNarration.ts`:
    `BASE_WORD_MS = 340` (Grundtempo/Wort; im Playtest vom D-13-Startwert 180
    hochgesetzt, der ~2× zu schnell wirkte, über 425 und dann 20% schneller auf
    340 eingependelt), `SHORT_PAUSE_MS = 600`, `LONG_PAUSE_MS = 1400`,
    `WORD_FADE_MS = 260`.
  - **Wort-Fade (Zusatz)**: jedes enthüllte Wort ist ein eigener `<span>` und
    blendet beim Erscheinen kurz ein (Opacity 0→1, `WORD_FADE_MS`). Nur `opacity`
    animiert, nie die Position — layout-sicher (D-13.6). `@keyframes` als
    einmalig injiziertes Stylesheet (App ist sonst inline-gestylt);
    `prefers-reduced-motion` schaltet die Animation ab; `off` rendert die Spans
    ohne Fade. Stabile Index-Keys sorgen dafür, dass bereits sichtbare Wörter
    beim nächsten Wort nicht neu animieren.
  - **Pausen-Marken** sind freistehende, beidseitig von Leerraum umgebene
    Ampersand-Läufe: „ & " = kurze Pause, „ && " = lange Pause. Genau die
    beidseitige-Leerraum-Regel trennt eine Marke von normalem Text: „A&B",
    „A &B", „A& B" behalten das „&"; nur der freistehende Fall („Tom & Jerry")
    ist eine Marke. Marken werden nie gerendert (jede kollabiert zu einem
    Leerzeichen). Hinweis: der Prosa-Beispielsatz „Command & Control" wäre unter
    dieser (durch die verbindlichen Pflicht-Tests „A&B"/„Tom & Jerry"
    festgelegten) Regel ebenfalls eine Marke; da bislang **kein** Content-Text
    ein „&" enthält, hat das keine Auswirkung — Autoren, die ein literales
    Ampersand-Phrase wollen, setzen es ohne beidseitigen Leerraum.
  - **Sanktionierte Schema-Ergänzung** (`GameState.settings`):
    `textAnimation: z.enum(["on","fast","off"]).default("on")` — „fast" halbiert
    alle Zeiten, „off" zeigt Text sofort. Defaultet, damit prä-D-13-Spielstände
    ohne Versionssprung laden (fehlendes Feld liest sich als „on"). Der
    Property-Test-Generator (`serialize.test.ts`) zieht das Feld zufällig.
  - **Toggle**: neue Aktion `updateSettings` (reiner Settings-Patch, kein
    Sim-Effekt) plus ein kompaktes Umschalt-Element im Event-Screen, das
    on → fast → off zyklisch schaltet.
  - **Geltungsbereich (D-13.5)**: nur Knotentexte animieren; Optionstexte,
    Debrief/Summary und Journal erscheinen sofort; Enemy-/Taktik-UI unberührt.
  - **Robustheit (D-13.6)**: „off", Skip und volle Animation enden im identischen
    Layout (der gerenderte String gleicht am Ende exakt `fullText`, keine
    Layout-Sprünge). Tests: `parseNarration.test.ts` (Markengrammatik +
    Zeitskalierung), `EventScreen.test.tsx` (Reveal-Kadenz, Options-Gate, Skip,
    „off"-Sofortpfad, Toggle→`updateSettings`), `reducer.test.ts`
    (`updateSettings`-Patch).
- **D-14 (Spieler-Entscheidung): Kanon-Terminologie.** Zwei Begriffe aus der
  D-10-Fassung sind vollständig abgelöst — sie gelten **nirgends mehr** als
  gültiger Kanon:
  - die menschlichen Verbesserten des Gottes heißen **die Gesegneten**
    (Einzahl: ein Gesegneter); der frühere Begriff „Begnadete" ist gestrichen.
  - die Drohnen haben zwei Rollen: **Träger-Drohnen** (unbewaffnet, Tribut) und
    **Wächter-Drohnen** (mit Stab); der frühere Kastenname „Flankierer" ist
    gestrichen.
    Durchgesetzt in der Struktur-Session: `events.json`-Prosa nutzte die neuen
    Begriffe bereits durchgehend; die verbliebene Content-Fundstelle
    (`heroes.json`), die Bibel (§3, §5, §8, §10), `glossary-de.md`, `arc-veyra.md`,
    `gap-list.md` und die Design-/Review-Docs wurden angeglichen. Repo-weite
    Prüfung: keine „Begnadete"/„Flankierer"-Vorkommen mehr außer diesem
    Protokolleintrag (dem einzigen autoritativen Nachweis der Ablösung).
- **D-15 (Struktur-Session): sichtbare Sperren.** `settings.showLockedOptions`
  default flipped `false → true` (supersedes the D-1 default; the flag itself and
  the D-1 debrief-hint hook stay). Sanctioned minimal schema addition:
  `EventOption.lockedReason?: string` (schemas.ts) — the event UI renders an
  ineligible option greyed out with this authored reason, or a generic
  "Voraussetzung nicht erfüllt" hint when absent. Consequence-lock shipped: with
  `vy_villager_killed == true`, M1's `o_vy1_worker_choice` (transport path) is
  visibly locked with `lockedReason` "Verschlossen: In Andara floss Blut. Der
  Alte schuldet euch nichts mehr."; the worker path is now gated solely on
  `vy_villager_killed == false`. Consequence of the default flip: router-style
  nodes whose sibling options were mutually-exclusive flag variants (e.g.
  `n_vy1_faces`, `n_vy2_router`) now show the non-matching siblings as locked —
  accepted for the prototype; the D-1 debrief hint is suppressed whenever locks
  are visible (its intended trade-off).
  - **Schwur-Streichung (mit D-15):** M1's oath removed. The "Es schwören" option
    and flag `f_vy_owe_ilo` deleted (all read/write sites, incl. one test line);
    `n_vy1_dessik` reframed — the old man from Andara offers the grain-cart ride
    without asking anything. `f_vy_dessik_refused` retired with it (its only gate
    was the worker path, now gated on not-killed). M2/M4 `f_vy_ilo_freed` /
    `f_vy_ilo_abandoned` verified unaffected (branch B still reached via
    `f_vy_approach_worker`). The unrouted `n_vy1_closed` patch is folded in as a
    gated pre-plan node `n_vy1_plan_closed` (killed route only); `n_vy1_plan`
    stays the single shared plan node.
- **D-16 (Struktur-Session): Bogenende in Akt 1.** The three M3 outcomes
  (`out_vy3_convinced` / `out_vy3_doubt` / `out_vy3_defeated` in
  `ev_vy_first_blade`) no longer unlock `m_vy_4`. All three resolve paths now
  route through two new nodes after `n_vy3_resolve` — `n_vy3_exfil`
  (Exfil-Übergang) → `n_vy3_exfil_end` (Bogenabschluss) — before re-branching to
  their respective outcome (by the `f_vy_first_*` flag). `m_vy_4` and `m_vy_5`
  remain in content but are unlocked by nothing (deferred to Act 2; JSON
  `_comment` on both mission defs and on the three outcomes). Reactivating them
  is an Act-2 decision.
- **Barros-Kanon (Struktur-Session, D-10-Korrektur):** the player-level decision
  "Chris = Barros" supersedes the older session-canon initial "J." from bible
  §10. bible §10 updated to **Sgt. Chris Barros**; bible §8 canon reference added
  per the session brief (Chris Barros / Ehlan / Kade / Imura, drones' two roles,
  the Gesegneten, the Portion, the Genommenen, Andara/Karsu). In-content address
  stays context-dependent ("Chris" where Mercer speaks personally, "Barros" /
  "Feldwebel Barros" in service register) — the already-merged patch texts
  already handle this and were left untouched.
