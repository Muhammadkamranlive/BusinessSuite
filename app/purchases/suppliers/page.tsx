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
  createSupplier,
  listSuppliers,
  trashSupplier,
  updateSupplier,
  type Supplier
} from "@/modules/purchase/services/purchase.store";

const empty = {
  name: "",
  email: "",
  phone: "",
  contact_person: "",
  status: "active" as Supplier["status"]
};

export default function SuppliersPage() {
  const tenantId = getStoredTenantId() ?? "alpha";
  const { askSave, askTrash, dialog } = useConfirm();
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [sortField, setSortField] = useState("name");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");
  const [openForm, setOpenForm] = useState(false);
  const [editing, setEditing] = useState<Supplier | null>(null);
  const [error, setError] = useState("");
  const [form, setForm] = useState(empty);
  const [extraJson, setExtraJson] = useState("");

  function refresh() {
    setSuppliers(listSuppliers(tenantId));
  }

  useEffect(() => {
    refresh();
  }, [tenantId]);

  const filtered = useMemo(
    () =>
      filterAndSort(suppliers as unknown as Array<Record<string, unknown>>, {
        search,
        searchFields: ["name", "email", "phone", "supplier_no", "contact_person"],
        statusField: "status",
        statusValue: statusFilter,
        sortField,
        sortDir
      }) as unknown as Supplier[],
    [suppliers, search, statusFilter, sortField, sortDir]
  );

  function openCreate() {
    setEditing(null);
    setForm(empty);
    setExtraJson("");
    setError("");
    setOpenForm(true);
  }

  function openEdit(row: Supplier) {
    setEditing(row);
    setForm({
      name: row.name,
      email: row.email,
      phone: row.phone,
      contact_person: row.contact_person,
      status: row.status
    });
    setExtraJson(getExtraFieldValues(tenantId, "purchases.supplier", row.id));
    setError("");
    setOpenForm(true);
  }

  function doSave() {
    setError("");
    if (!form.name.trim()) {
      setError("Supplier name is required.");
      return;
    }
    const payload = {
      name: form.name.trim(),
      email: form.email.trim(),
      phone: form.phone.trim(),
      contact_person: form.contact_person.trim() || "—",
      status: form.status
    };
    if (editing) {
      updateSupplier(editing.id, payload);
      persistExtraFields(tenantId, "purchases.supplier", editing.id, extraJson);
    } else {
      const row = createSupplier(tenantId, payload);
      persistExtraFields(tenantId, "purchases.supplier", row.id, extraJson);
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
      entityLabel: "supplier",
      onConfirm: doSave
    });
  }

  return (
    <AppShell activeModule="purchases">
      <PageHeader title="Suppliers" description="Vendor directory used on purchase orders." actionLabel="Add supplier" onAction={openCreate} />
      <ModuleBreadcrumbs />

      {openForm ? (
        <Panel className="mb-4">
          <form onSubmit={submit} className="grid gap-3 md:grid-cols-2">
            {error ? <p className="md:col-span-2 text-sm text-rose-600">{error}</p> : null}
            <Field label="Name">
              <TextInput value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
            </Field>
            <Field label="Contact person">
              <TextInput value={form.contact_person} onChange={(e) => setForm({ ...form, contact_person: e.target.value })} />
            </Field>
            <Field label="Email">
              <TextInput type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
            </Field>
            <Field label="Phone">
              <TextInput value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
            </Field>
            <Field label="Status">
              <SelectInput value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value as Supplier["status"] })}>
                <option value="active">active</option>
                <option value="inactive">inactive</option>
              </SelectInput>
            </Field>
            <ExtraFieldsBlock formKey="purchases.supplier" valueJson={extraJson} onChange={setExtraJson} />
            <div className="md:col-span-2 flex gap-2">
              <Button type="submit">{editing ? "Update supplier" : "Save supplier"}</Button>
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
            { value: "supplier_no", label: "Supplier no" },
            { value: "email", label: "Email" },
            { value: "status", label: "Status" }
          ]}
          onSortChange={setSortField}
          sortDir={sortDir}
          onSortDirChange={setSortDir}
          onExportCsv={() =>
            exportListCsv({
              tenantId,
              module: "purchases",
              filename: "suppliers",
              rows: filtered.map((s) => ({
                No: s.supplier_no,
                Name: s.name,
                Contact: s.contact_person,
                Email: s.email,
                Phone: s.phone,
                Status: s.status
              }))
            })
          }
          onExportPdf={() =>
            exportListPdf({
              tenantId,
              module: "purchases",
              title: "Suppliers",
              filename: "suppliers",
              columns: ["No", "Name", "Email", "Status"],
              rows: filtered.map((s) => [s.supplier_no, s.name, s.email, s.status])
            })
          }
        />
        <table className="min-w-full text-left text-sm">
          <thead>
            <tr className="border-b border-line bg-cloud">
              {["Supplier No", "Name", "Contact", "Email", "Phone", "Status", ""].map((h) => (
                <th key={h || "a"} className="px-3 py-3 font-semibold text-slate-600">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filtered.map((s) => (
              <tr key={s.id} className="border-b border-line">
                <td className="px-3 py-3 font-medium">
                  {s.supplier_no}
                  <ExtraFieldsReadout tenantId={tenantId} formKey="purchases.supplier" recordId={s.id} />
                </td>
                <td className="px-3 py-3">{s.name}</td>
                <td className="px-3 py-3">{s.contact_person}</td>
                <td className="px-3 py-3">{s.email}</td>
                <td className="px-3 py-3">{s.phone}</td>
                <td className="px-3 py-3">
                  <StatusBadge status={s.status} />
                </td>
                <td className="px-3 py-3">
                  <RecordRowActions
                    onEdit={() => openEdit(s)}
                    onTrash={() =>
                      askTrash({
                        entityLabel: "supplier",
                        name: s.name,
                        onConfirm: () => {
                          trashSupplier(s.id);
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
