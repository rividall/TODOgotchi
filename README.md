# TODOgotchi

Hey there stranger!
This is a hobby project based on ideacritters.com by @koysun.
As part of my full-stack development self-teaching sprint, I wanted to expand on the original by adding more data fields, modes, animations, and user/guest accounts to practice back and front end architecture, design and development.

The critters! Feed them by working on them — add checklists, labels, descriptions — and watch them grow. When a critter is plump enough, act on it: ship the feature, book the tickets, cross it off.

## Tech Stack

| Layer       | Technology                                              |
| ----------- | ------------------------------------------------------- |
| Backend     | FastAPI (Python 3.11) + SQLAlchemy (async) + Alembic    |
| Frontend    | React 19 + TypeScript + Vite 6                          |
| Field engine | PixiJS 8 + @pixi/react 8 (WebGL) + Matter.js (physics) |
| UI motion   | GSAP 3 + @gsap/react (useGSAP hook)                     |
| Particles   | @tsparticles/react (ambient, lazy-loaded)               |
| Database    | PostgreSQL 16                                           |
| State       | React Context + local state (no external state lib)     |
| Auth        | JWT — access token (30 min) + refresh token (7 days)   |
| Deploy      | Docker Compose on cepelynvault, Cloudflare Tunnel       |

<!--
  Add rows as your stack grows. Examples:
  | Animation   | CSS keyframes + Framer Motion (poring movement)          |
  | Notifications | ntfy via Apprise (poring milestones)                  |
-->

## Server & Deployment

This project runs on the home server infrastructure documented in [docs/SERVER-INFRASTRUCTURE.md](docs/SERVER-INFRASTRUCTURE.md). Key deployment facts:

| Setting               | Value                                          |
| --------------------- | ---------------------------------------------- |
| Host machine          | cepelynvault                                   |
| Subdomain             | porings.buenalynch.com                         |
| Container port        | 3004 (frontend)                                |
| Backend port          | 8004 (internal)                                |
| DB port               | 5434 (host)                                    |
| Tunnel                | buenalynch (mini PC)                           |
| Compose file          | `./docker-compose.yml`                         |
| Data volumes          | `pgdata` (postgres data)                       |

<!--
  Check SERVER-INFRASTRUCTURE.md for the full port map before any deployment decision.
-->

**How traffic reaches this service:**
```
User browser
  → porings.buenalynch.com (Cloudflare DNS, CNAME → tunnel UUID ddb937a3-...)
  → Cloudflare edge (TLS termination)
  → Tunnel to cepelynvault
  → cloudflared forwards to localhost:3004
  → Docker frontend container (nginx) serves React app + proxies /api/ → backend:8000
```

## Project Structure

```
todogotchi/
├── backend/
│   ├── app/
│   │   ├── core/           # config, database, security
│   │   ├── models/         # Poring, User, ChecklistItem, Label, XPEvent
│   │   ├── routers/        # auth, porings, checklist, labels
│   │   ├── schemas/        # Pydantic request/response models
│   │   └── services/       # auth_service, xp_service
│   ├── alembic/            # DB migrations
│   ├── tests/
│   ├── requirements.txt
│   └── Dockerfile
├── frontend/
│   ├── src/
│   │   ├── api/            # client.ts (typed fetch wrapper + auth/porings/labels/checklist APIs)
│   │   ├── auth/           # AuthContext
│   │   ├── components/     # TaskPanel, ActModal, CompletedDrawer, CreatePoringButton, ChecklistSection, LabelPicker
│   │   ├── field/          # PixiJS engine: FieldStage, PoringOverlay, PoringTab, useFieldEngine, AmbientParticles,
│   │   │                   #   FieldDecorations (multi-world), useDinoSpritesheets (4 variants), HeartParticles
│   │   └── pages/          # FieldPage, LoginPage, RegisterPage
│   ├── index.html
│   ├── vite.config.ts
│   └── Dockerfile
├── docker-compose.yml
├── .env.example
└── docs/
    ├── SERVER-INFRASTRUCTURE.md  # Server topology, tunnels, domains, ports
    ├── API.md                    # Complete API endpoint reference
    ├── TODO.md                   # Future features & pending tasks
    ├── PROGRESS.md               # Implementation progress checklist
    ├── STYLEGUIDE.md             # Visual design cheatsheet
    └── research/                 # Package research, analysis & deployment guides
```

<!--
  Keep this tree updated as the project grows. This is the map.
-->

## Architecture Notes

- **Backend pattern**: Routers → Services → Models. Routers handle HTTP only. All business logic (XP accumulation, growth tier computation, auth) lives in services. Models define the schema.
- **XP system**: All XP mutations go through `services/xp_service.py` which writes an `XPEvent` row and updates the poring's `xp` field atomically. Never update `xp` directly in a router.
- **Growth tiers**: Computed from XP. Seed (0–9), Happy (10–29), Chubby (30–59), Ripe (60+). Tier is returned by the API — frontend picks the right visual based on it.
- **Poring positions**: NOT persisted. Client-side only — each poring is a Matter.js rigid body seeded at a random position when it enters the field, and Matter's physics loop drives the motion thereafter.
- **Field rendering**: PixiJS (WebGL) draws the poring sprites, ripe glow, and faces at 60 fps. A sibling DOM overlay layer absolutely-positions a `PoringTab` above each poring by reading body coords every frame via `requestAnimationFrame`. This hybrid canvas + DOM approach keeps labels crisp and accessible while the canvas does the heavy-lift rendering.
- **Dino variants**: Four sprite sheets (`vita`, `doux`, `mort`, `tard`) loaded via `useDinoSpritesheets()`. Poring ID modulo 4 picks the variant — deterministic and stable across sessions.
- **World system**: `WorldId` (`"forest" | "forest2" | "forest3"`) selectable from a header dropdown. Each world defines its own scatter/tree asset globs, tile scale, anchor, pixel-art flag, min-spacing, and CSS background. forest uses Kenney 512×512 isometric tiles; forest2/forest3 use 16×16 pixel-art tiles at 5× nearest-neighbor scale.
- **Top margin**: `FIELD_TOP_MARGIN = 48` (exported from `useFieldEngine`) pushes the top physics wall 48 px below the canvas edge so dinos and their floating tabs never disappear off the top.
- **Click flow**: Click a poring → its tab expands in place (Edit / Act / Delete buttons). Click "Edit" → the `TaskPanel` sidebar slides in. Click "Act" on a ripe poring (or click a ripe poring directly) → `ActModal` opens. Background click collapses any expanded tab.
- **UI motion**: GSAP drives the moments that need juice — tier-up flash on a Pixi container when a poring crosses a growth threshold (scale pop + elastic return), CTA glow in the TaskPanel, modal entrances.
- **Frontend pattern**: Feature-grouped under `src/components/`, `src/field/`, `src/pages/`. Auth context wraps the app and provides `user`, `token`, `login`, `logout`. See [docs/research/field-rendering-stack-analysis.md](docs/research/field-rendering-stack-analysis.md) for the rendering architecture rationale.
- **Auth flow**: Login returns `access_token` (30 min) + `refresh_token` (7 days). Client stores both in memory (not localStorage). Axios interceptor auto-refreshes on 401.
- **Database**: PostgreSQL 16 via `postgres:16-alpine` Docker container. Internal only — no host port exposed in production.
- **API**: All routes under `/api/v1/`.
- **Deployment**: Docker Compose on cepelynvault, exposed via Cloudflare Tunnel. No reverse proxy, no local SSL.

## Local Development

The preferred loop is **db + backend in Docker, frontend via Vite**. The [Makefile](Makefile) wraps both:

```bash
cp .env.example .env      # first time only
make dev                  # db + backend (detached) + Vite (foreground) on http://localhost:5173
make rebuild              # after backend or requirements.txt changes
make logs                 # follow backend logs
make down                 # stop everything (keeps pgdata)
make clean                # stop + wipe the dev database
make test                 # backend pytest suite
make help                 # full target list
```

On the server, just run everything inside Docker:

```bash
sudo docker compose up -d --build
```

## API Documentation

**Current Status:** 10 endpoints across 2 domains (Phase 1)

**Resources:**
- [API Reference](docs/API.md) - Complete endpoint list with examples
- [Swagger UI](http://localhost:8004/docs) - Interactive docs (when backend is running)

<!--
  Update the endpoint/domain count as the API grows.
-->

## Development Progress

See [docs/PROGRESS.md](docs/PROGRESS.md) for the full implementation checklist.

**Current status**:
- ✅ **Phase 1 done** — Auth + poring CRUD + field canvas
- ✅ **Phase 2 done** — Feeding & Growth: checklists, labels, tier-up animation
- ✅ **Phase 3 done** — Maturation & Act: act endpoint, ActModal, completion burst, completed drawer
- ✅ **Field engine rework done** — React 19, PixiJS WebGL canvas + Matter.js physics, DOM-overlay floating tabs, sidebar-only-on-edit, GSAP tier-up juice, tsparticles ambient atmosphere
- ✅ **Field art pass done** — Kenney Nature Kit decorations (scatter + edge trees), 4 dino sprite variants, multi-world system (forest / forest2 / forest3), per-world backgrounds + purple tint overlay, 48 px top safe zone
- ⬜ **Deployment phase not started** — Docker + tunnel + subdomain

## Documentation

All documentation starts on this README and lives in .md files for robustness. Your memory WILL fail, and AI WILL compress and forget certain stuff. That is why every step from research, architecture, structure, installation, development and deployment must absolutely live in the DOCS.

Before coding, read this and all documents. New library/package? Check docs/research/. New feature? Update PROGRESS.md and flag any open items to the user. Setup or deployment changes? Create or update a -deployment.md file in docs/research/. API change? Update API.md. UI changes? Follow STYLEGUIDE.md patterns. **Deploying to the server?** Read SERVER-INFRASTRUCTURE.md first.

- [SERVER-INFRASTRUCTURE.md](docs/SERVER-INFRASTRUCTURE.md) -- Server topology, tunnels, domains, containers, port map. **Read before any deployment decision.**
- [API.md](docs/API.md) -- Complete API endpoint reference
- [STYLEGUIDE.md](docs/STYLEGUIDE.md) -- Colors, typography, component patterns
- [PROGRESS.md](docs/PROGRESS.md) -- What's built, what's next. Go-to place to track all features developed and in development.
- [TODO.md](docs/TODO.md) -- Future features and pending tasks. All TODOs must be added here always, no questions asked.
- [Package Research Guide](docs/research/RESEARCH.md) -- Index of all research, analysis & deployment docs.

### After deploying a feature, update docs in this order:

1. **README.md** -- Tech Stack table, Project Structure tree, Architecture Notes, Development Progress, Server & Deployment table
2. **[PROGRESS.md](docs/PROGRESS.md)** -- Check off completed items, add new sub-items if needed
3. **[TODO.md](docs/TODO.md)** -- when finding TODOs already completed.
4. **[API.md](docs/API.md)** -- If endpoints were added, changed, or removed
5. **[SERVER-INFRASTRUCTURE.md](docs/SERVER-INFRASTRUCTURE.md)** -- If ports, subdomains, containers, tunnel ingress rules, or cron jobs changed
6. **[docs/research/RESEARCH.md](docs/research/RESEARCH.md)** -- If new analysis or deployment docs were created, update the tables
7. **Relevant deployment doc** in docs/research/ -- Update status, add known issues, troubleshooting

This is not optional. Context gets compressed, memory gets lost, sessions end. The docs are the only thing that survives. Update them before you consider a feature "done".

PS: Remember the mantra: "Every piece of code created must conform to the documentation and libraries we are using. Creating code without first looking at the libraries doc pages on their repos is super risky, and leads to spaghettification of code. Unacceptable and totally avoidable. Always read the docs!"
