"use client";

import { NavLink } from "@/components/navigation/nav-link";
import { useEffect, useMemo, useState } from "react";
import { usePathname } from "next/navigation";
import { ChevronDown, LockKeyhole } from "lucide-react";
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

/** Match sidebar link to current URL (path + optional hash). */
function isHrefActive(pathname: string, hash: string, href: string, moduleHref: string) {
  const target = splitHref(href);
  const cleanHash = hash.replace(/^#/, "");

  // Child links must live under this module (stops /reports#sales lighting up CRM/Sales)
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

function pathBelongsToModule(path: string, moduleHref: string) {
  return path === moduleHref || path.startsWith(`${moduleHref}/`);
}

/** Module is current only when URL is under that module's own prefix. */
function moduleOwnsPath(item: NavGroup, pathname: string) {
  return pathBelongsToModule(pathname, item.href);
}

function groupOfActiveChild(
  item: NavGroup,
  children: NavGroup["children"],
  pathname: string,
  hash: string
) {
  const active = children.find((child) => isHrefActive(pathname, hash, child.href, item.href));
  return active?.group || null;
}

/** Keep sidebar accordion sections in a predictable UX order. */
function sidebarSectionOrder(groupLabel: string) {
  const fixed: Record<string, number> = {
    Guide: 0,
    "Process flow": 1,
    "Email Engine": 900,
    "Rule Engine": 910,
    "More menus": 980
  };
  if (groupLabel in fixed) return fixed[groupLabel];
  if (!groupLabel) return 2;
  return 100;
}

function sortSidebarSections(sections: [string, NavGroup["children"]][]) {
  return [...sections].sort(([a], [b]) => sidebarSectionOrder(a) - sidebarSectionOrder(b));
}

function isFlowGuideChild(child: NavGroup["children"][number]) {
  return child.label === "Flow diagram" || child.href.endsWith("/guide");
}

function isComposeChild(child: NavGroup["children"][number]) {
  return child.label === "Compose email" || child.href.endsWith("/compose");
}

function isRuleEngineChild(child: NavGroup["children"][number]) {
  return child.label === "Rule engine" || child.label === "Automations" || child.href.endsWith("/automations");
}

function resolveOpenKey(pathname: string, role: RoleKey, userEmail: string, tenantId?: string): ModuleKey | null {
  let best: { key: ModuleKey; score: number } | null = null;
  for (const item of navGroups) {
    if (!canViewModule(role, userEmail, item.key, tenantId)) continue;
    if (!moduleOwnsPath(item, pathname)) continue;
    // Prefer the longest matching module prefix (e.g. /reports over /)
    const score = item.href.length + (pathname === item.href ? 50 : 100);
    if (!best || score > best.score) best = { key: item.key, score };
  }
  return best?.key ?? null;
}

export function SidebarNav({
  role,
  userEmail,
  tenantId,
  className,
  onNavigate
}: {
  role: RoleKey;
  userEmail: string;
  tenantId?: string;
  className?: string;
  onNavigate?: () => void;
}) {
  const pathname = usePathname() || "/";
  const [hash, setHash] = useState("");
  const [openKey, setOpenKey] = useState<ModuleKey | null>(null);
  const [openGroupByModule, setOpenGroupByModule] = useState<Partial<Record<ModuleKey, string | null>>>({});
  const [manualToggle, setManualToggle] = useState(false);
  const [manualGroup, setManualGroup] = useState(false);

  useEffect(() => {
    const syncHash = () => setHash(typeof window !== "undefined" ? window.location.hash : "");
    syncHash();
    window.addEventListener("hashchange", syncHash);
    return () => window.removeEventListener("hashchange", syncHash);
  }, []);

  useEffect(() => {
    setManualToggle(false);
    setManualGroup(false);
  }, [pathname]);

  useEffect(() => {
    if (manualToggle) return;
    setOpenKey(resolveOpenKey(pathname, role, userEmail, tenantId));
  }, [pathname, role, userEmail, manualToggle, tenantId]);

  useEffect(() => {
    if (manualGroup || !openKey) return;
    const item = navGroups.find((row) => row.key === openKey);
    if (!item) return;
    const children = visibleChildrenFor(item, role, userEmail, tenantId);
    const group = groupOfActiveChild(item, children, pathname, hash);
    if (!group) return;
    setOpenGroupByModule((prev) => (prev[openKey] === group ? prev : { ...prev, [openKey]: group }));
  }, [pathname, hash, openKey, role, userEmail, manualGroup, tenantId]);

  const modules = useMemo(() => {
    return navGroups.filter((item) => {
      const access = canViewModule(role, userEmail, item.key, tenantId);
      const children = visibleChildrenFor(item, role, userEmail, tenantId);
      return access || children.length > 0;
    });
  }, [role, userEmail, tenantId]);

  function toggleModule(item: NavGroup) {
    const children = visibleChildrenFor(item, role, userEmail, tenantId);
    if (!children.length) return;
    setManualToggle(true);
    setOpenKey((prev) => (prev === item.key ? null : item.key));
  }

  function toggleGroup(moduleKey: ModuleKey, groupLabel: string) {
    setManualGroup(true);
    setOpenGroupByModule((prev) => ({
      ...prev,
      [moduleKey]: prev[moduleKey] === groupLabel ? null : groupLabel
    }));
  }

  return (
    <nav className={cn("h-[calc(100dvh-5rem)] space-y-1 overflow-y-auto overscroll-contain px-3 py-4", className)} aria-label="Main menu">
      {modules.map((item) => {
        const Icon = item.icon;
        const access = canViewModule(role, userEmail, item.key, tenantId);
        const children = visibleChildrenFor(item, role, userEmail, tenantId);
        const hasSubmenu = children.length > 0;
        const expanded = openKey === item.key && hasSubmenu;
        const moduleActive = moduleOwnsPath(item, pathname);

        if (!access && !hasSubmenu) return null;

        if (!hasSubmenu) {
          return (
            <NavLink
              key={item.key}
              href={item.href}
              onClick={() => onNavigate?.()}
              aria-current={moduleActive ? "page" : undefined}
              className={cn(
                "flex min-h-11 items-center justify-between rounded-[var(--bs-radius)] px-3 text-sm font-semibold transition",
                moduleActive ? "bg-[color:var(--bs-teal)] text-white shadow-sm" : "text-white/75 hover:bg-white/10 hover:text-white",
                !access && "opacity-45"
              )}
              title={access ? item.label : `${item.label}: restricted for ${getRoleLabel(role)}`}
            >
              <span className="flex items-center gap-3">
                <Icon className="size-4 shrink-0" aria-hidden="true" />
                {item.label}
              </span>
              {!access ? <LockKeyhole className="size-3.5 opacity-70" aria-hidden="true" /> : null}
            </NavLink>
          );
        }

        const grouped = new Map<string, typeof children>();
        for (const child of children) {
          const key = child.group || "";
          const bucket = grouped.get(key) ?? [];
          bucket.push(child);
          grouped.set(key, bucket);
        }
        const sections = sortSidebarSections([...grouped.entries()]);
        const showHeaders = sections.some(([label]) => Boolean(label)) && sections.length > 1;
        const selectedGroup = openGroupByModule[item.key];
        const fallbackGroup = sections.find(([label]) => label === "Process flow")?.[0] ?? sections.find(([label]) => Boolean(label))?.[0] ?? null;
        const openGroup =
          selectedGroup === undefined
            ? groupOfActiveChild(item, children, pathname, hash) || fallbackGroup
            : selectedGroup;

        return (
          <div key={item.key} className="space-y-0.5">
            <div
              className={cn(
                "flex min-h-11 items-center gap-1 rounded-[var(--bs-radius)] transition",
                moduleActive && !expanded ? "bg-[color:var(--bs-teal)] text-white shadow-sm" : "",
                expanded ? "bg-white/10 text-white" : !moduleActive ? "text-white/75 hover:bg-white/10 hover:text-white" : ""
              )}
            >
              <NavLink
                href={item.href}
                onClick={() => onNavigate?.()}
                className="flex min-h-11 min-w-0 flex-1 items-center gap-3 rounded-[var(--bs-radius)] px-3 text-sm font-semibold"
                title={access ? item.label : `${item.label}: restricted for ${getRoleLabel(role)}`}
              >
                <Icon className="size-4 shrink-0" aria-hidden="true" />
                <span className="truncate">{item.label}</span>
                {!access ? <LockKeyhole className="size-3.5 shrink-0 opacity-70" aria-hidden="true" /> : null}
              </NavLink>
              <button
                type="button"
                aria-expanded={expanded}
                aria-label={expanded ? `Collapse ${item.label}` : `Expand ${item.label}`}
                onClick={() => toggleModule(item)}
                className="mr-1 inline-flex size-11 shrink-0 items-center justify-center rounded-[var(--bs-radius)] text-white/70 hover:bg-white/10 hover:text-white"
              >
                <ChevronDown className={cn("size-4 transition-transform", expanded ? "rotate-0" : "-rotate-90")} aria-hidden="true" />
              </button>
            </div>

            {expanded ? (
              <div className="ml-2 space-y-1 border-l border-white/15 py-1 pl-2 sm:ml-3">
                {sections.map(([groupLabel, sectionChildren]) => {
                  const nested = Boolean(showHeaders && groupLabel);
                  const groupOpen = !nested || openGroup === groupLabel;
                  return (
                    <div key={`${item.key}-${groupLabel || "main"}`} className="space-y-0.5">
                      {nested ? (
                        <button
                          type="button"
                          aria-expanded={groupOpen}
                          onClick={() => toggleGroup(item.key, groupLabel)}
                          className={cn(
                            "flex min-h-11 w-full items-center justify-between rounded-[var(--bs-radius)] px-2.5 text-left transition",
                            groupOpen ? "bg-white/10 text-white" : "text-white/80 hover:bg-white/10 hover:text-white"
                          )}
                        >
                          <span className="text-[11px] font-bold uppercase tracking-[0.12em]">{groupLabel}</span>
                          <ChevronDown
                            className={cn("size-4 shrink-0 text-white/70 transition-transform", groupOpen ? "rotate-0" : "-rotate-90")}
                            aria-hidden="true"
                          />
                        </button>
                      ) : null}
                      {groupOpen
                        ? sectionChildren.map((child) => {
                            const childActive = isHrefActive(pathname, hash, child.href, item.href);
                            const isFlowGuide = isFlowGuideChild(child);
                            const isCompose = isComposeChild(child);
                            const isRuleEngine = isRuleEngineChild(child);
                            const stageNo =
                              "processStage" in child && typeof child.processStage === "number"
                                ? child.processStage
                                : undefined;
                            return (
                              <NavLink
                                key={`${item.key}-${child.label}-${child.href}`}
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
                                    : isFlowGuide
                                      ? "bg-[color:var(--bs-teal)]/25 text-teal-100 ring-1 ring-teal-300/40 hover:bg-[color:var(--bs-teal)]/40 hover:text-white"
                                      : isCompose
                                        ? "bg-violet-500/20 text-violet-100 ring-1 ring-violet-300/35 hover:bg-violet-500/30 hover:text-white"
                                        : isRuleEngine
                                          ? "bg-amber-500/20 text-amber-100 ring-1 ring-amber-300/35 hover:bg-amber-500/30 hover:text-white"
                                          : "text-white/70 hover:bg-white/10 hover:text-white"
                                )}
                              >
                                {isFlowGuide ? (
                                  <span className="text-[10px] font-bold tracking-wide">GUIDE</span>
                                ) : isCompose ? (
                                  <span className="text-[10px] font-bold tracking-wide">EMAIL</span>
                                ) : isRuleEngine ? (
                                  <span className="text-[10px] font-bold tracking-wide">RULES</span>
                                ) : stageNo != null ? (
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
                          })
                        : null}
                    </div>
                  );
                })}
              </div>
            ) : null}
          </div>
        );
      })}
    </nav>
  );
}
