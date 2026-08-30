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
import { Button, Field, Panel, TextInput } from "@/components/ui";
import { getStoredTenantId } from "@/lib/auth/session";
import { exportListCsv, exportListPdf } from "@/lib/list-export";
import { filterAndSort } from "@/lib/list-query";
import { getExtraFieldValues, persistExtraFields } from "@/modules/forms/services/extra-fields.store";
import {
  createShift,
  deleteShift,
  listEmployees,
  listShifts,
  updateShift
} from "@/modules/hrm/services/hrm.store";
import type { Shift } from "@/modules/hrm/model";

const emptyForm = { name: "", start_time: "09:00", end_time: "18:00", grace_minutes: "10" };

export default function ShiftsPage() {
  const tenantId = getStoredTenantId() ?? "alpha";
  const { askSave, askTrash, dialog } = useConfirm();
  const [shifts, setShifts] = useState<Shift[]>([]);
  const [employees, setEmployees] = useState<ReturnType<typeof listEmployees>>([]);
  const [search, setSearch] = useState("");
  const [sortField, setSortField] = useState("name");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");
  const [openForm, setOpenForm] = useState(false);
  const [editing, setEditing] = useState<Shift | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [extraJson, setExtraJson] = useState("");

  function refresh() {
    setShifts(listShifts(tenantId));
    setEmployees(listEmployees(tenantId));
  }

  useEffect(() => {
    refresh();
  }, [tenantId]);

  const filtered = useMemo(
    () =>
      filterAndSort(shifts as unknown as Array<Record<string, unknown>>, {
        search,
        searchFields: ["name", "start_time", "end_time"],
        sortField,
        sortDir
      }) as unknown as Shift[],
    [shifts, search, sortField, sortDir]
  );

  function openCreate() {
    setEditing(null);
    setForm(emptyForm);
    setExtraJson("");
    setOpenForm(true);
  }

  function openEdit(shift: Shift) {
    setEditing(shift);
    setForm({ name: shift.name, start_time: shift.start_time, end_time: shift.end_time, grace_minutes: String(shift.grace_minutes) });
    setExtraJson(getExtraFieldValues(tenantId, "hrm.shift", shift.id));
    setOpenForm(true);
  }

  function doSave() {
    const payload = {
      name: form.name.trim(),
      start_time: form.start_time,
      end_time: form.end_time,
      grace_minutes: Number(form.grace_minutes) || 0
    };
    if (editing) {
      updateShift(editing.id, payload);
      persistExtraFields(tenantId, "hrm.shift", editing.id, extraJson);
    } else {
      const row = createShift(tenantId, payload);
      persistExtraFields(tenantId, "hrm.shift", row.id, extraJson);
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
      entityLabel: "shift",
      onConfirm: doSave
    });
  }

  return (
    <AppShell activeModule="hrm">
      <PageHeader title="Shifts" description="Work shift schedules and grace periods." actionLabel="Add shift" onAction={openCreate} />
      <ModuleBreadcrumbs />

      {openForm ? (
        <Panel className="mb-5 border-teal/40">
          <h2 className="mb-4 text-lg font-bold text-ink">{editing ? "Edit shift" : "Add shift"}</h2>
          <form onSubmit={submit} className="grid gap-4 md:grid-cols-4">
            <Field label="Name" className="md:col-span-2">
              <TextInput required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
            </Field>
            <Field label="Start time">
              <TextInput required type="time" value={form.start_time} onChange={(e) => setForm({ ...form, start_time: e.target.value })} />
            </Field>
            <Field label="End time">
              <TextInput required type="time" value={form.end_time} onChange={(e) => setForm({ ...form, end_time: e.target.value })} />
            </Field>
            <Field label="Grace minutes" className="md:col-span-2">
              <TextInput required type="number" min={0} value={form.grace_minutes} onChange={(e) => setForm({ ...form, grace_minutes: e.target.value })} />
            </Field>
            <ExtraFieldsBlock formKey="hrm.shift" valueJson={extraJson} onChange={setExtraJson} />
            <div className="flex gap-2 md:col-span-4">
              <Button type="submit">{editing ? "Save changes" : "Add shift"}</Button>
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
            searchPlaceholder="Search shifts…"
            sortValue={sortField}
            sortOptions={[
              { value: "name", label: "Name" },
              { value: "start_time", label: "Start" },
              { value: "end_time", label: "End" }
            ]}
            onSortChange={setSortField}
            sortDir={sortDir}
            onSortDirChange={setSortDir}
            onExportCsv={() =>
              exportListCsv({
                tenantId,
                module: "hrm",
                filename: "shifts",
                rows: filtered.map((s) => ({
                  Name: s.name,
                  Start: s.start_time,
                  End: s.end_time,
                  Grace: s.grace_minutes,
                  Employees: employees.filter((e) => e.shift_id === s.id).length
                }))
              })
            }
            onExportPdf={() =>
              exportListPdf({
                tenantId,
                module: "hrm",
                title: "Shifts",
                filename: "shifts",
                columns: ["Name", "Start", "End", "Grace"],
                rows: filtered.map((s) => [s.name, s.start_time, s.end_time, String(s.grace_minutes)])
              })
            }
          />
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full text-left text-sm">
            <thead>
              <tr className="border-b border-line bg-cloud">
                {["Name", "Start", "End", "Grace (min)", "Employees", ""].map((h) => (
                  <th key={h || "a"} className="px-4 py-3 font-semibold text-slate-600">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map((s) => (
                <tr key={s.id} className="border-b border-line">
                  <td className="px-4 py-3 font-medium text-ink">
                    {s.name}
                    <ExtraFieldsReadout tenantId={tenantId} formKey="hrm.shift" recordId={s.id} />
                  </td>
                  <td className="px-4 py-3">{s.start_time}</td>
                  <td className="px-4 py-3">{s.end_time}</td>
                  <td className="px-4 py-3">{s.grace_minutes}</td>
                  <td className="px-4 py-3">{employees.filter((e) => e.shift_id === s.id).length}</td>
                  <td className="px-4 py-3">
                    <RecordRowActions
                      onEdit={() => openEdit(s)}
                      onTrash={() =>
                        askTrash({
                          entityLabel: "shift",
                          name: s.name,
                          onConfirm: () => {
                            deleteShift(s.id);
                            refresh();
                          }
                        })
                      }
                    />
                  </td>
                </tr>
              ))}
              {filtered.length === 0 ? (
                <tr><td colSpan={6} className="px-4 py-8 text-center text-slate-400">No shifts found.</td></tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </Panel>
      {dialog}
    </AppShell>
  );
}
