"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { AppShell } from "@/components/app-shell";
import { ModuleBreadcrumbs } from "@/components/common/module-breadcrumbs";
import { PageHeader } from "@/components/common/page-header";
import { StatusBadge } from "@/components/common/status-badge";
import { DataListToolbar } from "@/components/common/data-list-toolbar";
import { useConfirm } from "@/components/common/use-confirm";
import { Button, Field, Panel, SectionHeader, SelectInput, TextInput } from "@/components/ui";
import { getStoredTenantId } from "@/lib/auth/session";
import { exportListCsv } from "@/lib/list-export";
import { filterAndSort } from "@/lib/list-query";
import {
  addWaitlistEntry,
  createDoctorLeave,
  isDoctorOnLeave,
  listDoctorLeaves,
  listWaitlistEntries,
  pullHmsClinicalFromSupabase,
  subscribeHmsClinical,
  updateWaitlistEntry,
  type HmsDoctorLeave,
  type HmsWaitlistEntry
} from "@/modules/healthcare/services/hms-clinical.store";
import {
  createAppointment,
  listAppointments,
  listPatients,
  pullHmsFromSupabase,
  subscribeHms,
  updateAppointment,
  type HmsAppointment
} from "@/modules/healthcare/services/hms.store";

type Tab = "calendar" | "waitlist" | "leave";

function dateKey(iso: string) {
  return iso.slice(0, 10);
}

export default function AppointmentsPage() {
  const tenantId = getStoredTenantId() ?? "alpha";
  const router = useRouter();
  const searchParams = useSearchParams();
  const followUpPatientId = searchParams.get("followUp") ?? "";

  const { askSave, ask, dialog } = useConfirm();
  const [tab, setTab] = useState<Tab>("calendar");
  const [rows, setRows] = useState<HmsAppointment[]>([]);
  const [waitlist, setWaitlist] = useState<HmsWaitlistEntry[]>([]);
  const [leaves, setLeaves] = useState<HmsDoctorLeave[]>([]);
  const [patients, setPatients] = useState(listPatients(tenantId));
  const [search, setSearch] = useState("");
  const [doctorFilter, setDoctorFilter] = useState("all");
  const [deptFilter, setDeptFilter] = useState("all");
  const [dateFilter, setDateFilter] = useState("");
  const [sortField, setSortField] = useState("scheduled_at");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");
  const [openForm, setOpenForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [cancelReason, setCancelReason] = useState("");
  const [leaveWarn, setLeaveWarn] = useState("");
  const [form, setForm] = useState({
    patient_id: "",
    doctor_name: "",
    department: "General",
    scheduled_at: "",
    notes: ""
  });
  const [waitForm, setWaitForm] = useState({
    patient_id: "",
    doctor_name: "",
    department: "General",
    preferred_date: "",
    notes: ""
  });
  const [leaveForm, setLeaveForm] = useState({
    doctor_name: "",
    department: "",
    start_at: "",
    end_at: "",
    reason: ""
  });
  const [offerSlot, setOfferSlot] = useState<{ waitlistId: string; scheduled_at: string } | null>(null);

  function refresh() {
    setRows(listAppointments(tenantId));
    setWaitlist(listWaitlistEntries(tenantId));
    setLeaves(listDoctorLeaves(tenantId));
    setPatients(listPatients(tenantId));
  }

  useEffect(() => {
    void pullHmsFromSupabase(tenantId).finally(() => refresh());
    void pullHmsClinicalFromSupabase(tenantId).finally(() => refresh());
    const u1 = subscribeHms(() => refresh());
    const u2 = subscribeHmsClinical(() => refresh());
    return () => {
      u1();
      u2();
    };
  }, [tenantId]);

  useEffect(() => {
    if (!followUpPatientId || !patients.length) return;
    setTab("calendar");
    setForm((f) => ({ ...f, patient_id: followUpPatientId }));
    setOpenForm(true);
  }, [followUpPatientId, patients.length]);

  const doctors = useMemo(() => {
    const set = new Set<string>();
    for (const a of rows) if (a.doctor_name) set.add(a.doctor_name);
    for (const l of leaves) set.add(l.doctor_name);
    return Array.from(set).sort();
  }, [rows, leaves]);

  const departments = useMemo(() => {
    const set = new Set<string>();
    for (const a of rows) if (a.department) set.add(a.department);
    return Array.from(set).sort();
  }, [rows]);

  const filtered = useMemo(() => {
    let list = rows.filter((a) => a.status !== "waitlist");
    if (doctorFilter !== "all") list = list.filter((a) => a.doctor_name === doctorFilter);
    if (deptFilter !== "all") list = list.filter((a) => a.department === deptFilter);
    if (dateFilter) list = list.filter((a) => dateKey(a.scheduled_at) === dateFilter);
    return filterAndSort(list as unknown as Array<Record<string, unknown>>, {
      search,
      searchFields: ["patient_name", "doctor_name", "department", "status"],
      sortField,
      sortDir
    }) as unknown as HmsAppointment[];
  }, [rows, search, doctorFilter, deptFilter, dateFilter, sortField, sortDir]);

  const groupedByDoctor = useMemo(() => {
    const map = new Map<string, HmsAppointment[]>();
    for (const a of filtered) {
      const key = a.doctor_name || "Unassigned";
      const arr = map.get(key) ?? [];
      arr.push(a);
      map.set(key, arr);
    }
    return map;
  }, [filtered]);

  function checkLeaveWarning(doctorName: string, scheduledAt: string) {
    if (!doctorName || !scheduledAt) {
      setLeaveWarn("");
      return;
    }
    const hit = isDoctorOnLeave(tenantId, doctorName, scheduledAt);
    setLeaveWarn(hit ? `${doctorName} is on leave during this time (${hit.reason || "leave"})` : "");
  }

  function resetForm() {
    setForm({ patient_id: patients[0]?.id ?? "", doctor_name: "", department: "General", scheduled_at: "", notes: "" });
    setEditingId(null);
    setCancelReason("");
    setLeaveWarn("");
  }

  function doSaveAppointment() {
    const patient = patients.find((p) => p.id === form.patient_id);
    if (!patient || !form.scheduled_at) return;
    if (editingId) {
      updateAppointment(
        editingId,
        {
          patient_id: patient.id,
          patient_name: patient.full_name,
          doctor_name: form.doctor_name,
          department: form.department || null,
          scheduled_at: form.scheduled_at,
          notes: form.notes || null,
          status: "scheduled"
        },
        "receptionist"
      );
    } else {
      createAppointment(tenantId, {
        patient_id: patient.id,
        patient_name: patient.full_name,
        doctor_name: form.doctor_name,
        department: form.department || null,
        scheduled_at: form.scheduled_at,
        status: "scheduled",
        cancel_reason: null,
        notes: form.notes || null,
        created_by: "receptionist"
      });
    }
    setOpenForm(false);
    resetForm();
    if (followUpPatientId) router.replace("/healthcare/appointments");
    refresh();
  }

  function doCancel(id: string) {
    updateAppointment(id, { status: "cancelled", cancel_reason: cancelReason || null }, "receptionist");
    setCancelReason("");
    refresh();
  }

  function doAddWaitlist() {
    const patient = patients.find((p) => p.id === waitForm.patient_id);
    if (!patient) return;
    addWaitlistEntry(tenantId, {
      patient_id: patient.id,
      patient_name: patient.full_name,
      doctor_name: waitForm.doctor_name || null,
      department: waitForm.department || null,
      preferred_date: waitForm.preferred_date || null,
      notes: waitForm.notes || null,
      created_by: "receptionist"
    });
    setWaitForm({ patient_id: "", doctor_name: "", department: "General", preferred_date: "", notes: "" });
    refresh();
  }

  function doOfferSlot() {
    if (!offerSlot) return;
    const entry = waitlist.find((w) => w.id === offerSlot.waitlistId);
    if (!entry) return;
    const appt = createAppointment(tenantId, {
      patient_id: entry.patient_id,
      patient_name: entry.patient_name,
      doctor_name: entry.doctor_name ?? "Unassigned",
      department: entry.department ?? null,
      scheduled_at: offerSlot.scheduled_at,
      status: "scheduled",
      cancel_reason: null,
      notes: entry.notes ?? null,
      created_by: "receptionist"
    });
    updateWaitlistEntry(entry.id, { status: "booked", appointment_id: appt.id });
    setOfferSlot(null);
    refresh();
  }

  function doCreateLeave() {
    if (!leaveForm.doctor_name || !leaveForm.start_at || !leaveForm.end_at) return;
    createDoctorLeave(tenantId, {
      doctor_name: leaveForm.doctor_name.trim(),
      department: leaveForm.department || null,
      start_at: leaveForm.start_at,
      end_at: leaveForm.end_at,
      reason: leaveForm.reason || null,
      created_by: "receptionist"
    });
    setLeaveForm({ doctor_name: "", department: "", start_at: "", end_at: "", reason: "" });
    refresh();
  }

  return (
    <AppShell activeModule="healthcare">
      {dialog}
      <ModuleBreadcrumbs />
      <PageHeader
        title="Appointments & scheduling"
        description="Multi-doctor calendar, waitlist, doctor leave, book/reschedule/cancel with audit."
        actionLabel="Book appointment"
        onAction={() => {
          resetForm();
          setOpenForm(true);
        }}
      />

      <div className="mb-4 flex flex-wrap gap-2">
        <Button type="button" variant={tab === "calendar" ? "primary" : "secondary"} onClick={() => setTab("calendar")}>
          Calendar
        </Button>
        <Button type="button" variant={tab === "waitlist" ? "primary" : "secondary"} onClick={() => setTab("waitlist")}>
          Waitlist
        </Button>
        <Button type="button" variant={tab === "leave" ? "primary" : "secondary"} onClick={() => setTab("leave")}>
          Doctor leave
        </Button>
      </div>

      {doctors.length ? (
        <div className="mb-4 flex flex-wrap gap-2">
          <Button
            type="button"
            variant={doctorFilter === "all" ? "primary" : "secondary"}
            className="!min-h-9 !px-3 !text-xs"
            onClick={() => setDoctorFilter("all")}
          >
            All doctors
          </Button>
          {doctors.map((d) => (
            <Button
              key={d}
              type="button"
              variant={doctorFilter === d ? "primary" : "secondary"}
              className="!min-h-9 !px-3 !text-xs"
              onClick={() => setDoctorFilter(d)}
            >
              {d}
            </Button>
          ))}
        </div>
      ) : null}

      {openForm ? (
        <Panel className="mb-4">
          <SectionHeader title={editingId ? "Reschedule appointment" : "Book appointment"} eyebrow={followUpPatientId ? "Follow-up pre-filled" : undefined} />
          <form
            className="mt-3 grid gap-3 md:grid-cols-2"
            onSubmit={(e) => {
              e.preventDefault();
              askSave({
                editing: Boolean(editingId),
                entityLabel: "appointment",
                onConfirm: doSaveAppointment
              });
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
              <TextInput
                value={form.doctor_name}
                onChange={(e) => {
                  setForm({ ...form, doctor_name: e.target.value });
                  checkLeaveWarning(e.target.value, form.scheduled_at);
                }}
              />
            </Field>
            <Field label="Department">
              <TextInput value={form.department} onChange={(e) => setForm({ ...form, department: e.target.value })} />
            </Field>
            <Field label="Scheduled at">
              <TextInput
                type="datetime-local"
                required
                value={form.scheduled_at}
                onChange={(e) => {
                  setForm({ ...form, scheduled_at: e.target.value });
                  checkLeaveWarning(form.doctor_name, e.target.value);
                }}
              />
            </Field>
            <Field label="Notes" className="md:col-span-2">
              <TextInput value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
            </Field>
            {leaveWarn ? <p className="md:col-span-2 text-sm text-amber-700">{leaveWarn}</p> : null}
            <div className="md:col-span-2 flex gap-2">
              <Button type="submit">{editingId ? "Save changes" : "Book"}</Button>
              <Button type="button" variant="ghost" onClick={() => { setOpenForm(false); resetForm(); }}>
                Cancel
              </Button>
            </div>
          </form>
        </Panel>
      ) : null}

      {tab === "calendar" ? (
        <Panel>
          <DataListToolbar
            search={search}
            onSearchChange={setSearch}
            searchPlaceholder="Search patient, doctor…"
            filterLabel="departments"
            filterValue={deptFilter}
            filterOptions={[{ value: "all", label: "All departments" }, ...departments.map((d) => ({ value: d, label: d }))]}
            onFilterChange={setDeptFilter}
            sortValue={sortField}
            sortOptions={[
              { value: "scheduled_at", label: "Date/time" },
              { value: "doctor_name", label: "Doctor" },
              { value: "patient_name", label: "Patient" }
            ]}
            onSortChange={setSortField}
            sortDir={sortDir}
            onSortDirChange={setSortDir}
            rightSlot={
              <TextInput type="date" value={dateFilter} onChange={(e) => setDateFilter(e.target.value)} className="!w-auto" />
            }
            onExportCsv={() =>
              exportListCsv({
                tenantId,
                module: "healthcare",
                filename: "appointments",
                rows: filtered.map((r) => ({
                  Patient: r.patient_name,
                  Doctor: r.doctor_name,
                  Department: r.department ?? "",
                  When: r.scheduled_at,
                  Status: r.status
                }))
              })
            }
          />
          <div className="mt-4 grid gap-4 lg:grid-cols-2 xl:grid-cols-3">
            {Array.from(groupedByDoctor.entries()).map(([doctor, appts]) => (
              <div key={doctor} className="rounded-[var(--bs-radius)] border border-line p-3">
                <h3 className="text-sm font-semibold">{doctor}</h3>
                <ul className="mt-2 space-y-2 text-sm">
                  {appts.map((a) => (
                    <li key={a.id} className="rounded border border-line px-2 py-2">
                      <div className="font-medium">{a.patient_name}</div>
                      <div className="text-xs text-slate-500">
                        {a.scheduled_at.replace("T", " ")} · {a.department}
                      </div>
                      <StatusBadge status={a.status} />
                      <div className="mt-2 flex flex-wrap gap-1">
                        {a.status === "scheduled" ? (
                          <>
                            <Button
                              type="button"
                              variant="secondary"
                              className="!px-2 !py-1 text-xs"
                              onClick={() => {
                                setEditingId(a.id);
                                setForm({
                                  patient_id: a.patient_id ?? "",
                                  doctor_name: a.doctor_name,
                                  department: a.department ?? "General",
                                  scheduled_at: a.scheduled_at.slice(0, 16),
                                  notes: a.notes ?? ""
                                });
                                setOpenForm(true);
                              }}
                            >
                              Reschedule
                            </Button>
                            <Button
                              type="button"
                              variant="ghost"
                              className="!px-2 !py-1 text-xs"
                              onClick={() =>
                                ask({
                                  title: "Cancel appointment?",
                                  message: "Provide an optional reason below, then confirm.",
                                  confirmLabel: "Cancel appointment",
                                  tone: "danger",
                                  onConfirm: () => doCancel(a.id)
                                })
                              }
                            >
                              Cancel
                            </Button>
                          </>
                        ) : null}
                      </div>
                      {a.status === "scheduled" ? (
                        <Field label="Cancel reason" className="mt-2">
                          <TextInput value={cancelReason} onChange={(e) => setCancelReason(e.target.value)} placeholder="Optional" />
                        </Field>
                      ) : null}
                      {a.cancel_reason ? <p className="mt-1 text-xs text-slate-500">Reason: {a.cancel_reason}</p> : null}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
            {!groupedByDoctor.size ? <p className="text-sm text-slate-500">No appointments match filters.</p> : null}
          </div>
        </Panel>
      ) : null}

      {tab === "waitlist" ? (
        <div className="grid gap-4 lg:grid-cols-2">
          <Panel>
            <SectionHeader title="Add to waitlist" />
            <form
              className="mt-3 grid gap-3"
              onSubmit={(e) => {
                e.preventDefault();
                askSave({ editing: false, entityLabel: "waitlist entry", onConfirm: doAddWaitlist });
              }}
            >
              <Field label="Patient">
                <SelectInput value={waitForm.patient_id} onChange={(e) => setWaitForm({ ...waitForm, patient_id: e.target.value })}>
                  <option value="">Select…</option>
                  {patients.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.mrn} · {p.full_name}
                    </option>
                  ))}
                </SelectInput>
              </Field>
              <Field label="Preferred doctor">
                <TextInput value={waitForm.doctor_name} onChange={(e) => setWaitForm({ ...waitForm, doctor_name: e.target.value })} />
              </Field>
              <Field label="Department">
                <TextInput value={waitForm.department} onChange={(e) => setWaitForm({ ...waitForm, department: e.target.value })} />
              </Field>
              <Field label="Preferred date">
                <TextInput type="date" value={waitForm.preferred_date} onChange={(e) => setWaitForm({ ...waitForm, preferred_date: e.target.value })} />
              </Field>
              <Button type="submit">Add to waitlist</Button>
            </form>
          </Panel>
          <Panel>
            <SectionHeader title="Waitlist queue" eyebrow={`${waitlist.filter((w) => w.status === "waiting").length} waiting`} />
            <ul className="mt-3 space-y-2 text-sm">
              {waitlist
                .filter((w) => w.status === "waiting" || w.status === "offered")
                .map((w) => (
                  <li key={w.id} className="rounded border border-line px-3 py-2">
                    <div className="font-semibold">{w.patient_name}</div>
                    <div className="text-xs text-slate-500">
                      {w.doctor_name || "Any doctor"} · {w.department} · pref {w.preferred_date || "—"}
                    </div>
                    <StatusBadge status={w.status} />
                    <div className="mt-2 flex flex-wrap gap-1">
                      <Button
                        type="button"
                        variant="secondary"
                        className="!px-2 !py-1 text-xs"
                        onClick={() => setOfferSlot({ waitlistId: w.id, scheduled_at: new Date().toISOString().slice(0, 16) })}
                      >
                        Offer slot
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        className="!px-2 !py-1 text-xs"
                        onClick={() => {
                          updateWaitlistEntry(w.id, { status: "cancelled", is_active: false });
                          refresh();
                        }}
                      >
                        Remove
                      </Button>
                    </div>
                  </li>
                ))}
            </ul>
          </Panel>
          {offerSlot ? (
            <Panel className="lg:col-span-2">
              <SectionHeader title="Offer slot to waitlist patient" />
              <form
                className="mt-3 flex flex-wrap items-end gap-3"
                onSubmit={(e) => {
                  e.preventDefault();
                  askSave({ editing: false, entityLabel: "offered slot", onConfirm: doOfferSlot });
                }}
              >
                <Field label="Slot date/time">
                  <TextInput
                    type="datetime-local"
                    required
                    value={offerSlot.scheduled_at}
                    onChange={(e) => setOfferSlot({ ...offerSlot, scheduled_at: e.target.value })}
                  />
                </Field>
                <Button type="submit">Create appointment</Button>
                <Button type="button" variant="ghost" onClick={() => setOfferSlot(null)}>
                  Cancel
                </Button>
              </form>
            </Panel>
          ) : null}
        </div>
      ) : null}

      {tab === "leave" ? (
        <div className="grid gap-4 lg:grid-cols-2">
          <Panel>
            <SectionHeader title="Record doctor leave" eyebrow="Booking warns when doctor is unavailable" />
            <form
              className="mt-3 grid gap-3"
              onSubmit={(e) => {
                e.preventDefault();
                askSave({ editing: false, entityLabel: "doctor leave", onConfirm: doCreateLeave });
              }}
            >
              <Field label="Doctor name">
                <TextInput required value={leaveForm.doctor_name} onChange={(e) => setLeaveForm({ ...leaveForm, doctor_name: e.target.value })} />
              </Field>
              <Field label="Department">
                <TextInput value={leaveForm.department} onChange={(e) => setLeaveForm({ ...leaveForm, department: e.target.value })} />
              </Field>
              <Field label="Start">
                <TextInput type="datetime-local" required value={leaveForm.start_at} onChange={(e) => setLeaveForm({ ...leaveForm, start_at: e.target.value })} />
              </Field>
              <Field label="End">
                <TextInput type="datetime-local" required value={leaveForm.end_at} onChange={(e) => setLeaveForm({ ...leaveForm, end_at: e.target.value })} />
              </Field>
              <Field label="Reason">
                <TextInput value={leaveForm.reason} onChange={(e) => setLeaveForm({ ...leaveForm, reason: e.target.value })} />
              </Field>
              <Button type="submit">Save leave</Button>
            </form>
          </Panel>
          <Panel>
            <SectionHeader title="Upcoming leave" />
            <ul className="mt-3 space-y-2 text-sm">
              {leaves.map((l) => (
                <li key={l.id} className="rounded border border-line px-3 py-2">
                  <div className="font-semibold">{l.doctor_name}</div>
                  <div className="text-xs text-slate-500">
                    {l.start_at.replace("T", " ")} → {l.end_at.replace("T", " ")}
                  </div>
                  {l.reason ? <div className="text-xs">{l.reason}</div> : null}
                </li>
              ))}
            </ul>
          </Panel>
        </div>
      ) : null}
    </AppShell>
  );
}
