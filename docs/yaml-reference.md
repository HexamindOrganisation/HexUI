# YAML reference

Every field the library understands, with examples. For autocomplete in VS
Code, emit a JSON Schema once and link it at the top of your YAML:

```bash
npx agent-ui emit-schema > agent-ui.schema.json
```

```yaml
# yaml-language-server: $schema=./agent-ui.schema.json
```

## Top-level shape

A config has exactly two top-level keys:

```yaml
page:       # page-level settings (required)
  ...
widgets:    # array of widgets (optional, defaults to [])
  - ...
```

## `page`

```yaml
page:
  title: "My Dashboard"          # required, non-empty
  icon: "assets/app.svg"         # optional; URL or data URI
  main_color: "#2E86DE"          # optional; hex color (#RGB, #RRGGBB, or #RRGGBBAA)
  layout_type: "grid"            # required; one of: grid | flex | sidebar | tabs
  theme:                         # optional; overrides derived palette
    background: "#ffffff"
    foreground: "#1a1a1a"
    accent: "#2E86DE"
  main_menu:                     # optional; list of menu items
    - name: "Home"
      icon: "assets/home.svg"    # optional
      action: "navigate_home"    # required
    - name: "Logout"
      action: "logout_user"
```

**`layout_type`** determines how the `widgets` array is arranged — see the
[Layouts](#layouts) section.

**`main_color`** is used to derive a palette (hover, soft tint, contrast
foreground). `theme` overrides win over `main_color`-derived tokens. Both are
compiled into CSS custom properties on the `<AgentUI>` root.

**`main_menu`** renders as a horizontal bar in the header for `grid`, `flex`,
and `tabs` layouts, and as a vertical nav in the `sidebar` layout. Each
click calls `dispatcher.invoke(item.action)`.

## `widgets`

A flat array (no nesting in v1). Each item has some fields every widget
shares, plus type-specific fields.

### Common widget fields

```yaml
- name: "My Files"               # required, unique, not "user-input" or "agent-response"
  type: "file-type"              # required; discriminator — see built-in types below
  position:                      # optional; hints for the grid packer
    horizontal: "left"           #   left | right | center
    vertical: "high"             #   high | middle | low
  size:                          # required
    width: 6                     #   1..12 (grid columns; ignored by flex/tabs)
    height: 400                  #   pixels, or "auto"
  tab: "Files"                   # optional; only used by layout_type: tabs
  # ...type-specific fields
```

**`name`** is how agents address the widget in `tool-call` events and how
`useAgentInbox()` scopes to a widget. It must be globally unique. The names
`user-input` and `agent-response` are reserved for the always-on containers.

**`position`** is only meaningful for `layout_type: grid` (and `sidebar`,
which packs widgets as a grid). The packer sorts widgets by `vertical` and
biases column choice by `horizontal`.

**`size.width`** is a **grid column count (1–12)**, not pixels. For `flex` it
becomes a percentage of the container. `sidebar` uses the same grid rules
inside the main pane. `tabs` ignores width inside each tab's grid.

**`size.height`** is pixels or the literal string `"auto"`.

## Layouts

### `layout_type: grid`

The default-feel layout: a 12-column CSS grid. Widgets are packed top-down,
left-to-right, honoring `position` biases. The packer detects overflows
(e.g. `width: 14`) and emits a diagnostic.

```yaml
page: { title: "Grid", layout_type: "grid" }
widgets:
  - name: "A"
    type: "markdown"
    position: { horizontal: "left", vertical: "high" }
    size: { width: 6, height: 200 }
    content: "## Left"
  - name: "B"
    type: "markdown"
    position: { horizontal: "right", vertical: "high" }
    size: { width: 6, height: 200 }
    content: "## Right"
```

### `layout_type: flex`

Stacks widgets in config order. Ignores `position`. `size.width` becomes
a percentage of the container — `width: 6` → 50%, `width: 12` → 100%.
Widgets wrap if they don't fit.

### `layout_type: sidebar`

Left nav from `page.main_menu`, main pane packed as a grid. Use this for
app-shell dashboards with persistent navigation.

### `layout_type: tabs`

Groups widgets by their `tab` field — widgets that share a tab value go into
the same tab panel. Widgets without a tab land in a default tab labeled
"Main". The user-input and agent-response containers stay persistent above
and below the tab bar.

```yaml
page: { title: "Tabs", layout_type: "tabs" }
widgets:
  - name: "summary"
    type: "markdown"
    tab: "Overview"
    size: { width: 12, height: "auto" }
    content: "## Overview"
  - name: "chart"
    type: "chart"
    tab: "Metrics"
    size: { width: 12, height: 300 }
    chart_type: "line"
    data_source: { action: "get_metrics" }
    x_key: "date"
    y_keys: ["count"]
```

## Built-in widget types

### `markdown` — rendered markdown

```yaml
- name: "readme"
  type: "markdown"
  size: { width: 12, height: "auto" }
  content: |
    # Title
    Some **rich** text.
  data_source:                   # optional; if set, overrides `content` when data arrives
    action: "load_readme"
```

Supports headings, bold, italic, inline code, fenced code blocks, ordered
and unordered lists, links. Either `content` (static) or `data_source`
(live). If both are set, `data_source` wins once its data arrives. If an
agent tool-call arrives, its payload wins over both.

### `file-type` — list with per-row action menu

```yaml
- name: "My Files"
  type: "file-type"
  size: { width: 6, height: 400 }
  data_source:                   # required; returns FileItem[]
    action: "list_user_files"
  file_actions:                  # optional; per-row ⋯ menu items
    - icon: "assets/open.svg"    # optional
      name: "Open"
      action: "open_file"
    - name: "Delete"
      action: "delete_file"
  empty_text: "No files yet"     # optional
```

The `data_source` action should return an array of objects with at least
`{ name: string }`; `id`, `size`, and `modified` are used if present. Clicking
a row action calls `dispatcher.invoke(action, { file })`.

### `to-do-list-type` — checkable tasks

```yaml
- name: "My Tasks"
  type: "to-do-list-type"
  size: { width: 6, height: 400 }
  items:                         # optional; static seed list
    - { id: "t1", text: "Ship docs", done: false }
  data_source:                   # optional; live list (overrides `items`)
    action: "list_tasks"
  on_toggle: "toggle_task"       # optional; dispatched with { id, done }
  on_add: "add_task"             # optional; dispatched with { text } — also shows the add form
  on_remove: "remove_task"       # optional; dispatched with { id }
```

If `on_add` is set, an input + "Add" button appears. If not, the list is
read-only + toggle-only.

### `data-table` — sortable, filterable, paginated table

```yaml
- name: "Orders"
  type: "data-table"
  size: { width: 12, height: "auto" }
  data_source:                   # required; returns Row[]
    action: "list_orders"
  columns:                       # required; at least one
    - { key: "id",     label: "#",        sortable: true }
    - { key: "name",   label: "Customer", sortable: true, filterable: true }
    - { key: "total",  label: "Total",    sortable: true, width: "120px" }
    - { key: "status", label: "Status",   filterable: true }
  page_size: 25                  # optional; default 50
```

Columns with `filterable: true` participate in a single top-of-table filter
box. `sortable: true` makes the header clickable.

### `form` — input form → submit action

```yaml
- name: "NewTask"
  type: "form"
  size: { width: 6, height: "auto" }
  submit_action: "create_task"   # required; dispatched with all field values
  submit_label: "Create"         # optional; default "Submit"
  fields:                        # required; at least one
    - field_type: "text"
      name: "title"
      label: "Title"
      placeholder: "Buy milk"
      required: true
    - field_type: "textarea"
      name: "notes"
      label: "Notes"
      rows: 4
    - field_type: "select"
      name: "priority"
      label: "Priority"
      options:
        - { value: "low",  label: "Low" }
        - { value: "mid",  label: "Medium" }
        - { value: "high", label: "High" }
      default: "mid"
    - field_type: "number"
      name: "points"
      min: 0
      max: 13
      default: 3
    - field_type: "checkbox"
      name: "urgent"
      label: "Urgent"
      default: false
```

Field types: `text`, `textarea`, `number`, `select`, `checkbox`. On submit
the values are sent as the `args` to `dispatcher.invoke(submit_action, values)`.

### `key-value` — labeled facts / status panel

```yaml
- name: "Status"
  type: "key-value"
  size: { width: 4, height: "auto" }
  items:                         # optional; static list
    - { key: "version", value: "1.0.0", label: "Version" }
    - { key: "uptime",  value: "3h 12m" }
  data_source:                   # optional; returns either Item[] or a plain object
    action: "get_status"
```

If `data_source` returns a plain object like `{ version: "1.0.0", uptime: "3h" }`
it's converted to rows automatically.

### `chart` — inline SVG line/bar chart

```yaml
- name: "Traffic"
  type: "chart"
  size: { width: 12, height: 300 }
  chart_type: "line"             # required; "line" or "bar"
  data_source:                   # required; returns Row[]
    action: "get_traffic"
  x_key: "date"                  # required; which row field is the x-axis
  y_keys: ["visits", "sessions"] # required; one or more; multi-series rendered with a legend
```

Dependency-free — uses inline SVG. If you want richer charts, register your
own widget type (e.g. backed by recharts) and reuse the `"chart"` type name
to override, or pick a different name.

## Reserved container names

The names `user-input` and `agent-response` are the two always-on containers
(rendered by `<AgentUI>` itself, not inside `widgets`). Using either as a
widget `name` is an error.

## `data_source` — shared sub-schema

Any widget field named `data_source` has the same shape:

```yaml
data_source:
  action: "some-action-name"     # required
  args: { foo: 42 }              # optional
  subscribe: true                # optional; uses dispatcher.subscribe if available
```

`subscribe: true` with a dispatcher that implements `subscribe` gives you
live updates. Otherwise it's a one-shot `invoke` when the widget mounts.

## The always-on containers

You never write these in YAML — they're part of the shell:

- **User input** (bottom): textarea + send button. Submits go to
  `agent.onUserSubmit(text)` if a bridge is present, else to
  `dispatcher.invoke("user-submit", { text })` as a fallback.
- **Agent response** (below header): streaming bubbles + status indicator.
  Shows output from the `AgentBridge`. Empty when no bridge is connected.

## Example configs

### Dashboard (grid)

```yaml
page:
  title: "My Dashboard"
  main_color: "#2E86DE"
  layout_type: "grid"
  main_menu:
    - { name: "Home",   action: "navigate_home" }
    - { name: "Files",  action: "open_files_view" }
    - { name: "Logout", action: "logout_user" }

widgets:
  - name: "My Files"
    type: "file-type"
    position: { horizontal: "left", vertical: "high" }
    size: { width: 6, height: 400 }
    data_source: { action: "list_user_files" }
    file_actions:
      - { name: "Open",   action: "open_file" }
      - { name: "Delete", action: "delete_file" }

  - name: "My Tasks"
    type: "to-do-list-type"
    position: { horizontal: "right", vertical: "high" }
    size: { width: 6, height: 400 }
    data_source: { action: "list_tasks" }
    on_toggle: "toggle_task"
    on_add: "add_task"
```

### Form page (flex)

```yaml
page:
  title: "New task"
  layout_type: "flex"

widgets:
  - name: "intro"
    type: "markdown"
    size: { width: 12, height: "auto" }
    content: "## Create a task\nFill in the form below."
  - name: "form"
    type: "form"
    size: { width: 8, height: "auto" }
    submit_action: "create_task"
    fields:
      - { field_type: "text", name: "title", label: "Title", required: true }
      - { field_type: "textarea", name: "notes", label: "Notes", rows: 4 }
```

### App shell (sidebar)

```yaml
page:
  title: "Console"
  layout_type: "sidebar"
  main_menu:
    - { name: "Files",    icon: "assets/files.svg",    action: "view_files" }
    - { name: "Tasks",    icon: "assets/tasks.svg",    action: "view_tasks" }
    - { name: "Settings", icon: "assets/settings.svg", action: "view_settings" }

widgets:
  - name: "Recent"
    type: "data-table"
    size: { width: 12, height: "auto" }
    data_source: { action: "list_recent", subscribe: true }
    columns:
      - { key: "when",  label: "When",  sortable: true }
      - { key: "what",  label: "What",  filterable: true }
      - { key: "who",   label: "Who",   filterable: true }
```

### Split-by-topic (tabs)

```yaml
page:
  title: "Operations"
  layout_type: "tabs"

widgets:
  - name: "summary"
    type: "markdown"
    tab: "Overview"
    size: { width: 12, height: "auto" }
    content: "## Overview"
  - name: "traffic"
    type: "chart"
    tab: "Metrics"
    size: { width: 12, height: 300 }
    chart_type: "line"
    data_source: { action: "get_traffic" }
    x_key: "hour"
    y_keys: ["rps"]
  - name: "errors"
    type: "data-table"
    tab: "Errors"
    size: { width: 12, height: "auto" }
    data_source: { action: "list_errors" }
    columns:
      - { key: "ts",      label: "When" }
      - { key: "message", label: "Error", filterable: true }
```

## Diagnostics you might see

| Code | Meaning |
|---|---|
| `yaml.parse` | The YAML itself is malformed |
| `zod.*` | A field is the wrong shape / type / missing |
| `resolve.missing-name` / `resolve.missing-type` | Widget is missing its discriminator fields |
| `resolve.duplicate-name` | Two widgets share the same `name` |
| `resolve.reserved-name` | A widget is named `user-input` or `agent-response` |
| `resolve.unknown-type` | The widget `type` isn't registered (renders a placeholder) |
| `resolve.unknown-action` | An `action` name isn't in `dispatcher.has()` (warning only) |
| `layout.grid-overflow` | `size.width` > 12 |
| `layout.grid-collision` | Packer couldn't place a widget after 512 rows |
| `agent.tool-call-no-widget` | Bridge sent a `tool-call` without a `widget` target |
| `agent.tool-call-unknown-widget` | `tool-call` targets a widget name that isn't in the plan |
