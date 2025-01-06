from typing import Generator

from fastapi import Depends
from langchain_openai import ChatOpenAI, OpenAIEmbeddings, AzureChatOpenAI, AzureOpenAIEmbeddings
from openai import AsyncOpenAI, AsyncAzureOpenAI

from ..core.config import settings
from ..loaders.note_loader import NotesLoader
from ..services.db.cosmos_gremlin_graph import CosmosNotesGraphService
from ..services.db.cosmos_db import CosmosDBNotesService
from ..services.azure.azure_document import AzureDocumentIntelligence
from ..services.azure.azure_ner import AzureNER
from ..services.azure.azure_ocr import AzureVisionAnalyzer


def get_notes_loader() -> NotesLoader:
    """Initialize and return NotesLoader with configured dependencies"""
    
    if settings.OPENAI_API_KEY:
        llm = ChatOpenAI(
            temperature=0, 
            model=settings.MODEL_LLM,
            api_key=settings.OPENAI_API_KEY
        )
        embeddings = OpenAIEmbeddings(
            model=settings.MODEL_EMBEDDING,
            api_key=settings.OPENAI_API_KEY
        )
        client = AsyncOpenAI(api_key=settings.OPENAI_API_KEY)
        
    elif settings.AZURE_OPENAI_API_KEY:
        llm = AzureChatOpenAI(
            temperature=0, 
            model=settings.MODEL_LLM,
            api_key=settings.AZURE_OPENAI_API_KEY,
            endpoint=settings.AZURE_OPENAI_ENDPOINT,
            api_version=settings.OPENAI_API_VERSION
        )
        embeddings = AzureOpenAIEmbeddings(
            model=settings.MODEL_EMBEDDING,
            api_key=settings.AZURE_OPENAI_API_KEY,
            endpoint=settings.AZURE_OPENAI_ENDPOINT,
            api_version=settings.OPENAI_API_VERSION
        )
        client = AsyncAzureOpenAI(
            azure_endpoint=settings.AZURE_OPENAI_ENDPOINT,
            api_version=settings.OPENAI_API_VERSION,
            api_key=settings.AZURE_OPENAI_API_KEY
        )
    else:
        raise ValueError("No Azure OpenAI/OpenAI API key provided")
    
    azure_ocr = AzureVisionAnalyzer(
        key=settings.AZURE_COMPUTER_VISION_KEY,
        endpoint=settings.AZURE_COMPUTER_VISION_ENDPOINT
    )
    
    azure_document = AzureDocumentIntelligence(
        endpoint=settings.AZURE_DOCUMENT_INTELLIGENCE_ENDPOINT,
        key=settings.AZURE_DOCUMENT_INTELLIGENCE_KEY
    )
    
    azure_ner = AzureNER(
        endpoint=settings.AZURE_TEXT_ANALYTICS_ENDPOINT,
        key=settings.AZURE_TEXT_ANALYTICS_KEY
    )
    
    
    loader = NotesLoader(
        llm=llm,
        embeddings=embeddings,
        storage_account=settings.AZURE_STORAGE_ACCOUNT,
        storage_key=settings.AZURE_STORAGE_ACCESS_KEY,
        container_name=settings.AZURE_STORAGE_CONTAINER,
        openai_client=client,
        azure_ocr=azure_ocr,
        azure_document=azure_document,
        azure_ner=azure_ner
    )
    
    return loader


def get_note_service() -> CosmosNotesGraphService:
    """Initialize and return CosmosNotesGraphService with configured dependencies"""
    if settings.OPENAI_API_KEY:
        embeddings = OpenAIEmbeddings(
            model=settings.MODEL_EMBEDDING,
            api_key=settings.OPENAI_API_KEY
        )
        
    elif settings.AZURE_OPENAI_API_KEY:
        embeddings = AzureOpenAIEmbeddings(
            model=settings.MODEL_EMBEDDING,
            api_key=settings.AZURE_OPENAI_API_KEY,
            endpoint=settings.AZURE_OPENAI_ENDPOINT,
            api_version=settings.OPENAI_API_VERSION
        )
    
    return CosmosDBNotesService(
        endpoint=settings.AZURE_COSMOS_URI,
        database_name=settings.AZURE_COSMOS_DATABASE,
        container_name=settings.AZURE_COSMOS_CONTAINER,
        credential=settings.AZURE_COSMOS_KEY, 
        embeddings=embeddings,
    )


class MockUser:
    id: str = "00000000-0000-0000-0000-000000000000"  # UUID with all zeros
    email: str = "testuser@example.com"
    name: str = "Test User"

def get_current_user() -> str:
    """Get the current user from the request"""
    return MockUser()

