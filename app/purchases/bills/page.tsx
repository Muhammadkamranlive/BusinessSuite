"use client";

import { useEffect, useMemo, useState } from "react";
import { AppShell } from "@/components/app-shell";
import { ModuleBreadcrumbs } from "@/components/common/module-breadcrumbs";
import { PageHeader } from "@/components/common/page-header";
import { StatusBadge } from "@/components/common/status-badge";
import { DataListToolbar } from "@/components/common/data-list-toolbar";
import { RecordRowActions } from "@/components/common/record-row-actions";
import { useConfirm } from "@/components/common/use-confirm";
import { Button, Field, Panel, SelectInput, TextInput } from "@/components/ui";
import { ExtraFieldsBlock } from "@/components/forms/extra-fields-block";
import { ExtraFieldsReadout } from "@/components/forms/extra-fields-readout";
import { DocumentLinesEditor } from "@/components/ops/document-lines-editor";
import { getStoredTenantId } from "@/lib/auth/session";
import { exportListCsv, exportListPdf } from "@/lib/list-export";
import { filterAndSort } from "@/lib/list-query";
import { money } from "@/lib/utils";
import { getExtraFieldValues, persistExtraFields } from "@/modules/forms/services/extra-fields.store";
import { listProducts } from "@/modules/inventory/services/inventory.store";
import { emptyDocumentLine, linesSubtotal, normalizeLines, type DocumentLine } from "@/modules/ops/document-line";
import {
  createVendorBill,
  getMatchTolerance,
  listGoodsReceipts,
  listPurchaseOrders,
  listSuppliers,
  listVendorBills,
  saveMatchTolerance,
  trashVendorBill,
  updateVendorBill,
  type VendorBill
} from "@/modules/purchase/services/purchase.store";

const empty = {
  supplier_name: "",
  bill_date: new Date().toISOString().slice(0, 10),
  due_date: "",
  status: "open" as VendorBill["status"],
  purchase_order_id: "",
  goods_receipt_id: ""
};

export default function VendorBillsPage() {
  const tenantId = getStoredTenantId() ?? "alpha";
  const { askSave, askTrash, dialog } = useConfirm();
  const [rows, setRows] = useState<VendorBill[]>([]);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [sortField, setSortField] = useState("bill_date");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");
  const [openForm, setOpenForm] = useState(false);
  const [editing, setEditing] = useState<VendorBill | null>(null);
  const [error, setError] = useState("");
  const [form, setForm] = useState(empty);
  const [lines, setLines] = useState<DocumentLine[]>([emptyDocumentLine()]);
  const [extraJson, setExtraJson] = useState("");
  const suppliers = listSuppliers(tenantId);
  const orders = listPurchaseOrders(tenantId);
  const receipts = listGoodsReceipts(tenantId);
  const products = listProducts(tenantId);

  function refresh() {
    setRows(listVendorBills(tenantId));
  }

  useEffect(() => {
    refresh();
  }, [tenantId]);

  const filtered = useMemo(
    () =>
      filterAndSort(rows as unknown as Array<Record<string, unknown>>, {
        search,
        searchFields: ["bill_no", "supplier_name", "status"],
        statusField: "status",
        statusValue: statusFilter,
        sortField,
        sortDir
      }) as unknown as VendorBill[],
    [rows, search, statusFilter, sortField, sortDir]
  );

  function openCreate() {
    setEditing(null);
    setForm({ ...empty, bill_date: new Date().toISOString().slice(0, 10) });
    setLines([emptyDocumentLine()]);
    setExtraJson("");
    setError("");
    setOpenForm(true);
  }

  function openEdit(row: VendorBill) {
    setEditing(row);
    setForm({
      supplier_name: row.supplier_name,
      bill_date: row.bill_date,
      due_date: row.due_date,
      status: row.status,
      purchase_order_id: row.purchase_order_id ?? "",
      goods_receipt_id: row.goods_receipt_id ?? ""
    });
    setLines(row.lines?.length ? row.lines : [emptyDocumentLine()]);
    setExtraJson(getExtraFieldValues(tenantId, "purchases.bill", row.id));
    setError("");
    setOpenForm(true);
  }

  function doSave() {
    setError("");
    if (!form.supplier_name.trim()) {
      setError("Supplier is required.");
      return;
    }
    const normalized = normalizeLines(lines);
    const payload = {
      supplier_name: form.supplier_name.trim(),
      bill_date: form.bill_date,
      due_date: form.due_date || form.bill_date,
      status: form.status,
      lines: normalized,
      total_amount: normalized.length ? linesSubtotal(normalized) : editing?.total_amount ?? 0,
      paid_amount: editing?.paid_amount ?? 0,
      purchase_order_id: form.purchase_order_id || null,
      goods_receipt_id: form.goods_receipt_id || null
    };
    try {
      if (editing) {
        updateVendorBill(editing.id, payload);
        persistExtraFields(tenantId, "purchases.bill", editing.id, extraJson);
      } else {
        const row = createVendorBill(tenantId, { ...payload, paid_amount: 0 });
        persistExtraFields(tenantId, "purchases.bill", row.id, extraJson);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not save supplier invoice.");
      return;
    }
    setExtraJson("");
    setForm({ ...empty, bill_date: new Date().toISOString().slice(0, 10) });
    setLines([emptyDocumentLine()]);
    setEditing(null);
    setOpenForm(false);
    refresh();
  }

  function submit(e: React.FormEvent) {
    e.preventDefault();
    askSave({
      editing: Boolean(editing),
      entityLabel: "vendor bill",
      onConfirm: doSave
    });
  }

  return (
    <AppShell activeModule="purchases">
      <PageHeader title="Supplier invoices" description="AP bills with three-way match against PO and goods receipt. Variance blocks posting." actionLabel="New supplier invoice" onAction={openCreate} />
      <ModuleBreadcrumbs />
      <Panel className="mb-4">
        <form
          className="grid gap-3 md:grid-cols-4"
          onSubmit={(e) => {
            e.preventDefault();
            const fd = new FormData(e.currentTarget);
            saveMatchTolerance(tenantId, {
              qty_pct: Number(fd.get("qty_pct")) || 2,
              amount_pct: Number(fd.get("amount_pct")) || 2
            });
          }}
        >
          <p className="md:col-span-4 text-sm text-slate-500">Match tolerance: bills outside this % vs PO/GRN quantity or amount are rejected.</p>
          <Field label="Qty tolerance %">
            <TextInput name="qty_pct" type="number" min={0} step="0.1" defaultValue={String(getMatchTolerance(tenantId).qty_pct)} />
          </Field>
          <Field label="Amount tolerance %">
            <TextInput name="amount_pct" type="number" min={0} step="0.1" defaultValue={String(getMatchTolerance(tenantId).amount_pct)} />
          </Field>
          <div className="self-end"><Button type="submit">Save tolerance</Button></div>
        </form>
      </Panel>
      {openForm ? (
        <Panel className="mb-4">
          <form onSubmit={submit} className="grid gap-3 md:grid-cols-2">
            {error ? <p className="md:col-span-2 text-sm text-rose-600">{error}</p> : null}
            <Field label="Supplier">
              <SelectInput value={form.supplier_name} onChange={(e) => setForm({ ...form, supplier_name: e.target.value })}>
                <option value="">Select…</option>
                {suppliers.map((s) => <option key={s.id} value={s.name}>{s.name}</option>)}
              </SelectInput>
            </Field>
            <Field label="Purchase order (3-way match)">
              <SelectInput
                value={form.purchase_order_id}
                onChange={(e) => {
                  const po = orders.find((o) => o.id === e.target.value);
                  setForm({ ...form, purchase_order_id: e.target.value, supplier_name: po?.supplier_name ?? form.supplier_name });
                  if (po?.lines?.length) setLines(po.lines);
                }}
              >
                <option value="">Optional…</option>
                {orders.map((o) => (
                  <option key={o.id} value={o.id}>{o.purchase_order_no} — {o.supplier_name}</option>
                ))}
              </SelectInput>
            </Field>
            <Field label="Goods receipt (3-way match)">
              <SelectInput
                value={form.goods_receipt_id}
                onChange={(e) => {
                  const grn = receipts.find((g) => g.id === e.target.value);
                  setForm({ ...form, goods_receipt_id: e.target.value, supplier_name: grn?.supplier_name ?? form.supplier_name });
                  if (grn?.lines?.length) setLines(grn.lines);
                }}
              >
                <option value="">Optional…</option>
                {receipts.map((g) => (
                  <option key={g.id} value={g.id}>{g.receipt_no} — {g.supplier_name}</option>
                ))}
              </SelectInput>
            </Field>
            <Field label="Bill date">
              <TextInput type="date" value={form.bill_date} onChange={(e) => setForm({ ...form, bill_date: e.target.value })} />
            </Field>
            <Field label="Due date">
              <TextInput type="date" value={form.due_date} onChange={(e) => setForm({ ...form, due_date: e.target.value })} />
            </Field>
            <Field label="Status">
              <SelectInput value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value as VendorBill["status"] })}>
                {["draft", "open", "paid"].map((s) => <option key={s} value={s}>{s}</option>)}
              </SelectInput>
            </Field>
            <DocumentLinesEditor lines={lines} onChange={setLines} products={products} priceField="purchase_price" />
            <ExtraFieldsBlock formKey="purchases.bill" valueJson={extraJson} onChange={setExtraJson} />
            <div className="md:col-span-2 flex gap-2">
              <Button type="submit">{editing ? "Update bill" : "Save bill"}</Button>
              <Button type="button" variant="secondary" onClick={() => { setExtraJson(""); setEditing(null); setOpenForm(false); }}>Cancel</Button>
            </div>
          </form>
        </Panel>
      ) : null}
      <Panel>
        <DataListToolbar
          search={search}
          onSearchChange={setSearch}
          searchPlaceholder="Search bill, supplier…"
          filterLabel="statuses"
          filterValue={statusFilter}
          filterOptions={["draft", "open", "paid"].map((s) => ({ value: s, label: s }))}
          onFilterChange={setStatusFilter}
          sortValue={sortField}
          sortOptions={[
            { value: "bill_no", label: "Bill no" },
            { value: "supplier_name", label: "Supplier" },
            { value: "bill_date", label: "Date" },
            { value: "total_amount", label: "Amount" },
            { value: "status", label: "Status" }
          ]}
          onSortChange={setSortField}
          sortDir={sortDir}
          onSortDirChange={setSortDir}
          onExportCsv={() =>
            exportListCsv({
              tenantId,
              module: "purchases",
              filename: "vendor-bills",
              rows: filtered.map((r) => ({
                No: r.bill_no,
                Supplier: r.supplier_name,
                Date: r.bill_date,
                Due: r.due_date,
                Amount: r.total_amount,
                Paid: r.paid_amount ?? 0,
                Status: r.status
              }))
            })
          }
          onExportPdf={() =>
            exportListPdf({
              tenantId,
              module: "purchases",
              title: "Vendor Bills",
              filename: "vendor-bills",
              columns: ["No", "Supplier", "Date", "Amount", "Status"],
              rows: filtered.map((r) => [r.bill_no, r.supplier_name, r.bill_date, money(r.total_amount), r.status])
            })
          }
        />
        <table className="min-w-full text-left text-sm">
          <thead>
            <tr className="border-b border-line bg-cloud">
              {["Bill No", "Supplier", "Date", "Due", "Amount", "Paid", "Match", "Status", ""].map((h) => (
                <th key={h || "a"} className="px-3 py-3 font-semibold text-slate-600">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filtered.map((r) => (
              <tr key={r.id} className="border-b border-line">
                <td className="px-3 py-3 font-medium">
                  {r.bill_no}
                  <ExtraFieldsReadout tenantId={tenantId} formKey="purchases.bill" recordId={r.id} />
                </td>
                <td className="px-3 py-3">{r.supplier_name}</td>
                <td className="px-3 py-3">{r.bill_date}</td>
                <td className="px-3 py-3">{r.due_date}</td>
                <td className="px-3 py-3">{money(r.total_amount)}</td>
                <td className="px-3 py-3">{money(r.paid_amount ?? 0)}</td>
                <td className="px-3 py-3">
                  <StatusBadge status={r.match_status ?? "unmatched"} />
                  {r.match_status === "variance" && r.match_variance ? (
                    <span className="ml-1 text-xs text-slate-500">{money(r.match_variance)}</span>
                  ) : null}
                </td>
                <td className="px-3 py-3"><StatusBadge status={r.status} /></td>
                <td className="px-3 py-3">
                  <RecordRowActions
                    onEdit={() => openEdit(r)}
                    onTrash={() =>
                      askTrash({
                        entityLabel: "vendor bill",
                        name: r.bill_no,
                        onConfirm: () => {
                          trashVendorBill(r.id);
                          refresh();
                        }
                      })
                    }
                  />
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
