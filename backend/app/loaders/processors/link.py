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

from llama_index.core import SimpleDirectoryReader
from llama_index.readers.reddit import RedditReader
from llama_index.readers.youtube_transcript import YoutubeTranscriptReader

from ...models.content import ContentType, ContentUnion, TextContent, ImageContent, VideoContent, FileContent, LinkContent
from ...models.note import Note
from .base import ContentProcessor
from .url_content_loader import URLContentLoader


class LinkProcessor(ContentProcessor):
    def __init__(self, blob_service: BlobServiceClient, container_name: str):
        self._website_extractor = {
            "www.youtube.com": self._youtube_loader,
            "youtu.be": self._youtube_loader,
            #"www.reddit.com": self._reddit_loader, # Temporary disabled due to API key requirement
            "www.x.com": self._x_loader,
        }
        self._content_loader = URLContentLoader()
        super().__init__(blob_service, container_name)

    def _youtube_loader(self, url: str) -> Tuple[str, dict]:
        """Loads youtube transcript using YoutubeTranscriptReader."""
        try:
            loader = YoutubeTranscriptReader()
            documents = loader.load_data(ytlinks=[url])
            content = " ".join([doc.text for doc in documents])
            return content, {"content_type": "youtube_transcript"}
        except Exception as e:
            print(f"Error loading YouTube transcript for {url}: {e}")
            return "", {"content_type": "youtube_transcript", "error": str(e)}
    
    async def _x_loader(self, url: str) -> Tuple[str, dict]:
        """Loads text from x.com url using standard loader."""
        try:
            # Extract tweet ID from the URL
            tweet_id = url.split('/')[-1]

            # Construct the API URL
            api_url = f"https://api.vxtwitter.com/status/{tweet_id}"

            async with aiohttp.ClientSession() as session:
                async with session.get(api_url) as response:
                    response.raise_for_status()
                    data = await response.json()

            # Extract the relevant information
            text = data.get("text", "")
            date = data.get("date", "")
            likes = data.get("likes", "")
            retweets = data.get("retweets", "")
            author_name = data.get("author_name", "")

            # Construct the content string
            content = f"**{author_name}**\n\n{text}\n\n❤️ {likes}  🔁 {retweets}  📅 {date}"

            return content, {"content_type": "tweet"}
        
        except Exception as e:
            print(f"Error loading tweet for {url}: {e}")
            return "", {"content_type": "tweet", "error": str(e)}

    async def _extract_content(
        self,
        soup: BeautifulSoup,
        url: str,
        hostname: str,
        include_url_in_text: bool = True
    ) -> Tuple[str, dict]:
        """Extract content using website-specific extractor or URLContentLoader."""
        extra_info = {"URL": url}
        
        if hostname in self._website_extractor:
            # Use specialized extractors for supported websites
            content, metadata = await self._website_extractor[hostname](url=url)
            extra_info.update(metadata)
        else:
            try:
                # Use URLContentLoader for general websites
                content, metadata = await self._content_loader.load_url(
                    url,
                    convert_to_markdown=False  # We'll handle markdown conversion later
                )
                extra_info.update(metadata)
            except Exception as e:
                print(f"Error using URLContentLoader for {url}: {e}")
                # Fallback to basic extraction if URLContentLoader fails
                content = self._default_content_extractor(soup)
                
        return content, extra_info
    
    def _default_content_extractor(self, soup: BeautifulSoup) -> str:
        """Fallback method to extract text content using URLContentLoader's logic."""
        return self._content_loader._extract_text_content(soup)

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
        
        # Clean up the soup
        unwanted_elements = [
            "footer", 
            "nav", 
            "header",
            "aside",
        ]
        for element in soup.find_all(unwanted_elements):
            element.decompose()

        # Extract content and metadata
        content, extra_info = await self._extract_content(
            soup=soup,
            url=url,
            hostname=hostname
        )

        # Convert to markdown
        if not content:
            content = self.html_to_markdown(str(soup))

        # Save original HTML to blob storage
        blob = await self._save_to_blob(
            content=html_content.encode('utf-8'),
            filename=f"{hashlib.md5(url.encode()).hexdigest()}.html",
            mime="text/html"
        )

        # Create preview
        preview = f"{content[:200]}..." if content else url
        
        # Extract title using URLContentLoader's method
        url_title = self._content_loader._extract_title(soup)
        if not url_title:
            url_title = self._extract_url_title(soup, url)

        # Later in the method, update the content creation:
        combined_content = f"[{url_title}]({url})\n\n[{blob.get('path')}]({blob.get('url')})\n\n{content}\n\n"

        return LinkContent(
            url=url,
            storage_url=blob.get("url"),
            storage_path=blob.get("path"),
            mime_type="text/html",
            size_bytes=blob.get("size"),
            original_filename=blob.get("path"),
            preview=preview,
            content=combined_content,
            extra_info=extra_info
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
                        extra_info={
                            "URL": url,
                            "storage_url": result.storage_url,
                            **result.extra_info
                        }
                    )
                )

        return documents
    
    def _extract_url_title(self, soup: BeautifulSoup, url: str) -> str:
        """Extract title from BeautifulSoup object or fallback to URL."""
        # Try to get title from og:title meta tag first
        og_title = soup.find("meta", property="og:title")
        if og_title and og_title.get("content"):
            return og_title["content"].strip()
        
        # Then try the title tag
        title_tag = soup.find("title")
        if title_tag and title_tag.string:
            return title_tag.string.strip()
        
        # Finally fallback to the URL's path
        parsed_url = urlparse(url)
        path = parsed_url.path.strip("/")
        if path:
            # Take the last segment of the path and replace hyphens/underscores with spaces
            title = path.split("/")[-1].replace("-", " ").replace("_", " ")
            return title.capitalize()
        
        # If all else fails, return the hostname
        return parsed_url.hostname
