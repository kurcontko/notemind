from abc import ABC, abstractmethod
from typing import List, Dict, Optional, Any
from urllib.parse import urlparse
import hashlib
import asyncio
import aiohttp
from datetime import datetime, timezone
import io
import mimetypes
import os
import tempfile
import logging

from fastapi import UploadFile, HTTPException
from azure.storage.blob.aio import BlobServiceClient

from ...models.content import BaseContent, AudioContent
from .base import ContentProcessor
from ...services.transcription.whisper import WhisperTranscriber

logger = logging.getLogger(__name__)
        

class AudioProcessor(ContentProcessor):
    def __init__(self, blob_service: BlobServiceClient, container_name: str, transcriber: WhisperTranscriber):
        """Initialize the VideoProcessor with specified whisper model type."""
        self.transcriber = transcriber
        self.supported_formats = {'.mp3', '.wav', '.m4a', '.ogg', '.flac', '.aac'}
        super().__init__(blob_service, container_name)

        
    async def process(self, file: UploadFile) -> AudioContent:
        logger.info(f"Processing audio file: {file.filename}")
        try:
            content = await file.read()
            blob = await self._save_to_blob(content, file.filename)
            transcription = await self.transcriber.transcribe(content)
        except Exception as e:
            logger.error(f"Error processing audio file: {e}")
            raise HTTPException(status_code=500, detail="Failed to process audio file")
        
        return AudioContent(
            storage_url=blob.get("url"),
            storage_path=blob.get("path"),
            mime_type=blob.get("mime_type"),
            size_bytes=blob.get("size"),
            original_filename=file.filename,  
            content=transcription
        )