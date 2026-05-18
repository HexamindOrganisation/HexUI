# front-app

User-facing app for the Unified AI Agent Platform. Talks to
[platform-runtime](../backend-runtime/) via HTTP+SSE and renders each
agent's UI with [agent-ui](../custom-UI/).

Current state: **Slice 2 of 5** — the chat E2E. Foundation routes
(`/secrets`, `/settings`) render placeholders awaiting Slices 4 and 5.
See [specs.md](specs.md) for the full plan.

```
┌─────────────────────────────────────────────────────────────────┐
│  Brand    Agents · Secrets · Settings        (persistent shell) │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│   Routes (React Router v6):                                     │
│     /                  AgentsHome   grid of agent cards         │
│     /agents/:id        AgentChat    agent-ui rendered chat      │
│     /secrets           SecretsPage  placeholder (Slice 4)       │
│     /settings          SettingsPage placeholder (Slice 5)       │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
                              │
                       Vite proxy /api/* → http://127.0.0.1:8080
                              │
                              ▼
                       platform-runtime
```

## Run it

In one terminal, the runtime (with at least one agent loaded):

```bash
cd ../backend-runtime
export OPENAI_API_KEY=...
export PLATFORM_AGENTS_DIR=examples
.venv/bin/python -m platform_runtime
```

In another:

```bash
cd front-app
npm install
npm run dev
```

Open <http://localhost:5173>. Pick an agent → send a message → watch
tokens stream. The **Cancel run** button proves the runtime's cancel
API end to end — clicking it mid-stream produces a `Run cancelled.`
system message.

### Different runtime host

```bash
PLATFORM_RUNTIME_URL=http://127.0.0.1:9090 npm run dev
```

The Vite proxy uses this for `/api/*` rewrites.

## File layout

```
src/
  main.tsx                          React entry
  App.tsx                           Router root
  styles.css                        Tailwind + agent-ui CSS imports

  layout/
    AppShell.tsx                    persistent nav + <Outlet/>
    Nav.tsx                         top-bar tab navigation

  pages/
    AgentsHome.tsx                  cards grid + states
    AgentChat.tsx                   agent-ui rendered with RuntimeBridge
    SecretsPage.tsx                 placeholder (Slice 4)
    SettingsPage.tsx                placeholder (Slice 5)

  components/
    AgentCard.tsx                   one card on the home page
    HealthPill.tsx                  per-card health badge
    CapabilityBadges.tsx            streaming / tools / state / approvals

  config/
    defaultChatPage.ts              agent-ui page config (JS object)

  runtime/
    types.ts                        mirrored RuntimeEvent / AgentMetadata
    api.ts                          REST helpers (typed)
    sseStream.ts                    fetch + SSE → AsyncGenerator
    runtimeBridge.ts                AgentBridge over the runtime
```

The interesting file is [runtimeBridge.ts](src/runtime/runtimeBridge.ts) —
the translation seam between the runtime's normalized event schema and
`agent-ui`'s smaller event vocabulary. Future event types (trace timeline,
state inspector, approval prompts) plug in here.

## What's in Slice 1+2 — and what's not

**In:**

- React Router v6, persistent AppShell with top nav.
- `/` AgentsHome: cards grid, loading skeleton, empty state, error banner.
- `/agents/:id` AgentChat: metadata fetch, RuntimeBridge wiring,
  default chat layout rendered via agent-ui, working **Cancel run**.
- Typed runtime client (`api.ts`, `sseStream.ts`, `types.ts`,
  `runtimeBridge.ts`) — same boundary every later slice extends.

**Out (placeholders ship, real impl arrives in later slices):**

- Per-agent `ui.yaml` (Slice 3).
- Secrets CRUD + worker env injection (Slice 4).
- Settings page (Slice 5).

**Out (deferred, per spec):**

- Multi-turn conversation persistence — needs platform backend.
- Agent registration via the UI — drop folders into `PLATFORM_AGENTS_DIR`.
- Markdown / code-block rendering in messages.
- Auth.

See [specs.md](specs.md) for the full slice plan and rationale.
