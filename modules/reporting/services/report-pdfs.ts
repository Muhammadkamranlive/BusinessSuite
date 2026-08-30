import type { ReportDomain, TenantWarehouseSnapshot } from "@/modules/reporting/model";
import {
  applyTenantPdfFooter,
  createTenantPdf,
  pdfMoney,
  writeKeyValueRows,
  writeTable
} from "@/modules/reporting/services/tenant-pdf";

function slug(s: string) {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

export function downloadDomainReportPdf(wh: TenantWarehouseSnapshot, domain: ReportDomain) {
  const titles: Record<ReportDomain, string> = {
    executive: "Executive KPI Pack",
    sales: "Sales Analytics Report",
    inventory: "Inventory Analytics Report",
    purchases: "Purchases Analytics Report",
    finance: "Finance Analytics Report",
    crm: "CRM Analytics Report",
    hrm: "HR Analytics Report"
  };

  const ctx = createTenantPdf(wh.branding, titles[domain]);
  let y = ctx.contentStartY;

  if (domain === "executive" || domain === "sales") {
    y = writeKeyValueRows(ctx, y, [
      ["Invoice total", pdfMoney(wh.kpis.invoiceTotal)],
      ["Payments received", pdfMoney(wh.kpis.paymentsReceived)],
      ["AR outstanding", pdfMoney(wh.kpis.arOutstanding)],
      ["Open quotations", String(wh.kpis.openQuotations)]
    ]);
  }

  if (domain === "executive") {
    y += 4;
    y = writeKeyValueRows(ctx, y, [
      ["Inventory value (cost)", pdfMoney(wh.kpis.inventoryValueAtCost)],
      ["Low stock SKUs", String(wh.kpis.lowStockCount)],
      ["Purchase pipeline", pdfMoney(wh.kpis.purchasePipeline)],
      ["Finance profit", pdfMoney(wh.kpis.financeProfit)],
      ["Employees", String(wh.kpis.employees)],
      ["Pending leaves", String(wh.kpis.pendingLeaves)],
      ["Open CRM deals", String(wh.kpis.openDeals)]
    ]);
  }

  if (domain === "sales") {
    y += 6;
    y = writeTable(ctx, y, ["Invoice", "Customer", "Date", "Status", "Total", "Due"], wh.sales.recentInvoices.map((i) => [
      i.invoice_no,
      i.customer_name,
      i.invoice_date,
      i.status,
      pdfMoney(i.total_amount),
      pdfMoney(i.balance_due)
    ]));
  }

  if (domain === "inventory" || domain === "executive") {
    if (domain === "inventory") {
      y = writeKeyValueRows(ctx, y, [
        ["Products", String(wh.kpis.productCount)],
        ["Stock units", String(wh.kpis.stockUnits)],
        ["Inventory value (cost)", pdfMoney(wh.kpis.inventoryValueAtCost)],
        ["Low stock", String(wh.kpis.lowStockCount)]
      ]);
      y += 6;
      y = writeTable(ctx, y, ["SKU", "Product", "Stock", "Reorder", "Value"], wh.inventory.products.slice(0, 40).map((p) => [
        p.sku,
        p.name,
        String(p.stock),
        String(p.reorder_level),
        pdfMoney(p.stock_value_cost)
      ]));
    } else {
      y += 6;
    }
  }

  if (domain === "purchases") {
    y = writeKeyValueRows(ctx, y, [
      ["Open POs", String(wh.kpis.openPurchaseOrders)],
      ["Purchase pipeline", pdfMoney(wh.kpis.purchasePipeline)],
      ["Suppliers", String(wh.purchases.suppliers)]
    ]);
    y += 6;
    y = writeTable(ctx, y, ["PO", "Supplier", "Date", "Status", "Total"], wh.purchases.orders.map((o) => [
      o.purchase_order_no,
      o.supplier_name,
      o.order_date,
      o.status,
      pdfMoney(o.total_amount)
    ]));
  }

  if (domain === "finance") {
    y = writeKeyValueRows(ctx, y, [
      ["Income", pdfMoney(wh.kpis.financeIncome)],
      ["Expenses", pdfMoney(wh.kpis.financeExpenses)],
      ["Profit", pdfMoney(wh.kpis.financeProfit)]
    ]);
    y += 6;
    y = writeTable(ctx, y, ["Expense #", "Date", "Account", "Amount", "Description"], wh.finance.expenses.map((e) => [
      e.expense_no,
      e.expense_date,
      e.account_name,
      pdfMoney(e.amount),
      e.description
    ]));
  }

  if (domain === "crm") {
    y = writeKeyValueRows(ctx, y, [
      ["Customers", String(wh.kpis.customers)],
      ["Leads", String(wh.kpis.leads)],
      ["Open deals", String(wh.kpis.openDeals)]
    ]);
    y += 6;
    y = writeTable(
      ctx,
      y,
      ["Lead status", "Count"],
      wh.crm.leadStages.map((s) => [s.name, String(s.count)])
    );
    y += 8;
    y = writeTable(
      ctx,
      y,
      ["Deal stage", "Count"],
      wh.crm.dealStages.map((s) => [s.name, String(s.count)])
    );
  }

  if (domain === "hrm") {
    y = writeKeyValueRows(ctx, y, [
      ["Employees", String(wh.kpis.employees)],
      ["Pending leaves", String(wh.kpis.pendingLeaves)],
      ["Payroll net (all runs)", pdfMoney(wh.kpis.payrollNet)]
    ]);
    y += 6;
    y = writeTable(
      ctx,
      y,
      ["Department", "Employees", "Pending leaves"],
      wh.hrm.departments.map((d) => [d.name, String(d.employees), String(d.pendingLeaves)])
    );
  }

  applyTenantPdfFooter(ctx);
  ctx.doc.save(`${slug(wh.branding.legalName)}-${domain}-report.pdf`);
}
