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
import { Button, Field, Panel, SelectInput, TextInput } from "@/components/ui";
import { getStoredTenantId } from "@/lib/auth/session";
import { exportListCsv } from "@/lib/list-export";
import { filterAndSort } from "@/lib/list-query";
import { persistExtraFields } from "@/modules/forms/services/extra-fields.store";
import {
  createBed,
  listBeds,
  listWards,
  pullHmsClinicalFromSupabase,
  setBedHousekeeping,
  setBedStatus,
  subscribeHmsClinical,
  trashBed,
  type HmsBed
} from "@/modules/healthcare/services/hms-clinical.store";

const empty = { ward_id: "", bed_no: "", status: "available" as HmsBed["status"], housekeeping_status: "clean" as HmsBed["housekeeping_status"] };

export default function HmsBedsPage() {
  const tenantId = getStoredTenantId() ?? "alpha";
  const { askSave, askTrash, dialog } = useConfirm();
  const [rows, setRows] = useState<HmsBed[]>([]);
  const [wards, setWards] = useState(listWards(tenantId));
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [sortField, setSortField] = useState("bed_no");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");
  const [openForm, setOpenForm] = useState(false);
  const [form, setForm] = useState(empty);
  const [extraJson, setExtraJson] = useState("");

  function refresh() {
    setRows(listBeds(tenantId));
    setWards(listWards(tenantId));
  }
  useEffect(() => {
    void pullHmsClinicalFromSupabase(tenantId).finally(() => refresh());
    return subscribeHmsClinical(() => refresh());
  }, [tenantId]);

  const wardMap = useMemo(() => Object.fromEntries(wards.map((w) => [w.id, w.name])), [wards]);

  const filtered = useMemo(
    () =>
      filterAndSort(rows as unknown as Array<Record<string, unknown>>, {
        search,
        searchFields: ["bed_no", "status", "housekeeping_status"],
        statusField: "status",
        statusValue: statusFilter,
        sortField,
        sortDir
      }) as unknown as HmsBed[],
    [rows, search, statusFilter, sortField, sortDir]
  );

  function doSave() {
    if (!form.ward_id || !form.bed_no.trim()) return;
    const row = createBed(tenantId, {
      ward_id: form.ward_id,
      bed_no: form.bed_no.trim(),
      status: form.status,
      housekeeping_status: form.housekeeping_status
    });
    persistExtraFields(tenantId, "healthcare.hms.bed", row.id, extraJson);
    setOpenForm(false);
    refresh();
  }

  return (
    <AppShell activeModule="healthcare">
      {dialog}
      <ModuleBreadcrumbs />
      <PageHeader
        title="Beds"
        description="Bed inventory — status, housekeeping, and ward allocation."
        actionLabel="Add bed"
        onAction={() => {
          setForm({ ...empty, ward_id: wards[0]?.id ?? "" });
          setExtraJson("");
          setOpenForm(true);
        }}
      />
      {openForm ? (
        <Panel className="mb-4">
          <form
            className="grid gap-3 md:grid-cols-2"
            onSubmit={(e) => {
              e.preventDefault();
              askSave({ editing: false, entityLabel: "bed", onConfirm: doSave });
            }}
          >
            <Field label="Ward">
              <SelectInput value={form.ward_id} onChange={(e) => setForm({ ...form, ward_id: e.target.value })}>
                <option value="">Select…</option>
                {wards.map((w) => (
                  <option key={w.id} value={w.id}>
                    {w.code} · {w.name}
                  </option>
                ))}
              </SelectInput>
            </Field>
            <Field label="Bed no">
              <TextInput required value={form.bed_no} onChange={(e) => setForm({ ...form, bed_no: e.target.value })} />
            </Field>
            <Field label="Status">
              <SelectInput value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value as HmsBed["status"] })}>
                <option value="available">Available</option>
                <option value="occupied">Occupied</option>
                <option value="housekeeping">Housekeeping</option>
                <option value="maintenance">Maintenance</option>
                <option value="blocked">Blocked</option>
              </SelectInput>
            </Field>
            <Field label="Housekeeping">
              <SelectInput
                value={form.housekeeping_status}
                onChange={(e) => setForm({ ...form, housekeeping_status: e.target.value as HmsBed["housekeeping_status"] })}
              >
                <option value="clean">Clean</option>
                <option value="dirty">Dirty</option>
                <option value="in_progress">In progress</option>
              </SelectInput>
            </Field>
            <div className="md:col-span-2">
              <ExtraFieldsBlock formKey="healthcare.hms.bed" valueJson={extraJson} onChange={setExtraJson} />
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
            { value: "available", label: "Available" },
            { value: "occupied", label: "Occupied" },
            { value: "housekeeping", label: "Housekeeping" },
            { value: "maintenance", label: "Maintenance" }
          ]}
          onFilterChange={setStatusFilter}
          sortValue={sortField}
          sortOptions={[{ value: "bed_no", label: "Bed no" }]}
          onSortChange={setSortField}
          sortDir={sortDir}
          onSortDirChange={setSortDir}
          onExportCsv={() =>
            exportListCsv({
              tenantId,
              module: "healthcare",
              filename: "hms-beds",
              rows: filtered.map((r) => ({
                Bed: r.bed_no,
                Ward: wardMap[r.ward_id] ?? r.ward_id,
                Status: r.status,
                Housekeeping: r.housekeeping_status
              }))
            })
          }
        />
        <div className="mt-3 overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-slate-500">
                <th className="px-3 py-2">Bed</th>
                <th>Ward</th>
                <th>Status</th>
                <th>Housekeeping</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {filtered.map((row) => (
                <tr key={row.id} className="border-t border-line">
                  <td className="px-3 py-3 font-semibold">{row.bed_no}</td>
                  <td>{wardMap[row.ward_id] ?? "—"}</td>
                  <td>
                    <StatusBadge status={row.status} />
                  </td>
                  <td>{row.housekeeping_status}</td>
                  <td>
                    <div className="flex flex-wrap gap-1">
                      <SelectInput
                        className="!w-auto !py-1 text-xs"
                        value={row.status}
                        onChange={(e) => {
                          setBedStatus(row.id, e.target.value as HmsBed["status"]);
                          refresh();
                        }}
                      >
                        <option value="available">Available</option>
                        <option value="occupied">Occupied</option>
                        <option value="housekeeping">Housekeeping</option>
                        <option value="maintenance">Maintenance</option>
                        <option value="blocked">Blocked</option>
                      </SelectInput>
                      <SelectInput
                        className="!w-auto !py-1 text-xs"
                        value={row.housekeeping_status}
                        onChange={(e) => {
                          setBedHousekeeping(row.id, e.target.value as HmsBed["housekeeping_status"]);
                          refresh();
                        }}
                      >
                        <option value="clean">Clean</option>
                        <option value="dirty">Dirty</option>
                        <option value="in_progress">In progress</option>
                      </SelectInput>
                      <RecordRowActions
                        onEdit={() => undefined}
                        onTrash={() =>
                          askTrash({
                            entityLabel: "bed",
                            onConfirm: () => {
                              trashBed(row.id);
                              refresh();
                            }
                          })
                        }
                      />
                    </div>
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
