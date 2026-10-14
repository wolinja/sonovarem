from sqlmodel import SQLModel

# Table models are added here as the build adds them, starting with the
# W1 migrations (w1_0001, w1_0002). Alembic reads SQLModel.metadata from this
# module, so every table model must be imported here.

__all__ = ["SQLModel"]
