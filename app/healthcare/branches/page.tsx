"use client";

import { useEffect, useMemo, useState } from "react";
import { AppShell } from "@/components/app-shell";
import { ModuleBreadcrumbs } from "@/components/common/module-breadcrumbs";
import { PageHeader } from "@/components/common/page-header";
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
  createBranch,
  grantBranchShareConsent,
  listBranchShareConsents,
  listBranches,
  pullHmsClinicalFromSupabase,
  revokeBranchShareConsent,
  subscribeHmsClinical,
  trashBranch,
  updateBranch,
  type HmsBranch
} from "@/modules/healthcare/services/hms-clinical.store";
import { listPatients, pullHmsFromSupabase, subscribeHms } from "@/modules/healthcare/services/hms.store";

const empty = { code: "", name: "", address: "", phone: "" };

export default function HmsBranchesPage() {
  const tenantId = getStoredTenantId() ?? "alpha";
  const { askSave, askTrash, dialog } = useConfirm();
  const [rows, setRows] = useState<HmsBranch[]>([]);
  const [search, setSearch] = useState("");
  const [openForm, setOpenForm] = useState(false);
  const [editing, setEditing] = useState<HmsBranch | null>(null);
  const [form, setForm] = useState(empty);
  const [extraJson, setExtraJson] = useState("");
  const [patients, setPatients] = useState(listPatients(tenantId));
  const [consents, setConsents] = useState(listBranchShareConsents(tenantId));
  const [consentForm, setConsentForm] = useState({ patient_id: "", from_branch_id: "", to_branch_id: "" });

  function refresh() {
    setRows(listBranches(tenantId));
    setPatients(listPatients(tenantId));
    setConsents(listBranchShareConsents(tenantId));
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
        searchFields: ["code", "name", "address", "phone"],
        sortField: "code",
        sortDir: "asc"
      }) as unknown as HmsBranch[],
    [rows, search]
  );

  function doSave() {
    if (!form.code.trim() || !form.name.trim()) return;
    const payload = {
      code: form.code.trim(),
      name: form.name.trim(),
      address: form.address || null,
      phone: form.phone || null
    };
    if (editing) {
      updateBranch(editing.id, payload);
      persistExtraFields(tenantId, "healthcare.hms.branch", editing.id, extraJson);
    } else {
      const row = createBranch(tenantId, payload);
      persistExtraFields(tenantId, "healthcare.hms.branch", row.id, extraJson);
    }
    setOpenForm(false);
    refresh();
  }

  return (
    <AppShell activeModule="healthcare">
      {dialog}
      <ModuleBreadcrumbs />
      <PageHeader
        title="Hospital branches"
        description="Multi-site branch registry for wards and operations."
        actionLabel="Add branch"
        onAction={() => {
          setEditing(null);
          setForm(empty);
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
              askSave({ editing: Boolean(editing), entityLabel: "branch", onConfirm: doSave });
            }}
          >
            <Field label="Code">
              <TextInput required value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value })} />
            </Field>
            <Field label="Name">
              <TextInput required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
            </Field>
            <Field label="Address" className="md:col-span-2">
              <TextInput value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} />
            </Field>
            <Field label="Phone">
              <TextInput value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
            </Field>
            <div className="md:col-span-2">
              <ExtraFieldsBlock formKey="healthcare.hms.branch" valueJson={extraJson} onChange={setExtraJson} />
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
          onExportCsv={() =>
            exportListCsv({
              tenantId,
              module: "healthcare",
              filename: "hms-branches",
              rows: filtered.map((r) => ({ Code: r.code, Name: r.name, Phone: r.phone ?? "" }))
            })
          }
        />
        <div className="mt-3 overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-slate-500">
                <th className="px-3 py-2">Branch</th>
                <th>Address</th>
                <th>Phone</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {filtered.map((row) => (
                <tr key={row.id} className="border-t border-line">
                  <td className="px-3 py-3">
                    <div className="font-semibold">{row.name}</div>
                    <div className="text-xs text-slate-500">{row.code}</div>
                  </td>
                  <td>{row.address ?? "—"}</td>
                  <td>{row.phone ?? "—"}</td>
                  <td>
                    <RecordRowActions
                      onEdit={() => {
                        setEditing(row);
                        setForm({ code: row.code, name: row.name, address: row.address ?? "", phone: row.phone ?? "" });
                        setOpenForm(true);
                      }}
                      onTrash={() =>
                        askTrash({
                          entityLabel: "branch",
                          onConfirm: () => {
                            trashBranch(row.id);
                            refresh();
                          }
                        })
                      }
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Panel>
      <Panel className="mt-4">
        <h2 className="text-sm font-semibold">Cross-branch share consent</h2>
        <p className="mt-1 text-xs text-slate-500">Grant patients permission to share records across branches.</p>
        <form
          className="mt-3 grid gap-3 md:grid-cols-3"
          onSubmit={(e) => {
            e.preventDefault();
            if (!consentForm.patient_id || !consentForm.to_branch_id) return;
            grantBranchShareConsent(tenantId, {
              patient_id: consentForm.patient_id,
              from_branch_id: consentForm.from_branch_id || null,
              to_branch_id: consentForm.to_branch_id,
              actor: "staff"
            });
            setConsentForm({ patient_id: "", from_branch_id: "", to_branch_id: "" });
            refresh();
          }}
        >
          <Field label="Patient">
            <SelectInput value={consentForm.patient_id} onChange={(e) => setConsentForm({ ...consentForm, patient_id: e.target.value })}>
              <option value="">Select…</option>
              {patients.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.mrn} · {p.full_name}
                </option>
              ))}
            </SelectInput>
          </Field>
          <Field label="From branch">
            <SelectInput value={consentForm.from_branch_id} onChange={(e) => setConsentForm({ ...consentForm, from_branch_id: e.target.value })}>
              <option value="">Any</option>
              {rows.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.name}
                </option>
              ))}
            </SelectInput>
          </Field>
          <Field label="To branch">
            <SelectInput value={consentForm.to_branch_id} onChange={(e) => setConsentForm({ ...consentForm, to_branch_id: e.target.value })}>
              <option value="">Select…</option>
              {rows.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.name}
                </option>
              ))}
            </SelectInput>
          </Field>
          <div className="md:col-span-3">
            <Button type="submit">Grant consent</Button>
          </div>
        </form>
        <ul className="mt-4 space-y-2 text-sm">
          {consents.map((c) => {
            const patient = patients.find((p) => p.id === c.patient_id);
            const toBranch = rows.find((b) => b.id === c.to_branch_id);
            return (
              <li key={c.id} className="flex flex-wrap items-center justify-between gap-2 border-t border-line pt-2">
                <span>
                  {patient?.full_name ?? c.patient_id} → {toBranch?.name ?? c.to_branch_id} (v{c.consent_version})
                </span>
                <Button type="button" variant="ghost" className="!px-2 !py-1 text-xs" onClick={() => { revokeBranchShareConsent(tenantId, c.id); refresh(); }}>
                  Revoke
                </Button>
              </li>
            );
          })}
        </ul>
      </Panel>
    </AppShell>
  );
}
