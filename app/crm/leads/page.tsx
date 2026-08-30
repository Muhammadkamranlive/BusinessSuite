"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { AppShell } from "@/components/app-shell";
import { ModuleBreadcrumbs } from "@/components/common/module-breadcrumbs";
import { PageHeader } from "@/components/common/page-header";
import { StatusBadge } from "@/components/common/status-badge";
import { DataListToolbar } from "@/components/common/data-list-toolbar";
import { RecordRowActions } from "@/components/common/record-row-actions";
import { useConfirm } from "@/components/common/use-confirm";
import { ExtraFieldsBlock } from "@/components/forms/extra-fields-block";
import { ExtraFieldsReadout } from "@/components/forms/extra-fields-readout";
import { Button, Field, Panel, SelectInput, TextInput } from "@/components/ui";
import { getStoredTenantId } from "@/lib/auth/session";
import { exportListCsv, exportListPdf } from "@/lib/list-export";
import { filterAndSort } from "@/lib/list-query";
import { money } from "@/lib/utils";
import { getExtraFieldValues, persistExtraFields } from "@/modules/forms/services/extra-fields.store";
import { createLead, listCampaigns, listLeads, trashLead, updateLead } from "@/modules/crm/services/crm.store";
import type { Lead, LeadPriority, LeadStatus } from "@/modules/crm/types";

const empty = {
  company_name: "",
  contact_name: "",
  email: "",
  phone: "",
  source: "website",
  status: "new" as LeadStatus,
  priority: "medium" as LeadPriority,
  estimated_value: "",
  notes: "",
  campaign_id: ""
};

export default function LeadsPage() {
  const tenantId = getStoredTenantId() ?? "alpha";
  const { askSave, askTrash, dialog } = useConfirm();
  const [leads, setLeads] = useState<Lead[]>([]);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [sortField, setSortField] = useState("company_name");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");
  const [openForm, setOpenForm] = useState(false);
  const [editing, setEditing] = useState<Lead | null>(null);
  const [error, setError] = useState("");
  const [form, setForm] = useState(empty);
  const [extraJson, setExtraJson] = useState("");
  const campaigns = listCampaigns(tenantId);

  function refresh() {
    setLeads(listLeads(tenantId));
  }

  useEffect(() => {
    refresh();
  }, [tenantId]);

  const filtered = useMemo(
    () =>
      filterAndSort(leads as unknown as Array<Record<string, unknown>>, {
        search,
        searchFields: ["lead_no", "company_name", "contact_name", "email", "phone", "source"],
        statusField: "status",
        statusValue: statusFilter,
        sortField,
        sortDir
      }) as unknown as Lead[],
    [leads, search, statusFilter, sortField, sortDir]
  );

  function openCreate() {
    setEditing(null);
    setForm(empty);
    setExtraJson("");
    setError("");
    setOpenForm(true);
  }

  function openEdit(row: Lead) {
    setEditing(row);
    setForm({
      company_name: row.company_name,
      contact_name: row.contact_name,
      email: row.email,
      phone: row.phone,
      source: row.source,
      status: row.status,
      priority: row.priority,
      estimated_value: String(row.estimated_value),
      notes: row.notes ?? "",
      campaign_id: row.campaign_id ?? ""
    });
    setExtraJson(getExtraFieldValues(tenantId, "crm.lead", row.id));
    setError("");
    setOpenForm(true);
  }

  function doSave() {
    setError("");
    if (!form.company_name.trim() || !form.contact_name.trim() || !form.email.trim()) {
      setError("Company name, contact name, and email are required.");
      return;
    }
    const payload = {
      company_name: form.company_name.trim(),
      contact_name: form.contact_name.trim(),
      email: form.email.trim(),
      phone: form.phone.trim(),
      source: form.source.trim() || "website",
      status: form.status,
      priority: form.priority,
      estimated_value: Number(form.estimated_value) || 0,
      assigned_to: editing?.assigned_to ?? null,
      notes: form.notes.trim() || null,
      campaign_id: form.campaign_id || null
    };
    if (editing) {
      updateLead(editing.id, payload);
      persistExtraFields(tenantId, "crm.lead", editing.id, extraJson);
    } else {
      const row = createLead(tenantId, payload);
      persistExtraFields(tenantId, "crm.lead", row.id, extraJson);
    }
    setExtraJson("");
    setForm(empty);
    setEditing(null);
    setOpenForm(false);
    refresh();
  }

  function submit(e: React.FormEvent) {
    e.preventDefault();
    askSave({
      editing: Boolean(editing),
      entityLabel: "lead",
      onConfirm: doSave
    });
  }

  return (
    <AppShell activeModule="crm">
      <ModuleBreadcrumbs />
      <PageHeader title="Leads" description="Manage and track sales leads for your company." actionLabel="New Lead" onAction={openCreate} />

      {openForm ? (
        <Panel className="mb-4">
          <form onSubmit={submit} className="grid gap-3 md:grid-cols-2">
            {error ? <p className="md:col-span-2 text-sm text-rose-600">{error}</p> : null}
            <Field label="Company Name">
              <TextInput value={form.company_name} onChange={(e) => setForm({ ...form, company_name: e.target.value })} required />
            </Field>
            <Field label="Contact Name">
              <TextInput value={form.contact_name} onChange={(e) => setForm({ ...form, contact_name: e.target.value })} required />
            </Field>
            <Field label="Email">
              <TextInput type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} required />
            </Field>
            <Field label="Phone">
              <TextInput value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
            </Field>
            <Field label="Source">
              <TextInput value={form.source} onChange={(e) => setForm({ ...form, source: e.target.value })} />
            </Field>
            <Field label="Campaign">
              <SelectInput value={form.campaign_id} onChange={(e) => setForm({ ...form, campaign_id: e.target.value })}>
                <option value="">None</option>
                {campaigns.map((c) => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </SelectInput>
            </Field>
            <Field label="Estimated Value">
              <TextInput type="number" min={0} value={form.estimated_value} onChange={(e) => setForm({ ...form, estimated_value: e.target.value })} />
            </Field>
            <Field label="Status">
              <SelectInput value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value as LeadStatus })}>
                {["new", "contacted", "qualified", "lost", "converted"].map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </SelectInput>
            </Field>
            <Field label="Priority">
              <SelectInput value={form.priority} onChange={(e) => setForm({ ...form, priority: e.target.value as LeadPriority })}>
                {["low", "medium", "high"].map((p) => (
                  <option key={p} value={p}>
                    {p}
                  </option>
                ))}
              </SelectInput>
            </Field>
            <Field label="Notes" className="md:col-span-2">
              <TextInput value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
            </Field>
            <ExtraFieldsBlock formKey="crm.lead" valueJson={extraJson} onChange={setExtraJson} />
            <div className="md:col-span-2 flex gap-2">
              <Button type="submit">{editing ? "Update lead" : "Save lead"}</Button>
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
              {!editing ? (
                <Link href="/crm/leads/new" className="self-center text-sm font-semibold text-teal hover:underline">
                  Open full form
                </Link>
              ) : null}
            </div>
          </form>
        </Panel>
      ) : null}

      <Panel>
        <DataListToolbar
          search={search}
          onSearchChange={setSearch}
          searchPlaceholder="Search leads…"
          filterLabel="statuses"
          filterValue={statusFilter}
          filterOptions={[
            { value: "new", label: "new" },
            { value: "contacted", label: "contacted" },
            { value: "qualified", label: "qualified" },
            { value: "lost", label: "lost" },
            { value: "converted", label: "converted" }
          ]}
          onFilterChange={setStatusFilter}
          sortValue={sortField}
          sortOptions={[
            { value: "lead_no", label: "Lead no" },
            { value: "company_name", label: "Company" },
            { value: "contact_name", label: "Contact" },
            { value: "status", label: "Status" },
            { value: "estimated_value", label: "Value" }
          ]}
          onSortChange={setSortField}
          sortDir={sortDir}
          onSortDirChange={setSortDir}
          onExportCsv={() =>
            exportListCsv({
              tenantId,
              module: "crm",
              filename: "leads",
              rows: filtered.map((lead) => ({
                No: lead.lead_no,
                Company: lead.company_name,
                Contact: lead.contact_name,
                Source: lead.source,
                Priority: lead.priority,
                Status: lead.status,
                Value: lead.estimated_value
              }))
            })
          }
          onExportPdf={() =>
            exportListPdf({
              tenantId,
              module: "crm",
              title: "Leads",
              filename: "leads",
              columns: ["No", "Company", "Contact", "Status", "Value"],
              rows: filtered.map((lead) => [lead.lead_no, lead.company_name, lead.contact_name, lead.status, String(lead.estimated_value)])
            })
          }
        />
        <div className="overflow-x-auto">
          <table className="min-w-full text-left text-sm">
            <thead>
              <tr className="border-b border-line bg-cloud">
                {["Lead No", "Company", "Contact", "Source", "Priority", "Status", "Value", ""].map((h) => (
                  <th key={h || "a"} className="px-3 py-3 font-semibold text-slate-600">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map((lead) => (
                <tr key={lead.id} className="border-b border-line">
                  <td className="px-3 py-3 font-medium">
                    <Link href={`/crm/leads/${lead.id}`} className="text-teal hover:underline">
                      {lead.lead_no}
                    </Link>
                    <ExtraFieldsReadout tenantId={tenantId} formKey="crm.lead" recordId={lead.id} />
                  </td>
                  <td className="px-3 py-3">{lead.company_name}</td>
                  <td className="px-3 py-3">{lead.contact_name}</td>
                  <td className="px-3 py-3 capitalize">{lead.source.replace(/_/g, " ")}</td>
                  <td className="px-3 py-3 capitalize">{lead.priority}</td>
                  <td className="px-3 py-3">
                    <StatusBadge status={lead.status} />
                  </td>
                  <td className="px-3 py-3">{money(lead.estimated_value)}</td>
                  <td className="px-3 py-3">
                    <RecordRowActions
                      onEdit={() => openEdit(lead)}
                      onTrash={() =>
                        askTrash({
                          entityLabel: "lead",
                          name: lead.company_name,
                          onConfirm: () => {
                            trashLead(lead.id);
                            refresh();
                          }
                        })
                      }
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Panel>
      {dialog}
    </AppShell>
  );
}
