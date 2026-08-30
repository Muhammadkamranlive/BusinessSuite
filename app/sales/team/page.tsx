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
import { Button, Field, Panel, TextInput } from "@/components/ui";
import { getStoredTenantId } from "@/lib/auth/session";
import { exportListCsv, exportListPdf } from "@/lib/list-export";
import { filterAndSort } from "@/lib/list-query";
import { persistExtraFields } from "@/modules/forms/services/extra-fields.store";
import { createSalesperson, listSalespeople, trashSalesperson, updateSalesperson, type Salesperson } from "@/modules/sales/services/sales.store";

export default function SalesTeamPage() {
  const tenantId = getStoredTenantId() ?? "alpha";
  const { askSave, askTrash, dialog } = useConfirm();
  const [rows, setRows] = useState<Salesperson[]>([]);
  const [search, setSearch] = useState("");
  const [sortField, setSortField] = useState("name");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");
  const [openForm, setOpenForm] = useState(false);
  const [editing, setEditing] = useState<Salesperson | null>(null);
  const [form, setForm] = useState({ name: "", email: "", territory: "", team: "", commission_pct: "0", status: "active" as Salesperson["status"] });
  const [extraJson, setExtraJson] = useState("");

  function refresh() { setRows(listSalespeople(tenantId)); }
  useEffect(() => { refresh(); }, [tenantId]);
  const filtered = useMemo(
    () => filterAndSort(rows as unknown as Array<Record<string, unknown>>, { search, searchFields: ["name", "email", "territory", "team"], sortField, sortDir }) as unknown as Salesperson[],
    [rows, search, sortField, sortDir]
  );

  function doSave() {
    const payload = { name: form.name.trim(), email: form.email.trim() || null, territory: form.territory.trim() || null, team: form.team.trim() || null, commission_pct: Number(form.commission_pct) || 0, status: form.status };
    const row = editing ? updateSalesperson(editing.id, payload) : createSalesperson(tenantId, payload);
    if (row) persistExtraFields(tenantId, "sales.salesperson", row.id, extraJson);
    setOpenForm(false);
    refresh();
  }

  return (
    <AppShell activeModule="sales">
      {dialog}
      <ModuleBreadcrumbs />
      <PageHeader title="Sales team" description="Salespeople, territories, and commission percentages." actionLabel="Add salesperson" onAction={() => { setEditing(null); setForm({ name: "", email: "", territory: "", team: "", commission_pct: "0", status: "active" }); setExtraJson(""); setOpenForm(true); }} />
      {openForm ? (
        <Panel className="mb-4">
          <form className="grid gap-3 md:grid-cols-2" onSubmit={(e) => { e.preventDefault(); askSave({ editing: Boolean(editing), entityLabel: "salesperson", onConfirm: doSave }); }}>
            <Field label="Name"><TextInput required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></Field>
            <Field label="Email"><TextInput type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} /></Field>
            <Field label="Territory"><TextInput value={form.territory} onChange={(e) => setForm({ ...form, territory: e.target.value })} /></Field>
            <Field label="Team"><TextInput value={form.team} onChange={(e) => setForm({ ...form, team: e.target.value })} /></Field>
            <Field label="Commission %"><TextInput type="number" value={form.commission_pct} onChange={(e) => setForm({ ...form, commission_pct: e.target.value })} /></Field>
            <div className="md:col-span-2"><ExtraFieldsBlock formKey="sales.salesperson" valueJson={extraJson} onChange={setExtraJson} /></div>
            <Button type="submit">Save</Button>
          </form>
        </Panel>
      ) : null}
      <Panel>
        <DataListToolbar search={search} onSearchChange={setSearch} sortValue={sortField} sortOptions={[{ value: "name", label: "Name" }]} onSortChange={setSortField} sortDir={sortDir} onSortDirChange={setSortDir} onExportCsv={() => exportListCsv({ tenantId, module: "sales", filename: "sales-team", rows: filtered.map((r) => ({ Name: r.name, Territory: r.territory ?? "", Commission: r.commission_pct })) })} onExportPdf={() => exportListPdf({ tenantId, module: "sales", title: "Sales team", filename: "sales-team", columns: ["Name", "Territory", "Commission %"], rows: filtered.map((r) => [r.name, r.territory ?? "", String(r.commission_pct)]) })} />
        <table className="mt-3 w-full text-sm">
          <thead><tr className="text-left text-slate-500"><th className="px-3 py-2">Name</th><th>Territory</th><th>Team</th><th>Commission</th><th>Status</th><th /></tr></thead>
          <tbody>
            {filtered.map((r) => (
              <tr key={r.id} className="border-t border-line">
                <td className="px-3 py-3 font-semibold">{r.name}</td>
                <td>{r.territory ?? "—"}</td>
                <td>{r.team ?? "—"}</td>
                <td>{r.commission_pct}%</td>
                <td><StatusBadge status={r.status} /></td>
                <td>
                  <RecordRowActions onEdit={() => { setEditing(r); setForm({ name: r.name, email: r.email ?? "", territory: r.territory ?? "", team: r.team ?? "", commission_pct: String(r.commission_pct), status: r.status }); setOpenForm(true); }} onTrash={() => askTrash({ entityLabel: "salesperson", onConfirm: () => { trashSalesperson(r.id); refresh(); } })} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </Panel>
    </AppShell>
  );
}
