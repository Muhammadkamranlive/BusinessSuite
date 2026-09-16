"use client";

import { NavLink } from "@/components/navigation/nav-link";
import { Building2, Bell, BookOpen, CreditCard, FileSearch, FileText, GitBranch, ImageIcon, KeyRound, LayoutGrid, ListPlus, Mail, Newspaper, Package, Plug, Settings2, Shield, Trash2, Users, Zap } from "lucide-react";
import { canMenu } from "@/modules/admin/services/acl.store";
import { getSessionProfile } from "@/lib/auth/session-profile";
import { cn } from "@/lib/utils";

const links = [
  { href: "/settings", label: "Overview", icon: Settings2, menuId: "settings.root" },
  { href: "/settings/tenants", label: "Companies", icon: Building2, menuId: "settings.companies_tenants" },
  { href: "/settings/users", label: "Users", icon: Users, menuId: "settings.users" },
  { href: "/settings/roles", label: "Roles", icon: Shield, menuId: "settings.roles_permissions" },
  { href: "/settings/access", label: "Access Control", icon: KeyRound, menuId: "settings.access_control" },
  { href: "/settings/packages", label: "Packages", icon: Package, menuId: "settings.subscription_packages" },
  { href: "/settings/billing", label: "My company & billing", icon: CreditCard, menuId: "settings.my_company_billing" },
  { href: "/settings/blogs", label: "Blogs", icon: Newspaper, menuId: "settings.blogs" },
  { href: "/settings/content", label: "Menus & Pages", icon: LayoutGrid, menuId: "settings.menus_pages" },
  { href: "/settings/landing-images", label: "Landing images", icon: ImageIcon, menuId: "settings.landing_images" },
  { href: "/settings/forms", label: "Extra fields", icon: ListPlus, menuId: "settings.extra_form_fields" },
  { href: "/settings/recycle-bin", label: "Recycle bin", icon: Trash2, menuId: "settings.recycle_bin" },
  { href: "/settings/audit", label: "Audit Logs", icon: FileSearch, menuId: "settings.audit_logs" },
  { href: "/settings/notifications", label: "Notifications", icon: Bell, menuId: "settings.notifications" },
  { href: "/settings/automations", label: "Rule Engine", icon: Zap, menuId: "settings.automations" },
  { href: "/guides", label: "Process guides", icon: BookOpen, menuId: "settings.process_guides" },
  { href: "/settings/guide", label: "Flow diagram", icon: GitBranch, menuId: "settings.flow_diagram" },
  { href: "/settings/email-templates", label: "Email templates", icon: Mail, menuId: "settings.email_templates" },
  { href: "/settings/integrations", label: "Integrations", icon: Plug, menuId: "settings.third_party_integrations" },
  { href: "/settings/system", label: "System", icon: FileText, menuId: "settings.system_settings" }
];

export function AdminSubnav({ active }: { active: string }) {
  const profile = getSessionProfile();
  const visible = links.filter((item) => canMenu(profile.role, profile.email, item.menuId, "view"));

  return (
    <div className="-mx-1 mb-6 flex gap-2 overflow-x-auto overscroll-x-contain px-1 pb-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
      {visible.map((item) => {
        const Icon = item.icon;
        const isActive = active === item.href;
        return (
          <NavLink
            key={item.href}
            href={item.href}
            prefetch
            className={cn(
              "inline-flex h-11 shrink-0 items-center gap-2 rounded-[var(--bs-radius)] border px-3 text-sm font-semibold transition",
              isActive
                ? "border-ink bg-ink text-white"
                : "border-line bg-white text-slate-600 hover:border-teal hover:text-ink"
            )}
          >
            <Icon className="size-4" aria-hidden="true" />
            <span className="whitespace-nowrap">{item.label}</span>
          </NavLink>
        );
      })}
    </div>
  );
}
