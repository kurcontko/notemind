from enum import Enum
from typing import Optional, Any, Dict, List, Union
from uuid import uuid4
from datetime import datetime, timezone, timedelta

from pydantic import BaseModel, Field


class ContentType(str, Enum):
    AUDIO = "audio"
    TEXT = "text"
    DOCUMENT = "document"
    IMAGE = "image"
    VIDEO = "video"
    FILE = "file"
    LINK = "link"


# Base class for shared fields
class BaseContent(BaseModel):
    content_id: str = Field(default_factory=lambda: str(uuid4()))
    type: ContentType
    preview: Optional[str] = None  # short description or snippet if relevant
    content: Optional[str] = None  # full content if needed


class TextContent(BaseContent):
    type: ContentType = Field(default=ContentType.TEXT)
    

class FileContent(BaseContent):
    type: ContentType = Field(default=ContentType.FILE)
    storage_url: str
    storage_path: str
    original_filename: str
    mime_type: str
    size_bytes: int
    file_hash: Optional[str] = None


class ImageContent(FileContent):
    type: ContentType = Field(default=ContentType.IMAGE)
    thumbnail_path: Optional[str] = None
    
    # Image metadata
    alt_text: Optional[str] = None
    ocr_text: Optional[str] = None
    description: Optional[str] = None


class VideoContent(FileContent):
    type: ContentType = Field(default=ContentType.VIDEO)
    thumbnail_path: Optional[str] = None
    
    # Video metadata
    resolution: Optional[tuple[int, int]] = None
    fps: Optional[float] = None
    codec: Optional[str] = None
    duration_seconds: Optional[int] = None
    duration: Optional[timedelta]
    
    # Transcription
    transcription: Optional[str] = None
    transcription_language: Optional[str] = None
    auto_transcribed: bool = False


class LinkContent(FileContent):
    type: ContentType = Field(default=ContentType.LINK)
    url: str
    

class AudioContent(FileContent):
    type: ContentType = Field(default=ContentType.AUDIO)
    
    # Audio metadata
    duration_seconds: Optional[int]
    duration: Optional[timedelta]
    codec: Optional[str]
    sample_rate: Optional[int]
    bit_rate: Optional[int]
    channels: Optional[int]


ContentUnion = Union[
    TextContent,
    ImageContent,
    VideoContent,
    FileContent,
    LinkContent
]