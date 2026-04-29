import { lazy, Suspense, useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";

import { ApiError } from "@/api/client";
import type { Label } from "@/api/labels";
import { getLabels } from "@/api/labels";
import { getPorings } from "@/api/porings";
import type { Poring } from "@/api/porings";
import { ActModal } from "@/components/ActModal";
import { CompletedDrawer } from "@/components/CompletedDrawer";
import { CreatePoringButton } from "@/components/CreatePoringButton";
import { FeedbackModal } from "@/components/FeedbackModal";
import { TaskPanel } from "@/components/TaskPanel";
import { FieldStage } from "@/field/FieldStage";
import type { CaressSignal } from "@/field/FieldStage";
import { WORLD_IDS } from "@/field/FieldDecorations";
import type { WorldId } from "@/field/FieldDecorations";
import { HeartParticles } from "@/field/HeartParticles";
import type { HeartBurst } from "@/field/HeartParticles";
import { PoringOverlay } from "@/field/PoringOverlay";
import { useFieldEngine } from "@/field/useFieldEngine";
import type { FieldBody } from "@/field/useFieldEngine";
import { useAuth } from "@/auth/AuthContext";

// tsparticles is ~80 KB gzipped — keep it out of the initial bundle.
const AmbientParticles = lazy(() =>
  import("@/field/AmbientParticles").then((m) => ({ default: m.AmbientParticles })),
);

export function FieldPage(): React.ReactElement {
  const { user, logout, isGuest } = useAuth();
  const [porings, setPorings] = useState<Poring[]>([]);
  const [labels, setLabels] = useState<Label[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [world, setWorld] = useState<WorldId>("Forest");
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [actingId, setActingId] = useState<number | null>(null);
  const [feedbackOpen, setFeedbackOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [burstIds, setBurstIds] = useState<Set<number>>(new Set());
  const [caressSignal, setCaressSignal] = useState<CaressSignal | null>(null);
  const [heartBursts, setHeartBursts] = useState<HeartBurst[]>([]);

  const { alive, completed } = useMemo(() => {
    const a: Poring[] = [];
    const c: Poring[] = [];
    for (const p of porings) (p.status === "completed" ? c : a).push(p);
    return { alive: a, completed: c };
  }, [porings]);

  const { engineRef, bodiesRef, setBounds, caress } = useFieldEngine(alive);

  const refreshLabels = useCallback(async () => {
    try {
      setLabels(await getLabels());
    } catch {
      /* non-fatal */
    }
  }, []);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [ps, ls] = await Promise.all([getPorings(), getLabels()]);
      setPorings(ps);
      setLabels(ls);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not load field");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const editingPoring = useMemo(
    () => (editingId !== null ? porings.find((p) => p.id === editingId) ?? null : null),
    [porings, editingId],
  );
  const actingPoring = useMemo(
    () => (actingId !== null ? porings.find((p) => p.id === actingId) ?? null : null),
    [porings, actingId],
  );

  // Clicking a poring always expands its floating tab. Act modal only opens
  // when the user explicitly clicks "Act" inside the expanded tab.
  const handlePoringClick = useCallback((id: number) => {
    setExpandedId(id);
  }, []);

  const handleBackgroundClick = useCallback(() => {
    setExpandedId(null);
  }, []);

  const handleEdit = useCallback((id: number) => {
    setEditingId(id);
    setExpandedId(null);
  }, []);

  const handleAct = useCallback((id: number) => {
    setActingId(id);
  }, []);

  const handleCaress = useCallback(
    (id: number) => {
      setExpandedId(null); // close the tab so the dino runs freely
      if (!caress(id)) return;
      const nonce = performance.now();
      setCaressSignal({ id, nonce });
      const fb = bodiesRef.current.get(id);
      if (fb) {
        setHeartBursts((prev) => [
          ...prev.slice(-10), // cap live burst list so state doesn't grow forever
          { key: `${id}-${nonce}`, x: fb.body.position.x, y: fb.body.position.y },
        ]);
      }
    },
    [caress, bodiesRef],
  );

  const handleActed = useCallback((updated: Poring) => {
    setBurstIds((prev) => {
      const next = new Set(prev);
      next.add(updated.id);
      return next;
    });
    setTimeout(() => {
      setBurstIds((prev) => {
        const next = new Set(prev);
        next.delete(updated.id);
        return next;
      });
    }, 1400);

    setPorings((prev) => prev.map((p) => (p.id === updated.id ? updated : p)));
    setActingId(null);
    setEditingId(null);
    setExpandedId(null);
  }, []);

  return (
    <main className="field-page">
      <header className="field-header">
        <h1>TODOgotchi</h1>

        {/* Desktop nav */}
        <div className="field-user field-user--desktop">
          <select
            className="world-switcher"
            value={world}
            onChange={(e) => setWorld(e.target.value as WorldId)}
          >
            {WORLD_IDS.map((w) => (
              <option key={w} value={w}>{w}</option>
            ))}
          </select>
          <span>{isGuest ? "Guest" : `Hi, ${user?.username}`}</span>
          {user?.is_admin && (
            <Link to="/admin" className="field-header-btn field-header-btn--blue">
              Moderation
            </Link>
          )}
          {isGuest && (
            <>
              <a
                href="https://github.com/rividall/TODOgotchi"
                target="_blank"
                rel="noopener noreferrer"
                className="field-header-btn field-header-btn--blue"
              >
                Download &amp; run
              </a>
              <a href="/register" className="field-header-btn field-header-btn--green">
                Request Account
              </a>
            </>
          )}
          <button type="button" onClick={logout}>
            {isGuest ? "Exit" : "Sign out"}
          </button>
        </div>

        {/* Mobile hamburger */}
        <button
          type="button"
          className="hamburger-btn"
          aria-label="Menu"
          aria-expanded={menuOpen}
          onClick={() => setMenuOpen((o) => !o)}
        >
          {menuOpen ? "✕" : "☰"}
        </button>

        {menuOpen && (
          <nav className="hamburger-menu" onClick={() => setMenuOpen(false)}>
            <span className="hamburger-label">{isGuest ? "Guest" : `Hi, ${user?.username}`}</span>
            <select
              className="world-switcher"
              value={world}
              onChange={(e) => setWorld(e.target.value as WorldId)}
              onClick={(e) => e.stopPropagation()}
            >
              {WORLD_IDS.map((w) => (
                <option key={w} value={w}>{w}</option>
              ))}
            </select>
            {user?.is_admin && (
              <Link to="/admin" className="field-header-btn field-header-btn--blue hamburger-item">
                Moderation
              </Link>
            )}
            {isGuest && (
              <div className="hamburger-btn-row">
                <a
                  href="https://github.com/rividall/TODOgotchi"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="field-header-btn field-header-btn--blue"
                >
                  Download &amp; run
                </a>
                <a href="/register" className="field-header-btn field-header-btn--green">
                  Request Account
                </a>
              </div>
            )}
            <button type="button" className="hamburger-signout" onClick={logout}>
              {isGuest ? "Exit" : "Sign out"}
            </button>
          </nav>
        )}
      </header>

      {isGuest && (
        <div className="guest-banner" role="status">
          <span>You&rsquo;re exploring as a guest — your progress won&rsquo;t be saved.</span>
        </div>
      )}

      <section className="field-body">
        {loading ? (
          <div className="field-canvas-empty">
            <p>Loading…</p>
          </div>
        ) : error ? (
          <div className="field-canvas-empty">
            <p>{error}</p>
          </div>
        ) : (
          <>
            <FieldStage
              porings={alive}
              bodiesRef={bodiesRef}
              engineRef={engineRef}
              caressSignal={caressSignal}
              expandedId={expandedId}
              world={world}
              onResize={setBounds}
              onPoringClick={handlePoringClick}
              onBackgroundClick={handleBackgroundClick}
            />
            <Suspense fallback={null}>
              <AmbientParticles
                key={world === "Space" ? "static" : "moving"}
                isStatic={world === "Space"}
              />
            </Suspense>
            <PoringOverlay
              porings={alive}
              bodiesRef={bodiesRef}
              expandedId={expandedId}
              onExpand={setExpandedId}
              onEdit={handleEdit}
              onAct={handleAct}
              onCaress={handleCaress}
            />
            <HeartParticles bursts={heartBursts} />
            {alive.length === 0 && (
              <div className="field-canvas-empty">
                <p>The field is empty. Plant a poring to get started.</p>
              </div>
            )}
          </>
        )}
        <CompletedDrawer porings={completed} onSelect={(id) => setEditingId(id)} />
        {isGuest && (
          <button
            type="button"
            className="feedback-fab"
            onClick={() => setFeedbackOpen(true)}
          >
            💬 Leave feedback
          </button>
        )}
        <CreatePoringButton
          onCreated={(p) => {
            setPorings((prev) => [...prev, p]);
            setExpandedId(p.id);
          }}
        />
      </section>

      {editingPoring && (
        <TaskPanel
          poring={editingPoring}
          allLabels={labels}
          onClose={() => setEditingId(null)}
          onUpdated={(updated) =>
            setPorings((prev) => prev.map((p) => (p.id === updated.id ? updated : p)))
          }
          onDeleted={(id) => {
            setPorings((prev) => prev.filter((p) => p.id !== id));
            setEditingId(null);
          }}
          onLabelsChanged={() => void refreshLabels()}
          onRequestAct={() => setActingId(editingPoring.id)}
        />
      )}

      {actingPoring && (
        <ActModal
          poring={actingPoring}
          onClose={() => setActingId(null)}
          onActed={handleActed}
        />
      )}

      {burstIds.size > 0 && <BurstOverlay ids={burstIds} porings={porings} bodiesRef={bodiesRef} />}

      {feedbackOpen && <FeedbackModal onClose={() => setFeedbackOpen(false)} />}
    </main>
  );
}

// Positions confetti-like bursts over whichever body is popping.
interface BurstProps {
  ids: Set<number>;
  porings: Poring[];
  bodiesRef: React.RefObject<Map<number, FieldBody>>;
}

function BurstOverlay({ ids, bodiesRef }: BurstProps): React.ReactElement {
  const [, force] = useState(0);
  useEffect(() => {
    let raf = 0;
    const tick = (): void => {
      force((n) => n + 1);
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, []);

  return (
    <div className="burst-layer" aria-hidden="true">
      {[...ids].map((id) => {
        const fb = bodiesRef.current.get(id);
        if (!fb) return null;
        return (
          <div
            key={id}
            className="completion-burst"
            style={{ transform: `translate3d(${fb.body.position.x}px, ${fb.body.position.y}px, 0)` }}
          >
            <div className="burst-core" />
            {Array.from({ length: 12 }, (_, i) => {
              const angle = (i / 12) * Math.PI * 2;
              return (
                <span
                  key={i}
                  className="burst-star"
                  style={{
                    ["--tx" as string]: `${Math.cos(angle) * 110}px`,
                    ["--ty" as string]: `${Math.sin(angle) * 110}px`,
                    animationDelay: `${(i % 4) * 30}ms`,
                  }}
                >
                  ★
                </span>
              );
            })}
          </div>
        );
      })}
    </div>
  );
}
