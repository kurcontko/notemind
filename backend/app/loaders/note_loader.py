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

from ..models.content import ContentType, ContentUnion, TextContent, ImageContent, VideoContent, FileContent, LinkContent
from ..models.note import Note
from .processors.document import DocumentProcessor
from .processors.image import ImageProcessor
from .processors.link import LinkProcessor
from .processors.text import TextProcessor
from .processors.video import VideoProcessor
from .llm_chains import ContentChains



class NotesLoader:
    def __init__(
        self,
        llm: BaseLanguageModel,
        embeddings: Embeddings,
        storage_endpoint: str,
        storage_key: str,
        container_name: str
    ):
        self.llm = llm
        self.embeddings = embeddings
        
        # Add DI for Azure Blob Storage
        self.blob_service = BlobServiceClient(account_url=storage_endpoint, credential=storage_key)
        self.container_name = container_name
        
        # Initialize LangChain processing chains
        self.chains = ContentChains(llm)
        
        # Initialize processors
        self.processors = {
            #ContentType.AUDIO: AudioProcessor(self.blob_service, container_name, self.chains),
            ContentType.TEXT: TextProcessor(self.blob_service, container_name, self.chains),
            ContentType.IMAGE: ImageProcessor(self.blob_service, container_name, self.chains),
            ContentType.VIDEO: VideoProcessor(self.blob_service, container_name, self.chains),
            ContentType.DOCUMENT: DocumentProcessor(self.blob_service, container_name, self.chains),
            ContentType.LINK: LinkProcessor(self.blob_service, container_name, self.chains)
        }

    def _detect_content_type(self, file: UploadFile) -> ContentType:
        """Detect content type from file"""
        mime_type = file.content_type or mimetypes.guess_type(file.filename)[0]
        
        if mime_type:
            if mime_type.startswith('image/'):
                return ContentType.IMAGE
            elif mime_type.startswith('video/'):
                return ContentType.VIDEO
            elif mime_type.startswith('text/'):
                return ContentType.TEXT
        
        return ContentType.FILE

    def _is_valid_url(self, text: str) -> bool:
        try:
            result = urlparse(text)
            return all([result.scheme, result.netloc])
        except:
            return False

    async def _generate_metadata(
        self,
        contents: List[ContentUnion]
    ) -> tuple[str, str, List[str], Dict[str, str]]:
        """Generate all metadata using LangChain chains"""
        text_content = []
        for content in contents:
            if content.type == ContentType.TEXT:
                text_content.append(content.text)
            elif content.preview:
                text_content.append(content.preview)
        
        combined_text = " ".join(text_content)
        context = ""
         
        if not combined_text:
            raise ValueError("No content to process")
        
        # Run all chains in parallel
        title, summary, tags, entities = await asyncio.gather(
            self.chains.title_chain.ainvoke({"content": combined_text}),
            self.chains.summary_chain.ainvoke({
                "content": combined_text,
                "context": context
            }),
            self.chains.tags_chain.ainvoke({"content": combined_text}),
            self.chains.entities_chain.ainvoke({"content": combined_text})
        )
        
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

        contents: List[ContentUnion] = []
        
        # Process text input
        if text_input:
            # Extract URLs
            words = text_input.split()
            urls = [word for word in words if self._is_valid_url(word)]
            
            # Process URLs
            for url in urls:
                link_content = await self.processors[ContentType.LINK].process(url)
                contents.append(link_content)
            
            # Process remaining text
            remaining_text = ' '.join(word for word in words if word not in urls)
            if remaining_text.strip():
                text_content = await self.processors[ContentType.TEXT].process(remaining_text)
                contents.append(text_content)
        
        # Process files
        if files:
            processed_files = await self.process_files(files)
            contents.extend(processed_files)
        
        # Generate metadata using LangChain chains
        title, summary, tags, entities = await self._generate_metadata(contents)
        
        # Generate embedding for the summary
        embedding = await self.embeddings.aembed_query(summary)
        
        # Create note
        note = Note(
            user_id=user_id,
            contents=contents,
            title=title,
            summary=summary,
            tags=tags,
            entities=entities,
            embedding=embedding
        )
        
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
        
    
