import type { RuntimeEvent } from "./types.js";

/**
 * POST a JSON body to an SSE endpoint and yield typed events as they arrive.
 *
 * Browser-native `EventSource` only supports GET, so we use `fetch()` with a
 * `ReadableStream` and parse the SSE framing ourselves. The parser tolerates
 * both `\n` and `\r\n` line endings (sse-starlette uses `\r\n`).
 *
 * The function is an async generator: callers consume events with
 * `for await (const ev of streamRun(...))` and break out (or call
 * `controller.abort()`) to stop early. The generator's `try/finally` is
 * what cleans up the underlying response stream.
 */
export async function* streamRun(
  agentId: string,
  body: unknown,
  signal?: AbortSignal,
): AsyncGenerator<RuntimeEvent, void, void> {
  const res = await fetch(
    `/api/agents/${encodeURIComponent(agentId)}/stream`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
      ...(signal && { signal }),
    },
  );
  if (!res.ok || !res.body) {
    throw new Error(`stream failed: ${res.status}`);
  }

  const reader = res.body.getReader();
  const decoder = new TextDecoder("utf-8");
  let buffer = "";

  try {
    for (;;) {
      const { value, done } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });

      // SSE frames are separated by a blank line. Split on the first
      // double-newline; keep any trailing partial frame in the buffer.
      for (;;) {
        const sepIndex = buffer.search(/\r?\n\r?\n/);
        if (sepIndex === -1) break;
        const frame = buffer.slice(0, sepIndex);
        buffer = buffer.slice(
          sepIndex + (buffer[sepIndex] === "\r" ? 4 : 2),
        );
        const parsed = parseFrame(frame);
        if (parsed) yield parsed;
      }
    }
  } finally {
    reader.releaseLock();
  }
}

function parseFrame(block: string): RuntimeEvent | null {
  let data: string | null = null;
  for (const line of block.split(/\r?\n/)) {
    if (line.startsWith("data:")) {
      data = line.slice(5).trim();
      // We only need the JSON payload; the `event:` and `id:` lines are
      // redundant once parsed (the JSON carries the same `type` and `id`).
    }
  }
  if (!data) return null;
  try {
    return JSON.parse(data) as RuntimeEvent;
  } catch {
    return null;
  }
}
