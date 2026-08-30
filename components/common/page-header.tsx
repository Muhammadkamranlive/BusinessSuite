import { Button } from "@/components/ui";

export function PageHeader({
  title,
  description,
  actionLabel,
  onAction,
  actionHref
}: {
  title: string;
  description?: string;
  actionLabel?: string;
  onAction?: () => void;
  actionHref?: string;
}) {
  return (
    <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <div className="min-w-0">
        <h1 className="text-xl font-bold text-ink sm:text-2xl">{title}</h1>
        {description ? <p className="mt-1 text-sm text-slate-500">{description}</p> : null}
      </div>
      {actionLabel && actionHref ? (
        <Button href={actionHref} className="w-full shrink-0 sm:w-auto">
          {actionLabel}
        </Button>
      ) : actionLabel && onAction ? (
        <Button className="w-full shrink-0 sm:w-auto" onClick={onAction}>
          {actionLabel}
        </Button>
      ) : null}
    </div>
  );
}
