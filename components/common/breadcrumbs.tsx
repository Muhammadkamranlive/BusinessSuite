"use client";

import Link from "next/link";
import { ChevronRight, Home } from "lucide-react";
import { cn } from "@/lib/utils";

export type Crumb = {
  label: string;
  href?: string;
};

export function Breadcrumbs({
  items,
  className
}: {
  items: Crumb[];
  className?: string;
}) {
  if (!items.length) return null;

  return (
    <nav aria-label="Breadcrumb" className={cn("mb-3", className)}>
      <ol className="flex flex-wrap items-center gap-1 text-sm">
        <li className="flex items-center gap-1">
          <Link
            href="/dashboard"
            className="inline-flex items-center gap-1.5 rounded-[var(--bs-radius)] px-1.5 py-0.5 font-semibold text-slate-500 transition hover:bg-cloud hover:text-ink"
          >
            <Home className="size-3.5" aria-hidden="true" />
            Home
          </Link>
        </li>
        {items.map((item, index) => {
          const isLast = index === items.length - 1;
          return (
            <li key={`${item.label}-${index}`} className="flex items-center gap-1">
              <ChevronRight className="size-3.5 shrink-0 text-slate-300" aria-hidden="true" />
              {isLast || !item.href ? (
                <span className="rounded-[var(--bs-radius)] bg-cloud px-1.5 py-0.5 font-bold text-ink" aria-current="page">
                  {item.label}
                </span>
              ) : (
                <Link
                  href={item.href}
                  className="rounded-[var(--bs-radius)] px-1.5 py-0.5 font-semibold text-slate-500 transition hover:bg-cloud hover:text-ink"
                >
                  {item.label}
                </Link>
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
