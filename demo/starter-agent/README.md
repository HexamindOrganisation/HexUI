# Starter agent — the minimal HexaUI backend

A **copy-me template**: the smallest backend the HexaUI proxy will talk to.
One `native` echo agent, the five contract endpoints, one `ui.yaml`. Read
[`src/starter_agent/app.py`](src/starter_agent/app.py) top to bottom — the whole
contract is in that one file, each endpoint annotated with its
[CONTRACT.md](../CONTRACT.md) section.

> For a richer reference that exercises **every** framework (langchain,
> openai-agents, google-adk) plus the actions / data-source workspace, see
> [`../agent-server/`](../agent-server/). This starter is deliberately the
> opposite: the fewest moving parts that still pass conformance.

## Run it

From the repo root, under WSL (the venv is Linux):

```bash
uv venv demo/starter-agent/.venv
# [dev] also pulls httpx, used by the conformance checker below.
uv pip install --python demo/starter-agent/.venv -e 'demo/starter-agent[dev]'
AGENT_HOST=127.0.0.1 AGENT_PORT=8080 \
  demo/starter-agent/.venv/bin/python -m starter_agent     # serves on :8080
```

Point the proxy at it by setting `PLATFORM_RUNTIME_URL=http://127.0.0.1:8080`
(its default), then run the front-app — pick **Echo** and chat.

## Verify it conforms

With the backend running, in another shell:

```bash
demo/starter-agent/.venv/bin/python demo/scripts/verify_backend.py http://127.0.0.1:8080
```

The checker acts as the proxy would — assigns a `run_id`, reads the SSE stream,
cancels mid-run, inspects every frame — and prints PASS/FAIL per
[CONTRACT.md §8](../CONTRACT.md). It exits non-zero on any failure, so it works
as a CI gate for your own backend too.

## Build your own

Copy this directory and change the three spots marked `# CHANGE ME` in
[`app.py`](src/starter_agent/app.py):

1. **Roster identity** — your agent's `id`, `name`, `role`, `main_color`.
2. **The agent loop** — replace the echo with your model / framework calls. If
   you use langchain / openai-agents / google-adk, set the agent's `framework`
   and forward that framework's **native** events as-is; the proxy translates
   them ([CONTRACT.md §6](../CONTRACT.md)). `native` (used here) means you emit
   the already-normalized minimal events directly — the zero-translation path.
3. **Actions** — only if your `ui.yaml` wires `action` / `data_source` widgets
   (this starter's UI is chat-only). See
   [`../agent-server/src/agent_server/actions.py`](../agent-server/src/agent_server/actions.py)
   for a real data-source + `refresh` example.

The `ui.yaml` (which widgets, where, the accent color) lives in
[`src/starter_agent/ui/`](src/starter_agent/ui/) and is served by
`GET /agents/{id}/ui`. The widget catalog and YAML schema are in
[`custom-UI/docs/`](../../custom-UI/docs/).
