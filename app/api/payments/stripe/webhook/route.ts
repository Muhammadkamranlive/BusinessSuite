import { NextResponse } from "next/server";
import { createHmac, timingSafeEqual } from "crypto";
import { getSupabaseAdminClient, hasSecretKey } from "@/lib/supabase/server";

export const runtime = "nodejs";

function verifyStripeSignature(payload: string, header: string | null, secret: string) {
  if (!header) return false;
  const parts = Object.fromEntries(
    header.split(",").map((piece) => {
      const [k, v] = piece.split("=");
      return [k.trim(), v];
    })
  );
  const timestamp = parts.t;
  const signature = parts.v1;
  if (!timestamp || !signature) return false;
  const signed = createHmac("sha256", secret).update(`${timestamp}.${payload}`).digest("hex");
  try {
    return timingSafeEqual(Buffer.from(signed), Buffer.from(signature));
  } catch {
    return false;
  }
}

export async function POST(request: Request) {
  const secret = process.env.STRIPE_WEBHOOK_SECRET?.trim();
  const stripeKey = process.env.STRIPE_SECRET_KEY?.trim();
  if (!secret || !stripeKey) {
    return NextResponse.json({ ok: false, reason: "Stripe webhook not configured" }, { status: 503 });
  }

  const payload = await request.text();
  const valid = verifyStripeSignature(payload, request.headers.get("stripe-signature"), secret);
  if (!valid) {
    return NextResponse.json({ ok: false, reason: "Invalid signature" }, { status: 400 });
  }

  const event = JSON.parse(payload) as {
    type: string;
    data: { object: { id?: string; metadata?: Record<string, string>; payment_status?: string } };
  };

  if (
    (event.type === "checkout.session.completed" ||
      event.type === "invoice.payment_succeeded" ||
      event.type === "customer.subscription.updated") &&
    hasSecretKey()
  ) {
    const session = event.data.object;
    const txnId = session.metadata?.payment_txn_id;
    if (txnId) {
      const admin = getSupabaseAdminClient();
      await admin
        .from("hrm_payment_txns")
        .update({ status: "paid", reference: session.id ?? null })
        .eq("id", txnId);
    }
  }

  // SaaS subscription lifecycle — client also activates after Elements confirmPayment.
  if (
    event.type === "invoice.payment_succeeded" ||
    event.type === "customer.subscription.created" ||
    event.type === "customer.subscription.updated"
  ) {
    /* Local ERP stores subscription state in the browser; Elements success path activates. */
  }

  return NextResponse.json({ received: true });
}
