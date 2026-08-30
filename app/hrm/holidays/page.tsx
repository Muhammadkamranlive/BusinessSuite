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
import { Badge, Button, Field, Panel, SelectInput, TextInput } from "@/components/ui";
import { getStoredTenantId } from "@/lib/auth/session";
import { exportListCsv, exportListPdf } from "@/lib/list-export";
import { filterAndSort } from "@/lib/list-query";
import { getExtraFieldValues, persistExtraFields } from "@/modules/forms/services/extra-fields.store";
import {
  createHoliday,
  deleteHoliday,
  listHolidays,
  updateHoliday
} from "@/modules/hrm/services/hrm.store";
import type { Holiday, HolidayType } from "@/modules/hrm/model";

const emptyForm = { name: "", date: "", type: "gazetted" as HolidayType };

export default function HolidaysPage() {
  const tenantId = getStoredTenantId() ?? "alpha";
  const { askSave, askTrash, dialog } = useConfirm();
  const [holidays, setHolidays] = useState<Holiday[]>([]);
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState("all");
  const [sortField, setSortField] = useState("date");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");
  const [openForm, setOpenForm] = useState(false);
  const [editing, setEditing] = useState<Holiday | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [extraJson, setExtraJson] = useState("");

  function refresh() {
    setHolidays(listHolidays(tenantId));
  }

  useEffect(() => {
    refresh();
  }, [tenantId]);

  const filtered = useMemo(
    () =>
      filterAndSort(holidays as unknown as Array<Record<string, unknown>>, {
        search,
        searchFields: ["name", "date", "type"],
        statusField: "type",
        statusValue: typeFilter,
        sortField,
        sortDir
      }) as unknown as Holiday[],
    [holidays, search, typeFilter, sortField, sortDir]
  );

  function openCreate() {
    setEditing(null);
    setForm(emptyForm);
    setExtraJson("");
    setOpenForm(true);
  }

  function openEdit(holiday: Holiday) {
    setEditing(holiday);
    setForm({ name: holiday.name, date: holiday.date, type: holiday.type });
    setExtraJson(getExtraFieldValues(tenantId, "hrm.holiday", holiday.id));
    setOpenForm(true);
  }

  function doSave() {
    const payload = { name: form.name.trim(), date: form.date, type: form.type };
    if (editing) {
      updateHoliday(editing.id, payload);
      persistExtraFields(tenantId, "hrm.holiday", editing.id, extraJson);
    } else {
      const row = createHoliday(tenantId, payload);
      persistExtraFields(tenantId, "hrm.holiday", row.id, extraJson);
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
      entityLabel: "holiday",
      onConfirm: doSave
    });
  }

  return (
    <AppShell activeModule="hrm">
      <PageHeader title="Holidays" description="Gazetted and company holidays." actionLabel="Add holiday" onAction={openCreate} />
      <ModuleBreadcrumbs />

      {openForm ? (
        <Panel className="mb-5 border-teal/40">
          <h2 className="mb-4 text-lg font-bold text-ink">{editing ? "Edit holiday" : "Add holiday"}</h2>
          <form onSubmit={submit} className="grid gap-4 md:grid-cols-3">
            <Field label="Name">
              <TextInput required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
            </Field>
            <Field label="Date">
              <TextInput required type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} />
            </Field>
            <Field label="Type">
              <SelectInput value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value as HolidayType })}>
                <option value="gazetted">Gazetted</option>
                <option value="company">Company</option>
              </SelectInput>
            </Field>
            <ExtraFieldsBlock formKey="hrm.holiday" valueJson={extraJson} onChange={setExtraJson} />
            <div className="flex gap-2 md:col-span-3">
              <Button type="submit">{editing ? "Save changes" : "Add holiday"}</Button>
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
            searchPlaceholder="Search holidays…"
            filterLabel="types"
            filterValue={typeFilter}
            filterOptions={[
              { value: "gazetted", label: "gazetted" },
              { value: "company", label: "company" }
            ]}
            onFilterChange={setTypeFilter}
            sortValue={sortField}
            sortOptions={[
              { value: "date", label: "Date" },
              { value: "name", label: "Name" },
              { value: "type", label: "Type" }
            ]}
            onSortChange={setSortField}
            sortDir={sortDir}
            onSortDirChange={setSortDir}
            onExportCsv={() =>
              exportListCsv({
                tenantId,
                module: "hrm",
                filename: "holidays",
                rows: filtered.map((h) => ({
                  Date: h.date,
                  Name: h.name,
                  Type: h.type
                }))
              })
            }
            onExportPdf={() =>
              exportListPdf({
                tenantId,
                module: "hrm",
                title: "Holidays",
                filename: "holidays",
                columns: ["Date", "Name", "Type"],
                rows: filtered.map((h) => [h.date, h.name, h.type])
              })
            }
          />
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full text-left text-sm">
            <thead>
              <tr className="border-b border-line bg-cloud">
                {["Date", "Name", "Type", ""].map((h) => (
                  <th key={h || "a"} className="px-4 py-3 font-semibold text-slate-600">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map((h) => (
                <tr key={h.id} className="border-b border-line">
                  <td className="px-4 py-3">{h.date}</td>
                  <td className="px-4 py-3 font-medium text-ink">
                    {h.name}
                    <ExtraFieldsReadout tenantId={tenantId} formKey="hrm.holiday" recordId={h.id} />
                  </td>
                  <td className="px-4 py-3"><Badge tone={h.type === "gazetted" ? "info" : "neutral"}>{h.type}</Badge></td>
                  <td className="px-4 py-3">
                    <RecordRowActions
                      onEdit={() => openEdit(h)}
                      onTrash={() =>
                        askTrash({
                          entityLabel: "holiday",
                          name: h.name,
                          onConfirm: () => {
                            deleteHoliday(h.id);
                            refresh();
                          }
                        })
                      }
                    />
                  </td>
                </tr>
              ))}
              {filtered.length === 0 ? (
                <tr><td colSpan={4} className="px-4 py-8 text-center text-slate-400">No holidays found.</td></tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </Panel>
      {dialog}
    </AppShell>
  );
}
