import { describe, expect, it } from "vitest";
import { ACTION_MS, MARKER_MS, buildReplay, type ReplayUnit } from "./replay.js";

/**
 * Replay-frame tests (task 4.3, spec §5/§11). buildReplay must reconstruct the
 * board beat-by-beat from the enemy-phase log slice: one beat per move and per
 * attack (damage/"down" folded into the attack's beat), markers as brief beats.
 */
const PREV: ReplayUnit[] = [
  { id: "u_e", pos: { x: 6, y: 4 }, hp: 4 },
  { id: "u_p", pos: { x: 3, y: 1 }, hp: 5 },
];

describe("buildReplay", () => {
  it("produces one beat per action and reconstructs positions/hp", () => {
    const lines = [
      "-- enemy phase (round 1) --",
      "u_e moves to (5,4)",
      "roll: u_e->u_p hit 8/63 HIT",
      "roll: u_p dmg 1=1 (hp 4/5)",
      "-- round 2 --",
    ];
    const frames = buildReplay(PREV, lines);
    // marker, move, attack(+folded dmg), marker → 4 beats.
    expect(frames).toHaveLength(4);

    // Marker beat: nothing moved yet, brief hold.
    expect(frames[0]!.delayMs).toBe(MARKER_MS);
    expect(frames[0]!.revealed).toBe(1);

    // Move beat: enemy relocated, ~300ms.
    expect(frames[1]!.delayMs).toBe(ACTION_MS);
    expect(frames[1]!.units.find((u) => u.id === "u_e")!.pos).toEqual({ x: 5, y: 4 });
    expect(frames[1]!.units.find((u) => u.id === "u_p")!.hp).toBe(5); // not hit yet

    // Attack beat: the damage line folds in — hp drops, reveal advances past it.
    expect(frames[2]!.delayMs).toBe(ACTION_MS);
    expect(frames[2]!.units.find((u) => u.id === "u_p")!.hp).toBe(4);
    expect(frames[2]!.revealed).toBe(4);

    // Trailing round marker.
    expect(frames[3]!.delayMs).toBe(MARKER_MS);
    expect(frames[3]!.revealed).toBe(5);
  });

  it("folds a kill's 'is down' line into the attack beat", () => {
    const lines = ["roll: u_e->u_p hit 5/50 HIT", "roll: u_p dmg 5=5 (hp 0/5)", "u_p is down"];
    const frames = buildReplay(PREV, lines);
    expect(frames).toHaveLength(1);
    expect(frames[0]!.units.find((u) => u.id === "u_p")!.hp).toBe(0);
    expect(frames[0]!.revealed).toBe(3);
  });

  it("returns no frames for an empty phase", () => {
    expect(buildReplay(PREV, [])).toEqual([]);
  });

  it("does not mutate the input snapshot", () => {
    buildReplay(PREV, ["u_e moves to (0,0)"]);
    expect(PREV[0]!.pos).toEqual({ x: 6, y: 4 });
  });
});
