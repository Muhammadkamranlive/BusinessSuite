"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { ArrowLeft, Info, MessageSquare, Search, Send, Users, X } from "lucide-react";
import { ChatPerson, ContactProfileBody, PersonaHover } from "@/components/chat/persona-card";
import { Badge, Button, TextArea, TextInput } from "@/components/ui";
import { getStoredTenantId } from "@/lib/auth/session";
import { getSessionProfile } from "@/lib/auth/session-profile";
import { cn } from "@/lib/utils";
import { resolveChatContact, type ChatContact } from "@/modules/chat/services/chat-contact";
import {
  listChatDirectory,
  listChatMessages,
  listChatThreads,
  markThreadRead,
  openOrCreateThread,
  otherParticipant,
  sendChatMessage,
  unreadChatCount,
  unreadInThread,
  type ChatMessage,
  type ChatThread
} from "@/modules/chat/services/chat.store";

function formatTime(iso: string) {
  const d = new Date(iso);
  const sameDay = d.toDateString() === new Date().toDateString();
  return sameDay
    ? d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
    : d.toLocaleString([], { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" });
}

function formatListTime(iso: string) {
  const d = new Date(iso);
  const now = new Date();
  if (d.toDateString() === now.toDateString()) {
    return d.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
  }
  const yesterday = new Date(now);
  yesterday.setDate(now.getDate() - 1);
  if (d.toDateString() === yesterday.toDateString()) return "Yesterday";
  return d.toLocaleDateString([], { month: "short", day: "numeric" });
}

function groupedWithPrevious(messages: ChatMessage[], index: number) {
  const message = messages[index];
  const prev = messages[index - 1];
  if (!prev || message.kind === "notice" || prev.kind === "notice") return false;
  if (prev.from_email.toLowerCase() !== message.from_email.toLowerCase()) return false;
  return new Date(message.created_at).getTime() - new Date(prev.created_at).getTime() < 5 * 60_000;
}

export function WorkspaceChat() {
  const tenantId = getStoredTenantId() ?? "alpha";
  const profile = getSessionProfile();
  const [open, setOpen] = useState(false);
  const [tick, setTick] = useState(0);
  const [pane, setPane] = useState<"chat" | "contacts">("chat");
  const [query, setQuery] = useState("");
  const [draft, setDraft] = useState("");
  const [threadId, setThreadId] = useState<string | null>(null);
  const [profileOpen, setProfileOpen] = useState(false);
  const [error, setError] = useState("");
  const endRef = useRef<HTMLDivElement>(null);

  const directory = useMemo(() => listChatDirectory(tenantId, profile.email), [tenantId, profile.email, tick]);
  const threads = useMemo(() => listChatThreads(tenantId, profile.email), [tenantId, profile.email, tick]);
  const unread = useMemo(() => unreadChatCount(tenantId, profile.email), [tenantId, profile.email, tick]);
  const active = threads.find((t) => t.id === threadId) ?? null;
  const messages = useMemo(() => (threadId ? listChatMessages(threadId) : []), [threadId, tick]);

  const people = useMemo(() => {
    const q = query.trim().toLowerCase();
    const contacts = directory.map((u) => resolveChatContact(tenantId, u.email, u.name));
    if (!q) return contacts;
    return contacts.filter((c) =>
      `${c.name} ${c.email} ${c.title} ${c.department ?? ""} ${c.phone ?? ""}`.toLowerCase().includes(q)
    );
  }, [directory, query, tenantId]);

  const other: ChatContact | null = active
    ? resolveChatContact(tenantId, otherParticipant(active, profile.email))
    : null;

  useEffect(() => {
    if (!open) return;
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [open, threadId, messages.length]);

  function refresh() {
    setTick((n) => n + 1);
  }

  function openThread(thread: ChatThread) {
    setThreadId(thread.id);
    setPane("chat");
    markThreadRead(thread.id, profile.email);
    refresh();
  }

  function startWith(email: string) {
    const thread = openOrCreateThread(tenantId, profile.email, email);
    openThread(thread);
  }

  function send() {
    if (!threadId) return;
    setError("");
    try {
      sendChatMessage({
        tenantId,
        threadId,
        fromEmail: profile.email,
        fromName: profile.name,
        body: draft
      });
      setDraft("");
      refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not send");
    }
  }

  return (
    <>
      <button
        type="button"
        className="bs-chat-fab"
        onClick={() => setOpen(true)}
        aria-label={unread ? `Open chat, ${unread} unread` : "Open chat"}
      >
        <MessageSquare className="size-5" aria-hidden="true" />
        {unread ? <span className="bs-chat-fab-badge">{unread > 9 ? "9+" : unread}</span> : null}
      </button>

      {open ? (
        <div className="bs-chat-root">
          <button type="button" className="bs-chat-overlay" aria-label="Close chat" onClick={() => setOpen(false)} />
          <aside
            className={cn("bs-chat-drawer", active && profileOpen ? "bs-chat-drawer-wide" : "")}
            role="dialog"
            aria-modal="true"
            aria-label="Chat"
          >
            <header className="bs-chat-head">
              <div className="min-w-0">
                <h2 className="truncate text-base font-bold text-ink">Chat</h2>
                <p className="truncate text-xs text-slate-500">Like Microsoft Teams — hover a photo for the full profile</p>
              </div>
              <button
                type="button"
                className="inline-flex size-11 items-center justify-center rounded-[var(--bs-radius)] text-slate-500 hover:bg-cloud"
                aria-label="Close chat"
                onClick={() => setOpen(false)}
              >
                <X className="size-5" />
              </button>
            </header>

            <div className={cn("bs-chat-body", active ? "bs-chat-body-thread" : "")}>
              <section className={cn("bs-chat-list", active ? "hidden md:flex" : "flex")}>
                <div className="bs-chat-rail-tabs" role="tablist" aria-label="Chat sections">
                  <button
                    type="button"
                    role="tab"
                    aria-selected={pane === "chat"}
                    className={cn("bs-chat-rail-tab", pane === "chat" ? "is-active" : "")}
                    onClick={() => setPane("chat")}
                  >
                    <MessageSquare className="size-4" />
                    Chat
                    {unread ? <span className="bs-chat-tab-count">{unread}</span> : null}
                  </button>
                  <button
                    type="button"
                    role="tab"
                    aria-selected={pane === "contacts"}
                    className={cn("bs-chat-rail-tab", pane === "contacts" ? "is-active" : "")}
                    onClick={() => setPane("contacts")}
                  >
                    <Users className="size-4" />
                    Contacts
                  </button>
                </div>
                <div className="px-3 pb-2">
                  <label className="relative block">
                    <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
                    <TextInput
                      className="pl-9"
                      placeholder={pane === "contacts" ? "Search contacts" : "Search chat"}
                      value={query}
                      onChange={(e) => setQuery(e.target.value)}
                    />
                  </label>
                </div>
                <div className="min-h-0 flex-1 overflow-y-auto px-1 pb-3">
                  {pane === "chat" ? (
                    <>
                      {threads.length === 0 ? (
                        <p className="px-3 py-6 text-sm text-slate-500">No chats yet. Open Contacts to start one.</p>
                      ) : null}
                      {threads.map((t) => {
                        const peer = resolveChatContact(tenantId, otherParticipant(t, profile.email));
                        const count = unreadInThread(t.id, profile.email);
                        if (query.trim() && !`${peer.name} ${peer.email} ${t.last_body}`.toLowerCase().includes(query.trim().toLowerCase())) {
                          return null;
                        }
                        return (
                          <div
                            key={t.id}
                            className={cn("bs-chat-row", threadId === t.id ? "is-active" : "")}
                          >
                            <ChatPerson contact={peer} onChat={() => startWith(peer.email)} />
                            <div className="min-w-0 flex-1">
                              <span className="flex items-center justify-between gap-2">
                                <PersonaHover contact={peer} onChat={() => startWith(peer.email)}>
                                  <span className="truncate text-sm font-semibold text-ink">{peer.name}</span>
                                </PersonaHover>
                                <span className="shrink-0 text-[10px] text-slate-400">{formatListTime(t.last_at)}</span>
                              </span>
                              <button type="button" className="bs-chat-row-main" onClick={() => openThread(t)}>
                                <span className="mt-0.5 flex items-center justify-between gap-2">
                                  <span className="truncate text-xs text-slate-500">{t.last_body || "No messages yet"}</span>
                                  {count ? <Badge tone="warning">{count}</Badge> : null}
                                </span>
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </>
                  ) : (
                    <>
                      <p className="px-3 pb-1 text-[10px] font-bold uppercase tracking-wide text-slate-400">
                        People ({people.length})
                      </p>
                      {people.map((contact) => (
                        <div key={contact.email} className="bs-chat-row">
                          <ChatPerson contact={contact} onChat={() => startWith(contact.email)} />
                          <div className="min-w-0 flex-1">
                            <PersonaHover contact={contact} onChat={() => startWith(contact.email)}>
                              <span className="truncate text-sm font-semibold text-ink">{contact.name}</span>
                            </PersonaHover>
                            <button type="button" className="bs-chat-row-main" onClick={() => startWith(contact.email)}>
                              <span className="mt-0.5 block truncate text-xs text-slate-500">
                                {contact.title}
                                {contact.department ? ` · ${contact.department}` : ""}
                              </span>
                            </button>
                          </div>
                        </div>
                      ))}
                      {people.length === 0 ? <p className="px-3 py-6 text-sm text-slate-500">No contacts match.</p> : null}
                    </>
                  )}
                </div>
              </section>

              <section className={cn("bs-chat-thread", active ? "flex" : "hidden md:flex")}>
                {active && other ? (
                  <>
                    <div className="flex items-center gap-2 border-b border-line px-3 py-2">
                      <button
                        type="button"
                        className="inline-flex size-10 items-center justify-center rounded-[var(--bs-radius)] md:hidden"
                        aria-label="Back to conversations"
                        onClick={() => setThreadId(null)}
                      >
                        <ArrowLeft className="size-4" />
                      </button>
                      <ChatPerson contact={other} onChat={() => startWith(other.email)} size="md" />
                      <div className="min-w-0 flex-1">
                        <PersonaHover contact={other} onChat={() => startWith(other.email)}>
                          <span className="block truncate text-sm font-bold text-ink">{other.name}</span>
                        </PersonaHover>
                        <button type="button" className="truncate text-left text-xs text-slate-500" onClick={() => setProfileOpen((v) => !v)}>
                          {other.presence === "available" ? "Available" : other.presence} · {other.title}
                        </button>
                      </div>
                      <button
                        type="button"
                        className={cn(
                          "inline-flex size-11 items-center justify-center rounded-[var(--bs-radius)] hover:bg-cloud",
                          profileOpen ? "text-teal" : "text-slate-500"
                        )}
                        aria-label={profileOpen ? "Hide profile" : "Show profile"}
                        aria-pressed={profileOpen}
                        onClick={() => setProfileOpen((v) => !v)}
                      >
                        <Info className="size-4" />
                      </button>
                    </div>
                    <div className="min-h-0 flex-1 space-y-1 overflow-y-auto px-3 py-3">
                      {messages.map((m, index) => (
                        <ChatBubble
                          key={m.id}
                          message={m}
                          mine={m.from_email.toLowerCase() === profile.email.toLowerCase()}
                          grouped={groupedWithPrevious(messages, index)}
                          contact={resolveChatContact(tenantId, m.from_email, m.from_name)}
                          onChat={() => startWith(m.from_email)}
                        />
                      ))}
                      {messages.length === 0 ? (
                        <div className="flex flex-col items-center py-10 text-center">
                          <ChatPerson contact={other} size="lg" />
                          <p className="mt-3 font-semibold text-ink">{other.name}</p>
                          <p className="mt-1 max-w-xs text-sm text-slate-500">
                            {other.title}
                            {other.department ? ` · ${other.department}` : ""}. Hover the photo for contact details, then send a message.
                          </p>
                        </div>
                      ) : null}
                      <div ref={endRef} />
                    </div>
                    <form
                      className="border-t border-line p-3"
                      onSubmit={(e) => {
                        e.preventDefault();
                        send();
                      }}
                    >
                      {error ? <p className="mb-2 text-xs text-rose-600">{error}</p> : null}
                      <div className="flex items-end gap-2">
                        <TextArea
                          rows={2}
                          value={draft}
                          onChange={(e) => setDraft(e.target.value)}
                          placeholder={`Message ${other.name}`}
                          onKeyDown={(e) => {
                            if (e.key === "Enter" && !e.shiftKey) {
                              e.preventDefault();
                              send();
                            }
                          }}
                        />
                        <Button type="submit" className="!min-h-11 !px-3" disabled={!draft.trim()}>
                          <Send className="size-4" />
                          <span className="sr-only">Send</span>
                        </Button>
                      </div>
                    </form>
                  </>
                ) : (
                  <div className="hidden flex-1 flex-col items-center justify-center p-6 text-center md:flex">
                    <MessageSquare className="size-8 text-teal" />
                    <p className="mt-3 font-semibold text-ink">Select a chat or contact</p>
                    <p className="mt-1 max-w-xs text-sm text-slate-500">
                      Hover any photo or name for the full profile — email, phone, department — then start a chat, same as Microsoft Teams.
                    </p>
                  </div>
                )}
              </section>

              {active && other && profileOpen ? (
                <aside className="bs-chat-profile" aria-label={`${other.name} profile`}>
                  <div className="flex items-center justify-between border-b border-line px-3 py-2">
                    <p className="text-sm font-bold text-ink">Profile</p>
                    <button
                      type="button"
                      className="inline-flex size-10 items-center justify-center rounded-[var(--bs-radius)] text-slate-500 hover:bg-cloud"
                      aria-label="Close profile"
                      onClick={() => setProfileOpen(false)}
                    >
                      <X className="size-4" />
                    </button>
                  </div>
                  <div className="min-h-0 flex-1 overflow-y-auto pt-4">
                    <ContactProfileBody contact={other} onChat={() => startWith(other.email)} />
                  </div>
                </aside>
              ) : null}
            </div>
          </aside>
        </div>
      ) : null}
    </>
  );
}

function ChatBubble({
  message,
  mine,
  grouped,
  contact,
  onChat
}: {
  message: ChatMessage;
  mine: boolean;
  grouped: boolean;
  contact: ChatContact;
  onChat: () => void;
}) {
  if (message.kind === "notice") {
    return (
      <div className="mx-auto my-3 max-w-[90%] rounded-[var(--bs-radius)] border border-line bg-cloud px-3 py-2 text-center">
        <p className="inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wide text-teal">
          <Info className="size-3" />
          {message.notice_title || "Notice"}
        </p>
        <p className="mt-1 text-xs leading-5 text-slate-600">{message.body}</p>
        <p className="mt-1 text-[10px] text-slate-400">{formatTime(message.created_at)}</p>
      </div>
    );
  }

  return (
    <div className={cn("bs-teams-msg", mine ? "is-mine" : "", grouped ? "is-grouped" : "")}>
      <div className="bs-teams-msg-avatar">
        {grouped ? <span className="h-8 w-8" /> : <ChatPerson contact={contact} size="sm" onChat={onChat} />}
      </div>
      <div className="min-w-0 max-w-[min(100%,28rem)]">
        {grouped ? null : (
          <p className="mb-0.5 flex flex-wrap items-baseline gap-x-2">
            <PersonaHover contact={contact} onChat={onChat}>
              <span className="text-sm font-bold text-ink">{contact.name}</span>
            </PersonaHover>
            <span className="text-[10px] text-slate-400">{formatTime(message.created_at)}</span>
          </p>
        )}
        <div className={cn("bs-teams-bubble", mine ? "is-mine" : "")}>
          <p className="text-sm leading-6">{message.body}</p>
        </div>
      </div>
    </div>
  );
}
