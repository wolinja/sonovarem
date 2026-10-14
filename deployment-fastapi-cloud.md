# Sonovarem: FastAPI Cloud deployment

This deploys the backend and the built frontend as one app on [FastAPI Cloud](https://fastapicloud.com/docs/), with Postgres on Neon. The primary host is still the Hetzner VPS ([deployment-docker-compose.md](deployment-docker-compose.md), ADR-12).

## How it fits the project

| Concern | Docker Compose | FastAPI Cloud |
|---|---|---|
| App directory | image built from `backend/Dockerfile` | `backend/` is uploaded; entrypoint from `[tool.fastapi]` in `backend/pyproject.toml` |
| Frontend | built inside the image | built before deploy into `backend/app/frontend/`, served by `app.frontend()` |
| Dependencies | `uv sync` from the root `uv.lock` | `backend/pylock.toml`, exported from the root `uv.lock` before deploy |
| Database | `pgvector/pgvector` container | Neon (Neon integration), `CREATE EXTENSION vector` when the first pgvector migration lands |
| Migrations | `scripts/prestart.sh` | run from CI (or your machine) before `fastapi deploy` |
| Redis | container | not set up yet; add the Redis integration when the app starts using Redis |

`backend/.fastapicloudignore` re-includes the Git-ignored `app/frontend/` and `pylock.toml`, and leaves out tests and Docker files.

## One-time setup

1. Log in and create the app from `backend/`:

   ```bash
   cd backend
   uv run fastapi login
   uv run fastapi deploy   # first run creates the app and writes .fastapicloud/ (Git-ignored)
   ```

   The first deploy fails at startup until the variables below are set. That is expected.

2. Connect Postgres. In the FastAPI Cloud dashboard, open **Integrations > Neon**, connect your Neon account, then link a Neon database to the app. It is stored as the secret `DATABASE_URL`, the name `app/core/config.py` reads. The settings switch `postgresql://` to the psycopg driver.

3. Set the other variables:

   ```bash
   uv run fastapi cloud env set SECRET_KEY "$(python -c 'import secrets; print(secrets.token_urlsafe(32))')" --secret
   uv run fastapi cloud env set PROJECT_NAME Sonovarem
   uv run fastapi cloud env set FRONTEND_HOST https://<app>.fastapicloud.dev
   uv run fastapi cloud env set SENTRY_DSN <dsn>          # optional
   ```

   Never set `FASTAPI_ENV` on FastAPI Cloud. It turns the `changethis` secret check into a warning.

4. For CI, run `uv run fastapi cloud setup-ci --secrets-only` (it uses the `gh` CLI). It creates a deploy token and sets `FASTAPI_CLOUD_TOKEN` and `FASTAPI_CLOUD_APP_ID` as repository secrets without writing its own workflow. Then add the remaining secrets listed under [Deploy with GitHub Actions](#deploy-with-github-actions).

## Deploy by hand

From the repository root:

```bash
bun install && bun run --filter frontend build
uv export --frozen --package app --no-dev --no-emit-workspace --format pylock.toml -o backend/pylock.toml
cd backend
DATABASE_URL=<neon-url> SECRET_KEY=<key> uv run alembic upgrade head
uv run fastapi deploy
```

Rebuild the frontend before every deploy. FastAPI Cloud does not run frontend builds.

## Deploy with GitHub Actions

`.github/workflows/deploy-fastapi-cloud.yml` runs the steps above when triggered by hand from the **Actions** tab. The job runs in the GitHub environment `fastapi-cloud`, which you create under **Settings > Environments**. The secrets can be repository or environment secrets:

| Name | Notes |
|---|---|
| `FASTAPI_CLOUD_TOKEN` | Deploy token |
| `FASTAPI_CLOUD_APP_ID` | From `backend/.fastapicloud/cloud.json` or the dashboard |
| `DATABASE_URL` | Same Neon connection string as the app, used for migrations |
| `SECRET_KEY` | Same value as the app; the settings require it to load |

## Migrations

FastAPI Cloud replaces instances gradually, so old and new code briefly share the database. The workflow migrates before deploying, which is safe for additive changes. To remove a column or table, first deploy code that no longer uses it, then migrate in a later run.

## URLs

| What | URL |
|---|---|
| Application and API | `https://<app>.fastapicloud.dev` (or a custom domain) |
| API docs | `/docs` |
| Logs | `uv run fastapi cloud logs` |
