import { describe, expect, it } from "vitest";
import {
  clampOffset,
  clampScale,
  fitScale,
  initialViewport,
  pinchPan,
  scaleBounds,
  screenToTile,
  zoomTo,
  type GestureStart,
  type ViewportBounds,
} from "./viewport.js";

/**
 * Pan/zoom math (spec §11). The Pixi layer can't be unit-tested (needs WebGL),
 * so all the gesture behavior lives in these pure functions and is asserted
 * here: fit/clamp limits, screen→tile inversion, wheel/pinch anchoring, and the
 * edge clamp that replaces the old DOM-scroll clipping.
 */

// An 8×6 board at base tile 64 (512×384) inside a 400×320 viewport — i.e. the
// board is larger than the viewport on both axes, so panning is in play.
const BASE = 64;
function bounds(over: Partial<ViewportBounds> = {}): ViewportBounds {
  const boardW = 8 * BASE;
  const boardH = 6 * BASE;
  const viewW = over.viewW ?? 400;
  const viewH = over.viewH ?? 320;
  const fit = fitScale(boardW, boardH, viewW, viewH);
  const sb = scaleBounds(fit);
  return { boardW, boardH, viewW, viewH, ...sb, ...over };
}

describe("fit & scale bounds", () => {
  it("fitScale is the tighter of the two axis ratios", () => {
    expect(fitScale(512, 384, 400, 320)).toBeCloseTo(400 / 512); // width-limited
    expect(fitScale(512, 384, 800, 300)).toBeCloseTo(300 / 384); // height-limited
  });

  it("lets you zoom out to the whole board but no further, and caps zoom-in", () => {
    const b = bounds();
    expect(b.minScale).toBeCloseTo(fitScale(512, 384, 400, 320)); // < 1: board bigger than view
    expect(clampScale(0.01, b)).toBeCloseTo(b.minScale);
    expect(clampScale(99, b)).toBe(b.maxScale);
  });

  it("keeps minScale at 1 when the board already fits at base size", () => {
    const b = bounds({ viewW: 900, viewH: 700 }); // fits at scale 1
    expect(b.minScale).toBe(1);
  });
});

describe("clampOffset (replaces the old scroll-clipping)", () => {
  it("centers an axis whose scaled board is smaller than the viewport", () => {
    const b = bounds({ viewW: 900, viewH: 700 });
    const { offsetX, offsetY } = clampOffset(1, 0, 0, b);
    expect(offsetX).toBeCloseTo((900 - 512) / 2);
    expect(offsetY).toBeCloseTo((700 - 384) / 2);
  });

  it("keeps a larger board within its edges — no gap past either side", () => {
    const b = bounds(); // 512×384 board in 400×320 view at scale 1
    // Panning far left/up is clamped so the right/bottom edge can't pull inward.
    expect(clampOffset(1, 999, 999, b)).toEqual({ offsetX: 0, offsetY: 0 });
    // Panning far right/down stops when the far edge meets the viewport edge.
    expect(clampOffset(1, -999, -999, b)).toEqual({ offsetX: 400 - 512, offsetY: 320 - 384 });
  });
});

describe("screenToTile inverts the transform", () => {
  it("maps a centered, unzoomed board back to the right tile", () => {
    const vp = initialViewport(bounds({ viewW: 900, viewH: 700 }), 1); // centered at scale 1
    // Tile (3,2) center in board space = (3.5*64, 2.5*64) = (224,160); on screen
    // that is offset + local.
    const sx = vp.offsetX + 224;
    const sy = vp.offsetY + 160;
    expect(screenToTile(vp, BASE, sx, sy)).toEqual({ x: 3, y: 2 });
  });

  it("still maps correctly after a zoom", () => {
    const b = bounds({ viewW: 900, viewH: 700 });
    const vp = zoomTo(initialViewport(b, 1), b, 2, 100, 100);
    const sx = vp.offsetX + 5.5 * BASE * vp.scale;
    const sy = vp.offsetY + 1.5 * BASE * vp.scale;
    expect(screenToTile(vp, BASE, sx, sy)).toEqual({ x: 5, y: 1 });
  });
});

describe("zoomTo keeps the anchor point fixed", () => {
  it("the board point under the cursor stays under the cursor", () => {
    // Board larger than the viewport so the offset isn't overridden by centering.
    const b = bounds({ viewW: 300, viewH: 240 });
    const vp = initialViewport(b, 1);
    const ax = vp.offsetX + 3 * BASE; // some on-board anchor
    const ay = vp.offsetY + 2 * BASE;
    const localBefore = { x: (ax - vp.offsetX) / vp.scale, y: (ay - vp.offsetY) / vp.scale };
    const zoomed = zoomTo(vp, b, 2, ax, ay);
    const localAfter = { x: (ax - zoomed.offsetX) / zoomed.scale, y: (ay - zoomed.offsetY) / zoomed.scale };
    expect(localAfter.x).toBeCloseTo(localBefore.x);
    expect(localAfter.y).toBeCloseTo(localBefore.y);
  });
});

describe("pinchPan", () => {
  // Board (512×384) larger than the viewport so pan/anchor aren't overridden
  // by centering.
  const b = bounds({ viewW: 300, viewH: 240 });
  const start: GestureStart = { viewport: initialViewport(b, 1), dist: 100, midX: 150, midY: 120 };

  it("spreading the fingers zooms in about the midpoint", () => {
    const out = pinchPan(start, b, 200, 150, 120); // 2× distance, same midpoint
    expect(out.scale).toBeCloseTo(2);
    // Midpoint anchored: the board point under (150,120) is unchanged.
    const localStart = (150 - start.viewport.offsetX) / start.viewport.scale;
    const localEnd = (150 - out.offsetX) / out.scale;
    expect(localEnd).toBeCloseTo(localStart);
  });

  it("sliding both fingers pans without changing scale", () => {
    const out = pinchPan(start, b, 100, 200, 150); // same distance, midpoint +50,+30
    expect(out.scale).toBeCloseTo(1);
    expect(out.offsetX).toBeCloseTo(start.viewport.offsetX + 50);
    expect(out.offsetY).toBeCloseTo(start.viewport.offsetY + 30);
  });

  it("clamps zoom to the allowed range", () => {
    expect(pinchPan(start, b, 100_000, 150, 120).scale).toBe(b.maxScale);
    expect(pinchPan(start, b, 0.0001, 150, 120).scale).toBeCloseTo(b.minScale);
  });
});
