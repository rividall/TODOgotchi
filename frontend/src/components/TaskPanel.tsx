import { useEffect, useState } from "react";

import { ApiError } from "@/api/client";
import type { ChecklistItem } from "@/api/checklist";
import type { Label } from "@/api/labels";
import { deletePoring, getPoring, updatePoring } from "@/api/porings";
import type { Poring } from "@/api/porings";
import { ChecklistSection } from "@/components/ChecklistSection";
import { LabelPicker } from "@/components/LabelPicker";

interface Props {
  poring: Poring;
  allLabels: Label[];
  onClose: () => void;
  onUpdated: (p: Poring) => void;
  onDeleted: (id: number) => void;
  onLabelsChanged: () => void;
  onRequestAct: () => void;
}

const TIER_LABEL: Record<Poring["growth_tier"], string> = {
  seed: "Seed",
  happy: "Happy",
  chubby: "Chubby",
  ripe: "Ripe",
};

const TIER_RANGE: Record<Poring["growth_tier"], [number, number]> = {
  seed: [0, 10],
  happy: [10, 30],
  chubby: [30, 60],
  ripe: [60, 60],
};

const COMPLETED_LABEL: Record<NonNullable<Poring["action_type"]>, string> = {
  shipped: "Shipped",
  booked: "Booked",
  bought: "Bought",
  done: "Done",
  abandoned: "Abandoned",
};

function tierProgressPct(xp: number, tier: Poring["growth_tier"]): number {
  if (tier === "ripe") return 100;
  const [lo, hi] = TIER_RANGE[tier];
  return Math.min(100, Math.max(0, ((xp - lo) / (hi - lo)) * 100));
}

export function TaskPanel({
  poring,
  allLabels,
  onClose,
  onUpdated,
  onDeleted,
  onLabelsChanged,
  onRequestAct,
}: Props): React.ReactElement {
  const [title, setTitle] = useState(poring.title);
  const [description, setDescription] = useState(poring.description ?? "");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setTitle(poring.title);
    setDescription(poring.description ?? "");
    setError(null);
  }, [poring.id, poring.title, poring.description]);

  const completed = poring.status === "completed";
  const canAct = !completed && poring.growth_tier === "ripe";
  const dirty = title !== poring.title || description !== (poring.description ?? "");

  async function save(): Promise<void> {
    if (!dirty || completed) return;
    setSaving(true);
    setError(null);
    try {
      const updated = await updatePoring(poring.id, {
        title,
        description: description === "" ? null : description,
      });
      onUpdated(updated);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Save failed");
    } finally {
      setSaving(false);
    }
  }

  async function remove(): Promise<void> {
    if (!confirm(`Delete "${poring.title}"?`)) return;
    setSaving(true);
    try {
      await deletePoring(poring.id);
      onDeleted(poring.id);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Delete failed");
      setSaving(false);
    }
  }

  function applyChecklist(items: ChecklistItem[]): void {
    onUpdated({ ...poring, checklist: items });
  }

  function applyLabels(labels: Label[]): void {
    onUpdated({ ...poring, labels });
  }

  async function refreshPoring(): Promise<void> {
    try {
      const fresh = await getPoring(poring.id);
      onUpdated(fresh);
    } catch {
      /* non-fatal */
    }
  }

  return (
    <aside className="task-panel" aria-label="Poring details">
      <header className="task-panel-header">
        <button type="button" className="task-panel-close" onClick={onClose} aria-label="Close">
          ×
        </button>
      </header>

      <div className="task-panel-tier">
        {completed && poring.action_type ? (
          <span className="tier-badge tier-completed">
            {COMPLETED_LABEL[poring.action_type]}
          </span>
        ) : (
          <span className={`tier-badge tier-${poring.growth_tier}`}>
            {TIER_LABEL[poring.growth_tier]}
          </span>
        )}
        <span className="task-panel-xp">{poring.xp} XP</span>
      </div>

      <div className="xp-bar" aria-label={`${poring.xp} XP toward next tier`}>
        <div
          className="xp-fill"
          style={{ width: `${tierProgressPct(poring.xp, poring.growth_tier)}%` }}
        />
      </div>

      {canAct && (
        <button type="button" className="act-cta" onClick={onRequestAct}>
          ✨ Act on this poring
        </button>
      )}

      <label className="task-panel-field">
        <span>Title</span>
        <input
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          maxLength={200}
          disabled={completed}
        />
      </label>

      <label className="task-panel-field">
        <span>Description{completed ? "" : " (+2 XP per edit)"}</span>
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          rows={5}
          placeholder="Feed your poring by writing about it…"
          disabled={completed}
        />
      </label>

      <LabelPicker
        poringId={poring.id}
        attachedLabels={poring.labels}
        allLabels={allLabels}
        disabled={completed}
        onAttachedChange={applyLabels}
        onLabelsChanged={onLabelsChanged}
        onXpChanged={() => void refreshPoring()}
      />

      <ChecklistSection
        poringId={poring.id}
        items={poring.checklist}
        disabled={completed}
        onChange={applyChecklist}
        onXpChanged={() => void refreshPoring()}
      />

      {error && <p className="auth-error">{error}</p>}

      <div className="task-panel-actions">
        <button type="button" className="ghost-button" onClick={remove} disabled={saving}>
          Delete
        </button>
        {!completed && (
          <button type="button" onClick={save} disabled={!dirty || saving}>
            {saving ? "Saving…" : "Save"}
          </button>
        )}
      </div>
    </aside>
  );
}
