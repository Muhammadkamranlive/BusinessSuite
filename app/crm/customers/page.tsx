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
import { getExtraFieldValues, persistExtraFields } from "@/modules/forms/services/extra-fields.store";
import { createCustomer, listCustomerGroups, listCustomers, trashCustomer, updateCustomer } from "@/modules/crm/services/crm.store";
import type { Customer } from "@/modules/crm/types";

const empty = {
  name: "",
  type: "company" as Customer["type"],
  email: "",
  phone: "",
  industry: "",
  tax_number: "",
  credit_limit: "",
  credit_terms: "",
  customer_group_id: "",
  salesperson_id: "",
  status: "active" as Customer["status"]
};

export default function CustomersPage() {
  const tenantId = getStoredTenantId() ?? "alpha";
  const { askSave, askTrash, dialog } = useConfirm();
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [sortField, setSortField] = useState("name");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");
  const [openForm, setOpenForm] = useState(false);
  const [editing, setEditing] = useState<Customer | null>(null);
  const [error, setError] = useState("");
  const [form, setForm] = useState(empty);
  const [extraJson, setExtraJson] = useState("");
  const groups = listCustomerGroups(tenantId);

  function refresh() {
    setCustomers(listCustomers(tenantId));
  }

  useEffect(() => {
    refresh();
  }, [tenantId]);

  const filtered = useMemo(
    () =>
      filterAndSort(customers as unknown as Array<Record<string, unknown>>, {
        search,
        searchFields: ["name", "email", "phone", "customer_no", "industry"],
        statusField: "status",
        statusValue: statusFilter,
        sortField,
        sortDir
      }) as unknown as Customer[],
    [customers, search, statusFilter, sortField, sortDir]
  );

  function openCreate() {
    setEditing(null);
    setForm(empty);
    setExtraJson("");
    setError("");
    setOpenForm(true);
  }

  function openEdit(row: Customer) {
    setEditing(row);
    setForm({
      name: row.name,
      type: row.type,
      email: row.email,
      phone: row.phone,
      industry: row.industry ?? "",
      tax_number: row.tax_number ?? "",
      credit_limit: String(row.credit_limit ?? 0),
      credit_terms: row.credit_terms ?? "",
      customer_group_id: row.customer_group_id ?? "",
      salesperson_id: row.salesperson_id ?? "",
      status: row.status
    });
    setExtraJson(getExtraFieldValues(tenantId, "crm.customer", row.id));
    setError("");
    setOpenForm(true);
  }

  function doSave() {
    setError("");
    if (!form.name.trim() || !form.email.trim()) {
      setError("Name and email are required.");
      return;
    }
    const payload = {
      name: form.name.trim(),
      type: form.type,
      email: form.email.trim(),
      phone: form.phone.trim(),
      tax_number: form.tax_number.trim() || null,
      industry: form.industry.trim() || null,
      credit_limit: Number(form.credit_limit) || 0,
      credit_terms: form.credit_terms.trim() || null,
      customer_group_id: form.customer_group_id || null,
      billing_address: editing?.billing_address ?? null,
      shipping_address: editing?.shipping_address ?? null,
      status: form.status
    };
    if (editing) {
      updateCustomer(editing.id, payload);
      persistExtraFields(tenantId, "crm.customer", editing.id, extraJson);
    } else {
      const row = createCustomer(tenantId, payload);
      persistExtraFields(tenantId, "crm.customer", row.id, extraJson);
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
      entityLabel: "customer",
      onConfirm: doSave
    });
  }

  return (
    <AppShell activeModule="crm">
      <PageHeader title="Customers" description="Customer master used by Sales invoices and deals." actionLabel="Add customer" onAction={openCreate} />
      <ModuleBreadcrumbs />

      {openForm ? (
        <Panel className="mb-4">
          <form onSubmit={submit} className="grid gap-3 md:grid-cols-3">
            {error ? <p className="md:col-span-3 text-sm text-rose-600">{error}</p> : null}
            <Field label="Name">
              <TextInput value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
            </Field>
            <Field label="Type">
              <SelectInput value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value as Customer["type"] })}>
                <option value="company">Company</option>
                <option value="individual">Individual</option>
              </SelectInput>
            </Field>
            <Field label="Status">
              <SelectInput value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value as Customer["status"] })}>
                <option value="active">active</option>
                <option value="inactive">inactive</option>
              </SelectInput>
            </Field>
            <Field label="Industry">
              <TextInput value={form.industry} onChange={(e) => setForm({ ...form, industry: e.target.value })} />
            </Field>
            <Field label="Email">
              <TextInput type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} required />
            </Field>
            <Field label="Phone">
              <TextInput value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
            </Field>
            <Field label="Tax / NTN">
              <TextInput value={form.tax_number} onChange={(e) => setForm({ ...form, tax_number: e.target.value })} />
            </Field>
            <Field label="Credit limit">
              <TextInput type="number" value={form.credit_limit} onChange={(e) => setForm({ ...form, credit_limit: e.target.value })} />
            </Field>
            <Field label="Credit terms">
              <TextInput value={form.credit_terms} onChange={(e) => setForm({ ...form, credit_terms: e.target.value })} placeholder="Net 30" />
            </Field>
            <Field label="Customer segment">
              <SelectInput value={form.customer_group_id} onChange={(e) => setForm({ ...form, customer_group_id: e.target.value })}>
                <option value="">None</option>
                {groups.map((g) => (
                  <option key={g.id} value={g.id}>{g.name}{g.price_group ? ` (${g.price_group})` : ""}</option>
                ))}
              </SelectInput>
            </Field>
            <ExtraFieldsBlock formKey="crm.customer" valueJson={extraJson} onChange={setExtraJson} />
            <div className="md:col-span-3 flex gap-2">
              <Button type="submit">{editing ? "Update customer" : "Save customer"}</Button>
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
          searchPlaceholder="Search name, email, phone…"
          filterLabel="statuses"
          filterValue={statusFilter}
          filterOptions={[
            { value: "active", label: "active" },
            { value: "inactive", label: "inactive" }
          ]}
          onFilterChange={setStatusFilter}
          sortValue={sortField}
          sortOptions={[
            { value: "name", label: "Name" },
            { value: "customer_no", label: "Customer no" },
            { value: "email", label: "Email" },
            { value: "status", label: "Status" }
          ]}
          onSortChange={setSortField}
          sortDir={sortDir}
          onSortDirChange={setSortDir}
          onExportCsv={() =>
            exportListCsv({
              tenantId,
              module: "crm",
              filename: "customers",
              rows: filtered.map((c) => ({
                No: c.customer_no,
                Name: c.name,
                Type: c.type,
                Email: c.email,
                Phone: c.phone,
                Status: c.status
              }))
            })
          }
          onExportPdf={() =>
            exportListPdf({
              tenantId,
              module: "crm",
              title: "Customers",
              filename: "customers",
              columns: ["No", "Name", "Email", "Status"],
              rows: filtered.map((c) => [c.customer_no, c.name, c.email, c.status])
            })
          }
        />
        <table className="min-w-full text-left text-sm">
          <thead>
            <tr className="border-b border-line bg-cloud">
              {["Customer", "Type", "Email", "Phone", "Status", ""].map((h) => (
                <th key={h || "a"} className="px-3 py-3 font-semibold text-slate-600">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filtered.map((c) => (
              <tr key={c.id} className="border-b border-line">
                <td className="px-3 py-3">
                  <Link href={`/crm/customers/${c.id}`} className="font-medium text-teal hover:underline">
                    {c.name}
                  </Link>
                  <p className="text-xs text-slate-500">{c.customer_no}</p>
                  <ExtraFieldsReadout tenantId={tenantId} formKey="crm.customer" recordId={c.id} />
                </td>
                <td className="px-3 py-3 capitalize">{c.type}</td>
                <td className="px-3 py-3">{c.email}</td>
                <td className="px-3 py-3">{c.phone}</td>
                <td className="px-3 py-3">
                  <StatusBadge status={c.status} />
                </td>
                <td className="px-3 py-3">
                  <RecordRowActions
                    onEdit={() => openEdit(c)}
                    onTrash={() =>
                      askTrash({
                        entityLabel: "customer",
                        name: c.name,
                        onConfirm: () => {
                          trashCustomer(c.id);
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
