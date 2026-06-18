"""Canvas — the reference agent for *agent-authored UI*.

Most reference agents answer in text (+ a tool call). Canvas additionally
composes a small, display-only UI document and emits it with a ``ui`` event,
which the proxy routes to the ``answer-ui`` (``llm-ui-response``) widget in
``ui/canvas.yaml``. The widget compiles + renders it inheriting the agent theme.

In a real backend the UI string is produced by the model and validated through
the UI-generator MCP (``validate_ui``) before being emitted. Here we emit a
fixed, illustrative document so the slice is demonstrable with no model/keys.
"""

from __future__ import annotations

import asyncio
from collections.abc import AsyncIterator
from typing import Any

from .. import protocol

_CHUNK_DELAY = 0.12

# A validated, display-only UI document (the same dialect custom-UI renders,
# restricted to display elements). Authored once; a real agent would generate
# and validate this per turn via the UI-generator MCP.
_DEMO_UI = """
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
""".strip()


class CanvasAgent:
    framework = "native"

    async def run(
        self, *, input: dict[str, Any], context: dict[str, Any]
    ) -> AsyncIterator[dict]:
        query = protocol.last_user_text(input)

        intro = "Here's a quick visual summary of the quarterly numbers."
        for word in intro.split(" "):
            await asyncio.sleep(_CHUNK_DELAY)
            yield protocol.text(word + " ")

        # Emit the generated UI to the `answer-ui` widget. (A real agent would
        # build `_DEMO_UI` from `query` and validate it via the MCP first.)
        await asyncio.sleep(_CHUNK_DELAY)
        yield protocol.ui("answer-ui", _DEMO_UI)
