# Sonovarem: deployment

Sonovarem runs with Docker Compose on one Hetzner VPS, behind Traefik and Cloudflare (`spec/architecture.md` §1). This page covers the current Compose deployment. The full server setup (firewall to Cloudflare ranges, Traefik middlewares, image registry, rollback) is tasks T-156 and T-158.

## Preparation

- The VPS has Docker Engine installed.
- A DNS record in Cloudflare points the application domain at the VPS.

## Configuration

Set these on the server, or as repository variables and secrets for the GitHub Actions workflow:

| Name | Kind | Notes |
|---|---|---|
| `DOMAIN` | variable | Application domain |
| `PROJECT_NAME` | variable | Defaults to `Sonovarem` |
| `SENTRY_DSN` | variable | Optional |
| `POSTGRES_PASSWORD` | secret | Random, at least 32 characters |
| `SECRET_KEY` | secret | Random, at least 32 characters |

Generate secrets with `python -c 'import secrets; print(secrets.token_urlsafe(32))'`. Never put deployment secrets in `.env` or in the repository.

## Deploy by hand

Copy the code to the server, excluding Git-ignored files:

```bash
rsync -av --exclude=".git/" --filter=":- .gitignore" ./ deploy@<server>:/srv/sonovarem/
```

Then on the server:

```bash
cd /srv/sonovarem
docker compose -f compose.yml -f compose.deploy.yml build
docker compose -f compose.yml -f compose.deploy.yml run --rm backend bash scripts/prestart.sh
docker compose -f compose.yml -f compose.deploy.yml up -d
```

Listing both files leaves out the local settings in `compose.override.yml`. The backend image builds the frontend, so the server does not need Bun.

## Deploy with GitHub Actions

`.github/workflows/deploy-docker-compose.yml` runs the same commands on a self-hosted runner on the VPS when triggered by hand from the **Actions** tab. Add the variables and secrets above under **Settings > Secrets and variables > Actions**.

To install the runner, create a dedicated user with Docker access (`sudo adduser github && sudo usermod -aG docker github`), then follow **Settings > Actions > Runners > New self-hosted runner** and install it as a service with `sudo ./svc.sh install github && sudo ./svc.sh start`. Only use a self-hosted runner while the repository's contributors and workflows are trusted.

## URLs

| What | URL |
|---|---|
| Application and API | `https://<DOMAIN>` |
| API docs | `https://<DOMAIN>/docs` |
