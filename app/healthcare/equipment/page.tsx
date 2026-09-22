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
import { Button, Field, Panel, TextInput } from "@/components/ui";
import { getStoredTenantId } from "@/lib/auth/session";
import { exportListCsv } from "@/lib/list-export";
import { filterAndSort } from "@/lib/list-query";
import { persistExtraFields } from "@/modules/forms/services/extra-fields.store";
import {
  createEquipmentAsset,
  listEquipmentAssets,
  pullHmsClinicalFromSupabase,
  subscribeHmsClinical,
  updateEquipmentAsset,
  type HmsEquipmentAsset
} from "@/modules/healthcare/services/hms-clinical.store";

const empty = { asset_tag: "", name: "", category: "", location: "", next_maintenance: "", status: "operational" };

export default function HmsEquipmentPage() {
  const tenantId = getStoredTenantId() ?? "alpha";
  const { askSave, dialog } = useConfirm();
  const [rows, setRows] = useState<HmsEquipmentAsset[]>([]);
  const [search, setSearch] = useState("");
  const [openForm, setOpenForm] = useState(false);
  const [editing, setEditing] = useState<HmsEquipmentAsset | null>(null);
  const [form, setForm] = useState(empty);
  const [extraJson, setExtraJson] = useState("");

  function refresh() {
    setRows(listEquipmentAssets(tenantId));
  }
  useEffect(() => {
    void pullHmsClinicalFromSupabase(tenantId).finally(() => refresh());
    return subscribeHmsClinical(() => refresh());
  }, [tenantId]);

  const filtered = useMemo(
    () =>
      filterAndSort(rows as unknown as Array<Record<string, unknown>>, {
        search,
        searchFields: ["asset_tag", "name", "category", "location", "status"],
        sortField: "asset_tag",
        sortDir: "asc"
      }) as unknown as HmsEquipmentAsset[],
    [rows, search]
  );

  function doSave() {
    if (!form.asset_tag.trim() || !form.name.trim()) return;
    const payload = {
      asset_tag: form.asset_tag.trim(),
      name: form.name.trim(),
      category: form.category || null,
      location: form.location || null,
      next_maintenance: form.next_maintenance || null,
      status: form.status
    };
    if (editing) {
      updateEquipmentAsset(editing.id, payload);
      persistExtraFields(tenantId, "healthcare.hms.equipment", editing.id, extraJson);
    } else {
      const row = createEquipmentAsset(tenantId, payload);
      persistExtraFields(tenantId, "healthcare.hms.equipment", row.id, extraJson);
    }
    setOpenForm(false);
    refresh();
  }

  return (
    <AppShell activeModule="healthcare">
      {dialog}
      <ModuleBreadcrumbs />
      <PageHeader
        title="Biomedical equipment"
        description="Asset registry, location, and maintenance scheduling."
        actionLabel="Add equipment"
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
              askSave({ editing: Boolean(editing), entityLabel: "equipment", onConfirm: doSave });
            }}
          >
            <Field label="Asset tag">
              <TextInput required value={form.asset_tag} onChange={(e) => setForm({ ...form, asset_tag: e.target.value })} />
            </Field>
            <Field label="Name">
              <TextInput required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
            </Field>
            <Field label="Category">
              <TextInput value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} />
            </Field>
            <Field label="Location">
              <TextInput value={form.location} onChange={(e) => setForm({ ...form, location: e.target.value })} />
            </Field>
            <Field label="Next maintenance">
              <TextInput type="date" value={form.next_maintenance} onChange={(e) => setForm({ ...form, next_maintenance: e.target.value })} />
            </Field>
            <div className="md:col-span-2">
              <ExtraFieldsBlock formKey="healthcare.hms.equipment" valueJson={extraJson} onChange={setExtraJson} />
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
          onExportCsv={() =>
            exportListCsv({
              tenantId,
              module: "healthcare",
              filename: "hms-equipment",
              rows: filtered.map((r) => ({ Tag: r.asset_tag, Name: r.name, Location: r.location ?? "", Status: r.status }))
            })
          }
        />
        <div className="mt-3 overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-slate-500">
                <th className="px-3 py-2">Asset</th>
                <th>Location</th>
                <th>Maintenance</th>
                <th>Status</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {filtered.map((row) => (
                <tr key={row.id} className="border-t border-line">
                  <td className="px-3 py-3">
                    <div className="font-semibold">{row.name}</div>
                    <div className="text-xs text-slate-500">{row.asset_tag}</div>
                  </td>
                  <td>{row.location ?? "—"}</td>
                  <td>{row.next_maintenance ?? "—"}</td>
                  <td>
                    <StatusBadge status={row.status} />
                  </td>
                  <td>
                    <RecordRowActions
                      onEdit={() => {
                        setEditing(row);
                        setForm({
                          asset_tag: row.asset_tag,
                          name: row.name,
                          category: row.category ?? "",
                          location: row.location ?? "",
                          next_maintenance: row.next_maintenance ?? "",
                          status: row.status
                        });
                        setOpenForm(true);
                      }}
                      onTrash={() => undefined}
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
