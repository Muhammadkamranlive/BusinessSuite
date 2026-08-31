import { appBaseUrl } from "@/lib/email/triggers";
import { enqueueTemplatedEmail, startOutboxWorker } from "@/lib/email/outbox";
import { EmailTemplateKey } from "@/lib/email/types";
import { captureDeviceInfo, formatDeviceLabel } from "@/lib/auth/device";
import { recordLoginSession } from "@/lib/auth/login-sessions";
import { loginEmailHandledByAutomation } from "@/lib/automation/login-email-policy";
import { getSystemSettings } from "@/modules/admin/services/admin.store";
import type { EmitUserAlertInput } from "@/lib/notifications/types";
import { logAction } from "@/modules/core/services/audit.service";
import { createNotification } from "@/modules/core/services/notification.service";

function companyName() {
  try {
    return getSystemSettings().companyName?.trim() || "BusinessSuite";
  } catch {
    return "BusinessSuite";
  }
}

/** Central automation: in-app notification + email outbox + audit. */
export function emitUserAlert(input: EmitUserAlertInput) {
  if (typeof window !== "undefined") startOutboxWorker();

  const email = input.toEmail.trim().toLowerCase();
  if (!email) return null;

  let notification = null as ReturnType<typeof createNotification> | null;
  if (!input.skipInApp) {
    notification = createNotification({
      tenantId: input.tenantId,
      userEmail: email,
      title: input.title,
      message: input.message,
      type: input.type ?? "info",
      targetModule: input.auditModule,
      href: input.href ?? null,
      event: input.kind
    });
  }

  if (!input.skipEmail && input.emailTemplateKey) {
    enqueueTemplatedEmail({
      to: email,
      tenantId: input.tenantId,
      templateKey: input.emailTemplateKey,
      variables: {
        company_name: companyName(),
        user_name: input.userName || email,
        user_email: email,
        ...(input.emailVariables || {})
      },
      meta: { event: input.kind, ...(input.meta || {}) }
    });
  }

  if (!input.skipAudit) {
    logAction({
      tenantId: input.tenantId,
      module: input.auditModule || "security",
      action: input.auditAction || "update",
      entityName: input.kind,
      newData: {
        to: email,
        title: input.title,
        ...(input.meta || {})
      }
    });
  }

  return notification;
}

/** Login tracking + alerts (device / browser fingerprint). */
export function automateLoginEvent(input: {
  email: string;
  name?: string;
  tenantId: string;
  userId?: string;
}) {
  const session = recordLoginSession({ email: input.email, tenantId: input.tenantId });
  const device = session.device;
  const label = session.label || formatDeviceLabel(device);
  const when = new Date(session.at).toLocaleString();
  const isNew = session.is_new_device;
  const skipBuiltInLoginEmail = loginEmailHandledByAutomation(input.tenantId);

  emitUserAlert({
    kind: isNew ? "login_new_device" : "login",
    tenantId: input.tenantId,
    toEmail: input.email,
    userName: input.name,
    title: isNew ? "New device sign-in" : "Successful sign-in",
    message: isNew
      ? `New ${label} signed in at ${when} (${device.timezone}). If this wasn’t you, change your password.`
      : `Signed in from ${label} at ${when}.`,
    type: isNew ? "warning" : "info",
    href: "/profile",
    skipInApp: true,
    skipEmail: skipBuiltInLoginEmail,
    emailTemplateKey: EmailTemplateKey.SecurityLogin,
    emailVariables: {
      device_label: label,
      browser: device.browser,
      os: device.os,
      device_type: device.deviceType,
      timezone: device.timezone,
      language: device.language,
      screen: device.screen,
      signed_in_at: when,
      is_new_device: isNew ? "yes" : "no",
      action_url: `${appBaseUrl()}/profile`
    },
    auditModule: "auth",
    auditAction: "login",
    meta: {
      fingerprint: device.fingerprint,
      is_new_device: isNew,
      userAgent: device.userAgent
    }
  });

  void (async () => {
    const payload = {
      user_email: input.email,
      user_name: input.name || "",
      device_label: label,
      browser: device.browser,
      os: device.os,
      is_new_device: isNew ? "yes" : "no",
      signed_in_at: when
    };

    let skipEmailActions = false;
    try {
      const settings = getSystemSettings();
      const res = await fetch("/api/automation/emit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          tenantId: input.tenantId,
          module: "platform",
          eventKey: "auth.login",
          title: isNew ? "New device sign-in" : "Successful sign-in",
          actorEmail: input.email,
          payload,
          supportEmail: settings.supportEmail,
          companyName: settings.companyName
        })
      });
      const json = (await res.json()) as { ok?: boolean };
      if (json.ok) skipEmailActions = true;
    } catch {
      /* fall back to client rules + outbox */
    }

    const { emitBusinessEvent } = await import("@/lib/automation/runtime");
    emitBusinessEvent({
      tenantId: input.tenantId,
      module: "platform",
      eventKey: "auth.login",
      title: isNew ? "New device sign-in" : "Successful sign-in",
      actorEmail: input.email,
      payload,
      skipEmailActions
    });
  })();

  return session;
}

export function automatePasswordChanged(input: {
  email: string;
  name?: string;
  tenantId: string;
  byAdmin?: boolean;
}) {
  const device = captureDeviceInfo();
  emitUserAlert({
    kind: "password_changed",
    tenantId: input.tenantId,
    toEmail: input.email,
    userName: input.name,
    title: "Password changed",
    message: input.byAdmin
      ? `An administrator reset your password from ${formatDeviceLabel(device)}.`
      : `Your password was changed from ${formatDeviceLabel(device)}.`,
    type: "warning",
    href: "/profile",
    emailTemplateKey: EmailTemplateKey.SecurityPasswordChanged,
    emailVariables: {
      device_label: formatDeviceLabel(device),
      changed_at: new Date().toLocaleString(),
      changed_by: input.byAdmin ? "administrator" : "you",
      action_url: `${appBaseUrl()}/login`
    },
    auditModule: "auth",
    auditAction: "update",
    meta: { byAdmin: Boolean(input.byAdmin), fingerprint: device.fingerprint }
  });
}

export function automateProfileUpdated(input: {
  email: string;
  name?: string;
  tenantId: string;
  summary?: string;
}) {
  emitUserAlert({
    kind: "profile_updated",
    tenantId: input.tenantId,
    toEmail: input.email,
    userName: input.name,
    title: "Profile updated",
    message: input.summary || "Your profile details were updated.",
    type: "success",
    href: "/profile",
    emailTemplateKey: EmailTemplateKey.AccountProfileUpdated,
    emailVariables: {
      summary: input.summary || "Your profile details were updated.",
      updated_at: new Date().toLocaleString(),
      action_url: `${appBaseUrl()}/profile`
    },
    auditModule: "dashboard",
    auditAction: "update"
  });
}

export function automateAccountCreated(input: {
  email: string;
  name?: string;
  tenantId: string;
  roleLabel?: string;
}) {
  emitUserAlert({
    kind: "account_created",
    tenantId: input.tenantId,
    toEmail: input.email,
    userName: input.name,
    title: "Welcome to BusinessSuite",
    message: `Your account was created${input.roleLabel ? ` as ${input.roleLabel}` : ""}.`,
    type: "success",
    href: "/dashboard",
    emailTemplateKey: EmailTemplateKey.AccountCreated,
    emailVariables: {
      role_label: input.roleLabel || "User",
      login_url: `${appBaseUrl()}/login`
    },
    auditModule: "auth",
    auditAction: "create"
  });
}

export function automateSubscriptionActivated(input: {
  email: string;
  name?: string;
  tenantId: string;
  packageCode: string;
  amountLabel?: string;
  interval?: string;
}) {
  emitUserAlert({
    kind: "subscription_activated",
    tenantId: input.tenantId,
    toEmail: input.email,
    userName: input.name,
    title: "Subscription activated",
    message: `Plan ${input.packageCode} is active${input.amountLabel ? ` (${input.amountLabel})` : ""}.`,
    type: "success",
    href: "/settings/billing",
    emailTemplateKey: EmailTemplateKey.SubscriptionActivated,
    emailVariables: {
      package_code: input.packageCode,
      amount: input.amountLabel || "",
      interval: input.interval || "",
      billing_url: `${appBaseUrl()}/settings/billing`
    },
    auditModule: "billing",
    auditAction: "approve"
  });
}
