from typing import List, Optional, Dict
from fastapi import APIRouter, Depends, HTTPException, UploadFile, Form, File, Query

from ..deps import get_current_user, get_notes_loader, get_note_service
from ...schemas.note import NoteResponse
from ...services.db.base import NotesDbService


router = APIRouter(prefix="/search", tags=["search"])


@router.get("/", response_model=List[NoteResponse])
async def search_endpoint(
    mode: str = Query("basic", description="Search mode: basic, vector, or hybrid"),
    user_id: Optional[str] = Query(None),
    categories: Optional[str] = Query(None),
    tags: Optional[List[str]] = Query(None),
    search_text: Optional[str] = Query(None),
    query_embedding: Optional[List[float]] = Query(None),
    min_similarity: float = Query(0.7),
    limit: int = Query(10),
    service: NotesDbService = Depends(get_note_service),
    current_user = Depends(get_current_user)
):
    try:
        if mode == "basic":
            return await service.search_notes(
                user_id=user_id or current_user.id,
                categories=categories,
                tags=tags,
                search_text=search_text,
                limit=limit
            )
        elif mode == "vector":
            if not query_embedding:
                raise HTTPException(status_code=400, detail="query_embedding is required for vector search")
            results = await service.vector_search(query_embedding, limit, min_similarity)
            return [note for note, _ in results]
        elif mode == "hybrid":
            if not query_embedding:
                raise HTTPException(status_code=400, detail="query_embedding is required for hybrid search")
            results = await service.hybrid_search(
                query_embedding=query_embedding,
                query_text=search_text,
                user_id=current_user.id,
                categories=[categories] if categories else None,
                tags=tags,
                min_similarity=min_similarity,
                limit=limit
            )
            return [note for note, _ in results]
        else:
            raise HTTPException(status_code=400, detail="Invalid search mode")
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/tags", response_model=List[NoteResponse])
async def get_tags(
    service: NotesDbService = Depends(get_note_service),
    current_user = Depends(get_current_user)
):
    try:
        return await service.get_distinct_tags(current_user.id)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))