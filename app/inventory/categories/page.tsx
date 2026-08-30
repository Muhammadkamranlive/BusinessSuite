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
import { Button, Field, Panel, TextInput } from "@/components/ui";
import { getStoredTenantId } from "@/lib/auth/session";
import { exportListCsv, exportListPdf } from "@/lib/list-export";
import { filterAndSort } from "@/lib/list-query";
import { getExtraFieldValues, persistExtraFields } from "@/modules/forms/services/extra-fields.store";
import {
  createCategory,
  listCategories,
  trashCategory,
  updateCategory,
  type ProductCategory
} from "@/modules/inventory/services/inventory.store";

const empty = { code: "", name: "", description: "" };

export default function CategoriesPage() {
  const tenantId = getStoredTenantId() ?? "alpha";
  const { askSave, askTrash, dialog } = useConfirm();
  const [rows, setRows] = useState<ProductCategory[]>([]);
  const [search, setSearch] = useState("");
  const [sortField, setSortField] = useState("code");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");
  const [openForm, setOpenForm] = useState(false);
  const [editing, setEditing] = useState<ProductCategory | null>(null);
  const [error, setError] = useState("");
  const [form, setForm] = useState(empty);
  const [extraJson, setExtraJson] = useState("");

  function refresh() {
    setRows(listCategories(tenantId));
  }

  useEffect(() => {
    refresh();
  }, [tenantId]);

  const filtered = useMemo(
    () =>
      filterAndSort(rows as unknown as Array<Record<string, unknown>>, {
        search,
        searchFields: ["code", "name", "description"],
        sortField,
        sortDir
      }) as unknown as ProductCategory[],
    [rows, search, sortField, sortDir]
  );

  function openCreate() {
    setEditing(null);
    setForm(empty);
    setExtraJson("");
    setError("");
    setOpenForm(true);
  }

  function openEdit(row: ProductCategory) {
    setEditing(row);
    setForm({
      code: row.code,
      name: row.name,
      description: row.description ?? ""
    });
    setExtraJson(getExtraFieldValues(tenantId, "inventory.category", row.id));
    setError("");
    setOpenForm(true);
  }

  function doSave() {
    setError("");
    if (!form.code.trim() || !form.name.trim()) {
      setError("Code and name are required.");
      return;
    }
    const payload = {
      code: form.code.trim().toUpperCase(),
      name: form.name.trim(),
      description: form.description.trim()
    };
    if (editing) {
      updateCategory(editing.id, payload);
      persistExtraFields(tenantId, "inventory.category", editing.id, extraJson);
    } else {
      const row = createCategory(tenantId, payload);
      persistExtraFields(tenantId, "inventory.category", row.id, extraJson);
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
      entityLabel: "category",
      onConfirm: doSave
    });
  }

  return (
    <AppShell activeModule="inventory">
      <PageHeader title="Categories" description="Product category master." actionLabel="Add category" onAction={openCreate} />
      <ModuleBreadcrumbs />
      {openForm ? (
        <Panel className="mb-4">
          <form onSubmit={submit} className="grid gap-3 md:grid-cols-3">
            {error ? <p className="md:col-span-3 text-sm text-rose-600">{error}</p> : null}
            <Field label="Code">
              <TextInput value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value })} required />
            </Field>
            <Field label="Name">
              <TextInput value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
            </Field>
            <Field label="Description">
              <TextInput value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
            </Field>
            <ExtraFieldsBlock formKey="inventory.category" valueJson={extraJson} onChange={setExtraJson} />
            <div className="md:col-span-3 flex gap-2">
              <Button type="submit">{editing ? "Update" : "Save"}</Button>
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
          searchPlaceholder="Search code, name…"
          sortValue={sortField}
          sortOptions={[
            { value: "code", label: "Code" },
            { value: "name", label: "Name" }
          ]}
          onSortChange={setSortField}
          sortDir={sortDir}
          onSortDirChange={setSortDir}
          onExportCsv={() =>
            exportListCsv({
              tenantId,
              module: "inventory",
              filename: "categories",
              rows: filtered.map((r) => ({
                Code: r.code,
                Name: r.name,
                Description: r.description || ""
              }))
            })
          }
          onExportPdf={() =>
            exportListPdf({
              tenantId,
              module: "inventory",
              title: "Categories",
              filename: "categories",
              columns: ["Code", "Name", "Description"],
              rows: filtered.map((r) => [r.code, r.name, r.description || "—"])
            })
          }
        />
        <table className="min-w-full text-left text-sm">
          <thead>
            <tr className="border-b border-line bg-cloud">
              {["Code", "Name", "Description", ""].map((h) => (
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
                  {r.code}
                  <ExtraFieldsReadout tenantId={tenantId} formKey="inventory.category" recordId={r.id} />
                </td>
                <td className="px-3 py-3">{r.name}</td>
                <td className="px-3 py-3">{r.description || "—"}</td>
                <td className="px-3 py-3">
                  <RecordRowActions
                    onEdit={() => openEdit(r)}
                    onTrash={() =>
                      askTrash({
                        entityLabel: "category",
                        name: r.name,
                        onConfirm: () => {
                          trashCategory(r.id);
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
