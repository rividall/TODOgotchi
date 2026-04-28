# TODO - Future Features & Tasks

> Track pending features and tasks that are not part of the current phase roadmap.

For the reader, human or machine, know this: Memory is a beautiful, complex, amazing, and rather fragile thing. Don't stress yourself by overloading this precious gift from evolution with data that will not live on. Be true to yourself. All TODOs must absolutely completely quickly be added to this file.
Otherwise it will be forgotten during your sleep tonight, or during your next context compression.

Whenever visiting this page to look for info on how to perform a task, remember the mantra: "Every piece of code created must conform to the documentation and libraries we are using. Creating code without first looking at the libraries doc pages on their repos is stupid, and leads to spaghettification of code. Unacceptable and totally avoidable. Always read the docs! They usually are on the research/ folder."

---

## Pending

- [ ] **[INFO] Add fedback input for third parties** -- Add a field for people to add feedback on a poring, and store that somewhere.
- [ ] **[Audio] Sound design pass** -- Howler.js for: soft "boing" on caress, tier-up ding, ripe ambient hum, completion firework. Muted by default with a toggle. Expands the original "idle sounds" idea into a full audio layer.
- [ ] **[UI] Poring hunger decay** -- After X days without interaction, poring XP slowly decreases (they get sad). Needs a backend cron job. Phase 4+.
- [ ] **[API] XP event history endpoint** -- `GET /porings/{id}/xp-events` so the frontend can show a "feed log" of what fed the poring. Nice detail view.
- [ ] **[Infra] ntfy notifications** -- When a poring reaches Ripe tier, send a push notification via ntfy (`ntfy.buenalynch.com`). Use the Apprise pattern from plantkeeper.
- [ ] **[UI] Drag to reorder checklist** -- Phase 2 has `order` field ready. Add drag-and-drop reordering using the HTML Drag and Drop API (no library needed).
- [ ] **[Server] Add Uptime Kuma monitor** -- After deployment, add HTTP check for `porings.buenalynch.com`.
- [ ] **[Tunnel] Update cloudflared ingress** -- After deployment, add ingress rule and restart cloudflared. Steps in PROGRESS.md.
- [ ] **[DX] Seed script** -- A `seed.py` that creates a test user and a handful of porings at different XP levels. Useful for testing field visuals.
- [ ] **[QA] Browser smoke test of Phase 1** -- Run `make dev` and walk register → create poring → edit description → confirm tier flips at 10 XP.
- [ ] **[QA] Browser smoke test of Phase 2** -- On top of the Phase 1 walk: add/check/uncheck a checklist item and confirm XP bumps by 3 + 5; toggle completed again and confirm no extra XP; create a new label via the picker and confirm it attaches + shows up on other porings' pickers; detach and confirm XP is retained.
- [ ] **[QA] Browser smoke test of Phase 3** -- Feed a poring to 60+ XP; confirm ripe glow + "Act on this poring" CTA in the panel; open ActModal and confirm one action type is selectable; confirm cancel → panel still open; confirm "Pop it" triggers the star burst; confirm the poring moves to the CompletedDrawer; click it there and confirm the panel opens read-only; confirm the backend rejects edits.
- [ ] **[UI] Label strip on PoringBlob** -- Currently labels only show in the TaskPanel. Consider a small colored dot strip under each Pixi poring (draw as a Graphics row in [FieldStage.tsx](../frontend/src/field/FieldStage.tsx)) for at-a-glance categorization.
- [x] **[UX/Engine] Field rendering rework** -- DONE (2026-04-23). See [PROGRESS.md Field Engine Rework](PROGRESS.md#field-engine-rework-done-2026-04-23).
- [x] **[Chore] React 18 → 19 upgrade** -- DONE (2026-04-23). Zero code changes needed; Vite 6 + @vitejs/plugin-react 4.x supports React 19 out of the box.
- [x] **[Art/Decision] Field art pipeline** -- DONE (2026-04-25). Went with Kenney Nature Kit environment + DinoSprites pixel-art characters (4 variants). Rive deferred indefinitely.
- [ ] **[Art/Tier 0] Poring polish pass** -- In [src/field/FieldStage.tsx](../frontend/src/field/FieldStage.tsx): squash-on-bounce (GSAP on Matter `collisionStart`), random blink timeline (eyes → `_ _` every 3-8s), per-tier cheek dots for chubby/ripe. Shadow is already improved (black, alpha 0.35).
- [x] **[Art/Tier 1] Kenney Nature Kit environment** -- DONE (2026-04-25). `FieldDecorations.tsx` scatters flowers/mushrooms/plants/rocks at seeded positions + edge tree clusters. Multi-world system supports forest, forest2, forest3. Remaining: TilingSprite ground, GSAP sway, ColorMatrixFilter time-of-day grading.
- [ ] **[Art/Tier 4] Rive-based poring character** -- 2-3 days. `npm install @rive-app/canvas`. Author a poring in [rive.app](https://rive.app) with state machine inputs `tier`/`happy`/`completed`. Render Rive into a Pixi `Texture` via `HTMLCanvasElement` source; replace the hand-drawn `draw()` callbacks in [FieldStage.tsx](../frontend/src/field/FieldStage.tsx). See [field-art-pipeline-analysis.md §5 Phase 2](research/field-art-pipeline-analysis.md) for the state-machine spec.
- [ ] **[Art/Tier 1 polish] Butterfly/bee ambient emitter** -- Pair with Tier 1 environment. tsparticles or custom Pixi emitter, small sprite particles drifting across mid-ground.
- [ ] **[Art/Tier 1 polish] Vignette + time-of-day color grading** -- Pixi `ColorMatrixFilter` on the root container per `useTimeOfDay` state. Warmer at dawn/golden, cooler at night.
- [ ] **[Art/Alt path] Tier 2 commissioned art** -- Only if Rive authoring stalls or pixel-art cohesion matters more than character expressiveness. Buy [Sprout Lands](https://cupnooble.itch.io/sprout-lands-asset-pack) ($5) + Fiverr illustrator for poring sprite sheets ($30-80). See [field-art-pipeline-analysis.md §5 Alternative](research/field-art-pipeline-analysis.md).
- [ ] **[Phase 5] Multi-world / biomes** -- Architectural v2: labels gain a `world` field, porings render as per-world creatures (forest/city/graveyard/dungeon/space/ocean...). Full analysis + rollout plan in [docs/research/multi-world-pipeline-analysis.md](research/multi-world-pipeline-analysis.md). **Do NOT start until the forest looks visibly great via the single-world art pipeline** — prereq for proving the abstraction.
- [ ] **[Phase 5A] Label.world backend migration** -- Alembic `0005_add_label_world.py` adds `labels.world` (String(32), nullable). Update Label model, LabelCreate/LabelOut schemas, label tests. ~half day.
- [ ] **[Phase 5A] WorldConfig abstraction (full)** -- A lightweight `WorldId` + per-world config is already live in `FieldDecorations.tsx`. The remaining Phase 5A work is moving this to a proper `frontend/src/worlds/` module (`types.ts`, `registry.ts`, `forest.ts`, `resolve.ts`) and wiring per-world physics overrides into `useFieldEngine`. ~0.5 day (scaffolding mostly done).
- [ ] **[Phase 5B] Forest world asset integration** -- Kenney Nature Kit sprites flow through `FieldDecorations.tsx`, ground `TilingSprite`, per-world ambient. See [field-art-pipeline-analysis.md Phase 1](research/field-art-pipeline-analysis.md). ~1-2 days.
- [ ] **[Phase 5C] City world (validates abstraction)** -- Kenney [City Kit](https://kenney.nl/assets/city-kit-roads) + [Car Kit](https://kenney.nl/assets/car-kit), world-selector dropdown in header, lazy-loaded world chunks. ~1 day.
- [ ] **[Phase 5D] Additional worlds** -- Graveyard / Dungeon / Space / Ocean. Each ~0.5-1 day once the pattern is proven.
- [ ] **[Phase 5E / optional] "All Worlds" mixed view** -- Variant B from [multi-world-pipeline-analysis.md §2](research/multi-world-pipeline-analysis.md). All porings on one canvas, each as its own world's creature. Style-cohesion pass required. ~2-3 days.
- [x] **[UX] Drag porings around the field** -- DONE (2026-04-23). Matter.js `MouseConstraint` bound to the field wrapper in [FieldStage.tsx](../frontend/src/field/FieldStage.tsx). Click and drag to fling.
- [x] **[UI/Engine] Time-of-day field backgrounds** -- DONE (2026-04-23). `useTimeOfDay` reads the local clock and picks one of six gradient presets (dawn/morning/noon/golden/dusk/night), applied as a class on `.field-stage`. Transitions with a 3s `background` ease.
- [x] **[UI] Caress heart particles** -- DONE (2026-04-23). 5 heart/sparkle emoji per caress, DOM-rendered over the field, animate up-and-out with drift + rotation, auto-cleanup after 1.5s.
- [ ] **[UX] Proper completion fireworks** -- The current completion burst is a hand-rolled DOM star fan. Upgrade to tsparticles `preset-confetti` or a custom emitter with particle trails for a real "you shipped it" moment.
- [ ] **[Perf] Pause physics when tab is hidden** -- Use `document.visibilitychange` to stop the Matter RAF loop when the user leaves the tab. Saves battery.
- [ ] **[A11y] Pixi accessibility module** -- Wire pixi.js's built-in accessibility system so screen readers can discover the canvas porings, not just the DOM tabs.

---

## Done

<!--
  Move completed items here with a date and brief note on how it was resolved.
  Format: - [x] **[Category] Short title** DONE (YYYY-MM-DD) -- Brief resolution note.
-->
