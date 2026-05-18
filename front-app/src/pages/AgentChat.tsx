import { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { AgentUI, type ActionDispatcher } from "agent-ui";
import { defaultChatPage } from "../config/defaultChatPage.js";
import { getMetadata } from "../runtime/api.js";
import { RuntimeBridge } from "../runtime/runtimeBridge.js";
import type { AgentMetadata } from "../runtime/types.js";

type State =
  | { kind: "loading" }
  | { kind: "ready"; metadata: AgentMetadata }
  | { kind: "missing" }
  | { kind: "error"; message: string };

/**
 * Per-agent chat page.
 *
 * Slice 2 (this slice) always renders the default chat layout. Slice 3
 * adds a `GET /agents/:id/ui` fetch with this default as the fallback.
 *
 * Lifecycle:
 *   1. Read `:agentId` from the URL.
 *   2. Fetch its metadata (404 → missing state; network error → error).
 *   3. Build a `RuntimeBridge` keyed on (id, framework). The bridge owns
 *      the in-flight run; switching to a different agent constructs a
 *      new bridge and tears the old one down by GC.
 *   4. Hand the bridge + a `dispatcher` (for the Cancel button) to
 *      `<AgentUI/>`.
 */
export function AgentChat(): JSX.Element {
  const { agentId } = useParams<{ agentId: string }>();
  const [state, setState] = useState<State>({ kind: "loading" });

  useEffect(() => {
    if (!agentId) return;
    let cancelled = false;
    setState({ kind: "loading" });
    getMetadata(agentId)
      .then((metadata) => {
        if (!cancelled) setState({ kind: "ready", metadata });
      })
      .catch((e: unknown) => {
        if (cancelled) return;
        const message = e instanceof Error ? e.message : String(e);
        // The api helper throws a 404-specific marker so we can branch
        // cleanly between "no such agent" and "everything else".
        if (/\b404\b/.test(message)) {
          setState({ kind: "missing" });
        } else {
          setState({ kind: "error", message });
        }
      });
    return () => {
      cancelled = true;
    };
  }, [agentId]);

  const metadata = state.kind === "ready" ? state.metadata : null;

  const bridge = useMemo(() => {
    if (!metadata) return undefined;
    return new RuntimeBridge(metadata.agent_id, metadata.framework);
  }, [metadata?.agent_id, metadata?.framework]);

  const dispatcher: ActionDispatcher = useMemo(
    () => ({
      async invoke(action: string) {
        if (action === "cancel-run" && bridge) {
          await bridge.cancel();
        }
        return null;
      },
    }),
    [bridge],
  );

  if (state.kind === "loading") {
    return <CenteredNote>Loading agent…</CenteredNote>;
  }
  if (state.kind === "missing") {
    return (
      <CenteredNote>
        <p className="font-semibold text-foreground">Agent not found.</p>
        <p className="mt-1">
          No agent with id <code>{agentId}</code> is loaded.
        </p>
        <Link
          to="/"
          className="mt-3 inline-block text-primary hover:underline"
        >
          ← Back to agents
        </Link>
      </CenteredNote>
    );
  }
  if (state.kind === "error") {
    return (
      <CenteredNote>
        <p className="font-semibold text-destructive">
          Could not load agent.
        </p>
        <pre className="mt-2 whitespace-pre-wrap text-xs opacity-80">
          {state.message}
        </pre>
      </CenteredNote>
    );
  }

  // state.kind === "ready"
  return (
    <div className="flex-1 min-h-0">
      <AgentUI
        config={defaultChatPage}
        agent={bridge}
        dispatcher={dispatcher}
        diagnostics="console"
      />
    </div>
  );
}

function CenteredNote({
  children,
}: {
  children: React.ReactNode;
}): JSX.Element {
  return (
    <div className="mx-auto flex w-full max-w-md flex-1 items-center justify-center p-8 text-sm text-muted-foreground">
      <div className="w-full text-center">{children}</div>
    </div>
  );
}
