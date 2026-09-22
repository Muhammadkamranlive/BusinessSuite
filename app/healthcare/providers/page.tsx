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
  createProvider,
  listProviders,
  pullMarketplaceFromSupabase,
  setProviderVerification,
  subscribeMarketplace,
  trashProvider,
  updateProvider,
  type ProviderCredential
} from "@/modules/healthcare/services/pharmacy-marketplace.store";

const empty = {
  full_name: "",
  role_type: "physician" as ProviderCredential["role_type"],
  clinic_name: "",
  email: "",
  phone: "",
  npi: "",
  license_no: "",
  license_state: "",
  dea_number: "",
  document_note: "",
  verification_status: "submitted" as ProviderCredential["verification_status"],
  mfa_enabled: true
};

export default function ProvidersPage() {
  const tenantId = getStoredTenantId() ?? "alpha";
  const { askSave, askTrash, dialog } = useConfirm();
  const [rows, setRows] = useState<ProviderCredential[]>([]);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [sortField, setSortField] = useState("full_name");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");
  const [openForm, setOpenForm] = useState(false);
  const [editing, setEditing] = useState<ProviderCredential | null>(null);
  const [form, setForm] = useState(empty);
  const [extraJson, setExtraJson] = useState("");
  const [error, setError] = useState("");

  function refresh() {
    setRows(listProviders(tenantId));
  }
  useEffect(() => {
    void pullMarketplaceFromSupabase(tenantId).finally(() => refresh());
    return subscribeMarketplace(() => refresh());
  }, [tenantId]);

  const filtered = useMemo(
    () =>
      filterAndSort(rows as unknown as Array<Record<string, unknown>>, {
        search,
        searchFields: ["full_name", "clinic_name", "npi", "license_no", "email", "verification_status"],
        statusField: "verification_status",
        statusValue: statusFilter,
        sortField,
        sortDir
      }) as unknown as ProviderCredential[],
    [rows, search, statusFilter, sortField, sortDir]
  );

  function doSave() {
    if (!form.full_name.trim() || !form.npi.trim() || !form.license_no.trim()) {
      setError("Name, NPI, and license are required.");
      return;
    }
    const payload = {
      full_name: form.full_name.trim(),
      role_type: form.role_type,
      clinic_name: form.clinic_name.trim(),
      email: form.email.trim(),
      phone: form.phone.trim() || null,
      npi: form.npi.trim(),
      license_no: form.license_no.trim(),
      license_state: form.license_state.trim() || null,
      dea_number: form.dea_number.trim() || null,
      document_note: form.document_note.trim() || null,
      verification_status: form.verification_status,
      mfa_enabled: form.mfa_enabled,
      reject_reason: null
    };
    if (editing) {
      updateProvider(editing.id, {
        ...payload,
        can_order: form.verification_status === "approved"
      });
      persistExtraFields(tenantId, "healthcare.provider_credential", editing.id, extraJson);
    } else {
      const row = createProvider(tenantId, payload);
      persistExtraFields(tenantId, "healthcare.provider_credential", row.id, extraJson);
    }
    setOpenForm(false);
    setError("");
    refresh();
  }

  return (
    <AppShell activeModule="healthcare">
      {dialog}
      <ModuleBreadcrumbs />
      <PageHeader
        title="Provider verification"
        description="NPI / license review, MFA flags, and approve · reject · suspend before ordering access."
        actionLabel="Register provider"
        onAction={() => {
          setEditing(null);
          setForm(empty);
          setExtraJson("");
          setError("");
          setOpenForm(true);
        }}
      />
      {openForm ? (
        <Panel className="mb-4">
          <form
            className="grid gap-3 md:grid-cols-2"
            onSubmit={(e) => {
              e.preventDefault();
              askSave({ editing: Boolean(editing), entityLabel: "provider credential", onConfirm: doSave });
            }}
          >
            {error ? <p className="md:col-span-2 text-sm text-rose-600">{error}</p> : null}
            <Field label="Full name">
              <TextInput required value={form.full_name} onChange={(e) => setForm({ ...form, full_name: e.target.value })} />
            </Field>
            <Field label="Role">
              <SelectInput
                value={form.role_type}
                onChange={(e) => setForm({ ...form, role_type: e.target.value as ProviderCredential["role_type"] })}
              >
                <option value="physician">Physician</option>
                <option value="np">Nurse practitioner</option>
                <option value="pa">Physician assistant</option>
                <option value="clinic_admin">Clinic admin</option>
                <option value="clinic_staff">Clinic staff</option>
              </SelectInput>
            </Field>
            <Field label="Clinic">
              <TextInput required value={form.clinic_name} onChange={(e) => setForm({ ...form, clinic_name: e.target.value })} />
            </Field>
            <Field label="Email">
              <TextInput type="email" required value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
            </Field>
            <Field label="Phone">
              <TextInput value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
            </Field>
            <Field label="NPI">
              <TextInput required value={form.npi} onChange={(e) => setForm({ ...form, npi: e.target.value })} />
            </Field>
            <Field label="License #">
              <TextInput required value={form.license_no} onChange={(e) => setForm({ ...form, license_no: e.target.value })} />
            </Field>
            <Field label="License state">
              <TextInput value={form.license_state} onChange={(e) => setForm({ ...form, license_state: e.target.value })} />
            </Field>
            <Field label="DEA #">
              <TextInput value={form.dea_number} onChange={(e) => setForm({ ...form, dea_number: e.target.value })} />
            </Field>
            <Field label="Verification status">
              <SelectInput
                value={form.verification_status}
                onChange={(e) =>
                  setForm({ ...form, verification_status: e.target.value as ProviderCredential["verification_status"] })
                }
              >
                {["draft", "submitted", "approved", "rejected", "suspended"].map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </SelectInput>
            </Field>
            <Field label="Documents / notes" className="md:col-span-2">
              <TextInput value={form.document_note} onChange={(e) => setForm({ ...form, document_note: e.target.value })} />
            </Field>
            <Field label="Security">
              <label className="flex items-center gap-2 pt-2 text-sm">
                <input type="checkbox" checked={form.mfa_enabled} onChange={(e) => setForm({ ...form, mfa_enabled: e.target.checked })} />
                MFA enabled
              </label>
            </Field>
            <div className="md:col-span-2">
              <ExtraFieldsBlock formKey="healthcare.provider_credential" valueJson={extraJson} onChange={setExtraJson} />
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
            { value: "submitted", label: "Submitted" },
            { value: "approved", label: "Approved" },
            { value: "rejected", label: "Rejected" },
            { value: "suspended", label: "Suspended" }
          ]}
          onFilterChange={setStatusFilter}
          sortValue={sortField}
          sortOptions={[
            { value: "full_name", label: "Name" },
            { value: "clinic_name", label: "Clinic" },
            { value: "verification_status", label: "Status" }
          ]}
          onSortChange={setSortField}
          sortDir={sortDir}
          onSortDirChange={setSortDir}
          onExportCsv={() =>
            exportListCsv({
              tenantId,
              module: "healthcare",
              filename: "providers",
              rows: filtered.map((r) => ({
                Name: r.full_name,
                Clinic: r.clinic_name,
                NPI: r.npi,
                Status: r.verification_status,
                CanOrder: r.can_order ? "yes" : "no"
              }))
            })
          }
          onExportPdf={() =>
            exportListPdf({
              tenantId,
              module: "healthcare",
              title: "Provider verification",
              filename: "providers",
              columns: ["Name", "Clinic", "NPI", "Status"],
              rows: filtered.map((r) => [r.full_name, r.clinic_name, r.npi, r.verification_status])
            })
          }
        />
        <div className="mt-3 overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-slate-500">
                <th className="px-3 py-2">Provider</th>
                <th>Credentials</th>
                <th>Status</th>
                <th>Access</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {filtered.map((row) => (
                <tr key={row.id} className="border-t border-line">
                  <td className="px-3 py-3">
                    <div className="font-semibold">{row.full_name}</div>
                    <div className="text-xs text-slate-500">
                      {row.role_type} · {row.clinic_name}
                    </div>
                    <ExtraFieldsReadout tenantId={tenantId} formKey="healthcare.provider_credential" recordId={row.id} />
                  </td>
                  <td>
                    NPI {row.npi}
                    <div className="text-xs text-slate-500">
                      Lic {row.license_no}
                      {row.license_state ? ` (${row.license_state})` : ""}
                      {row.dea_number ? ` · DEA ${row.dea_number}` : ""}
                    </div>
                  </td>
                  <td>
                    <StatusBadge status={row.verification_status} />
                  </td>
                  <td>
                    {row.can_order ? "Can order" : "Blocked"}
                    <div className="text-xs text-slate-500">{row.mfa_enabled ? "MFA on" : "MFA off"}</div>
                  </td>
                  <td>
                    <div className="flex flex-wrap gap-1">
                      {row.verification_status !== "approved" ? (
                        <Button
                          type="button"
                          variant="secondary"
                          className="!px-2 !py-1 text-xs"
                          onClick={() => {
                            setProviderVerification(row.id, "approved", "Platform Admin");
                            refresh();
                          }}
                        >
                          Approve
                        </Button>
                      ) : null}
                      {row.verification_status === "submitted" ? (
                        <Button
                          type="button"
                          variant="ghost"
                          className="!px-2 !py-1 text-xs"
                          onClick={() => {
                            setProviderVerification(row.id, "rejected", "Platform Admin");
                            refresh();
                          }}
                        >
                          Reject
                        </Button>
                      ) : null}
                      {row.verification_status === "approved" ? (
                        <Button
                          type="button"
                          variant="danger"
                          className="!px-2 !py-1 text-xs"
                          onClick={() => {
                            setProviderVerification(row.id, "suspended", "Platform Admin");
                            refresh();
                          }}
                        >
                          Suspend
                        </Button>
                      ) : null}
                      <RecordRowActions
                        onEdit={() => {
                          setEditing(row);
                          setForm({
                            full_name: row.full_name,
                            role_type: row.role_type,
                            clinic_name: row.clinic_name,
                            email: row.email,
                            phone: row.phone ?? "",
                            npi: row.npi,
                            license_no: row.license_no,
                            license_state: row.license_state ?? "",
                            dea_number: row.dea_number ?? "",
                            document_note: row.document_note ?? "",
                            verification_status: row.verification_status,
                            mfa_enabled: row.mfa_enabled
                          });
                          setExtraJson(getExtraFieldValues(tenantId, "healthcare.provider_credential", row.id));
                          setOpenForm(true);
                        }}
                        onTrash={() =>
                          askTrash({
                            entityLabel: "provider",
                            onConfirm: () => {
                              trashProvider(row.id);
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
