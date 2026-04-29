import { useEffect, useMemo, useRef } from "react";

import type { Poring } from "@/api/porings";
import { PoringTab } from "@/field/PoringTab";
import type { FieldBody } from "@/field/useFieldEngine";

interface Props {
  porings: Poring[];
  bodiesRef: React.RefObject<Map<number, FieldBody>>;
  expandedId: number | null;
  onExpand: (id: number) => void;
  onEdit: (id: number) => void;
  onAct: (id: number) => void;
  onCaress: (id: number) => void;
}

export function PoringOverlay({
  porings,
  bodiesRef,
  expandedId,
  onExpand,
  onEdit,
  onAct,
  onCaress,
}: Props): React.ReactElement {
  const tabRefs = useRef<Map<number, HTMLDivElement>>(new Map());
  const overlayRef = useRef<HTMLDivElement>(null);
  const rafRef = useRef<number>(0);

  const sortedPorings = useMemo(() => {
    // Expanded one renders last so it sits on top in the DOM stacking order.
    return porings.slice().sort((a, b) => {
      const ae = a.id === expandedId ? 1 : 0;
      const be = b.id === expandedId ? 1 : 0;
      return ae - be;
    });
  }, [porings, expandedId]);

  useEffect(() => {
    const tick = (): void => {
      const overlayW = overlayRef.current?.clientWidth ?? 9999;
      for (const [id, tabEl] of tabRefs.current) {
        const fb = bodiesRef.current.get(id);
        if (!fb) continue;
        const tabW = tabEl.offsetWidth;
        const tabH = tabEl.offsetHeight;
        const offsetY = fb.radius + 14;
        // Center the tab on the poring, then clamp so it never bleeds off either edge.
        const x = Math.max(4, Math.min(fb.body.position.x - tabW / 2, overlayW - tabW - 4));
        const y = fb.body.position.y - offsetY - tabH;
        tabEl.style.transform = `translate3d(${x}px, ${y}px, 0)`;
      }
      rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafRef.current);
  }, [bodiesRef]);

  return (
    <div ref={overlayRef} className="poring-overlay">
      {sortedPorings.map((p) => (
        <PoringTab
          key={p.id}
          ref={(el) => {
            if (el) tabRefs.current.set(p.id, el);
            else tabRefs.current.delete(p.id);
          }}
          poring={p}
          expanded={p.id === expandedId}
          onExpand={() => onExpand(p.id)}
          onEdit={() => onEdit(p.id)}
          onAct={() => onAct(p.id)}
          onCaress={() => onCaress(p.id)}
        />
      ))}
    </div>
  );
}
