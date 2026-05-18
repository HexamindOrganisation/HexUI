/**
 * Slice 4 will replace this placeholder with the actual secrets CRUD UI
 * backed by `GET /secrets`, `PUT /secrets/{key}`, `DELETE /secrets/{key}`
 * on the runtime.
 */
export function SecretsPage(): JSX.Element {
  return (
    <div className="mx-auto w-full max-w-3xl flex-1 px-6 py-8">
      <header className="mb-6">
        <h1 className="text-2xl font-semibold tracking-tight">Secrets</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Framework API keys, injected into worker processes at spawn time.
        </p>
      </header>
      <div className="rounded-lg border border-dashed border-border p-8 text-center text-sm text-muted-foreground">
        <p className="font-medium text-foreground">Coming in Slice 4.</p>
        <p className="mt-1">
          The runtime gains a secret store + four endpoints; this page becomes
          the CRUD UI.
        </p>
      </div>
    </div>
  );
}
