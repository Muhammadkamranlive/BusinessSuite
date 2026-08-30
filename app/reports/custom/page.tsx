"use client";

import { useMemo, useState } from "react";
import { FileDown } from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { ModuleBreadcrumbs } from "@/components/common/module-breadcrumbs";
import { Button, Panel, SectionHeader, SelectInput } from "@/components/ui";
import { getStoredTenantId } from "@/lib/auth/session";
import type { ReportDomain } from "@/modules/reporting/model";
import { buildTenantWarehouse } from "@/modules/reporting/services/data-warehouse";
import { downloadDomainReportPdf } from "@/modules/reporting/services/report-pdfs";
import { saveBiSnapshot } from "@/modules/reporting/services/snapshots.store";

const DOMAINS: Array<{ value: ReportDomain; label: string; hint: string }> = [
  { value: "executive", label: "Executive pack", hint: "Cross-module KPIs" },
  { value: "sales", label: "Sales", hint: "Invoices, AR, payments" },
  { value: "inventory", label: "Inventory", hint: "Stock & valuation" },
  { value: "purchases", label: "Purchases", hint: "POs & suppliers" },
  { value: "finance", label: "Finance", hint: "P&L and expenses" },
  { value: "crm", label: "CRM", hint: "Leads & deals" },
  { value: "hrm", label: "HRM", hint: "Headcount & leaves" }
];

export default function CustomReportPage() {
  const tenantId = getStoredTenantId() ?? "alpha";
  const wh = useMemo(() => buildTenantWarehouse(tenantId), [tenantId]);
  const [domain, setDomain] = useState<ReportDomain>("executive");
  const [saved, setSaved] = useState("");

  const selected = DOMAINS.find((d) => d.value === domain)!;

  return (
    <AppShell activeModule="reports">
      <ModuleBreadcrumbs trail={[{ label: "Custom report" }]} />
      <SectionHeader
        title="Custom report"
        eyebrow={wh.branding.legalName}
      />
      <p className="mb-4 text-sm text-slate-500">
        Pick a domain and download a tenant-branded PDF from the live Data Warehouse.
      </p>

      <Panel className="mt-4 max-w-xl">
        <label className="mb-2 block text-sm font-semibold text-ink">Report domain</label>
        <SelectInput value={domain} onChange={(e) => setDomain(e.target.value as ReportDomain)}>
          {DOMAINS.map((d) => (
            <option key={d.value} value={d.value}>
              {d.label}
            </option>
          ))}
        </SelectInput>
        <p className="mt-2 text-sm text-slate-500">{selected.hint}</p>
        <p className="mt-1 text-xs text-slate-400">
          Letterhead: {wh.branding.title}
          {wh.branding.tagline ? ` · ${wh.branding.tagline}` : ""}
        </p>
        <div className="mt-4 flex flex-wrap gap-2">
          <Button onClick={() => downloadDomainReportPdf(wh, domain)}>
            <FileDown className="size-4" /> Download branded PDF
          </Button>
          <Button
            variant="secondary"
            onClick={() => {
              saveBiSnapshot(wh, domain, `${selected.label} custom`);
              setSaved(`Saved ${selected.label} snapshot`);
            }}
          >
            Save snapshot
          </Button>
        </div>
        {saved ? <p className="mt-2 text-sm text-teal">{saved}</p> : null}
      </Panel>
    </AppShell>
  );
}
