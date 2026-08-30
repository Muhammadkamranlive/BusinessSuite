"use client";

import { useEffect } from "react";
import { startOutboxWorker } from "@/lib/email/outbox";

/** Mount once in the app shell to auto-flush the email outbox queue. */
export function EmailOutboxWorker() {
  useEffect(() => {
    startOutboxWorker();
  }, []);
  return null;
}
