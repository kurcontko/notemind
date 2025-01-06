from typing import Union
import logging
import os

from azure.core.credentials import AzureKeyCredential
from azure.ai.documentintelligence.aio import DocumentIntelligenceClient
from azure.ai.documentintelligence.models import DocumentContentFormat, AnalyzeDocumentRequest

class AzureDocumentIntelligence:
    """A class to extract markdown content from documents using Azure Document Intelligence."""

    def __init__(self, endpoint: str, key: str):
        """
        Initialize the Document Intelligence client.

        Args:
            endpoint (str): Azure Document Intelligence endpoint URL
            key (str): Azure Document Intelligence API key
        """
        self.endpoint = endpoint
        self.credential = AzureKeyCredential(key)
        self.client = DocumentIntelligenceClient(endpoint=endpoint, credential=self.credential)
        self.logger = logging.getLogger(__name__)

    async def get_markdown_content(
        self,
        source: Union[str, bytes]
    ) -> str:
        """
        Extract markdown content from a document.

        Args:
            source (Union[str, bytes]): Document file path, URL, or bytes

        Returns:
            str: Document content in markdown format
        """
        try:
            if isinstance(source, str):
                if source.startswith(('http://', 'https://')):
                    async with self.client:
                        request = AnalyzeDocumentRequest(
                            url_source=source,
                        )
                        poller = await self.client.begin_analyze_document(
                            model_id="prebuilt-layout",
                            body=request,
                            output_content_format=DocumentContentFormat.MARKDOWN
                        )
                else:
                    if not os.path.exists(source):
                        raise FileNotFoundError(f"Document not found at {source}")
                    with open(source, "rb") as doc:
                        # Read the document as bytes
                        file_content = doc.read()
                        async with self.client:
                            request = AnalyzeDocumentRequest(
                                bytes_source=file_content,
                            )
                            poller = await self.client.begin_analyze_document(
                                model_id="prebuilt-layout",
                                body=request,
                                output_content_format=DocumentContentFormat.MARKDOWN
                            )
            else:
                async with self.client:
                    request = AnalyzeDocumentRequest(
                        bytes_source=source,
                    )
                    poller = await self.client.begin_analyze_document(
                        model_id="prebuilt-layout",
                        body=request,
                        output_content_format=DocumentContentFormat.MARKDOWN
                    )

            self.logger.info("Starting document content extraction")

            result = await poller.result()

            return result.content

        except Exception as e:
            self.logger.error(f"Error extracting document content: {str(e)}")
            raise
