"""Canvas — the reference agent for *agent-authored UI*, as a real MCP client.

Most reference agents answer in text (+ a tool call). Canvas instead composes a
small, display-only UI document and emits it with a ``ui`` event, which the
proxy routes to the ``answer-ui`` (``llm-ui-response``) widget in
``ui/canvas.yaml``. The widget compiles + renders it inheriting the agent theme.

Two paths:

* **Real inference via MCP** (``AGENT_ENABLE_LLM=1`` + ``OPENAI_API_KEY``, and the
  ``ui-generator`` MCP server reachable): Canvas launches the MCP server over
  stdio, exposes its tools (``list_rules`` / ``list_elements`` /
  ``describe_element`` / ``validate_ui``) to a real OpenAI model, and runs the
  authoring loop. The model learns the rules + elements *from the MCP*, designs
  a UI for a fake dataset, and validates it with ``validate_ui`` until it passes.
  The document Canvas emits is exactly the YAML that ``validate_ui`` accepted —
  no embedded catalog, no drift, real validation.
* **Fallback** (LLM off / no key / MCP or SDK unavailable / loop fails): a fixed,
  illustrative document so the slice is demonstrable with no model or keys.

The MCP server command defaults to ``node <repo>/UI-generator-mcp/dist/server.js``
(build it with ``npm run build`` in that package). Override with
``AGENT_UIGEN_MCP_SERVER`` (path to ``server.js``) and ``AGENT_UIGEN_NODE``.
"""

from __future__ import annotations

import asyncio
import json
import logging
import os
from collections.abc import AsyncIterator
from pathlib import Path
from typing import Any

from .. import protocol

logger = logging.getLogger("agent_server.canvas")

_CHUNK_DELAY = 0.12
_MAX_TOOL_TURNS = 10

# Fake data the model gets to visualize — a small but rich "business snapshot".
_FAKE_DATA: dict[str, Any] = {
    "kpis": {"revenue_usd": 3_900_000, "customers": 1_284, "nps": 47, "churn_pct": 3.2},
    "revenue_by_region": [
        {"region": "EMEA", "revenue_k": 1200, "qoq_pct": 4},
        {"region": "AMER", "revenue_k": 1800, "qoq_pct": 9},
        {"region": "APAC", "revenue_k": 900, "qoq_pct": -2},
    ],
    "monthly_signups": [
        {"month": "Jan", "signups": 180},
        {"month": "Feb", "signups": 210},
        {"month": "Mar", "signups": 265},
        {"month": "Apr", "signups": 240},
        {"month": "May", "signups": 320},
        {"month": "Jun", "signups": 390},
    ],
    "top_products": [
        {"product": "Atlas", "mrr_k": 220, "seats": 1400},
        {"product": "Probe", "mrr_k": 140, "seats": 980},
        {"product": "Orbit", "mrr_k": 95, "seats": 610},
    ],
}

# Short prompt: the rules + element specs come from the MCP tools at runtime, so
# we do NOT embed them here (that's the whole point of being an MCP client).
_SYSTEM_PROMPT = """\
You design a small, display-only UI to illustrate data, for the HexUI
`llm-ui-response` widget. You have MCP tools that define everything you need:

  list_rules()              the document shape, layout/sizing rules, limits
  list_elements()           the available elements
  describe_element(name)    full field spec + examples for one element
  validate_ui(yaml_text)    validate your YAML; returns {ok:true,...} or errors

Process:
  1. Call list_rules and list_elements to learn what's available.
  2. describe_element for the elements you plan to use.
  3. Author a YAML document that visualizes the provided data and answers the
     user's request (a header, one or two charts, a table, and a short container
     takeaway is a good shape).
  4. Call validate_ui. If it returns errors, fix them and call validate_ui again.
  5. Once validate_ui returns ok, you are done — do NOT repeat the YAML in a
     final message. The accepted document is taken from your successful
     validate_ui call.

Use only the provided data. Do not set any theme or colors — the host supplies
them.
"""

# Validated fallback document (used when the model/MCP path is unavailable).
_DEMO_UI = """\
page:
  layout_type: grid
widgets:
  - name: header
    type: page-header
    size: { width: 12, height: auto }
    title: Quarterly revenue
    subtitle: Illustrative figures by region

  - name: chart
    type: chart
    size: { width: 7, height: 280 }
    chart_type: bar
    title: Revenue by region
    x_key: region
    series:
      - { key: revenue, label: Revenue }
    data:
      - { region: EMEA, revenue: 1200 }
      - { region: AMER, revenue: 1800 }
      - { region: APAC, revenue: 900 }

  - name: takeaway
    type: container
    size: { width: 5, height: 280 }
    tone: accent
    title: Takeaway
    body: "AMER leads at $1.8M; APAC trails and is the clearest growth opportunity."

  - name: table
    type: table
    size: { width: 12, height: auto }
    caption: Detail
    content: |
      Region,Revenue,QoQ
      EMEA,1200,+4%
      AMER,1800,+9%
      APAC,900,-2%
"""


def _mcp_server_path() -> str:
    """Path to the ui-generator MCP server's built entrypoint."""
    override = os.getenv("AGENT_UIGEN_MCP_SERVER")
    if override:
        return override
    # canvas.py → agents → agent_server → src → agent-server → demo → <repo root>
    repo_root = Path(__file__).resolve().parents[5]
    return str(repo_root / "UI-generator-mcp" / "dist" / "server.js")


def _strip_fences(text: str) -> str:
    t = text.strip()
    if t.startswith("```"):
        lines = t.splitlines()[1:]
        if lines and lines[-1].strip().startswith("```"):
            lines = lines[:-1]
        t = "\n".join(lines).strip()
    return t


def _looks_like_ui(text: str) -> bool:
    return "page:" in text and "widgets:" in text


def _tool_result_text(result: Any) -> str:
    """Flatten an MCP CallToolResult's content blocks into text."""
    parts: list[str] = []
    for block in getattr(result, "content", []) or []:
        text = getattr(block, "text", None)
        if text is not None:
            parts.append(text)
    return "\n".join(parts) if parts else "{}"


def _mcp_tools_to_openai(tools: Any) -> list[dict]:
    """Convert MCP tool definitions to OpenAI function-tool schemas."""
    out: list[dict] = []
    for t in tools.tools:
        params = dict(t.inputSchema or {"type": "object", "properties": {}})
        params.pop("$schema", None)  # OpenAI doesn't want the meta-schema key
        out.append(
            {
                "type": "function",
                "function": {
                    "name": t.name,
                    "description": t.description or "",
                    "parameters": params,
                },
            }
        )
    return out


async def _generate_ui_via_mcp(query: str, api_key: str | None) -> tuple[str, dict | None]:
    """Drive an OpenAI tool-calling loop against the ui-generator MCP server.

    Returns (validated_yaml, summary). Raises on any failure so the caller can
    fall back to the static document.
    """
    from mcp import ClientSession, StdioServerParameters
    from mcp.client.stdio import stdio_client
    from openai import AsyncOpenAI

    server_path = _mcp_server_path()
    if not Path(server_path).exists():
        raise FileNotFoundError(
            f"ui-generator MCP server not found at {server_path} "
            "(build it: cd UI-generator-mcp && npm run build)"
        )

    node = os.getenv("AGENT_UIGEN_NODE", "node")
    model = os.getenv("AGENT_CANVAS_MODEL", "gpt-4o-mini")
    server = StdioServerParameters(command=node, args=[server_path])

    client = AsyncOpenAI(api_key=api_key)
    user_msg = (
        f"User request: {query or 'Summarize the data.'}\n\n"
        f"Data (JSON):\n{json.dumps(_FAKE_DATA, indent=2)}\n\n"
        "Design and validate a display-only UI that answers the request using "
        "this data."
    )

    async with stdio_client(server) as (read, write):
        async with ClientSession(read, write) as session:
            await session.initialize()
            tools = await session.list_tools()
            openai_tools = _mcp_tools_to_openai(tools)

            messages: list[dict] = [
                {"role": "system", "content": _SYSTEM_PROMPT},
                {"role": "user", "content": user_msg},
            ]

            validated_yaml: str | None = None
            validated_summary: dict | None = None

            for _ in range(_MAX_TOOL_TURNS):
                resp = await client.chat.completions.create(
                    model=model,
                    messages=messages,
                    tools=openai_tools,
                    tool_choice="auto",
                    temperature=0.2,
                )
                msg = resp.choices[0].message
                tool_calls = msg.tool_calls or []

                # Record the assistant turn (preserving tool_calls for the API).
                messages.append(
                    {
                        "role": "assistant",
                        "content": msg.content or "",
                        **(
                            {
                                "tool_calls": [
                                    {
                                        "id": tc.id,
                                        "type": "function",
                                        "function": {
                                            "name": tc.function.name,
                                            "arguments": tc.function.arguments,
                                        },
                                    }
                                    for tc in tool_calls
                                ]
                            }
                            if tool_calls
                            else {}
                        ),
                    }
                )

                if not tool_calls:
                    break  # model is done talking

                for tc in tool_calls:
                    name = tc.function.name
                    try:
                        args = json.loads(tc.function.arguments or "{}")
                    except json.JSONDecodeError:
                        args = {}
                    try:
                        result = await session.call_tool(name, args)
                        content = _tool_result_text(result)
                    except Exception as e:  # noqa: BLE001 — feed the error back to the model
                        content = json.dumps({"error": str(e)})

                    # Capture the document that validates cleanly.
                    if name == "validate_ui":
                        try:
                            parsed = json.loads(content)
                            if parsed.get("ok"):
                                validated_yaml = args.get("yaml_text")
                                validated_summary = parsed.get("summary")
                        except json.JSONDecodeError:
                            pass

                    messages.append(
                        {"role": "tool", "tool_call_id": tc.id, "content": content}
                    )

                if validated_yaml:
                    break

            if validated_yaml and _looks_like_ui(validated_yaml):
                return validated_yaml, validated_summary
            raise RuntimeError("model did not produce a validated UI document")


class CanvasAgent:
    framework = "native"

    async def run(
        self, *, input: dict[str, Any], context: dict[str, Any]
    ) -> AsyncIterator[dict]:
        from ..config import get_settings

        query = protocol.last_user_text(input)
        api_key = os.getenv("OPENAI_API_KEY")
        use_llm = get_settings().enable_llm and bool(api_key)

        intro = (
            "Designing a view of the data with the UI tools…"
            if use_llm
            else "Here's a quick visual summary of the data."
        )
        for word in intro.split(" "):
            await asyncio.sleep(_CHUNK_DELAY)
            yield protocol.text(word + " ")

        ui_text = _DEMO_UI
        summary: dict | None = None
        if use_llm:
            try:
                ui_text, summary = await _generate_ui_via_mcp(query, api_key)
            except Exception as e:  # noqa: BLE001 — degrade to the static demo UI
                logger.warning(
                    "canvas: MCP UI generation failed (%s); using fallback", e
                )

        yield protocol.ui("answer-ui", ui_text)

        if summary:
            note = f" Rendered {summary.get('widget_count', '?')} elements."
            for word in note.split(" "):
                await asyncio.sleep(_CHUNK_DELAY)
                yield protocol.text(word + " ")
