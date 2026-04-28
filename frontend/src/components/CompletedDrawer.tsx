import { useState } from "react";

import type { ActionType, Poring } from "@/api/porings";

interface Props {
  porings: Poring[];
  onSelect: (id: number) => void;
}

const ACTION_EMOJI: Record<ActionType, string> = {
  shipped: "🚀",
  booked: "📅",
  bought: "🛍️",
  done: "✅",
  abandoned: "🪦",
};

export function CompletedDrawer({ porings, onSelect }: Props): React.ReactElement | null {
  const [open, setOpen] = useState(false);

  if (porings.length === 0) return null;

  return (
    <div className={open ? "completed-drawer open" : "completed-drawer"}>
      <button
        type="button"
        className="completed-drawer-toggle"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
      >
        Done {porings.length} {open ? "▾" : "▸"}
      </button>
      {open && (
        <ul className="completed-list">
          {porings.map((p) => (
            <li key={p.id}>
              <button type="button" onClick={() => onSelect(p.id)}>
                <span className="completed-emoji" aria-hidden="true">
                  {p.action_type ? ACTION_EMOJI[p.action_type] : "✨"}
                </span>
                <span className="completed-title">{p.title}</span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
