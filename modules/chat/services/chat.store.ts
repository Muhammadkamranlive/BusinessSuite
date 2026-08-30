import { loadPersisted, savePersisted } from "@/modules/core/services/local-persist";
import { listAdminUsers, type AdminUser } from "@/modules/admin/services/admin.store";
import { getRoleLabel } from "@/lib/permissions";

export type ChatNoticeKind = "message" | "notice";

export type ChatThread = {
  id: string;
  tenant_id: string;
  participant_emails: [string, string];
  last_body: string;
  last_at: string;
  last_from: string;
};

export type ChatMessage = {
  id: string;
  tenant_id: string;
  thread_id: string;
  from_email: string;
  from_name: string;
  body: string;
  kind: ChatNoticeKind;
  notice_title?: string;
  created_at: string;
  read_by: string[];
};

const STORAGE_KEY = "businesssuite:chat:v1";
const STORAGE_VERSION = 1;

function now() {
  return new Date().toISOString();
}

function id() {
  return crypto.randomUUID();
}

function pairKey(a: string, b: string): [string, string] {
  const left = a.trim().toLowerCase();
  const right = b.trim().toLowerCase();
  return left < right ? [left, right] : [right, left];
}

let threads: ChatThread[] = [];
let messages: ChatMessage[] = [];
let hydrated = false;

function persist() {
  savePersisted(STORAGE_KEY, { version: STORAGE_VERSION, threads, messages });
}

function hoursAgo(h: number) {
  return new Date(Date.now() - h * 3600_000).toISOString();
}

function seedAlpha() {
  const hr = { email: "hr@demo.com", name: "Sana Malik" };
  const employee = { email: "employee@demo.com", name: "Hassan Tariq" };
  const admin = { email: "admin@demo.com", name: "Ayesha Khan" };
  const manager = { email: "manager@demo.com", name: "Omar Farooq" };
  const finance = { email: "finance@demo.com", name: "Mariam Ali" };

  const tDocs = {
    id: "thread-hr-employee",
    tenant_id: "alpha",
    participant_emails: pairKey(hr.email, employee.email),
    last_body: "Please upload your CNIC copy from Required uploads so we can complete onboarding.",
    last_at: hoursAgo(2),
    last_from: hr.email
  } satisfies ChatThread;

  const tPayroll = {
    id: "thread-admin-hr",
    tenant_id: "alpha",
    participant_emails: pairKey(admin.email, hr.email),
    last_body: "Payroll cutoff is Thursday 17:00. Please confirm all timesheets are approved.",
    last_at: hoursAgo(5),
    last_from: admin.email
  } satisfies ChatThread;

  const tHours = {
    id: "thread-manager-employee",
    tenant_id: "alpha",
    participant_emails: pairKey(manager.email, employee.email),
    last_body: "Submitted 7.5 hours for 4 Aug on ERP Cloud Rollout. Ready for your review.",
    last_at: hoursAgo(20),
    last_from: employee.email
  } satisfies ChatThread;

  const tFinance = {
    id: "thread-finance-hr",
    tenant_id: "alpha",
    participant_emails: pairKey(finance.email, hr.email),
    last_body: "EOBI contribution file for July is ready. Please confirm headcount before we post.",
    last_at: hoursAgo(28),
    last_from: finance.email
  } satisfies ChatThread;

  threads = [tDocs, tPayroll, tHours, tFinance];
  messages = [
    {
      id: "m1",
      tenant_id: "alpha",
      thread_id: tDocs.id,
      from_email: hr.email,
      from_name: hr.name,
      kind: "notice",
      notice_title: "Document assigned",
      body: "CNIC / National ID was assigned to Hassan Tariq. Status: awaiting upload.",
      created_at: hoursAgo(6),
      read_by: [hr.email]
    },
    {
      id: "m2",
      tenant_id: "alpha",
      thread_id: tDocs.id,
      from_email: hr.email,
      from_name: hr.name,
      kind: "message",
      body: "Good morning Hassan. Please upload a clear scan of your CNIC from Documents → Required uploads. HR needs it before we can close your file.",
      created_at: hoursAgo(5.5),
      read_by: [hr.email]
    },
    {
      id: "m3",
      tenant_id: "alpha",
      thread_id: tDocs.id,
      from_email: employee.email,
      from_name: employee.name,
      kind: "message",
      body: "Noted — I will upload it today after my shift check-in.",
      created_at: hoursAgo(4),
      read_by: [hr.email, employee.email]
    },
    {
      id: "m4",
      tenant_id: "alpha",
      thread_id: tDocs.id,
      from_email: hr.email,
      from_name: hr.name,
      kind: "message",
      body: "Please upload your CNIC copy from Required uploads so we can complete onboarding.",
      created_at: hoursAgo(2),
      read_by: [hr.email]
    },
    {
      id: "m5",
      tenant_id: "alpha",
      thread_id: tPayroll.id,
      from_email: admin.email,
      from_name: admin.name,
      kind: "notice",
      notice_title: "Payroll cutoff",
      body: "Company policy: timesheets must be approved 48 hours before payroll run.",
      created_at: hoursAgo(8),
      read_by: [admin.email]
    },
    {
      id: "m6",
      tenant_id: "alpha",
      thread_id: tPayroll.id,
      from_email: admin.email,
      from_name: admin.name,
      kind: "message",
      body: "Payroll cutoff is Thursday 17:00. Please confirm all timesheets are approved.",
      created_at: hoursAgo(5),
      read_by: [admin.email]
    },
    {
      id: "m7",
      tenant_id: "alpha",
      thread_id: tHours.id,
      from_email: employee.email,
      from_name: employee.name,
      kind: "notice",
      notice_title: "Timesheet submitted",
      body: "7.5 hours · 4 Aug 2026 · ERP Cloud Rollout · status submitted.",
      created_at: hoursAgo(22),
      read_by: [employee.email]
    },
    {
      id: "m8",
      tenant_id: "alpha",
      thread_id: tHours.id,
      from_email: employee.email,
      from_name: employee.name,
      kind: "message",
      body: "Submitted 7.5 hours for 4 Aug on ERP Cloud Rollout. Ready for your review.",
      created_at: hoursAgo(20),
      read_by: [employee.email]
    },
    {
      id: "m9",
      tenant_id: "alpha",
      thread_id: tFinance.id,
      from_email: finance.email,
      from_name: finance.name,
      kind: "message",
      body: "EOBI contribution file for July is ready. Please confirm headcount before we post.",
      created_at: hoursAgo(28),
      read_by: [finance.email]
    }
  ];
}

function ensureHydrated() {
  if (hydrated) return;
  hydrated = true;
  const snap = loadPersisted<{ version: number; threads: ChatThread[]; messages: ChatMessage[] }>(STORAGE_KEY);
  if (snap?.version === STORAGE_VERSION && Array.isArray(snap.threads) && snap.threads.length) {
    threads = snap.threads;
    messages = snap.messages ?? [];
    return;
  }
  seedAlpha();
  persist();
}

export function listChatDirectory(tenantId: string, myEmail: string): AdminUser[] {
  const mine = myEmail.trim().toLowerCase();
  return listAdminUsers(tenantId)
    .filter((u) => u.status !== "blocked" && u.email.toLowerCase() !== mine)
    .sort((a, b) => a.name.localeCompare(b.name));
}

export function listChatThreads(tenantId: string, myEmail: string) {
  ensureHydrated();
  const mine = myEmail.trim().toLowerCase();
  return threads
    .filter((t) => t.tenant_id === tenantId && t.participant_emails.includes(mine))
    .sort((a, b) => b.last_at.localeCompare(a.last_at));
}

export function getChatThread(threadId: string) {
  ensureHydrated();
  return threads.find((t) => t.id === threadId) ?? null;
}

export function threadWith(tenantId: string, a: string, b: string) {
  ensureHydrated();
  const pair = pairKey(a, b);
  return threads.find(
    (t) => t.tenant_id === tenantId && t.participant_emails[0] === pair[0] && t.participant_emails[1] === pair[1]
  ) ?? null;
}

export function listChatMessages(threadId: string) {
  ensureHydrated();
  return messages
    .filter((m) => m.thread_id === threadId)
    .sort((a, b) => a.created_at.localeCompare(b.created_at));
}

export function unreadChatCount(tenantId: string, myEmail: string) {
  ensureHydrated();
  const mine = myEmail.trim().toLowerCase();
  const myThreads = new Set(
    threads.filter((t) => t.tenant_id === tenantId && t.participant_emails.includes(mine)).map((t) => t.id)
  );
  return messages.filter((m) => myThreads.has(m.thread_id) && m.from_email !== mine && !m.read_by.includes(mine)).length;
}

export function unreadInThread(threadId: string, myEmail: string) {
  ensureHydrated();
  const mine = myEmail.trim().toLowerCase();
  return messages.filter((m) => m.thread_id === threadId && m.from_email !== mine && !m.read_by.includes(mine)).length;
}

export function markThreadRead(threadId: string, myEmail: string) {
  ensureHydrated();
  const mine = myEmail.trim().toLowerCase();
  let changed = false;
  for (const m of messages) {
    if (m.thread_id !== threadId) continue;
    if (m.read_by.includes(mine)) continue;
    m.read_by = [...m.read_by, mine];
    changed = true;
  }
  if (changed) persist();
}

export function openOrCreateThread(tenantId: string, myEmail: string, otherEmail: string) {
  ensureHydrated();
  const existing = threadWith(tenantId, myEmail, otherEmail);
  if (existing) return existing;
  const row: ChatThread = {
    id: id(),
    tenant_id: tenantId,
    participant_emails: pairKey(myEmail, otherEmail),
    last_body: "",
    last_at: now(),
    last_from: myEmail.trim().toLowerCase()
  };
  threads.unshift(row);
  persist();
  return row;
}

export function sendChatMessage(input: {
  tenantId: string;
  threadId: string;
  fromEmail: string;
  fromName: string;
  body: string;
  kind?: ChatNoticeKind;
  noticeTitle?: string;
}) {
  ensureHydrated();
  const body = input.body.trim();
  if (!body) throw new Error("Type a message first.");
  const thread = threads.find((t) => t.id === input.threadId);
  if (!thread) throw new Error("Conversation not found.");
  const from = input.fromEmail.trim().toLowerCase();
  const row: ChatMessage = {
    id: id(),
    tenant_id: input.tenantId,
    thread_id: input.threadId,
    from_email: from,
    from_name: input.fromName,
    body,
    kind: input.kind ?? "message",
    notice_title: input.noticeTitle,
    created_at: now(),
    read_by: [from]
  };
  messages.push(row);
  thread.last_body = body;
  thread.last_at = row.created_at;
  thread.last_from = from;
  persist();
  return row;
}

export function otherParticipant(thread: ChatThread, myEmail: string) {
  const mine = myEmail.trim().toLowerCase();
  return thread.participant_emails.find((e) => e !== mine) ?? thread.participant_emails[0];
}

export function directoryLabel(user: AdminUser) {
  return `${user.name} · ${getRoleLabel(user.role)}`;
}
