from typing import List, Dict, Any
import logging
from azure.ai.textanalytics.aio import TextAnalyticsClient
from azure.core.credentials import AzureKeyCredential


class AzureNER:
    """
    An async class to handle Named Entity Recognition using Azure Cognitive Services.
    """
    
    def __init__(self, endpoint: str, key: str):
        """
        Initialize the AsyncAzureNER class with Azure credentials.
        
        Args:
            endpoint (str): Azure service endpoint URL
            key (str): Azure API key
        """
        self.endpoint = endpoint
        self.key = key
        self._client = None
        self.setup_logging()
        
    def setup_logging(self):
        """Configure logging for the class."""
        self.logger = logging.getLogger(__name__)
        
    async def _get_client(self) -> TextAnalyticsClient:
        """
        Lazy initialization of the Azure Text Analytics client.
        
        Returns:
            TextAnalyticsClient: Authenticated Azure client
        """
        if self._client is None:
            try:
                self._client = TextAnalyticsClient(
                    endpoint=self.endpoint,
                    credential=AzureKeyCredential(self.key)
                )
                self.logger.info("Azure Text Analytics client initialized successfully")
            except Exception as e:
                self.logger.error(f"Failed to initialize Azure client: {str(e)}")
                raise
        return self._client
    
    async def recognize_entities(self, texts: List[str]) -> Dict[str, Any]:
        """
        Perform Named Entity Recognition on a list of texts asynchronously.
        
        Args:
            texts (List[str]): List of text documents to analyze
            
        Returns:
            List[Dict[str, Any]]: List of dictionaries containing recognized entities
        """
        try:
            client = await self._get_client()
            response = await client.recognize_entities(texts)
            entities = {}
            
            async for doc_entities in response:
                if doc_entities.is_error:
                    self.logger.error(f"Error in document: {doc_entities.error}")
                    continue
                    
                # Create a dictionary of entities for each document 
                # where keys are entity names and values are entity types.
                for entity in doc_entities.entities:
                    entities[entity.text] = entity.category
                
            return entities
            
        except Exception as e:
            self.logger.error(f"Error performing entity recognition: {str(e)}")
            raise

    async def batch_recognize_entities(self, texts: List[str], batch_size: int = 10) -> List[Dict[str, Any]]:
        """
        Process large volumes of text in batches asynchronously.
        
        Args:
            texts (List[str]): List of text documents to analyze
            batch_size (int): Number of documents to process in each batch
            
        Returns:
            List[Dict[str, Any]]: Combined results from all batches
        """
        results = []
        for i in range(0, len(texts), batch_size):
            batch = texts[i:i + batch_size]
            batch_results = await self.recognize_entities(batch)
            results.extend(batch_results)
            self.logger.info(f"Processed batch {i//batch_size + 1}")
        return results
    
    async def close(self):
        """Close the Azure client connection."""
        if self._client is not None:
            await self._client.close()
            self._client = None

    async def __aenter__(self):
        """Async context manager entry."""
        return self

    async def __aexit__(self, exc_type, exc_val, exc_tb):
        """Async context manager exit with proper client cleanup."""
        await self.close()
        return False