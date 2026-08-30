"use client";

import { useMemo, useState } from "react";
import { AppShell } from "@/components/app-shell";
import { PageHeader } from "@/components/common/page-header";
import { ModuleBreadcrumbs } from "@/components/common/module-breadcrumbs";
import { DataListToolbar } from "@/components/common/data-list-toolbar";
import { RecordRowActions } from "@/components/common/record-row-actions";
import { StatusBadge } from "@/components/common/status-badge";
import { useConfirm } from "@/components/common/use-confirm";
import { ExtraFieldsBlock } from "@/components/forms/extra-fields-block";
import { ExtraFieldsReadout } from "@/components/forms/extra-fields-readout";
import { Button, Field, Panel, SelectInput, TextInput } from "@/components/ui";
import { getStoredTenantId } from "@/lib/auth/session";
import { exportListCsv, exportListPdf } from "@/lib/list-export";
import { filterAndSort } from "@/lib/list-query";
import { persistExtraFields } from "@/modules/forms/services/extra-fields.store";
import {
  assignAsset,
  createAsset,
  deleteAsset,
  getEmployeeName,
  listAssets,
  listEmployees,
  retireAsset,
  unassignAsset
} from "@/modules/hrm/services/hrm.store";

export default function AssetsPage() {
  const tenantId = getStoredTenantId() ?? "alpha";
  const { askSave, askTrash, ask, dialog } = useConfirm();
  const [tick, setTick] = useState(0);
  const refresh = () => setTick((n) => n + 1);

  const assets = useMemo(() => listAssets(tenantId), [tenantId, tick]);
  const employees = useMemo(() => listEmployees(tenantId), [tenantId, tick]);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [sortField, setSortField] = useState("name");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");

  const [showForm, setShowForm] = useState(false);
  const [extraJson, setExtraJson] = useState("");
  const [form, setForm] = useState({ name: "", tag_code: "", category: "", notes: "" });
  const [assignTarget, setAssignTarget] = useState<Record<string, string>>({});

  const enriched = useMemo(
    () => assets.map((a) => ({ ...a, assigned_name: getEmployeeName(a.assigned_employee_id) })),
    [assets]
  );

  const filtered = useMemo(
    () =>
      filterAndSort(enriched as unknown as Array<Record<string, unknown>>, {
        search,
        searchFields: ["name", "tag_code", "category", "assigned_name"],
        statusField: "status",
        statusValue: statusFilter,
        sortField,
        sortDir
      }) as unknown as typeof enriched,
    [enriched, search, statusFilter, sortField, sortDir]
  );

  function doSave() {
    if (!form.name.trim() || !form.tag_code.trim() || !form.category.trim()) return;
    const row = createAsset(tenantId, {
      name: form.name.trim(),
      tag_code: form.tag_code.trim(),
      category: form.category.trim(),
      assigned_employee_id: null,
      status: "available",
      notes: form.notes.trim() || null
    });
    persistExtraFields(tenantId, "hrm.asset", row.id, extraJson);
    setExtraJson("");
    setForm({ name: "", tag_code: "", category: "", notes: "" });
    setShowForm(false);
    refresh();
  }

  function submit(e: React.FormEvent) {
    e.preventDefault();
    askSave({ editing: false, entityLabel: "asset", onConfirm: doSave });
  }

  function handleAssign(assetId: string) {
    const employeeId = assignTarget[assetId];
    if (!employeeId) return;
    assignAsset(assetId, employeeId);
    refresh();
  }

  return (
    <AppShell activeModule="hrm">
      <PageHeader
        title="Assets"
        description="Track company assets and their assignment lifecycle."
        actionLabel={showForm ? undefined : "New asset"}
        onAction={() => { setExtraJson(""); setShowForm(true); }}
      />
      <ModuleBreadcrumbs />

      {showForm ? (
        <Panel className="mb-5">
          <h2 className="mb-4 text-lg font-bold text-ink">New asset</h2>
          <form onSubmit={submit} className="grid gap-4 md:grid-cols-2">
            <Field label="Asset name">
              <TextInput required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
            </Field>
            <Field label="Tag code">
              <TextInput required value={form.tag_code} onChange={(e) => setForm({ ...form, tag_code: e.target.value })} />
            </Field>
            <Field label="Category">
              <TextInput required value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} />
            </Field>
            <Field label="Notes" className="md:col-span-2">
              <TextInput value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
            </Field>
            <ExtraFieldsBlock formKey="hrm.asset" valueJson={extraJson} onChange={setExtraJson} />
            <div className="flex items-end gap-2 md:col-span-2">
              <Button type="submit">Save asset</Button>
              <Button type="button" variant="secondary" onClick={() => { setExtraJson(""); setShowForm(false); }}>
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
          searchPlaceholder="Search tag, name, category…"
          filterLabel="statuses"
          filterValue={statusFilter}
          filterOptions={[
            { value: "available", label: "available" },
            { value: "assigned", label: "assigned" },
            { value: "retired", label: "retired" }
          ]}
          onFilterChange={setStatusFilter}
          sortValue={sortField}
          sortOptions={[
            { value: "name", label: "Name" },
            { value: "tag_code", label: "Tag" },
            { value: "category", label: "Category" },
            { value: "status", label: "Status" }
          ]}
          onSortChange={setSortField}
          sortDir={sortDir}
          onSortDirChange={setSortDir}
          onExportCsv={() =>
            exportListCsv({
              tenantId,
              module: "hrm",
              filename: "assets",
              rows: filtered.map((a) => ({
                Tag: a.tag_code,
                Name: a.name,
                Category: a.category,
                Assigned: a.assigned_name,
                Status: a.status
              }))
            })
          }
          onExportPdf={() =>
            exportListPdf({
              tenantId,
              module: "hrm",
              title: "Assets",
              filename: "assets",
              columns: ["Tag", "Name", "Category", "Status"],
              rows: filtered.map((a) => [a.tag_code, a.name, a.category, a.status])
            })
          }
        />
        <table className="min-w-full text-left text-sm">
          <thead>
            <tr className="border-b border-line bg-cloud">
              {["Tag", "Name", "Category", "Assigned To", "Status", "Actions"].map((h) => (
                <th key={h} className="px-3 py-3 font-semibold text-slate-600">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filtered.map((a) => (
              <tr key={a.id} className="border-b border-line">
                <td className="px-3 py-3 font-medium">{a.tag_code}</td>
                <td className="px-3 py-3">
                  {a.name}
                  <ExtraFieldsReadout tenantId={tenantId} formKey="hrm.asset" recordId={a.id} />
                </td>
                <td className="px-3 py-3">{a.category}</td>
                <td className="px-3 py-3">{a.assigned_name}</td>
                <td className="px-3 py-3">
                  <StatusBadge status={a.status} />
                </td>
                <td className="px-3 py-3">
                  <div className="flex flex-wrap items-center gap-1">
                    {a.status === "retired" ? null : a.status === "assigned" ? (
                      <>
                        <Button
                          variant="secondary"
                          className="!px-2 !py-1 !text-xs"
                          onClick={() => {
                            unassignAsset(a.id);
                            refresh();
                          }}
                        >
                          Unassign
                        </Button>
                        <Button
                          variant="danger"
                          className="!px-2 !py-1 !text-xs"
                          onClick={() =>
                            ask({
                              title: "Retire asset?",
                              message: `"${a.name}" will be marked retired.`,
                              confirmLabel: "Retire",
                              tone: "danger",
                              onConfirm: () => {
                                retireAsset(a.id);
                                refresh();
                              }
                            })
                          }
                        >
                          Retire
                        </Button>
                      </>
                    ) : (
                      <>
                        <SelectInput
                          className="!h-9 !py-1 !text-xs"
                          value={assignTarget[a.id] ?? ""}
                          onChange={(e) => setAssignTarget({ ...assignTarget, [a.id]: e.target.value })}
                        >
                          <option value="">Select employee…</option>
                          {employees.map((emp) => (
                            <option key={emp.id} value={emp.id}>
                              {emp.full_name}
                            </option>
                          ))}
                        </SelectInput>
                        <Button className="!px-2 !py-1 !text-xs" onClick={() => handleAssign(a.id)}>
                          Assign
                        </Button>
                        <Button
                          variant="danger"
                          className="!px-2 !py-1 !text-xs"
                          onClick={() =>
                            ask({
                              title: "Retire asset?",
                              message: `"${a.name}" will be marked retired.`,
                              confirmLabel: "Retire",
                              tone: "danger",
                              onConfirm: () => {
                                retireAsset(a.id);
                                refresh();
                              }
                            })
                          }
                        >
                          Retire
                        </Button>
                      </>
                    )}
                    <RecordRowActions
                      onTrash={() =>
                        askTrash({
                          entityLabel: "asset",
                          name: a.name,
                          onConfirm: () => {
                            deleteAsset(a.id);
                            refresh();
                          }
                        })
                      }
                    />
                  </div>
                </td>
              </tr>
            ))}
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-3 py-6 text-center text-slate-400">
                  No assets yet.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </Panel>
      {dialog}
    </AppShell>
  );
}
