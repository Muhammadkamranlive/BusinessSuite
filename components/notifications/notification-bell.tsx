"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Bell, CheckCheck } from "lucide-react";
import { NavLink } from "@/components/navigation/nav-link";
import { Button } from "@/components/ui";
import {
  getUnreadCount,
  getUserNotifications,
  markAllAsRead,
  markAsRead,
  subscribeNotifications
} from "@/modules/core/services/notification.service";
import { cn } from "@/lib/utils";

function relativeTime(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "Just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  return new Date(iso).toLocaleDateString();
}

export function NotificationBell({
  tenantId,
  userEmail
}: {
  tenantId: string;
  userEmail: string;
}) {
  const [open, setOpen] = useState(false);
  const [tick, setTick] = useState(0);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => subscribeNotifications(() => setTick((n) => n + 1)), []);

  useEffect(() => {
    if (!open) return;
    function onDoc(e: MouseEvent) {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", onDoc);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDoc);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const items = useMemo(() => {
    void tick;
    return getUserNotifications(tenantId, null, userEmail).slice(0, 30);
  }, [tenantId, userEmail, tick]);

  const unread = useMemo(() => {
    void tick;
    return getUnreadCount(tenantId, null, userEmail);
  }, [tenantId, userEmail, tick]);

  return (
    <div className="relative" ref={rootRef}>
      <Button
        type="button"
        variant="ghost"
        className="relative size-11 shrink-0 px-0"
        aria-label={unread ? `${unread} unread notifications` : "Notifications"}
        aria-expanded={open}
        aria-haspopup="dialog"
        onClick={() => setOpen((v) => !v)}
        title="Notifications"
      >
        <Bell className="size-4" aria-hidden="true" />
        {unread > 0 ? (
          <span className="absolute right-1.5 top-1.5 inline-flex min-w-4 items-center justify-center rounded-full bg-[color:var(--bs-coral)] px-1 text-[10px] font-bold leading-4 text-white">
            {unread > 99 ? "99+" : unread}
          </span>
        ) : null}
      </Button>

      {open ? (
        <div
          role="dialog"
          aria-label="Notifications"
          className="absolute right-0 top-[calc(100%+0.35rem)] z-50 w-[min(22rem,calc(100vw-1.5rem))] overflow-hidden rounded-[var(--bs-radius)] border border-line bg-white shadow-soft"
        >
          <div className="flex items-center justify-between gap-2 border-b border-line px-3 py-2.5">
            <div>
              <p className="text-sm font-bold text-ink">Notifications</p>
              <p className="text-[11px] text-slate-500">{unread ? `${unread} unread` : "All caught up"}</p>
            </div>
            {unread > 0 ? (
              <button
                type="button"
                className="inline-flex items-center gap-1 rounded-[var(--bs-radius)] px-2 py-1 text-xs font-bold text-teal hover:bg-teal/10"
                onClick={() => {
                  markAllAsRead(tenantId, userEmail);
                  setTick((n) => n + 1);
                }}
              >
                <CheckCheck className="size-3.5" aria-hidden="true" />
                Mark all read
              </button>
            ) : null}
          </div>

          <div className="max-h-[min(24rem,60vh)] overflow-y-auto">
            {items.length === 0 ? (
              <p className="px-4 py-8 text-center text-sm text-slate-500">No notifications yet.</p>
            ) : (
              <ul className="divide-y divide-line">
                {items.map((n) => (
                  <li key={n.id}>
                    <button
                      type="button"
                      className={cn(
                        "flex w-full flex-col gap-0.5 px-3 py-2.5 text-left transition hover:bg-[color:var(--bs-cloud)]",
                        !n.is_read && "bg-teal-50/40"
                      )}
                      onClick={() => {
                        markAsRead(n.id);
                        setTick((x) => x + 1);
                        if (n.href) {
                          setOpen(false);
                          window.location.assign(n.href);
                        }
                      }}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <p className="text-sm font-semibold text-ink">{n.title}</p>
                        {!n.is_read ? (
                          <span className="mt-1 size-2 shrink-0 rounded-full bg-[color:var(--bs-teal)]" aria-hidden="true" />
                        ) : null}
                      </div>
                      <p className="line-clamp-2 text-xs text-slate-600">{n.message}</p>
                      <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">
                        {relativeTime(n.created_at)}
                        {n.event ? ` · ${n.event.replace(/_/g, " ")}` : ""}
                      </p>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div className="border-t border-line bg-[color:var(--bs-cloud)]/50 px-3 py-2">
            <NavLink
              href="/settings/notifications"
              className="block text-center text-xs font-bold text-teal hover:underline"
              onClick={() => setOpen(false)}
            >
              View all notifications
            </NavLink>
          </div>
        </div>
      ) : null}
    </div>
  );
}
