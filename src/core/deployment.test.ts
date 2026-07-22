/**
 * Deployment / operations — end-to-end verification (docs/specs/veyra-kaempfe.md
 * §2, §2a, §8.3–§8.5). Drives the WHOLE Veyra operation through the real reducer:
 * the Tal mission opens the deployment, every subsequent mission reuses the
 * locked squad and skips recovery, the "Weiter" transitions launch the next
 * mission directly, and homecoming's endDeployment restores normal recovery.
 */
import { describe, expect, it } from "vitest";
import { endDay } from "./economy.js";
import { newCampaign } from "./campaign.js";
import { deploymentNextMission, launchMission, newlyUnlockedMissions } from "./missions.js";
import { eligibleOptions } from "./narrative.js";
import { apply, type ReducerCtx } from "./reducer.js";
import { mulberry32 } from "./rng.js";
import { playBattle } from "../test/greedyBattle.js";
import { loadTestContent } from "../test/content.js";
import type { ContentBundleT, GameStateT } from "../data/schemas.js";

// Roster-Erweiterung (Softlock-Fix): the shipped start roster is now four heroes,
// so the operation fields the spec-canonical 4-squad (§7: 4 vs 6 without Seryn)
// with the REAL starting cast — no test-only grunts needed.
const CONTENT: ContentBundleT = loadTestContent();
const ctx = (): ReducerCtx => ({ content: CONTENT, rng: mulberry32(7) });

/** The spec-canonical operation squad (§7): the four real starters against the
 * six breakout drones without the Seryn ally — "eng, aber schaffbar". */
const OP_SQUAD = ["h_mercer", "h_okafor", "h_brandt", "h_okonkwo"];

/** The smallest legal operation squad (veyra-kaempfe §7, squad.min 3), for the
 * lifecycle/mechanic tests that don't fight a battle. */
const TRIO = ["h_mercer", "h_okafor", "h_brandt"];

/** Auto-play a narrative mission to completion: at each node take the first
 * eligible option. Deterministic (narrative consumes no RNG, D-5). */
function autoNarrative(state: GameStateT): GameStateT {
  let s = state;
  let guard = 0;
  while (s.activeMission?.kind === "narrative") {
    if (guard++ > 200) throw new Error("narrative did not terminate");
    const opt = eligibleOptions(s, CONTENT).find((o) => o.eligible);
    if (!opt) throw new Error(`no eligible option at node ${s.activeMission.node}`);
    s = apply(s, { type: "chooseEventOption", option: opt.option }, ctx());
  }
  return s;
}

/** Launch the operation's next mission the way the "Weiter" button does (§2a):
 * directly, with the locked deployment squad. */
function weiter(state: GameStateT, mission: string): GameStateT {
  return apply(state, { type: "launchMission", mission, squad: state.deployment!.squad }, ctx());
}

/** A campaign parked at the worldgate with only the Tal mission available (the
 * real four-hero start roster). The default seed is one where the greedy driver
 * clears both operation battles under the Balance-Rebase v3 numbers with the
 * canonical roster (intercept and the ally-less 4-vs-6 breakout the auto-played
 * duel path produces). */
function startOfOperation(seed = 1): GameStateT {
  const s = newCampaign(seed, CONTENT);
  s.activeMission = null;
  s.missions.available = ["m_vy_arrival"];
  return s;
}

const fatigueOf = (s: GameStateT, hero: string): number => s.heroes.find((h) => h.hero === hero)!.fatigue;

describe("veyra-kaempfe §2 — deployment lifecycle", () => {
  it("the Tal mission opens the deployment and locks the squad", () => {
    const s0 = startOfOperation();
    const squad = TRIO; // min 3 (veyra-kaempfe §7)
    const s1 = apply(s0, { type: "launchMission", mission: "m_vy_arrival", squad }, ctx());
    expect(s1.deployment).toEqual({ operation: "vy", squad });
  });

  it("within a deployment the exhausted lock (fatigue ≥ 80) does not apply", () => {
    let s = startOfOperation();
    s.heroes.find((h) => h.hero === "h_okafor")!.fatigue = 95; // exhausted
    // Outside a deployment an exhausted hero blocks the launch…
    expect(() => launchMission(s, CONTENT, "m_vy_arrival", TRIO)).toThrow();
    // …but once the operation is running (squad already locked), the team must
    // press on tired. Simulate by opening the deployment with a fresh squad then
    // fatiguing a member and continuing to the next operation mission.
    s = apply(startOfOperation(), { type: "launchMission", mission: "m_vy_arrival", squad: TRIO }, ctx());
    s = autoNarrative(s);
    s.heroes.find((h) => h.hero === "h_okafor")!.fatigue = 95;
    const next = weiter(s, "m_vy_ledger"); // continuation ignores exhaustion
    expect(next.activeMission?.kind).toBe("narrative");
    expect(next.activeMission && "squad" in next.activeMission ? next.activeMission.squad : []).toEqual(TRIO);
  });

  it("endDay recovery skips the deployed squad, then resumes after endDeployment", () => {
    let s = apply(startOfOperation(), { type: "launchMission", mission: "m_vy_arrival", squad: TRIO }, ctx());
    s = autoNarrative(s); // arrival done; deployment still running
    s.heroes.forEach((h) => (h.fatigue = 40));
    const rested = endDay(s, ctx());
    // On operation → no recovery; both heroes stay at 40.
    expect(fatigueOf(rested, "h_mercer")).toBe(40);
    expect(fatigueOf(rested, "h_okafor")).toBe(40);
    // Clear the deployment (as homecoming's endDeployment effect does) → recovery resumes.
    const off = structuredClone(rested);
    off.deployment = null;
    const recovered = endDay(off, ctx());
    expect(fatigueOf(recovered, "h_mercer")).toBeLessThan(40);
  });
});

describe("veyra-kaempfe §8.3 — full operation chain end-to-end", () => {
  it("Tal → intercept → penitence chain → breakout → homecoming, deployment ends, recovery resumes", () => {
    const squad = OP_SQUAD;
    const fatigue: Array<{ after: string; mercer: number }> = [];
    const mark = (s: GameStateT, after: string) => fatigue.push({ after, mercer: fatigueOf(s, "h_mercer") });

    // 1. Tal (arrival) opens the deployment.
    let s = apply(startOfOperation(), { type: "launchMission", mission: "m_vy_arrival", squad }, ctx());
    expect(s.deployment).not.toBeNull();
    s = autoNarrative(s);
    expect(s.missions.available).toContain("m_vy_ledger");
    mark(s, "arrival");

    // 2. Ledger (narrative continuation).
    s = weiter(s, "m_vy_ledger");
    s = autoNarrative(s);
    expect(s.missions.available).toContain("m_vy_intercept");
    mark(s, "ledger");

    // 3. Intercept (tactical) — win it.
    s = weiter(s, "m_vy_intercept");
    expect(s.activeMission?.kind).toBe("tactical");
    s = playBattle(s, CONTENT, ctx()).state;
    expect(s.missions.completed.at(-1)).toMatchObject({ mission: "m_vy_intercept", outcome: "victory" });
    expect(s.missions.available).toContain("m_vy_1");
    expect(s.flags.f_vy_signal_jammed).toBe(true);
    mark(s, "intercept");

    // 4. Penitence chain: pilgrim roads → penitence → first blade.
    for (const [mission, unlocks] of [
      ["m_vy_1", "m_vy_2"],
      ["m_vy_2", "m_vy_3"],
      ["m_vy_3", "m_vy_breakout"],
    ] as const) {
      s = weiter(s, mission);
      s = autoNarrative(s);
      expect(s.missions.available).toContain(unlocks);
      mark(s, mission);
    }

    // 5. Breakout (tactical) — win it. The auto-played first_blade takes the duel
    // (defeated) path with this squad, so no Seryn ally spawns; the greedy driver
    // gets the four-strong squad through the six drones and into the gate court
    // (§7/§8.2 harder "4 vs 6 without Seryn" case). f_vy_first_defeated is set here.
    expect(s.flags.f_vy_first_defeated).toBe(true);
    s = weiter(s, "m_vy_breakout");
    expect(s.activeMission?.kind).toBe("tactical");
    s = playBattle(s, CONTENT, ctx()).state;
    expect(s.missions.completed.at(-1)).toMatchObject({ mission: "m_vy_breakout", outcome: "victory" });
    expect(s.missions.available).toContain("m_vy_home");
    expect(s.deployment).not.toBeNull(); // still running until homecoming
    mark(s, "breakout");

    // 6. Homecoming (narrative) — its outcome carries endDeployment.
    s = weiter(s, "m_vy_home");
    s = autoNarrative(s);
    expect(s.deployment).toBeNull();
    mark(s, "homecoming");

    // Fatigue rose monotonically across the operation (no rest on the road)…
    const merc = fatigue.map((f) => f.mercer);
    for (let i = 1; i < merc.length; i++) expect(merc[i]!).toBeGreaterThanOrEqual(merc[i - 1]!);
    expect(merc.at(-1)!).toBeGreaterThan(0);

    // …and recovery works again now the deployment is over.
    const recovered = endDay(s, ctx());
    expect(fatigueOf(recovered, "h_mercer")).toBeLessThan(fatigueOf(s, "h_mercer"));
  });
});

describe("veyra-kaempfe §2a — direct mission transitions", () => {
  it("offers exactly one next mission for the Weiter button after each operation mission", () => {
    let s = apply(startOfOperation(), { type: "launchMission", mission: "m_vy_arrival", squad: TRIO }, ctx());
    const before = s;
    s = autoNarrative(s);
    const unlocked = newlyUnlockedMissions(before, s);
    // Exactly one new operation mission → the summary shows "Weiter: …".
    expect(deploymentNextMission(s, CONTENT, unlocked)).toBe("m_vy_ledger");
  });

  it("narrative→tactical: first_blade's Weiter launches the breakout directly with the locked squad", () => {
    // Walk the chain up to first_blade's completion (real 4-squad wins the
    // intercept battle at seed 1 — see the §8.3 chain).
    let s = apply(
      startOfOperation(),
      { type: "launchMission", mission: "m_vy_arrival", squad: OP_SQUAD },
      ctx(),
    );
    s = autoNarrative(s);
    s = weiter(s, "m_vy_ledger");
    s = autoNarrative(s);
    s = weiter(s, "m_vy_intercept");
    s = playBattle(s, CONTENT, ctx()).state;
    s = weiter(s, "m_vy_1");
    s = autoNarrative(s);
    s = weiter(s, "m_vy_2");
    s = autoNarrative(s);
    const before = s;
    s = weiter(s, "m_vy_3");
    s = autoNarrative(s); // first_blade resolved → breakout unlocked
    const next = deploymentNextMission(s, CONTENT, newlyUnlockedMissions(before, s));
    expect(next).toBe("m_vy_breakout");
    // The Weiter button dispatches launchMission directly — straight into the battle.
    const launched = weiter(s, next!);
    expect(launched.activeMission?.kind).toBe("tactical");
    expect(
      launched.activeMission && "squad" in launched.activeMission ? launched.activeMission.squad : [],
    ).toEqual(OP_SQUAD);
  });

  it("tactical→narrative: breakout's Weiter launches homecoming directly; worldgate fallback also works", () => {
    // Fast-forward to a won breakout by unlocking + launching it within a deployment.
    let s = apply(
      startOfOperation(),
      { type: "launchMission", mission: "m_vy_arrival", squad: OP_SQUAD },
      ctx(),
    );
    s = autoNarrative(s);
    s = weiter(s, "m_vy_ledger");
    s = autoNarrative(s);
    s = weiter(s, "m_vy_intercept");
    s = playBattle(s, CONTENT, ctx()).state;
    for (const m of ["m_vy_1", "m_vy_2", "m_vy_3"]) {
      s = weiter(s, m);
      s = autoNarrative(s);
    }
    const before = s;
    s = weiter(s, "m_vy_breakout");
    s = playBattle(s, CONTENT, ctx()).state;
    const next = deploymentNextMission(s, CONTENT, newlyUnlockedMissions(before, s));
    expect(next).toBe("m_vy_home");

    // Path A — Weiter button: launch homecoming directly (tactical → narrative).
    const viaWeiter = weiter(s, "m_vy_home");
    expect(viaWeiter.activeMission?.kind).toBe("narrative");

    // Path B — worldgate fallback: the mission is on the available list and
    // launches through the normal action with the (ignored) UI squad.
    expect(s.missions.available).toContain("m_vy_home");
    const viaWorldgate = apply(s, { type: "launchMission", mission: "m_vy_home", squad: [] }, ctx());
    expect(viaWorldgate.activeMission?.kind).toBe("narrative");
    expect(
      viaWorldgate.activeMission && "squad" in viaWorldgate.activeMission
        ? viaWorldgate.activeMission.squad
        : [],
    ).toEqual(OP_SQUAD);
  });
});
