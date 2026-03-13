from fastapi import FastAPI, APIRouter, HTTPException, UploadFile, File, Form
from fastapi.staticfiles import StaticFiles
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
from pathlib import Path
from pydantic import BaseModel, Field, ConfigDict
from typing import List, Optional, Dict, Any
import uuid
from datetime import datetime, timezone
import shutil

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# Create uploads directory
UPLOADS_DIR = ROOT_DIR / "uploads"
UPLOADS_DIR.mkdir(exist_ok=True)

# MongoDB connection (with defaults for local dev)
mongo_url = os.environ.get('MONGO_URL', 'mongodb://localhost:27017')
db_name = os.environ.get('DB_NAME', 'solar_system_b4')
client = AsyncIOMotorClient(mongo_url)
db = client[db_name]

# Create the main app
app = FastAPI(title="Solar System B4 API", version="1.0.0")

# Create a router with the /api prefix
api_router = APIRouter(prefix="/api")

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# ==================== MODELS ====================

class CustomFields(BaseModel):
    moduleName: Optional[str] = None
    endpoints: Optional[List[str]] = []
    apiType: Optional[str] = None
    status: Optional[str] = "active"
    extra: Optional[Dict[str, Any]] = {}

class SceneObject(BaseModel):
    model_config = ConfigDict(extra="ignore")
    
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    name: str
    type: str  # planet, satellite, sun, asteroid, ring
    description: Optional[str] = ""
    imageUrl: Optional[str] = None
    customFields: Optional[CustomFields] = None
    position: Optional[Dict[str, float]] = {"x": 0, "y": 0, "z": 0}
    scale: Optional[float] = 1.0
    orbitRadius: Optional[float] = None
    orbitSpeed: Optional[float] = None
    rotationSpeed: Optional[float] = None
    lastModified: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    version: int = 1

class SceneObjectCreate(BaseModel):
    name: str
    type: str
    description: Optional[str] = ""
    imageUrl: Optional[str] = None
    customFields: Optional[CustomFields] = None
    position: Optional[Dict[str, float]] = None
    scale: Optional[float] = None
    orbitRadius: Optional[float] = None
    orbitSpeed: Optional[float] = None
    rotationSpeed: Optional[float] = None

class SceneObjectUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    imageUrl: Optional[str] = None
    customFields: Optional[CustomFields] = None
    position: Optional[Dict[str, float]] = None
    scale: Optional[float] = None
    orbitRadius: Optional[float] = None
    orbitSpeed: Optional[float] = None
    rotationSpeed: Optional[float] = None

class SceneManifest(BaseModel):
    model_config = ConfigDict(extra="ignore")
    
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    name: str = "B4 Solar System"
    manifestJson: Dict[str, Any] = {}
    cameraPresets: List[Dict[str, Any]] = []
    timeSettings: Dict[str, Any] = {"speed": 1.0, "paused": False}
    exportedAt: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    version: str = "1.0.0"

class StatusCheck(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    client_name: str
    timestamp: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class StatusCheckCreate(BaseModel):
    client_name: str

# ==================== HEALTH CHECK ROUTES ====================

@api_router.get("/")
async def root():
    return {"message": "B4 Solar System API", "version": "1.0.0"}

@api_router.get("/health")
async def health_check():
    return {"status": "healthy", "timestamp": datetime.now(timezone.utc).isoformat()}

@api_router.post("/status", response_model=StatusCheck)
async def create_status_check(input: StatusCheckCreate):
    status_dict = input.model_dump()
    status_obj = StatusCheck(**status_dict)
    doc = status_obj.model_dump()
    doc['timestamp'] = doc['timestamp'].isoformat()
    await db.status_checks.insert_one(doc)
    return status_obj

@api_router.get("/status", response_model=List[StatusCheck])
async def get_status_checks():
    status_checks = await db.status_checks.find({}, {"_id": 0}).to_list(1000)
    for check in status_checks:
        if isinstance(check['timestamp'], str):
            check['timestamp'] = datetime.fromisoformat(check['timestamp'])
    return status_checks

# ==================== OBJECTS ROUTES ====================

@api_router.get("/objects", response_model=List[SceneObject])
async def get_objects():
    """Get all scene objects with metadata"""
    objects = await db.objects.find({}, {"_id": 0}).to_list(1000)
    
    # If no objects exist, seed with default solar system data
    if not objects:
        await seed_default_objects()
        objects = await db.objects.find({}, {"_id": 0}).to_list(1000)
    
    for obj in objects:
        if isinstance(obj.get('lastModified'), str):
            obj['lastModified'] = datetime.fromisoformat(obj['lastModified'])
    
    return objects

@api_router.get("/objects/{object_id}", response_model=SceneObject)
async def get_object(object_id: str):
    """Get single object metadata by ID"""
    obj = await db.objects.find_one({"id": object_id}, {"_id": 0})
    if not obj:
        raise HTTPException(status_code=404, detail="Object not found")
    if isinstance(obj.get('lastModified'), str):
        obj['lastModified'] = datetime.fromisoformat(obj['lastModified'])
    return obj

@api_router.post("/objects", response_model=SceneObject)
async def create_or_update_object(data: SceneObjectCreate):
    """Create or update object metadata"""
    # Check if object with same name exists
    existing = await db.objects.find_one({"name": data.name}, {"_id": 0})
    
    if existing:
        # Update existing object
        update_data = data.model_dump(exclude_none=True)
        update_data['lastModified'] = datetime.now(timezone.utc).isoformat()
        update_data['version'] = existing.get('version', 0) + 1
        
        await db.objects.update_one(
            {"name": data.name},
            {"$set": update_data}
        )
        updated = await db.objects.find_one({"name": data.name}, {"_id": 0})
        if isinstance(updated.get('lastModified'), str):
            updated['lastModified'] = datetime.fromisoformat(updated['lastModified'])
        return updated
    else:
        # Create new object
        obj = SceneObject(**data.model_dump())
        doc = obj.model_dump()
        doc['lastModified'] = doc['lastModified'].isoformat()
        await db.objects.insert_one(doc)
        return obj

@api_router.put("/objects/{object_id}", response_model=SceneObject)
async def update_object(object_id: str, data: SceneObjectUpdate):
    """Update specific object by ID"""
    existing = await db.objects.find_one({"id": object_id}, {"_id": 0})
    if not existing:
        raise HTTPException(status_code=404, detail="Object not found")
    
    update_data = data.model_dump(exclude_none=True)
    update_data['lastModified'] = datetime.now(timezone.utc).isoformat()
    update_data['version'] = existing.get('version', 0) + 1
    
    await db.objects.update_one(
        {"id": object_id},
        {"$set": update_data}
    )
    
    updated = await db.objects.find_one({"id": object_id}, {"_id": 0})
    if isinstance(updated.get('lastModified'), str):
        updated['lastModified'] = datetime.fromisoformat(updated['lastModified'])
    return updated

@api_router.delete("/objects/{object_id}")
async def delete_object(object_id: str):
    """Delete an object by ID"""
    result = await db.objects.delete_one({"id": object_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Object not found")
    return {"message": "Object deleted successfully"}

# ==================== SCENE ROUTES ====================

@api_router.get("/scene", response_model=SceneManifest)
async def get_scene():
    """Get scene manifest JSON"""
    scene = await db.scene.find_one({}, {"_id": 0})
    
    if not scene:
        # Create default scene
        default_scene = SceneManifest(
            manifestJson={
                "sunPosition": [0, 0, 0],
                "cameraPosition": [0, 50, 100],
                "ambientLight": 0.1,
                "sunLightIntensity": 2.0
            },
            cameraPresets=[
                {"name": "Overview", "position": [0, 50, 100], "target": [0, 0, 0]},
                {"name": "Sun Focus", "position": [0, 10, 30], "target": [0, 0, 0]},
                {"name": "Earth Focus", "position": [40, 10, 40], "target": [35, 0, 0]},
                {"name": "Satellite Ring", "position": [15, 5, 15], "target": [10, 0, 0]}
            ]
        )
        doc = default_scene.model_dump()
        doc['exportedAt'] = doc['exportedAt'].isoformat()
        await db.scene.insert_one(doc)
        return default_scene
    
    if isinstance(scene.get('exportedAt'), str):
        scene['exportedAt'] = datetime.fromisoformat(scene['exportedAt'])
    return scene

@api_router.post("/scene", response_model=SceneManifest)
async def save_scene(manifest: SceneManifest):
    """Save updated scene manifest"""
    doc = manifest.model_dump()
    doc['exportedAt'] = datetime.now(timezone.utc).isoformat()
    
    # Upsert - update if exists, create if not
    await db.scene.update_one(
        {},
        {"$set": doc},
        upsert=True
    )
    
    return manifest

# ==================== UPLOAD ROUTES ====================

ALLOWED_IMAGE_EXTENSIONS = {'jpg', 'jpeg', 'png', 'gif', 'webp'}
MAX_UPLOAD_BYTES = 5 * 1024 * 1024  # 5 MB


def sanitize_filename(name: str) -> str:
    """Keep only safe characters for file extension."""
    return "".join(c for c in name if c.isalnum() or c in "._-").strip() or "image"


@api_router.post("/upload")
async def upload_file(file: UploadFile = File(...)):
    """Upload image and return URL. Max 5MB, allowed: jpg, jpeg, png, gif, webp."""
    if not file.content_type or not file.content_type.startswith('image/'):
        raise HTTPException(status_code=400, detail="Only image files are allowed")
    
    ext_raw = file.filename.rsplit('.', 1)[-1].lower() if '.' in file.filename else ''
    ext = sanitize_filename(ext_raw) if ext_raw else 'png'
    if ext not in ALLOWED_IMAGE_EXTENSIONS:
        raise HTTPException(
            status_code=400,
            detail=f"Allowed extensions: {', '.join(sorted(ALLOWED_IMAGE_EXTENSIONS))}"
        )
    
    content = await file.read()
    if len(content) > MAX_UPLOAD_BYTES:
        raise HTTPException(
            status_code=400,
            detail=f"File too large. Maximum size is {MAX_UPLOAD_BYTES // (1024*1024)} MB"
        )
    
    filename = f"{uuid.uuid4()}.{ext}"
    filepath = UPLOADS_DIR / filename
    filepath.write_bytes(content)
    
    return {
        "url": f"/api/uploads/{filename}",
        "filename": filename
    }

# ==================== SEED DATA ====================

async def seed_default_objects():
    """Seed default solar system objects"""
    default_objects = [
        {
            "id": str(uuid.uuid4()),
            "name": "Sun",
            "type": "sun",
            "description": "O centro do nosso sistema solar. Na metáfora B4, representa o ERP central que alimenta todo o ecossistema.",
            "customFields": {
                "moduleName": "ERP Core",
                "endpoints": ["/api/erp/core", "/api/erp/config"],
                "apiType": "REST",
                "status": "active"
            },
            "position": {"x": 0, "y": 0, "z": 0},
            "scale": 5.0,
            "rotationSpeed": 0.001,
            "lastModified": datetime.now(timezone.utc).isoformat(),
            "version": 1
        },
        {
            "id": str(uuid.uuid4()),
            "name": "Mercury",
            "type": "planet",
            "description": "O planeta mais próximo do Sol. Representa módulos de acesso rápido e alta frequência.",
            "customFields": {
                "moduleName": "Fast Access Module",
                "endpoints": ["/api/fast/query"],
                "apiType": "GraphQL",
                "status": "active"
            },
            "orbitRadius": 8,
            "orbitSpeed": 0.02,
            "scale": 0.4,
            "rotationSpeed": 0.01,
            "lastModified": datetime.now(timezone.utc).isoformat(),
            "version": 1
        },
        {
            "id": str(uuid.uuid4()),
            "name": "Venus",
            "type": "planet",
            "description": "Segundo planeta do Sol. Representa módulos de processamento intensivo.",
            "customFields": {
                "moduleName": "Processing Engine",
                "endpoints": ["/api/process/batch"],
                "apiType": "REST",
                "status": "active"
            },
            "orbitRadius": 12,
            "orbitSpeed": 0.015,
            "scale": 0.9,
            "rotationSpeed": 0.008,
            "lastModified": datetime.now(timezone.utc).isoformat(),
            "version": 1
        },
        {
            "id": str(uuid.uuid4()),
            "name": "Earth",
            "type": "planet",
            "description": "Nosso planeta natal. Representa a interface principal do usuário.",
            "customFields": {
                "moduleName": "User Interface",
                "endpoints": ["/api/ui/dashboard", "/api/ui/settings"],
                "apiType": "REST",
                "status": "active"
            },
            "orbitRadius": 16,
            "orbitSpeed": 0.01,
            "scale": 1.0,
            "rotationSpeed": 0.02,
            "lastModified": datetime.now(timezone.utc).isoformat(),
            "version": 1
        },
        {
            "id": str(uuid.uuid4()),
            "name": "Mars",
            "type": "planet",
            "description": "O planeta vermelho. Representa módulos de análise e relatórios.",
            "customFields": {
                "moduleName": "Analytics Engine",
                "endpoints": ["/api/analytics/reports", "/api/analytics/metrics"],
                "apiType": "REST",
                "status": "active"
            },
            "orbitRadius": 22,
            "orbitSpeed": 0.008,
            "scale": 0.5,
            "rotationSpeed": 0.019,
            "lastModified": datetime.now(timezone.utc).isoformat(),
            "version": 1
        },
        {
            "id": str(uuid.uuid4()),
            "name": "Jupiter",
            "type": "planet",
            "description": "O maior planeta. Representa o data warehouse principal.",
            "customFields": {
                "moduleName": "Data Warehouse",
                "endpoints": ["/api/warehouse/query", "/api/warehouse/etl"],
                "apiType": "REST",
                "status": "active"
            },
            "orbitRadius": 35,
            "orbitSpeed": 0.004,
            "scale": 2.5,
            "rotationSpeed": 0.04,
            "lastModified": datetime.now(timezone.utc).isoformat(),
            "version": 1
        },
        {
            "id": str(uuid.uuid4()),
            "name": "Saturn",
            "type": "planet",
            "description": "Planeta dos anéis. Representa integrações externas e APIs de terceiros.",
            "customFields": {
                "moduleName": "Integration Hub",
                "endpoints": ["/api/integrations/connect", "/api/integrations/sync"],
                "apiType": "REST/WebSocket",
                "status": "active"
            },
            "orbitRadius": 50,
            "orbitSpeed": 0.003,
            "scale": 2.0,
            "rotationSpeed": 0.038,
            "lastModified": datetime.now(timezone.utc).isoformat(),
            "version": 1
        },
        {
            "id": str(uuid.uuid4()),
            "name": "Uranus",
            "type": "planet",
            "description": "Planeta azul-esverdeado. Representa serviços de backup e recuperação.",
            "customFields": {
                "moduleName": "Backup Service",
                "endpoints": ["/api/backup/create", "/api/backup/restore"],
                "apiType": "REST",
                "status": "active"
            },
            "orbitRadius": 65,
            "orbitSpeed": 0.002,
            "scale": 1.5,
            "rotationSpeed": 0.03,
            "lastModified": datetime.now(timezone.utc).isoformat(),
            "version": 1
        },
        {
            "id": str(uuid.uuid4()),
            "name": "Neptune",
            "type": "planet",
            "description": "O planeta mais distante. Representa serviços de arquivamento de longo prazo.",
            "customFields": {
                "moduleName": "Archive Service",
                "endpoints": ["/api/archive/store", "/api/archive/retrieve"],
                "apiType": "REST",
                "status": "active"
            },
            "orbitRadius": 80,
            "orbitSpeed": 0.001,
            "scale": 1.4,
            "rotationSpeed": 0.032,
            "lastModified": datetime.now(timezone.utc).isoformat(),
            "version": 1
        }
    ]
    
    # Add 9 satellites (real moons + Aurora 7)
    satellite_data = [
        ("Phobos",    "Auth API"),
        ("Deimos",    "Payment Gateway"),
        ("Europa",    "Notification Service"),
        ("Ganymede",  "Search Engine"),
        ("Callisto",  "Cache Layer"),
        ("Titan",     "Message Queue"),
        ("Enceladus", "Log Aggregator"),
        ("Moon",      "Config Server"),
        ("Aurora 7",  "Nave B4 ERD-FX"),
    ]
    
    for i, (sat_name, module_name) in enumerate(satellite_data):
        angle = (i * 45) * (3.14159 / 180)
        default_objects.append({
            "id": str(uuid.uuid4()),
            "name": sat_name,
            "type": "satellite",
            "description": f"{module_name} - Microservico especializado no anel interno.",
            "customFields": {
                "moduleName": module_name,
                "endpoints": [f"/api/satellite/{module_name.lower().replace(' ', '-')}"],
                "apiType": "REST",
                "status": "active"
            },
            "orbitRadius": 10,
            "orbitSpeed": 0.025,
            "scale": 0.12,
            "position": {"x": 0, "y": 0, "z": 0},
            "lastModified": datetime.now(timezone.utc).isoformat(),
            "version": 1
        })
    
    # Insert all objects
    await db.objects.insert_many(default_objects)
    logger.info(f"Seeded {len(default_objects)} default objects")

# ==================== STATIC FILES ====================

# Mount textures directory for planet textures
TEXTURES_DIR = ROOT_DIR / "textures"
TEXTURES_DIR.mkdir(exist_ok=True)
app.mount("/api/textures", StaticFiles(directory=str(TEXTURES_DIR)), name="textures")

# Mount uploads directory for serving uploaded images
app.mount("/api/uploads", StaticFiles(directory=str(UPLOADS_DIR)), name="uploads")

# Include the router in the main app
app.include_router(api_router)

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get('CORS_ORIGINS', '*').split(','),
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()
