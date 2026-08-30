import { NextResponse } from "next/server";
import {
  ensurePackageProduct,
  resolveSubscriptionClientSecret,
  stripeConfigured,
  stripeForm
} from "@/lib/stripe/server";

export const runtime = "nodejs";

/** Change plan on an existing Stripe subscription (proration). */
export async function POST(request: Request) {
  let body: {
    stripeSubscriptionId?: string;
    packageName?: string;
    interval?: "month" | "year";
    amountCents?: number;
    currency?: string;
    packageCode?: string;
    tenantId?: string;
    localSubscriptionId?: string;
  };

  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ ok: false, reason: "Invalid JSON" }, { status: 400 });
  }

  const amountCents = Number(body.amountCents);
  const interval = body.interval === "year" ? "year" : "month";
  const currency = (body.currency ?? "usd").toLowerCase();
  const packageName = body.packageName ?? body.packageCode ?? "BusinessSuite";

  if (!body.stripeSubscriptionId || !amountCents) {
    return NextResponse.json({ ok: false, reason: "stripeSubscriptionId and amountCents required" }, { status: 400 });
  }

  if (!stripeConfigured()) {
    return NextResponse.json({
      ok: true,
      mock: true,
      message: "Stripe not configured — local package update only."
    });
  }

  try {
    const current = await stripeForm(`subscriptions/${body.stripeSubscriptionId}`, {}, "GET");
    const items = (current.items as { data?: Array<{ id: string }> } | undefined)?.data ?? [];
    const itemId = items[0]?.id;
    if (!itemId) {
      return NextResponse.json({ ok: false, reason: "Subscription has no items" }, { status: 400 });
    }

    const productId = await ensurePackageProduct(packageName, body.packageCode);

    const updated = await stripeForm(`subscriptions/${body.stripeSubscriptionId}`, {
      "items[0][id]": itemId,
      "items[0][price_data][currency]": currency,
      "items[0][price_data][unit_amount]": amountCents,
      "items[0][price_data][recurring][interval]": interval,
      "items[0][price_data][product]": productId,
      proration_behavior: "create_prorations",
      payment_behavior: "pending_if_incomplete",
      "billing_mode[type]": "flexible",
      "expand[0]": "latest_invoice.confirmation_secret",
      "expand[1]": "latest_invoice.payment_intent",
      "metadata[package_code]": body.packageCode ?? "",
      "metadata[tenant_id]": body.tenantId ?? "",
      "metadata[local_subscription_id]": body.localSubscriptionId ?? ""
    });

    const resolved = await resolveSubscriptionClientSecret(updated);

    return NextResponse.json({
      ok: true,
      mock: false,
      subscriptionId: updated.id,
      clientSecret: resolved.clientSecret,
      status: updated.status,
      productId,
      publishableKey: process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY?.trim()
    });
  } catch (err) {
    return NextResponse.json(
      { ok: false, reason: err instanceof Error ? err.message : "Update failed" },
      { status: 502 }
    );
  }
}
