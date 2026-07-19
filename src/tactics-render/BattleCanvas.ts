/**
 * PixiJS board renderer (task 4.3, tactics-engine spec §11). Draws a
 * `BattleView` — grid from the map tile legend, cover, consoles, units with hp
 * pips, and the move/target overlays — onto a WebGL canvas, and reports tile
 * taps back to the host. Colored shapes only (spec §11: no sprite work).
 *
 * This is the one place Pixi lives. It holds no game rules and no UI state: it
 * renders whatever `BattleView` (optionally with replay-overridden unit
 * positions) it is handed and calls `onTap(x, y)` with the tile a pointer hit.
 * The React host (BattleScreen) owns selection, mode, and dispatch.
 */
import { Application, Container, Graphics, Text } from "pixi.js";
import type { BattleView } from "./battleModel.js";
import type { ReplayUnit } from "./replay.js";

const COLORS = {
  bg: 0x0b0f1a,
  floor: 0x141a2a,
  floorAlt: 0x182034,
  gridLine: 0x2a3450,
  wall: 0x39456b,
  lowCover: 0x5a4a23,
  highCover: 0x7a5a1f,
  reachable: 0x4d7cff,
  targetRing: 0xff6b6b,
  player: 0x4d7cff,
  enemy: 0xff6b6b,
  downed: 0x4a5169,
  consoleIdle: 0x93a0bd,
  consoleNext: 0x4fd18b,
  hpFull: 0x4fd18b,
  hpEnemy: 0xff9d6b,
  hpEmpty: 0x2a3450,
  selection: 0xffffff,
  text: 0xffffff,
} as const;

/** Minimum on-screen tile size so every tap target clears ARCHITECTURE §10's
 * 44px minimum; the canvas grows past the container and scrolls if it must. */
const MIN_TILE = 48;
const MAX_TILE = 76;

export interface BattleCanvasOpts {
  onTap: (x: number, y: number) => void;
}

/** A unit as the canvas draws it — the view's units, with replay positions/hp
 * swapped in during an enemy-phase replay. */
interface DrawUnit {
  id: string;
  side: "player" | "enemy";
  pos: { x: number; y: number };
  hp: number;
  maxHp: number;
  alive: boolean;
  selected: boolean;
}

export class BattleCanvas {
  private app: Application | null = null;
  private readonly container: HTMLElement;
  private readonly onTap: (x: number, y: number) => void;
  private board = new Container();
  private tile = MIN_TILE;
  private gridWidth = 0;
  private gridHeight = 0;
  private lastView: BattleView | null = null;
  private lastOverride: readonly ReplayUnit[] | null = null;
  private disposed = false;

  constructor(container: HTMLElement, opts: BattleCanvasOpts) {
    this.container = container;
    this.onTap = opts.onTap;
  }

  /** Boot the Pixi application and attach the canvas. Idempotent-ish: safe to
   * call once per mount; `destroy()` tears it down. */
  async init(): Promise<void> {
    const app = new Application();
    await app.init({ background: COLORS.bg, antialias: true, resolution: 1, autoDensity: true });
    if (this.disposed) {
      app.destroy(true);
      return;
    }
    this.app = app;
    app.stage.addChild(this.board);
    app.stage.eventMode = "static";
    app.stage.hitArea = { contains: () => true } as { contains: (x: number, y: number) => boolean };
    app.stage.on("pointertap", (e: { global: { x: number; y: number } }) => {
      if (!this.lastView) return;
      const tx = Math.floor(e.global.x / this.tile);
      const ty = Math.floor(e.global.y / this.tile);
      if (tx < 0 || ty < 0 || tx >= this.gridWidth || ty >= this.gridHeight) return;
      this.onTap(tx, ty);
    });
    this.container.appendChild(app.canvas);
    if (this.lastView) this.render(this.lastView, this.lastOverride);
  }

  /** The DOM node hosting the canvas (may be null before init). */
  get canvas(): HTMLCanvasElement | null {
    return this.app?.canvas ?? null;
  }

  private computeTile(width: number, height: number): number {
    const cw = this.container.clientWidth || width * MIN_TILE;
    const ch = this.container.clientHeight || height * MIN_TILE;
    const fit = Math.floor(Math.min(cw / width, ch / height));
    return Math.max(MIN_TILE, Math.min(MAX_TILE, fit));
  }

  /**
   * Redraw the whole board for `view`. During an enemy-phase replay, pass
   * `override` (from buildReplay) to draw units at their in-replay positions/hp
   * instead of their final ones.
   */
  render(view: BattleView, override?: readonly ReplayUnit[] | null): void {
    this.lastView = view;
    this.lastOverride = override ?? null;
    const app = this.app;
    if (!app) return;

    this.gridWidth = view.width;
    this.gridHeight = view.height;
    this.tile = this.computeTile(view.width, view.height);
    const px = view.width * this.tile;
    const py = view.height * this.tile;
    app.renderer.resize(px, py);

    this.board.removeChildren().forEach((c) => c.destroy());
    const t = this.tile;

    // 1. Tiles from the map legend + a faint grid.
    const tiles = new Graphics();
    for (let y = 0; y < view.height; y++) {
      const row = view.tiles[y] ?? "";
      for (let x = 0; x < view.width; x++) {
        const ch = row[x] ?? ".";
        const checker = (x + y) % 2 === 0 ? COLORS.floor : COLORS.floorAlt;
        const fill =
          ch === "#" ? COLORS.wall : ch === "-" ? COLORS.lowCover : ch === "+" ? COLORS.highCover : checker;
        tiles.rect(x * t, y * t, t, t).fill(fill);
        tiles.rect(x * t, y * t, t, t).stroke({ width: 1, color: COLORS.gridLine, alignment: 0 });
      }
    }
    this.board.addChild(tiles);

    // 2. Move overlay (reachable tiles) under the units — a filled inset with a
    // brighter border so the destinations read clearly over the dark floor.
    if (view.reachable.length > 0) {
      const g = new Graphics();
      for (const p of view.reachable) {
        g.rect(p.x * t + 3, p.y * t + 3, t - 6, t - 6).fill({ color: COLORS.reachable, alpha: 0.32 });
        g.rect(p.x * t + 3, p.y * t + 3, t - 6, t - 6).stroke({
          width: 2,
          color: COLORS.reachable,
          alpha: 0.85,
          alignment: 0,
        });
      }
      this.board.addChild(g);
    }

    // 3. Consoles (interactables) — the next one in sequence glows green.
    for (const c of view.consoles) {
      const g = new Graphics();
      const cx = c.pos.x * t + t / 2;
      const cy = c.pos.y * t + t / 2;
      const r = t * 0.26;
      g.moveTo(cx, cy - r)
        .lineTo(cx + r, cy)
        .lineTo(cx, cy + r)
        .lineTo(cx - r, cy)
        .closePath()
        .fill(c.isNext ? COLORS.consoleNext : COLORS.consoleIdle);
      if (c.reachableNext) g.stroke({ width: 3, color: COLORS.selection });
      this.board.addChild(g);
    }

    // 4. Units: colored circles, selection ring, hp pips, downed dimmed.
    const drawUnits: DrawUnit[] = view.units.map((u) => {
      const o = override?.find((r) => r.id === u.id);
      const pos = o ? o.pos : u.pos;
      const hp = o ? o.hp : u.hp;
      return { id: u.id, side: u.side, pos, hp, maxHp: u.maxHp, alive: hp > 0, selected: u.selected };
    });
    for (const u of drawUnits) {
      const g = new Graphics();
      const cx = u.pos.x * t + t / 2;
      const cy = u.pos.y * t + t / 2;
      const r = t * 0.3;
      const base = !u.alive ? COLORS.downed : u.side === "player" ? COLORS.player : COLORS.enemy;
      if (u.selected && u.alive) g.circle(cx, cy, r + 4).stroke({ width: 3, color: COLORS.selection });
      g.circle(cx, cy, r).fill({ color: base, alpha: u.alive ? 1 : 0.5 });
      g.circle(cx, cy, r).stroke({ width: 2, color: 0x0b0f1a });
      if (!u.alive) {
        const d = r * 0.5;
        g.moveTo(cx - d, cy - d)
          .lineTo(cx + d, cy + d)
          .moveTo(cx + d, cy - d)
          .lineTo(cx - d, cy + d)
          .stroke({ width: 2, color: COLORS.bg });
      }
      this.board.addChild(g);

      if (u.alive) this.board.addChild(this.hpPips(u, cx, cy - r - 7, t));
    }

    // 5. Target markers with the exact shared hit% (spec §11).
    for (const target of view.targets) {
      const g = new Graphics();
      const cx = target.pos.x * t + t / 2;
      const cy = target.pos.y * t + t / 2;
      g.circle(cx, cy, t * 0.42).stroke({ width: 3, color: COLORS.targetRing });
      this.board.addChild(g);
      const label = new Text({
        text: `${target.hitPct}%`,
        style: {
          fill: COLORS.text,
          fontSize: Math.round(t * 0.28),
          fontFamily: "system-ui",
          fontWeight: "700",
        },
      });
      label.anchor.set(0.5);
      label.x = cx;
      label.y = cy + t * 0.34;
      const bg = new Graphics();
      bg.roundRect(
        cx - label.width / 2 - 4,
        cy + t * 0.34 - label.height / 2 - 1,
        label.width + 8,
        label.height + 2,
        4,
      ).fill({ color: 0x000000, alpha: 0.6 });
      this.board.addChild(bg);
      this.board.addChild(label);
    }
  }

  private hpPips(u: DrawUnit, cx: number, top: number, t: number): Graphics {
    const g = new Graphics();
    const max = Math.max(1, u.maxHp);
    const gap = 2;
    const pipW = Math.min((t * 0.7) / max - gap, 8);
    const totalW = max * pipW + (max - 1) * gap;
    const startX = cx - totalW / 2;
    const color = u.side === "player" ? COLORS.hpFull : COLORS.hpEnemy;
    for (let i = 0; i < max; i++) {
      g.rect(startX + i * (pipW + gap), top, pipW, 4).fill(i < u.hp ? color : COLORS.hpEmpty);
    }
    return g;
  }

  destroy(): void {
    this.disposed = true;
    if (this.app) {
      const canvas = this.app.canvas;
      this.app.destroy(true);
      canvas?.remove();
      this.app = null;
    }
  }
}
