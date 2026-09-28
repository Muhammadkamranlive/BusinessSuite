"use client";

import { useEffect, useMemo, useRef, useState, type KeyboardEvent } from "react";
import { PharmacyShell } from "@/components/pharmacy/pharmacy-shell";
import { useConfirm } from "@/components/common/use-confirm";
import { Button, Field, Panel, SelectInput, TextInput } from "@/components/ui";
import { getSessionProfile } from "@/lib/auth/session-profile";
import { getStoredTenantId } from "@/lib/auth/session";
import {
  formatMoneyAmount,
  formatNationalIdDisplay,
  formatPhoneDisplay,
  isPhoneComplete,
  normalizeNationalIdDigits,
  normalizePhoneDigits,
  validateNationalIdOptional,
  validatePhoneOptional
} from "@/lib/locale/contact-formats";
import { resolveTenantCountry, resolveTenantContactFormat } from "@/lib/locale/resolve-tenant-country";
import { getSystemSettings } from "@/modules/admin/services/admin.store";
import { printPharmacyReceipt } from "@/modules/pharmacy/services/pharmacy-receipt";
import {
  completePharmacySale,
  findCustomerByPhone,
  findProductByBarcodeOrSku,
  listPharmacyProducts,
  pickFefoBatch,
  stockOnHand,
  subscribePharmacy,
  upsertCustomerFromPos,
  type PharmacyProduct
} from "@/modules/pharmacy/services/pharmacy.store";

type CartLine = {
  product_id: string;
  batch_id: string;
  sku: string;
  name: string;
  batch_no: string;
  qty: number;
  unit_price: number;
};

/** Keyboard POS flow — Tab/Enter advances in this order (scan stays for continuous add). */
const POS_FLOW = [
  "pos-scan",
  "pos-phone",
  "pos-name",
  "pos-id",
  "pos-discount",
  "pos-tender",
  "pos-paid",
  "pos-complete"
] as const;

type PosFieldId = (typeof POS_FLOW)[number];

function focusField(id: PosFieldId | string) {
  const el = document.getElementById(id) as HTMLElement | null;
  if (!el) return;
  el.focus();
  if (el instanceof HTMLInputElement || el instanceof HTMLSelectElement) {
    if ("select" in el && typeof el.select === "function" && el.tagName === "INPUT") {
      try {
        (el as HTMLInputElement).select();
      } catch {
        /* ignore */
      }
    }
  }
}

function advanceFrom(current: PosFieldId) {
  const i = POS_FLOW.indexOf(current);
  if (i < 0 || i >= POS_FLOW.length - 1) return;
  focusField(POS_FLOW[i + 1]!);
}

export default function PharmacyPosPage() {
  const tenantId = getStoredTenantId() ?? "alpha";
  const profile = getSessionProfile();
  const { askSave, dialog } = useConfirm();
  const country = resolveTenantCountry(tenantId);
  const contact = resolveTenantContactFormat(tenantId);
  const currency = getSystemSettings().currency || contact.currencyCode;

  const scanRef = useRef<HTMLInputElement>(null);
  const [query, setQuery] = useState("");
  const [cart, setCart] = useState<CartLine[]>([]);
  const [customerPhone, setCustomerPhone] = useState("");
  const [customerName, setCustomerName] = useState("");
  const [customerId, setCustomerId] = useState("");
  const [discount, setDiscount] = useState("0");
  const [tender, setTender] = useState<"cash" | "card" | "mixed">("cash");
  const [amountPaid, setAmountPaid] = useState("");
  const [error, setError] = useState("");
  const [fieldHint, setFieldHint] = useState("");
  const [lastSaleNo, setLastSaleNo] = useState("");
  const [, setTick] = useState(0);

  const products = useMemo(() => listPharmacyProducts(tenantId), [tenantId, cart, lastSaleNo]);
  const money = (n: number) => formatMoneyAmount(n, country, currency);

  useEffect(() => subscribePharmacy(() => setTick((n) => n + 1)), []);

  const subtotal = cart.reduce((n, l) => n + l.unit_price * l.qty, 0);
  const discountN = Math.max(0, Math.min(Number(discount) || 0, subtotal));
  const total = subtotal - discountN;

  useEffect(() => {
    setAmountPaid(String(total));
  }, [total]);

  useEffect(() => {
    scanRef.current?.focus();
  }, []);

  function lookupCustomer(phoneRaw: string) {
    const normalized = normalizePhoneDigits(country, phoneRaw);
    if (!normalized) return;
    const found = findCustomerByPhone(tenantId, normalized);
    if (!found) return;
    if (found.name && found.name !== "Walk-in" && found.name !== "Customer") {
      setCustomerName(found.name);
    }
    if (found.national_id) {
      setCustomerId(formatNationalIdDisplay(country, found.national_id));
    }
  }

  function onPhoneChange(value: string) {
    const display = formatPhoneDisplay(country, value);
    setCustomerPhone(display);
    setFieldHint("");
    if (isPhoneComplete(country, display)) {
      lookupCustomer(display);
    }
  }

  function onIdChange(value: string) {
    setCustomerId(formatNationalIdDisplay(country, value));
    setFieldHint("");
  }

  function addProduct(product: PharmacyProduct, qty = 1) {
    setError("");
    const picks = pickFefoBatch(tenantId, product.id, qty);
    if (!picks) {
      setError(`Not enough stock for ${product.name} (on hand: ${stockOnHand(tenantId, product.id)})`);
      return;
    }
    setCart((prev) => {
      const next = [...prev];
      for (const pick of picks) {
        const existing = next.find((l) => l.batch_id === pick.batch.id);
        if (existing) {
          existing.qty += pick.qty;
        } else {
          next.push({
            product_id: product.id,
            batch_id: pick.batch.id,
            sku: product.sku,
            name: product.name,
            batch_no: pick.batch.batch_no,
            qty: pick.qty,
            unit_price: product.sale_price
          });
        }
      }
      return [...next];
    });
    setQuery("");
    requestAnimationFrame(() => focusField("pos-scan"));
  }

  function onScan() {
    const product = findProductByBarcodeOrSku(tenantId, query);
    if (!product) {
      setError("No product matched that barcode / SKU / name");
      return;
    }
    addProduct(product, 1);
  }

  function setQty(batchId: string, qty: number) {
    if (qty <= 0) {
      setCart((c) => c.filter((l) => l.batch_id !== batchId));
      return;
    }
    setCart((c) => c.map((l) => (l.batch_id === batchId ? { ...l, qty } : l)));
  }

  function clearCheckoutCustomer() {
    setCustomerPhone("");
    setCustomerName("");
    setCustomerId("");
  }

  function validateCheckoutFields(): boolean {
    const phoneErr = validatePhoneOptional(country, customerPhone);
    if (phoneErr) {
      setFieldHint(phoneErr);
      focusField("pos-phone");
      return false;
    }
    const idErr = validateNationalIdOptional(country, customerId);
    if (idErr) {
      setFieldHint(idErr);
      focusField("pos-id");
      return false;
    }
    setFieldHint("");
    return true;
  }

  function checkout() {
    setError("");
    if (!cart.length) return;
    if (!validateCheckoutFields()) return;

    askSave({
      editing: false,
      entityLabel: "sale",
      onConfirm: () => {
        try {
          const phone = normalizePhoneDigits(country, customerPhone);
          const name = customerName.trim();
          const national_id = normalizeNationalIdDigits(country, customerId);
          const customer = upsertCustomerFromPos(tenantId, {
            name,
            phone,
            national_id
          });
          const sale = completePharmacySale(tenantId, {
            customer_id: customer?.id ?? null,
            customer_name: customer?.name || name || "Walk-in",
            customer_phone: phone || customer?.phone || "",
            customer_national_id: national_id || customer?.national_id || "",
            lines: cart.map((l) => ({
              product_id: l.product_id,
              batch_id: l.batch_id,
              qty: l.qty
            })),
            discount: discountN,
            tender,
            amount_paid: Number(amountPaid) || total,
            cashier: profile.name || profile.email
          });
          setLastSaleNo(sale.sale_no);
          printPharmacyReceipt({ tenantId, sale });
          setCart([]);
          setDiscount("0");
          setAmountPaid("");
          clearCheckoutCustomer();
          requestAnimationFrame(() => focusField("pos-scan"));
        } catch (e) {
          setError(e instanceof Error ? e.message : "Sale failed");
        }
      }
    });
  }

  /** Enter advances; scan field Enter adds item and stays. */
  function onFlowKeyDown(field: PosFieldId, e: KeyboardEvent<HTMLElement>) {
    if (e.key !== "Enter") return;
    e.preventDefault();

    if (field === "pos-scan") {
      if (query.trim()) onScan();
      else if (cart.length) advanceFrom("pos-scan");
      return;
    }

    if (field === "pos-phone") {
      const err = validatePhoneOptional(country, customerPhone);
      if (err) {
        setFieldHint(err);
        return;
      }
      if (customerPhone.trim()) lookupCustomer(customerPhone);
      advanceFrom(field);
      return;
    }

    if (field === "pos-id") {
      const err = validateNationalIdOptional(country, customerId);
      if (err) {
        setFieldHint(err);
        return;
      }
      advanceFrom(field);
      return;
    }

    if (field === "pos-paid" || field === "pos-complete") {
      checkout();
      return;
    }

    advanceFrom(field);
  }

  function onDigitsOnlyKeyDown(e: KeyboardEvent<HTMLInputElement>) {
    // Allow control / navigation keys; block letters and symbols except shortcuts
    if (e.ctrlKey || e.metaKey || e.altKey) return;
    const allow = [
      "Backspace",
      "Delete",
      "Tab",
      "Enter",
      "Escape",
      "ArrowLeft",
      "ArrowRight",
      "ArrowUp",
      "ArrowDown",
      "Home",
      "End"
    ];
    if (allow.includes(e.key)) return;
    if (/^\d$/.test(e.key)) return;
    e.preventDefault();
  }

  return (
    <PharmacyShell
      title="Point of sale"
      description="Keyboard counter — Tab / Enter through fields. Phone & ID follow company country settings."
    >
      {dialog}
      <div className="mb-3 flex flex-wrap items-center gap-x-3 gap-y-1 rounded-lg border border-line bg-[color:var(--bs-cloud)] px-3 py-2 text-xs text-slate-600">
        <span>
          Locale: <strong className="text-ink">{contact.country}</strong>
        </span>
        <span className="hidden sm:inline">·</span>
        <span>
          <kbd className="rounded border border-line bg-white px-1.5 py-0.5 font-mono text-[11px]">Enter</kbd> add
          item / next field
        </span>
        <span className="hidden sm:inline">·</span>
        <span>
          <kbd className="rounded border border-line bg-white px-1.5 py-0.5 font-mono text-[11px]">Tab</kbd> next
        </span>
        <span className="hidden sm:inline">·</span>
        <span>Empty scan + Enter → checkout fields</span>
      </div>

      <div className="grid gap-4 lg:grid-cols-[1.2fr_0.9fr]">
        <Panel className="border border-line bg-white p-3 sm:p-4">
          <label className="block">
            <span className="mb-1.5 block text-sm font-semibold text-ink">Scan barcode or search medicine</span>
            <div className="flex flex-col gap-2 sm:flex-row">
              <TextInput
                ref={scanRef}
                id="pos-scan"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={(e) => onFlowKeyDown("pos-scan", e)}
                placeholder="Barcode, SKU, or name — Enter to add"
                className="min-h-12 text-base"
                autoFocus
                autoComplete="off"
              />
              <Button type="button" tabIndex={-1} className="min-h-12 w-full sm:w-auto" onClick={onScan}>
                Add
              </Button>
            </div>
          </label>

          <div className="mt-3 grid max-h-48 grid-cols-1 gap-2 overflow-y-auto sm:grid-cols-2">
            {products.slice(0, 8).map((p) => (
              <button
                key={p.id}
                type="button"
                tabIndex={-1}
                onClick={() => addProduct(p, 1)}
                className="rounded-lg border border-line px-3 py-2.5 text-left transition hover:border-teal hover:bg-teal/5"
              >
                <p className="text-sm font-semibold text-ink">{p.name}</p>
                <p className="text-xs text-slate-500">
                  {money(p.sale_price)} · stock {stockOnHand(tenantId, p.id)}
                </p>
              </button>
            ))}
          </div>

          <div className="mt-4 overflow-x-auto rounded-lg border border-line">
            <table className="min-w-full text-left text-sm">
              <thead className="bg-[color:var(--bs-cloud)] text-xs uppercase tracking-wide text-slate-500">
                <tr>
                  <th className="px-3 py-2">Item</th>
                  <th className="px-3 py-2">Batch</th>
                  <th className="px-3 py-2">Qty</th>
                  <th className="px-3 py-2">Amount</th>
                </tr>
              </thead>
              <tbody>
                {cart.map((line) => (
                  <tr key={line.batch_id} className="border-t border-line/70">
                    <td className="px-3 py-2">
                      <p className="font-semibold text-ink">{line.name}</p>
                      <p className="text-xs text-slate-500">{line.sku}</p>
                    </td>
                    <td className="px-3 py-2 text-slate-600">{line.batch_no}</td>
                    <td className="px-3 py-2">
                      <TextInput
                        type="number"
                        className="h-9 w-20"
                        value={String(line.qty)}
                        tabIndex={-1}
                        onChange={(e) => setQty(line.batch_id, Number(e.target.value) || 0)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") {
                            e.preventDefault();
                            focusField("pos-phone");
                          }
                        }}
                      />
                    </td>
                    <td className="px-3 py-2 font-semibold">{money(line.unit_price * line.qty)}</td>
                  </tr>
                ))}
                {!cart.length ? (
                  <tr>
                    <td colSpan={4} className="px-3 py-8 text-center text-slate-500">
                      Cart empty — scan / type SKU and press Enter.
                    </td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </div>
        </Panel>

        <Panel className="border border-line bg-white p-3 sm:p-4">
          <p className="mb-1 text-sm font-semibold text-ink">Checkout (keyboard sequence)</p>
          <p className="mb-3 text-xs text-slate-500">
            Phone → Name → {contact.nationalId.label} → Discount → Tender → Paid → Complete
          </p>

          <div className="grid gap-3">
            <Field label={`${contact.phone.label} (primary)`} hint={contact.phone.hint}>
              <TextInput
                id="pos-phone"
                value={customerPhone}
                onChange={(e) => onPhoneChange(e.target.value)}
                onKeyDown={(e) => {
                  onDigitsOnlyKeyDown(e);
                  onFlowKeyDown("pos-phone", e);
                }}
                onBlur={() => {
                  if (customerPhone.trim()) lookupCustomer(customerPhone);
                }}
                placeholder={contact.phone.placeholder}
                inputMode="numeric"
                autoComplete="tel"
                enterKeyHint="next"
              />
            </Field>
            <Field label="Customer name (optional)">
              <TextInput
                id="pos-name"
                value={customerName}
                onChange={(e) => setCustomerName(e.target.value)}
                onKeyDown={(e) => onFlowKeyDown("pos-name", e)}
                placeholder="Patient / buyer name"
                autoComplete="name"
                enterKeyHint="next"
              />
            </Field>
            <Field label={`${contact.nationalId.label} (optional)`} hint={contact.nationalId.hint}>
              <TextInput
                id="pos-id"
                value={customerId}
                onChange={(e) => onIdChange(e.target.value)}
                onKeyDown={(e) => {
                  onDigitsOnlyKeyDown(e);
                  onFlowKeyDown("pos-id", e);
                }}
                placeholder={contact.nationalId.placeholder}
                inputMode="numeric"
                enterKeyHint="next"
              />
            </Field>
          </div>

          <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
            <Field label={`Discount (${currency})`}>
              <TextInput
                id="pos-discount"
                value={discount}
                onChange={(e) => setDiscount(e.target.value.replace(/[^\d.]/g, ""))}
                onKeyDown={(e) => onFlowKeyDown("pos-discount", e)}
                inputMode="decimal"
                enterKeyHint="next"
              />
            </Field>
            <Field label="Tender">
              <SelectInput
                id="pos-tender"
                value={tender}
                onChange={(e) => setTender(e.target.value as "cash" | "card" | "mixed")}
                onKeyDown={(e) => onFlowKeyDown("pos-tender", e)}
              >
                <option value="cash">Cash</option>
                <option value="card">Card</option>
                <option value="mixed">Mixed</option>
              </SelectInput>
            </Field>
          </div>
          <Field label={`Amount paid (${currency})`} className="mt-3">
            <TextInput
              id="pos-paid"
              value={amountPaid}
              onChange={(e) => setAmountPaid(e.target.value.replace(/[^\d.]/g, ""))}
              onKeyDown={(e) => onFlowKeyDown("pos-paid", e)}
              inputMode="decimal"
              enterKeyHint="done"
            />
          </Field>

          <div className="mt-4 space-y-1 rounded-xl border border-line bg-[color:var(--bs-cloud)] p-3 text-sm">
            <div className="flex justify-between">
              <span className="text-slate-500">Subtotal</span>
              <span className="font-semibold text-ink">{money(subtotal)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Discount</span>
              <span className="font-semibold text-ink">{money(discountN)}</span>
            </div>
            <div className="flex justify-between border-t border-line pt-2 text-base">
              <span className="font-bold text-ink">Total</span>
              <span className="font-bold text-ink">{money(total)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Change</span>
              <span className="font-semibold text-ink">
                {money(Math.max(0, (Number(amountPaid) || 0) - total))}
              </span>
            </div>
          </div>

          {fieldHint ? <p className="mt-3 text-sm font-semibold text-amber-700">{fieldHint}</p> : null}
          {error ? <p className="mt-3 text-sm font-semibold text-[color:var(--bs-coral)]">{error}</p> : null}
          {lastSaleNo ? (
            <p className="mt-3 text-sm font-semibold text-teal">Sale completed — {lastSaleNo} (receipt printed)</p>
          ) : null}

          <Button
            type="button"
            id="pos-complete"
            className="mt-4 min-h-12 w-full text-base"
            disabled={!cart.length}
            onClick={checkout}
            onKeyDown={(e) => onFlowKeyDown("pos-complete", e)}
          >
            Complete sale & print
          </Button>
          <Button
            type="button"
            variant="secondary"
            tabIndex={-1}
            className="mt-2 min-h-11 w-full"
            disabled={!cart.length}
            onClick={() => {
              setCart([]);
              focusField("pos-scan");
            }}
          >
            Clear cart
          </Button>
        </Panel>
      </div>
    </PharmacyShell>
  );
}
