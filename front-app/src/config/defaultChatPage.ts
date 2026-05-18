/**
 * Default `agent-ui` page used when an agent does NOT ship its own
 * `ui.yaml`. Per-agent overrides arrive in Slice 3 — at that point this
 * file becomes the fallback only.
 *
 * Layout:
 *
 *   ┌──────────────────────────────────────────────────────────┐
 *   │  page-header                            | Cancel run     │  high
 *   ├──────────────────────────────────────────────────────────┤
 *   │                                                          │
 *   │  ai-response (transcript)                                │  middle
 *   │                                                          │
 *   ├──────────────────────────────────────────────────────────┤
 *   │  ai-chat-input                                           │  low
 *   └──────────────────────────────────────────────────────────┘
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
      size: { width: 12, height: 480 },
      empty_text: "Send a message to start a run.",
      thinking_indicator: "dots",
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
