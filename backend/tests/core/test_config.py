from typing import Any

import pytest

from app.core.config import Settings

DB_URL = "postgresql://postgres:local-pw@localhost:5432/app"


def make_settings(**values: Any) -> Settings:
    return Settings.model_validate(
        {"SECRET_KEY": "k", "DATABASE_URL": DB_URL, **values}
    )


def test_database_url_uses_psycopg_driver() -> None:
    s = make_settings(DATABASE_URL="postgres://u:p@h:5432/app")
    assert str(s.DATABASE_URL).startswith("postgresql+psycopg://")


def test_default_secret_rejected_outside_development() -> None:
    with pytest.raises(ValueError, match="SECRET_KEY"):
        make_settings(SECRET_KEY="changethis", FASTAPI_ENV=None)


def test_default_db_password_rejected_outside_development() -> None:
    with pytest.raises(ValueError, match="DATABASE_URL password"):
        make_settings(
            DATABASE_URL="postgresql://postgres:changethis@localhost:5432/app",
            FASTAPI_ENV=None,
        )


def test_default_secret_only_warns_in_development() -> None:
    with pytest.warns(UserWarning, match="SECRET_KEY"):
        make_settings(SECRET_KEY="changethis", FASTAPI_ENV="development")
