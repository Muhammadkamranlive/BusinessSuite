import { cn } from "@/lib/utils";

const statusTones: Record<string, "neutral" | "success" | "warning" | "danger" | "info"> = {
  draft: "neutral",
  active: "success",
  inactive: "neutral",
  pending: "warning",
  approved: "success",
  rejected: "danger",
  paid: "success",
  partially_paid: "info",
  unpaid: "warning",
  overdue: "danger",
  cancelled: "danger",
  posted: "success",
  sent: "info",
  confirmed: "success",
  received: "success",
  open: "info",
  won: "success",
  lost: "danger",
  new: "info",
  contacted: "info",
  qualified: "success",
  converted: "success",
  present: "success",
  absent: "danger",
  late: "warning",
  leave: "info",
  processed: "success"
};

export function StatusBadge({ status }: { status: string }) {
  const normalized = status.toLowerCase().replace(/\s+/g, "_");
  const tone = statusTones[normalized] ?? "neutral";
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-md border px-2 py-1 text-xs font-semibold capitalize",
        tone === "neutral" && "border-line bg-white text-slate-600",
        tone === "success" && "border-emerald-200 bg-emerald-50 text-emerald-700",
        tone === "warning" && "border-amber-200 bg-amber-50 text-amber-700",
        tone === "danger" && "border-rose-200 bg-rose-50 text-rose-700",
        tone === "info" && "border-cyan-200 bg-cyan-50 text-cyan-700"
      )}
    >
      {status.replace(/_/g, " ")}
    </span>
  );
}
