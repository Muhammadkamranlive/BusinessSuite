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
import { Button, Field, Panel, SelectInput, TextInput } from "@/components/ui";
import { getStoredTenantId } from "@/lib/auth/session";
import { exportListCsv } from "@/lib/list-export";
import { filterAndSort } from "@/lib/list-query";
import { persistExtraFields } from "@/modules/forms/services/extra-fields.store";
import {
  adjustConsumableQty,
  createConsumable,
  listConsumableMovements,
  listConsumables,
  pullHmsClinicalFromSupabase,
  subscribeHmsClinical,
  updateConsumable,
  type HmsConsumable
} from "@/modules/healthcare/services/hms-clinical.store";

const empty = { sku: "", name: "", category: "", quantity: "0", reorder_level: "10", unit: "each", location: "" };

export default function HmsConsumablesPage() {
  const tenantId = getStoredTenantId() ?? "alpha";
  const { askSave, dialog } = useConfirm();
  const [rows, setRows] = useState<HmsConsumable[]>([]);
  const [search, setSearch] = useState("");
  const [openForm, setOpenForm] = useState(false);
  const [adjustId, setAdjustId] = useState<string | null>(null);
  const [editing, setEditing] = useState<HmsConsumable | null>(null);
  const [form, setForm] = useState(empty);
  const [adjustForm, setAdjustForm] = useState({ qty_delta: "1", reason: "Stock receipt" });
  const [extraJson, setExtraJson] = useState("");

  function refresh() {
    setRows(listConsumables(tenantId));
  }
  useEffect(() => {
    void pullHmsClinicalFromSupabase(tenantId).finally(() => refresh());
    return subscribeHmsClinical(() => refresh());
  }, [tenantId]);

  const filtered = useMemo(
    () =>
      filterAndSort(rows as unknown as Array<Record<string, unknown>>, {
        search,
        searchFields: ["sku", "name", "category", "location"],
        sortField: "name",
        sortDir: "asc"
      }) as unknown as HmsConsumable[],
    [rows, search]
  );

  function doSave() {
    if (!form.sku.trim() || !form.name.trim()) return;
    const payload = {
      sku: form.sku.trim(),
      name: form.name.trim(),
      category: form.category || null,
      quantity: Number(form.quantity) || 0,
      reorder_level: Number(form.reorder_level) || 0,
      unit: form.unit || "each",
      location: form.location || null
    };
    if (editing) {
      updateConsumable(editing.id, payload);
      persistExtraFields(tenantId, "healthcare.hms.consumable", editing.id, extraJson);
    } else {
      const row = createConsumable(tenantId, payload);
      persistExtraFields(tenantId, "healthcare.hms.consumable", row.id, extraJson);
    }
    setOpenForm(false);
    refresh();
  }

  function doAdjust() {
    if (!adjustId) return;
    const delta = Number(adjustForm.qty_delta);
    if (!Number.isFinite(delta) || delta === 0 || !adjustForm.reason.trim()) return;
    adjustConsumableQty(tenantId, adjustId, delta, adjustForm.reason.trim(), "staff");
    setAdjustId(null);
    refresh();
  }

  return (
    <AppShell activeModule="healthcare">
      {dialog}
      <ModuleBreadcrumbs />
      <PageHeader
        title="Consumables inventory"
        description="Non-pharmacy stock — gloves, PPE, linens, and general supplies."
        actionLabel="Add consumable"
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
              askSave({ editing: Boolean(editing), entityLabel: "consumable", onConfirm: doSave });
            }}
          >
            <Field label="SKU">
              <TextInput required value={form.sku} onChange={(e) => setForm({ ...form, sku: e.target.value })} />
            </Field>
            <Field label="Name">
              <TextInput required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
            </Field>
            <Field label="Category">
              <TextInput value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} />
            </Field>
            <Field label="Unit">
              <TextInput value={form.unit} onChange={(e) => setForm({ ...form, unit: e.target.value })} />
            </Field>
            <Field label="Quantity">
              <TextInput type="number" min={0} value={form.quantity} onChange={(e) => setForm({ ...form, quantity: e.target.value })} />
            </Field>
            <Field label="Reorder level">
              <TextInput type="number" min={0} value={form.reorder_level} onChange={(e) => setForm({ ...form, reorder_level: e.target.value })} />
            </Field>
            <Field label="Location">
              <TextInput value={form.location} onChange={(e) => setForm({ ...form, location: e.target.value })} />
            </Field>
            <div className="md:col-span-2">
              <ExtraFieldsBlock formKey="healthcare.hms.consumable" valueJson={extraJson} onChange={setExtraJson} />
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
      {adjustId ? (
        <Panel className="mb-4">
          <form
            className="grid gap-3 md:grid-cols-2"
            onSubmit={(e) => {
              e.preventDefault();
              askSave({ editing: false, entityLabel: "stock adjustment", onConfirm: doAdjust });
            }}
          >
            <Field label="Qty change (+/-)">
              <TextInput type="number" required value={adjustForm.qty_delta} onChange={(e) => setAdjustForm({ ...adjustForm, qty_delta: e.target.value })} />
            </Field>
            <Field label="Reason">
              <SelectInput value={adjustForm.reason} onChange={(e) => setAdjustForm({ ...adjustForm, reason: e.target.value })}>
                <option value="Stock receipt">Stock receipt</option>
                <option value="Ward issue">Ward issue</option>
                <option value="Damaged / expired">Damaged / expired</option>
                <option value="Cycle count correction">Cycle count correction</option>
              </SelectInput>
            </Field>
            <div className="md:col-span-2 flex gap-2">
              <Button type="submit">Apply adjustment</Button>
              <Button type="button" variant="ghost" onClick={() => setAdjustId(null)}>
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
              filename: "hms-consumables",
              rows: filtered.map((r) => ({
                SKU: r.sku,
                Name: r.name,
                Qty: r.quantity,
                Reorder: r.reorder_level,
                Unit: r.unit,
                Location: r.location ?? ""
              }))
            })
          }
        />
        <div className="mt-3 overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-slate-500">
                <th className="px-3 py-2">Item</th>
                <th>Qty</th>
                <th>Status</th>
                <th>Location</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {filtered.map((row) => {
                const low = row.quantity <= row.reorder_level;
                const recentMoves = listConsumableMovements(tenantId, row.id).slice(0, 2);
                return (
                  <tr key={row.id} className="border-t border-line">
                    <td className="px-3 py-3">
                      <div className="font-semibold">{row.name}</div>
                      <div className="text-xs text-slate-500">
                        {row.sku} · {row.category ?? "General"}
                      </div>
                      {recentMoves.length ? (
                        <div className="mt-1 text-xs text-slate-400">
                          Last: {recentMoves[0]?.qty_delta > 0 ? "+" : ""}
                          {recentMoves[0]?.qty_delta} — {recentMoves[0]?.reason}
                        </div>
                      ) : null}
                    </td>
                    <td>
                      {row.quantity} {row.unit}
                    </td>
                    <td>
                      <StatusBadge status={low ? "low_stock" : "ok"} />
                    </td>
                    <td>{row.location ?? "—"}</td>
                    <td>
                      <div className="flex flex-wrap gap-1">
                        <Button type="button" variant="secondary" className="!px-2 !py-1 text-xs" onClick={() => setAdjustId(row.id)}>
                          Adjust qty
                        </Button>
                        <RecordRowActions
                          onEdit={() => {
                            setEditing(row);
                            setForm({
                              sku: row.sku,
                              name: row.name,
                              category: row.category ?? "",
                              quantity: String(row.quantity),
                              reorder_level: String(row.reorder_level),
                              unit: row.unit,
                              location: row.location ?? ""
                            });
                            setOpenForm(true);
                          }}
                          onTrash={() => undefined}
                        />
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Panel>
    </AppShell>
  );
}
