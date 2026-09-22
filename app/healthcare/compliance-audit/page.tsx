"use client";

import { useEffect, useMemo, useState } from "react";
import { AppShell } from "@/components/app-shell";
import { ModuleBreadcrumbs } from "@/components/common/module-breadcrumbs";
import { PageHeader } from "@/components/common/page-header";
import { DataListToolbar } from "@/components/common/data-list-toolbar";
import { Panel } from "@/components/ui";
import { getStoredTenantId } from "@/lib/auth/session";
import { exportListCsv, exportListPdf } from "@/lib/list-export";
import { filterAndSort } from "@/lib/list-query";
import {
  listComplianceEvents,
  pullMarketplaceFromSupabase,
  subscribeMarketplace,
  type ComplianceEvent
} from "@/modules/healthcare/services/pharmacy-marketplace.store";

export default function ComplianceAuditPage() {
  const tenantId = getStoredTenantId() ?? "alpha";
  const [rows, setRows] = useState<ComplianceEvent[]>([]);
  const [search, setSearch] = useState("");
  const [sortField, setSortField] = useState("created_at");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");

  useEffect(() => {
    void pullMarketplaceFromSupabase(tenantId).finally(() => setRows(listComplianceEvents(tenantId)));
    return subscribeMarketplace(() => setRows(listComplianceEvents(tenantId)));
  }, [tenantId]);

  const filtered = useMemo(
    () =>
      filterAndSort(rows as unknown as Array<Record<string, unknown>>, {
        search,
        searchFields: ["actor", "action", "entity_type", "detail"],
        sortField,
        sortDir
      }) as unknown as ComplianceEvent[],
    [rows, search, sortField, sortDir]
  );

  return (
    <AppShell activeModule="healthcare">
      <ModuleBreadcrumbs />
      <PageHeader
        title="Compliance audit"
        description="Who accessed or changed provider credentials, orders, and PHI-touching marketplace records."
      />
      <Panel>
        <DataListToolbar
          search={search}
          onSearchChange={setSearch}
          sortValue={sortField}
          sortOptions={[
            { value: "created_at", label: "Time" },
            { value: "actor", label: "Actor" },
            { value: "entity_type", label: "Entity" }
          ]}
          onSortChange={setSortField}
          sortDir={sortDir}
          onSortDirChange={setSortDir}
          onExportCsv={() =>
            exportListCsv({
              tenantId,
              module: "healthcare",
              filename: "compliance-audit",
              rows: filtered.map((r) => ({
                Time: r.created_at,
                Actor: r.actor,
                Action: r.action,
                Entity: r.entity_type,
                PHI: r.phi_touch ? "yes" : "no",
                Detail: r.detail
              }))
            })
          }
          onExportPdf={() =>
            exportListPdf({
              tenantId,
              module: "healthcare",
              title: "Compliance audit",
              filename: "compliance-audit",
              columns: ["Time", "Actor", "Action", "Entity", "PHI"],
              rows: filtered.map((r) => [
                r.created_at.slice(0, 19).replace("T", " "),
                r.actor,
                r.action,
                r.entity_type,
                r.phi_touch ? "yes" : "no"
              ])
            })
          }
        />
        <div className="mt-3 overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-slate-500">
                <th className="px-3 py-2">When</th>
                <th>Actor</th>
                <th>Action</th>
                <th>Entity</th>
                <th>PHI</th>
                <th>Detail</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((row) => (
                <tr key={row.id} className="border-t border-line">
                  <td className="px-3 py-3 whitespace-nowrap">{row.created_at.slice(0, 19).replace("T", " ")}</td>
                  <td>{row.actor}</td>
                  <td>{row.action}</td>
                  <td>
                    {row.entity_type}
                    {row.entity_id ? <div className="text-xs text-slate-500">{row.entity_id.slice(0, 8)}…</div> : null}
                  </td>
                  <td>{row.phi_touch ? "Yes" : "No"}</td>
                  <td className="max-w-md">{row.detail}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Panel>
    </AppShell>
  );
}
