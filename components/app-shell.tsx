"use client";

import { NavLink } from "@/components/navigation/nav-link";
import { usePathname, useRouter } from "next/navigation";
import { Building2, LogOut, Mail, Menu, UserRound, X } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { tenants as seedTenants } from "@/lib/demo-data";
import {
  demoUsers,
  getRoleLabel,
  moduleLabels,
  type DemoUser,
  type ModuleKey
} from "@/lib/permissions";
import { isSuperAdminRole } from "@/lib/platform-access";
import { findAccountByEmail, hydrateAuthFromSession } from "@/lib/auth/public-auth";
import { hydrateEmployeeLogins } from "@/lib/auth/provision-login";
import { clearDemoSession, getStoredTenantId, getStoredUserEmail, setDemoSession } from "@/lib/auth/session";
import { menusMatchingPath } from "@/lib/menu-registry";
import { canMenu, canViewModule } from "@/modules/admin/services/acl.store";
import { hydrateRoles } from "@/modules/admin/services/roles.store";
import { hydrateAdminUsersFromServer, listAdminTenants, findAdminUserByEmail, listMembershipsByEmail } from "@/modules/admin/services/admin.store";
import { applyDesignTokens, fetchDesignTokens } from "@/lib/design-tokens";
import { useProductBrand } from "@/components/common/use-product-brand";
import type { ProductBrand } from "@/lib/product-brand";
import { isTenantActivated } from "@/modules/billing/services/subscriptions.store";
import "@/modules/ops/services/ops-bootstrap";
import { syncTenantFromRemoteInBackground } from "@/lib/tenant-sync";
import {
  clearAppSessionBootstrap,
  getAppSessionBootstrap,
  matchesStoredSession,
  setAppSessionBootstrap
} from "@/lib/navigation/session-bootstrap-cache";
import { GlobalMenuSearch } from "@/components/layout/global-menu-search";
import { SidebarNav } from "@/components/layout/sidebar-nav";
import { WorkspaceChat } from "@/components/chat/workspace-chat";
import { useComposeEmail } from "@/components/email/compose-email-context";
import { ComposeEmailHost } from "@/components/email/compose-email-host";
import { EmailOutboxWorker } from "@/components/email/email-outbox-worker";
import { NotificationBell } from "@/components/notifications/notification-bell";
import { cn } from "@/lib/utils";
import { Badge, Button, EmptyAccess } from "@/components/ui";

function initialBootstrap() {
  if (typeof window === "undefined") return null;
  const storedUser = getStoredUserEmail();
  const storedTenant = getStoredTenantId();
  if (!matchesStoredSession(storedUser, storedTenant)) return null;
  return getAppSessionBootstrap();
}

export function AppShell({
  activeModule,
  children
}: {
  activeModule: ModuleKey;
  children: React.ReactNode;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const boot = initialBootstrap();
  const [hydrated, setHydrated] = useState(() => Boolean(boot));
  const [syncingRemote, setSyncingRemote] = useState(false);
  const [userEmail, setUserEmail] = useState<string | null>(() => boot?.userEmail ?? null);
  const [tenantId, setTenantId] = useState(() => boot?.tenantId ?? seedTenants[0].id);
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [tenantOptions, setTenantOptions] = useState(() => boot?.tenantOptions ?? seedTenants);
  const brand = useProductBrand();

  useEffect(() => {
    let cancelled = false;
    fetchDesignTokens().then((tokens) => {
      if (!cancelled) applyDesignTokens(tokens);
    });
    hydrateRoles();

    async function bootSession() {
      await hydrateAuthFromSession();
      const storedUser = getStoredUserEmail();
      const storedTenant = getStoredTenantId();
      if (cancelled) return;

      if (matchesStoredSession(storedUser, storedTenant)) {
        const cached = getAppSessionBootstrap();
        if (cached) {
          setUserEmail(cached.userEmail);
          setTenantId(cached.tenantId);
          setTenantOptions(cached.tenantOptions);
          setHydrated(true);
          if (storedTenant) void hydrateAdminUsersFromServer(storedTenant);
          return;
        }
      }

      const account = storedUser ? findAccountByEmail(storedUser) : null;
      if (!storedUser || !account) {
        router.replace("/login");
        return;
      }
      if (storedTenant) await hydrateAdminUsersFromServer(storedTenant);
      setUserEmail(storedUser);
      const adminTenants = listAdminTenants().map((t) => ({
        id: t.id,
        name: t.name,
        industry: t.industry,
        region: t.region,
        plan: t.plan
      }));
      const byId = new Map<string, (typeof adminTenants)[number]>();
      for (const row of adminTenants.length > 0 ? adminTenants : seedTenants) {
        if (!byId.has(row.id)) byId.set(row.id, row);
      }
      const merged = [...byId.values()];
      const memberships = storedUser
        ? listMembershipsByEmail(storedUser).filter((m) => m.status !== "blocked")
        : [];
      const allowedIds = new Set(memberships.map((m) => m.tenantId));
      if (account?.tenantId) allowedIds.add(account.tenantId);
      const scoped = isSuperAdminRole(account?.role ?? "") ? merged : merged.filter((t) => allowedIds.has(t.id));
      const options = scoped.length > 0 ? scoped : merged;
      setTenantOptions(options);
      if (storedTenant && options.some((tenant) => tenant.id === storedTenant)) setTenantId(storedTenant);
      else if (memberships[0] && options.some((t) => t.id === memberships[0].tenantId)) setTenantId(memberships[0].tenantId);
      else if (account?.tenantId && options.some((t) => t.id === account.tenantId)) setTenantId(account.tenantId);
      const effectiveTenant =
        (storedTenant && options.some((t) => t.id === storedTenant) && storedTenant) ||
        (memberships[0] && options.some((t) => t.id === memberships[0].tenantId) && memberships[0].tenantId) ||
        (account?.tenantId && options.some((t) => t.id === account.tenantId) && account.tenantId) ||
        options[0]?.id ||
        seedTenants[0].id;
      hydrateEmployeeLogins(effectiveTenant);
      if (!isTenantActivated(effectiveTenant)) {
        router.replace("/activate");
        return;
      }
      setAppSessionBootstrap({
        userEmail: storedUser,
        tenantId: effectiveTenant,
        tenantOptions: options
      });
      setHydrated(true);
      setSyncingRemote(true);
      syncTenantFromRemoteInBackground(effectiveTenant, () => {
        if (!cancelled) setSyncingRemote(false);
      });
    }

    void bootSession();
    return () => {
      cancelled = true;
    };
  }, [router]);

  useEffect(() => {
    setMobileNavOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (!mobileNavOpen) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [mobileNavOpen]);

  const user = useMemo<DemoUser>(() => {
    const directory = userEmail ? findAdminUserByEmail(userEmail, tenantId) : null;
    if (directory) {
      return { email: directory.email, name: directory.name, role: directory.role, title: directory.title };
    }
    const account = userEmail ? findAccountByEmail(userEmail) : null;
    if (account) {
      return {
        email: account.email,
        name: account.name,
        role: account.role,
        title: account.title
      };
    }
    const demo = demoUsers.find((item) => item.email === userEmail);
    if (demo) return demo;
    return { email: userEmail ?? "", name: "Guest", role: "viewer", title: "Viewer" };
  }, [userEmail, tenantId]);
  const tenant = tenantOptions.find((item) => item.id === tenantId) ?? tenantOptions[0] ?? seedTenants[0];
  const allowed = canViewModule(user.role, user.email, activeModule, tenantId);
  const pathMenus = menusMatchingPath(pathname);
  const pageMenu = pathMenus[0];
  const pageAllowed = pageMenu ? canMenu(user.role, user.email, pageMenu.id, "view") : allowed;
  const showCompanySwitcher = isSuperAdminRole(user.role) || tenantOptions.length > 1;

  function handleTenantChange(id: string) {
    setTenantId(id);
    if (userEmail) setDemoSession(userEmail, id);
    const cachedOptions = tenantOptions.map((t) => ({
      id: t.id,
      name: t.name,
      industry: t.industry,
      region: t.region,
      plan: t.plan
    }));
    if (userEmail) {
      setAppSessionBootstrap({ userEmail, tenantId: id, tenantOptions: cachedOptions });
    }
    if (!isTenantActivated(id)) {
      router.replace("/activate");
      return;
    }
    setSyncingRemote(true);
    syncTenantFromRemoteInBackground(id, () => setSyncingRemote(false));
  }

  function logout() {
    clearAppSessionBootstrap();
    clearDemoSession();
    router.push("/");
  }

  if (!hydrated) {
    return (
      <main className="flex min-h-[100dvh] items-center justify-center bg-cloud px-4 pt-[env(safe-area-inset-top)] pb-[env(safe-area-inset-bottom)]">
        <div className="bs-card w-full max-w-sm p-6 text-center">
          <p className="text-sm font-bold uppercase tracking-wide text-teal">{brand.productName} {brand.productTagline}</p>
          <p className="mt-2 text-base font-semibold text-ink">Checking session</p>
        </div>
      </main>
    );
  }

  return (
    <AppShellChrome
      activeModule={activeModule}
      allowed={allowed}
      pageAllowed={pageAllowed}
      user={user}
      tenant={tenant}
      tenantId={tenantId}
      tenantOptions={tenantOptions}
      showCompanySwitcher={showCompanySwitcher}
      syncingRemote={syncingRemote}
      mobileNavOpen={mobileNavOpen}
      setMobileNavOpen={setMobileNavOpen}
      handleTenantChange={handleTenantChange}
      logout={logout}
      brand={brand}
    >
      {children}
    </AppShellChrome>
  );
}

function AppShellChrome({
  activeModule,
  allowed,
  pageAllowed,
  user,
  tenant,
  tenantId,
  tenantOptions,
  showCompanySwitcher,
  syncingRemote,
  mobileNavOpen,
  setMobileNavOpen,
  handleTenantChange,
  logout,
  brand,
  children
}: {
  activeModule: ModuleKey;
  allowed: boolean;
  pageAllowed: boolean;
  user: DemoUser;
  tenant: (typeof seedTenants)[number];
  tenantId: string;
  tenantOptions: typeof seedTenants;
  showCompanySwitcher: boolean;
  syncingRemote: boolean;
  mobileNavOpen: boolean;
  setMobileNavOpen: (v: boolean) => void;
  handleTenantChange: (id: string) => void;
  logout: () => void;
  brand: ProductBrand;
  children: React.ReactNode;
}) {
  const { openCompose } = useComposeEmail();

  return (
    <div className="min-h-[100dvh] overflow-x-hidden bg-[color:var(--bs-cloud)]">
      {/* Desktop sidebar */}
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-[17.5rem] border-r border-[color:var(--bs-ink)]/10 bg-[color:var(--bs-ink)] text-white lg:block">
        <div className="flex h-20 items-center gap-3 border-b border-white/10 px-5">
          <div className="flex size-11 items-center justify-center rounded-[var(--bs-radius)] bg-[color:var(--bs-teal)] text-white shadow-sm">
            <Building2 className="size-5" aria-hidden="true" />
          </div>
          <div>
            <p className="text-base font-bold leading-tight text-white">{brand.productName}</p>
            <p className="text-xs font-semibold uppercase tracking-wide text-teal-200">{brand.productTagline}</p>
          </div>
        </div>
        <SidebarNav role={user.role} userEmail={user.email} tenantId={tenantId} />
      </aside>

      {/* Mobile drawer */}
      <div
        className={cn(
          "fixed inset-0 z-40 lg:hidden",
          mobileNavOpen ? "pointer-events-auto" : "pointer-events-none"
        )}
        aria-hidden={!mobileNavOpen}
      >
        <button
          type="button"
          className={cn(
            "absolute inset-0 bg-black/50 transition-opacity",
            mobileNavOpen ? "opacity-100" : "opacity-0"
          )}
          aria-label="Close navigation"
          onClick={() => setMobileNavOpen(false)}
        />
        <aside
          className={cn(
            "absolute inset-y-0 left-0 flex w-[min(20rem,88vw)] flex-col bg-[color:var(--bs-ink)] text-white shadow-soft transition-transform duration-200 ease-out pt-[env(safe-area-inset-top)] pb-[env(safe-area-inset-bottom)]",
            mobileNavOpen ? "translate-x-0" : "-translate-x-full"
          )}
          role="dialog"
          aria-modal="true"
          aria-label="Module navigation"
        >
          <div className="flex h-16 shrink-0 items-center justify-between gap-2 border-b border-white/10 px-4">
            <div className="flex min-w-0 items-center gap-3">
              <div className="flex size-10 shrink-0 items-center justify-center rounded-[var(--bs-radius)] bg-[color:var(--bs-teal)] text-white">
                <Building2 className="size-5" aria-hidden="true" />
              </div>
              <div className="min-w-0">
                <p className="truncate text-sm font-bold text-white">{brand.productName}</p>
                <p className="text-[10px] font-semibold uppercase tracking-wide text-teal-200">{brand.productTagline}</p>
              </div>
            </div>
            <button
              type="button"
              className="inline-flex size-11 items-center justify-center rounded-[var(--bs-radius)] text-white/80 hover:bg-white/10"
              aria-label="Close menu"
              onClick={() => setMobileNavOpen(false)}
            >
              <X className="size-5" aria-hidden="true" />
            </button>
          </div>
          <SidebarNav
            role={user.role}
            userEmail={user.email}
            tenantId={tenantId}
            className="h-auto flex-1"
            onNavigate={() => setMobileNavOpen(false)}
          />
        </aside>
      </div>

      <div className="lg:pl-[17.5rem]">
        <header className="sticky top-0 z-20 border-b border-line bg-white/95 backdrop-blur pt-[env(safe-area-inset-top)]">
          <div className="flex min-h-14 items-center gap-2 px-3 py-2 sm:min-h-16 sm:gap-3 sm:px-4 lg:grid lg:min-h-20 lg:grid-cols-[1fr_minmax(240px,36rem)_1fr] lg:items-center lg:gap-3 lg:px-6 lg:py-3">
            <div className="flex min-w-0 items-center gap-2 lg:pr-2">
              <button
                type="button"
                className="inline-flex size-11 shrink-0 items-center justify-center rounded-[var(--bs-radius)] border border-line bg-white text-ink lg:hidden"
                aria-label="Open navigation menu"
                aria-expanded={mobileNavOpen}
                onClick={() => setMobileNavOpen(true)}
              >
                <Menu className="size-5" aria-hidden="true" />
              </button>
              <div className="min-w-0">
                <p className="truncate text-[10px] font-bold uppercase tracking-wide text-teal sm:text-xs">{tenant.industry}</p>
                <h1 className="truncate text-base font-bold text-ink sm:text-lg md:text-xl">{moduleLabels[activeModule]}</h1>
              </div>
            </div>

            <div className="hidden w-full justify-self-center lg:block">
              <GlobalMenuSearch role={user.role} userEmail={user.email} tenantId={tenantId} />
            </div>

            <div className="ml-auto flex shrink-0 items-center justify-end gap-1.5 sm:gap-2">
              <Button
                type="button"
                className="hidden min-h-10 gap-1.5 px-3 sm:inline-flex"
                onClick={() => openCompose({ sourceModule: activeModule })}
                title="Compose email"
              >
                <Mail className="size-4" aria-hidden="true" />
                <span className="text-sm font-bold">Compose</span>
              </Button>
              <Button
                type="button"
                variant="secondary"
                className="inline-flex size-11 shrink-0 px-0 sm:hidden"
                onClick={() => openCompose({ sourceModule: activeModule })}
                title="Compose email"
              >
                <Mail className="size-4" aria-hidden="true" />
                <span className="sr-only">Compose</span>
              </Button>
              <NotificationBell tenantId={tenantId} userEmail={user.email} />
              {showCompanySwitcher ? (
                <label className="relative hidden min-[480px]:block">
                  <span className="sr-only">Switch company</span>
                  <select
                    value={tenantId}
                    onChange={(event) => handleTenantChange(event.target.value)}
                    className="bs-input bs-select h-10 w-[7.5rem] pl-2 text-xs font-semibold sm:w-40 sm:pl-3 sm:text-sm"
                  >
                    {tenantOptions.map((item) => (
                      <option value={item.id} key={item.id}>
                        {item.name}
                      </option>
                    ))}
                  </select>
                </label>
              ) : (
                <NavLink href="/profile" className="hidden min-w-0 sm:block">
                  <p className="truncate text-right text-sm font-semibold text-ink">{user.name}</p>
                  <p className="truncate text-right text-xs text-slate-500">{user.email}</p>
                </NavLink>
              )}
              <NavLink
                href="/profile"
                className="inline-flex size-11 shrink-0 items-center justify-center rounded-full border border-line bg-white text-ink hover:border-teal"
                title="My profile"
              >
                <UserRound className="size-4" aria-hidden="true" />
                <span className="sr-only">My profile</span>
              </NavLink>
              <Button variant="ghost" className="size-11 shrink-0 px-0 sm:px-3" onClick={logout} title="Sign out">
                <LogOut className="size-4" aria-hidden="true" />
                <span className="sr-only">Logout</span>
              </Button>
            </div>
          </div>

          <div className="border-t border-line px-3 py-2 lg:hidden">
            <GlobalMenuSearch role={user.role} userEmail={user.email} tenantId={tenantId} />
          </div>

          {showCompanySwitcher ? (
          <div className="flex gap-2 overflow-x-auto border-t border-line px-3 py-2 min-[480px]:hidden">
            <label className="relative min-w-[9rem] flex-1">
              <span className="sr-only">Switch company</span>
              <select
                value={tenantId}
                onChange={(event) => handleTenantChange(event.target.value)}
                className="bs-input bs-select h-10 w-full pl-3 text-sm font-semibold"
              >
                {tenantOptions.map((item) => (
                  <option value={item.id} key={item.id}>
                    {item.name}
                  </option>
                ))}
              </select>
            </label>
          </div>
          ) : null}
        </header>

        <main className="bg-[color:var(--bs-cloud)] px-3 py-4 pb-[max(1.5rem,env(safe-area-inset-bottom))] sm:px-4 md:px-6 md:py-6">
          <div className="mb-4 flex flex-col gap-3 rounded-[var(--bs-radius)] border border-line bg-[color:var(--bs-card,#ffffff)] p-3 shadow-soft sm:mb-5 sm:p-4 md:flex-row md:items-center md:justify-between">
            <div className="min-w-0">
              <p className="truncate text-sm font-bold text-ink">{tenant.name}</p>
              <p className="text-xs text-slate-500 sm:text-sm">
                {tenant.region} business unit · {tenant.plan}
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Badge tone="info">{getRoleLabel(user.role)}</Badge>
              {syncingRemote ? <Badge tone="warning">Syncing data…</Badge> : null}
              <Badge tone={pageAllowed ? "success" : "danger"}>{pageAllowed ? "Access granted" : "Restricted"}</Badge>
            </div>
          </div>
          <div className="bs-page min-w-0" key={tenantId}>
            {allowed && pageAllowed ? children : <EmptyAccess moduleName={moduleLabels[activeModule]} />}
          </div>
        </main>
      </div>
      <WorkspaceChat />
      <ComposeEmailHost />
      <EmailOutboxWorker />
    </div>
  );
}
