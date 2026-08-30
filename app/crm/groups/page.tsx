"use client";

import { useEffect, useMemo, useState } from "react";
import { AppShell } from "@/components/app-shell";
import { ModuleBreadcrumbs } from "@/components/common/module-breadcrumbs";
import { PageHeader } from "@/components/common/page-header";
import { DataListToolbar } from "@/components/common/data-list-toolbar";
import { RecordRowActions } from "@/components/common/record-row-actions";
import { useConfirm } from "@/components/common/use-confirm";
import { ExtraFieldsBlock } from "@/components/forms/extra-fields-block";
import { Button, Field, Panel, TextInput } from "@/components/ui";
import { getStoredTenantId } from "@/lib/auth/session";
import { exportListCsv, exportListPdf } from "@/lib/list-export";
import { filterAndSort } from "@/lib/list-query";
import { persistExtraFields } from "@/modules/forms/services/extra-fields.store";
import { createCustomerGroup, listCustomerGroups, trashCustomerGroup, updateCustomerGroup, type CustomerGroup } from "@/modules/crm/services/crm.store";

export default function CustomerGroupsPage() {
  const tenantId = getStoredTenantId() ?? "alpha";
  const { askSave, askTrash, dialog } = useConfirm();
  const [rows, setRows] = useState<CustomerGroup[]>([]);
  const [search, setSearch] = useState("");
  const [sortField, setSortField] = useState("name");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");
  const [openForm, setOpenForm] = useState(false);
  const [editing, setEditing] = useState<CustomerGroup | null>(null);
  const [form, setForm] = useState({ name: "", code: "", price_group: "" });
  const [extraJson, setExtraJson] = useState("");

  function refresh() { setRows(listCustomerGroups(tenantId)); }
  useEffect(() => { refresh(); }, [tenantId]);
  const filtered = useMemo(
    () => filterAndSort(rows as unknown as Array<Record<string, unknown>>, { search, searchFields: ["name", "code"], sortField, sortDir }) as unknown as CustomerGroup[],
    [rows, search, sortField, sortDir]
  );

  function doSave() {
    const payload = { name: form.name.trim(), code: form.code.trim().toUpperCase(), price_group: form.price_group.trim() || null };
    const row = editing ? updateCustomerGroup(editing.id, payload) : createCustomerGroup(tenantId, payload);
    if (row) persistExtraFields(tenantId, "crm.customer_group", row.id, extraJson);
    setOpenForm(false);
    refresh();
  }

  return (
    <AppShell activeModule="crm">
      {dialog}
      <ModuleBreadcrumbs />
      <PageHeader title="Customer groups" description="Price groups and categories used on the customer master." actionLabel="Add group" onAction={() => { setEditing(null); setForm({ name: "", code: "", price_group: "" }); setExtraJson(""); setOpenForm(true); }} />
      {openForm ? (
        <Panel className="mb-4">
          <form className="grid gap-3 md:grid-cols-3" onSubmit={(e) => { e.preventDefault(); askSave({ editing: Boolean(editing), entityLabel: "customer group", onConfirm: doSave }); }}>
            <Field label="Name"><TextInput required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></Field>
            <Field label="Code"><TextInput required value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value })} /></Field>
            <Field label="Price group"><TextInput value={form.price_group} onChange={(e) => setForm({ ...form, price_group: e.target.value })} /></Field>
            <div className="md:col-span-3"><ExtraFieldsBlock formKey="crm.customer_group" valueJson={extraJson} onChange={setExtraJson} /></div>
            <Button type="submit">Save</Button>
          </form>
        </Panel>
      ) : null}
      <Panel>
        <DataListToolbar
          search={search}
          onSearchChange={setSearch}
          sortValue={sortField}
          sortOptions={[{ value: "name", label: "Name" }]}
          onSortChange={setSortField}
          sortDir={sortDir}
          onSortDirChange={setSortDir}
          onExportCsv={() => exportListCsv({ tenantId, module: "crm", filename: "customer-groups", rows: filtered.map((r) => ({ Name: r.name, Code: r.code, PriceGroup: r.price_group ?? "" })) })}
          onExportPdf={() => exportListPdf({ tenantId, module: "crm", title: "Customer groups", filename: "customer-groups", columns: ["Name", "Code"], rows: filtered.map((r) => [r.name, r.code]) })}
        />
        <table className="mt-3 w-full text-sm">
          <thead><tr className="text-left text-slate-500"><th className="px-3 py-2">Name</th><th>Code</th><th>Price group</th><th /></tr></thead>
          <tbody>
            {filtered.map((r) => (
              <tr key={r.id} className="border-t border-line">
                <td className="px-3 py-3 font-semibold">{r.name}</td>
                <td>{r.code}</td>
                <td>{r.price_group ?? "—"}</td>
                <td>
                  <RecordRowActions
                    onEdit={() => { setEditing(r); setForm({ name: r.name, code: r.code, price_group: r.price_group ?? "" }); setOpenForm(true); }}
                    onTrash={() => askTrash({ entityLabel: "customer group", onConfirm: () => { trashCustomerGroup(r.id); refresh(); } })}
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
