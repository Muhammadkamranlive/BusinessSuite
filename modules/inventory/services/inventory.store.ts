import type { TenantEntity, UUID } from "@/modules/core/types";
import { generateDocumentNumber } from "@/modules/core/services/numbering.service";
import { logCreate } from "@/modules/core/services/audit.service";
import { bindTrashRestore, trashEntityInCollection, updateEntityInCollection } from "@/modules/core/services/entity-crud";
import { loadPersisted, savePersisted } from "@/modules/core/services/local-persist";
import { queueOpsRemoteSync, registerOpsModule } from "@/modules/ops/services/ops-remote";

function now() { return new Date().toISOString(); }
function id() { return crypto.randomUUID(); }

export interface Product extends TenantEntity {
  sku: string;
  name: string;
  category_id?: UUID | null;
  unit: string;
  purchase_price: number;
  sale_price: number;
  tax_rate: number;
  reorder_level: number;
  status: "active" | "inactive";
}

export interface Warehouse extends TenantEntity {
  name: string;
  code: string;
  location: string;
  status: string;
}

export interface StockMovement extends TenantEntity {
  product_id: UUID;
  warehouse_id: UUID;
  movement_type: "opening" | "purchase" | "sale" | "transfer_in" | "transfer_out" | "adjustment";
  reference_type?: string | null;
  reference_id?: UUID | null;
  quantity: number;
  unit_cost: number;
  movement_date: string;
  notes?: string | null;
}

export interface StockBalance {
  tenant_id: UUID;
  product_id: UUID;
  warehouse_id: UUID;
  quantity_on_hand: number;
}

const STORAGE_KEY = "businesssuite:inventory:v3";
const STORAGE_VERSION = 3;

let warehouses: Warehouse[] = [];
let products: Product[] = [];
let stockBalances: StockBalance[] = [];
let stockMovements: StockMovement[] = [];

export function listProducts(tenantId: UUID) {
  ensureHydrated();
  return products.filter((p) => p.tenant_id === tenantId && p.is_active !== false);
}

export function listWarehouses(tenantId: UUID) {
  ensureHydrated();
  return warehouses.filter((w) => w.tenant_id === tenantId && w.is_active !== false);
}

export function getStock(productId: UUID, warehouseId: UUID) {
  ensureHydrated();
  return stockBalances.find((s) => s.product_id === productId && s.warehouse_id === warehouseId)?.quantity_on_hand ?? 0;
}

export function getProductStock(productId: UUID, tenantId: UUID) {
  ensureHydrated();
  return stockBalances.filter((s) => s.product_id === productId && s.tenant_id === tenantId).reduce((sum, s) => sum + s.quantity_on_hand, 0);
}

export function listStockMovements(tenantId: UUID) {
  ensureHydrated();
  return stockMovements.filter((m) => m.tenant_id === tenantId && m.is_active !== false);
}

export function listLowStock(tenantId: UUID) {
  ensureHydrated();
  return products.filter((p) => {
    if (p.tenant_id !== tenantId) return false;
    const stock = getProductStock(p.id, tenantId);
    return stock < p.reorder_level;
  });
}

export function createProduct(tenantId: UUID, data: Omit<Product, "id" | "tenant_id" | "created_at" | "updated_at">) {
  ensureHydrated();
  const product: Product = { ...data, id: id(), tenant_id: tenantId, created_at: now(), updated_at: now(), is_active: true };
  products.unshift(product);
  persist();
  logCreate({ tenantId, module: "inventory", entityName: "product", entityId: product.id, newData: product as unknown as Record<string, unknown> });
  return product;
}

export function createWarehouse(tenantId: UUID, data: Omit<Warehouse, "id" | "tenant_id" | "created_at" | "updated_at">) {
  ensureHydrated();
  const warehouse: Warehouse = { ...data, id: id(), tenant_id: tenantId, created_at: now(), updated_at: now(), is_active: true };
  warehouses.unshift(warehouse);
  persist();
  logCreate({ tenantId, module: "inventory", entityName: "warehouse", entityId: warehouse.id, newData: warehouse as unknown as Record<string, unknown> });
  return warehouse;
}

export function postStockMovement(tenantId: UUID, data: Omit<StockMovement, "id" | "tenant_id" | "created_at" | "updated_at">) {
  ensureHydrated();
  const movement: StockMovement = { ...data, id: id(), tenant_id: tenantId, created_at: now(), updated_at: now(), is_active: true };
  stockMovements.unshift(movement);
  const balance = stockBalances.find((s) => s.product_id === data.product_id && s.warehouse_id === data.warehouse_id && s.tenant_id === tenantId);
  if (balance) balance.quantity_on_hand += data.quantity;
  else stockBalances.push({ tenant_id: tenantId, product_id: data.product_id, warehouse_id: data.warehouse_id, quantity_on_hand: data.quantity });
  persist();
  logCreate({ tenantId, module: "inventory", entityName: "stock_movement", entityId: movement.id, newData: movement as unknown as Record<string, unknown> });
  return movement;
}

export interface ProductCategory extends TenantEntity {
  name: string;
  code: string;
  description?: string | null;
}

export interface StockTransfer extends TenantEntity {
  transfer_no: string;
  product_id: UUID;
  from_warehouse_id: UUID;
  to_warehouse_id: UUID;
  quantity: number;
  transfer_date: string;
  status: "draft" | "posted";
  notes: string;
}

export interface StockAdjustment extends TenantEntity {
  adjustment_no: string;
  product_id: UUID;
  warehouse_id: UUID;
  quantity_delta: number;
  reason: string;
  adjustment_date: string;
}

let categories: ProductCategory[] = [];

let transfers: StockTransfer[] = [];
let adjustments: StockAdjustment[] = [];

let hydrated = false;

function persist() {
  savePersisted(STORAGE_KEY, {
    version: STORAGE_VERSION,
    warehouses,
    products,
    stockBalances,
    stockMovements,
    categories,
    transfers,
    adjustments
  });
  queueOpsRemoteSync();
}

function ensureHydrated() {
  if (hydrated) return;
  hydrated = true;
  const snap = loadPersisted<{
    version: number;
    warehouses: Warehouse[];
    products: Product[];
    stockBalances: StockBalance[];
    stockMovements: StockMovement[];
    categories: ProductCategory[];
    transfers: StockTransfer[];
    adjustments: StockAdjustment[];
  }>(STORAGE_KEY);
  if (snap?.version === STORAGE_VERSION && Array.isArray(snap.products)) {
    warehouses = snap.warehouses ?? warehouses;
    products = snap.products ?? products;
    stockBalances = snap.stockBalances ?? stockBalances;
    stockMovements = snap.stockMovements ?? stockMovements;
    categories = snap.categories ?? categories;
    transfers = snap.transfers ?? transfers;
    adjustments = snap.adjustments ?? adjustments;
  }
}

export function listCategories(tenantId: UUID) {
  ensureHydrated();
  return categories.filter((c) => c.tenant_id === tenantId && c.is_active !== false);
}

export function createCategory(tenantId: UUID, data: Omit<ProductCategory, "id" | "tenant_id" | "created_at" | "updated_at">) {
  ensureHydrated();
  const row: ProductCategory = { ...data, id: id(), tenant_id: tenantId, created_at: now(), updated_at: now(), is_active: true };
  categories.unshift(row);
  persist();
  return row;
}

export function listTransfers(tenantId: UUID) {
  ensureHydrated();
  return transfers.filter((t) => t.tenant_id === tenantId && t.is_active !== false);
}

export function createTransfer(tenantId: UUID, data: Omit<StockTransfer, "id" | "tenant_id" | "transfer_no" | "created_at" | "updated_at">) {
  const row: StockTransfer = {
    ...data,
    id: id(),
    tenant_id: tenantId,
    transfer_no: generateDocumentNumber(tenantId, "transfer"),
    created_at: now(),
    updated_at: now(),
    is_active: true
  };
  ensureHydrated();
  transfers.unshift(row);
  if (data.status === "posted") {
    postStockMovement(tenantId, {
      product_id: data.product_id,
      warehouse_id: data.from_warehouse_id,
      movement_type: "transfer_out",
      quantity: -Math.abs(data.quantity),
      unit_cost: 0,
      movement_date: data.transfer_date,
      notes: `Transfer ${row.transfer_no}`,
      reference_type: "transfer",
      reference_id: row.id
    });
    postStockMovement(tenantId, {
      product_id: data.product_id,
      warehouse_id: data.to_warehouse_id,
      movement_type: "transfer_in",
      quantity: Math.abs(data.quantity),
      unit_cost: 0,
      movement_date: data.transfer_date,
      notes: `Transfer ${row.transfer_no}`,
      reference_type: "transfer",
      reference_id: row.id
    });
  }
  persist();
  return row;
}

export function listAdjustments(tenantId: UUID) {
  ensureHydrated();
  return adjustments.filter((a) => a.tenant_id === tenantId && a.is_active !== false);
}

export function createAdjustment(tenantId: UUID, data: Omit<StockAdjustment, "id" | "tenant_id" | "adjustment_no" | "created_at" | "updated_at">) {
  const row: StockAdjustment = {
    ...data,
    id: id(),
    tenant_id: tenantId,
    adjustment_no: generateDocumentNumber(tenantId, "adjustment"),
    created_at: now(),
    updated_at: now(),
    is_active: true
  };
  ensureHydrated();
  adjustments.unshift(row);
  postStockMovement(tenantId, {
    product_id: data.product_id,
    warehouse_id: data.warehouse_id,
    movement_type: "adjustment",
    quantity: data.quantity_delta,
    unit_cost: 0,
    movement_date: data.adjustment_date,
    notes: data.reason,
    reference_type: "adjustment",
    reference_id: row.id
  });
  persist();
  return row;
}


const productRef = { get: () => products, set: (rows: Product[]) => { products = rows; }, persist, module: "inventory", entityName: "product", labelOf: (row: Product) => `${row.sku} · ${row.name}` };
const warehouseRef = { get: () => warehouses, set: (rows: Warehouse[]) => { warehouses = rows; }, persist, module: "inventory", entityName: "warehouse", labelOf: (row: Warehouse) => `${row.code} · ${row.name}` };
const categoryRef = { get: () => categories, set: (rows: ProductCategory[]) => { categories = rows; }, persist, module: "inventory", entityName: "category", labelOf: (row: ProductCategory) => `${row.code} · ${row.name}` };
const transferRef = { get: () => transfers, set: (rows: StockTransfer[]) => { transfers = rows; }, persist, module: "inventory", entityName: "transfer", labelOf: (row: StockTransfer) => row.transfer_no };
const adjustmentRef = { get: () => adjustments, set: (rows: StockAdjustment[]) => { adjustments = rows; }, persist, module: "inventory", entityName: "adjustment", labelOf: (row: StockAdjustment) => row.adjustment_no };
const movementRef = { get: () => stockMovements, set: (rows: StockMovement[]) => { stockMovements = rows; }, persist, module: "inventory", entityName: "stock_movement", labelOf: (row: StockMovement) => `${row.movement_type} · ${row.movement_date}` };

bindTrashRestore(productRef);
bindTrashRestore(warehouseRef);
bindTrashRestore(categoryRef);
bindTrashRestore(transferRef);
bindTrashRestore(adjustmentRef);
bindTrashRestore(movementRef);

export function updateProduct(id: UUID, data: Partial<Product>) { ensureHydrated(); return updateEntityInCollection(productRef, id, data); }
export function trashProduct(id: UUID) { ensureHydrated(); return trashEntityInCollection(productRef, id); }
export function updateWarehouse(id: UUID, data: Partial<Warehouse>) { ensureHydrated(); return updateEntityInCollection(warehouseRef, id, data); }
export function trashWarehouse(id: UUID) { ensureHydrated(); return trashEntityInCollection(warehouseRef, id); }
export function updateCategory(id: UUID, data: Partial<ProductCategory>) { ensureHydrated(); return updateEntityInCollection(categoryRef, id, data); }
export function trashCategory(id: UUID) { ensureHydrated(); return trashEntityInCollection(categoryRef, id); }
export function updateTransfer(id: UUID, data: Partial<StockTransfer>) { ensureHydrated(); return updateEntityInCollection(transferRef, id, data); }
export function trashTransfer(id: UUID) { ensureHydrated(); return trashEntityInCollection(transferRef, id); }
export function updateAdjustment(id: UUID, data: Partial<StockAdjustment>) { ensureHydrated(); return updateEntityInCollection(adjustmentRef, id, data); }
export function trashAdjustment(id: UUID) { ensureHydrated(); return trashEntityInCollection(adjustmentRef, id); }
export function trashStockMovement(id: UUID) { ensureHydrated(); return trashEntityInCollection(movementRef, id); }

registerOpsModule({
  build: () => ({
    products: products as unknown as Record<string, unknown>[],
    warehouses: warehouses as unknown as Record<string, unknown>[],
    stockMovements: stockMovements as unknown as Record<string, unknown>[],
    stockBalances: stockBalances as unknown as Record<string, unknown>[],
    categories: categories as unknown as Record<string, unknown>[],
    transfers: transfers as unknown as Record<string, unknown>[],
    adjustments: adjustments as unknown as Record<string, unknown>[]
  }),
  apply: (snapshot) => {
    if (snapshot.products) products = snapshot.products as unknown as Product[];
    if (snapshot.warehouses) warehouses = snapshot.warehouses as unknown as Warehouse[];
    if (snapshot.stockMovements) stockMovements = snapshot.stockMovements as unknown as StockMovement[];
    if (snapshot.stockBalances) stockBalances = snapshot.stockBalances as unknown as StockBalance[];
    if (snapshot.categories) categories = snapshot.categories as unknown as ProductCategory[];
    if (snapshot.transfers) transfers = snapshot.transfers as unknown as StockTransfer[];
    if (snapshot.adjustments) adjustments = snapshot.adjustments as unknown as StockAdjustment[];
    savePersisted(STORAGE_KEY, {
      version: STORAGE_VERSION,
      warehouses,
      products,
      stockBalances,
      stockMovements,
      categories,
      transfers,
      adjustments
    });
  }
});
