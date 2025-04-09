from fastapi import FastAPI, UploadFile, File, HTTPException, Depends, Query, Form
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from sqlalchemy.orm import Session
from typing import List, Optional, Dict, Any
from datetime import datetime
import os
import uuid
import shutil

import io
import csv
import zipfile
from fastapi.responses import StreamingResponse, JSONResponse

from pydantic import BaseModel
from database import get_db, Item as DBItem, Color as DBColor, Image as DBImage, Material as DBMaterial
import json
import couchdb

app = FastAPI(title="Capsulib API", description="Manage your capsule wardrobe")

# CouchDB configuration
COUCHDB_URL = os.environ.get("COUCHDB_URL", "http://localhost:5984")
COUCHDB_USER = os.environ.get("COUCHDB_USER", "admin")
COUCHDB_PASSWORD = os.environ.get("COUCHDB_PASSWORD", "password")
COUCHDB_DB = os.environ.get("COUCHDB_DB", "capsulib")

# Initialize CouchDB connection
try:
    couch_server = couchdb.Server(COUCHDB_URL)
    if COUCHDB_USER and COUCHDB_PASSWORD:
        couch_server.resource.credentials = (COUCHDB_USER, COUCHDB_PASSWORD)
    
    # Create database if it doesn't exist
    if COUCHDB_DB not in couch_server:
        couch_db = couch_server.create(COUCHDB_DB)
    else:
        couch_db = couch_server[COUCHDB_DB]
except Exception as e:
    print(f"Warning: Could not connect to CouchDB: {e}")
    couch_db = None

# Enable CORS for development
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],  # React default port
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Ensure upload directory exists
UPLOAD_DIR = "uploads"
os.makedirs(UPLOAD_DIR, exist_ok=True)

# Mount static files directory to serve images
app.mount("/uploads", StaticFiles(directory=UPLOAD_DIR), name="uploads")

# Pydantic models
class ColorBase(BaseModel):
    name: str

class ImageBase(BaseModel):
    filename: str

class ItemBase(BaseModel):
    brand: Optional[str] = ""
    name: str
    category: Optional[str] = ""
    colors: Optional[List[str]] = []
    materials: Optional[List[str]] = []
    size: Optional[str] = ""
    purchase_date: Optional[datetime] = None
    purchase_price: Optional[str] = None
    condition: Optional[str] = None
    description: Optional[str] = None
    season: Optional[str] = None
    is_second_hand: Optional[bool] = False
    pattern: Optional[str] = None

class ItemResponse(ItemBase):
    id: int
    images: List[str] = []
    created_at: datetime
    updated_at: datetime

    class Config:
        orm_mode = True

class ImportPreviewResponse(BaseModel):
    headers: List[str]
    preview_rows: List[List[str]]
    available_fields: List[str]
    required_fields: List[str]

# Models for CouchDB sync
class SyncRequest(BaseModel):
    docs: List[Dict[str, Any]]
    last_seq: Optional[str] = None

class SyncResponse(BaseModel):
    ok: bool
    docs: List[Dict[str, Any]]
    last_seq: str

# Helper functions for CouchDB operations
def sql_to_couch_doc(db_item):
    """Convert a SQLAlchemy item to a CouchDB document"""
    doc = {
        "_id": str(db_item.id),
        "type": "item",
        "brand": db_item.brand,
        "name": db_item.name,
        "category": db_item.category,
        "colors": [color.name for color in db_item.colors],
        "materials": [material.name for material in db_item.materials],
        "size": db_item.size,
        "purchase_date": db_item.purchase_date.isoformat() if db_item.purchase_date else None,
        "purchase_price": db_item.purchase_price,
        "condition": db_item.condition,
        "description": db_item.description,
        "season": db_item.season,
        "is_second_hand": db_item.is_second_hand,
        "pattern": db_item.pattern,
        "images": [image.filename for image in db_item.images],
        "created_at": db_item.created_at.isoformat(),
        "updated_at": db_item.updated_at.isoformat()
    }
    return doc

def couch_to_sql_item(doc, db):
    """Convert a CouchDB document to a SQLAlchemy item"""
    # Check if item already exists
    item_id = int(doc["_id"]) if doc["_id"].isdigit() else None
    if item_id:
        db_item = db.query(DBItem).filter(DBItem.id == item_id).first()
    else:
        db_item = None
    
    # Create new item if it doesn't exist
    if not db_item:
        db_item = DBItem(
            brand=doc.get("brand", ""),
            name=doc.get("name", ""),
            category=doc.get("category", ""),
            size=doc.get("size", ""),
            purchase_date=datetime.fromisoformat(doc["purchase_date"]) if doc.get("purchase_date") else None,
            purchase_price=doc.get("purchase_price"),
            condition=doc.get("condition"),
            description=doc.get("description"),
            season=doc.get("season"),
            is_second_hand=doc.get("is_second_hand", False),
            pattern=doc.get("pattern")
        )
        db.add(db_item)
        db.flush()  # Get the ID
    else:
        # Update existing item
        db_item.brand = doc.get("brand", "")
        db_item.name = doc.get("name", "")
        db_item.category = doc.get("category", "")
        db_item.size = doc.get("size", "")
        db_item.purchase_date = datetime.fromisoformat(doc["purchase_date"]) if doc.get("purchase_date") else None
        db_item.purchase_price = doc.get("purchase_price")
        db_item.condition = doc.get("condition")
        db_item.description = doc.get("description")
        db_item.season = doc.get("season")
        db_item.is_second_hand = doc.get("is_second_hand", False)
        db_item.pattern = doc.get("pattern")
    
    # Handle colors
    db_item.colors = []
    for color_name in doc.get("colors", []):
        color = db.query(DBColor).filter(DBColor.name == color_name).first()
        if not color:
            color = DBColor(name=color_name)
            db.add(color)
            db.flush()
        db_item.colors.append(color)
    
    # Handle materials
    db_item.materials = []
    for material_name in doc.get("materials", []):
        material = db.query(DBMaterial).filter(DBMaterial.name == material_name).first()
        if not material:
            material = DBMaterial(name=material_name)
            db.add(material)
            db.flush()
        db_item.materials.append(material)
    
    return db_item

@app.get("/")
def read_root():
    return {"message": "Welcome to Capsulib API"}

@app.get("/items", response_model=List[ItemResponse])
def get_items(category: Optional[str] = None, db: Session = Depends(get_db)):
    # Create a base query
    query = db.query(DBItem)
    
    # Filter by category if provided (case-insensitive)
    if category and category.lower() != 'other':
        query = query.filter(DBItem.category.ilike(category))
    elif category and category.lower() == 'other':
        # For "Other" category, get items with empty or null category
        query = query.filter((DBItem.category == '') | (DBItem.category == None) | (DBItem.category == 'other') | (DBItem.category == 'Other'))
    
    # Execute the query
    db_items = query.all()
    
    # Convert DB models to Pydantic models
    items = []
    for db_item in db_items:
        item_dict = {
            "id": db_item.id,
            "brand": db_item.brand,
            "name": db_item.name,
            "category": db_item.category,
            "colors": [color.name for color in db_item.colors],
            "materials": [material.name for material in db_item.materials],
            "size": db_item.size,
            "purchase_date": db_item.purchase_date,
            "purchase_price": db_item.purchase_price,
            "condition": db_item.condition,
            "description": db_item.description,
            "season": db_item.season,
            "is_second_hand": db_item.is_second_hand,
            "pattern": db_item.pattern,
            "images": [image.filename for image in db_item.images],
            "created_at": db_item.created_at,
            "updated_at": db_item.updated_at
        }
        items.append(item_dict)
    
    return items

@app.get("/items/{item_id}", response_model=ItemResponse)
def get_item(item_id: int, db: Session = Depends(get_db)):
    db_item = db.query(DBItem).filter(DBItem.id == item_id).first()
    if not db_item:
        raise HTTPException(status_code=404, detail="Item not found")
    
    item_dict = {
        "id": db_item.id,
        "brand": db_item.brand,
        "name": db_item.name,
        "category": db_item.category,
        "colors": [color.name for color in db_item.colors],
        "materials": [material.name for material in db_item.materials],
        "size": db_item.size,
        "purchase_date": db_item.purchase_date,
        "purchase_price": db_item.purchase_price,
        "condition": db_item.condition,
        "description": db_item.description,
        "season": db_item.season,
        "is_second_hand": db_item.is_second_hand,
        "pattern": db_item.pattern,
        "images": [image.filename for image in db_item.images],
        "created_at": db_item.created_at,
        "updated_at": db_item.updated_at
    }
    
    return item_dict

@app.post("/items", response_model=ItemResponse)
def create_item(item: ItemBase, db: Session = Depends(get_db)):
    # Create new item
    db_item = DBItem(
        brand=item.brand,
        name=item.name,
        category=item.category,
        size=item.size,
        purchase_date=item.purchase_date,
        purchase_price=item.purchase_price,
        condition=item.condition,
        description=item.description,
        season=item.season,
        is_second_hand=item.is_second_hand,
        pattern=item.pattern
    )
    
    # Handle colors (create if they don't exist)
    for color_name in item.colors:
        color = db.query(DBColor).filter(DBColor.name == color_name).first()
        if not color:
            color = DBColor(name=color_name)
            db.add(color)
            db.flush()  # Flush to get the color ID
        db_item.colors.append(color)
    
    # Handle materials (create if they don't exist)
    for material_name in item.materials:
        material = db.query(DBMaterial).filter(DBMaterial.name == material_name).first()
        if not material:
            material = DBMaterial(name=material_name)
            db.add(material)
            db.flush()  # Flush to get the material ID
        db_item.materials.append(material)
    
    db.add(db_item)
    db.commit()
    db.refresh(db_item)
    
    # Convert to response model
    item_dict = {
        "id": db_item.id,
        "brand": db_item.brand,
        "name": db_item.name,
        "category": db_item.category,
        "colors": [color.name for color in db_item.colors],
        "materials": [material.name for material in db_item.materials],
        "size": db_item.size,
        "purchase_date": db_item.purchase_date,
        "purchase_price": db_item.purchase_price,
        "condition": db_item.condition,
        "description": db_item.description,
        "season": db_item.season,
        "is_second_hand": db_item.is_second_hand,
        "pattern": db_item.pattern,
        "images": [image.filename for image in db_item.images],
        "created_at": db_item.created_at,
        "updated_at": db_item.updated_at
    }
    
    # Also save to CouchDB if available
    if couch_db:
        try:
            couch_doc = sql_to_couch_doc(db_item)
            couch_db.save(couch_doc)
        except Exception as e:
            print(f"Warning: Could not save to CouchDB: {e}")
    
    return item_dict

@app.put("/items/{item_id}", response_model=ItemResponse)
def update_item(item_id: int, updated_item: ItemBase, db: Session = Depends(get_db)):
    # Get existing item
    db_item = db.query(DBItem).filter(DBItem.id == item_id).first()
    if not db_item:
        raise HTTPException(status_code=404, detail="Item not found")
    
    # Update basic fields
    db_item.brand = updated_item.brand
    db_item.name = updated_item.name
    db_item.category = updated_item.category
    db_item.size = updated_item.size
    db_item.purchase_date = updated_item.purchase_date
    db_item.purchase_price = updated_item.purchase_price
    db_item.condition = updated_item.condition
    db_item.description = updated_item.description
    db_item.season = updated_item.season
    db_item.is_second_hand = updated_item.is_second_hand
    db_item.pattern = updated_item.pattern
    
    # Update colors
    db_item.colors = []  # Remove existing colors
    for color_name in updated_item.colors:
        color = db.query(DBColor).filter(DBColor.name == color_name).first()
        if not color:
            color = DBColor(name=color_name)
            db.add(color)
            db.flush()  # Flush to get the color ID
        db_item.colors.append(color)
    
    # Update materials
    db_item.materials = []  # Remove existing materials
    for material_name in updated_item.materials:
        material = db.query(DBMaterial).filter(DBMaterial.name == material_name).first()
        if not material:
            material = DBMaterial(name=material_name)
            db.add(material)
            db.flush()  # Flush to get the material ID
        db_item.materials.append(material)
    
    db.commit()
    db.refresh(db_item)
    
    # Convert to response model
    item_dict = {
        "id": db_item.id,
        "brand": db_item.brand,
        "name": db_item.name,
        "category": db_item.category,
        "colors": [color.name for color in db_item.colors],
        "materials": [material.name for material in db_item.materials],
        "size": db_item.size,
        "purchase_date": db_item.purchase_date,
        "purchase_price": db_item.purchase_price,
        "condition": db_item.condition,
        "description": db_item.description,
        "season": db_item.season,
        "is_second_hand": db_item.is_second_hand,
        "pattern": db_item.pattern,
        "images": [image.filename for image in db_item.images],
        "created_at": db_item.created_at,
        "updated_at": db_item.updated_at
    }
    
    # Also update in CouchDB if available
    if couch_db:
        try:
            couch_doc = sql_to_couch_doc(db_item)
            # Check if document exists in CouchDB
            try:
                existing_doc = couch_db.get(couch_doc["_id"])
                if existing_doc:
                    couch_doc["_rev"] = existing_doc["_rev"]
            except couchdb.http.ResourceNotFound:
                pass
            
            couch_db.save(couch_doc)
        except Exception as e:
            print(f"Warning: Could not update in CouchDB: {e}")
    
    return item_dict

@app.delete("/items/{item_id}")
def delete_item(item_id: int, db: Session = Depends(get_db)):
    # Get existing item
    db_item = db.query(DBItem).filter(DBItem.id == item_id).first()
    if not db_item:
        raise HTTPException(status_code=404, detail="Item not found")
    
    # Delete associated images from filesystem
    for image in db_item.images:
        try:
            os.remove(os.path.join(UPLOAD_DIR, image.filename))
        except Exception as e:
            # Log error but continue with deletion
            print(f"Error removing image file: {e}")
    
    # Delete from database
    db.delete(db_item)
    db.commit()
    
    # Also delete from CouchDB if available
    if couch_db:
        try:
            doc_id = str(item_id)
            try:
                doc = couch_db.get(doc_id)
                couch_db.delete(doc)
            except couchdb.http.ResourceNotFound:
                pass  # Document doesn't exist in CouchDB
        except Exception as e:
            print(f"Warning: Could not delete from CouchDB: {e}")
    
    return {"message": "Item deleted successfully"}

@app.post("/items/{item_id}/images")
async def upload_image(item_id: int, file: UploadFile = File(...), db: Session = Depends(get_db)):
    # Check if item exists
    db_item = db.query(DBItem).filter(DBItem.id == item_id).first()
    if not db_item:
        raise HTTPException(status_code=404, detail="Item not found")
    
    # Generate unique filename
    file_extension = os.path.splitext(file.filename)[1]
    unique_filename = f"{uuid.uuid4()}{file_extension}"
    file_path = os.path.join(UPLOAD_DIR, unique_filename)
    
    # Save file
    with open(file_path, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)
    
    # Create image record
    db_image = DBImage(
        item_id=item_id,
        filename=unique_filename
    )
    db.add(db_image)
    db.commit()
    
    return {"filename": unique_filename}

@app.delete("/items/{item_id}/images/{image_filename}")
def delete_image(item_id: int, image_filename: str, db: Session = Depends(get_db)):
    # Get existing item
    db_item = db.query(DBItem).filter(DBItem.id == item_id).first()
    if not db_item:
        raise HTTPException(status_code=404, detail="Item not found")
    
    # Find the image in the database
    db_image = db.query(DBImage).filter(
        DBImage.item_id == item_id,
        DBImage.filename == image_filename
    ).first()
    
    if not db_image:
        raise HTTPException(status_code=404, detail="Image not found")
    
    # Delete the image file from filesystem
    try:
        os.remove(os.path.join(UPLOAD_DIR, image_filename))
    except Exception as e:
        # Log error but continue with deletion
        print(f"Error removing image file: {e}")
    
    # Delete the image from database
    db.delete(db_image)
    db.commit()
    
    return {"message": "Image deleted successfully"}

@app.get("/export")
def export_items(fields: str = Query(...), db: Session = Depends(get_db)):
    """
    Export items to CSV with selected fields.
    
    fields: Comma-separated list of fields to include in the export
    """
    selected_fields = fields.split(',')
    
    # Get all items from database
    db_items = db.query(DBItem).all()
    
    # Check if we need to include image URLs or files
    include_image_urls = 'include_image_urls' in selected_fields
    include_image_files = 'include_image_files' in selected_fields
    
    # Remove special fields from the regular field list
    if include_image_urls:
        selected_fields.remove('include_image_urls')
    if include_image_files:
        selected_fields.remove('include_image_files')
    
    # Create CSV file in memory
    output = io.StringIO()
    writer = csv.writer(output)
    
    # Write header row
    header_row = selected_fields.copy()
    if include_image_urls:
        header_row.append('image_urls')
    writer.writerow(header_row)
    
    # Write data rows
    for item in db_items:
        row = []
        
        for field in selected_fields:
            if field == 'colors':
                # Join colors with semicolons
                value = ';'.join([color.name for color in item.colors]) if item.colors else ''
            elif field == 'materials':
                # Join materials with semicolons
                value = ';'.join([material.name for material in item.materials]) if item.materials else ''
            elif field in ('created_at', 'updated_at', 'purchase_date') and getattr(item, field):
                # Format dates
                value = getattr(item, field).isoformat()
            else:
                # Get regular attribute
                value = getattr(item, field, '')
            
            row.append(value)
        
        # Add image URLs if requested
        if include_image_urls:
            image_urls = [f"{UPLOAD_DIR}/{image.filename}" for image in item.images]
            row.append(';'.join(image_urls))
        
        writer.writerow(row)
    
    # Get CSV as string
    output.seek(0)
    csv_data = output.getvalue()
    
    # If we're including image files, create a ZIP file
    if include_image_files:
        # Create a ZIP file in memory
        zip_buffer = io.BytesIO()
        with zipfile.ZipFile(zip_buffer, 'w', zipfile.ZIP_DEFLATED) as zip_file:
            # Add CSV file to ZIP
            zip_file.writestr('capsulib_export.csv', csv_data)
            
            # Add all images to ZIP
            for item in db_items:
                for image in item.images:
                    image_path = os.path.join(UPLOAD_DIR, image.filename)
                    if os.path.exists(image_path):
                        with open(image_path, 'rb') as img_file:
                            zip_file.writestr(f"images/{image.filename}", img_file.read())
        
        # Return ZIP file
        zip_buffer.seek(0)
        return StreamingResponse(
            zip_buffer, 
            media_type="application/zip",
            headers={"Content-Disposition": f"attachment; filename=capsulib_export.zip"}
        )
    
    # Return CSV file
    return StreamingResponse(
        io.StringIO(csv_data),
        media_type="text/csv",
        headers={"Content-Disposition": f"attachment; filename=capsulib_export.csv"}
    )

@app.post("/items/import/preview", response_model=ImportPreviewResponse)
async def preview_import(file: UploadFile = File(...)):
    if not file.filename.endswith('.csv'):
        raise HTTPException(status_code=400, detail="File must be a CSV")
    
    try:
        contents = await file.read()
        csv_file = io.StringIO(contents.decode('utf-8'))
        csv_reader = csv.DictReader(csv_file)
        
        # Get headers
        headers = csv_reader.fieldnames or []
        
        # Get preview rows (first 5 rows)
        preview_rows = []
        for i, row in enumerate(csv_reader):
            if i >= 5:  # Only show first 5 rows
                break
            preview_rows.append([row.get(header, '') for header in headers])
        
        # Define available fields in our system
        available_fields = [
            'name', 'brand', 'category', 'size', 'colors', 'materials',
            'pattern', 'season', 'condition', 'purchase_date', 'purchase_price',
            'description', 'is_second_hand'
        ]
        
        # Define required fields
        required_fields = ['name']
        
        return {
            "headers": headers,
            "preview_rows": preview_rows,
            "available_fields": available_fields,
            "required_fields": required_fields
        }
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Error processing CSV: {str(e)}")

@app.post("/items/import")
async def import_items(
    file: UploadFile = File(...),
    mappings: str = Form(...),  # JSON string of column mappings
    db: Session = Depends(get_db)
):
    if not file.filename.endswith('.csv'):
        raise HTTPException(status_code=400, detail="File must be a CSV")
    
    try:
        # Parse mappings from JSON string
        column_mappings = json.loads(mappings)
        
        contents = await file.read()
        csv_file = io.StringIO(contents.decode('utf-8'))
        csv_reader = csv.DictReader(csv_file)
        
        imported_count = 0
        updated_count = 0
        skipped_count = 0
        
        for row in csv_reader:
            # Skip rows that only have an ID or are empty
            has_content = False
            for csv_column, field_name in column_mappings.items():
                if field_name and csv_column in row and row[csv_column].strip():
                    has_content = True
                    break
            
            if not has_content:
                skipped_count += 1
                continue
            
            # Create item data using the mappings
            item_data = {}
            for csv_column, field_name in column_mappings.items():
                if field_name and csv_column in row:
                    value = row[csv_column].strip()
                    
                    # Skip if the value is empty
                    if not value:
                        continue
                    
                    # Process special fields
                    if field_name == 'purchase_date' and value:
                        try:
                            # Try different date formats
                            try:
                                value = datetime.strptime(value, '%Y-%m-%d')
                            except ValueError:
                                try:
                                    value = datetime.strptime(value, '%m/%d/%Y')
                                except ValueError:
                                    value = datetime.strptime(value, '%d/%m/%Y')
                        except ValueError:
                            value = None
                    
                    elif field_name == 'purchase_price' and value:
                        # Remove currency and convert comma to dot
                        value = value.replace('EUR', '').replace(',', '.').strip()
                    
                    elif field_name == 'colors' and value:
                        # Split by comma or semicolon
                        value = [c.strip() for c in value.replace(';', ',').split(',') if c.strip()]
                    
                    elif field_name == 'materials' and value:
                        # Split by comma or semicolon
                        value = [m.strip() for m in value.replace(';', ',').split(',') if m.strip()]
                    
                    elif field_name == 'is_second_hand' and value:
                        value = value.lower() in ['true', 'second-hand', 'secondhand', 'used']
                    
                    item_data[field_name] = value
            
            # Skip if no name is provided
            if not item_data.get('name'):
                skipped_count += 1
                continue
            
            # Check if item with same name exists
            existing_item = db.query(DBItem).filter(DBItem.name == item_data['name']).first()
            
            if existing_item:
                # Update only the mapped fields
                for field, value in item_data.items():
                    if field == 'colors':
                        # Clear existing colors and add new ones
                        existing_item.colors = []
                        for color_name in value:
                            color = db.query(DBColor).filter(DBColor.name == color_name).first()
                            if not color:
                                color = DBColor(name=color_name)
                                db.add(color)
                                db.flush()
                            existing_item.colors.append(color)
                    elif field == 'materials':
                        # Clear existing materials and add new ones
                        existing_item.materials = []
                        for material_name in value:
                            material = db.query(DBMaterial).filter(DBMaterial.name == material_name).first()
                            if not material:
                                material = DBMaterial(name=material_name)
                                db.add(material)
                                db.flush()
                            existing_item.materials.append(material)
                    else:
                        # Update other fields
                        setattr(existing_item, field, value)
                
                updated_count += 1
            else:
                # Create new item with only mapped fields
                db_item = DBItem(
                    name=item_data.get('name', ''),
                    brand=item_data.get('brand', ''),
                    category=item_data.get('category', ''),
                    size=item_data.get('size', ''),
                    purchase_date=item_data.get('purchase_date'),
                    purchase_price=item_data.get('purchase_price'),
                    condition=item_data.get('condition'),
                    description=item_data.get('description'),
                    season=item_data.get('season'),
                    is_second_hand=item_data.get('is_second_hand', False),
                    pattern=item_data.get('pattern')
                )
                
                # Add colors only if mapped
                if 'colors' in item_data:
                    for color_name in item_data['colors']:
                        color = db.query(DBColor).filter(DBColor.name == color_name).first()
                        if not color:
                            color = DBColor(name=color_name)
                            db.add(color)
                            db.flush()
                        db_item.colors.append(color)
                
                # Add materials only if mapped
                if 'materials' in item_data:
                    for material_name in item_data['materials']:
                        material = db.query(DBMaterial).filter(DBMaterial.name == material_name).first()
                        if not material:
                            material = DBMaterial(name=material_name)
                            db.add(material)
                            db.flush()
                        db_item.materials.append(material)
                
                db.add(db_item)
                imported_count += 1
        
        db.commit()
        return {
            "message": f"Successfully imported {imported_count} new items and updated {updated_count} existing items",
            "imported": imported_count,
            "updated": updated_count,
            "skipped": skipped_count
        }
        
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=400, detail=f"Error importing items: {str(e)}")

@app.delete("/items")
def delete_all_items(db: Session = Depends(get_db)):
    try:
        # Delete all images from filesystem
        db_images = db.query(DBImage).all()
        for image in db_images:
            try:
                os.remove(os.path.join(UPLOAD_DIR, image.filename))
            except Exception as e:
                # Log error but continue with deletion
                print(f"Error removing image file: {e}")
        
        # Delete all items from database
        db.query(DBItem).delete()
        db.commit()
        
        # Also delete all items from CouchDB if available
        if couch_db:
            try:
                # Get all item documents
                items_view = couch_db.view('_all_docs', include_docs=True)
                for row in items_view:
                    doc = row.doc
                    if doc.get('type') == 'item':
                        couch_db.delete(doc)
            except Exception as e:
                print(f"Warning: Could not delete all items from CouchDB: {e}")
        
        return {"message": "All items deleted successfully"}
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Error deleting items: {str(e)}")

# CouchDB sync endpoints
@app.get("/sync/info")
def get_sync_info():
    """Get CouchDB sync information"""
    if not couch_db:
        raise HTTPException(status_code=503, detail="CouchDB is not available")
    
    try:
        info = couch_db.info()
        return {
            "ok": True,
            "db_name": info.get("db_name"),
            "doc_count": info.get("doc_count"),
            "update_seq": info.get("update_seq"),
            "sizes": info.get("sizes")
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error getting CouchDB info: {str(e)}")

@app.post("/sync/pull")
def sync_pull(request: SyncRequest, db: Session = Depends(get_db)):
    """Pull changes from the server to the client"""
    if not couch_db:
        raise HTTPException(status_code=503, detail="CouchDB is not available")
    
    try:
        # Get all items from SQL database
        db_items = db.query(DBItem).all()
        
        # Convert to CouchDB documents
        docs = [sql_to_couch_doc(item) for item in db_items]
        
        # Get the latest sequence number
        info = couch_db.info()
        last_seq = info.get("update_seq", "0")
        
        return {
            "ok": True,
            "docs": docs,
            "last_seq": last_seq
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error during sync pull: {str(e)}")

@app.post("/sync/push")
def sync_push(request: SyncRequest, db: Session = Depends(get_db)):
    """Push changes from the client to the server"""
    if not couch_db:
        raise HTTPException(status_code=503, detail="CouchDB is not available")
    
    try:
        # Process each document from the client
        for doc in request.docs:
            # Skip design documents and other non-item documents
            if doc.get("_id", "").startswith("_design/") or doc.get("type") != "item":
                continue
            
            # Convert to SQL item and save
            couch_to_sql_item(doc, db)
            
            # Also save to CouchDB
            try:
                existing_doc = couch_db.get(doc["_id"])
                if existing_doc:
                    doc["_rev"] = existing_doc["_rev"]
                couch_db.save(doc)
            except couchdb.http.ResourceNotFound:
                couch_db.save(doc)
        
        db.commit()
        
        # Get the latest sequence number
        info = couch_db.info()
        last_seq = info.get("update_seq", "0")
        
        return {
            "ok": True,
            "docs": [],  # No need to return docs for push
            "last_seq": last_seq
        }
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Error during sync push: {str(e)}")

@app.post("/sync/changes")
def get_changes(request: Dict[str, Any]):
    """Get changes since a specific sequence number"""
    if not couch_db:
        raise HTTPException(status_code=503, detail="CouchDB is not available")
    
    try:
        since = request.get("since", "0")
        limit = request.get("limit", 100)
        
        changes = couch_db.changes(since=since, limit=limit, include_docs=True)
        
        results = []
        for change in changes["results"]:
            if "doc" in change and change["doc"].get("type") == "item":
                results.append(change["doc"])
        
        return {
            "ok": True,
            "results": results,
            "last_seq": changes["last_seq"]
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error getting changes: {str(e)}")

@app.post("/sync/replicate")
def replicate_database(request: Dict[str, Any]):
    """Replicate the entire database to CouchDB"""
    if not couch_db:
        raise HTTPException(status_code=503, detail="CouchDB is not available")
    
    try:
        db = next(get_db())
        
        # Get all items from SQL database
        db_items = db.query(DBItem).all()
        
        # Convert to CouchDB documents and save
        for item in db_items:
            doc = sql_to_couch_doc(item)
            try:
                existing_doc = couch_db.get(doc["_id"])
                if existing_doc:
                    doc["_rev"] = existing_doc["_rev"]
                couch_db.save(doc)
            except couchdb.http.ResourceNotFound:
                couch_db.save(doc)
        
        return {"ok": True, "message": f"Replicated {len(db_items)} items to CouchDB"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error during replication: {str(e)}")

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
