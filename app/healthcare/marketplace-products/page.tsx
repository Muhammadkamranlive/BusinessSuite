"use client";

import { useEffect, useMemo, useState } from "react";
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
import { getStoredTenantId } from "@/lib/auth/session";
import { exportListCsv, exportListPdf } from "@/lib/list-export";
import { filterAndSort } from "@/lib/list-query";
import { money } from "@/lib/utils";
import { getExtraFieldValues, persistExtraFields } from "@/modules/forms/services/extra-fields.store";
import {
  MARKETPLACE_CATEGORIES,
  createMarketplaceProduct,
  listMarketplaceProducts,
  listPharmacies,
  pullMarketplaceFromSupabase,
  subscribeMarketplace,
  trashMarketplaceProduct,
  updateMarketplaceProduct,
  type MarketplaceProduct
} from "@/modules/healthcare/services/pharmacy-marketplace.store";

const empty = {
  pharmacy_id: "",
  sku: "",
  name: "",
  category: MARKETPLACE_CATEGORIES[0] as string,
  description: "",
  strength: "",
  form: "Injectable",
  unit_price: "0",
  stock_qty: "100",
  featured: false,
  controlled: false,
  warning: "",
  education: "",
  status: "active" as MarketplaceProduct["status"]
};

export default function MarketplaceProductsPage() {
  const tenantId = getStoredTenantId() ?? "alpha";
  const { askSave, askTrash, dialog } = useConfirm();
  const [rows, setRows] = useState<MarketplaceProduct[]>([]);
  const [pharmacies, setPharmacies] = useState(listPharmacies(tenantId));
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [sortField, setSortField] = useState("name");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");
  const [openForm, setOpenForm] = useState(false);
  const [editing, setEditing] = useState<MarketplaceProduct | null>(null);
  const [form, setForm] = useState(empty);
  const [extraJson, setExtraJson] = useState("");
  const [error, setError] = useState("");

  function refresh() {
    setRows(listMarketplaceProducts(tenantId));
    setPharmacies(listPharmacies(tenantId));
  }
  useEffect(() => {
    void pullMarketplaceFromSupabase(tenantId).finally(() => refresh());
    return subscribeMarketplace(() => refresh());
  }, [tenantId]);

  const filtered = useMemo(
    () =>
      filterAndSort(rows as unknown as Array<Record<string, unknown>>, {
        search,
        searchFields: ["name", "sku", "category", "pharmacy_name", "status"],
        statusField: "status",
        statusValue: statusFilter,
        sortField,
        sortDir
      }) as unknown as MarketplaceProduct[],
    [rows, search, statusFilter, sortField, sortDir]
  );

  function doSave() {
    const pharmacy = pharmacies.find((p) => p.id === form.pharmacy_id);
    if (!pharmacy || !form.name.trim() || !form.sku.trim()) {
      setError("Pharmacy, SKU, and name are required.");
      return;
    }
    const payload = {
      pharmacy_id: pharmacy.id,
      pharmacy_name: pharmacy.name,
      sku: form.sku.trim().toUpperCase(),
      name: form.name.trim(),
      category: form.category,
      description: form.description.trim() || null,
      strength: form.strength.trim() || null,
      form: form.form.trim() || null,
      unit_price: Number(form.unit_price) || 0,
      compare_price: null,
      stock_qty: Number(form.stock_qty) || 0,
      featured: form.featured,
      controlled: form.controlled,
      warning: form.warning.trim() || null,
      education: form.education.trim() || null,
      image_url: null,
      status: form.status
    };
    if (editing) {
      updateMarketplaceProduct(editing.id, payload);
      persistExtraFields(tenantId, "healthcare.marketplace_product", editing.id, extraJson);
    } else {
      const row = createMarketplaceProduct(tenantId, payload);
      persistExtraFields(tenantId, "healthcare.marketplace_product", row.id, extraJson);
    }
    setOpenForm(false);
    setError("");
    refresh();
  }

  return (
    <AppShell activeModule="healthcare">
      {dialog}
      <ModuleBreadcrumbs />
      <PageHeader
        title="Marketplace products"
        description="Pharmacy-specific catalog with strengths, pricing, controlled flags, and disclosures."
        actionLabel="Add product"
        onAction={() => {
          setEditing(null);
          setForm({ ...empty, pharmacy_id: pharmacies[0]?.id ?? "" });
          setExtraJson("");
          setError("");
          setOpenForm(true);
        }}
      />
      {openForm ? (
        <Panel className="mb-4">
          <form
            className="grid gap-3 md:grid-cols-2"
            onSubmit={(e) => {
              e.preventDefault();
              askSave({ editing: Boolean(editing), entityLabel: "marketplace product", onConfirm: doSave });
            }}
          >
            {error ? <p className="md:col-span-2 text-sm text-rose-600">{error}</p> : null}
            <Field label="Pharmacy">
              <SelectInput value={form.pharmacy_id} onChange={(e) => setForm({ ...form, pharmacy_id: e.target.value })}>
                <option value="">Select…</option>
                {pharmacies.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </SelectInput>
            </Field>
            <Field label="Category">
              <SelectInput value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })}>
                {MARKETPLACE_CATEGORIES.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </SelectInput>
            </Field>
            <Field label="SKU">
              <TextInput required value={form.sku} onChange={(e) => setForm({ ...form, sku: e.target.value })} />
            </Field>
            <Field label="Name">
              <TextInput required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
            </Field>
            <Field label="Strength">
              <TextInput value={form.strength} onChange={(e) => setForm({ ...form, strength: e.target.value })} />
            </Field>
            <Field label="Form">
              <TextInput value={form.form} onChange={(e) => setForm({ ...form, form: e.target.value })} />
            </Field>
            <Field label="Unit price">
              <TextInput type="number" step="0.01" value={form.unit_price} onChange={(e) => setForm({ ...form, unit_price: e.target.value })} />
            </Field>
            <Field label="Stock qty">
              <TextInput type="number" value={form.stock_qty} onChange={(e) => setForm({ ...form, stock_qty: e.target.value })} />
            </Field>
            <Field label="Status">
              <SelectInput
                value={form.status}
                onChange={(e) => setForm({ ...form, status: e.target.value as MarketplaceProduct["status"] })}
              >
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
                <option value="out_of_stock">Out of stock</option>
              </SelectInput>
            </Field>
            <Field label="Flags">
              <div className="flex flex-wrap gap-4 pt-2 text-sm">
                <label className="flex items-center gap-2">
                  <input type="checkbox" checked={form.featured} onChange={(e) => setForm({ ...form, featured: e.target.checked })} />
                  Featured
                </label>
                <label className="flex items-center gap-2">
                  <input type="checkbox" checked={form.controlled} onChange={(e) => setForm({ ...form, controlled: e.target.checked })} />
                  Controlled
                </label>
              </div>
            </Field>
            <Field label="Description" className="md:col-span-2">
              <TextInput value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
            </Field>
            <Field label="Prescriber warning" className="md:col-span-2">
              <TextInput value={form.warning} onChange={(e) => setForm({ ...form, warning: e.target.value })} />
            </Field>
            <Field label="Education" className="md:col-span-2">
              <TextInput value={form.education} onChange={(e) => setForm({ ...form, education: e.target.value })} />
            </Field>
            <div className="md:col-span-2">
              <ExtraFieldsBlock formKey="healthcare.marketplace_product" valueJson={extraJson} onChange={setExtraJson} />
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
          filterValue={statusFilter}
          filterOptions={[
            { value: "active", label: "Active" },
            { value: "inactive", label: "Inactive" },
            { value: "out_of_stock", label: "Out of stock" }
          ]}
          onFilterChange={setStatusFilter}
          sortValue={sortField}
          sortOptions={[
            { value: "name", label: "Name" },
            { value: "unit_price", label: "Price" },
            { value: "category", label: "Category" }
          ]}
          onSortChange={setSortField}
          sortDir={sortDir}
          onSortDirChange={setSortDir}
          onExportCsv={() =>
            exportListCsv({
              tenantId,
              module: "healthcare",
              filename: "marketplace-products",
              rows: filtered.map((r) => ({
                SKU: r.sku,
                Name: r.name,
                Pharmacy: r.pharmacy_name,
                Category: r.category,
                Price: r.unit_price,
                Status: r.status
              }))
            })
          }
          onExportPdf={() =>
            exportListPdf({
              tenantId,
              module: "healthcare",
              title: "Marketplace products",
              filename: "marketplace-products",
              columns: ["SKU", "Name", "Pharmacy", "Price", "Status"],
              rows: filtered.map((r) => [r.sku, r.name, r.pharmacy_name, r.unit_price, r.status])
            })
          }
        />
        <div className="mt-3 overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-slate-500">
                <th className="px-3 py-2">Product</th>
                <th>Pharmacy</th>
                <th>Category</th>
                <th>Price</th>
                <th>Status</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {filtered.map((row) => (
                <tr key={row.id} className="border-t border-line">
                  <td className="px-3 py-3">
                    <div className="font-semibold">{row.name}</div>
                    <div className="text-xs text-slate-500">
                      {row.sku} · {row.strength} · {row.form}
                      {row.featured ? " · Featured" : ""}
                      {row.controlled ? " · Controlled" : ""}
                    </div>
                    <ExtraFieldsReadout tenantId={tenantId} formKey="healthcare.marketplace_product" recordId={row.id} />
                  </td>
                  <td>{row.pharmacy_name}</td>
                  <td>{row.category}</td>
                  <td>{money(row.unit_price)}</td>
                  <td>
                    <StatusBadge status={row.status} />
                  </td>
                  <td>
                    <RecordRowActions
                      onEdit={() => {
                        setEditing(row);
                        setForm({
                          pharmacy_id: row.pharmacy_id,
                          sku: row.sku,
                          name: row.name,
                          category: row.category,
                          description: row.description ?? "",
                          strength: row.strength ?? "",
                          form: row.form ?? "",
                          unit_price: String(row.unit_price),
                          stock_qty: String(row.stock_qty),
                          featured: row.featured,
                          controlled: row.controlled,
                          warning: row.warning ?? "",
                          education: row.education ?? "",
                          status: row.status
                        });
                        setExtraJson(getExtraFieldValues(tenantId, "healthcare.marketplace_product", row.id));
                        setOpenForm(true);
                      }}
                      onTrash={() =>
                        askTrash({
                          entityLabel: "marketplace product",
                          onConfirm: () => {
                            trashMarketplaceProduct(row.id);
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
        </div>
      </Panel>
    </AppShell>
  );
}
