from typing import List, Dict, Optional, Any, Tuple
from urllib.parse import urlparse
import hashlib
import asyncio
import aiohttp
from datetime import datetime, timezone
import io
import mimetypes
import re
import logging

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
import tiktoken
from openai import AsyncAzureOpenAI, AsyncOpenAI

from ..models.content import ContentType, ContentUnion, TextContent, ImageContent, VideoContent, FileContent, LinkContent
from ..models.note import Note
from ..services.transcription.whisper import WhisperTranscriber
from .llm_chains import ContentChains
from .processors.audio import AudioProcessor
from .processors.document import DocumentProcessor
from .processors.image import ImageProcessor
from .processors.link import LinkProcessor
from .processors.text import TextProcessor
from .processors.video import VideoProcessor
from ..services.azure.azure_document import AzureDocumentIntelligence
from ..services.azure.azure_ner import AzureNER
from ..services.azure.azure_ocr import AzureVisionAnalyzer


class NotesLoader:

    TEXT_APPLICATIONS = {
        'application/json',
        'application/xml',
        'application/yaml',
        'application/x-yaml',
        'application/x-yml',
        'application/ld+json',
        'application/javascript',
        'application/ecmascript',
        'application/x-httpd-php',
        'application/x-sh',
        'application/x-csh',
        'application/graphql',
        'application/x-www-form-urlencoded',
        'application/sql',
        'application/x-sql',
        'application/rtf',
        'application/x-latex',
        'application/x-tex',
        'application/x-markdown',
        'application/toml',
        'application/x-properties',
        'application/x-python',
        'application/x-ruby',
        'application/x-perl',
        'application/x-java',
        'application/typescript'
    }

    def __init__(
        self,
        llm: BaseLanguageModel,
        embeddings: Embeddings,
        storage_account: str,
        storage_key: str,
        container_name: str,
        openai_client: AsyncAzureOpenAI | AsyncOpenAI,
        azure_ocr: AzureVisionAnalyzer,
        azure_document: AzureDocumentIntelligence,
        azure_ner: AzureNER
    ):
        self.llm = llm
        self.embeddings = embeddings
        self.logger = logging.getLogger(__name__)
        
        # Add DI for Azure Blob Storage
        storage_endpoint = f"https://{storage_account}.blob.core.windows.net"
        self.blob_service = BlobServiceClient(account_url=storage_endpoint, credential=storage_key)
        self.container_name = container_name
        
        # Initialize LangChain processing chains
        self.chains = ContentChains(llm)
        
        self.whisper = WhisperTranscriber(client=openai_client)
        self.azure_ocr = azure_ocr
        self.azure_document = azure_document
        self.azure_ner = azure_ner
        
        # Initialize processors
        self.processors = {
            ContentType.AUDIO: AudioProcessor(self.blob_service, container_name, self.whisper),
            ContentType.TEXT: TextProcessor(self.blob_service, container_name),
            ContentType.IMAGE: ImageProcessor(self.blob_service, container_name, self.azure_ocr, self.llm),
            ContentType.VIDEO: VideoProcessor(self.blob_service, container_name, self.whisper),
            ContentType.DOCUMENT: DocumentProcessor(self.blob_service, container_name, self.azure_document),
            ContentType.LINK: LinkProcessor(self.blob_service, container_name)
        }

    def _detect_content_type(self, file: UploadFile) -> ContentType:
        """Detect content type from file"""
        mime_type = file.content_type or mimetypes.guess_type(file.filename)[0]
        
        # TODO: Add support for more content types
        if mime_type:
            if mime_type.startswith('image/'):
                return ContentType.IMAGE
            elif mime_type.startswith('video/'):
                return ContentType.VIDEO
            elif mime_type.startswith('text/'):
                return ContentType.TEXT
            elif mime_type.startswith('audio/'):
                return ContentType.AUDIO
            elif mime_type.startswith('application/'):
                if mime_type in self.TEXT_APPLICATIONS:
                    return ContentType.TEXT
        
        return ContentType.DOCUMENT

    def _is_valid_url(self, text: str) -> bool:
        try:
            result = urlparse(text)
            return all([result.scheme, result.netloc])
        except:
            return False

    async def _generate_metadata(
        self,
        content: str,
        context = ""
    ) -> tuple[str, str, List[str], Dict[str, str]]:
        """Generate all metadata using LangChain chains"""
        if not content:
            raise ValueError("No content to process")
        
        # Run all chains in parallel
        try:
            title, summary, tags, entities = await asyncio.gather(
                self.chains.title_chain.ainvoke({"content": content}),
                self.chains.summary_chain.ainvoke({"content": content}),
                self.chains.tags_chain.ainvoke({"content": content}),
                self.chains.entities_chain.ainvoke({"content": content})
            )
        except Exception as e:
            self.logger.error(f"Failed to generate metadata: {str(e)}")
        
        return title, summary, tags, entities

    async def create_note(
        self,
        text_input: Optional[str] = None,
        files: Optional[List[UploadFile]] = None,
        user_id: Optional[str] = None
    ) -> Note:
        """Create a note from text input and files"""
        if not text_input and not files:
            raise ValueError("At least one input source required")

        link_contents = []
        leftover_text = ""
        if text_input:
            # Use regex to find URLs while preserving other formatting
            url_pattern = r'https?://\S+'
            urls = re.findall(url_pattern, text_input)
            
            link_tasks = [self.processors[ContentType.LINK].process(url) for url in urls]
            link_contents = await asyncio.gather(*link_tasks)
            
            leftover_text = text_input
            # for url in urls:
            #     leftover_text = leftover_text.replace(url, '')

        processed_files = []
        if files:
            processed_files = await self.process_files(files)

        note = Note(
            user_id=user_id,
            content=leftover_text
        )
        for content in link_contents:
            note.add_content(content)
        for content in processed_files:
            note.add_content(content)

        # Generate metadata and embeddings with concurrency
        title, summary, tags, entities = await self._generate_metadata(note.content)
        
        # Generate embedding for the summary
        encoding = tiktoken.get_encoding("cl100k_base")
        token_count = len(encoding.encode(note.content))
        if token_count > 8191: # Limit 
            embedding = await self.embeddings.aembed_query(summary)
        else:
            embedding = await self.embeddings.aembed_query(note.content)
        
        # Create note
        note.title = title
        note.summary = summary
        note.tags = tags
        note.entities = entities
        note.embedding = embedding
        
        return note
    
    async def process_files(self, files: List[UploadFile]) -> List[FileContent]:
        """Process a list of files to extract content concurrently"""
        
        async def process_single_file(file: UploadFile) -> FileContent:
            content_type = self._detect_content_type(file)
            processor = self.processors[content_type]
            return await processor.process(file)

        # Create a list of coroutine tasks for each file
        tasks = [process_single_file(file) for file in files]
        
        # Execute all tasks concurrently and gather the results
        contents = await asyncio.gather(*tasks, return_exceptions=False)
        
        return contents



