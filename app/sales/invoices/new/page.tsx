"use client";

import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { AppShell } from "@/components/app-shell";
import { ModuleBreadcrumbs } from "@/components/common/module-breadcrumbs";
import { PageHeader } from "@/components/common/page-header";
import { useConfirm } from "@/components/common/use-confirm";
import { ExtraFieldsBlock } from "@/components/forms/extra-fields-block";
import { Button, Field, Panel, SelectInput, TextInput } from "@/components/ui";
import { DocumentLinesEditor } from "@/components/ops/document-lines-editor";
import { getStoredTenantId } from "@/lib/auth/session";
import { persistExtraFields } from "@/modules/forms/services/extra-fields.store";
import { money } from "@/lib/utils";
import { listCustomers } from "@/modules/crm/services/crm.store";
import { listProducts } from "@/modules/inventory/services/inventory.store";
import { emptyDocumentLine, linesSubtotal, type DocumentLine } from "@/modules/ops/document-line";
import { createInvoice } from "@/modules/sales/services/sales.store";

export default function NewInvoicePage() {
  const router = useRouter();
  const tenantId = getStoredTenantId() ?? "alpha";
  const { askSave, dialog } = useConfirm();
  const customers = useMemo(() => listCustomers(tenantId), [tenantId]);
  const products = useMemo(() => listProducts(tenantId), [tenantId]);
  const [error, setError] = useState("");
  const [form, setForm] = useState({
    customer_name: "",
    invoice_date: new Date().toISOString().slice(0, 10),
    due_date: new Date(Date.now() + 7 * 86400000).toISOString().slice(0, 10),
    tax_amount: 0,
    status: "draft" as const
  });
  const [lines, setLines] = useState<DocumentLine[]>([emptyDocumentLine()]);
  const [extraJson, setExtraJson] = useState("");
  const subtotal = linesSubtotal(lines);
  const total = subtotal + Number(form.tax_amount || 0);

  function doSave() {
    setError("");
    if (!form.customer_name.trim()) {
      setError("Customer is required.");
      return;
    }
    const invoice = createInvoice(tenantId, {
      customer_name: form.customer_name.trim(),
      customer_id: customers.find((c) => c.name === form.customer_name)?.id ?? null,
      invoice_date: form.invoice_date,
      due_date: form.due_date,
      status: "draft",
      subtotal,
      tax_amount: Number(form.tax_amount) || 0,
      total_amount: total,
      paid_amount: 0,
      balance_due: total,
      lines
    });
    persistExtraFields(tenantId, "sales.invoice", invoice.id, extraJson);
    setExtraJson("");
    router.push("/sales/invoices");
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    askSave({
      editing: false,
      entityLabel: "invoice",
      onConfirm: doSave
    });
  }

  return (
    <AppShell activeModule="sales">
      <PageHeader title="New Invoice" description="Header + line items. Totals calculate from lines." />
      <ModuleBreadcrumbs trail={[{ label: "Invoices", href: "/sales/invoices" }, { label: "New" }]} />
      <Panel>
        <form onSubmit={handleSubmit} className="grid gap-4 md:grid-cols-2">
          {error ? <p className="md:col-span-2 text-sm text-rose-600">{error}</p> : null}
          <Field label="Customer">
            <SelectInput value={form.customer_name} onChange={(e) => setForm({ ...form, customer_name: e.target.value })}>
              <option value="">Select…</option>
              {customers.map((c) => (
                <option key={c.id} value={c.name}>
                  {c.name}
                </option>
              ))}
            </SelectInput>
          </Field>
          <Field label="Or type name">
            <TextInput value={form.customer_name} onChange={(e) => setForm({ ...form, customer_name: e.target.value })} required />
          </Field>
          <Field label="Invoice date">
            <TextInput type="date" value={form.invoice_date} onChange={(e) => setForm({ ...form, invoice_date: e.target.value })} />
          </Field>
          <Field label="Due date">
            <TextInput type="date" value={form.due_date} onChange={(e) => setForm({ ...form, due_date: e.target.value })} />
          </Field>
          <DocumentLinesEditor lines={lines} onChange={setLines} products={products} tenantId={tenantId} />
          <Field label="Tax amount">
            <TextInput type="number" min={0} value={form.tax_amount} onChange={(e) => setForm({ ...form, tax_amount: Number(e.target.value) })} />
          </Field>
          <p className="self-end text-sm font-bold">Total {money(total)}</p>
          <ExtraFieldsBlock formKey="sales.invoice" valueJson={extraJson} onChange={setExtraJson} />
          <div className="md:col-span-2 flex gap-2">
            <Button type="submit">Save Invoice</Button>
            <Button
              type="button"
              variant="secondary"
              onClick={() => {
                setExtraJson("");
                router.back();
              }}
            >
              Cancel
            </Button>
          </div>
        </form>
      </Panel>
      {dialog}
    </AppShell>
  );
}
