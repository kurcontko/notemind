from typing import List, Optional, Dict
from fastapi import APIRouter, Depends, HTTPException, UploadFile, Form, File, Query
from datetime import datetime, timezone

from ...schemas.note import NoteResponse, NoteUpdate, NoteCreate
from ...models.note import Note
from ...loaders.note_loader import NotesLoader
from ...api.deps import get_current_user, get_notes_loader, get_note_service
from ...services.db.base import NotesDbService


router = APIRouter(prefix="/notes", tags=["notes"])


@router.post("/", response_model=NoteResponse)
async def create_note(
    text: Optional[str] = Form(None),
    files: Optional[List[UploadFile]] = File(None),
    loader: NotesLoader = Depends(get_notes_loader),
    service: NotesDbService = Depends(get_note_service),
    current_user = Depends(get_current_user)
):
    if not text and not files:
        raise HTTPException(status_code=400, detail="No content provided")
    try:
        note = await loader.create_note(
            text_input=text,
            files=files,
            user_id=current_user.id
        )
        created_note = await service.create_note(note=note, user_id=current_user.id)
        if not created_note:
            raise HTTPException(status_code=404, detail="Note not found after creation")
        return created_note
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/{note_id}", response_model=NoteResponse)
async def read_note(
    note_id: str,
    service: NotesDbService = Depends(get_note_service),
    current_user = Depends(get_current_user)
):
    note = await service.get_note(note_id=note_id, user_id=current_user.id)
    if not note:
        raise HTTPException(status_code=404, detail="Note not found")
    return note


@router.put("/{note_id}", response_model=NoteResponse)
async def update_note(
    note_id: int,
    note: NoteUpdate,
    loader: NotesLoader = Depends(get_notes_loader),
    service: NotesDbService = Depends(get_note_service),
    current_user = Depends(get_current_user)
) -> NoteResponse:
    """Update an existing note with new content and metadata."""
    try:
        # Fetch existing note
        existing_note: Note = await service.get_note(note_id=note_id, user_id=current_user.id)
        if not existing_note:
            raise HTTPException(status_code=404, detail="Note not found")
            
        # Update fields if provided in the request
        update_fields = ['content', 'title', 'tags', 'categories']
        for field in update_fields:
            if value := getattr(note, field):
                setattr(existing_note, field, value)
        
        # Process files if provided
        if note.files:
            contents = await loader.process_files(files=note.files)
            for content in contents:
                existing_note.add_content(content)
        
        existing_note.updated_at = datetime.now(timezone.utc)
        
        # Persist updates
        result = await service.update_note(existing_note, user_id=current_user.id)
        if not result:
            raise HTTPException(status_code=404, detail="Note not found after update")
            
        return existing_note.to_frontend()
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.delete("/{note_id}")
async def delete_note(
    note_id: str,
    service: NotesDbService = Depends(get_note_service),
    current_user = Depends(get_current_user)
):
    existing_note = await service.get_note(note_id=note_id, user_id=current_user.id)
    if not existing_note:
        raise HTTPException(status_code=404, detail="Note not found")
    try:
        await service.delete_note(note_id, user_id=current_user.id)
        return {"message": "Note deleted successfully"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/", response_model=List[NoteResponse])
async def get_recent_notes(
    offset: int = Query(0, ge=0),
    limit: int = Query(10, ge=1),
    service: NotesDbService = Depends(get_note_service),
    current_user = Depends(get_current_user)
):
    try:
        return await service.get_recent_notes(
            user_id=current_user.id,
            offset=offset,
            limit=limit
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
