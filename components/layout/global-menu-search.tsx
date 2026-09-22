"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useNavigation } from "@/components/navigation/navigation-provider";
import { CornerDownLeft, Search, Sparkles } from "lucide-react";
import { searchMenus, type MenuDefinition } from "@/lib/menu-registry";
import { canMenu } from "@/modules/admin/services/acl.store";
import type { ModuleKey, RoleKey } from "@/lib/permissions";
import { cn } from "@/lib/utils";

export function GlobalMenuSearch({
  role,
  userEmail,
  tenantId,
  moduleFilter
}: {
  role: RoleKey;
  userEmail: string;
  tenantId?: string;
  /** When set, search only menus inside this app (decoupled portals). */
  moduleFilter?: ModuleKey;
}) {
  const router = useRouter();
  const { startNavigation } = useNavigation();
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const wrapRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const results = useMemo(() => {
    return searchMenus(query)
      .filter((m) => (moduleFilter ? m.module === moduleFilter : true))
      .filter((m) => canMenu(role, userEmail, m.id, "view", tenantId))
      .slice(0, 10);
  }, [query, role, userEmail, tenantId, moduleFilter]);

  useEffect(() => {
    function onDocClick(e: MouseEvent) {
      if (!wrapRef.current?.contains(e.target as Node)) setOpen(false);
    }
    function onHotkey(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        inputRef.current?.focus();
        setOpen(true);
      }
    }
    document.addEventListener("mousedown", onDocClick);
    document.addEventListener("keydown", onHotkey);
    return () => {
      document.removeEventListener("mousedown", onDocClick);
      document.removeEventListener("keydown", onHotkey);
    };
  }, []);

  useEffect(() => setActive(0), [query]);

  function go(menu: MenuDefinition) {
    setOpen(false);
    setQuery("");
    startNavigation(menu.href);
    router.push(menu.href);
  }

  function onKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (!open && (e.key === "ArrowDown" || e.key === "Enter")) setOpen(true);
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActive((i) => Math.min(i + 1, Math.max(results.length - 1, 0)));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActive((i) => Math.max(i - 1, 0));
    } else if (e.key === "Enter" && results[active]) {
      e.preventDefault();
      go(results[active]);
    } else if (e.key === "Escape") {
      setOpen(false);
    }
  }

  return (
    <div ref={wrapRef} className="relative w-full max-w-xl">
      <label className="relative block">
        <Search className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-[color:var(--bs-teal)]" aria-hidden="true" />
        <input
          ref={inputRef}
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          onKeyDown={onKeyDown}
          placeholder="Search menus…"
          aria-label="Search all ERP menus"
          className="bs-input w-full pl-10 pr-3 text-sm shadow-soft sm:pr-12"
        />
        <span className="pointer-events-none absolute right-3 top-1/2 hidden -translate-y-1/2 rounded border border-[color:var(--bs-line)] bg-[color:var(--bs-cloud)] px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-slate-500 sm:inline">
          ⌘K
        </span>
      </label>

      {open ? (
        <div className="absolute left-0 right-0 top-[calc(100%+0.5rem)] z-50 max-h-[min(24rem,70dvh)] overflow-hidden rounded-[var(--bs-radius)] border border-[color:var(--bs-line)] bg-white shadow-soft">
          <div className="flex items-center gap-2 border-b border-[color:var(--bs-line)] bg-[color:var(--bs-cloud)] px-3 py-2 text-xs font-semibold text-slate-500">
            <Sparkles className="size-3.5 text-[color:var(--bs-teal)]" aria-hidden="true" />
            {query ? `Menus matching “${query}”` : "All menus you can access"}
          </div>
          <ul className="max-h-[min(20rem,60dvh)] overflow-y-auto overscroll-contain py-1">
            {results.length === 0 ? (
              <li className="px-4 py-6 text-center text-sm text-slate-500">No menus found for your access rights.</li>
            ) : (
              results.map((menu, index) => (
                <li key={menu.id}>
                  <button
                    type="button"
                    onClick={() => go(menu)}
                    className={cn(
                      "flex min-h-11 w-full items-center justify-between gap-3 px-4 py-2.5 text-left transition",
                      index === active ? "bg-[color:var(--bs-cloud)]" : "hover:bg-[color:var(--bs-cloud)]"
                    )}
                  >
                    <span className="min-w-0">
                      <span className="block truncate text-sm font-semibold text-[color:var(--bs-ink)]">{menu.label}</span>
                      <span className="block truncate text-xs text-slate-500">
                        {menu.parentLabel ? `${menu.parentLabel} · ` : ""}
                        {menu.href}
                      </span>
                    </span>
                    <CornerDownLeft className="size-3.5 shrink-0 text-slate-400" aria-hidden="true" />
                  </button>
                </li>
              ))
            )}
          </ul>
        </div>
      ) : null}
    </div>
  );
}
