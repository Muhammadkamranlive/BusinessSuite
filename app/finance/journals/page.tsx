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
  createJournal,
  listJournals,
  trashJournal,
  updateJournal,
  type JournalEntry
} from "@/modules/finance/services/finance.store";

const empty = {
  journal_date: new Date().toISOString().slice(0, 10),
  account_name: "",
  debit: "",
  credit: "",
  memo: ""
};

export default function JournalsPage() {
  const tenantId = getStoredTenantId() ?? "alpha";
  const { askSave, askTrash, dialog } = useConfirm();
  const [rows, setRows] = useState<JournalEntry[]>([]);
  const [search, setSearch] = useState("");
  const [sortField, setSortField] = useState("journal_date");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");
  const [openForm, setOpenForm] = useState(false);
  const [editing, setEditing] = useState<JournalEntry | null>(null);
  const [error, setError] = useState("");
  const [form, setForm] = useState(empty);
  const [extraJson, setExtraJson] = useState("");

  function refresh() {
    setRows(listJournals(tenantId));
  }

  useEffect(() => {
    refresh();
  }, [tenantId]);

  const filtered = useMemo(
    () =>
      filterAndSort(rows as unknown as Array<Record<string, unknown>>, {
        search,
        searchFields: ["journal_no", "account_name", "memo"],
        sortField,
        sortDir
      }) as unknown as JournalEntry[],
    [rows, search, sortField, sortDir]
  );

  function openCreate() {
    setEditing(null);
    setForm({ ...empty, journal_date: new Date().toISOString().slice(0, 10) });
    setExtraJson("");
    setError("");
    setOpenForm(true);
  }

  function openEdit(row: JournalEntry) {
    setEditing(row);
    setForm({
      journal_date: row.journal_date,
      account_name: row.account_name,
      debit: String(row.debit),
      credit: String(row.credit),
      memo: row.memo === "—" ? "" : row.memo
    });
    setExtraJson(getExtraFieldValues(tenantId, "finance.journal", row.id));
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
      journal_date: form.journal_date,
      account_name: form.account_name.trim(),
      debit: Number(form.debit) || 0,
      credit: Number(form.credit) || 0,
      memo: form.memo.trim() || "—"
    };
    if (editing) {
      updateJournal(editing.id, payload);
      persistExtraFields(tenantId, "finance.journal", editing.id, extraJson);
    } else {
      const row = createJournal(tenantId, payload);
      persistExtraFields(tenantId, "finance.journal", row.id, extraJson);
    }
    setExtraJson("");
    setForm({ ...empty, journal_date: new Date().toISOString().slice(0, 10) });
    setEditing(null);
    setOpenForm(false);
    refresh();
  }

  function submit(e: React.FormEvent) {
    e.preventDefault();
    askSave({
      editing: Boolean(editing),
      entityLabel: "journal entry",
      onConfirm: doSave
    });
  }

  return (
    <AppShell activeModule="finance">
      <PageHeader title="Journal Entries" description="Manual ledger lines." actionLabel="Add journal line" onAction={openCreate} />
      <ModuleBreadcrumbs />
      {openForm ? (
        <Panel className="mb-4">
          <form onSubmit={submit} className="grid gap-3 md:grid-cols-2">
            {error ? <p className="md:col-span-2 text-sm text-rose-600">{error}</p> : null}
            <Field label="Date">
              <TextInput type="date" value={form.journal_date} onChange={(e) => setForm({ ...form, journal_date: e.target.value })} />
            </Field>
            <Field label="Account">
              <TextInput value={form.account_name} onChange={(e) => setForm({ ...form, account_name: e.target.value })} required />
            </Field>
            <Field label="Debit">
              <TextInput type="number" min={0} value={form.debit} onChange={(e) => setForm({ ...form, debit: e.target.value })} />
            </Field>
            <Field label="Credit">
              <TextInput type="number" min={0} value={form.credit} onChange={(e) => setForm({ ...form, credit: e.target.value })} />
            </Field>
            <Field label="Memo" className="md:col-span-2">
              <TextInput value={form.memo} onChange={(e) => setForm({ ...form, memo: e.target.value })} />
            </Field>
            <ExtraFieldsBlock formKey="finance.journal" valueJson={extraJson} onChange={setExtraJson} />
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
          searchPlaceholder="Search journal, account, memo…"
          sortValue={sortField}
          sortOptions={[
            { value: "journal_no", label: "Journal" },
            { value: "journal_date", label: "Date" },
            { value: "account_name", label: "Account" },
            { value: "debit", label: "Debit" },
            { value: "credit", label: "Credit" }
          ]}
          onSortChange={setSortField}
          sortDir={sortDir}
          onSortDirChange={setSortDir}
          onExportCsv={() =>
            exportListCsv({
              tenantId,
              module: "finance",
              filename: "journals",
              rows: filtered.map((r) => ({
                No: r.journal_no,
                Date: r.journal_date,
                Account: r.account_name,
                Debit: r.debit,
                Credit: r.credit,
                Memo: r.memo
              }))
            })
          }
          onExportPdf={() =>
            exportListPdf({
              tenantId,
              module: "finance",
              title: "Journal Entries",
              filename: "journals",
              columns: ["No", "Date", "Account", "Debit", "Credit"],
              rows: filtered.map((r) => [r.journal_no, r.journal_date, r.account_name, money(r.debit), money(r.credit)])
            })
          }
        />
        <table className="min-w-full text-left text-sm">
          <thead>
            <tr className="border-b border-line bg-cloud">
              {["Journal", "Date", "Account", "Debit", "Credit", "Memo", ""].map((h) => (
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
                  {r.journal_no}
                  <ExtraFieldsReadout tenantId={tenantId} formKey="finance.journal" recordId={r.id} />
                </td>
                <td className="px-3 py-3">{r.journal_date}</td>
                <td className="px-3 py-3">{r.account_name}</td>
                <td className="px-3 py-3">{money(r.debit)}</td>
                <td className="px-3 py-3">{money(r.credit)}</td>
                <td className="px-3 py-3">{r.memo}</td>
                <td className="px-3 py-3">
                  <RecordRowActions
                    onEdit={() => openEdit(r)}
                    onTrash={() =>
                      askTrash({
                        entityLabel: "journal entry",
                        name: r.journal_no,
                        onConfirm: () => {
                          trashJournal(r.id);
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
