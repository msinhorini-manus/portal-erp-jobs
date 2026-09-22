"""add regional site context

Revision ID: 20260922_02
Revises: 20260922_01
Create Date: 2026-09-22 16:09:30
"""
from datetime import datetime
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = "20260922_02"
down_revision: Union[str, None] = "20260922_01"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


SITES = [
    ("BR", "Brasil", "BR", "pt-BR", "BRL", "America/Sao_Paulo", "https://jobs.portalerp.com.br", True),
    ("MX", "México", "MX", "es-MX", "MXN", "America/Mexico_City", None, False),
    ("AR", "Argentina", "AR", "es-AR", "ARS", "America/Argentina/Buenos_Aires", None, False),
    ("CO", "Colômbia", "CO", "es-CO", "COP", "America/Bogota", None, False),
    ("CL", "Chile", "CL", "es-CL", "CLP", "America/Santiago", None, False),
    ("PE", "Peru", "PE", "es-PE", "PEN", "America/Lima", None, False),
    ("EC", "Equador", "EC", "es-EC", "USD", "America/Guayaquil", None, False),
    ("ES", "Espanha", "ES", "es-ES", "EUR", "Europe/Madrid", None, False),
    ("PT", "Portugal", "PT", "pt-PT", "EUR", "Europe/Lisbon", None, False),
    ("US", "Estados Unidos", "US", "en-US", "USD", "America/New_York", None, False),
    ("CA", "Canadá", "CA", "en-CA", "CAD", "America/Toronto", None, False),
    ("AU", "Austrália", "AU", "en-AU", "AUD", "Australia/Sydney", None, False),
]


def upgrade() -> None:
    op.create_table(
        "sites",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("code", sa.String(length=10), nullable=False),
        sa.Column("name", sa.String(length=100), nullable=False),
        sa.Column("country_code", sa.String(length=2), nullable=False),
        sa.Column("default_locale", sa.String(length=35), nullable=False),
        sa.Column("currency_code", sa.String(length=3), nullable=False),
        sa.Column("timezone", sa.String(length=64), nullable=False),
        sa.Column("canonical_origin", sa.String(length=255), nullable=True),
        sa.Column("is_active", sa.Boolean(), nullable=False, server_default=sa.false()),
        sa.Column("activated_at", sa.DateTime(), nullable=True),
        sa.Column("created_at", sa.DateTime(), nullable=False),
        sa.Column("updated_at", sa.DateTime(), nullable=False),
        sa.CheckConstraint("length(country_code) = 2", name="ck_sites_country_code_length"),
        sa.CheckConstraint("length(currency_code) = 3", name="ck_sites_currency_code_length"),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("code"),
    )
    op.create_index("ix_sites_code", "sites", ["code"], unique=True)
    op.create_index("ix_sites_is_active", "sites", ["is_active"], unique=False)

    op.create_table(
        "site_domains",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("site_id", sa.Integer(), nullable=False),
        sa.Column("hostname", sa.String(length=253), nullable=False),
        sa.Column("url_prefix", sa.String(length=64), nullable=False, server_default=""),
        sa.Column("is_primary", sa.Boolean(), nullable=False, server_default=sa.false()),
        sa.Column("is_active", sa.Boolean(), nullable=False, server_default=sa.true()),
        sa.Column("created_at", sa.DateTime(), nullable=False),
        sa.Column("updated_at", sa.DateTime(), nullable=False),
        sa.ForeignKeyConstraint(["site_id"], ["sites.id"], ondelete="RESTRICT"),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("hostname"),
        sa.UniqueConstraint("site_id", "url_prefix", name="uq_site_domain_prefix"),
    )
    op.create_index("ix_site_domains_hostname", "site_domains", ["hostname"], unique=True)
    op.create_index("ix_site_domains_site_id", "site_domains", ["site_id"], unique=False)
    op.create_index(
        "uq_site_domains_primary",
        "site_domains",
        ["site_id"],
        unique=True,
        sqlite_where=sa.text("is_primary = 1"),
        postgresql_where=sa.text("is_primary = true"),
    )

    op.create_table(
        "site_locales",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("site_id", sa.Integer(), nullable=False),
        sa.Column("locale", sa.String(length=35), nullable=False),
        sa.Column("is_default", sa.Boolean(), nullable=False, server_default=sa.false()),
        sa.Column("is_active", sa.Boolean(), nullable=False, server_default=sa.true()),
        sa.Column("created_at", sa.DateTime(), nullable=False),
        sa.Column("updated_at", sa.DateTime(), nullable=False),
        sa.ForeignKeyConstraint(["site_id"], ["sites.id"], ondelete="RESTRICT"),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("site_id", "locale", name="uq_site_locale"),
    )
    op.create_index("ix_site_locales_site_id", "site_locales", ["site_id"], unique=False)
    op.create_index(
        "uq_site_locales_default",
        "site_locales",
        ["site_id"],
        unique=True,
        sqlite_where=sa.text("is_default = 1"),
        postgresql_where=sa.text("is_default = true"),
    )

    connection = op.get_bind()
    now = datetime.utcnow()
    sites_table = sa.table(
        "sites",
        sa.column("code", sa.String),
        sa.column("name", sa.String),
        sa.column("country_code", sa.String),
        sa.column("default_locale", sa.String),
        sa.column("currency_code", sa.String),
        sa.column("timezone", sa.String),
        sa.column("canonical_origin", sa.String),
        sa.column("is_active", sa.Boolean),
        sa.column("activated_at", sa.DateTime),
        sa.column("created_at", sa.DateTime),
        sa.column("updated_at", sa.DateTime),
    )
    connection.execute(
        sites_table.insert(),
        [
            {
                "code": code,
                "name": name,
                "country_code": country,
                "default_locale": locale,
                "currency_code": currency,
                "timezone": timezone,
                "canonical_origin": origin,
                "is_active": active,
                "activated_at": now if active else None,
                "created_at": now,
                "updated_at": now,
            }
            for code, name, country, locale, currency, timezone, origin, active in SITES
        ],
    )

    site_ids = dict(connection.execute(sa.text("SELECT code, id FROM sites")).all())
    locales_table = sa.table(
        "site_locales",
        sa.column("site_id", sa.Integer),
        sa.column("locale", sa.String),
        sa.column("is_default", sa.Boolean),
        sa.column("is_active", sa.Boolean),
        sa.column("created_at", sa.DateTime),
        sa.column("updated_at", sa.DateTime),
    )
    connection.execute(
        locales_table.insert(),
        [
            {
                "site_id": site_ids[code],
                "locale": locale,
                "is_default": True,
                "is_active": True,
                "created_at": now,
                "updated_at": now,
            }
            for code, _name, _country, locale, _currency, _timezone, _origin, _active in SITES
        ],
    )

    domains_table = sa.table(
        "site_domains",
        sa.column("site_id", sa.Integer),
        sa.column("hostname", sa.String),
        sa.column("url_prefix", sa.String),
        sa.column("is_primary", sa.Boolean),
        sa.column("is_active", sa.Boolean),
        sa.column("created_at", sa.DateTime),
        sa.column("updated_at", sa.DateTime),
    )
    connection.execute(
        domains_table.insert(),
        [
            {
                "site_id": site_ids["BR"],
                "hostname": "jobs.portalerp.com.br",
                "url_prefix": "",
                "is_primary": True,
                "is_active": True,
                "created_at": now,
                "updated_at": now,
            }
        ],
    )

    with op.batch_alter_table("jobs") as batch_op:
        batch_op.add_column(sa.Column("site_id", sa.Integer(), nullable=True))
        batch_op.create_foreign_key(
            "fk_jobs_site_id_sites",
            "sites",
            ["site_id"],
            ["id"],
            ondelete="RESTRICT",
        )

    connection.execute(
        sa.text("UPDATE jobs SET site_id = :br_id WHERE site_id IS NULL"),
        {"br_id": site_ids["BR"]},
    )

    with op.batch_alter_table("jobs") as batch_op:
        batch_op.alter_column("site_id", existing_type=sa.Integer(), nullable=False)
        batch_op.create_index("ix_jobs_site_id", ["site_id"], unique=False)


def downgrade() -> None:
    with op.batch_alter_table("jobs") as batch_op:
        batch_op.drop_index("ix_jobs_site_id")
        batch_op.drop_constraint("fk_jobs_site_id_sites", type_="foreignkey")
        batch_op.drop_column("site_id")

    op.drop_index("uq_site_locales_default", table_name="site_locales")
    op.drop_index("ix_site_locales_site_id", table_name="site_locales")
    op.drop_table("site_locales")

    op.drop_index("uq_site_domains_primary", table_name="site_domains")
    op.drop_index("ix_site_domains_site_id", table_name="site_domains")
    op.drop_index("ix_site_domains_hostname", table_name="site_domains")
    op.drop_table("site_domains")

    op.drop_index("ix_sites_is_active", table_name="sites")
    op.drop_index("ix_sites_code", table_name="sites")
    op.drop_table("sites")
