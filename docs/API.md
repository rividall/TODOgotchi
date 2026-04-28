# API Reference

**Base URL (local):** `http://localhost:8004/api/v1`
**Base URL (production):** `https://porings.buenalynch.com/api/v1`

**Interactive Documentation:** When running the backend, visit [http://localhost:8004/docs](http://localhost:8004/docs) for Swagger UI with live API testing.

---

## Overview

poringField API is a RESTful API built with FastAPI. All routes are prefixed with `/api/v1/`.

**Current Status:** 20 endpoints across 5 domains (Phases 1–3, implemented 2026-04-23)

**Authentication:** Most endpoints require authentication via `Authorization: Bearer <token>` header. Public endpoints are marked with 🌐.

**Deployment:** This API runs as a Docker container on `cepelynvault`, exposed via Cloudflare Tunnel at `porings.buenalynch.com`. See [SERVER-INFRASTRUCTURE.md](SERVER-INFRASTRUCTURE.md) for the full traffic flow.

---

## Table of Contents

1. [Health](#health) - Health check
2. [Auth](#auth-apiv1auth) - Authentication & account management
3. [Porings](#porings-apiv1porings) - Poring CRUD (Phase 1)
4. [Checklist](#checklist-apiv1poringsidichecklist) - Checklist items per poring (Phase 2)
5. [Labels](#labels-apiv1labels) - Label management (Phase 2)
6. [Actions](#actions-apiv1poringsidact) - Maturation & completion (Phase 3)

---

## Health

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| `GET`  | `/health` | Health check | 🌐 Public |

**Response:**
```json
{ "status": "healthy", "version": "0.1.0" }
```

---

## Auth (`/api/v1/auth`)

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| `POST` | `/auth/register` | Create a new account | 🌐 Public |
| `POST` | `/auth/login` | Login, get tokens | 🌐 Public |
| `POST` | `/auth/refresh` | Refresh access token | 🌐 Public |
| `GET`  | `/auth/me` | Get current user | Required |

**Register:**
```bash
POST /api/v1/auth/register
{ "email": "user@example.com", "username": "mark", "password": "secret" }

# Response 201:
{ "access_token": "eyJ...", "refresh_token": "eyJ..." }
```

**Login:**
```bash
POST /api/v1/auth/login
{ "email": "user@example.com", "password": "secret" }

# Response 200:
{ "access_token": "eyJ...", "refresh_token": "eyJ..." }
```

**Me:**
```bash
GET /api/v1/auth/me
Authorization: Bearer <access_token>

# Response 200:
{ "id": 1, "email": "user@example.com", "username": "mark", "created_at": "2026-04-22T..." }
```

### JWT Tokens
- **Access Token:** 30 minutes, used in `Authorization: Bearer` header
- **Refresh Token:** 7 days, sent to `/auth/refresh` to get a new access token

---

## Porings (`/api/v1/porings`)

The core domain. Each poring is a task/blob.

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| `GET`  | `/porings` | List all porings for current user | Required |
| `POST` | `/porings` | Create a new poring | Required |
| `GET`  | `/porings/{id}` | Get poring detail (incl. checklist + labels) | Required |
| `PATCH`| `/porings/{id}` | Update poring title or description (+2 XP when description value changes) | Required |
| `DELETE`| `/porings/{id}` | Delete poring | Required |

**Poring object:**
```json
{
  "id": 1,
  "title": "Build poringField",
  "description": "A tamagotchi task manager",
  "xp": 22,
  "growth_tier": "happy",
  "status": "alive",
  "action_type": null,
  "labels": [],
  "checklist": [],
  "created_at": "2026-04-22T10:00:00Z",
  "updated_at": "2026-04-22T10:30:00Z"
}
```

**Growth tiers (computed from xp):**
- `seed` — 0–9 XP
- `happy` — 10–29 XP
- `chubby` — 30–59 XP
- `ripe` — 60+ XP (ready to act)

**Create poring:**
```bash
POST /api/v1/porings
Authorization: Bearer <token>
{ "title": "Plan Iceland trip" }

# Response 201: Poring object
```

**Update poring (triggers +2 XP only when description value actually changes; +0 for title-only or no-op description):**
```bash
PATCH /api/v1/porings/1
Authorization: Bearer <token>
{ "description": "Flights in June, 10 days" }

# Response 200: Updated poring object
```

---

## Checklist (`/api/v1/porings/{id}/checklist`)

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| `GET`  | `/porings/{id}/checklist` | List checklist items (ordered by `order` asc) | Required |
| `POST` | `/porings/{id}/checklist` | Add checklist item (+3 XP; `order` auto-assigned) | Required |
| `PATCH`| `/porings/{id}/checklist/{item_id}` | Update item; +5 XP **only on `completed` transitioning false→true** | Required |
| `DELETE`| `/porings/{id}/checklist/{item_id}` | Delete checklist item | Required |

All checklist writes are rejected with `400` if the poring is in `completed` status.

**ChecklistItem object:**
```json
{ "id": 1, "poring_id": 1, "text": "Book flights", "completed": false, "order": 0 }
```

---

## Labels (`/api/v1/labels`)

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| `GET`  | `/labels` | List all labels for current user (alphabetical by name) | Required |
| `POST` | `/labels` | Create a label; `409` on duplicate `name` per user | Required |
| `POST` | `/porings/{id}/labels/{label_id}` | Attach label to poring (+3 XP; idempotent — re-attaching a label already on the poring does not award XP) | Required |
| `DELETE`| `/porings/{id}/labels/{label_id}` | Detach label from poring (keeps earned XP) | Required |

Label `color` must be a 7-character hex string matching `#RRGGBB` (422 otherwise). Labels are scoped per user — attaching another user's label returns `403`.

**Label object:**
```json
{ "id": 1, "name": "Software", "color": "#FF6B6B" }
```

---

## Actions (`/api/v1/porings/{id}/act`)

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| `POST` | `/porings/{id}/act` | Act on a ripe poring (complete it) | Required |

**Guards:**
- `400` with `"Poring must be ripe to act — needs 60 XP, has <n>"` if `xp < 60`
- `400` with `"Poring has already been acted on"` if `status != "alive"`
- `403` if the poring belongs to another user
- `422` on an invalid `action_type`

Post-act, the poring's `status` is `completed` and its `action_type` is set. Per the XP service guard, no further XP events can be awarded — checklist/label/description writes on a completed poring all return `400`.

**Act on poring:**
```bash
POST /api/v1/porings/1/act
Authorization: Bearer <token>
{ "action_type": "shipped" }

# action_type options: "shipped", "booked", "bought", "done", "abandoned"
# Response 200: Poring object with status="completed", action_type="shipped"
```

---

## Error Responses

All error responses follow this format:

```json
{ "detail": "Error message here" }
```

**Common Status Codes:**
- `200 OK` - Success
- `201 Created` - Resource created
- `400 Bad Request` - Invalid input (e.g. poring not ripe enough to act)
- `401 Unauthorized` - Missing or invalid token
- `403 Forbidden` - Poring belongs to another user
- `404 Not Found` - Poring/item not found
- `422 Unprocessable Entity` - Validation error
- `500 Internal Server Error` - Server error

---

## Future Endpoints (Planned)

See [PROGRESS.md](PROGRESS.md) for upcoming API features by phase.

---

**Last Updated:** 2026-04-23
**API Version:** v1
