import { useEffect, useState } from "react";

export type TimeOfDay = "dawn" | "morning" | "noon" | "golden" | "dusk" | "night";

function computeTimeOfDay(date: Date): TimeOfDay {
  const h = date.getHours() + date.getMinutes() / 60;
  if (h < 5) return "night";
  if (h < 7) return "dawn";
  if (h < 11) return "morning";
  if (h < 16) return "noon";
  if (h < 19) return "golden";
  if (h < 21) return "dusk";
  return "night";
}

// Reads the local clock, updates every 5 minutes. Cheap — just a setInterval.
export function useTimeOfDay(): TimeOfDay {
  const [tod, setTod] = useState<TimeOfDay>(() => computeTimeOfDay(new Date()));
  useEffect(() => {
    const update = (): void => setTod(computeTimeOfDay(new Date()));
    update();
    const interval = setInterval(update, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, []);
  return tod;
}
