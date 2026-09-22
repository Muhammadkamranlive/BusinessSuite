"use client";

import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { clearAppSessionBootstrap } from "@/lib/navigation/session-bootstrap-cache";
import { signOutSupabase } from "@/lib/auth/supabase-mfa";
import { clearDemoSession } from "@/lib/auth/session";
import {
  clearLastActivity,
  HMS_IDLE_TIMEOUT_MS,
  isIdleTimedOut,
  touchLastActivity
} from "@/lib/auth/hms-session-policy";

const ACTIVITY_EVENTS = ["mousemove", "mousedown", "keydown", "click", "touchstart", "scroll"] as const;
const THROTTLE_MS = 30_000;

/**
 * Signs out after configurable idle time (default 15 min for clinical/HMS policy).
 * Mounted once in AppShell so every authenticated ERP page is covered.
 */
export function SessionIdleGuard() {
  const router = useRouter();
  const lastTouchRef = useRef(0);
  const signingOutRef = useRef(false);

  useEffect(() => {
    if (isIdleTimedOut()) {
      signingOutRef.current = true;
      clearAppSessionBootstrap();
      clearDemoSession();
      clearLastActivity();
      void signOutSupabase();
      router.replace("/login?reason=idle");
      return;
    }

    touchLastActivity();

    function onActivity() {
      const now = Date.now();
      if (now - lastTouchRef.current < THROTTLE_MS) return;
      lastTouchRef.current = now;
      touchLastActivity();
    }

    for (const event of ACTIVITY_EVENTS) {
      window.addEventListener(event, onActivity, { passive: true });
    }

    const interval = window.setInterval(() => {
      if (signingOutRef.current) return;
      if (!isIdleTimedOut()) return;
      signingOutRef.current = true;
      clearAppSessionBootstrap();
      clearDemoSession();
      clearLastActivity();
      void signOutSupabase();
      router.replace("/login?reason=idle");
    }, 60_000);

    return () => {
      for (const event of ACTIVITY_EVENTS) {
        window.removeEventListener(event, onActivity);
      }
      window.clearInterval(interval);
    };
  }, [router]);

  return null;
}

export { HMS_IDLE_TIMEOUT_MS };
