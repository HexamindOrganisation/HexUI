import { useEffect, useState } from "react";

type Health =
  | { kind: "loading" }
  | { kind: "ok" }
  | { kind: "unhealthy"; detail: string }
  | { kind: "error" };

/**
 * Tiny status pill backed by a one-shot `GET /health` call per agent.
 *
 * Health is intentionally lightweight on the runtime side (it does not
 * call the model), so polling N agents on AgentsHome is cheap. We still
 * do it lazily — one fetch per mounted pill, no global polling loop.
 */
export function HealthPill({ agentId }: { agentId: string }): JSX.Element {
  const [state, setState] = useState<Health>({ kind: "loading" });

  useEffect(() => {
    let cancelled = false;
    fetch(`/api/agents/${encodeURIComponent(agentId)}/health`)
      .then(async (res) => {
        const body = (await res.json()) as {
          ok: boolean;
          details?: { error?: string };
        };
        if (cancelled) return;
        if (body.ok) {
          setState({ kind: "ok" });
        } else {
          setState({
            kind: "unhealthy",
            detail: body.details?.error ?? "unhealthy",
          });
        }
      })
      .catch(() => {
        if (!cancelled) setState({ kind: "error" });
      });
    return () => {
      cancelled = true;
    };
  }, [agentId]);

  if (state.kind === "loading") {
    return <Pill tone="muted">checking…</Pill>;
  }
  if (state.kind === "ok") {
    return <Pill tone="ok">healthy</Pill>;
  }
  if (state.kind === "unhealthy") {
    return (
      <Pill tone="warn" title={state.detail}>
        unhealthy
      </Pill>
    );
  }
  return <Pill tone="error">unreachable</Pill>;
}

function Pill({
  tone,
  children,
  title,
}: {
  tone: "ok" | "warn" | "error" | "muted";
  children: React.ReactNode;
  title?: string;
}): JSX.Element {
  const cls = {
    ok: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-500/30",
    warn: "bg-amber-500/15 text-amber-700 dark:text-amber-300 border-amber-500/30",
    error: "bg-destructive/15 text-destructive border-destructive/30",
    muted: "bg-muted text-muted-foreground border-border",
  }[tone];
  return (
    <span
      title={title}
      className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide ${cls}`}
    >
      {children}
    </span>
  );
}
