export type PayoutProvider = "ach" | "stripe" | "paypal" | "wise";

export const PAYOUT_PROVIDERS: Array<{
  id: PayoutProvider;
  label: string;
  hint: string;
}> = [
  {
    id: "ach",
    label: "ACH Direct Deposit",
    hint: "US bank ACH credit — simulated for demo (always works)"
  },
  {
    id: "stripe",
    label: "Stripe",
    hint: "Creates a test Payment under Stripe Dashboard → Payments (Test mode) — not under Payouts"
  },
  {
    id: "paypal",
    label: "PayPal Payouts",
    hint: "Simulated PayPal mass-pay / payout to employee"
  },
  {
    id: "wise",
    label: "Wise",
    hint: "Simulated Wise USD transfer to employee bank"
  }
];

export type PayoutRequest = {
  provider: PayoutProvider;
  amount: number;
  currency?: string;
  paymentTxnId: string;
  tenantId: string;
  employeeName: string;
  employeeId?: string;
  bankName?: string | null;
  bankAccount?: string | null;
  purpose?: string;
};

export type PayoutResult = {
  ok: boolean;
  provider: PayoutProvider;
  reference: string;
  message: string;
  rawId?: string;
  /** Stripe Dashboard deep link (test mode Payments). */
  dashboardUrl?: string;
};

function ref(prefix: string) {
  const stamp = new Date().toISOString().replace(/\D/g, "").slice(0, 14);
  const rand = Math.random().toString(36).slice(2, 8).toUpperCase();
  return `${prefix}-${stamp}-${rand}`;
}

async function payoutAch(req: PayoutRequest): Promise<PayoutResult> {
  await new Promise((r) => setTimeout(r, 400));
  const reference = ref("ACH");
  return {
    ok: true,
    provider: "ach",
    reference,
    message: `ACH credit queued to ${req.bankName ?? "US bank"} ${req.bankAccount ?? ""}`.trim(),
    rawId: reference
  };
}

async function payoutPayPal(req: PayoutRequest): Promise<PayoutResult> {
  await new Promise((r) => setTimeout(r, 500));
  const reference = ref("PP");
  return {
    ok: true,
    provider: "paypal",
    reference,
    message: `PayPal demo payout to ${req.employeeName}`,
    rawId: reference
  };
}

async function payoutWise(req: PayoutRequest): Promise<PayoutResult> {
  await new Promise((r) => setTimeout(r, 500));
  const reference = ref("WISE");
  return {
    ok: true,
    provider: "wise",
    reference,
    message: `Wise demo USD transfer to ${req.employeeName}`,
    rawId: reference
  };
}

type StripeJson = {
  id?: string;
  status?: string;
  error?: { message?: string; code?: string; type?: string };
};

/** Stripe test-mode demo receipt — appears under Dashboard → Payments (Test mode). */
async function payoutStripe(req: PayoutRequest): Promise<PayoutResult> {
  const secret = process.env.STRIPE_SECRET_KEY?.trim();
  if (!secret) {
    return {
      ok: false,
      provider: "stripe",
      reference: "",
      message: "STRIPE_SECRET_KEY missing in .env.local"
    };
  }

  if (!secret.startsWith("sk_test_")) {
    return {
      ok: false,
      provider: "stripe",
      reference: "",
      message: "Use a Stripe test secret key (sk_test_…) for demo payouts."
    };
  }

  // Small reliable test charge; full payroll amount stays in metadata.
  const payoutAmountUsd = Number(req.amount) || 0;
  const chargeCents = Math.min(Math.max(Math.round(Math.min(payoutAmountUsd, 50) * 100), 50), 5000);
  const description = `HRM demo payout → ${req.employeeName}`.slice(0, 900);

  async function postForm(path: string, params: URLSearchParams) {
    const res = await fetch(`https://api.stripe.com/v1/${path}`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${secret}`,
        "Content-Type": "application/x-www-form-urlencoded"
      },
      body: params
    });
    const data = (await res.json()) as StripeJson;
    return { res, data };
  }

  function dashboardUrlFor(id: string) {
    // Charges (ch_) and PaymentIntents (pi_) both open under Payments in test mode.
    return `https://dashboard.stripe.com/test/payments/${id}`;
  }

  try {
    // Prefer Charges + tok_visa — shows immediately under Payments (Succeeded).
    const chargeParams = new URLSearchParams();
    chargeParams.set("amount", String(chargeCents));
    chargeParams.set("currency", "usd");
    chargeParams.set("source", "tok_visa");
    chargeParams.set("description", description);
    chargeParams.set("metadata[hrm_demo_payout]", "true");
    chargeParams.set("metadata[payment_txn_id]", req.paymentTxnId);
    chargeParams.set("metadata[tenant_id]", req.tenantId);
    chargeParams.set("metadata[employee_name]", req.employeeName.slice(0, 400));
    chargeParams.set("metadata[payout_amount_usd]", String(payoutAmountUsd));
    if (req.bankAccount) chargeParams.set("metadata[bank_account]", String(req.bankAccount).slice(0, 100));
    if (req.bankName) chargeParams.set("metadata[bank_name]", String(req.bankName).slice(0, 100));
    if (req.purpose) chargeParams.set("metadata[purpose]", String(req.purpose).slice(0, 100));

    let { res, data } = await postForm("charges", chargeParams);
    const firstError = data.error?.message ?? "";

    if (!res.ok || !data.id) {
      const appUrl =
        process.env.NEXT_PUBLIC_APP_URL?.trim() ||
        process.env.NEXT_PUBLIC_SITE_URL?.trim() ||
        "http://127.0.0.1:3000";
      const piParams = new URLSearchParams();
      piParams.set("amount", String(chargeCents));
      piParams.set("currency", "usd");
      piParams.append("payment_method_types[]", "card");
      piParams.set("payment_method", "pm_card_visa");
      piParams.set("confirm", "true");
      piParams.set("off_session", "true");
      piParams.set("return_url", `${appUrl.replace(/\/$/, "")}/hrm/payments?stripe=return`);
      piParams.set("description", description);
      piParams.set("metadata[hrm_demo_payout]", "true");
      piParams.set("metadata[payment_txn_id]", req.paymentTxnId);
      piParams.set("metadata[payout_amount_usd]", String(payoutAmountUsd));
      ({ res, data } = await postForm("payment_intents", piParams));
    }

    if (!res.ok || !data.id) {
      return {
        ok: false,
        provider: "stripe",
        reference: "",
        message:
          data.error?.message ||
          firstError ||
          "Stripe payout failed. Confirm STRIPE_SECRET_KEY is sk_test_… and you are viewing Test mode."
      };
    }

    const link = dashboardUrlFor(String(data.id));
    return {
      ok: true,
      provider: "stripe",
      reference: String(data.id),
      rawId: String(data.id),
      dashboardUrl: link,
      message: `Stripe test payment ${data.id} (${data.status ?? "succeeded"}). Open Payments (Test mode) — not Payouts.`
    };
  } catch (err) {
    return {
      ok: false,
      provider: "stripe",
      reference: "",
      message: err instanceof Error ? `Stripe network error: ${err.message}` : "Stripe network error"
    };
  }
}

export async function executeDemoPayout(req: PayoutRequest): Promise<PayoutResult> {
  if (!req.amount || req.amount <= 0) {
    return { ok: false, provider: req.provider, reference: "", message: "Amount must be greater than zero" };
  }

  switch (req.provider) {
    case "stripe":
      return payoutStripe(req);
    case "paypal":
      return payoutPayPal(req);
    case "wise":
      return payoutWise(req);
    case "ach":
    default:
      return payoutAch(req);
  }
}
