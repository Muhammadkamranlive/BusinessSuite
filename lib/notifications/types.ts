import type { AuditAction, NotificationEntry, UUID } from "@/modules/core/types";

export type NotificationType = NotificationEntry["type"];

export type NotifyEventKind =
  | "login"
  | "login_new_device"
  | "password_changed"
  | "profile_updated"
  | "account_created"
  | "subscription_activated"
  | "user_invited"
  | "generic";

export type EmitUserAlertInput = {
  kind: NotifyEventKind;
  tenantId: UUID;
  /** Recipient email — used for in-app filter + email send */
  toEmail: string;
  userName?: string;
  title: string;
  message: string;
  type?: NotificationType;
  href?: string;
  /** When set, queues a templated email via the outbox */
  emailTemplateKey?: string;
  emailVariables?: Record<string, string | number | null | undefined>;
  skipEmail?: boolean;
  skipInApp?: boolean;
  skipAudit?: boolean;
  auditModule?: string;
  auditAction?: AuditAction;
  meta?: Record<string, unknown>;
};
