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
import { getStoredTenantId, getStoredUserEmail } from "@/lib/auth/session";
import { exportListCsv, exportListPdf } from "@/lib/list-export";
import { filterAndSort } from "@/lib/list-query";
import { persistExtraFields } from "@/modules/forms/services/extra-fields.store";
import {
  anonymizePatient,
  createPatient,
  exportPatientDsar,
  findDuplicatePatients,
  listPatients,
  pullHmsFromSupabase,
  subscribeHms,
  trashPatient,
  updatePatient,
  type HmsPatient
} from "@/modules/healthcare/services/hms.store";
import { linkGuardian, mergePatients } from "@/modules/healthcare/services/hms-clinical.store";

const empty = {
  full_name: "",
  dob: "",
  gender: "",
  phone: "",
  email: "",
  national_id: "",
  address: "",
  blood_group: "",
  emergency_contact_name: "",
  emergency_contact_phone: "",
  insurance_payer: "",
  insurance_policy_no: "",
  insurance_group_no: "",
  consent_type: "treatment",
  consent_version: "1.0",
  status: "active"
};

export default function HmsPatientsPage() {
  const tenantId = getStoredTenantId() ?? "alpha";
  const { askSave, askTrash, dialog } = useConfirm();
  const [rows, setRows] = useState<HmsPatient[]>([]);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [sortField, setSortField] = useState("full_name");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");
  const [openForm, setOpenForm] = useState(false);
  const [editing, setEditing] = useState<HmsPatient | null>(null);
  const [form, setForm] = useState(empty);
  const [extraJson, setExtraJson] = useState("");
  const [error, setError] = useState("");
  const [forceCreate, setForceCreate] = useState(false);
  const [linkTarget, setLinkTarget] = useState<HmsPatient | null>(null);
  const [guardianId, setGuardianId] = useState("");
  const [mergeTarget, setMergeTarget] = useState<HmsPatient | null>(null);
  const [mergeAbsorbId, setMergeAbsorbId] = useState("");
  const actor = getStoredUserEmail() ?? "staff";

  function refresh() {
    setRows(listPatients(tenantId));
  }
  useEffect(() => {
    void pullHmsFromSupabase(tenantId).finally(() => refresh());
    return subscribeHms(() => refresh());
  }, [tenantId]);

  const filtered = useMemo(
    () =>
      filterAndSort(rows as unknown as Array<Record<string, unknown>>, {
        search,
        searchFields: ["mrn", "full_name", "phone", "national_id", "email"],
        statusField: "status",
        statusValue: statusFilter,
        sortField,
        sortDir
      }) as unknown as HmsPatient[],
    [rows, search, statusFilter, sortField, sortDir]
  );

  function doSave() {
    setError("");
    if (!form.full_name.trim()) {
      setError("Full name is required.");
      return;
    }
    try {
      if (!editing && !forceCreate) {
        const dupes = findDuplicatePatients(tenantId, {
          full_name: form.full_name,
          dob: form.dob || null,
          phone: form.phone || null
        });
        if (dupes.length) {
          setError(`Possible duplicates: ${dupes.map((d) => d.mrn).join(", ")}. Check “Force create” to proceed.`);
          return;
        }
      }
      if (editing) {
        updatePatient(
          editing.id,
          {
            full_name: form.full_name.trim(),
            dob: form.dob || null,
            gender: form.gender || null,
            phone: form.phone || null,
            email: form.email || null,
            national_id: form.national_id || null,
            address: form.address || null,
            blood_group: form.blood_group || null,
            emergency_contact_name: form.emergency_contact_name || null,
            emergency_contact_phone: form.emergency_contact_phone || null,
            insurance_payer: form.insurance_payer || null,
            insurance_policy_no: form.insurance_policy_no || null,
            insurance_group_no: form.insurance_group_no || null,
            status: form.status
          },
          "staff"
        );
        persistExtraFields(tenantId, "healthcare.patient", editing.id, extraJson);
      } else {
        const row = createPatient(tenantId, {
          full_name: form.full_name.trim(),
          dob: form.dob || null,
          gender: form.gender || null,
          phone: form.phone || null,
          email: form.email || null,
          national_id: form.national_id || null,
          address: form.address || null,
          blood_group: form.blood_group || null,
          emergency_contact_name: form.emergency_contact_name || null,
          emergency_contact_phone: form.emergency_contact_phone || null,
          insurance_payer: form.insurance_payer || null,
          insurance_policy_no: form.insurance_policy_no || null,
          insurance_group_no: form.insurance_group_no || null,
          guardian_patient_id: null,
          status: form.status,
          actor: "staff",
          allowDuplicate: forceCreate,
          consent: {
            consent_type: form.consent_type,
            version: form.consent_version,
            signed_by: form.full_name.trim()
          }
        });
        persistExtraFields(tenantId, "healthcare.patient", row.id, extraJson);
      }
      setOpenForm(false);
      setForceCreate(false);
      refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Save failed");
    }
  }

  return (
    <AppShell activeModule="healthcare">
      {dialog}
      <ModuleBreadcrumbs />
      <PageHeader
        title="Patients (HMS)"
        description="Auto-MRN, duplicate detection, versioned consent at registration, PHI audit, DSAR export."
        actionLabel="Register patient"
        onAction={() => {
          setEditing(null);
          setForm(empty);
          setExtraJson("");
          setError("");
          setForceCreate(false);
          setOpenForm(true);
        }}
      />
      {openForm ? (
        <Panel className="mb-4">
          <form
            className="grid gap-3 md:grid-cols-2"
            onSubmit={(e) => {
              e.preventDefault();
              askSave({ editing: Boolean(editing), entityLabel: "patient", onConfirm: doSave });
            }}
          >
            {error ? <p className="md:col-span-2 text-sm text-rose-600">{error}</p> : null}
            <Field label="Full name">
              <TextInput required value={form.full_name} onChange={(e) => setForm({ ...form, full_name: e.target.value })} />
            </Field>
            <Field label="DOB">
              <TextInput type="date" value={form.dob} onChange={(e) => setForm({ ...form, dob: e.target.value })} />
            </Field>
            <Field label="Gender">
              <SelectInput value={form.gender} onChange={(e) => setForm({ ...form, gender: e.target.value })}>
                <option value="">—</option>
                <option value="female">Female</option>
                <option value="male">Male</option>
                <option value="other">Other</option>
              </SelectInput>
            </Field>
            <Field label="Phone">
              <TextInput value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
            </Field>
            <Field label="Email">
              <TextInput type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
            </Field>
            <Field label="National ID">
              <TextInput value={form.national_id} onChange={(e) => setForm({ ...form, national_id: e.target.value })} />
            </Field>
            <Field label="Address" className="md:col-span-2">
              <TextInput value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} />
            </Field>
            <Field label="Emergency contact">
              <TextInput value={form.emergency_contact_name} onChange={(e) => setForm({ ...form, emergency_contact_name: e.target.value })} />
            </Field>
            <Field label="Emergency phone">
              <TextInput value={form.emergency_contact_phone} onChange={(e) => setForm({ ...form, emergency_contact_phone: e.target.value })} />
            </Field>
            <Field label="Insurance payer">
              <TextInput value={form.insurance_payer} onChange={(e) => setForm({ ...form, insurance_payer: e.target.value })} />
            </Field>
            <Field label="Policy #">
              <TextInput value={form.insurance_policy_no} onChange={(e) => setForm({ ...form, insurance_policy_no: e.target.value })} />
            </Field>
            {!editing ? (
              <>
                <Field label="Consent type">
                  <SelectInput value={form.consent_type} onChange={(e) => setForm({ ...form, consent_type: e.target.value })}>
                    <option value="treatment">Treatment</option>
                    <option value="data_sharing">Data sharing</option>
                    <option value="telehealth">Telehealth</option>
                  </SelectInput>
                </Field>
                <Field label="Consent version">
                  <TextInput value={form.consent_version} onChange={(e) => setForm({ ...form, consent_version: e.target.value })} />
                </Field>
                <label className="md:col-span-2 flex items-center gap-2 text-sm">
                  <input type="checkbox" checked={forceCreate} onChange={(e) => setForceCreate(e.target.checked)} />
                  Force create despite possible duplicates
                </label>
              </>
            ) : null}
            <div className="md:col-span-2">
              <ExtraFieldsBlock formKey="healthcare.patient" valueJson={extraJson} onChange={setExtraJson} />
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
          filterOptions={[{ value: "active", label: "Active" }]}
          onFilterChange={setStatusFilter}
          sortValue={sortField}
          sortOptions={[
            { value: "full_name", label: "Name" },
            { value: "mrn", label: "MRN" }
          ]}
          onSortChange={setSortField}
          sortDir={sortDir}
          onSortDirChange={setSortDir}
          onExportCsv={() =>
            exportListCsv({
              tenantId,
              module: "healthcare",
              filename: "hms-patients",
              rows: filtered.map((r) => ({ MRN: r.mrn, Name: r.full_name, Phone: r.phone ?? "", Status: r.status }))
            })
          }
          onExportPdf={() =>
            exportListPdf({
              tenantId,
              module: "healthcare",
              title: "HMS Patients",
              filename: "hms-patients",
              columns: ["MRN", "Name", "Phone", "Status"],
              rows: filtered.map((r) => [r.mrn, r.full_name, r.phone ?? "", r.status])
            })
          }
        />
        <div className="mt-3 overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-slate-500">
                <th className="px-3 py-2">Patient</th>
                <th>Contact</th>
                <th>Guardian</th>
                <th>Insurance</th>
                <th>Status</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {filtered.map((row) => {
                const guardian = row.guardian_patient_id
                  ? rows.find((p) => p.id === row.guardian_patient_id)
                  : null;
                return (
                <tr key={row.id} className="border-t border-line">
                  <td className="px-3 py-3">
                    <div className="font-semibold">{row.full_name}</div>
                    <div className="text-xs text-slate-500">{row.mrn}</div>
                  </td>
                  <td>
                    {row.phone || "—"}
                    <div className="text-xs text-slate-500">{row.email || ""}</div>
                  </td>
                  <td>
                    {guardian ? (
                      <>
                        <div className="text-sm">{guardian.full_name}</div>
                        <div className="text-xs text-slate-500">{guardian.mrn}</div>
                      </>
                    ) : (
                      "—"
                    )}
                  </td>
                  <td>{row.insurance_payer || "—"}</td>
                  <td>
                    <StatusBadge status={row.status} />
                  </td>
                  <td>
                    <div className="flex flex-wrap gap-1">
                      <Button
                        type="button"
                        variant="secondary"
                        className="!px-2 !py-1 text-xs"
                        onClick={() => {
                          setLinkTarget(row);
                          setGuardianId(row.guardian_patient_id ?? "");
                        }}
                      >
                        Link guardian
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        className="!px-2 !py-1 text-xs text-amber-800"
                        onClick={() => {
                          setMergeTarget(row);
                          setMergeAbsorbId("");
                        }}
                      >
                        Merge
                      </Button>
                      <Button
                        type="button"
                        variant="secondary"
                        className="!px-2 !py-1 text-xs"
                        onClick={() => {
                          const dsar = exportPatientDsar(tenantId, row.id);
                          if (!dsar) return;
                          const blob = new Blob([JSON.stringify(dsar, null, 2)], { type: "application/json" });
                          const a = document.createElement("a");
                          a.href = URL.createObjectURL(blob);
                          a.download = `dsar-${row.mrn}.json`;
                          a.click();
                        }}
                      >
                        DSAR
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        className="!px-2 !py-1 text-xs"
                        onClick={() => {
                          anonymizePatient(row.id, "staff");
                          refresh();
                        }}
                      >
                        Anonymize
                      </Button>
                      <RecordRowActions
                        onEdit={() => {
                          setEditing(row);
                          setForm({
                            ...empty,
                            full_name: row.full_name,
                            dob: row.dob ?? "",
                            gender: row.gender ?? "",
                            phone: row.phone ?? "",
                            email: row.email ?? "",
                            national_id: row.national_id ?? "",
                            address: row.address ?? "",
                            blood_group: row.blood_group ?? "",
                            emergency_contact_name: row.emergency_contact_name ?? "",
                            emergency_contact_phone: row.emergency_contact_phone ?? "",
                            insurance_payer: row.insurance_payer ?? "",
                            insurance_policy_no: row.insurance_policy_no ?? "",
                            insurance_group_no: row.insurance_group_no ?? "",
                            status: row.status
                          });
                          setOpenForm(true);
                        }}
                        onTrash={() =>
                          askTrash({
                            entityLabel: "patient",
                            onConfirm: () => {
                              trashPatient(row.id, "staff");
                              refresh();
                            }
                          })
                        }
                      />
                    </div>
                  </td>
                </tr>
              );
              })}
            </tbody>
          </table>
        </div>
      </Panel>
      {linkTarget ? (
        <Panel className="mt-4">
          <h3 className="text-sm font-bold text-ink">Link guardian for {linkTarget.full_name}</h3>
          <p className="mt-1 text-xs text-slate-500">Select another patient record to act as guardian (family/dependent linking).</p>
          <form
            className="mt-3 flex flex-wrap items-end gap-3"
            onSubmit={(e) => {
              e.preventDefault();
              if (!guardianId) return;
              askSave({
                editing: false,
                entityLabel: "guardian link",
                onConfirm: () => {
                  try {
                    linkGuardian(tenantId, linkTarget.id, guardianId, actor);
                    setLinkTarget(null);
                    setGuardianId("");
                    refresh();
                  } catch (err) {
                    setError(err instanceof Error ? err.message : "Link failed");
                  }
                }
              });
            }}
          >
            <Field label="Guardian patient" className="min-w-[14rem] flex-1">
              <SelectInput required value={guardianId} onChange={(e) => setGuardianId(e.target.value)}>
                <option value="">Select guardian…</option>
                {rows
                  .filter((p) => p.id !== linkTarget.id)
                  .map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.full_name} ({p.mrn})
                    </option>
                  ))}
              </SelectInput>
            </Field>
            <Button type="submit">Save link</Button>
            <Button type="button" variant="ghost" onClick={() => setLinkTarget(null)}>
              Cancel
            </Button>
          </form>
        </Panel>
      ) : null}
      {mergeTarget ? (
        <Panel className="mt-4 border-amber-200">
          <h3 className="text-sm font-bold text-amber-900">Merge duplicate — admin action</h3>
          <p className="mt-1 text-xs text-slate-500">
            Keep <strong>{mergeTarget.full_name}</strong> ({mergeTarget.mrn}) and absorb another record. The absorbed
            record is anonymized; clinical references are reassigned. Full audit trail is preserved.
          </p>
          <form
            className="mt-3 flex flex-wrap items-end gap-3"
            onSubmit={(e) => {
              e.preventDefault();
              if (!mergeAbsorbId) return;
              const absorb = rows.find((p) => p.id === mergeAbsorbId);
              askSave({
                editing: false,
                entityLabel: `patient merge (${absorb?.mrn ?? mergeAbsorbId} → ${mergeTarget.mrn})`,
                onConfirm: () => {
                  try {
                    mergePatients(tenantId, mergeTarget.id, mergeAbsorbId, actor);
                    setMergeTarget(null);
                    setMergeAbsorbId("");
                    refresh();
                  } catch (err) {
                    setError(err instanceof Error ? err.message : "Merge failed");
                  }
                }
              });
            }}
          >
            <Field label="Record to absorb (duplicate)" className="min-w-[14rem] flex-1">
              <SelectInput required value={mergeAbsorbId} onChange={(e) => setMergeAbsorbId(e.target.value)}>
                <option value="">Select duplicate…</option>
                {rows
                  .filter((p) => p.id !== mergeTarget.id)
                  .map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.full_name} ({p.mrn})
                    </option>
                  ))}
              </SelectInput>
            </Field>
            <Button type="submit" variant="secondary">
              Confirm merge
            </Button>
            <Button type="button" variant="ghost" onClick={() => setMergeTarget(null)}>
              Cancel
            </Button>
          </form>
        </Panel>
      ) : null}
    </AppShell>
  );
}
