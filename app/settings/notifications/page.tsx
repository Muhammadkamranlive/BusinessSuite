"use client";

import { useEffect, useMemo, useState } from "react";
import { BellRing } from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { AdminSubnav } from "@/components/admin/admin-subnav";
import { ModuleBreadcrumbs } from "@/components/common/module-breadcrumbs";
import { PageHeader } from "@/components/common/page-header";
import { Badge, Button, Panel } from "@/components/ui";
import { getStoredTenantId } from "@/lib/auth/session";
import { createNotification } from "@/modules/core/services/notification.service";
import { listAdminNotifications, markNotificationRead } from "@/modules/admin/services/admin.store";
import type { NotificationEntry } from "@/modules/core/types";
import { cn } from "@/lib/utils";

export default function NotificationsPage() {
  const tenantId = getStoredTenantId() ?? "alpha";
  const [items, setItems] = useState<NotificationEntry[]>([]);
  const [filter, setFilter] = useState<"all" | "unread">("all");

  function refresh() {
    setItems(listAdminNotifications(tenantId));
  }

  useEffect(() => {
    refresh();
  }, [tenantId]);

  useEffect(() => {
    function onUpdate() {
      refresh();
    }
    window.addEventListener("businesssuite:notifications", onUpdate);
    return () => window.removeEventListener("businesssuite:notifications", onUpdate);
  }, [tenantId]);

  const visible = useMemo(() => {
    if (filter === "unread") return items.filter((n) => !n.is_read);
    return items;
  }, [items, filter]);

  const unread = items.filter((n) => !n.is_read).length;

  return (
    <AppShell activeModule="settings">
      <ModuleBreadcrumbs />
      <PageHeader
        title="Notifications"
        description="Operational alerts for invites, security, and admin actions."
      />
      <AdminSubnav active="/settings/notifications" />

      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex gap-2">
          <Button variant={filter === "all" ? "primary" : "secondary"} onClick={() => setFilter("all")}>All</Button>
          <Button variant={filter === "unread" ? "primary" : "secondary"} onClick={() => setFilter("unread")}>
            Unread ({unread})
          </Button>
        </div>
        <Button
          variant="secondary"
          onClick={() => {
            createNotification({
              tenantId,
              title: "Manual admin broadcast",
              message: "Test notification from Administration console.",
              type: "info",
              targetModule: "settings"
            });
            refresh();
          }}
        >
          <BellRing className="size-4" />
          Send test alert
        </Button>
      </div>

      <div className="space-y-3">
        {visible.length === 0 ? (
          <Panel className="p-8 text-center text-sm text-slate-500">No notifications in this filter.</Panel>
        ) : (
          visible.map((n) => (
            <Panel
              key={n.id}
              className={cn("p-4 transition", !n.is_read && "border-teal/40 bg-teal-50/30")}
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="font-bold text-ink">{n.title}</p>
                    <Badge tone={n.type === "warning" ? "warning" : n.type === "success" ? "success" : n.type === "error" ? "danger" : "info"}>
                      {n.type}
                    </Badge>
                    {!n.is_read ? <Badge tone="warning">unread</Badge> : null}
                  </div>
                  <p className="mt-1 text-sm text-slate-600">{n.message}</p>
                  <p className="mt-2 text-xs text-slate-400">{new Date(n.created_at).toLocaleString()}</p>
                </div>
                {!n.is_read ? (
                  <Button
                    variant="secondary"
                    className="!min-h-9 !text-xs"
                    onClick={() => {
                      markNotificationRead(n.id);
                      refresh();
                    }}
                  >
                    Mark read
                  </Button>
                ) : null}
              </div>
            </Panel>
          ))
        )}
      </div>
    </AppShell>
  );
}
