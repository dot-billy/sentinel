"""add is_admin to users

Revision ID: a9cdbeb3b608
Revises: e9095fc45959
Create Date: 2026-03-28 23:55:28.637628

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision: str = 'a9cdbeb3b608'
down_revision: Union[str, None] = 'e9095fc45959'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column('users', sa.Column('is_admin', sa.Boolean(), server_default='false', nullable=False))
    # Set all existing users as admin (they were created via create_admin.py)
    op.execute("UPDATE users SET is_admin = true")


def downgrade() -> None:
    op.drop_column('users', 'is_admin')
