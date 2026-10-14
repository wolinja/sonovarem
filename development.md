# Sonovarem: development

The repository holds a FastAPI backend (`backend/`) and a React, Vite and TypeScript frontend (`frontend/`). Both start from the Full Stack FastAPI Template, with its users, items and email login removed. Features are added from the build plan (P1-07); the target layout (`app/`, `ai/`, `langgw/`, `web/`, `evals/`, `tools/iot-sim`, `deploy/`) arrives with task T-153.

## Requirements

- [Docker](https://www.docker.com/) with Compose
- [uv](https://docs.astral.sh/uv/) for Python
- [Bun](https://bun.sh/) for the frontend

## The `.env` file

The backend and Compose read settings from `.env` at the repository root. It is git-ignored; never commit it. Create it from the tracked template and replace each `changethis` with a local-only value:

```bash
cp .env.example .env
```

Generate random values with `python -c 'import secrets; print(secrets.token_urlsafe(32))'`. Outside development, the backend refuses to start if a secret is still `changethis`.

## Local development

Start Postgres (with pgvector) and Redis:

```bash
docker compose up -d db redis
```

From `backend/`, install the dependencies, run the migrations and start the API:

```bash
uv sync
uv run bash scripts/prestart.sh
uv run fastapi dev
```

In another terminal, from the repository root, start the frontend:

```bash
bun install
bun run dev
```

| What | URL |
|---|---|
| Frontend (Vite) | <http://localhost:5173> |
| API | <http://localhost:8000> |
| API docs | <http://localhost:8000/docs> |

The Vite server calls the API at the URL in `frontend/.env` (`VITE_API_URL`). Create it with `cp frontend/.env.example frontend/.env`.

## Full stack in Docker Compose

```bash
docker compose run --rm backend bash scripts/prestart.sh
docker compose watch
```

The backend image builds the frontend and serves it at <http://localhost:8000>. The Traefik dashboard is at <http://localhost:8090>. Stop any local `fastapi dev` first, since both use port 8000.

| File | Purpose |
|---|---|
| `compose.yml` | Shared services: Traefik, Postgres + pgvector, Redis, backend |
| `compose.override.yml` | Local settings: published ports, source sync, reloads, Playwright. Loaded automatically |
| `compose.deploy.yml` | Server settings: HTTPS and certificates. Combined explicitly with `compose.yml` when deploying |

## Tests

```bash
cd backend && uv run bash scripts/test.sh     # pytest with coverage
cd frontend && bunx playwright test            # browser tests, desktop and mobile viewports
```

## Database migrations

Tables are created only by Alembic migrations. Add table models to `backend/app/models.py`, then from `backend/`:

```bash
uv run alembic revision --autogenerate -m "w1_0001 <what changed>"
uv run alembic upgrade head
```

Review every generated migration before committing it.

## API client

After any backend change that affects the OpenAPI schema, regenerate the frontend client from the repository root and commit the result:

```bash
bash scripts/generate-client.sh
```

## Pre-commit hooks

The project uses [prek](https://prek.j178.dev/) (a pre-commit replacement) for ruff, mypy, ty, biome, typos, zizmor and client generation. Install the Git hook once:

```bash
uv run prek install -f
```

Run all hooks by hand with `uv run prek run --all-files`.
