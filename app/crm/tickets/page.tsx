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
import { Button, Field, Panel, SelectInput, TextArea, TextInput } from "@/components/ui";
import { getStoredTenantId } from "@/lib/auth/session";
import { exportListCsv, exportListPdf } from "@/lib/list-export";
import { filterAndSort } from "@/lib/list-query";
import { persistExtraFields } from "@/modules/forms/services/extra-fields.store";
import { createTicket, listCustomers, listTickets, ticketSlaBreached, trashTicket, updateTicket, type Ticket } from "@/modules/crm/services/crm.store";

const empty = { subject: "", customer_id: "", priority: "medium" as Ticket["priority"], status: "open" as Ticket["status"], sla_hours: "24", description: "" };

export default function TicketsPage() {
  const tenantId = getStoredTenantId() ?? "alpha";
  const { askSave, askTrash, dialog } = useConfirm();
  const [rows, setRows] = useState<Ticket[]>([]);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [sortField, setSortField] = useState("ticket_no");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");
  const [openForm, setOpenForm] = useState(false);
  const [editing, setEditing] = useState<Ticket | null>(null);
  const [form, setForm] = useState(empty);
  const [extraJson, setExtraJson] = useState("");
  const customers = listCustomers(tenantId);

  function refresh() { setRows(listTickets(tenantId)); }
  useEffect(() => { refresh(); }, [tenantId]);

  const filtered = useMemo(
    () => filterAndSort(rows as unknown as Array<Record<string, unknown>>, { search, searchFields: ["ticket_no", "subject", "status"], statusField: "status", statusValue: statusFilter, sortField, sortDir }) as unknown as Ticket[],
    [rows, search, statusFilter, sortField, sortDir]
  );

  function doSave() {
    const payload = {
      subject: form.subject.trim(),
      customer_id: form.customer_id || null,
      priority: form.priority,
      status: form.status,
      sla_hours: Number(form.sla_hours) || 24,
      description: form.description.trim() || null,
      csat_score: null
    };
    const row = editing ? updateTicket(editing.id, payload) : createTicket(tenantId, payload);
    if (row) persistExtraFields(tenantId, "crm.ticket", row.id, extraJson);
    setOpenForm(false);
    refresh();
  }

  return (
    <AppShell activeModule="crm">
      {dialog}
      <ModuleBreadcrumbs />
      <PageHeader title="Tickets" description="Support cases with SLA due times stored in the database." actionLabel="New ticket" onAction={() => { setEditing(null); setForm(empty); setExtraJson(""); setOpenForm(true); }} />
      {openForm ? (
        <Panel className="mb-4">
          <form className="grid gap-3 md:grid-cols-2" onSubmit={(e) => { e.preventDefault(); askSave({ editing: Boolean(editing), entityLabel: "ticket", onConfirm: doSave }); }}>
            <Field label="Subject"><TextInput required value={form.subject} onChange={(e) => setForm({ ...form, subject: e.target.value })} /></Field>
            <Field label="Customer">
              <SelectInput value={form.customer_id} onChange={(e) => setForm({ ...form, customer_id: e.target.value })}>
                <option value="">None</option>
                {customers.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
              </SelectInput>
            </Field>
            <Field label="Priority">
              <SelectInput value={form.priority} onChange={(e) => setForm({ ...form, priority: e.target.value as Ticket["priority"] })}>
                <option value="low">Low</option><option value="medium">Medium</option><option value="high">High</option>
              </SelectInput>
            </Field>
            <Field label="SLA hours"><TextInput type="number" value={form.sla_hours} onChange={(e) => setForm({ ...form, sla_hours: e.target.value })} /></Field>
            <div className="md:col-span-2"><Field label="Description"><TextArea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} /></Field></div>
            <div className="md:col-span-2"><ExtraFieldsBlock formKey="crm.ticket" valueJson={extraJson} onChange={setExtraJson} /></div>
            <div className="md:col-span-2"><Button type="submit">Save</Button></div>
          </form>
        </Panel>
      ) : null}
      <Panel>
        <DataListToolbar
          search={search}
          onSearchChange={setSearch}
          filterValue={statusFilter}
          filterOptions={[{ value: "all", label: "All" }, { value: "open", label: "Open" }, { value: "resolved", label: "Resolved" }]}
          onFilterChange={setStatusFilter}
          sortValue={sortField}
          sortOptions={[{ value: "ticket_no", label: "Number" }]}
          onSortChange={setSortField}
          sortDir={sortDir}
          onSortDirChange={setSortDir}
          onExportCsv={() => exportListCsv({ tenantId, module: "crm", filename: "tickets", rows: filtered.map((r) => ({ No: r.ticket_no, Subject: r.subject, Status: r.status })) })}
          onExportPdf={() => exportListPdf({ tenantId, module: "crm", title: "Tickets", filename: "tickets", columns: ["No", "Subject", "Status"], rows: filtered.map((r) => [r.ticket_no, r.subject, r.status]) })}
        />
        <table className="mt-3 w-full text-sm">
          <thead><tr className="text-left text-slate-500"><th className="px-3 py-2">Ticket</th><th>Priority</th><th>Status</th><th>Due</th><th /></tr></thead>
          <tbody>
            {filtered.map((r) => (
              <tr key={r.id} className="border-t border-line">
                <td className="px-3 py-3 font-semibold">{r.subject}<div className="text-xs text-slate-500">{r.ticket_no}</div></td>
                <td className="capitalize">{r.priority}</td>
                <td><StatusBadge status={r.status} /></td>
                <td>{r.due_at ? r.due_at.slice(0, 16).replace("T", " ") : "—"}{ticketSlaBreached(r) ? <span className="ml-2 text-xs font-semibold text-rose-600">SLA breach</span> : null}</td>
                <td>
                  <RecordRowActions
                    onEdit={() => { setEditing(r); setForm({ subject: r.subject, customer_id: r.customer_id ?? "", priority: r.priority, status: r.status, sla_hours: String(r.sla_hours), description: r.description ?? "" }); setOpenForm(true); }}
                    onTrash={() => askTrash({ entityLabel: "ticket", onConfirm: () => { trashTicket(r.id); refresh(); } })}
                  />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </Panel>
    </AppShell>
  );
}
