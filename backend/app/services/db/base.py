from abc import ABC, abstractmethod
from datetime import datetime
from typing import Optional, List, Dict, Any

from ...models.note import Note, NoteReference


class NotesDbService(ABC):
    # Additional abstract methods that would likely be needed:
    @abstractmethod
    async def create_note(self, note: Note) -> Note:
        """Add a new note to the graph."""
        pass
    
    @abstractmethod
    async def get_note(self, note_id: str) -> Note:
        """Retrieve a note by ID."""
        pass
    
    @abstractmethod
    async def update_note(self, note: Note) -> bool:
        """Update an existing note."""
        pass
    
    @abstractmethod
    async def delete_note(self, note_id: str) -> bool:
        """Delete a note by ID."""
        pass
    
    @abstractmethod
    async def search_notes(
        self, 
        user_id: Optional[str] = None,
        categories: Optional[str] = None,
        tags: Optional[List[str]] = None,
        search_text: Optional[str] = None,
        limit: int = 10
    ) -> List[Note]:
        """Search notes based on various criteria."""
        pass
    
    @abstractmethod
    async def vector_search(
        self, 
        query_embedding: List[float],
        limit: int = 10,
        min_similarity: float = 0.7
    ) -> List[tuple[Note, float]]:
        """Search notes based on vector similarity."""
        pass
    
    @abstractmethod
    async def hybrid_search(
        self,
        query_embedding: List[float],
        query_text: Optional[str] = None,
        user_id: Optional[str] = None,
        categories: Optional[List[str]] = None,
        tags: Optional[List[str]] = None,
        entities: Optional[Dict[str, str]] = None,
        min_similarity: float = 0.7,
        limit: int = 10
    ) -> List[tuple[Note, float]]:
        """Hybrid search based on text and vector similarity."""
        pass
    
    @abstractmethod
    async def get_recent_notes(self, user_id: Optional[str] = None, offset: int = 0, limit: int = 10) -> List[Note]:
        """List notes sorted by creation date."""
        pass