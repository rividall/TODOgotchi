# Field Art Pipeline — Analysis

**Date:** 2026-04-23
**Analyzed:** Options for making poringField's field + porings look like a real 2D video game — not a "task manager with circles." Covers asset sources (Kenney, itch.io, AI generators), animation runtimes (Rive), and PixiJS integration patterns.
**Licenses:** CC0 / MIT / varies by itch.io pack / Rive free tier.
**For:** Visual-quality upgrade after the field engine rework. Decides the path from "hand-drawn Pixi Graphics circles" to "bespoke video-game-feeling field."

---

## Executive Summary

**Recommendation:** ⚠️ **CONDITIONAL — pick one of two paths depending on art ambition.**

This is a pipeline decision, not a package decision. The field has **two separate art problems** that deserve different solutions:

1. **Environment** (grass, trees, rocks, shadows, ambient decoration) — *static art*, the setting. Once in, doesn't change.
2. **Porings** (characters that move, grow, react, get caressed) — *interactive character animation*, the identity.

A one-pipeline-fits-both approach ends up either over-investing in environment tiles or under-investing in the character. Splitting them lets us pick the right tool for each.

**Recommended combo:** **Tier 1 environment (free CC0 pixel art from Kenney) + Tier 4 poring character (Rive state machine)**, with an optional **Tier 0 polish pass** first to confirm the art overhaul is even needed.

**Why this combo wins**:
- The environment's quality bar is easy to clear — "lots of free tree/rock/flower sprites scattered around a tile floor" already looks like a game scene.
- The poring is what the user stares at — spending authoring effort on a Rive state machine (free, tiny file, 60fps) gets the most visible return.
- Both tiers are $0 of external cost. Both scale with effort, not money.
- Server impact: zero. All assets bundle into the Vite frontend.

**The React 19 + PixiJS + Matter + GSAP + tsparticles engine we built in the [field-rendering rework](field-rendering-stack-analysis.md) is already the right foundation.** PixiJS `Sprite`, `TilingSprite`, and `AnimatedSprite` handle environment art natively; Rive integrates as either a DOM overlay (`@rive-app/react-canvas`) or a Pixi texture source.

---

## 1. The Two Problems

### Environment (the setting)

Goal: the field feels like a place. Rolling green, trees with soft shadows, flowers, maybe a small pond or fence. Parallax depth is a bonus.

What makes environment art easy:
- It's **static** — drawn once, reused
- Quantity beats quality — 20 decent tree sprites scattered at varied positions > 1 perfect tree
- Free/CC0 assets already exist in the exact style we want (cozy top-down)

Constraints:
- Must not obscure the porings
- Must tile or scatter without looking repetitive
- Must respect time-of-day tinting (we already have this)

### Poring (the character)

Goal: each poring is its own little creature. Blinks on its own, wobbles when caressed, squashes when it tier-ups, beams when ripe.

What makes character art hard:
- It's **interactive** — must respond to state (tier, happy, eating)
- Quality is the whole identity — 1 perfect character > 20 passable variants
- Hand-drawn sprite sheets are expensive (either artist time or AI credits per frame)

Constraints:
- State-driven: `tier` (4 values), `status` (alive/completed), transient `happy` state, future: eating/evolving
- Must render efficiently for 50+ simultaneous instances
- Must be authorable by a solo dev without commissioning

---

## 2. The Five Tiers

Ranked by cost × time × quality ceiling.

### 🟢 Tier 0 — PixiJS Graphics polish (0 days, $0)

Keep what we have. Add:
- Squash-on-bounce (momentary scale.y compression on wall-bounce)
- Blink timeline (eyes go `_ _` for 100ms every 3-5s randomly)
- Antenna wiggle on hover
- Slightly more elaborate shadow (gradient instead of flat)
- Per-tier face variation (seed = `.`, happy = `· ·`, chubby = `ᵕ‿ᵕ`, ripe = `♥ ‿ ♥` + cheek blush)

**Quality ceiling:** circles with personality. You've seen it already; imagine it with 30% more life.
**Effort:** half a day.
**Do this first** — might be "good enough" and save 2-3 days.

### 🟢 Tier 1 — Free CC0 pixel art (1 day, $0)

**Environment**: [Kenney.nl Nature Kit](https://kenney.nl/assets/nature-kit) — 330 CC0-licensed 2D top-down nature sprites. Trees, rocks, flowers, grass tufts, terrain pieces. Public domain — no attribution required.

**Pipeline**:
1. Download Nature Kit (~10 MB zip)
2. Copy the 15-20 sprites you want into `frontend/src/assets/env/`
3. New `FieldDecorations.tsx` component: for each user, scatter 8-15 decorations at seeded deterministic positions (same pattern as `poringPosition.ts` had)
4. Each decoration is a `<pixiSprite>` with a soft ellipse `<pixiGraphics>` shadow underneath
5. Ground: `<pixiTilingSprite>` with one of Kenney's grass tiles
6. Sway: GSAP tween on tree sprites' `rotation` property, staggered per tree

**Porings**: still Graphics, but upgraded via Tier 0.

**Quality ceiling:** indie-game-jam level — think [Cat and Ghostly Road](https://store.steampowered.com/app/1214820/) or early prototypes.
**Effort:** 1 day for environment. Porings stay Tier 0.

### 🟡 Tier 2 — Paid itch.io pack + drawn porings ($5–80, 2-4 days)

**Environment**: A coherent asset pack instead of Kenney's catalog-of-catalogs.

Top picks (browse each before deciding):
- [Sprout Lands — Asset Pack](https://cupnooble.itch.io/sprout-lands-asset-pack) — $5 for the full set, iconic cozy style
- [Cute Fantasy RPG — 16x16](https://kenmi-art.itch.io/cute-fantasy-rpg) — free tier available
- [Pixel Plains — Top-Down Asset Pack (Seasons Update)](https://itch.io/game-assets/tag-farming/tag-top-down) — has seasonal variants that pair with our time-of-day system
- [Tiny Farm RPG](https://itch.io/game-assets/tag-top-down) — 16x16, super tight pixel art
- [Tiny Wonder Farm](https://itch.io/game-assets/tag-top-down) — painterly alternative if pixel art isn't the vibe

**Porings**: commission or AI-generate a pixel poring sprite sheet per tier. 4 tiers × ~4 frames of idle animation = ~16 sprites. [Fiverr](https://www.fiverr.com) artists: $30-80 for this scope.

**Quality ceiling:** Stardew-adjacent. Cozy-game production values.
**Effort:** 2 days integration + wait time for commissioned art.

### 🟡 Tier 3 — AI-generated bespoke art ($20/mo + 2-3 days)

For solo devs who want their own style without commissioning.

**Environment tools**:
- [Scenario](https://www.scenario.com/) — fine-tune a style model on a few reference images, then generate consistent tiles
- Midjourney v6+ — great for one-off painterly backgrounds; less consistent for tile sets
- [PixelLab](https://www.pixellab.ai/) — AI specifically tuned for pixel art game assets

**Poring character tools** (purpose-built for sprite sheets):
- [PixelLab](https://www.pixellab.ai/) — pixel-art character generator with idle animations
- [AutoSprite](https://www.autosprite.io/) — "describe character → choose animation type → 6-8 frame sheet in 60s"
- [Ludo.ai sprite generator](https://ludo.ai/features/sprite-generator) — game-ready PNG sprite sheets
- [Sprite-AI](https://www.sprite-ai.art/features/sprite-generator) — similar positioning

All output transparent PNGs ready to drop into PixiJS.

**Pipeline**:
1. Pick a tool, subscribe
2. Iterate on style references until happy
3. Generate poring sprite sheets for each tier (~20 sprites total)
4. Generate ~10-15 environment tiles
5. Post-process transparency with [rembg](https://github.com/danielgatis/rembg) if needed
6. Integrate as PixiJS sprites + `AnimatedSprite` for frame sequences

**Quality ceiling:** depends on tool + iteration time. Can rival commissioned.
**Effort:** 2-3 days. Risks: licensing fine-print varies per tool, style drift across generations.

### 🟠 Tier 4 — Rive state-machine character (for porings only) ($0 authoring, 1-3 days)

**Keep Tier 0 or Tier 1 for the environment — upgrade only the poring.**

[Rive](https://rive.app) is a free browser-based animation tool that outputs `.riv` files with built-in state machines. Used in production by [Duolingo](https://rive.app/blog/rive-as-a-lottie-alternative) (owl mascot), [Figma](https://rive.app/community) (various UI), and many mobile apps.

**Why it's a better fit than any sprite-sheet approach for our porings**:

| Concern | Sprite sheet | Rive |
|---|---|---|
| Transition between tiers | requires ~20 intermediate frames | one `tier` input, state machine animates |
| Caress reaction | new sprite sheet or handcoded overlay | boolean `happy` input, authored in editor |
| File size per character | 50-500 KB | 10-30 KB |
| Iteration speed | re-generate + re-import | edit in Rive, hot-reload |
| Runtime perf | decode PNG, blit | vector render, GPU accelerated |
| 60fps | yes | yes |

**Rive state machine for our porings**:

```
Inputs:
  tier      : number (0–3 = seed/happy/chubby/ripe)
  happy     : boolean (from caress, 3s)
  eating    : boolean (for future feeding animations)
  completed : boolean

States:
  Idle       — breathing loop (used in all tiers, scaled by tier)
  Blink      — transient, fires randomly every 3-8s
  TierUp     — transition animation when tier increases
  Caressed   — squash + wobble + heart eyes (played while happy=true)
  RipeGlow   — pulsing aura overlay (played when tier=3)
  Completed  — greyscale + Z's (when completed=true)

Transitions:
  any → TierUp      on tier change
  any → Caressed    on happy=true
  Caressed → Idle   on happy=false
  any → RipeGlow    on tier=3
  any → Completed   on completed=true
```

**Runtime options**:
- **[@rive-app/react-canvas](https://www.npmjs.com/package/@rive-app/react-canvas)** — renders Rive into its own `<canvas>` overlay. Simplest integration: one DOM element per poring, positioned by `PoringOverlay.tsx`'s existing rAF loop.
- **[@rive-app/canvas](https://www.npmjs.com/package/@rive-app/canvas)** — vanilla JS runtime. Can be drawn into a PixiJS `Texture` via `HTMLCanvasElement` source, then displayed as a `<pixiSprite>` that Matter physics drives.

For our architecture (per-poring position from Matter, managed by Pixi), **drawing Rive into a Pixi texture** is cleanest — keeps all porings under the same renderer, avoids N DOM overlays.

**Quality ceiling:** character feels alive. Blinking, idle breathing, reactive wobble — all authored in a visual editor, none hardcoded.
**Effort:**
- Authoring: 1-2 days for a first character in Rive (learning curve included)
- Integration: half a day (one `RivePoring` component that replaces the current `<pixiContainer>` body in [FieldStage.tsx](../../frontend/src/field/FieldStage.tsx))

### 🔴 Tier 5 — Commissioned bespoke art ($200–2000, 1–3 weeks)

Freelance illustrator from [Fiverr](https://www.fiverr.com), [Upwork](https://www.upwork.com), or [itch.io artist boards](https://itch.io/board/10848/game-design-and-theory).

**Scope**: full bespoke environment + character set. Style matched to your brief.

**Quality ceiling:** magazine-worthy. Only limit is the artist.
**Effort:** fast if you know what you want; slow with iteration.
**Skip unless** you have a specific visual direction that no pack or AI tool captures.

### ❌ Don't — background video (MP4 loop)

Considered and rejected. Reasons:
- MP4 of a 10-second field loop is 5-15 MB, bloats initial load
- Forces single art direction; no parallax, no time-of-day tinting
- Blocks Pixi from layering physics/particles *behind* the background
- Doesn't scale to interactivity (trees can't sway in response to wind, etc.)

Use video only for: a title-screen cinematic, or a one-shot intro. Not for the running field.

---

## 3. Technical Compatibility

### Against the existing engine

| Tier | Integration point | PixiJS API used | Complexity |
|---|---|---|---|
| 0 | Current `<pixiGraphics>` | `draw()` callback extensions | Trivial |
| 1 | New `<FieldDecorations>`, ground `<pixiTilingSprite>` | `Sprite`, `TilingSprite`, `Assets.load()` | Low |
| 2 | Same as Tier 1 + sprite sheets per tier | `AnimatedSprite`, spritesheet JSON | Medium |
| 3 | Same as Tier 2 | Same | Medium |
| 4 (Rive) | `@rive-app/canvas` → texture source | `Texture.from(HTMLCanvasElement)` | Medium |
| 5 | Same as 2/3 | Same | Low (art done for you) |

**All tiers stay in the existing stack.** No React/Vite/Pixi breaking changes.

### PixiJS v8 APIs worth knowing
- [`Assets.load()`](https://pixijs.com/8.x/guides/components/assets) — async loader, caches textures
- [`Sprite`](https://pixijs.com/8.x/guides/components/scene-objects/sprite) — static image
- [`TilingSprite`](https://pixijs.com/8.x/guides/components/scene-objects/tiling-sprite) — repeating background
- [`AnimatedSprite`](https://pixijs.com/8.x/guides/components/scene-objects/animated-sprite) — sprite sheet frames
- [Spritesheet](https://pixijs.com/8.x/guides/components/assets#spritesheets) — TexturePacker-compatible JSON

### Rive React integration
Minimal example for reference:
```tsx
import { useRive } from "@rive-app/react-canvas";

function RivePoring({ tier, happy }: { tier: number; happy: boolean }) {
  const { rive, RiveComponent } = useRive({
    src: "/poring.riv",
    stateMachines: "Main",
    autoplay: true,
  });
  const tierInput = useStateMachineInput(rive, "Main", "tier");
  const happyInput = useStateMachineInput(rive, "Main", "happy");
  useEffect(() => { if (tierInput) tierInput.value = tier; }, [tierInput, tier]);
  useEffect(() => { if (happyInput) happyInput.value = happy; }, [happyInput, happy]);
  return <RiveComponent />;
}
```

---

## 4. Server Infrastructure Impact

**None.**

All asset pipelines output files (PNG, JSON, .riv) that bundle into the Vite frontend build. Frontend Docker container picks them up on `npm ci && npm run build`.

| Concern | Answer |
|---|---|
| New Docker services | No |
| New ports | No |
| New subdomains | No |
| Asset hosting | Vite bundles + serves via nginx container (existing) |
| CDN | Cloudflare already caches static assets in front of the tunnel |
| Asset size budget | Each tier adds 100 KB – 3 MB of images. Well within normal web app weight. |

---

## 5. Recommended Pipeline

### Do this first: Tier 0 polish pass (half-day, $0)

1. Add squash-on-bounce to the Pixi container — on Matter `collisionStart` event where one of the bodies is a wall, GSAP timeline: `scaleX +8%, scaleY -15%` for 80ms, ease back
2. Add blink timeline — every 3-8s (random per poring), draw eyes as horizontal lines for 120ms
3. Per-tier cheek dots for chubby/ripe (two small pink circles under the eyes)
4. Gradient shadow instead of flat fill — darker at center, fading to transparent

After this: evaluate. Does it feel cute enough? If yes, skip to "Environment upgrade."

### Primary path: Tier 1 environment + Tier 4 character

**Phase 1 — Environment (1 day)**
1. Download [Kenney Nature Kit](https://kenney.nl/assets/nature-kit)
2. `frontend/src/assets/env/` — commit 15-20 selected sprites (trees, rocks, flowers, grass tufts)
3. New `frontend/src/field/FieldDecorations.tsx` — scatters sprites at seeded positions
4. Ground: add `<pixiTilingSprite>` as bottom layer with a Kenney grass tile
5. GSAP sway tween on trees (rotation 0 → 2° → -2° → 0, 4s loop, staggered delay per tree)
6. Update [useTimeOfDay.ts](../../frontend/src/field/useTimeOfDay.ts) to also tint decorations via a Pixi `ColorMatrixFilter`

**Phase 2 — Rive character (2-3 days)**
1. `npm install @rive-app/canvas` (the vanilla JS runtime; bind into Pixi texture)
2. Author a poring in Rive editor: idle breathing, blink, tier-up transition, caressed wobble, ripe glow
3. Export `poring.riv` to `frontend/public/`
4. New `frontend/src/field/rive/RivePoring.ts` — loads Rive, provides a `Texture` + `update(tier, happy)` interface
5. Replace the `draw()` callbacks in [FieldStage.tsx:Scene](../../frontend/src/field/FieldStage.tsx) with `<pixiSprite texture={rivePoringTexture}>`
6. Remove the hand-drawn eye/smile code

**Phase 3 — Polish**
1. tsparticles butterfly/bee ambient emitter
2. Subtle vignette + color grading via `ColorMatrixFilter` per time-of-day
3. Water/pond decoration in one corner as an always-visible landmark
4. Deferred: tier-up animation in Rive overrides the GSAP scale pop

**Total estimate:** 4-5 days, $0, all solo-authorable.

### Alternative path: Tier 2 for both (commissioned art)

If you want the cohesion of a single artist's hand:
1. Buy [Sprout Lands](https://cupnooble.itch.io/sprout-lands-asset-pack) ($5)
2. Commission matching poring sprite sheets on [Fiverr](https://www.fiverr.com) ($30-80, 1-2 weeks wait)
3. Integrate both sets as PixiJS sprites + `AnimatedSprite`

Higher quality ceiling; slower due to artist turnaround; loses the "animated by state machine" magic of Rive.

---

## 6. Packages to Install (by tier)

### Tier 0 — no new packages
Uses existing PixiJS + GSAP.

### Tier 1 — no new packages
Uses existing PixiJS — `Sprite`, `TilingSprite` are built in. Just `extend({ Sprite, TilingSprite })` in [pixiExtend.ts](../../frontend/src/field/pixiExtend.ts).

### Tier 2 & Tier 3 — no new packages
Same as Tier 1, plus `AnimatedSprite` for sprite-sheet playback (also built in).

### Tier 4 — Rive
```bash
# DOM-overlay variant (simpler integration; one canvas per poring)
npm install @rive-app/react-canvas

# OR Pixi-integrated variant (one Pixi texture per poring, cleaner at scale)
npm install @rive-app/canvas
```

### Background transparency utility (if AI-generating)
```bash
# Server-side (optional) — remove backgrounds from AI-generated sprites
pip install rembg
```

---

## 7. Pros and Cons of the Recommended Combo

### Pros

1. **Tier 1 environment is immediate gratification** — drop in Kenney assets, scatter them, done. Visible upgrade in half a day of coding.
2. **Rive is the right tool for THE character** — state machines map 1:1 to our `tier`/`happy`/`completed` data. Iterating visuals means editing Rive, not pushing code.
3. **Free all the way down** — Kenney CC0, Rive free tier covers everything we need.
4. **No backend work** — the engine's ready. Schema's ready. It's only visual integration.
5. **Decouples environment quality from character quality** — we can commission/AI the character later without touching environment, or vice versa.

### Cons

1. **Rive authoring has a learning curve**
   - First-time Rive authoring: 1-2 days with false starts
   - **Mitigation:** start from a [Rive community mascot example](https://rive.app/marketplace) and modify it; many are CC-licensed
2. **Kenney assets are generic-looking by default**
   - Mitigation: color-grade them via Pixi `ColorMatrixFilter` tied to time-of-day — custom-looking result from off-the-shelf sprites
3. **Mixing pixel art (Kenney) and vector (Rive default) can clash**
   - Mitigation: in Rive, author in pixel style (disable anti-aliasing, snap to pixel grid) — or pick a painterly Kenney alternative from [itch.io](https://itch.io/game-assets/tag-top-down) if going vector
4. **Bundle size grows ~300 KB-1 MB** for environment sprites + Rive file
   - Mitigation: lazy-load decorations behind Suspense; precompute atlas with [TexturePacker](https://www.codeandweb.com/texturepacker) for single-request loading

---

## 8. Alternative Paths Compared

| Path | Time | Cost | Quality | Scales? | Notes |
|---|---|---|---|---|---|
| **Tier 0 only** | 0.5d | $0 | Low-medium | No | Start here as a ceiling check |
| **Tier 1 env + Tier 0 porings** | 1.5d | $0 | Medium | Yes | Tier 4 later |
| **Tier 1 env + Tier 4 porings** ⭐ | 4-5d | $0 | High | Yes | **Recommended** |
| **Tier 2 env + Tier 2 porings** | 2-3d + wait | ~$80 | High | Medium | Cohesive but static character |
| **Tier 2 env + Tier 4 porings** | 3-4d | ~$5 | Very high | Yes | Best if you fall in love with a specific tile pack |
| **Tier 3 all AI** | 2-3d | $20/mo | Variable | Limited | Good for experimentation; licensing risk |
| **Tier 5 commissioned** | 1-3wk | $200-2000 | Highest | Yes | Skip for now |

---

## 9. Decision Criteria (pick before starting)

Before I write any integration code, the user needs to decide:

1. **Style vibe**: pixel art (Kenney, Sprout Lands) or painterly/vector (Cute Fantasy, Rive default)?
   - Pixel art: cozier, retro, "farm game" feel
   - Painterly: softer, "storybook" feel
2. **Authoring comfort**: want to learn Rive (2 hours of tutorials) or skip it and use commissioned/AI sprite sheets?
3. **Budget ceiling**: $0, ~$30, or ~$200?

With those three answers, the tier becomes obvious.

---

## 10. Recommendation

### ✅ **YES — start with Tier 0 (half-day) as a gate, then commit to Tier 1 environment + Tier 4 Rive character.**

**Rationale**:
- Biggest-delta visible upgrade for the least solo-dev effort
- Keeps full ownership (no commissioned art, no ongoing AI subscription)
- Plays to the strengths of our engine (Pixi handles environment sprites natively; Rive texture plays in a Pixi sprite)
- Sets up for future ambition — Rive character can grow (evolution states, seasonal variants, holiday skins) without rewrites

**Next steps**:
1. User picks a style (pixel vs painterly) and confirms budget ($0 path).
2. Do Tier 0 polish pass first (half day). Evaluate. If "cute enough," skip the rest.
3. Phase 1: Environment upgrade with Kenney assets (1 day).
4. Phase 2: Rive character authoring + integration (2-3 days).
5. Phase 3: Polish (butterflies, vignette, pond, etc.).

**Risks**:
- **Rive learning curve** — first-character authoring can stall. Mitigation: use a community mascot as a starting skeleton.
- **Style clash between Kenney pixel env and non-pixel Rive character** — decide style upfront.
- **"Good enough" never arrives** — polish is infinite. Cap at 4-5 days for V1 and move on.

---

## 11. Additional Resources

### Environment asset libraries
- [Kenney.nl assets](https://kenney.nl/assets) — 30,000+ CC0 game assets
- [Kenney Nature Kit](https://kenney.nl/assets/nature-kit) — our primary pick for Tier 1
- [OpenGameArt — Nature Pack Extended](https://opengameart.org/content/nature-pack-extended) — CC0 alternatives
- [itch.io top-down game assets](https://itch.io/game-assets/tag-top-down) — browse for Tier 2
- [itch.io cozy asset packs](https://itch.io/game-assets/tag-2d/tag-cozy) — style-curated

### Notable itch.io packs
- [Sprout Lands](https://cupnooble.itch.io/sprout-lands-asset-pack) — $5, iconic cozy style
- [Cute Fantasy RPG](https://kenmi-art.itch.io/cute-fantasy-rpg) — free tier
- [Tamagotchi-esque assets](https://zodee.itch.io/tamagotchi-esque-assets) — thematically on-point

### Rive
- [rive.app](https://rive.app) — editor + runtime
- [Rive State Machine docs](https://help.rive.app/editor/state-machine)
- [Rive marketplace — community-authored characters](https://rive.app/marketplace) — starting skeletons
- [Rive Review 2026](https://digitalbydefault.ai/blog/rive-interactive-animation-review-2026)
- [Rive character animation production guide](https://dev.to/uianimation/rive-character-animation-for-mobile-apps-a-production-ready-design-and-state-machine-breakdown-5e3m)
- [@rive-app/react-canvas on npm](https://www.npmjs.com/package/@rive-app/react-canvas)
- [@rive-app/canvas on npm](https://www.npmjs.com/package/@rive-app/canvas)

### AI sprite tools
- [PixelLab](https://www.pixellab.ai/) — pixel-art specific
- [AutoSprite](https://www.autosprite.io/)
- [Ludo.ai sprite generator](https://ludo.ai/features/sprite-generator)
- [Scenario](https://www.scenario.com/) — style-locked tilesets
- [Sprite-AI](https://www.sprite-ai.art/features/sprite-generator)

### PixiJS integration patterns
- [TilingSprite docs](https://pixijs.com/8.x/guides/components/scene-objects/tiling-sprite)
- [AnimatedSprite docs](https://pixijs.com/8.x/guides/components/scene-objects/animated-sprite)
- [Assets loader](https://pixijs.com/8.x/guides/components/assets)
- [Building a Parallax Scroller with Pixi.js](https://modernweb.com/building-parallax-scrolling-game-pixi-js/)
- [Endless Background with TilingSprite](https://medium.com/anvoevodin/endless-background-with-tiling-sprite-in-pixijs-v5-79d95a08fe7)

### Commissioning platforms
- [Fiverr game assets](https://www.fiverr.com/categories/graphics-design/game-art) — $30-200 typical
- [itch.io community boards](https://itch.io/community) — artist-for-hire threads
- [Upwork](https://www.upwork.com) — longer-form freelance

---

## 12. Conclusion

poringField's renderer is ready for great art. The field engine rework already gave us a WebGL canvas, physics, juice, and overlays — what's left is the visual language.

Splitting the art problem into **environment (static, quantity-driven)** and **character (interactive, quality-driven)** makes the path obvious:
- Environment is solved by **downloading free CC0 sprites**.
- Character is solved by **authoring once in Rive**.

Skip commissioning for now. Skip AI generators unless you hit a specific need. Skip background video entirely. The recommended 4-5 day path gets poringField from "task manager with circles" to "a place with creatures that live in it," at zero external cost, with every choice reversible.

Start with the half-day Tier 0 polish pass as a gate. If the porings already feel alive with just squash and blink, the rest might not even be needed.

---

**End of Analysis**

*Compiled by: Claude (Opus 4.7)*
*Date: 2026-04-23*
*Research duration: ~30 minutes (web search + doc cross-reference)*
*Confidence: High on the recommended combo; Medium on Rive authoring effort (Rive's learning curve is the variable).*
