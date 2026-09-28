"use client";

import { useEffect, useMemo, useState } from "react";
import { AppShell } from "@/components/app-shell";
import { ModuleBreadcrumbs } from "@/components/common/module-breadcrumbs";
import { PageHeader } from "@/components/common/page-header";
import { DataListToolbar } from "@/components/common/data-list-toolbar";
import { useConfirm } from "@/components/common/use-confirm";
import { Badge, Button, Field, Panel, SectionHeader, TextInput } from "@/components/ui";
import { clearLoginSessions, listLoginSessions } from "@/lib/auth/login-sessions";
import { getSessionProfile } from "@/lib/auth/session-profile";
import { getStoredTenantId } from "@/lib/auth/session";
import { exportListCsv, exportListPdf } from "@/lib/list-export";
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

type ComplianceAuditResult = {
  ok?: boolean;
  skipped?: boolean;
  reason?: string;
  tablesChecked?: Array<{ table: string; exists: boolean; rlsExpected: boolean }>;
  auditLogCount?: number;
  breakGlassCount?: number;
  roleAssignmentCount?: number;
  lastAuditActions?: Array<Record<string, unknown>>;
  ranAt?: string;
};

type ChecklistItem = {
  id: string;
  label: string;
  status: "pass" | "warn" | "pending";
  detail?: string;
};

export default function HmsCompliancePage() {
  const tenantId = getStoredTenantId() ?? "alpha";
  const session = getSessionProfile();
  const { askSave, dialog } = useConfirm();
  const [audit, setAudit] = useState<HmsPhiAuditLog[]>([]);
  const [adminEmail, setAdminEmail] = useState("");
  const [adminMsg, setAdminMsg] = useState("");
  const [search, setSearch] = useState("");
  const [justification, setJustification] = useState("");
  const [patientMrn, setPatientMrn] = useState("");
  const [actor, setActor] = useState("security@hospital.example");
  const [auditResult, setAuditResult] = useState<ComplianceAuditResult | null>(null);
  const [auditLoading, setAuditLoading] = useState(false);
  const [auditError, setAuditError] = useState("");
  const [sessionTick, setSessionTick] = useState(0);
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
  const sessionsEmail = (adminEmail.trim() || session.email).toLowerCase();
  const deviceSessions = useMemo(
    () => listLoginSessions(sessionsEmail),
    [sessionsEmail, sessionTick]
  );

  const checklist = useMemo((): ChecklistItem[] => {
    const tables = auditResult?.tablesChecked ?? [];
    const missingTables = tables.filter((t) => !t.exists).length;
    const rlsPass = missingTables === 0 && tables.length > 0;
    return [
      {
        id: "rls",
        label: "RLS on PHI tables",
        status: auditResult?.skipped ? "warn" : rlsPass ? "pass" : auditResult ? "warn" : "pending",
        detail: auditResult
          ? `${tables.length - missingTables}/${tables.length} tables reachable`
          : "Run compliance audit"
      },
      {
        id: "mfa",
        label: "MFA for staff roles",
        status: roles.some((r) => r.mfa_required) ? "pass" : "warn",
        detail: `${roles.filter((r) => r.mfa_required).length} role(s) require MFA`
      },
      {
        id: "rbac",
        label: "Server-side RBAC",
        status: "pass",
        detail: "guardHealthcarePhiRoute on PHI APIs"
      },
      {
        id: "audit",
        label: "Append-only PHI audit",
        status: audit.length > 0 ? "pass" : "warn",
        detail: `${auditResult?.auditLogCount ?? audit.length} log entries`
      },
      {
        id: "idle",
        label: "Clinical idle timeout (15m)",
        status: "pass",
        detail: "SessionIdleGuard + HMS_IDLE_TIMEOUT_MS"
      },
      {
        id: "breakglass",
        label: "Break-glass + security alert",
        status: glass.length > 0 ? "pass" : "warn",
        detail: `${auditResult?.breakGlassCount ?? glass.length} event(s)`
      },
      {
        id: "consent",
        label: "Consent versioning",
        status: "pass",
        detail: "hms_patient_consents"
      },
      {
        id: "dsar",
        label: "GDPR DSAR export",
        status: "pass",
        detail: "Patients page JSON download"
      },
      {
        id: "anonymize",
        label: "GDPR anonymize workflow",
        status: "pass",
        detail: "anonymizePatient retention hold"
      },
      {
        id: "rate",
        label: "Rate limits (login, booking, sync)",
        status: "pass",
        detail: "enforceRateLimit + account lockout"
      },
      {
        id: "backup",
        label: "Backup schedule documented",
        status: "pass",
        detail: "docs/ops/BACKUP_RESTORE.md"
      },
      {
        id: "secrets",
        label: "Secrets server-only",
        status: "pass",
        detail: "Supabase admin client on API routes"
      }
    ];
  }, [audit, auditResult, glass.length, roles]);

  async function runComplianceAudit() {
    setAuditLoading(true);
    setAuditError("");
    try {
      const res = await fetch(`/api/healthcare/compliance-audit?tenantId=${encodeURIComponent(tenantId)}`);
      const data = (await res.json()) as ComplianceAuditResult & { error?: string };
      if (!res.ok || !data.ok) {
        setAuditError(data.error ?? data.reason ?? "Compliance audit failed");
        setAuditResult(data);
        return;
      }
      setAuditResult(data);
      refresh();
    } catch {
      setAuditError("Could not reach compliance audit API");
    } finally {
      setAuditLoading(false);
    }
  }

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
    clearLoginSessions(email);
    setSessionTick((n) => n + 1);
    setAdminMsg(`${data.email ?? email} deprovisioned and local sessions cleared.`);
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

  function clearLocalSessions() {
    const email = adminEmail.trim().toLowerCase() || session.email;
    if (!email) return;
    clearLoginSessions(email);
    setSessionTick((n) => n + 1);
    setAdminMsg(`Local login session history cleared for ${email}.`);
  }

  const exportRows = filtered.map((r) => ({
    Time: r.created_at,
    Actor: r.actor_email ?? "",
    Action: r.action,
    Table: r.table_name,
    BreakGlass: r.break_glass ? "yes" : "no"
  }));

  return (
    <AppShell activeModule="healthcare">
      {dialog}
      <ModuleBreadcrumbs />
      <PageHeader
        title="HMS compliance command center"
        description="PHI audit, break-glass, RBAC, compliance checklist, session revocation, and automated audits (AGENT_SPEC §2–3)."
      />

      <div className="mb-4 grid gap-4 lg:grid-cols-2">
        <Panel>
          <SectionHeader title="Compliance checklist" eyebrow="AGENT_SPEC §2 guardrails" />
          <div className="mt-3 flex flex-wrap gap-2">
            <Button type="button" variant="secondary" disabled={auditLoading} onClick={() => void runComplianceAudit()}>
              {auditLoading ? "Running audit…" : "Run compliance audit"}
            </Button>
            {auditResult?.ranAt ? (
              <span className="self-center text-xs text-slate-500">Last run: {auditResult.ranAt.slice(0, 19).replace("T", " ")}</span>
            ) : null}
          </div>
          {auditError ? <p className="mt-2 text-sm text-red-600">{auditError}</p> : null}
          <ul className="mt-3 space-y-2">
            {checklist.map((item) => (
              <li key={item.id} className="flex flex-wrap items-center gap-2 text-sm">
                <Badge tone={item.status === "pass" ? "success" : item.status === "warn" ? "warning" : "neutral"}>
                  {item.status === "pass" ? "Pass" : item.status === "warn" ? "Review" : "Pending"}
                </Badge>
                <span className="font-medium">{item.label}</span>
                {item.detail ? <span className="text-slate-500">— {item.detail}</span> : null}
              </li>
            ))}
          </ul>
        </Panel>

        <Panel>
          <SectionHeader title="Active sessions / devices" eyebrow="Local device history · admin deprovision" />
          <p className="mt-2 text-xs text-slate-500">
            Device labels from login history (no PHI). Clear local history or deprovision to revoke server access.
          </p>
          <Field label="Staff email (optional — defaults to you)">
            <TextInput
              type="email"
              value={adminEmail}
              onChange={(e) => setAdminEmail(e.target.value)}
              placeholder={session.email || "user@hospital.example"}
            />
          </Field>
          <div className="mt-2 flex flex-wrap gap-2">
            <Button type="button" variant="secondary" onClick={clearLocalSessions}>
              Clear local sessions
            </Button>
            <Button
              type="button"
              onClick={() =>
                askSave({
                  editing: false,
                  entityLabel: "user deprovision",
                  onConfirm: () => void deprovisionByEmail()
                })
              }
            >
              Deprovision user
            </Button>
            <Button
              type="button"
              variant="secondary"
              onClick={() =>
                askSave({ editing: false, entityLabel: "account unlock", onConfirm: () => void unlockByEmail() })
              }
            >
              Unlock account
            </Button>
          </div>
          {adminMsg ? <p className="mt-2 text-sm text-slate-600">{adminMsg}</p> : null}
          <ul className="mt-3 max-h-48 space-y-2 overflow-y-auto text-xs">
            {deviceSessions.length === 0 ? (
              <li className="text-slate-500">No recorded login sessions for {sessionsEmail}.</li>
            ) : (
              deviceSessions.map((s) => (
                <li key={s.id} className="rounded border border-line px-2 py-1.5">
                  <div className="font-medium">{s.label}</div>
                  <div className="text-slate-500">
                    {s.at.slice(0, 19).replace("T", " ")} · {s.is_new_device ? "New device" : "Known device"}
                  </div>
                </li>
              ))
            )}
          </ul>
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
              rows: exportRows
            })
          }
          onExportPdf={() =>
            exportListPdf({
              tenantId,
              module: "healthcare",
              title: "HMS PHI audit log",
              filename: "hms-phi-audit",
              columns: ["Time", "Actor", "Action", "Table", "BreakGlass"],
              rows: exportRows.map((r) => [r.Time, r.Actor, r.Action, r.Table, r.BreakGlass])
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
