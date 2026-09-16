"use client";

import { useEffect, useMemo, useState } from "react";
import { AppShell } from "@/components/app-shell";
import { DataListToolbar } from "@/components/common/data-list-toolbar";
import { ModuleBreadcrumbs } from "@/components/common/module-breadcrumbs";
import { PageHeader } from "@/components/common/page-header";
import { RecordRowActions } from "@/components/common/record-row-actions";
import { useConfirm } from "@/components/common/use-confirm";
import { ExtraFieldsBlock } from "@/components/forms/extra-fields-block";
import { ExtraFieldsReadout } from "@/components/forms/extra-fields-readout";
import { Button, Field, Panel, TextInput } from "@/components/ui";
import { getStoredTenantId } from "@/lib/auth/session";
import { exportListCsv, exportListPdf } from "@/lib/list-export";
import { filterAndSort } from "@/lib/list-query";
import { getExtraFieldValues, persistExtraFields } from "@/modules/forms/services/extra-fields.store";

type NamedRow = { id: string; name: string; code: string };

export function NamedMasterPage({
  title,
  description,
  entityLabel,
  formKey,
  filename,
  extraFields,
  list,
  create,
  update,
  trash
}: {
  title: string;
  description: string;
  entityLabel: string;
  formKey: string;
  filename: string;
  extraFields?: Array<{ key: string; label: string; type?: "text" | "number" }>;
  list: (tenantId: string) => NamedRow[];
  create: (tenantId: string, data: never) => { id: string };
  update: (id: string, data: never) => unknown;
  trash: (id: string) => unknown;
}) {
  const tenantId = getStoredTenantId() ?? "alpha";
  const { askSave, askTrash, dialog } = useConfirm();
  const [rows, setRows] = useState<NamedRow[]>([]);
  const [search, setSearch] = useState("");
  const [sortField, setSortField] = useState("name");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");
  const [openForm, setOpenForm] = useState(false);
  const [editing, setEditing] = useState<NamedRow | null>(null);
  const [extraJson, setExtraJson] = useState("");
  const [form, setForm] = useState<Record<string, string>>({ name: "", code: "" });

  function refresh() {
    setRows(list(tenantId));
  }

  useEffect(() => {
    refresh();
  }, [tenantId]);

  const filtered = useMemo(
    () =>
      filterAndSort(rows as unknown as Array<Record<string, unknown>>, {
        search,
        searchFields: ["name", "code"],
        sortField,
        sortDir
      }) as unknown as NamedRow[],
    [rows, search, sortField, sortDir]
  );

  function openCreate() {
    setEditing(null);
    setForm({ name: "", code: "", ...(extraFields ?? []).reduce((acc, f) => ({ ...acc, [f.key]: "" }), {}) });
    setExtraJson("");
    setOpenForm(true);
  }

  function openEdit(row: NamedRow) {
    setEditing(row);
    const next: Record<string, string> = { name: String(row.name), code: String(row.code) };
    const raw = row as Record<string, unknown>;
    for (const f of extraFields ?? []) next[f.key] = String(raw[f.key] ?? "");
    setForm(next);
    setExtraJson(getExtraFieldValues(tenantId, formKey, row.id));
    setOpenForm(true);
  }

  function doSave() {
    const payload: Record<string, unknown> = { name: form.name.trim(), code: form.code.trim() };
    for (const f of extraFields ?? []) {
      payload[f.key] = f.type === "number" ? Number(form[f.key]) || 0 : form[f.key]?.trim() || null;
    }
    if (editing) {
      update(editing.id, payload as never);
      persistExtraFields(tenantId, formKey, editing.id, extraJson);
    } else {
      const row = create(tenantId, payload as never);
      persistExtraFields(tenantId, formKey, row.id, extraJson);
    }
    setOpenForm(false);
    setEditing(null);
    refresh();
  }

  return (
    <AppShell activeModule="hrm">
      <PageHeader title={title} description={description} actionLabel={`Add ${entityLabel}`} onAction={openCreate} />
      <ModuleBreadcrumbs />
      {openForm ? (
        <Panel className="mb-5 border-teal/40">
          <h2 className="mb-4 text-lg font-bold text-ink">{editing ? `Edit ${entityLabel}` : `Add ${entityLabel}`}</h2>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              askSave({ editing: Boolean(editing), entityLabel, onConfirm: doSave });
            }}
            className="grid gap-4 md:grid-cols-2"
          >
            <Field label="Name">
              <TextInput required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
            </Field>
            <Field label="Code">
              <TextInput required value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value })} />
            </Field>
            {(extraFields ?? []).map((f) => (
              <Field key={f.key} label={f.label}>
                <TextInput
                  type={f.type === "number" ? "number" : "text"}
                  value={form[f.key] ?? ""}
                  onChange={(e) => setForm({ ...form, [f.key]: e.target.value })}
                />
              </Field>
            ))}
            <ExtraFieldsBlock formKey={formKey} valueJson={extraJson} onChange={setExtraJson} />
            <div className="flex gap-2 md:col-span-2">
              <Button type="submit">{editing ? "Save changes" : `Add ${entityLabel}`}</Button>
              <Button type="button" variant="secondary" onClick={() => setOpenForm(false)}>Cancel</Button>
            </div>
          </form>
        </Panel>
      ) : null}
      <Panel className="overflow-hidden p-0">
        <div className="p-4">
          <DataListToolbar
            search={search}
            onSearchChange={setSearch}
            sortValue={sortField}
            sortOptions={[{ value: "name", label: "Name" }, { value: "code", label: "Code" }]}
            onSortChange={setSortField}
            sortDir={sortDir}
            onSortDirChange={setSortDir}
            onExportCsv={() =>
              exportListCsv({
                tenantId,
                module: "hrm",
                filename,
                rows: filtered.map((r) => ({ Code: r.code, Name: r.name }))
              })
            }
            onExportPdf={() =>
              exportListPdf({
                tenantId,
                module: "hrm",
                title,
                filename,
                columns: ["Code", "Name"],
                rows: filtered.map((r) => [r.code, r.name])
              })
            }
          />
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full text-left text-sm">
            <thead>
              <tr className="border-b border-line bg-cloud">
                {["Code", "Name", ...((extraFields ?? []).map((f) => f.label)), ""].map((h) => (
                  <th key={h || "a"} className="px-4 py-3 font-semibold text-slate-600">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map((r) => (
                <tr key={r.id} className="border-b border-line">
                  <td className="px-4 py-3 font-medium">{r.code}</td>
                  <td className="px-4 py-3">
                    {r.name}
                    <ExtraFieldsReadout tenantId={tenantId} formKey={formKey} recordId={r.id} />
                  </td>
                  {(extraFields ?? []).map((f) => (
                    <td key={f.key} className="px-4 py-3">{String((r as Record<string, unknown>)[f.key] ?? "—")}</td>
                  ))}
                  <td className="px-4 py-3">
                    <RecordRowActions
                      onEdit={() => openEdit(r)}
                      onTrash={() => askTrash({ entityLabel, name: r.name, onConfirm: () => { trash(r.id); refresh(); } })}
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Panel>
      {dialog}
    </AppShell>
  );
}
