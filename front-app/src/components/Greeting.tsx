import { useState } from "react";
import { ArrowUp, Paperclip } from "lucide-react";

import type { AgentSummary } from "../api/agents";

const ACCENT = "var(--accent-color, hsl(var(--primary)))";

function greetWord(): string {
  const h = new Date().getHours();
  if (h < 12) return "Good morning";
  if (h < 18) return "Good afternoon";
  return "Good evening";
}

/**
 * The empty-state / new-session screen (per the HexaUI handoff): a serif
 * greeting that rises in word-by-word, an accent hero-rule, a "Talking to
 * {agent}" line, and the composer. Stays clean — the agent's widgets only
 * appear once a conversation is active. Sending (Enter or the send button)
 * hands the text up to the host, which mounts the chat and streams the reply.
 */
export function Greeting({
  agent,
  sessionKey,
  onSend,
}: {
  agent: AgentSummary;
  /** Changes per new session so the entrance animation replays. */
  sessionKey: string;
  onSend: (text: string) => void;
}) {
  const [text, setText] = useState("");
  const hasText = text.trim().length > 0;

  const words = `${greetWord()}, dev01`.split(" ");

  const submit = () => {
    const t = text.trim();
    if (t) onSend(t);
  };

  return (
    <div className="flex h-full items-center justify-center overflow-auto p-6">
      <div className="w-full max-w-[720px]">
        <h1
          key={sessionKey}
          className="text-[clamp(34px,5vw,47px)] font-semibold leading-[1.1] tracking-[-0.025em] text-foreground"
          style={{
            fontFamily:
              "var(--font-ui, 'Hanken Grotesk', ui-sans-serif, system-ui, sans-serif)",
          }}
        >
          {words.map((w, i) => (
            <span
              key={i}
              className="hx-gword"
              style={{ animationDelay: `${i * 0.075}s` }}
            >
              {w}
              {i < words.length - 1 ? " " : ""}
            </span>
          ))}
        </h1>

        <div key={`r-${agent.id}`} className="hx-hero-rule mt-[18px]" />

        <div
          key={`t-${agent.id}`}
          className="mt-4 flex items-center gap-2 text-[12.5px] text-[var(--hx-text-3,hsl(var(--muted-foreground)))]"
        >
          <span
            className="inline-block h-1.5 w-1.5 rounded-full"
            style={{ background: ACCENT }}
          />
          <span>
            Talking to <span className="font-semibold text-foreground/80">{agent.name}</span>{" "}
            · {agent.role}
          </span>
        </div>

        {/* Composer (quiet field; same language as the in-chat composer). */}
        <form
          className="mt-7 rounded-[var(--r-lg,16px)] border border-border bg-card px-4 pb-3 pt-3.5 transition-colors focus-within:[border-color:var(--accent-color,hsl(var(--primary)))]"
          style={{ boxShadow: "var(--hx-shadow)" }}
          onSubmit={(e) => {
            e.preventDefault();
            submit();
          }}
        >
          <textarea
            autoFocus
            rows={1}
            value={text}
            placeholder={`Ask ${agent.name}…`}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                submit();
              }
            }}
            className="block max-h-48 w-full resize-none bg-transparent px-1 text-[15px] leading-relaxed text-foreground outline-none placeholder:text-muted-foreground"
          />
          <div className="mt-2 flex items-center gap-1">
            <button
              type="button"
              aria-label="Attach"
              className="flex h-9 w-9 items-center justify-center rounded-md text-muted-foreground hover:bg-secondary hover:text-foreground"
            >
              <Paperclip className="h-[18px] w-[18px]" />
            </button>
            <div className="flex-1" />
            <button
              type="submit"
              disabled={!hasText}
              aria-label="Send"
              className="flex h-9 w-9 items-center justify-center rounded-full transition-colors disabled:cursor-not-allowed"
              style={
                hasText
                  ? { background: ACCENT, color: "hsl(var(--background))" }
                  : { background: "hsl(var(--muted))", color: "hsl(var(--muted-foreground))" }
              }
            >
              <ArrowUp className="h-4 w-4" />
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
