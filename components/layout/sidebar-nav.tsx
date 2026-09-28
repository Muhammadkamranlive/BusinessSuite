"use client";

import { NavLink } from "@/components/navigation/nav-link";
import { useMemo } from "react";
import { usePathname } from "next/navigation";
import { ArrowLeft, LayoutGrid, LockKeyhole, PanelLeftClose, PanelLeftOpen } from "lucide-react";
import { navGroups, getRoleLabel, type ModuleKey, type NavGroup, type RoleKey } from "@/lib/permissions";
import { sortNavChildrenByProcessStage } from "@/lib/guides/process-stage";
import { canMenu, canViewModule } from "@/modules/admin/services/acl.store";
import { cn } from "@/lib/utils";
import type { CSSProperties } from "react";
import {
  getModuleTone,
  resolveMenuIcon,
  sidebarIconToneAt
} from "@/lib/module-tones";

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

type ChildRow = ReturnType<typeof visibleChildrenFor>[number] & { toneIndex: number };

/**
 * App-scoped sidebar: only the active module’s menus, flat (no nested dropdowns).
 * Supports icon-rail collapse to free content width.
 */
export function SidebarNav({
  role,
  userEmail,
  tenantId,
  activeModule,
  className,
  onNavigate,
  collapsed = false,
  onToggleCollapsed
}: {
  role: RoleKey;
  userEmail: string;
  tenantId?: string;
  activeModule: ModuleKey;
  className?: string;
  onNavigate?: () => void;
  collapsed?: boolean;
  onToggleCollapsed?: () => void;
}) {
  const pathname = usePathname() || "/";
  const hash = typeof window !== "undefined" ? window.location.hash : "";

  const item = useMemo(() => navGroups.find((g) => g.key === activeModule) ?? null, [activeModule]);
  const tone = getModuleTone(activeModule);

  const children = useMemo(() => {
    if (!item) return [] as ChildRow[];
    return visibleChildrenFor(item, role, userEmail, tenantId).map((child, i) => ({
      ...child,
      toneIndex: i
    }));
  }, [item, role, userEmail, tenantId]);

  const grouped = useMemo(() => {
    const hasGroups = children.some((c) => Boolean(c.group));
    if (!hasGroups) {
      return [{ group: null as string | null, items: children }];
    }
    const order: string[] = [];
    const map = new Map<string, ChildRow[]>();
    for (const child of children) {
      const g = child.group || "Menus";
      if (!map.has(g)) {
        map.set(g, []);
        order.push(g);
      }
      map.get(g)!.push(child);
    }
    return order.map((g) => ({ group: g, items: map.get(g)! }));
  }, [children]);

  const access = item ? canViewModule(role, userEmail, item.key, tenantId) : false;
  const Icon = item?.icon;
  const homeActive = Boolean(
    item && (pathname === item.href || pathname === `${item.href}/`)
  );

  return (
    <nav
      className={cn(
        "flex h-[calc(100dvh-5rem)] flex-col overflow-y-auto overscroll-contain",
        collapsed ? "px-1.5 py-2" : "gap-1 px-3 py-3",
        className
      )}
      aria-label={`${item?.label ?? "App"} menu`}
      style={
        {
          ["--mod-accent" as string]: tone.hex
        } as CSSProperties
      }
    >
      <div className={cn("flex flex-col", collapsed ? "items-center gap-1.5" : "gap-1")}>
        {/* Back to apps */}
        <NavLink
          href="/apps"
          onClick={() => onNavigate?.()}
          title="All apps"
          className={cn(
            "group flex items-center transition",
            collapsed
              ? "size-10 justify-center rounded-xl border border-white/10 bg-white/[0.06] text-sky-300 hover:bg-white/12 hover:text-white"
              : "min-h-11 gap-2.5 rounded-xl border border-white/10 bg-gradient-to-r from-white/[0.07] to-white/[0.02] px-2.5 text-[13px] font-semibold text-white/80 hover:border-white/20 hover:from-white/12 hover:to-white/[0.04] hover:text-white"
          )}
        >
          {collapsed ? (
            <LayoutGrid className="size-4" aria-hidden="true" />
          ) : (
            <>
              <span className="inline-flex size-8 items-center justify-center rounded-lg bg-white/10 text-white/70 transition group-hover:bg-white/15 group-hover:text-white">
                <ArrowLeft className="size-3.5" aria-hidden="true" />
              </span>
              <span className="inline-flex size-8 items-center justify-center rounded-lg bg-sky-400/15 text-sky-300">
                <LayoutGrid className="size-3.5" aria-hidden="true" />
              </span>
              <span className="truncate">All apps</span>
            </>
          )}
        </NavLink>

        {/* Active module hero */}
        {item && Icon ? (
          <NavLink
            href={item.href}
            onClick={() => onNavigate?.()}
            title={access ? `${item.label} home` : `${item.label}: restricted for ${getRoleLabel(role)}`}
            className={cn(
              "relative flex items-center overflow-hidden transition",
              collapsed
                ? cn(
                    "size-10 justify-center rounded-xl",
                    homeActive ? "bg-white shadow-md" : "bg-white/[0.06] hover:bg-white/12"
                  )
                : cn(
                    "mb-2 min-h-[3.25rem] gap-3 rounded-2xl border px-3 py-2.5",
                    homeActive
                      ? "border-white/20 bg-white text-[color:var(--bs-ink)] shadow-[0_8px_28px_rgba(0,0,0,0.25)]"
                      : "border-white/10 bg-white/[0.06] text-white hover:bg-white/[0.1]"
                  )
            )}
          >
            {!collapsed ? (
              <span
                className="pointer-events-none absolute -right-6 -top-8 size-24 rounded-full opacity-40 blur-2xl"
                style={{ background: tone.hex }}
                aria-hidden
              />
            ) : null}
            <span
              className={cn(
                "relative inline-flex shrink-0 items-center justify-center rounded-xl text-white shadow-md ring-1 ring-white/20",
                collapsed ? "size-8" : "size-10",
                tone.well,
                !collapsed && tone.glow
              )}
            >
              <Icon className={collapsed ? "size-4" : "size-5"} strokeWidth={1.85} aria-hidden="true" />
            </span>
            {!collapsed ? (
              <>
                <span className="relative min-w-0 flex-1">
                  <span
                    className={cn(
                      "block text-[10px] font-bold uppercase tracking-[0.14em]",
                      homeActive ? "text-slate-400" : tone.softText
                    )}
                  >
                    Workspace
                  </span>
                  <span className="block truncate text-[14px] font-bold tracking-tight">{item.label}</span>
                </span>
                {!access ? (
                  <LockKeyhole className="relative ml-auto size-3.5 opacity-70" aria-hidden="true" />
                ) : null}
              </>
            ) : null}
          </NavLink>
        ) : null}
      </div>

      {/* Menu sections */}
      <div className={cn("flex-1 space-y-3 pb-3", collapsed ? "mt-2" : "mt-1 space-y-4")}>
        {grouped.map((section) => (
          <div key={section.group ?? "menus"} className={cn(collapsed && "flex flex-col items-center gap-0.5")}>
            {!collapsed ? (
              <p
                className={cn(
                  "mb-1.5 flex items-center gap-2 px-1 text-[10px] font-bold uppercase tracking-[0.16em]",
                  tone.softText
                )}
              >
                <span
                  className="inline-block h-1 w-1 rounded-full"
                  style={{ background: tone.hex }}
                  aria-hidden
                />
                {section.group ?? "Menus"}
              </p>
            ) : section.group ? (
              <span
                className="mb-0.5 mt-1 h-0.5 w-5 rounded-full opacity-40"
                style={{ background: tone.hex }}
                aria-hidden
              />
            ) : null}
            <ul className={cn("space-y-0.5", collapsed && "flex w-full flex-col items-center space-y-1")}>
              {section.items.map((child) => {
                const childActive = isHrefActive(pathname, hash, child.href, item?.href ?? "");
                const MenuIcon = resolveMenuIcon(child.label, child.href);
                const jewel = sidebarIconToneAt(child.toneIndex);
                const stageNo =
                  "processStage" in child &&
                  typeof child.processStage === "number" &&
                  child.group === "Process flow"
                    ? child.processStage
                    : undefined;

                return (
                  <li key={`${child.label}-${child.href}`} className={cn(collapsed && "w-full")}>
                    <NavLink
                      href={child.href}
                      onClick={() => onNavigate?.()}
                      aria-current={childActive ? "page" : undefined}
                      title={
                        stageNo
                          ? `${stageNo}${stageNo === 1 ? "st" : stageNo === 2 ? "nd" : stageNo === 3 ? "rd" : "th"} stage — ${child.label}`
                          : child.label
                      }
                      className={cn(
                        "group relative flex items-center font-semibold transition",
                        collapsed
                          ? cn(
                              "mx-auto size-10 justify-center rounded-xl",
                              childActive
                                ? "bg-white text-[color:var(--bs-ink)] shadow-md"
                                : "text-white/80 hover:bg-white/10 hover:text-white"
                            )
                          : cn(
                              "min-h-10 gap-2.5 rounded-xl px-2 py-1.5 text-[13px]",
                              childActive
                                ? "bg-white text-[color:var(--bs-ink)] shadow-[0_6px_18px_rgba(0,0,0,0.22)]"
                                : "text-white/78 hover:bg-white/[0.08] hover:text-white"
                            )
                      )}
                    >
                      {!collapsed && childActive ? (
                        <span
                          className="absolute left-0 top-1/2 h-5 w-[3px] -translate-y-1/2 rounded-r-full"
                          style={{ background: tone.hex }}
                          aria-hidden
                        />
                      ) : null}
                      <span
                        className={cn(
                          "inline-flex shrink-0 items-center justify-center rounded-lg transition",
                          collapsed ? "size-8" : "size-8",
                          childActive
                            ? cn(jewel.activeWell, jewel.activeGlyph, "shadow-sm")
                            : cn(jewel.well, jewel.glyph, "group-hover:brightness-110")
                        )}
                      >
                        {stageNo != null ? (
                          <span className="text-[11px] font-bold tabular-nums">{stageNo}</span>
                        ) : (
                          <MenuIcon className="size-3.5" strokeWidth={2} aria-hidden="true" />
                        )}
                      </span>
                      {!collapsed ? (
                        <span className="min-w-0 flex-1 truncate">{child.label}</span>
                      ) : null}
                    </NavLink>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}

        {!children.length ? (
          <p className={cn("px-2 py-3 text-xs text-white/50", collapsed && "sr-only")}>
            No menus available for your role in this app.
          </p>
        ) : null}
      </div>

      {onToggleCollapsed ? (
        <button
          type="button"
          onClick={onToggleCollapsed}
          className={cn(
            "mt-auto hidden shrink-0 items-center gap-2 border-t border-white/10 text-[12px] font-semibold text-white/70 transition hover:bg-white/10 hover:text-white lg:flex",
            collapsed ? "mx-auto mb-1 size-10 justify-center rounded-xl" : "min-h-11 justify-start gap-2.5 rounded-xl px-2.5"
          )}
          aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
        >
          {collapsed ? (
            <PanelLeftOpen className="size-4" aria-hidden />
          ) : (
            <>
              <span className="inline-flex size-8 items-center justify-center rounded-lg bg-white/10">
                <PanelLeftClose className="size-3.5" aria-hidden />
              </span>
              Collapse
            </>
          )}
        </button>
      ) : null}
    </nav>
  );
}
