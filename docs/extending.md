# Extending agent-ui

How to plug in your own widget types, theme tokens, and agent behavior.

## Custom widgets

Three things make a widget:

1. A **Zod schema** for its YAML shape.
2. A **React component** that receives the validated props.
3. A call to `defineWidget` to bind them.

Register the result in a `WidgetRegistry` and pass it to `<AgentUI>`.

```tsx
import { z } from "zod";
import {
  defineWidget,
  WidgetRegistry,
  builtinWidgets,
  AgentUI,
  type WidgetProps,
} from "agent-ui";

const BannerSchema = z.object({
  // Every widget schema needs these three discriminator/layout fields.
  name: z.string().min(1),
  type: z.literal("banner"),
  size: z.object({
    width: z.number().int().min(1).max(12),
    height: z.union([z.number().positive(), z.literal("auto")]),
  }),
  // …then your own fields.
  message: z.string(),
  tone: z.enum(["info", "warn", "error"]).default("info"),
});

type BannerProps = z.infer<typeof BannerSchema>;

function Banner({ props, dispatcher }: WidgetProps<BannerProps>) {
  return (
    <div className={`banner banner-${props.tone}`}>
      {props.message}
    </div>
  );
}

const banner = defineWidget({
  type: "banner",
  schema: BannerSchema,
  component: Banner,
});

const registry = new WidgetRegistry([...builtinWidgets, banner]);

export function App() {
  return <AgentUI config={yaml} dispatcher={dispatcher} widgets={registry} />;
}
```

Now `type: "banner"` works in YAML:

```yaml
- name: "hero"
  type: "banner"
  size: { width: 12, height: "auto" }
  message: "System maintenance tonight at 10pm."
  tone: "warn"
```

### Reusing the base shape

There's a shortcut for the three common fields:

```ts
import { WidgetBaseShape } from "agent-ui"; // optional export path; see "Importing internals" below

const BannerSchema = z.object({
  ...WidgetBaseShape,
  type: z.literal("banner"),
  message: z.string(),
});
```

That way `name`, `size`, `position`, and `tab` all come in for free — only
`type` and your new fields need to be declared.

### Replacing a built-in

If you want, for example, a richer markdown renderer than the bundled one:

```tsx
import ReactMarkdown from "react-markdown";
import { MarkdownWidgetSchema, defineWidget } from "agent-ui";

const richMarkdown = defineWidget({
  type: "markdown",     // same name → overrides the built-in
  schema: MarkdownWidgetSchema,
  component: ({ props }) => <ReactMarkdown>{props.content ?? ""}</ReactMarkdown>,
});

const registry = new WidgetRegistry([...builtinWidgets, richMarkdown]);
```

`WidgetRegistry.registerMany` keeps later registrations' definitions, so
passing your version after `builtinWidgets` wins.

### Widget defaults

```ts
defineWidget({
  type: "banner",
  schema: BannerSchema,
  defaults: { tone: "info" },   // merged into user YAML before validation
  component: Banner,
});
```

Defaults are shallow-merged on the *raw* YAML input before Zod validates it,
so any field the user sets still wins.

## Widget runtime hooks

Widgets receive `props` and `dispatcher`. For the rest, use hooks:

### `useWidgetData<T>(dataSource)`

Reads data from a `data_source` subtree in the widget's YAML. Transparently
uses `dispatcher.subscribe` when available (with `subscribe: true` in the
YAML) or falls back to a one-shot `invoke`.

```tsx
import { useWidgetData } from "agent-ui";

function MyWidget({ props }: WidgetProps<MySchema>) {
  const { data, loading, error } = useWidgetData<Row[]>(props.data_source);
  if (error) return <div>Error: {error.message}</div>;
  if (loading && !data) return <div>Loading…</div>;
  return <table>…</table>;
}
```

### `useAgentInbox<T>()`

Returns the latest `tool-call.payload` routed to **this** widget by name,
plus its history. Isolation-safe: a widget can only read its own inbox.

```tsx
import { useAgentInbox } from "agent-ui";

function ActivityFeed() {
  const { lastPayload, history } = useAgentInbox<Event>();
  // lastPayload is undefined until the first matching tool-call arrives.
  return <ul>{history.map((e, i) => <li key={i}>{e.kind}</li>)}</ul>;
}
```

A widget called `"feed"` receives an event like:

```ts
bridge.subscribeAgentOutput((emit) => {
  emit({ kind: "tool-call", widget: "feed", payload: { kind: "heartbeat" } });
});
```

If `widget` doesn't match any widget `name` in the plan, the event drops with
a diagnostic — no broadcast.

## Dispatcher patterns

### Routing to multiple backends

```ts
const dispatcher: ActionDispatcher = {
  async invoke(action, args) {
    if (action.startsWith("db.")) return callDb(action, args);
    if (action.startsWith("file.")) return callFiles(action, args);
    if (action.startsWith("ai.")) return callClaude(action, args);
    throw new Error(`unknown action: ${action}`);
  },
  has(action) {
    return /^(db|file|ai)\./.test(action);
  },
};
```

### Subscription (streaming data)

```ts
const dispatcher: ActionDispatcher = {
  async invoke(action, args) { /* ... */ },
  subscribe(action, args, onData) {
    const es = new EventSource(`/stream?action=${action}`);
    es.onmessage = (e) => onData(JSON.parse(e.data));
    return () => es.close();
  },
};
```

And in YAML:

```yaml
- name: "live-trades"
  type: "data-table"
  data_source:
    action: "market.trades"
    subscribe: true
  # ...
```

### Routing through Claude tool use

```ts
import Anthropic from "@anthropic-ai/sdk";
const client = new Anthropic();

const dispatcher: ActionDispatcher = {
  async invoke(action, args) {
    const res = await client.messages.create({
      model: "claude-opus-4-7",
      max_tokens: 1024,
      tools: [ /* your tool definitions, keyed by action name */ ],
      messages: [{ role: "user", content: `Run ${action} with ${JSON.stringify(args)}` }],
    });
    return extractToolResult(res);
  },
};
```

## AgentBridge patterns

### Connecting to a backend stream

```ts
const agent: AgentBridge = {
  async onUserSubmit(text) {
    await fetch("/api/chat", { method: "POST", body: JSON.stringify({ text }) });
  },
  subscribeAgentOutput(emit) {
    const es = new EventSource("/api/chat/stream");
    es.addEventListener("token",   (e) => emit({ kind: "token",   ...JSON.parse(e.data) }));
    es.addEventListener("message", (e) => emit({ kind: "message", ...JSON.parse(e.data) }));
    es.addEventListener("tool",    (e) => emit({ kind: "tool-call", ...JSON.parse(e.data) }));
    es.addEventListener("status",  (e) => emit({ kind: "status",  ...JSON.parse(e.data) }));
    return () => es.close();
  },
};
```

### Driving widgets from the agent

A typical flow: user asks a question, the agent calls a tool that returns
structured data, and you push that data into a specific widget:

```ts
// Server-side pseudocode
onToolResult("list_user_files", (result) => {
  emit({ kind: "tool-call", widget: "My Files", payload: result.files });
});
```

Client-side, the widget named `"My Files"` already reads `useAgentInbox`:

```tsx
function FileTypeWidget({ props }) {
  const { data } = useWidgetData(props.data_source);
  const { lastPayload } = useAgentInbox();
  const files = lastPayload ?? data ?? [];
  // agent updates win over the initial data-source fetch
}
```

(This is exactly what the built-in `file-type` widget does.)

## Theming

### Overriding tokens

```tsx
<AgentUI
  config={yaml}
  dispatcher={dispatcher}
  theme={{
    accent: "#8b5cf6",
    radius: "12px",
    fg: "#f4f4f5",
    bg: "#18181b",
  }}
/>
```

Available tokens: `bg`, `fg`, `accent`, `accentFg`, `border`, `radius`,
`space1`…`space5`, `font`. These compile to CSS custom properties on the
`<AgentUI>` root:

```css
--au-bg, --au-fg, --au-accent, --au-accent-fg, --au-border,
--au-radius, --au-space-1..5, --au-font,
--au-accent-hover, --au-accent-soft
```

### Per-widget styling

Every widget is wrapped in a `<div class="au-widget-host" data-widget-type="…">`,
so scoped CSS is easy:

```css
.au-widget-host[data-widget-type="chart"] {
  background: #fafafa;
  padding: 16px;
}
```

You can also target by name:

```css
.au-widget-host[data-widget-name="Traffic"] { /* ... */ }
```

## Working with the plan directly

The compile pipeline is exported for advanced use:

```ts
import { parseYaml, compilePlan, WidgetRegistry, builtinWidgets } from "agent-ui";

const parsed = parseYaml(yamlText);
if (!parsed.ok) return parsed.errors;

const plan = compilePlan(parsed.value.data, {
  registry: new WidgetRegistry(builtinWidgets),
  locate: parsed.value.locate,
});
if (!plan.ok) return plan.errors;

// plan.value is a RenderPlan: serializable, snapshot-testable.
console.log(plan.value.layout);
console.log(plan.value.widgets);
```

Good for:

- Snapshot tests that pin the shape of your layout.
- Prerendering / SSR where you want to inspect a plan before mounting.
- Building a visual editor on top (it's an explicit non-goal of v1, but the
  primitives are here).

## Testing

The library doesn't ship a test harness, but the pieces compose well:

```ts
import { compilePlan, WidgetRegistry, builtinWidgets } from "agent-ui";

test("dashboard has 2 widgets", () => {
  const config = {
    page: { title: "X", layout_type: "grid" },
    widgets: [
      { name: "a", type: "markdown", size: { width: 6, height: 100 }, content: "a" },
      { name: "b", type: "markdown", size: { width: 6, height: 100 }, content: "b" },
    ],
  };
  const plan = compilePlan(config, { registry: new WidgetRegistry(builtinWidgets) });
  expect(plan.ok).toBe(true);
  if (!plan.ok) return;
  expect(plan.value.widgets).toHaveLength(2);
});
```

Mock dispatchers are also straightforward:

```ts
const calls: [string, unknown][] = [];
const dispatcher: ActionDispatcher = {
  async invoke(a, args) { calls.push([a, args]); return null; },
};
```

## Importing internals

The public surface is deliberately narrow; a few internals are still exported
for power users:

- `parseYaml`, `compilePlan`, `resolve`, `normalize`, `resolveTheme`
- `WidgetRegistry`, `defineWidget`, `builtinWidgets`
- `ConfigSchema`, `BuiltinWidgetSchemas`, `buildConfigSchema`
- Hook surface: `useWidgetData`, `useAgentInbox`, `useAgentUIContext`
- Types: `RenderPlan`, `RenderPlanWidget`, `ResolvedConfig`, `Diagnostic`,
  `ThemeTokens`, and everything above.

If you need something else (e.g., `WidgetBaseShape`), file an issue — the
surface is intentionally held small.
