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
 * completion via golden paths, and §7 queued-incident firing.
 */
const CONTENT: ContentBundleT = loadTestContent();
const ctx = (seed = 1): ReducerCtx => ({ content: CONTENT, rng: mulberry32(seed) });

/** Launch ev_first_contact via m_rival_stranded and sit on n_intro. */
function launched(squad: string[], overrides?: Partial<GameStateT>): GameStateT {
  const base = { ...newCampaign(1), ...overrides };
  // D-9: the side mission is unlocked mid-campaign, not at newCampaign.
  base.missions = { ...base.missions, available: [...base.missions.available, "m_rival_stranded"] };
  return launchMission(base, CONTENT, "m_rival_stranded", squad);
}

describe("evalCondition (§4)", () => {
  const state = newCampaign(1); // materials 40, funds 100, trust_rival 0, support 5

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
  it("marks squad-gated options when a squad-scoped requirement fails", () => {
    // Squad = Mercer only (soldier, science 1): no diplomat, science < 5.
    const state = launched(["h_mercer", "h_okafor"]);
    // Replace the launched squad with just Mercer to exercise gating on n_intro.
    const solo = structuredClone(state);
    solo.activeMission = { ...state.activeMission!, squad: ["h_mercer"] } as typeof solo.activeMission;

    const opts = eligibleOptions(solo, CONTENT);
    const byId = Object.fromEntries(opts.map((o) => [o.option, o]));
    expect(byId.o_help!.eligible).toBe(true); // no requirements
    expect(byId.o_leave!.eligible).toBe(true); // no requirements
    expect(byId.o_interrogate!.eligible).toBe(false);
    expect(byId.o_interrogate!.gatedBySquad).toBe(true); // squadHasArchetype diplomat
    expect(byId.o_data!.eligible).toBe(false);
    expect(byId.o_data!.gatedBySquad).toBe(true); // squadSkillAtLeast science 5
  });

  it("a diplomat squad opens the diplomat option", () => {
    // Okafor is a scientist; give the survey a squad including a science 7 hero
    // so o_data unlocks and o_interrogate stays gated (no diplomat present).
    const state = launched(["h_mercer", "h_okafor"]);
    const opts = Object.fromEntries(eligibleOptions(state, CONTENT).map((o) => [o.option, o]));
    expect(opts.o_data!.eligible).toBe(true); // Okafor science 7 ≥ 5
    expect(opts.o_interrogate!.eligible).toBe(false);
    expect(opts.o_interrogate!.gatedBySquad).toBe(true);
  });

  it("returns [] when no narrative mission is active", () => {
    expect(eligibleOptions(newCampaign(1), CONTENT)).toEqual([]);
  });
});

describe("chooseEventOption — golden paths (§5, §6)", () => {
  it("o_help route: reaches out_contact with the exact end state", () => {
    const state = launched(["h_mercer", "h_okafor"]);
    const afterHelp = chooseEventOption(state, ctx(), "o_help");
    // Advanced to n_help, effects applied, mission still active.
    expect(afterHelp.activeMission?.kind).toBe("narrative");
    expect((afterHelp.activeMission as { node: string }).node).toBe("n_help");
    expect(afterHelp.resources.materials).toBe(35); // 40 − 5
    expect(afterHelp.variables.trust_rival).toBe(2); // 0 + 2
    expect(afterHelp.flags.helped_rivals).toBe(true);
    expect(afterHelp.missions.queuedEvents).toEqual([{ event: "ev_first_contact", fireOnDay: 31 }]);

    const done = chooseEventOption(afterHelp, ctx(), "o_return");
    expect(done.activeMission).toBeNull();
    // out_contact outcome: +10 xp squad (still level 1) + the log line.
    expect(done.heroes.find((h) => h.hero === "h_mercer")!.xp).toBe(10);
    expect(done.heroes.find((h) => h.hero === "h_okafor")!.xp).toBe(10);
    expect(done.missions.available).not.toContain("m_rival_stranded");
    expect(done.missions.completed).toEqual([
      { mission: "m_rival_stranded", outcome: "out_contact", day: 1 },
    ]);
    const journal = done.journal.map((j) => j.text);
    expect(journal).toContain("Someone on the other side owes us. Or knows us.");
    expect(journal).toContain("The Stranded Survey Team: Contact established");
    // Debrief hint fires: no hero is a diplomat, so o_interrogate stayed gated.
    expect(journal).toContain("Debrief: a different team composition might have opened other approaches.");
  });

  it("suppresses the debrief hint when settings.showLockedOptions is true", () => {
    const state = launched(["h_mercer", "h_okafor"], { settings: { showLockedOptions: true } });
    const afterHelp = chooseEventOption(state, ctx(), "o_help");
    const done = chooseEventOption(afterHelp, ctx(), "o_return");
    expect(done.journal.some((t) => t.text.startsWith("Debrief:"))).toBe(false);
  });

  it("o_leave route: reaches out_cold with the exact end state", () => {
    const state = launched(["h_mercer", "h_okafor"]);
    const done = chooseEventOption(state, ctx(), "o_leave");
    expect(done.activeMission).toBeNull();
    expect(done.resources.materials).toBe(40); // untouched
    expect(done.variables.trust_rival).toBe(-3); // 0 − 3
    expect(done.flags.abandoned_rivals).toBe(true);
    // fatigue +5 to squad, then out_cold +5 xp.
    expect(done.heroes.find((h) => h.hero === "h_mercer")!.fatigue).toBe(5);
    expect(done.heroes.find((h) => h.hero === "h_okafor")!.xp).toBe(5);
    expect(done.missions.completed).toEqual([{ mission: "m_rival_stranded", outcome: "out_cold", day: 1 }]);
    expect(done.journal.map((j) => j.text)).toContain("The Stranded Survey Team: Walked away");
    // No queued follow-up on the leave route.
    expect(done.missions.queuedEvents).toEqual([]);
  });

  it("arms the debrief hint when the current node has a squad-gated option", () => {
    // Solo Mercer: n_intro's o_interrogate/o_data are gated → gatedSeen arms,
    // and the debrief line lands on completion (showLockedOptions is false).
    const base = launched(["h_mercer", "h_okafor"]);
    // Override to the solo squad for the traversal assertion (the squad-size
    // guard is enforced at launch, not during traversal).
    const solo = structuredClone(base);
    solo.activeMission = { ...base.activeMission!, squad: ["h_mercer"] } as typeof solo.activeMission;

    const afterHelp = chooseEventOption(solo, ctx(), "o_help");
    expect((afterHelp.activeMission as { gatedSeen: boolean }).gatedSeen).toBe(true);
    const done = chooseEventOption(afterHelp, ctx(), "o_return");
    expect(done.journal.map((j) => j.text)).toContain(
      "Debrief: a different team composition might have opened other approaches.",
    );
  });

  it("does not mutate the input state", () => {
    const state = launched(["h_mercer", "h_okafor"]);
    const before = JSON.stringify(state);
    chooseEventOption(state, ctx(), "o_help");
    expect(JSON.stringify(state)).toBe(before);
  });
});

describe("chooseEventOption — invalid inputs (§5.1)", () => {
  it("throws when no narrative mission is active", () => {
    expect(() => chooseEventOption(newCampaign(1), ctx(), "o_help")).toThrow(RuleError);
  });

  it("throws on an option not on the current node", () => {
    const state = launched(["h_mercer", "h_okafor"]);
    try {
      chooseEventOption(state, ctx(), "o_return"); // belongs to n_help, not n_intro
      throw new Error("expected throw");
    } catch (err) {
      expect(err).toBeInstanceOf(RuleError);
      expect((err as RuleError).code).toBe("chooseEventOption/unknown_option");
    }
  });

  it("throws on an ineligible option", () => {
    const state = launched(["h_mercer", "h_okafor"]);
    const solo = structuredClone(state);
    solo.activeMission = { ...state.activeMission!, squad: ["h_mercer"] } as typeof solo.activeMission;
    try {
      chooseEventOption(solo, ctx(), "o_data"); // science 5+ not met by Mercer
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
      { event: "ev_first_contact", fireOnDay: 35 },
      { event: "ev_first_contact", fireOnDay: 30 },
    ];
    return s;
  }

  it("fires exactly one due incident — lowest fireOnDay — excluding exhausted heroes", () => {
    const s = queuedState();
    const next = endDay(s, ctx());
    expect(next.activeMission?.kind).toBe("narrative");
    const am = next.activeMission as { script: string; node: string; squad: string[]; mission?: string };
    expect(am.script).toBe("ev_first_contact");
    expect(am.node).toBe("n_intro");
    expect(am.mission).toBeUndefined(); // queue-fired incident, no MissionDef wrapper
    expect(am.squad).toEqual(["h_mercer"]); // Okafor exhausted → excluded
    // The lower-fireOnDay entry fired; the fireOnDay 35 entry remains queued.
    expect(next.missions.queuedEvents).toEqual([{ event: "ev_first_contact", fireOnDay: 35 }]);
  });

  it("blocks endDay while a mission is active", () => {
    const s = queuedState();
    const afterFire = endDay(s, ctx());
    expect(() => endDay(afterFire, ctx())).toThrow(RuleError);
  });

  it("does nothing when no entry is due yet", () => {
    const s = newCampaign(1);
    s.missions.queuedEvents = [{ event: "ev_first_contact", fireOnDay: 999 }];
    const next = fireDueIncident(s, CONTENT);
    expect(next.activeMission).toBeNull();
    expect(next.missions.queuedEvents).toEqual([{ event: "ev_first_contact", fireOnDay: 999 }]);
  });

  it("is a no-op when a mission is already active", () => {
    const active = launched(["h_mercer", "h_okafor"]);
    active.missions.queuedEvents = [{ event: "ev_first_contact", fireOnDay: 1 }];
    expect(fireDueIncident(active, CONTENT)).toBe(active);
  });
});
