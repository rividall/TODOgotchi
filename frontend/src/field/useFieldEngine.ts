import Matter from "matter-js";
import { useCallback, useEffect, useRef } from "react";

import type { GrowthTier, Poring } from "@/api/porings";

export interface FieldBody {
  id: number;
  body: Matter.Body;
  radius: number;
  tier: GrowthTier;
}

export interface FieldEngineHandle {
  engineRef: React.RefObject<Matter.Engine | null>;
  bodiesRef: React.RefObject<Map<number, FieldBody>>;
  setBounds: (width: number, height: number) => void;
  caress: (id: number) => boolean;
}

const TIER_RADIUS: Record<GrowthTier, number> = {
  seed: 22,
  happy: 30,
  chubby: 38,
  ripe: 46,
};

const TIER_MASS: Record<GrowthTier, number> = {
  seed: 0.5,
  happy: 1,
  chubby: 1.6,
  ripe: 2.2,
};

// High air friction — idle dinos damp to a stop within ~1s of any disturbance.
// FieldStage temporarily lowers this on a body when it enters the "sneak" state.
const IDLE_FRICTION_AIR = 0.18;

function rand(min: number, max: number): number {
  return min + Math.random() * (max - min);
}

export function useFieldEngine(porings: Poring[]): FieldEngineHandle {
  const engineRef = useRef<Matter.Engine | null>(null);
  const bodiesRef = useRef<Map<number, FieldBody>>(new Map());
  const wallsRef = useRef<Matter.Body[]>([]);
  const boundsRef = useRef<{ w: number; h: number }>({ w: 800, h: 600 });
  const rafRef = useRef<number>(0);

  if (engineRef.current === null) {
    engineRef.current = Matter.Engine.create({
      gravity: { x: 0, y: 0 },
      enableSleeping: false,
    });
  }

  // Sync poring list → bodies.
  useEffect(() => {
    const engine = engineRef.current;
    if (!engine) return;
    const existing = bodiesRef.current;
    const keepIds = new Set(porings.map((p) => p.id));

    for (const [id, fb] of existing) {
      if (!keepIds.has(id)) {
        Matter.Composite.remove(engine.world, fb.body);
        existing.delete(id);
      }
    }

    for (const p of porings) {
      const current = existing.get(p.id);
      if (!current) {
        const radius = TIER_RADIUS[p.growth_tier];
        // The onboarding tutorial highlights this poring, so spawn it at the
        // center of the field; the overlay anchored above it stays on-screen.
        const isOnboardingTarget = p.title.trim().toLowerCase() === "read me!";
        const spawnX = isOnboardingTarget
          ? boundsRef.current.w / 2
          : rand(radius * 2, Math.max(boundsRef.current.w - radius * 2, radius * 3));
        const spawnY = isOnboardingTarget
          ? boundsRef.current.h / 2
          : rand(radius * 2, Math.max(boundsRef.current.h - radius * 2, radius * 3));
        const body = Matter.Bodies.circle(
          spawnX,
          spawnY,
          radius,
          {
            restitution: 0.85,
            frictionAir: IDLE_FRICTION_AIR,
            friction: 0.08,
            mass: TIER_MASS[p.growth_tier],
            inertia: Infinity, // no rotation; shadows + sprites stay upright
            label: `poring-${p.id}`,
          },
        );
        // No initial velocity — dinos start standing still. The Scene's per-dino
        // state machine drives all movement (sneak bursts).
        Matter.Composite.add(engine.world, body);
        existing.set(p.id, { id: p.id, body, radius, tier: p.growth_tier });
      } else if (current.tier !== p.growth_tier) {
        const newRadius = TIER_RADIUS[p.growth_tier];
        const scale = newRadius / current.radius;
        Matter.Body.scale(current.body, scale, scale);
        Matter.Body.setMass(current.body, TIER_MASS[p.growth_tier]);
        Matter.Body.setInertia(current.body, Infinity);
        current.radius = newRadius;
        current.tier = p.growth_tier;
      }
    }
  }, [porings]);

  // Physics loop — bare minimum: step the engine, lock rotation. No nudges.
  useEffect(() => {
    const engine = engineRef.current;
    if (!engine) return;
    let last = performance.now();
    const tick = (): void => {
      const now = performance.now();
      const dt = Math.min(now - last, 32);
      last = now;
      Matter.Engine.update(engine, dt);
      for (const fb of bodiesRef.current.values()) {
        Matter.Body.setAngle(fb.body, 0);
        Matter.Body.setAngularVelocity(fb.body, 0);
      }
      rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafRef.current);
  }, []);

  const setBounds = useCallback((width: number, height: number) => {
    const engine = engineRef.current;
    if (!engine || (boundsRef.current.w === width && boundsRef.current.h === height)) return;
    boundsRef.current = { w: width, h: height };
    for (const wall of wallsRef.current) Matter.Composite.remove(engine.world, wall);
    const thick = 80;
    // Walls are perfectly elastic + frictionless so dinos bounce off cleanly instead
    // of sticking and sliding along the edge under default surface friction.
    const wallOpts = {
      isStatic: true,
      restitution: 1,
      friction: 0,
      frictionStatic: 0,
    };
    const walls = [
      Matter.Bodies.rectangle(width / 2, FIELD_TOP_MARGIN - thick / 2, width + thick * 2, thick, { ...wallOpts, label: "wall-top" }),
      Matter.Bodies.rectangle(width / 2, height + thick / 2, width + thick * 2, thick, { ...wallOpts, label: "wall-bottom" }),
      Matter.Bodies.rectangle(-thick / 2, height / 2, thick, height + thick * 2, { ...wallOpts, label: "wall-left" }),
      Matter.Bodies.rectangle(width + thick / 2, height / 2, thick, height + thick * 2, { ...wallOpts, label: "wall-right" }),
    ];
    Matter.Composite.add(engine.world, walls);
    wallsRef.current = walls;
  }, []);

  // Caress is now purely a signal — Scene/PoringTab use it to fire visuals (hearts,
  // GSAP pop, kick animation). No physics impulse: dinos hold their ground.
  const caress = useCallback((id: number): boolean => {
    return bodiesRef.current.has(id);
  }, []);

  return { engineRef, bodiesRef, setBounds, caress };
}

export const FIELD_IDLE_FRICTION_AIR = IDLE_FRICTION_AIR;
export const FIELD_TOP_MARGIN = 48;
