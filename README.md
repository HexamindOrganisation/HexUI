# agent-ui

A React + TypeScript library that turns a YAML config into a running AI agent UI.

**Full docs:** [docs/README.md](./docs/README.md) · [Getting started](./docs/getting-started.md) · [YAML reference](./docs/yaml-reference.md) · [Extending](./docs/extending.md)

## Install

```bash
npm install agent-ui
```

## Quick start

```tsx
import { AgentUI, type ActionDispatcher } from "agent-ui";
import "agent-ui/style.css";

const dispatcher: ActionDispatcher = {
  async invoke(action, args) {
    // Route to your agent tools, HTTP, or local functions
    if (action === "list_user_files") return await fetch("/api/files").then(r => r.json());
    return null;
  },
};

const config = `
page:
  title: "My Dashboard"
  layout_type: "grid"

widgets:
  - name: "My Files"
    type: "file-type"
    size: { width: 6, height: 400 }
    data_source:
      action: "list_user_files"
    file_actions:
      - name: "Open"
        action: "open_file"
`;

export default function App() {
  return <AgentUI config={config} dispatcher={dispatcher} />;
}
```

## Authoring configs in VS Code

```bash
npx agent-ui emit-schema > agent-ui.schema.json
```

Then at the top of your YAML:

```yaml
# yaml-language-server: $schema=./agent-ui.schema.json
```

## CLI

```bash
npx agent-ui validate ./ui.yaml   # exits non-zero on errors
npx agent-ui emit-schema          # prints JSON Schema
```

## Architecture

1. **parse** YAML → data + source map
2. **validate** with Zod discriminated unions
3. **resolve** against the widget registry + dispatcher
4. **normalize** defaults
5. **compile** layout math → `RenderPlan`
6. **render** as React
7. **runtime** dispatches actions, subscribes to agent streams

Stages 1–5 are pure and return `Result<T, Diagnostic[]>`. The `RenderPlan` is
serializable and snapshot-testable.

## Built-in widgets

| `type`            | purpose                             |
|-------------------|-------------------------------------|
| `markdown`        | Rendered markdown (static or live)  |
| `file-type`       | File list with per-row action menu  |
| `to-do-list-type` | Checkable tasks                     |
| `data-table`      | Tabular data with sort/filter       |
| `form`            | Input form → submit action          |
| `key-value`       | Labeled facts / status panel        |
| `chart`           | Line/bar SVG chart                  |

## Custom widgets

```tsx
import { defineWidget, WidgetRegistry, builtinWidgets } from "agent-ui";
import { z } from "zod";

const banner = defineWidget({
  type: "banner",
  schema: z.object({
    name: z.string(),
    type: z.literal("banner"),
    size: z.object({ width: z.number(), height: z.union([z.number(), z.literal("auto")]) }),
    message: z.string(),
  }),
  component: ({ props }) => <div className="banner">{props.message}</div>,
});

const widgets = new WidgetRegistry([...builtinWidgets, banner]);

<AgentUI config={cfg} dispatcher={d} widgets={widgets} />
```

## Agent streaming (optional)

```ts
import type { AgentBridge } from "agent-ui";

const agent: AgentBridge = {
  async onUserSubmit(text) { /* kick off a turn */ },
  subscribeAgentOutput(cb) {
    // emit { kind: "token", text } | { kind: "message", role, content } |
    //      { kind: "status", state } | { kind: "tool-call", widget, payload } |
    //      { kind: "error", message }
    return () => { /* unsubscribe */ };
  },
};

<AgentUI config={cfg} dispatcher={d} agent={agent} />
```

`tool-call` events must include a `widget` field. They route to exactly that
widget — no broadcast, no fallback. Widgets read their inbox via:

```ts
const { lastPayload, history } = useAgentInbox<MyShape>();
```

## License

MIT
