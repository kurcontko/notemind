from typing import List, Dict, Optional, Any, Tuple
from urllib.parse import urlparse
import hashlib
import asyncio
import aiohttp
from datetime import datetime, timezone
import io
import mimetypes

from fastapi import UploadFile
from llama_index.core.schema import Document
from bs4 import BeautifulSoup
from markdownify import markdownify as md
from azure.storage.blob.aio import BlobServiceClient

from ...models.content import ContentType, ContentUnion, TextContent, ImageContent, VideoContent, FileContent, LinkContent
from ...models.note import Note
from .base import ContentProcessor


class LinkProcessor(ContentProcessor):
    def __init__(self, blob_service: BlobServiceClient, container_name: str):
        self._website_extractor = {}  # Your website-specific extractors
        super().__init__(blob_service, container_name)

    def _extract_content(
        self,
        soup: BeautifulSoup,
        url: str,
        hostname: str,
        include_url_in_text: bool = True
    ) -> Tuple[str, dict]:
        """Extract content using website-specific extractor or default method."""
        extra_info = {"URL": url}        
        if hostname in self._website_extractor:
            content, metadata = self._website_extractor[hostname](
                soup=soup,
                url=url,
                include_url_in_text=include_url_in_text
            )
            extra_info.update(metadata)
        else:
            content = soup.getText()
            
        return content, extra_info

    def html_to_markdown(self, html_content: str) -> str:
        """Convert HTML to Markdown."""
        return md(html_content, heading_style="ATX")

    async def process(self, url: str) -> LinkContent:
        """Process a single URL to extract content and store original HTML."""
        async with aiohttp.ClientSession() as session:
            try:
                async with session.get(url) as response:
                    response.raise_for_status()
                    html_content = await response.text()
            except aiohttp.ClientError as e:
                raise ValueError(f"Failed to fetch URL {url}: {str(e)}")

        # Process HTML content
        soup = BeautifulSoup(html_content, "html.parser")
        hostname = urlparse(url).hostname or ""
        
        # Extract content and metadata
        content, extra_info = self._extract_content(
            soup=soup,
            url=url,
            hostname=hostname
        )
        
        # Convert to markdown
        markdown_content = self.html_to_markdown(str(soup))
        
        # Save original HTML to blob storage
        blob = await self._save_to_blob(
            content=html_content.encode('utf-8'),
            filename=f"{hashlib.md5(url.encode()).hexdigest()}.html",
            mime="text/html"
        )
        
        # Create preview
        preview = f"{content[:200]}..." if content else url
        
        return LinkContent(
            url=url,
            storage_url=blob.get("url"),
            storage_path=blob.get("path"),
            mime_type="text/html",
            size_bytes=blob.get("size"),
            original_filename=blob.get("path"),
            preview=preview,
            content=markdown_content
        )

    async def load_data(
        self,
        urls: List[str],
        custom_hostname: Optional[str] = None,
        include_url_in_text: Optional[bool] = True,
    ) -> List[Document]:
        """Load data from multiple URLs asynchronously."""
        documents = []
        
        async with aiohttp.ClientSession() as session:
            tasks = []
            for url in urls:
                task = self.process(url)
                tasks.append(task)
            
            results = await asyncio.gather(*tasks, return_exceptions=True)
            
            for url, result in zip(urls, results):
                if isinstance(result, Exception):
                    print(f"Error processing {url}: {str(result)}")
                    continue
                    
                documents.append(
                    Document(
                        text=result.content,
                        id_=url,
                        extra_info={"URL": url, "storage_url": result.storage_url}
                    )
                )
        
        return documents
