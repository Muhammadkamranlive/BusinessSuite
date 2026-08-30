export function stripeConfigured() {
  return Boolean(process.env.STRIPE_SECRET_KEY?.trim() && process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY?.trim());
}

export function stripeSecret() {
  const key = process.env.STRIPE_SECRET_KEY?.trim();
  if (!key) throw new Error("STRIPE_SECRET_KEY is not configured");
  return key;
}

export function appOrigin(request: Request) {
  return process.env.NEXT_PUBLIC_APP_URL?.trim() || new URL(request.url).origin;
}

/** Stripe form-encoded REST helper (Elements / PaymentIntent — not Checkout). */
export async function stripeForm(
  path: string,
  params: Record<string, string | number | undefined | null> = {},
  method: "POST" | "GET" = "POST"
) {
  const body = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value === undefined || value === null || value === "") continue;
    body.append(key, String(value));
  }

  const url =
    method === "GET" && [...body.keys()].length
      ? `https://api.stripe.com/v1/${path}?${body.toString()}`
      : `https://api.stripe.com/v1/${path}`;

  const res = await fetch(url, {
    method,
    headers: {
      Authorization: `Bearer ${stripeSecret()}`,
      ...(method === "POST" ? { "Content-Type": "application/x-www-form-urlencoded" } : {})
    },
    body: method === "POST" ? body : undefined
  });

  const data = (await res.json()) as Record<string, unknown> & {
    error?: { message?: string };
    id?: string;
    client_secret?: string;
  };

  if (!res.ok) {
    throw new Error(data.error?.message ?? `Stripe ${path} failed`);
  }
  return data;
}

/**
 * Subscriptions price_data requires an existing Product id (not product_data).
 * Find-or-create a BusinessSuite package product in Stripe.
 */
export async function ensurePackageProduct(packageName: string, packageCode?: string) {
  const displayName = `BusinessSuite ERP — ${packageName}`;
  const code = (packageCode ?? packageName).toLowerCase().replace(/[^a-z0-9_-]/g, "_");

  try {
    const found = await stripeForm(
      "products/search",
      {
        query: `active:'true' AND metadata['bs_package_code']:'${code}'`,
        limit: 1
      },
      "GET"
    );
    const rows = (found.data as Array<{ id?: string }> | undefined) ?? [];
    if (rows[0]?.id) return String(rows[0].id);
  } catch {
    /* Search may be unavailable on some accounts — fall through to create */
  }

  const created = await stripeForm("products", {
    name: displayName,
    "metadata[bs_package_code]": code,
    "metadata[bs_package_name]": packageName
  });
  return String(created.id);
}

type SecretSource = {
  clientSecret: string | null;
  paymentIntentId: string | null;
};

/** Basil+ API: confirmation_secret; older API: payment_intent.client_secret */
export function clientSecretFromInvoice(invoice: unknown): SecretSource {
  if (!invoice || typeof invoice === "string") {
    return { clientSecret: null, paymentIntentId: null };
  }
  const inv = invoice as {
    id?: string;
    confirmation_secret?: { client_secret?: string; type?: string } | null;
    payment_intent?: { client_secret?: string; id?: string } | string | null;
  };

  if (inv.confirmation_secret?.client_secret) {
    return {
      clientSecret: inv.confirmation_secret.client_secret,
      paymentIntentId: inv.confirmation_secret.client_secret.split("_secret_")[0] ?? null
    };
  }

  const pi = inv.payment_intent;
  if (pi && typeof pi !== "string" && pi.client_secret) {
    return { clientSecret: pi.client_secret, paymentIntentId: pi.id ?? null };
  }

  return { clientSecret: null, paymentIntentId: null };
}

/**
 * Resolve Elements client_secret for an incomplete subscription invoice.
 * Supports Stripe API Basil (confirmation_secret) and legacy payment_intent.
 */
export async function resolveSubscriptionClientSecret(subscription: Record<string, unknown>): Promise<SecretSource & { invoiceId?: string }> {
  let secret = clientSecretFromInvoice(subscription.latest_invoice);
  if (secret.clientSecret) return secret;

  const invId =
    typeof subscription.latest_invoice === "string"
      ? subscription.latest_invoice
      : (subscription.latest_invoice as { id?: string } | undefined)?.id;

  if (!invId) return secret;

  // Expand confirmation_secret (new) and payment_intent (legacy).
  let invoice = await stripeForm(
    `invoices/${invId}`,
    {
      "expand[0]": "confirmation_secret",
      "expand[1]": "payment_intent"
    },
    "GET"
  );
  secret = clientSecretFromInvoice(invoice);
  if (secret.clientSecret) return { ...secret, invoiceId: invId };

  // Draft invoices may need finalize before a secret exists.
  if (invoice.status === "draft") {
    invoice = await stripeForm(`invoices/${invId}/finalize`, {
      "expand[0]": "confirmation_secret",
      "expand[1]": "payment_intent"
    });
    secret = clientSecretFromInvoice(invoice);
  }

  return { ...secret, invoiceId: invId };
}
