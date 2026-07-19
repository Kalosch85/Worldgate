# Game assets (sliced from `art-src/`)

Individual PNGs consumed by the app, sliced out of the multi-asset source
sheets in [`art-src/`](../../art-src/). Regenerate with
[`scripts/slice-art.py`](../../scripts/slice-art.py).

## Provenance

| Slice(s)                                | Source sheet        | Wired into                          |
| --------------------------------------- | ------------------- | ----------------------------------- |
| `units/enemy-insect-warrior.png`        | `1784443852254.png` | enemy unit billboard (battle board) |
| `units/enemy-insect-drone-a/-b.png`     | `1784443852254.png` | delivered; not yet wired            |
| `abilities/ab-shot.png`, `ab-patch.png` | `1784443966825.png` | ability bar (Shot, Field Patch)     |
| `abilities/ab-stasis.png`               | `1784443966825.png` | delivered; no matching ability yet  |
| `facilities/*.png`                      | `1784443899071.png` | delivered; not yet wired (base UI)  |

## Alpha note

None of the `art-src/` sheets carry a real alpha channel — they are opaque RGB
with a painted checkerboard/flat background. Transparency is generated at slice
time by flood-filling the background in from the borders and keying it to alpha,
then cutting each subject out as its own connected component. See
`scripts/slice-art.py`.

The `art-src/` terrain sheets (`1784443611555.png` = `1784443971988.png`,
`1784443620783.png`, `1784443629063.png`) are intentionally **not** sliced —
terrain is out of scope for this pass.
