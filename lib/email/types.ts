/** Built-in template keys — keep in sync with email-api/src/templates/seed.js */
export const EmailTemplateKey = {
  UserCredentials: "user.credentials",
  LeaveSubmitted: "leave.submitted",
  LeaveApproved: "leave.approved",
  LeaveRejected: "leave.rejected",
  InvoiceGenerated: "invoice.generated",
  OrderApproved: "order.approved",
  SurveyAssigned: "survey.assigned",
  GenericNotification: "generic.notification",
  SecurityLogin: "security.login",
  SecurityPasswordChanged: "security.password_changed",
  AccountProfileUpdated: "account.profile_updated",
  AccountCreated: "account.created",
  SubscriptionActivated: "subscription.activated"
} as const;

export type EmailTemplateKeyValue = (typeof EmailTemplateKey)[keyof typeof EmailTemplateKey];

export type EmailAttachmentPayload = {
  filename: string;
  content: string; // base64 (raw or data-URL)
  contentType?: string;
};

export type SendTemplatedEmailInput = {
  to: string | string[];
  templateKey: EmailTemplateKeyValue | string;
  variables?: Record<string, string | number | null | undefined>;
  tenantId?: string;
  cc?: string | string[];
  bcc?: string | string[];
  replyTo?: string;
  subject?: string;
  html?: string;
  text?: string;
  attachments?: EmailAttachmentPayload[];
  meta?: Record<string, unknown>;
};

export type SendRawEmailInput = {
  to: string | string[];
  subject: string;
  html?: string;
  text?: string;
  tenantId?: string;
  cc?: string | string[];
  bcc?: string | string[];
  replyTo?: string;
  attachments?: EmailAttachmentPayload[];
  meta?: Record<string, unknown>;
};

export type ComposeEmailInput = {
  to: string | string[];
  subject: string;
  html?: string;
  text?: string;
  cc?: string | string[];
  bcc?: string | string[];
  replyTo?: string;
  tenantId?: string;
  templateKey?: string;
  templateId?: string;
  variables?: Record<string, string | number | null | undefined>;
  attachments?: EmailAttachmentPayload[];
  meta?: Record<string, unknown>;
};

export type EmailTemplate = {
  id: string;
  key: string;
  name: string;
  category: string;
  description: string;
  subject: string;
  html: string;
  text: string;
  variables: string[];
  is_system: boolean;
  is_active: boolean;
  created_at: string;
  updated_at: string;
};

/** Prefill when opening the composer from a module or record. */
export type ComposeEmailDraft = {
  sourceModule?: string;
  to?: string;
  cc?: string;
  bcc?: string;
  subject?: string;
  html?: string;
  text?: string;
  templateKey?: string;
  variables?: Record<string, string>;
};
