from abc import ABC, abstractmethod
from typing import List, Dict, Optional, Any
from urllib.parse import urlparse
import hashlib
import asyncio
import aiohttp
from datetime import datetime, timezone
import io
import mimetypes
import base64

from fastapi import UploadFile
from azure.storage.blob.aio import BlobServiceClient
from langchain_core.messages import HumanMessage
from langchain_core.language_models import BaseLLM

from ...models.content import BaseContent, ImageContent
from .base import ContentProcessor
from ...services.azure.azure_ocr import AzureVisionAnalyzer

class ImageProcessor(ContentProcessor):
    def __init__(
        self, 
        blob_service: BlobServiceClient, 
        container_name: str, 
        azure_ocr: AzureVisionAnalyzer, 
        llm: BaseLLM):
        """
        Initialize ImageProcessor with Async Azure OCR capability.
        
        Args:
            blob_service (BlobServiceClient): Azure Blob Storage client
            container_name (str): Name of the blob container
            azure_ocr (AsyncAzureOCR): Instance of AsyncAzureOCR class for text extraction
        """
        self.azure_ocr = azure_ocr
        self.llm = llm
        super().__init__(blob_service, container_name)
        
    async def process(self, file: UploadFile) -> ImageContent:
        """
        Process an uploaded image file asynchronously.
        
        Args:
            file (UploadFile): FastAPI UploadFile object
            
        Returns:
            ImageContent: Processed image content with metadata and extracted text
        """
        content = await file.read()
        blob = await self._save_to_blob(content, file.filename)
        link = blob.get("url")
        markdown_link = f"![{file.filename}]({link})"
        
        # Extract text from image using async OCR
        #ocr_text = await self._extract_text(content)
        image_analyzer = AzureVisionAnalyzer()
        ocr_text, caption = await image_analyzer.analyze_image(link)
        ocr_text_md = f"```text\n{ocr_text}\n```\n" if ocr_text else ""
        description = await self.describe_image(content)
        markdown_content = f"{markdown_link}\n\n{ocr_text_md}\n\n{description}"
        
        return ImageContent(
            storage_url=blob.get("url"),
            storage_path=blob.get("path"),
            mime_type=blob.get("mime_type"),
            size_bytes=blob.get("size"),
            original_filename=blob.get("path"),
            alt_text=caption if caption else file.filename,
            ocr_text=ocr_text,
            content=markdown_content,
        )
    
    async def _extract_text(self, content: bytes) -> Optional[str]:
        """
        Extract text from image content using Async Azure OCR.
        
        Args:
            content (bytes): Raw image content
            
        Returns:
            Optional[str]: Extracted text or None if extraction fails
        """
        try:
            # Process the image bytes directly using async OCR
            result = await self.azure_ocr.read_image_from_bytes(content)
            
            # Join all extracted text lines if result contains text
            if result and "text" in result:
                return "\n".join(result["text"])
            
            return None
            
        except Exception as e:
            # Log the error in your preferred way
            print(f"Error extracting text from image: {str(e)}")
            return None
        
    async def describe_image(self, content: bytes) -> Optional[str]:
        """
        Describe an image using Azure Vision API.
        
        Args:
            content (bytes): Raw image content
            
        Returns:
            Optional[str]: Image description or None if description fails
        """
        try:
            image_data = base64.b64encode(content).decode()
            message = HumanMessage(
            content=[
                    {"type": "text", "text": "Describe this image:"},
                    {
                        "type": "image_url",
                        "image_url": {"url": f"data:image/jpeg;base64,{image_data}"},
                    },
                ],
            )
            response = await self.llm.ainvoke([message])
            return response.content
    
        except Exception as e:
            # Log the error in your preferred way
            #self.logger(f"Error describing image: {str(e)}")
            return None