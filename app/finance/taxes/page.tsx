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
  createTax,
  listTaxes,
  trashTax,
  updateTax,
  type TaxRate
} from "@/modules/finance/services/finance.store";

const empty = { name: "", rate: "", country: "", status: "active" as TaxRate["status"] };

export default function TaxesPage() {
  const tenantId = getStoredTenantId() ?? "alpha";
  const { askSave, askTrash, dialog } = useConfirm();
  const [rows, setRows] = useState<TaxRate[]>([]);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [sortField, setSortField] = useState("name");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");
  const [openForm, setOpenForm] = useState(false);
  const [editing, setEditing] = useState<TaxRate | null>(null);
  const [error, setError] = useState("");
  const [form, setForm] = useState(empty);
  const [extraJson, setExtraJson] = useState("");

  function refresh() {
    setRows(listTaxes(tenantId));
  }

  useEffect(() => {
    refresh();
  }, [tenantId]);

  const filtered = useMemo(
    () =>
      filterAndSort(rows as unknown as Array<Record<string, unknown>>, {
        search,
        searchFields: ["name", "country", "status"],
        statusField: "status",
        statusValue: statusFilter,
        sortField,
        sortDir
      }) as unknown as TaxRate[],
    [rows, search, statusFilter, sortField, sortDir]
  );

  function openCreate() {
    setEditing(null);
    setForm(empty);
    setExtraJson("");
    setError("");
    setOpenForm(true);
  }

  function openEdit(row: TaxRate) {
    setEditing(row);
    setForm({
      name: row.name,
      rate: String(row.rate),
      country: row.country === "—" ? "" : row.country,
      status: row.status
    });
    setExtraJson(getExtraFieldValues(tenantId, "finance.tax", row.id));
    setError("");
    setOpenForm(true);
  }

  function doSave() {
    setError("");
    if (!form.name.trim()) {
      setError("Tax name is required.");
      return;
    }
    const payload = {
      name: form.name.trim(),
      rate: Number(form.rate) || 0,
      country: form.country.trim() || "—",
      status: form.status
    };
    if (editing) {
      updateTax(editing.id, payload);
      persistExtraFields(tenantId, "finance.tax", editing.id, extraJson);
    } else {
      const row = createTax(tenantId, payload);
      persistExtraFields(tenantId, "finance.tax", row.id, extraJson);
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
      entityLabel: "tax rate",
      onConfirm: doSave
    });
  }

  return (
    <AppShell activeModule="finance">
      <PageHeader title="Taxes" description="Tax rates used on sales and purchases." actionLabel="Add tax" onAction={openCreate} />
      <ModuleBreadcrumbs />
      {openForm ? (
        <Panel className="mb-4">
          <form onSubmit={submit} className="grid gap-3 md:grid-cols-2">
            {error ? <p className="md:col-span-2 text-sm text-rose-600">{error}</p> : null}
            <Field label="Name">
              <TextInput value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
            </Field>
            <Field label="Rate %">
              <TextInput type="number" min={0} step="0.01" value={form.rate} onChange={(e) => setForm({ ...form, rate: e.target.value })} required />
            </Field>
            <Field label="Country">
              <TextInput value={form.country} onChange={(e) => setForm({ ...form, country: e.target.value })} />
            </Field>
            <Field label="Status">
              <SelectInput value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value as TaxRate["status"] })}>
                <option value="active">active</option>
                <option value="inactive">inactive</option>
              </SelectInput>
            </Field>
            <ExtraFieldsBlock formKey="finance.tax" valueJson={extraJson} onChange={setExtraJson} />
            <div className="md:col-span-2 flex gap-2">
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
          searchPlaceholder="Search name, country…"
          filterLabel="statuses"
          filterValue={statusFilter}
          filterOptions={[
            { value: "active", label: "active" },
            { value: "inactive", label: "inactive" }
          ]}
          onFilterChange={setStatusFilter}
          sortValue={sortField}
          sortOptions={[
            { value: "name", label: "Name" },
            { value: "rate", label: "Rate" },
            { value: "country", label: "Country" },
            { value: "status", label: "Status" }
          ]}
          onSortChange={setSortField}
          sortDir={sortDir}
          onSortDirChange={setSortDir}
          onExportCsv={() =>
            exportListCsv({
              tenantId,
              module: "finance",
              filename: "taxes",
              rows: filtered.map((r) => ({
                Name: r.name,
                Rate: r.rate,
                Country: r.country,
                Status: r.status
              }))
            })
          }
          onExportPdf={() =>
            exportListPdf({
              tenantId,
              module: "finance",
              title: "Taxes",
              filename: "taxes",
              columns: ["Name", "Rate", "Country", "Status"],
              rows: filtered.map((r) => [r.name, `${r.rate}%`, r.country, r.status])
            })
          }
        />
        <table className="min-w-full text-left text-sm">
          <thead>
            <tr className="border-b border-line bg-cloud">
              {["Name", "Rate", "Country", "Status", ""].map((h) => (
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
                  {r.name}
                  <ExtraFieldsReadout tenantId={tenantId} formKey="finance.tax" recordId={r.id} />
                </td>
                <td className="px-3 py-3">{r.rate}%</td>
                <td className="px-3 py-3">{r.country}</td>
                <td className="px-3 py-3">
                  <StatusBadge status={r.status} />
                </td>
                <td className="px-3 py-3">
                  <RecordRowActions
                    onEdit={() => openEdit(r)}
                    onTrash={() =>
                      askTrash({
                        entityLabel: "tax rate",
                        name: r.name,
                        onConfirm: () => {
                          trashTax(r.id);
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
