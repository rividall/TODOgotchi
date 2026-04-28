import Particles, { initParticlesEngine } from "@tsparticles/react";
import { memo, useEffect, useState } from "react";
import { loadSlim } from "@tsparticles/slim";

let enginePromise: Promise<void> | null = null;

function ensureEngine(): Promise<void> {
  if (!enginePromise) {
    enginePromise = initParticlesEngine(async (engine) => {
      await loadSlim(engine);
    }).catch((err: unknown) => {
      // eslint-disable-next-line no-console
      console.error("[AmbientParticles] engine init failed:", err);
      enginePromise = null;
      throw err;
    });
  }
  return enginePromise;
}

// Module-level so reference is identical on every render.
const AMBIENT_OPTIONS = {
  fullScreen: { enable: false },
  background: { color: "transparent" },
  fpsLimit: 60,
  detectRetina: true,
  interactivity: {
    detectsOn: "window" as const,
    events: {
      onHover: { enable: false },
      onClick: { enable: false },
      resize: { enable: false },
    },
  },
  particles: {
    number: { value: 80 },
    color: { value: ["#ffffff", "#fde68a", "#fef3c7", "#bbf7d0"] },
    opacity: {
      value: { min: 0.12, max: 0.38 },
      animation: { enable: true, speed: 1.2, sync: false, startValue: "random" as const },
    },
    size: { value: { min: 1, max: 2.5 } },
    move: {
      enable: true,
      direction: "top" as const,
      speed: { min: 0.09, max: 0.28 },
      outModes: { default: "out" as const },
      random: true,
      straight: false,
    },
    shape: { type: "circle" },
    shadow: {
      enable: true,
      color: "#fde68a",
      blur: 6,
    },
  },
};

// The Particles component's internal effect re-runs on ANY prop change (even reference-stable
// options in StrictMode's double-invoke), which destroys and recreates the particle container
// — what the user was seeing as "all pollen resets". Wrapping in memo with a never-re-render
// equality function pins the inner canvas to a single mount for the life of the field page.
function AmbientParticlesInner(): React.ReactElement | null {
  const [ready, setReady] = useState(false);

  useEffect(() => {
    void ensureEngine().then(
      () => setReady(true),
      () => setReady(false),
    );
  }, []);

  if (!ready) return null;
  return (
    <div className="ambient-particles" aria-hidden="true">
      <Particles id="ambient" options={AMBIENT_OPTIONS} />
    </div>
  );
}

export const AmbientParticles = memo(AmbientParticlesInner, () => true);
