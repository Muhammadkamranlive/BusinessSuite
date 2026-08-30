"use client";

import type { CompanyProfile } from "@/modules/hrm/model";

export function CompanyLetterhead({
  company,
  subtitle
}: {
  company?: CompanyProfile | null;
  subtitle?: string;
}) {
  if (!company) return null;
  const title = company.letterhead_title?.trim() || company.legal_name;
  const color = company.brand_color?.trim() || "var(--bs-teal)";

  return (
    <header
      className="mb-6 rounded-[var(--bs-radius)] border border-line bg-white p-4"
      style={{ borderTopWidth: 4, borderTopColor: color }}
    >
      <div className="flex flex-wrap items-start gap-4">
        {company.logo_data_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={company.logo_data_url}
            alt={`${title} logo`}
            className="h-14 w-auto max-w-[160px] object-contain"
          />
        ) : (
          <div
            className="flex size-14 items-center justify-center rounded-[var(--bs-radius)] text-lg font-bold text-white"
            style={{ backgroundColor: color }}
            aria-hidden="true"
          >
            {title.slice(0, 1).toUpperCase()}
          </div>
        )}
        <div className="min-w-0 flex-1">
          <p className="text-lg font-bold text-ink">{title}</p>
          {company.letterhead_tagline ? (
            <p className="text-sm font-semibold text-slate-600">{company.letterhead_tagline}</p>
          ) : null}
          {subtitle ? <p className="mt-1 text-sm text-slate-500">{subtitle}</p> : null}
          <div className="mt-2 space-y-0.5 text-xs text-slate-500">
            {company.address ? <p>{company.address}</p> : null}
            <p>
              {[company.phone, company.email, company.ntn ? `Tax: ${company.ntn}` : null]
                .filter(Boolean)
                .join(" · ")}
            </p>
          </div>
        </div>
      </div>
      {company.letterhead_footer ? (
        <p className="mt-3 border-t border-line pt-2 text-[11px] text-slate-400">{company.letterhead_footer}</p>
      ) : null}
    </header>
  );
}
