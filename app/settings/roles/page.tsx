"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { ShieldPlus } from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { AdminSubnav } from "@/components/admin/admin-subnav";
import { ModuleBreadcrumbs } from "@/components/common/module-breadcrumbs";
import { PageHeader } from "@/components/common/page-header";
import { DataListToolbar } from "@/components/common/data-list-toolbar";
import { RecordRowActions } from "@/components/common/record-row-actions";
import { useConfirm } from "@/components/common/use-confirm";
import { ExtraFieldsBlock } from "@/components/forms/extra-fields-block";
import { ExtraFieldsReadout } from "@/components/forms/extra-fields-readout";
import { Badge, Button, Field, Panel, SelectInput, TextArea, TextInput } from "@/components/ui";
import { getStoredTenantId } from "@/lib/auth/session";
import { getSessionProfile } from "@/lib/auth/session-profile";
import { exportListCsv, exportListPdf } from "@/lib/list-export";
import { filterAndSort } from "@/lib/list-query";
import {
  moduleLabels,
  type ModuleKey,
  type RoleKey
} from "@/lib/permissions";
import { isSuperAdminRole } from "@/lib/platform-access";
import { canMenu } from "@/modules/admin/services/acl.store";
import {
  canTrashRole,
  createRole,
  hydrateRoles,
  listActiveRoles,
  slugifyRoleKey,
  trashRole,
  updateRole,
  type RoleRecord
} from "@/modules/admin/services/roles.store";
import { getExtraFieldValues, persistExtraFields } from "@/modules/forms/services/extra-fields.store";

const MENU_ID = "settings.roles_permissions";
const ALL_MODULES = Object.keys(moduleLabels) as ModuleKey[];

const emptyForm = {
  label: "",
  key: "",
  description: "",
  copyFrom: "" as RoleKey | "",
  modules: ["dashboard"] as ModuleKey[]
};

export default function RolesPage() {
  const tenantId = getStoredTenantId() ?? "alpha";
  const actor = getSessionProfile();
  const allowed = canMenu(actor.role, actor.email, MENU_ID, "view");
  const canCreate = canMenu(actor.role, actor.email, MENU_ID, "create");
  const canUpdate = canMenu(actor.role, actor.email, MENU_ID, "update");
  const canDelete = canMenu(actor.role, actor.email, MENU_ID, "delete");

  const { askSave, askTrash, dialog } = useConfirm();
  const [rows, setRows] = useState<RoleRecord[]>([]);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [sortField, setSortField] = useState("label");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");
  const [openForm, setOpenForm] = useState(false);
  const [editing, setEditing] = useState<RoleRecord | null>(null);
  const [error, setError] = useState("");
  const [form, setForm] = useState(emptyForm);
  const [extraJson, setExtraJson] = useState("");

  function refresh() {
    hydrateRoles();
    const all = listActiveRoles();
    setRows(isSuperAdminRole(actor.role) ? all : all.filter((r) => r.key !== "super_admin"));
  }

  useEffect(() => {
    refresh();
  }, [tenantId]);

  const filtered = useMemo(
    () =>
      filterAndSort(
        rows.map((r) => ({
          ...r,
          status: r.is_system ? "system" : "custom",
          modules_text: r.modules.map((m) => moduleLabels[m]).join(" ")
        })) as unknown as Array<Record<string, unknown>>,
        {
          search,
          searchFields: ["label", "key", "description", "modules_text"],
          statusField: "status",
          statusValue: statusFilter,
          sortField,
          sortDir
        }
      ) as unknown as Array<RoleRecord & { status: string }>,
    [rows, search, statusFilter, sortField, sortDir]
  );

  function openCreate() {
    setEditing(null);
    setForm(emptyForm);
    setExtraJson("");
    setError("");
    setOpenForm(true);
  }

  function openEdit(row: RoleRecord) {
    setEditing(row);
    setForm({
      label: row.label,
      key: row.key,
      description: row.description,
      copyFrom: "",
      modules: [...row.modules]
    });
    setExtraJson(getExtraFieldValues(tenantId, "settings.role", row.id));
    setError("");
    setOpenForm(true);
  }

  function toggleModule(module: ModuleKey) {
    setForm((prev) => ({
      ...prev,
      modules: prev.modules.includes(module)
        ? prev.modules.filter((m) => m !== module)
        : [...prev.modules, module]
    }));
  }

  function applyTemplate(key: RoleKey | "") {
    const source = rows.find((r) => r.key === key);
    setForm((prev) => ({
      ...prev,
      copyFrom: key,
      modules: source ? [...source.modules] : prev.modules,
      description: prev.description || source?.description || ""
    }));
  }

  function doSave() {
    setError("");
    try {
      if (editing) {
        const row = updateRole(editing.id, {
          label: form.label,
          description: form.description,
          modules: form.modules
        });
        if (row) persistExtraFields(tenantId, "settings.role", row.id, extraJson);
      } else {
        const row = createRole(tenantId, {
          label: form.label,
          key: form.key,
          description: form.description,
          modules: form.modules,
          copyFrom: form.copyFrom
        });
        persistExtraFields(tenantId, "settings.role", row.id, extraJson);
      }
      setExtraJson("");
      setEditing(null);
      setOpenForm(false);
      setForm(emptyForm);
      refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Save failed");
    }
  }

  function save(e: React.FormEvent) {
    e.preventDefault();
    askSave({
      editing: Boolean(editing),
      entityLabel: "role",
      onConfirm: doSave
    });
  }

  if (!allowed) {
    return (
      <AppShell activeModule="settings">
        <ModuleBreadcrumbs />
        <PageHeader title="Roles & Permissions" description="You do not have access to manage roles." />
        <AdminSubnav active="/settings/roles" />
      </AppShell>
    );
  }

  return (
    <AppShell activeModule="settings">
      <ModuleBreadcrumbs />
      <PageHeader
        title="Roles & Permissions"
        description="Add roles, edit labels and module access, then fine-tune menu rights in Access Control."
        actionLabel={canCreate ? "Add role" : undefined}
        onAction={canCreate ? openCreate : undefined}
      />
      <AdminSubnav active="/settings/roles" />

      <DataListToolbar
        search={search}
        onSearchChange={setSearch}
        searchPlaceholder="Search role name, key, modules…"
        filterLabel="types"
        filterValue={statusFilter}
        filterOptions={[
          { value: "system", label: "system" },
          { value: "custom", label: "custom" }
        ]}
        onFilterChange={setStatusFilter}
        sortValue={sortField}
        sortOptions={[
          { value: "label", label: "Name" },
          { value: "key", label: "Key" },
          { value: "created_at", label: "Created" }
        ]}
        onSortChange={setSortField}
        sortDir={sortDir}
        onSortDirChange={setSortDir}
        onExportCsv={() =>
          exportListCsv({
            tenantId,
            module: "settings",
            filename: "roles",
            rows: filtered.map((r) => ({
              Name: r.label,
              Key: r.key,
              Type: r.is_system ? "system" : "custom",
              Modules: r.modules.map((m) => moduleLabels[m]).join(", "),
              Description: r.description
            }))
          })
        }
        onExportPdf={() =>
          exportListPdf({
            tenantId,
            module: "settings",
            title: "Roles",
            filename: "roles",
            columns: ["Name", "Key", "Type", "Modules"],
            rows: filtered.map((r) => [
              r.label,
              r.key,
              r.is_system ? "system" : "custom",
              r.modules.map((m) => moduleLabels[m]).join(", ")
            ])
          })
        }
        rightSlot={
          <div className="flex flex-wrap gap-2">
            <Link href="/settings/access">
              <Button type="button" variant="secondary">
                Open Access Control
              </Button>
            </Link>
            {canCreate ? (
              <Button type="button" onClick={openCreate}>
                <ShieldPlus className="size-4" />
                Add role
              </Button>
            ) : null}
          </div>
        }
      />

      {openForm ? (
        <Panel className="mb-5 border-teal/40 p-5">
          <h2 className="mb-4 text-lg font-bold text-ink">{editing ? "Edit role" : "Add role"}</h2>
          <form onSubmit={save} className="grid gap-4 md:grid-cols-2">
            {error ? <p className="md:col-span-2 text-sm text-[color:var(--bs-coral)]">{error}</p> : null}
            <Field label="Role name">
              <TextInput
                required
                value={form.label}
                onChange={(e) => {
                  const label = e.target.value;
                  setForm((prev) => ({
                    ...prev,
                    label,
                    key: editing ? prev.key : slugifyRoleKey(label)
                  }));
                }}
                placeholder="Operations Lead"
              />
            </Field>
            <Field label="Key" hint={editing ? "Keys stay stable after create so users keep this role." : "Used when assigning users. Auto-filled from the name."}>
              <TextInput
                required
                value={form.key}
                disabled={Boolean(editing)}
                onChange={(e) => setForm({ ...form, key: slugifyRoleKey(e.target.value) })}
                placeholder="operations_lead"
              />
            </Field>
            <Field label="Description" className="md:col-span-2">
              <TextArea
                rows={3}
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                placeholder="What this role can do in the company."
              />
            </Field>
            {!editing ? (
              <Field label="Copy module access from" hint="Optional starting point. You can still tick or untick modules below.">
                <SelectInput value={form.copyFrom} onChange={(e) => applyTemplate(e.target.value as RoleKey | "")}>
                  <option value="">Start empty (dashboard only)</option>
                  {rows.map((r) => (
                    <option key={r.key} value={r.key}>
                      {r.label}
                    </option>
                  ))}
                </SelectInput>
              </Field>
            ) : null}
            <div className={!editing ? "md:col-span-2" : "md:col-span-2"}>
              <p className="mb-1.5 text-sm font-semibold text-[color:var(--bs-ink)]">Modules</p>
              <p className="mb-3 text-xs text-slate-500">Tick every product this role should see. Menu-level Add / Update / Delete is edited in Access Control.</p>
              <div className="mb-3 flex flex-wrap gap-2">
                <Button type="button" variant="secondary" className="!min-h-8 !px-3 !text-xs" onClick={() => setForm((prev) => ({ ...prev, modules: [...ALL_MODULES] }))}>
                  Select all
                </Button>
                <Button type="button" variant="ghost" className="!min-h-8 !px-3 !text-xs" onClick={() => setForm((prev) => ({ ...prev, modules: ["dashboard"] }))}>
                  Dashboard only
                </Button>
              </div>
              <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                {ALL_MODULES.map((module) => (
                  <label key={module} className="flex min-h-11 items-center gap-2 rounded-[var(--bs-radius)] border border-line bg-white px-3 text-sm font-semibold">
                    <input
                      type="checkbox"
                      className="size-4 accent-[color:var(--bs-teal)]"
                      checked={form.modules.includes(module)}
                      onChange={() => toggleModule(module)}
                    />
                    {moduleLabels[module]}
                  </label>
                ))}
              </div>
            </div>
            <ExtraFieldsBlock formKey="settings.role" valueJson={extraJson} onChange={setExtraJson} />
            <div className="md:col-span-2 flex flex-wrap gap-2">
              <Button type="submit">{editing ? "Update role" : "Create role"}</Button>
              <Button
                type="button"
                variant="secondary"
                onClick={() => {
                  setOpenForm(false);
                  setEditing(null);
                  setExtraJson("");
                  setForm(emptyForm);
                }}
              >
                Cancel
              </Button>
            </div>
          </form>
        </Panel>
      ) : null}

      <Panel className="mb-5 overflow-hidden p-0">
        <div className="overflow-x-auto">
          <table className="min-w-full text-left text-sm">
            <thead>
              <tr className="border-b border-line bg-cloud">
                {["Role", "Key", "Modules", "Type", "Actions"].map((h) => (
                  <th key={h} className="px-4 py-3 font-semibold text-slate-600">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map((row) => (
                <tr key={row.id} className="border-b border-line">
                  <td className="px-4 py-3">
                    <p className="font-semibold text-ink">{row.label}</p>
                    <p className="mt-1 text-xs text-slate-500">{row.description || "—"}</p>
                    <ExtraFieldsReadout tenantId={tenantId} formKey="settings.role" recordId={row.id} />
                  </td>
                  <td className="px-4 py-3 font-mono text-xs text-slate-600">{row.key}</td>
                  <td className="px-4 py-3">
                    <div className="flex flex-wrap gap-1">
                      {row.modules.map((m) => (
                        <span key={m} className="rounded-md bg-cloud px-2 py-1 text-[11px] font-semibold text-slate-600">
                          {moduleLabels[m]}
                        </span>
                      ))}
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <Badge tone={row.is_system ? "info" : "neutral"}>{row.is_system ? "system" : "custom"}</Badge>
                  </td>
                  <td className="px-4 py-3">
                    <RecordRowActions
                      onEdit={canUpdate ? () => openEdit(row) : undefined}
                      onTrash={
                        canDelete && canTrashRole(row)
                          ? () =>
                              askTrash({
                                entityLabel: "role",
                                name: row.label,
                                onConfirm: () => {
                                  trashRole(row.id);
                                  if (editing?.id === row.id) {
                                    setOpenForm(false);
                                    setEditing(null);
                                  }
                                  refresh();
                                }
                              })
                          : undefined
                      }
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Panel>

      <Panel className="overflow-hidden p-0">
        <div className="border-b border-line bg-cloud px-4 py-3">
          <h2 className="font-bold text-ink">Module access matrix</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full text-left text-sm">
            <thead>
              <tr className="border-b border-line bg-cloud/70">
                <th className="px-4 py-3 font-semibold text-slate-600">Role</th>
                {ALL_MODULES.map((m) => (
                  <th key={m} className="px-3 py-3 text-center text-xs font-semibold text-slate-600">
                    {moduleLabels[m]}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.id} className="border-b border-line">
                  <td className="px-4 py-3 font-semibold text-ink">{row.label}</td>
                  {ALL_MODULES.map((m) => (
                    <td key={m} className="px-3 py-3 text-center">
                      {row.modules.includes(m) ? (
                        <span className="inline-flex size-7 items-center justify-center rounded-md bg-emerald-50 text-sm font-bold text-emerald-700">✓</span>
                      ) : (
                        <span className="text-slate-300">—</span>
                      )}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Panel>
      {dialog}
    </AppShell>
  );
}
