"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  FileText,
  Maximize2,
  Minimize2,
  Paperclip,
  Send,
  Trash2,
  X
} from "lucide-react";
import { useConfirm } from "@/components/common/use-confirm";
import { Badge, Button, Field, SelectInput, TextArea, TextInput } from "@/components/ui";
import { getStoredTenantId } from "@/lib/auth/session";
import { getSessionProfile } from "@/lib/auth/session-profile";
import {
  EMAIL_ATTACHMENT_ACCEPT,
  fileToEmailAttachment,
  formatAttachmentSize,
  type LocalEmailAttachment
} from "@/lib/email/attachments";
import { listEmailTemplates, previewEmailTemplate, sendComposedEmail } from "@/lib/email/client";
import {
  htmlFromPlainText,
  plainTextFromHtml,
  sortTemplatesForModule,
  splitRecipients
} from "@/lib/email/compose-helpers";
import type { ComposeEmailDraft, EmailTemplate } from "@/lib/email/types";
import { moduleLabels, type ModuleKey } from "@/lib/permissions";
import { cn } from "@/lib/utils";

type ComposerMode = "floating" | "page";

type EmailComposerProps = {
  mode?: ComposerMode;
  sourceModule?: string;
  initial?: ComposeEmailDraft;
  open?: boolean;
  minimized?: boolean;
  onClose?: () => void;
  onMinimize?: () => void;
  onExpand?: () => void;
  className?: string;
};

export function EmailComposer({
  mode = "floating",
  sourceModule,
  initial,
  open = true,
  minimized = false,
  onClose,
  onMinimize,
  onExpand,
  className
}: EmailComposerProps) {
  const tenantId = getStoredTenantId() ?? "alpha";
  const profile = getSessionProfile();
  const { ask, dialog } = useConfirm();
  const fileRef = useRef<HTMLInputElement>(null);

  const moduleKey = (initial?.sourceModule || sourceModule || "dashboard") as ModuleKey;
  const moduleLabel = moduleLabels[moduleKey] ?? moduleKey;

  const [to, setTo] = useState(initial?.to ?? "");
  const [cc, setCc] = useState(initial?.cc ?? "");
  const [bcc, setBcc] = useState(initial?.bcc ?? "");
  const [showCcBcc, setShowCcBcc] = useState(Boolean(initial?.cc || initial?.bcc));
  const [subject, setSubject] = useState(initial?.subject ?? "");
  const [bodyMode, setBodyMode] = useState<"write" | "html" | "preview">("write");
  const [plainBody, setPlainBody] = useState(initial?.text ?? "");
  const [htmlBody, setHtmlBody] = useState(initial?.html ?? "");
  const [templates, setTemplates] = useState<EmailTemplate[]>([]);
  const [templateId, setTemplateId] = useState("");
  const [variables, setVariables] = useState<Record<string, string>>(initial?.variables ?? {});
  const [attachments, setAttachments] = useState<LocalEmailAttachment[]>([]);
  const [status, setStatus] = useState("");
  const [error, setError] = useState("");
  const [sending, setSending] = useState(false);
  const [loadingTpl, setLoadingTpl] = useState(false);

  const selected = templates.find((t) => t.id === templateId) ?? null;

  // Reset when a new draft opens (floating)
  useEffect(() => {
    if (!open && mode === "floating") return;
    setTo(initial?.to ?? "");
    setCc(initial?.cc ?? "");
    setBcc(initial?.bcc ?? "");
    setShowCcBcc(Boolean(initial?.cc || initial?.bcc));
    setSubject(initial?.subject ?? "");
    setPlainBody(initial?.text ?? "");
    setHtmlBody(initial?.html ?? "");
    setVariables(initial?.variables ?? {});
    setAttachments([]);
    setStatus("");
    setError("");
    setBodyMode("write");
  }, [open, initial, mode]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoadingTpl(true);
      const res = await listEmailTemplates({ activeOnly: true });
      if (cancelled) return;
      setLoadingTpl(false);
      if (!res.ok) {
        setError(res.error || "Could not load templates.");
        setTemplates([]);
        return;
      }
      const sorted = sortTemplatesForModule(res.templates || [], moduleKey);
      setTemplates(sorted);
      if (initial?.templateKey) {
        const match = sorted.find((t) => t.key === initial.templateKey);
        if (match) {
          setTemplateId(match.id);
          applyTemplate(match, initial.variables ?? {});
        }
      }
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- apply once per open/module
  }, [open, moduleKey, initial?.templateKey]);

  const templateOptions = useMemo(() => templates, [templates]);

  function applyTemplate(tpl: EmailTemplate, vars?: Record<string, string>) {
    const nextVars: Record<string, string> = {};
    for (const key of tpl.variables || []) {
      nextVars[key] = vars?.[key] ?? variables[key] ?? "";
    }
    setVariables(nextVars);
    setSubject(tpl.subject);
    setHtmlBody(tpl.html);
    setPlainBody(tpl.text || plainTextFromHtml(tpl.html));
    setBodyMode("preview");
  }

  async function applyVariablesToDraft() {
    if (!selected && !htmlBody && !subject) return;
    setError("");
    const res = await previewEmailTemplate({
      templateId: selected?.id,
      templateKey: selected?.key,
      subject,
      html: htmlBody || undefined,
      text: plainBody || undefined,
      variables
    });
    if (!res.ok || !res.preview) {
      setError(res.error || "Could not apply template variables.");
      return;
    }
    setSubject(res.preview.subject);
    setHtmlBody(res.preview.html);
    setPlainBody(res.preview.text || plainTextFromHtml(res.preview.html));
    setBodyMode("preview");
    setStatus("Template details applied — you can still edit before sending.");
  }

  async function onPickFiles(files: FileList | null) {
    if (!files?.length) return;
    setError("");
    const next: LocalEmailAttachment[] = [...attachments];
    for (const file of Array.from(files)) {
      if (next.length >= 8) {
        setError("Maximum 8 attachments.");
        break;
      }
      try {
        next.push(await fileToEmailAttachment(file));
      } catch (err) {
        setError(err instanceof Error ? err.message : "Could not attach file.");
      }
    }
    setAttachments(next);
    if (fileRef.current) fileRef.current.value = "";
  }

  function resolvedHtml() {
    // Prefer authored HTML (templates / HTML tab). Write mode regenerates from plain text.
    if (bodyMode === "write") {
      if (plainBody.trim()) return htmlFromPlainText(plainBody);
      return htmlBody;
    }
    return htmlBody.trim() || htmlFromPlainText(plainBody);
  }

  function resolvedText() {
    return plainBody.trim() || plainTextFromHtml(htmlBody);
  }

  function doSend() {
    const recipients = splitRecipients(to);
    if (!recipients.length) {
      setError("Add at least one recipient in To.");
      return;
    }
    if (!subject.trim()) {
      setError("Subject is required.");
      return;
    }
    const html = resolvedHtml();
    const text = resolvedText();
    if (!html && !text) {
      setError("Write a message body.");
      return;
    }

    ask({
      title: "Send email?",
      message: `Send to ${recipients.join(", ")} from ${moduleLabel}? Attachments: ${attachments.length}.`,
      confirmLabel: "Send",
      onConfirm: async () => {
        setSending(true);
        setError("");
        setStatus("");
        const res = await sendComposedEmail({
          to: recipients,
          cc: splitRecipients(cc),
          bcc: splitRecipients(bcc),
          subject: subject.trim(),
          html,
          text,
          tenantId,
          templateKey: selected?.key,
          templateId: selected?.id,
          variables,
          attachments: attachments.map((a) => ({
            filename: a.filename,
            content: a.contentBase64,
            contentType: a.contentType
          })),
          meta: {
            sourceModule: moduleKey,
            composedBy: profile.email,
            composedAt: new Date().toISOString()
          }
        });
        setSending(false);
        if (!res.ok) {
          setError(res.error || "Send failed.");
          return;
        }
        const dry = res.result?.dryRun;
        setStatus(dry ? "Queued (dry run — set EMAIL_DRY_RUN=false to deliver)." : "Email sent.");
        setAttachments([]);
        if (mode === "floating") {
          window.setTimeout(() => onClose?.(), 900);
        }
      }
    });
  }

  if (mode === "floating" && !open) return null;

  if (mode === "floating" && minimized) {
    return (
      <div className="fixed bottom-0 right-4 z-50 w-[min(22rem,calc(100vw-1.5rem))] pb-[env(safe-area-inset-bottom)]">
        <button
          type="button"
          onClick={onExpand}
          className="flex w-full items-center justify-between gap-2 rounded-t-[var(--bs-radius)] bg-[color:var(--bs-ink)] px-4 py-3 text-left text-white shadow-soft"
        >
          <span className="truncate text-sm font-bold">
            {subject.trim() || "New message"} · {moduleLabel}
          </span>
          <span className="flex items-center gap-1">
            <Maximize2 className="size-4" aria-hidden="true" />
            <span
              role="button"
              tabIndex={0}
              className="rounded p-1 hover:bg-white/10"
              onClick={(e) => {
                e.stopPropagation();
                onClose?.();
              }}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.stopPropagation();
                  onClose?.();
                }
              }}
            >
              <X className="size-4" aria-hidden="true" />
            </span>
          </span>
        </button>
      </div>
    );
  }

  const shell = (
    <div
      className={cn(
        "flex flex-col overflow-hidden border border-line bg-[color:var(--bs-card,#ffffff)] shadow-soft",
        mode === "floating"
          ? "fixed bottom-0 right-3 z-50 h-[min(36rem,calc(100dvh-5rem))] w-[min(40rem,calc(100vw-1.5rem))] rounded-t-[var(--bs-radius)] pb-[env(safe-area-inset-bottom)] sm:right-4"
          : "min-h-[28rem] rounded-[var(--bs-radius)]",
        className
      )}
    >
      <div className="flex shrink-0 items-center justify-between gap-2 border-b border-line bg-[color:var(--bs-ink)] px-3 py-2.5 text-white sm:px-4">
        <div className="min-w-0">
          <p className="truncate text-sm font-bold">New message</p>
          <p className="truncate text-[11px] text-white/70">
            From {moduleLabel} · {profile.email || "you"}
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-1">
          {mode === "floating" ? (
            <button
              type="button"
              className="inline-flex size-9 items-center justify-center rounded-[var(--bs-radius)] hover:bg-white/10"
              aria-label="Minimize"
              onClick={onMinimize}
            >
              <Minimize2 className="size-4" aria-hidden="true" />
            </button>
          ) : null}
          {onClose ? (
            <button
              type="button"
              className="inline-flex size-9 items-center justify-center rounded-[var(--bs-radius)] hover:bg-white/10"
              aria-label="Close"
              onClick={onClose}
            >
              <X className="size-4" aria-hidden="true" />
            </button>
          ) : null}
        </div>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto">
        <div className="space-y-0 border-b border-line px-3 py-2 sm:px-4">
          <div className="flex items-start gap-2 border-b border-line/60 py-1.5">
            <span className="w-10 shrink-0 pt-2 text-xs font-semibold text-slate-500">To</span>
            <TextInput
              value={to}
              onChange={(e) => setTo(e.target.value)}
              placeholder="name@company.com, …"
              className="min-w-0 flex-1 border-0 shadow-none focus:ring-0"
              autoComplete="email"
            />
            <button
              type="button"
              className="shrink-0 pt-2 text-xs font-bold text-teal hover:underline"
              onClick={() => setShowCcBcc((v) => !v)}
            >
              Cc/Bcc
            </button>
          </div>
          {showCcBcc ? (
            <>
              <div className="flex items-center gap-2 border-b border-line/60 py-1.5">
                <span className="w-10 shrink-0 text-xs font-semibold text-slate-500">Cc</span>
                <TextInput
                  value={cc}
                  onChange={(e) => setCc(e.target.value)}
                  placeholder="optional"
                  className="min-w-0 flex-1 border-0 shadow-none focus:ring-0"
                />
              </div>
              <div className="flex items-center gap-2 border-b border-line/60 py-1.5">
                <span className="w-10 shrink-0 text-xs font-semibold text-slate-500">Bcc</span>
                <TextInput
                  value={bcc}
                  onChange={(e) => setBcc(e.target.value)}
                  placeholder="optional"
                  className="min-w-0 flex-1 border-0 shadow-none focus:ring-0"
                />
              </div>
            </>
          ) : null}
          <div className="flex items-center gap-2 py-1.5">
            <span className="w-10 shrink-0 text-xs font-semibold text-slate-500">Subj</span>
            <TextInput
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              placeholder="Subject"
              className="min-w-0 flex-1 border-0 shadow-none focus:ring-0"
            />
          </div>
        </div>

        <div className="grid gap-3 border-b border-line p-3 sm:grid-cols-[1fr_auto] sm:items-end sm:px-4">
          <Field label="Template">
            <SelectInput
              value={templateId}
              disabled={loadingTpl}
              onChange={(e) => {
                const id = e.target.value;
                setTemplateId(id);
                const tpl = templates.find((t) => t.id === id);
                if (tpl) applyTemplate(tpl);
              }}
            >
              <option value="">Blank message</option>
              {templateOptions.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name} ({t.category})
                </option>
              ))}
            </SelectInput>
          </Field>
          {selected ? (
            <Button type="button" variant="secondary" onClick={() => void applyVariablesToDraft()}>
              Fill details
            </Button>
          ) : null}
        </div>

        {selected && (selected.variables?.length ?? 0) > 0 ? (
          <div className="space-y-2 border-b border-line bg-[color:var(--bs-cloud)]/60 p-3 sm:p-4">
            <p className="text-xs font-bold uppercase tracking-wide text-slate-500">
              Template details · {selected.name}
            </p>
            <div className="grid gap-2 sm:grid-cols-2">
              {selected.variables.map((key) => (
                <Field key={key} label={key}>
                  <TextInput
                    value={variables[key] ?? ""}
                    onChange={(e) => setVariables((v) => ({ ...v, [key]: e.target.value }))}
                    placeholder={`{{${key}}}`}
                  />
                </Field>
              ))}
            </div>
            {selected.description ? (
              <p className="text-xs text-slate-500">{selected.description}</p>
            ) : null}
          </div>
        ) : null}

        <div className="flex items-center gap-1 border-b border-line px-3 py-1.5 sm:px-4">
          {(
            [
              ["write", "Write"],
              ["html", "HTML"],
              ["preview", "Preview"]
            ] as const
          ).map(([id, label]) => (
            <button
              key={id}
              type="button"
              onClick={() => {
                if (id === "html" && bodyMode === "write" && plainBody && !htmlBody.includes("<p")) {
                  setHtmlBody(htmlFromPlainText(plainBody));
                }
                if (id === "write" && bodyMode === "html") {
                  setPlainBody(plainTextFromHtml(htmlBody));
                }
                setBodyMode(id);
              }}
              className={cn(
                "rounded-[var(--bs-radius)] px-2.5 py-1.5 text-xs font-bold",
                bodyMode === id ? "bg-[color:var(--bs-teal)]/15 text-teal" : "text-slate-500 hover:bg-black/5"
              )}
            >
              {label}
            </button>
          ))}
        </div>

        <div className="p-3 sm:p-4">
          {bodyMode === "write" ? (
            <TextArea
              rows={mode === "floating" ? 8 : 12}
              value={plainBody}
              onChange={(e) => {
                setPlainBody(e.target.value);
                // Keep html in sync lightly when not from rich template markup
                if (!selected) setHtmlBody("");
              }}
              placeholder="Write your message…"
              className="min-h-[10rem] resize-y"
            />
          ) : null}
          {bodyMode === "html" ? (
            <TextArea
              rows={mode === "floating" ? 8 : 12}
              value={htmlBody}
              onChange={(e) => setHtmlBody(e.target.value)}
              placeholder="<p>Hello…</p>"
              className="min-h-[10rem] resize-y font-mono text-xs"
            />
          ) : null}
          {bodyMode === "preview" ? (
            <div
              className="min-h-[10rem] rounded-[var(--bs-radius)] border border-line bg-white p-4 text-sm"
              dangerouslySetInnerHTML={{ __html: resolvedHtml() || "<p class='text-slate-400'>Nothing to preview</p>" }}
            />
          ) : null}
        </div>

        {attachments.length ? (
          <div className="flex flex-wrap gap-2 border-t border-line px-3 py-2 sm:px-4">
            {attachments.map((a) => (
              <div
                key={a.id}
                className="inline-flex max-w-full items-center gap-2 rounded-[var(--bs-radius)] border border-line bg-[color:var(--bs-cloud)] px-2.5 py-1.5 text-xs"
              >
                <FileText className="size-3.5 shrink-0 text-teal" aria-hidden="true" />
                <span className="min-w-0 truncate font-semibold text-ink">{a.filename}</span>
                <span className="shrink-0 text-slate-500">{formatAttachmentSize(a.size)}</span>
                <button
                  type="button"
                  className="shrink-0 text-slate-400 hover:text-red-600"
                  aria-label={`Remove ${a.filename}`}
                  onClick={() => setAttachments((list) => list.filter((x) => x.id !== a.id))}
                >
                  <Trash2 className="size-3.5" aria-hidden="true" />
                </button>
              </div>
            ))}
          </div>
        ) : null}

        {(error || status) && (
          <div className="space-y-1 px-3 pb-2 sm:px-4">
            {error ? <p className="text-sm font-semibold text-red-600">{error}</p> : null}
            {status ? <p className="text-sm font-semibold text-teal">{status}</p> : null}
          </div>
        )}
      </div>

      <div className="flex shrink-0 flex-wrap items-center gap-2 border-t border-line bg-[color:var(--bs-cloud)]/40 px-3 py-2.5 sm:px-4">
        <Button type="button" onClick={doSend} disabled={sending} className="min-h-11 gap-2 px-5">
          <Send className="size-4" aria-hidden="true" />
          {sending ? "Sending…" : "Send"}
        </Button>
        <input
          ref={fileRef}
          type="file"
          multiple
          accept={EMAIL_ATTACHMENT_ACCEPT}
          className="sr-only"
          onChange={(e) => void onPickFiles(e.target.files)}
        />
        <Button
          type="button"
          variant="ghost"
          className="min-h-11 gap-2"
          onClick={() => fileRef.current?.click()}
          title="PDF, images, DOC/DOCX, XLS/XLSX, CSV (max 7MB each)"
        >
          <Paperclip className="size-4" aria-hidden="true" />
          Attach
        </Button>
        <div className="ml-auto hidden sm:block">
          <Badge tone="info">{moduleLabel}</Badge>
        </div>
      </div>
      {dialog}
    </div>
  );

  return shell;
}
