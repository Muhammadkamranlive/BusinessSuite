"use client";

import { ArrowDown, ArrowRight, CheckCircle2, FileUp, ShieldAlert, UserPlus } from "lucide-react";
import { Badge } from "@/components/ui";
import { cn } from "@/lib/utils";
import {
  documentHistoryLabels,
  type DocumentChangeEvent,
  type DocumentHistoryAction
} from "@/modules/documents/model";

function actionTone(action: DocumentHistoryAction): "info" | "success" | "warning" | "danger" | "neutral" {
  if (action === "assigned") return "info";
  if (action === "uploaded") return "warning";
  if (action === "verified") return "success";
  if (action === "rejected") return "danger";
  return "neutral";
}

function ActionIcon({ action }: { action: DocumentHistoryAction }) {
  const cls = "size-3.5";
  if (action === "assigned") return <UserPlus className={cls} />;
  if (action === "uploaded") return <FileUp className={cls} />;
  if (action === "verified") return <CheckCircle2 className={cls} />;
  if (action === "rejected") return <ShieldAlert className={cls} />;
  return <ArrowRight className={cls} />;
}

export function DocumentChangeTimeline({
  events,
  empty = "No assignment history yet."
}: {
  events: DocumentChangeEvent[];
  empty?: string;
}) {
  const ordered = [...events].sort((a, b) => a.created_at.localeCompare(b.created_at));
  if (!ordered.length) {
    return <p className="py-6 text-center text-sm text-slate-500">{empty}</p>;
  }

  return (
    <ol className="bs-doc-timeline">
      {ordered.map((event, index) => (
        <li key={event.id} className="bs-doc-timeline-item">
          <div className={cn("bs-doc-timeline-node", `bs-doc-timeline-${event.action}`)}>
            <ActionIcon action={event.action} />
          </div>
          {index < ordered.length - 1 ? (
            <span className="bs-doc-timeline-arrow" aria-hidden="true">
              <ArrowDown className="size-3.5" />
            </span>
          ) : null}
          <div className="min-w-0 flex-1 pb-5">
            <div className="flex flex-wrap items-center gap-2">
              <Badge tone={actionTone(event.action)}>{documentHistoryLabels[event.action]}</Badge>
              <time className="text-xs text-slate-400">{new Date(event.created_at).toLocaleString()}</time>
            </div>
            <p className="mt-1.5 flex flex-wrap items-center gap-1.5 text-sm font-semibold text-ink">
              <span>{event.from_label}</span>
              <ArrowRight className="size-3.5 shrink-0 text-teal" aria-hidden="true" />
              <span>{event.to_label}</span>
            </p>
            <p className="mt-1 text-sm leading-6 text-slate-600">{event.message}</p>
          </div>
        </li>
      ))}
    </ol>
  );
}
