"use client";

import { useEffect, useMemo, useState } from "react";
import { AppShell } from "@/components/app-shell";
import { ModuleBreadcrumbs } from "@/components/common/module-breadcrumbs";
import { PageHeader } from "@/components/common/page-header";
import { DataListToolbar } from "@/components/common/data-list-toolbar";
import { RecordRowActions } from "@/components/common/record-row-actions";
import { useConfirm } from "@/components/common/use-confirm";
import { ExtraFieldsBlock } from "@/components/forms/extra-fields-block";
import { ExtraFieldsReadout } from "@/components/forms/extra-fields-readout";
import { Button, Field, Panel, SelectInput, TextInput } from "@/components/ui";
import { getStoredTenantId } from "@/lib/auth/session";
import { exportListCsv, exportListPdf } from "@/lib/list-export";
import { filterAndSort } from "@/lib/list-query";
import { money } from "@/lib/utils";
import { getExtraFieldValues, persistExtraFields } from "@/modules/forms/services/extra-fields.store";
import {
  createVendorPayment,
  listSuppliers,
  listVendorBills,
  listVendorPayments,
  trashVendorPayment,
  updateVendorPayment,
  type VendorPayment
} from "@/modules/purchase/services/purchase.store";

const empty = {
  supplier_name: "",
  bill_no: "",
  payment_date: new Date().toISOString().slice(0, 10),
  amount: "",
  payment_method: "bank"
};

export default function PaymentsMadePage() {
  const tenantId = getStoredTenantId() ?? "alpha";
  const { askSave, askTrash, dialog } = useConfirm();
  const [rows, setRows] = useState<VendorPayment[]>([]);
  const [search, setSearch] = useState("");
  const [methodFilter, setMethodFilter] = useState("all");
  const [sortField, setSortField] = useState("payment_date");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");
  const [openForm, setOpenForm] = useState(false);
  const [editing, setEditing] = useState<VendorPayment | null>(null);
  const [error, setError] = useState("");
  const [form, setForm] = useState(empty);
  const [extraJson, setExtraJson] = useState("");
  const suppliers = listSuppliers(tenantId);
  const bills = listVendorBills(tenantId);

  function refresh() {
    setRows(listVendorPayments(tenantId));
  }

  useEffect(() => {
    refresh();
  }, [tenantId]);

  const filtered = useMemo(
    () =>
      filterAndSort(rows as unknown as Array<Record<string, unknown>>, {
        search,
        searchFields: ["payment_no", "supplier_name", "bill_no", "payment_method"],
        statusField: "payment_method",
        statusValue: methodFilter,
        sortField,
        sortDir
      }) as unknown as VendorPayment[],
    [rows, search, methodFilter, sortField, sortDir]
  );

  function openCreate() {
    setEditing(null);
    setForm({ ...empty, payment_date: new Date().toISOString().slice(0, 10) });
    setExtraJson("");
    setError("");
    setOpenForm(true);
  }

  function openEdit(row: VendorPayment) {
    setEditing(row);
    setForm({
      supplier_name: row.supplier_name,
      bill_no: row.bill_no === "—" ? "" : row.bill_no,
      payment_date: row.payment_date,
      amount: String(row.amount),
      payment_method: row.payment_method
    });
    setExtraJson(getExtraFieldValues(tenantId, "purchases.payment", row.id));
    setError("");
    setOpenForm(true);
  }

  function doSave() {
    setError("");
    if (!form.supplier_name.trim()) {
      setError("Supplier is required.");
      return;
    }
    const payload = {
      supplier_name: form.supplier_name.trim(),
      bill_no: form.bill_no || "—",
      payment_date: form.payment_date,
      amount: Number(form.amount) || 0,
      payment_method: form.payment_method
    };
    if (editing) {
      updateVendorPayment(editing.id, payload);
      persistExtraFields(tenantId, "purchases.payment", editing.id, extraJson);
    } else {
      try {
        const row = createVendorPayment(tenantId, payload);
        persistExtraFields(tenantId, "purchases.payment", row.id, extraJson);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Could not record supplier payment.");
        return;
      }
    }
    setExtraJson("");
    setForm({ ...empty, payment_date: new Date().toISOString().slice(0, 10) });
    setEditing(null);
    setOpenForm(false);
    refresh();
  }

  function submit(e: React.FormEvent) {
    e.preventDefault();
    askSave({
      editing: Boolean(editing),
      entityLabel: "vendor payment",
      onConfirm: doSave
    });
  }

  return (
    <AppShell activeModule="purchases">
      <PageHeader title="Payments Made" description="Payments to suppliers." actionLabel="Record payment" onAction={openCreate} />
      <ModuleBreadcrumbs />
      {openForm ? (
        <Panel className="mb-4">
          <form onSubmit={submit} className="grid gap-3 md:grid-cols-2">
            {error ? <p className="md:col-span-2 text-sm text-rose-600">{error}</p> : null}
            <Field label="Supplier">
              <SelectInput value={form.supplier_name} onChange={(e) => setForm({ ...form, supplier_name: e.target.value })}>
                <option value="">Select…</option>
                {suppliers.map((s) => (
                  <option key={s.id} value={s.name}>
                    {s.name}
                  </option>
                ))}
              </SelectInput>
            </Field>
            <Field label="Bill">
              <SelectInput value={form.bill_no} onChange={(e) => setForm({ ...form, bill_no: e.target.value })}>
                <option value="">Optional…</option>
                {bills.map((b) => (
                  <option key={b.id} value={b.bill_no}>
                    {b.bill_no} — {money(b.total_amount)}
                  </option>
                ))}
              </SelectInput>
            </Field>
            <Field label="Amount">
              <TextInput type="number" min={0} value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} required />
            </Field>
            <Field label="Method">
              <SelectInput value={form.payment_method} onChange={(e) => setForm({ ...form, payment_method: e.target.value })}>
                {["bank", "cash", "cheque", "online"].map((m) => (
                  <option key={m} value={m}>
                    {m}
                  </option>
                ))}
              </SelectInput>
            </Field>
            <Field label="Date">
              <TextInput type="date" value={form.payment_date} onChange={(e) => setForm({ ...form, payment_date: e.target.value })} />
            </Field>
            <ExtraFieldsBlock formKey="purchases.payment" valueJson={extraJson} onChange={setExtraJson} />
            <div className="md:col-span-2 flex gap-2">
              <Button type="submit">{editing ? "Update payment" : "Save payment"}</Button>
              <Button type="button" variant="secondary" onClick={() => { setExtraJson(""); setEditing(null); setOpenForm(false); }}>
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
          searchPlaceholder="Search payment, supplier, bill…"
          filterLabel="methods"
          filterValue={methodFilter}
          filterOptions={["bank", "cash", "cheque", "online"].map((m) => ({ value: m, label: m }))}
          onFilterChange={setMethodFilter}
          sortValue={sortField}
          sortOptions={[
            { value: "payment_no", label: "Payment no" },
            { value: "supplier_name", label: "Supplier" },
            { value: "payment_date", label: "Date" },
            { value: "amount", label: "Amount" }
          ]}
          onSortChange={setSortField}
          sortDir={sortDir}
          onSortDirChange={setSortDir}
          onExportCsv={() =>
            exportListCsv({
              tenantId,
              module: "purchases",
              filename: "vendor-payments",
              rows: filtered.map((r) => ({
                No: r.payment_no,
                Supplier: r.supplier_name,
                Bill: r.bill_no,
                Date: r.payment_date,
                Amount: r.amount,
                Method: r.payment_method
              }))
            })
          }
          onExportPdf={() =>
            exportListPdf({
              tenantId,
              module: "purchases",
              title: "Payments Made",
              filename: "vendor-payments",
              columns: ["No", "Supplier", "Date", "Amount", "Method"],
              rows: filtered.map((r) => [r.payment_no, r.supplier_name, r.payment_date, money(r.amount), r.payment_method])
            })
          }
        />
        <table className="min-w-full text-left text-sm">
          <thead>
            <tr className="border-b border-line bg-cloud">
              {["Payment No", "Supplier", "Bill", "Date", "Amount", "Method", ""].map((h) => (
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
                  {r.payment_no}
                  <ExtraFieldsReadout tenantId={tenantId} formKey="purchases.payment" recordId={r.id} />
                </td>
                <td className="px-3 py-3">{r.supplier_name}</td>
                <td className="px-3 py-3">{r.bill_no}</td>
                <td className="px-3 py-3">{r.payment_date}</td>
                <td className="px-3 py-3">{money(r.amount)}</td>
                <td className="px-3 py-3 capitalize">{r.payment_method}</td>
                <td className="px-3 py-3">
                  <RecordRowActions
                    onEdit={() => openEdit(r)}
                    onTrash={() =>
                      askTrash({
                        entityLabel: "vendor payment",
                        name: r.payment_no,
                        onConfirm: () => {
                          trashVendorPayment(r.id);
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
