# Frontend Assets

Static art and audio that ship inside the Vite bundle. Referenced via ES imports so Vite hashes + cache-busts filenames at build time.

## Structure

```
frontend/src/assets/
├── worlds/              # Per-world art (Phase 5: Biomes & Creatures)
│   ├── <world-id>/
│   │   ├── ground/       # Tileable floor textures (grass, asphalt, sand...)
│   │   ├── decorations/  # Static sprites scattered on the field (trees, rocks, buildings)
│   │   ├── creatures/    # Character sprites per growth tier (seed/happy/chubby/ripe)
│   │   └── README.md     # License credits + source URLs for this world's assets
│   └── ...
└── README.md
```

## Naming convention

- Lowercase, hyphen-separated filenames
- `<entity-type>-<variant>.png` — `tree-oak.png`, `rock-mossy.png`, `poring-seed.png`
- Keep original Kenney filenames when possible so provenance is obvious

## Licensing discipline

Every world directory **must** have a `README.md` listing each asset's source and license. Since we target CC0 (public domain) packs, this is short — usually one sentence pointing at the Kenney page.

**What NOT to commit:**
- Original zip archives — unzip and cherry-pick only what's used
- Unused PNGs — they bloat every git clone forever
- Non-CC0 / non-MIT licensed assets without explicit commercial-use clearance documented

## How to reference an asset in code

```ts
import grassUrl from "@/assets/worlds/forest/ground/grass-tile.png";
import { Assets } from "pixi.js";

const texture = await Assets.load(grassUrl);
// <pixiSprite texture={texture} />
```

Vite handles the actual filename hashing, cache-busting, and bundling.

## Related docs

- [Phase 5 plan in PROGRESS.md](../../../docs/PROGRESS.md#phase-5-biomes--creatures-not-started)
- [Field art pipeline analysis](../../../docs/research/field-art-pipeline-analysis.md)
- [Multi-world pipeline analysis](../../../docs/research/multi-world-pipeline-analysis.md)
