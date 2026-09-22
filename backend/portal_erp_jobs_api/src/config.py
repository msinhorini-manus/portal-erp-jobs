"""
Configuration file for Portal ERP Jobs API.
"""
import os
import sqlite3
from datetime import timedelta

from dotenv import load_dotenv
from flask_sqlalchemy import SQLAlchemy
from sqlalchemy import event
from sqlalchemy.engine import Engine

load_dotenv()

BASE_DIR = os.path.abspath(os.path.dirname(os.path.dirname(__file__)))


def _required_secret(name: str) -> str:
    """Return a required secret or fail closed during application startup."""
    value = os.getenv(name, "").strip()
    if len(value) < 32:
        raise RuntimeError(f"{name} must be configured with at least 32 characters")
    return value


def _csv_env(name: str, default: str) -> list[str]:
    return [item.strip() for item in os.getenv(name, default).split(",") if item.strip()]


class Config:
    """Production-safe application configuration."""

    SECRET_KEY = _required_secret("SECRET_KEY")
    ENVIRONMENT = os.getenv("FLASK_ENV", "production")
    DEBUG = ENVIRONMENT == "development"

    db_path = os.path.join(BASE_DIR, "database", "app.db")
    os.makedirs(os.path.dirname(db_path), exist_ok=True)

    SQLALCHEMY_DATABASE_URI = os.getenv("DATABASE_URL", f"sqlite:///{db_path}")
    SQLALCHEMY_TRACK_MODIFICATIONS = False

    JWT_SECRET_KEY = _required_secret("JWT_SECRET_KEY")
    JWT_ACCESS_TOKEN_EXPIRES = timedelta(
        seconds=int(os.getenv("JWT_ACCESS_TOKEN_EXPIRES", 86400))
    )
    JWT_REFRESH_TOKEN_EXPIRES = timedelta(
        seconds=int(os.getenv("JWT_REFRESH_TOKEN_EXPIRES", 604800))
    )

    CORS_ORIGINS = _csv_env(
        "CORS_ORIGINS",
        "https://jobs.portalerp.com.br",
    )
    ALLOW_ADMIN_SETUP = os.getenv("ALLOW_ADMIN_SETUP", "false").lower() == "true"
    REGIONAL_ALLOW_DEVELOPMENT_FALLBACK = (
        ENVIRONMENT != "production"
        and os.getenv("REGIONAL_ALLOW_DEVELOPMENT_FALLBACK", "true").lower() == "true"
    )

    APP_NAME = os.getenv("APP_NAME", "Portal ERP Jobs")
    APP_VERSION = os.getenv("APP_VERSION", "1.0.1")


db = SQLAlchemy()


@event.listens_for(Engine, "connect")
def enable_sqlite_foreign_keys(dbapi_connection, _connection_record):
    """Ensure ORM foreign keys are enforced by every SQLite connection."""
    if isinstance(dbapi_connection, sqlite3.Connection):
        cursor = dbapi_connection.cursor()
        cursor.execute("PRAGMA foreign_keys=ON")
        cursor.close()
