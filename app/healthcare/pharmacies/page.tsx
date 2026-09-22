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
  createPharmacy,
  listPharmacies,
  pullMarketplaceFromSupabase,
  subscribeMarketplace,
  trashPharmacy,
  updatePharmacy,
  type PharmacyPartner
} from "@/modules/healthcare/services/pharmacy-marketplace.store";

const empty = {
  name: "",
  code: "",
  npi: "",
  license_no: "",
  email: "",
  phone: "",
  address: "",
  api_mode: "manual" as PharmacyPartner["api_mode"],
  status: "pending" as PharmacyPartner["status"],
  notes: ""
};

export default function PharmaciesPage() {
  const tenantId = getStoredTenantId() ?? "alpha";
  const { askSave, askTrash, dialog } = useConfirm();
  const [rows, setRows] = useState<PharmacyPartner[]>([]);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [sortField, setSortField] = useState("name");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");
  const [openForm, setOpenForm] = useState(false);
  const [editing, setEditing] = useState<PharmacyPartner | null>(null);
  const [form, setForm] = useState(empty);
  const [extraJson, setExtraJson] = useState("");
  const [error, setError] = useState("");

  function refresh() {
    setRows(listPharmacies(tenantId));
  }
  useEffect(() => {
    void pullMarketplaceFromSupabase(tenantId).finally(() => refresh());
    return subscribeMarketplace(() => refresh());
  }, [tenantId]);

  const filtered = useMemo(
    () =>
      filterAndSort(rows as unknown as Array<Record<string, unknown>>, {
        search,
        searchFields: ["name", "code", "npi", "email", "status"],
        statusField: "status",
        statusValue: statusFilter,
        sortField,
        sortDir
      }) as unknown as PharmacyPartner[],
    [rows, search, statusFilter, sortField, sortDir]
  );

  function doSave() {
    if (!form.name.trim() || !form.code.trim()) {
      setError("Name and code are required.");
      return;
    }
    const payload = {
      name: form.name.trim(),
      code: form.code.trim().toUpperCase(),
      npi: form.npi.trim() || null,
      license_no: form.license_no.trim() || null,
      email: form.email.trim() || null,
      phone: form.phone.trim() || null,
      address: form.address.trim() || null,
      api_mode: form.api_mode,
      status: form.status,
      notes: form.notes.trim() || null
    };
    if (editing) {
      updatePharmacy(editing.id, payload);
      persistExtraFields(tenantId, "healthcare.pharmacy_partner", editing.id, extraJson);
    } else {
      const row = createPharmacy(tenantId, payload);
      persistExtraFields(tenantId, "healthcare.pharmacy_partner", row.id, extraJson);
    }
    setOpenForm(false);
    setError("");
    refresh();
  }

  return (
    <AppShell activeModule="healthcare">
      {dialog}
      <ModuleBreadcrumbs />
      <PageHeader
        title="Pharmacy partners"
        description="Multi-pharmacy profiles with API or manual fulfillment routing."
        actionLabel="Add pharmacy"
        onAction={() => {
          setEditing(null);
          setForm(empty);
          setExtraJson("");
          setError("");
          setOpenForm(true);
        }}
      />
      {openForm ? (
        <Panel className="mb-4">
          <form
            className="grid gap-3 md:grid-cols-2"
            onSubmit={(e) => {
              e.preventDefault();
              askSave({ editing: Boolean(editing), entityLabel: "pharmacy partner", onConfirm: doSave });
            }}
          >
            {error ? <p className="md:col-span-2 text-sm text-rose-600">{error}</p> : null}
            <Field label="Name">
              <TextInput required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
            </Field>
            <Field label="Code">
              <TextInput required value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value })} />
            </Field>
            <Field label="NPI">
              <TextInput value={form.npi} onChange={(e) => setForm({ ...form, npi: e.target.value })} />
            </Field>
            <Field label="License #">
              <TextInput value={form.license_no} onChange={(e) => setForm({ ...form, license_no: e.target.value })} />
            </Field>
            <Field label="Email">
              <TextInput type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
            </Field>
            <Field label="Phone">
              <TextInput value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
            </Field>
            <Field label="Address" className="md:col-span-2">
              <TextInput value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} />
            </Field>
            <Field label="Integration mode">
              <SelectInput
                value={form.api_mode}
                onChange={(e) => setForm({ ...form, api_mode: e.target.value as PharmacyPartner["api_mode"] })}
              >
                <option value="api">API</option>
                <option value="manual">Manual secure workflow</option>
              </SelectInput>
            </Field>
            <Field label="Status">
              <SelectInput
                value={form.status}
                onChange={(e) => setForm({ ...form, status: e.target.value as PharmacyPartner["status"] })}
              >
                <option value="pending">Pending</option>
                <option value="active">Active</option>
                <option value="suspended">Suspended</option>
              </SelectInput>
            </Field>
            <Field label="Notes" className="md:col-span-2">
              <TextInput value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
            </Field>
            <div className="md:col-span-2">
              <ExtraFieldsBlock formKey="healthcare.pharmacy_partner" valueJson={extraJson} onChange={setExtraJson} />
            </div>
            <div className="md:col-span-2 flex gap-2">
              <Button type="submit">Save</Button>
              <Button type="button" variant="ghost" onClick={() => setOpenForm(false)}>
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
          filterValue={statusFilter}
          filterOptions={[
            { value: "pending", label: "Pending" },
            { value: "active", label: "Active" },
            { value: "suspended", label: "Suspended" }
          ]}
          onFilterChange={setStatusFilter}
          sortValue={sortField}
          sortOptions={[
            { value: "name", label: "Name" },
            { value: "code", label: "Code" },
            { value: "status", label: "Status" }
          ]}
          onSortChange={setSortField}
          sortDir={sortDir}
          onSortDirChange={setSortDir}
          onExportCsv={() =>
            exportListCsv({
              tenantId,
              module: "healthcare",
              filename: "pharmacy-partners",
              rows: filtered.map((r) => ({
                Name: r.name,
                Code: r.code,
                NPI: r.npi ?? "",
                Mode: r.api_mode,
                Status: r.status
              }))
            })
          }
          onExportPdf={() =>
            exportListPdf({
              tenantId,
              module: "healthcare",
              title: "Pharmacy partners",
              filename: "pharmacy-partners",
              columns: ["Name", "Code", "NPI", "Mode", "Status"],
              rows: filtered.map((r) => [r.name, r.code, r.npi ?? "", r.api_mode, r.status])
            })
          }
        />
        <div className="mt-3 overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-slate-500">
                <th className="px-3 py-2">Pharmacy</th>
                <th>NPI / License</th>
                <th>Mode</th>
                <th>Status</th>
                <th>Contact</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {filtered.map((row) => (
                <tr key={row.id} className="border-t border-line">
                  <td className="px-3 py-3">
                    <div className="font-semibold">{row.name}</div>
                    <div className="text-xs text-slate-500">{row.code}</div>
                    <ExtraFieldsReadout tenantId={tenantId} formKey="healthcare.pharmacy_partner" recordId={row.id} />
                  </td>
                  <td>
                    {row.npi || "—"}
                    <div className="text-xs text-slate-500">{row.license_no || "—"}</div>
                  </td>
                  <td>{row.api_mode}</td>
                  <td>
                    <StatusBadge status={row.status} />
                  </td>
                  <td>
                    {row.email || "—"}
                    <div className="text-xs text-slate-500">{row.phone || ""}</div>
                  </td>
                  <td>
                    <RecordRowActions
                      onEdit={() => {
                        setEditing(row);
                        setForm({
                          name: row.name,
                          code: row.code,
                          npi: row.npi ?? "",
                          license_no: row.license_no ?? "",
                          email: row.email ?? "",
                          phone: row.phone ?? "",
                          address: row.address ?? "",
                          api_mode: row.api_mode,
                          status: row.status,
                          notes: row.notes ?? ""
                        });
                        setExtraJson(getExtraFieldValues(tenantId, "healthcare.pharmacy_partner", row.id));
                        setOpenForm(true);
                      }}
                      onTrash={() =>
                        askTrash({
                          entityLabel: "pharmacy partner",
                          onConfirm: () => {
                            trashPharmacy(row.id);
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
        </div>
      </Panel>
    </AppShell>
  );
}
