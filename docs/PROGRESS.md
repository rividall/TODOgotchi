# Implementation Progress

Multi-phase build plan for TODOgotchi. Each phase produces a runnable increment. ALL DEVELOPMENT MUST CONFORM WITH THE RELATED LIBRARIES AND DATABASE SCHEMES. ALWAYS SEARCH FOR THE PROPER DOCUMENTATION OF LIBRARIES AND READ THEM TO MAKE SURE THE CODE CONFORMS TO WHAT THE LIBRARIES EXPECT.

---

## Phase 1: The Field **DONE (2026-04-23)**

Minimum viable TODOgotchi. Auth works, porings can be created and listed, and the field canvas shows animated blobs. Clicking a poring opens a side panel where you can read and edit basic info.

### Backend
- [x] User model (`id`, `email`, `username`, `hashed_password`, `created_at`)
- [x] Poring model (`id`, `title`, `description`, `xp`, `status`, `action_type`, `user_id`, `created_at`, `updated_at`)
- [x] XPEvent model (`id`, `poring_id`, `event_type`, `xp_gained`, `created_at`)
- [x] Auth service: `register_user`, `authenticate_user`
- [x] Auth router: `POST /auth/register`, `POST /auth/login`, `POST /auth/refresh`, `GET /auth/me`
- [x] `get_current_user` dependency in `core/security.py`
- [x] XP service: `award_xp(db, poring, event_type)` — writes XPEvent + updates poring.xp atomically
- [x] Growth tier helper: `compute_tier(xp: int) -> str` (seed/happy/chubby/ripe)
- [x] Poring router: `GET /porings`, `POST /porings`, `GET /porings/{id}`, `PATCH /porings/{id}`, `DELETE /porings/{id}`
- [x] PATCH poring triggers +2 XP only when description value actually changes
- [x] Alembic migrations: `0001_create_users`, `0002_create_porings_and_xp_events`
- [x] Health endpoint returns `{"status": "healthy", "version": "0.1.0"}`
- [x] Backend tests: 18 passing (auth + porings + XP guards)

### Frontend
- [x] Auth context: `user`, in-memory access + refresh tokens, auto-refresh on 401, logout-on-failure
- [x] Login page (`/login`) and Register page (`/register`)
- [x] Protected route wrapper — redirects to `/login` if no user
- [x] Field page (`/`) — header, field body, task panel
- [x] `PoringBlob` component: seeded-random position from poring ID, CSS bounce, click handler, tier-based size/face/glow
- [x] `FieldCanvas` component: renders all porings, empty state
- [x] `TaskPanel` component: slide-in side panel, title + description inline edit, XP bar, delete
- [x] `CreatePoringButton` (floating FAB → mini form → `POST /porings`)
- [x] API client functions: `getPorings()`, `createPoring()`, `getPoring(id)`, `updatePoring(id, patch)`, `deletePoring(id)`
- [x] Auth API functions: `login()`, `register()`, `refreshToken()`, `getMe()`

### Outstanding for Phase 1
- [ ] **Manual UI smoke test in a browser** — verify register → create poring → edit description → watch tier flip. Backend + build are green; visual confirmation pending.

---

## Phase 2: Feeding & Growth **DONE (2026-04-23)**

The feeding mechanics. Working on a poring (adding checklists, labels, editing description) awards XP. Porings visually evolve through 4 growth tiers.

### Backend
- [x] ChecklistItem model (`id`, `poring_id`, `text`, `completed`, `order`, `created_at`)
- [x] Label model (`id`, `name`, `color`, `user_id`) with `uq_labels_user_name` constraint
- [x] `porings_labels` association table (`poring_id`, `label_id`)
- [x] Checklist router: `GET/POST/PATCH/DELETE /porings/{id}/checklist[/{item_id}]` (POST +3 XP, PATCH completed→true only awards +5 on transition)
- [x] Labels router: `GET/POST /labels`, `POST/DELETE /porings/{id}/labels/{label_id}` (attach +3 XP; attach is idempotent, detach keeps earned XP)
- [x] Alembic migrations: `0003_create_checklist_items`, `0004_create_labels`
- [x] `xp_service` already guards completed porings (Phase 1)
- [x] PoringOut now eager-loads `checklist` and `labels`
- [x] Backend tests: 32 passing (adds 7 checklist + 7 labels)

### Frontend
- [x] Growth tier visuals: 4 poring sizes/expressions driven by `growth_tier` (from Phase 1)
- [x] Animated tier transition (scale + drop-shadow flash when tier index increases)
- [x] TaskPanel: `ChecklistSection` with add/toggle/delete, 0-indexed `order` maintained by backend
- [x] TaskPanel: `LabelPicker` — chips for attached labels, dropdown of available, inline "create new" with color picker
- [x] XP bar + tier badge in TaskPanel (from Phase 1)
- [x] API client functions: checklist CRUD (`getChecklist`, `add`, `update`, `delete`), labels CRUD + attach/detach
- [x] `FieldPage` owns the user's label list and refreshes on creation so other porings see new labels immediately

---

## Field Engine Rework **DONE (2026-04-23)**

Replaces the CSS-animated DOM blobs with a WebGL field engine, floating DOM tabs, and a sidebar-only-on-edit flow. Rationale in [docs/research/field-rendering-stack-analysis.md](research/field-rendering-stack-analysis.md).

### Stack changes
- [x] React 18 → 19 upgrade (Vite 6 compatible; zero code changes required)
- [x] PixiJS 8 + @pixi/react 8 — WebGL canvas renderer
- [x] Matter.js 0.20 — rigid-body physics with per-tier restitution/mass
- [x] GSAP 3 + @gsap/react — tier-up flash + entrance pop-in on Pixi containers
- [x] tsparticles (slim + @tsparticles/react) — ambient pollen/firefly layer, lazy-loaded (~43 KB gzipped chunk)

### New frontend architecture
- [x] `src/field/useFieldEngine.ts` — owns the Matter engine, syncs porings ↔ bodies, steps physics in a rAF loop, keeps bodies from going stationary
- [x] `src/field/FieldStage.tsx` — Pixi `<Application>` with per-poring containers (shadow + body + eyes/smile + ripe glow pulse) positioned every tick from body coords; handles pointer events
- [x] `src/field/PoringOverlay.tsx` — DOM layer over the canvas, positions `PoringTab` elements imperatively each frame (no React re-renders per position update)
- [x] `src/field/PoringTab.tsx` — floating pill above each poring (title + tier dot + XP); click expands to show Edit / Act / Delete buttons
- [x] `src/field/AmbientParticles.tsx` — slow upward pollen particles for atmosphere
- [x] `FieldPage` click flow: click → expand tab; "Edit" button → sidebar; "Act" (or click ripe) → `ActModal`; background click → collapse

### Removed
- [x] `components/PoringBlob.tsx`, `components/FieldCanvas.tsx`, `components/CompletionBurst.tsx`, `components/poringPosition.ts` — replaced by the `field/` module
- [x] `@keyframes poring-bounce/pulse/wander/tier-up-flash` and the `.poring*` CSS — Pixi + GSAP handle this now

---

## Phase 3: Maturation & Act **DONE (2026-04-23)**

When a poring reaches Ripe tier (60+ XP), it pulses and glows. The user can then "act" on it — completing the underlying task with a specific action type. The poring pops into stars.

### Backend
- [x] Guard on `POST /porings/{poring_id}/act`: 400 if `xp < 60` or `status != "alive"`, 403 if not owner
- [x] Act endpoint sets `poring.status = "completed"`, `poring.action_type = body.action_type`
- [x] Action type enum: `shipped`, `booked`, `bought`, `done`, `abandoned` (declared in Phase 1 model, now wired)
- [x] Completed porings still returned by `GET /porings`; frontend splits alive vs completed
- [x] Backend tests: 39 passing total (adds 7 for act — ripe-gate, idempotency, XP-blocked-post-act, invalid action_type, cross-user 403, completed-in-list)

### Frontend
- [x] Ripe poring visual: pulsing glow (CSS from Phase 1 styleguide) + tier-up flash when it crosses the Ripe threshold (Phase 2)
- [x] `ActModal` — triggered on click of ripe poring, action-type picker with emoji cues + confirm
- [x] `CompletionBurst` — radial star + core flash overlay positioned at the poring's seeded coords; ~1.2s animation
- [x] `CompletedDrawer` — collapsible bottom-left panel listing completed porings in greyscale, click to reopen read-only TaskPanel
- [x] TaskPanel shows an "Act on this poring" CTA when the poring is ripe + alive; disables inputs on completed porings
- [x] API client: `actOnPoring(id, actionType)`

---

## Field Art Pass **DONE (2026-04-25)**

Visual polish pass on the field engine: dino sprite variants, multi-world decoration system, per-world backgrounds, and physics/layout improvements.

### Dino sprite variants
- [x] Generated PixiJS JSON sidecars for `doux`, `mort`, `tard` (same animation tags as `vita`: idle/move/kick/hurt/crouch/sneak)
- [x] `useDinoSpritesheets()` loads all 4 variants in parallel, each independently cached
- [x] `dinoVariantIndex(id)` assigns variant by `id % 4` — deterministic, stable across sessions
- [x] `playAnim()` looks up the correct sheet per poring ID via `dinoVariantIndex`

### Multi-world decoration system
- [x] `WorldId = "forest" | "forest2" | "forest3"` exported from `FieldDecorations.tsx`
- [x] Per-world `WorldConfig`: scatter/tree asset globs, `scatterScale`, `treeScale`, `anchorY`, `pixelArt` (nearest-neighbor scaling), `minSpacing` (collision avoidance between tiles)
- [x] `useDecorationTextures(world)` — caches per world, clears on switch
- [x] `generateDecorations` uses `canPlace()` + retry loop (up to 20 attempts per tile) to prevent overlapping tiles; `minSpacing: 90` for pixel-art worlds
- [x] World switcher `<select>` in the field header; `world` state lives in `FieldPage`
- [x] forest: Kenney 512×512 isometric tiles (scale 1.05 scatter, 0.8 trees, anchorY 0.62, no min spacing)
- [x] forest2: 16×16 pixel-art tiles (5× nearest-neighbor, anchorY 0.5, minSpacing 90)
- [x] forest3: 16×16 pixel-art tiles (same scale, `#84c669` background sampled from `tileCol_grass1.png`)

### Per-world backgrounds & tint
- [x] CSS world classes (`.field-stage-world-{world}`) override time-of-day background with `!important`
- [x] forest2: white background (`#ffffff`) + `.field-stage-world-forest2::after` purple tint overlay (`rgba(139,92,246,0.18)`, `pointer-events:none`, `z-index:10`)
- [x] forest3: grass green background (`#84c669`) — colour sampled from tile pixel
- [x] Background transition removed on world change (was mismatched with instant tile swap)

### Physics & layout improvements
- [x] `FIELD_TOP_MARGIN = 48` exported from `useFieldEngine` — top physics wall sits 48 px below canvas edge
- [x] Manual boundary reflection updated to use `FIELD_TOP_MARGIN` for top edge
- [x] Top-edge tree band shifted down by `FIELD_TOP_MARGIN` so trees don't clip above the safe zone
- [x] Shadow color changed to black (`0x000000`, alpha 0.35) — visible on all time-of-day backgrounds including night

### Ambient particles
- [x] Pollen speed reduced to `{ min: 0.09, max: 0.28 }` and `drift` removed — drift accumulated velocity each frame causing runaway speed over time

---

## Phase 5: Biomes & Creatures **NOT STARTED**

Adds a `world` dimension to labels — porings in a forest, cars in a city, spirits in a graveyard, etc. Each world has its own environment art, creature visuals, and ambient effects. Full architecture + rollout in [docs/research/multi-world-pipeline-analysis.md](research/multi-world-pipeline-analysis.md).

**Prerequisites:** single-world Forest needs to look visibly great via the [field-art-pipeline](research/field-art-pipeline-analysis.md) Tier 1 work first — don't start Phase 5 until the forest is polished.

### Backend (Phase 5A)
- [ ] Alembic migration `0005_add_label_world.py` — adds `labels.world` (String(32), nullable)
- [ ] Update `Label` model with `world` column
- [ ] Update `LabelCreate` + `LabelOut` schemas with `world: str | None`
- [ ] Backend tests covering `world` round-trip on create / list / update

### Frontend (Phase 5A — abstraction)
- [ ] `frontend/src/worlds/types.ts` — `WorldConfig` interface (ground, decorations, creature sprites, per-world physics, ambient)
- [ ] `frontend/src/worlds/registry.ts` — `WORLD_REGISTRY` dictionary
- [ ] `frontend/src/worlds/forest.ts` — first world config with current hardcoded values
- [ ] `frontend/src/worlds/resolve.ts` — `resolveWorld(poring, userDefault)` picks world from primary label
- [ ] Refactor `FieldStage` to accept `world: WorldConfig` prop
- [ ] Refactor `useFieldEngine` to accept per-world physics overrides per body
- [ ] `LabelPicker` adds a "World" dropdown populated from `WORLD_REGISTRY`

### Frontend (Phase 5B — forest asset integration)
- [ ] Scaffold `frontend/src/assets/worlds/forest/` — `ground/`, `decorations/`, `creatures/`, `README.md` with license credits
- [ ] Drop Kenney [Nature Kit](https://kenney.nl/assets/nature-kit) sprites in
- [ ] `FieldDecorations.tsx` — scatters `world.decorations` at seeded positions with shadows
- [ ] Ground `<pixiTilingSprite>` from `world.ground.texture`
- [ ] Extend `pixiExtend.ts` with `TilingSprite`
- [ ] GSAP sway tweens on decorations with `rotationSway > 0`
- [ ] Per-world ambient preset dispatch in `AmbientParticles.tsx`

### Frontend (Phase 5C — second world, Variant A selector)
- [ ] `frontend/src/worlds/city.ts` — city world config using Kenney [City Kit](https://kenney.nl/assets/city-kit-roads) + [Car Kit](https://kenney.nl/assets/car-kit)
- [ ] World-selector dropdown in `field-header` (All / Forest / City / ...)
- [ ] Lazy-load world asset modules via `import()` so only the active world's assets ship in the initial bundle
- [ ] Smooth transition when switching worlds (fade ground + swap decorations)

### Phase 5D — additional worlds (opportunistic)
- [ ] Graveyard ([Graveyard Kit](https://kenney.nl/assets/graveyard-kit))
- [ ] Dungeon ([Dungeon Kit](https://kenney.nl/assets/dungeon-kit))
- [ ] Space ([Space Kit](https://kenney.nl/assets/space-kit-2))
- [ ] Ocean ([Pirate Kit](https://kenney.nl/assets/pirate-kit) + aquatic sprites)

### Phase 5E — Variant B mixed "All Worlds" (optional)
- [ ] "All Worlds" entry in selector shows all porings simultaneously, each drawn as its world's creature
- [ ] Neutral shared ground + decoration mode
- [ ] Style-cohesion pass across all worlds

---

## Deployment Phase **DONE (2026-04-29)**

- [x] `docker-compose.yml` covers db + backend + frontend
- [x] `.env` created on server with real SECRET_KEY, POSTGRES_PASSWORD, ADMIN_API_KEY, ADMIN_EMAILS
- [x] CNAME record in Cloudflare DNS: `todogotchi.buenalynch.com` → tunnel UUID
- [x] Ingress rule in `/etc/cloudflared/config.yml` + cloudflared restarted
- [x] Verified at `https://todogotchi.buenalynch.com`
- [ ] Add HTTP monitor in Uptime Kuma (uptime.buenalynch.com) — pending

---

## Landing Page + Guest Mode **DONE (2026-04-29)**

- [x] `LandingPage` at `/` — full-screen Forest world with animated vita dino, "Join as guest" + "Log in" buttons
- [x] `LandingDino` — standalone PixiJS canvas with forest3 decorations, 3 companion dinos
- [x] Guest mode — in-memory store (`src/guest/store.ts`) with 4 real preset critters, full XP/tier/checklist/label interactions, nothing persisted; sessionStorage-backed flag survives HMR
- [x] `ProtectedRoute` allows guests; `AuthContext` adds `isGuest` + `enterGuestMode()`
- [x] Register page replaced with "account creation closed" message

---

## Workspace System **DONE (2026-04-29)**

- [x] `workspaces` table + `user_workspaces` junction (migration 0006)
- [x] `workspace_id` on `users` and `porings`
- [x] All poring operations (list, create, edit, delete, act, checklist, labels) scoped to workspace
- [x] Users with no workspace see an empty field
- [x] Labels scoped to workspace (not per-user) — migration 0007

---

## Admin API **DONE (2026-04-29)**

- [x] `X-Admin-Key` auth (env var `ADMIN_API_KEY`) — machine-to-machine, no JWT
- [x] `GET/POST/DELETE /admin/users` — list, create, delete users
- [x] `GET/POST/DELETE /admin/workspaces` — list, create, delete workspaces
- [x] `POST/DELETE /admin/workspaces/{id}/members` — add/remove members by email
- [x] nginx proxy updated to forward `/admin/` to backend
- [x] `ADMIN_EMAILS` env var grants in-app moderation button to listed emails

---

## Feedback System **DONE (2026-04-29)**

- [x] `feedback` table (migration 0005): `message`, `email` (nullable, store-only), `created_at`
- [x] `GET /api/v1/feedback` + `POST /api/v1/feedback` — public, no auth
- [x] `GET /admin/feedback` + `DELETE /admin/feedback/{id}` — X-Admin-Key only
- [x] `FeedbackModal` — floating "💬 Leave feedback" button on guest field, comment list + form
- [x] `AdminPage` at `/admin` — moderation UI with emails visible, delete button

---

## Space World **DONE (2026-04-29)**

- [x] 4 ship PNG variants (`ship1_blue`, `ship2_orange`, `ship3_orange`, `ship4_red`) loaded via `useSpaceAssets`
- [x] Ships rotate each tick to face velocity direction (`Math.atan2(vx, -vy)`)
- [x] 6 meteor/asteroid variants scattered freely; each spins at random speed/direction per tick
- [x] Star-grid background (`black.png` tiled to cover entire canvas)
- [x] Dark background `#0b0c1a`; no shadow ellipse; ambient particles static (don't drift)

---

## Graveyard World **DONE (2026-04-29)**

- [x] 5 character variants (`death`, `devil`, `pumpkin`, `skel`, `zombie`) loaded as frame sequences via `useGraveyardCreatures` — compatible with `DinoSpritesheet` interface
- [x] Variant count variable (`id % activeSheets.length`) — supports any count, not hardcoded to 4
- [x] Paired trees (`tree1`/`tree2`) stacked with exact edge alignment
- [x] Graves (`grave`, `grave2`) scattered in 30–70% center zone, independent of tile collision
- [x] Ground tiles (`tile_0019`, `tile_0039`, `tile_0129`) scattered across interior
- [x] Purple background `#a386ce` (sampled from `base.png`)
- [x] Creature y-offset `-20px` so shadow falls at feet, not behind body

---

## Asset Loading Reliability **DONE (2026-04-29)**

Fixes intermittent "missing dinos" on landing + field. Root cause: `@pixi/react`'s reconciler cannot retroactively add `pixiAnimatedSprite` children to an already-mounted `Application` when their textures resolve from `null` to non-`null`. On localhost, StrictMode + cached disk assets masked the race; on production network latency exposed it.

- [x] `preloadDinoSpritesheets()` invoked at module level in [main.tsx](../frontend/src/main.tsx) so all 4 dino variants start downloading on every page load (landing or field)
- [x] `LandingDino` gates the `<Application>` on **all four** sheets being loaded (was only gating on vita — companions silently dropped if their fetches lost the race)
- [x] `FieldStage` gates the `<Application>` on `creaturesReady` (every active-world sheet loaded) for the same reason
- [x] `<Application>` is keyed on `world` so changing worlds cleanly remounts instead of trying to swap textures on existing sprites

---

## Landing World Picker **PARTIAL (2026-04-29)**

Generalized landing scene infrastructure landed but visual tuning is incomplete; picker is hidden. See TODO `[UI] Landing world picker`.

- [x] [LandingDino.tsx](../frontend/src/field/LandingDino.tsx) accepts a `world: WorldId` prop and dispatches to dino sheets / graveyard sheets / ship textures with per-world creature scales
- [x] Non-Forest worlds reuse the shared `generateDecorations` (paired graves/trees, grid ground, scatter2)
- [x] Asteroid spin loop kept in the landing scene for Space
- [ ] Re-expose the `<select>` and tune big/small scales + companion offsets per world, then ship

---

## Auth Rate Limiting **DONE (2026-05-01)**

- [x] `slowapi` (in-memory) wired into [main.py](../backend/app/main.py) — limiter on `app.state`, `RateLimitExceeded` handler, `SlowAPIMiddleware` registered
- [x] Custom `key_func` in [core/rate_limit.py](../backend/app/core/rate_limit.py) reads `CF-Connecting-IP` first, then `X-Forwarded-For`, then direct client IP — required because Cloudflare Tunnel hides the real client behind the egress IP
- [x] `POST /api/v1/auth/login` and `POST /api/v1/auth/register` limited to **5/minute per client IP**; `/auth/refresh` left unlimited (already gated by valid refresh token)
- [x] Tests disable the limiter via `limiter.enabled = False` in `conftest.py`
