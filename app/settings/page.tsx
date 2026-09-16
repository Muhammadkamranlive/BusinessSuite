"use client";

import { useEffect, useState } from "react";
import { Bell, BookOpen, Building2, ImageIcon, KeyRound, LayoutGrid, Mail, Newspaper, Shield, Users } from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { AdminSubnav } from "@/components/admin/admin-subnav";
import { ModuleBreadcrumbs } from "@/components/common/module-breadcrumbs";
import { ModuleStartGuide } from "@/components/guides/module-start-guide";
import { PageHeader } from "@/components/common/page-header";
import { Badge, Button, Panel, StatTile, ActionCard } from "@/components/ui";
import { getStoredTenantId } from "@/lib/auth/session";
import { getSessionProfile } from "@/lib/auth/session-profile";
import { getRoleLabel } from "@/lib/permissions";
import { isSuperAdminRole } from "@/lib/platform-access";
import { canMenu } from "@/modules/admin/services/acl.store";
import { adminStats, listCompanyDirectoryUsers, listCombinedAudit } from "@/modules/admin/services/admin.store";

const quickLinks = [
  { href: "/settings/users", title: "Invite & manage users", detail: "Assign roles, block or activate accounts", icon: Users, menuId: "settings.users" },
  { href: "/settings/access", title: "Menu rights matrix", detail: "View / Add / Update / Delete by role or user", icon: KeyRound, menuId: "settings.access_control" },
  { href: "/settings/blogs", title: "Publish blogs", detail: "Write and publish public blog posts", icon: Newspaper, menuId: "settings.blogs" },
  { href: "/settings/content", title: "Menus & pages", detail: "Build public site menus and nested pages", icon: LayoutGrid, menuId: "settings.menus_pages" },
  { href: "/settings/landing-images", title: "Landing images", detail: "Update homepage and product screenshots", icon: ImageIcon, menuId: "settings.landing_images" },
  { href: "/settings/tenants", title: "Companies / tenants", detail: "Multi-company profiles and plans", icon: Building2, menuId: "settings.companies_tenants" },
  { href: "/settings/roles", title: "Roles & permissions", detail: "Add roles, edit modules, and assign them to users", icon: Shield, menuId: "settings.roles_permissions" },
  { href: "/settings/email-templates", title: "Email templates", detail: "Gmail/Nodemailer templates for invites, leave, invoices", icon: Mail, menuId: "settings.email_templates" },
  { href: "/guides", title: "Process guides", detail: "Module & menu flow diagrams — first, second, third steps", icon: BookOpen, menuId: "settings.process_guides" }
];

export default function SettingsHubPage() {
  const tenantId = getStoredTenantId() ?? "alpha";
  const profile = getSessionProfile();
  const [stats, setStats] = useState(() => adminStats(tenantId));
  const [users, setUsers] = useState(() => listCompanyDirectoryUsers(tenantId).slice(0, 5));
  const [logs, setLogs] = useState(() => listCombinedAudit(tenantId).slice(0, 6));
  const visibleLinks = quickLinks.filter((item) => canMenu(profile.role, profile.email, item.menuId, "view"));

  useEffect(() => {
    setStats(adminStats(tenantId));
    setUsers(listCompanyDirectoryUsers(tenantId).slice(0, 5));
    setLogs(listCombinedAudit(tenantId).slice(0, 6));
  }, [tenantId]);

  return (
    <AppShell activeModule="settings">
      <ModuleBreadcrumbs />
      <PageHeader
        title="Administration"
        description="Users, roles, menu rights, extra fields, billing, audit trail, and system configuration for this company."
      />
      <AdminSubnav active="/settings" />
      <ModuleStartGuide module="settings" />

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <StatTile label="Users" value={String(stats.users)} detail={`${stats.activeUsers} active · ${stats.invitedUsers} invited`} icon={Users} tone="teal" />
        {isSuperAdminRole(profile.role) ? (
          <StatTile label="Companies" value={String(stats.tenants)} detail="Multi-tenant workspace" icon={Building2} tone="coral" />
        ) : (
          <StatTile label="Company" value="1" detail="Your workspace" icon={Building2} tone="coral" />
        )}
        <StatTile label="Audit events" value={String(stats.auditEvents)} detail="Security & change trail" icon={KeyRound} tone="amber" />
        <StatTile label="Unread alerts" value={String(stats.unreadNotifications)} detail="Admin notifications" icon={Bell} tone="mint" />
      </div>

      <div className="mt-5 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {visibleLinks.map((item) => (
          <ActionCard key={item.href} href={item.href} title={item.title} detail={item.detail} icon={item.icon} />
        ))}
      </div>

      <div className="mt-5 grid gap-5 xl:grid-cols-2">
        <Panel>
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-lg font-bold text-ink">Recent users</h2>
            <Button href="/settings/users" variant="secondary" className="!min-h-9 !text-xs">Manage</Button>
          </div>
          <ul className="space-y-2">
            {users.map((u) => (
              <li key={u.id} className="flex items-center justify-between rounded-[var(--bs-radius)] border border-line bg-cloud px-3 py-2.5">
                <div>
                  <p className="text-sm font-semibold text-ink">{u.name}</p>
                  <p className="text-xs text-slate-500">{u.email}</p>
                </div>
                <div className="flex items-center gap-2">
                  <Badge tone="info">{getRoleLabel(u.role)}</Badge>
                  <Badge tone={u.status === "active" ? "success" : u.status === "invited" ? "warning" : "danger"}>{u.status}</Badge>
                </div>
              </li>
            ))}
          </ul>
        </Panel>

        <Panel>
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-lg font-bold text-ink">Latest audit activity</h2>
            <Button href="/settings/audit" variant="secondary" className="!min-h-9 !text-xs">View all</Button>
          </div>
          {logs.length === 0 ? (
            <p className="text-sm text-slate-500">No audit events yet. Invite a user or change settings to generate logs.</p>
          ) : (
            <ul className="space-y-2">
              {logs.map((log) => (
                <li key={log.id} className="rounded-[var(--bs-radius)] border border-line px-3 py-2.5">
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-sm font-semibold capitalize text-ink">{log.action} · {log.entity_name ?? log.module}</p>
                    <span className="text-xs text-slate-400">{new Date(log.created_at).toLocaleString()}</span>
                  </div>
                  <p className="mt-1 text-xs text-slate-500 capitalize">{log.module}</p>
                </li>
              ))}
            </ul>
          )}
        </Panel>
      </div>
    </AppShell>
  );
}
