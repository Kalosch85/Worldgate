/**
 * Enemy-phase replay (task 4.3, tactics-engine spec §5, §11). `battleEndTurn`
 * resolves the whole enemy phase in one reducer call and appends every move and
 * roll to `battle.log`; the renderer then "replays enemy actions from the log"
 * at ~300ms per action (spec §11). This module turns the newly-appended log
 * lines plus the pre-phase unit snapshot into an ordered list of `ReplayFrame`s
 * — each a board snapshot to draw and how long to hold it — which the renderer
 * steps through. Pure: no timers, no Pixi, just string parsing.
 */

/** A minimal unit snapshot the replay animates over (position + current hp). */
export interface ReplayUnit {
  id: string;
  pos: { x: number; y: number };
  hp: number;
}

export interface ReplayFrame {
  /** Board state to draw for this beat. */
  units: ReplayUnit[];
  /** How many of the new log lines are revealed by the end of this beat. */
  revealed: number;
  /** Hold time before advancing, in ms. */
  delayMs: number;
}

/** ~300ms per action (spec §11); markers (phase/round banners) flash briefer. */
export const ACTION_MS = 300;
export const MARKER_MS = 200;

const MOVE_RE = /^(\S+) moves to \((\d+),(\d+)\)$/;
const DMG_RE = /^roll: (\S+) dmg .*\(hp (\d+)\/\d+\)$/;
const HIT_RE = /^roll: (\S+)->(\S+) hit /;

function snapshot(work: Map<string, ReplayUnit>): ReplayUnit[] {
  return [...work.values()].map((u) => ({ id: u.id, pos: { x: u.pos.x, y: u.pos.y }, hp: u.hp }));
}

/**
 * Build the replay for one enemy phase. `prevUnits` is the board as it stood
 * when the player pressed End Turn; `newLines` is exactly the log slice the
 * `battleEndTurn` reducer appended. Each move and each attack becomes one
 * ~300ms beat; the damage/"is down" lines of an attack fold into that attack's
 * beat (one action = one beat); `--` markers get a brief beat of their own.
 */
export function buildReplay(prevUnits: readonly ReplayUnit[], newLines: readonly string[]): ReplayFrame[] {
  const work = new Map<string, ReplayUnit>(
    prevUnits.map((u) => [u.id, { id: u.id, pos: { x: u.pos.x, y: u.pos.y }, hp: u.hp }]),
  );
  const frames: ReplayFrame[] = [];

  newLines.forEach((line, i) => {
    const revealed = i + 1;

    const move = MOVE_RE.exec(line);
    if (move) {
      const [, id, xs, ys] = move;
      const u = work.get(id!);
      if (u) u.pos = { x: Number(xs), y: Number(ys) };
      frames.push({ units: snapshot(work), revealed, delayMs: ACTION_MS });
      return;
    }

    const dmg = DMG_RE.exec(line);
    if (dmg) {
      const [, id, hp] = dmg;
      const u = work.get(id!);
      if (u) u.hp = Number(hp);
      // Fold the damage into the attack's beat: refresh the last frame's board.
      const last = frames[frames.length - 1];
      if (last) {
        last.units = snapshot(work);
        last.revealed = revealed;
      } else {
        frames.push({ units: snapshot(work), revealed, delayMs: ACTION_MS });
      }
      return;
    }

    if (HIT_RE.test(line)) {
      // Attack: the board doesn't change until the damage line; open the beat.
      frames.push({ units: snapshot(work), revealed, delayMs: ACTION_MS });
      return;
    }

    if (line.endsWith(" is down")) {
      // Cosmetic: fold into the preceding attack beat.
      const last = frames[frames.length - 1];
      if (last) last.revealed = revealed;
      else frames.push({ units: snapshot(work), revealed, delayMs: ACTION_MS });
      return;
    }

    // Markers ("-- enemy phase --", "-- round N --") — a brief beat so the
    // banner is legible without stalling the replay.
    frames.push({ units: snapshot(work), revealed, delayMs: MARKER_MS });
  });

  return frames;
}
