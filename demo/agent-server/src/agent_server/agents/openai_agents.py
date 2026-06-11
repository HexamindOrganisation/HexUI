"""OpenAI Agents SDK → HexaUI contract bridge (reusable for any ``agents.Agent``).

``OpenAIAgentsAgent`` drives a *streamer* — an async ``(input) -> AsyncIterator``
of SDK ``stream_events()`` items — and forwards each as a native event the proxy
translates. ``select.py`` picks the streamer (plain ``run`` vs HexGate ``run_as``).
The OpenAI key comes from the environment (the agent-server ``.env``).
"""

from __future__ import annotations

import logging
import os
from typing import Any, AsyncIterator, Callable

from agents import set_default_openai_key

from .. import protocol

logger = logging.getLogger("agent_server.openai_agents")

# A streamer yields one run's native ``stream_events()`` items for some input.
Streamer = Callable[[Any], AsyncIterator[Any]]


def _agent_input(input: dict[str, Any]) -> Any:
    """HexaUI ``{"messages": [...]}`` → SDK input (full transcript, or last user text)."""
    messages = (input or {}).get("messages")
    if isinstance(messages, list) and messages:
        return messages
    return protocol.last_user_text(input)


def _to_native_event(sdk_event: Any, tool_names_by_id: dict[str, str]) -> dict | None:
    """One SDK ``stream_events()`` item → the native JSON event the proxy reads
    (``None`` to drop it).

    Besides serializing the SDK objects, this renames the SDK's event types
    (``*_event``) to the ones the translator matches (``raw_response`` /
    ``run_item``). ``tool_names_by_id`` lets the tool-output event recover its
    name, which the SDK's output item omits.
    """
    event_type = getattr(sdk_event, "type", None)

    # Streamed assistant text.
    if event_type == "raw_response_event":
        data = getattr(sdk_event, "data", None)
        if getattr(data, "type", None) == "response.output_text.delta":
            delta = getattr(data, "delta", "") or ""
            if delta:
                return {
                    "type": "raw_response",
                    "data": {"type": "response.output_text.delta", "delta": delta},
                }
        return None

    # Tool calls + the message-finalized marker.
    if event_type == "run_item_stream_event":
        item_name = getattr(sdk_event, "name", None)
        item = getattr(sdk_event, "item", None)
        raw_item = getattr(item, "raw_item", None)

        if item_name == "tool_called":
            call_id = getattr(raw_item, "call_id", None) or getattr(raw_item, "id", "") or ""
            tool_name = getattr(raw_item, "name", "tool") or "tool"
            arguments = getattr(raw_item, "arguments", "") or "{}"  # JSON string; proxy parses
            tool_names_by_id[call_id] = tool_name
            return {
                "type": "run_item",
                "name": "tool_called",
                "item": {
                    "raw_item": {
                        "call_id": call_id,
                        "name": tool_name,
                        "arguments": arguments,
                    }
                },
            }

        if item_name == "tool_output":
            # output item's raw_item is a dict (function_call_output), not a model
            call_id = (
                raw_item.get("call_id", "")
                if isinstance(raw_item, dict)
                else getattr(raw_item, "call_id", "")
            )
            return {
                "type": "run_item",
                "name": "tool_output",
                "item": {
                    "raw_item": {
                        "call_id": call_id,
                        "name": tool_names_by_id.get(call_id, "tool"),
                    },
                    "output": getattr(item, "output", None),
                },
            }

        if item_name == "message_output_created":
            # Closes the open text block; content already streamed as deltas.
            return {
                "type": "run_item",
                "name": "message_output_created",
                "item": {"raw_item": {"content": []}},
            }

    # Everything else (agent_updated, handoffs, …) is dropped, like the translator.
    return None


class OpenAIAgentsAgent:
    """Contract agent for any OpenAI Agents SDK agent: drives a streamer and
    forwards each SDK event as a native event. ``select.py`` picks the streamer.
    """

    framework = "openai-agents"

    def __init__(self, streamer: Streamer) -> None:
        self._streamer = streamer

    async def run(
        self, *, input: dict[str, Any], context: dict[str, Any]
    ) -> AsyncIterator[dict]:
        # .env key wins; fall back to the per-run key from the Settings UI.
        api_key = os.getenv("OPENAI_API_KEY") or (
            (context or {}).get("credentials") or {}
        ).get("openai_api_key")
        if not api_key:
            yield protocol.error(
                "No OpenAI API key available. Set OPENAI_API_KEY in the "
                "agent-server .env, or add one in the HexaUI Settings UI."
            )
            return

        set_default_openai_key(api_key)

        tool_names_by_id: dict[str, str] = {}
        try:
            async for sdk_event in self._streamer(_agent_input(input)):
                native_event = _to_native_event(sdk_event, tool_names_by_id)
                if native_event is not None:
                    yield native_event
        except Exception as exception:  # noqa: BLE001 — degrade to a visible error event
            logger.exception("openai-agents run failed")
            yield protocol.error(f"agent failed: {exception}")
