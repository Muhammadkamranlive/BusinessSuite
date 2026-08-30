import { NextResponse } from "next/server";
import {
  appOrigin,
  ensurePackageProduct,
  resolveSubscriptionClientSecret,
  stripeConfigured,
  stripeForm
} from "@/lib/stripe/server";

export const runtime = "nodejs";

export async function GET() {
  return NextResponse.json({
    ok: true,
    configured: stripeConfigured(),
    publishableKey: process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY?.trim() ?? "",
    currencyDefault: "usd"
  });
}

/**
 * Creates a Stripe Customer + incomplete Subscription and returns
 * the invoice confirmation / PaymentIntent client_secret for Stripe Elements.
 */
export async function POST(request: Request) {
  let body: {
    email?: string;
    companyName?: string;
    tenantId?: string;
    localSubscriptionId?: string;
    packageCode?: string;
    packageName?: string;
    interval?: "month" | "year";
    amountCents?: number;
    currency?: string;
  };

  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ ok: false, reason: "Invalid JSON" }, { status: 400 });
  }

  const email = body.email?.trim();
  const amountCents = Number(body.amountCents);
  const interval = body.interval === "year" ? "year" : "month";
  const currency = (body.currency ?? "usd").toLowerCase();
  const packageName = body.packageName ?? body.packageCode ?? "BusinessSuite";

  if (!email || !amountCents || amountCents < 50) {
    return NextResponse.json({ ok: false, reason: "email and amountCents (>=50) required" }, { status: 400 });
  }

  if (!stripeConfigured()) {
    return NextResponse.json({
      ok: true,
      mock: true,
      clientSecret: null,
      message:
        "Stripe keys missing — demo activation mode. Set STRIPE_SECRET_KEY and NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY for live Elements."
    });
  }

  try {
    const customer = await stripeForm("customers", {
      email,
      name: body.companyName ?? email,
      "metadata[tenant_id]": body.tenantId ?? "",
      "metadata[local_subscription_id]": body.localSubscriptionId ?? "",
      "metadata[package_code]": body.packageCode ?? ""
    });

    const productId = await ensurePackageProduct(packageName, body.packageCode);

    const baseSubParams: Record<string, string | number> = {
      customer: String(customer.id),
      "items[0][price_data][currency]": currency,
      "items[0][price_data][unit_amount]": amountCents,
      "items[0][price_data][recurring][interval]": interval,
      "items[0][price_data][product]": productId,
      payment_behavior: "default_incomplete",
      collection_method: "charge_automatically",
      "payment_settings[save_default_payment_method]": "on_subscription",
      "payment_settings[payment_method_types][0]": "card",
      "expand[0]": "latest_invoice.confirmation_secret",
      "expand[1]": "latest_invoice.payment_intent",
      "metadata[tenant_id]": body.tenantId ?? "",
      "metadata[local_subscription_id]": body.localSubscriptionId ?? "",
      "metadata[package_code]": body.packageCode ?? "",
      "metadata[app_origin]": appOrigin(request)
    };

    let subscription: Record<string, unknown>;
    try {
      subscription = await stripeForm("subscriptions", {
        ...baseSubParams,
        "billing_mode[type]": "flexible"
      });
    } catch {
      // Older Stripe accounts may reject billing_mode — retry without it.
      subscription = await stripeForm("subscriptions", baseSubParams);
    }

    let resolved = await resolveSubscriptionClientSecret(subscription);

    // One more retrieve of the subscription with expands if needed.
    if (!resolved.clientSecret && subscription.id) {
      const refreshed = await stripeForm(
        `subscriptions/${subscription.id}`,
        {
          "expand[0]": "latest_invoice.confirmation_secret",
          "expand[1]": "latest_invoice.payment_intent"
        },
        "GET"
      );
      resolved = await resolveSubscriptionClientSecret(refreshed);
    }

    if (!resolved.clientSecret) {
      return NextResponse.json(
        {
          ok: false,
          reason:
            "No invoice confirmation secret from Stripe. Ensure the Stripe account Billing is enabled and API keys are from the same mode (test/live)."
        },
        { status: 502 }
      );
    }

    return NextResponse.json({
      ok: true,
      mock: false,
      clientSecret: resolved.clientSecret,
      customerId: customer.id,
      subscriptionId: subscription.id,
      paymentIntentId: resolved.paymentIntentId,
      invoiceId: resolved.invoiceId ?? null,
      productId,
      publishableKey: process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY?.trim()
    });
  } catch (err) {
    return NextResponse.json(
      { ok: false, reason: err instanceof Error ? err.message : "Stripe subscription failed" },
      { status: 502 }
    );
  }
}
