import type { UUID } from "@/modules/core/types";

export type ReportDomain =
  | "executive"
  | "sales"
  | "inventory"
  | "purchases"
  | "finance"
  | "crm"
  | "hrm";

export type TenantBranding = {
  tenantId: UUID;
  legalName: string;
  title: string;
  tagline?: string | null;
  address?: string | null;
  phone?: string | null;
  email?: string | null;
  taxId?: string | null;
  logoDataUrl?: string | null;
  footer?: string | null;
  brandColor: string;
};

export type NamedAmount = { name: string; amount: number };
export type NamedCount = { name: string; count: number };

export type TenantWarehouseSnapshot = {
  tenantId: UUID;
  generatedAt: string;
  branding: TenantBranding;
  kpis: {
    invoiceTotal: number;
    paymentsReceived: number;
    arOutstanding: number;
    openQuotations: number;
    productCount: number;
    stockUnits: number;
    lowStockCount: number;
    inventoryValueAtCost: number;
    openPurchaseOrders: number;
    purchasePipeline: number;
    financeIncome: number;
    financeExpenses: number;
    financeProfit: number;
    customers: number;
    leads: number;
    openDeals: number;
    employees: number;
    pendingLeaves: number;
    payrollNet: number;
  };
  sales: {
    invoicesByStatus: NamedCount[];
    topCustomersByRevenue: NamedAmount[];
    recentInvoices: Array<{
      invoice_no: string;
      customer_name: string;
      invoice_date: string;
      status: string;
      total_amount: number;
      balance_due: number;
    }>;
    payments: Array<{
      payment_no: string;
      customer_name: string;
      payment_date: string;
      amount: number;
      payment_method: string;
    }>;
  };
  inventory: {
    products: Array<{
      sku: string;
      name: string;
      sale_price: number;
      purchase_price: number;
      stock: number;
      reorder_level: number;
      stock_value_cost: number;
    }>;
    lowStock: Array<{ sku: string; name: string; stock: number; reorder_level: number }>;
    movements: Array<{
      movement_date: string;
      movement_type: string;
      product: string;
      quantity: number;
      notes: string;
    }>;
  };
  purchases: {
    orders: Array<{
      purchase_order_no: string;
      supplier_name: string;
      order_date: string;
      status: string;
      total_amount: number;
    }>;
    suppliers: number;
  };
  finance: {
    expenses: Array<{ expense_no: string; expense_date: string; account_name: string; amount: number; description: string }>;
  };
  crm: {
    leadStages: NamedCount[];
    dealStages: NamedCount[];
  };
  hrm: {
    departments: Array<{ name: string; employees: number; pendingLeaves: number }>;
  };
};
