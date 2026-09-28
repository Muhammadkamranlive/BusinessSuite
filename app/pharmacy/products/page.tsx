"use client";

import { useEffect, useMemo, useState } from "react";
import { PharmacyShell } from "@/components/pharmacy/pharmacy-shell";
import { DataListToolbar } from "@/components/common/data-list-toolbar";
import { RecordRowActions } from "@/components/common/record-row-actions";
import { useConfirm } from "@/components/common/use-confirm";
import { ExtraFieldsBlock } from "@/components/forms/extra-fields-block";
import { Button, Field, Panel, SelectInput, TextInput } from "@/components/ui";
import { getStoredTenantId } from "@/lib/auth/session";
import { exportListCsv } from "@/lib/list-export";
import { filterAndSort } from "@/lib/list-query";
import { persistExtraFields } from "@/modules/forms/services/extra-fields.store";
import {
  createPharmacyProduct,
  listPharmacyProducts,
  stockOnHand,
  subscribePharmacy,
  trashPharmacyProduct,
  updatePharmacyProduct,
  type PharmacyProduct
} from "@/modules/pharmacy/services/pharmacy.store";

const empty = {
  sku: "",
  barcode: "",
  name: "",
  generic_name: "",
  strength: "",
  pack_size: "1x10",
  category: "medicine" as PharmacyProduct["category"],
  unit: "pack",
  cost_price: "0",
  sale_price: "0",
  reorder_level: "10",
  requires_rx: false
};

export default function PharmacyProductsPage() {
  const tenantId = getStoredTenantId() ?? "alpha";
  const { askSave, askTrash, dialog } = useConfirm();
  const [rows, setRows] = useState<PharmacyProduct[]>([]);
  const [search, setSearch] = useState("");
  const [openForm, setOpenForm] = useState(false);
  const [editing, setEditing] = useState<PharmacyProduct | null>(null);
  const [form, setForm] = useState(empty);
  const [extraJson, setExtraJson] = useState("");

  function refresh() {
    setRows(listPharmacyProducts(tenantId));
  }

  useEffect(() => {
    refresh();
    return subscribePharmacy(refresh);
  }, [tenantId]);

  const filtered = useMemo(
    () =>
      filterAndSort(rows as unknown as Array<Record<string, unknown>>, {
        search,
        searchFields: ["sku", "barcode", "name", "generic_name"]
      }) as unknown as PharmacyProduct[],
    [rows, search]
  );

  function openCreate() {
    setEditing(null);
    setForm(empty);
    setExtraJson("");
    setOpenForm(true);
  }

  function openEdit(row: PharmacyProduct) {
    setEditing(row);
    setForm({
      sku: row.sku,
      barcode: row.barcode,
      name: row.name,
      generic_name: row.generic_name,
      strength: row.strength,
      pack_size: row.pack_size,
      category: row.category,
      unit: row.unit,
      cost_price: String(row.cost_price),
      sale_price: String(row.sale_price),
      reorder_level: String(row.reorder_level),
      requires_rx: row.requires_rx
    });
    setExtraJson("");
    setOpenForm(true);
  }

  function save() {
    askSave({
      editing: Boolean(editing),
      entityLabel: "product",
      onConfirm: () => {
        const payload = {
          sku: form.sku.trim(),
          barcode: form.barcode.trim(),
          name: form.name.trim(),
          generic_name: form.generic_name.trim(),
          strength: form.strength.trim(),
          pack_size: form.pack_size.trim(),
          category: form.category,
          unit: form.unit.trim() || "pack",
          cost_price: Number(form.cost_price) || 0,
          sale_price: Number(form.sale_price) || 0,
          reorder_level: Number(form.reorder_level) || 0,
          requires_rx: form.requires_rx
        };
        if (!payload.sku || !payload.name) return;
        const row = editing
          ? updatePharmacyProduct(editing.id, payload)
          : createPharmacyProduct(tenantId, payload);
        if (row) persistExtraFields(tenantId, "pharmacy.product", row.id, extraJson);
        setOpenForm(false);
        refresh();
      }
    });
  }

  return (
    <PharmacyShell
      title="Products / SKU"
      description="Medicine and OTC catalog for the medical shop."
      actionLabel="Add product"
      onAction={openCreate}
    >
      {dialog}
      <DataListToolbar
        search={search}
        onSearchChange={setSearch}
        searchPlaceholder="Search SKU, barcode, name…"
        onExportCsv={() =>
          exportListCsv({
            tenantId,
            module: "pharmacy",
            filename: "pharmacy-products",
            rows: filtered.map((r) => ({
              sku: r.sku,
              barcode: r.barcode,
              name: r.name,
              sale_price: r.sale_price,
              stock: stockOnHand(tenantId, r.id)
            }))
          })
        }
      />

      <div className="mt-4 overflow-x-auto rounded-xl border border-line bg-white">
        <table className="min-w-full text-left text-sm">
          <thead className="border-b border-line bg-[color:var(--bs-cloud)] text-xs uppercase tracking-wide text-slate-500">
            <tr>
              <th className="px-3 py-2.5">SKU</th>
              <th className="px-3 py-2.5">Name</th>
              <th className="px-3 py-2.5">Sale (Rs)</th>
              <th className="px-3 py-2.5">Stock</th>
              <th className="px-3 py-2.5">Rx</th>
              <th className="px-3 py-2.5" />
            </tr>
          </thead>
          <tbody>
            {filtered.map((row) => (
              <tr key={row.id} className="border-b border-line/70 last:border-0">
                <td className="px-3 py-2.5 font-medium text-ink">{row.sku}</td>
                <td className="px-3 py-2.5">
                  <p className="font-semibold text-ink">{row.name}</p>
                  <p className="text-xs text-slate-500">
                    {row.generic_name} · {row.strength}
                  </p>
                </td>
                <td className="px-3 py-2.5">{row.sale_price.toLocaleString("en-PK")}</td>
                <td className="px-3 py-2.5">{stockOnHand(tenantId, row.id)}</td>
                <td className="px-3 py-2.5">{row.requires_rx ? "Yes" : "No"}</td>
                <td className="px-3 py-2.5 text-right">
                  <RecordRowActions
                    onEdit={() => openEdit(row)}
                    onTrash={() =>
                      askTrash({
                        entityLabel: "product",
                        onConfirm: () => {
                          trashPharmacyProduct(row.id);
                          refresh();
                        }
                      })
                    }
                  />
                </td>
              </tr>
            ))}
            {!filtered.length ? (
              <tr>
                <td colSpan={6} className="px-3 py-10 text-center text-slate-500">
                  No products yet.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>

      {openForm ? (
        <Panel className="mt-4 border border-line bg-white p-4 sm:p-5">
          <p className="mb-3 text-sm font-bold text-ink">{editing ? "Edit product" : "New product"}</p>
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="SKU">
              <TextInput value={form.sku} onChange={(e) => setForm({ ...form, sku: e.target.value })} />
            </Field>
            <Field label="Barcode">
              <TextInput value={form.barcode} onChange={(e) => setForm({ ...form, barcode: e.target.value })} />
            </Field>
            <Field label="Name">
              <TextInput value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
            </Field>
            <Field label="Generic name">
              <TextInput
                value={form.generic_name}
                onChange={(e) => setForm({ ...form, generic_name: e.target.value })}
              />
            </Field>
            <Field label="Strength">
              <TextInput value={form.strength} onChange={(e) => setForm({ ...form, strength: e.target.value })} />
            </Field>
            <Field label="Pack size">
              <TextInput value={form.pack_size} onChange={(e) => setForm({ ...form, pack_size: e.target.value })} />
            </Field>
            <Field label="Category">
              <SelectInput
                value={form.category}
                onChange={(e) => setForm({ ...form, category: e.target.value as PharmacyProduct["category"] })}
              >
                <option value="medicine">Medicine</option>
                <option value="otc">OTC</option>
                <option value="surgical">Surgical</option>
                <option value="other">Other</option>
              </SelectInput>
            </Field>
            <Field label="Unit">
              <TextInput value={form.unit} onChange={(e) => setForm({ ...form, unit: e.target.value })} />
            </Field>
            <Field label="Cost price (Rs)">
              <TextInput
                type="number"
                value={form.cost_price}
                onChange={(e) => setForm({ ...form, cost_price: e.target.value })}
              />
            </Field>
            <Field label="Sale price (Rs)">
              <TextInput
                type="number"
                value={form.sale_price}
                onChange={(e) => setForm({ ...form, sale_price: e.target.value })}
              />
            </Field>
            <Field label="Reorder level">
              <TextInput
                type="number"
                value={form.reorder_level}
                onChange={(e) => setForm({ ...form, reorder_level: e.target.value })}
              />
            </Field>
            <label className="flex items-center gap-2 pt-7 text-sm font-semibold text-ink">
              <input
                type="checkbox"
                checked={form.requires_rx}
                onChange={(e) => setForm({ ...form, requires_rx: e.target.checked })}
              />
              Requires prescription
            </label>
          </div>
          <div className="mt-3">
            <ExtraFieldsBlock formKey="pharmacy.product" valueJson={extraJson} onChange={setExtraJson} />
          </div>
          <div className="mt-4 flex flex-col gap-2 sm:flex-row">
            <Button type="button" onClick={save} className="w-full sm:w-auto">
              Save
            </Button>
            <Button type="button" variant="secondary" className="w-full sm:w-auto" onClick={() => setOpenForm(false)}>
              Cancel
            </Button>
          </div>
        </Panel>
      ) : null}
    </PharmacyShell>
  );
}
