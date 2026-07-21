import { describe, expect, it } from "vitest";
import type { ContentBundleT } from "../data/schemas.js";
import { INTRO_EVENT, newCampaign } from "./campaign.js";
import { endDay } from "./economy.js";
import { RuleError } from "./errors.js";
import { apply, type ReducerCtx } from "./reducer.js";
import { mulberry32 } from "./rng.js";
import { loadTestContent } from "../test/content.js";

/**
 * D-9 intro auto-launch: a new campaign opens on ev_intro as an incident-style
 * narrative mission (no MissionDef wrapper, squad = every starting hero), and
 * playing it through the real reducer authorizes the rescue crossing.
 */
const CONTENT: ContentBundleT = loadTestContent();
const ctx = (seed = 1): ReducerCtx => ({ content: CONTENT, rng: mulberry32(seed) });

describe("newCampaign intro launch (D-9)", () => {
  it("without content: bare strategic state, no active mission, empty mission list", () => {
    const s = newCampaign(1);
    expect(s.activeMission).toBeNull();
    expect(s.missions.available).toEqual([]);
  });

  it("with content: opens ev_intro at its entry node with every hero and no mission id", () => {
    const s = newCampaign(1, CONTENT);
    const script = CONTENT.events.find((e) => e.id === INTRO_EVENT)!;
    expect(s.activeMission).toEqual({
      kind: "narrative",
      mission: undefined,
      script: INTRO_EVENT,
      node: script.entryNode,
      squad: ["h_mercer", "h_okafor"],
      gatedSeen: false,
    });
  });

  it("blocks endDay until the intro is resolved (mission_active guard)", () => {
    const s = newCampaign(1, CONTENT);
    expect(() => endDay(s, ctx())).toThrow(RuleError);
  });

  const playIntro = (finalOption: string) => {
    let s = newCampaign(1, CONTENT);
    const choose = (option: string) => {
      s = apply(s, { type: "chooseEventOption", option }, ctx());
    };
    choose("o_in_down");
    choose("o_in_science");
    choose("o_in_okafor_then");
    choose("o_in_mercer2_go");
    choose(finalOption);
    return s;
  };

  it("committed path: unlocks the arrival mission and writes the Day 1 journal line", () => {
    const s = playIntro("o_in_commit");
    expect(s.activeMission).toBeNull();
    expect(s.missions.available).toEqual(["m_vy_arrival"]);
    expect(s.flags["intro_cautious"]).toBeUndefined();
    // D-10: science-first grants the briefing head start (+4 intel).
    expect(s.resources.intel).toBe(4);
    const lines = s.journal.map((j) => j.text);
    expect(lines).toContain("Tag 1. Rettungssprung genehmigt. Adresse 04.");
    expect(lines).toContain("Erster Tag: Rettungssprung genehmigt");
    // Incident-style completion: no MissionDef wrapper, so no completed entry.
    expect(s.missions.completed).toEqual([]);
  });

  it("cautious path: sets intro_cautious with no other divergence", () => {
    const s = playIntro("o_in_cautious");
    expect(s.flags["intro_cautious"]).toBe(true);
    expect(s.missions.available).toEqual(["m_vy_arrival"]);
  });

  it("the threats-first fork reconverges on the decision node and grants materials", () => {
    let s = newCampaign(1, CONTENT);
    for (const option of ["o_in_down", "o_in_threats", "o_in_mercer_then", "o_in_okafor2_go"]) {
      s = apply(s, { type: "chooseEventOption", option }, ctx());
    }
    expect(s.activeMission?.kind === "narrative" && s.activeMission.node).toBe("n_in_decide");
    // D-10: threats-first approves Mercer's requisitions (+4 materials).
    expect(s.resources.materials).toBe(44);
  });
});

describe("D-9 unlock chain — static content walk", () => {
  /** Every unlockMission target reachable from a mission's event script or
   * its tactical victory/defeat effects (queued events followed). */
  const unlocksOf = (missionId: string): Set<string> => {
    const out = new Set<string>();
    const def = CONTENT.missions.find((m) => m.id === missionId)!;
    const scanEffects = (effects: readonly { type: string }[]) => {
      for (const e of effects as Array<
        { type: "unlockMission"; mission: string } | { type: "queueEvent"; event: string } | { type: string }
      >) {
        if (e.type === "unlockMission") out.add((e as { mission: string }).mission);
        if (e.type === "queueEvent") scanScript((e as { event: string }).event);
      }
    };
    const scanScript = (scriptId: string) => {
      const script = CONTENT.events.find((ev) => ev.id === scriptId)!;
      for (const n of script.nodes) for (const o of n.options) scanEffects(o.effects);
      for (const o of script.outcomes) scanEffects(o.effects);
    };
    if (def.payload.kind === "narrative") scanScript(def.payload.eventScript);
    else {
      scanEffects(def.victoryEffects);
      scanEffects(def.defeatEffects);
    }
    return out;
  };

  it("runs intro → arrival → ledger → intercept → m_vy_1..3 with no dead-end (D-16 arc end)", () => {
    // The intro (incident, not a mission) opens the spine.
    const intro = CONTENT.events.find((e) => e.id === INTRO_EVENT)!;
    const introUnlocks = intro.outcomes.flatMap((o) =>
      o.effects.filter((e) => e.type === "unlockMission").map((e) => (e as { mission: string }).mission),
    );
    expect(introUnlocks).toContain("m_vy_arrival");

    expect(unlocksOf("m_vy_arrival")).toContain("m_vy_ledger");
    expect(unlocksOf("m_vy_ledger")).toContain("m_vy_intercept");
    const intercept = unlocksOf("m_vy_intercept");
    expect(intercept).toContain("m_vy_1"); // victory
    expect(intercept).toContain("m_vy_intercept"); // defeat → regroup retry
    expect(unlocksOf("m_vy_1")).toContain("m_vy_2");
    expect(unlocksOf("m_vy_2")).toContain("m_vy_3");
    // D-16: the Act-1 arc ends after M3's exfil close; M3 no longer unlocks m_vy_4.
    expect(unlocksOf("m_vy_3")).not.toContain("m_vy_4");
  });

  it("no M3 outcome unlocks m_vy_4 (D-16: m_vy_4/m_vy_5 deferred to Act 2)", () => {
    const fb = CONTENT.events.find((e) => e.id === "ev_vy_first_blade")!;
    for (const outcome of fb.outcomes) {
      const unlocked = outcome.effects
        .filter((e) => e.type === "unlockMission")
        .map((e) => (e as { mission: string }).mission);
      expect(unlocked, `outcome ${outcome.id}`).not.toContain("m_vy_4");
    }
  });

  it("m_vy_4 and m_vy_5 remain in content but are unlocked by nothing (D-16)", () => {
    expect(CONTENT.missions.find((m) => m.id === "m_vy_4")).toBeDefined();
    expect(CONTENT.missions.find((m) => m.id === "m_vy_5")).toBeDefined();
    const unlockers = CONTENT.missions.filter((m) => unlocksOf(m.id).has("m_vy_4"));
    expect(unlockers).toEqual([]);
  });

  it("the mandatory spine tactical is free to launch (launchCost 0)", () => {
    const intercept = CONTENT.missions.find((m) => m.id === "m_vy_intercept")!;
    expect(intercept.launchCost).toBe(0);
  });
});
