"use client";

import { useEffect, useMemo, useState } from "react";
import { usePathname } from "next/navigation";
import { AppShell } from "@/components/app-shell";
import { ModuleBreadcrumbs } from "@/components/common/module-breadcrumbs";
import { PageHeader } from "@/components/common/page-header";
import { StatusBadge } from "@/components/common/status-badge";
import { DataListToolbar } from "@/components/common/data-list-toolbar";
import { RecordRowActions } from "@/components/common/record-row-actions";
import { useConfirm } from "@/components/common/use-confirm";
import { ExtraFieldsBlock } from "@/components/forms/extra-fields-block";
import { ExtraFieldsReadout } from "@/components/forms/extra-fields-readout";
import { Button, Field, Panel, SelectInput, TextArea, TextInput } from "@/components/ui";
import { getStoredTenantId } from "@/lib/auth/session";
import { getSessionProfile } from "@/lib/auth/session-profile";
import { menusMatchingPath } from "@/lib/menu-registry";
import { exportListCsv, exportListPdf } from "@/lib/list-export";
import { filterAndSort } from "@/lib/list-query";
import { canMenu } from "@/modules/admin/services/acl.store";
import { getExtraFieldValues, persistExtraFields } from "@/modules/forms/services/extra-fields.store";
import { getCatalogSpec, type CatalogField } from "@/modules/catalog/catalog-registry";
import { createCatalog, listCatalog, trashCatalog, updateCatalog, type CatalogRow } from "@/modules/catalog/services/catalog.store";

function emptyFromFields(fields: CatalogField[], status: string) {
  const form: Record<string, string> = { status };
  for (const f of fields) form[f.key] = "";
  return form;
}

function FieldControl({
  field,
  value,
  onChange
}: {
  field: CatalogField;
  value: string;
  onChange: (v: string) => void;
}) {
  if (field.kind === "select") {
    return (
      <SelectInput value={value} onChange={(e) => onChange(e.target.value)} required={field.required}>
        <option value="">Select…</option>
        {(field.options ?? []).map((o) => (
          <option key={o} value={o}>
            {o.replace(/_/g, " ")}
          </option>
        ))}
      </SelectInput>
    );
  }
  if (field.kind === "textarea") {
    return <TextArea value={value} onChange={(e) => onChange(e.target.value)} required={field.required} rows={3} />;
  }
  return (
    <TextInput
      type={field.kind === "number" ? "number" : field.kind === "date" ? "date" : "text"}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      required={field.required}
    />
  );
}

export function CatalogEntityPage({ slug }: { slug: string }) {
  const spec = getCatalogSpec(slug);
  const tenantId = getStoredTenantId() ?? "alpha";
  const profile = getSessionProfile();
  const pathname = usePathname() || "/";
  const menuId = menusMatchingPath(pathname)[0]?.id;
  const canCreate = menuId ? canMenu(profile.role, profile.email, menuId, "create") : false;
  const canUpdate = menuId ? canMenu(profile.role, profile.email, menuId, "update") : false;
  const canDelete = menuId ? canMenu(profile.role, profile.email, menuId, "delete") : false;
  const { askSave, askTrash, dialog } = useConfirm();
  const [rows, setRows] = useState<CatalogRow[]>([]);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [sortField, setSortField] = useState(spec?.fields[0]?.key ?? "created_at");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");
  const [openForm, setOpenForm] = useState(false);
  const [editing, setEditing] = useState<CatalogRow | null>(null);
  const [error, setError] = useState("");
  const [form, setForm] = useState<Record<string, string>>({});
  const [extraJson, setExtraJson] = useState("");

  function refresh() {
    if (spec) setRows(listCatalog(spec.slug, tenantId));
  }

  useEffect(() => {
    refresh();
  }, [tenantId, slug]);

  const searchFields = spec?.fields.filter((f) => f.search !== false).map((f) => f.key) ?? [];
  const searchKey = searchFields.join("|");
  const filtered = useMemo(
    () =>
      filterAndSort(rows as unknown as Array<Record<string, unknown>>, {
        search,
        searchFields: [...searchFields, "status"],
        statusField: "status",
        statusValue: statusFilter,
        sortField,
        sortDir
      }) as unknown as CatalogRow[],
    [rows, search, statusFilter, sortField, sortDir, searchKey]
  );

  if (!spec) {
    return (
      <AppShell activeModule="dashboard">
        <p className="text-sm text-rose-600">Unknown catalog {slug}</p>
      </AppShell>
    );
  }

  const catalog = spec;

  function openCreate() {
    setEditing(null);
    setForm(emptyFromFields(catalog.fields, catalog.statusOptions[0] ?? "active"));
    setExtraJson("");
    setError("");
    setOpenForm(true);
  }

  function openEdit(row: CatalogRow) {
    setEditing(row);
    const next = emptyFromFields(catalog.fields, String(row.status ?? catalog.statusOptions[0]));
    for (const f of catalog.fields) next[f.key] = row[f.key] == null ? "" : String(row[f.key]);
    next.status = String(row.status ?? catalog.statusOptions[0]);
    setForm(next);
    setExtraJson(getExtraFieldValues(tenantId, catalog.formKey, row.id));
    setError("");
    setOpenForm(true);
  }

  function payload() {
    const data: Record<string, unknown> = { status: form.status };
    for (const f of catalog.fields) {
      const raw = form[f.key] ?? "";
      data[f.key] = f.kind === "number" ? Number(raw) || 0 : raw;
    }
    return data;
  }

  function doSave() {
    setError("");
    for (const f of catalog.fields) {
      if (f.required && !String(form[f.key] ?? "").trim()) {
        setError(`${f.label} is required.`);
        return;
      }
    }
    if (editing) {
      updateCatalog(catalog.slug, editing.id, payload());
      persistExtraFields(tenantId, catalog.formKey, editing.id, extraJson);
    } else {
      const row = createCatalog(catalog.slug, tenantId, payload());
      persistExtraFields(tenantId, catalog.formKey, row.id, extraJson);
    }
    setOpenForm(false);
    setEditing(null);
    setExtraJson("");
    refresh();
  }

  const displayCols = catalog.fields.slice(0, 4);

  return (
    <AppShell activeModule={catalog.module}>
      {dialog}
      <ModuleBreadcrumbs />
      <PageHeader
        title={catalog.title}
        description={catalog.description}
        actionLabel={canCreate ? `New ${catalog.title.toLowerCase()}` : undefined}
        onAction={canCreate ? openCreate : undefined}
      />
      {openForm ? (
        <Panel className="mb-4">
          <form
            className="grid gap-3 md:grid-cols-2"
            onSubmit={(e) => {
              e.preventDefault();
              askSave({ editing: Boolean(editing), entityLabel: catalog.title.toLowerCase(), onConfirm: doSave });
            }}
          >
            {error ? <p className="md:col-span-2 text-sm text-rose-600">{error}</p> : null}
            {catalog.fields.map((f) => (
              <Field key={f.key} label={f.label} className={f.kind === "textarea" ? "md:col-span-2" : undefined}>
                <FieldControl field={f} value={form[f.key] ?? ""} onChange={(v) => setForm({ ...form, [f.key]: v })} />
              </Field>
            ))}
            <Field label="Status">
              <SelectInput value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })}>
                {catalog.statusOptions.map((s) => (
                  <option key={s} value={s}>
                    {s.replace(/_/g, " ")}
                  </option>
                ))}
              </SelectInput>
            </Field>
            <div className="md:col-span-2">
              <ExtraFieldsBlock formKey={catalog.formKey} valueJson={extraJson} onChange={setExtraJson} />
            </div>
            <div className="md:col-span-2 flex gap-2">
              <Button type="submit">{editing ? "Update" : "Save"}</Button>
              <Button type="button" variant="secondary" onClick={() => setOpenForm(false)}>
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
          filterOptions={[{ value: "all", label: "All" }, ...catalog.statusOptions.map((s) => ({ value: s, label: s.replace(/_/g, " ") }))]}
          onFilterChange={setStatusFilter}
          sortValue={sortField}
          sortOptions={catalog.fields.map((f) => ({ value: f.key, label: f.label }))}
          onSortChange={setSortField}
          sortDir={sortDir}
          onSortDirChange={setSortDir}
          onExportCsv={() =>
            exportListCsv({
              tenantId,
              module: catalog.module,
              filename: catalog.slug.replace(".", "-"),
              rows: filtered.map((r) => {
                const out: Record<string, string | number> = { Status: String(r.status ?? "") };
                for (const f of catalog.fields) out[f.label] = r[f.key] == null ? "" : String(r[f.key]);
                return out;
              })
            })
          }
          onExportPdf={() =>
            exportListPdf({
              tenantId,
              module: catalog.module,
              title: catalog.title,
              filename: catalog.slug.replace(".", "-"),
              columns: [...displayCols.map((c) => c.label), "Status"],
              rows: filtered.map((r) => [...displayCols.map((c) => String(r[c.key] ?? "")), String(r.status)])
            })
          }
        />
        <div className="mt-3 overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-slate-500">
                {displayCols.map((c) => (
                  <th key={c.key} className="px-3 py-2">
                    {c.label}
                  </th>
                ))}
                <th>Status</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {filtered.map((r) => (
                <tr key={r.id} className="border-t border-line">
                  {displayCols.map((c, i) => (
                    <td key={c.key} className={`px-3 py-3 ${i === 0 ? "font-semibold" : ""}`}>
                      {String(r[c.key] ?? "—")}
                      {i === 0 ? <ExtraFieldsReadout tenantId={tenantId} formKey={catalog.formKey} recordId={r.id} /> : null}
                    </td>
                  ))}
                  <td>
                    <StatusBadge status={String(r.status)} />
                  </td>
                  <td>
                    <RecordRowActions
                      onEdit={canUpdate ? () => openEdit(r) : undefined}
                      onTrash={
                        canDelete
                          ? () =>
                              askTrash({
                                entityLabel: catalog.title.toLowerCase(),
                                onConfirm: () => {
                                  trashCatalog(catalog.slug, r.id);
                                  refresh();
                                }
                              })
                          : undefined
                      }
                    />
                  </td>
                </tr>
              ))}
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={displayCols.length + 2} className="px-3 py-8 text-center text-slate-400">
                    No records yet.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </Panel>
    </AppShell>
  );
}
