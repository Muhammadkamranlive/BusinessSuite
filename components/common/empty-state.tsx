import Link from "next/link";
import { Button, Panel } from "@/components/ui";

export function EmptyState({
  title,
  description,
  actionLabel,
  actionHref,
  onAction
}: {
  title: string;
  description?: string;
  actionLabel?: string;
  actionHref?: string;
  onAction?: () => void;
}) {
  return (
    <Panel className="flex min-h-[240px] flex-col items-center justify-center text-center">
      <p className="text-lg font-bold text-ink">{title}</p>
      {description ? <p className="mt-2 max-w-md text-sm text-slate-500">{description}</p> : null}
      {actionLabel && actionHref ? (
        <Link
          href={actionHref}
          className="mt-5 inline-flex items-center rounded-[var(--bs-radius)] bg-[color:var(--bs-teal)] px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:opacity-90"
        >
          {actionLabel}
        </Link>
      ) : actionLabel && onAction ? (
        <Button type="button" className="mt-5" onClick={onAction}>
          {actionLabel}
        </Button>
      ) : null}
    </Panel>
  );
}
