"""
Shared test configuration: override the database with an in-memory SQLite
instance so tests never touch the production database.

Uses a shared-cache in-memory DB so all connections see the same tables.
"""
import pytest
from sqlalchemy import create_engine, event
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from app.database import Base, get_db
from app.main import app

# Shared in-memory SQLite engine for tests.
# StaticPool + check_same_thread=False ensures a single shared connection
# across all threads, so create_all and API sessions see the same tables.
_test_engine = create_engine(
    "sqlite://",
    connect_args={"check_same_thread": False},
    poolclass=StaticPool,
)
_TestSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=_test_engine)


def _override_get_db():
    db = _TestSessionLocal()
    try:
        yield db
    finally:
        db.close()


# Override the get_db dependency globally for all tests
app.dependency_overrides[get_db] = _override_get_db


@pytest.fixture(autouse=True)
def _setup_test_db():
    """Create all tables before each test and drop them after."""
    Base.metadata.create_all(bind=_test_engine)
    yield
    Base.metadata.drop_all(bind=_test_engine)
