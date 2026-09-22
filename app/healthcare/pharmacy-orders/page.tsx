"use client";

import { useEffect, useMemo, useState } from "react";
import { AppShell } from "@/components/app-shell";
import { ModuleBreadcrumbs } from "@/components/common/module-breadcrumbs";
import { PageHeader } from "@/components/common/page-header";
import { StatusBadge } from "@/components/common/status-badge";
import { DataListToolbar } from "@/components/common/data-list-toolbar";
import { useConfirm } from "@/components/common/use-confirm";
import { ExtraFieldsBlock } from "@/components/forms/extra-fields-block";
import { Button, Field, Panel, TextInput } from "@/components/ui";
import { getStoredTenantId } from "@/lib/auth/session";
import { exportListCsv } from "@/lib/list-export";
import { filterAndSort } from "@/lib/list-query";
import { money } from "@/lib/utils";
import { persistExtraFields } from "@/modules/forms/services/extra-fields.store";
import {
  createPharmacyPo,
  listPharmacyPos,
  pullHmsClinicalFromSupabase,
  receivePharmacyPo,
  subscribeHmsClinical,
  type HmsPharmacyPurchaseOrder
} from "@/modules/healthcare/services/hms-clinical.store";

const emptyItem = { drug_name: "", quantity: "0", unit_cost: "0" };

export default function HmsPharmacyOrdersPage() {
  const tenantId = getStoredTenantId() ?? "alpha";
  const { askSave, dialog } = useConfirm();
  const [rows, setRows] = useState<HmsPharmacyPurchaseOrder[]>([]);
  const [search, setSearch] = useState("");
  const [openForm, setOpenForm] = useState(false);
  const [form, setForm] = useState({ supplier_name: "", notes: "", items: [{ ...emptyItem }] });
  const [extraJson, setExtraJson] = useState("");

  function refresh() {
    setRows(listPharmacyPos(tenantId));
  }
  useEffect(() => {
    void pullHmsClinicalFromSupabase(tenantId).finally(() => refresh());
    return subscribeHmsClinical(() => refresh());
  }, [tenantId]);

  const filtered = useMemo(
    () =>
      filterAndSort(rows as unknown as Array<Record<string, unknown>>, {
        search,
        searchFields: ["po_no", "supplier_name", "status"],
        sortField: "created_at",
        sortDir: "desc"
      }) as unknown as HmsPharmacyPurchaseOrder[],
    [rows, search]
  );

  function doCreate() {
    if (!form.supplier_name.trim()) return;
    const items = form.items
      .filter((i) => i.drug_name.trim())
      .map((i) => ({
        drug_name: i.drug_name.trim(),
        quantity: Number(i.quantity) || 0,
        unit_cost: Number(i.unit_cost) || 0
      }));
    if (!items.length) return;
    const row = createPharmacyPo(tenantId, {
      supplier_name: form.supplier_name.trim(),
      notes: form.notes || null,
      items,
      actor: "pharmacist"
    });
    persistExtraFields(tenantId, "healthcare.hms.pharmacy_po", row.id, extraJson);
    setOpenForm(false);
    refresh();
  }

  return (
    <AppShell activeModule="healthcare">
      {dialog}
      <ModuleBreadcrumbs />
      <PageHeader
        title="Pharmacy purchase orders"
        description="Hospital pharmacy POs — receive into stock when goods arrive."
        actionLabel="New PO"
        onAction={() => {
          setForm({ supplier_name: "", notes: "", items: [{ ...emptyItem }] });
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
              askSave({ editing: false, entityLabel: "pharmacy PO", onConfirm: doCreate });
            }}
          >
            <Field label="Supplier">
              <TextInput required value={form.supplier_name} onChange={(e) => setForm({ ...form, supplier_name: e.target.value })} />
            </Field>
            <Field label="Notes">
              <TextInput value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
            </Field>
            <div className="md:col-span-2 space-y-2">
              <p className="text-sm font-semibold">Line items</p>
              {form.items.map((item, idx) => (
                <div key={idx} className="grid gap-2 md:grid-cols-3">
                  <TextInput placeholder="Drug" value={item.drug_name} onChange={(e) => {
                    const items = [...form.items];
                    items[idx] = { ...items[idx], drug_name: e.target.value };
                    setForm({ ...form, items });
                  }} />
                  <TextInput type="number" placeholder="Qty" value={item.quantity} onChange={(e) => {
                    const items = [...form.items];
                    items[idx] = { ...items[idx], quantity: e.target.value };
                    setForm({ ...form, items });
                  }} />
                  <TextInput type="number" step="0.01" placeholder="Unit cost" value={item.unit_cost} onChange={(e) => {
                    const items = [...form.items];
                    items[idx] = { ...items[idx], unit_cost: e.target.value };
                    setForm({ ...form, items });
                  }} />
                </div>
              ))}
              <Button type="button" variant="ghost" onClick={() => setForm({ ...form, items: [...form.items, { ...emptyItem }] })}>
                Add line
              </Button>
            </div>
            <div className="md:col-span-2">
              <ExtraFieldsBlock formKey="healthcare.hms.pharmacy_po" valueJson={extraJson} onChange={setExtraJson} />
            </div>
            <div className="md:col-span-2 flex gap-2">
              <Button type="submit">Create PO</Button>
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
              filename: "hms-pharmacy-pos",
              rows: filtered.map((r) => ({
                PO: r.po_no,
                Supplier: r.supplier_name,
                Status: r.status,
                Items: r.items?.length ?? 0
              }))
            })
          }
        />
        <div className="mt-3 overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-slate-500">
                <th className="px-3 py-2">PO</th>
                <th>Supplier</th>
                <th>Items</th>
                <th>Status</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {filtered.map((row) => (
                <tr key={row.id} className="border-t border-line">
                  <td className="px-3 py-3 font-semibold">{row.po_no}</td>
                  <td>{row.supplier_name}</td>
                  <td className="text-xs">
                    {(row.items ?? []).map((i) => (
                      <div key={i.id}>
                        {i.drug_name} × {i.quantity} @ {money(i.unit_cost)}
                      </div>
                    ))}
                  </td>
                  <td>
                    <StatusBadge status={row.status} />
                  </td>
                  <td>
                    {row.status !== "received" && row.status !== "cancelled" ? (
                      <Button
                        type="button"
                        variant="secondary"
                        className="!px-2 !py-1 text-xs"
                        onClick={() =>
                          askSave({
                            editing: true,
                            entityLabel: "PO receipt",
                            onConfirm: () => {
                              receivePharmacyPo(tenantId, row.id, "pharmacist");
                              refresh();
                            }
                          })
                        }
                      >
                        Receive
                      </Button>
                    ) : null}
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
