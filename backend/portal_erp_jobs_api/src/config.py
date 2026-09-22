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
        seconds=int(os.getenv("JWT_ACCESS_TOKEN_EXPIRES", 900))
    )
    JWT_REFRESH_TOKEN_EXPIRES = timedelta(
        seconds=int(os.getenv("JWT_REFRESH_TOKEN_EXPIRES", 604800))
    )

    EMAIL_PROVIDER = os.getenv("EMAIL_PROVIDER", "").strip().lower()
    EMAIL_FROM = os.getenv("EMAIL_FROM", "").strip()
    SMTP_HOST = os.getenv("SMTP_HOST", "").strip()
    SMTP_PORT = int(os.getenv("SMTP_PORT", "587"))
    SMTP_USERNAME = os.getenv("SMTP_USERNAME", "").strip()
    SMTP_PASSWORD = os.getenv("SMTP_PASSWORD", "")
    SMTP_USE_TLS = os.getenv("SMTP_USE_TLS", "true").lower() == "true"
    SMTP_USE_SSL = os.getenv("SMTP_USE_SSL", "false").lower() == "true"
    RESEND_API_KEY = os.getenv("RESEND_API_KEY", "").strip()

    AUTH_LOGIN_RATE_LIMIT = int(os.getenv("AUTH_LOGIN_RATE_LIMIT", "10"))
    AUTH_LOGIN_RATE_WINDOW = int(os.getenv("AUTH_LOGIN_RATE_WINDOW", "900"))
    AUTH_FORGOT_RATE_LIMIT = int(os.getenv("AUTH_FORGOT_RATE_LIMIT", "5"))
    AUTH_FORGOT_RATE_WINDOW = int(os.getenv("AUTH_FORGOT_RATE_WINDOW", "3600"))
    AUTH_RESET_RATE_LIMIT = int(os.getenv("AUTH_RESET_RATE_LIMIT", "10"))
    AUTH_RESET_RATE_WINDOW = int(os.getenv("AUTH_RESET_RATE_WINDOW", "3600"))

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
