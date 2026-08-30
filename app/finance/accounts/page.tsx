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
import { ExtraFieldsReadout } from "@/components/forms/extra-fields-readout";
import { Button, Field, Panel, SelectInput, TextInput } from "@/components/ui";
import { getStoredTenantId } from "@/lib/auth/session";
import { exportListCsv, exportListPdf } from "@/lib/list-export";
import { filterAndSort } from "@/lib/list-query";
import { getExtraFieldValues, persistExtraFields } from "@/modules/forms/services/extra-fields.store";
import {
  createAccount,
  listAccounts,
  trashAccount,
  updateAccount,
  type ChartAccount
} from "@/modules/finance/services/finance.store";

const empty = {
  account_code: "",
  account_name: "",
  account_type: "expense" as ChartAccount["account_type"],
  is_active: true
};

export default function AccountsPage() {
  const tenantId = getStoredTenantId() ?? "alpha";
  const { askSave, askTrash, dialog } = useConfirm();
  const [rows, setRows] = useState<ChartAccount[]>([]);
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState("all");
  const [sortField, setSortField] = useState("account_code");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");
  const [openForm, setOpenForm] = useState(false);
  const [editing, setEditing] = useState<ChartAccount | null>(null);
  const [error, setError] = useState("");
  const [form, setForm] = useState(empty);
  const [extraJson, setExtraJson] = useState("");

  function refresh() {
    setRows(listAccounts(tenantId));
  }

  useEffect(() => {
    refresh();
  }, [tenantId]);

  const filtered = useMemo(
    () =>
      filterAndSort(rows as unknown as Array<Record<string, unknown>>, {
        search,
        searchFields: ["account_code", "account_name", "account_type"],
        statusField: "account_type",
        statusValue: typeFilter,
        sortField,
        sortDir
      }) as unknown as ChartAccount[],
    [rows, search, typeFilter, sortField, sortDir]
  );

  function openCreate() {
    setEditing(null);
    setForm(empty);
    setExtraJson("");
    setError("");
    setOpenForm(true);
  }

  function openEdit(row: ChartAccount) {
    setEditing(row);
    setForm({
      account_code: row.account_code,
      account_name: row.account_name,
      account_type: row.account_type,
      is_active: row.is_active
    });
    setExtraJson(getExtraFieldValues(tenantId, "finance.account", row.id));
    setError("");
    setOpenForm(true);
  }

  function doSave() {
    setError("");
    if (!form.account_code.trim() || !form.account_name.trim()) {
      setError("Code and name are required.");
      return;
    }
    const payload = {
      account_code: form.account_code.trim(),
      account_name: form.account_name.trim(),
      account_type: form.account_type,
      is_active: form.is_active
    };
    if (editing) {
      updateAccount(editing.id, payload);
      persistExtraFields(tenantId, "finance.account", editing.id, extraJson);
    } else {
      const row = createAccount(tenantId, payload);
      persistExtraFields(tenantId, "finance.account", row.id, extraJson);
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
      entityLabel: "account",
      onConfirm: doSave
    });
  }

  return (
    <AppShell activeModule="finance">
      <PageHeader title="Chart of Accounts" description="General ledger accounts." actionLabel="Add account" onAction={openCreate} />
      <ModuleBreadcrumbs />
      {openForm ? (
        <Panel className="mb-4">
          <form onSubmit={submit} className="grid gap-3 md:grid-cols-3">
            {error ? <p className="md:col-span-3 text-sm text-rose-600">{error}</p> : null}
            <Field label="Code">
              <TextInput value={form.account_code} onChange={(e) => setForm({ ...form, account_code: e.target.value })} required />
            </Field>
            <Field label="Name">
              <TextInput value={form.account_name} onChange={(e) => setForm({ ...form, account_name: e.target.value })} required />
            </Field>
            <Field label="Type">
              <SelectInput value={form.account_type} onChange={(e) => setForm({ ...form, account_type: e.target.value as ChartAccount["account_type"] })}>
                {["asset", "liability", "equity", "income", "expense"].map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </SelectInput>
            </Field>
            <Field label="Status">
              <SelectInput
                value={form.is_active ? "active" : "inactive"}
                onChange={(e) => setForm({ ...form, is_active: e.target.value === "active" })}
              >
                <option value="active">active</option>
                <option value="inactive">inactive</option>
              </SelectInput>
            </Field>
            <ExtraFieldsBlock formKey="finance.account" valueJson={extraJson} onChange={setExtraJson} />
            <div className="md:col-span-3 flex gap-2">
              <Button type="submit">{editing ? "Update" : "Save"}</Button>
              <Button type="button" variant="secondary" onClick={() => { setExtraJson(""); setEditing(null); setOpenForm(false); }}>
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
          searchPlaceholder="Search code, name…"
          filterLabel="types"
          filterValue={typeFilter}
          filterOptions={["asset", "liability", "equity", "income", "expense"].map((t) => ({ value: t, label: t }))}
          onFilterChange={setTypeFilter}
          sortValue={sortField}
          sortOptions={[
            { value: "account_code", label: "Code" },
            { value: "account_name", label: "Name" },
            { value: "account_type", label: "Type" }
          ]}
          onSortChange={setSortField}
          sortDir={sortDir}
          onSortDirChange={setSortDir}
          onExportCsv={() =>
            exportListCsv({
              tenantId,
              module: "finance",
              filename: "accounts",
              rows: filtered.map((a) => ({
                Code: a.account_code,
                Name: a.account_name,
                Type: a.account_type,
                Status: a.is_active ? "active" : "inactive"
              }))
            })
          }
          onExportPdf={() =>
            exportListPdf({
              tenantId,
              module: "finance",
              title: "Chart of Accounts",
              filename: "accounts",
              columns: ["Code", "Name", "Type", "Status"],
              rows: filtered.map((a) => [a.account_code, a.account_name, a.account_type, a.is_active ? "active" : "inactive"])
            })
          }
        />
        <table className="min-w-full text-left text-sm">
          <thead>
            <tr className="border-b border-line bg-cloud">
              {["Code", "Account Name", "Type", "Status", ""].map((h) => (
                <th key={h || "a"} className="px-3 py-3 font-semibold text-slate-600">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filtered.map((a) => (
              <tr key={a.id} className="border-b border-line">
                <td className="px-3 py-3 font-medium">
                  {a.account_code}
                  <ExtraFieldsReadout tenantId={tenantId} formKey="finance.account" recordId={a.id} />
                </td>
                <td className="px-3 py-3">{a.account_name}</td>
                <td className="px-3 py-3 capitalize">{a.account_type}</td>
                <td className="px-3 py-3">
                  <StatusBadge status={a.is_active ? "active" : "inactive"} />
                </td>
                <td className="px-3 py-3">
                  <RecordRowActions
                    onEdit={() => openEdit(a)}
                    onTrash={() =>
                      askTrash({
                        entityLabel: "account",
                        name: a.account_name,
                        onConfirm: () => {
                          trashAccount(a.id);
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
      </Panel>
      {dialog}
    </AppShell>
  );
}
