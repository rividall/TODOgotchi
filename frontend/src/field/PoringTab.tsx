import { forwardRef } from "react";

import type { GrowthTier, Poring } from "@/api/porings";

interface Props {
  poring: Poring;
  expanded: boolean;
  onExpand: () => void;
  onEdit: () => void;
  onAct: () => void;
  onCaress: () => void;
}

const TIER_LABEL: Record<GrowthTier, string> = {
  seed: "Seed",
  happy: "Happy",
  chubby: "Chubby",
  ripe: "Ripe",
};

export const PoringTab = forwardRef<HTMLDivElement, Props>(function PoringTab(
  { poring, expanded, onExpand, onEdit, onAct, onCaress },
  ref,
) {
  const completed = poring.status === "completed";
  const canAct = !completed && poring.growth_tier === "ripe";
  const className = [
    "poring-tab",
    `poring-tab-${poring.growth_tier}`,
    expanded ? "poring-tab-expanded" : "",
    completed ? "poring-tab-completed" : "",
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <div
      ref={ref}
      className={className}
      onClick={(e) => {
        e.stopPropagation();
        if (!expanded) onExpand();
      }}
    >
      <div className="poring-tab-pill">
        <span className={`poring-tab-tier tier-${poring.growth_tier}`} aria-hidden="true" />
        <span className="poring-tab-title">{poring.title}</span>
        <span className="poring-tab-xp">{poring.xp} XP</span>
      </div>
      {expanded && (
        <div className="poring-tab-actions">
          <span className="poring-tab-sub">{TIER_LABEL[poring.growth_tier]}</span>
          {canAct && (
            <button
              type="button"
              className="poring-tab-action primary"
              onClick={(e) => {
                e.stopPropagation();
                onAct();
              }}
            >
              ✨ Act
            </button>
          )}
          <button
            type="button"
            className="poring-tab-action"
            onClick={(e) => {
              e.stopPropagation();
              onEdit();
            }}
          >
            Edit
          </button>
          {!completed && (
            <button
              type="button"
              className="poring-tab-action caress"
              onClick={(e) => {
                e.stopPropagation();
                onCaress();
              }}
              title="Give it a little pat — no XP, just joy"
            >
              ❤ Caress
            </button>
          )}
        </div>
      )}
    </div>
  );
});
