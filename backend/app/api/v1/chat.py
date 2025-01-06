from fastapi.responses import StreamingResponse
from pydantic import BaseModel
import openai
import json
from fastapi import APIRouter, Depends, HTTPException, UploadFile, Form, File, Query
from typing import List
from ...core.config import settings
from ..deps import get_note_service
from ...services.db.base import NotesDbService

router = APIRouter(prefix="/chat", tags=["chat"])


class Message(BaseModel):
    role: str
    content: str


class ChatRequest(BaseModel):
    messages: List[Message]


async def stream_chat_response(messages: List[dict], note_service: NotesDbService):
    # TODO: Add dependency injection for the OpenAI client
    try:
        last_message = messages[-1]
        query = last_message.content
        notes = await note_service.search_notes(query_text=query)
        #notes = await note_service.hybrid_search(query_text=query)
        # Flatten notes to string
        notes_str = "\n".join([note.content for note in notes])
        full_response = ""
        
        full_system_message = (
            "You are now chatting with an AI assistant.\n"
            f"Relevant notes:\n{notes_str}"
        )
        _messages = [Message(role="system", content=full_system_message)]
        _messages.extend(messages)
        
        client = openai.AsyncOpenAI(api_key=settings.OPENAI_API_KEY)
        response = await client.chat.completions.create(
            model="gpt-4o-mini",
            messages=[{"role": m.role, "content": m.content} for m in _messages],
            stream=True,
            max_tokens=1000,
        )
        
        async for chunk in response:
            if (chunk.choices[0].delta.content is not None):
                full_response += chunk.choices[0].delta.content
                # Yield the content in a format that can be parsed by the frontend
                yield f"data: {json.dumps({'content': full_response})}\n\n"
                
    except Exception as e:
        yield f"data: {json.dumps({'error': str(e)})}\n\n"
    
    # Signal the end of the stream
    yield "data: [DONE]\n\n"


@router.post("")
async def chat_endpoint(
    request: ChatRequest,
    note_service: NotesDbService = Depends(get_note_service)
):
    try:
        return StreamingResponse(
            stream_chat_response(request.messages, note_service),
            media_type="text/event-stream"
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
