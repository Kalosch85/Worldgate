/**
 * Pan/zoom viewport math for the tactical board (renderer, spec §11). Pure
 * functions — no Pixi, no DOM, no state — so the gesture behavior (pinch-zoom,
 * two-finger pan, screen→tile mapping, edge clamping) is unit-testable without
 * WebGL. `BattleCanvas` owns the pointer plumbing and applies the `Viewport`
 * this module computes as a transform on the board container.
 *
 * Coordinate model: the board is drawn once at a fixed `baseTile` size in board
 * space; a `Viewport` (uniform `scale` + top-left `offset` in canvas px) maps
 * board space onto the visible canvas. A board point `b` shows at screen
 * `offset + b * scale`; inverting that gives `screenToTile`.
 */
export interface Viewport {
  scale: number;
  offsetX: number;
  offsetY: number;
}

export interface ViewportBounds {
  /** Board size in unscaled (base) px. */
  boardW: number;
  boardH: number;
  /** Visible canvas size in px. */
  viewW: number;
  viewH: number;
  minScale: number;
  maxScale: number;
}

/** A two-finger gesture's starting snapshot: the viewport when the second
 * finger landed, plus the initial pinch distance and midpoint (canvas px). */
export interface GestureStart {
  viewport: Viewport;
  dist: number;
  midX: number;
  midY: number;
}

/** The scale at which the whole board just fits inside the viewport. */
export function fitScale(boardW: number, boardH: number, viewW: number, viewH: number): number {
  if (boardW <= 0 || boardH <= 0) return 1;
  return Math.min(viewW / boardW, viewH / boardH);
}

/** Zoom limits: never smaller than the whole-board fit (so you can always see
 * everything), never larger than `absMax`. `1` (base tile) sits in range when
 * the board fits at base size. */
export function scaleBounds(fit: number, absMax = 2.5): { minScale: number; maxScale: number } {
  const minScale = Math.min(1, fit);
  return { minScale, maxScale: Math.max(absMax, minScale) };
}

export function clampScale(scale: number, b: ViewportBounds): number {
  return Math.max(b.minScale, Math.min(b.maxScale, scale));
}

/** Offset that centers the scaled board in the viewport, per axis. */
function centeredOffset(scale: number, b: ViewportBounds): { offsetX: number; offsetY: number } {
  return { offsetX: (b.viewW - b.boardW * scale) / 2, offsetY: (b.viewH - b.boardH * scale) / 2 };
}

/**
 * Clamp an offset so the board can't drift off the viewport: if the scaled
 * board is smaller than the viewport on an axis it is centered; otherwise the
 * offset is kept within `[view - scaledBoard, 0]` so neither edge pulls inward.
 */
export function clampOffset(
  scale: number,
  offsetX: number,
  offsetY: number,
  b: ViewportBounds,
): { offsetX: number; offsetY: number } {
  const sbW = b.boardW * scale;
  const sbH = b.boardH * scale;
  const c = centeredOffset(scale, b);
  const x = sbW <= b.viewW ? c.offsetX : Math.min(0, Math.max(b.viewW - sbW, offsetX));
  const y = sbH <= b.viewH ? c.offsetY : Math.min(0, Math.max(b.viewH - sbH, offsetY));
  return { offsetX: x, offsetY: y };
}

export function clampViewport(vp: Viewport, b: ViewportBounds): Viewport {
  const scale = clampScale(vp.scale, b);
  const off = clampOffset(scale, vp.offsetX, vp.offsetY, b);
  return { scale, offsetX: off.offsetX, offsetY: off.offsetY };
}

/** The starting viewport: `baseScale` (clamped) with the board centered. */
export function initialViewport(b: ViewportBounds, baseScale = 1): Viewport {
  const scale = clampScale(baseScale, b);
  const c = centeredOffset(scale, b);
  return clampViewport({ scale, offsetX: c.offsetX, offsetY: c.offsetY }, b);
}

/** Zoom toward `targetScale` while keeping the board point under the screen
 * anchor `(ax, ay)` fixed (wheel zoom, tap-to-zoom). */
export function zoomTo(
  vp: Viewport,
  b: ViewportBounds,
  targetScale: number,
  ax: number,
  ay: number,
): Viewport {
  const scale = clampScale(targetScale, b);
  const k = scale / vp.scale;
  const offsetX = ax - (ax - vp.offsetX) * k;
  const offsetY = ay - (ay - vp.offsetY) * k;
  return clampViewport({ scale, offsetX, offsetY }, b);
}

/**
 * Combined pinch-zoom + two-finger pan. From the gesture start, the current
 * finger distance drives the new scale and the current midpoint pins the board
 * point that was under the starting midpoint — so spreading zooms and sliding
 * both fingers pans, in one continuous transform.
 */
export function pinchPan(
  start: GestureStart,
  b: ViewportBounds,
  curDist: number,
  curMidX: number,
  curMidY: number,
): Viewport {
  const scale = clampScale(start.viewport.scale * (curDist / start.dist), b);
  // Board-space point under the gesture's starting midpoint.
  const localX = (start.midX - start.viewport.offsetX) / start.viewport.scale;
  const localY = (start.midY - start.viewport.offsetY) / start.viewport.scale;
  // Keep that point under the current midpoint.
  const offsetX = curMidX - localX * scale;
  const offsetY = curMidY - localY * scale;
  return clampViewport({ scale, offsetX, offsetY }, b);
}

/** Map a canvas-space point to a board tile (may be out of bounds; caller
 * checks against the grid size). */
export function screenToTile(
  vp: Viewport,
  baseTile: number,
  sx: number,
  sy: number,
): { x: number; y: number } {
  return {
    x: Math.floor((sx - vp.offsetX) / vp.scale / baseTile),
    y: Math.floor((sy - vp.offsetY) / vp.scale / baseTile),
  };
}
