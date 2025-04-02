"""add initial garment

Revision ID: 002
Revises: 001
Create Date: 2025-02-05 10:30:00.000000

"""
from alembic import op
import sqlalchemy as sa
from datetime import date

# revision identifiers, used by Alembic.
revision = '002'
down_revision = '001'
branch_labels = None
depends_on = None

def upgrade():
    op.execute(
        """
        INSERT INTO garments (
            name, category, color, brand, size, 
            purchase_date, purchase_price, status,
            condition
        ) VALUES (
            'Dickies Model 573', 
            'bottoms', 
            'Black', 
            'Dickies', 
            '32/32',
            CURRENT_DATE,
            59.99,
            'active',
            'new'
        )
        """
    )

def downgrade():
    op.execute("DELETE FROM garments WHERE name = 'Dickies Model 573'")
