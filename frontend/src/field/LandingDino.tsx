import { Application } from "@pixi/react";
import { Sprite } from "pixi.js";
import type { AnimatedSprite as PixiAnimatedSprite, Container as PixiContainer, Texture } from "pixi.js";
import { useEffect, useRef, useState } from "react";

import type { DecorationSpec, DecorationTextures } from "@/field/FieldDecorations";
import { useDecorationTextures } from "@/field/FieldDecorations";
import "@/field/pixiExtend";
import type { DinoSpritesheet } from "@/field/useDinoSpritesheet";
import { useDinoSpritesheets } from "@/field/useDinoSpritesheet";

const LANDING_SCALE = 16;
const ANIM_SPEED = 0.06;
const N_EDGE = 14;    // trees per edge
const N_SCATTER = 28; // grass tiles in interior

// ─── Decoration helpers (landing-specific) ────────────────────────────────────

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

function generateLandingDecorations(w: number, h: number, textures: DecorationTextures): DecorationSpec[] {
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
        specs.push({ x, y, texture, scale, anchorX: 0.5, anchorY });
        return;
      }
    }
  };

  // Grass scatter: fill interior, skip a safe radius around the centered dino
  if (scatter.length > 0) {
    const SCATTER_MARGIN = 100;
    const SAFE_R = 190; // px around center — keeps dino visible
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
          specs.push({ x, y, texture: pick(scatter), scale: scatterScale, anchorX: 0.5, anchorY });
          break;
        }
      }
    }
  }

  // Edge trees
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

const SMALL_SCALE = 6;

// Small companion dinos around vita's feet.
// vita center = (w/2, h/2). At scale 16 the sprite is ~192px to the feet from center.
// Companions sit lower on screen so they appear grounded at the same foot level.
const COMPANIONS: { variantIndex: number; dx: number; dy: number; flip: boolean }[] = [
  { variantIndex: 1, dx: -160, dy: 110, flip: false }, // doux — left, faces right
  { variantIndex: 2, dx:  140, dy:  95, flip: true  }, // mort — right, faces left
  { variantIndex: 3, dx:   50, dy: 140, flip: false }, // tard — front-right
];

// ─── Pixi scene (inside Application context) ──────────────────────────────────

function LandingScene({
  sheets,
  decorTextures,
  w,
  h,
}: {
  sheets: (DinoSpritesheet | null)[];
  decorTextures: DecorationTextures | null;
  w: number;
  h: number;
}): React.ReactElement {
  const decorRef = useRef<PixiContainer | null>(null);
  const vitaSheet = sheets[0];

  useEffect(() => {
    const c = decorRef.current;
    if (!c || !decorTextures || w === 0) return;
    c.removeChildren();
    for (const s of generateLandingDecorations(w, h, decorTextures)) {
      const sprite = new Sprite(s.texture);
      sprite.anchor.set(s.anchorX, s.anchorY);
      sprite.scale.set(s.scale);
      sprite.x = s.x;
      sprite.y = s.y;
      sprite.eventMode = "none";
      c.addChild(sprite);
    }
  }, [decorTextures, w, h]);

  return (
    <>
      <pixiContainer ref={(c) => { decorRef.current = c; }} />

      {/* Main vita dino — rendered first so companions appear in front */}
      {vitaSheet && (
        <pixiAnimatedSprite
          ref={(s: PixiAnimatedSprite | null) => {
            if (!s) return;
            s.textures = vitaSheet.textures.idle;
            s.animationSpeed = ANIM_SPEED;
            s.loop = true;
            s.gotoAndPlay(0);
          }}
          textures={vitaSheet.textures.idle}
          animationSpeed={ANIM_SPEED}
          loop
          anchor={0.5}
          x={w / 2}
          y={h / 2}
          scale={LANDING_SCALE}
        />
      )}

      {/* Companion dinos around vita's feet */}
      {COMPANIONS.map(({ variantIndex, dx, dy, flip }) => {
        const cSheet = sheets[variantIndex];
        if (!cSheet) return null;
        const scaleX = flip ? -SMALL_SCALE : SMALL_SCALE;
        return (
          <pixiAnimatedSprite
            key={variantIndex}
            ref={(s: PixiAnimatedSprite | null) => {
              if (!s) return;
              s.textures = cSheet.textures.idle;
              s.animationSpeed = ANIM_SPEED;
              s.loop = true;
              s.scale.x = scaleX;
              s.scale.y = SMALL_SCALE;
              // Stagger start frames so all four don't blink in sync
              s.gotoAndPlay(Math.floor(Math.random() * cSheet.textures.idle.length));
            }}
            textures={cSheet.textures.idle}
            animationSpeed={ANIM_SPEED}
            loop
            anchor={0.5}
            x={w / 2 + dx}
            y={h / 2 + dy}
          />
        );
      })}
    </>
  );
}

// ─── Public component ─────────────────────────────────────────────────────────

export function LandingDino(): React.ReactElement {
  const wrapRef = useRef<HTMLDivElement>(null);
  const [dims, setDims] = useState({ w: 0, h: 0 });
  const sheets = useDinoSpritesheets();
  const decorTextures = useDecorationTextures("Forest");

  useEffect(() => {
    const el = wrapRef.current;
    if (!el) return;
    const observe = (): void => setDims({ w: el.clientWidth, h: el.clientHeight });
    observe();
    const ro = new ResizeObserver(observe);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  return (
    <div ref={wrapRef} className="landing-dino-wrap">
      {dims.w > 0 && (
        <Application
          resizeTo={wrapRef}
          backgroundAlpha={0}
          antialias
          autoDensity
          resolution={window.devicePixelRatio || 1}
        >
          <LandingScene sheets={sheets} decorTextures={decorTextures} w={dims.w} h={dims.h} />
        </Application>
      )}
    </div>
  );
}
