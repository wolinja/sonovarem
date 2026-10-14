# Sonovarem: backend

FastAPI modular monolith (Python 3.14, SQLModel, Alembic, Postgres with pgvector, Redis). Setup, tests and migrations are in [../development.md](../development.md).

| Path | Contents |
|---|---|
| `app/main.py` | App factory; serves the built frontend when `app/frontend/` exists |
| `app/api/` | Routers (`routes/`) and shared dependencies (`deps.py`) |
| `app/core/` | Settings (`config.py`) and the database engine (`db.py`) |
| `app/models.py` | Table models; Alembic reads its metadata |
| `app/alembic/` | Migrations, starting at `w1_0001` |
| `tests/` | pytest suite |

Run commands from this directory with `uv run`, for example `uv run fastapi dev` or `uv run bash scripts/test.sh`.
