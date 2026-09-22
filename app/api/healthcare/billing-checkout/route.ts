import { NextResponse } from "next/server";
import { guardHealthcarePhiRoute } from "@/lib/auth/server/api-guard";
import { appOrigin, stripeConfigured, stripeForm } from "@/lib/stripe/server";
import { toDbTenantId } from "@/lib/tenants/ids";

export const runtime = "nodejs";

export async function POST(request: Request) {
  let body: {
    tenantId?: string;
    invoiceId?: string;
    amount?: number;
    currency?: string;
    description?: string;
    successUrl?: string;
    cancelUrl?: string;
  };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ ok: false, reason: "Invalid JSON" }, { status: 400 });
  }

  const guard = await guardHealthcarePhiRoute(request, body.tenantId);
  if (!guard.ok) return guard.response;

  const amount = Number(body.amount);
  if (!amount || amount <= 0) {
    return NextResponse.json({ ok: false, reason: "amount must be > 0" }, { status: 400 });
  }

  if (!stripeConfigured()) {
    return NextResponse.json(
      {
        ok: false,
        reason: "Add STRIPE_SECRET_KEY and NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY to .env.local"
      },
      { status: 503 }
    );
  }

  const origin = appOrigin(request);
  const successUrl = body.successUrl ?? `${origin}/healthcare/billing?checkout=success`;
  const cancelUrl = body.cancelUrl ?? `${origin}/healthcare/billing?checkout=cancel`;
  const unitAmount = Math.round(amount * 100);

  try {
    const data = await stripeForm("checkout/sessions", {
      mode: "payment",
      success_url: `${successUrl}&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: cancelUrl,
      "line_items[0][quantity]": 1,
      "line_items[0][price_data][currency]": (body.currency ?? "pkr").toLowerCase(),
      "line_items[0][price_data][unit_amount]": unitAmount,
      "line_items[0][price_data][product_data][name]": body.description ?? "HMS clinical invoice",
      "metadata[tenant_id]": body.tenantId ? toDbTenantId(body.tenantId) : undefined,
      "metadata[hms_invoice_id]": body.invoiceId
    });

    const url = String(data.url ?? "");
    const sessionId = String(data.id ?? "");
    if (!url) {
      return NextResponse.json({ ok: false, reason: "Stripe checkout session failed" }, { status: 502 });
    }

    return NextResponse.json({ ok: true, url, sessionId });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Stripe checkout failed";
    return NextResponse.json({ ok: false, reason: message }, { status: 502 });
  }
}
