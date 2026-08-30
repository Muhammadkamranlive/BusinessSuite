import type { LucideIcon } from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/utils";

export function Button({
  children,
  className,
  variant = "primary",
  href,
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "secondary" | "ghost" | "danger";
  href?: string;
}) {
  const cls = cn(
    "bs-btn focus:outline-none focus:ring-2 focus:ring-[color:var(--bs-focus)] focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50",
    variant === "primary" && "bs-btn-primary",
    variant === "secondary" && "bs-btn-secondary",
    variant === "ghost" && "bs-btn-ghost",
    variant === "danger" && "bg-[color:var(--bs-coral)] text-white hover:brightness-110",
    className
  );
  if (href) {
    return (
      <Link href={href} className={cls}>
        {children}
      </Link>
    );
  }
  return (
    <button className={cls} {...props}>
      {children}
    </button>
  );
}

export function Field({
  label,
  hint,
  error,
  children,
  className
}: {
  label: string;
  hint?: string;
  error?: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <label className={cn("block", className)}>
      <span className="mb-1.5 block text-sm font-semibold text-[color:var(--bs-ink)]">{label}</span>
      {children}
      {hint && !error ? <span className="mt-1 block text-xs text-slate-500">{hint}</span> : null}
      {error ? <span className="mt-1 block text-xs text-[color:var(--bs-coral)]">{error}</span> : null}
    </label>
  );
}

export function TextInput({ className, ...props }: React.InputHTMLAttributes<HTMLInputElement>) {
  return <input className={cn("bs-input", className)} {...props} />;
}

export function SelectInput({ className, children, ...props }: React.SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <div className="bs-select-wrap">
      <select className={cn("bs-input bs-select", className)} {...props}>
        {children}
      </select>
      <span className="bs-select-chevron" aria-hidden="true">
        <svg viewBox="0 0 20 20" fill="none" className="size-4">
          <path
            d="M5.5 7.5 10 12l4.5-4.5"
            stroke="currentColor"
            strokeWidth="1.75"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </span>
    </div>
  );
}

export function TextArea({ className, ...props }: React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea className={cn("bs-textarea", className)} {...props} />;
}

export function Badge({
  children,
  tone = "neutral"
}: {
  children: React.ReactNode;
  tone?: "neutral" | "success" | "warning" | "danger" | "info";
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-[var(--bs-radius)] border px-2 py-1 text-xs font-semibold",
        tone === "neutral" && "border-[color:var(--bs-line)] bg-white text-slate-600",
        tone === "success" && "border-emerald-200 bg-emerald-50 text-emerald-700",
        tone === "warning" && "border-amber-200 bg-amber-50 text-amber-700",
        tone === "danger" && "border-rose-200 bg-rose-50 text-[color:var(--bs-coral)]",
        tone === "info" && "border-cyan-200 bg-cyan-50 text-cyan-700"
      )}
    >
      {children}
    </span>
  );
}

export function Panel({
  children,
  className
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return <section className={cn("bs-card p-4 sm:p-5", className)}>{children}</section>;
}

export function SectionHeader({
  title,
  eyebrow,
  action
}: {
  title: string;
  eyebrow?: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <div>
        {eyebrow ? <p className="text-xs font-bold uppercase tracking-wide text-[color:var(--bs-teal)]">{eyebrow}</p> : null}
        <h2 className="text-lg font-bold text-[color:var(--bs-ink)]">{title}</h2>
      </div>
      {action}
    </div>
  );
}

export function StatTile({
  label,
  value,
  detail,
  icon: Icon,
  tone = "teal"
}: {
  label: string;
  value: string;
  detail: string;
  icon: LucideIcon;
  tone?: "teal" | "coral" | "amber" | "mint";
}) {
  return (
    <section
      className={cn(
        "relative overflow-hidden rounded-[1.25rem] p-5 shadow-[0_12px_28px_color-mix(in_srgb,var(--bs-teal)_18%,transparent)]",
        tone === "teal" && "bs-stat-teal",
        tone === "coral" && "bs-stat-mid",
        tone === "amber" && "bs-stat-sky",
        tone === "mint" && "bs-stat-navy"
      )}
    >
      <Icon className="pointer-events-none absolute -bottom-3 -right-3 size-28 opacity-[0.18]" aria-hidden />
      <p className="text-sm font-medium opacity-80">{label}</p>
      <p className="relative mt-3 text-3xl font-bold tracking-tight">{value}</p>
      <div className="relative mt-4 border-t border-dashed border-[color:var(--stat-rule)] pt-3">
        <p className="text-xs font-medium opacity-80">{detail}</p>
      </div>
    </section>
  );
}

export function ActionCard({
  href,
  title,
  detail,
  icon: Icon,
  actionLabel = "Open"
}: {
  href: string;
  title: string;
  detail: string;
  icon: LucideIcon;
  actionLabel?: string;
}) {
  return (
    <Link href={href} className="bs-card group relative block overflow-hidden p-5 transition hover:-translate-y-0.5 sm:p-6">
      <span className="flex size-12 items-center justify-center rounded-2xl bg-[color:var(--bs-teal)] text-white shadow-[0_8px_18px_color-mix(in_srgb,var(--bs-teal)_35%,transparent)]">
        <Icon className="size-5" aria-hidden />
      </span>
      <p className="mt-4 text-base font-bold text-[color:var(--bs-ink)]">{title}</p>
      <p className="mt-1.5 text-sm leading-6 text-slate-500">{detail}</p>
      <div className="mt-4 flex items-center justify-between border-t border-dashed border-[color:var(--bs-line)] pt-3">
        <span className="text-sm font-semibold text-[color:var(--bs-teal)]">{actionLabel}</span>
        <span className="text-slate-300 transition group-hover:text-[color:var(--bs-teal)]">→</span>
      </div>
    </Link>
  );
}

export function DataTable({
  columns,
  rows
}: {
  columns: string[];
  rows: Array<Array<React.ReactNode>>;
}) {
  return (
    <div className="overflow-x-auto">
      <table className="min-w-full border-separate border-spacing-0 text-left text-sm">
        <thead>
          <tr>
            {columns.map((column) => (
              <th key={column} className="border-b border-[color:var(--bs-line)] bg-[color:var(--bs-cloud)] px-3 py-3 font-semibold text-slate-600">
                {column}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, index) => (
            <tr key={index} className="border-b border-[color:var(--bs-line)]">
              {row.map((cell, cellIndex) => (
                <td key={cellIndex} className="border-b border-[color:var(--bs-line)] px-3 py-3 text-slate-700">
                  {cell}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function EmptyAccess({ moduleName }: { moduleName: string }) {
  return (
    <Panel className="flex min-h-[320px] flex-col items-center justify-center text-center">
      <p className="text-lg font-bold text-[color:var(--bs-ink)]">Access restricted</p>
      <p className="mt-2 max-w-md text-sm text-slate-500">
        The selected account does not have permission to view {moduleName}. Ask an administrator to grant menu rights, or switch demo accounts.
      </p>
    </Panel>
  );
}
