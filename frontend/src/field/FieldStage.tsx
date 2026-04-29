import { Application, useTick } from "@pixi/react";
import gsap from "gsap";
import Matter from "matter-js";
import type {
  AnimatedSprite as PixiAnimatedSprite,
  Container as PixiContainer,
  Graphics as PixiGraphics,
  Texture,
} from "pixi.js";
import { useCallback, useEffect, useRef, useState } from "react";

import { Sprite } from "pixi.js";

import type { GrowthTier, Poring } from "@/api/porings";
import "@/field/pixiExtend";
import {
  generateDecorations,
  useDecorationTextures,
} from "@/field/FieldDecorations";
import type { DecorationTextures, WorldId } from "@/field/FieldDecorations";
import { poringColor } from "@/field/poringColor";
import type { DinoAnim, DinoSpritesheet } from "@/field/useDinoSpritesheet";
import { useDinoSpritesheets } from "@/field/useDinoSpritesheet";
import { useGraveyardCreatures } from "@/field/useGraveyardCreatures";
import { useSpaceShipTextures } from "@/field/useSpaceAssets";
import type { FieldBody } from "@/field/useFieldEngine";
import { FIELD_IDLE_FRICTION_AIR, FIELD_TOP_MARGIN } from "@/field/useFieldEngine";
import { useTimeOfDay } from "@/field/useTimeOfDay";

const TIER_ORDER: Record<GrowthTier, number> = { seed: 0, happy: 1, chubby: 2, ripe: 3 };

const TIER_SPRITE_SCALE: Record<GrowthTier, number> = {
  seed: 2,
  happy: 2.5,
  chubby: 3,
  ripe: 3.5,
};

const ANIM_SPEED: Record<DinoAnim, number> = {
  idle: 0.06,
  crouch: 0.04,
  sneak: 0.13,
  move: 0.15,
  kick: 0.22,
  hurt: 0.15,
};

// Behavior cadence (ms)
const CROUCH_DURATION = 2000;
const CROUCH_INTERVAL = [5000, 7000] as const;
const SNEAK_DURATION = 5000;
const SNEAK_INTERVAL = [7000, 9000] as const;
const SNEAK_FRICTION_AIR = 0.005;
const SNEAK_SPEED = 1.8;

const CARESS_RUN_DURATION = 3000;
const CARESS_RUN_SPEED = 3.6;

interface DinoBehavior {
  action: DinoAnim;
  actionEndsAt: number;
  nextCrouchAt: number;
  nextSneakAt: number;
  facing: 1 | -1;
}

function rand(min: number, max: number): number {
  return min + Math.random() * (max - min);
}

function newBehavior(now: number): DinoBehavior {
  return {
    action: "idle",
    actionEndsAt: 0,
    nextCrouchAt: now + rand(CROUCH_INTERVAL[0], CROUCH_INTERVAL[1]),
    nextSneakAt: now + rand(SNEAK_INTERVAL[0], SNEAK_INTERVAL[1]),
    facing: 1,
  };
}

export interface CaressSignal {
  id: number;
  nonce: number;
}

interface Props {
  porings: Poring[];
  bodiesRef: React.RefObject<Map<number, FieldBody>>;
  engineRef: React.RefObject<import("matter-js").Engine | null>;
  caressSignal: CaressSignal | null;
  expandedId: number | null;
  world: WorldId;
  onResize: (w: number, h: number) => void;
  onPoringClick: (id: number) => void;
  onBackgroundClick: () => void;
}

const SHADOW_COLOR = 0x000000;

interface SceneProps {
  porings: Poring[];
  bodiesRef: React.RefObject<Map<number, FieldBody>>;
  boundsRef: React.RefObject<{ w: number; h: number }>;
  caressSignal: CaressSignal | null;
  expandedId: number | null;
  onPoringClick: (id: number) => void;
  sheets: (DinoSpritesheet | null)[];       // dino (forest worlds)
  graveyardSheets: (DinoSpritesheet | null)[]; // graveyard world
  shipTextures: Texture[] | null;
  decorTextures: DecorationTextures | null;
  fieldDims: { w: number; h: number };
  liftSignal: { id: number; lifted: boolean; nonce: number } | null;
  world: WorldId;
}

function Scene({
  porings,
  bodiesRef,
  boundsRef,
  caressSignal,
  expandedId,
  onPoringClick,
  sheets,
  graveyardSheets,
  shipTextures,
  decorTextures,
  fieldDims,
  liftSignal,
  world,
}: SceneProps): React.ReactElement {
  // Pick the right creature sheets for the active world. Variant index is
  // always id % activeSheets.length so count is never hardcoded.
  const activeSheets = world === "Graveyard" ? graveyardSheets : sheets;
  const decorContainerRef = useRef<PixiContainer | null>(null);
  // Rotation speed (rad/frame) per decoration child — non-zero only for rotating worlds.
  const decorRotationsRef = useRef<number[]>([]);
  const isSpace = world === "Space";
  const isGraveyard = world === "Graveyard";
  // Graveyard sprites fill their frame lower than dinos, so offset them upward
  // so the shadow ellipse falls at the character's feet rather than behind the body.
  const creatureYOffset = isGraveyard ? -20 : 0;

  useEffect(() => {
    const c = decorContainerRef.current;
    if (!c || !decorTextures || fieldDims.w === 0) return;
    c.removeChildren();
    decorRotationsRef.current = [];
    const specs = generateDecorations(fieldDims.w, fieldDims.h, decorTextures);
    for (const s of specs) {
      const sprite = new Sprite(s.texture);
      sprite.anchor.set(s.anchorX, s.anchorY);
      sprite.scale.set(s.scale);
      sprite.x = s.x;
      sprite.y = s.y;
      sprite.eventMode = "none";
      c.addChild(sprite);
      // Non-zero speed only for decoration tiles marked as rotating (e.g. asteroids).
      decorRotationsRef.current.push(
        s.rotates ? (Math.random() * 0.007 + 0.002) * (Math.random() > 0.5 ? 1 : -1) : 0,
      );
    }
  }, [decorTextures, fieldDims, world]);

  const containerRefs = useRef<Map<number, PixiContainer>>(new Map());
  const liftYRefs = useRef<Map<number, { y: number }>>(new Map());
  const ripeGlowRefs = useRef<Map<number, PixiGraphics>>(new Map());
  const spriteRefs = useRef<Map<number, PixiAnimatedSprite>>(new Map());
  const shipRefs = useRef<Map<number, Sprite>>(new Map());
  const behaviorRef = useRef<Map<number, DinoBehavior>>(new Map());
  const glowPhaseRef = useRef(0);
  const prevTiersRef = useRef<Map<number, GrowthTier>>(new Map());
  const seenIdsRef = useRef<Set<number>>(new Set());

  const playAnim = useCallback(
    (id: number, anim: DinoAnim, opts: { loop?: boolean; onComplete?: () => void } = {}): void => {
      const sprite = spriteRefs.current.get(id);
      const sheet = activeSheets[id % activeSheets.length];
      if (!sprite || !sheet) return;
      sprite.textures = sheet.textures[anim];
      sprite.animationSpeed = ANIM_SPEED[anim];
      sprite.loop = opts.loop ?? true;
      sprite.onComplete = opts.onComplete;
      sprite.gotoAndPlay(0);
    },
    [activeSheets],
  );

  useTick(() => {
    glowPhaseRef.current += 0.05;
    const now = performance.now();

    // Rotate asteroid / meteor decorations each frame.
    const decorC = decorContainerRef.current;
    if (decorC && decorRotationsRef.current.length > 0) {
      for (let i = 0; i < decorC.children.length; i++) {
        const speed = decorRotationsRef.current[i];
        if (speed) decorC.children[i].rotation += speed;
      }
    }

    for (const [id, c] of containerRefs.current) {
      const fb = bodiesRef.current.get(id);
      if (!fb) continue;

      c.x = fb.body.position.x;
      c.y = fb.body.position.y;

      const sprite = spriteRefs.current.get(id);
      if (sprite) sprite.y = (liftYRefs.current.get(id)?.y ?? 0) + creatureYOffset;

      let state = behaviorRef.current.get(id);
      if (!state) {
        state = newBehavior(now);
        behaviorRef.current.set(id, state);
      }

      // Boundary reflection for moving creatures.
      if (state.action === "sneak" || state.action === "move") {
        const { w, h } = boundsRef.current;
        const r = fb.radius;
        const pos = fb.body.position;
        const vel = fb.body.velocity;
        let vx = vel.x;
        let vy = vel.y;
        let hit = false;
        if (pos.x - r <= 0 && vx < 0) { vx = Math.abs(vx); hit = true; }
        if (pos.x + r >= w && vx > 0) { vx = -Math.abs(vx); hit = true; }
        if (pos.y - r <= FIELD_TOP_MARGIN && vy < 0) { vy = Math.abs(vy); hit = true; }
        if (pos.y + r >= h && vy > 0) { vy = -Math.abs(vy); hit = true; }
        if (hit) Matter.Body.setVelocity(fb.body, { x: vx, y: vy });
      }

      const tabOpen = expandedId === id;
      if (tabOpen && (state.action === "sneak" || state.action === "move")) {
        fb.body.frictionAir = FIELD_IDLE_FRICTION_AIR;
        Matter.Body.setVelocity(fb.body, { x: 0, y: 0 });
        state.action = "idle";
        if (!isSpace) playAnim(id, "idle");
      }

      if (state.action !== "idle" && now >= state.actionEndsAt) {
        if (state.action === "sneak" || state.action === "move") {
          fb.body.frictionAir = FIELD_IDLE_FRICTION_AIR;
        }
        state.action = "idle";
        if (!isSpace) playAnim(id, "idle");
      }

      if (state.action === "idle") {
        if (!tabOpen && now >= state.nextSneakAt) {
          const angle = rand(0, Math.PI * 2);
          const vx = Math.cos(angle) * SNEAK_SPEED;
          const vy = Math.sin(angle) * SNEAK_SPEED;
          fb.body.frictionAir = SNEAK_FRICTION_AIR;
          Matter.Body.setVelocity(fb.body, { x: vx, y: vy });
          state.action = "sneak";
          state.actionEndsAt = now + SNEAK_DURATION;
          state.nextSneakAt = now + SNEAK_DURATION + rand(SNEAK_INTERVAL[0], SNEAK_INTERVAL[1]);
          if (!isSpace) playAnim(id, "sneak");
        } else if (!isSpace && now >= state.nextCrouchAt) {
          state.action = "crouch";
          state.actionEndsAt = now + CROUCH_DURATION;
          state.nextCrouchAt = now + CROUCH_DURATION + rand(CROUCH_INTERVAL[0], CROUCH_INTERVAL[1]);
          playAnim(id, "crouch", { loop: false });
        }
      }

      // Space: rotate ship to face velocity. Others: mirror sprite horizontally.
      if (isSpace) {
        const { x: vx, y: vy } = fb.body.velocity;
        if (vx * vx + vy * vy > 0.04) {
          const ship = shipRefs.current.get(id);
          // Sprite faces up (−Y); atan2(vx, −vy) maps velocity → rotation correctly.
          if (ship) ship.rotation = Math.atan2(vx, -vy);
        }
      } else {
        const vx = fb.body.velocity.x;
        if (Math.abs(vx) > 0.15) {
          const facing: 1 | -1 = vx < 0 ? -1 : 1;
          if (facing !== state.facing) {
            state.facing = facing;
            const s = spriteRefs.current.get(id);
            if (s) s.scale.x = TIER_SPRITE_SCALE[fb.tier] * facing;
          }
        }
      }
    }

    const ripeScale = 1 + Math.sin(glowPhaseRef.current) * 0.08;
    for (const g of ripeGlowRefs.current.values()) g.scale.set(ripeScale);

    for (const id of [...behaviorRef.current.keys()]) {
      if (!bodiesRef.current.has(id)) behaviorRef.current.delete(id);
    }
  });

  useEffect(() => {
    for (const p of porings) {
      const c = containerRefs.current.get(p.id);
      if (!c) continue;
      const prevTier = prevTiersRef.current.get(p.id);
      if (!seenIdsRef.current.has(p.id)) {
        c.scale.set(0);
        gsap.to(c.scale, { x: 1, y: 1, duration: 0.45, ease: "back.out(2.2)" });
        seenIdsRef.current.add(p.id);
      } else if (prevTier && TIER_ORDER[p.growth_tier] > TIER_ORDER[prevTier]) {
        gsap
          .timeline()
          .to(c.scale, { x: 1.35, y: 1.35, duration: 0.18, ease: "power2.out" })
          .to(c.scale, { x: 1, y: 1, duration: 0.55, ease: "elastic.out(1, 0.45)" });
        if (!isSpace) {
          playAnim(p.id, "kick", {
            loop: false,
            onComplete: () => {
              const state = behaviorRef.current.get(p.id);
              playAnim(p.id, state?.action ?? "idle");
            },
          });
        }
      }
      prevTiersRef.current.set(p.id, p.growth_tier);
    }
    const alive = new Set(porings.map((p) => p.id));
    for (const id of [...seenIdsRef.current]) {
      if (!alive.has(id)) seenIdsRef.current.delete(id);
    }
  }, [porings, playAnim, isSpace]);

  useEffect(() => {
    if (!liftSignal) return;
    let liftY = liftYRefs.current.get(liftSignal.id);
    if (!liftY) {
      liftY = { y: 0 };
      liftYRefs.current.set(liftSignal.id, liftY);
    }
    if (liftSignal.lifted) {
      gsap.to(liftY, { y: -24, duration: 0.12, ease: "power2.out" });
    } else {
      gsap.to(liftY, { y: 0, duration: 0.22, ease: "power2.out" });
    }
  }, [liftSignal]);

  useEffect(() => {
    if (!caressSignal) return;
    const c = containerRefs.current.get(caressSignal.id);
    if (c) {
      gsap
        .timeline()
        .to(c.scale, { x: 1.3, y: 1.3, duration: 0.12, ease: "power2.out" })
        .to(c.scale, { x: 0.95, y: 1.05, duration: 0.15, ease: "power2.inOut" })
        .to(c.scale, { x: 1, y: 1, duration: 0.5, ease: "elastic.out(1, 0.5)" });
    }
    const fb = bodiesRef.current.get(caressSignal.id);
    if (!fb) return;
    const now = performance.now();
    let state = behaviorRef.current.get(caressSignal.id);
    if (!state) {
      state = newBehavior(now);
      behaviorRef.current.set(caressSignal.id, state);
    }
    const angle = rand(0, Math.PI * 2);
    fb.body.frictionAir = SNEAK_FRICTION_AIR;
    Matter.Body.setVelocity(fb.body, {
      x: Math.cos(angle) * CARESS_RUN_SPEED,
      y: Math.sin(angle) * CARESS_RUN_SPEED,
    });
    state.action = "move";
    state.actionEndsAt = now + CARESS_RUN_DURATION;
    if (!isSpace) playAnim(caressSignal.id, "move");
  }, [caressSignal, playAnim, bodiesRef, isSpace]);

  return (
    <>
      <pixiContainer ref={(c) => { decorContainerRef.current = c; }} />
      {porings.map((p) => {
        const radius = bodiesRef.current.get(p.id)?.radius ?? 30;
        const tier = p.growth_tier;
        const completed = p.status === "completed";
        const colors = poringColor(p.id, completed);
        const spriteScale = TIER_SPRITE_SCALE[tier];
        const sheet = activeSheets[p.id % activeSheets.length];

        return (
          <pixiContainer
            key={p.id}
            ref={(c) => {
              if (c) containerRefs.current.set(p.id, c);
              else containerRefs.current.delete(p.id);
            }}
            eventMode={completed ? "auto" : "static"}
            cursor={completed ? "default" : "pointer"}
            onPointerTap={() => onPoringClick(p.id)}
            alpha={completed ? 0.55 : 1}
          >
            {!isSpace && (
              <pixiGraphics
                y={radius * 0.95 - 10}
                alpha={0.35}
                draw={(g) => {
                  g.clear();
                  g.ellipse(0, 0, radius * 0.5, radius * 0.2).fill(SHADOW_COLOR);
                }}
              />
            )}
            {tier === "ripe" && !completed && (
              <pixiGraphics
                ref={(g) => {
                  if (g) ripeGlowRefs.current.set(p.id, g);
                  else ripeGlowRefs.current.delete(p.id);
                }}
                alpha={0.55}
                draw={(g) => {
                  g.clear();
                  g.circle(0, 0, radius + 14).fill(colors.ripeGlow);
                }}
              />
            )}

            {/* Space world: static ship sprite that rotates to face velocity */}
            {isSpace && shipTextures ? (
              <pixiSprite
                ref={(s: Sprite | null) => {
                  if (s) {
                    shipRefs.current.set(p.id, s);
                    if (!liftYRefs.current.has(p.id)) liftYRefs.current.set(p.id, { y: 0 });
                  } else {
                    shipRefs.current.delete(p.id);
                    liftYRefs.current.delete(p.id);
                  }
                }}
                texture={shipTextures[p.id % 4]}
                anchor={0.5}
                scale={spriteScale * 0.25}
                tint={completed ? 0x94a3b8 : 0xffffff}
              />
            ) : sheet ? (
              /* Forest worlds: animated dino sprite */
              <pixiAnimatedSprite
                ref={(s) => {
                  if (s) {
                    spriteRefs.current.set(p.id, s);
                    if (!liftYRefs.current.has(p.id)) liftYRefs.current.set(p.id, { y: 0 });
                    s.textures = sheet.textures.idle;
                    s.animationSpeed = ANIM_SPEED.idle;
                    s.loop = true;
                    s.gotoAndPlay(Math.floor(Math.random() * s.textures.length));
                  } else {
                    spriteRefs.current.delete(p.id);
                    liftYRefs.current.delete(p.id);
                  }
                }}
                textures={sheet.textures.idle}
                animationSpeed={ANIM_SPEED.idle}
                loop
                autoPlay
                anchor={0.5}
                scale={spriteScale}
                tint={completed ? 0x94a3b8 : 0xffffff}
              />
            ) : null}
          </pixiContainer>
        );
      })}
    </>
  );
}

export function FieldStage({
  porings,
  bodiesRef,
  engineRef,
  caressSignal,
  expandedId,
  world,
  onResize,
  onPoringClick,
  onBackgroundClick,
}: Props): React.ReactElement {
  const wrapRef = useRef<HTMLDivElement>(null);
  const boundsRef = useRef<{ w: number; h: number }>({ w: 0, h: 0 });
  const [fieldDims, setFieldDims] = useState<{ w: number; h: number }>({ w: 0, h: 0 });
  const timeOfDay = useTimeOfDay();
  const sheets = useDinoSpritesheets();
  const graveyardSheets = useGraveyardCreatures();
  const shipTextures = useSpaceShipTextures();
  const decorTextures = useDecorationTextures(world);

  const isDraggingRef = useRef(false);
  const draggedBodyIdRef = useRef<number | null>(null);
  const [liftSignal, setLiftSignal] = useState<{ id: number; lifted: boolean; nonce: number } | null>(null);

  const guardedPoringClick = useCallback(
    (id: number) => {
      if (!isDraggingRef.current) onPoringClick(id);
    },
    [onPoringClick],
  );

  useEffect(() => {
    const el = wrapRef.current;
    if (!el) return;
    const measure = (): void => {
      const w = el.clientWidth;
      const h = el.clientHeight;
      if (w && h) {
        boundsRef.current = { w, h };
        setFieldDims({ w, h });
        onResize(w, h);
      }
    };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, [onResize]);

  useEffect(() => {
    const el = wrapRef.current;
    const engine = engineRef.current;
    if (!el || !engine) return;
    const mouse = Matter.Mouse.create(el);
    // @ts-expect-error — internal Matter.Mouse field; a no-op avoids passive-listener warnings.
    mouse.mousewheel = (): void => {};
    const mc = Matter.MouseConstraint.create(engine, {
      mouse,
      constraint: { stiffness: 0.22, damping: 0.08, render: { visible: false } },
    });
    Matter.Composite.add(engine.world, mc);

    const onStart = (e: unknown): void => {
      isDraggingRef.current = true;
      const body = (e as { body?: Matter.Body }).body;
      if (body?.label?.startsWith("poring-")) {
        const id = parseInt(body.label.replace("poring-", ""), 10);
        draggedBodyIdRef.current = id;
        setLiftSignal({ id, lifted: true, nonce: performance.now() });
      }
    };
    const onEnd = (e: unknown): void => {
      const body = (e as { body?: Matter.Body }).body;
      if (body) {
        const v = body.velocity;
        Matter.Body.setVelocity(body, { x: v.x * 0.12, y: v.y * 0.12 });
        if (body.label?.startsWith("poring-")) {
          const id = parseInt(body.label.replace("poring-", ""), 10);
          setLiftSignal({ id, lifted: false, nonce: performance.now() });
        }
      }
      draggedBodyIdRef.current = null;
      setTimeout(() => { isDraggingRef.current = false; }, 0);
    };
    Matter.Events.on(mc, "startdrag", onStart as () => void);
    Matter.Events.on(mc, "enddrag", onEnd as () => void);

    return () => {
      Matter.Events.off(mc, "startdrag", onStart as () => void);
      Matter.Events.off(mc, "enddrag", onEnd as () => void);
      Matter.Composite.remove(engine.world, mc);
    };
  }, [engineRef, isDraggingRef]);

  const handleApplicationInit = useCallback(() => {}, []);

  return (
    <div
      ref={wrapRef}
      className={`field-stage field-stage-${timeOfDay} field-stage-world-${world}`}
      onDragStart={(e) => e.preventDefault()}
      onClick={(e) => {
        if (e.target === e.currentTarget || (e.target as HTMLElement).tagName === "CANVAS") {
          onBackgroundClick();
        }
      }}
    >
      <Application
        resizeTo={wrapRef}
        backgroundAlpha={0}
        antialias
        autoDensity
        resolution={window.devicePixelRatio || 1}
        onInit={handleApplicationInit}
      >
        <Scene
          porings={porings}
          bodiesRef={bodiesRef}
          boundsRef={boundsRef}
          caressSignal={caressSignal}
          expandedId={expandedId}
          onPoringClick={guardedPoringClick}
          sheets={sheets}
          graveyardSheets={graveyardSheets}
          shipTextures={shipTextures}
          decorTextures={decorTextures}
          fieldDims={fieldDims}
          liftSignal={liftSignal}
          world={world}
        />
      </Application>
    </div>
  );
}
