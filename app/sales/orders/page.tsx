"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { AppShell } from "@/components/app-shell";
import { ModuleBreadcrumbs } from "@/components/common/module-breadcrumbs";
import { PageHeader } from "@/components/common/page-header";
import { StatusBadge } from "@/components/common/status-badge";
import { DataListToolbar } from "@/components/common/data-list-toolbar";
import { RecordRowActions } from "@/components/common/record-row-actions";
import { useConfirm } from "@/components/common/use-confirm";
import { ExtraFieldsBlock } from "@/components/forms/extra-fields-block";
import { ExtraFieldsReadout } from "@/components/forms/extra-fields-readout";
import { Button, Field, Panel, SelectInput, TextInput } from "@/components/ui";
import { DocumentLinesEditor } from "@/components/ops/document-lines-editor";
import { getStoredTenantId } from "@/lib/auth/session";
import { exportListCsv, exportListPdf } from "@/lib/list-export";
import { filterAndSort } from "@/lib/list-query";
import { getExtraFieldValues, persistExtraFields } from "@/modules/forms/services/extra-fields.store";
import { money } from "@/lib/utils";
import { listCustomers } from "@/modules/crm/services/crm.store";
import { listProducts } from "@/modules/inventory/services/inventory.store";
import { emptyDocumentLine, linesSubtotal, type DocumentLine } from "@/modules/ops/document-line";
import {
  createSalesOrder,
  fulfillSalesOrder,
  invoiceFromSalesOrder,
  listSalesOrders,
  trashSalesOrder,
  updateSalesOrder,
  type SalesOrder
} from "@/modules/sales/services/sales.store";

const empty = {
  customer_name: "",
  order_date: new Date().toISOString().slice(0, 10),
  status: "confirmed" as SalesOrder["status"]
};

export default function SalesOrdersPage() {
  const router = useRouter();
  const tenantId = getStoredTenantId() ?? "alpha";
  const { askSave, askTrash, dialog } = useConfirm();
  const [rows, setRows] = useState<SalesOrder[]>([]);
  const [customers, setCustomers] = useState<ReturnType<typeof listCustomers>>([]);
  const [products, setProducts] = useState<ReturnType<typeof listProducts>>([]);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [sortField, setSortField] = useState("order_no");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");
  const [openForm, setOpenForm] = useState(false);
  const [editing, setEditing] = useState<SalesOrder | null>(null);
  const [error, setError] = useState("");
  const [form, setForm] = useState(empty);
  const [lines, setLines] = useState<DocumentLine[]>([emptyDocumentLine()]);
  const [extraJson, setExtraJson] = useState("");

  function refresh() {
    setRows(listSalesOrders(tenantId));
    setCustomers(listCustomers(tenantId));
    setProducts(listProducts(tenantId));
  }

  useEffect(() => {
    refresh();
  }, [tenantId]);

  const filtered = useMemo(
    () =>
      filterAndSort(rows as unknown as Array<Record<string, unknown>>, {
        search,
        searchFields: ["order_no", "customer_name", "status"],
        statusField: "status",
        statusValue: statusFilter,
        sortField,
        sortDir
      }) as unknown as SalesOrder[],
    [rows, search, statusFilter, sortField, sortDir]
  );

  function openCreate() {
    setEditing(null);
    setForm({ ...empty, order_date: new Date().toISOString().slice(0, 10) });
    setLines([emptyDocumentLine()]);
    setExtraJson("");
    setError("");
    setOpenForm(true);
  }

  function openEdit(row: SalesOrder) {
    setEditing(row);
    setForm({
      customer_name: row.customer_name,
      order_date: row.order_date,
      status: row.status
    });
    setLines(row.lines?.length ? row.lines : [emptyDocumentLine()]);
    setExtraJson(getExtraFieldValues(tenantId, "sales.order", row.id));
    setError("");
    setOpenForm(true);
  }

  function doSave() {
    setError("");
    if (!form.customer_name.trim()) {
      setError("Customer is required.");
      return;
    }
    const payload = {
      customer_name: form.customer_name.trim(),
      order_date: form.order_date,
      status: form.status,
      total_amount: linesSubtotal(lines),
      lines,
      quotation_id: editing?.quotation_id,
      warehouse_id: editing?.warehouse_id
    };
    if (editing) {
      updateSalesOrder(editing.id, payload);
      persistExtraFields(tenantId, "sales.order", editing.id, extraJson);
    } else {
      const row = createSalesOrder(tenantId, payload);
      persistExtraFields(tenantId, "sales.order", row.id, extraJson);
    }
    setExtraJson("");
    setForm({ ...empty, order_date: new Date().toISOString().slice(0, 10) });
    setLines([emptyDocumentLine()]);
    setEditing(null);
    setOpenForm(false);
    refresh();
  }

  function submit(e: React.FormEvent) {
    e.preventDefault();
    askSave({
      editing: Boolean(editing),
      entityLabel: "sales order",
      onConfirm: doSave
    });
  }

  return (
    <AppShell activeModule="sales">
      <PageHeader
        title="Sales Orders"
        description="Fulfill depletes stock. Invoice copies lines to AR."
        actionLabel="New sales order"
        onAction={openCreate}
      />
      <ModuleBreadcrumbs />
      {openForm ? (
        <Panel className="mb-4">
          <form onSubmit={submit} className="grid gap-3 md:grid-cols-2">
            {error ? <p className="md:col-span-2 text-sm text-rose-600">{error}</p> : null}
            <Field label="Customer">
              <SelectInput value={form.customer_name} onChange={(e) => setForm({ ...form, customer_name: e.target.value })}>
                <option value="">Select…</option>
                {customers.map((c) => (
                  <option key={c.id} value={c.name}>
                    {c.name}
                  </option>
                ))}
              </SelectInput>
            </Field>
            <Field label="Or type name">
              <TextInput value={form.customer_name} onChange={(e) => setForm({ ...form, customer_name: e.target.value })} required />
            </Field>
            <Field label="Order date">
              <TextInput type="date" value={form.order_date} onChange={(e) => setForm({ ...form, order_date: e.target.value })} />
            </Field>
            <Field label="Status">
              <SelectInput value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value as SalesOrder["status"] })}>
                {["draft", "confirmed", "fulfilled", "cancelled"].map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </SelectInput>
            </Field>
            <DocumentLinesEditor lines={lines} onChange={setLines} products={products} tenantId={tenantId} />
            <ExtraFieldsBlock formKey="sales.order" valueJson={extraJson} onChange={setExtraJson} />
            <div className="md:col-span-2 flex gap-2">
              <Button type="submit">{editing ? "Update order" : "Save order"}</Button>
              <Button
                type="button"
                variant="secondary"
                onClick={() => {
                  setExtraJson("");
                  setEditing(null);
                  setOpenForm(false);
                }}
              >
                Cancel
              </Button>
            </div>
          </form>
        </Panel>
      ) : null}
      <Panel>
        <DataListToolbar
          search={search}
          onSearchChange={setSearch}
          searchPlaceholder="Search orders…"
          filterLabel="statuses"
          filterValue={statusFilter}
          filterOptions={[
            { value: "draft", label: "draft" },
            { value: "confirmed", label: "confirmed" },
            { value: "fulfilled", label: "fulfilled" },
            { value: "cancelled", label: "cancelled" }
          ]}
          onFilterChange={setStatusFilter}
          sortValue={sortField}
          sortOptions={[
            { value: "order_no", label: "Order no" },
            { value: "customer_name", label: "Customer" },
            { value: "order_date", label: "Date" },
            { value: "total_amount", label: "Amount" },
            { value: "status", label: "Status" }
          ]}
          onSortChange={setSortField}
          sortDir={sortDir}
          onSortDirChange={setSortDir}
          onExportCsv={() =>
            exportListCsv({
              tenantId,
              module: "sales",
              filename: "sales-orders",
              rows: filtered.map((r) => ({
                No: r.order_no,
                Customer: r.customer_name,
                Date: r.order_date,
                Amount: r.total_amount,
                Status: r.status
              }))
            })
          }
          onExportPdf={() =>
            exportListPdf({
              tenantId,
              module: "sales",
              title: "Sales Orders",
              filename: "sales-orders",
              columns: ["No", "Customer", "Date", "Amount", "Status"],
              rows: filtered.map((r) => [r.order_no, r.customer_name, r.order_date, String(r.total_amount), r.status])
            })
          }
        />
        <table className="min-w-full text-left text-sm">
          <thead>
            <tr className="border-b border-line bg-cloud">
              {["Order No", "Customer", "Date", "Amount", "Status", "Credit", ""].map((h) => (
                <th key={h || "a"} className="px-3 py-3 font-semibold text-slate-600">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filtered.map((r) => (
              <tr key={r.id} className="border-b border-line">
                <td className="px-3 py-3 font-medium">
                  {r.order_no}
                  <ExtraFieldsReadout tenantId={tenantId} formKey="sales.order" recordId={r.id} />
                </td>
                <td className="px-3 py-3">{r.customer_name}</td>
                <td className="px-3 py-3">{r.order_date}</td>
                <td className="px-3 py-3">{money(r.total_amount)}</td>
                <td className="px-3 py-3">
                  <StatusBadge status={r.status} />
                </td>
                <td className="px-3 py-3">
                  {r.credit_hold ? <StatusBadge status="hold" /> : <span className="text-slate-400">ok</span>}
                </td>
                <td className="px-3 py-3">
                  <div className="flex flex-wrap gap-2">
                    <RecordRowActions
                      onEdit={() => openEdit(r)}
                      onTrash={() =>
                        askTrash({
                          entityLabel: "sales order",
                          name: r.order_no,
                          onConfirm: () => {
                            trashSalesOrder(r.id);
                            refresh();
                          }
                        })
                      }
                    />
                    {r.status !== "fulfilled" && r.status !== "cancelled" && !r.credit_hold ? (
                      <Button
                        variant="secondary"
                        className="!min-h-8 !px-3 !text-xs"
                        onClick={() => {
                          fulfillSalesOrder(tenantId, r.id);
                          refresh();
                        }}
                      >
                        Fulfill
                      </Button>
                    ) : null}
                    <Button
                      variant="secondary"
                      className="!min-h-8 !px-3 !text-xs"
                      onClick={() => {
                        invoiceFromSalesOrder(tenantId, r.id);
                        router.push("/sales/invoices");
                      }}
                    >
                      Invoice
                    </Button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </Panel>
      {dialog}
    </AppShell>
  );
}
