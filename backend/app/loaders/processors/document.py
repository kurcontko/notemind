from typing import List, Dict, Optional, Any, Tuple
from urllib.parse import urlparse
import hashlib
import asyncio
import aiohttp
from datetime import datetime, timezone
import io
import mimetypes

from fastapi import UploadFile
from llama_index.readers.file import (
    DocxReader,
    HWPReader,
    PDFReader,
    EpubReader,
    FlatReader,
    HTMLTagReader,
    ImageCaptionReader,
    ImageReader,
    ImageVisionLLMReader,
    IPYNBReader,
    MarkdownReader,
    MboxReader,
    PptxReader,
    PandasCSVReader,
    VideoAudioReader,
    UnstructuredReader,
    PyMuPDFReader,
    ImageTabularChartReader,
    XMLReader,
    PagedCSVReader,
    CSVReader,
    RTFReader,
)
from llama_index.readers.web import BeautifulSoupWebReader
from llama_index.core.schema import Document
from langchain_core.embeddings import Embeddings
from langchain_core.language_models import BaseLanguageModel
from langchain_core.output_parsers import StrOutputParser, JsonOutputParser
from langchain_core.prompts import PromptTemplate
from langchain_core.runnables import Runnable
from azure.storage.blob.aio import BlobServiceClient
from bs4 import BeautifulSoup
from markdownify import markdownify as md

from ...models.content import ContentType, ContentUnion, TextContent, ImageContent, VideoContent, FileContent, LinkContent
from ...models.note import Note
from .base import ContentProcessor
from ...services.azure.azure_document import AzureDocumentIntelligence


class DocumentProcessor(ContentProcessor):
    def __init__(
        self, 
        blob_service: BlobServiceClient, 
        container_name: str, 
        azure_doc_intelligence: AzureDocumentIntelligence
    ):
        """
        Initialize ImageProcessor with Azure OCR capability.
        
        Args:
            azure_ocr (AzureOCR): Instance of AzureOCR class for text extraction
        """
        self.azure_doc_intelligence = azure_doc_intelligence
        super().__init__(blob_service, container_name)
        
    async def process(self, file: UploadFile) -> FileContent:
        content = await file.read()
        blob = await self._save_to_blob(content, file.filename)
        
        try:
            # Extract text using Azure Document Intelligence
            extracted_text = await self.azure_doc_intelligence.get_markdown_content(content)
            
            # If Azure processing fails, fall back to LlamaIndex loaders
            if not extracted_text:
                ext = file.filename.lower().split('.')[-1]
                loader = None
                
                if ext == 'pdf':
                    loader = PyMuPDFReader()
                elif ext in ['docx', 'doc']:
                    loader = DocxReader()
                else:
                    loader = FlatReader()
                
                if loader:
                    documents = loader.load_data(file=io.BytesIO(content))
                    extracted_text = "\n\n".join(doc.text for doc in documents)
            
            return FileContent(
                storage_url=blob.get("url"),
                storage_path=blob.get("path"),
                mime_type=blob.get("mime_type"),
                size_bytes=blob.get("size"),
                original_filename=file.filename,
                preview=f"File: {file.filename}",
                content=extracted_text
            )
            
        except Exception as e:
            # Log the error and fall back to basic file content
            print(f"Error processing document with Azure: {str(e)}")
            return FileContent(
                storage_url=blob.get("url"),
                storage_path=blob.get("path"),
                mime_type=blob.get("mime_type"),
                size_bytes=blob.get("size"),
                original_filename=file.filename,
                preview=f"File: {file.filename}",
                content=None
            )