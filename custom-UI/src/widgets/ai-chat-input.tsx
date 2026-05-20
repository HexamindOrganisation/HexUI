import { useState } from "react";
import type { WidgetProps } from "../registry/types.js";
import type { AiChatInputWidget } from "../schema/widgets/ai-chat-input.js";
import { useAgentUIContext } from "../runtime/context.js";
import { Button } from "../components/ui/button.js";
import { Textarea } from "../components/ui/textarea.js";

const CANCEL_ACTION = "cancel-run";

export function AiChatInputWidgetComponent({
  props,
}: WidgetProps<AiChatInputWidget>): JSX.Element {
  const { dispatcher, agent, pushUserMessage } = useAgentUIContext();
  const [text, setText] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const canFallback = !agent && (dispatcher.has?.("user-submit") ?? false);
  const inert = !agent && !canFallback;

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (submitting) return;
    const t = text.trim();
    if (!t) return;
    setSubmitting(true);
    try {
      pushUserMessage(t);
      if (agent) {
        await agent.onUserSubmit(t);
      } else if (canFallback) {
        await dispatcher.invoke("user-submit", { text: t });
      } else {
        // eslint-disable-next-line no-console
        console.warn(
          "[agent-ui] ai-chat-input has no AgentBridge nor a 'user-submit' dispatcher action; input is inert.",
        );
      }
      setText("");
    } finally {
      setSubmitting(false);
    }
  };

  const onCancel = async () => {
    if (!submitting) return;
    try {
      await dispatcher.invoke(CANCEL_ACTION);
    } catch {
      // Dispatcher may not handle cancel; failing is the right default —
      // there's nothing visual to roll back.
    }
  };

  return (
    <form className="flex items-stretch gap-2" onSubmit={onSubmit}>
      <Textarea
        className="flex-1"
        rows={props.rows ?? 2}
        placeholder={
          inert
            ? "Input disabled — no bridge"
            : props.placeholder ?? "Ask anything…"
        }
        value={text}
        onChange={(e) => setText(e.target.value)}
        disabled={inert || submitting}
        onKeyDown={(e) => {
          if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault();
            void onSubmit(e as unknown as React.FormEvent);
          }
        }}
      />
      <div className="flex flex-col justify-stretch gap-1">
        <Button
          type="submit"
          size="icon"
          disabled={inert || submitting || !text.trim()}
          aria-label={props.submit_label ?? "Send"}
          title={props.submit_label ?? "Send"}
        >
          <SendIcon />
        </Button>
        <Button
          type="button"
          size="icon"
          variant="destructive"
          disabled={!submitting}
          onClick={onCancel}
          aria-label="Cancel run"
          title="Cancel run"
        >
          <StopIcon />
        </Button>
      </div>
    </form>
  );
}

function SendIcon(): JSX.Element {
  // Right arrow.
  return (
    <svg
      viewBox="0 0 16 16"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      className="h-4 w-4"
    >
      <path d="M3 8h10" />
      <path d="M9 4l4 4-4 4" />
    </svg>
  );
}

function StopIcon(): JSX.Element {
  // Filled square (stop).
  return (
    <svg
      viewBox="0 0 16 16"
      fill="currentColor"
      aria-hidden="true"
      className="h-3 w-3"
    >
      <rect x="3" y="3" width="10" height="10" rx="1" />
    </svg>
  );
}
