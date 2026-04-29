"""Minimalist FastAPI backend for the agent-ui minimal example.

Endpoints:
  - GET    /conversations           → list of summaries
  - POST   /conversations           → create a new empty conversation
  - GET    /conversations/{id}      → messages for one conversation
  - POST   /chat                    → stream OpenAI completion; persists if conversation_id given
"""

from __future__ import annotations

import os
import time
import uuid
from typing import AsyncIterator, Optional

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from openai import AsyncOpenAI
from pydantic import BaseModel

app = FastAPI(title="agent-ui minimal backend")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

client = AsyncOpenAI(api_key=os.environ.get("OPENAI_API_KEY"))
MODEL = os.environ.get("OPENAI_MODEL", "gpt-4o-mini")


def now_ms() -> int:
    return int(time.time() * 1000)


CONVERSATIONS: dict[str, dict] = {
    "c1": {
        "summary": {
            "id": "c1",
            "title": "Quarterly report review",
            "preview": "Walk me through the Q3 numbers…",
            "timestamp": now_ms() - 1000 * 60 * 60 * 24,
        },
        "messages": [
            {"id": "c1-1", "role": "user", "content": "Walk me through the Q3 numbers."},
            {"id": "c1-2", "role": "assistant", "content": "Revenue was $4.2M, up 18% YoY."},
        ],
    },
    "c2": {
        "summary": {
            "id": "c2",
            "title": "Refactor the billing module",
            "preview": "Here's the plan for splitting out invoices.",
            "timestamp": now_ms() - 1000 * 60 * 60 * 4,
        },
        "messages": [
            {"id": "c2-1", "role": "user", "content": "Here's the plan for splitting out invoices."},
            {"id": "c2-2", "role": "assistant", "content": "Looks good. Let's stage the migration."},
        ],
    },
}


@app.get("/conversations")
def list_conversations() -> list[dict]:
    items = [c["summary"] for c in CONVERSATIONS.values()]
    items.sort(key=lambda s: s.get("timestamp", 0), reverse=True)
    return items


@app.post("/conversations")
def create_conversation() -> dict:
    cid = uuid.uuid4().hex[:8]
    summary = {
        "id": cid,
        "title": "New chat",
        "preview": "",
        "timestamp": now_ms(),
    }
    CONVERSATIONS[cid] = {"summary": summary, "messages": []}
    return summary


@app.get("/conversations/{conversation_id}")
def get_conversation(conversation_id: str) -> list[dict]:
    convo = CONVERSATIONS.get(conversation_id)
    if convo is None:
        raise HTTPException(status_code=404, detail="conversation not found")
    return convo["messages"]


class ChatMessage(BaseModel):
    role: str
    content: str


class ChatRequest(BaseModel):
    messages: list[ChatMessage]
    conversation_id: Optional[str] = None


@app.post("/chat")
async def chat(req: ChatRequest) -> StreamingResponse:
    convo = CONVERSATIONS.get(req.conversation_id) if req.conversation_id else None

    if convo is not None and req.messages:
        last = req.messages[-1]
        if last.role == "user":
            convo["messages"].append(
                {
                    "id": f"{req.conversation_id}-{len(convo['messages'])}",
                    "role": "user",
                    "content": last.content,
                }
            )
            summary = convo["summary"]
            summary["preview"] = last.content[:80]
            summary["timestamp"] = now_ms()
            if summary["title"] == "New chat":
                summary["title"] = last.content[:48] or "New chat"

    async def stream() -> AsyncIterator[str]:
        completion = await client.chat.completions.create(
            model=MODEL,
            messages=[m.model_dump() for m in req.messages],
            stream=True,
        )
        full = ""
        async for chunk in completion:
            delta = chunk.choices[0].delta.content
            if delta:
                full += delta
                yield delta
        if convo is not None:
            convo["messages"].append(
                {
                    "id": f"{req.conversation_id}-{len(convo['messages'])}",
                    "role": "assistant",
                    "content": full,
                }
            )

    return StreamingResponse(stream(), media_type="text/plain")
