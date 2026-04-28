/**
 * Static field decorations loaded per world.
 *
 * Each world defines which files are "scatter" (interior) and which are
 * "trees" (edge clusters), plus the scale/anchor for its tile style.
 *
 * forest  — Kenney 512×512 isometric tiles; anchor y≈0.62
 * forest2 — 16×16 pixel-art tiles; nearest-neighbor, 5× scale
 * forest3 — 16×16 pixel-art tiles; nearest-neighbor, 5× scale
 */
import { Assets } from "pixi.js";
import type { Texture } from "pixi.js";
import { useEffect, useState } from "react";

// ─── World id ──────────────────────────────────────────────────────────────

export type WorldId = "forest" | "forest2" | "forest3";
export const WORLD_IDS: WorldId[] = ["forest", "forest2", "forest3"];

// ─── Tile imports (static globs — Vite resolves at build time) ────────────

// forest
const F1_FLOWER   = import.meta.glob<{ default: string }>("../assets/worlds/forest/decorations/flower_*_NE.png",    { eager: true });
const F1_MUSHROOM = import.meta.glob<{ default: string }>("../assets/worlds/forest/decorations/mushroom_*_NE.png",  { eager: true });
const F1_PLANT    = import.meta.glob<{ default: string }>("../assets/worlds/forest/decorations/plant_bush*_NE.png", { eager: true });
const F1_ROCK     = import.meta.glob<{ default: string }>("../assets/worlds/forest/ground/rock_smallFlat*_NE.png",  { eager: true });
const F1_TREE     = import.meta.glob<{ default: string }>("../assets/worlds/forest/ground/tree_{default,oak,fat,pineRoundA,pineRoundB,detailed,small}_NE.png", { eager: true });

// forest2
const F2_SCATTER  = import.meta.glob<{ default: string }>("../assets/worlds/forest2/ground/tile_grass*.png",        { eager: true });
const F2_TREE     = import.meta.glob<{ default: string }>("../assets/worlds/forest2/decorations/tile_tree*.png",    { eager: true });

// forest3
const F3_SCATTER  = import.meta.glob<{ default: string }>("../assets/worlds/forest3/ground/tileCol_grass*.png",     { eager: true });
const F3_TREE     = import.meta.glob<{ default: string }>("../assets/worlds/forest3/decorations/tileCol_*tree*.png",{ eager: true });

function urls(obj: Record<string, { default: string }>): string[] {
  return Object.values(obj).map((m) => m.default);
}

// ─── Per-world config ──────────────────────────────────────────────────────

interface WorldConfig {
  scatterUrls: string[];
  treeUrls: string[];
  scatterScale: number;
  treeScale: number;
  anchorY: number;
  pixelArt: boolean;
  minSpacing: number; // minimum px between any two decoration centers (0 = no check)
}

const WORLD_CONFIGS: Record<WorldId, WorldConfig> = {
  forest: {
    scatterUrls: [...urls(F1_FLOWER), ...urls(F1_MUSHROOM), ...urls(F1_PLANT), ...urls(F1_ROCK)],
    treeUrls:    urls(F1_TREE),
    scatterScale: 1.05,
    treeScale:    0.8,
    anchorY:      0.62,
    pixelArt:     false,
    minSpacing:   0,
  },
  forest2: {
    scatterUrls: urls(F2_SCATTER),
    treeUrls:    urls(F2_TREE),
    scatterScale: 5,
    treeScale:    5,
    anchorY:      0.5,
    pixelArt:     true,
    minSpacing:   90, // 16px tile × 5 scale = 80px; 90 gives a small gap
  },
  forest3: {
    scatterUrls: urls(F3_SCATTER),
    treeUrls:    urls(F3_TREE),
    scatterScale: 5,
    treeScale:    5,
    anchorY:      0.5,
    pixelArt:     true,
    minSpacing:   90,
  },
};

// ─── Loader ────────────────────────────────────────────────────────────────

export interface DecorationTextures {
  scatter: Texture[];
  trees: Texture[];
  config: WorldConfig;
}

const caches = new Map<WorldId, Promise<DecorationTextures>>();

async function loadWorld(world: WorldId): Promise<DecorationTextures> {
  const cfg = WORLD_CONFIGS[world];

  const load = async (url: string): Promise<Texture> => {
    const tex = await Assets.load<Texture>(url);
    if (cfg.pixelArt) tex.source.scaleMode = "nearest";
    return tex;
  };

  const [scatter, trees] = await Promise.all([
    Promise.all(cfg.scatterUrls.map(load)),
    Promise.all(cfg.treeUrls.map(load)),
  ]);
  return { scatter, trees, config: cfg };
}

export function useDecorationTextures(world: WorldId): DecorationTextures | null {
  const [textures, setTextures] = useState<DecorationTextures | null>(null);

  useEffect(() => {
    setTextures(null);
    let cancelled = false;
    if (!caches.has(world)) caches.set(world, loadWorld(world));
    void caches.get(world)!
      .then((t) => { if (!cancelled) setTextures(t); })
      .catch((err: unknown) => {
        // eslint-disable-next-line no-console
        console.error(`[FieldDecorations] ${world} load failed:`, err);
        caches.delete(world);
      });
    return () => { cancelled = true; };
  }, [world]);

  return textures;
}

// ─── Position generation ───────────────────────────────────────────────────

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

export interface DecorationSpec {
  x: number;
  y: number;
  texture: Texture;
  scale: number;
  anchorX: number;
  anchorY: number;
}

const TREE_EDGE_MARGIN    = -40;
const TREE_EDGE_DEPTH     = 90;
const TREE_TOP_MARGIN     = 48; // fake top edge — trees won't clip above this line
const SCATTER_MARGIN      = 140;
const N_SCATTER           = 24;

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

export function generateDecorations(
  fieldW: number,
  fieldH: number,
  textures: DecorationTextures,
): DecorationSpec[] {
  if (!fieldW || !fieldH || !textures.scatter.length || !textures.trees.length) return [];
  const { scatter, trees, config } = textures;
  const { minSpacing } = config;
  const rng = seededRng(0xdeadbeef);
  const specs: DecorationSpec[] = [];
  const anchorY = config.anchorY;

  // Scatter: interior — retry up to 20× per tile to find a non-overlapping spot
  for (let i = 0; i < N_SCATTER; i++) {
    for (let attempt = 0; attempt < 20; attempt++) {
      const x = SCATTER_MARGIN + rng() * (fieldW - SCATTER_MARGIN * 2);
      const y = SCATTER_MARGIN + rng() * (fieldH - SCATTER_MARGIN * 2);
      if (canPlace(x, y, specs, minSpacing)) {
        specs.push({ x, y, texture: scatter[Math.floor(rng() * scatter.length)], scale: config.scatterScale, anchorX: 0.5, anchorY });
        break;
      }
    }
  }

  const treePick = (): Texture => trees[Math.floor(rng() * trees.length)];
  const tryTree = (genX: () => number, genY: () => number): void => {
    for (let attempt = 0; attempt < 20; attempt++) {
      const x = genX();
      const y = genY();
      if (canPlace(x, y, specs, minSpacing)) {
        specs.push({ x, y, texture: treePick(), scale: config.treeScale, anchorX: 0.5, anchorY });
        return;
      }
    }
  };

  for (let i = 0; i < 4; i++) tryTree(() => TREE_EDGE_MARGIN + rng() * TREE_EDGE_DEPTH,         () => 80 + rng() * (fieldH - 160));
  for (let i = 0; i < 4; i++) tryTree(() => fieldW - TREE_EDGE_MARGIN - rng() * TREE_EDGE_DEPTH, () => 80 + rng() * (fieldH - 160));
  for (let i = 0; i < 4; i++) tryTree(() => 80 + rng() * (fieldW - 160),                         () => TREE_TOP_MARGIN + TREE_EDGE_MARGIN + rng() * TREE_EDGE_DEPTH);
  for (let i = 0; i < 4; i++) tryTree(() => 80 + rng() * (fieldW - 160),                         () => fieldH - TREE_EDGE_MARGIN - rng() * TREE_EDGE_DEPTH);

  return specs;
}
