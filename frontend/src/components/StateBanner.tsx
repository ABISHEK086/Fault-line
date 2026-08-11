export function LoadingBanner({ label = "Loading" }: { label?: string }) {
  return (
    <div className="flex items-center gap-3 rounded border border-line bg-panel px-4 py-6 font-mono text-sm text-muted">
      <span className="relative flex h-2.5 w-2.5">
        <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-steady opacity-60" />
        <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-steady" />
      </span>
      {label}…
    </div>
  );
}

export function ErrorBanner({ message }: { message: string }) {
  return (
    <div className="rounded border border-signaldim bg-panel px-4 py-6">
      <p className="font-mono text-sm text-signal">Connection failed</p>
      <p className="mt-1 text-sm text-muted">{message}</p>
      <p className="mt-3 text-xs text-muted">
        Check that the Flask API is running and{" "}
        <code className="rounded bg-panel2 px-1 py-0.5 text-[11px]">NEXT_PUBLIC_API_URL</code>{" "}
        points at it, and that your CognoDB instance is reachable.
      </p>
    </div>
  );
}

export function EmptyBanner({ title, hint }: { title: string; hint?: string }) {
  return (
    <div className="rounded border border-dashed border-line px-4 py-8 text-center">
      <p className="text-sm text-paper">{title}</p>
      {hint && <p className="mt-1 text-xs text-muted">{hint}</p>}
    </div>
  );
}
