from typing import List, Optional
from pydantic_settings import BaseSettings
from dotenv import load_dotenv, find_dotenv
import os

# Load .env file
load_dotenv(find_dotenv())


class Settings(BaseSettings):
    PROJECT_NAME: str = "Memory App"
    VERSION: str = "1.0.0"
    API_V1_STR: str = "/api/v1"
    
    # CORS
    ALLOWED_ORIGINS: List[str] = ["http://localhost:3000"]
    
    # Azure Cosmos DB
    AZURE_COSMOS_URI: str = os.getenv("AZURE_COSMOS_URI")
    AZURE_COSMOS_KEY: str = os.getenv("AZURE_COSMOS_KEY")
    AZURE_COSMOS_DATABASE: str = os.getenv("AZURE_COSMOS_DATABASE", "notes-db")
    AZURE_COSMOS_CONTAINER: str = os.getenv("AZURE_COSMOS_CONTAINER", "notes")
    
    # Azure Blob Storage
    AZURE_STORAGE_ACCOUNT: str = os.getenv("AZURE_STORAGE_ACCOUNT")
    AZURE_STORAGE_ACCESS_KEY: str = os.getenv("AZURE_STORAGE_ACCESS_KEY")
    AZURE_STORAGE_CONTAINER: str = os.getenv("AZURE_STORAGE_CONTAINER", "notes-media")
    
    # Azure OpenAI 
    AZURE_OPENAI_API_KEY: str = os.getenv("AZURE_OPENAI_API_KEY", "")
    AZURE_OPENAI_ENDPOINT: str = os.getenv("AZURE_OPENAI_ENDPOINT", "")
    
    # OpenAI API
    OPENAI_API_KEY: str = os.getenv("OPENAI_API_KEY", "")
    
    # Both services
    OPENAI_API_VERSION: str = os.getenv("OPENAI_API_VERSION", "")
    
    # Model settings 
    MODEL_EMBEDDING: str = os.getenv("MODEL_EMBEDDING")
    MODEL_LLM: str = os.getenv("MODEL_LLM")
    
    class Config:
        env_file = ".env"
        case_sensitive = True

settings = Settings()