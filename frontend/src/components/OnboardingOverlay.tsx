import { useEffect, useRef } from "react";

type Placement = "center" | "anchored" | "left-of-panel" | "below-header";

interface OnboardingOverlayProps {
  message: React.ReactNode;
  /**
   * When provided, the card is positioned near the returned screen-relative
   * point (inside the parent .field-body), updated every frame so it can
   * track a moving target. When omitted, the card is centered.
   */
  getAnchor?: () => { x: number; y: number } | null;
  /**
   * When provided, the dim backdrop is masked with a transparent circle at
   * the returned point so the target is visible through the overlay.
   */
  getSpotlight?: () => { x: number; y: number; r: number } | null;
  /**
   * Static placement for the card. Defaults to "center", or "anchored" when
   * getAnchor is set. "left-of-panel" pins the card just to the left of the
   * slide-in TaskPanel — used when the panel is the onboarding target.
   */
  placement?: Placement;
  /** Label for the primary advance button. Defaults to "Next". */
  nextLabel?: string;
  onNext: () => void;
  onSkip: () => void;
}

export function OnboardingOverlay({
  message,
  getAnchor,
  getSpotlight,
  placement,
  nextLabel = "Next",
  onNext,
  onSkip,
}: OnboardingOverlayProps): React.ReactElement {
  // Backdrop (dim + blur + spotlight hole) and card live in sibling layers so
  // the mask never affects the card.
  const backdropRef = useRef<HTMLDivElement>(null);
  const cardRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!getAnchor && !getSpotlight) return;
    let raf = 0;
    const tick = (): void => {
      const card = cardRef.current;
      if (card && getAnchor) {
        const a = getAnchor();
        if (a) {
          const w = card.offsetWidth;
          card.style.left = `${a.x - w / 2}px`;
          card.style.top = `${a.y}px`;
        }
      }
      const backdrop = backdropRef.current;
      if (backdrop && getSpotlight) {
        const s = getSpotlight();
        if (s) {
          backdrop.style.setProperty("--hole-x", `${s.x}px`);
          backdrop.style.setProperty("--hole-y", `${s.y}px`);
          backdrop.style.setProperty("--hole-r", `${s.r}px`);
        }
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [getAnchor, getSpotlight]);

  const resolvedPlacement: Placement = placement ?? (getAnchor ? "anchored" : "center");
  const hasSpotlight = Boolean(getSpotlight);

  return (
    <div className="onboarding-root" role="dialog" aria-modal="true">
      <div
        ref={backdropRef}
        className={`onboarding-backdrop${hasSpotlight ? " onboarding-backdrop--spotlight" : ""}`}
      />
      <div className={`onboarding-card-layer onboarding-card-layer--${resolvedPlacement}`}>
        <div ref={cardRef} className="onboarding-card">
          <div className="onboarding-message">{message}</div>
          <button type="button" className="onboarding-next" onClick={onNext}>
            {nextLabel}
          </button>
          <button type="button" className="onboarding-skip" onClick={onSkip}>
            Skip
          </button>
        </div>
      </div>
    </div>
  );
}
