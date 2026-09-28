"use client";

import { useEffect, useMemo, useState } from "react";
import { PharmacyShell } from "@/components/pharmacy/pharmacy-shell";
import { DataListToolbar } from "@/components/common/data-list-toolbar";
import { useConfirm } from "@/components/common/use-confirm";
import { Button, Field, Panel, SelectInput, TextInput } from "@/components/ui";
import { getStoredTenantId } from "@/lib/auth/session";
import {
  createPharmacyBatch,
  listNearExpiryBatches,
  listPharmacyBatches,
  listPharmacyProducts,
  subscribePharmacy,
  type PharmacyBatch
} from "@/modules/pharmacy/services/pharmacy.store";

export default function PharmacyInventoryPage() {
  const tenantId = getStoredTenantId() ?? "alpha";
  const { askSave, dialog } = useConfirm();
  const [batches, setBatches] = useState<PharmacyBatch[]>([]);
  const [search, setSearch] = useState("");
  const [openForm, setOpenForm] = useState(false);
  const [form, setForm] = useState({
    product_id: "",
    batch_no: "",
    expiry_date: "",
    quantity: "0",
    location: "Shelf"
  });

  const products = useMemo(() => listPharmacyProducts(tenantId), [batches, tenantId]);
  const productName = useMemo(() => {
    const map = new Map(products.map((p) => [p.id, p.name]));
    return (id: string) => map.get(id) ?? "—";
  }, [products]);

  function refresh() {
    setBatches(listPharmacyBatches(tenantId));
  }

  useEffect(() => {
    refresh();
    return subscribePharmacy(refresh);
  }, [tenantId]);

  const near = listNearExpiryBatches(tenantId);
  const filtered = batches.filter((b) => {
    const q = search.trim().toLowerCase();
    if (!q) return true;
    return (
      b.batch_no.toLowerCase().includes(q) ||
      productName(b.product_id).toLowerCase().includes(q) ||
      b.location.toLowerCase().includes(q)
    );
  });

  function save() {
    askSave({
      editing: false,
      entityLabel: "batch",
      onConfirm: () => {
        if (!form.product_id || !form.batch_no || !form.expiry_date) return;
        createPharmacyBatch(tenantId, {
          product_id: form.product_id,
          batch_no: form.batch_no.trim(),
          expiry_date: form.expiry_date,
          quantity: Number(form.quantity) || 0,
          location: form.location.trim() || "Shelf"
        });
        setOpenForm(false);
        setForm({ product_id: "", batch_no: "", expiry_date: "", quantity: "0", location: "Shelf" });
        refresh();
      }
    });
  }

  return (
    <PharmacyShell
      title="Inventory & batches"
      description="Batch number, expiry, and quantity on hand. POS sells FEFO (earliest expiry first)."
      actionLabel="Add batch"
      onAction={() => setOpenForm(true)}
    >
      {dialog}
      {near.length ? (
        <div className="mb-4 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2.5 text-sm text-amber-900">
          <strong>{near.length}</strong> batch(es) expire within 90 days — check FEFO before selling.
        </div>
      ) : null}

      <DataListToolbar search={search} onSearchChange={setSearch} searchPlaceholder="Search batch or product…" />

      <div className="mt-4 overflow-x-auto rounded-xl border border-line bg-white">
        <table className="min-w-full text-left text-sm">
          <thead className="border-b border-line bg-[color:var(--bs-cloud)] text-xs uppercase tracking-wide text-slate-500">
            <tr>
              <th className="px-3 py-2.5">Product</th>
              <th className="px-3 py-2.5">Batch</th>
              <th className="px-3 py-2.5">Expiry</th>
              <th className="px-3 py-2.5">Qty</th>
              <th className="px-3 py-2.5">Location</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((row) => (
              <tr key={row.id} className="border-b border-line/70 last:border-0">
                <td className="px-3 py-2.5 font-semibold text-ink">{productName(row.product_id)}</td>
                <td className="px-3 py-2.5">{row.batch_no}</td>
                <td className="px-3 py-2.5">{row.expiry_date}</td>
                <td className="px-3 py-2.5">{row.quantity}</td>
                <td className="px-3 py-2.5 text-slate-600">{row.location}</td>
              </tr>
            ))}
            {!filtered.length ? (
              <tr>
                <td colSpan={5} className="px-3 py-10 text-center text-slate-500">
                  No batches yet — add stock against a product.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>

      {openForm ? (
        <Panel className="mt-4 border border-line bg-white p-4 sm:p-5">
          <p className="mb-3 text-sm font-bold text-ink">Receive batch</p>
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Product">
              <SelectInput
                value={form.product_id}
                onChange={(e) => setForm({ ...form, product_id: e.target.value })}
              >
                <option value="">Select…</option>
                {products.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.sku} — {p.name}
                  </option>
                ))}
              </SelectInput>
            </Field>
            <Field label="Batch no">
              <TextInput value={form.batch_no} onChange={(e) => setForm({ ...form, batch_no: e.target.value })} />
            </Field>
            <Field label="Expiry date">
              <TextInput
                type="date"
                value={form.expiry_date}
                onChange={(e) => setForm({ ...form, expiry_date: e.target.value })}
              />
            </Field>
            <Field label="Quantity">
              <TextInput
                type="number"
                value={form.quantity}
                onChange={(e) => setForm({ ...form, quantity: e.target.value })}
              />
            </Field>
            <Field label="Location">
              <TextInput value={form.location} onChange={(e) => setForm({ ...form, location: e.target.value })} />
            </Field>
          </div>
          <div className="mt-4 flex flex-col gap-2 sm:flex-row">
            <Button type="button" onClick={save} className="w-full sm:w-auto">
              Save batch
            </Button>
            <Button type="button" variant="secondary" className="w-full sm:w-auto" onClick={() => setOpenForm(false)}>
              Cancel
            </Button>
          </div>
        </Panel>
      ) : null}
    </PharmacyShell>
  );
}
