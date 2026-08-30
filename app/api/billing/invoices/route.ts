import { NextResponse } from "next/server";
import { stripeConfigured, stripeForm } from "@/lib/stripe/server";

export const runtime = "nodejs";

/** List Stripe invoices for a customer (subscription receipts). */
export async function POST(request: Request) {
  let body: { customerId?: string; limit?: number };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ ok: false, reason: "Invalid JSON" }, { status: 400 });
  }

  const customerId = body.customerId?.trim();
  if (!customerId) {
    return NextResponse.json({ ok: false, reason: "customerId required" }, { status: 400 });
  }

  if (!stripeConfigured()) {
    return NextResponse.json({ ok: true, mock: true, invoices: [] });
  }

  try {
    const result = await stripeForm(
      "invoices",
      {
        customer: customerId,
        limit: Math.min(Math.max(Number(body.limit) || 20, 1), 50)
      },
      "GET"
    );

    const rows = ((result.data as Array<Record<string, unknown>>) ?? []).map((inv) => ({
      id: String(inv.id ?? ""),
      number: (inv.number as string | null) ?? String(inv.id ?? ""),
      status: String(inv.status ?? "open"),
      amount_paid: Number(inv.amount_paid ?? 0),
      amount_due: Number(inv.amount_due ?? 0),
      currency: String(inv.currency ?? "usd"),
      created: Number(inv.created ?? 0),
      period_start: Number(inv.period_start ?? 0),
      period_end: Number(inv.period_end ?? 0),
      hosted_invoice_url: (inv.hosted_invoice_url as string | null) ?? null,
      invoice_pdf: (inv.invoice_pdf as string | null) ?? null
    }));

    return NextResponse.json({ ok: true, mock: false, invoices: rows });
  } catch (err) {
    return NextResponse.json(
      { ok: false, reason: err instanceof Error ? err.message : "Failed to list invoices" },
      { status: 502 }
    );
  }
}
