from fastapi import FastAPI, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
import time
from contextlib import asynccontextmanager
from functools import lru_cache

from .api.v1 import notes, search, chat
from .core.config import settings
from .services.db.cosmos_db import CosmosDBNotesService


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Startup and shutdown events for the FastAPI app"""
    # TODO: Cosmos Client should be global as singleton
    # Get settings and initialize services
    service = CosmosDBNotesService(
        endpoint=settings.AZURE_COSMOS_URI,
        database_name=settings.AZURE_COSMOS_DATABASE,
        container_name=settings.AZURE_COSMOS_CONTAINER,
        credential=settings.AZURE_COSMOS_KEY,
        embeddings=None
    )
    
    # Initialize container on startup
    try:
        container_exists = False
        async for container in service.database.list_containers():
            if container['id'] == settings.AZURE_COSMOS_CONTAINER:
                container_exists = True
                break
                
        if not container_exists:
            await service.create_container()
    except Exception as e:
        print(f"Failed to initialize container: {str(e)}")
        raise
        
    yield
    
    # Cleanup on shutdown
    # await service.client.close()

app = FastAPI(
    title=settings.PROJECT_NAME,
    version=settings.VERSION,
    lifespan=lifespan
)

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    #allow_origins=settings.ALLOWED_ORIGINS,
    allow_origins=["*"],  # TODO: Remove for production
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/")
async def root():
    return {
        "app_name": settings.PROJECT_NAME,
        "version": settings.VERSION,
        "docs_url": "/docs",
        "redoc_url": "/redoc"
    }

@app.get("/health")
async def health_check():
    return {"status": "healthy"}

# Include routers
app.include_router(notes.router, prefix="/api/v1")
#app.include_router(users.router, prefix="/api/v1")
app.include_router(search.router, prefix="/api/v1")
app.include_router(chat.router, prefix="/api/v1")