import { useEffect, useState } from "react";
import { Link, Navigate } from "react-router-dom";

import type { FeedbackAdminItem } from "@/api/feedback";
import { deleteFeedback, getAdminFeedback } from "@/api/feedback";
import { useAuth } from "@/auth/AuthContext";

function formatDate(iso: string): string {
  return new Date(iso).toLocaleString();
}

export function AdminPage(): React.ReactElement {
  const { user, initializing } = useAuth();
  const [items, setItems] = useState<FeedbackAdminItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const isAdmin = !initializing && !!user?.is_admin;

  // All hooks must come before any conditional returns.
  useEffect(() => {
    if (!isAdmin) return;
    getAdminFeedback()
      .then(setItems)
      .catch(() => setError("Could not load feedback."))
      .finally(() => setLoading(false));
  }, [isAdmin]);

  if (initializing) return <div style={{ padding: 24 }}>Loading…</div>;
  if (!user || !user.is_admin) return <Navigate to="/" replace />;

  async function handleDelete(id: number): Promise<void> {
    if (!confirm("Delete this comment?")) return;
    await deleteFeedback(id);
    setItems((prev) => prev.filter((i) => i.id !== id));
  }

  return (
    <main className="admin-page">
      <header className="admin-header">
        <h1>Feedback moderation</h1>
        <Link to="/field" className="admin-back">← Back to field</Link>
      </header>

      {loading && <p className="admin-status">Loading…</p>}
      {error && <p className="admin-status admin-error">{error}</p>}
      {!loading && !error && items.length === 0 && (
        <p className="admin-status">No feedback yet.</p>
      )}

      <div className="admin-list">
        {items.map((item) => (
          <div key={item.id} className="admin-item">
            <div className="admin-item-meta">
              <span className="admin-item-email">{item.email ?? "no email"}</span>
              <span className="admin-item-date">{formatDate(item.created_at)}</span>
            </div>
            <p className="admin-item-message">{item.message}</p>
            <button
              type="button"
              className="admin-delete"
              onClick={() => void handleDelete(item.id)}
            >
              Delete
            </button>
          </div>
        ))}
      </div>
    </main>
  );
}
