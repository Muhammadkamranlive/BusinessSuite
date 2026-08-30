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
  createProduct,
  getProductStock,
  listCategories,
  listProducts,
  trashProduct,
  updateProduct,
  type Product,
  type ProductCategory
} from "@/modules/inventory/services/inventory.store";

const empty = {
  sku: "",
  name: "",
  category_id: "",
  unit: "pcs",
  purchase_price: "",
  sale_price: "",
  tax_rate: "5",
  reorder_level: "10",
  status: "active" as Product["status"]
};

export default function ProductsPage() {
  const tenantId = getStoredTenantId() ?? "alpha";
  const { askSave, askTrash, dialog } = useConfirm();
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<ProductCategory[]>([]);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [sortField, setSortField] = useState("name");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");
  const [openForm, setOpenForm] = useState(false);
  const [editing, setEditing] = useState<Product | null>(null);
  const [error, setError] = useState("");
  const [form, setForm] = useState(empty);
  const [extraJson, setExtraJson] = useState("");

  function refresh() {
    setProducts(listProducts(tenantId));
    setCategories(listCategories(tenantId));
  }

  useEffect(() => {
    refresh();
  }, [tenantId]);

  const filtered = useMemo(
    () =>
      filterAndSort(products as unknown as Array<Record<string, unknown>>, {
        search,
        searchFields: ["sku", "name", "unit", "status"],
        statusField: "status",
        statusValue: statusFilter,
        sortField,
        sortDir
      }) as unknown as Product[],
    [products, search, statusFilter, sortField, sortDir]
  );

  function openCreate() {
    setEditing(null);
    setForm(empty);
    setExtraJson("");
    setError("");
    setOpenForm(true);
  }

  function openEdit(row: Product) {
    setEditing(row);
    setForm({
      sku: row.sku,
      name: row.name,
      category_id: row.category_id ?? "",
      unit: row.unit,
      purchase_price: String(row.purchase_price),
      sale_price: String(row.sale_price),
      tax_rate: String(row.tax_rate),
      reorder_level: String(row.reorder_level),
      status: row.status
    });
    setExtraJson(getExtraFieldValues(tenantId, "inventory.product", row.id));
    setError("");
    setOpenForm(true);
  }

  function doSave() {
    setError("");
    if (!form.sku.trim() || !form.name.trim()) {
      setError("SKU and name are required.");
      return;
    }
    const skuTaken = products.some(
      (p) => p.sku.toLowerCase() === form.sku.trim().toLowerCase() && p.id !== editing?.id
    );
    if (skuTaken) {
      setError("SKU already exists for this company.");
      return;
    }
    const payload = {
      sku: form.sku.trim(),
      name: form.name.trim(),
      category_id: form.category_id || null,
      unit: form.unit.trim() || "pcs",
      purchase_price: Number(form.purchase_price) || 0,
      sale_price: Number(form.sale_price) || 0,
      tax_rate: Number(form.tax_rate) || 0,
      reorder_level: Number(form.reorder_level) || 0,
      status: form.status
    };
    if (editing) {
      updateProduct(editing.id, payload);
      persistExtraFields(tenantId, "inventory.product", editing.id, extraJson);
    } else {
      const row = createProduct(tenantId, payload);
      persistExtraFields(tenantId, "inventory.product", row.id, extraJson);
    }
    setExtraJson("");
    setForm(empty);
    setEditing(null);
    setOpenForm(false);
    refresh();
  }

  function submit(e: React.FormEvent) {
    e.preventDefault();
    askSave({
      editing: Boolean(editing),
      entityLabel: "product",
      onConfirm: doSave
    });
  }

  return (
    <AppShell activeModule="inventory">
      <PageHeader
        title="Products"
        description="Add catalog items — stock updates when you post movements."
        actionLabel="Add product"
        onAction={openCreate}
      />
      <ModuleBreadcrumbs />

      {openForm ? (
        <Panel className="mb-4">
          <form onSubmit={submit} className="grid gap-3 md:grid-cols-3">
            {error ? <p className="md:col-span-3 text-sm text-rose-600">{error}</p> : null}
            <Field label="SKU">
              <TextInput value={form.sku} onChange={(e) => setForm({ ...form, sku: e.target.value })} placeholder="SKU-001" required />
            </Field>
            <Field label="Name" className="md:col-span-2">
              <TextInput value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
            </Field>
            <Field label="Category">
              <SelectInput value={form.category_id} onChange={(e) => setForm({ ...form, category_id: e.target.value })}>
                <option value="">None</option>
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.code} — {c.name}
                  </option>
                ))}
              </SelectInput>
            </Field>
            <Field label="Unit">
              <SelectInput value={form.unit} onChange={(e) => setForm({ ...form, unit: e.target.value })}>
                {["pcs", "box", "set", "kg", "carton", "pack"].map((u) => (
                  <option key={u} value={u}>
                    {u}
                  </option>
                ))}
              </SelectInput>
            </Field>
            <Field label="Status">
              <SelectInput value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value as Product["status"] })}>
                <option value="active">active</option>
                <option value="inactive">inactive</option>
              </SelectInput>
            </Field>
            <Field label="Purchase price">
              <TextInput type="number" min={0} step="0.01" value={form.purchase_price} onChange={(e) => setForm({ ...form, purchase_price: e.target.value })} />
            </Field>
            <Field label="Sale price">
              <TextInput type="number" min={0} step="0.01" value={form.sale_price} onChange={(e) => setForm({ ...form, sale_price: e.target.value })} />
            </Field>
            <Field label="Tax %">
              <TextInput type="number" min={0} value={form.tax_rate} onChange={(e) => setForm({ ...form, tax_rate: e.target.value })} />
            </Field>
            <Field label="Reorder level">
              <TextInput type="number" min={0} value={form.reorder_level} onChange={(e) => setForm({ ...form, reorder_level: e.target.value })} />
            </Field>
            <ExtraFieldsBlock formKey="inventory.product" valueJson={extraJson} onChange={setExtraJson} />
            <div className="md:col-span-3 flex gap-2">
              <Button type="submit">{editing ? "Update product" : "Save product"}</Button>
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
          searchPlaceholder="Search SKU, name…"
          filterLabel="statuses"
          filterValue={statusFilter}
          filterOptions={[
            { value: "active", label: "active" },
            { value: "inactive", label: "inactive" }
          ]}
          onFilterChange={setStatusFilter}
          sortValue={sortField}
          sortOptions={[
            { value: "sku", label: "SKU" },
            { value: "name", label: "Name" },
            { value: "sale_price", label: "Sale price" },
            { value: "status", label: "Status" }
          ]}
          onSortChange={setSortField}
          sortDir={sortDir}
          onSortDirChange={setSortDir}
          onExportCsv={() =>
            exportListCsv({
              tenantId,
              module: "inventory",
              filename: "products",
              rows: filtered.map((p) => ({
                SKU: p.sku,
                Name: p.name,
                Unit: p.unit,
                SalePrice: p.sale_price,
                Stock: getProductStock(p.id, tenantId),
                Reorder: p.reorder_level,
                Status: p.status
              }))
            })
          }
          onExportPdf={() =>
            exportListPdf({
              tenantId,
              module: "inventory",
              title: "Products",
              filename: "products",
              columns: ["SKU", "Name", "Sale", "Stock", "Status"],
              rows: filtered.map((p) => [p.sku, p.name, money(p.sale_price), String(getProductStock(p.id, tenantId)), p.status])
            })
          }
        />
        <table className="min-w-full text-left text-sm">
          <thead>
            <tr className="border-b border-line bg-cloud">
              {["SKU", "Name", "Unit", "Sale Price", "Stock", "Reorder", "Status", ""].map((h) => (
                <th key={h || "a"} className="px-3 py-3 font-semibold text-slate-600">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={8} className="px-3 py-8 text-center text-slate-500">
                  No products yet. Click Add product.
                </td>
              </tr>
            ) : (
              filtered.map((p) => (
                <tr key={p.id} className="border-b border-line">
                  <td className="px-3 py-3 font-medium">
                    {p.sku}
                    <ExtraFieldsReadout tenantId={tenantId} formKey="inventory.product" recordId={p.id} />
                  </td>
                  <td className="px-3 py-3">{p.name}</td>
                  <td className="px-3 py-3">{p.unit}</td>
                  <td className="px-3 py-3">{money(p.sale_price)}</td>
                  <td className="px-3 py-3">{getProductStock(p.id, tenantId)}</td>
                  <td className="px-3 py-3">{p.reorder_level}</td>
                  <td className="px-3 py-3">
                    <StatusBadge status={p.status} />
                  </td>
                  <td className="px-3 py-3">
                    <RecordRowActions
                      onEdit={() => openEdit(p)}
                      onTrash={() =>
                        askTrash({
                          entityLabel: "product",
                          name: p.name,
                          onConfirm: () => {
                            trashProduct(p.id);
                            refresh();
                          }
                        })
                      }
                    />
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </Panel>
      {dialog}
    </AppShell>
  );
}
