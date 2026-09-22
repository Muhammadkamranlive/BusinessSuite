"use client";

import { NavLink } from "@/components/navigation/nav-link";
import { useMemo } from "react";
import { usePathname } from "next/navigation";
import { ArrowLeft, LayoutGrid, LockKeyhole } from "lucide-react";
import { navGroups, getRoleLabel, type ModuleKey, type NavGroup, type RoleKey } from "@/lib/permissions";
import { sortNavChildrenByProcessStage } from "@/lib/guides/process-stage";
import { canMenu, canViewModule } from "@/modules/admin/services/acl.store";
import { cn } from "@/lib/utils";

function visibleChildrenFor(item: NavGroup, role: RoleKey, userEmail: string, tenantId?: string) {
  const allowed = item.children.filter((child) => {
    const slug = child.label.toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_|_$/g, "");
    return canMenu(role, userEmail, `${item.key}.${slug}`, "view", tenantId);
  });
  return sortNavChildrenByProcessStage(item.key, item.href, allowed);
}

function splitHref(href: string) {
  const [path, hash] = href.split("#");
  return { path: path || "/", hash: hash || "" };
}

function isHrefActive(pathname: string, hash: string, href: string, moduleHref: string) {
  const target = splitHref(href);
  const cleanHash = hash.replace(/^#/, "");

  if (!(target.path === moduleHref || target.path.startsWith(`${moduleHref}/`))) {
    return false;
  }

  if (target.hash) {
    return pathname === target.path && cleanHash === target.hash;
  }

  if (pathname === target.path) {
    return !cleanHash;
  }

  if (target.path !== moduleHref && pathname.startsWith(`${target.path}/`)) {
    return true;
  }

  return false;
}

/**
 * App-scoped sidebar: only the active module’s menus, flat (no nested dropdowns).
 * “All apps” returns to the portal launcher.
 */
export function SidebarNav({
  role,
  userEmail,
  tenantId,
  activeModule,
  className,
  onNavigate
}: {
  role: RoleKey;
  userEmail: string;
  tenantId?: string;
  activeModule: ModuleKey;
  className?: string;
  onNavigate?: () => void;
}) {
  const pathname = usePathname() || "/";
  const hash = typeof window !== "undefined" ? window.location.hash : "";

  const item = useMemo(() => navGroups.find((g) => g.key === activeModule) ?? null, [activeModule]);

  const children = useMemo(() => {
    if (!item) return [];
    return visibleChildrenFor(item, role, userEmail, tenantId);
  }, [item, role, userEmail, tenantId]);

  const access = item ? canViewModule(role, userEmail, item.key, tenantId) : false;
  const Icon = item?.icon;

  return (
    <nav
      className={cn("h-[calc(100dvh-5rem)] space-y-1 overflow-y-auto overscroll-contain px-3 py-4", className)}
      aria-label={`${item?.label ?? "App"} menu`}
    >
      <NavLink
        href="/apps"
        onClick={() => onNavigate?.()}
        className="mb-3 flex min-h-11 items-center gap-3 rounded-[var(--bs-radius)] border border-white/15 bg-white/5 px-3 text-sm font-semibold text-teal-100 transition hover:bg-white/10 hover:text-white"
      >
        <ArrowLeft className="size-4 shrink-0" aria-hidden="true" />
        <LayoutGrid className="size-4 shrink-0" aria-hidden="true" />
        All apps
      </NavLink>

      {item && Icon ? (
        <NavLink
          href={item.href}
          onClick={() => onNavigate?.()}
          className={cn(
            "mb-2 flex min-h-11 items-center gap-3 rounded-[var(--bs-radius)] px-3 text-sm font-bold transition",
            pathname === item.href || pathname === `${item.href}/`
              ? "bg-[color:var(--bs-teal)] text-white shadow-sm"
              : "bg-white/10 text-white hover:bg-white/15"
          )}
          title={access ? `${item.label} home` : `${item.label}: restricted for ${getRoleLabel(role)}`}
        >
          <Icon className="size-4 shrink-0" aria-hidden="true" />
          <span className="truncate">{item.label}</span>
          {!access ? <LockKeyhole className="ml-auto size-3.5 opacity-70" aria-hidden="true" /> : null}
        </NavLink>
      ) : null}

      <p className="px-2 pb-1 pt-2 text-[10px] font-bold uppercase tracking-[0.14em] text-white/45">Menus</p>

      {children.map((child) => {
        const childActive = isHrefActive(pathname, hash, child.href, item?.href ?? "");
        const stageNo =
          "processStage" in child && typeof child.processStage === "number" && child.group === "Process flow"
            ? child.processStage
            : undefined;

        return (
          <NavLink
            key={`${child.label}-${child.href}`}
            href={child.href}
            onClick={() => onNavigate?.()}
            aria-current={childActive ? "page" : undefined}
            title={
              stageNo
                ? `${stageNo}${stageNo === 1 ? "st" : stageNo === 2 ? "nd" : stageNo === 3 ? "rd" : "th"} stage — ${child.label}`
                : child.label
            }
            className={cn(
              "flex min-h-10 items-center gap-2 rounded-[var(--bs-radius)] px-2.5 text-[13px] font-semibold transition",
              childActive
                ? "bg-white text-[color:var(--bs-ink)] shadow-sm"
                : "text-white/75 hover:bg-white/10 hover:text-white"
            )}
          >
            {stageNo != null ? (
              <span
                className={cn(
                  "inline-flex size-5 shrink-0 items-center justify-center rounded-full text-[10px] font-bold",
                  childActive ? "bg-[color:var(--bs-ink)] text-white" : "bg-white/20 text-white"
                )}
              >
                {stageNo}
              </span>
            ) : null}
            <span className="min-w-0 truncate">{child.label}</span>
          </NavLink>
        );
      })}

      {!children.length ? (
        <p className="px-2 py-3 text-xs text-white/50">No menus available for your role in this app.</p>
      ) : null}
    </nav>
  );
}
