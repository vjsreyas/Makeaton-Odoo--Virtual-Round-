"""user email verification marker

Revision ID: 0003
Revises: 0002
Create Date: 2026-10-31
"""
from typing import Sequence, Union

from alembic import op

revision: str = "0003"
down_revision: Union[str, None] = "0002"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.get_bind().exec_driver_sql("ALTER TABLE users ADD COLUMN email_verified_at timestamptz")


def downgrade() -> None:
    op.get_bind().exec_driver_sql("ALTER TABLE users DROP COLUMN email_verified_at")
