import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { AppShell } from "./layout/AppShell.js";
import { AgentsHome } from "./pages/AgentsHome.js";
import { AgentChat } from "./pages/AgentChat.js";
import { SecretsPage } from "./pages/SecretsPage.js";
import { SettingsPage } from "./pages/SettingsPage.js";

/**
 * Router root. `AppShell` provides the persistent top nav and renders an
 * <Outlet/> for the active route.
 *
 * Why BrowserRouter (and not HashRouter): bookmarkable, shareable URLs.
 * The Vite dev server serves index.html as the SPA fallback by default.
 * For production hosting, configure the same fallback.
 */
export function App(): JSX.Element {
  return (
    <BrowserRouter>
      <Routes>
        <Route element={<AppShell />}>
          <Route index element={<AgentsHome />} />
          <Route path="agents/:agentId" element={<AgentChat />} />
          <Route path="secrets" element={<SecretsPage />} />
          <Route path="settings" element={<SettingsPage />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}
