import { NextResponse } from "next/server";
import { executeDemoPayout, type PayoutProvider } from "@/modules/hrm/services/payout-providers";

export const runtime = "nodejs";

export async function POST(request: Request) {
  let body: {
    provider?: PayoutProvider;
    amount?: number;
    currency?: string;
    paymentTxnId?: string;
    tenantId?: string;
    employeeName?: string;
    employeeId?: string;
    bankName?: string | null;
    bankAccount?: string | null;
    purpose?: string;
  };

  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ ok: false, message: "Invalid JSON" }, { status: 400 });
  }

  if (!body.provider || !body.paymentTxnId || !body.tenantId || !body.employeeName) {
    return NextResponse.json(
      { ok: false, message: "provider, paymentTxnId, tenantId, and employeeName are required" },
      { status: 400 }
    );
  }

  const result = await executeDemoPayout({
    provider: body.provider,
    amount: Number(body.amount) || 0,
    currency: body.currency,
    paymentTxnId: body.paymentTxnId,
    tenantId: body.tenantId,
    employeeName: body.employeeName,
    employeeId: body.employeeId,
    bankName: body.bankName,
    bankAccount: body.bankAccount,
    purpose: body.purpose
  });

  return NextResponse.json(result, { status: result.ok ? 200 : 502 });
}
