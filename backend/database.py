from sqlalchemy import create_engine, Column, Integer, String, DateTime, ForeignKey, Table
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker, relationship
import datetime
import os

# Create database directory if it doesn't exist
os.makedirs("db", exist_ok=True)

# Create SQLite database engine
SQLALCHEMY_DATABASE_URL = "sqlite:///./db/capsulib.db"
engine = create_engine(SQLALCHEMY_DATABASE_URL, connect_args={"check_same_thread": False})

# Create session factory
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

# Create base class for models
Base = declarative_base()

# Association table for item colors (many-to-many)
item_colors = Table(
    "item_colors",
    Base.metadata,
    Column("item_id", Integer, ForeignKey("items.id")),
    Column("color_id", Integer, ForeignKey("colors.id")),
)

class Color(Base):
    __tablename__ = "colors"
    
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, unique=True, index=True)
    
    items = relationship("Item", secondary=item_colors, back_populates="colors")

class Item(Base):
    __tablename__ = "items"
    
    id = Column(Integer, primary_key=True, index=True)
    brand = Column(String, index=True)
    name = Column(String)
    category = Column(String, index=True)
    material = Column(String)
    size = Column(String)
    purchase_date = Column(DateTime, nullable=True)
    notes = Column(String, nullable=True)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.datetime.utcnow, onupdate=datetime.datetime.utcnow)
    
    colors = relationship("Color", secondary=item_colors, back_populates="items")
    images = relationship("Image", back_populates="item")

class Image(Base):
    __tablename__ = "images"
    
    id = Column(Integer, primary_key=True, index=True)
    item_id = Column(Integer, ForeignKey("items.id"))
    filename = Column(String)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)
    
    item = relationship("Item", back_populates="images")

# Create tables in the database
Base.metadata.create_all(bind=engine)

# Dependency to get database session
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()