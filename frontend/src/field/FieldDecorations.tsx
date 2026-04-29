/**
 * Static field decorations loaded per world.
 *
 * Each world defines which files are "scatter" (interior) and which are
 * "trees" (edge clusters), plus the scale/anchor for its tile style.
 *
 * Forest_ISO   — Kenney 512×512 isometric tiles; anchor y≈0.62
 * Forest_retro — 16×16 pixel-art tiles; nearest-neighbor, 5× scale
 * Forest       — 16×16 pixel-art tiles; nearest-neighbor, 5× scale
 * Space        — Kenney space shooter; ships as creatures, meteors as decorations
 */
import { Assets } from "pixi.js";
import type { Texture } from "pixi.js";
import { useEffect, useState } from "react";

// ─── World id ──────────────────────────────────────────────────────────────

export type WorldId = "Forest_ISO" | "Forest_retro" | "Forest" | "Space" | "Graveyard";
export const WORLD_IDS: WorldId[] = ["Forest", "Space", "Graveyard"];

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

// space
const SP_GROUND   = import.meta.glob<{ default: string }>("../assets/worlds/space/ground/black.png",                { eager: true });
const SP_METEOR   = import.meta.glob<{ default: string }>("../assets/worlds/space/decorations/meteor*.png",         { eager: true });

// graveyard
const GY_TILES    = import.meta.glob<{ default: string }>("../assets/worlds/graveyard/ground/tile_*.png",           { eager: true });
const GY_GRAVES   = import.meta.glob<{ default: string }>("../assets/worlds/graveyard/decorations/grave*.png",      { eager: true });

const GY_TREES    = import.meta.glob<{ default: string }>("../assets/worlds/graveyard/decorations/tree*.png",       { eager: true });

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
  minSpacing: number;
  nScatter: number;          // how many scatter tiles to place (ignored when scatterAsGrid is true)
  treesRotate: boolean;      // whether "tree" decorations slowly spin (e.g. asteroids)
  scatterAsGrid: boolean;    // tile scatter textures in a grid to cover the whole background
  scatter2Urls?: string[];   // optional second scatter pool with its own scale
  scatter2Scale?: number;
  nScatter2?: number;
  scatter2MarginPct?: number; // 0–0.5: percentage margin on each side for scatter2 placement
  treePaired: boolean;        // trees[0] = top half, trees[1] = bottom half — placed as stacked pairs
}

const WORLD_CONFIGS: Record<WorldId, WorldConfig> = {
  Forest_ISO: {
    scatterUrls: [...urls(F1_FLOWER), ...urls(F1_MUSHROOM), ...urls(F1_PLANT), ...urls(F1_ROCK)],
    treeUrls:    urls(F1_TREE),
    scatterScale: 1.05,
    treeScale:    0.8,
    anchorY:      0.62,
    pixelArt:     false,
    minSpacing:   0,
    nScatter:     24,
    treesRotate:  false,
    scatterAsGrid: false,
    treePaired:   false,
  },
  Forest_retro: {
    scatterUrls: urls(F2_SCATTER),
    treeUrls:    urls(F2_TREE),
    scatterScale: 5,
    treeScale:    5,
    anchorY:      0.5,
    pixelArt:     true,
    minSpacing:   90,
    nScatter:     24,
    treesRotate:  false,
    scatterAsGrid: false,
    treePaired:   false,
  },
  Forest: {
    scatterUrls: urls(F3_SCATTER),
    treeUrls:    urls(F3_TREE),
    scatterScale: 5,
    treeScale:    5,
    anchorY:      0.5,
    pixelArt:     true,
    minSpacing:   90,
    nScatter:     24,
    treesRotate:  false,
    scatterAsGrid: false,
    treePaired:   false,
  },
  Space: {
    scatterUrls: urls(SP_GROUND),
    treeUrls:    urls(SP_METEOR),
    scatterScale: 1,
    treeScale:    1,
    anchorY:      0.5,
    pixelArt:     false,
    minSpacing:   0,
    nScatter:     0, // unused — scatterAsGrid handles placement
    treesRotate:  true,
    scatterAsGrid: true,
    treePaired:   false,
  },
  Graveyard: {
    scatterUrls:  urls(GY_TILES),                              // ground tiles — scale 1
    scatter2Urls: urls(GY_GRAVES),                             // graves — scale 2
    treeUrls:     urls(GY_TREES),                              // edge trees — scale 3
    scatterScale:  1,
    scatter2Scale: 2,
    treeScale:     3,
    anchorY:       1,
    pixelArt:      false,
    minSpacing:    80,
    nScatter:      30,  // doubled tile count
    nScatter2:          14,
    scatter2MarginPct:  0.3,  // constrain graves to 30–70% of the field
    treesRotate:        false,
    scatterAsGrid:      false,
    treePaired:         true,
  },
};

// ─── Loader ────────────────────────────────────────────────────────────────

export interface DecorationTextures {
  scatter: Texture[];
  scatter2: Texture[];
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

  const [scatter, scatter2, trees] = await Promise.all([
    Promise.all(cfg.scatterUrls.map(load)),
    Promise.all((cfg.scatter2Urls ?? []).map(load)),
    Promise.all(cfg.treeUrls.map(load)),
  ]);
  return { scatter, scatter2, trees, config: cfg };
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
  rotates: boolean;
}

const TREE_EDGE_MARGIN    = -40;
const TREE_EDGE_DEPTH     = 90;
const TREE_TOP_MARGIN     = 48;
const SCATTER_MARGIN      = 60; // smaller for space so stars reach near edges

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
  if (!fieldW || !fieldH) return [];
  const { scatter, scatter2, trees, config } = textures;
  const { minSpacing, nScatter } = config;
  const rng = seededRng(0xdeadbeef);
  const specs: DecorationSpec[] = [];
  const anchorY = config.anchorY;

  // Scatter: grid mode tiles the texture across the whole background; random mode places nScatter items.
  if (scatter.length > 0) {
    if (config.scatterAsGrid) {
      const tex = scatter[0];
      const tileW = tex.width * config.scatterScale;
      const tileH = tex.height * config.scatterScale;
      const cols = Math.ceil(fieldW / tileW) + 1;
      const rows = Math.ceil(fieldH / tileH) + 1;
      for (let row = 0; row < rows; row++) {
        for (let col = 0; col < cols; col++) {
          specs.push({
            x: col * tileW,
            y: row * tileH,
            texture: scatter[(row * cols + col) % scatter.length],
            scale: config.scatterScale,
            anchorX: 0,
            anchorY: 0,
            rotates: false,
          });
        }
      }
    } else {
      for (let i = 0; i < nScatter; i++) {
        for (let attempt = 0; attempt < 20; attempt++) {
          const x = SCATTER_MARGIN + rng() * (fieldW - SCATTER_MARGIN * 2);
          const y = SCATTER_MARGIN + rng() * (fieldH - SCATTER_MARGIN * 2);
          if (canPlace(x, y, specs, minSpacing)) {
            specs.push({ x, y, texture: scatter[Math.floor(rng() * scatter.length)], scale: config.scatterScale, anchorX: 0.5, anchorY, rotates: false });
            break;
          }
        }
      }
    }
  }

  // Second scatter pool (e.g. graves in Graveyard — different scale, optional margin).
  // Collision is checked only against other scatter2 items so that scatter1 tiles
  // (which can fill the whole field) don't block grave placement on small screens.
  if (scatter2.length > 0 && config.scatter2Scale && config.nScatter2) {
    const pct = config.scatter2MarginPct ?? 0;
    const mX = pct > 0 ? fieldW * pct : SCATTER_MARGIN;
    const mY = pct > 0 ? fieldH * pct : SCATTER_MARGIN;
    const placed2: DecorationSpec[] = [];
    for (let i = 0; i < config.nScatter2; i++) {
      for (let attempt = 0; attempt < 30; attempt++) {
        const x = mX + rng() * (fieldW - mX * 2);
        const y = mY + rng() * (fieldH - mY * 2);
        if (canPlace(x, y, placed2, minSpacing)) {
          const spec: DecorationSpec = { x, y, texture: scatter2[Math.floor(rng() * scatter2.length)], scale: config.scatter2Scale, anchorX: 0.5, anchorY, rotates: false };
          specs.push(spec);
          placed2.push(spec);
          break;
        }
      }
    }
  }

  if (trees.length === 0) return specs;

  const s = config.treeScale;

  // Paired trees (e.g. Graveyard): trees[0] = top half, trees[1] = bottom half.
  // Place bottom at y (anchorY=1), top directly above with its bottom touching the top of the bottom half.
  if (config.treePaired && trees.length >= 2) {
    const topTex = trees[0];
    const botTex = trees[1];
    const tryPaired = (genX: () => number, genY: () => number): void => {
      for (let attempt = 0; attempt < 20; attempt++) {
        const x = genX();
        const y = genY();
        if (canPlace(x, y, specs, minSpacing)) {
          const botH = botTex.height * s;
          specs.push({ x, y,        texture: botTex, scale: s, anchorX: 0.5, anchorY: 1, rotates: false });
          specs.push({ x, y: y - botH, texture: topTex, scale: s, anchorX: 0.5, anchorY: 1, rotates: false });
          return;
        }
      }
    };
    for (let i = 0; i < 4; i++) tryPaired(() => TREE_EDGE_MARGIN + rng() * TREE_EDGE_DEPTH,         () => 80 + rng() * (fieldH - 160));
    for (let i = 0; i < 4; i++) tryPaired(() => fieldW - TREE_EDGE_MARGIN - rng() * TREE_EDGE_DEPTH, () => 80 + rng() * (fieldH - 160));
    for (let i = 0; i < 4; i++) tryPaired(() => 80 + rng() * (fieldW - 160),                         () => TREE_TOP_MARGIN + TREE_EDGE_MARGIN + rng() * TREE_EDGE_DEPTH + 30);
    for (let i = 0; i < 4; i++) tryPaired(() => 80 + rng() * (fieldW - 160),                         () => fieldH - TREE_EDGE_MARGIN - rng() * TREE_EDGE_DEPTH);
    return specs;
  }

  const treePick = (): Texture => trees[Math.floor(rng() * trees.length)];
  const tryTree = (genX: () => number, genY: () => number): void => {
    for (let attempt = 0; attempt < 20; attempt++) {
      const x = genX();
      const y = genY();
      if (canPlace(x, y, specs, minSpacing)) {
        specs.push({ x, y, texture: treePick(), scale: s, anchorX: 0.5, anchorY, rotates: config.treesRotate });
        return;
      }
    }
  };

  // Space: scatter meteors freely across the whole field
  if (config.treesRotate) {
    for (let i = 0; i < 14; i++) {
      tryTree(() => rng() * fieldW, () => TREE_TOP_MARGIN + rng() * (fieldH - TREE_TOP_MARGIN));
    }
    return specs;
  }

  // Forest worlds: cluster trees at edges
  for (let i = 0; i < 4; i++) tryTree(() => TREE_EDGE_MARGIN + rng() * TREE_EDGE_DEPTH,         () => 80 + rng() * (fieldH - 160));
  for (let i = 0; i < 4; i++) tryTree(() => fieldW - TREE_EDGE_MARGIN - rng() * TREE_EDGE_DEPTH, () => 80 + rng() * (fieldH - 160));
  for (let i = 0; i < 4; i++) tryTree(() => 80 + rng() * (fieldW - 160),                         () => TREE_TOP_MARGIN + TREE_EDGE_MARGIN + rng() * TREE_EDGE_DEPTH);
  for (let i = 0; i < 4; i++) tryTree(() => 80 + rng() * (fieldW - 160),                         () => fieldH - TREE_EDGE_MARGIN - rng() * TREE_EDGE_DEPTH);

  return specs;
}

// Exported so FieldStage can check whether decorations in this world rotate.
export function worldDecorationsRotate(world: WorldId): boolean {
  return WORLD_CONFIGS[world]?.treesRotate ?? false;
}
