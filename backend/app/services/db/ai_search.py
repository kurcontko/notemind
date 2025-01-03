from datetime import datetime
import json
from typing import Dict, Any, List, Optional, Tuple

from azure.search.documents.aio import SearchClient
from azure.search.documents.indexes.aio import SearchIndexClient
from azure.core.credentials import AzureKeyCredential
from azure.search.documents.indexes.models import (
    SearchIndex,
    SimpleField,
    SearchableField,
    ComplexField,
    SearchFieldDataType,
    VectorSearch,
    VectorSearchAlgorithmConfiguration,
    HnswParameters,
    VectorSearchProfile,
    SearchField
)

from .base import NotesDbService
from ...models.note import Note, NoteReference


class AzureAISearchNotesService(NotesDbService):
    def __init__(self, search_endpoint: str, index_name: str, credential):
        self.search_endpoint = search_endpoint
        self.index_name = index_name
        self.credential = credential
        self.search_client = SearchClient(
            endpoint=search_endpoint,
            index_name=index_name,
            credential=AzureKeyCredential(credential)
        )
        self.index_client = SearchIndexClient(
            endpoint=search_endpoint,
            credential=AzureKeyCredential(credential)
        )

    def _note_to_doc(self, note: Note) -> Dict[str, Any]:
        """Convert Note to search document"""
        return {
            "id": note.note_id,
            "userId": note.user_id,
            "content": note.content,
            "contentMap": json.dumps(note.content_map),
            "categories": note.categories,
            "title": note.title,
            "tags": note.tags,
            "summary": note.summary,
            "entities": json.dumps(note.entities),
            "embedding": note.embedding,
            "linkedNotes": json.dumps([ref.dict() for ref in note.linked_notes]),
            "createdAt": note.created_at.isoformat(),
            "updatedAt": note.updated_at.isoformat(),
            "metadata": json.dumps(note.metadata)
        }

    def _doc_to_note(self, doc: Dict[str, Any]) -> Note:
        """Convert search document back to Note"""
        return Note(
            note_id=doc["id"],
            user_id=doc.get("userId"),
            content=doc.get("content"),
            content_map=json.loads(doc.get("contentMap", "{}")),
            categories=doc.get("categories", []),
            title=doc.get("title"),
            tags=doc.get("tags", []),
            summary=doc.get("summary"),
            entities=json.loads(doc.get("entities", "{}")),
            embedding=doc.get("embedding"),
            linked_notes=[NoteReference(**ref) for ref in json.loads(doc.get("linkedNotes", "[]"))],
            created_at=datetime.fromisoformat(doc["createdAt"]),
            updated_at=datetime.fromisoformat(doc["updatedAt"]),
            metadata=json.loads(doc.get("metadata", "{}"))
        )

    async def create_note(self, note) -> Note:
        doc = self._note_to_doc(note)
        await self.search_client.upload_documents([doc])
        return note

    async def get_note(self, note_id) -> Optional[Note]:
        try:
            doc = await self.search_client.get_document(note_id)
            return self._doc_to_note(doc)
        except:
            return None

    async def update_note(self, note) -> bool:
        try:
            doc = self._note_to_doc(note)
            await self.search_client.merge_documents([doc])
            return True
        except:
            return False

    async def delete_note(self, note_id) -> bool:
        try:
            await self.search_client.delete_documents([{"id": note_id}])
            return True
        except:
            return False

    async def search_notes(self, user_id=None, categories=None, tags=None, search_text=None, limit=10) -> List[Note]:
        filter_conditions = []
        if user_id:
            filter_conditions.append(f"userId eq '{user_id}'")
        if categories:
            filter_conditions.append(f"categories/any(c: c eq '{categories}')")
        if tags:
            filter_conditions.append("tags/any(t: search.in(t, '{}'))".format("','".join(tags)))

        filter_str = " and ".join(filter_conditions) if filter_conditions else None
        
        results = await self.search_client.search(
            search_text=search_text,
            filter=filter_str,
            top=limit,
            include_total_count=True
        )
        
        notes = []
        async for doc in results:
            notes.append(self._doc_to_note(doc))
        return notes

    async def vector_search(self, query_embedding, limit=10, min_similarity=0.7) -> List[Tuple[Note, float]]:
        vector_query = {
            "vector": query_embedding,
            "k": limit,
            "fields": "embedding"
        }
        
        results = await self.search_client.search(
            search_text=None,
            vector_queries=[vector_query],
            select=["*"],
            top=limit
        )

        notes_with_scores = []
        async for doc in results:
            score = doc['@search.score']
            if score >= min_similarity:
                notes_with_scores.append((self._doc_to_note(doc), score))
        return notes_with_scores

    async def hybrid_search(self,
                          query_embedding,
                          query_text=None,
                          user_id=None,
                          categories=None,
                          tags=None,
                          entities=None,
                          min_similarity=0.7,
                          limit=10):
        filter_conditions = []
        if user_id:
            filter_conditions.append(f"userId eq '{user_id}'")
        if categories:
            filter_conditions.append(f"categories/any(c: c eq '{categories}')")
        if tags:
            filter_conditions.append("tags/any(t: search.in(t, '{}'))".format("','".join(tags)))
        if entities:
            entity_conditions = [f"entities/any(e: e eq '{entity}')" for entity in entities]
            filter_conditions.append(" or ".join(entity_conditions))

        vector_query = {
            "vector": query_embedding,
            "k": limit,
            "fields": "embedding"
        }

        results = await self.search_client.search(
            search_text=query_text,
            vector_queries=[vector_query],
            filter=" and ".join(filter_conditions) if filter_conditions else None,
            select=["*"],
            top=limit
        )

        notes_with_scores = []
        async for doc in results:
            score = doc['@search.score']
            if score >= min_similarity:
                notes_with_scores.append((self._doc_to_note(doc), score))
        return notes_with_scores

    async def get_recent_notes(self, user_id=None, offset=0, limit=10) -> List[Note]:
        """
        Get recent notes for a user
        
        Args:
            user_id: ID of the user
            offset: Number of notes to skip
            limit: Number of notes to return
            
        Returns:
            List[Note]: List of notes
        """
        filter_str = f"userId eq '{user_id}'" if user_id else None
        
        results = await self.search_client.search(
            search_text="*",
            filter=filter_str,  
            top=limit,
            skip=offset,
            orderby=["updatedAt desc"]
        )   
        
        notes = []
        async for doc in results:
            notes.append(self._doc_to_note(doc))
        return notes    
    
    
    async def create_search_index(self, embedding_dimension: int = 1536) -> bool:
        """
        Create the search index with appropriate field definitions for the Note model.
        
        Args:
            embedding_dimension: Dimension of the embedding vectors (default 1536 for OpenAI embeddings ada-02 and text-embedding-small)
            
        Returns:
            bool: True if index creation was successful, False otherwise
        """
        try:
            # Define vector search configuration
            vector_search = VectorSearch(
                algorithms=[
                    VectorSearchAlgorithmConfiguration(
                        name="hnsw-config",
                        kind="hnsw",
                        hnsw_parameters=HnswParameters(
                            m=4,  # Number of bi-directional links created for each new node
                            ef_construction=400,  # Size of the dynamic candidate list for constructing the graph
                            ef_search=500,  # Size of the dynamic candidate list for searching the graph
                            metric="cosine"
                        )
                    )
                ],
                profiles=[
                    VectorSearchProfile(
                        name="embedding-profile",
                        algorithm="hnsw-config"
                    )
                ]
            )

            # Define fields for the index
            fields = [
                SimpleField(name="id", type=SearchFieldDataType.String, key=True),
                SimpleField(name="userId", type=SearchFieldDataType.String),
                SearchableField(name="content", type=SearchFieldDataType.String),
                SimpleField(name="contentMap", type=SearchFieldDataType.String),
                SearchableField(
                    name="categories",
                    type=SearchFieldDataType.Collection(SearchFieldDataType.String),
                    filterable=True,
                    facetable=True
                ),
                SearchableField(name="title", type=SearchFieldDataType.String),
                SearchableField(
                    name="tags",
                    type=SearchFieldDataType.Collection(SearchFieldDataType.String),
                    filterable=True,
                    facetable=True
                ),
                SearchableField(name="summary", type=SearchFieldDataType.String, filterable=True),
                SearchableField(
                    name="entities",
                    type=SearchFieldDataType.String,
                    filterable=True,
                    facetable=True
                ),
                SearchField(
                    name="embedding",
                    type=SearchFieldDataType.Collection(SearchFieldDataType.Single),
                    vector_search_dimensions=embedding_dimension,
                    vector_search_profile="embedding-profile"
                ),
                SimpleField(name="linkedNotes", type=SearchFieldDataType.String),
                SimpleField(name="createdAt", type=SearchFieldDataType.DateTimeOffset),
                SimpleField(name="updatedAt", type=SearchFieldDataType.DateTimeOffset),
                SimpleField(name="metadata", type=SearchFieldDataType.String)
            ]

            # Create the index
            index = SearchIndex(
                name=self.index_name,
                fields=fields,
                vector_search=vector_search
            )
            
            await self.index_client.create_index(index)
            return True
            
        except Exception as e:
            print(f"Error creating search index: {str(e)}")
            return False
        
        
        
    async def get_distinct_categories(self) -> Set[str]:
        """Get all distinct categories from the index."""
        try:
            results = await self.search_client.search(
                search_text="*",
                facets=["categories"],
                top=0
            )
            
            # Extract unique categories from facet results
            categories = set()
            async for facet_result in results.facets.get("categories", []):
                categories.add(facet_result["value"])
            return categories
        except Exception as e:
            print(f"Error getting distinct categories: {str(e)}")
            return set()
    
    
    async def get_distinct_tags(self) -> Set[str]:
        """Get all distinct tags from the index."""
        try:
            results = await self.search_client.search(
                search_text="*",
                facets=["tags"],
                top=0
            )
            
            # Extract unique tags from facet results
            tags = set()
            async for facet_result in results.facets.get("tags", []):
                tags.add(facet_result["value"])
            return tags
        except Exception as e:
            print(f"Error getting distinct tags: {str(e)}")
            return set()
        
        
    async def search_by_field(self, 
                            field: str, 
                            value: str, 
                            user_id: Optional[str] = None,
                            limit: int = 10) -> List[Note]:
        """
        Search notes by a specific field value.
        
        Args:
            field: Field name to search in ('categories', 'tags', 'summary', 'entities')
            value: Value to search for
            user_id: Optional user ID to filter results
            limit: Maximum number of results to return
            
        Returns:
            List[Note]: Matching notes
        """
        filter_conditions = []
        
        if user_id:
            filter_conditions.append(f"userId eq '{user_id}'")

        if field in ["categories", "tags"]:
            filter_conditions.append(f"{field}/any(x: x eq '{value}')")
        elif field == "entities":
            filter_conditions.append(f"search.in(entities, '{value}')")
        elif field == "summary":
            # For summary, we'll use search text instead of filter
            search_text = f"summary:{value}"
        else:
            raise ValueError(f"Unsupported field for search: {field}")

        filter_str = " and ".join(filter_conditions) if filter_conditions else None
        
        results = await self.search_client.search(
            search_text=search_text if field == "summary" else "*",
            filter=filter_str,
            top=limit,
            include_total_count=True
        )
        
        notes = []
        async for doc in results:
            notes.append(self._doc_to_note(doc))
        return notes
    
    
    async def search_by_entities(self,
                               entities: List[str],
                               match_all: bool = False,
                               user_id: Optional[str] = None,
                               limit: int = 10) -> List[Note]:
        """
        Search notes by multiple entities with flexible matching options.
        
        Args:
            entities: List of entities to search for
            match_all: If True, notes must contain all specified entities.
                      If False, notes containing any of the entities will be returned.
            user_id: Optional user ID to filter results
            limit: Maximum number of results to return
            
        Returns:
            List[Note]: Matching notes
        """
        filter_conditions = []
        
        if user_id:
            filter_conditions.append(f"userId eq '{user_id}'")

        # Build entity filter conditions
        entity_conditions = [f"search.in(entities, '{entity}')" for entity in entities]
        if entity_conditions:
            if match_all:
                # All entities must be present
                filter_conditions.extend(entity_conditions)
            else:
                # Any of the entities can be present
                filter_conditions.append(f"({' or '.join(entity_conditions)})")

        filter_str = " and ".join(filter_conditions) if filter_conditions else None
        
        results = await self.search_client.search(
            search_text="*",
            filter=filter_str,
            top=limit,
            include_total_count=True
        )
        
        notes = []
        async for doc in results:
            notes.append(self._doc_to_note(doc))
        return notes

    async def get_distinct_entities(self) -> Set[str]:
        """
        Get all distinct entities from the index.
        
        Returns:
            Set[str]: Set of unique entities
        """
        try:
            results = await self.search_client.search(
                search_text="*",
                facets=["entities"],
                top=0
            )
            
            # Extract unique entities from facet results
            entities = set()
            async for facet_result in results.facets.get("entities", []):
                entities.add(facet_result["value"])
            return entities
        except Exception as e:
            print(f"Error getting distinct entities: {str(e)}")
            return set()