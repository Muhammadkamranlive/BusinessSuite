"use client";

import { useEffect, useMemo, useState } from "react";
import { AppShell } from "@/components/app-shell";
import { ModuleBreadcrumbs } from "@/components/common/module-breadcrumbs";
import { PageHeader } from "@/components/common/page-header";
import { DataListToolbar } from "@/components/common/data-list-toolbar";
import { RecordRowActions } from "@/components/common/record-row-actions";
import { useConfirm } from "@/components/common/use-confirm";
import { ExtraFieldsBlock } from "@/components/forms/extra-fields-block";
import { ExtraFieldsReadout } from "@/components/forms/extra-fields-readout";
import { Button, Field, Panel, SelectInput, TextInput } from "@/components/ui";
import { getStoredTenantId } from "@/lib/auth/session";
import { exportListCsv, exportListPdf } from "@/lib/list-export";
import { filterAndSort } from "@/lib/list-query";
import { getExtraFieldValues, persistExtraFields } from "@/modules/forms/services/extra-fields.store";
import {
  createActivity,
  listActivities,
  listCustomers,
  listDeals,
  listLeads,
  trashActivity,
  updateActivity
} from "@/modules/crm/services/crm.store";
import type { ActivityType, CrmActivity } from "@/modules/crm/types";

const empty = {
  related_type: "lead" as CrmActivity["related_type"],
  related_id: "",
  activity_type: "call" as ActivityType,
  subject: "",
  description: "",
  due_date: ""
};

export default function ActivitiesPage() {
  const tenantId = getStoredTenantId() ?? "alpha";
  const { askSave, askTrash, dialog } = useConfirm();
  const [activities, setActivities] = useState<CrmActivity[]>([]);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [sortField, setSortField] = useState("subject");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");
  const [openForm, setOpenForm] = useState(false);
  const [editing, setEditing] = useState<CrmActivity | null>(null);
  const [error, setError] = useState("");
  const [form, setForm] = useState(empty);
  const [extraJson, setExtraJson] = useState("");
  const [relatedOptions, setRelatedOptions] = useState<Array<{ id: string; label: string }>>([]);

  function refresh() {
    setActivities(listActivities(tenantId).filter((a) => a.is_active !== false));
  }

  function loadRelated(type: CrmActivity["related_type"]) {
    if (type === "lead") {
      setRelatedOptions(listLeads(tenantId).map((l) => ({ id: l.id, label: `${l.lead_no} — ${l.company_name}` })));
    } else if (type === "customer") {
      setRelatedOptions(listCustomers(tenantId).map((c) => ({ id: c.id, label: `${c.customer_no} — ${c.name}` })));
    } else {
      setRelatedOptions(listDeals(tenantId).map((d) => ({ id: d.id, label: `${d.deal_no} — ${d.title}` })));
    }
  }

  useEffect(() => {
    refresh();
    loadRelated(form.related_type);
  }, [tenantId]);

  const rowsWithStatus = useMemo(
    () =>
      activities.map((a) => ({
        ...a,
        completion_status: a.completed_at ? "done" : "pending"
      })),
    [activities]
  );

  const filtered = useMemo(
    () =>
      filterAndSort(rowsWithStatus as unknown as Array<Record<string, unknown>>, {
        search,
        searchFields: ["subject", "activity_type", "related_type", "description"],
        statusField: "completion_status",
        statusValue: statusFilter,
        sortField,
        sortDir
      }) as unknown as Array<CrmActivity & { completion_status: string }>,
    [rowsWithStatus, search, statusFilter, sortField, sortDir]
  );

  function openCreate() {
    setEditing(null);
    setForm(empty);
    setExtraJson("");
    setError("");
    loadRelated("lead");
    setOpenForm(true);
  }

  function openEdit(row: CrmActivity) {
    setEditing(row);
    setForm({
      related_type: row.related_type,
      related_id: row.related_id,
      activity_type: row.activity_type,
      subject: row.subject,
      description: row.description ?? "",
      due_date: row.due_date ?? ""
    });
    setExtraJson(getExtraFieldValues(tenantId, "crm.activity", row.id));
    loadRelated(row.related_type);
    setError("");
    setOpenForm(true);
  }

  function doSave() {
    setError("");
    if (!form.subject.trim() || !form.related_id) {
      setError("Subject and related record are required.");
      return;
    }
    const payload = {
      related_type: form.related_type,
      related_id: form.related_id,
      activity_type: form.activity_type,
      subject: form.subject.trim(),
      description: form.description.trim() || null,
      due_date: form.due_date || null,
      completed_at: editing?.completed_at ?? null,
      assigned_to: editing?.assigned_to ?? null
    };
    if (editing) {
      updateActivity(editing.id, payload);
      persistExtraFields(tenantId, "crm.activity", editing.id, extraJson);
    } else {
      const row = createActivity(tenantId, payload);
      persistExtraFields(tenantId, "crm.activity", row.id, extraJson);
    }
    setExtraJson("");
    setForm(empty);
    setEditing(null);
    setOpenForm(false);
    loadRelated("lead");
    refresh();
  }

  function submit(e: React.FormEvent) {
    e.preventDefault();
    askSave({
      editing: Boolean(editing),
      entityLabel: "activity",
      onConfirm: doSave
    });
  }

  return (
    <AppShell activeModule="crm">
      <PageHeader title="CRM Activities" description="Log calls, meetings, and follow-ups." actionLabel="Log activity" onAction={openCreate} />
      <ModuleBreadcrumbs />

      {openForm ? (
        <Panel className="mb-4">
          <form onSubmit={submit} className="grid gap-3 md:grid-cols-2">
            {error ? <p className="md:col-span-2 text-sm text-rose-600">{error}</p> : null}
            <Field label="Related to">
              <SelectInput
                value={form.related_type}
                onChange={(e) => {
                  const related_type = e.target.value as CrmActivity["related_type"];
                  setForm({ ...form, related_type, related_id: "" });
                  loadRelated(related_type);
                }}
              >
                <option value="lead">Lead</option>
                <option value="customer">Customer</option>
                <option value="deal">Deal</option>
              </SelectInput>
            </Field>
            <Field label="Record">
              <SelectInput value={form.related_id} onChange={(e) => setForm({ ...form, related_id: e.target.value })} required>
                <option value="">Select…</option>
                {relatedOptions.map((o) => (
                  <option key={o.id} value={o.id}>
                    {o.label}
                  </option>
                ))}
              </SelectInput>
            </Field>
            <Field label="Type">
              <SelectInput value={form.activity_type} onChange={(e) => setForm({ ...form, activity_type: e.target.value as ActivityType })}>
                {["call", "email", "meeting", "note", "task"].map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </SelectInput>
            </Field>
            <Field label="Due date">
              <TextInput type="date" value={form.due_date} onChange={(e) => setForm({ ...form, due_date: e.target.value })} />
            </Field>
            <Field label="Subject" className="md:col-span-2">
              <TextInput value={form.subject} onChange={(e) => setForm({ ...form, subject: e.target.value })} required />
            </Field>
            <Field label="Description" className="md:col-span-2">
              <TextInput value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
            </Field>
            <ExtraFieldsBlock formKey="crm.activity" valueJson={extraJson} onChange={setExtraJson} />
            <div className="md:col-span-2 flex gap-2">
              <Button type="submit">{editing ? "Update activity" : "Save activity"}</Button>
              <Button
                type="button"
                variant="secondary"
                onClick={() => {
                  setExtraJson("");
                  setEditing(null);
                  setOpenForm(false);
                }}
              >
                Cancel
              </Button>
            </div>
          </form>
        </Panel>
      ) : null}

      <Panel>
        <DataListToolbar
          search={search}
          onSearchChange={setSearch}
          searchPlaceholder="Search activities…"
          filterLabel="statuses"
          filterValue={statusFilter}
          filterOptions={[
            { value: "pending", label: "Pending" },
            { value: "done", label: "Done" }
          ]}
          onFilterChange={setStatusFilter}
          sortValue={sortField}
          sortOptions={[
            { value: "subject", label: "Subject" },
            { value: "activity_type", label: "Type" },
            { value: "related_type", label: "Related" },
            { value: "due_date", label: "Due date" }
          ]}
          onSortChange={setSortField}
          sortDir={sortDir}
          onSortDirChange={setSortDir}
          onExportCsv={() =>
            exportListCsv({
              tenantId,
              module: "crm",
              filename: "activities",
              rows: filtered.map((a) => ({
                Subject: a.subject,
                Type: a.activity_type,
                Related: a.related_type,
                Due: a.due_date ?? "",
                Status: a.completed_at ? "Done" : "Pending"
              }))
            })
          }
          onExportPdf={() =>
            exportListPdf({
              tenantId,
              module: "crm",
              title: "CRM Activities",
              filename: "activities",
              columns: ["Subject", "Type", "Related", "Status"],
              rows: filtered.map((a) => [a.subject, a.activity_type, a.related_type, a.completed_at ? "Done" : "Pending"])
            })
          }
        />
        <ul className="space-y-3">
          {filtered.length === 0 ? <li className="text-sm text-slate-500">No activities yet. Click Log activity.</li> : null}
          {filtered.map((a) => (
            <li key={a.id} className="flex flex-wrap items-start justify-between gap-3 rounded-md border border-line bg-cloud px-4 py-3">
              <div>
                <p className="font-semibold text-ink">{a.subject}</p>
                <ExtraFieldsReadout tenantId={tenantId} formKey="crm.activity" recordId={a.id} />
                <p className="text-sm text-slate-500 capitalize">
                  {a.activity_type} · {a.related_type}
                </p>
                {a.description ? <p className="mt-1 text-sm text-slate-600">{a.description}</p> : null}
              </div>
              <div className="flex flex-col items-end gap-2">
                <span className="text-xs text-slate-400">{a.completed_at ? "Done" : "Pending"}</span>
                <RecordRowActions
                  onEdit={() => openEdit(a)}
                  onTrash={() =>
                    askTrash({
                      entityLabel: "activity",
                      name: a.subject,
                      onConfirm: () => {
                        trashActivity(a.id);
                        refresh();
                      }
                    })
                  }
                />
              </div>
            </li>
          ))}
        </ul>
      </Panel>
      {dialog}
    </AppShell>
  );
}
