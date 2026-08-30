"use client";

import { EmailComposer } from "@/components/email/email-composer";
import { useComposeEmail } from "@/components/email/compose-email-context";

/** Gmail-style floating compose dock — rendered once inside AppShell. */
export function ComposeEmailHost() {
  const { open, minimized, draft, closeCompose, minimizeCompose, expandCompose } = useComposeEmail();

  return (
    <EmailComposer
      mode="floating"
      open={open}
      minimized={minimized}
      initial={draft}
      sourceModule={draft.sourceModule}
      onClose={closeCompose}
      onMinimize={minimizeCompose}
      onExpand={expandCompose}
    />
  );
}
