"use client";

import { useEffect, useMemo, useState } from "react";
import { AppShell } from "@/components/app-shell";
import { ModuleBreadcrumbs } from "@/components/common/module-breadcrumbs";
import { PageHeader } from "@/components/common/page-header";
import { DataListToolbar } from "@/components/common/data-list-toolbar";
import { RecordRowActions } from "@/components/common/record-row-actions";
import { useConfirm } from "@/components/common/use-confirm";
import { ExtraFieldsBlock } from "@/components/forms/extra-fields-block";
import { Button, Field, Panel, SelectInput, TextInput } from "@/components/ui";
import { getStoredTenantId } from "@/lib/auth/session";
import { exportListCsv, exportListPdf } from "@/lib/list-export";
import { filterAndSort } from "@/lib/list-query";
import { persistExtraFields } from "@/modules/forms/services/extra-fields.store";
import { money } from "@/lib/utils";
import { listProducts } from "@/modules/inventory/services/inventory.store";
import {
  createPriceList,
  createPriceListItem,
  listPriceListItems,
  listPriceLists,
  trashPriceList,
  updatePriceList,
  type PriceList
} from "@/modules/sales/services/sales.store";

export default function PriceListsPage() {
  const tenantId = getStoredTenantId() ?? "alpha";
  const { askSave, askTrash, dialog } = useConfirm();
  const [rows, setRows] = useState<PriceList[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [sortField, setSortField] = useState("name");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");
  const [openForm, setOpenForm] = useState(false);
  const [editing, setEditing] = useState<PriceList | null>(null);
  const [form, setForm] = useState({ name: "", currency: "USD", valid_from: "", valid_until: "", is_default: false });
  const [lineForm, setLineForm] = useState({ product_id: "", min_qty: "1", unit_price: "" });
  const [extraJson, setExtraJson] = useState("");
  const products = listProducts(tenantId);

  function refresh() {
    setRows(listPriceLists(tenantId));
  }
  useEffect(() => { refresh(); }, [tenantId]);

  const filtered = useMemo(
    () => filterAndSort(rows as unknown as Array<Record<string, unknown>>, { search, searchFields: ["name", "currency"], sortField, sortDir }) as unknown as PriceList[],
    [rows, search, sortField, sortDir]
  );

  const selected = selectedId ? rows.find((r) => r.id === selectedId) : filtered[0];
  const lineItems = selected ? listPriceListItems(tenantId, selected.id) : [];

  function doSave() {
    const payload = { name: form.name.trim(), currency: form.currency, valid_from: form.valid_from || null, valid_until: form.valid_until || null, is_default: form.is_default };
    const row = editing ? updatePriceList(editing.id, payload) : createPriceList(tenantId, payload);
    if (row) {
      persistExtraFields(tenantId, "sales.price_list", row.id, extraJson);
      setSelectedId(row.id);
    }
    setOpenForm(false);
    refresh();
  }

  function addLine(e: React.FormEvent) {
    e.preventDefault();
    if (!selected) return;
    const product = products.find((p) => p.id === lineForm.product_id);
    if (!product) return;
    createPriceListItem(tenantId, {
      price_list_id: selected.id,
      product_id: product.id,
      min_qty: Number(lineForm.min_qty) || 1,
      unit_price: Number(lineForm.unit_price) || product.sale_price
    });
    setLineForm({ product_id: "", min_qty: "1", unit_price: "" });
    refresh();
  }

  return (
    <AppShell activeModule="sales">
      {dialog}
      <ModuleBreadcrumbs />
      <PageHeader title="Price lists" description="Product prices by list and quantity slab — default list drives quotations." actionLabel="Add price list" onAction={() => { setEditing(null); setForm({ name: "", currency: "USD", valid_from: "", valid_until: "", is_default: false }); setExtraJson(""); setOpenForm(true); }} />
      {openForm ? (
        <Panel className="mb-4">
          <form className="grid gap-3 md:grid-cols-2" onSubmit={(e) => { e.preventDefault(); askSave({ editing: Boolean(editing), entityLabel: "price list", onConfirm: doSave }); }}>
            <Field label="Name"><TextInput required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></Field>
            <Field label="Currency"><TextInput required value={form.currency} onChange={(e) => setForm({ ...form, currency: e.target.value })} /></Field>
            <label className="flex items-center gap-2 text-sm md:col-span-2"><input type="checkbox" checked={form.is_default} onChange={(e) => setForm({ ...form, is_default: e.target.checked })} /> Default for quotations</label>
            <div className="md:col-span-2"><ExtraFieldsBlock formKey="sales.price_list" valueJson={extraJson} onChange={setExtraJson} /></div>
            <Button type="submit">Save</Button>
          </form>
        </Panel>
      ) : null}
      <div className="grid gap-4 lg:grid-cols-2">
        <Panel>
          <DataListToolbar search={search} onSearchChange={setSearch} sortValue={sortField} sortOptions={[{ value: "name", label: "Name" }]} onSortChange={setSortField} sortDir={sortDir} onSortDirChange={setSortDir} onExportCsv={() => exportListCsv({ tenantId, module: "sales", filename: "price-lists", rows: filtered.map((r) => ({ Name: r.name, Currency: r.currency, Default: r.is_default ? "yes" : "no" })) })} onExportPdf={() => exportListPdf({ tenantId, module: "sales", title: "Price lists", filename: "price-lists", columns: ["Name", "Currency"], rows: filtered.map((r) => [r.name, r.currency]) })} />
          <table className="mt-3 w-full text-sm">
            <thead><tr className="text-left text-slate-500"><th className="px-3 py-2">Name</th><th>Currency</th><th>Default</th><th /></tr></thead>
            <tbody>
              {filtered.map((r) => (
                <tr key={r.id} className={`border-t border-line cursor-pointer ${selected?.id === r.id ? "bg-cloud" : ""}`} onClick={() => setSelectedId(r.id)}>
                  <td className="px-3 py-3 font-semibold">{r.name}</td>
                  <td>{r.currency}</td>
                  <td>{r.is_default ? "Yes" : "—"}</td>
                  <td onClick={(e) => e.stopPropagation()}>
                    <RecordRowActions onEdit={() => { setEditing(r); setForm({ name: r.name, currency: r.currency, valid_from: r.valid_from ?? "", valid_until: r.valid_until ?? "", is_default: r.is_default }); setOpenForm(true); }} onTrash={() => askTrash({ entityLabel: "price list", onConfirm: () => { trashPriceList(r.id); refresh(); } })} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </Panel>
        <Panel>
          <h2 className="mb-3 text-lg font-bold text-ink">{selected ? `${selected.name} — line items` : "Select a price list"}</h2>
          {selected ? (
            <>
              <form className="mb-4 grid gap-2 sm:grid-cols-4" onSubmit={addLine}>
                <Field label="Product" className="sm:col-span-2">
                  <SelectInput required value={lineForm.product_id} onChange={(e) => { const p = products.find((x) => x.id === e.target.value); setLineForm({ ...lineForm, product_id: e.target.value, unit_price: p ? String(p.sale_price) : "" }); }}>
                    <option value="">Select product</option>
                    {products.map((p) => <option key={p.id} value={p.id}>{p.sku} — {p.name}</option>)}
                  </SelectInput>
                </Field>
                <Field label="Min qty"><TextInput type="number" min="1" value={lineForm.min_qty} onChange={(e) => setLineForm({ ...lineForm, min_qty: e.target.value })} /></Field>
                <Field label="Unit price"><TextInput type="number" min="0" step="0.01" required value={lineForm.unit_price} onChange={(e) => setLineForm({ ...lineForm, unit_price: e.target.value })} /></Field>
                <div className="sm:col-span-4"><Button type="submit">Add line</Button></div>
              </form>
              <table className="w-full text-sm">
                <thead><tr className="text-left text-slate-500"><th className="py-2">Product</th><th>Min qty</th><th>Price</th></tr></thead>
                <tbody>
                  {lineItems.map((line) => {
                    const product = products.find((p) => p.id === line.product_id);
                    return (
                      <tr key={line.id} className="border-t border-line">
                        <td className="py-2">{product ? `${product.sku} · ${product.name}` : line.product_id}</td>
                        <td>{line.min_qty}</td>
                        <td>{money(line.unit_price)}</td>
                      </tr>
                    );
                  })}
                  {lineItems.length === 0 ? <tr><td colSpan={3} className="py-4 text-slate-500">No prices on this list yet.</td></tr> : null}
                </tbody>
              </table>
            </>
          ) : null}
        </Panel>
      </div>
    </AppShell>
  );
}
