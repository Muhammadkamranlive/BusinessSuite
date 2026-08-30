"use client";

import { useEffect, useMemo, useState } from "react";
import { AppShell } from "@/components/app-shell";
import { AdminSubnav } from "@/components/admin/admin-subnav";
import { ModuleBreadcrumbs } from "@/components/common/module-breadcrumbs";
import { PageHeader } from "@/components/common/page-header";
import { Badge, Field, Panel, SelectInput, TextInput } from "@/components/ui";
import { getStoredTenantId } from "@/lib/auth/session";
import { listCombinedAudit } from "@/modules/admin/services/admin.store";
import type { AuditLogEntry } from "@/modules/core/types";

export default function AuditPage() {
  const tenantId = getStoredTenantId() ?? "alpha";
  const [logs, setLogs] = useState<AuditLogEntry[]>([]);
  const [moduleFilter, setModuleFilter] = useState("all");
  const [actionFilter, setActionFilter] = useState("all");
  const [query, setQuery] = useState("");

  useEffect(() => {
    setLogs(listCombinedAudit(tenantId));
  }, [tenantId]);

  const modules = useMemo(() => Array.from(new Set(logs.map((l) => l.module))), [logs]);
  const actions = useMemo(() => Array.from(new Set(logs.map((l) => l.action))), [logs]);

  const filtered = useMemo(() => {
    return logs.filter((l) => {
      if (moduleFilter !== "all" && l.module !== moduleFilter) return false;
      if (actionFilter !== "all" && l.action !== actionFilter) return false;
      if (!query.trim()) return true;
      const q = query.toLowerCase();
      return [l.module, l.action, l.entity_name ?? "", l.entity_id ?? ""].join(" ").toLowerCase().includes(q);
    });
  }, [logs, moduleFilter, actionFilter, query]);

  return (
    <AppShell activeModule="settings">
      <ModuleBreadcrumbs />
      <PageHeader title="Audit Logs" description="Immutable trail of create, update, delete, invite, and settings changes." />
      <AdminSubnav active="/settings/audit" />

      <Panel className="mb-4 p-4">
        <div className="grid gap-3 md:grid-cols-3">
          <Field label="Search">
            <TextInput value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Entity, module, action…" />
          </Field>
          <Field label="Module">
            <SelectInput value={moduleFilter} onChange={(e) => setModuleFilter(e.target.value)}>
              <option value="all">All modules</option>
              {modules.map((m) => <option key={m} value={m}>{m}</option>)}
            </SelectInput>
          </Field>
          <Field label="Action">
            <SelectInput value={actionFilter} onChange={(e) => setActionFilter(e.target.value)}>
              <option value="all">All actions</option>
              {actions.map((a) => <option key={a} value={a}>{a}</option>)}
            </SelectInput>
          </Field>
        </div>
      </Panel>

      <Panel className="overflow-hidden p-0">
        {filtered.length === 0 ? (
          <div className="p-8 text-center text-sm text-slate-500">
            No audit events yet. Invite a user, edit a company, or change system settings to generate logs.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full text-left text-sm">
              <thead>
                <tr className="border-b border-line bg-cloud">
                  {["When", "Module", "Action", "Entity", "Details"].map((h) => (
                    <th key={h} className="px-4 py-3 font-semibold text-slate-600">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map((l) => (
                  <tr key={l.id} className="border-b border-line align-top">
                    <td className="px-4 py-3 whitespace-nowrap text-slate-600">{new Date(l.created_at).toLocaleString()}</td>
                    <td className="px-4 py-3"><Badge tone="neutral">{l.module}</Badge></td>
                    <td className="px-4 py-3"><Badge tone={l.action === "delete" ? "danger" : l.action === "create" ? "success" : "info"}>{l.action}</Badge></td>
                    <td className="px-4 py-3 font-medium text-ink">{l.entity_name ?? "—"}</td>
                    <td className="px-4 py-3 text-xs text-slate-500">
                      <code className="rounded bg-cloud px-1.5 py-0.5">{l.entity_id ?? "n/a"}</code>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Panel>
    </AppShell>
  );
}
