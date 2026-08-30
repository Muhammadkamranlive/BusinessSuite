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
import { createContact, listContacts, listCustomers, trashContact, updateContact } from "@/modules/crm/services/crm.store";
import type { Contact } from "@/modules/crm/types";

const empty = { full_name: "", email: "", phone: "", designation: "", customer_id: "", is_primary: false };

export default function ContactsPage() {
  const tenantId = getStoredTenantId() ?? "alpha";
  const { askSave, askTrash, dialog } = useConfirm();
  const [rows, setRows] = useState<Contact[]>([]);
  const [customers, setCustomers] = useState<ReturnType<typeof listCustomers>>([]);
  const [search, setSearch] = useState("");
  const [sortField, setSortField] = useState("full_name");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");
  const [openForm, setOpenForm] = useState(false);
  const [editing, setEditing] = useState<Contact | null>(null);
  const [error, setError] = useState("");
  const [form, setForm] = useState(empty);
  const [extraJson, setExtraJson] = useState("");

  function refresh() {
    setRows(listContacts(tenantId));
    setCustomers(listCustomers(tenantId));
  }

  useEffect(() => {
    refresh();
  }, [tenantId]);

  const filtered = useMemo(
    () =>
      filterAndSort(rows as unknown as Array<Record<string, unknown>>, {
        search,
        searchFields: ["full_name", "email", "phone", "designation"],
        sortField,
        sortDir
      }) as unknown as Contact[],
    [rows, search, sortField, sortDir]
  );

  function openCreate() {
    setEditing(null);
    setForm(empty);
    setExtraJson("");
    setError("");
    setOpenForm(true);
  }

  function openEdit(row: Contact) {
    setEditing(row);
    setForm({
      full_name: row.full_name,
      email: row.email,
      phone: row.phone,
      designation: row.designation ?? "",
      customer_id: row.customer_id ?? "",
      is_primary: row.is_primary
    });
    setExtraJson(getExtraFieldValues(tenantId, "crm.contact", row.id));
    setError("");
    setOpenForm(true);
  }

  function doSave() {
    setError("");
    if (!form.full_name.trim() || !form.email.trim()) {
      setError("Name and email are required.");
      return;
    }
    const payload = {
      full_name: form.full_name.trim(),
      email: form.email.trim(),
      phone: form.phone.trim(),
      designation: form.designation.trim() || null,
      customer_id: form.customer_id || null,
      lead_id: editing?.lead_id ?? null,
      is_primary: form.is_primary
    };
    if (editing) {
      updateContact(editing.id, payload);
      persistExtraFields(tenantId, "crm.contact", editing.id, extraJson);
    } else {
      const row = createContact(tenantId, payload);
      persistExtraFields(tenantId, "crm.contact", row.id, extraJson);
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
      entityLabel: "contact",
      onConfirm: doSave
    });
  }

  return (
    <AppShell activeModule="crm">
      <PageHeader title="Contacts" description="People linked to customers and leads." actionLabel="Add contact" onAction={openCreate} />
      <ModuleBreadcrumbs />
      {openForm ? (
        <Panel className="mb-4">
          <form onSubmit={submit} className="grid gap-3 md:grid-cols-2">
            {error ? <p className="md:col-span-2 text-sm text-rose-600">{error}</p> : null}
            <Field label="Full name">
              <TextInput value={form.full_name} onChange={(e) => setForm({ ...form, full_name: e.target.value })} required />
            </Field>
            <Field label="Email">
              <TextInput type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} required />
            </Field>
            <Field label="Phone">
              <TextInput value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
            </Field>
            <Field label="Designation">
              <TextInput value={form.designation} onChange={(e) => setForm({ ...form, designation: e.target.value })} />
            </Field>
            <Field label="Customer">
              <SelectInput value={form.customer_id} onChange={(e) => setForm({ ...form, customer_id: e.target.value })}>
                <option value="">Optional…</option>
                {customers.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </SelectInput>
            </Field>
            <ExtraFieldsBlock formKey="crm.contact" valueJson={extraJson} onChange={setExtraJson} />
            <div className="md:col-span-2 flex gap-2">
              <Button type="submit">{editing ? "Update contact" : "Save contact"}</Button>
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
          searchPlaceholder="Search name, email, phone…"
          sortValue={sortField}
          sortOptions={[
            { value: "full_name", label: "Name" },
            { value: "email", label: "Email" },
            { value: "phone", label: "Phone" },
            { value: "designation", label: "Designation" }
          ]}
          onSortChange={setSortField}
          sortDir={sortDir}
          onSortDirChange={setSortDir}
          onExportCsv={() =>
            exportListCsv({
              tenantId,
              module: "crm",
              filename: "contacts",
              rows: filtered.map((r) => ({
                Name: r.full_name,
                Email: r.email,
                Phone: r.phone,
                Designation: r.designation ?? ""
              }))
            })
          }
          onExportPdf={() =>
            exportListPdf({
              tenantId,
              module: "crm",
              title: "Contacts",
              filename: "contacts",
              columns: ["Name", "Email", "Phone", "Designation"],
              rows: filtered.map((r) => [r.full_name, r.email, r.phone, r.designation ?? ""])
            })
          }
        />
        <table className="min-w-full text-left text-sm">
          <thead>
            <tr className="border-b border-line bg-cloud">
              {["Name", "Email", "Phone", "Designation", ""].map((h) => (
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
                  {r.full_name}
                  <ExtraFieldsReadout tenantId={tenantId} formKey="crm.contact" recordId={r.id} />
                </td>
                <td className="px-3 py-3">{r.email}</td>
                <td className="px-3 py-3">{r.phone}</td>
                <td className="px-3 py-3">{r.designation ?? "—"}</td>
                <td className="px-3 py-3">
                  <RecordRowActions
                    onEdit={() => openEdit(r)}
                    onTrash={() =>
                      askTrash({
                        entityLabel: "contact",
                        name: r.full_name,
                        onConfirm: () => {
                          trashContact(r.id);
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
