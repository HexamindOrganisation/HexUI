# UI Generator MCP — design

> Companion to [specs.md](./specs.md). Captures the architecture, the decisions
> taken with the author, and the value-add features folded in.

## 1. What this adds to HexUI

Today an agent's answer is text (the `ai-response` widget) plus whatever
**deterministic** widgets the developer wired into the agent's `ui.yaml`. This
part lets the **agent itself** compose a small, display-only UI at runtime —
tables, charts, markdown, metrics, headers/footers, containers — to illustrate
an answer, and have it rendered inside a dedicated `llm-ui-response` widget.

The agent authors that UI as a YAML sub-document (the same dialect as the host
`ui.yaml`, restricted to display elements), validates it through an **MCP
server**, and emits the validated YAML on the run stream. The widget compiles
and renders it.

## 2. Decisions (locked with the author)

| Decision | Choice | Rationale |
|---|---|---|
| MCP server language | **TypeScript** | Imports `custom-UI` directly, so `validate_ui` and the element catalog are the *same* schemas/pipeline that render. Zero drift. |
| Delivery to the widget | **Push via the run stream** | A new `native` event (`{"type":"ui",…}`) the proxy routes to the widget — reusing the existing `tool-call` → `useAgentInbox` inbox path. |
| Scope | **Full vertical slice** | Format + restricted registry + widget + delivery + MCP, end-to-end. |
| v1 elements | **table, markdown, metrics, page-header, page-footer, spacer** (reused) **+ chart + container** (new) | Diagrams/schemas (boxes+arrows) deferred — connector routing is high-cost. |

## 3. Core principle: reuse, never copy

`specs.md` floated copying parts of `custom-UI`. We do **not** copy. The compile
pipeline (`parseYaml → resolve → compilePlan`), the Ajv schema layer, the
diagnostics, and the grid/flex layout engine are all generic and already
exported from `agent-ui`. The new surface is small:

1. Two new display widgets (`chart`, `container`).
2. A **restricted registry** (`llmDisplayWidgets`) — display elements only, with
   `action` / `data_source` / `submit_action` **forbidden** in their schemas
   (the spec's "display only, no interactions").
3. The `llm-ui-response` host widget that recursively compiles + renders a
   sub-plan from a restricted YAML document.
4. The MCP server, which **introspects the restricted registry** to produce the
   element catalog and runs `validate_ui` through the real pipeline.

### Single source of truth

`list_elements` / `describe_element` / `list_rules` are **generated from the
JSON Schemas** in the restricted registry (augmented with `title`,
`description`, `examples` metadata), not hand-written docs. `validate_ui` runs
the same Ajv validators. The catalog and the validator therefore can never
disagree.

## 4. Runtime flow

```
agent run (LLM)
  └─ list_rules() / list_elements() / describe_element(name)   ┐ MCP (authoring aid)
  └─ validate_ui(yaml)  → {ok} | {errors:[LLM-friendly]}        ┘ reuses agent-ui pipeline
  └─ emit native event:  {"type":"ui","widget":"<name>","ui":"<yaml>"}
        → proxy native translator → tool_start/tool_end-style frame routed to <widget>
        → front-app AgentBridge → useAgentInbox(<widget>)
        → llm-ui-response widget compiles (restricted registry) + renders sub-plan
```

The widget inherits the host page theme (agent `main_color`); the agent cannot
override theme — visual consistency is a guardrail, not a setting.

## 5. MCP tool surface

| Tool | Returns |
|---|---|
| `list_elements()` | `[{name, summary}]` for every restricted element |
| `describe_element(name)` | full spec: fields (from schema), constraints, a ready-to-paste YAML skeleton, examples |
| `list_rules()` | the YAML envelope shape, layout/sizing rules, the display-only constraints, caps |
| `validate_ui(yaml)` | `{ok:true, summary}` (widget count, layout, warnings) **or** `{ok:false, errors:[{message, path, line, col, hint}]}` |

Value-adds folded in: per-element **examples** and a **YAML skeleton** in
`describe_element`; a **compiled-plan summary** on successful `validate_ui` so
the agent can self-check layout (e.g. grid overflow) before emitting; a
**version** stamp on the catalog so emitted UI stays compatible.

Transport: **stdio** (standard local MCP). The full JSON Schema and the rules
are also exposed as MCP **resources** for clients that prefer to fetch them.

## 6. Guardrails (surfaced by `list_rules`)

- Display only — no `action`, `data_source`, `submit_action`, `ai-chat-input`,
  `ai-response`, `tool-calls`, `form`, `button-group`.
- Max widget count per generated document (default 24).
- Grid is 12 columns; `size.width` 1–12; height px or `"auto"`.
- No theme block — theme is inherited from the host page.

## 7. Build order

1. `custom-UI`: `chart` + `container` widgets, `llm-ui-response` host widget,
   `llmDisplayWidgets` registry, catalog metadata, exports. *(foundation)*
2. `UI-generator-mcp`: TS MCP package depending on `agent-ui`.
3. `proxy-server` + `agent-server`: `ui` native event + reference agent.
4. `front-app`: register `llm-ui-response`; tests + docs.
