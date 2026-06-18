# UI Generator MCP

An MCP server that lets an agent author a small, **display-only** HexUI document
at runtime, which the front-app renders inside an `llm-ui-response` widget —
turning a wall of text into tables, charts, metrics and structured layout.

See [DESIGN.md](./DESIGN.md) for the architecture and [specs.md](./specs.md) for
the original concept.

## Tools

| Tool | Purpose |
|---|---|
| `list_rules()` | The YAML envelope (`page` + `widgets`), layout/sizing rules, the display-only constraints, available elements, and the per-document cap. |
| `list_elements()` | One-line summary of every available element. |
| `describe_element(element_name)` | Full field spec (type, required, constraints) + worked examples + a ready-to-paste YAML snippet + the raw JSON Schema. |
| `validate_ui(yaml_text)` | `{ok:true, summary}` when it will render, or `{ok:false, errors}` with precise, fixable messages (code + path + line). |

A `uigen://rules` **resource** mirrors `list_rules()` for clients that prefer
resources.

## Authoring loop

```
list_rules() → list_elements() → describe_element(…) → write YAML
   → validate_ui(yaml)  → (fix → validate_ui)*  → emit the UI on the run stream
```

Once `validate_ui` returns `{ok:true}`, the agent emits the YAML as a `ui`
native event (`{"type":"ui","widget":"<name>","ui":"<yaml>"}`) on its run
stream. The proxy routes it to the named `llm-ui-response` widget, which
compiles and renders it (inheriting the agent's theme).

## Why it can't drift

All catalog and validation logic comes from the `agent-ui/llm` entrypoint —
the **same package and schemas** the widget renders with. `validate_ui` uses the
real compile pipeline; `describe_element` reads the real (restricted) JSON
Schemas. The server can never describe or accept UI the widget would reject.

The element set is **display only**: interaction fields (`data_source`,
`action`, `submit_action`, `refresh`) are stripped from the schemas, and
interactive/shell widgets (`form`, `button-group`, `ai-*`, `tool-calls`) are not
offered. There is no theme — generated UI inherits the host agent's color/mode.

## Run

```bash
npm install
npm run build
npm start            # stdio transport
```

Register it with an MCP-capable agent (stdio). Example client config:

```json
{
  "mcpServers": {
    "ui-generator": { "command": "node", "args": ["dist/server.js"] }
  }
}
```

## Develop

```bash
npm run dev          # tsx, no build step
npm test             # vitest
```
