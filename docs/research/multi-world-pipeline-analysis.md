# Multi-World Pipeline — Analysis

**Date:** 2026-04-23
**Analyzed:** Turning TODOgotchi into a multi-biome experience — labels become "worlds," each with its own environment art and creature type. Porings in the forest, cars in the city, spirits in the graveyard, fish in the ocean, etc.
**Licenses:** No new packages. Kenney CC0 art across worlds.
**For:** Phase 5 (Biomes & Creatures). A structural v2 of the field experience, on top of the Phase 1–3 foundation + the field-rendering rework.

---

## Executive Summary

**Recommendation:** ✅ **YES, as Phase 5 — but only after the single-world art pipeline is nailed.**

The proposal: each user-owned `Label` has a `world` attribute (forest / city / graveyard / ocean / dungeon / space / ...). A poring's primary label determines which world it lives in. Each world has its own ground texture, decorations, ambient particles, color grading, and creature art. The field can show either one world at a time (Variant A — "filter mode") or all worlds mixed on the same canvas (Variant B — "zoo mode").

**Why now (as research)**: the idea is natural given Kenney's catalog already covers all these themes for free. The data model is 90% there — `Label` already exists, already scoped per-user, already attachable to porings. A single `world` column unlocks the whole pattern.

**Why not now (as implementation)**: nailing **one** world (the forest) with Tier 0/1/4 from [field-art-pipeline-analysis.md](field-art-pipeline-analysis.md) should come first. Five mediocre biomes is worse than one great one. Get the forest looking *really* good, prove the WorldConfig abstraction works, then additional worlds are ~4-6 hours each.

**Server impact**: minimal. One Alembic migration adding `label.world` (nullable string, default `"forest"`). No new containers, ports, or tunnels. Assets bundle into the existing frontend container.

---

## 1. The Concept — Labels as Worlds

### Current model
- User has `Label[]`
- Each poring has 0..N labels attached (many-to-many via `porings_labels`)
- Labels are just `{ name, color }`

### Proposed model
- Label gains a `world` field: `"forest" | "city" | "graveyard" | "ocean" | "dungeon" | "space" | "library" | null`
- `null` = no world preference (creature uses default world)
- A poring's "world" is derived client-side from its labels:
  - If any attached label has a `world`, use the first one (alphabetical by label name)
  - Otherwise, fall back to the user's default world (stored in `user.default_world`, or hardcoded `"forest"` initially)

### What users experience
1. User creates a label "Work" with color `#3b82f6` and picks `world: city` from a dropdown
2. Any poring labeled "Work" now appears as a **car** on an **asphalt field** with skyscrapers in the background
3. Caress a car → instead of hearts, little exhaust clouds puff out (per-world caress feedback)

This folds categorization, progress tracking, and visual theming into one pattern. Very tamagotchi / Neopets.

---

## 2. Variant A vs Variant B

Two orthogonal UX approaches — pick before implementing.

### Variant A — "filter mode" (recommended for v1)
- Header gets a **world selector** dropdown: "All worlds / Forest / City / Graveyard / ..."
- At any time, the field shows **one world's porings** with **one world's art**
- Switching worlds is a visible transition (fade the ground, swap decorations, swap creatures)
- Porings in other worlds still exist — just off-screen

**Pros**: simple, cohesive, reads as "moving between biomes." Only one asset set loaded at a time → smaller initial bundle. Each world's physics constants / ambient effects can be distinct without conflict.

**Cons**: less visual density. Can't see "all my tasks at a glance" unless there's an "All" mode that… does what? Mixes everything (basically Variant B).

### Variant B — "zoo mode"
- All porings share the field simultaneously, each rendered as the creature of its own world
- A car and a ghost and a fish all on the same canvas, each on its own patch of terrain (or a shared neutral floor)
- Field background is neutral (maybe a biome-neutral plaza / park)

**Pros**: every task visible at once. Feels alive, chaotic, fun. Encourages creating more labels = more visual variety.

**Cons**: art needs to cohere across styles. Pixel-art car next to painterly fish looks weird unless all creatures share a style discipline. Harder to theme ground/ambience since there's no single dominant world.

### Combining them
The strongest answer is **Variant A as default with Variant B as an optional "All Worlds" view**. Starting with A and adding B later as a toggle lets us prove the biome abstraction without biting off a style-cohesion problem on day one.

---

## 3. Technical Compatibility

### Stack alignment

| Concern | Current | After Phase 5 | Change |
|---|---|---|---|
| Label model | `{ name, color, user_id }` | `+ world: str | None` | Add column + Alembic migration |
| Poring model | unchanged | unchanged | Poring's world is derived client-side from its labels |
| API | `GET /labels` returns `{id, name, color}` | same + `world` field | PoringOut already eager-loads labels, so no new endpoint needed |
| FieldStage | hardcoded art for porings | reads `WorldConfig` | New `worlds/` module + `FieldStage({ world })` prop |
| Assets | none in repo | `frontend/src/assets/worlds/<world>/...` | New directory tree |
| Physics constants | one set | per-world (optional override) | `WorldConfig.physics?: { restitution, frictionAir, ... }` |

### What stays the same
- Auth, XP system, growth tiers, checklist, act/complete flow — all world-agnostic
- The `useFieldEngine` hook — still one Matter engine, one physics loop, same bodies
- The `PoringOverlay` DOM layer — still tracks body positions, still shows edit/act/caress tabs (they just say "car" or "ghost" instead of "poring" in the label)
- Time-of-day — still tints everything regardless of world

### What changes
- Label row gets one new column
- `FieldStage` gets passed a resolved `WorldConfig` and renders the scene accordingly
- Sprite assets instead of hand-drawn PixiJS Graphics for creatures (optional — Graphics fallback OK per world)

---

## 4. Server Infrastructure Impact

### Is this a new service? **NO.**

All additions are:
- 1 Alembic migration (adds `labels.world` column)
- 1 schema change (`LabelOut.world`)
- 0 new Docker services
- 0 new ports
- 0 new subdomains
- Assets bundled into the existing `frontend` container

| Concern | Answer |
|---|---|
| Port conflict check | N/A |
| Docker image | None new |
| RAM | +0 MB server side |
| Persistent storage | None new (Postgres holds the new column) |
| Tunnel ingress | Not needed |
| Uptime Kuma monitor | Not needed (same URL as before) |
| Server doc updates | [SERVER-INFRASTRUCTURE.md](../SERVER-INFRASTRUCTURE.md) unchanged |

### Client-side bundle impact
Each world's assets add 200 KB – 2 MB of sprites. With 5 worlds, initial load grows meaningfully.

**Mitigation:** lazy-load world assets. Variant A is perfect for this — only the active world's assets are loaded on demand. `import("@/worlds/forest.ts")` → Vite code-splits into one chunk per world. Switch worlds = fetch that chunk = cache forever after first load.

---

## 5. Schema Change

### Alembic migration sketch
```python
"""add world column to labels

Revision ID: 0005
Revises: 0004
"""

def upgrade() -> None:
    op.add_column(
        "labels",
        sa.Column("world", sa.String(length=32), nullable=True),
    )

def downgrade() -> None:
    op.drop_column("labels", "world")
```

### Model update
```python
# backend/app/models/label.py
class Label(Base):
    __tablename__ = "labels"
    # ... existing fields ...
    world: Mapped[str | None] = mapped_column(String(32), nullable=True)
```

### Schema update
```python
# backend/app/schemas/label.py
class LabelCreate(BaseModel):
    name: str = Field(min_length=1, max_length=64)
    color: str = Field(min_length=7, max_length=7)
    world: str | None = Field(default=None, pattern=r"^[a-z_]+$", max_length=32)

class LabelOut(BaseModel):
    id: int
    name: str
    color: str
    world: str | None
```

### Validation
A known-worlds allowlist lives on the frontend (because worlds are defined by what assets we've integrated). The backend accepts any lowercase string up to 32 chars — that way we can add worlds without backend deploys. Unknown world strings on the frontend fall back to the default world.

---

## 6. Frontend WorldConfig

### Interface
```ts
// frontend/src/worlds/types.ts
export interface WorldConfig {
  id: string;                    // "forest", "city", ...
  name: string;                  // "Forest", "City", display name
  description: string;           // short blurb for world picker UI
  
  // Environment
  ground: {
    texture: string;             // URL to a tileable image
    tileSize: { w: number; h: number };
  };
  decorations: DecorationSpec[]; // static sprites scattered on the field
  ambient?: AmbientSpec;         // per-world tsparticles config (butterflies / rain / fireflies)
  
  // Creature (the "poring" in this world)
  creature: {
    name: string;                // "Poring", "Car", "Ghost"
    sprites: Record<GrowthTier, string>;      // or use Rive
    rivFile?: string;            // optional Rive override
    sizeByTier: Record<GrowthTier, number>;   // radius
  };
  
  // Per-world physics tuning (optional)
  physics?: {
    restitution?: number;        // e.g. cars bounce less than porings
    frictionAir?: number;
    gravity?: { x: number; y: number };
  };
  
  // Per-world interactions
  caressEffect: {
    particles: string[];         // emoji/sprites for caress feedback (❤️ for porings, 💨 for cars, 👻 for ghosts)
    speedBoost: number;          // happiness-speed multiplier
  };
  
  // Visual polish
  colorGrading?: Record<TimeOfDay, ColorMatrix>;  // optional per-world, per-TOD tint
  vignette?: number;             // 0..1
}
```

### Example — forest
```ts
// frontend/src/worlds/forest.ts
import grassUrl from "@/assets/worlds/forest/ground/grass.png";
// ... etc

export const FOREST_WORLD: WorldConfig = {
  id: "forest",
  name: "Forest",
  description: "Soft grass, gentle breeze. Home of the porings.",
  ground: { texture: grassUrl, tileSize: { w: 64, h: 64 } },
  decorations: [
    { sprite: treeOakUrl, count: 6, scaleRange: [0.9, 1.1], rotationSway: 2 },
    { sprite: flowerPinkUrl, count: 10, scaleRange: [0.6, 1 ] },
    // ...
  ],
  ambient: { preset: "butterflies", density: 20 },
  creature: {
    name: "Poring",
    sprites: { seed: poringSeedUrl, happy: poringHappyUrl, chubby: poringChubbyUrl, ripe: poringRipeUrl },
    sizeByTier: { seed: 22, happy: 30, chubby: 38, ripe: 46 },
  },
  physics: { restitution: 0.92, frictionAir: 0.008 },
  caressEffect: { particles: ["❤", "💕", "💖", "💗", "✨"], speedBoost: 2 },
};
```

### Example — city
```ts
export const CITY_WORLD: WorldConfig = {
  id: "city",
  name: "City",
  description: "Asphalt and neon. Watch your speed.",
  ground: { texture: asphaltUrl, tileSize: { w: 64, h: 64 } },
  decorations: [
    { sprite: buildingSmallUrl, count: 4, scaleRange: [1.0, 1.2] },
    { sprite: streetLampUrl, count: 8 },
    { sprite: trafficConeUrl, count: 6 },
  ],
  ambient: { preset: "neon-flicker", density: 15 },
  creature: {
    name: "Car",
    sprites: { seed: carHatchUrl, happy: carSedanUrl, chubby: carSUVUrl, ripe: carSportUrl },
    sizeByTier: { seed: 28, happy: 34, chubby: 42, ripe: 50 },
  },
  physics: { restitution: 0.4, frictionAir: 0.02 }, // cars don't bounce as much
  caressEffect: { particles: ["💨", "✨", "⭐"], speedBoost: 3 },
};
```

### Resolving a poring to a world
```ts
// frontend/src/worlds/resolve.ts
export function resolveWorld(poring: Poring, userDefaultWorld: string = "forest"): WorldConfig {
  const worldedLabel = poring.labels
    .slice()
    .sort((a, b) => a.name.localeCompare(b.name))
    .find((l) => l.world != null);
  const id = worldedLabel?.world ?? userDefaultWorld;
  return WORLD_REGISTRY[id] ?? WORLD_REGISTRY[userDefaultWorld] ?? FOREST_WORLD;
}
```

---

## 7. Asset Organization

### Directory convention
```
frontend/src/assets/worlds/
├── forest/
│   ├── ground/
│   │   └── grass-tile.png
│   ├── decorations/
│   │   ├── tree-oak.png
│   │   ├── tree-pine.png
│   │   ├── rock-mossy.png
│   │   ├── flower-pink.png
│   │   └── bush-small.png
│   ├── creatures/
│   │   ├── poring-seed.png
│   │   ├── poring-happy.png
│   │   ├── poring-chubby.png
│   │   └── poring-ripe.png
│   └── README.md          # credits/licenses for this world's assets
├── city/
│   ├── ground/
│   ├── decorations/
│   └── creatures/
└── graveyard/
    └── ...
```

### Naming convention
- lowercase, hyphen-separated
- `<entity-type>-<variant>.png`
- Keep original Kenney names where possible so licensing / provenance is obvious

### License tracking
Each world's `README.md` lists the asset source + license. Since we're targeting CC0 Kenney packs, it's:
```markdown
# Forest world assets

All assets CC0 (public domain) from [Kenney Nature Kit](https://kenney.nl/assets/nature-kit).
```

### What to avoid
- Don't commit zip files or original asset packs — unzip and cherry-pick the sprites we actually use
- Don't commit huge, unused PNGs — it bloats every git clone forever

---

## 8. Rollout Plan

### Phase 5A — abstraction (backend + one world) — 2 days
1. Alembic migration adds `labels.world`
2. `LabelOut` + `LabelCreate` include `world`
3. LabelPicker UI gets a "World" dropdown populated from `WORLD_REGISTRY`
4. `WorldConfig` type + registry structure
5. `FOREST_WORLD` config (using what we have today, but via the new abstraction)
6. `FieldStage` accepts a `world: WorldConfig` prop; reads from it instead of hardcoded values
7. No visible change to the user yet — refactor only

### Phase 5B — asset integration for forest — 2 days
This is the [field-art-pipeline-analysis.md](field-art-pipeline-analysis.md) Tier 1 work, inside the new abstraction
1. Drop Kenney Nature Kit sprites into `frontend/src/assets/worlds/forest/`
2. `FieldDecorations` component renders decorations from `world.decorations`
3. Ground `TilingSprite` from `world.ground.texture`
4. Sway on trees via GSAP
5. Ambient butterflies via tsparticles

### Phase 5C — second world (city) — 1 day
Proves the abstraction is real
1. Drop Kenney City Kit + Car Kit sprites into `frontend/src/assets/worlds/city/`
2. `CITY_WORLD` config
3. User can pick `world: city` when creating a label
4. World-selector dropdown in header (Variant A)

### Phase 5D — additional worlds — 0.5-1 day each
- Graveyard ([Kenney Graveyard Kit](https://kenney.nl/assets/graveyard-kit))
- Dungeon ([Kenney Dungeon Kit](https://kenney.nl/assets/dungeon-kit))
- Space ([Kenney Space Kit](https://kenney.nl/assets/space-kit-2))
- Ocean / Pirates ([Kenney Pirate Kit](https://kenney.nl/assets/pirate-kit))
- Library (custom-sourced; Kenney doesn't have a library kit)

### Phase 5E (optional) — Variant B mixed mode — 2-3 days
- "All Worlds" entry in selector
- Neutral shared ground (or each creature gets its own small patch)
- Tests the style-cohesion question

---

## 9. Pros and Cons

### Pros
1. **Replayability / breadth** — one app becomes five apps visually, without rebuilding five apps
2. **Uses existing labels** — the feature compounds on a primitive you already have
3. **Free art everywhere** — Kenney covers every world archetype with CC0 assets
4. **No server work after the migration** — all new worlds are frontend-only additions
5. **Ships in slices** — can stop after 1 world, 2 worlds, 5 worlds. Each is a complete experience.

### Cons
1. **Art cohesion burden** — if pixel-art forest and vector-art ocean land in the same mixed view (Variant B), it looks bad. Discipline required.
    - **Mitigation**: style rule — all Kenney picks must be from same aesthetic family (pixel or low-poly); document in each world's README.
2. **Bundle size scales with worlds** — 5 worlds × 300 KB = 1.5 MB of images
    - **Mitigation**: `import()` each world lazily. Only the active world's assets load.
3. **Complexity in creature design** — each world needs 4 creature variants (seed/happy/chubby/ripe). 5 worlds × 4 = 20 creature sprites.
    - **Mitigation**: Rive state-machine pattern from the art analysis works per-world. Also: `seed` tier can reuse the same generic "young" creature across similar-style worlds.
4. **Physics feels off if the same engine governs cars + fish + ghosts**
    - **Mitigation**: `WorldConfig.physics` overrides per-world `restitution`/`frictionAir`/`gravity` when a body is created. Cars get low restitution; fish get high drag; ghosts get slight upward bias.

---

## 10. Packages to Install

**None.**

Everything ships in:
- The existing PixiJS + Matter stack (handles sprites, tiling, physics per-body)
- The existing tsparticles (handles per-world ambient emitters via preset/config swap)
- The existing React + TypeScript

No new `npm install` commands. The only dependency addition is **art files in the repo**.

Optional: if we later move to Rive characters per world, that's `@rive-app/canvas` (already planned in [field-art-pipeline-analysis.md](field-art-pipeline-analysis.md) — this phase can stay sprite-sheet based).

---

## 11. Effort Estimate

| Phase | Scope | Days |
|---|---|---|
| 5A — Abstraction + migration | Label.world column + WorldConfig + FieldStage refactor | 2 |
| 5B — Forest asset integration | Kenney Nature Kit wired through new pipeline | 2 |
| 5C — City (second world) | Proves the pattern, Variant A selector | 1 |
| 5D — Additional worlds | Graveyard / Dungeon / Space / Ocean, 0.5-1 day each | 3-4 |
| 5E — Variant B mixed | Optional "All Worlds" mode | 2-3 |
| **Total for a 5-world launch** | | **10-13 days** |

**Smallest useful increment**: Phase 5A + 5B alone (4 days) — delivers "one beautiful forest world" running through the new abstraction. Doesn't yet let users pick worlds, but makes the second world trivial.

---

## 12. Integration Approach

### Step-by-step for Phase 5A + 5B (the MVP)

1. **Backend** (half-day)
   - Create Alembic migration `0005_add_label_world.py`
   - Update `Label` model + `LabelCreate` + `LabelOut` schemas
   - Update 1-2 label tests to cover the `world` round-trip
   - Run `make test` → all 39+ green

2. **Frontend abstraction** (1 day)
   - Create `frontend/src/worlds/types.ts` with `WorldConfig` interface
   - Create `frontend/src/worlds/registry.ts` exporting `WORLD_REGISTRY` (starts with just forest)
   - Create `frontend/src/worlds/forest.ts` with the current hardcoded values
   - Create `frontend/src/worlds/resolve.ts` with `resolveWorld(poring, userDefault)`
   - Refactor `FieldStage.tsx` to accept a `world` prop and read from it
   - Refactor `useFieldEngine.ts` to accept `worldPhysics` override per-body
   - `FieldPage` passes `resolveWorld(alive[0])` for now (all porings share one world)
   - Labels UI: `LabelPicker` gets a "World" dropdown driven by `Object.keys(WORLD_REGISTRY)`

3. **Forest assets** (1-1.5 days)
   - Scaffold `frontend/src/assets/worlds/forest/`
   - Download Kenney Nature Kit, copy selected sprites
   - `FieldDecorations.tsx` component — scatters `world.decorations` deterministically
   - Ground `<pixiTilingSprite>` using `world.ground`
   - Extend `pixiExtend.ts` with `TilingSprite`
   - GSAP sway on decorations with `rotationSway > 0`
   - Per-world ambient preset dispatch in `AmbientParticles.tsx`

4. **Validation** (half-day)
   - Visual QA: does the forest look like "a forest" not "circles on a gradient"?
   - Check bundle size: forest chunk should be ≤ 500 KB gzipped
   - `prefers-reduced-motion`: no decoration sway if reduced

At the end of this MVP, the app still effectively shows "one world" but the abstraction is ready for Phase 5C (adding city).

---

## 13. Risks & Mitigations

| Risk | Likelihood | Impact | Mitigation |
|---|---|---|---|
| Kenney-style pixel creatures look bad if later worlds go non-pixel | Medium | Visible ugliness in mixed view | Lock a style rule per world in its README; decline assets that don't match |
| Bundle bloats past 2 MB total with all worlds | Low | Slow first paint | Lazy-load each world via `import()`; prefetch the user's primary world |
| Users over-engineer labels → 50 worlds, no creative energy | Low | Feature never ships | Start with a fixed roster (forest, city, graveyard, dungeon, ocean); gate custom worlds behind a later feature |
| Creature-per-world art is a bottleneck | High | Development grinds to halt | Fallback: every world uses the same poring creature until custom art lands. The environment change alone is already a huge visual shift. |
| Physics per-world feels too different (cars + fish in same engine) | Medium | Immersion break in Variant B | Only apply per-world physics when Variant A is active; Variant B uses a neutral common ruleset |

---

## 14. Will It Make Our Lives Easier?

### **YES for users, NEUTRAL for developers.**

**For users**:
- Categorization that's actually fun (pick a world for your label) not a checkbox
- Instant visual differentiation between work / travel / home / fitness tasks
- Five-apps-in-one without switching apps

**For developers**:
- Each new world is 4-6 hours if art is available — cheap to add
- But the abstraction layer is new code that needs to be maintained
- Schema migration is an irreversible commitment — `labels.world` column stays even if the feature is rolled back

**Net**: the feature is additive, reversible (just remove the world selector UI — data stays), and pays off with each world added.

---

## 15. Recommendation

### ✅ **YES — Phase 5, adopted, starting once the forest's single-world Tier 0/1/4 work is visibly great.**

**Rationale**:
- Maps onto existing data (Label) cleanly — no wholesale rebuild
- Scales in 0.5-1 day slices once the abstraction is in place
- Server impact is a single additive column
- Kenney's catalog makes this a "just add art" exercise for many worlds

**Next steps**:
1. User ships great forest art (via the art-pipeline analysis)
2. Revisit this doc
3. Do Phase 5A (abstraction + migration) — 2 days
4. Do Phase 5C (city, second world) — validates the pattern
5. Add worlds opportunistically as art lands

**Risk mitigation**:
- **If abstraction feels forced**: keep the refactor private to `frontend/src/worlds/` — don't touch shared code until 2+ worlds exist to generalize from
- **If users don't engage with world selection**: default every label to `forest` and keep it simple — the code is still clean and the investment still paid off via the art pipeline

---

## 16. Additional Resources

### Kenney kits by world
- **Forest** → [Nature Kit](https://kenney.nl/assets/nature-kit), [Foliage Sprites](https://kenney-assets.itch.io/foliage-sprites)
- **City** → [City Kit (Roads)](https://kenney.nl/assets/city-kit-roads), [Car Kit](https://kenney.nl/assets/car-kit)
- **Graveyard** → [Graveyard Kit](https://kenney.nl/assets/graveyard-kit)
- **Dungeon** → [Dungeon Kit](https://kenney.nl/assets/dungeon-kit)
- **Space** → [Space Kit](https://kenney.nl/assets/space-kit-2)
- **Ocean / Pirates** → [Pirate Kit](https://kenney.nl/assets/pirate-kit)
- **Characters (generic)** → [Platformer Characters](https://kenney.nl/assets/platformer-characters)

### Complementary itch.io packs
- [Sprout Lands](https://cupnooble.itch.io/sprout-lands-asset-pack) for a painterly-pixel forest alternative
- [Tiny Wonder Farm](https://itch.io/game-assets/tag-top-down) for cozy style
- [Tamagotchi-esque assets](https://zodee.itch.io/tamagotchi-esque-assets) for small-creature inspiration

### Prior art / inspiration
- Neopets (every "petpet" has a world/habitat)
- Nintendogs (each breed behaves slightly differently in the same house)
- Stardew Valley's biomes (each area of the map has its own art + creatures)

---

## 17. Conclusion

Multi-world is less a new feature and more a *shape* the app grows into, once we've proven the visual language with a single world. Every piece of the stack we already have — Matter physics, Pixi rendering, tsparticles ambient, GSAP juice, label taxonomy — bends naturally to accommodate multiple biomes. The only schema commitment is one nullable column on `labels`.

The key discipline is **don't start five worlds — start one, then add a second to prove the abstraction, then the rest follow cheaply**. Five mediocre biomes is worse than one great one.

This research is worth keeping on the shelf now and pulling down when the forest looks as good as we can make it. At that point Phase 5 goes from "interesting idea" to "obvious next move."

---

**End of Analysis**

*Compiled by: Claude (Opus 4.7)*
*Date: 2026-04-23*
*Research duration: ~20 minutes (cross-referenced field-rendering + field-art pipelines + current backend schema)*
*Confidence: High on the architecture; Medium on total effort (depends heavily on art availability per world).*
