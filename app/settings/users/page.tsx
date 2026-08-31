"use client";

import { useEffect, useMemo, useState } from "react";
import { UserPlus, Copy, KeyRound } from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { AdminSubnav } from "@/components/admin/admin-subnav";
import { ModuleBreadcrumbs } from "@/components/common/module-breadcrumbs";
import { PageHeader } from "@/components/common/page-header";
import { DataListToolbar } from "@/components/common/data-list-toolbar";
import { StatusBadge } from "@/components/common/status-badge";
import { useConfirm } from "@/components/common/use-confirm";
import { ExtraFieldsBlock } from "@/components/forms/extra-fields-block";
import { ExtraFieldsReadout } from "@/components/forms/extra-fields-readout";
import { Badge, Button, Field, Panel, SelectInput, TextInput } from "@/components/ui";
import { findAccountByEmail, generateLoginPassword } from "@/lib/auth/public-auth";
import { getStoredTenantId } from "@/lib/auth/session";
import { getSessionProfile } from "@/lib/auth/session-profile";
import { exportListCsv, exportListPdf } from "@/lib/list-export";
import { filterAndSort } from "@/lib/list-query";
import { getRoleLabel, type RoleKey } from "@/lib/permissions";
import { persistExtraFields } from "@/modules/forms/services/extra-fields.store";
import { listAssignableRoleOptions } from "@/modules/admin/services/roles.store";
import {
  inviteUser,
  listCompanyDirectoryUsers,
  setUserLoginPassword,
  updateUser,
  type AdminUser
} from "@/modules/admin/services/admin.store";

function newInviteForm() {
  const password = generateLoginPassword();
  return { name: "", email: "", role: "viewer" as RoleKey, title: "", password, confirm: password };
}

export default function UsersPage() {
  const tenantId = getStoredTenantId() ?? "alpha";
  const actor = getSessionProfile();
  const actorEmail = actor.email;
  const { askSave, ask, dialog } = useConfirm();
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [sortField, setSortField] = useState("name");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");
  const [openInvite, setOpenInvite] = useState(false);
  const [error, setError] = useState("");
  const [form, setForm] = useState(newInviteForm);
  const [extraJson, setExtraJson] = useState("");
  const [existingLogin, setExistingLogin] = useState(false);
  const [createdLogin, setCreatedLogin] = useState<{ email: string; password: string | null; existingLogin: boolean; name: string } | null>(null);
  const [passwordUser, setPasswordUser] = useState<{ email: string; name: string; password: string; confirm: string } | null>(null);
  const [copyStatus, setCopyStatus] = useState("");
  const roleOptions = listAssignableRoleOptions(actor.role);

  function refresh() {
    setUsers(listCompanyDirectoryUsers(tenantId));
  }

  useEffect(() => {
    refresh();
  }, [tenantId]);

  useEffect(() => {
    const email = form.email.trim();
    if (!email.includes("@")) {
      setExistingLogin(false);
      return;
    }
    setExistingLogin(Boolean(findAccountByEmail(email)));
  }, [form.email]);

  const filtered = useMemo(
    () =>
      filterAndSort(users as unknown as Array<Record<string, unknown>>, {
        search,
        searchFields: ["name", "email", "title", "role"],
        statusField: "status",
        statusValue: statusFilter,
        sortField,
        sortDir
      }) as unknown as AdminUser[],
    [users, search, statusFilter, sortField, sortDir]
  );

  async function copyText(text: string) {
    try {
      await navigator.clipboard.writeText(text);
      setCopyStatus("Copied");
      window.setTimeout(() => setCopyStatus(""), 2000);
    } catch {
      setCopyStatus("Copy failed");
    }
  }

  async function doInvite() {
    setError("");
    try {
      if (!existingLogin && form.password !== form.confirm) {
        setError("Passwords do not match.");
        return;
      }
      const result = await inviteUser({
        name: form.name.trim(),
        email: form.email.trim(),
        role: form.role,
        title: form.title.trim(),
        tenantId,
        actorEmail,
        password: existingLogin ? undefined : form.password.trim()
      });
      persistExtraFields(tenantId, "settings.user", result.user.id || form.email.trim(), extraJson);
      setCreatedLogin({
        email: result.user.email,
        password: result.password,
        existingLogin: result.existingLogin,
        name: result.user.name
      });
      setExtraJson("");
      setForm(newInviteForm());
      setOpenInvite(false);
      refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Invite failed");
    }
  }

  function submitInvite(e: React.FormEvent) {
    e.preventDefault();
    askSave({ editing: false, entityLabel: "user invite", onConfirm: doInvite });
  }

  return (
    <AppShell activeModule="settings">
      <ModuleBreadcrumbs />
      <PageHeader
        title="Users"
        description="Add people to this company, set a login password, and assign a role. The same email can belong to more than one company."
        actionLabel="Invite user"
        onAction={() => { setExtraJson(""); setError(""); setForm(newInviteForm()); setOpenInvite(true); }}
      />
      <AdminSubnav active="/settings/users" />

      <DataListToolbar
        search={search}
        onSearchChange={setSearch}
        searchPlaceholder="Search name, email, role…"
        filterLabel="statuses"
        filterValue={statusFilter}
        filterOptions={[
          { value: "active", label: "active" },
          { value: "invited", label: "invited" },
          { value: "blocked", label: "blocked" }
        ]}
        onFilterChange={setStatusFilter}
        sortValue={sortField}
        sortOptions={[
          { value: "name", label: "Name" },
          { value: "email", label: "Email" },
          { value: "status", label: "Status" },
          { value: "role", label: "Role" }
        ]}
        onSortChange={setSortField}
        sortDir={sortDir}
        onSortDirChange={setSortDir}
        onExportCsv={() =>
          exportListCsv({
            tenantId,
            module: "settings",
            filename: "users",
            rows: filtered.map((u) => ({
              Name: u.name,
              Email: u.email,
              Role: getRoleLabel(u.role),
              Status: u.status,
              Tenant: u.tenantId
            }))
          })
        }
        onExportPdf={() =>
          exportListPdf({
            tenantId,
            module: "settings",
            title: "Users",
            filename: "users",
            columns: ["Name", "Email", "Role", "Status"],
            rows: filtered.map((u) => [u.name, u.email, getRoleLabel(u.role), u.status])
          })
        }
        rightSlot={
          <Button onClick={() => { setExtraJson(""); setError(""); setForm(newInviteForm()); setOpenInvite(true); }}>
            <UserPlus className="size-4" />
            Invite
          </Button>
        }
      />

      {openInvite ? (
        <Panel className="mb-5 border-teal/40 p-5">
          <h2 className="mb-4 text-lg font-bold text-ink">Invite user</h2>
          <form onSubmit={submitInvite} className="grid gap-4 md:grid-cols-2">
            {error ? <p className="md:col-span-2 text-sm text-[color:var(--bs-coral)]">{error}</p> : null}
            <Field label="Full name">
              <TextInput required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
            </Field>
            <Field label="Email">
              <TextInput required type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
            </Field>
            <Field label="Role">
              <SelectInput value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value as RoleKey })}>
                {roleOptions.map((role) => (
                  <option key={role.key} value={role.key}>{role.label}</option>
                ))}
              </SelectInput>
            </Field>
            <Field label="Job title">
              <TextInput value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="Optional" />
            </Field>
            {existingLogin ? (
              <p className="md:col-span-2 rounded-[var(--bs-radius)] border border-line bg-cloud px-3 py-2 text-sm text-slate-600">
                This email already has a BusinessSuite login in another company. They will sign in with their existing password. You are only adding them to this company.
              </p>
            ) : (
              <>
                <Field label="Login password">
                  <TextInput
                    required
                    type="text"
                    autoComplete="new-password"
                    value={form.password}
                    onChange={(e) => setForm({ ...form, password: e.target.value })}
                  />
                </Field>
                <Field label="Confirm password">
                  <TextInput
                    required
                    type="text"
                    autoComplete="new-password"
                    value={form.confirm}
                    onChange={(e) => setForm({ ...form, confirm: e.target.value })}
                  />
                </Field>
                <div className="md:col-span-2">
                  <Button
                    type="button"
                    variant="secondary"
                    onClick={() => {
                      const password = generateLoginPassword();
                      setForm((prev) => ({ ...prev, password, confirm: password }));
                    }}
                  >
                    Generate password
                  </Button>
                </div>
              </>
            )}
            <p className="md:col-span-2 text-sm text-slate-500">
              Copy the password after you save and share it with them. Same email can belong to more than one company; each company has its own role. Choose the Employee role for self-service.
            </p>
            <ExtraFieldsBlock formKey="settings.user" valueJson={extraJson} onChange={setExtraJson} />
            <div className="md:col-span-2 flex gap-2">
              <Button type="submit">Send invite</Button>
              <Button type="button" variant="secondary" onClick={() => { setExtraJson(""); setOpenInvite(false); }}>Cancel</Button>
            </div>
          </form>
        </Panel>
      ) : null}

      {createdLogin ? (
        <Panel className="mb-5 border-teal/40 p-5">
          <h2 className="mb-2 text-lg font-bold text-ink">Share login details</h2>
          {createdLogin.existingLogin ? (
            <p className="text-sm text-slate-600">
              {createdLogin.name} ({createdLogin.email}) already had a login. They can sign in with the password they already use, then switch to this company if they belong to more than one.
            </p>
          ) : (
            <>
              <p className="mb-3 text-sm text-slate-600">
                {createdLogin.name} can sign in now. Copy these details and send them privately — the password is not emailed.
              </p>
              <div className="grid gap-3 md:grid-cols-2">
                <Field label="Email">
                  <TextInput readOnly value={createdLogin.email} />
                </Field>
                <Field label="Password">
                  <TextInput readOnly value={createdLogin.password ?? ""} />
                </Field>
              </div>
              <div className="mt-3 flex flex-wrap gap-2">
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() =>
                    copyText(`Email: ${createdLogin.email}\nPassword: ${createdLogin.password ?? ""}`)
                  }
                >
                  <Copy className="size-4" />
                  Copy email and password
                </Button>
                {copyStatus ? <span className="self-center text-sm font-semibold text-teal">{copyStatus}</span> : null}
              </div>
            </>
          )}
          <div className="mt-3">
            <Button type="button" variant="ghost" onClick={() => setCreatedLogin(null)}>Dismiss</Button>
          </div>
        </Panel>
      ) : null}

      {passwordUser ? (
        <Panel className="mb-5 border-teal/40 p-5">
          <h2 className="mb-2 text-lg font-bold text-ink">Set login password</h2>
          <p className="mb-3 text-sm text-slate-600">
            This updates the sign-in password for {passwordUser.name} ({passwordUser.email}) across every company they belong to.
          </p>
          <form
            className="grid gap-3 md:grid-cols-2"
            onSubmit={(e) => {
              e.preventDefault();
              if (passwordUser.password !== passwordUser.confirm) return;
              askSave({
                editing: true,
                entityLabel: "login password",
                onConfirm: () => {
                  setUserLoginPassword(passwordUser.email, passwordUser.password);
                  setCreatedLogin({
                    email: passwordUser.email,
                    password: passwordUser.password,
                    existingLogin: false,
                    name: passwordUser.name
                  });
                  setPasswordUser(null);
                }
              });
            }}
          >
            <Field label="New password">
              <TextInput
                required
                minLength={8}
                type="text"
                value={passwordUser.password}
                onChange={(e) => setPasswordUser({ ...passwordUser, password: e.target.value })}
              />
            </Field>
            <Field label="Confirm password">
              <TextInput
                required
                minLength={8}
                type="text"
                value={passwordUser.confirm}
                onChange={(e) => setPasswordUser({ ...passwordUser, confirm: e.target.value })}
              />
            </Field>
            <div className="md:col-span-2 flex flex-wrap gap-2">
              <Button type="submit" disabled={passwordUser.password.length < 8 || passwordUser.password !== passwordUser.confirm}>
                Save password
              </Button>
              <Button
                type="button"
                variant="secondary"
                onClick={() => {
                  const password = generateLoginPassword();
                  setPasswordUser({ ...passwordUser, password, confirm: password });
                }}
              >
                Generate password
              </Button>
              <Button type="button" variant="ghost" onClick={() => setPasswordUser(null)}>Cancel</Button>
            </div>
          </form>
        </Panel>
      ) : null}

      <Panel className="overflow-hidden p-0">
        <div className="overflow-x-auto">
          <table className="min-w-full text-left text-sm">
            <thead>
              <tr className="border-b border-line bg-cloud">
                {["User", "Role", "Status", "Tenant", "Actions"].map((h) => (
                  <th key={h} className="px-4 py-3 font-semibold text-slate-600">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map((u) => (
                <tr key={u.id} className="border-b border-line">
                  <td className="px-4 py-3">
                    <p className="font-semibold text-ink">{u.name}</p>
                    <p className="text-xs text-slate-500">{u.email}</p>
                    <p className="text-xs text-slate-400">{u.title}</p>
                    <ExtraFieldsReadout tenantId={tenantId} formKey="settings.user" recordId={u.id} />
                  </td>
                  <td className="px-4 py-3">
                    <SelectInput
                      className="min-w-[160px]"
                      value={u.role}
                      onChange={(e) => {
                        updateUser(u.id, { role: e.target.value as RoleKey, title: getRoleLabel(e.target.value) });
                        refresh();
                      }}
                    >
                      {roleOptions.some((r) => r.key === u.role) ? null : (
                        <option value={u.role}>{getRoleLabel(u.role)}</option>
                      )}
                      {roleOptions.map((role) => (
                        <option key={role.key} value={role.key}>{role.label}</option>
                      ))}
                    </SelectInput>
                  </td>
                  <td className="px-4 py-3"><StatusBadge status={u.status} /></td>
                  <td className="px-4 py-3"><Badge tone="neutral">{u.tenantId}</Badge></td>
                  <td className="px-4 py-3">
                    <div className="flex flex-wrap gap-1">
                      {u.status !== "active" ? (
                        <Button variant="secondary" className="!min-h-8 !px-2 !text-xs" onClick={() => { updateUser(u.id, { status: "active" }); refresh(); }}>
                          Activate
                        </Button>
                      ) : null}
                      <Button
                        variant="secondary"
                        className="!min-h-8 !px-2 !text-xs"
                        onClick={() => {
                          const password = generateLoginPassword();
                          setPasswordUser({ email: u.email, name: u.name, password, confirm: password });
                          setCreatedLogin(null);
                        }}
                      >
                        <KeyRound className="size-3.5" />
                        Password
                      </Button>
                      {u.status !== "blocked" ? (
                        <Button
                          variant="ghost"
                          className="!min-h-8 !px-2 !text-xs"
                          onClick={() =>
                            ask({
                              title: "Block user?",
                              message: `${u.name} will lose access until reactivated.`,
                              confirmLabel: "Block user",
                              tone: "danger",
                              onConfirm: () => {
                                updateUser(u.id, { status: "blocked" });
                                refresh();
                              }
                            })
                          }
                        >
                          Block
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
      {dialog}
    </AppShell>
  );
}
