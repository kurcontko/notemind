import os
from typing import Optional, Tuple
from azure.ai.vision.imageanalysis.aio import ImageAnalysisClient
from azure.ai.vision.imageanalysis.models import VisualFeatures
from azure.core.credentials import AzureKeyCredential


class AzureVisionAnalyzer:
    def __init__(self, endpoint: str = "", key: str = ""):
        """Initialize the Azure Vision Analyzer.

        Args:
            endpoint (str): Azure Computer Vision endpoint URL
            key (str): Azure Computer Vision API key
        """
        if not endpoint:
            endpoint = os.getenv("AZURE_COMPUTER_VISION_ENDPOINT")
        if not key:
            key = os.getenv("AZURE_COMPUTER_VISION_KEY")
        self.client = ImageAnalysisClient(
            endpoint=endpoint,
            credential=AzureKeyCredential(key)
        )

    async def analyze_image(self, image_url: str) -> Tuple[str, Optional[str]]:
        """Analyze an image to extract OCR text and caption.

        Args:
            image_url (str): URL of the image to analyze

        Returns:
            Tuple[str, Optional[str]]: A tuple containing (ocr_text, caption)
                where ocr_text is the combined text from all detected lines
                and caption is the generated image caption (or None if not available)
        """
        try:
            result = await self.client.analyze_from_url(
                image_url=image_url,
                visual_features=[VisualFeatures.READ]
            )

            # Extract OCR text
            ocr_text = ""
            if result.read and result.read.blocks:
                for block in result.read.blocks:
                    for line in block.lines:
                        ocr_text += line.text + " "
            ocr_text = ocr_text.strip()

            # Extract caption
            caption = result.caption.text if result.caption else None

            return ocr_text, caption

        finally:
            await self.client.close()

    async def __aenter__(self):
        """Async context manager entry."""
        return self

    async def __aexit__(self, exc_type, exc_val, exc_tb):
        """Async context manager exit."""
        await self.client.close()