/**
 * Slice 5 will replace this placeholder with the actual settings UI:
 * runtime URL override, theme switch, log verbosity, plus a read-only
 * view of `GET /config` from the runtime.
 */
export function SettingsPage(): JSX.Element {
  return (
    <div className="mx-auto w-full max-w-3xl flex-1 px-6 py-8">
      <header className="mb-6">
        <h1 className="text-2xl font-semibold tracking-tight">Settings</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          App-level preferences and runtime info.
        </p>
      </header>
      <div className="rounded-lg border border-dashed border-border p-8 text-center text-sm text-muted-foreground">
        <p className="font-medium text-foreground">Coming in Slice 5.</p>
        <p className="mt-1">
          Theme, runtime URL, log verbosity, runtime version + isolation mode.
        </p>
      </div>
    </div>
  );
}
