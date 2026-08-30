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
import { getExtraFieldValues, persistExtraFields } from "@/modules/forms/services/extra-fields.store";
import {
  createWarehouse,
  listWarehouses,
  trashWarehouse,
  updateWarehouse,
  type Warehouse
} from "@/modules/inventory/services/inventory.store";

const empty = {
  code: "",
  name: "",
  location: "",
  status: "active" as Warehouse["status"]
};

export default function WarehousesPage() {
  const tenantId = getStoredTenantId() ?? "alpha";
  const { askSave, askTrash, dialog } = useConfirm();
  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [sortField, setSortField] = useState("code");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");
  const [openForm, setOpenForm] = useState(false);
  const [editing, setEditing] = useState<Warehouse | null>(null);
  const [error, setError] = useState("");
  const [form, setForm] = useState(empty);
  const [extraJson, setExtraJson] = useState("");

  function refresh() {
    setWarehouses(listWarehouses(tenantId));
  }

  useEffect(() => {
    refresh();
  }, [tenantId]);

  const filtered = useMemo(
    () =>
      filterAndSort(warehouses as unknown as Array<Record<string, unknown>>, {
        search,
        searchFields: ["code", "name", "location", "status"],
        statusField: "status",
        statusValue: statusFilter,
        sortField,
        sortDir
      }) as unknown as Warehouse[],
    [warehouses, search, statusFilter, sortField, sortDir]
  );

  function openCreate() {
    setEditing(null);
    setForm(empty);
    setExtraJson("");
    setError("");
    setOpenForm(true);
  }

  function openEdit(row: Warehouse) {
    setEditing(row);
    setForm({
      code: row.code,
      name: row.name,
      location: row.location,
      status: row.status
    });
    setExtraJson(getExtraFieldValues(tenantId, "inventory.warehouse", row.id));
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
      location: form.location.trim() || "—",
      status: form.status
    };
    if (editing) {
      updateWarehouse(editing.id, payload);
      persistExtraFields(tenantId, "inventory.warehouse", editing.id, extraJson);
    } else {
      const row = createWarehouse(tenantId, payload);
      persistExtraFields(tenantId, "inventory.warehouse", row.id, extraJson);
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
      entityLabel: "warehouse",
      onConfirm: doSave
    });
  }

  return (
    <AppShell activeModule="inventory">
      <PageHeader title="Warehouses" description="Locations where stock is held." actionLabel="Add warehouse" onAction={openCreate} />
      <ModuleBreadcrumbs />

      {openForm ? (
        <Panel className="mb-4">
          <form onSubmit={submit} className="grid gap-3 md:grid-cols-3">
            {error ? <p className="md:col-span-3 text-sm text-rose-600">{error}</p> : null}
            <Field label="Code">
              <TextInput value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value })} placeholder="WH-01" required />
            </Field>
            <Field label="Name">
              <TextInput value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
            </Field>
            <Field label="Location">
              <TextInput value={form.location} onChange={(e) => setForm({ ...form, location: e.target.value })} placeholder="City / site" />
            </Field>
            <Field label="Status">
              <SelectInput value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value as Warehouse["status"] })}>
                <option value="active">active</option>
                <option value="inactive">inactive</option>
              </SelectInput>
            </Field>
            <ExtraFieldsBlock formKey="inventory.warehouse" valueJson={extraJson} onChange={setExtraJson} />
            <div className="md:col-span-3 flex gap-2">
              <Button type="submit">{editing ? "Update warehouse" : "Save warehouse"}</Button>
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
          searchPlaceholder="Search code, name, location…"
          filterLabel="statuses"
          filterValue={statusFilter}
          filterOptions={[
            { value: "active", label: "active" },
            { value: "inactive", label: "inactive" }
          ]}
          onFilterChange={setStatusFilter}
          sortValue={sortField}
          sortOptions={[
            { value: "code", label: "Code" },
            { value: "name", label: "Name" },
            { value: "location", label: "Location" },
            { value: "status", label: "Status" }
          ]}
          onSortChange={setSortField}
          sortDir={sortDir}
          onSortDirChange={setSortDir}
          onExportCsv={() =>
            exportListCsv({
              tenantId,
              module: "inventory",
              filename: "warehouses",
              rows: filtered.map((w) => ({
                Code: w.code,
                Name: w.name,
                Location: w.location,
                Status: w.status
              }))
            })
          }
          onExportPdf={() =>
            exportListPdf({
              tenantId,
              module: "inventory",
              title: "Warehouses",
              filename: "warehouses",
              columns: ["Code", "Name", "Location", "Status"],
              rows: filtered.map((w) => [w.code, w.name, w.location, w.status])
            })
          }
        />
        <table className="min-w-full text-left text-sm">
          <thead>
            <tr className="border-b border-line bg-cloud">
              {["Code", "Name", "Location", "Status", ""].map((h) => (
                <th key={h || "a"} className="px-3 py-3 font-semibold text-slate-600">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filtered.map((w) => (
              <tr key={w.id} className="border-b border-line">
                <td className="px-3 py-3 font-medium">
                  {w.code}
                  <ExtraFieldsReadout tenantId={tenantId} formKey="inventory.warehouse" recordId={w.id} />
                </td>
                <td className="px-3 py-3">{w.name}</td>
                <td className="px-3 py-3">{w.location}</td>
                <td className="px-3 py-3">
                  <StatusBadge status={w.status} />
                </td>
                <td className="px-3 py-3">
                  <RecordRowActions
                    onEdit={() => openEdit(w)}
                    onTrash={() =>
                      askTrash({
                        entityLabel: "warehouse",
                        name: w.name,
                        onConfirm: () => {
                          trashWarehouse(w.id);
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
