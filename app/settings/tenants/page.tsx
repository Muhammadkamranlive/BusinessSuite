"use client";

import { useEffect, useMemo, useState } from "react";
import { Building2 } from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { AdminSubnav } from "@/components/admin/admin-subnav";
import { ModuleBreadcrumbs } from "@/components/common/module-breadcrumbs";
import { PageHeader } from "@/components/common/page-header";
import { StatusBadge } from "@/components/common/status-badge";
import { DataListToolbar } from "@/components/common/data-list-toolbar";
import { useConfirm } from "@/components/common/use-confirm";
import { ExtraFieldsBlock } from "@/components/forms/extra-fields-block";
import { ExtraFieldsReadout } from "@/components/forms/extra-fields-readout";
import { Badge, Button, Field, Panel, SelectInput, TextInput } from "@/components/ui";
import { getStoredTenantId } from "@/lib/auth/session";
import { getSessionProfile } from "@/lib/auth/session-profile";
import { exportListCsv, exportListPdf } from "@/lib/list-export";
import { canMenu } from "@/modules/admin/services/acl.store";
import { filterAndSort } from "@/lib/list-query";
import { listAdminTenants, upsertTenant, type AdminTenant } from "@/modules/admin/services/admin.store";
import { getExtraFieldValues, persistExtraFields } from "@/modules/forms/services/extra-fields.store";

export default function TenantsPage() {
  const tenantId = getStoredTenantId() ?? "alpha";
  const actor = getSessionProfile();
  const allowed = canMenu(actor.role, actor.email, "settings.companies_tenants", "view");
  const { askSave, dialog } = useConfirm();
  const [tenants, setTenants] = useState<AdminTenant[]>([]);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [sortField, setSortField] = useState("name");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<AdminTenant | null>(null);
  const [extraJson, setExtraJson] = useState("");
  const [form, setForm] = useState({
    name: "",
    industry: "",
    region: "",
    plan: "Demo Pro" as AdminTenant["plan"],
    status: "active" as AdminTenant["status"],
    email: "",
    phone: ""
  });

  function refresh() {
    setTenants(listAdminTenants());
  }

  useEffect(() => {
    refresh();
  }, []);

  const filtered = useMemo(
    () =>
      filterAndSort(tenants as unknown as Array<Record<string, unknown>>, {
        search,
        searchFields: ["name", "industry", "region", "plan", "email"],
        statusField: "status",
        statusValue: statusFilter,
        sortField,
        sortDir
      }) as unknown as AdminTenant[],
    [tenants, search, statusFilter, sortField, sortDir]
  );

  function openCreate() {
    setEditing(null);
    setForm({ name: "", industry: "", region: "", plan: "Demo Pro", status: "active", email: "", phone: "" });
    setExtraJson("");
    setShowForm(true);
  }

  function openEdit(t: AdminTenant) {
    setEditing(t);
    setForm({
      name: t.name,
      industry: t.industry,
      region: t.region,
      plan: t.plan,
      status: t.status,
      email: t.email,
      phone: t.phone
    });
    setExtraJson(getExtraFieldValues(tenantId, "settings.tenant", t.id));
    setShowForm(true);
  }

  function doSave() {
    const row = upsertTenant({
      id: editing?.id,
      name: form.name.trim(),
      industry: form.industry.trim(),
      region: form.region.trim(),
      plan: form.plan,
      status: form.status,
      email: form.email.trim(),
      phone: form.phone.trim()
    });
    persistExtraFields(tenantId, "settings.tenant", row.id, extraJson);
    setExtraJson("");
    setEditing(null);
    setShowForm(false);
    setForm({ name: "", industry: "", region: "", plan: "Demo Pro", status: "active", email: "", phone: "" });
    refresh();
  }

  function save(e: React.FormEvent) {
    e.preventDefault();
    askSave({
      editing: Boolean(editing),
      entityLabel: "company",
      onConfirm: doSave
    });
  }

  if (!allowed) {
    return (
      <AppShell activeModule="settings">
        <AdminSubnav active="/settings/tenants" />
        <PageHeader title="Companies / Tenants" description="Managing all companies is a platform Super Admin tool. Company admins only see their own workspace." />
      </AppShell>
    );
  }

  return (
    <AppShell activeModule="settings">
      <ModuleBreadcrumbs />
      <PageHeader
        title="Companies / Tenants"
        description="Manage multi-company profiles, plans, and status."
        actionLabel="Add company"
        onAction={openCreate}
      />
      <AdminSubnav active="/settings/tenants" />

      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-end">
        <div className="flex-1">
          <DataListToolbar
            search={search}
            onSearchChange={setSearch}
            searchPlaceholder="Search companies…"
            filterLabel="statuses"
            filterValue={statusFilter}
            filterOptions={[
              { value: "active", label: "active" },
              { value: "inactive", label: "inactive" }
            ]}
            onFilterChange={setStatusFilter}
            sortValue={sortField}
            sortOptions={[
              { value: "name", label: "Name" },
              { value: "industry", label: "Industry" },
              { value: "plan", label: "Plan" },
              { value: "status", label: "Status" }
            ]}
            onSortChange={setSortField}
            sortDir={sortDir}
            onSortDirChange={setSortDir}
            onExportCsv={() =>
              exportListCsv({
                tenantId,
                module: "settings",
                filename: "tenants",
                rows: filtered.map((t) => ({
                  Name: t.name,
                  Industry: t.industry,
                  Region: t.region,
                  Plan: t.plan,
                  Status: t.status,
                  Email: t.email
                }))
              })
            }
            onExportPdf={() =>
              exportListPdf({
                tenantId,
                module: "settings",
                title: "Companies",
                filename: "tenants",
                columns: ["Name", "Industry", "Plan", "Status"],
                rows: filtered.map((t) => [t.name, t.industry, t.plan, t.status])
              })
            }
            rightSlot={
              <Button onClick={openCreate}><Building2 className="size-4" /> Add company</Button>
            }
          />
        </div>
      </div>

      {(showForm) && (
        <Panel className="mb-5 p-5">
          <h2 className="mb-4 text-lg font-bold text-ink">{editing ? "Edit company" : "New company"}</h2>
          <form onSubmit={save} className="grid gap-4 md:grid-cols-2">
            <Field label="Company name"><TextInput required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></Field>
            <Field label="Industry"><TextInput required value={form.industry} onChange={(e) => setForm({ ...form, industry: e.target.value })} /></Field>
            <Field label="Region"><TextInput required value={form.region} onChange={(e) => setForm({ ...form, region: e.target.value })} /></Field>
            <Field label="Plan">
              <SelectInput value={form.plan} onChange={(e) => setForm({ ...form, plan: e.target.value as AdminTenant["plan"] })}>
                <option value="Demo Pro">Demo Pro</option>
                <option value="Demo Growth">Demo Growth</option>
                <option value="Demo Enterprise">Demo Enterprise</option>
              </SelectInput>
            </Field>
            <Field label="Email"><TextInput type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} /></Field>
            <Field label="Phone"><TextInput value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} /></Field>
            <Field label="Status">
              <SelectInput value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value as AdminTenant["status"] })}>
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
              </SelectInput>
            </Field>
            <ExtraFieldsBlock formKey="settings.tenant" valueJson={extraJson} onChange={setExtraJson} />
            <div className="flex items-end gap-2">
              <Button type="submit">Save company</Button>
              <Button type="button" variant="secondary" onClick={() => { setEditing(null); setShowForm(false); setExtraJson(""); setForm({ name: "", industry: "", region: "", plan: "Demo Pro", status: "active", email: "", phone: "" }); }}>Cancel</Button>
            </div>
          </form>
        </Panel>
      )}

      <div className="grid gap-4 md:grid-cols-2">
        {filtered.map((t) => (
          <Panel key={t.id} className="p-5">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-lg font-bold text-ink">{t.name}</p>
                <p className="mt-1 text-sm text-slate-500">{t.industry} · {t.region}</p>
                <div className="mt-3 flex flex-wrap gap-2">
                  <Badge tone="info">{t.plan}</Badge>
                  <StatusBadge status={t.status} />
                </div>
                <p className="mt-3 text-xs text-slate-500">{t.email} · {t.phone}</p>
                <ExtraFieldsReadout tenantId={tenantId} formKey="settings.tenant" recordId={t.id} />
              </div>
              <Button variant="secondary" className="!min-h-9 !text-xs" onClick={() => openEdit(t)}>Edit</Button>
            </div>
          </Panel>
        ))}
      </div>
      {dialog}
    </AppShell>
  );
}
