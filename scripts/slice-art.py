#!/usr/bin/env python3
"""Slice the multi-asset source sheets in `art-src/` into individual RGBA PNGs
under `public/assets/`.

The source sheets are opaque RGB (no alpha channel); a painted checkerboard/flat
colour stands in for transparency. This tool regenerates real transparency by
flood-filling the background in from the sheet borders, keying it to alpha, and
cutting each subject out as its own connected component (largest N components,
which drops baked-in text labels). Terrain sheets are intentionally skipped.

Pure Python stdlib (zlib) — no third-party deps. Run from the repo root:

    python3 scripts/slice-art.py
"""
import os, sys

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
from _pngtool import decode, bg_mask, components, extract, encode, crop  # noqa: E402

ROOT = os.path.dirname(HERE)
SRC = os.path.join(ROOT, "art-src")


def out(rel):
    fp = os.path.join(ROOT, "public", "assets", rel)
    os.makedirs(os.path.dirname(fp), exist_ok=True)
    return fp


def by_center(comps, cx, cy=None):
    if cy is None:
        return min(comps, key=lambda c: abs((c[1] + c[3]) // 2 - cx))
    return min(comps, key=lambda c: abs((c[1] + c[3]) // 2 - cx) + abs((c[2] + c[4]) // 2 - cy))


def slice_sheet(fname, tol, min_area, take, assign):
    w, h, rgba = decode(os.path.join(SRC, fname))
    mask = bg_mask(w, h, rgba, tol)
    comps = components(w, h, mask, min_area)[:take]
    for rel, comp in assign(comps):
        cw, ch, cr = extract(w, h, rgba, mask, comp, pad=8)
        encode(out(rel), cw, ch, cr)
        print(f"  {rel}  {cw}x{ch}")


def slice_tiles():
    """Cut individual board tiles from the top-down seamless tileset (real RGBA,
    so a plain crop — no keying). Cells are 32x32, indexed (col, row)."""
    fname = "seamless_pattern_32x32px_SpriteSheet.png"
    w, h, rgba = decode(os.path.join(SRC, fname))
    C = 32
    cells = {
        "tiles/floor.png": (4, 0),
        "tiles/wall.png": (0, 0),
        "tiles/cover-low.png": (1, 2),
        "tiles/cover-high.png": (3, 2),
    }
    print("tiles:")
    for rel, (col, row) in cells.items():
        cr = crop(w, h, rgba, col * C, row * C, C, C)
        encode(out(rel), C, C, cr)
        print(f"  {rel}  {C}x{C}")


def main():
    # Insect units — 3 subjects; warrior is the largest component.
    def insects(comps):
        warrior = max(comps, key=lambda c: c[0])
        rest = sorted((c for c in comps if c is not warrior), key=lambda c: (c[1] + c[3]) // 2)
        return [
            ("units/enemy-insect-warrior.png", warrior),
            ("units/enemy-insect-drone-a.png", rest[0]),
            ("units/enemy-insect-drone-b.png", rest[1]),
        ]

    print("insects:")
    slice_sheet("1784443852254.png", 28, 8000, 3, insects)

    # Ability icons — 3 in a row (labels excluded by taking the 3 largest).
    print("abilities:")
    slice_sheet(
        "1784443966825.png", 24, 10000, 3,
        lambda c: [
            ("abilities/ab-shot.png", by_center(c, 316)),
            ("abilities/ab-patch.png", by_center(c, 703)),
            ("abilities/ab-stasis.png", by_center(c, 1084)),
        ],
    )

    # Facility icons — 2x2 grid.
    print("facilities:")
    slice_sheet(
        "1784443899071.png", 28, 20000, 4,
        lambda c: [
            ("facilities/expanded-quarters.png", by_center(c, 527, 199)),
            ("facilities/medical-bay.png", by_center(c, 876, 196)),
            ("facilities/workshop.png", by_center(c, 530, 539)),
            ("facilities/gate-annex.png", by_center(c, 874, 539)),
        ],
    )

    slice_tiles()


if __name__ == "__main__":
    main()
