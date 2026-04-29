import { useState } from "react";
import type { FormEvent } from "react";

import { createPoring } from "@/api/porings";
import type { Poring } from "@/api/porings";
import { ApiError } from "@/api/client";

interface Props {
  onCreated: (poring: Poring) => void;
}

export function CreatePoringButton({ onCreated }: Props): React.ReactElement {
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function reset(): void {
    setTitle("");
    setError(null);
    setSubmitting(false);
  }

  async function onSubmit(e: FormEvent<HTMLFormElement>): Promise<void> {
    e.preventDefault();
    if (!title.trim()) return;
    setSubmitting(true);
    setError(null);
    try {
      const poring = await createPoring({ title: title.trim() });
      onCreated(poring);
      reset();
      setOpen(false);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not create poring");
      setSubmitting(false);
    }
  }

  if (!open) {
    return (
      <button
        type="button"
        className="create-fab"
        onClick={() => setOpen(true)}
        aria-label="Plant a new poring"
      >
        +
      </button>
    );
  }

  return (
    <>
      <div
        style={{ position: "fixed", inset: 0, zIndex: 3 }}
        onClick={() => { reset(); setOpen(false); }}
      />
      <form className="create-form" onSubmit={onSubmit} style={{ zIndex: 4 }}>
      <input
        autoFocus
        type="text"
        value={title}
        placeholder="What are you working on?"
        onChange={(e) => setTitle(e.target.value)}
        maxLength={200}
        required
      />
      {error && <p className="auth-error">{error}</p>}
      <div className="create-form-actions">
        <button
          type="button"
          onClick={() => {
            reset();
            setOpen(false);
          }}
        >
          Cancel
        </button>
        <button type="submit" disabled={submitting || !title.trim()}>
          {submitting ? "Planting…" : "Plant"}
        </button>
      </div>
    </form>
    </>
  );
}
