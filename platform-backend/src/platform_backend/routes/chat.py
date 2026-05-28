"""
The chat endpoint.

`POST /conversations/{id}/messages` is the centerpiece of the platform v0:

1. Persist the incoming user message.
2. Assemble the conversation history into the runtime's `{"messages": [...]}`
   shape (translation into framework-native messages is the runtime adapter's
   job).
3. Decrypt the user's API keys and put them in `context.credentials`.
4. Open the runtime's SSE stream, re-emit byte-for-byte to the browser, AND
   tee-parse so we can persist the assistant's final text plus the `run_id`
   at end-of-run.
5. Auto-title the conversation on the first user message.
6. Track the active `run_id` in-memory so `POST /conversations/{id}/cancel`
   can target it.

Notes:
- We do NOT parse the SSE wire to translate it — the schema is the platform's
  contract with the front-end, and the runtime owns it. We only inspect the
  parsed `data:` JSON to update an accumulator and detect `run_end` / `error`.
- Disconnect during the stream: FastAPI's `request.is_disconnected()` flips,
  we save the partial accumulated text, and the upstream stream is closed by
  httpx when our generator exits.
"""

from __future__ import annotations

import uuid
from typing import AsyncIterator

from fastapi import APIRouter, Depends, HTTPException, Request, status
from fastapi.responses import StreamingResponse
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from .. import runtime_client
from ..auth.deps import current_user
from ..db import get_session, session_factory
from ..models.conversation import Conversation
from ..models.message import Message
from ..models.user import User
from ..schemas.chat import ActionIn, CancelOut, ChatMessageIn
from ..sse import iter_frames
from .me_keys import load_credentials_dict


router = APIRouter(prefix="/conversations", tags=["chat"])


# Conversation-id → active run_id. In-memory: a process-restart loses the
# mapping, which matches the runtime's own model (cancel is process-lifetime,
# see backend-runtime/README.md). Durable cancel is post-v0.
_active_runs: dict[uuid.UUID, str] = {}


# ---------------------------------------------------------------------------
# Internal helpers
# ---------------------------------------------------------------------------

async def _owned_conversation(
    session: AsyncSession, user_id: uuid.UUID, conv_id: uuid.UUID
) -> Conversation:
    conv = await session.get(Conversation, conv_id)
    if conv is None or conv.user_id != user_id:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="conversation not found"
        )
    return conv


def _autotitle(text: str) -> str:
    """Heuristic title from the first user message: first non-blank line,
    trimmed to 60 chars with an ellipsis on overflow. The point is a
    sidebar-friendly label, not a precis."""
    line = text.strip().splitlines()[0] if text.strip() else ""
    if len(line) <= 60:
        return line
    return line[:57].rstrip() + "…"


async def _assemble_history(
    session: AsyncSession, conv_id: uuid.UUID
) -> list[dict[str, str]]:
    result = await session.execute(
        select(Message.role, Message.content)
        .where(Message.conversation_id == conv_id)
        .order_by(Message.created_at)
    )
    return [{"role": role, "content": content} for role, content in result.all()]


# ---------------------------------------------------------------------------
# Chat (streaming)
# ---------------------------------------------------------------------------

@router.post("/{conv_id}/messages")
async def post_message(
    conv_id: uuid.UUID,
    body: ChatMessageIn,
    request: Request,
    user: User = Depends(current_user),
    session: AsyncSession = Depends(get_session),
) -> StreamingResponse:
    conv = await _owned_conversation(session, user.id, conv_id)

    # Persist the user message and (if this is the first one) the auto-title
    # in the same commit, so a crash before the upstream call leaves a clean
    # row pair rather than a titled-but-empty conversation.
    is_first_message = (
        await session.execute(
            select(Message.id)
            .where(Message.conversation_id == conv_id)
            .limit(1)
        )
    ).first() is None
    user_message = Message(
        conversation_id=conv.id, role="user", content=body.content
    )
    session.add(user_message)
    if is_first_message and not conv.title:
        conv.title = _autotitle(body.content)
    await session.commit()
    # Refresh so the assembled history below includes this row's timestamp
    # ordering reliably.
    await session.refresh(user_message)
    await session.refresh(conv)

    history = await _assemble_history(session, conv.id)
    creds = await load_credentials_dict(session, user.id)
    run_id = uuid.uuid4().hex
    agent_id = conv.agent_id

    runtime_body = {
        "input": {"messages": history},
        "run_id": run_id,
        "context": {
            "user_id": str(user.id),
            "conversation_id": str(conv.id),
            "credentials": creds,
        },
    }

    _active_runs[conv.id] = run_id

    async def passthrough() -> AsyncIterator[bytes]:
        """Pipe upstream bytes to the client and accumulate the assistant text.

        We DON'T translate the SSE schema — the runtime's event types are the
        platform's wire contract. We only watch for `block_*` text events to
        build the persisted final message, and `run_end` / `error` to know
        when to commit.
        """
        accumulated: dict[str, str] = {}  # block_id → text-so-far
        final_text_parts: list[str] = []
        terminal_event_type: str | None = None

        try:
            async for frame in iter_frames(
                runtime_client.stream(agent_id, runtime_body)
            ):
                # Forward bytes first — the browser sees frames as soon as
                # they arrive; persistence is a tail operation.
                yield frame.raw_bytes

                # Client gave up? Stop pulling and persist whatever we have.
                if await request.is_disconnected():
                    break

                payload = frame.data_json
                if payload is None:
                    continue

                etype = payload.get("event_type") or frame.event
                if etype in ("block_start", "block_delta") and payload.get(
                    "block_type"
                ) == "text":
                    block_id = payload.get("block_id", "")
                    delta = payload.get("text", "") or ""
                    accumulated[block_id] = accumulated.get(block_id, "") + delta
                elif etype == "block_end" and payload.get("block_type") == "text":
                    block_id = payload.get("block_id", "")
                    if block_id in accumulated:
                        final_text_parts.append(accumulated.pop(block_id))
                elif etype in ("run_end", "error"):
                    # Flush any blocks still in-progress (the runtime closes
                    # them at run_end normally, but be robust to adapters that
                    # don't).
                    for text in accumulated.values():
                        final_text_parts.append(text)
                    accumulated.clear()
                    terminal_event_type = etype
        finally:
            # Persist whatever we accumulated, even on disconnect. Use a fresh
            # session — the request's session is closed by the time `finally`
            # runs for a streaming response.
            _active_runs.pop(conv.id, None)
            final_text = "".join(final_text_parts)
            async with session_factory()() as bg:
                bg.add(
                    Message(
                        conversation_id=conv.id,
                        role="assistant",
                        content=final_text,
                        run_id=run_id,
                    )
                )
                # Bump updated_at on the parent conversation so the sidebar
                # ordering reflects this exchange.
                fresh_conv = await bg.get(Conversation, conv.id)
                if fresh_conv is not None:
                    # SQLAlchemy onupdate fires only on UPDATE; touch a column.
                    fresh_conv.title = fresh_conv.title  # no-op flush trigger
                await bg.commit()

            # Best-effort: nothing more to yield, but if the run never ended
            # (e.g. disconnect mid-stream) we don't synthesize a fake run_end —
            # the client already saw whatever the runtime emitted.
            _ = terminal_event_type

    return StreamingResponse(
        passthrough(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "X-Accel-Buffering": "no",  # disable proxy buffering (nginx)
        },
    )


# ---------------------------------------------------------------------------
# Cancel
# ---------------------------------------------------------------------------

@router.post("/{conv_id}/cancel", response_model=CancelOut)
async def cancel(
    conv_id: uuid.UUID,
    user: User = Depends(current_user),
    session: AsyncSession = Depends(get_session),
) -> CancelOut:
    conv = await _owned_conversation(session, user.id, conv_id)
    run_id = _active_runs.get(conv.id)
    if not run_id:
        return CancelOut(cancelled=False)
    result = await runtime_client.cancel(conv.agent_id, run_id)
    return CancelOut(cancelled=bool(result.get("cancelled", False)))


# ---------------------------------------------------------------------------
# Action proxy
# ---------------------------------------------------------------------------

@router.post("/{conv_id}/actions/{action_name}")
async def invoke_action(
    conv_id: uuid.UUID,
    action_name: str,
    body: ActionIn | None = None,
    user: User = Depends(current_user),
    session: AsyncSession = Depends(get_session),
):
    conv = await _owned_conversation(session, user.id, conv_id)
    status_code, payload = await runtime_client.invoke_action(
        conv.agent_id, action_name, (body.args if body else None) or {}
    )
    from fastapi.responses import JSONResponse
    return JSONResponse(payload, status_code=status_code)
