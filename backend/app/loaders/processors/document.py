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


class DocumentProcessor(ContentProcessor):
    async def process(self, file: UploadFile) -> FileContent:
        content = await file.read()
        storage_url = await self._save_to_blob(content, file.filename)
        
        # Use appropriate LlamaIndex loader based on file type
        ext = file.filename.lower().split('.')[-1]
        loader = None
        
        if ext == 'pdf':
            loader = PyMuPDFReader()
        elif ext in ['docx', 'doc']:
            loader = DocxReader()
        
        extracted_text = None
        if loader:
            documents = loader.load_data(file=io.BytesIO(content))
            extracted_text = "\n\n".join(doc.text for doc in documents)
        
        return FileContent(
            storage_url=storage_url,
            original_filename=file.filename,
            preview=f"File: {file.filename}",
            content=extracted_text
        )