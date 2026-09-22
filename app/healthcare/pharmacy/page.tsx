"use client";

import { useEffect, useMemo, useState } from "react";
import { AppShell } from "@/components/app-shell";
import { ModuleBreadcrumbs } from "@/components/common/module-breadcrumbs";
import { PageHeader } from "@/components/common/page-header";
import { DataListToolbar } from "@/components/common/data-list-toolbar";
import { RecordRowActions } from "@/components/common/record-row-actions";
import { useConfirm } from "@/components/common/use-confirm";
import { ExtraFieldsBlock } from "@/components/forms/extra-fields-block";
import { Button, Field, Panel, TextInput } from "@/components/ui";
import { getStoredTenantId } from "@/lib/auth/session";
import { exportListCsv } from "@/lib/list-export";
import { filterAndSort } from "@/lib/list-query";
import { persistExtraFields } from "@/modules/forms/services/extra-fields.store";
import {
  createPharmacyStock,
  listLowStock,
  listNearExpiry,
  listPharmacyStock,
  pullHmsClinicalFromSupabase,
  subscribeHmsClinical,
  updatePharmacyStock,
  type HmsPharmacyStock
} from "@/modules/healthcare/services/hms-clinical.store";

const empty = { sku: "", drug_name: "", batch_no: "", expiry_date: "", quantity: "0", reorder_level: "10", unit_cost: "0", supplier_name: "" };

export default function HmsPharmacyPage() {
  const tenantId = getStoredTenantId() ?? "alpha";
  const { askSave, dialog } = useConfirm();
  const [rows, setRows] = useState<HmsPharmacyStock[]>([]);
  const [search, setSearch] = useState("");
  const [view, setView] = useState<"all" | "low" | "expiry">("all");
  const [openForm, setOpenForm] = useState(false);
  const [editing, setEditing] = useState<HmsPharmacyStock | null>(null);
  const [form, setForm] = useState(empty);
  const [extraJson, setExtraJson] = useState("");

  function refresh() {
    setRows(listPharmacyStock(tenantId));
  }
  useEffect(() => {
    void pullHmsClinicalFromSupabase(tenantId).finally(() => refresh());
    return subscribeHmsClinical(() => refresh());
  }, [tenantId]);

  const lowStock = useMemo(() => listLowStock(tenantId), [rows, tenantId]);
  const nearExpiry = useMemo(() => listNearExpiry(tenantId), [rows, tenantId]);

  const source = view === "low" ? lowStock : view === "expiry" ? nearExpiry : rows;

  const filtered = useMemo(
    () =>
      filterAndSort(source as unknown as Array<Record<string, unknown>>, {
        search,
        searchFields: ["sku", "drug_name", "batch_no"],
        sortField: "drug_name",
        sortDir: "asc"
      }) as unknown as HmsPharmacyStock[],
    [source, search]
  );

  function doSave() {
    if (!form.sku.trim() || !form.drug_name.trim()) return;
    const payload = {
      sku: form.sku.trim(),
      drug_name: form.drug_name.trim(),
      batch_no: form.batch_no.trim(),
      expiry_date: form.expiry_date,
      quantity: Number(form.quantity) || 0,
      reorder_level: Number(form.reorder_level) || 0,
      unit_cost: Number(form.unit_cost) || 0,
      supplier_name: form.supplier_name || null
    };
    if (editing) {
      updatePharmacyStock(editing.id, payload);
      persistExtraFields(tenantId, "healthcare.hms.pharmacy_stock", editing.id, extraJson);
    } else {
      const row = createPharmacyStock(tenantId, payload);
      persistExtraFields(tenantId, "healthcare.hms.pharmacy_stock", row.id, extraJson);
    }
    setOpenForm(false);
    refresh();
  }

  return (
    <AppShell activeModule="healthcare">
      {dialog}
      <ModuleBreadcrumbs />
      <PageHeader
        title="Pharmacy stock"
        description="SKU inventory, reorder levels, and expiry tracking."
        actionLabel="Add stock"
        onAction={() => {
          setEditing(null);
          setForm(empty);
          setExtraJson("");
          setOpenForm(true);
        }}
      />
      <div className="mb-4 flex flex-wrap gap-2">
        <Button type="button" variant={view === "all" ? "primary" : "secondary"} onClick={() => setView("all")}>
          All ({rows.length})
        </Button>
        <Button type="button" variant={view === "low" ? "primary" : "secondary"} onClick={() => setView("low")}>
          Low stock ({lowStock.length})
        </Button>
        <Button type="button" variant={view === "expiry" ? "primary" : "secondary"} onClick={() => setView("expiry")}>
          Near expiry ({nearExpiry.length})
        </Button>
      </div>
      {openForm ? (
        <Panel className="mb-4">
          <form
            className="grid gap-3 md:grid-cols-2"
            onSubmit={(e) => {
              e.preventDefault();
              askSave({ editing: Boolean(editing), entityLabel: "pharmacy stock", onConfirm: doSave });
            }}
          >
            <Field label="SKU">
              <TextInput required value={form.sku} onChange={(e) => setForm({ ...form, sku: e.target.value })} />
            </Field>
            <Field label="Drug name">
              <TextInput required value={form.drug_name} onChange={(e) => setForm({ ...form, drug_name: e.target.value })} />
            </Field>
            <Field label="Batch no">
              <TextInput value={form.batch_no} onChange={(e) => setForm({ ...form, batch_no: e.target.value })} />
            </Field>
            <Field label="Expiry">
              <TextInput type="date" value={form.expiry_date} onChange={(e) => setForm({ ...form, expiry_date: e.target.value })} />
            </Field>
            <Field label="Quantity">
              <TextInput type="number" value={form.quantity} onChange={(e) => setForm({ ...form, quantity: e.target.value })} />
            </Field>
            <Field label="Reorder level">
              <TextInput type="number" value={form.reorder_level} onChange={(e) => setForm({ ...form, reorder_level: e.target.value })} />
            </Field>
            <Field label="Unit cost">
              <TextInput type="number" value={form.unit_cost} onChange={(e) => setForm({ ...form, unit_cost: e.target.value })} />
            </Field>
            <Field label="Supplier">
              <TextInput value={form.supplier_name} onChange={(e) => setForm({ ...form, supplier_name: e.target.value })} />
            </Field>
            <div className="md:col-span-2">
              <ExtraFieldsBlock formKey="healthcare.hms.pharmacy_stock" valueJson={extraJson} onChange={setExtraJson} />
            </div>
            <div className="md:col-span-2 flex gap-2">
              <Button type="submit">Save</Button>
              <Button type="button" variant="ghost" onClick={() => setOpenForm(false)}>
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
          onExportCsv={() =>
            exportListCsv({
              tenantId,
              module: "healthcare",
              filename: "hms-pharmacy-stock",
              rows: filtered.map((r) => ({ SKU: r.sku, Drug: r.drug_name, Qty: r.quantity, Expiry: r.expiry_date }))
            })
          }
        />
        <div className="mt-3 overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-slate-500">
                <th className="px-3 py-2">SKU / Drug</th>
                <th>Batch</th>
                <th>Qty</th>
                <th>Expiry</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {filtered.map((row) => (
                <tr key={row.id} className="border-t border-line">
                  <td className="px-3 py-3">
                    <div className="font-semibold">{row.drug_name}</div>
                    <div className="text-xs text-slate-500">{row.sku}</div>
                  </td>
                  <td>{row.batch_no}</td>
                  <td className={row.quantity <= row.reorder_level ? "font-semibold text-rose-600" : ""}>{row.quantity}</td>
                  <td>{row.expiry_date}</td>
                  <td>
                    <RecordRowActions
                      onEdit={() => {
                        setEditing(row);
                        setForm({
                          sku: row.sku,
                          drug_name: row.drug_name,
                          batch_no: row.batch_no,
                          expiry_date: row.expiry_date,
                          quantity: String(row.quantity),
                          reorder_level: String(row.reorder_level),
                          unit_cost: String(row.unit_cost),
                          supplier_name: row.supplier_name ?? ""
                        });
                        setOpenForm(true);
                      }}
                      onTrash={() => undefined}
                    />
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
