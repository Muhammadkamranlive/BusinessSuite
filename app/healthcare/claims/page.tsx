"use client";

import { useEffect, useMemo, useState } from "react";
import { AppShell } from "@/components/app-shell";
import { ModuleBreadcrumbs } from "@/components/common/module-breadcrumbs";
import { PageHeader } from "@/components/common/page-header";
import { StatusBadge } from "@/components/common/status-badge";
import { DataListToolbar } from "@/components/common/data-list-toolbar";
import { useConfirm } from "@/components/common/use-confirm";
import { ExtraFieldsBlock } from "@/components/forms/extra-fields-block";
import { Button, Field, Panel, SelectInput, TextInput } from "@/components/ui";
import { getStoredTenantId } from "@/lib/auth/session";
import { exportListCsv } from "@/lib/list-export";
import { filterAndSort } from "@/lib/list-query";
import { money } from "@/lib/utils";
import { persistExtraFields } from "@/modules/forms/services/extra-fields.store";
import {
  checkClaimEligibility,
  createInsuranceClaim,
  listInsuranceClaims,
  pullHmsClinicalFromSupabase,
  subscribeHmsClinical,
  updateInsuranceClaim,
  type HmsInsuranceClaim
} from "@/modules/healthcare/services/hms-clinical.store";
import { listPatients, pullHmsFromSupabase, subscribeHms } from "@/modules/healthcare/services/hms.store";

export default function HmsClaimsPage() {
  const tenantId = getStoredTenantId() ?? "alpha";
  const { askSave, dialog } = useConfirm();
  const [rows, setRows] = useState<HmsInsuranceClaim[]>([]);
  const [patients, setPatients] = useState(listPatients(tenantId));
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [openForm, setOpenForm] = useState(false);
  const [form, setForm] = useState({ patient_id: "", payer: "", policy_no: "", amount: "0" });
  const [extraJson, setExtraJson] = useState("");

  function refresh() {
    setRows(listInsuranceClaims(tenantId));
    setPatients(listPatients(tenantId));
  }
  useEffect(() => {
    void pullHmsClinicalFromSupabase(tenantId).finally(() => refresh());
    void pullHmsFromSupabase(tenantId).finally(() => refresh());
    const u1 = subscribeHmsClinical(() => refresh());
    const u2 = subscribeHms(() => refresh());
    return () => {
      u1();
      u2();
    };
  }, [tenantId]);

  const filtered = useMemo(
    () =>
      filterAndSort(rows as unknown as Array<Record<string, unknown>>, {
        search,
        searchFields: ["claim_no", "patient_name", "payer", "claim_status", "eligibility_status"],
        statusField: "claim_status",
        statusValue: statusFilter,
        sortField: "created_at",
        sortDir: "desc"
      }) as unknown as HmsInsuranceClaim[],
    [rows, search, statusFilter]
  );

  function doCreate() {
    const patient = patients.find((p) => p.id === form.patient_id);
    if (!patient || !form.payer.trim()) return;
    const row = createInsuranceClaim(tenantId, {
      patient_id: patient.id,
      patient_name: patient.full_name,
      invoice_id: null,
      payer: form.payer.trim(),
      policy_no: form.policy_no || null,
      amount: Number(form.amount) || 0,
      actor: "billing"
    });
    persistExtraFields(tenantId, "healthcare.hms.claim", row.id, extraJson);
    setOpenForm(false);
    refresh();
  }

  return (
    <AppShell activeModule="healthcare">
      {dialog}
      <ModuleBreadcrumbs />
      <PageHeader
        title="Insurance claims"
        description="Create claims, check eligibility, and track payer status."
        actionLabel="New claim"
        onAction={() => {
          setForm({ patient_id: patients[0]?.id ?? "", payer: "", policy_no: "", amount: "0" });
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
              askSave({ editing: false, entityLabel: "insurance claim", onConfirm: doCreate });
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
            <Field label="Payer">
              <TextInput required value={form.payer} onChange={(e) => setForm({ ...form, payer: e.target.value })} />
            </Field>
            <Field label="Policy no">
              <TextInput value={form.policy_no} onChange={(e) => setForm({ ...form, policy_no: e.target.value })} />
            </Field>
            <Field label="Amount">
              <TextInput type="number" value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} />
            </Field>
            <div className="md:col-span-2">
              <ExtraFieldsBlock formKey="healthcare.hms.claim" valueJson={extraJson} onChange={setExtraJson} />
            </div>
            <div className="md:col-span-2 flex gap-2">
              <Button type="submit">Create claim</Button>
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
            { value: "draft", label: "Draft" },
            { value: "submitted", label: "Submitted" },
            { value: "paid", label: "Paid" },
            { value: "denied", label: "Denied" }
          ]}
          onFilterChange={setStatusFilter}
          onExportCsv={() =>
            exportListCsv({
              tenantId,
              module: "healthcare",
              filename: "hms-claims",
              rows: filtered.map((r) => ({
                Claim: r.claim_no,
                MRN: patients.find((p) => p.id === r.patient_id)?.mrn ?? "—",
                Payer: r.payer,
                Eligibility: r.eligibility_status,
                Status: r.claim_status,
                Amount: r.amount
              }))
            })
          }
        />
        <div className="mt-3 overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-slate-500">
                <th className="px-3 py-2">Claim</th>
                <th>Patient</th>
                <th>Payer</th>
                <th>Eligibility</th>
                <th>Status</th>
                <th>Amount</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {filtered.map((row) => (
                <tr key={row.id} className="border-t border-line">
                  <td className="px-3 py-3 font-semibold">{row.claim_no}</td>
                  <td>
                    {patients.find((p) => p.id === row.patient_id)?.mrn ?? "—"}
                    <div className="text-xs text-slate-500">{row.patient_name}</div>
                  </td>
                  <td>{row.payer}</td>
                  <td>
                    <StatusBadge status={row.eligibility_status} />
                  </td>
                  <td>
                    <StatusBadge status={row.claim_status} />
                  </td>
                  <td>{money(row.amount)}</td>
                  <td>
                    <div className="flex flex-wrap gap-1">
                      {row.eligibility_status === "unchecked" ? (
                        <Button type="button" variant="secondary" className="!px-2 !py-1 text-xs" onClick={() => {
                          checkClaimEligibility(tenantId, row.id, "billing");
                          refresh();
                        }}>
                          Check eligibility
                        </Button>
                      ) : null}
                      {row.claim_status === "draft" ? (
                        <Button type="button" variant="primary" className="!px-2 !py-1 text-xs" onClick={() => askSave({ editing: true, entityLabel: "claim submit", onConfirm: () => { updateInsuranceClaim(row.id, { claim_status: "submitted" }, "billing"); refresh(); } })}>
                          Submit
                        </Button>
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
