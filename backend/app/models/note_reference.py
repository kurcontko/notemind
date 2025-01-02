from enum import Enum
from typing import Optional, Any, Dict, List, Union
from uuid import uuid4
from datetime import datetime, timezone
from pydantic import BaseModel, Field, validator


class NoteReference(BaseModel):
    note_id: str = Field(..., description="ID of the referenced note", example="123e4567-e89b-12d3-a456-426614174000")
    relationship_type: str = Field(..., 
        description="Type of relationship to the referenced note",
        example="parent",
        pattern="^(parent|child|related)$")
    created_at: datetime = Field(default_factory=lambda: datetime.utcnow(),
        description="When the reference was created")
    metadata: Dict[str, Any] = Field(default_factory=dict,
        description="Additional metadata for the reference")
    