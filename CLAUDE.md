# Sentinel

Lightweight monitoring and alerting dashboard. Remote machines run check scripts that POST results to a central API. Alerts are evaluated inline and surfaced on a dashboard.

## Stack

- **Backend:** FastAPI + async SQLAlchemy + Postgres 17 (Python 3.12)
- **Frontend:** Next.js 16 + React 19 + TypeScript + shadcn/ui + Tailwind CSS 4
- **Auth:** JWT (HS256) + Argon2 password hashing (admin UI), SHA-256 API keys (ingest)
- **Infrastructure:** Docker Compose

## Ports

| Service | Host Port | Container Port |
|---------|-----------|----------------|
| Frontend | 3020 | 3000 |
| Backend | 8020 | 8000 |
| Database | internal | 5432 |

## Directory Structure

```
backend/app/
├── api/routes/     # auth, ingest, dashboard, hosts, checks, alerts, api_keys
├── core/           # config, security (argon2+JWT+API key hashing)
├── models/         # user, host, check, check_result, alert, api_key
├── schemas/        # Pydantic schemas per resource
├── services/       # ingest (core logic), users, slug
└── db/             # AsyncSession setup

frontend/src/
├── app/            # (auth)/login, dashboard/{hosts/[id], alerts, settings}
├── components/     # ui/ (shadcn), status-badge
└── lib/            # api.ts, auth.tsx (context+hooks), utils.ts

examples/checks/    # Bash check scripts for remote boxes
```

## Architecture

### Two Auth Mechanisms
1. **JWT (admin UI):** Login via email/password, token in localStorage, protects CRUD endpoints
2. **API Key (ingest):** X-API-Key header, SHA-256 hashed, used by remote check scripts

### Core Flow
1. Remote box runs check script on cron
2. Script POSTs to `/api/v1/ingest` with API key
3. Backend auto-creates host/check if new, stores result
4. Alert evaluation: creates/resolves alerts on status transitions
5. Dashboard polls every 30s for fresh data

### Stale Detection
Computed at query time: checks not heard from in `STALE_THRESHOLD_MINUTES` (default 5) are reported as "unknown".

## Key Commands

- **Start:** `docker compose up -d`
- **Rebuild:** `docker compose up --build`
- **Create admin:** `docker compose exec backend python scripts/create_admin.py`
- **Migrations:** `docker compose exec backend alembic revision --autogenerate -m "desc"` then `alembic upgrade head`
- **API docs:** http://localhost:8020/docs

## Environment Variables

See `.env.example`: SENTINEL_ENV, JWT_SECRET, DATABASE_URL, FRONTEND_ORIGIN, STALE_THRESHOLD_MINUTES, RESULT_RETENTION_COUNT, NEXT_PUBLIC_API_BASE_URL

## API Endpoints

### Ingest (API Key auth)
- `POST /api/v1/ingest` — receive check result

### Admin (JWT auth)
- `POST /api/auth/login` — login
- `GET /api/auth/me` — current user
- `GET /api/v1/dashboard/summary` — aggregate stats
- `GET /api/v1/hosts` — list hosts
- `GET /api/v1/hosts/{id}` — host detail with checks
- `PATCH /api/v1/hosts/{id}` — update host
- `DELETE /api/v1/hosts/{id}` — delete host
- `GET /api/v1/checks` — list checks (filterable)
- `GET /api/v1/checks/{id}/results` — check result history
- `GET /api/v1/alerts` — list alerts
- `POST /api/v1/alerts/{id}/acknowledge` — acknowledge alert
- `POST /api/v1/alerts/{id}/resolve` — resolve alert
- `GET /api/v1/api-keys` — list API keys
- `POST /api/v1/api-keys` — create API key
- `DELETE /api/v1/api-keys/{id}` — deactivate API key
