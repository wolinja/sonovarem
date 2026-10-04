# Sonovarem: frontend

React, Vite and TypeScript, with TanStack Router and Query, Tailwind CSS and shadcn/ui. This becomes the farmer PWA (task T-006). Setup is in [../development.md](../development.md).

| Command (from the repository root) | What it does |
|---|---|
| `bun install` | Install dependencies |
| `bun run dev` | Vite dev server at <http://localhost:5173> |
| `bun run lint` | Biome check and fix |
| `bun run test` | Playwright tests (desktop and mobile viewports) |
| `bash scripts/generate-client.sh` | Regenerate `src/client/` from the backend OpenAPI schema |

`bun run build` (from `frontend/`) writes the production build to `backend/app/frontend/`, where FastAPI serves it. Set `VITE_API_URL` in `frontend/.env` to point the dev server at another API.
