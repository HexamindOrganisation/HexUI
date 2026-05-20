/**
 * Default `agent-ui` page used when an agent does NOT ship its own
 * `ui.yaml`.
 *
 * Layout (12-col grid):
 *
 *   ┌──────────────────────────────────────────────────────────┐
 *   │  page-header                                             │  high
 *   ├─────────────────────────────────┬────────────────────────┤
 *   │  ai-response (transcript)       │  tool-calls            │  middle
 *   ├─────────────────────────────────┴────────────────────────┤
 *   │  ai-chat-input  (send + cancel stacked next to textarea) │  low
 *   └──────────────────────────────────────────────────────────┘
 *
 * The `tool-calls` widget MUST be named `"tool-calls"` — that's the name
 * the runtime bridge routes tool events to.
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
      size: { width: 12, height: "auto" },
      title: "Agent",
      subtitle: "Default chat",
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
      rows: 2,
    },
  ],
} as const;
