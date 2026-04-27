import { useEffect, useRef, useState } from "react";
import type { WidgetProps } from "../registry/types.js";
import type { AiResponseWidget } from "../schema/widgets/ai-response.js";
import { useAgentUIContext } from "../runtime/context.js";
import type { AgentEvent } from "../runtime/agentBridge.js";
import { cn } from "../lib/utils.js";

interface Message {
  id: string;
  role: "assistant" | "system";
  content: string;
  partial: boolean;
}

export function AiResponseWidgetComponent({
  props,
}: WidgetProps<AiResponseWidget>): JSX.Element {
  const { agent, subscribeContainer } = useAgentUIContext();
  const [messages, setMessages] = useState<Message[]>([]);
  const [status, setStatus] = useState<"idle" | "thinking" | "responding">(
    "idle",
  );
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!agent) return;
    const unsub = subscribeContainer((event: AgentEvent) => {
      if (event.kind === "token") {
        const id = event.messageId ?? "stream";
        setMessages((prev) => {
          const last = prev[prev.length - 1];
          if (last && last.id === id && last.partial) {
            const next = [...prev];
            next[next.length - 1] = {
              ...last,
              content: last.content + event.text,
            };
            return next;
          }
          return [
            ...prev,
            { id, role: "assistant", content: event.text, partial: true },
          ];
        });
      } else if (event.kind === "message") {
        const id = event.messageId ?? `msg-${Date.now()}`;
        setMessages((prev) => {
          const last = prev[prev.length - 1];
          if (last && last.id === id && last.partial) {
            const next = [...prev];
            next[next.length - 1] = {
              ...last,
              content: event.content,
              partial: false,
              role: event.role,
            };
            return next;
          }
          return [
            ...prev,
            { id, role: event.role, content: event.content, partial: false },
          ];
        });
      } else if (event.kind === "status") {
        setStatus(event.state);
      } else if (event.kind === "error") {
        setMessages((prev) => [
          ...prev,
          {
            id: `err-${Date.now()}`,
            role: "system",
            content: `Error: ${event.message}`,
            partial: false,
          },
        ]);
      }
    });
    return unsub;
  }, [agent, subscribeContainer]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, status]);

  const containerCls =
    "flex flex-col gap-2 overflow-auto border-b border-border bg-background px-4 py-3";

  if (!agent) {
    return (
      <div className={cn(containerCls, "italic text-muted-foreground")} ref={scrollRef}>
        {props.empty_text ?? "No agent bridge connected."}
      </div>
    );
  }

  if (messages.length === 0 && status === "idle") {
    return (
      <div className={cn(containerCls, "italic text-muted-foreground")} ref={scrollRef}>
        {props.empty_text ?? ""}
      </div>
    );
  }

  return (
    <div className={containerCls} ref={scrollRef}>
      {messages.map((m) => (
        <div
          key={m.id + (m.partial ? "-p" : "")}
          className={cn(
            "whitespace-pre-wrap break-words rounded-md px-3 py-2",
            m.role === "assistant" && "bg-accent text-accent-foreground",
            m.role === "system" &&
              "bg-destructive/10 text-destructive",
          )}
        >
          {m.content}
        </div>
      ))}
      {status !== "idle" && (
        <div className="text-xs italic text-muted-foreground">
          {status === "thinking" ? "…thinking" : "…responding"}
        </div>
      )}
    </div>
  );
}
