"use client";

import { useEffect, useMemo, useState } from "react";
import { AppShell } from "@/components/app-shell";
import { ModuleBreadcrumbs } from "@/components/common/module-breadcrumbs";
import { PageHeader } from "@/components/common/page-header";
import { StatusBadge } from "@/components/common/status-badge";
import { DataListToolbar } from "@/components/common/data-list-toolbar";
import { Button, Field, Panel, SelectInput } from "@/components/ui";
import { getStoredTenantId } from "@/lib/auth/session";
import { exportListCsv, exportListPdf } from "@/lib/list-export";
import { filterAndSort } from "@/lib/list-query";
import { money } from "@/lib/utils";
import {
  listClinicOrders,
  listPharmacies,
  pullMarketplaceFromSupabase,
  setOrderStatus,
  subscribeMarketplace,
  type ClinicOrder
} from "@/modules/healthcare/services/pharmacy-marketplace.store";

export default function FulfillmentPage() {
  const tenantId = getStoredTenantId() ?? "alpha";
  const pharmacies = useMemo(() => listPharmacies(tenantId), [tenantId]);
  const [pharmacyId, setPharmacyId] = useState("all");
  const [rows, setRows] = useState<ClinicOrder[]>([]);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [sortField, setSortField] = useState("order_date");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");

  function refresh() {
    setRows(
      listClinicOrders(tenantId, {
        pharmacyId: pharmacyId === "all" ? undefined : pharmacyId
      })
    );
  }
  useEffect(() => {
    void pullMarketplaceFromSupabase(tenantId).finally(() => refresh());
    return subscribeMarketplace(() => refresh());
  }, [tenantId, pharmacyId]);

  const filtered = useMemo(
    () =>
      filterAndSort(rows as unknown as Array<Record<string, unknown>>, {
        search,
        searchFields: ["order_no", "patient_name", "provider_name", "status", "tracking_no"],
        statusField: "status",
        statusValue: statusFilter,
        sortField,
        sortDir
      }) as unknown as ClinicOrder[],
    [rows, search, statusFilter, sortField, sortDir]
  );

  return (
    <AppShell activeModule="healthcare">
      <ModuleBreadcrumbs />
      <PageHeader
        title="Pharmacy fulfillment"
        description="Partner dashboard: accept / reject orders, update status, and attach shipping tracking."
      />
      <Panel className="mb-4">
        <Field label="Pharmacy portal context">
          <SelectInput value={pharmacyId} onChange={(e) => setPharmacyId(e.target.value)}>
            <option value="all">All pharmacies</option>
            {pharmacies.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name} ({p.api_mode})
              </option>
            ))}
          </SelectInput>
        </Field>
      </Panel>
      <Panel>
        <DataListToolbar
          search={search}
          onSearchChange={setSearch}
          filterValue={statusFilter}
          filterOptions={[
            { value: "pending", label: "Pending" },
            { value: "processing", label: "Processing" },
            { value: "accepted", label: "Accepted" },
            { value: "shipped", label: "Shipped" },
            { value: "completed", label: "Completed" },
            { value: "rejected", label: "Rejected" }
          ]}
          onFilterChange={setStatusFilter}
          sortValue={sortField}
          sortOptions={[
            { value: "order_date", label: "Date" },
            { value: "order_no", label: "Order #" }
          ]}
          onSortChange={setSortField}
          sortDir={sortDir}
          onSortDirChange={setSortDir}
          onExportCsv={() =>
            exportListCsv({
              tenantId,
              module: "healthcare",
              filename: "fulfillment",
              rows: filtered.map((r) => ({
                Order: r.order_no,
                Pharmacy: r.pharmacy_name,
                Status: r.status,
                Tracking: r.tracking_no ?? "",
                Total: r.total_amount
              }))
            })
          }
          onExportPdf={() =>
            exportListPdf({
              tenantId,
              module: "healthcare",
              title: "Pharmacy fulfillment",
              filename: "fulfillment",
              columns: ["Order", "Pharmacy", "Status", "Tracking"],
              rows: filtered.map((r) => [r.order_no, r.pharmacy_name, r.status, r.tracking_no ?? ""])
            })
          }
        />
        <div className="mt-3 overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-slate-500">
                <th className="px-3 py-2">Order</th>
                <th>Patient / Rx</th>
                <th>Status</th>
                <th>Total</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((row) => (
                <tr key={row.id} className="border-t border-line">
                  <td className="px-3 py-3">
                    <div className="font-semibold">{row.order_no}</div>
                    <div className="text-xs text-slate-500">{row.pharmacy_name}</div>
                  </td>
                  <td>
                    {row.patient_name}
                    <div className="text-xs text-slate-500">
                      {row.lines.map((l) => `${l.product_name} ×${l.quantity}`).join(", ")}
                    </div>
                    {row.dosage_notes ? <div className="text-xs text-slate-500">Rx: {row.dosage_notes}</div> : null}
                  </td>
                  <td>
                    <StatusBadge status={row.status} />
                    {row.tracking_no ? <div className="text-xs text-slate-500">{row.tracking_no}</div> : null}
                    {row.invoice_no ? <div className="text-xs text-slate-500">Inv {row.invoice_no}</div> : null}
                  </td>
                  <td>{money(row.total_amount)}</td>
                  <td>
                    <div className="flex flex-wrap gap-1">
                      {row.status === "pending" ? (
                        <>
                          <Button
                            type="button"
                            variant="secondary"
                            className="!px-2 !py-1 text-xs"
                            onClick={() => {
                              setOrderStatus(row.id, "accepted", row.pharmacy_name);
                              refresh();
                            }}
                          >
                            Accept
                          </Button>
                          <Button
                            type="button"
                            variant="danger"
                            className="!px-2 !py-1 text-xs"
                            onClick={() => {
                              setOrderStatus(row.id, "rejected", row.pharmacy_name);
                              refresh();
                            }}
                          >
                            Reject
                          </Button>
                        </>
                      ) : null}
                      {row.status === "accepted" ? (
                        <Button
                          type="button"
                          variant="secondary"
                          className="!px-2 !py-1 text-xs"
                          onClick={() => {
                            setOrderStatus(row.id, "processing", row.pharmacy_name);
                            refresh();
                          }}
                        >
                          Process
                        </Button>
                      ) : null}
                      {["accepted", "processing"].includes(row.status) ? (
                        <Button
                          type="button"
                          variant="secondary"
                          className="!px-2 !py-1 text-xs"
                          onClick={() => {
                            setOrderStatus(row.id, "shipped", row.pharmacy_name);
                            refresh();
                          }}
                        >
                          Ship
                        </Button>
                      ) : null}
                      {row.status === "shipped" ? (
                        <Button
                          type="button"
                          variant="primary"
                          className="!px-2 !py-1 text-xs"
                          onClick={() => {
                            setOrderStatus(row.id, "completed", row.pharmacy_name);
                            refresh();
                          }}
                        >
                          Complete
                        </Button>
                      ) : null}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Panel>
    </AppShell>
  );
}
