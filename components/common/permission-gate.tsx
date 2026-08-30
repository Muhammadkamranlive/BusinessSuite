"use client";

import { hasPermission, type RoleKey } from "@/lib/permissions";

export function PermissionGate({
  role,
  permission,
  children,
  fallback = null
}: {
  role: RoleKey;
  permission?: string;
  children: React.ReactNode;
  fallback?: React.ReactNode;
}) {
  if (!hasPermission(role, permission)) return <>{fallback}</>;
  return <>{children}</>;
}
