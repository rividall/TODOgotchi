import { Application } from "@pixi/react";
import { Sprite } from "pixi.js";
import type { AnimatedSprite as PixiAnimatedSprite, Container as PixiContainer, Sprite as PixiSprite, Texture } from "pixi.js";
import { useEffect, useRef, useState } from "react";

import type { DecorationSpec, DecorationTextures, WorldId } from "@/field/FieldDecorations";
import { generateDecorations, preloadDecorationTextures, useDecorationTextures } from "@/field/FieldDecorations";
import "@/field/pixiExtend";
import type { DinoSpritesheet } from "@/field/useDinoSpritesheet";
import { useDinoSpritesheets } from "@/field/useDinoSpritesheet";
import { useGraveyardCreatures } from "@/field/useGraveyardCreatures";
import { useSpaceShipTextures } from "@/field/useSpaceAssets";

// Pre-warm the default Forest decoration textures.
preloadDecorationTextures("Forest");

const ANIM_SPEED = 0.06;
const N_EDGE = 14;    // forest: trees per edge
const N_SCATTER = 28; // forest: grass tiles in interior

// Per-world creature scales: { big, small }
const CREATURE_SCALES: Record<WorldId, { big: number; small: number }> = {
  Forest_ISO:   { big: 16, small: 6 },
  Forest_retro: { big: 16, small: 6 },
  Forest:       { big: 16, small: 6 },
  Graveyard:    { big: 12, small: 5 },
  Space:        { big: 1.6, small: 0.7 },
};

// 3 companions placed around the big creature's feet.
const COMPANIONS: { dx: number; dy: number; flip: boolean }[] = [
  { dx: -160, dy: 110, flip: false }, // left, faces right
  { dx:  140, dy:  95, flip: true  }, // right, faces left
  { dx:   50, dy: 140, flip: false }, // front-right
];

// ─── Decoration helpers ───────────────────────────────────────────────────────

function seededRng(seed: number): () => number {
  let s = seed >>> 0;
  return () => {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function canPlace(x: number, y: number, placed: DecorationSpec[], minDist: number): boolean {
  if (minDist <= 0) return true;
  const d2 = minDist * minDist;
  for (const p of placed) {
    const dx = x - p.x;
    const dy = y - p.y;
    if (dx * dx + dy * dy < d2) return false;
  }
  return true;
}

// Forest-only: simpler decorator that keeps a safe radius around the centered creature
function generateForestLandingDecorations(w: number, h: number, textures: DecorationTextures): DecorationSpec[] {
  if (!w || !h) return [];
  const { scatter, trees, config } = textures;
  const rng = seededRng(0xc0ffee);
  const specs: DecorationSpec[] = [];
  const { minSpacing, anchorY, scatterScale, treeScale } = config;

  const pick = (arr: Texture[]): Texture => arr[Math.floor(rng() * arr.length)];

  const tryPlace = (genX: () => number, genY: () => number, texture: Texture, scale: number): void => {
    for (let attempt = 0; attempt < 30; attempt++) {
      const x = genX();
      const y = genY();
      if (canPlace(x, y, specs, minSpacing)) {
        specs.push({ x, y, texture, scale, anchorX: 0.5, anchorY, rotates: false });
        return;
      }
    }
  };

  if (scatter.length > 0) {
    const SCATTER_MARGIN = 100;
    const SAFE_R = 190;
    const cx = w / 2;
    const cy = h / 2;
    for (let i = 0; i < N_SCATTER; i++) {
      for (let attempt = 0; attempt < 30; attempt++) {
        const x = SCATTER_MARGIN + rng() * (w - SCATTER_MARGIN * 2);
        const y = SCATTER_MARGIN + rng() * (h - SCATTER_MARGIN * 2);
        const dx = x - cx;
        const dy = y - cy;
        if (dx * dx + dy * dy < SAFE_R * SAFE_R) continue;
        if (canPlace(x, y, specs, minSpacing)) {
          specs.push({ x, y, texture: pick(scatter), scale: scatterScale, anchorX: 0.5, anchorY, rotates: false });
          break;
        }
      }
    }
  }

  if (trees.length > 0) {
    const MARGIN = -40;
    const DEPTH = 110;
    const tryTree = (genX: () => number, genY: () => number) =>
      tryPlace(genX, genY, pick(trees), treeScale);
    for (let i = 0; i < N_EDGE; i++) tryTree(() => MARGIN + rng() * DEPTH, () => rng() * h);
    for (let i = 0; i < N_EDGE; i++) tryTree(() => w - MARGIN - rng() * DEPTH, () => rng() * h);
    for (let i = 0; i < N_EDGE; i++) tryTree(() => rng() * w, () => MARGIN + rng() * DEPTH);
    for (let i = 0; i < N_EDGE; i++) tryTree(() => rng() * w, () => h - MARGIN - rng() * DEPTH);
  }

  return specs;
}

// ─── Pixi scene ───────────────────────────────────────────────────────────────

interface SceneProps {
  world: WorldId;
  dinoSheets: (DinoSpritesheet | null)[];
  graveyardSheets: (DinoSpritesheet | null)[];
  shipTextures: Texture[] | null;
  decorTextures: DecorationTextures | null;
  w: number;
  h: number;
}

function LandingScene({ world, dinoSheets, graveyardSheets, shipTextures, decorTextures, w, h }: SceneProps): React.ReactElement {
  const decorRef = useRef<PixiContainer | null>(null);
  const decorRotationsRef = useRef<number[]>([]);
  const { big, small } = CREATURE_SCALES[world];
  const isForest = world === "Forest" || world === "Forest_ISO" || world === "Forest_retro";
  const isSpace = world === "Space";

  // Re-render decorations when world / size / textures change.
  useEffect(() => {
    const c = decorRef.current;
    if (!c || !decorTextures || w === 0) return;
    c.removeChildren();
    decorRotationsRef.current = [];
    // Forest worlds use the centered-safe-radius generator; everything else
    // uses the shared field generator (grids, paired trees, scatter2, etc).
    const specs = isForest
      ? generateForestLandingDecorations(w, h, decorTextures)
      : generateDecorations(w, h, decorTextures);
    for (const s of specs) {
      const sprite = new Sprite(s.texture);
      sprite.anchor.set(s.anchorX, s.anchorY);
      sprite.scale.set(s.scale);
      sprite.x = s.x;
      sprite.y = s.y;
      sprite.eventMode = "none";
      c.addChild(sprite);
      decorRotationsRef.current.push(s.rotates ? 0.003 : 0);
    }
  }, [decorTextures, w, h, isForest, world]);

  // Rotate spinning decorations (e.g. Space asteroids) per frame.
  useEffect(() => {
    if (!isSpace) return;
    let raf = 0;
    const tick = (): void => {
      const c = decorRef.current;
      if (c) {
        const rates = decorRotationsRef.current;
        for (let i = 0; i < c.children.length; i++) {
          const r = rates[i];
          if (r) (c.children[i] as Sprite).rotation += r;
        }
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [isSpace]);

  // Resolve the creatures to render in [big, small1, small2, small3] order.
  // For forest: vita + 3 dino companions. For graveyard: first 4 graveyard
  // sheets. For space: 4 ship textures.
  const renderCreature = (
    role: "big" | "small",
    index: number,
    x: number,
    y: number,
    flip = false,
  ): React.ReactNode => {
    const scale = role === "big" ? big : small;
    const scaleX = flip ? -scale : scale;

    if (isSpace) {
      if (!shipTextures) return null;
      const tex = shipTextures[index % shipTextures.length];
      return (
        <pixiSprite
          key={`${world}-${role}-${index}`}
          ref={(s: PixiSprite | null) => { if (s) { s.scale.x = scaleX; s.scale.y = scale; } }}
          texture={tex}
          anchor={0.5}
          x={x}
          y={y}
        />
      );
    }

    const sheets = world === "Graveyard" ? graveyardSheets : dinoSheets;
    const sheet = sheets[index % sheets.length];
    if (!sheet) return null;
    return (
      <pixiAnimatedSprite
        key={`${world}-${role}-${index}`}
        ref={(s: PixiAnimatedSprite | null) => {
          if (!s) return;
          s.textures = sheet.textures.idle;
          s.animationSpeed = ANIM_SPEED;
          s.loop = true;
          s.scale.x = scaleX;
          s.scale.y = scale;
          s.gotoAndPlay(role === "big" ? 0 : Math.floor(Math.random() * sheet.textures.idle.length));
        }}
        textures={sheet.textures.idle}
        animationSpeed={ANIM_SPEED}
        loop
        anchor={0.5}
        x={x}
        y={y}
      />
    );
  };

  return (
    <>
      <pixiContainer ref={(c) => { decorRef.current = c; }} />
      {/* Big centered creature first so companions render in front */}
      {renderCreature("big", 0, w / 2, h / 2)}
      {COMPANIONS.map((c, i) =>
        renderCreature("small", i + 1, w / 2 + c.dx, h / 2 + c.dy, c.flip),
      )}
    </>
  );
}

// ─── Public component ─────────────────────────────────────────────────────────

interface LandingDinoProps {
  world?: WorldId;
}

export function LandingDino({ world = "Forest" }: LandingDinoProps): React.ReactElement {
  const wrapRef = useRef<HTMLDivElement>(null);
  const [dims, setDims] = useState({ w: 0, h: 0 });
  const dinoSheets = useDinoSpritesheets();
  const graveyardSheets = useGraveyardCreatures();
  const shipTextures = useSpaceShipTextures();
  const decorTextures = useDecorationTextures(world);

  useEffect(() => {
    const el = wrapRef.current;
    if (!el) return;
    const observe = (): void => setDims({ w: el.clientWidth, h: el.clientHeight });
    observe();
    const ro = new ResizeObserver(observe);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  // Gate the Application on every creature for the active world being ready.
  // @pixi/react's reconciler cannot retroactively add sprites to an already-mounted
  // scene, so all four creatures must be present from the very first render.
  const creaturesReady =
    world === "Space"
      ? shipTextures !== null && shipTextures.length >= 4
      : world === "Graveyard"
      ? graveyardSheets.slice(0, 4).every((s) => s !== null)
      : dinoSheets.every((s) => s !== null);

  return (
    <div ref={wrapRef} className="landing-dino-wrap">
      {dims.w > 0 && creaturesReady && (
        <Application
          key={world}
          resizeTo={wrapRef}
          backgroundAlpha={0}
          antialias
          autoDensity
          resolution={window.devicePixelRatio || 1}
        >
          <LandingScene
            world={world}
            dinoSheets={dinoSheets}
            graveyardSheets={graveyardSheets}
            shipTextures={shipTextures}
            decorTextures={decorTextures}
            w={dims.w}
            h={dims.h}
          />
        </Application>
      )}
    </div>
  );
}
