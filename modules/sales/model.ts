export type PaymentStatus = "Draft" | "Unpaid" | "Partially Paid" | "Paid" | "Overdue";

export type InvoiceRecord = {
  tenantId: string;
  customerId: string;
  invoiceNo: string;
  status: PaymentStatus;
  dueDate: string;
  total: number;
};
