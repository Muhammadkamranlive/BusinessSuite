"use client";

import { Suspense, type ReactNode } from "react";
import { AutomationWorker } from "@/components/automation/automation-worker";
import { ComposeEmailProvider } from "@/components/email/compose-email-context";
import { EmailOutboxWorker } from "@/components/email/email-outbox-worker";
import { NavigationProvider } from "@/components/navigation/navigation-provider";
import { RouteProgress } from "@/components/navigation/route-progress";

function NavigationReady({ children }: { children: ReactNode }) {
  return (
    <NavigationProvider>
      <ComposeEmailProvider>
        <RouteProgress />
        <EmailOutboxWorker />
        <AutomationWorker />
        {children}
      </ComposeEmailProvider>
    </NavigationProvider>
  );
}

/** Client navigation feedback (progress bar + pending links). */
export function AppNavigation({ children }: { children: ReactNode }) {
  return (
    <Suspense fallback={null}>
      <NavigationReady>{children}</NavigationReady>
    </Suspense>
  );
}
