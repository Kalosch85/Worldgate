# Game assets (sliced from `art-src/`)

Individual PNGs consumed by the app, sliced out of the multi-asset source
sheets in [`art-src/`](../../art-src/). Regenerate with
[`scripts/slice-art.py`](../../scripts/slice-art.py).

## Provenance

| Slice(s)                                                         | Source sheet                               | Wired into                                                             |
| ---------------------------------------------------------------- | ------------------------------------------ | ---------------------------------------------------------------------- |
| `units/enemy-insect-warrior.png`                                 | `1784443852254.png`                        | enemy unit billboard (battle board)                                    |
| `units/enemy-insect-drone-a/-b.png`                              | `1784443852254.png`                        | delivered; not yet wired                                               |
| `units/hero-mercer.png`, `hero-okafor.png`                       | `1784478796872.png`                        | player-hero billboards (`h_mercer`, `h_okafor`)                        |
| `abilities/ab-shot.png`, `ab-patch.png`                          | `1784443966825.png`                        | ability bar (Shot, Field Patch)                                        |
| `abilities/ab-stasis.png`                                        | `1784443966825.png`                        | delivered; no matching ability yet                                     |
| `facilities/*.png`                                               | `1784443899071.png`                        | delivered; not yet wired (base UI)                                     |
| `tiles/floor.png`, `wall.png`, `cover-low.png`, `cover-high.png` | `seamless_pattern_32x32px_SpriteSheet.png` | battle board tiles (floor / `#` wall / `-` low cover / `+` high cover) |

## Alpha note

The original AI-generated sheets (units / abilities / facilities / terrain) carry
**no** real alpha channel — they are opaque RGB with a painted checkerboard/flat
background. For those, transparency is generated at slice time by flood-filling
the background in from the borders and keying it to alpha, then cutting each
subject out as its own connected component. The later top-down tile pack already
has real RGBA, so its tiles are just cropped. See `scripts/slice-art.py`.

The `art-src/` terrain sheets (`1784443611555.png` = `1784443971988.png`,
`1784443620783.png`, `1784443629063.png`) are intentionally **not** sliced —
they are isometric, alpha-less and don't fit the top-down grid. The board tiles
come instead from the top-down `tileset`/`seamless_pattern` pack (real RGBA).

## Tile pack attribution

The `tiles/*.png` are cut from the top-down seamless tileset in `art-src/`
(`seamless_pattern_32x32px_SpriteSheet.png`), a demo asset pack by **Trevor
Pupkin** — https://trevor-pupkin.itch.io/. Per its licence (`art-src/Read
Me.txt`) it may be used and modified in free or commercial projects but not
redistributed or resold on its own.
