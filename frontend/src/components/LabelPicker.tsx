import { useMemo, useState } from "react";
import type { FormEvent } from "react";

import { ApiError } from "@/api/client";
import type { Label } from "@/api/labels";
import { attachLabel, createLabel, detachLabel } from "@/api/labels";

interface Props {
  poringId: number;
  attachedLabels: Label[];
  allLabels: Label[];
  disabled?: boolean;
  onAttachedChange: (labels: Label[]) => void;
  onLabelsChanged: () => void;
  onXpChanged: () => void;
}

const DEFAULT_COLOR = "#F43F5E";

export function LabelPicker({
  poringId,
  attachedLabels,
  allLabels,
  disabled = false,
  onAttachedChange,
  onLabelsChanged,
  onXpChanged,
}: Props): React.ReactElement {
  const [adding, setAdding] = useState(false);
  const [newName, setNewName] = useState("");
  const [newColor, setNewColor] = useState(DEFAULT_COLOR);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const attachedIds = useMemo(() => new Set(attachedLabels.map((l) => l.id)), [attachedLabels]);
  const availableLabels = useMemo(
    () => allLabels.filter((l) => !attachedIds.has(l.id)),
    [allLabels, attachedIds],
  );

  async function attach(label: Label): Promise<void> {
    setError(null);
    setBusy(true);
    try {
      await attachLabel(poringId, label.id);
      onAttachedChange([...attachedLabels, label]);
      onXpChanged();
      setPickerOpen(false);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not attach label");
    } finally {
      setBusy(false);
    }
  }

  async function detach(label: Label): Promise<void> {
    setError(null);
    try {
      await detachLabel(poringId, label.id);
      onAttachedChange(attachedLabels.filter((l) => l.id !== label.id));
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not detach label");
    }
  }

  async function createAndAttach(e: FormEvent<HTMLFormElement>): Promise<void> {
    e.preventDefault();
    const name = newName.trim();
    if (!name) return;
    setError(null);
    setBusy(true);
    try {
      const created = await createLabel(name, newColor);
      await attachLabel(poringId, created.id);
      onAttachedChange([...attachedLabels, created]);
      onLabelsChanged();
      onXpChanged();
      setNewName("");
      setNewColor(DEFAULT_COLOR);
      setAdding(false);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not create label");
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="labels-section">
      <div className="labels-header">
        <h3>Labels</h3>
        <span className="checklist-hint">+3 per new attach</span>
      </div>

      <div className="labels-chips">
        {attachedLabels.map((label) => (
          <span
            key={label.id}
            className="label-chip"
            style={{ background: label.color }}
          >
            {label.name}
            <button
              type="button"
              onClick={() => void detach(label)}
              aria-label={`Detach ${label.name}`}
              disabled={disabled}
            >
              ×
            </button>
          </span>
        ))}
        {!disabled && !pickerOpen && !adding && (
          <button
            type="button"
            className="label-add-button"
            onClick={() => setPickerOpen(true)}
          >
            + Add label
          </button>
        )}
      </div>

      {pickerOpen && !adding && (
        <div className="label-picker">
          {availableLabels.length === 0 ? (
            <p className="checklist-empty">No other labels yet.</p>
          ) : (
            <ul>
              {availableLabels.map((label) => (
                <li key={label.id}>
                  <button
                    type="button"
                    onClick={() => void attach(label)}
                    disabled={busy}
                  >
                    <span
                      className="label-swatch"
                      style={{ background: label.color }}
                      aria-hidden="true"
                    />
                    {label.name}
                  </button>
                </li>
              ))}
            </ul>
          )}
          <div className="label-picker-actions">
            <button type="button" onClick={() => setAdding(true)}>
              Create new
            </button>
            <button type="button" onClick={() => setPickerOpen(false)}>
              Cancel
            </button>
          </div>
        </div>
      )}

      {adding && (
        <form className="label-create" onSubmit={createAndAttach}>
          <input
            type="text"
            value={newName}
            placeholder="Label name"
            onChange={(e) => setNewName(e.target.value)}
            maxLength={64}
            required
            autoFocus
          />
          <input
            type="color"
            value={newColor}
            onChange={(e) => setNewColor(e.target.value)}
            aria-label="Label color"
          />
          <div className="label-picker-actions">
            <button type="submit" disabled={busy || !newName.trim()}>
              {busy ? "Creating…" : "Create & attach"}
            </button>
            <button
              type="button"
              onClick={() => {
                setAdding(false);
                setNewName("");
                setNewColor(DEFAULT_COLOR);
              }}
              disabled={busy}
            >
              Cancel
            </button>
          </div>
        </form>
      )}

      {error && <p className="auth-error">{error}</p>}
    </section>
  );
}
