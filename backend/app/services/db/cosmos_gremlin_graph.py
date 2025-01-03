from typing import List, Optional, Dict, Any
import json
import asyncio
from datetime import datetime

from gremlin_python.driver import client, serializer
from gremlin_python.driver.protocol import GremlinServerError
from gremlin_python.process.graph_traversal import __
from gremlin_python.process.traversal import T
from gremlin_python.driver.aiohttp.transport import AiohttpTransport

from ...models.note import Note, NoteReference
from ...models.content import ContentType, ContentUnion, TextContent, ImageContent, VideoContent, FileContent, LinkContent
from ...utils.vector import calculate_vector_similarity
from .base import NotesDbService


class CosmosNotesGraphService(NotesDbService):
    def __init__(self, endpoint: str, key: str, database: str, container: str):
        """Initialize the Cosmos DB Graph (Gremlin) client."""
        self.client = client.Client(
            f'{endpoint}',
            'g',
            username=f"/dbs/{database}/colls/{container}",
            password=key,
            message_serializer=serializer.GraphSONSerializersV2d0(),
            transport_factory=AiohttpTransport(call_from_event_loop=True)
        )

    async def __aenter__(self):
        return self

    async def __aexit__(self, exc_type, exc_val, exc_tb):
        await self.close()

    async def close(self):
        """Close the Gremlin client connection."""
        pass
        #await self.client.close()

    def _serialize_datetime(self, dt: datetime) -> int:
        """Convert datetime to timestamp for Cosmos DB storage."""
        return int(dt.timestamp() * 1000)

    def _deserialize_datetime(self, timestamp: int) -> datetime:
        """Convert stored timestamp back to datetime."""
        return datetime.fromtimestamp(timestamp / 1000)

    def _prepare_note_properties(self, note: Note) -> Dict[str, Any]:
        """Prepare note properties for vertex creation."""
        properties = {
            'user_id': note.user_id,
            'categories': note.categories,
            'title': note.title,
            'tags': json.dumps(note.tags),
            'summary': note.summary,
            'entities': json.dumps(note.entities),
            'created_at': self._serialize_datetime(note.created_at),
            'updated_at': self._serialize_datetime(note.updated_at),
            'metadata': json.dumps(note.metadata)
        }
        if note.embedding:
            properties['embedding'] = json.dumps(note.embedding)
        return properties

    async def create_note(self, note: Note, user_id: Optional[str] = None) -> Note:
        """Create a new note vertex in the graph."""
        properties = self._prepare_note_properties(note)
        
        # Create the main note vertex
        query = (
            "g.addV('note')"
            f".property(T.id, '{note.note_id}')"
        )
        
        # Add all properties
        for key, value in properties.items():
            if value is not None:
                query += f".property('{key}', '{value}')"

        await self.client.submitAsync(query)

        # Create content vertices and edges
        for content in note.contents:
            content_props = {
                'type': content.type.value,
                'preview': content.preview,
                'content': content.content
            }
            
            # Add type-specific properties
            if isinstance(content, TextContent):
                content_props['text'] = content.text
            elif isinstance(content, ImageContent):
                content_props.update({
                    'storage_url': content.storage_url,
                    'alt_text': content.alt_text,
                    'ocr_text': content.ocr_text,
                    'description': content.description
                })
            elif isinstance(content, VideoContent):
                content_props.update({
                    'storage_url': content.storage_url,
                    'duration_seconds': content.duration_seconds
                })
            elif isinstance(content, FileContent):
                content_props.update({
                    'storage_url': content.storage_url,
                    'original_filename': content.original_filename
                })
            elif isinstance(content, LinkContent):
                content_props.update({
                    'url': content.url,
                    'storage_url': content.storage_url
                })

            # Create content vertex and edge
            content_query = (
                "g.addV('content')"
                f".property(T.id, '{content.content_id}')"
            )
            for key, value in content_props.items():
                if value is not None:
                    content_query += f".property('{key}', '{value}')"
            
            content_query += (
                f".addE('has_content').from_(g.V('{note.note_id}'))"
            )
            
            await self.client.submitAsync(content_query)

        # Create edges for linked notes
        for ref in note.linked_notes:
            link_query = (
                f"g.V('{note.note_id}')"
                f".addE('{ref.relationship_type}')"
                f".to(g.V('{ref.note_id}'))"
                f".property('created_at', '{self._serialize_datetime(ref.created_at)}')"
                f".property('metadata', '{json.dumps(ref.metadata)}')"
            )
            await self.client.submitAsync(link_query)

        return note
    
    async def get_note(self, note_id: str, user_id: Optional[str] = None) -> Optional[Note]:
        """Retrieve a note and all its contents by ID."""
        # Get the main note vertex
        query = f"g.V('{note_id}')"
        result = await self.client.submitAsync(query)
        
        note_vertex = await result.all().result()
        if not note_vertex:
            return None

        # Extract note properties
        props = note_vertex[0].properties
        
        # Get all content vertices
        content_query = (
            f"g.V('{note_id}').out('has_content')"
        )
        content_result = await self.client.submitAsync(content_query)
        content_vertices = await content_result.all().result()

        # Convert content vertices to ContentUnion objects
        contents = []
        for vertex in content_vertices:
            content_props = vertex.properties
            content_type = ContentType(content_props['type'][0])
            
            if content_type == ContentType.TEXT:
                contents.append(TextContent(
                    content_id=vertex.id,
                    preview=content_props.get('preview', [None])[0],
                    content=content_props.get('content', [None])[0],
                    text=content_props['text'][0]
                ))
            elif content_type == ContentType.IMAGE:
                contents.append(ImageContent(
                    content_id=vertex.id,
                    preview=content_props.get('preview', [None])[0],
                    content=content_props.get('content', [None])[0],
                    storage_url=content_props['storage_url'][0],
                    alt_text=content_props.get('alt_text', [None])[0],
                    ocr_text=content_props.get('ocr_text', [None])[0],
                    description=content_props.get('description', [None])[0]
                ))
            # Add similar handling for other content types...

        # Get linked notes
        links_query = (
            f"g.V('{note_id}').outE().project('edge', 'vertex')"
            ".by(__.elementMap())"
            ".by(__.inV().elementMap())"
        )
        links_result = await self.client.submitAsync(links_query)
        links_data = await links_result.all().result()

        linked_notes = []
        for link in links_data:
            if link['edge'].label != 'has_content':  # Skip content edges
                linked_notes.append(NoteReference(
                    note_id=link['vertex'].id,
                    relationship_type=link['edge'].label,
                    created_at=self._deserialize_datetime(link['edge'].properties['created_at']),
                    metadata=json.loads(link['edge'].properties.get('metadata', '{}'))
                ))

        # Construct and return the complete Note object
        return Note(
            note_id=note_id,
            user_id=props.get('user_id', [None])[0],
            contents=contents,
            categories=json.loads(props.get('categories', ['[]'])[0]),
            title=props.get('title', [None])[0],
            tags=json.loads(props.get('tags', ['[]'])[0]),
            summary=props.get('summary', [None])[0],
            entities=json.loads(props.get('entities', ['{}'])[0]),
            embedding=json.loads(props.get('embedding', ['null'])[0]) if 'embedding' in props else None,
            linked_notes=linked_notes,
            created_at=self._deserialize_datetime(props['created_at'][0]),
            updated_at=self._deserialize_datetime(props['updated_at'][0]),
            metadata=json.loads(props.get('metadata', ['{}'])[0])
        )

    async def update_note(self, note: Note, user_id: Optional[str] = None) -> None:
        """Update an existing note."""
        # First, remove all existing content vertices and edges
        await self.client.submitAsync(
            f"g.V('{note.note_id}').out('has_content').drop()"
        )
        
        # Update main note vertex properties
        properties = self._prepare_note_properties(note)
        update_query = f"g.V('{note.note_id}')"
        for key, value in properties.items():
            if value is not None:
                update_query += f".property('{key}', '{value}')"
        
        await self.client.submitAsync(update_query)
        
        # Re-create content vertices and edges
        for content in note.contents:
            await self.create_note_content(note.note_id, content)

        # Update linked notes
        # First remove existing relationship edges
        await self.client.submitAsync(
            f"g.V('{note.note_id}').outE().not(hasLabel('has_content')).drop()"
        )
        
        # Create new relationship edges
        for ref in note.linked_notes:
            await self.create_note_reference(note.note_id, ref)

    async def delete_note(self, note_id: str, user_id: Optional[str] = None) -> None:
        """Delete a note and all its contents."""
        # This will delete the note vertex and all connected edges
        await self.client.submitAsync(f"g.V('{note_id}').drop()")

    async def hybrid_search(self,
                           query_embedding: List[float],
                           query_text: Optional[str] = None,
                           user_id: Optional[str] = None,
                           categories: Optional[List[str]] = None,
                           tags: Optional[List[str]] = None,
                           entities: Optional[Dict[str, str]] = None,
                           min_similarity: float = 0.7,
                           include_linked: bool = True,
                           max_linked_depth: int = 1,
                           limit: int = 10) -> List[tuple[Note, float]]:
        """
        Perform hybrid search combining vector similarity with graph traversal.
        Returns list of (note, combined_score) tuples.
        """
        # Start with vector similarity search
        base_query = (
            "g.V().hasLabel('note')"
            f".has('embedding')"
        )
        
        # Add filters
        if user_id:
            base_query += f".has('user_id', '{user_id}')"
        if categories:
            base_query += f".has('categories', containing('{json.dumps(categories)}')"
        if tags:
            base_query += f".has('tags', containing('{json.dumps(tags)}')"
        if entities:
            base_query += f".has('entities', containing('{json.dumps(entities)}')"
        if query_text:
            base_query += (
                f".or_(__.has('title', containing('{query_text}')), "
                f"__.has('summary', containing('{query_text}')))"
            )
        
        # Add vector similarity ordering and scoring
        query = (
            f"{base_query}"
            f".order().by(vectorSimilarity('{json.dumps(query_embedding)}', 'embedding'))"
            f".limit({limit})"
            ".project('vertex', 'vscore')"
            ".by(elementMap())"
            f".by(vectorSimilarity('{json.dumps(query_embedding)}', 'embedding'))"
        )
        
        result = await self.client.submitAsync(query)
        matches = await result.all().result()
        
        # Process initial results
        scored_notes = {}  # Dict[note_id, (Note, score)]
        for match in matches:
            score = match['vscore']
            if score >= min_similarity:
                note = await self.get_note(match['vertex'].id)
                if note:
                    scored_notes[note.note_id] = (note, score)
        
        # If requested, include linked notes
        if include_linked:
            for note_id, (note, score) in list(scored_notes.items()):
                linked_notes = await self.get_related_notes(
                    note_id, max_depth=max_linked_depth
                )
                for linked_note in linked_notes:
                    if linked_note.note_id not in scored_notes:
                        # Reduce score based on graph distance
                        distance_penalty = 0.8 ** max_linked_depth
                        if linked_note.embedding:
                            # Calculate vector similarity for linked note
                            linked_score = calculate_vector_similarity(
                                query_embedding, linked_note.embedding
                            )
                            # Combine scores with distance penalty
                            combined_score = (score + linked_score) / 2 * distance_penalty
                            if combined_score >= min_similarity:
                                scored_notes[linked_note.note_id] = (
                                    linked_note, combined_score
                                )
        
        # Sort by final scores and return
        return sorted(
            scored_notes.values(),
            key=lambda x: x[1],
            reverse=True
        )[:limit]



    async def search_notes(self, 
                        user_id: Optional[str] = None,
                        categories: Optional[str] = None,
                        tags: Optional[List[str]] = None,
                        search_text: Optional[str] = None,
                        limit: int = 10) -> List[Note]:
        """
        Search notes based on various criteria.
        """
        query = "g.V().hasLabel('note')"
        
        if user_id:
            query += f".has('user_id', '{user_id}')"
        if categories:
            query += f".has('categories', containing('{json.dumps(categories)}')"
        if tags:
            query += f".has('tags', containing('{json.dumps(tags)}')"
        if search_text:
            query += (
                f".or_(__.has('title', containing('{search_text}')), "
                f"__.has('summary', containing('{search_text}')))"
            )
        
        query += f".limit({limit})"
        
        result = await self.client.submitAsync(query)
        vertices = await result.all().result()
        
        notes = []
        for vertex in vertices:
            note = await self.get_note(vertex.id)
            if note:
                notes.append(note)
        
        return notes

    async def vector_search(self, 
                            query_embedding: List[float],
                            limit: int = 10,
                            min_similarity: float = 0.7) -> List[tuple[Note, float]]:
        """
        Search notes using vector similarity.
        Returns list of (note, similarity_score) tuples.
        """
        # Cosmos DB supports vector search through custom functions
        query = (
            "g.V().hasLabel('note')"
            f".has('embedding')"  # Only search notes with embeddings
            f".order().by(vectorSimilarity('{json.dumps(query_embedding)}', 'embedding'))"
            f".limit({limit})"
            # Project both the vertex and the similarity score
            ".project('vertex', 'score')"
            ".by(elementMap())"
            f".by(vectorSimilarity('{json.dumps(query_embedding)}', 'embedding'))"
        )
        
        result = await self.client.submitAsync(query)
        matches = await result.all().result()
        
        notes_with_scores = []
        for match in matches:
            score = match['score']
            if score >= min_similarity:
                note = await self.get_note(match['vertex'].id)
                if note:
                    notes_with_scores.append((note, score))
        
        return notes_with_scores

    async def get_related_notes(self, note_id: str, 
                            relationship_type: Optional[str] = None,
                            max_depth: int = 2) -> List[Note]:
        """Get related notes up to a certain depth."""
        query = f"g.V('{note_id}')"
        
        if relationship_type:
            query += f".repeat(outE('{relationship_type}').inV())"
        else:
            query += ".repeat(outE().inV())"
            
        query += f".times({max_depth}).emit()"
        
        result = await self.client.submitAsync(query)
        vertices = await result.all().result()
        
        notes = []
        seen_ids = set()
        for vertex in vertices:
            if vertex.id not in seen_ids:
                note = await self.get_note(vertex.id)
                if note:
                    notes.append(note)
                    seen_ids.add(vertex.id)
        
        return notes

    async def create_note_content(self, note_id: str, content: ContentUnion) -> None:
        """Helper method to create content vertex and edge."""
        content_props = {
            'type': content.type.value,
            'preview': content.preview,
            'content': content.content
        }
        
        # Add type-specific properties
        if isinstance(content, TextContent):
            content_props['text'] = content.text
        elif isinstance(content, ImageContent):
            content_props.update({
                'storage_url': content.storage_url,
                'alt_text': content.alt_text,
                'ocr_text': content.ocr_text,
                'description': content.description
            })
        # Add handling for other content types...
        
        content_query = (
            "g.addV('content')"
            f".property(T.id, '{content.content_id}')"
        )
        
        for key, value in content_props.items():
            if value is not None:
                content_query += f".property('{key}', '{value}')"
        
        content_query += f".addE('has_content').from_(g.V('{note_id}'))"
        
        await self.client.submitAsync(content_query)

    async def create_note_reference(self, note_id: str, reference: NoteReference) -> None:
        """Helper method to create note reference edge."""
        query = (
            f"g.V('{note_id}')"
            f".addE('{reference.relationship_type}')"
            f".to(g.V('{reference.note_id}'))"
            f".property('created_at', '{self._serialize_datetime(reference.created_at)}')"
            f".property('metadata', '{json.dumps(reference.metadata)}')"
        )
        await self.client.submitAsync(query)

    async def get_recent_notes(self, user_id: Optional[str] = None, offset: int = 0, limit: int = 10) -> List[Note]:
        query = "g.V().hasLabel('note')"
        if user_id:
            query += f".has('user_id', '{user_id}')"
        query += ".order().by('updated_at', decr)"
        query += f".range({offset}, {offset + limit})"

        #result = await self._submit_query(query)
        result = await self.client.submit_async(query)
        vertices = await result.all().result()

        notes = []
        for vertex in vertices:
            note = await self.get_note(vertex.id, user_id=user_id)
            if note:
                notes.append(note)

        return notes
    
    async def _submit_query(self, query):
        future = await self.client.submit_async(query)
        #result = await asyncio.wrap_future(future)
        return result 
    
    
    async def _run_query(self, query):
        """
        Submit a Gremlin query using submitAsync() and integrate it with asyncio.
        """
        # submitAsync() immediately returns a concurrent.futures.Future
        # which we can wrap with asyncio to avoid blocking
        loop = asyncio.get_running_loop()

        future = self.client.submitAsync(query)

        # Wrap the future in an asyncio-compatible call
        # so that we can await it without blocking the event loop
        result_set = await loop.run_in_executor(None, future.result)
        return result_set


