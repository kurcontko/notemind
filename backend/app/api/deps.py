from typing import Generator

from fastapi import Depends
from langchain_openai import ChatOpenAI, OpenAIEmbeddings, AzureChatOpenAI, AzureOpenAIEmbeddings

from ..core.config import settings
from ..loaders.note_loader import NotesLoader
from ..services.db.notes_db_graph import CosmosNotesGraphService


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
    else:
        raise ValueError("No Azure OpenAI/OpenAI API key provided")
    
    loader = NotesLoader(
        llm=llm,
        embeddings=embeddings,
        storage_endpoint=settings.AZURE_STORAGE_ACCOUNT,
        storage_key=settings.AZURE_STORAGE_ACCESS_KEY,
        storage_container=settings.AZURE_STORAGE_CONTAINER
    )
    
    return loader


def get_note_service() -> CosmosNotesGraphService:
    """Initialize and return CosmosNotesGraphService with configured dependencies"""
    return CosmosNotesGraphService(
        endpoint=settings.AZURE_COSMOS_URI,
        key=settings.AZURE_COSMOS_KEY,
        database=settings.AZURE_COSMOS_DATABASE,
        container=settings.AZURE_COSMOS_CONTAINER
    )


class MockUser:
    id: str = "00000000-0000-0000-0000-000000000000"  # UUID with all zeros
    email: str = "testuser@example.com"
    name: str = "Test User"

def get_current_user() -> str:
    """Get the current user from the request"""
    return MockUser()
