import { Assets, Spritesheet, Texture } from "pixi.js";
import { useEffect, useState } from "react";

import douxJsonUrl from "@/assets/worlds/forest/creatures/DinoSprites_doux.json?url";
import douxPngUrl from "@/assets/worlds/forest/creatures/DinoSprites_doux.png";
import mortJsonUrl from "@/assets/worlds/forest/creatures/DinoSprites_mort.json?url";
import mortPngUrl from "@/assets/worlds/forest/creatures/DinoSprites_mort.png";
import tardJsonUrl from "@/assets/worlds/forest/creatures/DinoSprites_tard.json?url";
import tardPngUrl from "@/assets/worlds/forest/creatures/DinoSprites_tard.png";
import vitaJsonUrl from "@/assets/worlds/forest/creatures/DinoSprites_vita.json?url";
import vitaPngUrl from "@/assets/worlds/forest/creatures/DinoSprites_vita.png";

export type DinoAnim = "idle" | "move" | "kick" | "hurt" | "crouch" | "sneak";

export interface DinoSpritesheet {
  textures: Record<DinoAnim, Texture[]>;
  frameW: number;
  frameH: number;
}

const VARIANTS = [
  { jsonUrl: vitaJsonUrl, pngUrl: vitaPngUrl },
  { jsonUrl: douxJsonUrl, pngUrl: douxPngUrl },
  { jsonUrl: mortJsonUrl, pngUrl: mortPngUrl },
  { jsonUrl: tardJsonUrl, pngUrl: tardPngUrl },
] as const;

// Pick a variant deterministically from a poring id.
export function dinoVariantIndex(id: number): number {
  return id % VARIANTS.length;
}

const sheetCaches = new Array<Promise<DinoSpritesheet> | null>(VARIANTS.length).fill(null);

async function loadVariant(index: number): Promise<DinoSpritesheet> {
  const { jsonUrl, pngUrl } = VARIANTS[index];
  const [json, baseTexture] = await Promise.all([
    fetch(jsonUrl).then((r) => r.json() as Promise<Record<string, unknown>>),
    Assets.load<Texture>(pngUrl),
  ]);
  baseTexture.source.scaleMode = "nearest";
  const sheet = new Spritesheet(baseTexture, json);
  await sheet.parse();
  const textures = sheet.animations as unknown as Record<DinoAnim, Texture[]>;
  const meta = json.meta as { size: { h: number } };
  return { textures, frameW: meta.size.h, frameH: meta.size.h };
}

export function useDinoSpritesheets(): (DinoSpritesheet | null)[] {
  const [sheets, setSheets] = useState<(DinoSpritesheet | null)[]>(
    () => new Array<DinoSpritesheet | null>(VARIANTS.length).fill(null),
  );

  useEffect(() => {
    let cancelled = false;
    VARIANTS.forEach((_, i) => {
      if (!sheetCaches[i]) sheetCaches[i] = loadVariant(i);
      void sheetCaches[i]!
        .then((s) => {
          if (!cancelled)
            setSheets((prev) => {
              const next = [...prev];
              next[i] = s;
              return next;
            });
        })
        .catch((err: unknown) => {
          // eslint-disable-next-line no-console
          console.error(`[useDinoSpritesheets] variant ${i} failed:`, err);
          sheetCaches[i] = null;
        });
    });
    return () => {
      cancelled = true;
    };
  }, []);

  return sheets;
}
