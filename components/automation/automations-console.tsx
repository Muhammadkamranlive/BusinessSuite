"use client";

import { useEffect, useMemo, useState } from "react";
import {
  CheckCircle2,
  CirclePlay,
  Clock3,
  GitBranch,
  Mail,
  Plus,
  Radio,
  RefreshCw,
  ShieldCheck,
  Zap
} from "lucide-react";
import { useConfirm } from "@/components/common/use-confirm";
import { Badge, Button, Field, Panel, SelectInput, TextArea, TextInput } from "@/components/ui";
import { eventsForModule, getEventCatalogEntry } from "@/lib/automation/catalog";
import {
  applyEventPresetsToActions,
  applyPresetToAction,
  applyTemplateToAction,
  newActionForEvent,
  presetForEventAction,
  sortTemplatesForEvent
} from "@/lib/automation/action-presets";
import { dispatchAction } from "@/lib/automation/channels";
import { normalizeRuleActions, pickLiteralEmail } from "@/lib/automation/normalize-actions";
import { decideApprovalStep, emitBusinessEvent, previewMatchingRules, replayBusinessEvent } from "@/lib/automation/runtime";
import { runDueSchedules } from "@/lib/automation/scheduler";
import type {
  ApprovalChainDef,
  AutomationAction,
  AutomationRule,
  AutomationSchedule
} from "@/lib/automation/types";
import { getSessionProfile } from "@/lib/auth/session-profile";
import { flushOutbox, listOutboxJobs, startOutboxWorker } from "@/lib/email/outbox";
import { listEmailTemplates } from "@/lib/email/client";
import type { EmailTemplate } from "@/lib/email/types";
import { resolveRecipients } from "@/lib/automation/recipients";
import { normalizeEventVars } from "@/lib/automation/runtime";
import { moduleLabels, type ModuleKey } from "@/lib/permissions";
import { cn } from "@/lib/utils";
import {
  deleteRule,
  deleteSchedule,
  ensureAutomationSeeded,
  getChannelSettings,
  listApprovalChains,
  listApprovalInstances,
  listAutomationTasks,
  listBusinessEvents,
  listRules,
  listSchedules,
  saveApprovalChain,
  saveRule,
  saveSchedule,
  pushAutomationToSupabase,
  pullAutomationFromSupabase,
  setChannelEnabled,
  setRuleEnabled,
  setScheduleEnabled,
  subscribeAutomation,
  completeAutomationTask
} from "@/modules/automation/services/automation.store";

type Tab = "rules" | "schedules" | "approvals" | "events" | "channels" | "tasks" | "outbox";

const MODULE_OPTIONS: Array<ModuleKey | "platform"> = [
  "platform",
  "dashboard",
  "crm",
  "sales",
  "purchases",
  "inventory",
  "operations",
  "hrm",
  "healthcare",
  "documents",
  "finance",
  "projects",
  "reports",
  "settings"
];

function recipientLabel(type: AutomationAction["type"]) {
  switch (type) {
    case "send_email":
      return "Email To (required)";
    case "create_task":
    case "assign":
      return "Assignee email";
    default:
      return "Notify user";
  }
}

function recipientPlaceholder(type: AutomationAction["type"]) {
  switch (type) {
    case "send_email":
      return "{{user_email}}, custom@company.com or {{support_email}}";
    default:
      return "{{user_email}} or admin@company.com";
  }
}

function recipientValue(a: AutomationAction) {
  if (a.type === "send_email") {
    return pickLiteralEmail(a.to, a.assigneeEmail) || a.to || "";
  }
  return a.to || a.assigneeEmail || "";
}

function emailActionsSummary(actions: AutomationAction[]) {
  return normalizeRuleActions(actions)
    .filter((a) => a.type === "send_email")
    .map((a) => a.to || "—")
    .join(", ");
}

function patchRecipient(a: AutomationAction, value: string): AutomationAction {
  if (a.type === "send_email") {
    return { ...a, to: value, channel: "email" };
  }
  if (a.type === "create_task" || a.type === "assign") {
    return { ...a, assigneeEmail: value };
  }
  return { ...a, to: value };
}

export function AutomationsConsole({
  tenantId,
  moduleFilter,
  embedded
}: {
  tenantId: string;
  /** When set, scopes lists + new rules to this module */
  moduleFilter?: ModuleKey;
  embedded?: boolean;
}) {
  const profile = getSessionProfile();
  const { ask, askSave, askTrash, dialog } = useConfirm();
  const [tab, setTab] = useState<Tab>("rules");
  const [tick, setTick] = useState(0);
  const [notice, setNotice] = useState("");

  useEffect(() => {
    ensureAutomationSeeded(tenantId);
    void pullAutomationFromSupabase(tenantId).then(() => setTick((n) => n + 1));
    return subscribeAutomation(() => setTick((n) => n + 1));
  }, [tenantId]);

  const rules = useMemo(() => {
    void tick;
    return listRules(tenantId, moduleFilter);
  }, [tenantId, moduleFilter, tick]);

  const schedules = useMemo(() => {
    void tick;
    return listSchedules(tenantId, moduleFilter);
  }, [tenantId, moduleFilter, tick]);

  const chains = useMemo(() => {
    void tick;
    return listApprovalChains(tenantId, moduleFilter);
  }, [tenantId, moduleFilter, tick]);

  const instances = useMemo(() => {
    void tick;
    return listApprovalInstances(tenantId);
  }, [tenantId, tick]);

  const events = useMemo(() => {
    void tick;
    return listBusinessEvents(tenantId, { module: moduleFilter, limit: 80 });
  }, [tenantId, moduleFilter, tick]);

  const tasks = useMemo(() => {
    void tick;
    return listAutomationTasks(tenantId).filter((t) =>
      moduleFilter ? t.module === moduleFilter || t.module === "platform" : true
    );
  }, [tenantId, moduleFilter, tick]);

  const channels = useMemo(() => {
    void tick;
    return getChannelSettings(tenantId);
  }, [tenantId, tick]);

  const outbox = useMemo(() => {
    void tick;
    return listOutboxJobs().slice(0, 60);
  }, [tick]);

  useEffect(() => {
    const onOutbox = () => setTick((n) => n + 1);
    window.addEventListener("businesssuite:email-outbox", onOutbox);
    return () => window.removeEventListener("businesssuite:email-outbox", onOutbox);
  }, []);

  const catalog = eventsForModule(moduleFilter ?? "all");

  const [ruleDraft, setRuleDraft] = useState<AutomationRule | null>(null);
  const [scheduleDraft, setScheduleDraft] = useState<AutomationSchedule | null>(null);
  const [chainDraft, setChainDraft] = useState<ApprovalChainDef | null>(null);
  const [testEventKey, setTestEventKey] = useState(catalog[0]?.key || "crm.lead.assigned");
  const [emailTemplates, setEmailTemplates] = useState<EmailTemplate[]>([]);
  const [loadingTemplates, setLoadingTemplates] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoadingTemplates(true);
      const res = await listEmailTemplates();
      if (cancelled) return;
      setLoadingTemplates(false);
      if (res.ok && res.templates) setEmailTemplates(res.templates);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const templatesForRule = useMemo(() => {
    if (!ruleDraft) return emailTemplates;
    return sortTemplatesForEvent(emailTemplates, ruleDraft.event_key);
  }, [emailTemplates, ruleDraft?.event_key]);

  function refresh() {
    setTick((n) => n + 1);
  }

  function openNewRule() {
    const eventKey = catalog.find((e) => e.module === (moduleFilter || "crm"))?.key || catalog[0]?.key || "crm.lead.assigned";
    const entry = getEventCatalogEntry(eventKey);
    setRuleDraft({
      id: "",
      tenant_id: tenantId,
      name: "",
      description: "",
      module: moduleFilter || (entry?.module === "platform" ? "crm" : (entry?.module as ModuleKey)) || "crm",
      event_key: eventKey,
      enabled: true,
      conditions: [],
      actions: [newActionForEvent(eventKey, "notify_in_app")],
      created_at: "",
      updated_at: ""
    });
  }

  const tabs: { id: Tab; label: string; icon: typeof Zap }[] = [
    { id: "rules", label: "Rules", icon: Zap },
    { id: "schedules", label: "Schedules", icon: Clock3 },
    { id: "approvals", label: "Approvals", icon: ShieldCheck },
    { id: "events", label: "Event log", icon: Radio },
    { id: "tasks", label: "Tasks", icon: CheckCircle2 },
    { id: "outbox", label: "Email outbox", icon: Mail },
    { id: "channels", label: "Channels", icon: GitBranch }
  ];

  return (
    <div className={cn(!embedded && "space-y-4")}>
      {dialog}
      {notice ? <p className="mb-3 text-sm font-semibold text-teal">{notice}</p> : null}
      <p className="mb-3 rounded-[var(--bs-radius)] border border-line bg-slate-50 px-3 py-2 text-xs text-slate-600">
        <strong>DB-first:</strong> Rules sync to Supabase on save and reload on login. Email To supports{" "}
        <code className="text-[11px]">{"{{user_email}}"}</code>, a custom address, or both comma-separated (e.g.{" "}
        <code className="text-[11px]">{"{{user_email}}, ops@company.com"}</code>). Requires migration{" "}
        <code className="text-[11px]">20260827000015_automation_schema.sql</code> +{" "}
        <code className="text-[11px]">SUPABASE_SECRET_KEY</code>.
      </p>

      <div className="mb-4 flex flex-wrap gap-2">
        {tabs.map((t) => {
          const Icon = t.icon;
          return (
            <button
              key={t.id}
              type="button"
              onClick={() => setTab(t.id)}
              className={cn(
                "inline-flex min-h-10 items-center gap-2 rounded-[var(--bs-radius)] border px-3 text-sm font-semibold",
                tab === t.id ? "border-ink bg-ink text-white" : "border-line bg-white text-slate-600 hover:border-teal"
              )}
            >
              <Icon className="size-4" aria-hidden="true" />
              {t.label}
            </button>
          );
        })}
      </div>

      {tab === "rules" ? (
        <div className="grid gap-4 xl:grid-cols-[1fr_minmax(280px,22rem)]">
          <Panel className="p-0 overflow-hidden">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-line px-4 py-3">
              <div>
                <p className="font-bold text-ink">When → Then rules</p>
                <p className="text-xs text-slate-500">
                  {rules.length} rule{rules.length === 1 ? "" : "s"}
                  {moduleFilter ? ` · ${moduleLabels[moduleFilter]}` : ""}
                </p>
              </div>
              <Button type="button" className="gap-1.5" onClick={openNewRule}>
                <Plus className="size-4" />
                New rule
              </Button>
            </div>
            <ul className="divide-y divide-line">
              {rules.map((r) => (
                <li key={r.id} className="flex flex-col gap-2 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="font-semibold text-ink">{r.name}</p>
                      <Badge tone={r.enabled ? "success" : "neutral"}>{r.enabled ? "On" : "Off"}</Badge>
                      <Badge tone="info">{r.module}</Badge>
                    </div>
                    <p className="mt-0.5 truncate text-xs text-slate-500">
                      When <span className="font-semibold">{r.event_key}</span> → {r.actions.length} action
                      {r.actions.length === 1 ? "" : "s"}
                      {r.actions.some((a) => a.type === "send_email") ? (
                        <> · email → {emailActionsSummary(r.actions)}</>
                      ) : null}
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <Button
                      type="button"
                      variant="secondary"
                      className="!min-h-9 !text-xs"
                      onClick={() => setRuleEnabled(r.id, !r.enabled)}
                    >
                      {r.enabled ? "Disable" : "Enable"}
                    </Button>
                    <Button type="button" variant="secondary" className="!min-h-9 !text-xs" onClick={() => setRuleDraft({ ...r, actions: normalizeRuleActions(r.actions) })}>
                      Edit
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      className="!min-h-9 !text-xs"
                      onClick={() =>
                        askTrash({
                          entityLabel: "rule",
                          name: r.name,
                          onConfirm: () => {
                            deleteRule(r.id);
                            void pushAutomationToSupabase(tenantId);
                            setNotice(`Rule “${r.name}” removed.`);
                            refresh();
                          }
                        })
                      }
                    >
                      Remove
                    </Button>
                  </div>
                </li>
              ))}
              {rules.length === 0 ? <li className="px-4 py-8 text-center text-sm text-slate-500">No rules yet.</li> : null}
            </ul>
          </Panel>

          <Panel className="p-4">
            <p className="font-bold text-ink">Test an event</p>
            <p className="mt-1 text-xs text-slate-500">Emit a sample payload to fire matching rules now.</p>
            <Field label="Event" className="mt-3">
              <SelectInput value={testEventKey} onChange={(e) => setTestEventKey(e.target.value)}>
                {catalog.map((e) => (
                  <option key={e.key} value={e.key}>
                    {e.label} ({e.key})
                  </option>
                ))}
              </SelectInput>
            </Field>
            <Button
              type="button"
              className="mt-3 w-full gap-2"
              onClick={() => {
                const entry = getEventCatalogEntry(testEventKey);
                const result = emitBusinessEvent({
                  tenantId,
                  module: (moduleFilter || entry?.module || "platform") as ModuleKey | "platform",
                  eventKey: testEventKey,
                  title: entry?.label,
                  actorEmail: profile.email,
                  payload: { ...(entry?.samplePayload || {}), actor_email: profile.email }
                });
                setNotice(
                  `Emitted ${testEventKey} — matched ${result.matched_rule_ids.length} rule(s). Check bell / email queue.`
                );
                refresh();
              }}
            >
              <CirclePlay className="size-4" />
              Emit test event
            </Button>
          </Panel>
        </div>
      ) : null}

      {tab === "schedules" ? (
        <Panel className="p-0 overflow-hidden">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-line px-4 py-3">
            <div>
              <p className="font-bold text-ink">Scheduled jobs</p>
              <p className="text-xs text-slate-500">Hourly / daily / weekly ticks → emit events into the rule engine.</p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button
                type="button"
                variant="secondary"
                className="gap-1.5"
                onClick={() => {
                  const n = runDueSchedules(tenantId);
                  setNotice(n ? `Ran ${n} due schedule(s).` : "No schedules due right now (time window).");
                  refresh();
                }}
              >
                <RefreshCw className="size-4" />
                Run due now
              </Button>
              <Button
                type="button"
                className="gap-1.5"
                onClick={() =>
                  setScheduleDraft({
                    id: "",
                    tenant_id: tenantId,
                    name: "",
                    description: "",
                    module: moduleFilter || "platform",
                    enabled: true,
                    frequency: "daily",
                    time_hhmm: "08:00",
                    weekday: 1,
                    event_key: "platform.schedule.tick",
                    payload: {},
                    created_at: "",
                    updated_at: ""
                  })
                }
              >
                <Plus className="size-4" />
                New schedule
              </Button>
            </div>
          </div>
          <ul className="divide-y divide-line">
            {schedules.map((s) => (
              <li key={s.id} className="flex flex-col gap-2 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="font-semibold text-ink">{s.name}</p>
                    <Badge tone={s.enabled ? "success" : "neutral"}>{s.enabled ? "On" : "Off"}</Badge>
                    <Badge tone="info">{s.frequency}</Badge>
                  </div>
                  <p className="text-xs text-slate-500">
                    {s.time_hhmm}
                    {s.frequency === "weekly" ? ` · weekday ${s.weekday}` : ""} · emits {s.event_key}
                    {s.last_run_at ? ` · last ${new Date(s.last_run_at).toLocaleString()}` : ""}
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Button type="button" variant="secondary" className="!min-h-9 !text-xs" onClick={() => setScheduleEnabled(s.id, !s.enabled)}>
                    {s.enabled ? "Disable" : "Enable"}
                  </Button>
                  <Button type="button" variant="secondary" className="!min-h-9 !text-xs" onClick={() => setScheduleDraft({ ...s })}>
                    Edit
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    className="!min-h-9 !text-xs"
                    onClick={() =>
                      askTrash({
                        entityLabel: "schedule",
                        name: s.name,
                        onConfirm: () => {
                          deleteSchedule(s.id);
                          void pushAutomationToSupabase(tenantId);
                          setNotice(`Schedule “${s.name}” removed.`);
                          refresh();
                        }
                      })
                    }
                  >
                    Remove
                  </Button>
                </div>
              </li>
            ))}
          </ul>
        </Panel>
      ) : null}

      {tab === "approvals" ? (
        <div className="grid gap-4 xl:grid-cols-2">
          <Panel className="p-0 overflow-hidden">
            <div className="flex items-center justify-between gap-2 border-b border-line px-4 py-3">
              <p className="font-bold text-ink">Approval chains</p>
              <Button
                type="button"
                className="gap-1.5"
                onClick={() =>
                  setChainDraft({
                    id: "",
                    tenant_id: tenantId,
                    name: "",
                    description: "",
                    module: moduleFilter || "purchases",
                    enabled: true,
                    steps: [
                      { id: crypto.randomUUID(), name: "Manager", order: 1, approver_email: "manager@demo.com" },
                      { id: crypto.randomUUID(), name: "Finance", order: 2, approver_email: "finance@demo.com" }
                    ],
                    created_at: "",
                    updated_at: ""
                  })
                }
              >
                <Plus className="size-4" />
                New chain
              </Button>
            </div>
            <ul className="divide-y divide-line">
              {chains.map((c) => (
                <li key={c.id} className="px-4 py-3">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="font-semibold text-ink">{c.name}</p>
                      <p className="text-xs text-slate-500">
                        {c.steps.length} steps · {c.module}
                      </p>
                    </div>
                    <Button type="button" variant="secondary" className="!min-h-9 !text-xs" onClick={() => setChainDraft({ ...c })}>
                      Edit
                    </Button>
                  </div>
                  <ol className="mt-2 list-decimal space-y-1 pl-4 text-xs text-slate-600">
                    {c.steps
                      .slice()
                      .sort((a, b) => a.order - b.order)
                      .map((s) => (
                        <li key={s.id}>
                          {s.name} → {s.approver_email || s.approver_role || "—"}
                        </li>
                      ))}
                  </ol>
                </li>
              ))}
            </ul>
          </Panel>

          <Panel className="p-0 overflow-hidden">
            <div className="border-b border-line px-4 py-3">
              <p className="font-bold text-ink">Open approvals</p>
              <p className="text-xs text-slate-500">Decide the current step (notifies next approver or requester).</p>
            </div>
            <ul className="divide-y divide-line">
              {instances.filter((i) => i.status === "pending").length === 0 ? (
                <li className="px-4 py-8 text-center text-sm text-slate-500">No pending approvals.</li>
              ) : (
                instances
                  .filter((i) => i.status === "pending")
                  .map((inst) => {
                    const step = inst.steps.find((s) => s.order === inst.current_step);
                    return (
                      <li key={inst.id} className="px-4 py-3">
                        <p className="font-semibold text-ink">{inst.title}</p>
                        <p className="text-xs text-slate-500">
                          {inst.chain_name} · step {step?.name} · {step?.assignee_email}
                        </p>
                        <div className="mt-2 flex flex-wrap gap-2">
                          <Button
                            type="button"
                            className="!min-h-9 !text-xs"
                            onClick={() =>
                              ask({
                                title: "Approve step?",
                                message: `Approve “${step?.name}” on ${inst.title}?`,
                                confirmLabel: "Approve",
                                onConfirm: () => {
                                  decideApprovalStep({
                                    instanceId: inst.id,
                                    actorEmail: profile.email,
                                    decision: "approved"
                                  });
                                  refresh();
                                }
                              })
                            }
                          >
                            Approve
                          </Button>
                          <Button
                            type="button"
                            variant="danger"
                            className="!min-h-9 !text-xs"
                            onClick={() =>
                              ask({
                                title: "Reject?",
                                message: `Reject ${inst.title}?`,
                                confirmLabel: "Reject",
                                tone: "danger",
                                onConfirm: () => {
                                  decideApprovalStep({
                                    instanceId: inst.id,
                                    actorEmail: profile.email,
                                    decision: "rejected"
                                  });
                                  refresh();
                                }
                              })
                            }
                          >
                            Reject
                          </Button>
                        </div>
                      </li>
                    );
                  })
              )}
            </ul>
          </Panel>
        </div>
      ) : null}

      {tab === "events" ? (
        <Panel className="p-0 overflow-hidden">
          <div className="border-b border-line px-4 py-3">
            <p className="font-bold text-ink">Event log</p>
            <p className="text-xs text-slate-500">Every business event — replay to re-run matching rules into the queue.</p>
          </div>
          <ul className="divide-y divide-line">
            {events.map((e) => {
              const candidates = previewMatchingRules(tenantId, e.event_key, e.payload, e.actor_email || undefined);
              return (
              <li key={e.id} className="flex flex-col gap-2 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="min-w-0">
                  <p className="font-semibold text-ink">{e.title}</p>
                  <p className="truncate text-xs text-slate-500">
                    {e.event_key} · {new Date(e.created_at).toLocaleString()} · matched {e.matched_rule_ids.length}
                    {e.matched_rule_ids.length === 0 && candidates.length > 0
                      ? ` (${candidates.length} rule(s) skipped — conditions)`
                      : e.matched_rule_ids.length === 0
                        ? " — add a rule for this event key or check conditions"
                        : ""}
                  </p>
                  {e.action_results?.length ? (
                    <ul className="mt-1 space-y-0.5 text-[11px] text-slate-600">
                      {e.action_results.map((ar, i) => (
                        <li key={`${ar.action_id}-${i}`}>
                          <span className={ar.ok ? "text-teal" : "text-red-600"}>{ar.ok ? "✓" : "✗"}</span>{" "}
                          {ar.type}: {ar.detail}
                        </li>
                      ))}
                    </ul>
                  ) : null}
                </div>
                <Button
                  type="button"
                  variant="secondary"
                  className="!min-h-9 !text-xs"
                  onClick={() => {
                    const result = replayBusinessEvent(tenantId, e.id);
                    setNotice(
                      result
                        ? `Replayed ${e.event_key} — matched ${result.matched_rule_ids.length} rule(s). Check Tasks tab.`
                        : "Could not replay."
                    );
                    refresh();
                  }}
                >
                  Replay
                </Button>
              </li>
            );
            })}
            {events.length === 0 ? <li className="px-4 py-8 text-center text-sm text-slate-500">No events yet — emit a test event from Rules.</li> : null}
          </ul>
        </Panel>
      ) : null}

      {tab === "tasks" ? (
        <Panel className="p-0 overflow-hidden">
          <div className="border-b border-line px-4 py-3">
            <p className="font-bold text-ink">Automation tasks</p>
            <p className="text-xs text-slate-500">Created by “create task” actions on rules.</p>
          </div>
          <ul className="divide-y divide-line">
            {tasks.map((t) => (
              <li key={t.id} className="flex items-center justify-between gap-2 px-4 py-3">
                <div>
                  <p className="font-semibold text-ink">{t.title}</p>
                  <p className="text-xs text-slate-500">
                    {t.assignee_email || "Unassigned"} · {t.status} · {t.module}
                  </p>
                </div>
                {t.status === "open" ? (
                  <Button type="button" variant="secondary" className="!min-h-9 !text-xs" onClick={() => completeAutomationTask(t.id)}>
                    Complete
                  </Button>
                ) : (
                  <Badge tone="success">Done</Badge>
                )}
              </li>
            ))}
            {tasks.length === 0 ? <li className="px-4 py-8 text-center text-sm text-slate-500">No automation tasks.</li> : null}
          </ul>
        </Panel>
      ) : null}

      {tab === "outbox" ? (
        <Panel className="p-0 overflow-hidden">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-line px-4 py-3">
            <div>
              <p className="font-bold text-ink">Email outbox</p>
              <p className="text-xs text-slate-500">
                Queued sends from automation rules and security alerts — verify the <strong>To</strong> address here.
              </p>
            </div>
            <Button type="button" variant="secondary" className="gap-1.5" onClick={refresh}>
              <RefreshCw className="size-4" />
              Refresh
            </Button>
          </div>
          <ul className="divide-y divide-line">
            {outbox.map((job) => {
              const payload = job.payload as { to?: string | string[]; templateKey?: string; meta?: Record<string, unknown> };
              const to = Array.isArray(payload.to) ? payload.to.join(", ") : payload.to || "—";
              const fromAutomation = Boolean(payload.meta?.automation);
              return (
                <li key={job.id} className="px-4 py-3">
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge tone={job.status === "sent" ? "success" : job.status === "failed" ? "danger" : "info"}>
                      {job.status}
                    </Badge>
                    {fromAutomation ? <Badge tone="neutral">automation</Badge> : null}
                    <span className="text-xs text-slate-500">{new Date(job.created_at).toLocaleString()}</span>
                  </div>
                  <p className="mt-1 font-semibold text-ink">
                    To: <span className="font-mono text-sm">{to}</span>
                  </p>
                  <p className="text-xs text-slate-500">
                    {payload.templateKey || job.kind}
                    {job.last_error ? ` · ${job.last_error}` : ""}
                  </p>
                </li>
              );
            })}
            {outbox.length === 0 ? (
              <li className="px-4 py-8 text-center text-sm text-slate-500">No queued emails yet.</li>
            ) : null}
          </ul>
        </Panel>
      ) : null}

      {tab === "channels" ? (
        <div className="grid gap-3 md:grid-cols-2">
          {channels.map((c) => (
            <Panel key={c.channel} className="p-4">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="font-bold text-ink">{c.label}</p>
                  <p className="mt-1 text-sm text-slate-500">{c.description}</p>
                  <div className="mt-2 flex gap-2">
                    <Badge tone={c.ready ? "success" : "warning"}>{c.ready ? "Ready" : "Coming soon"}</Badge>
                    <Badge tone={c.enabled ? "info" : "neutral"}>{c.enabled ? "Enabled" : "Disabled"}</Badge>
                  </div>
                </div>
                <Button
                  type="button"
                  variant="secondary"
                  className="!min-h-9 !text-xs"
                  disabled={!c.ready && (c.channel === "sms" || c.channel === "whatsapp")}
                  onClick={() => {
                    setChannelEnabled(tenantId, c.channel, !c.enabled);
                    refresh();
                  }}
                >
                  {c.enabled ? "Disable" : "Enable"}
                </Button>
              </div>
            </Panel>
          ))}
        </div>
      ) : null}

      {/* Rule editor modal-ish panel */}
      {ruleDraft ? (
        <Panel className="mt-4 border-teal/40 p-4">
          <p className="font-bold text-ink">{ruleDraft.id ? "Edit rule" : "New rule"}</p>
          <div className="mt-3 grid gap-3 md:grid-cols-2">
            <Field label="Name">
              <TextInput value={ruleDraft.name} onChange={(e) => setRuleDraft({ ...ruleDraft, name: e.target.value })} />
            </Field>
            <Field label="Module">
              <SelectInput
                value={ruleDraft.module}
                onChange={(e) => setRuleDraft({ ...ruleDraft, module: e.target.value as ModuleKey | "platform" })}
              >
                {MODULE_OPTIONS.map((m) => (
                  <option key={m} value={m}>
                    {m === "platform" ? "Platform" : moduleLabels[m]}
                  </option>
                ))}
              </SelectInput>
            </Field>
            <Field label="When event" className="md:col-span-2">
              <SelectInput
                value={ruleDraft.event_key}
                onChange={(e) => {
                  const eventKey = e.target.value;
                  setRuleDraft({
                    ...ruleDraft,
                    event_key: eventKey,
                    actions: applyEventPresetsToActions(eventKey, ruleDraft.actions)
                  });
                  setNotice("Titles, messages, and recipients updated from event — edit any field as needed.");
                }}
              >
                {eventsForModule("all").map((e) => (
                  <option key={e.key} value={e.key}>
                    {e.label} — {e.key}
                  </option>
                ))}
              </SelectInput>
              {ruleDraft.event_key === "auth.login" &&
              ruleDraft.actions.some((a) => a.type === "send_email") ? (
                <p className="mt-1 text-[11px] leading-snug text-slate-500">
                  Built-in “Sign-in alert” email to the logged-in account is <strong>skipped</strong> while this rule
                  has a Send email action — only your Email To address receives login mail.
                </p>
              ) : null}
            </Field>
            <Field label="Description" className="md:col-span-2">
              <TextArea rows={2} value={ruleDraft.description || ""} onChange={(e) => setRuleDraft({ ...ruleDraft, description: e.target.value })} />
            </Field>
          </div>

          <p className="mt-4 text-xs font-bold uppercase tracking-wide text-slate-500">Actions</p>
          {!channels.find((c) => c.channel === "email")?.enabled ? (
            <p className="mt-2 rounded-[var(--bs-radius)] border border-amber-300 bg-amber-50 px-3 py-2 text-xs text-amber-900">
              Email channel is disabled. Enable it under the <strong>Channels</strong> tab or Send email actions will not queue mail.
            </p>
          ) : null}
          <div className="mt-2 space-y-3">
            {ruleDraft.actions.map((a, idx) => (
              <div key={a.id} className="rounded-[var(--bs-radius)] border border-line p-3">
                <div className="grid gap-2 md:grid-cols-2">
                  <Field label="Type">
                    <SelectInput
                      value={a.type}
                      onChange={(e) => {
                        const nextType = e.target.value as AutomationAction["type"];
                        const actions = [...ruleDraft.actions];
                        const preset = presetForEventAction(ruleDraft.event_key, nextType);
                        let next = applyPresetToAction({ ...a, type: nextType }, preset);
                        if (nextType === "send_email") {
                          const tplKey = preset.emailTemplateKey || "generic.notification";
                          const tpl = emailTemplates.find((t) => t.key === tplKey);
                          if (tpl) next = applyTemplateToAction(next, tpl);
                        }
                        actions[idx] = next;
                        setRuleDraft({ ...ruleDraft, actions });
                      }}
                    >
                      <option value="notify_in_app">Notify in-app</option>
                      <option value="send_email">Send email</option>
                      <option value="create_task">Create task</option>
                      <option value="assign">Assign / notify assignee</option>
                      <option value="start_approval">Start approval chain</option>
                      <option value="log_only">Log only</option>
                    </SelectInput>
                  </Field>
                  <Field label={recipientLabel(a.type)}>
                    <TextInput
                      value={recipientValue(a)}
                      placeholder={recipientPlaceholder(a.type)}
                      onChange={(e) => {
                        const actions = [...ruleDraft.actions];
                        actions[idx] = patchRecipient(a, e.target.value);
                        setRuleDraft({ ...ruleDraft, actions });
                      }}
                    />
                    {a.type === "send_email" ? (
                      <p className="mt-1 text-[11px] leading-snug text-slate-500">
                        Sends SMTP email only when action type is <strong>Send email</strong>. Use a literal address
                        (e.g. <code className="text-xs">muhammadkami999@gmail.com</code>) or{" "}
                        <code className="text-xs">{"{{support_email}}"}</code> from Settings → System.{" "}
                        <code className="text-xs">{"{{user_email}}"}</code> = signed-in user.
                      </p>
                    ) : null}
                  </Field>
                  {a.type === "send_email" ? (
                    <Field label="Email template" className="md:col-span-2">
                      <SelectInput
                        value={a.emailTemplateKey || "generic.notification"}
                        disabled={loadingTemplates}
                        onChange={(e) => {
                          const key = e.target.value;
                          const tpl = emailTemplates.find((t) => t.key === key);
                          const actions = [...ruleDraft.actions];
                          actions[idx] = tpl
                            ? applyTemplateToAction({ ...a, emailTemplateKey: key }, tpl)
                            : { ...a, emailTemplateKey: key };
                          setRuleDraft({ ...ruleDraft, actions });
                        }}
                      >
                        {loadingTemplates ? (
                          <option value="">Loading templates…</option>
                        ) : templatesForRule.length === 0 ? (
                          <option value="generic.notification">Generic notification</option>
                        ) : (
                          templatesForRule.map((tpl) => (
                            <option key={tpl.id} value={tpl.key}>
                              {tpl.name} ({tpl.category}) — {tpl.key}
                            </option>
                          ))
                        )}
                      </SelectInput>
                      <p className="mt-1 text-[11px] leading-snug text-slate-500">
                        All active templates from Settings → Email templates. Selecting one autofills Title and Message
                        — edit freely. Event-matched templates are listed first.
                      </p>
                    </Field>
                  ) : null}
                  {a.type === "send_email" ? (
                    <div className="md:col-span-2">
                      <Button
                        type="button"
                        variant="secondary"
                        className="gap-1.5 !min-h-9 !text-xs"
                        onClick={async () => {
                          const normalized = normalizeRuleActions([a])[0];
                          const vars = normalizeEventVars(
                            getEventCatalogEntry(ruleDraft.event_key)?.samplePayload || {},
                            { actorEmail: profile.email, eventKey: ruleDraft.event_key }
                          );
                          const recipients = resolveRecipients(normalized.to, vars);
                          if (!recipients.length) {
                            setNotice("Enter a valid Email To address first (e.g. muhammadkami999@gmail.com).");
                            return;
                          }
                          startOutboxWorker();
                          const result = dispatchAction(normalized, {
                            tenantId,
                            module: ruleDraft.module,
                            vars
                          });
                          const flush = await flushOutbox();
                          setNotice(
                            result.ok
                              ? `${result.detail} · outbox sent ${flush.sent}, failed ${flush.failed}. Check Email outbox tab.`
                              : result.detail
                          );
                          refresh();
                        }}
                      >
                        <Mail className="size-3.5" />
                        Send test email now
                      </Button>
                    </div>
                  ) : null}
                  {a.type === "create_task" ? (
                    <Field label="Task title">
                      <TextInput
                        value={a.taskTitle || a.title || ""}
                        onChange={(e) => {
                          const actions = [...ruleDraft.actions];
                          actions[idx] = { ...a, taskTitle: e.target.value };
                          setRuleDraft({ ...ruleDraft, actions });
                        }}
                      />
                    </Field>
                  ) : null}
                  <Field label="Title">
                    <TextInput
                      value={a.title || ""}
                      onChange={(e) => {
                        const actions = [...ruleDraft.actions];
                        actions[idx] = { ...a, title: e.target.value };
                        setRuleDraft({ ...ruleDraft, actions });
                      }}
                    />
                  </Field>
                  <Field label="Href">
                    <TextInput
                      value={a.href || ""}
                      onChange={(e) => {
                        const actions = [...ruleDraft.actions];
                        actions[idx] = { ...a, href: e.target.value };
                        setRuleDraft({ ...ruleDraft, actions });
                      }}
                    />
                  </Field>
                  {a.type === "start_approval" ? (
                    <Field label="Approval chain id" className="md:col-span-2">
                      <SelectInput
                        value={a.approvalChainId || ""}
                        onChange={(e) => {
                          const actions = [...ruleDraft.actions];
                          actions[idx] = { ...a, approvalChainId: e.target.value };
                          setRuleDraft({ ...ruleDraft, actions });
                        }}
                      >
                        <option value="">Select chain…</option>
                        {listApprovalChains(tenantId).map((c) => (
                          <option key={c.id} value={c.id}>
                            {c.name}
                          </option>
                        ))}
                      </SelectInput>
                    </Field>
                  ) : null}
                  <Field label="Message" className="md:col-span-2">
                    <TextArea
                      rows={2}
                      value={a.message || ""}
                      onChange={(e) => {
                        const actions = [...ruleDraft.actions];
                        actions[idx] = { ...a, message: e.target.value };
                        setRuleDraft({ ...ruleDraft, actions });
                      }}
                    />
                  </Field>
                </div>
              </div>
            ))}
          </div>
          <div className="mt-3 flex flex-wrap gap-2">
            <Button
              type="button"
              variant="secondary"
              onClick={() =>
                setRuleDraft({
                  ...ruleDraft,
                  actions: applyEventPresetsToActions(ruleDraft.event_key, ruleDraft.actions)
                })
              }
            >
              Autofill from event
            </Button>
            <Button
              type="button"
              variant="secondary"
              onClick={() =>
                setRuleDraft({
                  ...ruleDraft,
                  actions: [...ruleDraft.actions, newActionForEvent(ruleDraft.event_key)]
                })
              }
            >
              Add action
            </Button>
            <Button
              type="button"
              onClick={() =>
                askSave({
                  editing: Boolean(ruleDraft.id),
                  entityLabel: "automation rule",
                  onConfirm: () => {
                    if (!ruleDraft.name.trim() || !ruleDraft.event_key) {
                      setNotice("Name and event are required.");
                      return;
                    }
                    const sampleVars = normalizeEventVars(
                      getEventCatalogEntry(ruleDraft.event_key)?.samplePayload || {},
                      { actorEmail: profile.email, eventKey: ruleDraft.event_key }
                    );
                    const normalizedActions = normalizeRuleActions(ruleDraft.actions);
                    for (const action of normalizedActions) {
                      if (action.type !== "send_email") continue;
                      const recipients = resolveRecipients(action.to, sampleVars);
                      if (!recipients.length) {
                        setNotice(
                          `Send email action needs a valid Email To (e.g. muhammadkami999@gmail.com).`
                        );
                        return;
                      }
                    }
                    saveRule({
                      ...ruleDraft,
                      id: ruleDraft.id || undefined,
                      name: ruleDraft.name.trim(),
                      actions: normalizedActions
                    });
                    void pushAutomationToSupabase(tenantId);
                    setRuleDraft(null);
                    const emailTargets = emailActionsSummary(normalizedActions);
                    setNotice(
                      emailTargets
                        ? `Rule saved. Email will go to: ${emailTargets}. Use “Send test email now” or trigger the event.`
                        : "Rule saved."
                    );
                    refresh();
                  }
                })
              }
            >
              Save rule
            </Button>
            <Button type="button" variant="ghost" onClick={() => setRuleDraft(null)}>
              Cancel
            </Button>
          </div>
        </Panel>
      ) : null}

      {scheduleDraft ? (
        <Panel className="mt-4 border-teal/40 p-4">
          <p className="font-bold text-ink">{scheduleDraft.id ? "Edit schedule" : "New schedule"}</p>
          <div className="mt-3 grid gap-3 md:grid-cols-2">
            <Field label="Name">
              <TextInput value={scheduleDraft.name} onChange={(e) => setScheduleDraft({ ...scheduleDraft, name: e.target.value })} />
            </Field>
            <Field label="Frequency">
              <SelectInput
                value={scheduleDraft.frequency}
                onChange={(e) =>
                  setScheduleDraft({
                    ...scheduleDraft,
                    frequency: e.target.value as AutomationSchedule["frequency"]
                  })
                }
              >
                <option value="hourly">Hourly</option>
                <option value="daily">Daily</option>
                <option value="weekly">Weekly</option>
              </SelectInput>
            </Field>
            <Field label="Time (HH:mm)">
              <TextInput
                value={scheduleDraft.time_hhmm}
                onChange={(e) => setScheduleDraft({ ...scheduleDraft, time_hhmm: e.target.value })}
              />
            </Field>
            {scheduleDraft.frequency === "weekly" ? (
              <Field label="Weekday (0=Sun … 6=Sat)">
                <TextInput
                  type="number"
                  min={0}
                  max={6}
                  value={scheduleDraft.weekday ?? 1}
                  onChange={(e) => setScheduleDraft({ ...scheduleDraft, weekday: Number(e.target.value) })}
                />
              </Field>
            ) : null}
            <Field label="Emit event" className="md:col-span-2">
              <SelectInput
                value={scheduleDraft.event_key}
                onChange={(e) => setScheduleDraft({ ...scheduleDraft, event_key: e.target.value })}
              >
                {eventsForModule("all").map((e) => (
                  <option key={e.key} value={e.key}>
                    {e.label}
                  </option>
                ))}
              </SelectInput>
            </Field>
          </div>
          <div className="mt-3 flex gap-2">
            <Button
              type="button"
              onClick={() =>
                askSave({
                  editing: Boolean(scheduleDraft.id),
                  entityLabel: "schedule",
                  onConfirm: () => {
                    saveSchedule({ ...scheduleDraft, id: scheduleDraft.id || undefined, name: scheduleDraft.name.trim() });
                    setScheduleDraft(null);
                    refresh();
                  }
                })
              }
            >
              Save schedule
            </Button>
            <Button type="button" variant="ghost" onClick={() => setScheduleDraft(null)}>
              Cancel
            </Button>
          </div>
        </Panel>
      ) : null}

      {chainDraft ? (
        <Panel className="mt-4 border-teal/40 p-4">
          <p className="font-bold text-ink">{chainDraft.id ? "Edit approval chain" : "New approval chain"}</p>
          <div className="mt-3 grid gap-3 md:grid-cols-2">
            <Field label="Name">
              <TextInput value={chainDraft.name} onChange={(e) => setChainDraft({ ...chainDraft, name: e.target.value })} />
            </Field>
            <Field label="Module">
              <SelectInput
                value={chainDraft.module}
                onChange={(e) => setChainDraft({ ...chainDraft, module: e.target.value as ModuleKey | "platform" })}
              >
                {MODULE_OPTIONS.map((m) => (
                  <option key={m} value={m}>
                    {m}
                  </option>
                ))}
              </SelectInput>
            </Field>
          </div>
          <div className="mt-3 space-y-2">
            {chainDraft.steps
              .slice()
              .sort((a, b) => a.order - b.order)
              .map((s, idx) => (
                <div key={s.id} className="grid gap-2 rounded-[var(--bs-radius)] border border-line p-3 md:grid-cols-3">
                  <Field label="Step name">
                    <TextInput
                      value={s.name}
                      onChange={(e) => {
                        const steps = [...chainDraft.steps];
                        const i = steps.findIndex((x) => x.id === s.id);
                        steps[i] = { ...s, name: e.target.value, order: idx + 1 };
                        setChainDraft({ ...chainDraft, steps });
                      }}
                    />
                  </Field>
                  <Field label="Approver email" className="md:col-span-2">
                    <TextInput
                      value={s.approver_email || ""}
                      onChange={(e) => {
                        const steps = [...chainDraft.steps];
                        const i = steps.findIndex((x) => x.id === s.id);
                        steps[i] = { ...s, approver_email: e.target.value };
                        setChainDraft({ ...chainDraft, steps });
                      }}
                    />
                  </Field>
                </div>
              ))}
          </div>
          <div className="mt-3 flex gap-2">
            <Button
              type="button"
              variant="secondary"
              onClick={() =>
                setChainDraft({
                  ...chainDraft,
                  steps: [
                    ...chainDraft.steps,
                    {
                      id: crypto.randomUUID(),
                      name: `Step ${chainDraft.steps.length + 1}`,
                      order: chainDraft.steps.length + 1,
                      approver_email: ""
                    }
                  ]
                })
              }
            >
              Add step
            </Button>
            <Button
              type="button"
              onClick={() =>
                askSave({
                  editing: Boolean(chainDraft.id),
                  entityLabel: "approval chain",
                  onConfirm: () => {
                    saveApprovalChain({ ...chainDraft, id: chainDraft.id || undefined, name: chainDraft.name.trim() });
                    setChainDraft(null);
                    refresh();
                  }
                })
              }
            >
              Save chain
            </Button>
            <Button type="button" variant="ghost" onClick={() => setChainDraft(null)}>
              Cancel
            </Button>
          </div>
        </Panel>
      ) : null}
    </div>
  );
}
