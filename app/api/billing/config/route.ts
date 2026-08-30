import { NextResponse } from "next/server";
import { stripeConfigured } from "@/lib/stripe/server";

export const runtime = "nodejs";

export async function GET() {
  return NextResponse.json({
    ok: true,
    configured: stripeConfigured(),
    publishableKey: process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY?.trim() ?? ""
  });
}
