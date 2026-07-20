import { describe, expect, it } from "vitest";
import type { ContentBundleT, GameStateT } from "../data/schemas.js";
import { newCampaign } from "./campaign.js";
import { endDay } from "./economy.js";
import { RuleError } from "./errors.js";
import { launchMission } from "./missions.js";
import { chooseEventOption, eligibleOptions, evalCondition, fireDueIncident } from "./narrative.js";
import { mulberry32 } from "./rng.js";
import { loadTestContent } from "../test/content.js";
import type { ReducerCtx } from "./reducer.js";

/**
 * Narrative interpreter (docs/specs/narrative-engine.md §4–§7): the §4 condition
 * evaluator, §5 eligibility + squad-gating, the traversal reducer and §6
 * completion via golden paths, and §7 queued-incident firing. Exemplar content
 * per the spec's D-10 note: golden paths on ev_vy_arrival, gating on
 * ev_vy_relic_vault.
 */
const CONTENT: ContentBundleT = loadTestContent();
const ctx = (seed = 1): ReducerCtx => ({ content: CONTENT, rng: mulberry32(seed) });

/** Launch a narrative mission (unlocked explicitly — the spine unlocks mid-campaign). */
function launched(mission: string, squad: string[], overrides?: Partial<GameStateT>): GameStateT {
  const base = { ...newCampaign(1), ...overrides };
  if (!base.missions.available.includes(mission)) {
    base.missions = { ...base.missions, available: [...base.missions.available, mission] };
  }
  return launchMission(base, CONTENT, mission, squad);
}

describe("evalCondition (§4)", () => {
  const state = newCampaign(1); // materials 40, funds 100, trust_andara 0, support 5

  it("flag: missing reads false", () => {
    expect(evalCondition(state, CONTENT, [], { type: "flag", flag: "x", value: true })).toBe(false);
    expect(evalCondition(state, CONTENT, [], { type: "flag", flag: "x", value: false })).toBe(true);
  });

  it("variable: compares with op against 0 default", () => {
    expect(
      evalCondition(state, CONTENT, [], { type: "variable", variable: "support", op: ">=", value: 5 }),
    ).toBe(true);
    expect(
      evalCondition(state, CONTENT, [], { type: "variable", variable: "unknown", op: "==", value: 0 }),
    ).toBe(true);
    expect(
      evalCondition(state, CONTENT, [], { type: "variable", variable: "support", op: "<", value: 5 }),
    ).toBe(false);
  });

  it("resource: at-least comparison", () => {
    expect(evalCondition(state, CONTENT, [], { type: "resource", resource: "materials", min: 40 })).toBe(
      true,
    );
    expect(evalCondition(state, CONTENT, [], { type: "resource", resource: "materials", min: 41 })).toBe(
      false,
    );
  });

  it("techResearched: reads research.completed", () => {
    expect(evalCondition(state, CONTENT, [], { type: "techResearched", tech: "t_gate_stabilizer" })).toBe(
      false,
    );
    const s = structuredClone(state);
    s.research.completed.push("t_gate_stabilizer");
    expect(evalCondition(s, CONTENT, [], { type: "techResearched", tech: "t_gate_stabilizer" })).toBe(true);
  });

  it("squadHasArchetype: any squad hero matches; empty squad is false", () => {
    const cond = { type: "squadHasArchetype", tag: "scientist" } as const;
    expect(evalCondition(state, CONTENT, ["h_okafor"], cond)).toBe(true);
    expect(evalCondition(state, CONTENT, ["h_mercer"], cond)).toBe(false);
    expect(evalCondition(state, CONTENT, [], cond)).toBe(false);
  });

  it("squadSkillAtLeast: uses max EFFECTIVE skill (fatigue matters)", () => {
    const cond = { type: "squadSkillAtLeast", skill: "science", min: 7 } as const;
    // Okafor base science 7 → meets 7 while fit.
    expect(evalCondition(state, CONTENT, ["h_okafor"], cond)).toBe(true);
    // Tired (≥50) applies −1 to every effective skill → 6, now short of 7.
    const tired = structuredClone(state);
    tired.heroes.find((h) => h.hero === "h_okafor")!.fatigue = 55;
    expect(evalCondition(tired, CONTENT, ["h_okafor"], cond)).toBe(false);
    // Empty squad is false.
    expect(evalCondition(state, CONTENT, [], cond)).toBe(false);
  });

  it("all/any/not: empty all true, empty any false", () => {
    expect(evalCondition(state, CONTENT, [], { type: "all", conditions: [] })).toBe(true);
    expect(evalCondition(state, CONTENT, [], { type: "any", conditions: [] })).toBe(false);
    expect(
      evalCondition(state, CONTENT, [], {
        type: "not",
        condition: { type: "flag", flag: "x", value: true },
      }),
    ).toBe(true);
  });
});

describe("eligibleOptions (§5)", () => {
  /** Sit on ev_vy_relic_vault's wards node (n_vy4_wards) with the given squad. */
  function atWards(squad: string[]): GameStateT {
    const state = launched("m_vy_4", ["h_mercer", "h_okafor"]);
    const moved = chooseEventOption(state, ctx(), "o_vy4_quiet"); // f_vy_ilo_abandoned unset
    const s = structuredClone(moved);
    s.activeMission = { ...moved.activeMission!, squad } as typeof s.activeMission;
    return s;
  }

  it("marks squad-gated options even when the squad condition nests in any()", () => {
    // Solo Mercer (soldier, science 1): any(scientist, science ≥ 6) fails on
    // both legs — squad-scoped, so gatedBySquad must be true.
    const opts = Object.fromEntries(
      eligibleOptions(atWards(["h_mercer"]), CONTENT).map((o) => [o.option, o]),
    );
    expect(opts.o_vy4_science!.eligible).toBe(false);
    expect(opts.o_vy4_science!.gatedBySquad).toBe(true);
    expect(opts.o_vy4_force!.eligible).toBe(true); // combat 5 ≤ Mercer's 6
    expect(opts.o_vy4_slow!.eligible).toBe(true); // no requirements
  });

  it("does not blame the squad for a flag-gated option", () => {
    // o_vy4_seryn requires f_vy_seryn_recruited — ineligible, but not squad-scoped.
    const opts = Object.fromEntries(
      eligibleOptions(atWards(["h_mercer"]), CONTENT).map((o) => [o.option, o]),
    );
    expect(opts.o_vy4_seryn!.eligible).toBe(false);
    expect(opts.o_vy4_seryn!.gatedBySquad).toBe(false);
  });

  it("a scientist squad opens the science option", () => {
    const opts = Object.fromEntries(
      eligibleOptions(atWards(["h_mercer", "h_okafor"]), CONTENT).map((o) => [o.option, o]),
    );
    expect(opts.o_vy4_science!.eligible).toBe(true);
  });

  it("returns [] when no narrative mission is active", () => {
    expect(eligibleOptions(newCampaign(1), CONTENT)).toEqual([]);
  });
});

describe("chooseEventOption — golden paths (§5, §6)", () => {
  it("hide route: the address freely given, with the exact end state", () => {
    const state = launched("m_vy_arrival", ["h_mercer", "h_okafor"]);
    let s = chooseEventOption(state, ctx(), "o_va_road");
    s = chooseEventOption(s, ctx(), "o_va_trust");
    s = chooseEventOption(s, ctx(), "o_va_stay_down");
    s = chooseEventOption(s, ctx(), "o_va_hide");
    expect((s.activeMission as { node: string }).node).toBe("n_va_hide");
    expect(s.variables.trust_andara).toBe(2); // 0 + 2
    expect(s.flags.f_vy_boy_hidden).toBe(true);
    s = chooseEventOption(s, ctx(), "o_va_hide_on");
    const done = chooseEventOption(s, ctx(), "o_va_home");

    expect(done.activeMission).toBeNull();
    expect(done.resources.materials).toBe(40); // untouched on this route
    expect(done.missions.available).toContain("m_vy_ledger");
    expect(done.missions.completed).toEqual([{ mission: "m_vy_arrival", outcome: "out_va_hide", day: 1 }]);
    // out_va_hide: +10 xp squad (still level 1) + journal lines.
    expect(done.heroes.find((h) => h.hero === "h_mercer")!.xp).toBe(10);
    expect(done.heroes.find((h) => h.hero === "h_okafor")!.xp).toBe(10);
    const journal = done.journal.map((j) => j.text);
    expect(journal).toContain("The Silent Valley: The address, freely given");
    expect(journal.some((t) => t.includes("Veyra"))).toBe(true);
    // No squad-gated options anywhere on this script → no debrief hint.
    expect(journal.some((t) => t.startsWith("Debrief:"))).toBe(false);
  });

  it("violent route: trust_andara −3, vy_villager_killed, with the exact end state", () => {
    const state = launched("m_vy_arrival", ["h_mercer", "h_okafor"]);
    let s = chooseEventOption(state, ctx(), "o_va_road");
    s = chooseEventOption(s, ctx(), "o_va_refuse");
    expect(s.variables.trust_andara).toBe(-3);
    expect(s.flags.vy_villager_killed).toBe(true);
    // fatigue +10 to the squad on the refuse option.
    expect(s.heroes.find((h) => h.hero === "h_mercer")!.fatigue).toBe(10);
    s = chooseEventOption(s, ctx(), "o_va_freeze");
    s = chooseEventOption(s, ctx(), "o_va_take_address");
    const done = chooseEventOption(s, ctx(), "o_va_home_cold");

    expect(done.activeMission).toBeNull();
    expect(done.flags.f_vy_boy_hidden).toBeUndefined();
    expect(done.missions.available).toContain("m_vy_ledger");
    expect(done.missions.completed).toEqual([{ mission: "m_vy_arrival", outcome: "out_va_fight", day: 1 }]);
    expect(done.heroes.find((h) => h.hero === "h_okafor")!.xp).toBe(5);
    expect(done.journal.map((j) => j.text)).toContain("The Silent Valley: A silence bought in blood");
  });

  it("queues a follow-up with fireOnDay = day + delay (M2 kept promise, +5d)", () => {
    // Sit ev_vy_penitence on the worker branch and free Ilo.
    const base = launched("m_vy_2", ["h_mercer", "h_okafor"], undefined);
    const routed = structuredClone(base);
    routed.flags.f_vy_approach_worker = true;
    routed.flags.f_vy_owe_ilo = true;
    let s = chooseEventOption(routed, ctx(), "o_vy2_route_worker");
    s = chooseEventOption(s, ctx(), "o_vy2_b_free_ilo");
    expect(s.missions.queuedEvents).toEqual([{ event: "ev_vy_dessik_word", fireOnDay: 6 }]); // day 1 + 5
  });

  it("arms the debrief hint when a node shows a squad-gated option", () => {
    // Solo Mercer at the wards: o_vy4_science is squad-gated → gatedSeen arms,
    // and the debrief line lands on completion (showLockedOptions false).
    const state = launched("m_vy_4", ["h_mercer", "h_okafor"]);
    let s = chooseEventOption(state, ctx(), "o_vy4_quiet");
    const solo = structuredClone(s);
    solo.activeMission = { ...s.activeMission!, squad: ["h_mercer"] } as typeof solo.activeMission;
    s = chooseEventOption(solo, ctx(), "o_vy4_force");
    expect((s.activeMission as { gatedSeen: boolean }).gatedSeen).toBe(true);
    s = chooseEventOption(s, ctx(), "o_vy4_yank");
    const done = chooseEventOption(s, ctx(), "o_vy4_exfil_quiet");
    expect(done.activeMission).toBeNull();
    expect(done.flags.f_vy_godtech).toBe(true);
    expect(done.journal.map((j) => j.text)).toContain(
      "Debrief: a different team composition might have opened other approaches.",
    );
  });

  it("suppresses the debrief hint when settings.showLockedOptions is true", () => {
    const state = launched("m_vy_4", ["h_mercer", "h_okafor"], {
      settings: { showLockedOptions: true },
    });
    let s = chooseEventOption(state, ctx(), "o_vy4_quiet");
    const solo = structuredClone(s);
    solo.activeMission = { ...s.activeMission!, squad: ["h_mercer"] } as typeof solo.activeMission;
    s = chooseEventOption(solo, ctx(), "o_vy4_force");
    s = chooseEventOption(s, ctx(), "o_vy4_yank");
    const done = chooseEventOption(s, ctx(), "o_vy4_exfil_quiet");
    expect(done.journal.some((t) => t.text.startsWith("Debrief:"))).toBe(false);
  });

  it("does not mutate the input state", () => {
    const state = launched("m_vy_arrival", ["h_mercer", "h_okafor"]);
    const before = JSON.stringify(state);
    chooseEventOption(state, ctx(), "o_va_road");
    expect(JSON.stringify(state)).toBe(before);
  });
});

describe("chooseEventOption — invalid inputs (§5.1)", () => {
  it("throws when no narrative mission is active", () => {
    expect(() => chooseEventOption(newCampaign(1), ctx(), "o_va_road")).toThrow(RuleError);
  });

  it("throws on an option not on the current node", () => {
    const state = launched("m_vy_arrival", ["h_mercer", "h_okafor"]);
    try {
      chooseEventOption(state, ctx(), "o_va_home"); // belongs to n_va_told, not n_va_gate
      throw new Error("expected throw");
    } catch (err) {
      expect(err).toBeInstanceOf(RuleError);
      expect((err as RuleError).code).toBe("chooseEventOption/unknown_option");
    }
  });

  it("throws on an ineligible option", () => {
    const state = launched("m_vy_4", ["h_mercer", "h_okafor"]);
    const moved = chooseEventOption(state, ctx(), "o_vy4_quiet");
    const solo = structuredClone(moved);
    solo.activeMission = { ...moved.activeMission!, squad: ["h_mercer"] } as typeof solo.activeMission;
    try {
      chooseEventOption(solo, ctx(), "o_vy4_science"); // any(scientist, science 6) not met
      throw new Error("expected throw");
    } catch (err) {
      expect(err).toBeInstanceOf(RuleError);
      expect((err as RuleError).code).toBe("chooseEventOption/ineligible");
    }
  });
});

describe("fireDueIncident / endDay integration (§7)", () => {
  /** A campaign with two queued incidents due, plus an exhausted hero. */
  function queuedState(): GameStateT {
    const s = newCampaign(1);
    s.heroes.find((h) => h.hero === "h_okafor")!.fatigue = 90; // exhausted, excluded
    s.campaign.day = 40;
    s.missions.queuedEvents = [
      { event: "ev_vy_regroup", fireOnDay: 35 },
      { event: "ev_vy_regroup", fireOnDay: 30 },
    ];
    return s;
  }

  it("fires exactly one due incident — lowest fireOnDay — excluding exhausted heroes", () => {
    const s = queuedState();
    const next = endDay(s, ctx());
    expect(next.activeMission?.kind).toBe("narrative");
    const am = next.activeMission as { script: string; node: string; squad: string[]; mission?: string };
    expect(am.script).toBe("ev_vy_regroup");
    expect(am.node).toBe("n_vr_regroup");
    expect(am.mission).toBeUndefined(); // queue-fired incident, no MissionDef wrapper
    expect(am.squad).toEqual(["h_mercer"]); // Okafor exhausted → excluded
    // The lower-fireOnDay entry fired; the fireOnDay 35 entry remains queued.
    expect(next.missions.queuedEvents).toEqual([{ event: "ev_vy_regroup", fireOnDay: 35 }]);
  });

  it("blocks endDay while a mission is active", () => {
    const s = queuedState();
    const afterFire = endDay(s, ctx());
    expect(() => endDay(afterFire, ctx())).toThrow(RuleError);
  });

  it("does nothing when no entry is due yet", () => {
    const s = newCampaign(1);
    s.missions.queuedEvents = [{ event: "ev_vy_regroup", fireOnDay: 999 }];
    const next = fireDueIncident(s, CONTENT);
    expect(next.activeMission).toBeNull();
    expect(next.missions.queuedEvents).toEqual([{ event: "ev_vy_regroup", fireOnDay: 999 }]);
  });

  it("is a no-op when a mission is already active", () => {
    const active = launched("m_vy_arrival", ["h_mercer", "h_okafor"]);
    active.missions.queuedEvents = [{ event: "ev_vy_regroup", fireOnDay: 1 }];
    expect(fireDueIncident(active, CONTENT)).toBe(active);
  });
});
