import { useState } from "react";

import { ApiError } from "@/api/client";
import { actOnPoring } from "@/api/porings";
import type { ActionType, Poring } from "@/api/porings";

interface Props {
  poring: Poring;
  onClose: () => void;
  onActed: (poring: Poring) => void;
}

const ACTIONS: { type: ActionType; label: string; emoji: string; hint: string }[] = [
  { type: "shipped", label: "Shipped", emoji: "🚀", hint: "Built & released" },
  { type: "booked", label: "Booked", emoji: "📅", hint: "Reserved / scheduled" },
  { type: "bought", label: "Bought", emoji: "🛍️", hint: "Purchased" },
  { type: "done", label: "Done", emoji: "✅", hint: "Completed" },
  { type: "abandoned", label: "Abandoned", emoji: "🪦", hint: "Letting go" },
];

export function ActModal({ poring, onClose, onActed }: Props): React.ReactElement {
  const [selected, setSelected] = useState<ActionType | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function confirm(): Promise<void> {
    if (!selected) return;
    setSubmitting(true);
    setError(null);
    try {
      const updated = await actOnPoring(poring.id, selected);
      onActed(updated);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not complete poring");
      setSubmitting(false);
    }
  }

  return (
    <div
      className="act-modal-backdrop"
      role="dialog"
      aria-modal="true"
      aria-labelledby="act-modal-title"
      onClick={onClose}
    >
      <div className="act-modal" onClick={(e) => e.stopPropagation()}>
        <h2 id="act-modal-title">Act on "{poring.title}"</h2>
        <p className="act-modal-sub">
          This poring is ripe ({poring.xp} XP). How did you resolve it?
        </p>

        <ul className="act-options">
          {ACTIONS.map((opt) => (
            <li key={opt.type}>
              <button
                type="button"
                className={selected === opt.type ? "act-option selected" : "act-option"}
                onClick={() => setSelected(opt.type)}
                disabled={submitting}
              >
                <span className="act-option-emoji" aria-hidden="true">
                  {opt.emoji}
                </span>
                <span className="act-option-body">
                  <strong>{opt.label}</strong>
                  <small>{opt.hint}</small>
                </span>
              </button>
            </li>
          ))}
        </ul>

        {error && <p className="auth-error">{error}</p>}

        <div className="act-modal-actions">
          <button type="button" onClick={onClose} disabled={submitting}>
            Cancel
          </button>
          <button
            type="button"
            className="primary"
            onClick={() => void confirm()}
            disabled={!selected || submitting}
          >
            {submitting ? "Completing…" : "Pop it"}
          </button>
        </div>
      </div>
    </div>
  );
}
