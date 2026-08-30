import { Panel } from "@/components/ui";

/** Shown while a route segment is loading (App Router). */
export default function RootLoading() {
  return (
    <div className="min-h-[100dvh] bg-cloud px-4 py-8 pt-[env(safe-area-inset-top)]">
      <div className="mx-auto max-w-6xl space-y-4">
        <div className="h-8 w-48 animate-pulse rounded-[var(--bs-radius)] bg-white/80" />
        <Panel className="p-6">
          <div className="space-y-3">
            <div className="h-4 w-2/3 animate-pulse rounded bg-slate-100" />
            <div className="h-4 w-1/2 animate-pulse rounded bg-slate-100" />
            <div className="h-32 animate-pulse rounded-[var(--bs-radius)] bg-slate-50" />
          </div>
        </Panel>
      </div>
    </div>
  );
}
