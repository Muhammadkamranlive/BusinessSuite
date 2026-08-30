"use client";

import { useEffect, useMemo, useState } from "react";
import { AppShell } from "@/components/app-shell";
import { PageHeader } from "@/components/common/page-header";
import { ModuleBreadcrumbs } from "@/components/common/module-breadcrumbs";
import { DataListToolbar } from "@/components/common/data-list-toolbar";
import { RecordRowActions } from "@/components/common/record-row-actions";
import { useConfirm } from "@/components/common/use-confirm";
import { ExtraFieldsBlock } from "@/components/forms/extra-fields-block";
import { ExtraFieldsReadout } from "@/components/forms/extra-fields-readout";
import { Badge, Button, Field, Panel, TextInput } from "@/components/ui";
import { getStoredTenantId } from "@/lib/auth/session";
import { exportListCsv, exportListPdf } from "@/lib/list-export";
import { filterAndSort } from "@/lib/list-query";
import { getExtraFieldValues, persistExtraFields } from "@/modules/forms/services/extra-fields.store";
import {
  createDesignation,
  deleteDesignation,
  listDesignations,
  listEmployees,
  updateDesignation
} from "@/modules/hrm/services/hrm.store";
import type { Designation } from "@/modules/hrm/model";

const emptyForm = { name: "", code: "", description: "" };

export default function DesignationsPage() {
  const tenantId = getStoredTenantId() ?? "alpha";
  const { askSave, askTrash, dialog } = useConfirm();
  const [designations, setDesignations] = useState<Designation[]>([]);
  const [employeeCount, setEmployeeCount] = useState<ReturnType<typeof listEmployees>>([]);
  const [search, setSearch] = useState("");
  const [sortField, setSortField] = useState("name");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");
  const [openForm, setOpenForm] = useState(false);
  const [editing, setEditing] = useState<Designation | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [extraJson, setExtraJson] = useState("");

  function refresh() {
    setDesignations(listDesignations(tenantId));
    setEmployeeCount(listEmployees(tenantId));
  }

  useEffect(() => {
    refresh();
  }, [tenantId]);

  const filtered = useMemo(
    () =>
      filterAndSort(designations as unknown as Array<Record<string, unknown>>, {
        search,
        searchFields: ["name", "code", "description"],
        sortField,
        sortDir
      }) as unknown as Designation[],
    [designations, search, sortField, sortDir]
  );

  function openCreate() {
    setEditing(null);
    setForm(emptyForm);
    setExtraJson("");
    setOpenForm(true);
  }

  function openEdit(designation: Designation) {
    setEditing(designation);
    setForm({ name: designation.name, code: designation.code, description: designation.description ?? "" });
    setExtraJson(getExtraFieldValues(tenantId, "hrm.designation", designation.id));
    setOpenForm(true);
  }

  function doSave() {
    const payload = { name: form.name.trim(), code: form.code.trim(), description: form.description.trim() || null };
    if (editing) {
      updateDesignation(editing.id, payload);
      persistExtraFields(tenantId, "hrm.designation", editing.id, extraJson);
    } else {
      const row = createDesignation(tenantId, payload);
      persistExtraFields(tenantId, "hrm.designation", row.id, extraJson);
    }
    setExtraJson("");
    setOpenForm(false);
    setEditing(null);
    setForm(emptyForm);
    refresh();
  }

  function submit(e: React.FormEvent) {
    e.preventDefault();
    askSave({
      editing: Boolean(editing),
      entityLabel: "designation",
      onConfirm: doSave
    });
  }

  return (
    <AppShell activeModule="hrm">
      <PageHeader title="Designations" description="Job titles and grades." actionLabel="Add designation" onAction={openCreate} />
      <ModuleBreadcrumbs />

      {openForm ? (
        <Panel className="mb-5 border-teal/40">
          <h2 className="mb-4 text-lg font-bold text-ink">{editing ? "Edit designation" : "Add designation"}</h2>
          <form onSubmit={submit} className="grid gap-4 md:grid-cols-2">
            <Field label="Name">
              <TextInput required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
            </Field>
            <Field label="Code">
              <TextInput required value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value })} />
            </Field>
            <Field label="Description" className="md:col-span-2">
              <TextInput value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="Optional" />
            </Field>
            <ExtraFieldsBlock formKey="hrm.designation" valueJson={extraJson} onChange={setExtraJson} />
            <div className="flex gap-2 md:col-span-2">
              <Button type="submit">{editing ? "Save changes" : "Add designation"}</Button>
              <Button type="button" variant="secondary" onClick={() => { setOpenForm(false); setEditing(null); setExtraJson(""); }}>Cancel</Button>
            </div>
          </form>
        </Panel>
      ) : null}

      <Panel className="overflow-hidden p-0">
        <div className="p-4">
          <DataListToolbar
            search={search}
            onSearchChange={setSearch}
            searchPlaceholder="Search designations…"
            sortValue={sortField}
            sortOptions={[
              { value: "name", label: "Name" },
              { value: "code", label: "Code" }
            ]}
            onSortChange={setSortField}
            sortDir={sortDir}
            onSortDirChange={setSortDir}
            onExportCsv={() =>
              exportListCsv({
                tenantId,
                module: "hrm",
                filename: "designations",
                rows: filtered.map((d) => ({
                  Code: d.code,
                  Name: d.name,
                  Employees: employeeCount.filter((e) => e.designation_id === d.id).length,
                  Description: d.description ?? ""
                }))
              })
            }
            onExportPdf={() =>
              exportListPdf({
                tenantId,
                module: "hrm",
                title: "Designations",
                filename: "designations",
                columns: ["Code", "Name", "Employees"],
                rows: filtered.map((d) => [d.code, d.name, String(employeeCount.filter((e) => e.designation_id === d.id).length)])
              })
            }
          />
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full text-left text-sm">
            <thead>
              <tr className="border-b border-line bg-cloud">
                {["Code", "Name", "Employees", "Description", ""].map((h) => (
                  <th key={h || "a"} className="px-4 py-3 font-semibold text-slate-600">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map((d) => (
                <tr key={d.id} className="border-b border-line">
                  <td className="px-4 py-3"><Badge tone="neutral">{d.code}</Badge></td>
                  <td className="px-4 py-3 font-medium text-ink">
                    {d.name}
                    <ExtraFieldsReadout tenantId={tenantId} formKey="hrm.designation" recordId={d.id} />
                  </td>
                  <td className="px-4 py-3">{employeeCount.filter((e) => e.designation_id === d.id).length}</td>
                  <td className="px-4 py-3 text-slate-500">{d.description ?? "—"}</td>
                  <td className="px-4 py-3">
                    <RecordRowActions
                      onEdit={() => openEdit(d)}
                      onTrash={() =>
                        askTrash({
                          entityLabel: "designation",
                          name: d.name,
                          onConfirm: () => {
                            deleteDesignation(d.id);
                            refresh();
                          }
                        })
                      }
                    />
                  </td>
                </tr>
              ))}
              {filtered.length === 0 ? (
                <tr><td colSpan={5} className="px-4 py-8 text-center text-slate-400">No designations found.</td></tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </Panel>
      {dialog}
    </AppShell>
  );
}
