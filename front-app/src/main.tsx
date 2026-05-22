import React from "react";
import ReactDOM from "react-dom/client";
import "./styles.css";

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <main className="flex min-h-screen items-center justify-center bg-background text-foreground">
      <div className="rounded-lg border border-border bg-card/40 p-8 text-center">
        <h1 className="text-base font-semibold tracking-tight">
          Front-app rewrite in progress
        </h1>
        <p className="mt-1 text-xs text-muted-foreground">
          The new end-user shell ships with milestone M4. See
          <code className="ml-1 font-mono text-[11px]">front-app/specs.md</code>.
        </p>
      </div>
    </main>
  </React.StrictMode>,
);
