import type { ActionResult, AgentMetadata } from "./types.js";

/**
 * REST helpers for the runtime's non-streaming endpoints. Streaming lives
 * in `sseStream.ts`. Everything goes through Vite's `/api` proxy so the
 * runtime stays CORS-naive.
 */

export async function listAgents(): Promise<AgentMetadata[]> {
  const res = await fetch("/api/agents");
  if (!res.ok) {
    throw new Error(`GET /agents failed: ${res.status}`);
  }
  return res.json();
}

export async function getMetadata(agentId: string): Promise<AgentMetadata> {
  const res = await fetch(
    `/api/agents/${encodeURIComponent(agentId)}/metadata`,
  );
  if (!res.ok) {
    // 404 is significant for the caller (agent doesn't exist) — bake the
    // status into the message so a single `.catch` can branch on it.
    throw new Error(`GET /metadata failed: ${res.status}`);
  }
  return res.json();
}

/**
 * Fetch the per-agent UI definition (raw YAML text).
 *
 * Returns `null` on 404 — the agent didn't ship a `ui.yaml`, so the
 * caller should use its default page config. Any other non-OK status
 * throws.
 *
 * No client-side YAML parsing: `agent-ui` accepts the raw string and
 * parses it itself, with its own diagnostics surface. Less coupling.
 */
export async function getUiYaml(agentId: string): Promise<string | null> {
  const res = await fetch(
    `/api/agents/${encodeURIComponent(agentId)}/ui`,
  );
  if (res.status === 404) return null;
  if (!res.ok) {
    throw new Error(`GET /ui failed: ${res.status}`);
  }
  return res.text();
}

export async function cancelRun(
  agentId: string,
  runId: string,
): Promise<boolean> {
  const res = await fetch(
    `/api/agents/${encodeURIComponent(agentId)}/runs/${encodeURIComponent(runId)}/cancel`,
    { method: "POST" },
  );
  if (!res.ok) {
    throw new Error(`cancel failed: ${res.status}`);
  }
  const data = (await res.json()) as { cancelled: boolean };
  return data.cancelled;
}

/**
 * Invoke a UI-triggered action declared by the agent's manifest.
 *
 * Returns the runtime's envelope `{ result, events }`. The caller is
 * responsible for fanning `events` out to the widget inboxes — typically
 * the RuntimeBridge does this so handlers behave the same regardless of
 * which widget invoked them.
 */
export async function invokeAction(
  agentId: string,
  action: string,
  args: unknown,
): Promise<ActionResult> {
  const res = await fetch(
    `/api/agents/${encodeURIComponent(agentId)}/actions/${encodeURIComponent(action)}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ args: args ?? {} }),
    },
  );
  if (!res.ok) {
    let detail = `${res.status}`;
    try {
      const body = (await res.json()) as { detail?: string };
      if (body.detail) detail = body.detail;
    } catch {
      // ignore non-JSON error bodies
    }
    throw new Error(`Action '${action}' failed: ${detail}`);
  }
  return res.json();
}
