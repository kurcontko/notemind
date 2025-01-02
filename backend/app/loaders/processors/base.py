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

from ...models.content import BaseContent


class ContentProcessor(ABC):
    """Base class for content type-specific processing"""
    def __init__(self, blob_service: BlobServiceClient, container_name: str):
        self.blob_service = blob_service
        self.container_name = container_name

    async def _save_to_blob(self, content: bytes, filename: str) -> str:
        """Save content to blob storage and return URL"""
        blob_name = f"{datetime.now().strftime('%Y%m/%d/%H%M%S')}/{filename}"
        async with self.blob_service:
            container_client = self.blob_service.get_container_client(self.container_name)
            blob_client = container_client.get_blob_client(blob_name)
            await blob_client.upload_blob(content)
            return blob_client.url
    
    @abstractmethod
    async def process(self) -> BaseContent:
        """Process content and return a content object"""
        pass
