from sqlalchemy import text

from app.api.deps import get_db


def test_get_db_yields_working_session() -> None:
    gen = get_db()
    session = next(gen)
    assert session.exec(text("SELECT 1")).one() == (1,)  # type: ignore[call-overload]
    gen.close()
