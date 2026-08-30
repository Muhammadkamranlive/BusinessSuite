import { Panel } from "@/components/ui";

export function EmptyState({ title, description }: { title: string; description?: string }) {
  return (
    <Panel className="flex min-h-[240px] flex-col items-center justify-center text-center">
      <p className="text-lg font-bold text-ink">{title}</p>
      {description ? <p className="mt-2 max-w-md text-sm text-slate-500">{description}</p> : null}
    </Panel>
  );
}
