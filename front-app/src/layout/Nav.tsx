import { NavLink } from "react-router-dom";

/**
 * Top navigation bar. `NavLink` from react-router automatically applies
 * the `active` class when the current URL matches the link's `to`. We
 * use that to style the current page's tab.
 */
export function Nav(): JSX.Element {
  return (
    <header className="border-b border-border bg-card">
      <div className="mx-auto flex h-14 max-w-6xl items-center gap-6 px-6">
        <div className="font-semibold tracking-tight">Platform Runtime</div>
        <nav className="flex items-center gap-1 text-sm">
          <Tab to="/">Agents</Tab>
          <Tab to="/secrets">Secrets</Tab>
          <Tab to="/settings">Settings</Tab>
        </nav>
      </div>
    </header>
  );
}

function Tab({
  to,
  children,
}: {
  to: string;
  children: React.ReactNode;
}): JSX.Element {
  return (
    <NavLink
      to={to}
      end={to === "/"}
      className={({ isActive }) =>
        [
          "rounded-md px-3 py-1.5 transition-colors",
          isActive
            ? "bg-secondary text-secondary-foreground"
            : "text-muted-foreground hover:bg-secondary/50 hover:text-foreground",
        ].join(" ")
      }
    >
      {children}
    </NavLink>
  );
}
