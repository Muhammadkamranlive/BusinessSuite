"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useMemo, useState } from "react";
import { ArrowRight, Check, ShieldCheck, X } from "lucide-react";
import { PublicSiteShell } from "@/components/layout/public-site-shell";
import { SubscriptionCheckout } from "@/components/billing/subscription-checkout";
import { MktButton } from "@/components/marketing/mkt-button";
import { Field, SelectInput, TextInput } from "@/components/ui";
import { findAccountByEmail, loginAccount, signupAccount } from "@/lib/auth/public-auth";
import { setDemoSession } from "@/lib/auth/session";
import { moduleLabels, type ModuleKey } from "@/lib/permissions";
import { moduleLabel, platformAppLabel } from "@/lib/billing/module-catalog";
import {
  buildSignupSelectionFromSearchParams,
  persistSignupAppSelection,
  readSignupAppSelection
} from "@/lib/billing/signup-apps";
import { ensureAdminDirectoryUser, upsertTenant } from "@/modules/admin/services/admin.store";
import {
  formatMoney,
  listPackages,
  listSeedPackages,
  priceFor,
  type BillingInterval,
  type PlanTier,
  type SubscriptionPackage
} from "@/modules/billing/services/subscriptions.store";

const SIGNUP_REGIONS = [
  "Global",
  "United Arab Emirates",
  "Saudi Arabia",
  "Qatar",
  "Kuwait",
  "Bahrain",
  "Oman",
  "Pakistan",
  "India",
  "Bangladesh",
  "Sri Lanka",
  "United Kingdom",
  "Ireland",
  "Germany",
  "France",
  "Netherlands",
  "Spain",
  "Italy",
  "Turkey",
  "Egypt",
  "South Africa",
  "Nigeria",
  "Kenya",
  "United States",
  "Canada",
  "Mexico",
  "Brazil",
  "Argentina",
  "Australia",
  "New Zealand",
  "Singapore",
  "Malaysia",
  "Indonesia",
  "Philippines",
  "Thailand",
  "Vietnam",
  "Japan",
  "South Korea",
  "China",
  "Hong Kong",
  "Other"
] as const;

type Strength = { score: 0 | 1 | 2 | 3 | 4; label: string; color: string; bar: string };

function passwordStrength(password: string): Strength {
  if (!password) return { score: 0, label: "Enter a password", color: "text-slate-400", bar: "bg-slate-200" };
  let score = 0;
  if (password.length >= 8) score += 1;
  if (password.length >= 12) score += 1;
  if (/[a-z]/.test(password) && /[A-Z]/.test(password)) score += 1;
  if (/\d/.test(password)) score += 1;
  if (/[^A-Za-z0-9]/.test(password)) score += 1;
  const capped = Math.min(4, score) as 0 | 1 | 2 | 3 | 4;
  if (capped <= 1) return { score: capped || 1, label: "Weak", color: "text-rose-600", bar: "bg-rose-500" };
  if (capped === 2) return { score: 2, label: "Fair", color: "text-amber-600", bar: "bg-amber-500" };
  if (capped === 3) return { score: 3, label: "Good", color: "text-sky-600", bar: "bg-sky-500" };
  return { score: 4, label: "Strong", color: "text-emerald-600", bar: "bg-emerald-500" };
}

function SignupPackagePanel({
  pkg,
  interval,
  onIntervalChange
}: {
  pkg: SubscriptionPackage | undefined;
  interval: BillingInterval;
  onIntervalChange: (interval: BillingInterval) => void;
}) {
  const appSelection = readSignupAppSelection();
  if (!pkg) {
    return (
      <aside className="rounded-[1.35rem] border border-[#e6ebf1] bg-[#f8fafc] p-5 text-sm text-slate-500">
        Select a package to see details.
      </aside>
    );
  }

  const price = priceFor(pkg, interval);
  const alt =
    interval === "year"
      ? `${formatMoney(pkg.monthly_price_cents, pkg.currency)}/mo billed yearly`
      : `or ${formatMoney(pkg.yearly_price_cents, pkg.currency)}/year`;
  const modules = pkg.modules as ModuleKey[];
  const extraModules = appSelection?.modules.filter((m) => !modules.includes(m)) ?? [];
  const platformApps = appSelection?.platform_apps ?? [];

  return (
    <aside className="sticky top-24 rounded-[1.35rem] border border-[#e6ebf1] bg-white p-5 shadow-[0_18px_40px_rgba(10,37,64,0.08)] sm:p-6">
      <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-[color:var(--bs-teal)]">{pkg.badge}</p>
      <h2 className="mt-2 text-2xl font-semibold tracking-tight text-[#0a2540]">{pkg.name}</h2>
      <p className="mt-1 text-sm text-slate-500">{pkg.tagline}</p>

      <div className="mt-5 flex gap-2 rounded-xl border border-[#dbe3ee] bg-[#eef3f8] p-1.5">
        {(["month", "year"] as BillingInterval[]).map((opt) => {
          const active = interval === opt;
          return (
            <button
              key={opt}
              type="button"
              aria-pressed={active}
              onClick={() => onIntervalChange(opt)}
              className={`flex-1 rounded-lg px-3 py-2.5 text-sm font-bold transition ${
                active
                  ? "bg-[color:var(--bs-teal)] text-white shadow-md ring-2 ring-[color:var(--bs-teal)]/30"
                  : "bg-transparent text-slate-500 hover:bg-white/70 hover:text-[#0a2540]"
              }`}
            >
              {opt === "month" ? "Monthly" : "Yearly"}
            </button>
          );
        })}
      </div>

      <p className="mt-5 text-4xl font-semibold tracking-tight text-[#0a2540]">
        {formatMoney(price, pkg.currency)}
        <span className="text-base font-semibold text-slate-500">/{interval === "year" ? "yr" : "mo"}</span>
      </p>
      <p className="mt-1 text-xs text-slate-500">{alt}</p>

      {pkg.code === "professional" ? (
        <p className="mt-3 text-xs font-semibold uppercase tracking-[0.12em] text-[color:var(--bs-teal)]">
          Dedicated DB · domain · stack
        </p>
      ) : null}

      {pkg.description ? <p className="mt-4 text-sm leading-6 text-slate-600">{pkg.description}</p> : null}

      <div className="mt-5">
        <p className="text-xs font-bold uppercase tracking-[0.14em] text-slate-400">Included modules</p>
        <div className="mt-2.5 flex flex-wrap gap-1.5">
          {modules.map((key) => (
            <span
              key={key}
              className="rounded-full border border-[color:var(--bs-teal)]/20 bg-[color:var(--bs-teal)]/8 px-2.5 py-1 text-[11px] font-semibold text-[color:var(--bs-ink)]"
            >
              {moduleLabels[key]}
            </span>
          ))}
        </div>
      </div>

      {extraModules.length || platformApps.length ? (
        <div className="mt-5">
          <p className="text-xs font-bold uppercase tracking-[0.14em] text-slate-400">Extra apps (pay per app)</p>
          <div className="mt-2.5 flex flex-wrap gap-1.5">
            {extraModules.map((key) => (
              <span
                key={key}
                className="rounded-full border border-amber-200 bg-amber-50 px-2.5 py-1 text-[11px] font-semibold text-amber-900"
              >
                + {moduleLabel(key)}
              </span>
            ))}
            {platformApps.map((id) => (
              <span
                key={id}
                className="rounded-full border border-violet-200 bg-violet-50 px-2.5 py-1 text-[11px] font-semibold text-violet-900"
              >
                + {platformAppLabel(id)}
              </span>
            ))}
          </div>
          {appSelection?.addon_monthly_cents ? (
            <p className="mt-2 text-xs text-slate-500">
              Estimated add-ons: {formatMoney(appSelection.addon_monthly_cents, pkg.currency)}/mo on top of base
            </p>
          ) : null}
        </div>
      ) : null}

      <ul className="mt-5 space-y-2.5 border-t border-[#eef2f6] pt-5">
        {pkg.features.map((feature) => (
          <li key={feature} className="flex gap-2.5 text-sm text-slate-700">
            <Check className="mt-0.5 size-4 shrink-0 text-[color:var(--bs-teal)]" aria-hidden />
            <span>{feature}</span>
          </li>
        ))}
      </ul>

      <div className="mt-6 flex items-start gap-2 rounded-xl border border-[#e6ebf1] bg-[#f8fafc] px-3 py-3 text-xs leading-5 text-slate-500">
        <ShieldCheck className="mt-0.5 size-4 shrink-0 text-[color:var(--bs-teal)]" aria-hidden />
        You can change package and billing cycle again on the payment step.
      </div>

      <Link
        href="/pricing"
        className="mt-4 inline-flex text-sm font-semibold text-[color:var(--bs-teal)] hover:underline"
      >
        Compare all packages
      </Link>
    </aside>
  );
}

function SignupInner() {
  const router = useRouter();
  const params = useSearchParams();
  const [packages, setPackages] = useState(() => listSeedPackages({ activeOnly: true }));
  useEffect(() => {
    setPackages(listPackages({ activeOnly: true }));
  }, []);

  useEffect(() => {
    const fromUrl = buildSignupSelectionFromSearchParams(params);
    if (fromUrl) persistSignupAppSelection(fromUrl);
  }, [params]);

  const planParam = (params.get("plan") as PlanTier) || "gold";
  const intervalParam = (params.get("interval") as BillingInterval) || "month";

  const [step, setStep] = useState<1 | 2>(1);
  const [form, setForm] = useState({
    companyName: "",
    industry: "General business",
    region: "Global",
    name: "",
    email: "",
    password: "",
    confirm: "",
    planCode: packages.some((p) => p.code === planParam) ? planParam : packages[0]?.code ?? "gold",
    interval: intervalParam
  });
  const [tenantId, setTenantId] = useState("");
  const [error, setError] = useState("");
  const [emailError, setEmailError] = useState("");
  const [loading, setLoading] = useState(false);

  const selectedPkg = packages.find((p) => p.code === form.planCode) ?? packages[0];
  const strength = useMemo(() => passwordStrength(form.password), [form.password]);
  const passwordsMatch = form.confirm.length > 0 && form.password === form.confirm;
  const passwordsMismatch = form.confirm.length > 0 && form.password !== form.confirm;

  function checkEmailAvailable(raw: string, opts?: { strict?: boolean }) {
    const email = raw.trim().toLowerCase();
    if (!email) {
      setEmailError("");
      return true;
    }
    const valid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
    if (!valid) {
      if (opts?.strict) setEmailError("Enter a valid work email address.");
      else setEmailError("");
      return false;
    }
    if (findAccountByEmail(email)) {
      setEmailError("An account with this email already exists. Please sign in.");
      return false;
    }
    setEmailError("");
    return true;
  }

  function createCompany(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    if (!checkEmailAvailable(form.email, { strict: true })) return;
    if (form.password.length < 8) {
      setError("Password must be at least 8 characters.");
      return;
    }
    if (strength.score < 2) {
      setError("Choose a stronger password (mix letters and numbers).");
      return;
    }
    if (form.password !== form.confirm) {
      setError("Passwords do not match.");
      return;
    }
    if (!form.companyName.trim()) {
      setError("Company name is required.");
      return;
    }
    setLoading(true);
    try {
      const tenant = upsertTenant({
        name: form.companyName.trim(),
        industry: form.industry.trim() || "General business",
        region: form.region.trim() || "Global",
        plan: "Demo Pro",
        status: "active",
        email: form.email.trim().toLowerCase(),
        phone: ""
      });
      const account = signupAccount({
        name: form.name.trim(),
        email: form.email.trim(),
        password: form.password,
        role: "company_admin",
        tenantId: tenant.id
      });
      ensureAdminDirectoryUser({
        name: account.name,
        email: account.email,
        role: "company_admin",
        title: account.title,
        tenantId: tenant.id,
        status: "active"
      });
      loginAccount(account.email, form.password);
      setDemoSession(account.email, tenant.id);
      setTenantId(tenant.id);
      setStep(2);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Signup failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <PublicSiteShell>
      <div className="relative overflow-hidden">
        <div className="mkt-mesh pointer-events-none absolute inset-0" />
        <div className="relative mx-auto max-w-6xl px-4 py-10 md:px-6 md:py-14">
          <div className="mb-8 max-w-2xl">
            <p className="mkt-eyebrow">Step {step} of 2</p>
            <h1 className="mkt-display mt-3 text-3xl sm:text-4xl">
              {step === 1 ? "Create your company account" : "Activate with subscription"}
            </h1>
            <p className="mkt-muted mt-3 text-sm leading-6">
              {step === 1
                ? "Register your company admin and pick a package. Module coverage and pricing update on the right."
                : "Confirm package and pay securely to open your company workspace."}
            </p>
          </div>

          {step === 1 ? (
            <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1.15fr)_minmax(18rem,0.85fr)] lg:gap-8">
              <form
                onSubmit={createCompany}
                className="rounded-[1.5rem] border border-[#e6ebf1] bg-white p-5 shadow-[0_24px_50px_rgba(10,37,64,0.08)] sm:p-8"
              >
                {error ? (
                  <p className="mb-4 rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">
                    {error}
                  </p>
                ) : null}

                <div className="grid gap-4 md:grid-cols-2">
                  <Field label="Company name" className="md:col-span-2">
                    <TextInput
                      required
                      value={form.companyName}
                      onChange={(e) => setForm({ ...form, companyName: e.target.value })}
                    />
                  </Field>
                  <Field label="Industry">
                    <TextInput value={form.industry} onChange={(e) => setForm({ ...form, industry: e.target.value })} />
                  </Field>
                  <Field label="Region">
                    <SelectInput
                      required
                      value={form.region}
                      onChange={(e) => setForm({ ...form, region: e.target.value })}
                    >
                      {SIGNUP_REGIONS.map((region) => (
                        <option key={region} value={region}>
                          {region}
                        </option>
                      ))}
                    </SelectInput>
                  </Field>
                  <Field label="Admin full name" className="md:col-span-2">
                    <TextInput required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
                  </Field>
                  <Field label="Work email" className="md:col-span-2">
                    <TextInput
                      required
                      type="email"
                      autoComplete="email"
                      value={form.email}
                      onChange={(e) => {
                        const next = e.target.value;
                        setForm({ ...form, email: next });
                        checkEmailAvailable(next);
                      }}
                      onBlur={(e) => checkEmailAvailable(e.target.value, { strict: true })}
                      aria-invalid={Boolean(emailError)}
                    />
                    {emailError ? (
                      <p className="mt-1.5 flex items-center gap-1.5 text-xs font-medium text-rose-600">
                        <X className="size-3.5 shrink-0" aria-hidden />
                        <span>
                          {emailError}{" "}
                          {emailError.includes("already exists") ? (
                            <Link href="/login" className="underline">
                              Sign in
                            </Link>
                          ) : null}
                        </span>
                      </p>
                    ) : form.email.trim() &&
                      /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim()) ? (
                      <p className="mt-1.5 flex items-center gap-1.5 text-xs font-medium text-emerald-600">
                        <Check className="size-3.5" aria-hidden />
                        Email is available
                      </p>
                    ) : null}
                  </Field>
                  <Field label="Password">
                    <TextInput
                      required
                      type="password"
                      autoComplete="new-password"
                      value={form.password}
                      onChange={(e) => setForm({ ...form, password: e.target.value })}
                    />
                    <div className="mt-2">
                      <div className="flex gap-1">
                        {[1, 2, 3, 4].map((i) => (
                          <span
                            key={i}
                            className={`h-1.5 flex-1 rounded-full ${
                              strength.score >= i ? strength.bar : "bg-slate-200"
                            }`}
                          />
                        ))}
                      </div>
                      <p className={`mt-1.5 text-xs font-semibold ${strength.color}`}>
                        Strength: {strength.label}
                        {form.password && form.password.length < 8 ? " · min 8 characters" : ""}
                      </p>
                      <ul className="mt-1 space-y-0.5 text-[11px] text-slate-500">
                        <li className={form.password.length >= 8 ? "text-emerald-600" : undefined}>
                          {form.password.length >= 8 ? "✓" : "·"} At least 8 characters
                        </li>
                        <li className={/[a-z]/.test(form.password) && /[A-Z]/.test(form.password) ? "text-emerald-600" : undefined}>
                          {/[a-z]/.test(form.password) && /[A-Z]/.test(form.password) ? "✓" : "·"} Upper &amp; lower case
                        </li>
                        <li className={/\d/.test(form.password) ? "text-emerald-600" : undefined}>
                          {/\d/.test(form.password) ? "✓" : "·"} A number
                        </li>
                        <li className={/[^A-Za-z0-9]/.test(form.password) ? "text-emerald-600" : undefined}>
                          {/[^A-Za-z0-9]/.test(form.password) ? "✓" : "·"} A symbol (recommended)
                        </li>
                      </ul>
                    </div>
                  </Field>
                  <Field label="Confirm password">
                    <TextInput
                      required
                      type="password"
                      autoComplete="new-password"
                      value={form.confirm}
                      onChange={(e) => setForm({ ...form, confirm: e.target.value })}
                      aria-invalid={passwordsMismatch}
                    />
                    {passwordsMatch ? (
                      <p className="mt-1.5 flex items-center gap-1.5 text-xs font-medium text-emerald-600">
                        <Check className="size-3.5" aria-hidden />
                        Passwords match
                      </p>
                    ) : null}
                    {passwordsMismatch ? (
                      <p className="mt-1.5 flex items-center gap-1.5 text-xs font-medium text-rose-600">
                        <X className="size-3.5" aria-hidden />
                        Passwords do not match
                      </p>
                    ) : null}
                  </Field>
                </div>

                <div className="mt-6 border-t border-[#eef2f6] pt-6">
                  <div className="flex flex-wrap items-end justify-between gap-3">
                    <div>
                      <p className="text-sm font-semibold text-[#0a2540]">Starting package</p>
                      <p className="mt-1 text-xs text-slate-500">Choose a plan — modules &amp; features update on the right.</p>
                    </div>
                    <div className="flex gap-1 rounded-xl border border-[#dbe3ee] bg-[#eef3f8] p-1">
                      {(["month", "year"] as BillingInterval[]).map((opt) => {
                        const active = form.interval === opt;
                        return (
                          <button
                            key={opt}
                            type="button"
                            aria-pressed={active}
                            onClick={() => setForm({ ...form, interval: opt })}
                            className={`rounded-lg px-3 py-1.5 text-xs font-bold transition ${
                              active
                                ? "bg-[color:var(--bs-teal)] text-white shadow-sm"
                                : "text-slate-500 hover:bg-white/80 hover:text-[#0a2540]"
                            }`}
                          >
                            {opt === "month" ? "Monthly" : "Yearly"}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                  <div className="mt-3 grid gap-2 sm:grid-cols-2">
                    {packages.map((pkg) => {
                      const active = form.planCode === pkg.code;
                      return (
                        <button
                          key={pkg.id}
                          type="button"
                          aria-pressed={active}
                          onClick={() => setForm({ ...form, planCode: pkg.code as PlanTier })}
                          className={`rounded-xl border px-3 py-3 text-left transition ${
                            active
                              ? "border-[color:var(--bs-teal)] bg-[color:var(--bs-teal)] text-white shadow-md ring-2 ring-[color:var(--bs-teal)]/25"
                              : "border-[#e6ebf1] bg-white hover:border-[color:var(--bs-teal)]/40"
                          }`}
                        >
                          <p
                            className={`text-[11px] font-bold uppercase tracking-wide ${
                              active ? "text-white/80" : "text-[color:var(--bs-teal)]"
                            }`}
                          >
                            {pkg.badge}
                          </p>
                          <p className={`mt-0.5 font-semibold ${active ? "text-white" : "text-[#0a2540]"}`}>{pkg.name}</p>
                          <p className={`mt-1 text-xs ${active ? "text-white/85" : "text-slate-500"}`}>
                            {formatMoney(priceFor(pkg, form.interval), pkg.currency)}/
                            {form.interval === "year" ? "yr" : "mo"}
                          </p>
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div className="mt-6 flex flex-wrap gap-3">
                  <MktButton type="submit" disabled={loading || Boolean(emailError) || passwordsMismatch}>
                    {loading ? "Creating…" : "Continue to payment"}
                    <ArrowRight className="size-4" />
                  </MktButton>
                </div>
              </form>

              <SignupPackagePanel
                pkg={selectedPkg}
                interval={form.interval}
                onIntervalChange={(interval) => setForm({ ...form, interval })}
              />
            </div>
          ) : (
            <div className="rounded-[1.5rem] border border-[#e6ebf1] bg-white p-5 shadow-[0_24px_50px_rgba(10,37,64,0.08)] sm:p-8">
              <SubscriptionCheckout
                tenantId={tenantId}
                companyName={form.companyName}
                billingEmail={form.email}
                initialPackageId={selectedPkg?.id}
                initialInterval={form.interval}
                onActivated={() => router.push("/dashboard")}
              />
            </div>
          )}
        </div>
      </div>
    </PublicSiteShell>
  );
}

export default function SignupPage() {
  return (
    <Suspense fallback={<div className="p-8 text-center text-sm text-slate-500">Loading signup…</div>}>
      <SignupInner />
    </Suspense>
  );
}
