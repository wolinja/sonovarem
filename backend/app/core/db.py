from sqlmodel import create_engine

from app.core.config import settings

# Tables are created by Alembic migrations, never with SQLModel.metadata.create_all
engine = create_engine(str(settings.DATABASE_URL), pool_pre_ping=True)
