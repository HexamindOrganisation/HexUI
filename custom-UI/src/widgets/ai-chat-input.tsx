import { useState } from "react";
import type { WidgetProps } from "../registry/types.js";
import type { AiChatInputWidget } from "../schema/widgets/ai-chat-input.js";
import { useAgentUIContext } from "../runtime/context.js";

const CANCEL_ACTION = "cancel-run";
const ACCENT = "var(--accent-color, hsl(var(--primary)))";

/**
 * The constant HexaUI composer: one quiet field on a surface card — attach on
 * the left, voice + send on the right. The send button is dimmed until there's
 * text, then lights to the agent accent; the card border picks up the accent on
 * focus. Enter submits, Shift+Enter newlines. No agent selector (the picker
 * lives in the top bar).
 */
export function AiChatInputWidgetComponent({
  props,
}: WidgetProps<AiChatInputWidget>): JSX.Element {
  const { dispatcher, agent, pushUserMessage } = useAgentUIContext();
  const [text, setText] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const canFallback = !agent && (dispatcher.has?.("user-submit") ?? false);
  const inert = !agent && !canFallback;
  const hasText = text.trim().length > 0;

  const onSubmit = async (e?: React.FormEvent) => {
    e?.preventDefault();
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
      /* nothing visual to roll back */
    }
  };

  return (
    <form
      onSubmit={onSubmit}
      className="rounded-[var(--r-lg,16px)] border border-border bg-card px-4 pb-3 pt-3.5 transition-colors focus-within:[border-color:var(--accent-color,hsl(var(--primary)))]"
      style={{ boxShadow: "var(--hx-shadow)" }}
    >
      <textarea
        className="block max-h-48 w-full resize-none bg-transparent px-1 text-[15px] leading-relaxed text-foreground outline-none placeholder:text-muted-foreground disabled:opacity-60"
        rows={props.rows ?? 1}
        placeholder={
          inert ? "Input disabled — no bridge" : props.placeholder ?? "Ask anything…"
        }
        value={text}
        disabled={inert || submitting}
        onChange={(e) => setText(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault();
            void onSubmit();
          }
        }}
      />

      <div className="mt-2 flex items-center gap-1">
        <IconButton label="Attach" disabled={inert}>
          <PaperclipIcon />
        </IconButton>

        <div className="flex-1" />

        <IconButton label="Voice" disabled={inert}>
          <MicIcon />
        </IconButton>

        {submitting ? (
          <button
            type="button"
            onClick={onCancel}
            aria-label="Stop"
            title="Stop"
            className="flex h-9 w-9 items-center justify-center rounded-full text-white"
            style={{ background: ACCENT }}
          >
            <StopIcon />
          </button>
        ) : (
          <button
            type="submit"
            disabled={inert || !hasText}
            aria-label={props.submit_label ?? "Send"}
            title={props.submit_label ?? "Send"}
            className="flex h-9 w-9 items-center justify-center rounded-full transition-colors disabled:cursor-not-allowed"
            style={
              hasText
                ? { background: ACCENT, color: "hsl(var(--background))" }
                : { background: "hsl(var(--muted))", color: "hsl(var(--muted-foreground))" }
            }
          >
            <SendIcon />
          </button>
        )}
      </div>
    </form>
  );
}

function IconButton({
  label,
  disabled,
  children,
}: {
  label: string;
  disabled?: boolean;
  children: React.ReactNode;
}): JSX.Element {
  return (
    <button
      type="button"
      disabled={disabled}
      aria-label={label}
      title={label}
      className="flex h-9 w-9 items-center justify-center rounded-md text-muted-foreground hover:bg-secondary hover:text-foreground disabled:opacity-40"
    >
      {children}
    </button>
  );
}

function SendIcon(): JSX.Element {
  // Up arrow (submit).
  return (
    <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden className="h-4 w-4">
      <path d="M8 13V3" />
      <path d="M4 7l4-4 4 4" />
    </svg>
  );
}

function StopIcon(): JSX.Element {
  return (
    <svg viewBox="0 0 16 16" fill="currentColor" aria-hidden className="h-3 w-3">
      <rect x="3" y="3" width="10" height="10" rx="1.5" />
    </svg>
  );
}

function PaperclipIcon(): JSX.Element {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden className="h-[18px] w-[18px]">
      <path d="M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48" />
    </svg>
  );
}

function MicIcon(): JSX.Element {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden className="h-[18px] w-[18px]">
      <rect x="9" y="2" width="6" height="12" rx="3" />
      <path d="M5 10a7 7 0 0 0 14 0" />
      <path d="M12 19v3" />
    </svg>
  );
}
