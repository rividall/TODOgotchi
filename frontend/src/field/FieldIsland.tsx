/**
 * Isometric island — renders a flat organic island shape made of Kenney nature-kit
 * ground tiles. No elevation, so depth-sorting is trivial: render row by row,
 * back to front (row 0 first, last row last).
 *
 * Measured from the actual PNGs:
 *   • All ground_* tiles: 512×512 image, 129×64 diamond at y=283 (centre-x=256)
 *   • STEP_X = 64  (half diamond width  = 128/2)
 *   • STEP_Y = 32  (half diamond height =  64/2)
 *   • anchor = (0.5, 283/512 ≈ 0.553)  ← top-vertex of diamond
 *
 * Scale is computed so the island fills ~92% of the field. Using an 11×11 grid
 * gives ~92px diamonds, which are clearly visible.
 */
import { Assets } from "pixi.js";
import type { Texture } from "pixi.js";
import { useEffect, useState } from "react";

// ---------------------------------------------------------------------------
// Island grid — 1 = ground tile, 0 = empty
// ---------------------------------------------------------------------------
export const ISLAND_COLS = 11;
export const ISLAND_ROWS = 11;

// prettier-ignore
export const ISLAND_GRID: readonly (0 | 1)[][] = [
  [0, 0, 0, 0, 1, 1, 1, 0, 0, 0, 0],
  [0, 0, 1, 1, 1, 1, 1, 1, 1, 0, 0],
  [0, 1, 1, 1, 1, 1, 1, 1, 1, 1, 0],
  [0, 1, 1, 1, 1, 1, 1, 1, 1, 1, 0],
  [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1],
  [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1],
  [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1],
  [0, 1, 1, 1, 1, 1, 1, 1, 1, 1, 0],
  [0, 1, 1, 1, 1, 1, 1, 1, 1, 1, 0],
  [0, 0, 1, 1, 1, 1, 1, 1, 1, 0, 0],
  [0, 0, 0, 0, 1, 1, 1, 0, 0, 0, 0],
];

// ---------------------------------------------------------------------------
// Tile assets
// ---------------------------------------------------------------------------
const GROUND_URLS = import.meta.glob<{ default: string }>(
  "../assets/worlds/forest/ground/ground_grass_*.png",
  { eager: true },
);

function getUrl(obj: Record<string, { default: string }>, suffix: string): string {
  const key = Object.keys(obj).find((k) => k.includes(`/${suffix}.png`));
  if (!key) throw new Error(`Tile not found: ${suffix}`);
  return obj[key].default;
}

// ---------------------------------------------------------------------------
// Loader
// ---------------------------------------------------------------------------
export interface IslandTextures {
  grass: Texture;
}

async function loadIslandTextures(): Promise<IslandTextures> {
  const grass = await Assets.load<Texture>(getUrl(GROUND_URLS, "ground_grass_NE"));
  return { grass };
}

export function useIslandTextures(): IslandTextures | null {
  const [textures, setTextures] = useState<IslandTextures | null>(null);
  useEffect(() => {
    void loadIslandTextures().then(setTextures);
  }, []);
  return textures;
}

// ---------------------------------------------------------------------------
// Isometric coordinate helpers
// ---------------------------------------------------------------------------
//
// Kenney 512×512 ground tile: diamond is 128×64px at y=283 in the image.
//   anchor (0.5, 0.553) places the diamond's TOP VERTEX at the grid position.
//   column step: (+64, +32)   row step: (−64, +32)
//
export const NATIVE_IMAGE_SIZE = 512;
export const NATIVE_DIAMOND_W = 128;
export const NATIVE_DIAMOND_H = 64;
export const DIAMOND_TOP_Y = 283; // pixel row in 512px image where diamond top vertex sits

export const STEP_X = NATIVE_DIAMOND_W / 2; // 64
export const STEP_Y = NATIVE_DIAMOND_H / 2; // 32

export const ISO_ANCHOR_X = 0.5;
export const ISO_ANCHOR_Y = DIAMOND_TOP_Y / NATIVE_IMAGE_SIZE; // ≈ 0.553

export function isoToScreen(
  col: number,
  row: number,
  scale: number,
): { x: number; y: number } {
  return {
    x: (col - row) * STEP_X * scale,
    y: (col + row) * STEP_Y * scale,
  };
}

export function islandBounds(scale: number): {
  minX: number; maxX: number; minY: number; maxY: number;
} {
  let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
  for (let row = 0; row < ISLAND_ROWS; row++) {
    for (let col = 0; col < ISLAND_COLS; col++) {
      if (!ISLAND_GRID[row][col]) continue;
      const { x, y } = isoToScreen(col, row, scale);
      if (x < minX) minX = x;
      if (x > maxX) maxX = x;
      if (y < minY) minY = y;
      if (y > maxY) maxY = y;
    }
  }
  return { minX, maxX, minY, maxY };
}

export function tileScale(fieldW: number, fieldH: number): number {
  const bounds = islandBounds(1);
  // Add one tile's width/height so the last column/row is fully visible
  const nativeW = bounds.maxX - bounds.minX + NATIVE_DIAMOND_W;
  const nativeH = bounds.maxY - bounds.minY + NATIVE_DIAMOND_H;
  const scaleX = (fieldW * 0.92) / nativeW;
  const scaleY = (fieldH * 0.92) / nativeH;
  return Math.min(scaleX, scaleY);
}
