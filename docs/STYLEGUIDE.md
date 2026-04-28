# poringField -- Style Guide & Cheatsheet

Use this to replicate the project's visual language across all UI work. The aesthetic goal: soft, grassy, warm. Think Animal Crossing meets Ragnarok Online. Pastel greens for the field, warm pinks/reds for the porings.

---

## Color Palette

### Primary (field greens)
| Token       | Hex       | Use                              |
|-------------|-----------|----------------------------------|
| primary.50  | `#F0FDF4` | Page background (the field)      |
| primary.100 | `#DCFCE7` | Field card backgrounds           |
| primary.200 | `#BBF7D0` | Borders, dividers                |
| primary.300 | `#86EFAC` | Secondary buttons, hover states  |
| primary.400 | `#4ADE80` | Active states                    |
| primary.500 | `#22C55E` | **Primary buttons, key actions** |
| primary.600 | `#16A34A` | Dark accents, active nav         |
| primary.700 | `#15803D` | Dark accents                     |
| primary.800 | `#166534` | Very dark accents                |
| primary.900 | `#14532D` | Near-black                       |

### Accent (poring pinks — the creature color)
| Token       | Hex       | Use                              |
|-------------|-----------|----------------------------------|
| accent.50   | `#FFF1F2` | Light poring highlight           |
| accent.300  | `#FDA4AF` | Happy/chubby poring tones        |
| accent.500  | `#F43F5E` | **Ripe poring glow, XP bar**    |
| accent.700  | `#BE123C` | Dark poring accents              |

### Semantic
| Token   | Hex       | Use                        |
|---------|-----------|----------------------------|
| xp gold | `#FACC15` | XP bar fill, tier badges   |
| ripe glow | `#FDE68A` | Ripe poring pulse ring   |
| completed | `#94A3B8` | Greyscale for done porings |

### Grays
| Usage                | Token        |
|----------------------|--------------|
| Page background      | `primary.50` (the field is green, not gray) |
| Card borders         | `primary.200`|
| Muted text           | `gray.400`   |
| Secondary text       | `gray.500`   |
| Body text            | `gray.600`   |
| Headings             | `gray.700`   |

---

## Typography

**Font stack:**
```
'Nunito', -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif
```

Nunito is preferred — it's soft and rounded, matching the poring vibe. Fall back to system sans-serif.

| Element              | Size    | Weight     | Color       |
|----------------------|---------|------------|-------------|
| Page heading (h1)    | `2xl`   | `bold`     | gray.700    |
| Section heading (h2) | `lg`    | `bold`     | gray.700    |
| Card heading (h3)    | `md`    | `semibold` | gray.700    |
| Body text            | `sm`    | `normal`   | gray.600    |
| Muted / helper text  | `xs`    | `normal`   | gray.500    |
| Poring name label    | `sm`    | `semibold` | gray.700    |

---

## Spacing & Layout

| Concept              | Value   | Notes                            |
|----------------------|---------|----------------------------------|
| Page padding         | `24px`  | Main layout container            |
| Card padding         | `20px`  | TaskPanel, modals                |
| Gap between sections | `24px`  | Field header → canvas            |
| Border radius (cards)| `12px`  | Rounded, soft look               |
| Border radius (blobs)| `50%`   | Porings are circles              |
| TaskPanel width      | `360px` | Slide-in from the right          |

---

## Poring Visual States

Each growth tier maps to a distinct visual. Use CSS classes or component variants:

| Tier    | XP     | Size     | Color         | Expression | Animation        |
|---------|--------|----------|---------------|------------|------------------|
| seed    | 0–9    | 40px     | `accent.300`  | Blank dot  | Slow bounce      |
| happy   | 10–29  | 56px     | `accent.300`  | 👀 eyes    | Normal bounce    |
| chubby  | 30–59  | 72px     | `accent.500`  | 😊 smile   | Wider bounce     |
| ripe    | 60+    | 88px     | `accent.500`  | 💛 glow    | Bounce + pulse ring |

Completed porings: greyscale filter, reduced opacity, static (no bounce).

---

## Component Patterns

### Poring Blob (PixiJS)

As of 2026-04-23, porings are drawn on a WebGL canvas by [src/field/FieldStage.tsx](../frontend/src/field/FieldStage.tsx) — **not** by CSS. The visual recipe is encoded there:

```ts
// Body: tier color + soft rim + inner highlight
g.circle(0, 0, radius + 2).fill(shadeColor);
g.circle(0, 0, radius).fill(bodyColor);
g.circle(-radius * 0.35, -radius * 0.35, radius * 0.18)
  .fill({ color: 0xffffff, alpha: 0.55 });

// Face: eyes from 'happy' tier onward; smile at 'chubby' and 'ripe'
g.circle(-radius * 0.28, -radius * 0.1, radius * 0.08).fill(0x1f2937);
g.circle(radius * 0.28, -radius * 0.1, radius * 0.08).fill(0x1f2937);
g.arc(0, radius * 0.15, radius * 0.25, 0.1, Math.PI - 0.1)
  .stroke({ color: 0x1f2937, width: 2, cap: "round" });

// Ripe tier: pulsing gold glow ring (pulse driven by useTick sine)
g.circle(0, 0, radius + 10).fill(0xfde68a);
```

Movement is driven by **Matter.js** physics in [src/field/useFieldEngine.ts](../frontend/src/field/useFieldEngine.ts). Bouncing comes from `restitution: 0.92`; larger tiers have more mass. Stationary bodies get a tiny random nudge each frame so the field stays alive.

The tier-up flash + entrance pop-in are GSAP tweens on the Pixi `Container.scale`:
```ts
gsap.timeline()
  .to(c.scale, { x: 1.35, y: 1.35, duration: 0.18, ease: "power2.out" })
  .to(c.scale, { x: 1, y: 1, duration: 0.55, ease: "elastic.out(1, 0.45)" });
```

The old CSS-animated version (`.poring` class with `@keyframes bounce/pulse`) has been removed from [styles.css](../frontend/src/styles.css).

### TaskPanel
```tsx
<div className="task-panel">  {/* fixed right-0, slide-in animation */}
  <h2>{poring.title}</h2>
  <XPBar xp={poring.xp} tier={poring.growth_tier} />
  <textarea>{poring.description}</textarea>
  <ChecklistSection items={poring.checklist} />
  <LabelPicker labels={poring.labels} />
</div>
```

### XP Bar
```tsx
// Progress: (xp % tierRange) / tierRange * 100
// Tier thresholds: seed 0-9, happy 10-29, chubby 30-59, ripe 60+
<div className="xp-bar">
  <div className="xp-fill" style={{ width: `${progress}%`, background: '#FACC15' }} />
</div>
```

---

## Page Backgrounds

| Context              | Background     |
|----------------------|----------------|
| Field page           | `primary.50` + subtle grass texture (optional CSS) |
| Auth pages           | `primary.50`   |
| TaskPanel            | `white`        |
| Act modal            | `white`        |

---

## Borders & Shadows

| Element              | Border                           | Shadow   |
|----------------------|----------------------------------|----------|
| TaskPanel            | left `2px solid primary.200`     | `xl`     |
| Modals               | none                             | `2xl`    |
| Checklist items      | bottom `1px solid primary.100`   | none     |

---

## Responsive Breakpoints

| Breakpoint | Width    | What changes                                   |
|------------|----------|------------------------------------------------|
| base       | 0px+     | TaskPanel becomes full-screen overlay          |
| md         | 768px+   | TaskPanel slides in from right (360px)         |
| lg         | 1024px+  | Full field layout, wider canvas                |

---

## Accessibility Checklist

- Skip-to-content link
- Semantic landmarks: `<main>`, `<aside>` (task panel), `<header>`
- All interactive elements keyboard-accessible
- Color contrast: minimum 4.5:1 ratio
- `aria-label` on poring blobs (name + tier)
- Focus visible on all interactive elements
- Poring animations respect `prefers-reduced-motion`
