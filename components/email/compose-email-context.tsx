"use client";

import { createContext, useCallback, useContext, useMemo, useState } from "react";
import type { ComposeEmailDraft } from "@/lib/email/types";
import type { ModuleKey } from "@/lib/permissions";

type ComposeEmailContextValue = {
  open: boolean;
  minimized: boolean;
  draft: ComposeEmailDraft;
  openCompose: (draft?: ComposeEmailDraft) => void;
  closeCompose: () => void;
  minimizeCompose: () => void;
  expandCompose: () => void;
};

const ComposeEmailContext = createContext<ComposeEmailContextValue | null>(null);

export function ComposeEmailProvider({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  const [minimized, setMinimized] = useState(false);
  const [draft, setDraft] = useState<ComposeEmailDraft>({});

  const openCompose = useCallback((next?: ComposeEmailDraft) => {
    setDraft(next ?? {});
    setMinimized(false);
    setOpen(true);
  }, []);

  const closeCompose = useCallback(() => {
    setOpen(false);
    setMinimized(false);
    setDraft({});
  }, []);

  const minimizeCompose = useCallback(() => setMinimized(true), []);
  const expandCompose = useCallback(() => setMinimized(false), []);

  const value = useMemo(
    () => ({
      open,
      minimized,
      draft,
      openCompose,
      closeCompose,
      minimizeCompose,
      expandCompose
    }),
    [open, minimized, draft, openCompose, closeCompose, minimizeCompose, expandCompose]
  );

  return <ComposeEmailContext.Provider value={value}>{children}</ComposeEmailContext.Provider>;
}

export function useComposeEmail() {
  const ctx = useContext(ComposeEmailContext);
  if (!ctx) {
    throw new Error("useComposeEmail must be used within ComposeEmailProvider");
  }
  return ctx;
}

/** Safe hook when provider may be absent (e.g. public pages). */
export function useComposeEmailOptional() {
  return useContext(ComposeEmailContext);
}

export function composeHrefForModule(module: ModuleKey) {
  return `/${module}/compose`;
}
