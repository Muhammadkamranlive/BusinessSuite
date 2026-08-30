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
import { money } from "@/lib/utils";
import { getExtraFieldValues, persistExtraFields } from "@/modules/forms/services/extra-fields.store";
import {
  createExpense,
  listAccounts,
  listExpenses,
  trashExpense,
  updateExpense,
  type Expense
} from "@/modules/finance/services/finance.store";

const empty = {
  expense_date: new Date().toISOString().slice(0, 10),
  account_name: "Operating Expenses",
  amount: "",
  description: "",
  payment_method: "bank"
};

export default function ExpensesPage() {
  const tenantId = getStoredTenantId() ?? "alpha";
  const { askSave, askTrash, dialog } = useConfirm();
  const [rows, setRows] = useState<Expense[]>([]);
  const [search, setSearch] = useState("");
  const [methodFilter, setMethodFilter] = useState("all");
  const [sortField, setSortField] = useState("expense_date");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");
  const [openForm, setOpenForm] = useState(false);
  const [editing, setEditing] = useState<Expense | null>(null);
  const [error, setError] = useState("");
  const [form, setForm] = useState(empty);
  const [extraJson, setExtraJson] = useState("");
  const accounts = listAccounts(tenantId).filter((a) => a.account_type === "expense" || a.account_type === "asset");

  function refresh() {
    setRows(listExpenses(tenantId));
  }

  useEffect(() => {
    refresh();
  }, [tenantId]);

  const filtered = useMemo(
    () =>
      filterAndSort(rows as unknown as Array<Record<string, unknown>>, {
        search,
        searchFields: ["expense_no", "account_name", "description", "payment_method"],
        statusField: "payment_method",
        statusValue: methodFilter,
        sortField,
        sortDir
      }) as unknown as Expense[],
    [rows, search, methodFilter, sortField, sortDir]
  );

  function openCreate() {
    setEditing(null);
    setForm({ ...empty, expense_date: new Date().toISOString().slice(0, 10) });
    setExtraJson("");
    setError("");
    setOpenForm(true);
  }

  function openEdit(row: Expense) {
    setEditing(row);
    setForm({
      expense_date: row.expense_date,
      account_name: row.account_name,
      amount: String(row.amount),
      description: row.description === "—" ? "" : row.description,
      payment_method: row.payment_method
    });
    setExtraJson(getExtraFieldValues(tenantId, "finance.expense", row.id));
    setError("");
    setOpenForm(true);
  }

  function doSave() {
    setError("");
    if (!form.account_name.trim()) {
      setError("Account is required.");
      return;
    }
    const payload = {
      expense_date: form.expense_date,
      account_name: form.account_name.trim(),
      amount: Number(form.amount) || 0,
      description: form.description.trim() || "—",
      payment_method: form.payment_method
    };
    if (editing) {
      updateExpense(editing.id, payload);
      persistExtraFields(tenantId, "finance.expense", editing.id, extraJson);
    } else {
      const row = createExpense(tenantId, payload);
      persistExtraFields(tenantId, "finance.expense", row.id, extraJson);
    }
    setExtraJson("");
    setForm({ ...empty, expense_date: new Date().toISOString().slice(0, 10) });
    setEditing(null);
    setOpenForm(false);
    refresh();
  }

  function submit(e: React.FormEvent) {
    e.preventDefault();
    askSave({
      editing: Boolean(editing),
      entityLabel: "expense",
      onConfirm: doSave
    });
  }

  return (
    <AppShell activeModule="finance">
      <PageHeader title="Expenses" description="Recorded business expenses." actionLabel="Add expense" onAction={openCreate} />
      <ModuleBreadcrumbs />
      {openForm ? (
        <Panel className="mb-4">
          <form onSubmit={submit} className="grid gap-3 md:grid-cols-2">
            {error ? <p className="md:col-span-2 text-sm text-rose-600">{error}</p> : null}
            <Field label="Date">
              <TextInput type="date" value={form.expense_date} onChange={(e) => setForm({ ...form, expense_date: e.target.value })} />
            </Field>
            <Field label="Account">
              <SelectInput value={form.account_name} onChange={(e) => setForm({ ...form, account_name: e.target.value })}>
                <option value="">Select…</option>
                {accounts.map((a) => (
                  <option key={a.id} value={a.account_name}>
                    {a.account_code} — {a.account_name}
                  </option>
                ))}
              </SelectInput>
            </Field>
            <Field label="Amount">
              <TextInput type="number" min={0} value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} required />
            </Field>
            <Field label="Method">
              <SelectInput value={form.payment_method} onChange={(e) => setForm({ ...form, payment_method: e.target.value })}>
                {["bank", "cash", "card", "online"].map((m) => (
                  <option key={m} value={m}>
                    {m}
                  </option>
                ))}
              </SelectInput>
            </Field>
            <Field label="Description" className="md:col-span-2">
              <TextInput value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
            </Field>
            <ExtraFieldsBlock formKey="finance.expense" valueJson={extraJson} onChange={setExtraJson} />
            <div className="md:col-span-2 flex gap-2">
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
          searchPlaceholder="Search expense, account, description…"
          filterLabel="methods"
          filterValue={methodFilter}
          filterOptions={["bank", "cash", "card", "online"].map((m) => ({ value: m, label: m }))}
          onFilterChange={setMethodFilter}
          sortValue={sortField}
          sortOptions={[
            { value: "expense_no", label: "Expense no" },
            { value: "expense_date", label: "Date" },
            { value: "account_name", label: "Account" },
            { value: "amount", label: "Amount" }
          ]}
          onSortChange={setSortField}
          sortDir={sortDir}
          onSortDirChange={setSortDir}
          onExportCsv={() =>
            exportListCsv({
              tenantId,
              module: "finance",
              filename: "expenses",
              rows: filtered.map((e) => ({
                No: e.expense_no,
                Date: e.expense_date,
                Account: e.account_name,
                Amount: e.amount,
                Description: e.description,
                Method: e.payment_method
              }))
            })
          }
          onExportPdf={() =>
            exportListPdf({
              tenantId,
              module: "finance",
              title: "Expenses",
              filename: "expenses",
              columns: ["No", "Date", "Account", "Amount"],
              rows: filtered.map((e) => [e.expense_no, e.expense_date, e.account_name, money(e.amount)])
            })
          }
        />
        <table className="min-w-full text-left text-sm">
          <thead>
            <tr className="border-b border-line bg-cloud">
              {["Expense No", "Date", "Account", "Amount", "Description", ""].map((h) => (
                <th key={h || "a"} className="px-3 py-3 font-semibold text-slate-600">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filtered.map((e) => (
              <tr key={e.id} className="border-b border-line">
                <td className="px-3 py-3 font-medium">
                  {e.expense_no}
                  <ExtraFieldsReadout tenantId={tenantId} formKey="finance.expense" recordId={e.id} />
                </td>
                <td className="px-3 py-3">{e.expense_date}</td>
                <td className="px-3 py-3">{e.account_name}</td>
                <td className="px-3 py-3">{money(e.amount)}</td>
                <td className="px-3 py-3">{e.description}</td>
                <td className="px-3 py-3">
                  <RecordRowActions
                    onEdit={() => openEdit(e)}
                    onTrash={() =>
                      askTrash({
                        entityLabel: "expense",
                        name: e.expense_no,
                        onConfirm: () => {
                          trashExpense(e.id);
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
