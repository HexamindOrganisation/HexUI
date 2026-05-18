# Unified AI Agent Platform

A platform for building, deploying, and serving AI agents across multiple
underlying agent frameworks (LangChain, OpenAI Agents SDK, Google ADK, …)
behind a single coherent runtime protocol, event schema, and UI surface.

The platform decouples **what the agent does** (framework-native code
written by the agent author) from **how the agent runs** (isolation,
streaming, observability, configuration, UI) so that:

- agent authors keep writing idiomatic framework code;
- platform consumers (frontends, observability, the control plane) see one
  normalized event stream and one HTTP API regardless of the underlying
  framework;
- adding a new framework is one adapter, not a rewrite.

> **Status.** The runtime backend is at **v0** (core complete, isolation
> shipped, three framework adapters live). The control plane and the
> production front-app shell are not yet built. See [TODO.md](TODO.md)
> for the full roadmap.

---

## Architecture

Two backend domains plus a UI library, deliberately separated:

```
┌─────────────────────────────────────────────────────────────────────┐
│                      Front-end (browser)                            │
│   front-app shell  ─►  custom-UI widgets (YAML-driven, SSE-aware)   │
└──────────────────────────────────┬──────────────────────────────────┘
                                   │ HTTP + SSE
                                   ▼
┌─────────────────────────────────────────────────────────────────────┐
│   Platform backend (control plane)         [not yet built]          │
│   auth · RBAC · tenants · secrets · conversation persistence ·      │
│   app registry · YAML config · observability · quotas · billing     │
└──────────────────────────────────┬──────────────────────────────────┘
                                   │ HTTP
                                   ▼
┌─────────────────────────────────────────────────────────────────────┐
│   Runtime backend (execution plane)                  [v0 shipped]   │
│   FastAPI + SSE  ─►  Registry  ─►  Adapter (in-process or remote)   │
│                                          │                          │
│                                          ▼                          │
│                                 Per-agent worker process            │
│                                  (own venv, own deps)               │
│                                          │                          │
│                                          ▼                          │
│                                  framework SDK (LC / OAI / ADK / …) │
└─────────────────────────────────────────────────────────────────────┘
```

The architecture mirrors modern data-plane / control-plane splits: the
runtime is stateless and horizontally scalable; the platform backend owns
all state, security, and tenant-shaped concerns.

The UI never talks framework concepts. Adapters normalize framework events
into a fixed schema (`message.delta`, `tool.start`, `state.update`,
`trace.span`, …); the UI consumes that schema.

For the original product spec, see [specs.md](specs.md).

---

## Repository layout

| Path | Purpose | Status |
|---|---|---|
| [backend-runtime/](backend-runtime/) | Execution plane: HTTP server, adapter framework, worker isolation, per-agent venvs. | **v0** — see its [README](backend-runtime/README.md) |
| [custom-UI/](custom-UI/) | React + TypeScript library that renders a configurable agent UI from YAML. | Library complete; SSE chat widget pending |
| [front-app/](front-app/) | Production front-end shell wiring auth → tenant select → agent select → UI. | Not started |
| [specs.md](specs.md) | Original product specification. | Reference |
| [TODO.md](TODO.md) | Roadmap and milestone tracker. | Live |

---

## Quick start (runtime + an example agent)

The runtime backend is the only part you can run end-to-end today. From
the repo root:

```bash
cd backend-runtime
python3 -m venv .venv
.venv/bin/pip install -e '.[langchain]' langchain-openai

export OPENAI_API_KEY=...
export PLATFORM_AGENTS_DIR=examples
.venv/bin/python -m platform_runtime
```

Then in another terminal:

```bash
curl -N -X POST http://127.0.0.1:8080/agents/langchain-hello/stream \
  -H 'Content-Type: application/json' \
  -d '{"input": {"messages": [{"role": "user", "content": "What time is it?"}]}}'
```

You will see an SSE stream of normalized events (`run.started`,
`message.delta`, `tool.start`, `tool.end`, `message.completed`,
`run.completed`).

The bundled examples cover all three currently-supported frameworks:

| Example | Framework | Needs |
|---|---|---|
| [langchain_hello](backend-runtime/examples/langchain_hello/) | LangChain | `OPENAI_API_KEY`, `langchain-openai` |
| [openai_agents_hello](backend-runtime/examples/openai_agents_hello/) | OpenAI Agents SDK | `OPENAI_API_KEY` |
| [google_adk_hello](backend-runtime/examples/google_adk_hello/) | Google ADK | `GOOGLE_API_KEY` |

See [backend-runtime/README.md](backend-runtime/README.md) for the full
HTTP API, event schema, and adapter-authoring guide.

---

## Concepts in one minute

**Agent.** A folder with an `agent.yaml` manifest and a Python entrypoint
exposing a factory callable. The factory returns a framework-native object
(LangChain Runnable, OpenAI `Agent`, ADK `Agent`, …).

**Manifest.** Declares the framework, entrypoint, capabilities, optional
`requirements`. Validated at load time; portable; framework-agnostic
schema with an `extra` slot for framework-specific knobs.

**Adapter.** Per-framework class implementing `UnifiedAgentRuntime`.
Translates the framework's stream into the platform's normalized event
schema. Adding a new framework = writing one adapter.

**Event schema.** Closed set of typed events
(`message.delta`, `message.completed`, `tool.start`, `tool.end`,
`trace.span`, `state.update`, `approval.requested`, `error`,
`run.started`, `run.completed`). The UI and observability layers consume
events generically.

**Isolation.** Agents can run in-process (low overhead, trusted code) or
in per-agent subprocesses with their own Python venv installed from the
manifest's `requirements`. Dependency conflicts and crashes stop at the
worker boundary.

---

## Currently supported frameworks

- **LangChain ≥ 1.0** — including LCEL chains and `create_agent`
  (LangGraph) outputs.
- **OpenAI Agents SDK ≥ 0.17** — `Runner.run_streamed` token stream.
- **Google ADK ≥ 1.33** — `Runner.run_async` event stream, multi-agent
  handoff, JSON-schema-translated tools.

See [TODO.md](TODO.md) for upcoming frameworks (Pydantic AI,
LangGraph/Deepagents).

---

## Development

Each subdirectory is independently versioned and developed.

```bash
# runtime backend
cd backend-runtime && python3 -m venv .venv && .venv/bin/pip install -e '.[langchain,openai-agents,google-adk]'
.venv/bin/python -m pytest tests/ -q

# UI library
cd custom-UI && npm install && npm test
```

The runtime backend's full test suite (34 tests, including subprocess
isolation) runs in <40s.

---

## License

TBD.
