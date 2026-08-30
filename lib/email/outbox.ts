import type { ComposeEmailInput, SendRawEmailInput, SendTemplatedEmailInput } from "@/lib/email/types";
import { sendComposedEmail, sendRawEmail, sendTemplatedEmail } from "@/lib/email/client";
import { loadPersisted, savePersisted } from "@/modules/core/services/local-persist";

const STORAGE_KEY = "businesssuite:email-outbox:v1";
const MAX_ATTEMPTS = 5;
const FLUSH_INTERVAL_MS = 2500;
const MAX_JOBS = 200;

export type OutboxJobStatus = "pending" | "sending" | "sent" | "failed";

export type OutboxJob = {
  id: string;
  created_at: string;
  updated_at: string;
  status: OutboxJobStatus;
  attempts: number;
  last_error?: string | null;
  kind: "templated" | "raw" | "compose";
  payload: SendTemplatedEmailInput | SendRawEmailInput | ComposeEmailInput;
};

let jobs: OutboxJob[] = [];
let hydrated = false;
let flushing = false;
let timer: ReturnType<typeof setInterval> | null = null;

function now() {
  return new Date().toISOString();
}

function ensureHydrated() {
  if (hydrated) return;
  hydrated = true;
  jobs = loadPersisted<OutboxJob[]>(STORAGE_KEY) ?? [];
}

function persist() {
  ensureHydrated();
  savePersisted(STORAGE_KEY, jobs.slice(0, MAX_JOBS));
  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent("businesssuite:email-outbox"));
  }
}

export function listOutboxJobs(opts?: { status?: OutboxJobStatus }) {
  ensureHydrated();
  if (!opts?.status) return [...jobs];
  return jobs.filter((j) => j.status === opts.status);
}

export function getOutboxPendingCount() {
  ensureHydrated();
  return jobs.filter((j) => j.status === "pending" || j.status === "sending").length;
}

export function enqueueTemplatedEmail(payload: SendTemplatedEmailInput) {
  return enqueue({ kind: "templated", payload });
}

export function enqueueRawEmail(payload: SendRawEmailInput) {
  return enqueue({ kind: "raw", payload });
}

export function enqueueComposeEmail(payload: ComposeEmailInput) {
  return enqueue({ kind: "compose", payload });
}

function enqueue(input: {
  kind: OutboxJob["kind"];
  payload: OutboxJob["payload"];
}) {
  ensureHydrated();
  const job: OutboxJob = {
    id: crypto.randomUUID(),
    created_at: now(),
    updated_at: now(),
    status: "pending",
    attempts: 0,
    last_error: null,
    kind: input.kind,
    payload: input.payload
  };
  jobs.unshift(job);
  persist();
  startOutboxWorker();
  void flushOutbox();
  return job;
}

async function sendJob(job: OutboxJob) {
  if (job.kind === "templated") {
    return sendTemplatedEmail(job.payload as SendTemplatedEmailInput);
  }
  if (job.kind === "raw") {
    return sendRawEmail(job.payload as SendRawEmailInput);
  }
  return sendComposedEmail(job.payload as ComposeEmailInput);
}

/** Process pending jobs (retries with cap). Safe to call often. */
export async function flushOutbox() {
  if (typeof window === "undefined") return { sent: 0, failed: 0 };
  ensureHydrated();
  if (flushing) return { sent: 0, failed: 0 };
  flushing = true;
  let sent = 0;
  let failed = 0;
  try {
    const pending = jobs.filter((j) => j.status === "pending" || (j.status === "failed" && j.attempts < MAX_ATTEMPTS));
    for (const job of pending.slice(0, 8)) {
      const idx = jobs.findIndex((j) => j.id === job.id);
      if (idx < 0) continue;
      jobs[idx] = { ...jobs[idx], status: "sending", updated_at: now() };
      persist();
      try {
        const res = await sendJob(jobs[idx]);
        if (!res.ok) throw new Error(res.error || "Send failed");
        jobs[idx] = {
          ...jobs[idx],
          status: "sent",
          attempts: jobs[idx].attempts + 1,
          last_error: null,
          updated_at: now()
        };
        sent += 1;
      } catch (err) {
        const attempts = jobs[idx].attempts + 1;
        const message = err instanceof Error ? err.message : "Send failed";
        jobs[idx] = {
          ...jobs[idx],
          status: attempts >= MAX_ATTEMPTS ? "failed" : "pending",
          attempts,
          last_error: message,
          updated_at: now()
        };
        if (attempts >= MAX_ATTEMPTS) failed += 1;
      }
      persist();
    }
  } finally {
    flushing = false;
  }
  return { sent, failed };
}

/** Start background auto-flush (idempotent). */
export function startOutboxWorker() {
  if (typeof window === "undefined") return;
  ensureHydrated();
  if (timer) return;
  timer = setInterval(() => {
    void flushOutbox();
  }, FLUSH_INTERVAL_MS);
  void flushOutbox();
}

export function stopOutboxWorker() {
  if (timer) {
    clearInterval(timer);
    timer = null;
  }
}
