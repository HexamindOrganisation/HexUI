import { CSSProperties, useEffect, useMemo, useRef } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useSearchParams } from "react-router-dom";
import { AgentUI, type ConversationMessage } from "agent-ui";

import { getAgentUiYaml } from "../api/agents";
import { listMessages } from "../api/conversations";
import { useActiveAgent } from "../hooks/useActiveAgent";
import { RuntimeBridge } from "../runtime/runtimeBridge";
import { makeDispatcher } from "../runtime/dispatcher";

/**
 * The MAIN region. Mounts `<AgentUI>` with the agent's `ui.yaml` + a
 * RuntimeBridge — for both an active conversation and the empty state (no
 * greeting screen; the agent's own layout, including its `ai-chat-input`
 * widget and any dashboards, shows from the moment an agent is selected).
 *
 * The first message goes through the bridge like any other: `onUserSubmit`
 * lazy-creates the conversation (no navigation, so the live stream isn't torn
 * down) and streams the reply. `data_source` widgets resolve agent-scoped until
 * that conversation exists (see `makeDispatcher`).
 *
 * Keying: `<AgentUI>` is keyed by `agentId:conversationId:nonce`. Lazy
 * conversation-creation does NOT navigate, so the key is stable and the stream
 * survives; selecting an existing conversation changes the key and seeds its
 * stored history; a new session (`n`) remounts a fresh, empty surface.
 */
export function ChatPage() {
  const { agent, agentId, conversationId } = useActiveAgent();
  const [sp] = useSearchParams();
  const qc = useQueryClient();
  const sessionNonce = sp.get("n") ?? "0";

  // Identity of the current chat surface — also the `<AgentUI>` remount key.
  const surfaceKey = `${agentId ?? ""}:${conversationId ?? "new"}:${sessionNonce}`;

  const convRef = useRef<string | null>(null);
  convRef.current = conversationId ?? null;
  // The conversation lazily created on the first message. We don't navigate on
  // create (keeps the live stream), so the URL — and thus `conversationId` /
  // `convRef` — stays null for it. Held in its own ref so a re-render doesn't
  // clobber it back to null; actions + data_source resolve against it. Cleared
  // when the surface changes (new session / agent / selecting a conversation).
  const createdRef = useRef<string | null>(null);
  const agentRef = useRef<string | null>(null);
  agentRef.current = agentId ?? null;

  /** The active conversation id: the URL's, else the one created this session. */
  const liveConversationId = () => convRef.current ?? createdRef.current;

  const { data: yaml } = useQuery({
    queryKey: ["ui", agentId],
    enabled: !!agentId,
    queryFn: () => getAgentUiYaml(agentId!),
  });

  // Stored messages for an existing conversation — seed the transcript on select.
  const { data: history } = useQuery({
    queryKey: ["messages", conversationId],
    enabled: !!conversationId,
    queryFn: () => listMessages(conversationId!),
  });

  const bridge = useMemo(
    () =>
      new RuntimeBridge({
        getConversationId: liveConversationId,
        getAgentId: () => agentRef.current,
        onConversationCreated: (id) => {
          createdRef.current = id;
          qc.invalidateQueries({ queryKey: ["conversations"] });
        },
        canSubmit: () => null,
      }),
    // Fresh bridge per agent / conversation / new session.
    [agentId, conversationId, sessionNonce, qc],
  );

  const dispatcher = useMemo(
    () => makeDispatcher(liveConversationId, () => agentRef.current),
    [agentId, conversationId, sessionNonce],
  );

  // Drop the lazily-created conversation when the surface changes (select a
  // conversation / New session / switch agent), so a fresh empty surface
  // doesn't keep writing into the previous one.
  useEffect(() => {
    createdRef.current = null;
  }, [surfaceKey]);

  if (!agent) {
    return (
      <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
        Loading…
      </div>
    );
  }

  const historyPending = !!conversationId && history === undefined;
  if (yaml === undefined || historyPending) {
    return (
      <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
        Loading…
      </div>
    );
  }
  if (yaml === null) {
    return (
      <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
        {agent.name} ships no ui.yaml.
      </div>
    );
  }

  // Seed the transcript with an existing conversation's stored messages; the
  // empty state starts blank and the bridge appends turns as they stream.
  const initialMessages: ConversationMessage[] | undefined = conversationId
    ? history?.map((m) => ({
        id: m.id,
        role: m.role,
        content: m.content,
        timestamp: Date.parse(m.created_at) || Date.now(),
      }))
    : undefined;

  // The chat avatar (agent-agnostic widget) reads the agent's initial from this
  // inherited, quoted-string CSS var.
  const initial = (agent.name?.trim().charAt(0) ?? "").toUpperCase();

  return (
    <div
      className="h-full overflow-hidden"
      style={{ "--hx-assistant-initial": `"${initial}"` } as CSSProperties}
    >
      <AgentUI
        key={surfaceKey}
        config={yaml}
        dispatcher={dispatcher}
        agent={bridge}
        theme={{ mode: "dark", accent: agent.main_color }}
        {...(initialMessages && { initialMessages })}
        diagnostics="console"
      />
    </div>
  );
}
