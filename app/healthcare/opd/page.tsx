"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { AppShell } from "@/components/app-shell";
import { ModuleBreadcrumbs } from "@/components/common/module-breadcrumbs";
import { PageHeader } from "@/components/common/page-header";
import { StatusBadge } from "@/components/common/status-badge";
import { DataListToolbar } from "@/components/common/data-list-toolbar";
import { useConfirm } from "@/components/common/use-confirm";
import { Button, Field, Panel, SelectInput, TextInput } from "@/components/ui";
import { getStoredTenantId } from "@/lib/auth/session";
import { exportListCsv } from "@/lib/list-export";
import { filterAndSort } from "@/lib/list-query";
import {
  createEncounter,
  listEncounters,
  listPatients,
  pullHmsFromSupabase,
  subscribeHms,
  updateEncounter,
  type HmsEncounter
} from "@/modules/healthcare/services/hms.store";

export default function OpdEncountersPage() {
  const tenantId = getStoredTenantId() ?? "alpha";
  const { askSave, dialog } = useConfirm();
  const [rows, setRows] = useState<HmsEncounter[]>([]);
  const [patients, setPatients] = useState(listPatients(tenantId));
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [sortField, setSortField] = useState("visit_date");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");
  const [openForm, setOpenForm] = useState(false);
  const [form, setForm] = useState({
    patient_id: "",
    doctor_name: "",
    department: "General",
    chief_complaint: ""
  });

  function refresh() {
    setRows(listEncounters(tenantId).filter((e) => e.encounter_type === "opd"));
    setPatients(listPatients(tenantId));
  }
  useEffect(() => {
    void pullHmsFromSupabase(tenantId).finally(() => refresh());
    return subscribeHms(() => refresh());
  }, [tenantId]);

  const filtered = useMemo(
    () =>
      filterAndSort(rows as unknown as Array<Record<string, unknown>>, {
        search,
        searchFields: ["encounter_no", "patient_name", "doctor_name", "token_no", "queue_status"],
        statusField: "queue_status",
        statusValue: statusFilter,
        sortField,
        sortDir
      }) as unknown as HmsEncounter[],
    [rows, search, statusFilter, sortField, sortDir]
  );

  const queue = filtered.filter((e) => ["waiting", "called", "in_consult"].includes(e.queue_status));

  function doSave() {
    const patient = patients.find((p) => p.id === form.patient_id);
    if (!patient) return;
    createEncounter(tenantId, {
      encounter_type: "opd",
      patient_id: patient.id,
      patient_name: patient.full_name,
      doctor_name: form.doctor_name || null,
      department: form.department || null,
      queue_status: "waiting",
      visit_date: new Date().toISOString().slice(0, 10),
      chief_complaint: form.chief_complaint || null,
      appointment_id: null,
      status: "open",
      actor: "receptionist"
    });
    setOpenForm(false);
    refresh();
  }

  return (
    <AppShell activeModule="healthcare">
      {dialog}
      <ModuleBreadcrumbs />
      <PageHeader
        title="OPD encounters"
        description="Token/queue generation, doctor & department visits, real-time queue board."
        actionLabel="New OPD visit"
        onAction={() => {
          setForm({ patient_id: patients[0]?.id ?? "", doctor_name: "", department: "General", chief_complaint: "" });
          setOpenForm(true);
        }}
      />
      <Panel className="mb-4">
        <h2 className="text-sm font-semibold">Live queue</h2>
        <div className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
          {queue.length ? (
            queue.map((e) => (
              <div key={e.id} className="rounded-[var(--bs-radius)] border border-line px-3 py-2 text-sm">
                <div className="font-semibold">Token {e.token_no}</div>
                <div>{e.patient_name}</div>
                <div className="text-xs text-slate-500">
                  {e.doctor_name || "Unassigned"} · {e.department}
                </div>
                <StatusBadge status={e.queue_status} />
              </div>
            ))
          ) : (
            <p className="text-sm text-slate-500">No patients waiting.</p>
          )}
        </div>
      </Panel>
      {openForm ? (
        <Panel className="mb-4">
          <form
            className="grid gap-3 md:grid-cols-2"
            onSubmit={(e) => {
              e.preventDefault();
              askSave({ editing: false, entityLabel: "OPD encounter", onConfirm: doSave });
            }}
          >
            <Field label="Patient">
              <SelectInput value={form.patient_id} onChange={(e) => setForm({ ...form, patient_id: e.target.value })}>
                <option value="">Select…</option>
                {patients.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.mrn} · {p.full_name}
                  </option>
                ))}
              </SelectInput>
            </Field>
            <Field label="Doctor">
              <TextInput value={form.doctor_name} onChange={(e) => setForm({ ...form, doctor_name: e.target.value })} />
            </Field>
            <Field label="Department">
              <TextInput value={form.department} onChange={(e) => setForm({ ...form, department: e.target.value })} />
            </Field>
            <Field label="Chief complaint">
              <TextInput value={form.chief_complaint} onChange={(e) => setForm({ ...form, chief_complaint: e.target.value })} />
            </Field>
            <div className="md:col-span-2">
              <Button type="submit">Create visit + token</Button>
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
            { value: "waiting", label: "Waiting" },
            { value: "called", label: "Called" },
            { value: "in_consult", label: "In consult" },
            { value: "completed", label: "Completed" }
          ]}
          onFilterChange={setStatusFilter}
          sortValue={sortField}
          sortOptions={[{ value: "visit_date", label: "Date" }, { value: "token_no", label: "Token" }]}
          onSortChange={setSortField}
          sortDir={sortDir}
          onSortDirChange={setSortDir}
          onExportCsv={() =>
            exportListCsv({
              tenantId,
              module: "healthcare",
              filename: "opd-encounters",
              rows: filtered.map((r) => ({
                Encounter: r.encounter_no,
                Token: r.token_no ?? "",
                Patient: r.patient_name,
                Queue: r.queue_status
              }))
            })
          }
        />
        <div className="mt-3 overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-slate-500">
                <th className="px-3 py-2">Visit</th>
                <th>Patient</th>
                <th>Queue</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((row) => (
                <tr key={row.id} className="border-t border-line">
                  <td className="px-3 py-3">
                    <div className="font-semibold">{row.encounter_no}</div>
                    <div className="text-xs text-slate-500">
                      Token {row.token_no} · {row.visit_date}
                    </div>
                  </td>
                  <td>
                    {row.patient_name}
                    <div className="text-xs text-slate-500">
                      {row.doctor_name} · {row.department}
                    </div>
                  </td>
                  <td>
                    <StatusBadge status={row.queue_status} />
                  </td>
                  <td>
                    <div className="flex flex-wrap gap-1">
                      {row.queue_status === "waiting" ? (
                        <Button type="button" variant="secondary" className="!px-2 !py-1 text-xs" onClick={() => { updateEncounter(row.id, { queue_status: "called" }, "nurse"); refresh(); }}>
                          Call
                        </Button>
                      ) : null}
                      {["waiting", "called"].includes(row.queue_status) ? (
                        <Button type="button" variant="secondary" className="!px-2 !py-1 text-xs" onClick={() => { updateEncounter(row.id, { queue_status: "in_consult" }, "doctor"); refresh(); }}>
                          Start consult
                        </Button>
                      ) : null}
                      {row.queue_status !== "completed" ? (
                        <Button type="button" variant="primary" className="!px-2 !py-1 text-xs" onClick={() => { updateEncounter(row.id, { queue_status: "completed", status: "closed" }, "doctor"); refresh(); }}>
                          Complete
                        </Button>
                      ) : null}
                      {row.patient_id ? (
                        <Link
                          href={`/healthcare/appointments?followUp=${row.patient_id}`}
                          className="inline-flex items-center rounded-[var(--bs-radius)] border border-line px-2 py-1 text-xs font-semibold text-teal hover:bg-cloud"
                        >
                          Schedule follow-up
                        </Link>
                      ) : null}
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
