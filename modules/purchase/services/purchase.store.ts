import type { TenantEntity, UUID } from "@/modules/core/types";
import { generateDocumentNumber } from "@/modules/core/services/numbering.service";
import { logCreate } from "@/modules/core/services/audit.service";
import { bindTrashRestore, trashEntityInCollection, updateEntityInCollection } from "@/modules/core/services/entity-crud";
import { loadPersisted, savePersisted } from "@/modules/core/services/local-persist";
import { linesSubtotal, normalizeLines, type DocumentLine } from "@/modules/ops/document-line";
import { getProductStock, listLowStock, listProducts, listWarehouses, postStockMovement } from "@/modules/inventory/services/inventory.store";
import { postLedgerPair } from "@/modules/finance/services/finance.store";
import { queueOpsRemoteSync, registerOpsModule } from "@/modules/ops/services/ops-remote";

function now() { return new Date().toISOString(); }
function id() { return crypto.randomUUID(); }
function today() { return now().slice(0, 10); }

const STORAGE_KEY = "businesssuite:purchase:v3";
const STORAGE_VERSION = 3;

export interface Supplier extends TenantEntity {
  supplier_no: string;
  name: string;
  email: string;
  phone: string;
  contact_person: string;
  status: "active" | "inactive";
  tax_number?: string | null;
  bank_name?: string | null;
  bank_account?: string | null;
  category?: string | null;
  rating?: number | null;
  address?: string | null;
  payment_terms?: string | null;
}

export interface PurchaseOrder extends TenantEntity {
  purchase_order_no: string;
  supplier_id: UUID;
  supplier_name: string;
  order_date: string;
  expected_delivery_date: string;
  status: "draft" | "sent" | "approved" | "received" | "cancelled";
  total_amount: number;
  lines?: DocumentLine[];
  requisition_id?: UUID | null;
  rfq_id?: UUID | null;
}

export interface GoodsReceipt extends TenantEntity {
  receipt_no: string;
  purchase_order_no: string;
  purchase_order_id?: UUID | null;
  supplier_name: string;
  receipt_date: string;
  status: "draft" | "posted";
  notes: string;
  lines?: DocumentLine[];
  warehouse_id?: UUID | null;
  qc_status?: "pending" | "accepted" | "rejected" | "hold";
}

export interface VendorBill extends TenantEntity {
  bill_no: string;
  supplier_name: string;
  bill_date: string;
  due_date: string;
  status: "draft" | "open" | "paid";
  total_amount: number;
  paid_amount?: number;
  lines?: DocumentLine[];
  purchase_order_id?: UUID | null;
  goods_receipt_id?: UUID | null;
  match_status?: "unmatched" | "matched" | "variance";
  match_variance?: number;
}

export interface VendorPayment extends TenantEntity {
  payment_no: string;
  supplier_name: string;
  payment_date: string;
  amount: number;
  payment_method: string;
  bill_no: string;
}

type PurchaseSnapshot = {
  version: number;
  suppliers: Supplier[];
  purchaseOrders: PurchaseOrder[];
  goodsReceipts: GoodsReceipt[];
  vendorBills: VendorBill[];
  vendorPayments: VendorPayment[];
  requisitions?: PurchaseRequisition[];
  rfqs?: PurchaseRfq[];
  vendorQuotes?: VendorQuote[];
  matchTolerances?: MatchTolerance[];
};

export interface PurchaseRequisition extends TenantEntity {
  requisition_no: string;
  requested_by: string;
  department?: string | null;
  status: "draft" | "submitted" | "approved" | "rejected" | "ordered";
  needed_by?: string | null;
  notes?: string | null;
  lines?: DocumentLine[];
  total_amount: number;
}

export interface PurchaseRfq extends TenantEntity {
  rfq_no: string;
  title: string;
  status: "open" | "closed" | "awarded";
  due_date?: string | null;
  notes?: string | null;
  lines?: DocumentLine[];
}

export interface VendorQuote extends TenantEntity {
  rfq_id: UUID;
  supplier_id?: UUID | null;
  supplier_name: string;
  total_amount: number;
  valid_until?: string | null;
  status: "received" | "selected" | "rejected";
  notes?: string | null;
  lines?: DocumentLine[];
}

export interface MatchTolerance extends TenantEntity {
  qty_pct: number;
  amount_pct: number;
}

let suppliers: Supplier[] = [];
let purchaseOrders: PurchaseOrder[] = [];
let goodsReceipts: GoodsReceipt[] = [];
let vendorBills: VendorBill[] = [];
let vendorPayments: VendorPayment[] = [];
let requisitions: PurchaseRequisition[] = [];
let rfqs: PurchaseRfq[] = [];
let vendorQuotes: VendorQuote[] = [];
let matchTolerances: MatchTolerance[] = [];

let hydrated = false;

function persist() {
  savePersisted(STORAGE_KEY, {
    version: STORAGE_VERSION,
    suppliers,
    purchaseOrders,
    goodsReceipts,
    vendorBills,
    vendorPayments,
    requisitions,
    rfqs,
    vendorQuotes,
    matchTolerances
  } satisfies PurchaseSnapshot);
  queueOpsRemoteSync();
}

function ensureHydrated() {
  if (hydrated) return;
  hydrated = true;
  const snap = loadPersisted<PurchaseSnapshot>(STORAGE_KEY);
  if (snap?.version === STORAGE_VERSION && Array.isArray(snap.suppliers)) {
    suppliers = snap.suppliers;
    purchaseOrders = snap.purchaseOrders ?? [];
    goodsReceipts = snap.goodsReceipts ?? [];
    vendorBills = snap.vendorBills ?? [];
    vendorPayments = snap.vendorPayments ?? [];
    requisitions = snap.requisitions ?? [];
    rfqs = snap.rfqs ?? [];
    vendorQuotes = snap.vendorQuotes ?? [];
    matchTolerances = snap.matchTolerances ?? [];
  }
}

function defaultWarehouse(tenantId: UUID) {
  return listWarehouses(tenantId)[0]?.id ?? null;
}

export function listSuppliers(tenantId: UUID) {
  ensureHydrated();
  return suppliers.filter((s) => s.tenant_id === tenantId && s.is_active !== false);
}

export function listPurchaseOrders(tenantId: UUID) {
  ensureHydrated();
  return purchaseOrders.filter((p) => p.tenant_id === tenantId && p.is_active !== false);
}

export function getPurchaseOrderByNo(tenantId: UUID, poNo: string) {
  ensureHydrated();
  return purchaseOrders.find((p) => p.tenant_id === tenantId && p.purchase_order_no === poNo);
}

export function createSupplier(tenantId: UUID, data: Omit<Supplier, "id" | "tenant_id" | "supplier_no" | "created_at" | "updated_at">) {
  ensureHydrated();
  const supplier: Supplier = {
    ...data,
    id: id(),
    tenant_id: tenantId,
    supplier_no: generateDocumentNumber(tenantId, "supplier"),
    created_at: now(),
    updated_at: now(),
    is_active: true
  };
  suppliers.unshift(supplier);
  persist();
  logCreate({ tenantId, module: "purchase", entityName: "supplier", entityId: supplier.id, newData: supplier as unknown as Record<string, unknown> });
  return supplier;
}

export function createPurchaseOrder(tenantId: UUID, data: Omit<PurchaseOrder, "id" | "tenant_id" | "purchase_order_no" | "created_at" | "updated_at">) {
  ensureHydrated();
  const lines = normalizeLines(data.lines);
  const po: PurchaseOrder = {
    ...data,
    lines,
    total_amount: lines.length ? linesSubtotal(lines) : data.total_amount,
    id: id(),
    tenant_id: tenantId,
    purchase_order_no: generateDocumentNumber(tenantId, "purchase_order"),
    created_at: now(),
    updated_at: now(),
    is_active: true
  };
  purchaseOrders.unshift(po);
  persist();
  logCreate({ tenantId, module: "purchase", entityName: "purchase_order", entityId: po.id, newData: po as unknown as Record<string, unknown> });
  return po;
}

export function listGoodsReceipts(tenantId: UUID) {
  ensureHydrated();
  return goodsReceipts.filter((g) => g.tenant_id === tenantId && g.is_active !== false);
}

function receivedQtyForPo(tenantId: UUID, poId: UUID, productId: UUID | null | undefined, description: string, excludeGrnId?: UUID) {
  return goodsReceipts
    .filter((g) => g.tenant_id === tenantId && g.purchase_order_id === poId && g.status === "posted" && g.is_active !== false && g.id !== excludeGrnId)
    .flatMap((g) => g.lines ?? [])
    .filter((l) => (productId && l.product_id === productId) || l.description === description)
    .reduce((s, l) => s + l.quantity, 0);
}

function postGrnToStock(tenantId: UUID, grn: GoodsReceipt) {
  const qc = grn.qc_status ?? "accepted";
  if (qc === "pending" || qc === "rejected" || qc === "hold") {
    throw new Error("QC must be accepted before posting the goods receipt.");
  }
  const whId = grn.warehouse_id || defaultWarehouse(tenantId);
  const po = grn.purchase_order_id
    ? purchaseOrders.find((p) => p.id === grn.purchase_order_id)
    : getPurchaseOrderByNo(tenantId, grn.purchase_order_no);
  const lines = grn.lines?.length ? grn.lines : po?.lines ?? [];
  for (const line of lines) {
    if (po) {
      const already = receivedQtyForPo(tenantId, po.id, line.product_id, line.description, grn.id);
      const ordered = po.lines?.find((l) => (line.product_id && l.product_id === line.product_id) || l.description === line.description)?.quantity ?? line.quantity;
      const remaining = ordered - already;
      if (line.quantity > remaining + 0.0001) {
        throw new Error(`Over-receipt: ${line.description} remaining ${remaining}, received ${line.quantity}.`);
      }
    }
    if (!line.product_id || !whId) continue;
    postStockMovement(tenantId, {
      product_id: line.product_id,
      warehouse_id: whId,
      movement_type: "purchase",
      quantity: Math.abs(line.quantity),
      unit_cost: line.unit_price,
      movement_date: grn.receipt_date,
      notes: `GRN ${grn.receipt_no}`,
      reference_type: "goods_receipt",
      reference_id: grn.id
    });
    postLedgerPair(
      tenantId,
      grn.receipt_date,
      `GRN ${grn.receipt_no}`,
      "Inventory",
      "Goods Received Not Invoiced",
      Math.abs(line.quantity) * line.unit_price,
      "goods_receipt",
      grn.id
    );
  }
  if (po) {
    const fully = (po.lines ?? []).every((l) => receivedQtyForPo(tenantId, po.id, l.product_id, l.description) >= l.quantity - 0.0001);
    po.status = fully ? "received" : po.status === "draft" ? "sent" : po.status;
    po.updated_at = now();
  }
}

export function createGoodsReceipt(tenantId: UUID, data: Omit<GoodsReceipt, "id" | "tenant_id" | "receipt_no" | "created_at" | "updated_at">) {
  ensureHydrated();
  const po = getPurchaseOrderByNo(tenantId, data.purchase_order_no);
  const lines = normalizeLines(data.lines?.length ? data.lines : po?.lines);
  const row: GoodsReceipt = {
    ...data,
    lines,
    purchase_order_id: po?.id ?? null,
    qc_status: data.qc_status ?? (data.status === "posted" ? "accepted" : "pending"),
    id: id(),
    tenant_id: tenantId,
    receipt_no: generateDocumentNumber(tenantId, "goods_receipt"),
    created_at: now(),
    updated_at: now(),
    is_active: true
  };
  goodsReceipts.unshift(row);
  if (row.status === "posted") postGrnToStock(tenantId, row);
  persist();
  return row;
}

export function postGoodsReceipt(tenantId: UUID, receiptId: UUID) {
  ensureHydrated();
  const grn = goodsReceipts.find((g) => g.id === receiptId && g.tenant_id === tenantId);
  if (!grn || grn.status === "posted") return grn ?? null;
  grn.status = "posted";
  grn.updated_at = now();
  postGrnToStock(tenantId, grn);
  persist();
  return grn;
}

export function listVendorBills(tenantId: UUID) {
  ensureHydrated();
  return vendorBills.filter((b) => b.tenant_id === tenantId && b.is_active !== false);
}

export function createVendorBill(tenantId: UUID, data: Omit<VendorBill, "id" | "tenant_id" | "bill_no" | "created_at" | "updated_at">) {
  ensureHydrated();
  const lines = normalizeLines(data.lines);
  const total = lines.length ? linesSubtotal(lines) : data.total_amount;
  const match = threeWayMatch(tenantId, data.purchase_order_id ?? null, data.goods_receipt_id ?? null, total, lines);
  if ((data.purchase_order_id || data.goods_receipt_id) && match.status === "variance") {
    throw new Error(`Three-way match failed (variance ${Math.round(match.variance)}). Adjust lines or raise match tolerance.`);
  }
  const row: VendorBill = {
    ...data,
    lines,
    total_amount: total,
    paid_amount: data.paid_amount || 0,
    match_status: match.status,
    match_variance: match.variance,
    id: id(),
    tenant_id: tenantId,
    bill_no: generateDocumentNumber(tenantId, "vendor_bill"),
    created_at: now(),
    updated_at: now(),
    is_active: true
  };
  vendorBills.unshift(row);
  persist();
  const debitAccount = row.goods_receipt_id ? "Goods Received Not Invoiced" : "Operating Expenses";
  postLedgerPair(tenantId, row.bill_date, `Vendor bill ${row.bill_no}`, debitAccount, "Accounts Payable", row.total_amount, "vendor_bill", row.id);
  return row;
}

export function getMatchTolerance(tenantId: UUID) {
  ensureHydrated();
  return matchTolerances.find((t) => t.tenant_id === tenantId && t.is_active !== false) ?? { qty_pct: 2, amount_pct: 2, tenant_id: tenantId };
}

export function saveMatchTolerance(tenantId: UUID, data: { qty_pct: number; amount_pct: number }) {
  ensureHydrated();
  let row = matchTolerances.find((t) => t.tenant_id === tenantId && t.is_active !== false);
  if (!row) {
    row = { id: id(), tenant_id: tenantId, qty_pct: data.qty_pct, amount_pct: data.amount_pct, created_at: now(), updated_at: now(), is_active: true };
    matchTolerances.unshift(row);
  } else {
    row.qty_pct = data.qty_pct;
    row.amount_pct = data.amount_pct;
    row.updated_at = now();
  }
  persist();
  return row;
}

export function threeWayMatch(tenantId: UUID, poId: UUID | null, grnId: UUID | null, billAmount: number, billLines?: DocumentLine[]) {
  ensureHydrated();
  const tol = getMatchTolerance(tenantId);
  const po = poId ? purchaseOrders.find((p) => p.id === poId) : null;
  const grn = grnId ? goodsReceipts.find((g) => g.id === grnId) : null;
  const poAmt = po?.total_amount ?? billAmount;
  const grnAmt = grn?.lines?.length ? linesSubtotal(grn.lines) : poAmt;
  const amountVariance = Math.max(Math.abs(billAmount - poAmt), Math.abs(billAmount - grnAmt));
  const allowed = (poAmt || billAmount) * ((tol.amount_pct || 2) / 100);
  let qtyFail = false;
  const sourceLines = grn?.lines?.length ? grn.lines : po?.lines ?? [];
  for (const line of billLines ?? []) {
    const matchLine = sourceLines.find((l) => (line.product_id && l.product_id === line.product_id) || l.description === line.description);
    if (!matchLine) {
      qtyFail = true;
      break;
    }
    const allowedQty = Math.abs(matchLine.quantity) * ((tol.qty_pct || 2) / 100);
    if (Math.abs(line.quantity - matchLine.quantity) > allowedQty) qtyFail = true;
  }
  return {
    status: amountVariance <= allowed && !qtyFail ? ("matched" as const) : ("variance" as const),
    variance: amountVariance,
    poAmt,
    grnAmt
  };
}

export function listVendorPayments(tenantId: UUID) {
  ensureHydrated();
  return vendorPayments.filter((p) => p.tenant_id === tenantId && p.is_active !== false);
}

export function createVendorPayment(tenantId: UUID, data: Omit<VendorPayment, "id" | "tenant_id" | "payment_no" | "created_at" | "updated_at">) {
  ensureHydrated();
  const bill = vendorBills.find((b) => b.tenant_id === tenantId && b.bill_no === data.bill_no);
  if (bill?.match_status === "variance") throw new Error("Cannot pay a supplier invoice with a three-way match variance.");
  const row: VendorPayment = {
    ...data,
    id: id(),
    tenant_id: tenantId,
    payment_no: generateDocumentNumber(tenantId, "vendor_payment"),
    created_at: now(),
    updated_at: now(),
    is_active: true
  };
  vendorPayments.unshift(row);
  if (bill) {
    bill.paid_amount = (bill.paid_amount || 0) + data.amount;
    bill.status = (bill.paid_amount || 0) >= bill.total_amount ? "paid" : "open";
    bill.updated_at = now();
  }
  persist();
  postLedgerPair(tenantId, row.payment_date, `Vendor payment ${row.payment_no}`, "Accounts Payable", "Cash", row.amount, "vendor_payment", row.id);
  return row;
}

const supplierRef = {
  get: () => suppliers,
  set: (rows: Supplier[]) => { suppliers = rows; },
  persist,
  module: "purchases",
  entityName: "supplier",
  labelOf: (row: Supplier) => `${row.supplier_no} · ${row.name}`
};
const poRef = {
  get: () => purchaseOrders,
  set: (rows: PurchaseOrder[]) => { purchaseOrders = rows; },
  persist,
  module: "purchases",
  entityName: "purchase_order",
  labelOf: (row: PurchaseOrder) => `${row.purchase_order_no} · ${row.supplier_name}`
};
const grnRef = {
  get: () => goodsReceipts,
  set: (rows: GoodsReceipt[]) => { goodsReceipts = rows; },
  persist,
  module: "purchases",
  entityName: "goods_receipt",
  labelOf: (row: GoodsReceipt) => `${row.receipt_no} · ${row.supplier_name}`
};
const billRef = {
  get: () => vendorBills,
  set: (rows: VendorBill[]) => { vendorBills = rows; },
  persist,
  module: "purchases",
  entityName: "vendor_bill",
  labelOf: (row: VendorBill) => `${row.bill_no} · ${row.supplier_name}`
};
const vendorPayRef = {
  get: () => vendorPayments,
  set: (rows: VendorPayment[]) => { vendorPayments = rows; },
  persist,
  module: "purchases",
  entityName: "vendor_payment",
  labelOf: (row: VendorPayment) => `${row.payment_no} · ${row.supplier_name}`
};

bindTrashRestore(supplierRef);
bindTrashRestore(poRef);
bindTrashRestore(grnRef);
bindTrashRestore(billRef);
bindTrashRestore(vendorPayRef);

export function updateSupplier(id: UUID, data: Partial<Supplier>) { ensureHydrated(); return updateEntityInCollection(supplierRef, id, data); }
export function trashSupplier(id: UUID) { ensureHydrated(); return trashEntityInCollection(supplierRef, id); }
export function updatePurchaseOrder(id: UUID, data: Partial<PurchaseOrder>) { ensureHydrated(); return updateEntityInCollection(poRef, id, data); }
export function trashPurchaseOrder(id: UUID) { ensureHydrated(); return trashEntityInCollection(poRef, id); }
export function updateGoodsReceipt(id: UUID, data: Partial<GoodsReceipt>) { ensureHydrated(); return updateEntityInCollection(grnRef, id, data); }
export function trashGoodsReceipt(id: UUID) { ensureHydrated(); return trashEntityInCollection(grnRef, id); }
export function updateVendorBill(id: UUID, data: Partial<VendorBill>) { ensureHydrated(); return updateEntityInCollection(billRef, id, data); }
export function trashVendorBill(id: UUID) { ensureHydrated(); return trashEntityInCollection(billRef, id); }
export function updateVendorPayment(id: UUID, data: Partial<VendorPayment>) { ensureHydrated(); return updateEntityInCollection(vendorPayRef, id, data); }
export function trashVendorPayment(id: UUID) { ensureHydrated(); return trashEntityInCollection(vendorPayRef, id); }

export function listRequisitions(tenantId: UUID) {
  ensureHydrated();
  return requisitions.filter((r) => r.tenant_id === tenantId && r.is_active !== false);
}

export function submitRequisition(id: UUID) {
  ensureHydrated();
  const row = requisitions.find((r) => r.id === id);
  if (!row || row.status !== "draft") return null;
  row.status = "submitted";
  row.updated_at = now();
  persist();
  return row;
}

export function approveRequisition(id: UUID) {
  ensureHydrated();
  const row = requisitions.find((r) => r.id === id);
  if (!row || row.status !== "submitted") return null;
  row.status = "approved";
  row.updated_at = now();
  persist();
  return row;
}

export function rejectRequisition(id: UUID) {
  ensureHydrated();
  const row = requisitions.find((r) => r.id === id);
  if (!row || row.status !== "submitted") return null;
  row.status = "rejected";
  row.updated_at = now();
  persist();
  return row;
}

export function convertRequisitionToPo(tenantId: UUID, requisitionId: UUID, supplierName: string, supplierId: UUID) {
  ensureHydrated();
  const req = requisitions.find((r) => r.id === requisitionId && r.tenant_id === tenantId);
  if (!req || req.status !== "approved") return null;
  const po = createPurchaseOrder(tenantId, {
    supplier_id: supplierId,
    supplier_name: supplierName,
    order_date: today(),
    expected_delivery_date: req.needed_by ?? today(),
    status: "draft",
    total_amount: req.total_amount,
    lines: req.lines ?? [],
    requisition_id: req.id,
    rfq_id: null
  });
  req.status = "ordered";
  persist();
  return po;
}

export function createRequisition(tenantId: UUID, data: Omit<PurchaseRequisition, "id" | "tenant_id" | "requisition_no" | "created_at" | "updated_at">) {
  ensureHydrated();
  const lines = normalizeLines(data.lines);
  const row: PurchaseRequisition = {
    ...data,
    lines,
    total_amount: lines.length ? linesSubtotal(lines) : data.total_amount,
    id: id(),
    tenant_id: tenantId,
    requisition_no: generateDocumentNumber(tenantId, "requisition"),
    created_at: now(),
    updated_at: now(),
    is_active: true
  };
  requisitions.unshift(row);
  persist();
  return row;
}

export function createRequisitionFromLowStock(tenantId: UUID, requestedBy: string) {
  const items = listLowStock(tenantId);
  if (!items.length) throw new Error("No products are below reorder level.");
  const lines: DocumentLine[] = items.map((p) => {
    const onHand = getProductStock(p.id, tenantId);
    const qty = Math.max(1, p.reorder_level - onHand);
    return { product_id: p.id, sku: p.sku, description: p.name, quantity: qty, unit_price: p.purchase_price };
  });
  return createRequisition(tenantId, {
    requested_by: requestedBy,
    department: "Stores",
    status: "draft",
    needed_by: today(),
    notes: "Generated from low stock alerts",
    lines,
    total_amount: linesSubtotal(lines)
  });
}

export function listRfqs(tenantId: UUID) {
  ensureHydrated();
  return rfqs.filter((r) => r.tenant_id === tenantId && r.is_active !== false);
}

export function createRfq(tenantId: UUID, data: Omit<PurchaseRfq, "id" | "tenant_id" | "rfq_no" | "created_at" | "updated_at">) {
  ensureHydrated();
  const row: PurchaseRfq = {
    ...data,
    lines: normalizeLines(data.lines),
    id: id(),
    tenant_id: tenantId,
    rfq_no: generateDocumentNumber(tenantId, "rfq"),
    created_at: now(),
    updated_at: now(),
    is_active: true
  };
  rfqs.unshift(row);
  persist();
  return row;
}

export function listVendorQuotes(tenantId: UUID, rfqId?: UUID) {
  ensureHydrated();
  return vendorQuotes.filter((q) => q.tenant_id === tenantId && q.is_active !== false && (!rfqId || q.rfq_id === rfqId));
}

export function createVendorQuote(tenantId: UUID, data: Omit<VendorQuote, "id" | "tenant_id" | "created_at" | "updated_at">) {
  ensureHydrated();
  const row: VendorQuote = { ...data, id: id(), tenant_id: tenantId, created_at: now(), updated_at: now(), is_active: true };
  vendorQuotes.unshift(row);
  persist();
  return row;
}

export function awardRfq(tenantId: UUID, rfqId: UUID, quoteId: UUID) {
  ensureHydrated();
  const quote = vendorQuotes.find((q) => q.id === quoteId);
  const rfq = rfqs.find((r) => r.id === rfqId);
  if (!quote || !rfq) return null;
  quote.status = "selected";
  rfq.status = "awarded";
  const supplier = suppliers.find((s) => s.name === quote.supplier_name);
  const po = createPurchaseOrder(tenantId, {
    supplier_id: quote.supplier_id || supplier?.id || id(),
    supplier_name: quote.supplier_name,
    order_date: now().slice(0, 10),
    expected_delivery_date: quote.valid_until || now().slice(0, 10),
    status: "draft",
    total_amount: quote.lines?.length ? linesSubtotal(quote.lines) : quote.total_amount,
    lines: quote.lines?.length ? quote.lines : rfq.lines,
    rfq_id: rfq.id
  });
  persist();
  return po;
}

const reqRef = { get: () => requisitions, set: (rows: PurchaseRequisition[]) => { requisitions = rows; }, persist, module: "purchases", entityName: "requisition", labelOf: (row: PurchaseRequisition) => row.requisition_no };
const rfqRef = { get: () => rfqs, set: (rows: PurchaseRfq[]) => { rfqs = rows; }, persist, module: "purchases", entityName: "rfq", labelOf: (row: PurchaseRfq) => row.rfq_no };

bindTrashRestore(reqRef);
bindTrashRestore(rfqRef);

export function updateRequisition(id: UUID, data: Partial<PurchaseRequisition>) { ensureHydrated(); return updateEntityInCollection(reqRef, id, data); }
export function trashRequisition(id: UUID) { ensureHydrated(); return trashEntityInCollection(reqRef, id); }
export function updateRfq(id: UUID, data: Partial<PurchaseRfq>) { ensureHydrated(); return updateEntityInCollection(rfqRef, id, data); }
export function trashRfq(id: UUID) { ensureHydrated(); return trashEntityInCollection(rfqRef, id); }

registerOpsModule({
  build: () => ({
    suppliers: suppliers as unknown as Record<string, unknown>[],
    purchaseOrders: purchaseOrders as unknown as Record<string, unknown>[],
    goodsReceipts: goodsReceipts as unknown as Record<string, unknown>[],
    vendorBills: vendorBills as unknown as Record<string, unknown>[],
    vendorPayments: vendorPayments as unknown as Record<string, unknown>[],
    requisitions: requisitions as unknown as Record<string, unknown>[],
    rfqs: rfqs as unknown as Record<string, unknown>[],
    vendorQuotes: vendorQuotes as unknown as Record<string, unknown>[],
    matchTolerances: matchTolerances as unknown as Record<string, unknown>[]
  }),
  apply: (snapshot) => {
    if (snapshot.suppliers) suppliers = snapshot.suppliers as unknown as Supplier[];
    if (snapshot.purchaseOrders) purchaseOrders = snapshot.purchaseOrders as unknown as PurchaseOrder[];
    if (snapshot.goodsReceipts) goodsReceipts = snapshot.goodsReceipts as unknown as GoodsReceipt[];
    if (snapshot.vendorBills) vendorBills = snapshot.vendorBills as unknown as VendorBill[];
    if (snapshot.vendorPayments) vendorPayments = snapshot.vendorPayments as unknown as VendorPayment[];
    if (snapshot.requisitions) requisitions = snapshot.requisitions as unknown as PurchaseRequisition[];
    if (snapshot.rfqs) rfqs = snapshot.rfqs as unknown as PurchaseRfq[];
    if (snapshot.vendorQuotes) vendorQuotes = snapshot.vendorQuotes as unknown as VendorQuote[];
    if (snapshot.matchTolerances) matchTolerances = snapshot.matchTolerances as unknown as MatchTolerance[];
    savePersisted(STORAGE_KEY, {
      version: STORAGE_VERSION,
      suppliers,
      purchaseOrders,
      goodsReceipts,
      vendorBills,
      vendorPayments,
      requisitions,
      rfqs,
      vendorQuotes,
      matchTolerances
    });
  }
});
