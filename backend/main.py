from fastapi import FastAPI, UploadFile, File, HTTPException, Depends
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from sqlalchemy.orm import Session
from typing import List, Optional
from datetime import datetime
import os
import uuid
import shutil
from pydantic import BaseModel
from database import get_db, Item as DBItem, Color as DBColor, Image as DBImage

app = FastAPI(title="Capsulib API", description="Manage your capsule wardrobe")

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
    brand: str
    name: str
    category: str
    colors: List[str]
    material: str
    size: str
    purchase_date: Optional[datetime] = None
    notes: Optional[str] = None

class ItemResponse(ItemBase):
    id: int
    images: List[str] = []
    created_at: datetime
    updated_at: datetime

    class Config:
        orm_mode = True

@app.get("/")
def read_root():
    return {"message": "Welcome to Capsulib API"}

@app.get("/items", response_model=List[ItemResponse])
def get_items(db: Session = Depends(get_db)):
    db_items = db.query(DBItem).all()
    
    # Convert DB models to Pydantic models
    items = []
    for db_item in db_items:
        item_dict = {
            "id": db_item.id,
            "brand": db_item.brand,
            "name": db_item.name,
            "category": db_item.category,
            "colors": [color.name for color in db_item.colors],
            "material": db_item.material,
            "size": db_item.size,
            "purchase_date": db_item.purchase_date,
            "notes": db_item.notes,
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
        "material": db_item.material,
        "size": db_item.size,
        "purchase_date": db_item.purchase_date,
        "notes": db_item.notes,
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
        material=item.material,
        size=item.size,
        purchase_date=item.purchase_date,
        notes=item.notes
    )
    
    # Handle colors (create if they don't exist)
    for color_name in item.colors:
        color = db.query(DBColor).filter(DBColor.name == color_name).first()
        if not color:
            color = DBColor(name=color_name)
            db.add(color)
            db.flush()  # Flush to get the color ID
        db_item.colors.append(color)
    
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
        "material": db_item.material,
        "size": db_item.size,
        "purchase_date": db_item.purchase_date,
        "notes": db_item.notes,
        "images": [image.filename for image in db_item.images],
        "created_at": db_item.created_at,
        "updated_at": db_item.updated_at
    }
    
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
    db_item.material = updated_item.material
    db_item.size = updated_item.size
    db_item.purchase_date = updated_item.purchase_date
    db_item.notes = updated_item.notes
    
    # Update colors
    db_item.colors = []  # Remove existing colors
    for color_name in updated_item.colors:
        color = db.query(DBColor).filter(DBColor.name == color_name).first()
        if not color:
            color = DBColor(name=color_name)
            db.add(color)
            db.flush()  # Flush to get the color ID
        db_item.colors.append(color)
    
    db.commit()
    db.refresh(db_item)
    
    # Convert to response model
    item_dict = {
        "id": db_item.id,
        "brand": db_item.brand,
        "name": db_item.name,
        "category": db_item.category,
        "colors": [color.name for color in db_item.colors],
        "material": db_item.material,
        "size": db_item.size,
        "purchase_date": db_item.purchase_date,
        "notes": db_item.notes,
        "images": [image.filename for image in db_item.images],
        "created_at": db_item.created_at,
        "updated_at": db_item.updated_at
    }
    
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

@app.delete("/items/{item_id}/images/{image_id}")
def delete_image(item_id: int, image_id: int, db: Session = Depends(get_db)):
    # Find the image
    db_image = db.query(DBImage).filter(
        DBImage.id == image_id, 
        DBImage.item_id == item_id
    ).first()
    
    if not db_image:
        raise HTTPException(status_code=404, detail="Image not found")
    
    # Delete file from filesystem
    try:
        os.remove(os.path.join(UPLOAD_DIR, db_image.filename))
    except Exception as e:
        # Log error but continue with DB deletion
        print(f"Error removing image file: {e}")
    
    # Delete from database
    db.delete(db_image)
    db.commit()
    
    return {"message": "Image deleted successfully"}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)