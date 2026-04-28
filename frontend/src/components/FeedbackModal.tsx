import { useEffect, useRef, useState } from "react";
import type { FormEvent } from "react";

import { ApiError } from "@/api/client";
import type { FeedbackItem } from "@/api/feedback";
import { getFeedback, submitFeedback } from "@/api/feedback";

function relativeTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return "just now";
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

interface Props {
  onClose: () => void;
}

export function FeedbackModal({ onClose }: Props): React.ReactElement {
  const [items, setItems] = useState<FeedbackItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");
  const [email, setEmail] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(false);
  const listRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    getFeedback()
      .then(setItems)
      .catch(() => { /* non-fatal — show empty list */ })
      .finally(() => setLoading(false));
  }, []);

  async function onSubmit(e: FormEvent<HTMLFormElement>): Promise<void> {
    e.preventDefault();
    if (!message.trim()) return;
    setSubmitting(true);
    setError(null);
    try {
      const item = await submitFeedback({
        message: message.trim(),
        email: email.trim() || undefined,
      });
      setItems((prev) => [item, ...prev]);
      setMessage("");
      setEmail("");
      setSubmitted(true);
      setTimeout(() => setSubmitted(false), 3000);
      listRef.current?.scrollTo({ top: 0, behavior: "smooth" });
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not submit — try again");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div
      className="act-modal-backdrop"
      role="dialog"
      aria-modal="true"
      aria-labelledby="feedback-title"
      onClick={onClose}
    >
      <div className="feedback-modal" onClick={(e) => e.stopPropagation()}>
        <div className="feedback-modal-header">
          <h2 id="feedback-title">💬 Leave feedback</h2>
          <button type="button" className="task-panel-close" onClick={onClose} aria-label="Close">
            ×
          </button>
        </div>

        <div className="feedback-list" ref={listRef}>
          {loading && <p className="feedback-empty">Loading…</p>}
          {!loading && items.length === 0 && (
            <p className="feedback-empty">No feedback yet — be the first!</p>
          )}
          {items.map((item) => (
            <div key={item.id} className="feedback-item">
              <p className="feedback-item-message">{item.message}</p>
              <span className="feedback-item-time">{relativeTime(item.created_at)}</span>
            </div>
          ))}
        </div>

        <form className="feedback-form" onSubmit={onSubmit}>
          <textarea
            className="feedback-textarea"
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder="What do you think?"
            maxLength={1000}
            rows={3}
            required
            disabled={submitting}
          />
          <input
            type="email"
            className="feedback-email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="Email (optional — never shown publicly)"
            disabled={submitting}
          />
          {error && <p className="auth-error">{error}</p>}
          {submitted && <p className="feedback-success">Thanks for your feedback! 🎉</p>}
          <div className="feedback-form-actions">
            <span className="feedback-char-count">{message.length}/1000</span>
            <button type="submit" disabled={submitting || !message.trim()}>
              {submitting ? "Sending…" : "Send"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
