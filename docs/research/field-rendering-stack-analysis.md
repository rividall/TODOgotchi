# Field Rendering Stack — Analysis

**Date:** 2026-04-23
**Analyzed Libraries:** A stack, not one package. Main picks: [PixiJS v8](https://pixijs.com/) + [@pixi/react v8](https://react.pixijs.io/) + [Matter.js](https://brm.io/matter-js/) + [GSAP + @gsap/react](https://gsap.com/resources/React/) + [tsparticles](https://particles.js.org/). Optional: [Rive](https://rive.app/).
**Licenses:** All MIT / Apache / GSAP-free-standard. No paid dependencies required.
**For:** UI/engine rework to turn the field from CSS-animated DOM blobs into a video-game-feel canvas with floating labels and a sidebar-on-edit pattern.

---

## Executive Summary

**Recommendation:** ✅ **YES — adopt the stack, but in phases.** Commit to PixiJS as the renderer, Matter.js as the physics layer, GSAP for UI juice, and tsparticles for the completion burst. Keep React + DOM for all non-canvas UI (sidebar, modal, floating poring tabs). Defer Rive to a later polish pass.

**The one real gate: React 19.** [@pixi/react v8](https://react.pixijs.io/) is **React 19 only**. poringField is currently on React 18.3. React 19 is stable and broadly adopted as of mid-2025, and Vite 6 supports it cleanly. The upgrade is the first step and is largely mechanical. Fallback if we don't want to upgrade: use @pixi/react v7 (React 18) or drop @pixi/react entirely and call PixiJS imperatively inside a `useEffect`.

**Why this combination wins**:
- **WebGL via PixiJS** scales to hundreds of bouncing porings without frame drops — the CSS-transform approach we have now will start stuttering somewhere around 50 simultaneously animated elements.
- **Matter.js** gives real bouncing/collision physics for a fraction of the code we'd write by hand, and it's pure JS with `@types/matter-js` so it fits the Vite + TS stack trivially.
- **Hybrid DOM + canvas** is the textbook pattern for "canvas game + labels that are crisp, accessible, and styleable" — labels are React divs positioned over the canvas via transforms fed from game state each frame.
- **GSAP is free as of Oct 2024** (Webflow acquisition) — `useGSAP` is a drop-in replacement for `useEffect` that handles StrictMode cleanup, perfect for tier-up flashes, CTA glow, modal entrance, completion burst choreography.

**Server impact: none.** This is all client-side bundled into the existing Vite build. No new Docker services, ports, or Cloudflare ingress.

---

## 1. Library Overview

### The stack at a glance

| Concern | Pick | Why |
|---|---|---|
| Renderer | **PixiJS v8** | WebGL/WebGPU, handles thousands of animated sprites, industry standard for 2D web games |
| React bridge | **@pixi/react v8** (requires React 19) | Declarative `<pixiSprite>` JSX tags, auto-wired ticker, SSR-safe |
| Physics | **Matter.js** | Rigid-body 2D, `restitution` for bouncing, gravity/constraints/collisions, ~17k⭐ maintained |
| UI juice | **GSAP + @gsap/react** | Best perf for 60+ simultaneous tweens; `useGSAP` handles StrictMode; timeline choreography |
| Particles | **tsparticles** | Confetti + fireworks presets, React component, replaces our hand-rolled `CompletionBurst` |
| UI panels | **React DOM** (no change) | TaskPanel, ActModal, CompletedDrawer stay as they are |
| (Optional) Character animation | **Rive** | State-machine-driven character animation for poring blink/wobble/eat states |

### What each one does

**PixiJS** is a 2D WebGL/WebGPU renderer. It draws textures and shapes very fast by batching draw calls on the GPU. It's not a game framework (that's Phaser) — it's a rendering layer you pair with your own game logic. Used by Ikea, PBS Kids, many browser games.

**@pixi/react** wraps Pixi's scene graph in React components (`<pixiContainer>`, `<pixiSprite>`, `<pixiGraphics>`). v8 uses a new JSX pragma and is "React 19 only" per the [Pixi team's release post](https://pixijs.com/blog/pixi-react-v8-live). v7 still works for React 18.

**Matter.js** is a rigid-body physics engine. Each poring becomes a `Body` with a radius, mass, friction, and `restitution` (bounciness). You step the physics world once per frame and read each body's `position.x / position.y` back to tell Pixi where to draw the sprite. [Docs](https://brm.io/matter-js/docs/).

**GSAP** is an imperative animation library. `useGSAP()` is an `@gsap/react` hook that's a drop-in for `useEffect` and handles React 18 StrictMode cleanup automatically. Since the Webflow acquisition in fall 2024, **all of GSAP (including ex-paid plugins like SplitText and MorphSVG) is free for everyone, including commercial use**, per [Webflow's announcement](https://webflow.com/blog/gsap-becomes-free).

**tsparticles** has ready-made confetti/fireworks presets and an `@tsparticles/react` component. Our current `CompletionBurst` (10 stars + core flash) is fine, but tsparticles gives us proper fireworks for "Ripe poring acts" at zero authoring cost.

### Open source / free version

All five libraries are fully free to use. No commercial upgrades exist for any of them. Rive has a free tier for authoring (paid seats only if you outgrow it, ~$12/mo).

**For this project:** free tiers are sufficient forever for a personal tamagotchi-style app.

---

## 2. Technical Compatibility

### Stack alignment

| Technology | Project Uses | Package Supports | Status |
|------------|-------------|------------------|--------|
| React | 18.3 | @pixi/react v8: **React 19 only**; @pixi/react v7: React 17/18 | ⚠️ Requires a decision |
| TypeScript | 5.6 | All five picks ship types | ✅ OK |
| Build Tool | Vite 6 | PixiJS/Matter/GSAP/tsparticles are ESM-native, all Vite-compatible; Vite 6 + React 19 is a supported combo | ✅ OK |
| State mgmt | React Context + local state | Matter `Engine` lives in a `useRef`; Pixi scene synced via props/refs | ✅ OK |
| UI library | plain CSS | GSAP animates any DOM; Pixi renders to canvas — they coexist in the same page via DOM-overlay pattern | ✅ OK |
| Backend | No impact | All rendering is client-side | ✅ OK |

**Verdict:** Fully compatible **after** a React 19 upgrade. If we stay on React 18, swap @pixi/react v8 for v7 (minor API differences, both use the same Pixi v8 engine underneath).

---

## 3. Server Infrastructure Impact

### Does this package run as a service? **NO.**

All libraries ship as JS bundled into the existing Vite frontend. They run entirely in the user's browser.

| Concern | Answer |
|---|---|
| Docker image | None (bundled in frontend container) |
| Architecture support | Browser JS — any client |
| Port needed | None |
| Port conflict check | N/A |
| RAM estimate | ~15 MB bundle increase, ~30–80 MB browser runtime (Pixi scene) |
| Persistent storage | None |
| Needs subdomain? | No |
| Needs tunnel ingress? | No |
| Works behind Cloudflare TLS? | Yes |
| Sidecar container? | No |

### Server changes required

**None.** The frontend Docker build picks up the new dependencies via `npm ci`. `docker-compose.yml`, Cloudflare config, and [docs/SERVER-INFRASTRUCTURE.md](../SERVER-INFRASTRUCTURE.md) are all unchanged.

**Verdict:** Zero server impact. The bundle size grows (~200–300 KB gzipped for Pixi + Matter + GSAP) but that's a one-time cost paid once per browser-cache cycle.

---

## 4. Installation & Setup

### Step 1: upgrade React (recommended)

```bash
cd frontend
npm install react@19 react-dom@19 @types/react@19 @types/react-dom@19
```

Then run `npm run build` — Vite 6 + `@vitejs/plugin-react` 4.x already supports React 19; no config changes needed. [Vite 6 + React 19 upgrade notes](https://www.thecandidstartup.org/2025/03/31/vitest-3-vite-6-react-19.html).

### Step 2: install the rendering stack

```bash
npm install pixi.js@^8 @pixi/react
npm install matter-js @types/matter-js
npm install gsap @gsap/react
npm install @tsparticles/react @tsparticles/slim @tsparticles/preset-fireworks
```

**Expected transitive deps:** tiny — Pixi v8 ships as one package, Matter is zero-deps, GSAP is zero-deps, tsparticles splits into engine + preset bundles you opt into.

### Step 3: minimal "bouncing blob" prototype

```tsx
// src/field/FieldStage.tsx
import { Application, extend } from "@pixi/react";
import { Container, Graphics, Sprite } from "pixi.js";
import Matter from "matter-js";
import { useEffect, useRef, useState } from "react";

extend({ Container, Graphics, Sprite });

type PhysicsPoring = { id: number; body: Matter.Body };

export function FieldStage({ porings }: { porings: Poring[] }) {
  const engineRef = useRef(Matter.Engine.create({ gravity: { x: 0, y: 0.3 } }));
  const [bodies, setBodies] = useState<PhysicsPoring[]>([]);

  useEffect(() => {
    const engine = engineRef.current;
    const walls = [/* top / bottom / left / right static bodies */];
    Matter.Composite.add(engine.world, walls);

    const pbodies = porings.map((p) => ({
      id: p.id,
      body: Matter.Bodies.circle(randX(), randY(), tierRadius(p.growth_tier), {
        restitution: 0.85, // bouncy!
        frictionAir: 0.02,
      }),
    }));
    Matter.Composite.add(engine.world, pbodies.map((x) => x.body));
    setBodies(pbodies);

    let raf = 0;
    const tick = () => {
      Matter.Engine.update(engine, 16);
      setBodies((b) => [...b]); // trigger re-render to reposition sprites
      raf = requestAnimationFrame(tick);
    };
    tick();
    return () => cancelAnimationFrame(raf);
  }, [porings]);

  return (
    <Application background="#F0FDF4" resizeTo={window}>
      <pixiContainer>
        {bodies.map((b) => (
          <pixiGraphics
            key={b.id}
            x={b.body.position.x}
            y={b.body.position.y}
            draw={(g) => {
              g.clear();
              g.circle(0, 0, 30).fill(0xfda4af);
            }}
          />
        ))}
      </pixiContainer>
    </Application>
  );
}
```

### Step 4: DOM-overlay floating labels

The "tab above each poring" is a DOM div absolutely positioned over the canvas, reading the body's current position on every tick.

```tsx
// Rendered alongside <FieldStage/> in the same relative-positioned parent.
<div className="label-layer">
  {bodies.map((b) => {
    const p = porings.find((x) => x.id === b.id)!;
    return (
      <div
        key={b.id}
        className="poring-tab"
        style={{
          transform: `translate(${b.body.position.x}px, ${b.body.position.y - 50}px)`,
        }}
      >
        {p.title} · {p.xp} XP
      </div>
    );
  })}
</div>
```

CSS:
```css
.label-layer {
  position: absolute; inset: 0;
  pointer-events: none; /* clicks pass through to canvas */
}
.poring-tab {
  position: absolute;
  pointer-events: auto; /* the label itself is clickable */
  transform-origin: center bottom;
}
```

### Step 5: completion burst (tsparticles)

```tsx
import { Particles } from "@tsparticles/react";
import { loadFireworksPreset } from "@tsparticles/preset-fireworks";
import { useMemo } from "react";

export function CompletionBurst({ x, y }: { x: number; y: number }) {
  const options = useMemo(() => ({
    preset: "fireworks",
    fullScreen: { enable: false },
    emitters: { position: { x, y }, life: { count: 1, duration: 0.3 } },
  }), [x, y]);
  return <Particles id="burst" options={options} init={loadFireworksPreset} />;
}
```

---

## 5. Data Structure Requirements

**No backend changes.** The stack works off the existing `Poring` shape returned by `/api/v1/porings`. Client-side we layer on a `PhysicsPoring` type that pairs each API poring with a Matter `Body`:

```ts
interface PhysicsPoring {
  apiId: number;            // Poring.id from API
  body: Matter.Body;        // physics body (updated by Matter.Engine)
  homeX: number;            // spawn position
  homeY: number;
}
```

This lives in a `useRef` or a small Zustand store, never in React state for the per-frame position (state updates at 60 Hz would thrash). React state tracks only **what sprites exist** (add/remove on poring CRUD), not where they are.

---

## 6. Integration with Existing Stack

### State management

- Keep `FieldPage` as the top-level data owner — it still fetches `porings` from the API.
- Introduce a `useFieldEngine(porings)` hook that owns the `Matter.Engine` + `PhysicsPoring[]` map and returns live positions via a ref.
- `TaskPanel`, `ActModal`, `CompletedDrawer` are **unchanged** — all pure DOM React components. They read `porings` from FieldPage just like today.

### Poring interaction (click to open tab / sidebar-on-edit)

The UX the user asked for:
- **Click a poring** → its floating tab expands in place to show title + tier + quick actions (Act, Delete). **No sidebar.**
- **Click "Edit details"** on the tab → the sidebar (`TaskPanel`) slides in, positioned the same as today.
- **Click elsewhere** → tab collapses back to a minimal title badge.

This means we split the current `TaskPanel` into two components:
- `PoringTab` (DOM overlay) — always visible above each poring, minimal by default, expands on click.
- `TaskPanel` (existing sidebar) — only opens when "Edit" is clicked on the expanded tab.

The click on a Pixi sprite is caught by the canvas; we translate it to a `onPoringClick(id)` handler that toggles the expanded tab in React state.

### UI integration

- Tier visuals move from CSS classes to **Pixi sprites** (could use solid-color graphics initially, later swap to PNG/SVG sprites or a Rive character).
- Tier-up flash, bounce, and hover: driven by GSAP tweens on the body's `scale` or on a DOM layer, using `useGSAP`.
- Existing `styles.css` stays for non-field UI (panels, modals, drawer).

---

## 7. Requirements Coverage

### Against the user's stated goals

| Requirement | Coverage | How |
|---|---|---|
| Many porings jumping around | ✅ Full | Matter.js handles it; Pixi renders it |
| "WAY better, video-game feel" | ✅ Full | WebGL background with parallax layer, dropshadows, actual physics, GSAP juice on every interaction |
| Each poring's tab floats above it | ✅ Full | DOM overlay pattern — React div positioned via transform from live Matter body pos |
| Sidebar only on edit | ✅ Full | Split `PoringTab` (always-on overlay) and `TaskPanel` (only mounts when user clicks "Edit") |
| JavaScript-driven movement (not just CSS) | ✅ Full | Matter.js physics loop; positions are imperative JS |
| JSX-friendly | ✅ Full | @pixi/react lets sprites be JSX tags; DOM labels are plain JSX |

### Against open items in [docs/TODO.md](../TODO.md)

| TODO item | How this stack helps |
|---|---|
| Field backgrounds (time-of-day) | Pixi tiling sprite with a filter tint — trivial |
| Drag-to-reorder checklist | Unrelated; still DOM |
| Label strip on PoringBlob | Pixi rect row under the sprite, or DOM chips — either fit |
| Poring idle sounds | Easy to add with Howler.js or plain Web Audio |

---

## 8. Pros and Cons

### Pros

1. **Scales with the field**
   - CSS-transform + bounce-animation DOM blobs slow down around 50–100 simultaneous elements on mid-tier hardware. Pixi renders **thousands** of sprites at 60 fps. Our hard cap disappears.

2. **Real physics, not hand-rolled waypoints**
   - Current `poringPosition.ts` fakes movement with 3 hand-picked waypoints. Matter.js gives real bouncing off walls, collisions between porings (or not, if we disable pair collisions), and natural easing for free. A seed poring and a ripe poring can have different `mass` and `restitution` — chubby porings bounce heavier. That's character.

3. **Hybrid canvas + DOM is the best of both worlds**
   - Canvas for the pretty 60fps stuff (porings, particles, background). DOM for the readable/accessible/stylable stuff (labels, panels, buttons, inputs). No pure-canvas UI frustration ("how do I make this text selectable?").

4. **GSAP is a superpower and now free**
   - Sequences ("flash → shake → burst → grey out") are one `gsap.timeline()` call. CSS @keyframes can't do that.

5. **Future headroom for a Rive character**
   - If we later want porings that blink, stretch when eating, and wobble when hovered, Rive's state machine is designed for exactly that. It plugs into Pixi as a texture source.

6. **No server-side work at all**
   - Nothing to deploy, no new ports, no SERVER-INFRASTRUCTURE.md changes. Pure frontend bundle.

### Cons

1. **React 19 upgrade is required (or we accept @pixi/react v7)**
   - Hours of work in the best case (npm install + types update). Could be a half-day if we hit edge cases.
   - **Mitigation:** React 19 is stable and we want the Compiler anyway. And @pixi/react v7 on React 18 is still a valid fallback that costs nothing.

2. **Bundle size grows ~200–300 KB gzipped**
   - Pixi ~100 KB, Matter ~90 KB, GSAP ~50 KB, tsparticles slim ~40 KB, plus fireworks preset.
   - **Mitigation:** Code-split the field page so auth/register pages stay lean. Lazy-load tsparticles fireworks preset only when an act happens.

3. **Learning curve for the team**
   - Pixi scene-graph thinking is different from DOM. Matter has its own `Composite`/`Body`/`Engine` mental model.
   - **Mitigation:** Start with a tiny prototype (single bouncing circle) and grow it. Both libraries have excellent docs + huge community.

4. **Accessibility becomes harder**
   - Canvas is opaque to screen readers. We already have `aria-label` on the DOM button; Pixi has [its own accessibility module](https://pixijs.com/8.x/guides/components/accessibility) that overlays invisible divs, but we should also lean on the DOM-overlay pattern to put the crucial interactive elements (labels, edit buttons) in the DOM.
   - **Mitigation:** Labels stay DOM (already the plan). Use Pixi's accessibility module for canvas interactivity. `prefers-reduced-motion` disables the physics tick.

5. **Dev-server reload churn**
   - Vite HMR works fine, but remounting the Pixi Application on every save can be janky if not careful.
   - **Mitigation:** Put the app in a ref, re-use it across hot reloads; plenty of prior art (see [Adam Emery's Pixi+React HMR post](https://adamemery.dev/articles/pixi-react)).

---

## 9. Alternative Libraries Comparison

### Renderer

| Library | License | Pros | Cons | Verdict |
|---|---|---|---|---|
| **PixiJS v8** | MIT | WebGL/WebGPU, fastest 2D, huge community, React bindings | Scene-graph mental model | **Pick** |
| Konva / react-konva | MIT | Easiest React integration, good for interactive UIs | Canvas 2D (not WebGL) — slower for many sprites | Strong runner-up if we want dead-simple React ergonomics and fewer porings |
| Fabric.js | MIT | Built for design editors | Not a game renderer | Wrong fit |
| Phaser 3 | MIT | Full game framework | Takes over the app loop; heavy for our needs | Overkill |
| React Three Fiber | MIT | 3D + orthographic camera = faux 2D | Overshoots "tamagotchi field" | Overkill |
| Stay on DOM + CSS | N/A | Zero dependencies | Caps at ~50 simultaneous animated elements; limited visual effects | Current limit, user wants past it |

### Physics

| Library | License | Pros | Cons | Verdict |
|---|---|---|---|---|
| **Matter.js** | MIT | 132k weekly DLs, simple API, well-typed, proven | Pure JS, not the fastest | **Pick** — perf is fine at our scale |
| Rapier 2D (rapier.rs) | Apache-2.0 | Rust/WASM, ~13× Matter's perf, very actively developed | Steeper learning curve, WASM loading | Upgrade path if we ever put 1000+ porings on screen |
| Planck.js | Zlib | Box2D port, accurate | Lower adoption (1.6k weekly DLs vs 132k), older API | Fine but no real edge over Matter |
| Hand-rolled wander (current) | N/A | Zero deps | Fake; no collisions; waypoint-based | What we're replacing |

### Animation / UI juice

| Library | License | Pros | Cons | Verdict |
|---|---|---|---|---|
| **GSAP + @gsap/react** | GSAP Standard (now free) | Fastest at 60+ tweens, timelines, SplitText etc. all free, StrictMode-safe hook | Imperative (some prefer declarative) | **Pick** |
| Framer Motion | MIT | Declarative, 3.5M weekly DLs, best for UI transitions | Performance softens past ~30 simultaneous animations | Keep it in the toolbox for page/modal transitions; not the main animator |
| react-spring | MIT | Spring physics, off-thread calcs possible | Lower adoption than Framer, less juice-oriented | Viable alt; GSAP wins on raw capability |
| Motion One | MIT | Tiny, WAAPI-based | Smaller ecosystem | Fine for a lean app; overkill reduction |

### Particles

| Library | License | Pros | Cons | Verdict |
|---|---|---|---|---|
| **tsparticles** | MIT | Presets (fireworks, confetti), React component, still actively maintained 2026 | One more dep | **Pick** for Phase 3 burst |
| canvas-confetti | ISC | Tiny (~3 KB), dead simple | Just confetti — no fireworks / advanced presets | Great if we only ever need confetti |
| Custom Pixi particles | N/A | Zero extra deps (reuses Pixi) | Lots of authoring | Viable once we're already on Pixi; decide after prototype |

### (Optional) Character animation

| Library | License | Pros | Cons | Verdict |
|---|---|---|---|---|
| **Rive** | Free tier | State-machine-driven, 5–10× smaller than Lottie, 60 fps | Needs separate authoring tool; paid seats if you outgrow free | **Defer** — add in a polish pass once base stack is running |
| Lottie (lottie-web) | MIT | Familiar AE workflow | Larger files, slower, no state machine | Skip |
| Spine (esotericsoftware.com) | Commercial | Industry-standard skeletal animation | Paid, heavy | Overkill |
| Custom spritesheets | N/A | Full control | Lots of art work | Do this only if we have spritesheets |

**Verdict:** The main combination wins because each pick is best-in-class for its tier and they compose cleanly. GSAP-now-free and PixiJS-as-React-JSX are the two shifts that make 2026 a better moment to commit than 2024 would have been.

---

## 10. Development Effort Estimate

### Implementation roadmap

#### **Foundation — 0.5–1 day**
- Upgrade frontend to React 19 (`npm install react@19 react-dom@19 @types/react@19 @types/react-dom@19`)
- Verify Vite 6 + tests still build; fix any type regressions
- Commit as a standalone PR so rollback is cheap

#### **Canvas prototype — 1–2 days**
- Install Pixi + Matter
- New `FieldStage` component rendering 10 hard-coded circles bouncing with Matter
- Replace `FieldCanvas.tsx` with `<FieldStage porings={alive}/>`
- Wire `onPoringClick(id)` from sprite → existing React state

#### **Floating poring tabs (DOM overlay) — 1 day**
- New `PoringTab` component, one per alive poring, absolutely positioned
- Position sync via a shared `useAnimationFrame` that reads Matter body positions
- Expand/collapse states, tier badge inline, "Act" + "Edit" buttons
- Remove the default auto-open TaskPanel click behavior (change to double-click or "Edit" button only)

#### **GSAP-powered polish — 1 day**
- Replace CSS keyframe `poring-levelup` with a GSAP timeline (flash + shake + scale)
- Replace `.act-cta-glow` with a GSAP infinite timeline
- Modal entrance via GSAP instead of `panel-slide-in`
- Sidebar (`TaskPanel`) slide-in via GSAP

#### **Completion burst upgrade — 0.5 day**
- Swap `CompletionBurst.tsx` implementation for `@tsparticles/preset-fireworks`
- Lazy-load on first use so the preset bundle isn't in the initial load

#### **Accessibility + reduced motion — 0.5 day**
- Wire `prefers-reduced-motion` to disable the physics tick (static positions at home points)
- Pixi accessibility module for screen-reader support on sprites
- Keyboard focus for each `PoringTab`

#### **Docs — 0.5 day**
- Follow the 7-step doc update checklist
- New deployment doc `docs/research/field-rendering-deployment.md` covering bundle-size notes, React 19 migration, known issues

#### **Infrastructure — 0 hours**
No Docker, Cloudflare, DNS, or Uptime Kuma changes. Existing frontend container rebuild picks up the new deps.

**Total estimate:** **4–6 days** for a single developer, building on the solid Phase 1–3 foundation.

---

## 11. Packages to Install

### Frontend

```bash
# React 19 upgrade
npm install react@19 react-dom@19
npm install -D @types/react@19 @types/react-dom@19

# Rendering stack
npm install pixi.js@^8 @pixi/react

# Physics
npm install matter-js
npm install -D @types/matter-js

# Animation
npm install gsap @gsap/react

# Particles
npm install @tsparticles/react @tsparticles/slim @tsparticles/preset-fireworks
```

**Bundle impact (rough, gzipped):**
- pixi.js: ~100 KB
- @pixi/react: ~4 KB
- matter-js: ~90 KB
- gsap + @gsap/react: ~50 KB
- tsparticles (slim + fireworks): ~45 KB
- **Total: ~290 KB added**, landing the field bundle around ~350 KB gzipped. For a tamagotchi app this is well within acceptable.

### Backend

None.

### Docker

None. Existing `frontend` service's Dockerfile runs `npm ci && npm run build` — it picks up the new deps automatically on next rebuild.

---

## 12. Integration Approach

### Step-by-step integration plan

#### **Phase A: React 19 migration (prereq)**
1. Open a branch; do the upgrade; run `npm run build` + `npm run dev` smoke test.
2. If anything breaks: revert the branch; fall back to `@pixi/react@^7` on React 18.

#### **Phase B: Renderer swap behind a flag**
1. Introduce `VITE_FIELD_ENGINE=pixi | dom` env var; default `dom` for now.
2. Build `FieldStage` alongside the existing `FieldCanvas`.
3. Ship both; toggle the env var to compare.

#### **Phase C: DOM-overlay tabs replacing click-to-open-panel**
1. Split `TaskPanel`: extract the minimal info view into `PoringTab`.
2. Rewire `FieldPage.handleSelect` — clicking a poring now expands the tab, not opens the panel.
3. Panel opens only when tab's "Edit" button clicked, or when a ripe poring is clicked (existing ActModal behavior stays).

#### **Phase D: GSAP juice pass**
1. Install GSAP; add `useGSAP` registrations.
2. Port each CSS keyframe animation one at a time; keep the CSS as fallback until GSAP version is verified.

#### **Phase E: tsparticles for the burst**
1. Swap `CompletionBurst.tsx` internals; keep the same props.
2. Dynamic-import the fireworks preset so it's not in the initial bundle.

#### **Phase F: Clean up**
1. Delete `poringPosition.ts` (wander waypoints), `PoringBlob.tsx` bounce CSS, `FieldCanvas.tsx` DOM impl.
2. Remove the env flag.
3. Update [PROGRESS.md](../PROGRESS.md), [README.md](../../README.md), [STYLEGUIDE.md](../STYLEGUIDE.md) with the new components.

---

## 13. Will It Make Our Lives Easier?

### **YES — net-negative code over time, net-positive user delight**

**Reasons:**
1. **Physics replaces the wander hack.** We delete `poringPosition.ts` and its waypoint math. Time saved: ~200 lines of subtle code we'd otherwise keep tuning. Net easier.
2. **GSAP timelines collapse CSS animation sprawl.** `styles.css` is already at 600+ lines with several `@keyframes` blocks. Those sequences become short JS timelines with better cleanup semantics.
3. **The video-game feel becomes achievable, not approximate.** Bumpy collisions, squash-and-stretch on bounce, particle bursts, day/night tint — all are line-of-code additions once the engine is in place. On CSS/DOM they're all major projects each.

**Challenges:**
- React 19 upgrade is the prereq. Low risk but not zero.
- Accessibility needs explicit attention that "DOM buttons with aria-label" got for free.
- Devs on the project need to hold two mental models: React DOM tree + Pixi scene graph.

**Net benefit:** The app gets visibly better with less runtime complexity long-term, at the cost of one week of focused work and ~300 KB of gzipped JS.

---

## 14. Recommendation

### ✅ **YES — adopt the stack, start with the React 19 upgrade, then the Pixi prototype.**

**Rationale:**
- The user's explicit goals (many porings moving, video-game feel, floating tabs, sidebar-on-edit) all land naturally on PixiJS + DOM overlay. CSS-only can't get there at scale.
- GSAP being free as of Oct 2024 removes the last reason to avoid the "right" animation library.
- Server impact is zero; the whole change lives in the frontend bundle.
- The existing Phase 1–3 backend doesn't need to change. `Poring`, `ChecklistItem`, `Label`, XP service — all unchanged.

**Next steps:**
1. **User approves this analysis** and picks a cadence (one-shot rewrite vs phased behind a flag — I recommend phased).
2. **Create [field-rendering-deployment.md](./field-rendering-deployment.md)** with concrete integration steps, bundle-size monitoring plan, React 19 migration checklist.
3. **Start Phase A** (React 19 upgrade as a standalone PR) to de-risk before touching rendering code.

**Risk mitigation:**
- **If React 19 upgrade blows up:** fall back to `@pixi/react@^7` on React 18. Everything else in the stack works identically on 18.
- **If the bundle size becomes an issue:** code-split the field page so `/login` and `/register` stay skinny; lazy-load tsparticles.
- **If devs find Pixi/Matter hard to onboard:** reduce scope — keep Matter, render with react-konva instead of Pixi. Same React-idiomatic look, canvas-2D underneath, slower but simpler.

---

## 15. Additional Resources

### Official documentation
- [PixiJS v8 docs](https://pixijs.com/8.x/guides)
- [@pixi/react v8 docs](https://react.pixijs.io/getting-started/)
- [Matter.js docs](https://brm.io/matter-js/docs/)
- [Matter.js GitHub](https://github.com/liabru/matter-js)
- [GSAP docs](https://gsap.com/docs/v3/)
- [GSAP + React (useGSAP)](https://gsap.com/resources/React/)
- [GSAP free-for-all announcement](https://webflow.com/blog/gsap-becomes-free)
- [tsparticles samples](https://particles.js.org/samples/index.html)
- [Rive docs](https://rive.app/community)

### Comparison articles
- [Best React animation libraries 2026 — LogRocket](https://blog.logrocket.com/best-react-animation-libraries/)
- [GSAP vs Framer Motion vs React Spring 2026](https://www.annnimate.com/blog/gsap-vs-framer-motion-vs-react-spring)
- [Fabric.js vs Konva vs PixiJS 2026](https://www.pkgpulse.com/blog/fabricjs-vs-konva-vs-pixijs-canvas-2d-graphics-libraries-2026)
- [Ranking JS canvas frameworks — Medium, Feb 2026](https://drabstract.medium.com/ranking-javascript-canvas-frameworks-3c3e407ab7d8)
- [Rive vs Lottie 2026](https://www.rivemasterclass.com/blog/rive-vs-lottie-in-20260why-interactive-logic-data-binding-scripting-make-rive-the-future-of-ui-animation)
- [Rapier physics 2025 review](https://dimforge.com/blog/2026/01/09/the-year-2025-in-dimforge/)

### Reference patterns
- [Adam Emery — PixiJS inside React](https://adamemery.dev/articles/pixi-react)
- [LogRocket — Getting started with PixiJS and React](https://blog.logrocket.com/getting-started-pixijs-react-create-canvas/)
- [Making adaptive UI layout in Pixi with DOM overlays](https://dev.to/schmooky/making-adaptive-ui-layout-in-pixijs-easy-with-dom-186j)

---

## 16. Conclusion

poringField has outgrown CSS animations. The user wants porings that really jump around a video-game field, floating tabs above each one, and a sidebar that only appears for actual editing. All of that lands cleanly on a **PixiJS + Matter.js + GSAP + tsparticles** stack, with React + DOM staying in charge of all non-field UI.

The only real commitment before starting is the React 18 → 19 upgrade, which is stable and widely adopted as of April 2026 and removes the one @pixi/react v8 compatibility gate. Everything else is a purely additive frontend change with zero server impact and no backend or schema changes.

Recommended path: **approve, then execute in phases behind a `VITE_FIELD_ENGINE` flag** so the existing experience stays shippable the whole time. Estimated effort is **4–6 days of focused work** once the React 19 upgrade is in. After this, the app stops looking like "a task manager with round icons" and starts looking like "a field of little creatures you're taking care of" — which was the pitch in the README from day one.

---

**End of Analysis**

*Compiled by: Claude (Opus 4.7)*
*Date: 2026-04-23*
*Research duration: ~45 minutes (web search + doc fetches + codebase cross-reference)*
*Confidence: High for the main recommendation; Medium on the React 19 migration effort (could be half a day, could be a day and a half depending on type regressions in our existing deps).*
