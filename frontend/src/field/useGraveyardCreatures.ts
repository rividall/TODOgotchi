import { Assets } from "pixi.js";
import type { Texture } from "pixi.js";
import { useEffect, useState } from "react";

import type { DinoSpritesheet } from "@/field/useDinoSpritesheet";

// ─── Static frame URL maps (Vite resolves globs at build time) ───────────────

const DEATH_IDLE = import.meta.glob<{ default: string }>("../assets/worlds/graveyard/creatures/death/character-idle-*.png",   { eager: true });
const DEATH_RUN  = import.meta.glob<{ default: string }>("../assets/worlds/graveyard/creatures/death/character-run-*.png",    { eager: true });
const DEATH_FALL = import.meta.glob<{ default: string }>("../assets/worlds/graveyard/creatures/death/character-fall-*.png",   { eager: true });
const DEATH_JUMP = import.meta.glob<{ default: string }>("../assets/worlds/graveyard/creatures/death/character-jump-*.png",   { eager: true });

const DEVIL_IDLE = import.meta.glob<{ default: string }>("../assets/worlds/graveyard/creatures/devil/character-idle-*.png",   { eager: true });
const DEVIL_RUN  = import.meta.glob<{ default: string }>("../assets/worlds/graveyard/creatures/devil/character-run-*.png",    { eager: true });
const DEVIL_FALL = import.meta.glob<{ default: string }>("../assets/worlds/graveyard/creatures/devil/character-fall-*.png",   { eager: true });
const DEVIL_JUMP = import.meta.glob<{ default: string }>("../assets/worlds/graveyard/creatures/devil/character-jump-*.png",   { eager: true });

const PUMPKIN_IDLE = import.meta.glob<{ default: string }>("../assets/worlds/graveyard/creatures/pumpkin/character-idle-*.png", { eager: true });
const PUMPKIN_RUN  = import.meta.glob<{ default: string }>("../assets/worlds/graveyard/creatures/pumpkin/character-run-*.png",  { eager: true });
const PUMPKIN_FALL = import.meta.glob<{ default: string }>("../assets/worlds/graveyard/creatures/pumpkin/character-fall-*.png", { eager: true });
const PUMPKIN_JUMP = import.meta.glob<{ default: string }>("../assets/worlds/graveyard/creatures/pumpkin/character-jump-*.png", { eager: true });

const SKEL_IDLE = import.meta.glob<{ default: string }>("../assets/worlds/graveyard/creatures/skel/character-idle-*.png",     { eager: true });
const SKEL_RUN  = import.meta.glob<{ default: string }>("../assets/worlds/graveyard/creatures/skel/character-run-*.png",      { eager: true });
const SKEL_FALL = import.meta.glob<{ default: string }>("../assets/worlds/graveyard/creatures/skel/character-fall-*.png",     { eager: true });
const SKEL_JUMP = import.meta.glob<{ default: string }>("../assets/worlds/graveyard/creatures/skel/character-jump-*.png",     { eager: true });

const ZOMBIE_IDLE = import.meta.glob<{ default: string }>("../assets/worlds/graveyard/creatures/zombie/character-idle-*.png",  { eager: true });
const ZOMBIE_RUN  = import.meta.glob<{ default: string }>("../assets/worlds/graveyard/creatures/zombie/character-run-*.png",   { eager: true });
const ZOMBIE_FALL = import.meta.glob<{ default: string }>("../assets/worlds/graveyard/creatures/zombie/character-fall-*.png",  { eager: true });
const ZOMBIE_JUMP = import.meta.glob<{ default: string }>("../assets/worlds/graveyard/creatures/zombie/character-jump-*.png",  { eager: true });

// Sort glob results by path so frames come out in numeric order (0, 1, 2, 3…).
function sortedUrls(obj: Record<string, { default: string }>): string[] {
  return Object.keys(obj).sort().map((k) => obj[k].default);
}

const VARIANTS = [
  { idle: sortedUrls(DEATH_IDLE),   run: sortedUrls(DEATH_RUN),   fall: sortedUrls(DEATH_FALL),   jump: sortedUrls(DEATH_JUMP)   },
  { idle: sortedUrls(DEVIL_IDLE),   run: sortedUrls(DEVIL_RUN),   fall: sortedUrls(DEVIL_FALL),   jump: sortedUrls(DEVIL_JUMP)   },
  { idle: sortedUrls(PUMPKIN_IDLE), run: sortedUrls(PUMPKIN_RUN), fall: sortedUrls(PUMPKIN_FALL), jump: sortedUrls(PUMPKIN_JUMP) },
  { idle: sortedUrls(SKEL_IDLE),    run: sortedUrls(SKEL_RUN),    fall: sortedUrls(SKEL_FALL),    jump: sortedUrls(SKEL_JUMP)    },
  { idle: sortedUrls(ZOMBIE_IDLE),  run: sortedUrls(ZOMBIE_RUN),  fall: sortedUrls(ZOMBIE_FALL),  jump: sortedUrls(ZOMBIE_JUMP)  },
] as const;

// ─── Loader ──────────────────────────────────────────────────────────────────

async function loadVariant(v: (typeof VARIANTS)[number]): Promise<DinoSpritesheet> {
  const load = (url: string) => Assets.load<Texture>(url);
  const [idle, run, fall, jump] = await Promise.all([
    Promise.all(v.idle.map(load)),
    Promise.all(v.run.map(load)),
    Promise.all(v.fall.map(load)),
    Promise.all(v.jump.map(load)),
  ]);
  const fallback = idle.length ? idle : [];
  return {
    textures: {
      idle,
      move:   run.length  ? run  : fallback,
      sneak:  run.length  ? run  : fallback,
      kick:   jump.length ? jump : fallback,
      hurt:   fall.length ? fall : fallback,
      crouch: fall.length ? fall : fallback,
    },
    frameW: idle[0]?.width  ?? 32,
    frameH: idle[0]?.height ?? 32,
  };
}

const sheetCache = new Array<Promise<DinoSpritesheet> | null>(VARIANTS.length).fill(null);

export function useGraveyardCreatures(): (DinoSpritesheet | null)[] {
  const [sheets, setSheets] = useState<(DinoSpritesheet | null)[]>(
    () => new Array<DinoSpritesheet | null>(VARIANTS.length).fill(null),
  );

  useEffect(() => {
    let cancelled = false;
    VARIANTS.forEach((v, i) => {
      if (!sheetCache[i]) sheetCache[i] = loadVariant(v);
      void sheetCache[i]!
        .then((s) => {
          if (!cancelled)
            setSheets((prev) => {
              const next = [...prev];
              next[i] = s;
              return next;
            });
        })
        .catch((err: unknown) => {
          console.error(`[useGraveyardCreatures] variant ${i} failed:`, err);
          sheetCache[i] = null;
        });
    });
    return () => { cancelled = true; };
  }, []);

  return sheets;
}

export const GRAVEYARD_VARIANT_COUNT = VARIANTS.length; // 5
