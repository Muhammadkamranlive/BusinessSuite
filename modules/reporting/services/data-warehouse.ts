import type { UUID } from "@/modules/core/types";
import type { NamedAmount, NamedCount, TenantWarehouseSnapshot } from "@/modules/reporting/model";
import { getTenantBranding } from "@/modules/reporting/services/tenant-branding";
import { listActivities, listCustomers, listDeals, listLeads } from "@/modules/crm/services/crm.store";
import { listExpenses, getProfitAndLoss } from "@/modules/finance/services/finance.store";
import {
  getProductStock,
  listLowStock,
  listProducts,
  listStockMovements
} from "@/modules/inventory/services/inventory.store";
import { listPurchaseOrders, listSuppliers } from "@/modules/purchase/services/purchase.store";
import { listInvoices, listPayments, listQuotations } from "@/modules/sales/services/sales.store";
import {
  getDepartmentName,
  hrmStats,
  listDepartments,
  listEmployees,
  listLeaveRequests,
  listPayrollRuns
} from "@/modules/hrm/services/hrm.store";

function countBy<T>(rows: T[], keyFn: (row: T) => string): NamedCount[] {
  const map = new Map<string, number>();
  for (const row of rows) {
    const key = keyFn(row) || "unknown";
    map.set(key, (map.get(key) ?? 0) + 1);
  }
  return [...map.entries()].map(([name, count]) => ({ name, count })).sort((a, b) => b.count - a.count);
}

function sumByCustomer(invoices: ReturnType<typeof listInvoices>): NamedAmount[] {
  const map = new Map<string, number>();
  for (const inv of invoices) {
    if (inv.status === "cancelled") continue;
    map.set(inv.customer_name, (map.get(inv.customer_name) ?? 0) + inv.total_amount);
  }
  return [...map.entries()]
    .map(([name, amount]) => ({ name, amount }))
    .sort((a, b) => b.amount - a.amount)
    .slice(0, 8);
}

/**
 * Multi-tenant Data Warehouse snapshot — aggregates live module stores for one tenant.
 * Safe to call from client Report Center.
 */
export function buildTenantWarehouse(tenantId: UUID): TenantWarehouseSnapshot {
  const branding = getTenantBranding(tenantId);

  const invoices = listInvoices(tenantId);
  const payments = listPayments(tenantId);
  const quotations = listQuotations(tenantId);
  const products = listProducts(tenantId);
  const movements = listStockMovements(tenantId);
  const lowStock = listLowStock(tenantId);
  const pos = listPurchaseOrders(tenantId);
  const suppliers = listSuppliers(tenantId);
  const expenses = listExpenses(tenantId);
  const pnl = getProfitAndLoss(tenantId);
  const customers = listCustomers(tenantId);
  const leads = listLeads(tenantId);
  const deals = listDeals(tenantId);
  void listActivities(tenantId);

  const employees = listEmployees(tenantId);
  const leaves = listLeaveRequests(tenantId);
  const departments = listDepartments(tenantId);
  const payrollRuns = listPayrollRuns(tenantId);
  const hr = hrmStats(tenantId);

  const productRows = products.map((p) => {
    const stock = getProductStock(p.id, tenantId);
    return {
      sku: p.sku,
      name: p.name,
      sale_price: p.sale_price,
      purchase_price: p.purchase_price,
      stock,
      reorder_level: p.reorder_level,
      stock_value_cost: stock * p.purchase_price
    };
  });

  const productName = (id: string) => products.find((p) => p.id === id)?.name ?? id;

  const invoiceTotal = invoices.filter((i) => i.status !== "cancelled").reduce((s, i) => s + i.total_amount, 0);
  const paymentsReceived = payments.reduce((s, p) => s + p.amount, 0);
  const arOutstanding = invoices.reduce((s, i) => s + (i.balance_due > 0 ? i.balance_due : 0), 0);

  return {
    tenantId,
    generatedAt: new Date().toISOString(),
    branding,
    kpis: {
      invoiceTotal,
      paymentsReceived,
      arOutstanding,
      openQuotations: quotations.filter((q) => q.status === "sent" || q.status === "draft").length,
      productCount: products.length,
      stockUnits: productRows.reduce((s, p) => s + p.stock, 0),
      lowStockCount: lowStock.length,
      inventoryValueAtCost: productRows.reduce((s, p) => s + p.stock_value_cost, 0),
      openPurchaseOrders: pos.filter((p) => p.status !== "cancelled" && p.status !== "received").length,
      purchasePipeline: pos.filter((p) => p.status !== "cancelled").reduce((s, p) => s + p.total_amount, 0),
      financeIncome: pnl.totalIncome,
      financeExpenses: pnl.totalExpenses,
      financeProfit: pnl.profit,
      customers: customers.length,
      leads: leads.length,
      openDeals: deals.filter((d) => d.stage !== "won" && d.stage !== "lost").length,
      employees: hr.employees,
      pendingLeaves: hr.pendingLeaves,
      payrollNet: payrollRuns.reduce((s, r) => s + r.total_net, 0)
    },
    sales: {
      invoicesByStatus: countBy(invoices, (i) => i.status),
      topCustomersByRevenue: sumByCustomer(invoices),
      recentInvoices: [...invoices]
        .sort((a, b) => (a.invoice_date < b.invoice_date ? 1 : -1))
        .slice(0, 20)
        .map((i) => ({
          invoice_no: i.invoice_no,
          customer_name: i.customer_name,
          invoice_date: i.invoice_date,
          status: i.status,
          total_amount: i.total_amount,
          balance_due: i.balance_due
        })),
      payments: [...payments]
        .sort((a, b) => (a.payment_date < b.payment_date ? 1 : -1))
        .slice(0, 20)
        .map((p) => ({
          payment_no: p.payment_no,
          customer_name: p.customer_name,
          payment_date: p.payment_date,
          amount: p.amount,
          payment_method: p.payment_method
        }))
    },
    inventory: {
      products: productRows.sort((a, b) => b.stock_value_cost - a.stock_value_cost),
      lowStock: lowStock.map((p) => ({
        sku: p.sku,
        name: p.name,
        stock: getProductStock(p.id, tenantId),
        reorder_level: p.reorder_level
      })),
      movements: [...movements]
        .sort((a, b) => (a.movement_date < b.movement_date ? 1 : -1))
        .slice(0, 30)
        .map((m) => ({
          movement_date: m.movement_date,
          movement_type: m.movement_type,
          product: productName(m.product_id),
          quantity: m.quantity,
          notes: m.notes ?? ""
        }))
    },
    purchases: {
      orders: [...pos]
        .sort((a, b) => (a.order_date < b.order_date ? 1 : -1))
        .map((o) => ({
          purchase_order_no: o.purchase_order_no,
          supplier_name: o.supplier_name,
          order_date: o.order_date,
          status: o.status,
          total_amount: o.total_amount
        })),
      suppliers: suppliers.length
    },
    finance: {
      expenses: [...expenses]
        .sort((a, b) => (a.expense_date < b.expense_date ? 1 : -1))
        .slice(0, 40)
        .map((e) => ({
          expense_no: e.expense_no,
          expense_date: e.expense_date,
          account_name: e.account_name,
          amount: e.amount,
          description: e.description
        }))
    },
    crm: {
      leadStages: countBy(leads, (l) => l.status || "unknown"),
      dealStages: countBy(deals, (d) => d.stage)
    },
    hrm: {
      departments: departments.map((d) => {
        const empCount = employees.filter((e) => e.department_id === d.id).length;
        const pendingLeaves = leaves.filter((l) => {
          if (l.status !== "pending") return false;
          const emp = employees.find((e) => e.id === l.employee_id);
          return emp?.department_id === d.id;
        }).length;
        return { name: d.name || getDepartmentName(d.id), employees: empCount, pendingLeaves };
      })
    }
  };
}
