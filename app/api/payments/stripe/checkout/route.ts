import { NextResponse } from "next/server";
import { getSupabaseAdminClient, hasSecretKey } from "@/lib/supabase/server";
import { toDbTenantId } from "@/lib/tenants/ids";

export const runtime = "nodejs";

function stripeConfigured() {
  return Boolean(process.env.STRIPE_SECRET_KEY?.trim());
}

export async function POST(request: Request) {
  if (!stripeConfigured()) {
    return NextResponse.json(
      {
        ok: false,
        reason: "Add STRIPE_SECRET_KEY and NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY to .env.local"
      },
      { status: 503 }
    );
  }

  let body: {
    amount?: number;
    currency?: string;
    description?: string;
    tenantId?: string;
    paymentTxnId?: string;
    successUrl?: string;
    cancelUrl?: string;
  };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ ok: false, reason: "Invalid JSON" }, { status: 400 });
  }

  const amount = Number(body.amount);
  if (!amount || amount <= 0) {
    return NextResponse.json({ ok: false, reason: "amount must be > 0" }, { status: 400 });
  }

  const origin = new URL(request.url).origin;
  const successUrl = body.successUrl ?? `${origin}/hrm/payments?checkout=success`;
  const cancelUrl = body.cancelUrl ?? `${origin}/hrm/payments?checkout=cancel`;
  const unitAmount = Math.round(amount * 100);

  const params = new URLSearchParams();
  params.set("mode", "payment");
  params.set("success_url", `${successUrl}&session_id={CHECKOUT_SESSION_ID}`);
  params.set("cancel_url", cancelUrl);
  params.set("line_items[0][quantity]", "1");
  params.set("line_items[0][price_data][currency]", (body.currency ?? "pkr").toLowerCase());
  params.set("line_items[0][price_data][unit_amount]", String(unitAmount));
  params.set("line_items[0][price_data][product_data][name]", body.description ?? "HRM payment");
  if (body.tenantId) params.set("metadata[tenant_id]", toDbTenantId(body.tenantId));
  if (body.paymentTxnId) params.set("metadata[payment_txn_id]", body.paymentTxnId);

  const res = await fetch("https://api.stripe.com/v1/checkout/sessions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${process.env.STRIPE_SECRET_KEY!.trim()}`,
      "Content-Type": "application/x-www-form-urlencoded"
    },
    body: params
  });

  const data = (await res.json()) as { id?: string; url?: string; error?: { message?: string } };
  if (!res.ok || !data.url) {
    return NextResponse.json(
      { ok: false, reason: data.error?.message ?? "Stripe checkout session failed" },
      { status: 502 }
    );
  }

  if (hasSecretKey() && body.paymentTxnId) {
    try {
      const admin = getSupabaseAdminClient();
      await admin
        .from("hrm_payment_txns")
        .update({ reference: data.id, notes: "stripe_checkout" })
        .eq("id", body.paymentTxnId);
    } catch {
      /* local-only txn id is fine */
    }
  }

  return NextResponse.json({ ok: true, url: data.url, sessionId: data.id });
}
