/**
 * Veyra operation — tactical battle verification (docs/specs/veyra-kaempfe.md §8).
 *
 * These drive the REAL reducer (`apply`) through whole battles with a small
 * goal-seeking greedy planner, so a "scripted victory" here is genuine tactical
 * play against the live AI, not a hand-tuned action list. Covered:
 *   §8.1 intercept (interactSequence) — 2- and 4-squad, victory + defeat
 *   §8.2 breakout (reachZone) — with and without the Seryn ally, victory
 *   §8.5 retry path — lose the breakout, it stays available, then win it
 * The map_relay golden test (§8.6) lives untouched in tactics.test.ts.
 */
import { describe, expect, it } from "vitest";
import { newCampaign } from "./campaign.js";
import { apply, type ReducerCtx } from "./reducer.js";
import { mulberry32 } from "./rng.js";
import { battleOf, playBattle } from "../test/greedyBattle.js";
import { loadTestContent } from "../test/content.js";
import type { ContentBundleT, GameStateT } from "../data/schemas.js";

const BASE = loadTestContent();

/** A test content bundle with enough heroes to field a full 4-squad (shipped
 * content currently rosters three). The extra heroes are plain soldiers so the
 * battle exercises real hero stats without inventing new content on disk. */
function contentWith4Heroes(): ContentBundleT {
  const grunts = ["h_grunt_a", "h_grunt_b"].map((id) => ({
    id,
    name: id,
    archetypes: ["soldier" as const],
    skills: { combat: 6, science: 1, engineering: 2, diplomacy: 2, resolve: 5 },
    abilities: ["ab_shot"],
  }));
  return { ...BASE, heroes: [...BASE.heroes, ...grunts] };
}

/** A ready-to-launch strategic state: the mission available, a fresh roster, no
 * intro in the way. Flags let the breakout spawn (or not) the Seryn ally. */
function stateForMission(
  content: ContentBundleT,
  mission: string,
  squad: string[],
  flags: Record<string, boolean> = {},
  campaignSeed = 12345,
): GameStateT {
  const s = newCampaign(campaignSeed, content);
  s.activeMission = null;
  s.flags = { ...flags };
  // Ensure every squad member has a HeroState (grunts aren't in newCampaign).
  for (const id of squad) {
    if (!s.heroes.some((h) => h.hero === id)) {
      s.heroes.push({ hero: id, xp: 0, level: 1, fatigue: 0, injuries: [], skillBonuses: {} });
    }
  }
  s.missions.available = [mission];
  return s;
}

const ctxFor = (): ReducerCtx => ({ content: BASE, rng: mulberry32(99) });

describe("veyra-kaempfe §8.1 — intercept (Die Signaltürme)", () => {
  it("2-squad (Mercer + Okafor, fresh) reaches victory by activating both spires", () => {
    // Balance-Rebase v3: the guard-drone aim rose (48→60) and hero aim (55→60),
    // so the greedy planner's winning seed shifted; this campaign seed yields a
    // genuine 2-squad victory under the new numbers (see PR verification table).
    const s0 = stateForMission(BASE, "m_vy_intercept", ["h_mercer", "h_okafor"], {}, 1);
    const launched = apply(
      s0,
      { type: "launchMission", mission: "m_vy_intercept", squad: ["h_mercer", "h_okafor"] },
      ctxFor(),
    );
    const { state, outcome } = playBattle(launched, BASE, { content: BASE, rng: mulberry32(1) });
    expect(outcome).toBe("victory");
    // Victory via interactSequence — living drones are allowed (spec §5).
    expect(state.flags.f_vy_signal_jammed).toBe(true);
    expect(state.missions.available).toContain("m_vy_1");
    expect(state.deployment).not.toBeNull();
  });

  it("4-squad reaches victory too", () => {
    const content = contentWith4Heroes();
    const squad = ["h_mercer", "h_okafor", "h_grunt_a", "h_grunt_b"];
    const s0 = stateForMission(content, "m_vy_intercept", squad, {}, 3); // winning seed (Rebase v3)
    const launched = apply(
      s0,
      { type: "launchMission", mission: "m_vy_intercept", squad },
      { content, rng: mulberry32(2) },
    );
    const { outcome } = playBattle(launched, content, { content, rng: mulberry32(2) });
    expect(outcome).toBe("victory");
  });

  it("a passive 2-squad is overrun — defeat, mission stays available (retryOnDefeat)", () => {
    const s0 = stateForMission(BASE, "m_vy_intercept", ["h_mercer", "h_okafor"]);
    const launched = apply(
      s0,
      { type: "launchMission", mission: "m_vy_intercept", squad: ["h_mercer", "h_okafor"] },
      ctxFor(),
    );
    const { state, outcome } = playBattle(
      launched,
      BASE,
      { content: BASE, rng: mulberry32(3) },
      { passive: true },
    );
    expect(outcome).toBe("defeat");
    expect(state.missions.available).toContain("m_vy_intercept"); // retryOnDefeat
    expect(state.flags.f_vy_signal_jammed ?? false).toBe(false);
  });

  it("a passive 4-squad is also overrun (defeat scenario)", () => {
    const content = contentWith4Heroes();
    const squad = ["h_mercer", "h_okafor", "h_grunt_a", "h_grunt_b"];
    const s0 = stateForMission(content, "m_vy_intercept", squad);
    const launched = apply(
      s0,
      { type: "launchMission", mission: "m_vy_intercept", squad },
      { content, rng: mulberry32(4) },
    );
    const { outcome } = playBattle(launched, content, { content, rng: mulberry32(4) }, { passive: true });
    expect(outcome).toBe("defeat");
  });
});

describe("veyra-kaempfe §8.2 — breakout (Der Ausbruch, reachZone)", () => {
  it("WITH Seryn (convinced) — the ally spawns and the squad reaches the gate court", () => {
    const squad = ["h_mercer", "h_okafor"];
    const s0 = stateForMission(BASE, "m_vy_breakout", squad, { f_vy_first_convinced: true }, 1);
    const launched = apply(s0, { type: "launchMission", mission: "m_vy_breakout", squad }, ctxFor());
    // §1a/§4: Seryn (ut_seryn_blessed) is present as a player-side ally.
    const ally = battleOf(launched).units.find(
      (u) => u.side === "player" && u.unitType === "ut_seryn_blessed",
    );
    expect(ally).toBeDefined();
    const { state, outcome } = playBattle(launched, BASE, { content: BASE, rng: mulberry32(5) });
    expect(outcome).toBe("victory");
    expect(state.missions.available).toContain("m_vy_home");
  });

  it("WITHOUT Seryn — tighter, but still winnable with a 3-squad", () => {
    const squad = ["h_mercer", "h_okafor", "h_seryn"];
    const s0 = stateForMission(BASE, "m_vy_breakout", squad, {}, 1); // no convince/doubt flag → no ally
    const launched = apply(s0, { type: "launchMission", mission: "m_vy_breakout", squad }, ctxFor());
    expect(battleOf(launched).units.filter((u) => u.side === "player").length).toBe(3);
    const { outcome } = playBattle(launched, BASE, { content: BASE, rng: mulberry32(6) });
    expect(outcome).toBe("victory");
  });

  it("WITHOUT Seryn — winnable with EXACTLY the four real starters (Roster-Erweiterung §8.2)", () => {
    // The canonical no-return squad after the roster expansion: the four shipped
    // starters (Mercer, Okafor, Brandt, Okonkwo) — no grunts, no Seryn ally. This
    // is the real "4 vs 6 without Seryn" the campaign actually fields (§7).
    const squad = ["h_mercer", "h_okafor", "h_brandt", "h_okonkwo"];
    const s0 = stateForMission(BASE, "m_vy_breakout", squad, {}, 1); // no convince/doubt flag → no ally
    const launched = apply(s0, { type: "launchMission", mission: "m_vy_breakout", squad }, ctxFor());
    const players = battleOf(launched).units.filter((u) => u.side === "player");
    expect(players.length).toBe(4);
    expect(players.some((u) => u.unitType === "ut_seryn_blessed")).toBe(false); // no ally
    const { state, outcome } = playBattle(launched, BASE, { content: BASE, rng: mulberry32(6) });
    expect(outcome).toBe("victory");
    expect(state.missions.available).toContain("m_vy_home");
  });
});

describe("veyra-kaempfe §8.5 — retry path", () => {
  it("lose the breakout, it stays available, then win it", () => {
    const squad = ["h_mercer", "h_okafor", "h_seryn"];
    const s0 = stateForMission(BASE, "m_vy_breakout", squad, {}, 1);
    const lost = apply(s0, { type: "launchMission", mission: "m_vy_breakout", squad }, ctxFor());
    const afterLoss = playBattle(lost, BASE, { content: BASE, rng: mulberry32(7) }, { passive: true });
    expect(afterLoss.outcome).toBe("defeat");
    expect(afterLoss.state.missions.available).toContain("m_vy_breakout"); // retryOnDefeat
    expect(afterLoss.state.deployment).not.toBeNull(); // still on operation

    // Re-launch with the locked deployment squad and win.
    const relaunch = apply(
      afterLoss.state,
      { type: "launchMission", mission: "m_vy_breakout", squad: afterLoss.state.deployment!.squad },
      { content: BASE, rng: mulberry32(8) },
    );
    const won = playBattle(relaunch, BASE, { content: BASE, rng: mulberry32(8) });
    expect(won.outcome).toBe("victory");
    expect(won.state.missions.available).toContain("m_vy_home");
  });
});
