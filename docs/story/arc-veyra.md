<!--
FABLE AMENDMENTS — apply during the M1–M5 content-entry session, NOT the §8
engine session. Recorded here so the canon is not lost; the arc spec below is
reproduced verbatim.

1. This file is the committed spec (done).
2. Arc unlock: add { "type": "unlockMission", "mission": "m_vy_1" } to
   m_relay's victoryEffects. Do NOT invent new condition types. (Deferred:
   wiring it before m_vy_1 exists fails content validation; apply it in the
   session that authors m_vy_1.)
3. Canon, M3 fight path: the one carried home is the First — Seryn Vael,
   wounded. Frame all related text on this thesis: a traitor to his people who
   defects to free them from their false god. His fight-path recruitment must
   be gated on the doubt variable reaching a threshold so the defection is
   earned by the player's arguments, not granted by victory; if the spec
   already does this, keep it.
4. M4–M5 session (plan task 6.2-A3; Fable resolutions B–E) applied:
   - B: TechDef gained `visibleIf: Condition[]` (the only sanctioned schema
     edit). t_radiance_cell gated on f_vy_godtech, t_projection_theory on
     f_vy_watched_god. Setting the arc flags is what makes the techs visible —
     no separate unlockTech effect exists or is needed.
   - M4 shipped as the ARC-D3 **narrative fallback**, not tactical: the
     tactical design needs reinforcement waves + flag-conditional battle init
     (alerted start on f_vy_ilo_abandoned, deploy-back on f_vy_alarm,
     Seryn's pre-deactivated pillar) the tactics engine does not express;
     adding them is a tactics-engine change, out of this content session's
     scope. The narrative version honors every flag beat and sets identical
     flags (f_vy_godtech, exotics +3, unlock m_vy_5).
   - C: §6 full-arc golden tests deferred to post-balance (kept out here).
   - The M5 epilogue's 4-axis variation is folded into per-ending outcome
     labels + journal lines (the engine has no conditional-text concatenation).
   - ev_vy_dessik_word's queue is wired into M2's free-Ilo option (+5 days),
     the kept-promise symmetry §5 calls for.
6. D-10 ("The Shut Door" restructure, Fable session) further supersedes
   parts of this spec; the spec below stays verbatim as history. What
   changed:
   - **Two worlds.** The premise's single planet is split: the valley
     (arrival/ledger/intercept) is **Andara**, Address 04; **Veyra**
     (Address 09) is the god's seat, one crossing beyond, holding every
     m_vy_1..5 location. Bible §10–§11 are now the geography authority.
   - **The Shut Door.** Veyra's gate is warded — inbound free, outbound
     only by the temple's word. This is the canonical reason Recon One
     went silent; the tribute call (m_vy_intercept) is the stolen way
     home. All Veyra-side text assumes it. The mechanical deployment lock
     ships in a later session (f_vy_call_intercepted is its hook).
   - **The Portion / the Graced.** Seryn is sacrament-sustained (bible
     §3); M3 now yields a captured dose on every branch
     (`f_vy_sacrament_dose`), and t_radiance_cell's visibleIf gates on
     any(dose, f_vy_godtech) — the §2.2 f_vy_godtech-only gate is
     superseded. His defection carries a withdrawal arc (text-only).
   - **No rival gate program exists.** ev_first_contact, m_rival_stranded,
     trust_rival, and the +30d re-fire are deleted entirely (bible §4
     reduced to a dormant Act 2 seed; backlog B-1/B-3 deleted, B-8
     reserved). §1's "Legal note" stands.
   - **Valley drama + convergence.** The arrival mission's escape gained
     the falling-boy choice (HIDE/RUN, `trust_andara` +2/0, flags
     f_vy_boy_hidden/f_vy_boy_run) beside the existing violent branch
     (trust_andara −3, vy_villager_killed kept; vy_spare_address folded
     out). All three routes converge on the same Veyra address, and the
     boy and his father are recognized on Veyra in m_vy_1 (three
     variants). The M2/M3 rescue is written as a reunion (Recon One
     roster named, bible §10).
5. D-9 (early-campaign restructure, Fable session) supersedes parts of this
   spec; the spec below is kept verbatim as history. What changed:
   - "Second Expedition" is renamed **Recon One** everywhere (story-bible
     §10): a four-member survey team, captured pre-campaign; the M3
     addPersonnel +4 is canonically Recon One returning to duty.
   - Amendment 2 (m_relay → m_vy_1 unlock) is REVERSED: m_vy_1 now unlocks
     from m_vy_intercept's victoryEffects. m_relay is an optional side
     tactical (tech-gated, no spine unlock). New spine before M1:
     ev_intro (auto-launch at newCampaign) → m_vy_arrival → m_vy_ledger →
     m_vy_intercept (tactical) → m_vy_1.
   - M1's entry node is rewritten (the player has already crossed to Veyra
     three times by then — arrival, ledger, intercept; more with intercept
     retries) and routes on f_vy_transport (Karsu porter papers).
   - ev_first_contact moved off the campaign spine to m_rival_stranded
     ("Distress: Address 11"), unlocked by m_vy_intercept victory.
-->

# Arc: The Luminous One (Veyra) — Content Spec

Status: FABLE-AUTHORED, ready for content entry. Target files: `src/data/content/events.json`, `missions.json`, `heroes.json`, `techs.json`, `maps.json` (+ small schema addition, §8).
Fits: D-3 (injuries, no permadeath), D-5 (deterministic narrative), D-6 (branch-and-bottleneck), D-1 (hidden locked options + debrief hint).

---

## 0. Arc decisions log

- **ARC-D1 (default):** M2 assault-path defeat is narratively scripted, not a tactical battle. Rationale: cost (map + AI tuning) and player frustration at rigged fights. Alternative if revisited: "survive 3 turns" tactical.
- **ARC-D2 (default):** M3 duel vs. the First is a narrative skill confrontation, not tactical.
- **ARC-D3 (default):** One tactical mission in the arc (M4), with a narrative fallback node if the tactical engine/map isn't ready at entry time.
- **ARC-D4 (default):** M3 location varies by path (escape route vs. execution yard) so M1/M2 choices are not invalidated.
- **ARC-D5 (default):** Seryn recruit timing is path-dependent (M3 if talked down, post-M5 if defeated and the god was watched).

## 1. Premise

Planet **Veyra**: theocratic society worshipping **the Luminous One (Oru)** — in truth a survivor of a precursor species using projection/exo-shell technology to appear divine. Worldgate's **Second Expedition** (generic personnel, not heroes) was captured on arrival and is held in the **Penitence**, a basilica-prison. The god's champion is **Seryn Vael, "the First Blade"** — a true believer, not a cynic. Arc theme: faith vs. evidence; every path shakes Veyran orthodoxy differently.

Legal note: all names original; premise-level genre similarity only.

## 2. Content additions

### 2.1 Hero (append to heroes.json)

```json
{
  "id": "h_seryn",
  "name": "Seryn Vael",
  "archetypes": ["duelist"],
  "skills": { "combat": 7, "science": 1, "engineering": 1, "diplomacy": 4, "resolve": 6 },
  "bio": "First Blade of the Luminous One. Faith broken or bent — but the sword arm never wavered."
}
```

If the archetype enum is closed, either add `"duelist"` to the enum or use `["soldier"]`; prefer adding the enum value.
Seryn is NOT in the starting roster. Added at runtime via `addHero` effect (§8).

### 2.2 Techs (append to techs.json)

```json
{
  "id": "t_radiance_cell",
  "name": "Radiance Cell",
  "description": "Reverse-engineered temple power core. Dense, stable, and not remotely holy.",
  "cost": 30,
  "prerequisites": [],
  "effects": [{ "type": "log", "text": "The 'holy fire' is a power cell. A very good one." }]
}
```

```json
{
  "id": "t_projection_theory",
  "name": "Projection Theory",
  "description": "Field recordings of the Luminous One reveal how a being can appear anywhere it is worshipped.",
  "cost": 45,
  "prerequisites": ["t_radiance_cell"],
  "effects": [{ "type": "log", "text": "Not omnipresence. Emitters." }]
}
```

Both techs are **hidden until unlocked** by arc flags (see M4/M5). If the tech list has no visibility gating, gate via `prerequisites` + an `unlockTech`-style flag pattern already used elsewhere; if neither exists, simplest: techs only appear in the research UI when a condition `flagSet` passes — implementers: reuse whatever gating `unlockMission` uses; if nothing exists, add `visibleIf: Condition[]` to Tech schema (small, Fable-approved).

### 2.3 Injuries

Reuses existing `inj_wounded`, `inj_shaken`. No new injuries.

### 2.4 Map (tactical, M4 only)

`map_temple_vault`, ~10×12: entry hall (open, low cover), colonnade flanks (half cover), inner vault behind **two ward-pillar interactables** (both must be deactivated to open the vault door; interact = 1 AP, one step each). Guard spawns: 5 temple guards baseline; +2 reinforcement spawn trigger, see M4 flag hooks. Reuse existing unit types where possible; if a melee-heavy "zealot" type is wanted, clone the closest existing unit type with +move/−range — do not invent new abilities.

## 3. Flags and variables

All arc flags prefixed `f_vy_`. All deterministic (D-5). Skill checks = existing narrative-engine gating (threshold on squad-best skill), not RNG.

| Flag                  | Set in   | Meaning / consumed by                                                                         |
| --------------------- | -------- | --------------------------------------------------------------------------------------------- |
| f_vy_intel_comms      | M1       | Intercepted temple comms (science). Unlocks "explain tech" strong path in M3.                 |
| f_vy_intel_patrols    | M1       | Patrol timing known. Eases infiltration checks in M2.                                         |
| f_vy_intel_pilgrims   | M1       | Doctrine knowledge. Unlocks "convince" strong path in M3.                                     |
| f_vy_approach_uniform | M1       | Chose guard-uniform infiltration. Routes M2.                                                  |
| f_vy_approach_worker  | M1       | Chose provision-worker infiltration. Routes M2.                                               |
| f_vy_approach_assault | M1       | Chose open assault. Routes M2.                                                                |
| f_vy_uniform_knockout | M1       | Got uniform by knocking out a guard.                                                          |
| f_vy_body_hidden      | M1       | Hid the guard well (follow-up choice). Absence + knockout ⇒ M2 complication.                  |
| f_vy_uniform_stolen   | M1       | Got uniforms from the bath-house (no violence). Missing rank-seals ⇒ M2 inner-gate challenge. |
| f_vy_owe_ilo          | M1       | Swore to broker Dessik to free his son Ilo.                                                   |
| f_vy_captured         | M2       | Assault failed; heroes imprisoned, gear confiscated.                                          |
| f_vy_ilo_freed        | M2       | Kept the promise.                                                                             |
| f_vy_ilo_abandoned    | M2       | Broke the promise. Consequences: M2 betrayal exit + M4 alerted start.                         |
| f_vy_alarm            | M2       | Escape went loud (any path). M3 opens mid-pursuit; minor M4 penalty.                          |
| f_vy_first_convinced  | M3       | Talked Seryn down on moral grounds.                                                           |
| f_vy_first_doubt      | M3       | Shook Seryn with the tech argument.                                                           |
| f_vy_first_defeated   | M3       | Beat Seryn in the duel; he is a wounded captive.                                              |
| f_vy_seryn_recruited  | M3 or M5 | Seryn on the roster (addHero fired).                                                          |
| f_vy_expedition_freed | M2/M3    | Second Expedition rescued (bottleneck — always true by end of M3).                            |
| f_vy_godtech          | M4       | Vault tech secured. Unlocks t_radiance_cell + M5.                                             |
| f_vy_watched_god      | M5       | Observed and recorded. Unlocks t_projection_theory.                                           |
| f_vy_fought_god       | M5       | Attacked. God escapes; anchor destroyed.                                                      |
| f_vy_anchor_destroyed | M5       | Veyra freed of the god's presence. +support, queues gratitude event.                          |

Variables: `doubt` (int, 0–3). +1 each from f_vy_intel_comms-style evidence beats (marked below). Consumed in M3: talk-success thresholds drop as doubt rises. Keeps early optional content mechanically relevant.

## 4. Mission specs

Mission list entry: the arc unlocks as one visible mission at a time (`unlockMission` chain). Squad: h_mercer + h_okafor **required** for M1–M3 (narrative assumes both voices). M4/M5 free squad selection, h_seryn selectable if recruited.

---

### M1 — `m_vy_1` "Pilgrim Roads" (narrative)

Unlock: arc trigger (existing campaign hook or immediately after current content; implementer: append to whatever currently gates new missions).
**Entry `n_arrive`:** Gate opens on a terraced holy city. Briefing text: Second Expedition's last transmission, 9 days silent; local chatter says "heretics await the Penitence's mercy."
**`n_gather` (hub, pick up to 2 of 3 — implement as revisitable hub with per-option once-flags):**

- Listen among pilgrims [diplomacy ≥ 4] → f_vy_intel_pilgrims, doubt +0, text seeds doctrine ("Oru walks where he is worshipped").
- Shadow the patrols [combat ≥ 5] → f_vy_intel_patrols.
- Tap the temple relay [science ≥ 6, Okafor line] → f_vy_intel_comms, **doubt +1** (encrypted burst traffic — gods don't need encryption).
  **`n_plan` (decision hub):**

1. **Guard uniforms** → f_vy_approach_uniform → `n_uniform`
2. **Provision workers** → f_vy_approach_worker → `n_dessik`
3. **Open assault** → f_vy_approach_assault → mission end (text: you gate back for weapons; foreboding tone). Effect: unlockMission m_vy_2.
   **`n_uniform`:**

- Knock out a lone guard [combat ≥ 5] → f_vy_uniform_knockout → follow-up choice: hide him in the cistern (f_vy_body_hidden) or leave him and move fast (no flag).
- Find another way: bath-house theft during vigil hour → f_vy_uniform_stolen (text notes the missing rank-seals — visible cost, D-2).
  Both → mission end, unlockMission m_vy_2.
  **`n_dessik`:** Broker Dessik supplies work passes **only if** you swear to bring out his son Ilo, condemned as a smuggler. Accept → f_vy_owe_ilo, mission end, unlockMission m_vy_2. Refuse → return to `n_plan` (worker option now disabled — Dessik won't deal).
  Debrief hint (D-1): if no intel flags set — "Locals talk. Next time, someone should listen before the plan is made."

---

### M2 — `m_vy_2` "The Penitence" (narrative, router)

**`n_router`:** conditions on approach flags → three branches. Bottleneck target: end state = confrontation with the First imminent, expedition located.

**Branch A (uniform), `a1_outer_gate`:**

- If f_vy_uniform_knockout and NOT f_vy_body_hidden: guard was found; gates on alert → forced complication: talk past a suspicious sergeant [diplomacy ≥ 5] or overpower the checkpoint quietly [combat ≥ 6]; failure of both available checks → f_vy_alarm.
- If f_vy_uniform_stolen: inner-gate seal challenge → bluff as new transfers [diplomacy ≥ 5, easier with f_vy_intel_pilgrims: threshold 4] or slip through the ossuary passage [f_vy_intel_patrols required].
  `a2_cells`: locate Second Expedition. Exit choice: **quiet route** (slow; text tension, no flag) vs. **bell-tower diversion** (fast, f_vy_alarm). Either way → `n_bottleneck`.

**Branch B (worker), `b1_kitchens`:** enter with the grain carts; meal rounds give cell-block access (text: the prison runs on ritual — predictable). Locate expedition. **Ilo decision** (only if f_vy_owe_ilo, which is always true on this branch):

- Free Ilo too → f_vy_ilo_freed; harder exfil: one extra check [resolve ≥ 5] or accept f_vy_alarm.
- Leave him → f_vy_ilo_abandoned → **immediate consequence:** Dessik, watching the gate, tips the wardens; exit becomes a running fight: one required hero gains inj_shaken, f_vy_alarm. (Broken promises bite now, not only later.)
  → `n_bottleneck`.

**Branch C (assault), `c1_assault` (ARC-D1 — scripted, no tactical):** Three beats of escalating text; the wall guns are precursor-tech, shields ignore small arms. No winnable option is presented; the two choices offered ("press the breach" / "fall back to the gate") both end in capture — the fall-back version spares injuries, the press version adds inj_wounded to one hero. Effects: f_vy_captured, text confirms gear confiscated. Wake in the cells beside the Second Expedition — the rescue inverted. → `n_bottleneck`.

**`n_bottleneck`:** The First Blade knows. Text varies: (A/B) alarm bells or silent lockdown as you move the prisoners; (C) cell doors open at dawn — the yard awaits. Mission end. unlockMission m_vy_3.

---

### M3 — `m_vy_3` "The First Blade" (narrative — ARC-D2)

**Entry variants (router on flags):**

- A/B paths: Seryn and his honor guard corner the group in the processional court mid-escape.
- C path: execution yard at dawn; Seryn reads the sentence: _"All of you burn at dusk. Oru is merciful — dusk is hours away."_
  Same core scene either way (ARC-D4): Seryn will not simply be walked past.

**`n_confront` (decision):**

1. **Convince — moral argument** ("A god who feeds on executions deserves no First Blade.") Check: diplomacy ≥ 7 − doubt; threshold −1 if f_vy_intel_pilgrims (you can quote his own scripture back at him). Success → f_vy_first_convinced.
2. **Explain — there is no god** (Okafor: encryption, power signatures, projection artifacts). Check: science ≥ 7 − doubt; threshold −2 if f_vy_intel_comms (you have the recordings). Success → f_vy_first_doubt.
3. **Fight him.** → `n_duel`.
   **Failure of 1 or 2** (check not met): Seryn's faith hardens — auto-routes to `n_duel` after one more exchange. (No dead ends; talk paths risk the duel's injury cost.)

**`n_duel`:** Structured 3-beat narrative duel, deterministic: outcome fixed (heroes win — he is one man against a team and the freed expedition), cost varies by combat skill: squad-best combat ≥ 7 → Seryn takes inj_wounded only; < 7 → additionally one hero gains inj_wounded. Effects: f_vy_first_defeated, injury h_seryn inj_wounded. Text: you carry the First Blade out on a grain cart. He does not thank you.

**`n_resolve`:**

- f_vy_first_convinced: Seryn orders the honor guard to stand down, walks out WITH you. Effects: addHero h_seryn, f_vy_seryn_recruited. His defection is the loudest possible heresy — text notes the city will not forget.
- f_vy_first_doubt: Seryn lets you pass and follows "to see the proof with his own eyes." Effects: addHero h_seryn, f_vy_seryn_recruited (mechanically recruited; text frames him as conditional — pays off in M5).
- f_vy_first_defeated: he is a prisoner in the infirmary, not a hero yet (recruit possible post-M5, ARC-D5).
  All: f_vy_expedition_freed, addPersonnel +4 (§8; fallback: intel +15 and log text if effect not added), unlockMission m_vy_4. C-path extra: gear recovered from the vestry on the way out (text only — no mechanical gear system exists; do not invent one).
  Debrief hint if duel happened with talk options never attempted: "He listened for a moment, before the swords. Worth remembering."

---

### M4 — `m_vy_4` "Relic Vault" (tactical; narrative fallback per ARC-D3)

Objective: seize precursor artifacts from the temple armory to (a) arm research, (b) locate the god's sanctum.
**Tactical version:** map_temple_vault. Objective: deactivate both ward-pillars (interactables), then hold the vault room 1 turn while Okafor-or-any-scientist archetype extracts the core (third interactable), then exfil zone. Enemy: 5 guards; reinforcement trigger (+2) on turn 3 **or** immediately at deployment if f_vy_ilo_abandoned (Dessik's tip made the temple paranoid — delayed consequence, D-2 hidden). If f_vy_alarm: player deploys 1 tile-row further from the objective (minor). If f_vy_seryn_recruited and h_seryn in squad: one ward-pillar starts deactivated (he knows the rites).
**Narrative fallback (if engine/map unready):** same beats as a 5-node event with combat/science checks; must set identical flags.
Outcome: f_vy_godtech, exotics +3, unlock t_radiance_cell (visible), unlockMission m_vy_5. Downed heroes per D-3 standard handling.

---

### M5 — `m_vy_5` "The Luminous One" (narrative)

Entry: the vault core resonates with a sanctum in the caldera; the team tracks it. **`n_witness`:** the god manifests — a tall figure of light attended by machinery the texts never mention. If Seryn present (any recruit state incl. captive brought as witness — implementer: condition on f_vy_seryn_recruited OR f_vy_first_defeated): one paragraph of him watching.

**`n_decide`:**

1. **Watch and record.** Effects: f_vy_watched_god, unlock t_projection_theory, intel +20. The being finishes its rite and departs; you have everything on sensors. If f_vy_first_doubt: Seryn's conversion completes (text). If f_vy_first_defeated: Seryn, watching from the ridge, asks to speak — **queueEvent ev_vy_seryn_oath, fireOnDay +2** → that event: addHero h_seryn, f_vy_seryn_recruited.
2. **Attack.** Scripted: the being shields, ascends, gates out — **escapes regardless** (fixed). But the sanctum anchor shatters in the exchange: f_vy_fought_god, f_vy_anchor_destroyed, variable support +2, queueEvent ev_vy_gratitude (fireOnDay +3: Veyran provisional council sends tribute — funds +40, log). Cost: one required hero inj_shaken (staring into that light), **no t_projection_theory**, and if f_vy_first_defeated: Seryn breaks free during the chaos to shield his god and is gone — recruit permanently lost (text: he owed it a death, if nothing else).
   Trade-off is explicit and exclusive: **science (tech + Seryn-on-all-paths) vs. politics (support + funds + a freed world)**.

**Epilogue node:** varies on 4 axes (approach, Ilo, Seryn state, watch/fight). Write 1 short paragraph per axis, concatenated by condition — not a combinatorial explosion (4 slots, 2–3 variants each ≈ 10 paragraphs).

## 5. Follow-up events (events.json)

- `ev_vy_seryn_oath` — as above (watch + defeated path recruit).
- `ev_vy_gratitude` — as above (fight path payoff).
- `ev_vy_dessik_word` — queued (+5 days) if f_vy_ilo_freed: Dessik's smuggler network feeds Worldgate intel: intel +10, log. (Kept promises also pay late — symmetry with the betrayal.)

## 6. Outcome matrix (for tests)

Minimum end-states to golden-test after a scripted full-arc run:

1. Uniform-knockout-hidden / talk-convince / watch → f_vy_seryn_recruited at M3, t_projection_theory unlocked, no arc injuries.
2. Worker / abandon Ilo / duel / fight god → Seryn permanently lost, support +2, funds event queued, ≥2 injuries incurred across arc, M4 started alerted.
3. Assault / explain-with-comms / watch → f_vy_captured true, doubt ≥ 1, recruit at M3, expedition freed.
   Assert: f_vy_expedition_freed true in ALL runs; exactly one of watched/fought set; mission chain unlocks strictly in order.

## 7. Implementation tasks (sequential, per session)

1. **[S] Schema + validation:** add `addHero` (+ optional `addPersonnel`) effect types to Effect union in schemas.ts; interpreter cases; validator: `addHero` must reference heroes.json id not already in starting roster. Tests for both. (§8)
2. **[S] Content entry M1–M3:** heroes.json (h_seryn), events + missions for m_vy_1..3 exactly per §4; run content validator; hand-test on deployed build.
3. **[S] Content entry M4–M5 + follow-ups:** techs, m_vy_4 (narrative fallback first if 4.3 not merged; tactical map + battle def when it is), m_vy_5, §5 events, §6 golden tests.

## 8. Engine gaps (blocking, small)

- **`addHero` effect** `{ type: "addHero", hero: Id }` → pushes fresh HeroState (xp 0, level 1, fatigue 0, no injuries) for the given hero id; no-op with warning if already present.
- **`addPersonnel` effect** `{ type: "addPersonnel", amount: int }` → personnel.total += amount. Optional; fallback documented in M3.
- **Tech visibility gating** — only if none exists; see §2.2.
  No other engine work required; everything else uses the existing Effect/Condition vocabulary. If any condition/check syntax referenced here doesn't match the narrative-engine spec exactly, the spec wins — map intent, don't extend the DSL.
