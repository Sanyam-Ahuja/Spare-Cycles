"""add is_assembly to chunks

Revision ID: b3c1d2e4f5a6
Revises: 8a6e84cf92c1
Create Date: 2026-10-15 10:00:00.000000
"""
from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

# revision identifiers, used by Alembic.
revision: str = 'b3c1d2e4f5a6'
down_revision: Union[str, None] = '8a6e84cf92c1'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # 1 for the node-side assembly chunk of a multi-node render, 0 otherwise.
    op.add_column(
        'chunks',
        sa.Column('is_assembly', sa.Integer(), nullable=False, server_default='0'),
    )


def downgrade() -> None:
    op.drop_column('chunks', 'is_assembly')
