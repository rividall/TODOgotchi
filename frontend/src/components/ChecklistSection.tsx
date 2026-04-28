import { useState } from "react";
import type { FormEvent } from "react";

import { ApiError } from "@/api/client";
import type { ChecklistItem } from "@/api/checklist";
import {
  addChecklistItem,
  deleteChecklistItem,
  updateChecklistItem,
} from "@/api/checklist";

interface Props {
  poringId: number;
  items: ChecklistItem[];
  disabled?: boolean;
  onChange: (items: ChecklistItem[]) => void;
  onXpChanged: () => void;
}

export function ChecklistSection({
  poringId,
  items,
  disabled = false,
  onChange,
  onXpChanged,
}: Props): React.ReactElement {
  const [newText, setNewText] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function add(e: FormEvent<HTMLFormElement>): Promise<void> {
    e.preventDefault();
    const trimmed = newText.trim();
    if (!trimmed) return;
    setBusy(true);
    setError(null);
    try {
      const created = await addChecklistItem(poringId, trimmed);
      onChange([...items, created]);
      onXpChanged();
      setNewText("");
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not add item");
    } finally {
      setBusy(false);
    }
  }

  async function toggle(item: ChecklistItem): Promise<void> {
    setError(null);
    try {
      const wasUncompleted = !item.completed;
      const updated = await updateChecklistItem(poringId, item.id, {
        completed: !item.completed,
      });
      onChange(items.map((it) => (it.id === updated.id ? updated : it)));
      if (wasUncompleted && updated.completed) onXpChanged();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not update item");
    }
  }

  async function remove(item: ChecklistItem): Promise<void> {
    setError(null);
    try {
      await deleteChecklistItem(poringId, item.id);
      onChange(items.filter((it) => it.id !== item.id));
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not delete item");
    }
  }

  return (
    <section className="checklist-section">
      <div className="checklist-header">
        <h3>Checklist</h3>
        <span className="checklist-hint">+3 new · +5 per check</span>
      </div>

      {items.length === 0 && (
        <p className="checklist-empty">No items yet. Add one to feed your poring.</p>
      )}

      <ul className="checklist-list">
        {items.map((item) => (
          <li key={item.id} className={item.completed ? "checklist-item done" : "checklist-item"}>
            <label>
              <input
                type="checkbox"
                checked={item.completed}
                onChange={() => void toggle(item)}
                disabled={disabled}
              />
              <span>{item.text}</span>
            </label>
            <button
              type="button"
              className="checklist-delete"
              onClick={() => void remove(item)}
              aria-label={`Delete "${item.text}"`}
              disabled={disabled}
            >
              ×
            </button>
          </li>
        ))}
      </ul>

      <form className="checklist-add" onSubmit={add}>
        <input
          type="text"
          value={newText}
          placeholder="Add a checklist item…"
          onChange={(e) => setNewText(e.target.value)}
          maxLength={500}
          disabled={disabled || busy}
        />
        <button type="submit" disabled={disabled || busy || !newText.trim()}>
          Add
        </button>
      </form>

      {error && <p className="auth-error">{error}</p>}
    </section>
  );
}
