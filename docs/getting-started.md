# Getting started

`agent-ui` renders a React UI from a YAML file. You write the layout + widgets
in YAML, the library loads it, validates it, and mounts a `<AgentUI>`
component.

## Install

```bash
npm install agent-ui react react-dom
```

You also need a bundler that can read YAML as text. With Vite the idiomatic
way is `import configText from "./ui.yaml?raw"`. With other bundlers, read the
YAML however you prefer and pass the string (or a parsed object) to `<AgentUI>`.

## Minimum working example

```tsx
import { AgentUI, type ActionDispatcher } from "agent-ui";
import "agent-ui/style.css";

const yaml = `
page:
  title: "Hello"
  layout_type: "grid"
widgets:
  - name: "greeting"
    type: "markdown"
    size: { width: 12, height: "auto" }
    content: "# Hello world\\n\\nFrom **agent-ui**."
`;

const dispatcher: ActionDispatcher = {
  async invoke() { return null; },
};

export default function App() {
  return <AgentUI config={yaml} dispatcher={dispatcher} />;
}
```

That renders a page titled "Hello" with one markdown widget, plus the two
always-on containers: a user-input box at the bottom and an agent-response
area above the main grid.

## The `<AgentUI>` component

```ts
interface AgentUIProps {
  config: string | object | URL;     // raw YAML, already-parsed object, or fetchable
  dispatcher: ActionDispatcher;      // required — see docs/getting-started.md#dispatcher
  widgets?: WidgetRegistry | AnyWidgetDefinition[];  // extend built-in widgets
  agent?: AgentBridge;               // optional — for streaming agent output
  theme?: Partial<ThemeTokens>;      // override theme tokens
  diagnostics?: "overlay" | "console" | "silent";   // default: "overlay"
  onError?: (diagnostics: Diagnostic[]) => void;
}
```

- If `config` is a **string with a newline** or with `something:`, it's treated
  as raw YAML. Any other string is treated as a URL to fetch.
- If `config` is an **object**, it bypasses YAML parsing entirely. Useful for
  dynamically-generated configs and tests.
- If `config` is a **`URL`**, the library fetches and parses it.

## Dispatcher

The dispatcher is the only way widgets talk to your application. Every
`action:` string in the YAML is a name you control — a widget calls
`dispatcher.invoke("the-name", args)` and you decide what that means.

```ts
interface ActionDispatcher {
  invoke(action: string, args?: unknown): Promise<unknown>;
  subscribe?(action: string, args: unknown, onData: (d: unknown) => void): () => void;
  has?(action: string): boolean;
}
```

Minimal example:

```ts
const dispatcher: ActionDispatcher = {
  async invoke(action, args) {
    switch (action) {
      case "list_files": return await fetch("/api/files").then(r => r.json());
      case "save":       return await fetch("/api/save", { method: "POST", body: JSON.stringify(args) });
      default:           return null;
    }
  },
  // Optional: allows the resolver to warn about YAML actions you haven't wired up.
  has(action) {
    return ["list_files", "save"].includes(action);
  },
};
```

**When each method is called:**

| Method | When |
|---|---|
| `invoke` | Widget mounts with `data_source`; form submits; file-row action clicked; menu item clicked |
| `subscribe` | Widget has `data_source: { ..., subscribe: true }` — for streaming data |
| `has` | Only at resolve time, to emit warnings for unknown actions |

## AgentBridge (optional)

Opt in when your UI needs to show streaming output from an AI agent.

```ts
interface AgentBridge {
  onUserSubmit: (text: string) => void | Promise<void>;
  subscribeAgentOutput: (cb: (event: AgentEvent) => void) => () => void;
}

type AgentEvent =
  | { kind: "token";     text: string; messageId?: string }
  | { kind: "message";   role: "assistant" | "system"; content: string; messageId?: string }
  | { kind: "status";    state: "idle" | "thinking" | "responding" }
  | { kind: "tool-call"; widget: string; payload: unknown }
  | { kind: "error";     message: string };
```

Example that mocks a streaming turn:

```ts
const agent: AgentBridge = {
  onUserSubmit(text) {
    // Kick off a Claude call, for instance.
    console.log("User said:", text);
  },
  subscribeAgentOutput(emit) {
    // Simulate a few streaming tokens then a completed message.
    const id = "m1";
    emit({ kind: "status", state: "responding" });
    const chunks = ["Hello ", "there ", "— let me think."];
    const timers = chunks.map((text, i) =>
      setTimeout(() => emit({ kind: "token", text, messageId: id }), 200 * (i + 1))
    );
    const final = setTimeout(() => {
      emit({ kind: "message", role: "assistant", content: "Hello there — let me think.", messageId: id });
      emit({ kind: "status", state: "idle" });
    }, 200 * (chunks.length + 1));
    return () => {
      timers.forEach(clearTimeout);
      clearTimeout(final);
    };
  },
};
```

### Event routing

| Event kind | Goes to |
|---|---|
| `token` | Agent-response container, coalesced by `messageId` into one growing bubble |
| `message` | Agent-response container (finalized bubble; replaces a partial of the same `messageId`) |
| `status` | Agent-response container ("…thinking" / "…responding" indicator) |
| `tool-call` | **Exactly one** widget: the one whose `name === event.widget`. No broadcast. |
| `error` | Agent-response container **and** the diagnostics overlay |

`tool-call.widget` is **required**. Events with no widget name, or a name that
doesn't match any widget in the plan, are dropped with a dev-mode warning.
This is how widget isolation is preserved.

### No bridge? Fallbacks

- **User-input container**: if `dispatcher.has("user-submit")` is true, the
  input falls back to calling `dispatcher.invoke("user-submit", { text })` on
  submit. Otherwise it renders inert with a dev warning.
- **Agent-response container**: renders an empty placeholder.
- **tool-call** events: unreachable. Widgets that want to be updated by an
  agent simply won't be, but they can still read data via `data_source`.

## Diagnostics

The library validates everything before rendering. Errors don't crash the
host — they surface in one of three ways, controlled by the `diagnostics`
prop:

- `"overlay"` *(default)*: dismissible floating panel in the corner with
  line-numbered errors.
- `"console"`: log to `console.error` / `console.warn`, no UI.
- `"silent"`: suppress all reporting — your `onError` callback is your only
  signal.

Diagnostics include YAML source `line` and `col` when available, so clicking
through to the right spot in your config is usually trivial.

## CLI

The library ships a bin:

```bash
npx agent-ui emit-schema > agent-ui.schema.json
```

Emits a JSON Schema for your YAML. Add this to the top of your YAML for full
autocomplete in VS Code:

```yaml
# yaml-language-server: $schema=./agent-ui.schema.json
```

```bash
npx agent-ui validate ./ui.yaml
```

Validates a config and exits non-zero on errors. Good for CI.

## Next steps

- **[YAML reference](./yaml-reference.md)** — every field and widget type documented.
- **[Extending](./extending.md)** — custom widgets, custom dispatchers, hooks.
