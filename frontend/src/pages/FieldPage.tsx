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
import { OnboardingOverlay } from "@/components/OnboardingOverlay";
import { TaskPanel } from "@/components/TaskPanel";
import { FieldStage } from "@/field/FieldStage";
import type { CaressSignal } from "@/field/FieldStage";
import { WORLD_IDS } from "@/field/FieldDecorations";
import type { WorldId } from "@/field/FieldDecorations";
import { HeartParticles } from "@/field/HeartParticles";
import type { HeartBurst } from "@/field/HeartParticles";
import { PoringOverlay } from "@/field/PoringOverlay";
import { useFieldEngine } from "@/field/useFieldEngine";
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
  // Onboarding steps: 0 = welcome, 1 = "Read me!" highlight, 2+ = done.
  const [onboardingStep, setOnboardingStep] = useState(0);
  // Completion bursts carry captured coords because the poring's physics body
  // is removed the moment its status flips to "completed" (useFieldEngine only
  // tracks alive porings), so we can't look up its position later.
  const [completionBursts, setCompletionBursts] = useState<
    { key: string; x: number; y: number }[]
  >([]);
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
    // Capture position NOW — the body is removed from the engine on the next
    // render once this poring leaves the `alive` array.
    const fb = bodiesRef.current.get(updated.id);
    if (fb) {
      const key = `${updated.id}-${performance.now()}`;
      const x = fb.body.position.x;
      const y = fb.body.position.y;
      setCompletionBursts((prev) => [...prev.slice(-10), { key, x, y }]);
      setTimeout(() => {
        setCompletionBursts((prev) => prev.filter((b) => b.key !== key));
      }, 1400);
    }

    setPorings((prev) => prev.map((p) => (p.id === updated.id ? updated : p)));
    setActingId(null);
    setEditingId(null);
    setExpandedId(null);
  }, [bodiesRef]);

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
              onChange={(e) => { setWorld(e.target.value as WorldId); setMenuOpen(false); }}
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
            {onboardingStep === 0 && (
              <OnboardingOverlay
                message={
                  <>
                    <h2 className="onboarding-title">Welcome to todoGotchi!</h2>
                    <p className="onboarding-body">
                      This is a TODO app to keep track of ideas. You write them
                      down, and then take care of them over time.
                    </p>
                  </>
                }
                onNext={() => setOnboardingStep(1)}
                onSkip={() => setOnboardingStep(99)}
              />
            )}
            {(onboardingStep === 1 || onboardingStep === 2) && (() => {
              const readMe = alive.find(
                (p) => p.title.trim().toLowerCase() === "read me!",
              );
              if (!readMe) {
                setOnboardingStep(99);
                return null;
              }
              if (onboardingStep === 1) {
                return (
                  <OnboardingOverlay
                    message={
                      <p className="onboarding-body">
                        Each Dino is an idea. You can create them and make them
                        happy by interacting with them.
                      </p>
                    }
                    getAnchor={() => {
                      const fb = bodiesRef.current.get(readMe.id);
                      if (!fb) return null;
                      return {
                        x: fb.body.position.x,
                        y: fb.body.position.y - fb.radius - 40,
                      };
                    }}
                    getSpotlight={() => {
                      const fb = bodiesRef.current.get(readMe.id);
                      if (!fb) return null;
                      return {
                        x: fb.body.position.x,
                        y: fb.body.position.y,
                        r: fb.radius * 1.8,
                      };
                    }}
                    onNext={() => {
                      setExpandedId(readMe.id);
                      setOnboardingStep(2);
                    }}
                    onSkip={() => setOnboardingStep(99)}
                  />
                );
              }
              // Step 2: poring tab is expanded — point at it.
              return (
                <OnboardingOverlay
                  message={
                    <p className="onboarding-body">
                      This menu lets you interact with your idea, caress it
                      (it&rsquo;s cute) and open the ideation menu.
                    </p>
                  }
                  getAnchor={() => {
                    const fb = bodiesRef.current.get(readMe.id);
                    if (!fb) return null;
                    // The expanded tab is taller — lift the card well above it.
                    return {
                      x: fb.body.position.x,
                      y: fb.body.position.y - fb.radius - 80,
                    };
                  }}
                  getSpotlight={() => {
                    const fb = bodiesRef.current.get(readMe.id);
                    if (!fb) return null;
                    // Encompass both the dino body and the floating tab above it.
                    return {
                      x: fb.body.position.x,
                      y: fb.body.position.y - 40,
                      r: fb.radius * 2.4,
                    };
                  }}
                  onNext={() => {
                    setExpandedId(null);
                    setEditingId(readMe.id);
                    setOnboardingStep(3);
                  }}
                  onSkip={() => {
                    setExpandedId(null);
                    setOnboardingStep(99);
                  }}
                />
              );
            })()}
            {onboardingStep === 3 && (
              <OnboardingOverlay
                placement="left-of-panel"
                message={
                  <>
                    <p className="onboarding-body">
                      This is the idea menu. Here, you can give it content; name,
                      description, tags, and checklist items (for complex TODOs).
                    </p>
                    <p className="onboarding-body">
                      Interacting with the idea in this way makes it earn EXP,
                      and grow in size. Eventually the idea is &ldquo;ripe&rdquo;
                      and prompts you to take action on it! Once done, the idea
                      will leave the field.
                    </p>
                  </>
                }
                onNext={() => {
                  setEditingId(null);
                  setOnboardingStep(4);
                }}
                onSkip={() => {
                  setEditingId(null);
                  setOnboardingStep(99);
                }}
              />
            )}
            {onboardingStep === 4 && (
              <OnboardingOverlay
                placement="below-header"
                nextLabel="Done"
                message={
                  <p className="onboarding-body">
                    You can change between environments here, and also download
                    the repo from my GitHub in case you want to tinker with it.
                    If you&rsquo;d like, I can make you an account on my hardware,
                    although I can&rsquo;t promise total uptime!
                  </p>
                }
                onNext={() => setOnboardingStep(99)}
                onSkip={() => setOnboardingStep(99)}
              />
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
          onCompleted={handleActed}
        />
      )}

      {actingPoring && (
        <ActModal
          poring={actingPoring}
          onClose={() => setActingId(null)}
          onActed={handleActed}
        />
      )}

      {completionBursts.length > 0 && <BurstOverlay bursts={completionBursts} />}

      {feedbackOpen && <FeedbackModal onClose={() => setFeedbackOpen(false)} />}
    </main>
  );
}

// Positions confetti-like bursts at captured coords. The poring's physics
// body is gone by the time this renders (status flipped to completed), so we
// rely on positions captured at acted-time in FieldPage.handleActed.
interface BurstProps {
  bursts: { key: string; x: number; y: number }[];
}

function BurstOverlay({ bursts }: BurstProps): React.ReactElement {
  return (
    <div className="burst-layer" aria-hidden="true">
      {bursts.map(({ key, x, y }) => (
        <div
          key={key}
          className="completion-burst"
          style={{ transform: `translate3d(${x}px, ${y}px, 0)` }}
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
      ))}
    </div>
  );
}
