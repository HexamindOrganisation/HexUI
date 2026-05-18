import { Outlet } from "react-router-dom";
import { Nav } from "./Nav.js";

/**
 * Persistent shell rendered around every page.
 *
 * Layout:
 *   ┌──────────────────────────────────────────────────────────┐
 *   │  Brand    Agents · Secrets · Settings                    │
 *   ├──────────────────────────────────────────────────────────┤
 *   │                                                          │
 *   │  <Outlet /> — the active page                            │
 *   │                                                          │
 *   └──────────────────────────────────────────────────────────┘
 *
 * The page itself decides how to use its space. Some (AgentChat) take
 * the full height; others (AgentsHome, SecretsPage) flow with content.
 */
export function AppShell(): JSX.Element {
  return (
    <div className="min-h-screen flex flex-col bg-background text-foreground">
      <Nav />
      <main className="flex-1 min-h-0 flex flex-col">
        <Outlet />
      </main>
    </div>
  );
}
