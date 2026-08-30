"use client";

import { getStoredTenantId } from "@/lib/auth/session";
import { money } from "@/lib/utils";
import { emptyDocumentLine, lineAmount, linesSubtotal, type DocumentLine } from "@/modules/ops/document-line";
import { priceForProduct } from "@/modules/sales/services/sales.store";
import { Button, Field, SelectInput, TextInput } from "@/components/ui";

type ProductOption = {
  id: string;
  sku: string;
  name: string;
  sale_price: number;
  purchase_price: number;
};

export function DocumentLinesEditor({
  lines,
  onChange,
  products,
  priceField = "sale_price",
  tenantId
}: {
  lines: DocumentLine[];
  onChange: (lines: DocumentLine[]) => void;
  products: ProductOption[];
  priceField?: "sale_price" | "purchase_price";
  tenantId?: string;
}) {
  function update(index: number, patch: Partial<DocumentLine>) {
    onChange(lines.map((line, i) => (i === index ? { ...line, ...patch } : line)));
  }

  function pickProduct(index: number, productId: string) {
    const product = products.find((p) => p.id === productId);
    if (!product) {
      update(index, { product_id: null, sku: null });
      return;
    }
    update(index, {
      product_id: product.id,
      sku: product.sku,
      description: product.name,
      unit_price:
        tenantId && priceField === "sale_price"
          ? priceForProduct(tenantId, product.id, lines[index]?.quantity ?? 1, product.sale_price)
          : priceField === "purchase_price"
            ? product.purchase_price
            : product.sale_price
    });
  }

  return (
    <div className="md:col-span-full space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-sm font-semibold text-ink">Line items</p>
        <Button type="button" variant="secondary" onClick={() => onChange([...lines, emptyDocumentLine()])}>
          Add line
        </Button>
      </div>
      {lines.length === 0 ? <p className="text-sm text-slate-500">Add products or a free-text line.</p> : null}
      {lines.map((line, index) => (
        <div key={index} className="grid gap-2 rounded-[var(--bs-radius)] border border-line bg-cloud p-3 md:grid-cols-12">
          <Field label="Product" className="md:col-span-4">
            <SelectInput value={line.product_id ?? ""} onChange={(e) => pickProduct(index, e.target.value)}>
              <option value="">Custom / none</option>
              {products.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.sku} — {p.name}
                </option>
              ))}
            </SelectInput>
          </Field>
          <Field label="Description" className="md:col-span-4">
            <TextInput value={line.description} onChange={(e) => update(index, { description: e.target.value })} required />
          </Field>
          <Field label="Qty" className="md:col-span-1">
            <TextInput
              type="number"
              min={0.01}
              step="0.01"
              value={line.quantity}
              onChange={(e) => {
                const quantity = Number(e.target.value);
                const product = products.find((p) => p.id === line.product_id);
                const unit_price =
                  tenantId && priceField === "sale_price" && line.product_id
                    ? priceForProduct(tenantId, line.product_id, quantity, product?.sale_price ?? line.unit_price)
                    : line.unit_price;
                update(index, { quantity, unit_price });
              }}
            />
          </Field>
          <Field label="Price" className="md:col-span-2">
            <TextInput type="number" min={0} step="0.01" value={line.unit_price} onChange={(e) => update(index, { unit_price: Number(e.target.value) })} />
          </Field>
          <div className="flex items-end justify-between gap-2 md:col-span-1">
            <p className="text-sm font-semibold">{money(lineAmount(line))}</p>
            <button type="button" className="text-xs font-semibold text-rose-600" onClick={() => onChange(lines.filter((_, i) => i !== index))}>
              Remove
            </button>
          </div>
        </div>
      ))}
      <p className="text-right text-sm font-bold text-ink">Subtotal {money(linesSubtotal(lines))}</p>
    </div>
  );
}
