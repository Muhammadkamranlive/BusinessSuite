import { queueTemplatedEmail } from "@/lib/email/client";
import { EmailTemplateKey } from "@/lib/email/types";

/** Browser origin when available; otherwise public app URL env. */
export function appBaseUrl() {
  if (typeof window !== "undefined" && window.location?.origin) {
    return window.location.origin;
  }
  return (process.env.NEXT_PUBLIC_APP_URL || "http://127.0.0.1:3000").replace(/\/$/, "");
}

function str(v: string | number | null | undefined, fallback = "") {
  if (v == null) return fallback;
  return String(v);
}

/** Credentials / invite email after admin creates a login. */
export function notifyUserCredentials(input: {
  to: string;
  tenantId: string;
  companyName: string;
  userName: string;
  userEmail: string;
  password: string;
  roleLabel: string;
}) {
  if (!input.to || !input.password) return;
  queueTemplatedEmail({
    to: input.to,
    tenantId: input.tenantId,
    templateKey: EmailTemplateKey.UserCredentials,
    variables: {
      company_name: input.companyName,
      user_name: input.userName,
      user_email: input.userEmail,
      password: input.password,
      role_label: input.roleLabel,
      login_url: `${appBaseUrl()}/login`
    },
    meta: { event: "user.credentials" }
  });
}

export function notifyLeaveSubmitted(input: {
  to: string | string[];
  tenantId: string;
  employeeName: string;
  leaveType: string;
  startDate: string;
  endDate: string;
  totalDays: number | string;
  reason?: string | null;
}) {
  if (!input.to || (Array.isArray(input.to) && !input.to.length)) return;
  queueTemplatedEmail({
    to: input.to,
    tenantId: input.tenantId,
    templateKey: EmailTemplateKey.LeaveSubmitted,
    variables: {
      employee_name: input.employeeName,
      leave_type: input.leaveType,
      start_date: input.startDate,
      end_date: input.endDate,
      total_days: str(input.totalDays),
      reason: str(input.reason, "—"),
      action_url: `${appBaseUrl()}/hrm/leave`
    },
    meta: { event: "leave.submitted" }
  });
}

export function notifyLeaveDecision(input: {
  approved: boolean;
  to: string;
  tenantId: string;
  employeeName: string;
  leaveType: string;
  startDate: string;
  endDate: string;
  totalDays?: number | string;
  approverName: string;
}) {
  if (!input.to) return;
  queueTemplatedEmail({
    to: input.to,
    tenantId: input.tenantId,
    templateKey: input.approved ? EmailTemplateKey.LeaveApproved : EmailTemplateKey.LeaveRejected,
    variables: {
      employee_name: input.employeeName,
      leave_type: input.leaveType,
      start_date: input.startDate,
      end_date: input.endDate,
      total_days: str(input.totalDays, ""),
      approver_name: input.approverName
    },
    meta: { event: input.approved ? "leave.approved" : "leave.rejected" }
  });
}

export function notifyInvoiceGenerated(input: {
  to: string;
  tenantId: string;
  companyName: string;
  customerName: string;
  invoiceNo: string;
  invoiceDate: string;
  dueDate: string;
  totalAmount: number | string;
}) {
  if (!input.to) return;
  queueTemplatedEmail({
    to: input.to,
    tenantId: input.tenantId,
    templateKey: EmailTemplateKey.InvoiceGenerated,
    variables: {
      company_name: input.companyName,
      customer_name: input.customerName,
      invoice_no: input.invoiceNo,
      invoice_date: input.invoiceDate,
      due_date: input.dueDate,
      total_amount: str(input.totalAmount),
      invoice_url: `${appBaseUrl()}/sales/invoices`
    },
    meta: { event: "invoice.generated" }
  });
}

export function notifyOrderApproved(input: {
  to: string;
  tenantId: string;
  companyName: string;
  customerName: string;
  orderNo: string;
  totalAmount: number | string;
}) {
  if (!input.to) return;
  queueTemplatedEmail({
    to: input.to,
    tenantId: input.tenantId,
    templateKey: EmailTemplateKey.OrderApproved,
    variables: {
      company_name: input.companyName,
      customer_name: input.customerName,
      order_no: input.orderNo,
      total_amount: str(input.totalAmount),
      order_url: `${appBaseUrl()}/sales/orders`
    },
    meta: { event: "order.approved" }
  });
}

export function notifySurveyAssigned(input: {
  to: string;
  tenantId: string;
  employeeName: string;
  formName: string;
  dueDate?: string | null;
  message?: string | null;
}) {
  if (!input.to) return;
  queueTemplatedEmail({
    to: input.to,
    tenantId: input.tenantId,
    templateKey: EmailTemplateKey.SurveyAssigned,
    variables: {
      employee_name: input.employeeName,
      form_name: input.formName,
      due_date: str(input.dueDate, "No due date"),
      message: str(input.message, "Please complete this form in BusinessSuite HRM."),
      form_url: `${appBaseUrl()}/hrm/forms`
    },
    meta: { event: "survey.assigned" }
  });
}
