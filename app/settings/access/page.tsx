"use client";

import { useEffect, useMemo, useState } from "react";
import { KeyRound, ShieldCheck, UserCog, Palette, Type } from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { AdminSubnav } from "@/components/admin/admin-subnav";
import { ModuleBreadcrumbs } from "@/components/common/module-breadcrumbs";
import { PageHeader } from "@/components/common/page-header";
import { Badge, Button, Field, Panel, SelectInput, TextInput } from "@/components/ui";
import { getRoleLabel, type RoleKey } from "@/lib/permissions";
import { isPlatformOnlyMenu, isSuperAdminRole } from "@/lib/platform-access";
import { listRoleOptions } from "@/modules/admin/services/roles.store";
import { menuRegistry, menuRights, menuRightLabels, type MenuRight } from "@/lib/menu-registry";
import {
  canMenu,
  getEffectiveMenuRights,
  getRoleAcl,
  getUserAcl,
  resetAclCaches,
  saveRoleMenuRights,
  saveUserMenuRights,
  type MenuRightsMap
} from "@/modules/admin/services/acl.store";
import { applyDesignTokens, defaultDesignTokens, fetchDesignTokens, resetDesignTokens, saveDesignTokens, type DesignTokens } from "@/lib/design-tokens";
import { resetProductBrand, saveProductBrand, type ProductBrand } from "@/lib/product-brand";
import { useProductBrand } from "@/components/common/use-product-brand";
import { getStoredTenantId } from "@/lib/auth/session";
import { getSessionProfile } from "@/lib/auth/session-profile";
import { listAdminUsers, listCompanyDirectoryUsers } from "@/modules/admin/services/admin.store";
import { cn } from "@/lib/utils";
import { useConfirm } from "@/components/common/use-confirm";

type Scope = "role" | "user";

export default function AccessControlPage() {
  const actor = getSessionProfile();
  const tenantId = getStoredTenantId() ?? "alpha";
  const platformOperator = isSuperAdminRole(actor.role);
  const allowed = canMenu(actor.role, actor.email, "settings.access_control", "view");

  const [scope, setScope] = useState<Scope>("role");
  const [role, setRole] = useState<RoleKey>("hr_manager");
  const [userEmail, setUserEmail] = useState("");
  const [moduleFilter, setModuleFilter] = useState("all");
  const [query, setQuery] = useState("");
  const [tick, setTick] = useState(0);
  const [tokens, setTokens] = useState<DesignTokens>(defaultDesignTokens);
  const [themeStatus, setThemeStatus] = useState("");
  const [themeSaving, setThemeSaving] = useState(false);
  const liveBrand = useProductBrand();
  const [brand, setBrand] = useState<ProductBrand>(liveBrand);
  const [brandStatus, setBrandStatus] = useState("");
  const [brandSaving, setBrandSaving] = useState(false);
  const { askSave, dialog } = useConfirm();
  const roleOptions = listRoleOptions().filter((r) => platformOperator || r.key !== "super_admin");
  const directoryUsers = platformOperator
    ? listAdminUsers().filter((u) => u.role !== "super_admin")
    : listCompanyDirectoryUsers(tenantId);

  useEffect(() => {
    if (!userEmail && directoryUsers[0]) setUserEmail(directoryUsers[0].email);
  }, [directoryUsers, userEmail]);

  useEffect(() => {
    fetchDesignTokens().then((loaded) => {
      setTokens(loaded);
      applyDesignTokens(loaded);
    });
  }, []);

  const selectedUser = directoryUsers.find((u) => u.email === userEmail) ?? directoryUsers[0];

  const menus = useMemo(() => {
    return menuRegistry.filter((m) => {
      if (isPlatformOnlyMenu(m.id)) {
        if (!platformOperator || scope !== "role" || role !== "super_admin") return false;
      }
      if (moduleFilter !== "all" && m.module !== moduleFilter) return false;
      if (!query.trim()) return true;
      const q = query.toLowerCase();
      return [m.label, m.parentLabel ?? "", m.id, m.href].join(" ").toLowerCase().includes(q);
    });
  }, [moduleFilter, query, tick, platformOperator, scope, role]);

  function rightsFor(menuId: string): MenuRightsMap {
    if (scope === "role") {
      return getRoleAcl()[role]?.[menuId] ?? { view: false, create: false, update: false, delete: false };
    }
    const override = getUserAcl()[userEmail]?.[menuId];
    if (override) return override;
    return getEffectiveMenuRights(selectedUser?.role ?? "viewer", userEmail, menuId);
  }

  function hasUserOverride(menuId: string) {
    return Boolean(getUserAcl()[userEmail]?.[menuId]);
  }

  function toggleRight(menuId: string, right: MenuRight) {
    if (!platformOperator && isPlatformOnlyMenu(menuId)) return;
    const current = { ...rightsFor(menuId) };
    current[right] = !current[right];
    if (right !== "view" && current[right]) current.view = true;
    if (right === "view" && !current.view) {
      current.create = false;
      current.update = false;
      current.delete = false;
    }

    if (scope === "role") {
      saveRoleMenuRights(role, menuId, current);
    } else {
      saveUserMenuRights(userEmail, menuId, current);
    }
    setTick((n) => n + 1);
  }

  function clearUserOverride(menuId: string) {
    saveUserMenuRights(userEmail, menuId, null);
    setTick((n) => n + 1);
  }

  function setAllForMenu(menuId: string, enabled: boolean) {
    const next: MenuRightsMap = {
      view: enabled,
      create: enabled,
      update: enabled,
      delete: enabled
    };
    if (scope === "role") saveRoleMenuRights(role, menuId, next);
    else saveUserMenuRights(userEmail, menuId, next);
    setTick((n) => n + 1);
  }

  async function onTokenChange(key: keyof DesignTokens, value: string) {
    const next = { ...tokens, [key]: value };
    setTokens(next);
    applyDesignTokens(next);
    setThemeSaving(true);
    setThemeStatus("Saving…");
    try {
      await saveDesignTokens(next);
      setThemeStatus("Saved to config/theme.json");
    } catch (error) {
      setThemeStatus(error instanceof Error ? error.message : "Save failed");
    } finally {
      setThemeSaving(false);
    }
  }

  async function onResetTheme() {
    setThemeSaving(true);
    setThemeStatus("Resetting…");
    try {
      const restored = await resetDesignTokens();
      setTokens(restored);
      setThemeStatus("Reset to config/theme.default.json");
    } catch (error) {
      setThemeStatus(error instanceof Error ? error.message : "Reset failed");
    } finally {
      setThemeSaving(false);
    }
  }

  function saveBrand() {
    askSave({
      editing: true,
      entityLabel: "product name",
      onConfirm: async () => {
        setBrandSaving(true);
        setBrandStatus("Saving…");
        try {
          const saved = await saveProductBrand(brand);
          setBrand(saved);
          setBrandStatus("Saved to config/product.json — sidebar and website update on refresh.");
        } catch (error) {
          setBrandStatus(error instanceof Error ? error.message : "Save failed");
        } finally {
          setBrandSaving(false);
        }
      }
    });
  }

  async function onResetBrand() {
    setBrandSaving(true);
    setBrandStatus("Resetting…");
    try {
      const restored = await resetProductBrand();
      setBrand(restored);
      setBrandStatus("Reset to config/product.default.json");
    } catch (error) {
      setBrandStatus(error instanceof Error ? error.message : "Reset failed");
    } finally {
      setBrandSaving(false);
    }
  }

  if (!allowed) {
    return (
      <AppShell activeModule="settings">
        <ModuleBreadcrumbs />
        <PageHeader title="Access Control" description="Menu rights management" />
        <Panel className="p-8 text-center">
          <p className="text-lg font-bold">Restricted</p>
          <p className="mt-2 text-sm text-slate-500">Only administrators can manage menu rights.</p>
        </Panel>
      </AppShell>
    );
  }

  const modules = Array.from(new Set(menuRegistry.map((m) => m.module)));

  return (
    <AppShell activeModule="settings">
      <ModuleBreadcrumbs />
      <PageHeader
        title="Access Control"
        description="Assign company menu rights by role or user. Blog, public CMS, other companies, and the package catalog are Super Admin only."
      />
      <AdminSubnav active="/settings/access" />

      <div className="mb-6 grid gap-4 lg:grid-cols-3">
        <Panel className="overflow-hidden p-5">
          <span className="flex size-12 items-center justify-center rounded-2xl bg-[color:var(--bs-teal)] text-white">
            <ShieldCheck className="size-5" />
          </span>
          <p className="mt-4 font-bold text-ink">Role-based menus</p>
          <p className="mt-1.5 text-sm leading-6 text-slate-500">Default rights for HR Manager, Accountant, Sales, and custom roles.</p>
        </Panel>
        <Panel className="overflow-hidden p-5">
          <span className="flex size-12 items-center justify-center rounded-2xl bg-[color:var(--bs-ink)] text-white">
            <UserCog className="size-5" />
          </span>
          <p className="mt-4 font-bold text-ink">User overrides</p>
          <p className="mt-1.5 text-sm leading-6 text-slate-500">Grant or revoke specific menus for one person.</p>
        </Panel>
        <Panel className="overflow-hidden p-5">
          <span className="flex size-12 items-center justify-center rounded-2xl bg-[color-mix(in_srgb,var(--bs-teal)_52%,white)] text-[color:var(--bs-ink)]">
            <KeyRound className="size-5" />
          </span>
          <p className="mt-4 font-bold text-ink">View · Add · Update · Delete</p>
          <p className="mt-1.5 text-sm leading-6 text-slate-500">View is required before write actions unlock.</p>
        </Panel>
      </div>

      <div className="mb-4 flex flex-wrap gap-2">
        <Button variant={scope === "role" ? "primary" : "secondary"} onClick={() => setScope("role")}>
          Role menus
        </Button>
        <Button variant={scope === "user" ? "primary" : "secondary"} onClick={() => setScope("user")}>
          User menus
        </Button>
        <Button
          variant="ghost"
          onClick={() => {
            resetAclCaches();
            if (typeof window !== "undefined") {
              window.localStorage.removeItem("businesssuite:acl:roles");
              window.localStorage.removeItem("businesssuite:acl:users");
            }
            setTick((n) => n + 1);
          }}
        >
          Reset ACL to defaults
        </Button>
      </div>

      <Panel className="mb-6 p-4">
        <div className="grid gap-3 md:grid-cols-3">
          {scope === "role" ? (
            <Field label="Role">
              <SelectInput value={role} onChange={(e) => setRole(e.target.value as RoleKey)}>
                {roleOptions.map((r) => (
                  <option key={r.key} value={r.key}>
                    {r.label}
                  </option>
                ))}
              </SelectInput>
            </Field>
          ) : (
            <Field label="User">
              <SelectInput value={userEmail} onChange={(e) => setUserEmail(e.target.value)}>
                {directoryUsers.map((u) => (
                  <option key={u.email} value={u.email}>
                    {u.name} · {u.email}
                  </option>
                ))}
              </SelectInput>
            </Field>
          )}
          <Field label="Module filter">
            <SelectInput value={moduleFilter} onChange={(e) => setModuleFilter(e.target.value)}>
              <option value="all">All modules</option>
              {modules.map((m) => (
                <option key={m} value={m}>
                  {m}
                </option>
              ))}
            </SelectInput>
          </Field>
          <Field label="Find menu">
            <TextInput value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Employees, invoices…" />
          </Field>
        </div>
        {scope === "user" ? (
          <p className="mt-3 text-sm text-slate-500">
            Base role: <Badge tone="info">{getRoleLabel(selectedUser?.role ?? "viewer")}</Badge>
            <span className="ml-2">User overrides replace role rights for that menu.</span>
          </p>
        ) : null}
      </Panel>

      <Panel className="overflow-hidden p-0">
        <div className="overflow-x-auto">
          <table className="min-w-full text-left text-sm">
            <thead>
              <tr className="border-b border-line bg-cloud">
                <th className="px-4 py-3 font-semibold text-slate-600">Menu</th>
                {menuRights.map((r) => (
                  <th key={r} className="px-3 py-3 text-center font-semibold text-slate-600">
                    {menuRightLabels[r]}
                  </th>
                ))}
                <th className="px-4 py-3 font-semibold text-slate-600">Quick</th>
              </tr>
            </thead>
            <tbody>
              {menus.map((menu) => {
                const rights = rightsFor(menu.id);
                const overridden = scope === "user" && hasUserOverride(menu.id);
                return (
                  <tr key={`${menu.id}-${tick}`} className="border-b border-line">
                    <td className="px-4 py-3">
                      <p className="font-semibold text-ink">{menu.label}</p>
                      <p className="text-xs text-slate-500">
                        {menu.parentLabel ? `${menu.parentLabel} · ` : ""}
                        {menu.id}
                        {overridden ? <Badge tone="warning">User override</Badge> : null}
                      </p>
                    </td>
                    {menuRights.map((right) => (
                      <td key={right} className="px-3 py-3 text-center">
                        <button
                          type="button"
                          onClick={() => toggleRight(menu.id, right)}
                          className={cn(
                            "inline-flex size-8 items-center justify-center rounded-md border text-xs font-bold transition",
                            rights[right]
                              ? "border-teal bg-teal-50 text-teal"
                              : "border-line bg-white text-slate-300 hover:border-slate-400"
                          )}
                          aria-label={`${menuRightLabels[right]} for ${menu.label}`}
                        >
                          {rights[right] ? "✓" : "·"}
                        </button>
                      </td>
                    ))}
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap gap-1">
                        <Button variant="secondary" className="!min-h-8 !px-2 !text-xs" onClick={() => setAllForMenu(menu.id, true)}>
                          All
                        </Button>
                        <Button variant="ghost" className="!min-h-8 !px-2 !text-xs" onClick={() => setAllForMenu(menu.id, false)}>
                          None
                        </Button>
                        {overridden ? (
                          <Button variant="ghost" className="!min-h-8 !px-2 !text-xs" onClick={() => clearUserOverride(menu.id)}>
                            Use role
                          </Button>
                        ) : null}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Panel>

      {platformOperator ? (
      <>
      <Panel className="mt-6 p-5">
        <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-2">
            <Type className="size-5 text-teal" />
            <h2 className="text-lg font-bold text-ink">Product name</h2>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Button variant="secondary" onClick={onResetBrand} disabled={brandSaving}>
              Reset to default name
            </Button>
            <Button onClick={saveBrand} disabled={brandSaving || !brand.productName.trim()}>
              Save product name
            </Button>
          </div>
        </div>
        <p className="mb-2 text-sm text-slate-500">
          This is the project name shown in the ERP sidebar, public website header and footer, and browser title. Saved in{" "}
          <code className="rounded bg-cloud px-1.5 py-0.5 text-xs">config/product.json</code>.
        </p>
        {brandStatus ? <p className="mb-4 text-xs font-semibold text-teal">{brandStatus}</p> : <div className="mb-4" />}
        <div className="grid gap-4 md:grid-cols-3">
          <Field label="Product name">
            <TextInput
              value={brand.productName}
              onChange={(e) => setBrand({ ...brand, productName: e.target.value })}
              placeholder="BusinessSuite"
            />
          </Field>
          <Field label="Tagline">
            <TextInput
              value={brand.productTagline}
              onChange={(e) => setBrand({ ...brand, productTagline: e.target.value })}
              placeholder="ERP Cloud"
            />
          </Field>
          <Field label="Legal name (footer)">
            <TextInput
              value={brand.legalName}
              onChange={(e) => setBrand({ ...brand, legalName: e.target.value })}
              placeholder="BusinessSuite, Inc."
            />
          </Field>
        </div>
      </Panel>

      <Panel className="mt-6 p-5">
        <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-2">
            <Palette className="size-5 text-teal" />
            <h2 className="text-lg font-bold text-ink">Design system (one place)</h2>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Button variant="secondary" onClick={onResetTheme} disabled={themeSaving}>
              Reset to default theme
            </Button>
          </div>
        </div>
        <p className="mb-2 text-sm text-slate-500">
          Colors update inputs, buttons, and cards across the ERP. Saved in{" "}
          <code className="rounded bg-cloud px-1.5 py-0.5 text-xs">config/theme.json</code>. Defaults live in{" "}
          <code className="rounded bg-cloud px-1.5 py-0.5 text-xs">config/theme.default.json</code>.
        </p>
        {themeStatus ? <p className="mb-4 text-xs font-semibold text-teal">{themeStatus}</p> : <div className="mb-4" />}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {(
            [
              ["ink", "Ink / primary"],
              ["teal", "Accent"],
              ["coral", "Danger"],
              ["cloud", "Surface"],
              ["line", "Borders"],
              ["mint", "Success"],
              ["amber", "Warning"],
              ["focusRing", "Focus ring"]
            ] as Array<[keyof DesignTokens, string]>
          ).map(([key, label]) => (
            <Field key={key} label={label}>
              <div className="flex items-center gap-2">
                <input
                  type="color"
                  value={/^#/.test(tokens[key]) ? tokens[key] : "#0f2452"}
                  onChange={(e) => onTokenChange(key, e.target.value)}
                  className="h-10 w-12 cursor-pointer rounded border border-line"
                />
                <TextInput value={tokens[key]} onChange={(e) => onTokenChange(key, e.target.value)} />
              </div>
            </Field>
          ))}
        </div>
      </Panel>
      </>
      ) : null}
      {dialog}
    </AppShell>
  );
}
