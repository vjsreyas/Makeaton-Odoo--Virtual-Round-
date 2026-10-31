"""notification retry scheduling

Revision ID: 0002
Revises: 0001
Create Date: 2026-10-31
"""
from typing import Sequence, Union

from alembic import op

revision: str = "0002"
down_revision: Union[str, None] = "0001"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.get_bind().exec_driver_sql("ALTER TABLE notifications ADD COLUMN next_attempt_at timestamptz")


def downgrade() -> None:
    op.get_bind().exec_driver_sql("ALTER TABLE notifications DROP COLUMN next_attempt_at")
