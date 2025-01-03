from enum import Enum
from typing import Optional, Any, Dict, List, Union
from uuid import uuid4
from datetime import datetime, timezone
from pydantic import BaseModel, Field, validator

from .content import ContentUnion, BaseContent, FileContent
from ..schemas.note import Note as FrontendNote
from .note_reference import NoteReference


class Note(BaseModel):
    """Primary note entity - can hold multiple content items."""
    note_id: str = Field(default_factory=lambda: str(uuid4()))
    user_id: Optional[str] = None

    # Store multiple content items of any type
    content: str = None # Markdown content
    content_map: Dict[str, FileContent] = Field(default_factory=dict)  # Maps content IDs to their full metadata
    
    categories: List[str] = Field(default_factory=list)
    title: Optional[str] = None
    tags: Optional[List[str]] = Field(default_factory=list)
    summary: Optional[str] = None
    entities: Optional[Dict[str, str]] = Field(default_factory=dict)

    # Vector or AI search embedding for the entire note or summary
    embedding: Optional[List[float]] = None

    # Graph-like references to other notes
    linked_notes: List[NoteReference] = Field(default_factory=list)

    # Timestamps, metadata, etc.
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    metadata: Dict[str, Any] = Field(default_factory=dict)
    
    @validator('content')
    def validate_content(cls, v, values):
        """Validate that all content references in markdown exist in content_map"""
        # Implementation would check for ![ref](content:abc123) style references
        return v
    
    def add_file_content(self, content: FileContent) -> 'Note':
        self.content_map[content.content_id] = content
        md = self.content
        md += "\n---"
        if content.storage_url:
            md += f"\n![{content.content_id}]({content.storage_url})"
        if content.content:
            md += f"\n{content.content}"
        md += "\n---"
        self.content = md
        return self
    
    def add_content(self, content: Union[BaseContent, FileContent]) -> 'Note':
        if isinstance(content, FileContent):
            return self.add_file_content(content)
        md = self.content
        md += "\n\n"
        if content.preview:
            md += f"\n{content.preview}"
        if content.content:
            md += f"\n{content.content}"
        self.content = md
        return self
    
    def to_frontend(self) -> 'FrontendNote':
        """Convert to frontend model"""
        return FrontendNote(
            note_id=self.note_id,
            user_id=self.user_id,
            content=self.content,
            categories=self.categories,
            title=self.title,
            tags=self.tags,
            summary=self.summary,
            entities=self.entities,
            linked_notes=self.linked_notes,
            created_at=self.created_at,
            updated_at=self.updated_at,
            metadata=self.metadata
        )
    
    @classmethod
    def to_frontend_list(cls, notes: List['Note']) -> List['FrontendNote']:
        """Convert list of notes to frontend models"""
        return [note.to_frontend() for note in notes]
    