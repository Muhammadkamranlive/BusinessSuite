"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { MktButton } from "@/components/marketing/mkt-button";
import { Button, Field, SelectInput } from "@/components/ui";
import {
  activateSubscription,
  formatMoney,
  getPackage,
  listPackages,
  listSeedPackages,
  priceFor,
  upsertTenantSubscription,
  type BillingInterval,
  type SubscriptionPackage
} from "@/modules/billing/services/subscriptions.store";
import { moduleLabel, platformAppLabel } from "@/lib/billing/module-catalog";
import {
  buildSignupSelection,
  readSignupAppSelection,
  clearSignupAppSelection
} from "@/lib/billing/signup-apps";
import { saveTenantAppLicense } from "@/modules/billing/services/tenant-apps.store";

type StripeLike = {
  elements: (opts: { clientSecret: string; appearance?: Record<string, unknown> }) => {
    create: (type: string, opts?: Record<string, unknown>) => { mount: (el: HTMLElement) => void; unmount: () => void };
    submit: () => Promise<{ error?: { message?: string } }>;
  };
  confirmPayment: (opts: {
    elements: unknown;
    redirect: "if_required";
    confirmParams: { return_url: string };
  }) => Promise<{ error?: { message?: string } }>;
};

declare global {
  interface Window {
    Stripe?: (key: string) => StripeLike;
  }
}

function loadStripeJs(): Promise<void> {
  if (typeof window === "undefined") return Promise.resolve();
  if (window.Stripe) return Promise.resolve();
  return new Promise((resolve, reject) => {
    const existing = document.querySelector<HTMLScriptElement>('script[data-bs-stripe="1"]');
    if (existing) {
      existing.addEventListener("load", () => resolve());
      existing.addEventListener("error", () => reject(new Error("Stripe.js failed to load")));
      return;
    }
    const script = document.createElement("script");
    script.src = "https://js.stripe.com/v3/";
    script.async = true;
    script.dataset.bsStripe = "1";
    script.onload = () => resolve();
    script.onerror = () => reject(new Error("Stripe.js failed to load"));
    document.head.appendChild(script);
  });
}

function ElementsPay({
  publishableKey,
  clientSecret,
  submitLabel,
  onPaid
}: {
  publishableKey: string;
  clientSecret: string;
  submitLabel: string;
  onPaid: () => void;
}) {
  const mountRef = useRef<HTMLDivElement>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [ready, setReady] = useState(false);
  const apiRef = useRef<{ stripe: StripeLike; elements: ReturnType<StripeLike["elements"]> } | null>(null);

  useEffect(() => {
    let cancelled = false;
    let paymentElement: { mount: (el: HTMLElement) => void; unmount: () => void } | null = null;

    (async () => {
      try {
        await loadStripeJs();
        if (cancelled || !window.Stripe || !mountRef.current) return;
        const stripe = window.Stripe(publishableKey);
        const elements = stripe.elements({
          clientSecret,
          appearance: { theme: "stripe", variables: { colorPrimary: "#1877f2", borderRadius: "8px" } }
        });
        paymentElement = elements.create("payment", { layout: "tabs" });
        paymentElement.mount(mountRef.current);
        apiRef.current = { stripe, elements };
        if (!cancelled) setReady(true);
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : "Could not load Stripe Elements");
      }
    })();

    return () => {
      cancelled = true;
      paymentElement?.unmount();
      apiRef.current = null;
    };
  }, [publishableKey, clientSecret]);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    const api = apiRef.current;
    if (!api) return;
    setBusy(true);
    setError("");
    const submitted = await api.elements.submit();
    if (submitted.error) {
      setBusy(false);
      setError(submitted.error.message ?? "Check your card details");
      return;
    }
    const result = await api.stripe.confirmPayment({
      elements: api.elements,
      redirect: "if_required",
      confirmParams: { return_url: `${window.location.origin}/settings/billing?paid=1` }
    });
    setBusy(false);
    if (result.error) {
      setError(result.error.message ?? "Payment failed");
      return;
    }
    onPaid();
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <div ref={mountRef} className="min-h-[180px] rounded-[var(--bs-radius)] border border-line bg-white p-3" />
      {error ? <p className="text-sm font-semibold text-rose-600">{error}</p> : null}
      <Button type="submit" className="w-full" disabled={!ready || busy}>
        {busy ? "Processing…" : submitLabel}
      </Button>
    </form>
  );
}

export function SubscriptionCheckout({
  tenantId,
  companyName,
  billingEmail,
  initialPackageId,
  initialInterval = "month",
  existingStripeSubscriptionId,
  onActivated
}: {
  tenantId: string;
  companyName: string;
  billingEmail: string;
  initialPackageId?: string;
  initialInterval?: BillingInterval;
  existingStripeSubscriptionId?: string | null;
  onActivated?: () => void;
}) {
  // Seed catalog for SSR/hydration; tenant-customized catalog swaps in after mount.
  const [packages, setPackages] = useState(() => listSeedPackages({ activeOnly: true }));
  useEffect(() => {
    setPackages(listPackages({ activeOnly: true }));
  }, []);
  const [packageId, setPackageId] = useState(initialPackageId ?? packages[1]?.id ?? packages[0]?.id ?? "");
  const [interval, setInterval] = useState<BillingInterval>(initialInterval);
  const [clientSecret, setClientSecret] = useState<string | null>(null);
  const [publishableKey, setPublishableKey] = useState("");
  const [localSubId, setLocalSubId] = useState<string | null>(null);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [mockMode, setMockMode] = useState(false);

  const [appSelection, setAppSelection] = useState(() => readSignupAppSelection());

  useEffect(() => {
    setAppSelection(readSignupAppSelection());
  }, []);

  const selected = getPackage(packageId) ?? packages.find((p) => p.id === packageId) ?? null;
  const effectiveApps = useMemo(() => {
    if (!selected) return null;
    if (appSelection && appSelection.tier === selected.code) return appSelection;
    return buildSignupSelection({ tier: selected.code, extraModules: selected.modules, platformApps: [] });
  }, [appSelection, selected]);

  const addonMonthly = effectiveApps?.addon_monthly_cents ?? 0;
  const baseAmount = selected ? priceFor(selected, interval) : 0;
  const amount = baseAmount + (interval === "year" ? addonMonthly * 12 : addonMonthly);

  useEffect(() => {
    fetch("/api/billing/config")
      .then((r) => r.json())
      .then((data: { publishableKey?: string; configured?: boolean }) => {
        if (data.publishableKey) setPublishableKey(data.publishableKey);
        if (!data.configured) setMockMode(true);
      })
      .catch(() => setMockMode(true));
  }, []);

  function persistAppLicense(subId: string) {
    if (!selected || !effectiveApps) return;
    saveTenantAppLicense({
      tenant_id: tenantId,
      subscription_id: subId,
      package_code: selected.code,
      modules: effectiveApps.modules,
      platform_apps: effectiveApps.platform_apps,
      addon_monthly_cents: effectiveApps.addon_monthly_cents
    });
    clearSignupAppSelection();
  }

  async function startCheckout() {
    if (!selected) return;
    setLoading(true);
    setError("");
    setMessage("");
    setClientSecret(null);

    const local = upsertTenantSubscription({
      tenant_id: tenantId,
      company_name: companyName,
      package_id: selected.id,
      package_code: selected.code,
      interval,
      billing_email: billingEmail,
      amount_cents: amount,
      currency: selected.currency,
      status: "incomplete"
    });
    setLocalSubId(local.id);

    const updating = Boolean(existingStripeSubscriptionId);
    const endpoint = updating ? "/api/billing/update-subscription" : "/api/billing/create-subscription";
    const payload = updating
      ? {
          stripeSubscriptionId: existingStripeSubscriptionId,
          packageName: selected.name,
          packageCode: selected.code,
          interval,
          amountCents: amount,
          currency: selected.currency,
          tenantId,
          localSubscriptionId: local.id
        }
      : {
          email: billingEmail,
          companyName,
          tenantId,
          localSubscriptionId: local.id,
          packageCode: selected.code,
          packageName: selected.name,
          interval,
          amountCents: amount,
          currency: selected.currency
        };

    try {
      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });
      const data = (await res.json()) as {
        ok?: boolean;
        mock?: boolean;
        clientSecret?: string | null;
        customerId?: string;
        subscriptionId?: string;
        paymentIntentId?: string;
        publishableKey?: string;
        reason?: string;
        message?: string;
      };

      if (!res.ok || !data.ok) {
        setError(data.reason ?? "Could not start subscription");
        setLoading(false);
        return;
      }

      if (data.mock || !data.clientSecret) {
        setMockMode(true);
        activateSubscription(local.id);
        persistAppLicense(local.id);
        setMessage(data.message ?? "Demo subscription activated (add Stripe keys for live Elements).");
        onActivated?.();
        setLoading(false);
        return;
      }

      if (data.publishableKey) setPublishableKey(data.publishableKey);

      upsertTenantSubscription({
        ...local,
        stripe_customer_id: data.customerId,
        stripe_subscription_id: data.subscriptionId,
        stripe_payment_intent_id: data.paymentIntentId
      });

      if (!data.clientSecret && updating) {
        activateSubscription(local.id, {
          stripe_subscription_id: data.subscriptionId ?? existingStripeSubscriptionId
        });
        persistAppLicense(local.id);
        setMessage("Package updated on Stripe.");
        onActivated?.();
        setLoading(false);
        return;
      }

      setClientSecret(data.clientSecret ?? null);
      setMessage("Enter card details below to activate your subscription.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Network error");
    } finally {
      setLoading(false);
    }
  }

  function finishPaid() {
    if (localSubId) {
      activateSubscription(localSubId);
      persistAppLicense(localSubId);
    }
    setMessage("Payment successful — subscription active.");
    setClientSecret(null);
    onActivated?.();
  }

  return (
    <div className="space-y-5">
      <div className="grid gap-4 md:grid-cols-2">
        <Field label="Package">
          <SelectInput value={packageId} onChange={(e) => setPackageId(e.target.value)}>
            {packages.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name} — {formatMoney(priceFor(p, interval), p.currency)}/{interval === "year" ? "yr" : "mo"}
              </option>
            ))}
          </SelectInput>
        </Field>
        <Field label="Billing cycle">
          <SelectInput value={interval} onChange={(e) => setInterval(e.target.value as BillingInterval)}>
            <option value="month">Monthly</option>
            <option value="year">Yearly (save ~2 months)</option>
          </SelectInput>
        </Field>
      </div>

      {selected ? <PackageSummary pkg={selected} interval={interval} appSelection={effectiveApps} addonMonthly={addonMonthly} /> : null}

      {error ? <p className="rounded-md border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">{error}</p> : null}
      {message ? <p className="rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-800">{message}</p> : null}

      {!clientSecret ? (
        <Button className="w-full sm:w-auto" disabled={loading || !selected} onClick={startCheckout}>
          {loading
            ? "Preparing secure payment…"
            : mockMode
              ? `Activate ${selected?.name ?? "plan"} (demo)`
              : existingStripeSubscriptionId
                ? "Update package & pay difference"
                : `Subscribe — ${formatMoney(amount, selected?.currency ?? "usd")}/${interval === "year" ? "yr" : "mo"}`}
        </Button>
      ) : publishableKey ? (
        <ElementsPay
          publishableKey={publishableKey}
          clientSecret={clientSecret}
          submitLabel={`Pay ${formatMoney(amount, selected?.currency ?? "usd")} securely`}
          onPaid={finishPaid}
        />
      ) : null}

      <p className="text-xs text-slate-500">
        Card details are processed securely. We never store full card numbers.
        {mockMode ? " Demonstration billing is on for this environment." : null}
      </p>
    </div>
  );
}

function PackageSummary({
  pkg,
  interval,
  appSelection,
  addonMonthly
}: {
  pkg: SubscriptionPackage;
  interval: BillingInterval;
  appSelection?: ReturnType<typeof readSignupAppSelection>;
  addonMonthly?: number;
}) {
  const extraModules =
    appSelection?.modules.filter((m) => !pkg.modules.includes(m)) ?? [];
  const platformApps = appSelection?.platform_apps ?? [];
  return (
    <div className="rounded-[var(--bs-radius)] border border-line bg-cloud p-4">
      <div className="flex flex-wrap items-end justify-between gap-2">
        <div>
          <p className="text-xs font-bold uppercase tracking-wide text-teal">{pkg.badge}</p>
          <p className="text-lg font-bold text-ink">{pkg.name}</p>
          <p className="text-sm text-slate-500">{pkg.tagline}</p>
        </div>
        <p className="text-2xl font-bold text-ink">
          {formatMoney(priceFor(pkg, interval) + (interval === "year" ? (addonMonthly ?? 0) * 12 : addonMonthly ?? 0), pkg.currency)}
          <span className="text-sm font-semibold text-slate-500">/{interval === "year" ? "year" : "month"}</span>
        </p>
      </div>
      {addonMonthly ? (
        <p className="mt-2 text-sm text-slate-600">
          Includes {formatMoney(addonMonthly, pkg.currency)}/mo in extra apps (
          {extraModules.length} business + {platformApps.length} platform)
        </p>
      ) : null}
      {extraModules.length ? (
        <p className="mt-2 text-xs text-slate-500">
          Add-on modules: {extraModules.map(moduleLabel).join(", ")}
        </p>
      ) : null}
      {platformApps.length ? (
        <p className="mt-1 text-xs text-slate-500">
          Platform apps: {platformApps.map(platformAppLabel).join(", ")}
        </p>
      ) : null}
      <ul className="mt-3 grid gap-1 sm:grid-cols-2">
        {pkg.features.map((f) => (
          <li key={f} className="text-sm text-slate-600">
            · {f}
          </li>
        ))}
      </ul>
    </div>
  );
}

export function PricingCards({
  interval,
  onSelect,
  appearance = "app"
}: {
  interval: BillingInterval;
  onSelect?: (pkg: SubscriptionPackage, interval: BillingInterval) => void;
  appearance?: "app" | "marketing";
}) {
  // Server + first client render use the deterministic seed catalog to avoid a
  // hydration mismatch; the tenant-customized catalog (localStorage) loads after mount.
  const [packages, setPackages] = useState<SubscriptionPackage[]>(() => listSeedPackages({ activeOnly: true }));
  useEffect(() => {
    setPackages(listPackages({ activeOnly: true }));
  }, []);
  const marketing = appearance === "marketing";
  return (
    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
      {packages.map((pkg) => (
        <article
          key={pkg.id}
          className={`flex flex-col rounded-[var(--bs-radius)] border bg-white p-5 shadow-soft ${
            pkg.code === "professional"
              ? marketing
                ? "mkt-plan-featured border-[color:var(--bs-ink)] ring-2 ring-[color:var(--bs-ink)]/10"
                : "border-ink ring-2 ring-ink/10"
              : pkg.highlighted
              ? marketing
                ? "mkt-plan-featured border-[color:var(--bs-teal)] ring-2 ring-[color:var(--bs-teal)]/15"
                : "border-teal ring-2 ring-teal/20"
              : "border-line"
          }`}
        >
          <p className={`text-xs font-bold uppercase tracking-wide ${marketing ? "text-[color:var(--bs-teal)]" : "text-teal"}`}>{pkg.badge}</p>
          <h3 className={`mt-1 text-xl ${marketing ? "font-semibold text-[#0a2540]" : "font-bold text-ink"}`}>{pkg.name}</h3>
          <p className="mt-1 text-sm text-slate-500">{pkg.tagline}</p>
          <p className={`mt-4 text-3xl ${marketing ? "font-semibold tracking-tight text-[#0a2540]" : "font-bold text-ink"}`}>
            {formatMoney(priceFor(pkg, interval), pkg.currency)}
            <span className="text-sm font-semibold text-slate-500">/{interval === "year" ? "yr" : "mo"}</span>
          </p>
          {pkg.code === "professional" ? (
            <p className="mt-2 text-xs font-semibold uppercase tracking-[0.12em] text-[color:var(--bs-teal)]">
              Dedicated DB · domain · stack
            </p>
          ) : null}
          <p className="mt-1 text-xs text-slate-500">
            {interval === "year"
              ? `${formatMoney(pkg.monthly_price_cents, pkg.currency)}/mo billed yearly`
              : `or ${formatMoney(pkg.yearly_price_cents, pkg.currency)}/year`}
          </p>
          <p className="mt-2 text-[11px] font-semibold uppercase tracking-wide text-slate-500">
            {pkg.modules.length} apps in base · add more with pay per app
          </p>
          <div className="mt-2 flex flex-wrap gap-1">
            {pkg.modules.slice(0, 6).map((m) => (
              <span key={m} className="rounded-full bg-[color:var(--bs-cloud)] px-2 py-0.5 text-[10px] font-semibold text-slate-600">
                {moduleLabel(m)}
              </span>
            ))}
            {pkg.modules.length > 6 ? (
              <span className="rounded-full bg-[color:var(--bs-cloud)] px-2 py-0.5 text-[10px] font-semibold text-slate-600">
                +{pkg.modules.length - 6} more
              </span>
            ) : null}
          </div>
          {marketing ? (
            <Link
              href="#build-your-plan"
              className="mt-3 block text-center text-xs font-semibold text-[color:var(--bs-teal)] hover:underline"
            >
              + Add Email Engine, Rule Engine, or extra modules
            </Link>
          ) : null}
          <ul className="mt-4 flex-1 space-y-2">
            {pkg.features.map((f) => (
              <li key={f} className="text-sm text-slate-600">
                {f}
              </li>
            ))}
          </ul>
          {onSelect ? (
            marketing ? (
              <MktButton
                className="mt-5 w-full"
                variant={pkg.highlighted ? "primary" : "secondary"}
                onClick={() => onSelect(pkg, interval)}
              >
                Choose {pkg.name}
              </MktButton>
            ) : (
              <Button className="mt-5 w-full" variant={pkg.highlighted ? "primary" : "secondary"} onClick={() => onSelect(pkg, interval)}>
                Choose {pkg.name}
              </Button>
            )
          ) : null}
        </article>
      ))}
    </div>
  );
}

export type { BillingInterval };
