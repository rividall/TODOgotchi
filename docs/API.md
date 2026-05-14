# API Reference

**Base URL (local):** `http://localhost:8004`
**Base URL (production):** `https://todogotchi.buenalynch.com`

**Interactive Documentation:** When running the backend, visit [http://localhost:8004/docs](http://localhost:8004/docs) for Swagger UI with live API testing.

---

## Overview

TODOgotchi API is a RESTful API built with FastAPI.

- User-facing routes: `/api/v1/`
- Admin routes: `/admin/` (require `X-Admin-Key` header, not Bearer)

**Current Status:** 35+ endpoints across 8 domains

**Authentication:**
- Most endpoints require `Authorization: Bearer <access_token>`
- Public endpoints marked with 🌐
- Admin endpoints use `X-Admin-Key: <ADMIN_API_KEY>` instead of Bearer — set in `.env`

**Scoping:** All porings and labels are scoped to the user's **workspace**. Users with no workspace see an empty field.

**Deployment:** Docker on `cepelynvault`, exposed via Cloudflare Tunnel at `todogotchi.buenalynch.com`. nginx proxies `/api/` and `/admin/` to the backend container.

---

## Table of Contents

1. [Health](#health)
2. [Auth](#auth-apiv1auth)
3. [Porings](#porings-apiv1porings)
4. [Checklist](#checklist-apiv1poringsidichecklist)
5. [Labels](#labels-apiv1labels)
6. [Actions](#actions-apiv1poringsidact)
7. [Feedback](#feedback-apiv1feedback) — public comments
8. [Admin — Users](#admin--users-adminusers)
9. [Admin — Workspaces](#admin--workspaces-adminworkspaces)
10. [Admin — Feedback](#admin--feedback-adminfeedback)

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
| `POST` | `/auth/register` | Create a new account | 🌐 Public · 5/min per IP |
| `POST` | `/auth/login` | Login, get tokens | 🌐 Public · 5/min per IP |
| `POST` | `/auth/refresh` | Refresh access token | 🌐 Public |
| `GET`  | `/auth/me` | Get current user | Required |

**Rate limiting:** `/auth/login` and `/auth/register` are limited to **5 requests per minute per client IP** (slowapi, in-memory). Exceeded requests return `429 Too Many Requests`. The real client IP is read from `CF-Connecting-IP` (Cloudflare Tunnel) with `X-Forwarded-For` as fallback.

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
{ "id": 1, "email": "user@example.com", "username": "mark", "created_at": "2026-04-22T...", "is_admin": false }
```
`is_admin` is `true` if the user's email is in `ADMIN_EMAILS` env var.

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
  "title": "Build TODOgotchi",
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

## Actions (`/api/v1/porings/{id}/act` and `/complete`)

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| `POST` | `/porings/{id}/act` | Act on a ripe poring (complete it) | Required |
| `POST` | `/porings/{id}/complete` | Mark a poring done early (no XP requirement, no action_type) | Required |

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

**Complete early (skip ripening):**
```bash
POST /api/v1/porings/1/complete
Authorization: Bearer <token>
{}

# Response 200: Poring object with status="completed", action_type=null
# Guards: 400 if already completed; 403 if not in your workspace.
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

---

## Feedback (`/api/v1/feedback`)

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| `GET` | `/api/v1/feedback` | List last 50 comments (message + timestamp, no email) | 🌐 Public |
| `POST` | `/api/v1/feedback` | Submit a comment | 🌐 Public |

```bash
POST /api/v1/feedback
{ "message": "Love this!", "email": "optional@example.com" }
# email is stored but never returned publicly
```

---

## Admin — Users (`/admin/users`)

All admin endpoints require `X-Admin-Key: <ADMIN_API_KEY>` header.

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/admin/users` | List all users with workspace info |
| `POST` | `/admin/users` | Create user, optionally assign workspace |
| `DELETE` | `/admin/users/{id}` | Delete user (cascades porings etc.) |

```bash
POST /admin/users
X-Admin-Key: <key>
{ "email": "alice@example.com", "username": "alice", "password": "pass123", "workspace_id": 1 }
```

---

## Admin — Workspaces (`/admin/workspaces`)

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/admin/workspaces` | List all workspaces with member lists |
| `POST` | `/admin/workspaces` | Create workspace |
| `DELETE` | `/admin/workspaces/{id}` | Delete workspace |
| `POST` | `/admin/workspaces/{id}/members` | Add member by email |
| `DELETE` | `/admin/workspaces/{id}/members/{user_id}` | Remove member |

```bash
# Typical new-user workflow:
curl -X POST https://todogotchi.buenalynch.com/admin/workspaces \
  -H "X-Admin-Key: $KEY" -H "Content-Type: application/json" \
  -d '{"name":"My Team"}'

curl -X POST https://todogotchi.buenalynch.com/admin/users \
  -H "X-Admin-Key: $KEY" -H "Content-Type: application/json" \
  -d '{"email":"user@example.com","username":"user","password":"pass","workspace_id":1}'
```

---

## Admin — Feedback (`/admin/feedback`)

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/admin/feedback` | List ALL feedback including emails |
| `DELETE` | `/admin/feedback/{id}` | Delete a comment |

---

## Database Schema

### `workspaces`
| Column | Type | Notes |
|--------|------|-------|
| `id` | integer PK | |
| `name` | varchar(100) | |
| `created_at` | timestamptz | |

### `user_workspaces`
| Column | Type | Notes |
|--------|------|-------|
| `user_id` | integer FK → users.id | composite PK |
| `workspace_id` | integer FK → workspaces.id | composite PK |

### `users`
| Column | Type | Notes |
|--------|------|-------|
| `id` | integer PK | |
| `email` | varchar(255) unique | |
| `username` | varchar(64) unique | |
| `hashed_password` | varchar(255) | bcrypt — never returned |
| `workspace_id` | integer FK → workspaces.id nullable | active workspace |
| `created_at` | timestamptz | |

### `porings`
| Column | Type | Notes |
|--------|------|-------|
| `id` | integer PK | |
| `user_id` | integer FK → users.id | creator (audit trail) |
| `workspace_id` | integer FK → workspaces.id nullable | scope — all workspace members can edit |
| `title` | varchar(200) | |
| `description` | text nullable | |
| `xp` | integer | ≥ 0 |
| `status` | enum | `alive` / `completed` |
| `action_type` | enum nullable | `shipped` / `booked` / `bought` / `done` / `abandoned` |
| `created_at` | timestamptz | |
| `updated_at` | timestamptz | |

### `labels`
| Column | Type | Notes |
|--------|------|-------|
| `id` | integer PK | |
| `workspace_id` | integer FK → workspaces.id nullable | shared across whole workspace |
| `name` | varchar(64) | unique per workspace |
| `color` | varchar(7) | `#RRGGBB` |

### `feedback`
| Column | Type | Notes |
|--------|------|-------|
| `id` | integer PK | |
| `message` | text | max 1000 chars |
| `email` | varchar(200) nullable | store-only, never returned to public |
| `created_at` | timestamptz | |

---

**Last Updated:** 2026-04-29
**API Version:** v1

