import type { TenantEntity, UUID } from "@/modules/core/types";
import { generateDocumentNumber } from "@/modules/core/services/numbering.service";
import { logCreate } from "@/modules/core/services/audit.service";
import { bindTrashRestore, trashEntityInCollection, updateEntityInCollection } from "@/modules/core/services/entity-crud";
import { loadPersisted, savePersisted } from "@/modules/core/services/local-persist";
import { linesSubtotal, normalizeLines, type DocumentLine } from "@/modules/ops/document-line";
import { listTaxes, postLedgerPair } from "@/modules/finance/services/finance.store";
import { getProductStock, listProducts, listWarehouses, postStockMovement } from "@/modules/inventory/services/inventory.store";
import { getCustomerPriceGroup, listCustomers, updateDeal } from "@/modules/crm/services/crm.store";
import { queueOpsRemoteSync, registerOpsModule } from "@/modules/ops/services/ops-remote";
import { notifyInvoiceGenerated, notifyOrderApproved } from "@/lib/email/triggers";
import { getSystemSettings } from "@/modules/admin/services/admin.store";

function now() { return new Date().toISOString(); }
function today() { return now().slice(0, 10); }
function id() { return crypto.randomUUID(); }

const STORAGE_KEY = "businesssuite:sales:v3";
const STORAGE_VERSION = 3;

export interface Invoice extends TenantEntity {
  invoice_no: string;
  customer_name: string;
  customer_id?: UUID | null;
  invoice_date: string;
  due_date: string;
  status: "draft" | "sent" | "partially_paid" | "paid" | "overdue" | "cancelled";
  subtotal: number;
  tax_amount: number;
  total_amount: number;
  paid_amount: number;
  balance_due: number;
  lines?: DocumentLine[];
  sales_order_id?: UUID | null;
}

export interface Quotation extends TenantEntity {
  quotation_no: string;
  customer_name: string;
  customer_id?: UUID | null;
  quotation_date: string;
  valid_until: string;
  status: "draft" | "sent" | "pending_approval" | "accepted" | "rejected" | "expired";
  total_amount: number;
  lines?: DocumentLine[];
  lead_id?: UUID | null;
  deal_id?: UUID | null;
  revision?: number;
  parent_quotation_id?: UUID | null;
  currency?: string;
  approved_by?: string | null;
  approved_at?: string | null;
}

export interface PaymentReceived extends TenantEntity {
  payment_no: string;
  customer_name: string;
  invoice_id: UUID;
  payment_date: string;
  amount: number;
  payment_method: string;
}

export interface SalesOrder extends TenantEntity {
  order_no: string;
  customer_name: string;
  customer_id?: UUID | null;
  order_date: string;
  status: "draft" | "confirmed" | "fulfilled" | "cancelled";
  total_amount: number;
  lines?: DocumentLine[];
  quotation_id?: UUID | null;
  warehouse_id?: UUID | null;
  credit_hold?: boolean;
  shipping_address?: string | null;
}

export interface SalesReturn extends TenantEntity {
  return_no: string;
  customer_name: string;
  invoice_no: string;
  return_date: string;
  status: "draft" | "received" | "credited";
  total_amount: number;
  reason: string;
  lines?: DocumentLine[];
  warehouse_id?: UUID | null;
}

type SalesSnapshot = {
  version: number;
  invoices: Invoice[];
  quotations: Quotation[];
  payments: PaymentReceived[];
  salesOrders: SalesOrder[];
  salesReturns: SalesReturn[];
  deliveryNotes?: DeliveryNote[];
  creditNotes?: CreditNote[];
  salespeople?: Salesperson[];
  priceLists?: PriceList[];
  priceListItems?: PriceListItem[];
  discountSchemes?: DiscountScheme[];
};

export interface DeliveryNote extends TenantEntity {
  delivery_no: string;
  sales_order_id?: UUID | null;
  customer_name: string;
  delivery_date: string;
  status: "draft" | "dispatched" | "delivered";
  warehouse_id?: UUID | null;
  transporter?: string | null;
  tracking_no?: string | null;
  pod_notes?: string | null;
  lines?: DocumentLine[];
}

export interface CreditNote extends TenantEntity {
  credit_note_no: string;
  customer_name: string;
  invoice_no?: string | null;
  invoice_id?: UUID | null;
  note_date: string;
  amount: number;
  reason: string;
  status: "open" | "applied";
}

export interface Salesperson extends TenantEntity {
  name: string;
  email?: string | null;
  territory?: string | null;
  team?: string | null;
  commission_pct: number;
  status: "active" | "inactive";
}

export interface PriceList extends TenantEntity {
  name: string;
  currency: string;
  valid_from?: string | null;
  valid_until?: string | null;
  is_default: boolean;
  price_group?: string | null;
}

export interface PriceListItem extends TenantEntity {
  price_list_id: UUID;
  product_id?: UUID | null;
  min_qty: number;
  unit_price: number;
}

export interface DiscountScheme extends TenantEntity {
  name: string;
  kind: "item" | "customer" | "volume" | "promo";
  percent: number;
  min_qty: number;
  valid_from?: string | null;
  valid_until?: string | null;
}

let invoices: Invoice[] = [];
let quotations: Quotation[] = [];
let payments: PaymentReceived[] = [];
let salesOrders: SalesOrder[] = [];
let salesReturns: SalesReturn[] = [];
let deliveryNotes: DeliveryNote[] = [];
let creditNotes: CreditNote[] = [];
let salespeople: Salesperson[] = [];
let priceLists: PriceList[] = [];
let priceListItems: PriceListItem[] = [];
let discountSchemes: DiscountScheme[] = [];

let hydrated = false;

function persist() {
  savePersisted(STORAGE_KEY, {
    version: STORAGE_VERSION,
    invoices,
    quotations,
    payments,
    salesOrders,
    salesReturns,
    deliveryNotes,
    creditNotes,
    salespeople,
    priceLists,
    priceListItems,
    discountSchemes
  } satisfies SalesSnapshot);
  queueOpsRemoteSync();
}

function ensureHydrated() {
  if (hydrated) return;
  hydrated = true;
  const snap = loadPersisted<SalesSnapshot>(STORAGE_KEY);
  if (snap?.version === STORAGE_VERSION && Array.isArray(snap.invoices)) {
    invoices = snap.invoices;
    quotations = snap.quotations ?? quotations;
    payments = snap.payments ?? payments;
    salesOrders = snap.salesOrders ?? salesOrders;
    salesReturns = snap.salesReturns ?? [];
    deliveryNotes = snap.deliveryNotes ?? [];
    creditNotes = snap.creditNotes ?? [];
    salespeople = snap.salespeople ?? [];
    priceLists = snap.priceLists ?? [];
    priceListItems = snap.priceListItems ?? [];
    discountSchemes = snap.discountSchemes ?? [];
  }
}

function defaultWarehouse(tenantId: UUID) {
  return listWarehouses(tenantId)[0]?.id ?? null;
}

export function listInvoices(tenantId: UUID) {
  ensureHydrated();
  return invoices.filter((i) => i.tenant_id === tenantId && i.is_active !== false);
}

export function listQuotations(tenantId: UUID) {
  expireQuotations(tenantId);
  ensureHydrated();
  return quotations.filter((q) => q.tenant_id === tenantId && q.is_active !== false);
}

export function listPayments(tenantId: UUID) {
  ensureHydrated();
  return payments.filter((p) => p.tenant_id === tenantId && p.is_active !== false);
}

export function getInvoice(invoiceId: UUID) {
  ensureHydrated();
  return invoices.find((i) => i.id === invoiceId);
}

export function createInvoice(tenantId: UUID, data: Omit<Invoice, "id" | "tenant_id" | "invoice_no" | "created_at" | "updated_at">) {
  ensureHydrated();
  if (data.sales_order_id) {
    const order = salesOrders.find((o) => o.id === data.sales_order_id);
    if (order?.credit_hold) throw new Error("Cannot invoice a sales order on credit hold.");
  }
  const priced = applyListPrices(tenantId, normalizeLines(data.lines), data.customer_name);
  const subtotal = priced.length ? linesSubtotal(priced) : data.subtotal;
  const tax_amount = data.tax_amount || taxForLines(tenantId, priced);
  const total_amount = subtotal + tax_amount;
  const credit = checkCredit(tenantId, data.customer_name, total_amount);
  if (credit.hold) throw new Error(`Credit hold: AR ${credit.ar} + invoice ${total_amount} exceeds limit ${credit.limit}.`);
  const invoice: Invoice = {
    ...data,
    lines: priced,
    subtotal,
    tax_amount,
    total_amount,
    paid_amount: data.paid_amount || 0,
    balance_due: total_amount - (data.paid_amount || 0),
    id: id(),
    tenant_id: tenantId,
    invoice_no: generateDocumentNumber(tenantId, "invoice"),
    created_at: now(),
    updated_at: now(),
    is_active: true
  };
  invoices.unshift(invoice);
  persist();
  postLedgerPair(tenantId, invoice.invoice_date, `Invoice ${invoice.invoice_no}`, "Accounts Receivable", "Sales Revenue", invoice.total_amount, "invoice", invoice.id);
  logCreate({ tenantId, module: "sales", entityName: "invoice", entityId: invoice.id, newData: invoice as unknown as Record<string, unknown> });
  const customer =
    (invoice.customer_id && listCustomers(tenantId).find((c) => c.id === invoice.customer_id)) ||
    listCustomers(tenantId).find((c) => c.name === invoice.customer_name);
  if (customer?.email) {
    notifyInvoiceGenerated({
      to: customer.email,
      tenantId,
      companyName: getSystemSettings().companyName || "BusinessSuite",
      customerName: invoice.customer_name,
      invoiceNo: invoice.invoice_no,
      invoiceDate: invoice.invoice_date,
      dueDate: invoice.due_date,
      totalAmount: invoice.total_amount
    });
  }
  return invoice;
}

export function createQuotation(tenantId: UUID, data: Omit<Quotation, "id" | "tenant_id" | "quotation_no" | "created_at" | "updated_at">) {
  ensureHydrated();
  const lines = applyListPrices(tenantId, normalizeLines(data.lines), data.customer_name);
  const quotation: Quotation = {
    ...data,
    lines,
    total_amount: lines.length ? linesSubtotal(lines) : data.total_amount,
    id: id(),
    tenant_id: tenantId,
    quotation_no: generateDocumentNumber(tenantId, "quotation"),
    created_at: now(),
    updated_at: now(),
    is_active: true
  };
  quotations.unshift(quotation);
  persist();
  logCreate({ tenantId, module: "sales", entityName: "quotation", entityId: quotation.id, newData: quotation as unknown as Record<string, unknown> });
  return quotation;
}

export function recordPayment(tenantId: UUID, invoiceId: UUID, amount: number, method: string, customerName: string, paymentDate?: string) {
  ensureHydrated();
  const invoice = getInvoice(invoiceId);
  if (!invoice) return null;
  if (amount > invoice.balance_due + 0.01) throw new Error("Receipt cannot exceed invoice balance. Allocate the remainder to another invoice.");
  const payment: PaymentReceived = {
    id: id(),
    tenant_id: tenantId,
    payment_no: generateDocumentNumber(tenantId, "payment"),
    customer_name: customerName,
    invoice_id: invoiceId,
    payment_date: paymentDate || today(),
    amount,
    payment_method: method,
    created_at: now(),
    updated_at: now(),
    is_active: true
  };
  payments.unshift(payment);
  invoice.paid_amount += amount;
  invoice.balance_due = Math.max(0, invoice.total_amount - invoice.paid_amount);
  invoice.status = invoice.balance_due <= 0 ? "paid" : "partially_paid";
  invoice.updated_at = now();
  persist();
  postLedgerPair(tenantId, payment.payment_date, `Receipt ${payment.payment_no}`, "Cash", "Accounts Receivable", amount, "payment", payment.id);
  logCreate({ tenantId, module: "sales", entityName: "payment", entityId: payment.id, newData: payment as unknown as Record<string, unknown> });
  return payment;
}

export function listSalesOrders(tenantId: UUID) {
  ensureHydrated();
  return salesOrders.filter((o) => o.tenant_id === tenantId && o.is_active !== false);
}

export function customerOpenAr(tenantId: UUID, customerName: string) {
  ensureHydrated();
  return invoices
    .filter((i) => i.tenant_id === tenantId && i.is_active !== false && i.customer_name === customerName)
    .reduce((s, i) => s + (i.balance_due > 0 ? i.balance_due : 0), 0);
}

export function checkCredit(tenantId: UUID, customerName: string, additional = 0) {
  const customer = listCustomers(tenantId).find((c) => c.name === customerName);
  const limit = Number(customer?.credit_limit) || 0;
  const ar = customerOpenAr(tenantId, customerName);
  if (limit <= 0) return { ok: true, hold: false, limit, ar };
  const hold = ar + additional > limit;
  return { ok: !hold, hold, limit, ar };
}

export function agingBuckets(tenantId: UUID) {
  ensureHydrated();
  const todayDate = new Date(today());
  const buckets = { current: 0, d30: 0, d60: 0, d90: 0, older: 0 };
  for (const inv of invoices.filter((i) => i.tenant_id === tenantId && i.is_active !== false && i.balance_due > 0)) {
    const due = new Date(inv.due_date);
    const days = Math.floor((todayDate.getTime() - due.getTime()) / 86400000);
    if (days <= 0) buckets.current += inv.balance_due;
    else if (days <= 30) buckets.d30 += inv.balance_due;
    else if (days <= 60) buckets.d60 += inv.balance_due;
    else if (days <= 90) buckets.d90 += inv.balance_due;
    else buckets.older += inv.balance_due;
  }
  return buckets;
}

export function createSalesOrder(tenantId: UUID, data: Omit<SalesOrder, "id" | "tenant_id" | "order_no" | "created_at" | "updated_at">) {
  ensureHydrated();
  const lines = applyListPrices(tenantId, normalizeLines(data.lines), data.customer_name);
  const total = lines.length ? linesSubtotal(lines) : data.total_amount;
  const credit = checkCredit(tenantId, data.customer_name, total);
  const customer = listCustomers(tenantId).find((c) => c.name === data.customer_name);
  const order: SalesOrder = {
    ...data,
    lines,
    total_amount: total,
    customer_id: data.customer_id ?? customer?.id ?? null,
    credit_hold: credit.hold,
    status: credit.hold ? "draft" : data.status,
    id: id(),
    tenant_id: tenantId,
    order_no: generateDocumentNumber(tenantId, "sales_order"),
    created_at: now(),
    updated_at: now(),
    is_active: true
  };
  salesOrders.unshift(order);
  persist();
  if (order.status === "confirmed" && !order.credit_hold) {
    const customer =
      (order.customer_id && listCustomers(tenantId).find((c) => c.id === order.customer_id)) ||
      listCustomers(tenantId).find((c) => c.name === order.customer_name);
    if (customer?.email) {
      notifyOrderApproved({
        to: customer.email,
        tenantId,
        companyName: getSystemSettings().companyName || "BusinessSuite",
        customerName: order.customer_name,
        orderNo: order.order_no,
        totalAmount: order.total_amount
      });
    }
  }
  return order;
}

export function convertQuotationToOrder(tenantId: UUID, quotationId: UUID) {
  ensureHydrated();
  const quote = quotations.find((q) => q.id === quotationId && q.tenant_id === tenantId);
  if (!quote) return null;
  expireQuotations(tenantId);
  if (quote.status === "expired" || (quote.valid_until && quote.valid_until < today())) {
    throw new Error("Cannot convert an expired quotation.");
  }
  const order = createSalesOrder(tenantId, {
    customer_name: quote.customer_name,
    order_date: today(),
    status: "confirmed",
    total_amount: quote.total_amount,
    lines: quote.lines ?? [],
    quotation_id: quote.id
  });
  quote.status = "accepted";
  quote.updated_at = now();
  persist();
  return order;
}

export function fulfillSalesOrder(tenantId: UUID, orderId: UUID, warehouseId?: UUID | null) {
  ensureHydrated();
  const order = salesOrders.find((o) => o.id === orderId && o.tenant_id === tenantId);
  if (!order || order.status === "fulfilled" || order.status === "cancelled") return null;
  if (order.credit_hold) throw new Error("Cannot fulfill a sales order on credit hold.");
  const whId = warehouseId || order.warehouse_id || defaultWarehouse(tenantId);
  for (const line of order.lines ?? []) {
    if (!line.product_id || !whId) continue;
    const available = getProductStock(line.product_id, tenantId);
    if (available < line.quantity) return null;
  }
  for (const line of order.lines ?? []) {
    if (!line.product_id || !whId) continue;
    postStockMovement(tenantId, {
      product_id: line.product_id,
      warehouse_id: whId,
      movement_type: "sale",
      quantity: -Math.abs(line.quantity),
      unit_cost: line.unit_price,
      movement_date: today(),
      notes: `SO ${order.order_no}`,
      reference_type: "sales_order",
      reference_id: order.id
    });
    const product = listProducts(tenantId).find((p) => p.id === line.product_id);
    const cost = (product?.purchase_price ?? line.unit_price) * Math.abs(line.quantity);
    postLedgerPair(tenantId, today(), `COGS ${order.order_no}`, "Cost of Goods Sold", "Inventory", cost, "sales_order", order.id);
  }
  order.status = "fulfilled";
  order.updated_at = now();
  persist();
  return order;
}

export function invoiceFromSalesOrder(tenantId: UUID, orderId: UUID) {
  ensureHydrated();
  const order = salesOrders.find((o) => o.id === orderId && o.tenant_id === tenantId);
  if (!order) return null;
  if (order.credit_hold) throw new Error("Cannot invoice a sales order on credit hold.");
  const customer = listCustomers(tenantId).find((c) => c.name === order.customer_name);
  const termsDays = Number(String(customer?.credit_terms ?? "").replace(/\D/g, "")) || 0;
  const due = new Date(`${today()}T00:00:00`);
  due.setDate(due.getDate() + termsDays);
  return createInvoice(tenantId, {
    customer_name: order.customer_name,
    customer_id: order.customer_id ?? customer?.id ?? null,
    invoice_date: today(),
    due_date: isoDate(due),
    status: "sent",
    subtotal: order.total_amount,
    tax_amount: 0,
    total_amount: order.total_amount,
    paid_amount: 0,
    balance_due: order.total_amount,
    lines: order.lines ?? [],
    sales_order_id: order.id
  });
}

function isoDate(d: Date) {
  return d.toISOString().slice(0, 10);
}

export function listSalesReturns(tenantId: UUID) {
  ensureHydrated();
  return salesReturns.filter((r) => r.tenant_id === tenantId && r.is_active !== false);
}

export function createSalesReturn(tenantId: UUID, data: Omit<SalesReturn, "id" | "tenant_id" | "return_no" | "created_at" | "updated_at">) {
  ensureHydrated();
  const lines = normalizeLines(data.lines);
  const row: SalesReturn = {
    ...data,
    lines,
    total_amount: lines.length ? linesSubtotal(lines) : data.total_amount,
    id: id(),
    tenant_id: tenantId,
    return_no: generateDocumentNumber(tenantId, "sales_return"),
    created_at: now(),
    updated_at: now(),
    is_active: true
  };
  salesReturns.unshift(row);
  if (row.status === "received" || row.status === "credited") {
    restockReturn(tenantId, row);
  }
  if (row.status === "credited") {
    createCreditNote(tenantId, {
      customer_name: row.customer_name,
      invoice_no: row.invoice_no,
      invoice_id: invoices.find((i) => i.invoice_no === row.invoice_no)?.id ?? null,
      note_date: row.return_date,
      amount: row.total_amount,
      reason: `RMA ${row.return_no}`,
      status: "applied"
    });
  }
  persist();
  return row;
}

function restockReturn(tenantId: UUID, row: SalesReturn) {
  const whId = row.warehouse_id || defaultWarehouse(tenantId);
  for (const line of row.lines ?? []) {
    if (!line.product_id || !whId) continue;
    postStockMovement(tenantId, {
      product_id: line.product_id,
      warehouse_id: whId,
      movement_type: "adjustment",
      quantity: Math.abs(line.quantity),
      unit_cost: line.unit_price,
      movement_date: row.return_date,
      notes: `Return ${row.return_no}`,
      reference_type: "sales_return",
      reference_id: row.id
    });
  }
}

const invoiceRef = {
  get: () => invoices,
  set: (rows: Invoice[]) => {
    invoices = rows;
  },
  persist,
  module: "sales",
  entityName: "invoice",
  labelOf: (row: Invoice) => `${row.invoice_no} · ${row.customer_name}`
};
const quotationRef = {
  get: () => quotations,
  set: (rows: Quotation[]) => {
    quotations = rows;
  },
  persist,
  module: "sales",
  entityName: "quotation",
  labelOf: (row: Quotation) => `${row.quotation_no} · ${row.customer_name}`
};
const paymentRef = {
  get: () => payments,
  set: (rows: PaymentReceived[]) => {
    payments = rows;
  },
  persist,
  module: "sales",
  entityName: "payment",
  labelOf: (row: PaymentReceived) => `${row.payment_no} · ${row.customer_name}`
};
const salesOrderRef = {
  get: () => salesOrders,
  set: (rows: SalesOrder[]) => {
    salesOrders = rows;
  },
  persist,
  module: "sales",
  entityName: "sales_order",
  labelOf: (row: SalesOrder) => `${row.order_no} · ${row.customer_name}`
};
const salesReturnRef = {
  get: () => salesReturns,
  set: (rows: SalesReturn[]) => {
    salesReturns = rows;
  },
  persist,
  module: "sales",
  entityName: "sales_return",
  labelOf: (row: SalesReturn) => `${row.return_no} · ${row.customer_name}`
};

bindTrashRestore(invoiceRef);
bindTrashRestore(quotationRef);
bindTrashRestore(paymentRef);
bindTrashRestore(salesOrderRef);
bindTrashRestore(salesReturnRef);

export function updateInvoice(id: UUID, data: Partial<Invoice>) {
  ensureHydrated();
  return updateEntityInCollection(invoiceRef, id, data);
}
export function trashInvoice(id: UUID) {
  ensureHydrated();
  return trashEntityInCollection(invoiceRef, id);
}
export function updateQuotation(id: UUID, data: Partial<Quotation>) {
  ensureHydrated();
  return updateEntityInCollection(quotationRef, id, data);
}
export function trashQuotation(id: UUID) {
  ensureHydrated();
  return trashEntityInCollection(quotationRef, id);
}
export function updatePayment(id: UUID, data: Partial<PaymentReceived>) {
  ensureHydrated();
  return updateEntityInCollection(paymentRef, id, data);
}
export function trashPayment(id: UUID) {
  ensureHydrated();
  return trashEntityInCollection(paymentRef, id);
}
export function updateSalesOrder(id: UUID, data: Partial<SalesOrder>) {
  ensureHydrated();
  const existing = salesOrders.find((o) => o.id === id);
  if (!existing) return null;
  const nextName = data.customer_name ?? existing.customer_name;
  const nextTotal = data.total_amount ?? existing.total_amount;
  const credit = checkCredit(existing.tenant_id, nextName, nextTotal);
  const updated = updateEntityInCollection(salesOrderRef, id, {
    ...data,
    credit_hold: credit.hold,
    status: credit.hold ? "draft" : data.status ?? existing.status
  });
  if (
    updated &&
    existing.status !== "confirmed" &&
    updated.status === "confirmed" &&
    !updated.credit_hold
  ) {
    const customer =
      (updated.customer_id && listCustomers(updated.tenant_id).find((c) => c.id === updated.customer_id)) ||
      listCustomers(updated.tenant_id).find((c) => c.name === updated.customer_name);
    if (customer?.email) {
      notifyOrderApproved({
        to: customer.email,
        tenantId: updated.tenant_id,
        companyName: getSystemSettings().companyName || "BusinessSuite",
        customerName: updated.customer_name,
        orderNo: updated.order_no,
        totalAmount: updated.total_amount
      });
    }
  }
  return updated;
}
export function trashSalesOrder(id: UUID) {
  ensureHydrated();
  return trashEntityInCollection(salesOrderRef, id);
}
export function updateSalesReturn(id: UUID, data: Partial<SalesReturn>) {
  ensureHydrated();
  return updateEntityInCollection(salesReturnRef, id, data);
}
export function trashSalesReturn(id: UUID) {
  ensureHydrated();
  return trashEntityInCollection(salesReturnRef, id);
}

export function approveQuotation(id: UUID, approvedBy: string) {
  ensureHydrated();
  const q = quotations.find((row) => row.id === id);
  if (!q) return null;
  expireQuotations(q.tenant_id);
  if (q.status === "expired" || (q.valid_until && q.valid_until < today())) {
    throw new Error("Cannot approve an expired quotation.");
  }
  q.status = "accepted";
  q.approved_by = approvedBy;
  q.approved_at = now();
  q.updated_at = now();
  persist();
  return q;
}

export function convertDealToQuotation(
  tenantId: UUID,
  deal: { id: UUID; title: string; amount: number; customer_id?: UUID | null },
  customerName: string
) {
  const quote = createQuotation(tenantId, {
    customer_name: customerName,
    customer_id: deal.customer_id ?? null,
    quotation_date: today(),
    valid_until: today(),
    status: "draft",
    total_amount: deal.amount,
    lines: [{ product_id: null, sku: null, description: deal.title, quantity: 1, unit_price: deal.amount }],
    deal_id: deal.id,
    revision: 1
  });
  updateDeal(deal.id, { quotation_id: quote.id });
  return quote;
}

export function listDeliveryNotes(tenantId: UUID) {
  ensureHydrated();
  return deliveryNotes.filter((d) => d.tenant_id === tenantId && d.is_active !== false);
}

export function createDeliveryNote(tenantId: UUID, data: Omit<DeliveryNote, "id" | "tenant_id" | "delivery_no" | "created_at" | "updated_at">) {
  ensureHydrated();
  const row: DeliveryNote = {
    ...data,
    lines: normalizeLines(data.lines),
    id: id(),
    tenant_id: tenantId,
    delivery_no: generateDocumentNumber(tenantId, "delivery"),
    created_at: now(),
    updated_at: now(),
    is_active: true
  };
  deliveryNotes.unshift(row);
  persist();
  return row;
}

export function listCreditNotes(tenantId: UUID) {
  ensureHydrated();
  return creditNotes.filter((c) => c.tenant_id === tenantId && c.is_active !== false);
}

export function createCreditNote(tenantId: UUID, data: Omit<CreditNote, "id" | "tenant_id" | "credit_note_no" | "created_at" | "updated_at">) {
  ensureHydrated();
  const invoice =
    (data.invoice_id ? invoices.find((i) => i.id === data.invoice_id) : null) ||
    (data.invoice_no ? invoices.find((i) => i.invoice_no === data.invoice_no && i.tenant_id === tenantId) : null);
  const row: CreditNote = {
    ...data,
    invoice_id: data.invoice_id ?? invoice?.id ?? null,
    invoice_no: data.invoice_no ?? invoice?.invoice_no ?? null,
    id: id(),
    tenant_id: tenantId,
    credit_note_no: generateDocumentNumber(tenantId, "credit_note"),
    created_at: now(),
    updated_at: now(),
    is_active: true
  };
  creditNotes.unshift(row);
  if (row.status === "applied" && invoice) applyCreditToInvoice(invoice, row.amount);
  persist();
  postLedgerPair(tenantId, row.note_date, `Credit note ${row.credit_note_no}`, "Sales Revenue", "Accounts Receivable", row.amount, "credit_note", row.id);
  return row;
}

function applyCreditToInvoice(invoice: Invoice, amount: number) {
  invoice.balance_due = Math.max(0, invoice.balance_due - amount);
  invoice.paid_amount = Math.min(invoice.total_amount, invoice.paid_amount + amount);
  invoice.status = invoice.balance_due <= 0 ? "paid" : "partially_paid";
  invoice.updated_at = now();
}

export function applyCreditNote(id: UUID) {
  ensureHydrated();
  const note = creditNotes.find((c) => c.id === id);
  if (!note || note.status === "applied") return note ?? null;
  const invoice =
    (note.invoice_id ? invoices.find((i) => i.id === note.invoice_id) : null) ||
    invoices.find((i) => i.invoice_no === note.invoice_no && i.tenant_id === note.tenant_id);
  if (!invoice) throw new Error("Link a customer invoice before applying this credit note.");
  applyCreditToInvoice(invoice, note.amount);
  note.status = "applied";
  note.invoice_id = invoice.id;
  note.invoice_no = invoice.invoice_no;
  note.updated_at = now();
  persist();
  return note;
}

export function listSalespeople(tenantId: UUID) {
  ensureHydrated();
  return salespeople.filter((s) => s.tenant_id === tenantId && s.is_active !== false);
}

export function createSalesperson(tenantId: UUID, data: Omit<Salesperson, "id" | "tenant_id" | "created_at" | "updated_at">) {
  ensureHydrated();
  const row: Salesperson = { ...data, id: id(), tenant_id: tenantId, created_at: now(), updated_at: now(), is_active: true };
  salespeople.unshift(row);
  persist();
  return row;
}

export function listPriceLists(tenantId: UUID) {
  ensureHydrated();
  return priceLists.filter((p) => p.tenant_id === tenantId && p.is_active !== false);
}

export function createPriceList(tenantId: UUID, data: Omit<PriceList, "id" | "tenant_id" | "created_at" | "updated_at">) {
  ensureHydrated();
  const row: PriceList = { ...data, id: id(), tenant_id: tenantId, created_at: now(), updated_at: now(), is_active: true };
  priceLists.unshift(row);
  persist();
  return row;
}

export function listPriceListItems(tenantId: UUID, priceListId?: UUID) {
  ensureHydrated();
  return priceListItems.filter((p) => p.tenant_id === tenantId && p.is_active !== false && (!priceListId || p.price_list_id === priceListId));
}

export function createPriceListItem(tenantId: UUID, data: Omit<PriceListItem, "id" | "tenant_id" | "created_at" | "updated_at">) {
  ensureHydrated();
  const row: PriceListItem = { ...data, id: id(), tenant_id: tenantId, created_at: now(), updated_at: now(), is_active: true };
  priceListItems.unshift(row);
  persist();
  return row;
}

export function priceForProduct(tenantId: UUID, productId: UUID, qty = 1, fallback = 0, customerName?: string) {
  ensureHydrated();
  const asOf = today();
  const priceGroup = getCustomerPriceGroup(tenantId, customerName);
  const valid = (p: PriceList) =>
    p.tenant_id === tenantId &&
    p.is_active !== false &&
    (!p.valid_from || p.valid_from <= asOf) &&
    (!p.valid_until || p.valid_until >= asOf);
  const grouped = priceGroup ? priceLists.find((p) => valid(p) && p.price_group === priceGroup) : null;
  const list = grouped ?? priceLists.find((p) => valid(p) && p.is_default) ?? priceLists.find(valid);
  if (!list) return fallback;
  const matches = priceListItems
    .filter((i) => i.price_list_id === list.id && i.product_id === productId && i.min_qty <= qty && i.is_active !== false)
    .sort((a, b) => b.min_qty - a.min_qty);
  return matches[0]?.unit_price ?? fallback;
}

export function applyListPrices(tenantId: UUID, lines: DocumentLine[], customerName?: string): DocumentLine[] {
  const products = listProducts(tenantId);
  return lines.map((line) => {
    if (!line.product_id) return line;
    const product = products.find((p) => p.id === line.product_id);
    const unit_price = priceForProduct(tenantId, line.product_id, line.quantity, product?.sale_price ?? line.unit_price, customerName);
    return { ...line, unit_price };
  });
}

export function taxForLines(tenantId: UUID, lines: DocumentLine[]) {
  const products = listProducts(tenantId);
  const fallbackRate = listTaxes(tenantId).find((t) => t.status === "active")?.rate ?? 0;
  return lines.reduce((sum, line) => {
    const product = line.product_id ? products.find((p) => p.id === line.product_id) : null;
    const rate = product?.tax_rate || fallbackRate;
    return sum + line.quantity * line.unit_price * (rate / 100);
  }, 0);
}

export function expireQuotations(tenantId: UUID) {
  ensureHydrated();
  const asOf = today();
  for (const q of quotations.filter((row) => row.tenant_id === tenantId && row.is_active !== false)) {
    if (q.valid_until && q.valid_until < asOf && q.status !== "accepted" && q.status !== "rejected") {
      q.status = "expired";
    }
  }
  persist();
}

export function listDiscountSchemes(tenantId: UUID) {
  ensureHydrated();
  return discountSchemes.filter((d) => d.tenant_id === tenantId && d.is_active !== false);
}

export function createDiscountScheme(tenantId: UUID, data: Omit<DiscountScheme, "id" | "tenant_id" | "created_at" | "updated_at">) {
  ensureHydrated();
  const row: DiscountScheme = { ...data, id: id(), tenant_id: tenantId, created_at: now(), updated_at: now(), is_active: true };
  discountSchemes.unshift(row);
  persist();
  return row;
}

const deliveryRef = { get: () => deliveryNotes, set: (rows: DeliveryNote[]) => { deliveryNotes = rows; }, persist, module: "sales", entityName: "delivery_note", labelOf: (row: DeliveryNote) => `${row.delivery_no} · ${row.customer_name}` };
const creditNoteRef = { get: () => creditNotes, set: (rows: CreditNote[]) => { creditNotes = rows; }, persist, module: "sales", entityName: "credit_note", labelOf: (row: CreditNote) => `${row.credit_note_no} · ${row.customer_name}` };
const salespersonRef = { get: () => salespeople, set: (rows: Salesperson[]) => { salespeople = rows; }, persist, module: "sales", entityName: "salesperson", labelOf: (row: Salesperson) => row.name };
const priceListRef = { get: () => priceLists, set: (rows: PriceList[]) => { priceLists = rows; }, persist, module: "sales", entityName: "price_list", labelOf: (row: PriceList) => row.name };

bindTrashRestore(deliveryRef);
bindTrashRestore(creditNoteRef);
bindTrashRestore(salespersonRef);
bindTrashRestore(priceListRef);

export function updateDeliveryNote(id: UUID, data: Partial<DeliveryNote>) { ensureHydrated(); return updateEntityInCollection(deliveryRef, id, data); }
export function trashDeliveryNote(id: UUID) { ensureHydrated(); return trashEntityInCollection(deliveryRef, id); }
export function updateCreditNote(id: UUID, data: Partial<CreditNote>) { ensureHydrated(); return updateEntityInCollection(creditNoteRef, id, data); }
export function trashCreditNote(id: UUID) { ensureHydrated(); return trashEntityInCollection(creditNoteRef, id); }
export function updateSalesperson(id: UUID, data: Partial<Salesperson>) { ensureHydrated(); return updateEntityInCollection(salespersonRef, id, data); }
export function trashSalesperson(id: UUID) { ensureHydrated(); return trashEntityInCollection(salespersonRef, id); }
export function updatePriceList(id: UUID, data: Partial<PriceList>) { ensureHydrated(); return updateEntityInCollection(priceListRef, id, data); }
export function trashPriceList(id: UUID) { ensureHydrated(); return trashEntityInCollection(priceListRef, id); }

registerOpsModule({
  build: () => ({
    invoices: invoices as unknown as Record<string, unknown>[],
    quotations: quotations as unknown as Record<string, unknown>[],
    payments: payments as unknown as Record<string, unknown>[],
    salesOrders: salesOrders as unknown as Record<string, unknown>[],
    salesReturns: salesReturns as unknown as Record<string, unknown>[],
    deliveryNotes: deliveryNotes as unknown as Record<string, unknown>[],
    creditNotes: creditNotes as unknown as Record<string, unknown>[],
    salespeople: salespeople as unknown as Record<string, unknown>[],
    priceLists: priceLists as unknown as Record<string, unknown>[],
    priceListItems: priceListItems as unknown as Record<string, unknown>[],
    discountSchemes: discountSchemes as unknown as Record<string, unknown>[]
  }),
  apply: (snapshot) => {
    if (snapshot.invoices) invoices = snapshot.invoices as unknown as Invoice[];
    if (snapshot.quotations) quotations = snapshot.quotations as unknown as Quotation[];
    if (snapshot.payments) payments = snapshot.payments as unknown as PaymentReceived[];
    if (snapshot.salesOrders) salesOrders = snapshot.salesOrders as unknown as SalesOrder[];
    if (snapshot.salesReturns) salesReturns = snapshot.salesReturns as unknown as SalesReturn[];
    if (snapshot.deliveryNotes) deliveryNotes = snapshot.deliveryNotes as unknown as DeliveryNote[];
    if (snapshot.creditNotes) creditNotes = snapshot.creditNotes as unknown as CreditNote[];
    if (snapshot.salespeople) salespeople = snapshot.salespeople as unknown as Salesperson[];
    if (snapshot.priceLists) priceLists = snapshot.priceLists as unknown as PriceList[];
    if (snapshot.priceListItems) priceListItems = snapshot.priceListItems as unknown as PriceListItem[];
    if (snapshot.discountSchemes) discountSchemes = snapshot.discountSchemes as unknown as DiscountScheme[];
    savePersisted(STORAGE_KEY, {
      version: STORAGE_VERSION,
      invoices,
      quotations,
      payments,
      salesOrders,
      salesReturns,
      deliveryNotes,
      creditNotes,
      salespeople,
      priceLists,
      priceListItems,
      discountSchemes
    });
  }
});
