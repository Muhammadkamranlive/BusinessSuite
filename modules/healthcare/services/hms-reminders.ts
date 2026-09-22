/**
 * Appointment reminder queue — generic payloads only (no PHI in titles/bodies).
 * Uses hms-clinical.store reminder queue (synced to hms_reminder_queue when Supabase enabled).
 */

import type { UUID } from "@/modules/core/types";
import { EmailTemplateKey } from "@/lib/email/types";
import { emitUserAlert } from "@/lib/notifications/automate";
import {
  createNotification,
  enqueueReminder,
  listReminderQueue,
  markReminderSent
} from "@/modules/healthcare/services/hms-clinical.store";

function reminderSendAt(scheduledAt: string): string | null {
  const appt = new Date(scheduledAt).getTime();
  if (Number.isNaN(appt)) return null;
  const sendAt = appt - 24 * 60 * 60 * 1000;
  if (sendAt <= Date.now()) return new Date().toISOString();
  return new Date(sendAt).toISOString();
}

/** Queue a generic appointment reminder 24h before scheduled_at. */
export function queueAppointmentReminder(
  tenantId: UUID,
  appointmentId: UUID,
  scheduledAt: string,
  recipientEmail?: string | null
) {
  return rescheduleAppointmentReminder(tenantId, appointmentId, scheduledAt, recipientEmail);
}

/** Reschedule reminder when appointment time changes. */
export function rescheduleAppointmentReminder(
  tenantId: UUID,
  appointmentId: UUID,
  scheduledAt: string,
  recipientEmail?: string | null
) {
  const sendAt = reminderSendAt(scheduledAt);
  const email = recipientEmail?.trim().toLowerCase();
  if (!sendAt || !email) return null;

  const pending = listReminderQueue(tenantId, "pending").find(
    (r) =>
      r.template_key === "appointment_reminder" &&
      (r.payload_generic as { appointment_id?: string }).appointment_id === appointmentId
  );
  if (pending) {
    pending.scheduled_at = sendAt;
    pending.recipient_email = email;
    return pending;
  }

  return enqueueReminder(tenantId, {
    channel: "email",
    template_key: "appointment_reminder",
    recipient_email: email,
    recipient_phone: null,
    payload_generic: { kind: "appointment_reminder", appointment_id: appointmentId },
    scheduled_at: sendAt
  });
}

export function listPendingReminders(tenantId: UUID) {
  return listReminderQueue(tenantId, "pending").filter((r) => r.template_key === "appointment_reminder");
}

/** Process due reminders — generic message only, no patient name/MRN in title. */
export function processReminderQueue(tenantId: UUID): { sent: number; skipped: number } {
  const now = Date.now();
  let sent = 0;
  let skipped = 0;

  for (const item of listReminderQueue(tenantId, "pending")) {
    if (new Date(item.scheduled_at).getTime() > now) continue;

    const email = item.recipient_email?.trim().toLowerCase();
    if (!email) {
      markReminderSent(item.id, true);
      skipped++;
      continue;
    }

    createNotification(tenantId, {
      recipient_ref: email,
      channel: "in_app",
      title: "Upcoming appointment",
      body_generic: "You have an upcoming appointment.",
      kind: "appointment_reminder"
    });

    emitUserAlert({
      kind: "generic",
      tenantId,
      toEmail: email,
      title: "Upcoming appointment",
      message: "You have an upcoming appointment.",
      emailTemplateKey: EmailTemplateKey.GenericNotification,
      emailVariables: {
        notification_title: "Upcoming appointment",
        notification_body: "You have an upcoming appointment."
      },
      skipAudit: true,
      auditModule: "healthcare"
    });

    markReminderSent(item.id, false);
    sent++;
  }

  return { sent, skipped };
}
