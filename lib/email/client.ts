import type {
  ComposeEmailInput,
  EmailTemplate,
  SendRawEmailInput,
  SendTemplatedEmailInput
} from "@/lib/email/types";

type ApiResult<T> = { ok: boolean; error?: string } & T;

async function emailFetch<T>(path: string, init?: RequestInit): Promise<ApiResult<T>> {
  try {
    const res = await fetch(`/api/email${path}`, {
      ...init,
      headers: {
        "Content-Type": "application/json",
        ...(init?.headers || {})
      }
    });
    const json = (await res.json()) as ApiResult<T>;
    if (!res.ok || !json.ok) {
      return { ok: false, error: json.error || `Email API ${res.status}` } as ApiResult<T>;
    }
    return json;
  } catch (err) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : "Email request failed"
    } as ApiResult<T>;
  }
}

/** Fire-and-forget safe wrapper for client stores (never throws). */
export async function sendTemplatedEmail(input: SendTemplatedEmailInput) {
  return emailFetch<{ result?: unknown; log?: unknown }>("/send", {
    method: "POST",
    body: JSON.stringify(input)
  });
}

export async function sendRawEmail(input: SendRawEmailInput) {
  return emailFetch<{ result?: unknown; log?: unknown }>("/send", {
    method: "POST",
    body: JSON.stringify(input)
  });
}

/** Compose send — raw and/or template + attachments. */
export async function sendComposedEmail(input: ComposeEmailInput) {
  return emailFetch<{ result?: { dryRun?: boolean; messageId?: string }; log?: unknown }>("/send", {
    method: "POST",
    body: JSON.stringify(input)
  });
}

export async function listEmailTemplates(opts?: { activeOnly?: boolean }) {
  const qs = opts?.activeOnly ? "?activeOnly=true" : "";
  return emailFetch<{ templates: EmailTemplate[] }>(`/templates${qs}`);
}

export async function getEmailTemplate(id: string) {
  return emailFetch<{ template: EmailTemplate }>(`/templates/${encodeURIComponent(id)}`);
}

export async function createEmailTemplate(input: Partial<EmailTemplate>) {
  return emailFetch<{ template: EmailTemplate }>("/templates", {
    method: "POST",
    body: JSON.stringify(input)
  });
}

export async function updateEmailTemplate(id: string, patch: Partial<EmailTemplate>) {
  return emailFetch<{ template: EmailTemplate }>(`/templates/${encodeURIComponent(id)}`, {
    method: "PUT",
    body: JSON.stringify(patch)
  });
}

export async function deleteEmailTemplate(id: string) {
  return emailFetch<Record<string, never>>(`/templates/${encodeURIComponent(id)}`, {
    method: "DELETE"
  });
}

export async function previewEmailTemplate(input: {
  templateKey?: string;
  templateId?: string;
  subject?: string;
  html?: string;
  text?: string;
  variables?: Record<string, string>;
}) {
  return emailFetch<{ preview: { subject: string; html: string; text: string } }>("/templates/preview", {
    method: "POST",
    body: JSON.stringify(input)
  });
}

export async function resetSystemEmailTemplates() {
  return emailFetch<{ templates: EmailTemplate[] }>("/templates/reset-system", { method: "POST" });
}

export async function emailApiHealth() {
  return emailFetch<{ service?: string; dryRun?: boolean; mail?: unknown }>("/health");
}

/** Queue email on the durable outbox (auto-flushed by background worker). */
export function queueTemplatedEmail(input: SendTemplatedEmailInput) {
  if (typeof window === "undefined") {
    void sendTemplatedEmail(input);
    return;
  }
  void import("@/lib/email/outbox").then(({ enqueueTemplatedEmail, startOutboxWorker }) => {
    startOutboxWorker();
    enqueueTemplatedEmail(input);
  });
}
