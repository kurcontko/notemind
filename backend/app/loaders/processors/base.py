from abc import ABC, abstractmethod
from typing import List, Dict, Optional, Any
from urllib.parse import urlparse
import hashlib
import asyncio
import aiohttp
from datetime import datetime, timezone
import io
import mimetypes

from fastapi import UploadFile
from azure.storage.blob.aio import BlobServiceClient
from azure.storage.blob import ContentSettings

from ...models.content import BaseContent


class ContentProcessor(ABC):
    """Base class for content type-specific processing"""
    def __init__(self, blob_service: BlobServiceClient, container_name: str):
        self.blob_service = blob_service
        self.container_name = container_name

    async def _save_to_blob(self, content: bytes, filename: str, mime: str = "") -> Dict[str, Any]:
        """Save content to blob storage and return URL"""
        if not mime:
            guessed_type, _ = mimetypes.guess_type(filename)
            mime_to_use = guessed_type or "application/octet-stream"
        else:
            mime_to_use = mime

        blob_name = f"{datetime.now().strftime('%Y%m/%d/%H%M%S')}/{filename}"
        async with self.blob_service:
            container_client = self.blob_service.get_container_client(self.container_name)
            blob_client = container_client.get_blob_client(blob_name)
            await blob_client.upload_blob(
                content,
                content_settings=ContentSettings(content_type=mime_to_use)
            )
            props = await blob_client.get_blob_properties()
            return {
                "url": blob_client.url,
                "path": blob_name,
                "size": props.size,
                "mime_type": props.content_settings.content_type
            }
    
    @abstractmethod
    async def process(self) -> BaseContent:
        """Process content and return a content object"""
        pass
