/**
 * PixiJS board renderer (task 4.3, tactics-engine spec §11). Draws a
 * `BattleView` — grid from the map tile legend, cover, consoles, units with hp
 * pips, and the move/target overlays — onto a WebGL canvas, and reports tile
 * taps back to the host. Tiles (floor/wall/cover) draw top-down textures from
 * `public/assets/tiles/` and units draw billboards from `public/assets/units/`
 * (the matching hero for players, the insect for enemies); each falls back to
 * its colored shape until its texture loads. Consoles and the pips/overlays stay
 * colored shapes (spec §11, art-pass note).
 *
 * This is the one place Pixi lives. It holds no game rules and no UI state: it
 * renders whatever `BattleView` (optionally with replay-overridden unit
 * positions) it is handed and calls `onTap(x, y)` with the tile a pointer hit.
 * The React host (BattleScreen) owns selection, mode, and dispatch.
 */
import { Application, Assets, Container, Graphics, Sprite, Text, type Texture } from "pixi.js";
import type { BattleView } from "./battleModel.js";
import type { ReplayUnit } from "./replay.js";
import {
  clampViewport,
  fitScale,
  initialViewport,
  pinchPan,
  scaleBounds,
  screenToTile,
  zoomTo,
  type GestureStart,
  type Viewport,
  type ViewportBounds,
} from "./viewport.js";

const COLORS = {
  bg: 0x0b0f1a,
  floor: 0x141a2a,
  floorAlt: 0x182034,
  gridLine: 0x2a3450,
  wall: 0x39456b,
  lowCover: 0x5a4a23,
  highCover: 0x7a5a1f,
  reachable: 0x4d7cff,
  // §4a ability-range coverage — a warm amber outline, distinct from the blue
  // movement fill so the two overlays never read as the same thing.
  abilityRange: 0xf0b429,
  // §4b enemy threat zone — a danger-red wash.
  threat: 0xff5c7a,
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
  apBadge: 0xffcf5c,
  apBadgeText: 0x0b0f1a,
  text: 0xffffff,
} as const;

/** The board is drawn once at this fixed logical tile size; pinch-zoom scales
 * the whole board container rather than re-tiling. At scale 1 a tile is 64px
 * (well past ARCHITECTURE §10's 44px minimum); the initial fit lets you zoom
 * out to the whole map and back in. */
const BASE_TILE = 64;
/** How far a single pointer may drift and still count as a tap, not a drag. */
const TAP_SLOP = 12;

/** Board art served from `public/assets/`. `BASE_URL` is the Vite base
 * ("/Worldgate/" in production) so requests resolve under the GitHub Pages
 * sub-path. */
const ASSETS = `${import.meta.env.BASE_URL}assets`;
const ENEMY_SPRITE_URL = `${ASSETS}/units/enemy-insect-warrior.png`;
/** Player-hero billboards keyed by hero id. A player unit whose hero has no
 * entry (or whose texture hasn't loaded) falls back to the colored disc. */
const HERO_SPRITE_URLS: Record<string, string> = {
  h_mercer: `${ASSETS}/units/hero-mercer.png`,
  h_okafor: `${ASSETS}/units/hero-okafor.png`,
};
/** Top-down tile textures, one per map-legend tile kind. Loaded async; each
 * kind falls back to its flat colour until (and if) the texture arrives. */
const TILE_URLS = {
  floor: `${ASSETS}/tiles/floor.png`,
  wall: `${ASSETS}/tiles/wall.png`,
  lowCover: `${ASSETS}/tiles/cover-low.png`,
  highCover: `${ASSETS}/tiles/cover-high.png`,
} as const;
type TileKind = keyof typeof TILE_URLS;

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
  ap: number;
  canAct: boolean;
  hero?: string;
}

export class BattleCanvas {
  private app: Application | null = null;
  private readonly container: HTMLElement;
  private readonly onTap: (x: number, y: number) => void;
  private board = new Container();
  private readonly tile = BASE_TILE;
  private gridWidth = 0;
  private gridHeight = 0;
  private lastView: BattleView | null = null;
  private lastOverride: readonly ReplayUnit[] | null = null;
  private disposed = false;
  // The enemy billboard texture; null until it loads (or if loading fails, in
  // which case enemies fall back to the colored shape).
  private enemyTexture: Texture | null = null;
  // Player-hero billboards by hero id; entries fill in as they load.
  private heroTextures: Record<string, Texture> = {};
  // Top-down tile textures by kind; entries are null until loaded, and each
  // tile kind falls back to its flat colour meanwhile.
  private tileTextures: Partial<Record<TileKind, Texture>> = {};

  // Pan/zoom state (spec §11): a viewport transform on `board`, driven by the
  // pure math in viewport.ts. Bounds are recomputed each render from the board
  // and canvas sizes.
  private viewport: Viewport = { scale: 1, offsetX: 0, offsetY: 0 };
  private bounds: ViewportBounds = { boardW: 0, boardH: 0, viewW: 0, viewH: 0, minScale: 1, maxScale: 1 };
  private initialized = false;
  // Live pointers by id (canvas-local px), the active two-finger gesture, and
  // the pending single-finger tap.
  private readonly pointers = new Map<number, { x: number; y: number }>();
  private gesture: GestureStart | null = null;
  private tapPointer: { id: number; x: number; y: number; moved: boolean } | null = null;
  private resizeObserver: ResizeObserver | null = null;

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

    // Own the touch gestures ourselves (spec §11: pinch-zoom + two-finger pan);
    // `touch-action: none` stops the browser from also panning/zooming the page.
    const canvas = app.canvas;
    canvas.style.touchAction = "none";
    canvas.style.display = "block";
    canvas.addEventListener("pointerdown", this.onPointerDown, { passive: false });
    canvas.addEventListener("pointermove", this.onPointerMove, { passive: false });
    canvas.addEventListener("pointerup", this.onPointerUp, { passive: false });
    canvas.addEventListener("pointercancel", this.onPointerUp, { passive: false });
    canvas.addEventListener("wheel", this.onWheel, { passive: false });
    this.container.appendChild(canvas);

    // Re-fit on container resize (orientation change, layout settle).
    if (typeof ResizeObserver !== "undefined") {
      this.resizeObserver = new ResizeObserver(() => {
        if (this.lastView) this.render(this.lastView, this.lastOverride);
      });
      this.resizeObserver.observe(this.container);
    }

    // Load the board art in the background; each texture redraws as it arrives
    // so tiles/enemies swap from their fallback fills to the art. Load failures
    // just leave the texture null and keep the fallback.
    void this.loadArt();

    if (this.lastView) this.render(this.lastView, this.lastOverride);
  }

  private async loadArt(): Promise<void> {
    const redraw = () => {
      if (!this.disposed && this.lastView) this.render(this.lastView, this.lastOverride);
    };
    // Enemy billboard.
    void Assets.load<Texture>(ENEMY_SPRITE_URL)
      .then((texture) => {
        if (this.disposed) return;
        this.enemyTexture = texture;
        redraw();
      })
      .catch(() => {});
    // Hero billboards.
    for (const [heroId, url] of Object.entries(HERO_SPRITE_URLS)) {
      void Assets.load<Texture>(url)
        .then((texture) => {
          if (this.disposed) return;
          this.heroTextures[heroId] = texture;
          redraw();
        })
        .catch(() => {});
    }
    // Tile textures — nearest-neighbour so the pixel art stays crisp when the
    // 32px source is drawn at the 64px logical tile size.
    for (const kind of Object.keys(TILE_URLS) as TileKind[]) {
      void Assets.load<Texture>(TILE_URLS[kind])
        .then((texture) => {
          if (this.disposed) return;
          texture.source.scaleMode = "nearest";
          this.tileTextures[kind] = texture;
          redraw();
        })
        .catch(() => {});
    }
  }

  private localPoint(e: PointerEvent | WheelEvent): { x: number; y: number } {
    const canvas = this.app?.canvas;
    const rect = canvas?.getBoundingClientRect();
    return { x: e.clientX - (rect?.left ?? 0), y: e.clientY - (rect?.top ?? 0) };
  }

  private readonly onPointerDown = (e: PointerEvent): void => {
    e.preventDefault();
    const p = this.localPoint(e);
    this.pointers.set(e.pointerId, p);
    this.app?.canvas.setPointerCapture(e.pointerId);
    if (this.pointers.size === 1) {
      this.tapPointer = { id: e.pointerId, x: p.x, y: p.y, moved: false };
    } else if (this.pointers.size === 2) {
      this.tapPointer = null; // a second finger means this is a gesture, not a tap
      this.beginGesture();
    }
  };

  private readonly onPointerMove = (e: PointerEvent): void => {
    const known = this.pointers.get(e.pointerId);
    if (!known) return;
    const p = this.localPoint(e);
    this.pointers.set(e.pointerId, p);
    if (this.pointers.size >= 2 && this.gesture) {
      e.preventDefault();
      const [a, b] = [...this.pointers.values()];
      if (!a || !b) return;
      const dist = Math.hypot(a.x - b.x, a.y - b.y) || 1;
      const midX = (a.x + b.x) / 2;
      const midY = (a.y + b.y) / 2;
      this.viewport = pinchPan(this.gesture, this.bounds, dist, midX, midY);
      this.applyTransform();
    } else if (this.tapPointer && e.pointerId === this.tapPointer.id) {
      if (Math.hypot(p.x - this.tapPointer.x, p.y - this.tapPointer.y) > TAP_SLOP) {
        this.tapPointer.moved = true;
      }
    }
  };

  private readonly onPointerUp = (e: PointerEvent): void => {
    const last = this.pointers.get(e.pointerId);
    this.pointers.delete(e.pointerId);
    if (this.pointers.size < 2) this.gesture = null;
    if (this.tapPointer && e.pointerId === this.tapPointer.id) {
      if (last && !this.tapPointer.moved) this.fireTap(last.x, last.y);
      this.tapPointer = null;
    }
  };

  private readonly onWheel = (e: WheelEvent): void => {
    e.preventDefault();
    const p = this.localPoint(e);
    const factor = e.deltaY < 0 ? 1.1 : 1 / 1.1;
    this.viewport = zoomTo(this.viewport, this.bounds, this.viewport.scale * factor, p.x, p.y);
    this.applyTransform();
  };

  /** Snapshot the current two-finger span as the gesture origin (spec §11). */
  private beginGesture(): void {
    const [a, b] = [...this.pointers.values()];
    if (!a || !b) return;
    this.gesture = {
      viewport: { ...this.viewport },
      dist: Math.hypot(a.x - b.x, a.y - b.y) || 1,
      midX: (a.x + b.x) / 2,
      midY: (a.y + b.y) / 2,
    };
  }

  /** Turn a completed tap into a tile coordinate through the live viewport. */
  private fireTap(sx: number, sy: number): void {
    if (!this.lastView) return;
    const { x, y } = screenToTile(this.viewport, this.tile, sx, sy);
    if (x < 0 || y < 0 || x >= this.gridWidth || y >= this.gridHeight) return;
    this.onTap(x, y);
  }

  /** Push the current viewport onto the board container as a scale + offset. */
  private applyTransform(): void {
    this.board.scale.set(this.viewport.scale);
    this.board.position.set(this.viewport.offsetX, this.viewport.offsetY);
  }

  /** The DOM node hosting the canvas (may be null before init). */
  get canvas(): HTMLCanvasElement | null {
    return this.app?.canvas ?? null;
  }

  /** Fit the viewport to the current board and canvas size. On first render it
   * starts at base scale, centered; afterward it re-clamps the live viewport so
   * a resize can't strand the board off-screen. */
  private fitViewport(view: BattleView, viewW: number, viewH: number): void {
    const boardW = view.width * this.tile;
    const boardH = view.height * this.tile;
    const { minScale, maxScale } = scaleBounds(fitScale(boardW, boardH, viewW, viewH));
    this.bounds = { boardW, boardH, viewW, viewH, minScale, maxScale };
    this.viewport = this.initialized
      ? clampViewport(this.viewport, this.bounds)
      : initialViewport(this.bounds, 1);
    this.initialized = true;
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

    // Canvas fills the container; the board is pan/zoomed within it.
    const viewW = this.container.clientWidth || view.width * this.tile;
    const viewH = this.container.clientHeight || view.height * this.tile;
    app.renderer.resize(viewW, viewH);
    this.fitViewport(view, viewW, viewH);

    this.board.removeChildren().forEach((c) => c.destroy());
    const t = this.tile;

    // 1. Tiles from the map legend. Each tile draws its texture when loaded and
    // otherwise falls back to a flat fill; a faint grid overlay always sits on
    // top so tile boundaries read on the seamless textures.
    const tiles = new Graphics();
    const grid = new Graphics();
    for (let y = 0; y < view.height; y++) {
      const row = view.tiles[y] ?? "";
      for (let x = 0; x < view.width; x++) {
        const ch = row[x] ?? ".";
        const kind: TileKind =
          ch === "#" ? "wall" : ch === "-" ? "lowCover" : ch === "+" ? "highCover" : "floor";
        const texture = this.tileTextures[kind];
        if (texture) {
          const sprite = new Sprite(texture);
          sprite.x = x * t;
          sprite.y = y * t;
          sprite.width = t;
          sprite.height = t;
          this.board.addChild(sprite);
        } else {
          const checker = (x + y) % 2 === 0 ? COLORS.floor : COLORS.floorAlt;
          const fill =
            kind === "wall"
              ? COLORS.wall
              : kind === "lowCover"
                ? COLORS.lowCover
                : kind === "highCover"
                  ? COLORS.highCover
                  : checker;
          tiles.rect(x * t, y * t, t, t).fill(fill);
        }
        grid.rect(x * t, y * t, t, t).stroke({ width: 1, color: COLORS.gridLine, alignment: 0, alpha: 0.5 });
      }
    }
    this.board.addChildAt(tiles, 0);
    this.board.addChild(grid);

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

    // 2b. Enemy threat zone (§4b) — a translucent danger-red wash across the
    // tiles the inspected enemy could reach and attack. Drawn under units so it
    // never covers a tap target (the tile stays ≥ 44px tappable).
    if (view.threatZone.length > 0) {
      const g = new Graphics();
      for (const p of view.threatZone) {
        g.rect(p.x * t + 1, p.y * t + 1, t - 2, t - 2).fill({ color: COLORS.threat, alpha: 0.2 });
        g.rect(p.x * t + 1, p.y * t + 1, t - 2, t - 2).stroke({
          width: 1,
          color: COLORS.threat,
          alpha: 0.55,
          alignment: 0,
        });
      }
      this.board.addChild(g);
    }

    // 2c. Ability-range coverage (§4a) — an amber outline (no heavy fill) so it
    // reads as "in range" and stays visually distinct from the blue move fill.
    if (view.abilityRange.length > 0) {
      const g = new Graphics();
      for (const p of view.abilityRange) {
        g.rect(p.x * t + 5, p.y * t + 5, t - 10, t - 10).stroke({
          width: 2,
          color: COLORS.abilityRange,
          alpha: 0.9,
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
    const replaying = override != null;
    const drawUnits: DrawUnit[] = view.units.map((u) => {
      const o = override?.find((r) => r.id === u.id);
      const pos = o ? o.pos : u.pos;
      const hp = o ? o.hp : u.hp;
      return {
        id: u.id,
        side: u.side,
        pos,
        hp,
        maxHp: u.maxHp,
        alive: hp > 0,
        selected: u.selected,
        ap: u.ap,
        // "Can act" badge is a player-phase affordance; hide it while the enemy
        // phase replays (spec §11).
        canAct: u.canAct && !replaying,
        hero: u.hero,
      };
    });
    for (const u of drawUnits) {
      const g = new Graphics();
      const cx = u.pos.x * t + t / 2;
      const cy = u.pos.y * t + t / 2;
      const r = t * 0.3;
      const base = !u.alive ? COLORS.downed : u.side === "player" ? COLORS.player : COLORS.enemy;
      // Alive units render as their billboard once the texture is loaded — the
      // matching hero for players, the insect for enemies; downed units and the
      // pre-load frames keep the colored shape.
      const texture = !u.alive
        ? null
        : u.side === "enemy"
          ? this.enemyTexture
          : (u.hero && this.heroTextures[u.hero]) || null;
      if (u.selected && u.alive) g.circle(cx, cy, r + 4).stroke({ width: 3, color: COLORS.selection });
      if (!texture) {
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
      }
      this.board.addChild(g);
      if (texture) this.board.addChild(this.unitSprite(texture, cx, cy, r, t));

      if (u.alive) this.board.addChild(this.hpPips(u, cx, cy - r - 7, t));

      // "Can act" badge: an amber disc at the top-right showing remaining AP,
      // marking every player unit that still has an activation (spec §11).
      if (u.canAct) {
        const br = Math.max(9, r * 0.4);
        const bx = cx + r * 0.72;
        const by = cy - r * 0.72;
        const badge = new Graphics();
        badge.circle(bx, by, br).fill(COLORS.apBadge);
        badge.circle(bx, by, br).stroke({ width: 2, color: COLORS.bg });
        this.board.addChild(badge);
        const label = new Text({
          text: `${u.ap}`,
          style: {
            fill: COLORS.apBadgeText,
            fontSize: Math.round(br * 1.3),
            fontFamily: "system-ui",
            fontWeight: "700",
          },
        });
        label.anchor.set(0.5);
        label.x = bx;
        label.y = by;
        this.board.addChild(label);
      }
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

    // Apply the current pan/zoom as a transform on the whole board.
    this.applyTransform();
  }

  /** A unit billboard (hero or enemy), scaled to sit within its tile and
   * anchored near the feet so it "stands" on the tile rather than floating.
   * Portrait sprites (taller than wide, e.g. the heroes) fit to a bit over the
   * tile height; wide sprites fit to the tile width. */
  private unitSprite(texture: Texture, cx: number, cy: number, r: number, t: number): Sprite {
    const sprite = new Sprite(texture);
    sprite.anchor.set(0.5, 0.82);
    const tw = texture.width || 1;
    const th = texture.height || 1;
    const scale = th >= tw ? (t * 1.5) / th : (t * 1.3) / tw;
    sprite.scale.set(scale);
    sprite.x = cx;
    sprite.y = cy + r * 0.55;
    return sprite;
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
    this.resizeObserver?.disconnect();
    this.resizeObserver = null;
    this.pointers.clear();
    this.gesture = null;
    this.tapPointer = null;
    if (this.app) {
      const canvas = this.app.canvas;
      this.app.destroy(true);
      canvas?.remove();
      this.app = null;
    }
  }
}
