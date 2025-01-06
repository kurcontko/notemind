from typing import Dict, Optional, List, Tuple
import asyncio
import aiohttp
from bs4 import BeautifulSoup, SoupStrainer
from urllib.parse import urlparse
from markdownify import markdownify as md

class URLContentLoader:
    """A class to load and extract clean content from URLs."""
    
    def __init__(self):
        # Default content selectors
        self._selectors = {
            # Default content area selectors
            "content": {
                "class": ["article", "main", "content", "post", "entry", "blog-post"],
                "id": ["article", "main", "content", "post", "entry"],
                "tag": ["article", "main"]
            },
            # Elements to ignore
            "ignore": {
                "class": ["header", "footer", "nav", "sidebar", "menu", "comments", 
                         "widget", "cookie", "popup", "ad", "advertisement"],
                "id": ["header", "footer", "nav", "sidebar", "menu", "comments"],
                "tag": ["header", "footer", "nav", "aside"]
            }
        }
        
        # Site-specific selectors (can be extended)
        self._site_specific = {
            "medium.com": {
                "content": {
                    "tag": ["article"],
                    "class": ["story", "post-content"]
                }
            },
            "dev.to": {
                "content": {
                    "class": ["article-wrapper", "article-body"]
                }
            }
        }
    
    def _get_selectors_for_domain(self, domain: str) -> Dict:
        """Get content selectors for a specific domain, falling back to defaults."""
        return self._site_specific.get(domain, self._selectors)
    
    def _create_content_filter(self, selectors: Dict) -> SoupStrainer:
        """Create a SoupStrainer to parse only content-relevant elements."""
        def element_filter(tag):
            if not tag.name:
                return False
            
            # Get tag attributes
            classes = tag.get('class', [])
            if isinstance(classes, list):
                classes = ' '.join(classes).lower()
            tag_id = tag.get('id', '').lower()
            tag_name = tag.name.lower()
            
            # Check if element should be ignored
            for ignored in selectors['ignore']['class']:
                if ignored in classes:
                    return False
            for ignored in selectors['ignore']['id']:
                if ignored in tag_id:
                    return False
            if tag_name in selectors['ignore']['tag']:
                return False
            
            # Check if element is content
            is_content = (
                any(c in classes for c in selectors['content']['class']) or
                any(i in tag_id for i in selectors['content']['id']) or
                tag_name in selectors['content']['tag']
            )
            
            return is_content
            
        return SoupStrainer(element_filter)
    
    def _extract_text_content(self, element: BeautifulSoup) -> str:
        """Extract clean text content from a BeautifulSoup element."""
        # Remove script and style elements
        for script in element(["script", "style"]):
            script.decompose()
        
        # Remove empty elements
        for tag in element.find_all():
            if len(tag.get_text(strip=True)) == 0:
                tag.decompose()
        
        # Get text with basic formatting
        text = element.get_text(separator='\n', strip=True)
        return text
    
    async def load_url(self, url: str, convert_to_markdown: bool = False) -> Tuple[str, Dict]:
        """
        Load and extract content from a URL.
        
        Args:
            url: The URL to load
            convert_to_markdown: Whether to convert HTML to markdown
            
        Returns:
            Tuple of (content, metadata)
        """
        async with aiohttp.ClientSession() as session:
            try:
                async with session.get(url) as response:
                    response.raise_for_status()
                    html_content = await response.text()
            except aiohttp.ClientError as e:
                raise ValueError(f"Failed to fetch URL {url}: {str(e)}")
        
        # Get domain-specific selectors
        domain = urlparse(url).hostname
        selectors = self._get_selectors_for_domain(domain)
        
        # Create content filter
        content_filter = self._create_content_filter(selectors)
        
        # Parse HTML with filter
        soup = BeautifulSoup(html_content, "html.parser", parse_only=content_filter)
        
        # Extract metadata
        metadata = {
            "title": self._extract_title(soup),
            "url": url,
            "domain": domain
        }
        
        # If no content found with filter, try parsing main content areas
        if not soup.find():
            soup = BeautifulSoup(html_content, "html.parser")
            content_element = None
            
            # Try finding main content container
            for selector_type, selectors in selectors['content'].items():
                for selector in selectors:
                    if selector_type == 'class':
                        content_element = soup.find(class_=selector)
                    elif selector_type == 'id':
                        content_element = soup.find(id=selector)
                    elif selector_type == 'tag':
                        content_element = soup.find(selector)
                    
                    if content_element:
                        break
                if content_element:
                    break
            
            if content_element:
                soup = content_element
        
        # Convert to markdown if requested
        if convert_to_markdown:
            content = md(str(soup), heading_style="ATX")
        else:
            content = self._extract_text_content(soup)
        
        return content, metadata
    
    def _extract_title(self, soup: BeautifulSoup) -> str:
        """Extract title from HTML content."""
        # Try og:title first
        og_title = soup.find("meta", property="og:title")
        if og_title:
            return og_title.get("content", "").strip()
        
        # Then try title tag
        title = soup.find("title")
        if title:
            return title.string.strip()
        
        # Finally try first heading
        h1 = soup.find("h1")
        if h1:
            return h1.get_text(strip=True)
        
        return ""

    async def load_multiple_urls(
        self,
        urls: List[str],
        convert_to_markdown: bool = False
    ) -> List[Tuple[str, Dict]]:
        """Load content from multiple URLs concurrently."""
        async with aiohttp.ClientSession() as session:
            tasks = [
                self.load_url(url, convert_to_markdown)
                for url in urls
            ]
            results = await asyncio.gather(*tasks, return_exceptions=True)
        
        # Filter out failed requests
        valid_results = []
        for url, result in zip(urls, results):
            if isinstance(result, Exception):
                print(f"Error loading {url}: {str(result)}")
                continue
            valid_results.append(result)
        
        return valid_results