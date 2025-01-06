from datetime import datetime
import json
from typing import Dict, Any, List, Optional, Tuple, Set
import logging

from azure.cosmos.aio import CosmosClient, ContainerProxy
from azure.cosmos import PartitionKey
from azure.cosmos.exceptions import CosmosResourceNotFoundError
from langchain_core.embeddings import Embeddings

from .base import NotesDbService
from ...models.note import Note, NoteReference
from ...models.content import FileContent, TextContent, LinkContent, ImageContent, VideoContent, AudioContent, ContentType, parse_content


class CosmosDBNotesService(NotesDbService):
    def __init__(
        self,
        endpoint: str,
        database_name: str,
        container_name: str,
        credential: str,
        embeddings: Embeddings
    ):
        self.client = CosmosClient(endpoint, credential)
        self.database = self.client.get_database_client(database_name)
        self.container = self.database.get_container_client(container_name)
        self.embeddings = embeddings
        
    def _note_to_doc(self, note: Note) -> Dict[str, Any]:
        """Convert Note to Cosmos DB document"""
        return {
            "id": note.note_id,
            "userId": note.user_id,
            "content": note.content,
            "contentMap": json.dumps({k: v.model_dump() for k, v in note.content_map.items()}) if note.content_map else None,
            "categories": note.categories,
            "title": note.title,
            "tags": note.tags,
            "summary": note.summary,
            "entities": note.entities,
            "embedding": note.embedding,
            "linkedNotes": [ref.model_dump() for ref in note.linked_notes],
            "createdAt": note.created_at.isoformat(),
            "updatedAt": note.updated_at.isoformat(),
            "metadata": note.metadata,
            "type": "note"  # Document type for filtering
        }

    def _doc_to_note(self, doc: Dict[str, Any]) -> Note:
        """Convert Cosmos DB document back to Note"""
        content_map = {}
        if doc.get("contentMap"):
            raw_map = json.loads(doc["contentMap"])
            for key, val in raw_map.items():
                content_map[key] = parse_content(val)
        return Note(
            note_id=doc["id"],
            user_id=doc.get("userId"),
            content=doc.get("content"),
            content_map=content_map,
            categories=doc.get("categories", []),
            title=doc.get("title"),
            tags=doc.get("tags", []),
            summary=doc.get("summary"),
            entities=doc.get("entities", {}),
            embedding=doc.get("embedding"),
            linked_notes=[NoteReference(**ref) for ref in doc.get("linkedNotes", [])],
            created_at=datetime.fromisoformat(doc["createdAt"]),
            updated_at=datetime.fromisoformat(doc["updatedAt"]),
            metadata=doc.get("metadata", {})
        )

    async def create_note(self, note: Note, user_id: Optional[str] = None) -> Note:
        doc = self._note_to_doc(note)
        await self.container.create_item(doc)
        return note

    async def get_note(self, note_id: str, user_id: Optional[str] = None) -> Optional[Note]:
        try:
            doc = await self.container.read_item(note_id, partition_key=note_id)
            return self._doc_to_note(doc)
        except CosmosResourceNotFoundError:
            return None

    async def update_note(self, note: Note, user_id: Optional[str] = None) -> bool:
        try:
            doc = self._note_to_doc(note)
            await self.container.replace_item(note.note_id, doc)
            return True
        except CosmosResourceNotFoundError:
            return False

    async def delete_note(self, note_id: str, user_id: Optional[str] = None) -> bool:
        try:
            await self.container.delete_item(note_id, partition_key=note_id)
            return True
        except CosmosResourceNotFoundError:
            return False

    async def search_notes(
        self,
        user_id: Optional[str] = None,
        categories: Optional[str] = None,
        tags: Optional[List[str]] = None,
        search_text: Optional[str] = None,
        limit: int = 10
    ) -> List[Note]:
        query_parts = ["SELECT * FROM c WHERE 1=1 AND c.type = 'note'"]
        params = []

        if user_id:
            query_parts.append("AND c.userId = @userId")
            params.append({"name": "@userId", "value": user_id})

        if categories:
            query_parts.append("AND ARRAY_CONTAINS(c.categories, @category)")
            params.append({"name": "@category", "value": categories})

        if tags:
            tag_conditions = []
            for i, tag in enumerate(tags):
                param_name = f"@tag{i}"
                tag_conditions.append(f"ARRAY_CONTAINS(c.tags, {param_name})")
                params.append({"name": param_name, "value": tag})
            query_parts.append(f"AND ({' OR '.join(tag_conditions)})")

        if search_text:
            search_conditions = [
                "CONTAINS(LOWER(c.content), LOWER(@searchText))",
                "CONTAINS(LOWER(c.title), LOWER(@searchText))",
                "CONTAINS(LOWER(c.summary), LOWER(@searchText))",
                "ARRAY_CONTAINS(c.tags, LOWER(@searchText))",  # Use ARRAY_CONTAINS for tags
                "ARRAY_CONTAINS(c.categories, LOWER(@searchText))",  # Use ARRAY_CONTAINS for categories
                "ARRAY_CONTAINS(c.entities, LOWER(@searchText))"  # Use ARRAY_CONTAINS for entities
            ]
            query_parts.append(f"AND ({' OR '.join(search_conditions)})")
            params.append({"name": "@searchText", "value": search_text})

        query = " ".join(query_parts)

        print(query)
        notes = []
        try:
            async for doc in self.container.query_items(
                query=query,
                parameters=params,
                max_item_count=limit
            ):
                notes.append(self._doc_to_note(doc))
        except Exception as e:
            print(f"Error searching notes: {str(e)}")
        return notes

    async def vector_search(
        self,
        query: Optional[str],
        query_embedding: List[float],
        limit: int = 10,
        min_similarity: float = 0.7,
        user_id: Optional[str] = None
    ) -> List[Tuple[Note, float]]:
        query = """
        SELECT *,
        vector_cosine_similarity(c.embedding, @queryEmbedding) as similarity
        FROM c
        WHERE c.type = 'note'
        AND vector_cosine_similarity(c.embedding, @queryEmbedding) >= @minSimilarity
        ORDER BY similarity DESC
        OFFSET 0 LIMIT @limit
        """
        
        if query:
            query_embedding = await self.embeddings.aembed_query(query)
        
        params = [
            {"name": "@queryEmbedding", "value": query_embedding},
            {"name": "@minSimilarity", "value": min_similarity},
            {"name": "@limit", "value": limit}
        ]

        notes_with_scores = []
        async for doc in self.container.query_items(
            query=query,
            parameters=params,
            enable_scan_in_query=True  # Required for vector search
        ):
            score = doc.pop('similarity')
            notes_with_scores.append((self._doc_to_note(doc), score))
        return notes_with_scores

    async def hybrid_search(
        self,
        query_text: Optional[str] = None,
        query_embedding: Optional[List[float]] = None,
        user_id: Optional[str] = None,
        categories: Optional[str] = None,
        tags: Optional[List[str]] = None,
        entities: Optional[List[str]] = None,
        min_similarity: float = 0.7,
        limit: int = 10
    ) -> List[Note]:
        """
        Perform hybrid search using vector similarity and metadata filtering.
        Uses Azure Cosmos DB's vector search capabilities.
        Returns list of Notes ordered by vector similarity.
        """
        if not query_embedding and not query_text:
            raise ValueError("Either query_text or query_embedding must be provided")
            
        if query_text and not query_embedding:
            query_embedding = await self.embeddings.aembed_query(query_text)

        # Ensure query_embedding is a list 
        query_embedding = list(query_embedding)
        
        # Build base query with vector distance calculation
        query = """
            SELECT *,
            (1 - VectorDistance(c.embedding, @queryEmbedding, 'cosine')) as similarity
            FROM c
            WHERE c.type = 'note'
        """
        
        params = []

        # Add filters
        conditions = []
        
        if user_id:
            conditions.append("c.userId = @userId")
            params.append({"name": "@userId", "value": user_id})
            
        if categories:
            conditions.append("ARRAY_CONTAINS(c.categories, @category)")
            params.append({"name": "@category", "value": categories})

        if tags:
            tag_parts = []
            for i, tag in enumerate(tags):
                tag_parts.append(f"ARRAY_CONTAINS(c.tags, @tag{i})")
                params.append({"name": f"@tag{i}", "value": tag})
            if tag_parts:
                conditions.append(f"({' OR '.join(tag_parts)})")

        if entities:
            entity_parts = []
            for i, entity in enumerate(entities):
                entity_parts.append(f"ARRAY_CONTAINS(c.entities, @entity{i})")
                params.append({"name": f"@entity{i}", "value": entity})
            if entity_parts:
                conditions.append(f"({' OR '.join(entity_parts)})")

        if query_text:
            conditions.append("CONTAINS(c.content, @queryText)")
            params.append({"name": "@queryText", "value": query_text})

        # Add vector similarity condition using correct distance function
        conditions.append("(1 - VectorDistance(c.embedding, @queryEmbedding, 'cosine')) >= @minSimilarity")
        params.extend([
            {"name": "@queryEmbedding", "value": query_embedding},
            {"name": "@minSimilarity", "value": min_similarity}
        ])

        # Add conditions to query
        if conditions:
            query += " AND " + " AND ".join(conditions)

        # Add ordering and limit - use direct integer for LIMIT
        query += """
            ORDER BY similarity DESC
            OFFSET 0 LIMIT {}
        """.format(int(limit))

        # Execute query with proper error handling
        notes = []
        try:
            async for doc in self.container.query_items(
                query=query,
                parameters=params,
                enable_scan_in_query=True
            ):
                notes.append(self._doc_to_note(doc))
        except Exception as e:
            logging.error("Vector search query failed")
            logging.error(f"Query: {query}")
            logging.error(f"Parameters: {params}")
            logging.exception(e)
            raise

        return notes

    async def get_recent_notes(
        self,
        user_id: Optional[str] = None,
        offset: int = 0,
        limit: int = 10
    ) -> List[Note]:
        query_parts = ["SELECT * FROM c WHERE c.type = 'note'"]
        params = []

        if user_id:
            query_parts.append("AND c.userId = @userId")
            params.append({"name": "@userId", "value": user_id})

        query_parts.extend([
            "ORDER BY c.updatedAt DESC",
            "OFFSET @offset LIMIT @limit"
        ])
        
        params.extend([
            {"name": "@offset", "value": offset},
            {"name": "@limit", "value": limit}
        ])

        query = " ".join(query_parts)
        
        notes = []
        async for doc in self.container.query_items(
            query=query,
            parameters=params
        ):
            notes.append(self._doc_to_note(doc))
        return notes

    async def get_distinct_categories(self, user_id: Optional[str] = None) -> Set[str]:
        query = """
        SELECT DISTINCT VALUE c.category
        FROM c
        JOIN category IN c.categories
        WHERE c.type = 'note'
        """
        
        categories = set()
        async for result in self.container.query_items(query, enable_cross_partition_query=True):
            categories.add(result)
        return categories

    async def get_distinct_tags(self, user_id: Optional[str] = None) -> Set[str]:
        query = """
        SELECT DISTINCT VALUE t
        FROM c
        JOIN t IN c.tags
        WHERE c.type = 'note'
        """
        
        tags = set()
        async for result in self.container.query_items(query, enable_cross_partition_query=True):
            tags.add(result)
        return tags

    async def get_distinct_entities(self, user_id: Optional[str] = None) -> Set[str]:
        query = """
        SELECT DISTINCT VALUE e
        FROM c
        JOIN e IN c.entities
        WHERE c.type = 'note'
        """
        
        entities = set()
        async for result in self.container.query_items(query, enable_cross_partition_query=True):
            entities.add(result)
        return entities

    async def create_container(self, partition_key_path: str = "/id") -> bool:
        """
        Create the Cosmos DB container with vector search capabilities.
        
        Args:
            partition_key_path: Path to the partition key field
            
        Returns:
            bool: True if container creation was successful
        """
        try:
            await self.client.create_database_if_not_exists(id=self.database.id)
            self.database = self.client.get_database_client(self.database.id)
            # Define indexing policy optimized for the Note model
            indexing_policy = {
                "indexingMode": "consistent",
                "automatic": True,
                "includedPaths": [
                    {
                        "path": "/*"
                    },
                    # Optimize for text search
                    {
                        "path": "/content/?",
                        "indexes": [
                            {
                                "kind": "Range",
                                "dataType": "String",
                                "precision": -1
                            }
                        ]
                    },
                    {
                        "path": "/title/?",
                        "indexes": [
                            {
                                "kind": "Range",
                                "dataType": "String",
                                "precision": -1
                            }
                        ]
                    },
                    {
                        "path": "/summary/?",
                        "indexes": [
                            {
                                "kind": "Range",
                                "dataType": "String",
                                "precision": -1
                            }
                        ]
                    },
                    # Array indexes for efficient filtering
                    {
                        "path": "/categories/*",
                        "indexes": [
                            {
                                "kind": "Range",
                                "dataType": "String",
                                "precision": -1
                            }
                        ]
                    },
                    {
                        "path": "/tags/*",
                        "indexes": [
                            {
                                "kind": "Range",
                                "dataType": "String",
                                "precision": -1
                            }
                        ]
                    },
                    # Timestamp indexes for sorting and filtering
                    {
                        "path": "/createdAt/?",
                        "indexes": [
                            {
                                "kind": "Range",
                                "dataType": "String",
                                "precision": -1
                            }
                        ]
                    },
                    {
                        "path": "/updatedAt/?",
                        "indexes": [
                            {
                                "kind": "Range",
                                "dataType": "String",
                                "precision": -1
                            }
                        ]
                    },
                    # Index for userId lookups
                    {
                        "path": "/userId/?",
                        "indexes": [
                            {
                                "kind": "Range",
                                "dataType": "String",
                                "precision": -1
                            }
                        ]
                    }
                ],
                "excludedPaths": [
                    # Exclude paths that don't need indexing
                    {
                        "path": "/content_map/?"
                    },
                    {
                        "path": "/metadata/?"
                    },
                    {
                        "path": "/\"_etag\"/?"
                    }
                ],
                "vectorSearch": {
                    "algorithms": [
                        {
                            "name": "hnsw",
                            "configuration": {
                                "m": 4,
                                "efConstruction": 400,
                                "efSearch": 500,
                                "metric": "cosine"
                            }
                        }
                    ],
                    "indexes": [
                        {
                            "path": "/embedding/*",
                            "kind": "vector-hnsw",
                            "algorithm": "hnsw",
                            "dimensions": 1536,  # Adjust based on your embedding size
                            "metric": "cosine"
                        }
                    ]
                }
            }

            await self.database.create_container(
                id=self.container.id,
                partition_key=PartitionKey(path=partition_key_path),
                indexing_policy=indexing_policy
            )
            return True
        except Exception as e:
            print(f"Error creating container: {str(e)}")
            return False