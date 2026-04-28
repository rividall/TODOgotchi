import { useEffect, useState } from "react";

export interface HeartBurst {
  key: string;
  x: number;
  y: number;
}

interface Heart {
  key: string;
  x: number;
  y: number;
  driftX: number;
  symbol: string;
  delayMs: number;
}

const SYMBOLS = ["❤", "💕", "💖", "💗", "✨"];
const HEARTS_PER_BURST = 5;
const LIFETIME_MS = 1500;

function rand(min: number, max: number): number {
  return min + Math.random() * (max - min);
}

function spawnHearts(burst: HeartBurst): Heart[] {
  return Array.from({ length: HEARTS_PER_BURST }, (_, i) => ({
    key: `${burst.key}-${i}`,
    x: burst.x + rand(-14, 14),
    y: burst.y + rand(-6, 6),
    driftX: rand(-70, 70),
    symbol: SYMBOLS[Math.floor(Math.random() * SYMBOLS.length)],
    delayMs: i * 55,
  }));
}

interface Props {
  bursts: HeartBurst[];
}

export function HeartParticles({ bursts }: Props): React.ReactElement {
  const [hearts, setHearts] = useState<Heart[]>([]);

  // Whenever a new burst arrives, spawn its hearts and schedule their removal.
  useEffect(() => {
    if (bursts.length === 0) return;
    const latest = bursts[bursts.length - 1]!;
    const fresh = spawnHearts(latest);
    setHearts((prev) => [...prev, ...fresh]);
    const freshKeys = new Set(fresh.map((h) => h.key));
    const timer = setTimeout(() => {
      setHearts((prev) => prev.filter((h) => !freshKeys.has(h.key)));
    }, LIFETIME_MS + 300);
    return () => clearTimeout(timer);
  }, [bursts]);

  return (
    <div className="hearts-layer" aria-hidden="true">
      {hearts.map((h) => (
        <span
          key={h.key}
          className="heart-particle"
          style={{
            left: h.x,
            top: h.y,
            animationDelay: `${h.delayMs}ms`,
            ["--heart-drift-x" as string]: `${h.driftX}px`,
          }}
        >
          {h.symbol}
        </span>
      ))}
    </div>
  );
}
