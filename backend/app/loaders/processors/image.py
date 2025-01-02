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

from ...models.content import BaseContent, ImageContent
from .base import ContentProcessor


class ImageProcessor(ContentProcessor):
    async def process(self, file: UploadFile) -> ImageContent:
        content = await file.read()
        storage_url = await self._save_to_blob(content, file.filename)
        
        # TODO: Use llm to extract OCR text from image
        #loader = I
        #documents = loader.load_data(file=io.BytesIO(content))
        documents = []
        
        return ImageContent(
            storage_url=storage_url,
            alt_text=file.filename,
            preview=f"Image: {file.filename}",
            ocr_text=documents[0].text if documents else None
        )