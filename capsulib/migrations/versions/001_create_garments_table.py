"""create garments table

Revision ID: 001
Revises: 
Create Date: 2025-02-05 10:00:00.000000

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision = '001'
down_revision = None
branch_labels = None
depends_on = None

def upgrade():
    op.create_table(
        'garments',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('name', sa.String(255), nullable=False),
        sa.Column('category', sa.Enum('tops', 'bottoms', 'dresses', 'outerwear', 'shoes', 'accessories', name='garmentcategory'), nullable=False),
        sa.Column('color', sa.String(50), nullable=False),
        sa.Column('brand', sa.String(100), nullable=False),
        sa.Column('size', sa.String(50), nullable=False),
        sa.Column('purchase_date', sa.Date(), nullable=False),
        sa.Column('purchase_price', sa.Numeric(10, 2), nullable=False),
        sa.Column('status', sa.Enum('active', 'archived', 'donated', 'sold', name='garmentstatus'), nullable=False, server_default='active'),
        sa.Column('care_instructions', sa.Text()),
        sa.Column('material_composition', sa.Text()),
        sa.Column('condition', sa.Enum('new', 'good', 'fair', 'poor', name='garmentcondition')),
        sa.Column('notes', sa.Text()),
        sa.Column('tags', postgresql.ARRAY(sa.String())),
        sa.Column('created_at', sa.Date(), server_default=sa.text('CURRENT_DATE'), nullable=False),
        sa.Column('updated_at', sa.Date(), server_default=sa.text('CURRENT_DATE')),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_garments_id'), 'garments', ['id'], unique=False)

def downgrade():
    op.drop_index(op.f('ix_garments_id'), table_name='garments')
    op.drop_table('garments')
