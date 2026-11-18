"""Add the regional editorial email-template center.

Revision ID: 20261118_13
Revises: 20261111_12

This migration is additive. It does not seed templates, activate a site, add
an event/outbox, or modify any existing row/table outside the new center.
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = "20261118_13"
down_revision: Union[str, None] = "20261111_12"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def _install_immutability_guards(bind):
    if bind.dialect.name == "sqlite":
        op.execute(
            """
            CREATE TRIGGER email_template_versions_no_update
            BEFORE UPDATE ON email_template_versions
            BEGIN
                SELECT RAISE(ABORT, 'email_template_versions is immutable');
            END
            """
        )
        op.execute(
            """
            CREATE TRIGGER email_template_versions_no_delete
            BEFORE DELETE ON email_template_versions
            BEGIN
                SELECT RAISE(ABORT, 'email_template_versions is immutable');
            END
            """
        )
    elif bind.dialect.name == "postgresql":
        op.execute(
            """
            CREATE FUNCTION email_template_versions_immutable() RETURNS trigger
            LANGUAGE plpgsql AS $$
            BEGIN
                RAISE EXCEPTION 'email_template_versions is immutable';
            END;
            $$
            """
        )
        op.execute(
            """
            CREATE TRIGGER email_template_versions_no_update
            BEFORE UPDATE OR DELETE ON email_template_versions
            FOR EACH ROW EXECUTE FUNCTION email_template_versions_immutable()
            """
        )


def _remove_immutability_guards(bind):
    if bind.dialect.name == "sqlite":
        op.execute("DROP TRIGGER IF EXISTS email_template_versions_no_delete")
        op.execute("DROP TRIGGER IF EXISTS email_template_versions_no_update")
    elif bind.dialect.name == "postgresql":
        op.execute(
            "DROP TRIGGER IF EXISTS email_template_versions_no_update ON email_template_versions"
        )
        op.execute("DROP FUNCTION IF EXISTS email_template_versions_immutable()")


def upgrade() -> None:
    bind = op.get_bind()
    if bind.dialect.name not in {"sqlite", "postgresql"}:
        raise RuntimeError("Email template center requires SQLite or PostgreSQL")

    op.create_table(
        "email_templates",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("site_id", sa.Integer(), nullable=False),
        sa.Column("locale", sa.String(length=35), nullable=False),
        sa.Column("key", sa.String(length=120), nullable=False),
        sa.Column("event", sa.String(length=120), nullable=False),
        sa.Column("audience", sa.String(length=80), nullable=False),
        sa.Column("country_code", sa.String(length=2), nullable=True),
        sa.Column("is_inactive", sa.Boolean(), nullable=False, server_default=sa.false()),
        sa.Column("revision", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("draft_name", sa.String(length=255), nullable=True),
        sa.Column("draft_subject", sa.String(length=255), nullable=True),
        sa.Column("draft_html", sa.Text(), nullable=True),
        sa.Column("draft_text", sa.Text(), nullable=True),
        sa.Column("created_at", sa.DateTime(), nullable=False, server_default=sa.func.current_timestamp()),
        sa.Column("updated_at", sa.DateTime(), nullable=False, server_default=sa.func.current_timestamp()),
        sa.Column("updated_by_admin_id", sa.Integer(), nullable=True),
        sa.ForeignKeyConstraint(["site_id"], ["sites.id"], ondelete="RESTRICT"),
        sa.ForeignKeyConstraint(["updated_by_admin_id"], ["admins.id"], ondelete="SET NULL"),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("site_id", "locale", "key", name="uq_email_templates_site_locale_key"),
    )
    op.create_index("ix_email_templates_site_id", "email_templates", ["site_id"])
    op.create_index("ix_email_templates_site_updated", "email_templates", ["site_id", "updated_at"])
    op.create_index("ix_email_templates_site_locale", "email_templates", ["site_id", "locale"])

    op.create_table(
        "email_template_versions",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("template_id", sa.Integer(), nullable=False),
        sa.Column("version", sa.Integer(), nullable=False),
        sa.Column("name", sa.String(length=255), nullable=False),
        sa.Column("subject", sa.String(length=255), nullable=False),
        sa.Column("html", sa.Text(), nullable=False),
        sa.Column("text", sa.Text(), nullable=False),
        sa.Column("source_revision", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("published_at", sa.DateTime(), nullable=False, server_default=sa.func.current_timestamp()),
        sa.Column("author_admin_id", sa.Integer(), nullable=True),
        sa.ForeignKeyConstraint(["author_admin_id"], ["admins.id"], ondelete="SET NULL"),
        sa.ForeignKeyConstraint(["template_id"], ["email_templates.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("template_id", "version", name="uq_email_template_versions_template_version"),
    )
    op.create_index("ix_email_template_versions_template_id", "email_template_versions", ["template_id"])
    op.create_index(
        "ix_email_template_versions_template_published",
        "email_template_versions",
        ["template_id", "published_at"],
    )
    _install_immutability_guards(bind)


def downgrade() -> None:
    bind = op.get_bind()
    _remove_immutability_guards(bind)
    op.drop_index("ix_email_template_versions_template_published", table_name="email_template_versions")
    op.drop_index("ix_email_template_versions_template_id", table_name="email_template_versions")
    op.drop_table("email_template_versions")
    op.drop_index("ix_email_templates_site_locale", table_name="email_templates")
    op.drop_index("ix_email_templates_site_updated", table_name="email_templates")
    op.drop_index("ix_email_templates_site_id", table_name="email_templates")
    op.drop_table("email_templates")
