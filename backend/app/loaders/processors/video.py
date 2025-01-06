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

from fastapi import UploadFile, HTTPException
from azure.storage.blob.aio import BlobServiceClient
from moviepy import VideoFileClip

from ...models.content import BaseContent, VideoContent
from .base import ContentProcessor
from ...services.transcription.whisper import WhisperTranscriber
        

class VideoProcessor(ContentProcessor):
    def __init__(self, blob_service: BlobServiceClient, container_name: str, transcriber: WhisperTranscriber):
        """Initialize the VideoProcessor with specified whisper model type."""
        self.transcriber = transcriber
        self.supported_formats = {'.mp4', '.avi', '.mov', '.mkv', '.webm'}
        super().__init__(blob_service, container_name)

    async def extract_audio(self, video_file: UploadFile) -> str:
        """
        Extract audio from video file and save it as temporary WAV file.
        
        Args:
            video_file (UploadFile): Uploaded video file
            
        Returns:
            str: Path to the extracted audio file
            
        Raises:
            HTTPException: If file format is not supported or processing fails
        """
        # Check file extension
        file_ext = os.path.splitext(video_file.filename)[1].lower()
        if file_ext not in self.supported_formats:
            raise HTTPException(
                status_code=400,
                detail=f"Unsupported file format. Supported formats: {', '.join(self.supported_formats)}"
            )

        try:
            # Create temporary files for video and audio
            with tempfile.NamedTemporaryFile(suffix=file_ext, delete=False) as temp_video:
                # Read uploaded file content
                content = await video_file.read()
                temp_video.write(content)
                temp_video_path = temp_video.name

            # Create temporary file for audio
            temp_audio_path = tempfile.mktemp(suffix='.wav')

            # Extract audio using moviepy
            with VideoFileClip(temp_video_path) as video:
                video.audio.write_audiofile(
                    temp_audio_path,
                    codec='pcm_s16le',  # Use PCM format for better compatibility
                    fps=16000  # Sample rate that works well with Whisper
                )

            # Clean up temporary video file
            os.unlink(temp_video_path)

            return temp_audio_path

        except Exception as e:
            # Clean up any temporary files in case of error
            if 'temp_video_path' in locals():
                os.unlink(temp_video_path)
            if 'temp_audio_path' in locals() and os.path.exists(temp_audio_path):
                os.unlink(temp_audio_path)
            raise HTTPException(status_code=500, detail=f"Error processing video: {str(e)}")

    async def transcribe_video(self, video_file: UploadFile) -> dict:
        """
        Extract audio and transcribe the video.
        
        Args:
            video_file (UploadFile): Uploaded video file
            
        Returns:
            dict: Transcription results
        """
        try:
            # Extract audio
            audio_path = await self.extract_audio(video_file)

            # Transcribe using Whisper
            result = self.transcriber.transcribe(audio_path)

            # Clean up temporary audio file
            os.unlink(audio_path)

            return result

        except Exception as e:
            raise HTTPException(status_code=500, detail=f"Transcription failed: {str(e)}")
        
    async def process(self, file: UploadFile) -> VideoContent:
        content = await file.read()
        blob = await self._save_to_blob(content, file.filename)
        
        transcription = await self.transcribe_video(file)
        
        return VideoContent(
            storage_url=blob.get("url"),
            storage_path=blob.get("path"),
            mime_type=blob.get("mime_type"),
            size_bytes=blob.get("size"),
            original_filename=blob.get("path"),
            content=transcription
        )