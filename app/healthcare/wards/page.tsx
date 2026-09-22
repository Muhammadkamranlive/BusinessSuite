"use client";

import { useEffect, useMemo, useState } from "react";
import { AppShell } from "@/components/app-shell";
import { ModuleBreadcrumbs } from "@/components/common/module-breadcrumbs";
import { PageHeader } from "@/components/common/page-header";
import { DataListToolbar } from "@/components/common/data-list-toolbar";
import { RecordRowActions } from "@/components/common/record-row-actions";
import { useConfirm } from "@/components/common/use-confirm";
import { ExtraFieldsBlock } from "@/components/forms/extra-fields-block";
import { Button, Field, Panel, SelectInput, TextInput } from "@/components/ui";
import { getStoredTenantId } from "@/lib/auth/session";
import { exportListCsv } from "@/lib/list-export";
import { filterAndSort } from "@/lib/list-query";
import { persistExtraFields } from "@/modules/forms/services/extra-fields.store";
import {
  createWard,
  listWards,
  pullHmsClinicalFromSupabase,
  subscribeHmsClinical,
  trashWard,
  updateWard,
  type HmsWard,
  type HmsWardType
} from "@/modules/healthcare/services/hms-clinical.store";

const empty = { code: "", name: "", ward_type: "general" as HmsWardType, branch_id: "" };

export default function HmsWardsPage() {
  const tenantId = getStoredTenantId() ?? "alpha";
  const { askSave, askTrash, dialog } = useConfirm();
  const [rows, setRows] = useState<HmsWard[]>([]);
  const [search, setSearch] = useState("");
  const [sortField, setSortField] = useState("code");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");
  const [openForm, setOpenForm] = useState(false);
  const [editing, setEditing] = useState<HmsWard | null>(null);
  const [form, setForm] = useState(empty);
  const [extraJson, setExtraJson] = useState("");

  function refresh() {
    setRows(listWards(tenantId));
  }
  useEffect(() => {
    void pullHmsClinicalFromSupabase(tenantId).finally(() => refresh());
    return subscribeHmsClinical(() => refresh());
  }, [tenantId]);

  const filtered = useMemo(
    () =>
      filterAndSort(rows as unknown as Array<Record<string, unknown>>, {
        search,
        searchFields: ["code", "name", "ward_type"],
        sortField,
        sortDir
      }) as unknown as HmsWard[],
    [rows, search, sortField, sortDir]
  );

  function doSave() {
    if (!form.code.trim() || !form.name.trim()) return;
    const payload = {
      code: form.code.trim(),
      name: form.name.trim(),
      ward_type: form.ward_type,
      branch_id: form.branch_id || null
    };
    if (editing) {
      updateWard(editing.id, payload);
      persistExtraFields(tenantId, "healthcare.hms.ward", editing.id, extraJson);
    } else {
      const row = createWard(tenantId, payload);
      persistExtraFields(tenantId, "healthcare.hms.ward", row.id, extraJson);
    }
    setOpenForm(false);
    refresh();
  }

  return (
    <AppShell activeModule="healthcare">
      {dialog}
      <ModuleBreadcrumbs />
      <PageHeader
        title="Wards"
        description="IPD ward masters — code, type, and capacity planning."
        actionLabel="Add ward"
        onAction={() => {
          setEditing(null);
          setForm(empty);
          setExtraJson("");
          setOpenForm(true);
        }}
      />
      {openForm ? (
        <Panel className="mb-4">
          <form
            className="grid gap-3 md:grid-cols-2"
            onSubmit={(e) => {
              e.preventDefault();
              askSave({ editing: Boolean(editing), entityLabel: "ward", onConfirm: doSave });
            }}
          >
            <Field label="Code">
              <TextInput required value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value })} />
            </Field>
            <Field label="Name">
              <TextInput required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
            </Field>
            <Field label="Ward type">
              <SelectInput value={form.ward_type} onChange={(e) => setForm({ ...form, ward_type: e.target.value as HmsWard["ward_type"] })}>
                <option value="general">General</option>
                <option value="icu">ICU</option>
                <option value="private">Private</option>
                <option value="maternity">Maternity</option>
                <option value="pediatric">Pediatric</option>
                <option value="isolation">Isolation</option>
              </SelectInput>
            </Field>
            <div className="md:col-span-2">
              <ExtraFieldsBlock formKey="healthcare.hms.ward" valueJson={extraJson} onChange={setExtraJson} />
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
          sortValue={sortField}
          sortOptions={[
            { value: "code", label: "Code" },
            { value: "name", label: "Name" }
          ]}
          onSortChange={setSortField}
          sortDir={sortDir}
          onSortDirChange={setSortDir}
          onExportCsv={() =>
            exportListCsv({
              tenantId,
              module: "healthcare",
              filename: "hms-wards",
              rows: filtered.map((r) => ({ Code: r.code, Name: r.name, Type: r.ward_type }))
            })
          }
        />
        <div className="mt-3 overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-slate-500">
                <th className="px-3 py-2">Ward</th>
                <th>Type</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {filtered.map((row) => (
                <tr key={row.id} className="border-t border-line">
                  <td className="px-3 py-3">
                    <div className="font-semibold">{row.name}</div>
                    <div className="text-xs text-slate-500">{row.code}</div>
                  </td>
                  <td>{row.ward_type}</td>
                  <td>
                    <RecordRowActions
                      onEdit={() => {
                        setEditing(row);
                        setForm({ code: row.code, name: row.name, ward_type: row.ward_type, branch_id: row.branch_id ?? "" });
                        setExtraJson("");
                        setOpenForm(true);
                      }}
                      onTrash={() =>
                        askTrash({
                          entityLabel: "ward",
                          onConfirm: () => {
                            trashWard(row.id);
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
