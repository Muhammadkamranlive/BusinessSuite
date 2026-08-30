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
import { Button, Field, Panel, TextInput } from "@/components/ui";
import { getStoredTenantId } from "@/lib/auth/session";
import { exportListCsv, exportListPdf } from "@/lib/list-export";
import { filterAndSort } from "@/lib/list-query";
import { money } from "@/lib/utils";
import { getExtraFieldValues, persistExtraFields } from "@/modules/forms/services/extra-fields.store";
import {
  createIncome,
  listIncome,
  trashIncome,
  updateIncome,
  type IncomeEntry
} from "@/modules/finance/services/finance.store";

const empty = {
  income_date: new Date().toISOString().slice(0, 10),
  account_name: "Sales Revenue",
  amount: "",
  description: ""
};

export default function IncomePage() {
  const tenantId = getStoredTenantId() ?? "alpha";
  const { askSave, askTrash, dialog } = useConfirm();
  const [rows, setRows] = useState<IncomeEntry[]>([]);
  const [search, setSearch] = useState("");
  const [sortField, setSortField] = useState("income_date");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");
  const [openForm, setOpenForm] = useState(false);
  const [editing, setEditing] = useState<IncomeEntry | null>(null);
  const [error, setError] = useState("");
  const [form, setForm] = useState(empty);
  const [extraJson, setExtraJson] = useState("");

  function refresh() {
    setRows(listIncome(tenantId));
  }

  useEffect(() => {
    refresh();
  }, [tenantId]);

  const filtered = useMemo(
    () =>
      filterAndSort(rows as unknown as Array<Record<string, unknown>>, {
        search,
        searchFields: ["income_no", "account_name", "description"],
        sortField,
        sortDir
      }) as unknown as IncomeEntry[],
    [rows, search, sortField, sortDir]
  );

  function openCreate() {
    setEditing(null);
    setForm({ ...empty, income_date: new Date().toISOString().slice(0, 10) });
    setExtraJson("");
    setError("");
    setOpenForm(true);
  }

  function openEdit(row: IncomeEntry) {
    setEditing(row);
    setForm({
      income_date: row.income_date,
      account_name: row.account_name,
      amount: String(row.amount),
      description: row.description === "—" ? "" : row.description
    });
    setExtraJson(getExtraFieldValues(tenantId, "finance.income", row.id));
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
      income_date: form.income_date,
      account_name: form.account_name.trim(),
      amount: Number(form.amount) || 0,
      description: form.description.trim() || "—"
    };
    if (editing) {
      updateIncome(editing.id, payload);
      persistExtraFields(tenantId, "finance.income", editing.id, extraJson);
    } else {
      const row = createIncome(tenantId, payload);
      persistExtraFields(tenantId, "finance.income", row.id, extraJson);
    }
    setExtraJson("");
    setForm({ ...empty, income_date: new Date().toISOString().slice(0, 10) });
    setEditing(null);
    setOpenForm(false);
    refresh();
  }

  function submit(e: React.FormEvent) {
    e.preventDefault();
    askSave({
      editing: Boolean(editing),
      entityLabel: "income entry",
      onConfirm: doSave
    });
  }

  return (
    <AppShell activeModule="finance">
      <PageHeader title="Income" description="Recorded income entries." actionLabel="Add income" onAction={openCreate} />
      <ModuleBreadcrumbs />
      {openForm ? (
        <Panel className="mb-4">
          <form onSubmit={submit} className="grid gap-3 md:grid-cols-2">
            {error ? <p className="md:col-span-2 text-sm text-rose-600">{error}</p> : null}
            <Field label="Date">
              <TextInput type="date" value={form.income_date} onChange={(e) => setForm({ ...form, income_date: e.target.value })} />
            </Field>
            <Field label="Account">
              <TextInput value={form.account_name} onChange={(e) => setForm({ ...form, account_name: e.target.value })} required />
            </Field>
            <Field label="Amount">
              <TextInput type="number" min={0} value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} required />
            </Field>
            <Field label="Description">
              <TextInput value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
            </Field>
            <ExtraFieldsBlock formKey="finance.income" valueJson={extraJson} onChange={setExtraJson} />
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
          searchPlaceholder="Search income, account, description…"
          sortValue={sortField}
          sortOptions={[
            { value: "income_no", label: "Income no" },
            { value: "income_date", label: "Date" },
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
              filename: "income",
              rows: filtered.map((r) => ({
                No: r.income_no,
                Date: r.income_date,
                Account: r.account_name,
                Amount: r.amount,
                Description: r.description
              }))
            })
          }
          onExportPdf={() =>
            exportListPdf({
              tenantId,
              module: "finance",
              title: "Income",
              filename: "income",
              columns: ["No", "Date", "Account", "Amount"],
              rows: filtered.map((r) => [r.income_no, r.income_date, r.account_name, money(r.amount)])
            })
          }
        />
        <table className="min-w-full text-left text-sm">
          <thead>
            <tr className="border-b border-line bg-cloud">
              {["Income No", "Date", "Account", "Amount", "Description", ""].map((h) => (
                <th key={h || "a"} className="px-3 py-3 font-semibold text-slate-600">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filtered.map((r) => (
              <tr key={r.id} className="border-b border-line">
                <td className="px-3 py-3 font-medium">
                  {r.income_no}
                  <ExtraFieldsReadout tenantId={tenantId} formKey="finance.income" recordId={r.id} />
                </td>
                <td className="px-3 py-3">{r.income_date}</td>
                <td className="px-3 py-3">{r.account_name}</td>
                <td className="px-3 py-3">{money(r.amount)}</td>
                <td className="px-3 py-3">{r.description}</td>
                <td className="px-3 py-3">
                  <RecordRowActions
                    onEdit={() => openEdit(r)}
                    onTrash={() =>
                      askTrash({
                        entityLabel: "income entry",
                        name: r.income_no,
                        onConfirm: () => {
                          trashIncome(r.id);
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
