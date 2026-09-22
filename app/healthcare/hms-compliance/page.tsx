"use client";

import { useEffect, useMemo, useState } from "react";
import { AppShell } from "@/components/app-shell";
import { ModuleBreadcrumbs } from "@/components/common/module-breadcrumbs";
import { PageHeader } from "@/components/common/page-header";
import { DataListToolbar } from "@/components/common/data-list-toolbar";
import { useConfirm } from "@/components/common/use-confirm";
import { Button, Field, Panel, SectionHeader, TextInput } from "@/components/ui";
import { getStoredTenantId } from "@/lib/auth/session";
import { exportListCsv } from "@/lib/list-export";
import { filterAndSort } from "@/lib/list-query";
import {
  assignHmsRole,
  listBreakGlass,
  listHmsRoles,
  listPhiAudit,
  pullHmsFromSupabase,
  requestBreakGlass,
  subscribeHms,
  type HmsPhiAuditLog
} from "@/modules/healthcare/services/hms.store";

export default function HmsCompliancePage() {
  const tenantId = getStoredTenantId() ?? "alpha";
  const { askSave, dialog } = useConfirm();
  const [audit, setAudit] = useState<HmsPhiAuditLog[]>([]);
  const [adminEmail, setAdminEmail] = useState("");
  const [adminMsg, setAdminMsg] = useState("");
  const [search, setSearch] = useState("");
  const [justification, setJustification] = useState("");
  const [patientMrn, setPatientMrn] = useState("");
  const [actor, setActor] = useState("security@hospital.example");
  const [roleForm, setRoleForm] = useState({
    staff_email: "",
    staff_name: "",
    hms_role: "doctor" as const
  });

  function refresh() {
    setAudit(listPhiAudit(tenantId));
  }
  useEffect(() => {
    void pullHmsFromSupabase(tenantId).finally(() => refresh());
    return subscribeHms(() => refresh());
  }, [tenantId]);

  const filtered = useMemo(
    () =>
      filterAndSort(audit as unknown as Array<Record<string, unknown>>, {
        search,
        searchFields: ["actor_email", "action", "table_name", "justification"],
        sortField: "created_at",
        sortDir: "desc"
      }) as unknown as HmsPhiAuditLog[],
    [audit, search]
  );

  const roles = listHmsRoles(tenantId);
  const glass = listBreakGlass(tenantId);

  async function deprovisionByEmail() {
    setAdminMsg("");
    const email = adminEmail.trim().toLowerCase();
    if (!email) return;
    const res = await fetch("/api/admin/users/deprovision", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email })
    });
    const data = (await res.json()) as { ok?: boolean; error?: string; email?: string };
    if (!res.ok || !data.ok) {
      setAdminMsg(data.error ?? "Deprovision failed");
      return;
    }
    setAdminMsg(`${data.email ?? email} deprovisioned.`);
    setAdminEmail("");
  }

  async function unlockByEmail() {
    setAdminMsg("");
    const email = adminEmail.trim().toLowerCase();
    if (!email) return;
    const res = await fetch("/api/auth/unlock", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email })
    });
    const data = (await res.json()) as { ok?: boolean; error?: string };
    if (!res.ok || !data.ok) {
      setAdminMsg(data.error ?? "Unlock failed");
      return;
    }
    setAdminMsg(`${email} login lockout cleared.`);
  }

  return (
    <AppShell activeModule="healthcare">
      {dialog}
      <ModuleBreadcrumbs />
      <PageHeader
        title="HMS compliance"
        description="Append-only PHI audit, break-glass access, clinical role assignments (MFA required)."
      />
      <div className="mb-4 grid gap-4 lg:grid-cols-2">
        <Panel>
          <SectionHeader title="User de-provisioning" eyebrow="IT/Security · revokes sessions immediately" />
          {adminMsg ? <p className="mt-2 text-sm text-slate-600">{adminMsg}</p> : null}
          <form
            className="mt-3 grid gap-3"
            onSubmit={(e) => {
              e.preventDefault();
              askSave({ editing: false, entityLabel: "user deprovision", onConfirm: () => void deprovisionByEmail() });
            }}
          >
            <Field label="Staff email">
              <TextInput type="email" required value={adminEmail} onChange={(e) => setAdminEmail(e.target.value)} placeholder="user@hospital.example" />
            </Field>
            <div className="flex flex-wrap gap-2">
              <Button type="submit">Deprovision user</Button>
              <Button type="button" variant="secondary" onClick={() => askSave({ editing: false, entityLabel: "account unlock", onConfirm: () => void unlockByEmail() })}>
                Unlock account
              </Button>
            </div>
          </form>
        </Panel>
        <Panel>
          <SectionHeader title="Break-glass access" eyebrow="Justification required · security alert logged" />
          <form
            className="mt-3 grid gap-3"
            onSubmit={(e) => {
              e.preventDefault();
              try {
                requestBreakGlass(tenantId, {
                  actor_email: actor,
                  patient_mrn: patientMrn || null,
                  justification
                });
                setJustification("");
                refresh();
              } catch (err) {
                alert(err instanceof Error ? err.message : "Failed");
              }
            }}
          >
            <Field label="Actor email">
              <TextInput value={actor} onChange={(e) => setActor(e.target.value)} />
            </Field>
            <Field label="Patient MRN (optional)">
              <TextInput value={patientMrn} onChange={(e) => setPatientMrn(e.target.value)} />
            </Field>
            <Field label="Justification">
              <TextInput required value={justification} onChange={(e) => setJustification(e.target.value)} />
            </Field>
            <Button type="submit">Request emergency access</Button>
          </form>
          <ul className="mt-3 max-h-40 space-y-1 overflow-y-auto text-xs text-slate-600">
            {glass.slice(0, 8).map((g) => (
              <li key={g.id}>
                {g.created_at.slice(0, 19)} · {g.actor_email} · {g.justification}
              </li>
            ))}
          </ul>
        </Panel>
        <Panel>
          <SectionHeader title="Clinical role assignment" eyebrow="Spec §3 · MFA required for staff" />
          <form
            className="mt-3 grid gap-3"
            onSubmit={(e) => {
              e.preventDefault();
              if (!roleForm.staff_email.trim()) return;
              assignHmsRole(tenantId, {
                user_profile_id: null,
                staff_email: roleForm.staff_email.trim(),
                staff_name: roleForm.staff_name.trim() || roleForm.staff_email,
                hms_role: roleForm.hms_role,
                branch_id: null,
                mfa_required: true,
                created_by: actor,
                updated_by: actor
              });
              setRoleForm({ staff_email: "", staff_name: "", hms_role: "doctor" });
              refresh();
            }}
          >
            <Field label="Staff email">
              <TextInput value={roleForm.staff_email} onChange={(e) => setRoleForm({ ...roleForm, staff_email: e.target.value })} />
            </Field>
            <Field label="Name">
              <TextInput value={roleForm.staff_name} onChange={(e) => setRoleForm({ ...roleForm, staff_name: e.target.value })} />
            </Field>
            <Field label="HMS role">
              <select
                className="bs-input"
                value={roleForm.hms_role}
                onChange={(e) => setRoleForm({ ...roleForm, hms_role: e.target.value as typeof roleForm.hms_role })}
              >
                {["hospital_admin", "doctor", "nurse", "receptionist", "lab_technician", "pharmacist", "billing_staff", "it_security"].map(
                  (r) => (
                    <option key={r} value={r}>
                      {r}
                    </option>
                  )
                )}
              </select>
            </Field>
            <Button type="submit">Assign role</Button>
          </form>
          <ul className="mt-3 max-h-40 space-y-1 overflow-y-auto text-xs">
            {roles.map((r) => (
              <li key={r.id}>
                {r.staff_name} · {r.hms_role} · MFA {r.mfa_required ? "required" : "off"}
              </li>
            ))}
          </ul>
        </Panel>
      </div>
      <Panel>
        <SectionHeader title="PHI audit log" eyebrow="Append-only · no updates/deletes" />
        <DataListToolbar
          search={search}
          onSearchChange={setSearch}
          onExportCsv={() =>
            exportListCsv({
              tenantId,
              module: "healthcare",
              filename: "hms-phi-audit",
              rows: filtered.map((r) => ({
                Time: r.created_at,
                Actor: r.actor_email ?? "",
                Action: r.action,
                Table: r.table_name,
                BreakGlass: r.break_glass ? "yes" : "no"
              }))
            })
          }
        />
        <div className="mt-3 overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-slate-500">
                <th className="px-3 py-2">When</th>
                <th>Actor</th>
                <th>Action</th>
                <th>Table</th>
                <th>BG</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((row) => (
                <tr key={row.id} className="border-t border-line">
                  <td className="px-3 py-3 whitespace-nowrap">{row.created_at.slice(0, 19).replace("T", " ")}</td>
                  <td>{row.actor_email || "—"}</td>
                  <td>{row.action}</td>
                  <td>
                    {row.table_name}
                    {row.record_id ? <div className="text-xs text-slate-500">{row.record_id.slice(0, 8)}…</div> : null}
                  </td>
                  <td>{row.break_glass ? "Yes" : "No"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Panel>
    </AppShell>
  );
}
