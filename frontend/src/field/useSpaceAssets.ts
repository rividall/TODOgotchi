import { Assets } from "pixi.js";
import type { Texture } from "pixi.js";
import { useEffect, useState } from "react";

import ship1 from "@/assets/worlds/space/creatures/ship1_blue.png";
import ship2 from "@/assets/worlds/space/creatures/ship2_orange.png";
import ship3 from "@/assets/worlds/space/creatures/ship3_orange.png";
import ship4 from "@/assets/worlds/space/creatures/ship4_red.png";

const SHIP_URLS = [ship1, ship2, ship3, ship4] as const;

let shipCache: Promise<Texture[]> | null = null;

function loadShips(): Promise<Texture[]> {
  return Promise.all(SHIP_URLS.map((url) => Assets.load<Texture>(url)));
}

export function useSpaceShipTextures(): Texture[] | null {
  const [textures, setTextures] = useState<Texture[] | null>(null);

  useEffect(() => {
    let cancelled = false;
    if (!shipCache) shipCache = loadShips();
    void shipCache.then((t) => {
      if (!cancelled) setTextures(t);
    });
    return () => { cancelled = true; };
  }, []);

  return textures;
}
