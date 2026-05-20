/**
 * Default `agent-ui` page used when an agent does NOT ship its own
 * `ui.yaml`. Slice 3 onwards: this is the fallback.
 *
 * Layout (12-col grid):
 *
 *   ┌──────────────────────────────────────────────────────────┐
 *   │  page-header                            | Cancel run     │  high
 *   ├─────────────────────────────────┬────────────────────────┤
 *   │                                 │                        │
 *   │  ai-response (transcript)       │  tool-calls            │  middle
 *   │                                 │                        │
 *   ├─────────────────────────────────┴────────────────────────┤
 *   │  ai-chat-input                                           │  low
 *   └──────────────────────────────────────────────────────────┘
 *
 * The `tool-calls` widget MUST be named `"tool-calls"` — that's the name
 * the runtime bridge routes tool events to. Renaming it here means the
 * runtime's `tool.start` / `tool.end` events get dropped by the lib's
 * widget-routing layer and disappear silently. See
 * `runtime/runtimeBridge.ts` (constant `TOOL_CALLS_WIDGET`).
 */
export const defaultChatPage = {
  page: {
    layout_type: "grid",
  },
  widgets: [
    {
      name: "header",
      type: "page-header",
      position: { horizontal: "left", vertical: "high" },
      size: { width: 9, height: "auto" },
      title: "Agent",
      subtitle: "Default chat",
    },
    {
      name: "actions",
      type: "button-group",
      position: { horizontal: "right", vertical: "high" },
      size: { width: 3, height: "auto" },
      buttons: [
        {
          label: "Cancel run",
          action: "cancel-run",
          variant: "destructive",
        },
      ],
    },
    {
      name: "transcript",
      type: "ai-response",
      position: { horizontal: "left", vertical: "middle" },
      size: { width: 8, height: 480 },
      empty_text: "Send a message to start a run.",
      thinking_indicator: "dots",
    },
    {
      name: "tool-calls",
      type: "tool-calls",
      position: { horizontal: "right", vertical: "middle" },
      size: { width: 4, height: 480 },
      title: "Tool calls",
      empty_text: "No tools called yet.",
    },
    {
      name: "chat-input",
      type: "ai-chat-input",
      position: { horizontal: "left", vertical: "low" },
      size: { width: 12, height: "auto" },
      placeholder: "Ask the agent…",
      submit_label: "Send",
      rows: 2,
    },
  ],
} as const;
