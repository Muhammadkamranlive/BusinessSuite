import type { SendTemplatedEmailInput } from "@/lib/email/types";
import { emailApiBase, emailApiHeaders } from "@/lib/email/server";

/** Server-side send — bypasses browser outbox. */
export async function sendEmailDirect(input: SendTemplatedEmailInput) {
  const url = `${emailApiBase()}/send`;
  const res = await fetch(url, {
    method: "POST",
    headers: emailApiHeaders(),
    body: JSON.stringify(input),
    cache: "no-store"
  });
  const json = (await res.json()) as { ok?: boolean; error?: string; result?: unknown };
  return { ok: res.ok && Boolean(json.ok), error: json.error, result: json.result };
}
