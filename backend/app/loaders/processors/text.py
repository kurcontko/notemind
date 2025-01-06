from .base import ContentProcessor
import os

from fastapi import UploadFile

from ...models.content import TextContent


class TextProcessor(ContentProcessor):
    # Map file extensions to markdown language identifiers
    LANGUAGE_EXTENSIONS = {
        '.py': 'python',
        '.js': 'javascript',
        '.ts': 'typescript',
        '.java': 'java',
        '.cpp': 'cpp',
        '.c': 'c',
        '.cs': 'csharp',
        '.php': 'php',
        '.rb': 'ruby',
        '.go': 'go',
        '.rs': 'rust',
        '.sql': 'sql',
        '.html': 'html',
        '.css': 'css',
        '.sh': 'bash',
        '.yaml': 'yaml',
        '.yml': 'yaml',
        '.json': 'json',
        '.xml': 'xml',
        '.md': 'markdown',
    }

    def _get_language(self, filename: str) -> str:
        """Get markdown language identifier from file extension"""
        ext = os.path.splitext(filename)[1].lower()
        return self.LANGUAGE_EXTENSIONS.get(ext, '')

    async def process(self, file: UploadFile) -> TextContent:
        # Read the text content from the file
        text = await file.read()
        
        # Decode bytes to string, assuming UTF-8 encoding
        text = text.decode('utf-8')
        
        # Get language identifier
        language = self._get_language(file.filename)
        
        # Wrap in markdown code block if it's a recognized code file
        if language:
            formatted_text = f"```{language}\n{text}\n```"
        else:
            formatted_text = text
        
        return TextContent(
            text=text,  # Original unwrapped text
            preview=text[:200] + "..." if len(text) > 200 else text,
            content=formatted_text  # Markdown wrapped content
        )