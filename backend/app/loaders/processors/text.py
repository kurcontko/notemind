from fastapi import UploadFile


from ...models.content import TextContent
from .base import ContentProcessor


class TextProcessor(ContentProcessor):
    async def process(self, file: UploadFile) -> TextContent:
        # Read the text content from the file
        text = await file.read()
        
        # Decode bytes to string, assuming UTF-8 encoding
        text = text.decode('utf-8')
        
        return TextContent(
            text=text,
            preview=text[:200] + "..." if len(text) > 200 else text,
            content=text
        )