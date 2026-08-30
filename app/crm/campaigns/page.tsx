"use client";

import { useEffect, useMemo, useState } from "react";
import { AppShell } from "@/components/app-shell";
import { ModuleBreadcrumbs } from "@/components/common/module-breadcrumbs";
import { PageHeader } from "@/components/common/page-header";
import { StatusBadge } from "@/components/common/status-badge";
import { DataListToolbar } from "@/components/common/data-list-toolbar";
import { RecordRowActions } from "@/components/common/record-row-actions";
import { useConfirm } from "@/components/common/use-confirm";
import { ExtraFieldsBlock } from "@/components/forms/extra-fields-block";
import { Button, Field, Panel, SelectInput, TextInput } from "@/components/ui";
import { getStoredTenantId } from "@/lib/auth/session";
import { exportListCsv, exportListPdf } from "@/lib/list-export";
import { filterAndSort } from "@/lib/list-query";
import { persistExtraFields } from "@/modules/forms/services/extra-fields.store";
import { money } from "@/lib/utils";
import {
  createCampaign,
  campaignRoi,
  listCampaigns,
  trashCampaign,
  updateCampaign,
  type Campaign
} from "@/modules/crm/services/crm.store";

const empty = {
  name: "",
  channel: "email" as Campaign["channel"],
  status: "draft" as Campaign["status"],
  budget: "",
  spend: "",
  start_date: "",
  end_date: ""
};

export default function CampaignsPage() {
  const tenantId = getStoredTenantId() ?? "alpha";
  const { askSave, askTrash, dialog } = useConfirm();
  const [rows, setRows] = useState<Campaign[]>([]);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [sortField, setSortField] = useState("name");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");
  const [openForm, setOpenForm] = useState(false);
  const [editing, setEditing] = useState<Campaign | null>(null);
  const [form, setForm] = useState(empty);
  const [extraJson, setExtraJson] = useState("");

  function refresh() {
    setRows(listCampaigns(tenantId));
  }

  useEffect(() => { refresh(); }, [tenantId]);

  const filtered = useMemo(
    () =>
      filterAndSort(rows as unknown as Array<Record<string, unknown>>, {
        search,
        searchFields: ["name", "campaign_no", "channel"],
        statusField: "status",
        statusValue: statusFilter,
        sortField,
        sortDir
      }) as unknown as Campaign[],
    [rows, search, statusFilter, sortField, sortDir]
  );

  function doSave() {
    const payload = {
      name: form.name.trim(),
      channel: form.channel,
      status: form.status,
      budget: Number(form.budget) || 0,
      spend: Number(form.spend) || 0,
      start_date: form.start_date || null,
      end_date: form.end_date || null,
      notes: null
    };
    const row = editing ? updateCampaign(editing.id, payload) : createCampaign(tenantId, payload);
    if (row) persistExtraFields(tenantId, "crm.campaign", row.id, extraJson);
    setOpenForm(false);
    refresh();
  }

  return (
    <AppShell activeModule="crm">
      {dialog}
      <ModuleBreadcrumbs />
      <PageHeader title="Campaigns" description="Budget and channel tracking for lead sources. Execution lives in the database." actionLabel="Add campaign" onAction={() => { setEditing(null); setForm(empty); setExtraJson(""); setOpenForm(true); }} />
      {openForm ? (
        <Panel className="mb-4">
          <form className="grid gap-3 md:grid-cols-2" onSubmit={(e) => { e.preventDefault(); askSave({ editing: Boolean(editing), entityLabel: "campaign", onConfirm: doSave }); }}>
            <Field label="Name"><TextInput required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></Field>
            <Field label="Channel">
              <SelectInput value={form.channel} onChange={(e) => setForm({ ...form, channel: e.target.value as Campaign["channel"] })}>
                <option value="email">Email</option>
                <option value="sms">SMS</option>
                <option value="web">Web</option>
                <option value="event">Event</option>
                <option value="other">Other</option>
              </SelectInput>
            </Field>
            <Field label="Budget"><TextInput type="number" value={form.budget} onChange={(e) => setForm({ ...form, budget: e.target.value })} /></Field>
            <Field label="Spend"><TextInput type="number" value={form.spend} onChange={(e) => setForm({ ...form, spend: e.target.value })} /></Field>
            <div className="md:col-span-2"><ExtraFieldsBlock formKey="crm.campaign" valueJson={extraJson} onChange={setExtraJson} /></div>
            <div className="md:col-span-2"><Button type="submit">Save</Button></div>
          </form>
        </Panel>
      ) : null}
      <Panel>
        <DataListToolbar
          search={search}
          onSearchChange={setSearch}
          filterValue={statusFilter}
          filterOptions={[{ value: "all", label: "All" }, { value: "draft", label: "Draft" }, { value: "active", label: "Active" }, { value: "completed", label: "Completed" }]}
          onFilterChange={setStatusFilter}
          sortValue={sortField}
          sortOptions={[{ value: "name", label: "Name" }, { value: "budget", label: "Budget" }]}
          onSortChange={setSortField}
          sortDir={sortDir}
          onSortDirChange={setSortDir}
          onExportCsv={() => exportListCsv({ tenantId, module: "crm", filename: "campaigns", rows: filtered.map((r) => ({ No: r.campaign_no, Name: r.name, Channel: r.channel, Status: r.status, Budget: r.budget, Spend: r.spend })) })}
          onExportPdf={() => exportListPdf({ tenantId, module: "crm", title: "Campaigns", filename: "campaigns", columns: ["No", "Name", "Channel", "Status"], rows: filtered.map((r) => [r.campaign_no, r.name, r.channel, r.status]) })}
        />
        <table className="mt-3 w-full text-sm">
          <thead><tr className="text-left text-slate-500"><th className="px-3 py-2">Campaign</th><th>Channel</th><th>Status</th><th>Budget</th><th>Spend</th><th>Won / ROI</th><th /></tr></thead>
          <tbody>
            {filtered.map((r) => {
              const roi = campaignRoi(tenantId, r.id);
              return (
              <tr key={r.id} className="border-t border-line">
                <td className="px-3 py-3 font-semibold">{r.name}<div className="text-xs text-slate-500">{r.campaign_no} · {roi.leadCount} leads</div></td>
                <td className="capitalize">{r.channel}</td>
                <td><StatusBadge status={r.status} /></td>
                <td>{money(r.budget)}</td>
                <td>{money(r.spend)}</td>
                <td>{money(roi.won)} <span className="text-xs text-slate-500">({Math.round(roi.roi * 100)}%)</span></td>
                <td>
                  <RecordRowActions
                    onEdit={() => { setEditing(r); setForm({ name: r.name, channel: r.channel, status: r.status, budget: String(r.budget), spend: String(r.spend), start_date: r.start_date ?? "", end_date: r.end_date ?? "" }); setOpenForm(true); }}
                    onTrash={() => askTrash({ entityLabel: "campaign", onConfirm: () => { trashCampaign(r.id); refresh(); } })}
                  />
                </td>
              </tr>
            );
            })}
          </tbody>
        </table>
      </Panel>
    </AppShell>
  );
}
