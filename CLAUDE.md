# poringField -- Claude Code Instructions

## Before ANY Task

Read these docs in order before writing code:

1. **README.md** -- Tech stack, project structure, architecture, doc update checklist
2. **docs/SERVER-INFRASTRUCTURE.md** -- This app's ports, subdomain, container names. **Read this before making ANY deployment, networking, or Docker decision.**
3. **docs/TODO.md** -- Known issues & technical notes
4. **docs/PROGRESS.md** -- What's built, what's in progress
5. **docs/research/RESEARCH.md** -- Index of all research, analysis & deployment docs

For feature-specific context, check the relevant docs linked from RESEARCH.md.

## Reference Implementation

**todoTrack** (at `../todoTrack/` relative to this project) is the closest sibling project and shares the same auth pattern, backend structure, and Docker setup. When implementing auth, user model, JWT handling, or anything you're unsure about architecturally, read that project's code first. Specifically:

- `../todoTrack/backend/app/core/security.py` — `get_current_user`, token helpers
- `../todoTrack/backend/app/routers/auth.py` — register/login/refresh/me endpoints
- `../todoTrack/backend/app/services/auth_service.py` — `authenticate_user`, `register_user`
- `../todoTrack/backend/app/models/user.py` — User model structure
- `../todoTrack/docker-compose.yml` — Docker Compose pattern to follow

Do not copy code blindly — poringField has different models (Poring, XPEvent, ChecklistItem) — but use todoTrack as the reference for the auth plumbing and project structure.

## Rules

- **Read official docs first.** Before using any package, library, or tool -- read its official documentation. Not your training data, not your memory. The actual docs.
- **docs/TODO.md is where all todos live.** Update all TODOS and keep them here to work on them after finishing a main task.
- **Follow STYLEGUIDE.md** for all UI changes -- colors, typography, component patterns.
- **Follow API.md conventions** for all endpoint changes.
- **New package?** Follow the 3-stage pipeline in docs/research/RESEARCH.md: Research -> Analysis doc -> Deployment doc.
- **Do NOT run git commands** (commit, push, etc.) unless the user explicitly asks.

### Server & Deployment Rules

- **When giving a docker command always add sudo** for docker build, docker compose, etc.
- **No reverse proxy in containers.** Cloudflare Tunnel handles all ingress. Do NOT add nginx/Caddy/Traefik in front of services. See SERVER-INFRASTRUCTURE.md for the traffic flow.
- **No SSL certificates.** Cloudflare terminates TLS at the edge. Do NOT install certbot, Let's Encrypt, or generate local certs.
- **No exposed ports to the internet.** All web traffic goes through Cloudflare Tunnels.
- **New subdomain = 3 steps.** (1) Add CNAME in Cloudflare DNS pointing to tunnel UUID, (2) Add ingress rule in `/etc/cloudflared/config.yml`, (3) Restart cloudflared. Document the chosen port in SERVER-INFRASTRUCTURE.md.
- **Pick a port that doesn't conflict.** Before assigning a port to a new service, check docs/SERVER-INFRASTRUCTURE.md for ports already in use.
- **Docker Compose per project.** Each project gets its own `docker-compose.yml` in its repo root.

### poringField-Specific Rules

- **XP is sacred.** All XP mutations MUST go through `services/xp_service.py`. Never patch `poring.xp` directly in a router. The XP event log is the source of truth.
- **Growth tier is computed, not stored.** Compute it from `xp` every time: Seed (0–9), Happy (10–29), Chubby (30–59), Ripe (60+). Return it in every poring response.
- **Poring positions are client-side only.** Do NOT add position/x/y fields to the Poring model. The field canvas computes positions from the poring ID using a seeded random.
- **TypeScript strict mode is on.** No `any` types, ever. If you need to type something dynamic, define a proper interface.
- **All XP values must be non-negative integers.** Validate this at the service layer.
- **Checklist items have an `order` field** (integer, 0-indexed) for future drag-and-drop reordering. Always maintain it.
- **A poring with status `completed` must not receive XP events.** Guard this in `xp_service.py`.
- **All auth-protected endpoints use `Depends(get_current_user)`.** No exceptions.
- **XP event types are a fixed enum** (defined in `models/xp_event.py`). Do not invent new event types in routers -- add them to the enum first.

## After Completing a Feature

Follow the 7-step doc update checklist in README.md:

1. **README.md** -- Tech Stack, Project Structure, Architecture Notes, Development Progress
2. **PROGRESS.md** -- Check off completed items
3. **TODO.md** -- When finding TODOs already completed
4. **API.md** -- If endpoints were added, changed, or removed
5. **SERVER-INFRASTRUCTURE.md** -- If ports, subdomains, containers, or tunnel config changed
6. **docs/research/RESEARCH.md** -- If new analysis or deployment docs were created
7. **Relevant deployment doc** in docs/research/ -- Update status, known issues

This is not optional. Do it before considering a feature "done".
