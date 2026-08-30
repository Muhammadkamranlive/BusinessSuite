"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { usePathname, useSearchParams } from "next/navigation";

type NavigationContextValue = {
  pendingHref: string | null;
  isNavigating: boolean;
  startNavigation: (href: string) => void;
};

const NavigationContext = createContext<NavigationContextValue | null>(null);

function normalizeHref(href: string) {
  const [path, hash = ""] = href.split("#");
  return `${path || "/"}${hash ? `#${hash}` : ""}`;
}

function isInternalAppHref(href: string | null) {
  if (!href || href.startsWith("#") || href.startsWith("mailto:") || href.startsWith("tel:")) return false;
  if (href.startsWith("http://") || href.startsWith("https://")) return false;
  return href.startsWith("/");
}

export function NavigationProvider({ children }: { children: ReactNode }) {
  const pathname = usePathname() || "/";
  const searchParams = useSearchParams();
  const [pendingHref, setPendingHref] = useState<string | null>(null);

  const startNavigation = useCallback((href: string) => {
    const target = normalizeHref(href);
    const current = normalizeHref(`${pathname}${searchParams?.toString() ? `?${searchParams.toString()}` : ""}`);
    if (target === current || target === pathname) return;
    setPendingHref(target);
  }, [pathname, searchParams]);

  useEffect(() => {
    setPendingHref(null);
  }, [pathname, searchParams]);

  useEffect(() => {
    if (!pendingHref) return;
    const failSafe = window.setTimeout(() => setPendingHref(null), 20000);
    return () => window.clearTimeout(failSafe);
  }, [pendingHref]);

  useEffect(() => {
    function onDocumentClick(event: MouseEvent) {
      if (event.defaultPrevented || event.button !== 0) return;
      if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
      const anchor = (event.target as Element | null)?.closest("a");
      if (!anchor || anchor.target === "_blank") return;
      const href = anchor.getAttribute("href");
      if (!isInternalAppHref(href)) return;
      startNavigation(href!);
    }

    document.addEventListener("click", onDocumentClick, true);
    return () => document.removeEventListener("click", onDocumentClick, true);
  }, [startNavigation]);

  const value = useMemo(
    () => ({
      pendingHref,
      isNavigating: Boolean(pendingHref),
      startNavigation
    }),
    [pendingHref, startNavigation]
  );

  return <NavigationContext.Provider value={value}>{children}</NavigationContext.Provider>;
}

export function useNavigation() {
  const ctx = useContext(NavigationContext);
  if (!ctx) {
    return {
      pendingHref: null,
      isNavigating: false,
      startNavigation: () => undefined
    };
  }
  return ctx;
}

export function useLinkPending(href: string) {
  const { pendingHref } = useNavigation();
  const target = normalizeHref(href);
  return pendingHref === target || pendingHref?.split("#")[0] === target.split("#")[0];
}
