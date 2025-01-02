from datetime import datetime
from typing import Dict, List, Optional, Any
from uuid import UUID

from pydantic import BaseModel, Field, HttpUrl
from fastapi import UploadFile

from ..models.note_reference import NoteReference


class NoteBase(BaseModel):
    title: Optional[str] = Field(None, 
        description="Note title",
        #max_length=200,
        example="My Important Note")
    content: Optional[str] = Field(None,
        description="Markdown content of the note",
        example="# Heading\nSome markdown content")
    categories: List[str] = Field(default_factory=list,
        description="Categories this note belongs to",
        example=["work", "projects"])
    tags: List[str] = Field(default_factory=list,
        description="Tags associated with the note",
        example=["important", "todo"])
    summary: Optional[str] = Field(None,
        description="Brief summary of the note",
        #max_length=500
    )


class NoteCreate(BaseModel):
    content: str = Field(..., 
        description="Main content of the note",
        example="# My Note\nThis is the content")
    files: List[UploadFile] = Field(
        default_factory=list,
        description="List of files to be uploaded with the note"
    )
    title: Optional[str] = Field(None,
        description="Optional note title",
        #max_length=200
    )
    tags: Optional[List[str]] = Field(None,
        description="Optional tags for the note")
    user_id: Optional[str] = Field(None,
        description="ID of the note owner")

    class Config:
        arbitrary_types_allowed = True


class Note(NoteBase):
    note_id: str = Field(..., 
        description="Unique identifier for the note",
        example="123e4567-e89b-12d3-a456-426614174000")
    user_id: Optional[str] = Field(None,
        description="ID of the note owner")
    entities: Dict[str, str] = Field(default_factory=dict,
        description="Named entities extracted from the note")
    linked_notes: List[NoteReference] = Field(default_factory=list,
        description="References to other related notes")
    created_at: datetime = Field(...,
        description="When the note was created")
    updated_at: datetime = Field(...,
        description="When the note was last modified")
    metadata: Dict[str, Any] = Field(default_factory=dict,
        description="Additional metadata for the note")

    class Config:
        from_attributes = True
        json_encoders = {
            datetime: lambda v: v.isoformat(),
            UUID: lambda v: str(v)
        }


class NoteUpdate(Note):
    files: List[UploadFile] = Field(
        default_factory=list,
        description="List of files to be uploaded with the note"
    )


class NoteResponse(Note):
    pass
