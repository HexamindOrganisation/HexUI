# agent-ui · documentation

- **[Getting started](./getting-started.md)** — install, `<AgentUI>` props, dispatcher, agent bridge, CLI.
- **[YAML reference](./yaml-reference.md)** — every field, every widget type, every layout, with examples.
- **[Extending](./extending.md)** — custom widgets, dispatcher patterns, theming, working with the plan directly.

## The one-minute overview

You write a YAML file that describes a page and a flat list of widgets:

```yaml
page:
  title: "My Dashboard"
  layout_type: "grid"
widgets:
  - name: "My Files"
    type: "file-type"
    size: { width: 6, height: 400 }
    data_source: { action: "list_user_files" }
    file_actions:
      - { name: "Open",   action: "open_file" }
      - { name: "Delete", action: "delete_file" }
```

You mount `<AgentUI>` with that YAML, an action **dispatcher** (how actions
map to real work) and optionally an **agent bridge** (how streaming agent
output flows into the UI):

```tsx
<AgentUI config={yamlText} dispatcher={dispatcher} agent={agent} />
```

The library parses, validates, compiles, and renders. Two always-on
containers — **user input** at the bottom and **agent response** near the
top — are added automatically. Everything else comes from your widgets list.

## Mental model

```
YAML → parse → validate → resolve → normalize → compile → RenderPlan → React
                    ↑            ↑
           (widget registry)  (dispatcher.has for warnings)
```

Stages 1–5 are pure. The `RenderPlan` is a serializable intermediate —
testable, diffable, and the boundary where hot reload would hook in. Stage 6
is the React tree. Stage 7 is runtime: the dispatcher handles actions, the
optional bridge streams tokens and `tool-call` events into targeted widgets.

## Example in this repo

Run the minimal example:

```bash
npm install
npm run example
```

Opens http://localhost:5173/ with three widgets driven by a mock dispatcher
and a mock agent that echoes a greeting.
