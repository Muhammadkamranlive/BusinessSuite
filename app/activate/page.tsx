"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { CreditCard, LogOut, ShieldCheck } from "lucide-react";
import { SubscriptionCheckout } from "@/components/billing/subscription-checkout";
import { Button, Panel } from "@/components/ui";
import { findAccountByEmail } from "@/lib/auth/public-auth";
import { clearDemoSession, getStoredTenantId, getStoredUserEmail } from "@/lib/auth/session";
import { listAdminTenants } from "@/modules/admin/services/admin.store";
import { applyDesignTokens, fetchDesignTokens } from "@/lib/design-tokens";
import {
  getActiveSubscription,
  isTenantActivated,
  listPackages
} from "@/modules/billing/services/subscriptions.store";

export default function ActivateAccountPage() {
  const router = useRouter();
  const [ready, setReady] = useState(false);
  const [tenantId, setTenantId] = useState("");
  const [email, setEmail] = useState("");
  const [companyName, setCompanyName] = useState("Your company");
  const [tick, setTick] = useState(0);

  useEffect(() => {
    fetchDesignTokens().then(applyDesignTokens);
    const storedEmail = getStoredUserEmail();
    const storedTenant = getStoredTenantId();
    if (!storedEmail) {
      router.replace("/login?redirect=/activate");
      return;
    }
    const account = findAccountByEmail(storedEmail);
    const tid = storedTenant || account?.tenantId || "";
    if (!tid) {
      router.replace("/signup");
      return;
    }
    if (isTenantActivated(tid)) {
      router.replace("/dashboard");
      return;
    }
    const tenant = listAdminTenants().find((t) => t.id === tid);
    setTenantId(tid);
    setEmail(storedEmail);
    setCompanyName(tenant?.name ?? account?.name ?? "Your company");
    setReady(true);
  }, [router, tick]);

  const packages = useMemo(() => listPackages({ activeOnly: true }), [tick]);
  const active = tenantId ? getActiveSubscription(tenantId) : null;

  function logout() {
    clearDemoSession();
    router.push("/login");
  }

  if (!ready) {
    return (
      <main className="flex min-h-[100dvh] items-center justify-center bg-[color:var(--bs-cloud)] px-4">
        <p className="text-sm font-semibold text-slate-500">Checking subscription…</p>
      </main>
    );
  }

  return (
    <main className="min-h-[100dvh] bg-[color:var(--bs-cloud)] px-4 py-8 pb-[max(2rem,env(safe-area-inset-bottom))] pt-[max(2rem,env(safe-area-inset-top))] sm:px-6">
      <div className="mx-auto flex max-w-3xl flex-col gap-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-xs font-bold uppercase tracking-wide text-teal">Account activation</p>
            <h1 className="text-2xl font-bold text-ink sm:text-3xl">Pay to unlock BusinessSuite ERP</h1>
            <p className="mt-1 text-sm text-slate-500">
              {companyName} · {email}. Choose Silver, Gold, Platinum, or Professional and complete payment with Stripe Elements.
            </p>
          </div>
          <Button variant="ghost" onClick={logout}>
            <LogOut className="size-4" /> Sign out
          </Button>
        </div>

        <Panel className="border-teal/30 bg-teal-50/40 p-4">
          <div className="flex gap-3">
            <ShieldCheck className="mt-0.5 size-5 shrink-0 text-teal" />
            <div className="text-sm text-slate-700">
              <p className="font-semibold text-ink">ERP access is locked until subscription is active.</p>
              <p className="mt-1">
                Packages available: {packages.map((p) => p.name).join(", ")}. Monthly and yearly billing supported.
                Card details are collected on this page — Stripe Checkout redirect is not used.
              </p>
            </div>
          </div>
        </Panel>

        <Panel className="p-5 sm:p-6">
          <div className="mb-5 flex items-center gap-2">
            <CreditCard className="size-5 text-teal" />
            <h2 className="text-lg font-bold text-ink">Subscribe & activate</h2>
          </div>
          <SubscriptionCheckout
            tenantId={tenantId}
            companyName={companyName}
            billingEmail={email}
            initialPackageId={active?.package_id ?? packages.find((p) => p.code === "gold")?.id ?? packages[0]?.id}
            initialInterval={active?.interval ?? "month"}
            existingStripeSubscriptionId={active?.stripe_subscription_id}
            onActivated={() => {
              setTick((n) => n + 1);
              router.replace("/dashboard");
            }}
          />
        </Panel>
      </div>
    </main>
  );
}
