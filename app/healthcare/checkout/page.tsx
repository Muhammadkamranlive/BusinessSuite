"use client";

import { useEffect, useMemo, useState } from "react";
import { AppShell } from "@/components/app-shell";
import { ModuleBreadcrumbs } from "@/components/common/module-breadcrumbs";
import { PageHeader } from "@/components/common/page-header";
import { useConfirm } from "@/components/common/use-confirm";
import { ExtraFieldsBlock } from "@/components/forms/extra-fields-block";
import { Button, Field, Panel, SectionHeader, SelectInput, TextInput } from "@/components/ui";
import { getStoredTenantId } from "@/lib/auth/session";
import { money } from "@/lib/utils";
import { persistExtraFields } from "@/modules/forms/services/extra-fields.store";
import {
  createClinicOrder,
  listMarketplaceProducts,
  listProviders,
  markOrderPaid,
  type MarketplaceProduct
} from "@/modules/healthcare/services/pharmacy-marketplace.store";

export default function CheckoutPage() {
  const tenantId = getStoredTenantId() ?? "alpha";
  const { askSave, dialog } = useConfirm();
  const providers = useMemo(() => listProviders(tenantId).filter((p) => p.can_order), [tenantId]);
  const products = useMemo(() => listMarketplaceProducts(tenantId).filter((p) => p.status === "active"), [tenantId]);
  const [productId, setProductId] = useState("");
  const [providerId, setProviderId] = useState("");
  const [qty, setQty] = useState("1");
  const [patientName, setPatientName] = useState("");
  const [shipping, setShipping] = useState("");
  const [payMethod, setPayMethod] = useState("card_on_file");
  const [attestation, setAttestation] = useState(false);
  const [consent, setConsent] = useState(false);
  const [extraJson, setExtraJson] = useState("");
  const [error, setError] = useState("");
  const [receipt, setReceipt] = useState<{ orderNo: string; total: number } | null>(null);

  useEffect(() => {
    const pre = typeof window !== "undefined" ? new URLSearchParams(window.location.search).get("product") : null;
    if (pre && products.some((p) => p.id === pre)) setProductId(pre);
    else if (!productId && products[0]) setProductId(products[0].id);
    if (!providerId && providers[0]) setProviderId(providers[0].id);
  }, [products, providers, productId, providerId]);

  const product: MarketplaceProduct | undefined = products.find((p) => p.id === productId);
  const provider = providers.find((p) => p.id === providerId);
  const quantity = Math.max(1, Number(qty) || 1);
  const subtotal = product ? Math.round(product.unit_price * quantity * 100) / 100 : 0;
  const shippingFee = 12;
  const platformFee = Math.round(subtotal * 0.03 * 100) / 100;
  const tax = 0;
  const total = Math.round((subtotal + shippingFee + platformFee + tax) * 100) / 100;

  function doCheckout() {
    if (!product || !provider || !patientName.trim()) {
      setError("Provider, product, and patient are required.");
      return;
    }
    if (!attestation || !consent) {
      setError("Attestation and consent are required before payment.");
      return;
    }
    const order = createClinicOrder(tenantId, {
      provider_id: provider.id,
      provider_name: provider.full_name,
      clinic_name: provider.clinic_name,
      patient_name: patientName.trim(),
      pharmacy_id: product.pharmacy_id,
      pharmacy_name: product.pharmacy_name,
      shipping_address: shipping.trim() || null,
      attestation_signed: true,
      consent_acknowledged: true,
      shipping_fee: shippingFee,
      platform_fee: platformFee,
      tax_amount: tax,
      payment_status: "pending",
      status: "pending",
      lines: [
        {
          product_id: product.id,
          product_name: product.name,
          pharmacy_id: product.pharmacy_id,
          pharmacy_name: product.pharmacy_name,
          sku: product.sku,
          strength: product.strength,
          quantity,
          unit_price: product.unit_price,
          controlled: product.controlled
        }
      ]
    });
    markOrderPaid(order.id);
    persistExtraFields(tenantId, "healthcare.clinic_order", order.id, extraJson);
    setReceipt({ orderNo: order.order_no, total: order.total_amount });
    setError("");
  }

  return (
    <AppShell activeModule="healthcare">
      {dialog}
      <ModuleBreadcrumbs />
      <PageHeader
        title="Checkout"
        description="Order summary with pharmacy assignment, fee separation, and regulated payment capture."
      />
      {receipt ? (
        <Panel>
          <SectionHeader title="Payment received" eyebrow="Receipt" />
          <p className="mt-3 text-sm">
            Order <strong>{receipt.orderNo}</strong> paid via {payMethod.replace(/_/g, " ")}. Total {money(receipt.total)}.
          </p>
          <p className="mt-2 text-xs text-slate-500">
            Charges split into medication subtotal, shipping, platform fee, and tax when applicable.
          </p>
          <Button className="mt-4" href="/healthcare/clinic-orders">
            View clinic orders
          </Button>
        </Panel>
      ) : (
        <div className="grid gap-4 lg:grid-cols-5">
          <Panel className="lg:col-span-3">
            <form
              className="grid gap-3 md:grid-cols-2"
              onSubmit={(e) => {
                e.preventDefault();
                askSave({ editing: false, entityLabel: "checkout order", onConfirm: doCheckout });
              }}
            >
              {error ? <p className="md:col-span-2 text-sm text-rose-600">{error}</p> : null}
              <Field label="Approved provider">
                <SelectInput value={providerId} onChange={(e) => setProviderId(e.target.value)}>
                  {providers.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.full_name}
                    </option>
                  ))}
                </SelectInput>
              </Field>
              <Field label="Product">
                <SelectInput value={productId} onChange={(e) => setProductId(e.target.value)}>
                  {products.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name} · {p.pharmacy_name}
                    </option>
                  ))}
                </SelectInput>
              </Field>
              <Field label="Quantity">
                <TextInput type="number" min={1} value={qty} onChange={(e) => setQty(e.target.value)} />
              </Field>
              <Field label="Patient name">
                <TextInput required value={patientName} onChange={(e) => setPatientName(e.target.value)} />
              </Field>
              <Field label="Ship to" className="md:col-span-2">
                <TextInput value={shipping} onChange={(e) => setShipping(e.target.value)} placeholder="Clinic or patient ship-to" />
              </Field>
              <Field label="Payment method">
                <SelectInput value={payMethod} onChange={(e) => setPayMethod(e.target.value)}>
                  <option value="card_on_file">Saved card (if permitted)</option>
                  <option value="ach">ACH / bank transfer</option>
                  <option value="invoice">Invoice net terms</option>
                </SelectInput>
              </Field>
              <Field label="Acknowledgments" className="md:col-span-2">
                <div className="flex flex-col gap-2 text-sm">
                  <label className="flex items-center gap-2">
                    <input type="checkbox" checked={attestation} onChange={(e) => setAttestation(e.target.checked)} />
                    Prescriber attestation
                  </label>
                  <label className="flex items-center gap-2">
                    <input type="checkbox" checked={consent} onChange={(e) => setConsent(e.target.checked)} />
                    Consent / disclosures acknowledged
                  </label>
                </div>
              </Field>
              {product?.warning ? (
                <p className="md:col-span-2 rounded-[var(--bs-radius)] border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-900">
                  {product.warning}
                </p>
              ) : null}
              <div className="md:col-span-2">
                <ExtraFieldsBlock formKey="healthcare.clinic_order" valueJson={extraJson} onChange={setExtraJson} />
              </div>
              <div className="md:col-span-2">
                <Button type="submit">Pay {money(total)}</Button>
              </div>
            </form>
          </Panel>
          <Panel className="lg:col-span-2">
            <SectionHeader title="Order summary" eyebrow="Fee breakdown" />
            <dl className="mt-4 space-y-2 text-sm">
              <div className="flex justify-between gap-4">
                <dt>Medication</dt>
                <dd>{money(subtotal)}</dd>
              </div>
              <div className="flex justify-between gap-4">
                <dt>Shipping</dt>
                <dd>{money(shippingFee)}</dd>
              </div>
              <div className="flex justify-between gap-4">
                <dt>Platform fee</dt>
                <dd>{money(platformFee)}</dd>
              </div>
              <div className="flex justify-between gap-4">
                <dt>Tax</dt>
                <dd>{money(tax)}</dd>
              </div>
              <div className="flex justify-between gap-4 border-t border-line pt-2 font-semibold">
                <dt>Total</dt>
                <dd>{money(total)}</dd>
              </div>
            </dl>
            {product ? (
              <p className="mt-4 text-xs text-slate-500">
                Routed to <strong>{product.pharmacy_name}</strong> ({product.sku} · {product.strength}).
              </p>
            ) : null}
          </Panel>
        </div>
      )}
    </AppShell>
  );
}
