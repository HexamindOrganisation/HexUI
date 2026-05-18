import { useEffect, useState } from "react";
import { listAgents } from "../runtime/api.js";
import type { AgentMetadata } from "../runtime/types.js";
import { AgentCard } from "../components/AgentCard.js";

type State =
  | { kind: "loading" }
  | { kind: "ready"; agents: AgentMetadata[] }
  | { kind: "error"; message: string };

/**
 * Home page: grid of agent cards.
 *
 * Three states, all visibly distinct:
 *   - loading   skeleton cards
 *   - ready     the grid (or empty-state copy if zero agents)
 *   - error     banner with the failure reason + a hint
 *
 * Each render does a single `GET /agents`. Individual `HealthPill`s
 * fan out one `GET /health` per agent — they're lightweight on the
 * runtime side, so this is fine for v0. If the agent count grows past
 * a few dozen we'd switch to a single `GET /agents?include=health`
 * aggregate endpoint.
 */
export function AgentsHome(): JSX.Element {
  const [state, setState] = useState<State>({ kind: "loading" });

  useEffect(() => {
    let cancelled = false;
    listAgents()
      .then((agents) => {
        if (!cancelled) setState({ kind: "ready", agents });
      })
      .catch((e: unknown) => {
        const message = e instanceof Error ? e.message : String(e);
        if (!cancelled) setState({ kind: "error", message });
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div className="mx-auto w-full max-w-6xl flex-1 px-6 py-8">
      <header className="mb-6">
        <h1 className="text-2xl font-semibold tracking-tight">Agents</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Agents loaded by the runtime. Click one to start a chat.
        </p>
      </header>

      {state.kind === "loading" && <SkeletonGrid />}
      {state.kind === "error" && <ErrorBanner message={state.message} />}
      {state.kind === "ready" && state.agents.length === 0 && <EmptyState />}
      {state.kind === "ready" && state.agents.length > 0 && (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {state.agents.map((agent) => (
            <AgentCard key={agent.agent_id} agent={agent} />
          ))}
        </div>
      )}
    </div>
  );
}

function SkeletonGrid(): JSX.Element {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {Array.from({ length: 3 }).map((_, i) => (
        <div
          key={i}
          className="h-36 animate-pulse rounded-lg border border-border bg-card/50"
        />
      ))}
    </div>
  );
}

function EmptyState(): JSX.Element {
  return (
    <div className="rounded-lg border border-dashed border-border p-8 text-center text-sm text-muted-foreground">
      <p className="font-medium text-foreground">No agents loaded.</p>
      <p className="mt-1">
        Check <code>PLATFORM_AGENTS_DIR</code> on the runtime and restart.
      </p>
    </div>
  );
}

function ErrorBanner({ message }: { message: string }): JSX.Element {
  return (
    <div className="rounded-lg border border-destructive/40 bg-destructive/10 p-4 text-sm text-destructive">
      <p className="font-medium">Could not reach the runtime.</p>
      <pre className="mt-2 whitespace-pre-wrap text-xs opacity-80">
        {message}
      </pre>
      <p className="mt-3 text-xs opacity-80">
        Is the runtime running on <code>localhost:8080</code>? Set{" "}
        <code>PLATFORM_RUNTIME_URL</code> for a different host.
      </p>
    </div>
  );
}
