"""Database configuration and session management.

Uses SQLite (file-based) so the app runs anywhere without external services.
The DB path can be overridden with the TODO_DB_PATH environment variable,
which is handy for platforms that mount a persistent volume.

For a non-SQLite DB (e.g. PostgreSQL), set TODO_DATABASE_URL to a full
SQLAlchemy URL. We deliberately use our own env var (not DATABASE_URL) to
avoid clashing with other apps that might share the environment.
"""
import os
from pathlib import Path

from sqlalchemy import create_engine
from sqlalchemy.orm import declarative_base, sessionmaker

# Default location: a "data" folder next to the app, created on demand.
_DEFAULT_DB_DIR = Path(__file__).resolve().parent.parent / "data"
_DEFAULT_DB_DIR.mkdir(parents=True, exist_ok=True)
_DB_PATH = os.getenv("TODO_DB_PATH", str(_DEFAULT_DB_DIR / "todo.db"))

# Build the SQLAlchemy URL. Prefer an explicit URL if provided, otherwise SQLite.
_DATABASE_URL = os.getenv("TODO_DATABASE_URL", f"sqlite:///{_DB_PATH}")

# check_same_thread=False is required because FastAPI serves requests in a
# thread pool while we share a single engine across the app.
_connect_args = {"check_same_thread": False} if _DATABASE_URL.startswith("sqlite") else {}

engine = create_engine(_DATABASE_URL, connect_args=_connect_args)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()


def get_db():
    """FastAPI dependency that yields a database session per request."""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def init_db() -> None:
    """Create tables if they don't exist yet."""
    # Import here to avoid circular imports: models import Base from this module.
    from app import models  # noqa: F401

    Base.metadata.create_all(bind=engine)
