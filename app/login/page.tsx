"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";
import {
  ArrowRight,
  Eye,
  EyeOff,
  Lock,
  ShieldCheck,
  Sparkles
} from "lucide-react";
import { PublicSiteShell } from "@/components/layout/public-site-shell";
import { BrandMark } from "@/components/marketing/brand-mark";
import { MktButton } from "@/components/marketing/mkt-button";
import { Field, TextInput } from "@/components/ui";
import { signInToWorkspace } from "@/lib/auth/login";
import { ensureDemoAccounts } from "@/lib/auth/public-auth";
import { setHmsMfaPending } from "@/lib/auth/hms-session-policy";
import {
  isSupabaseAuthEnabled,
  mustCompleteMfaGate,
  signInWithPassword
} from "@/lib/auth/supabase-mfa";
import { pullHmsFromSupabase, userRequiresHmsMfa } from "@/modules/healthcare/services/hms.store";

const trustPoints = [
  "Pay per app — 15 apps with role rights inside each license",
  "Tenant-isolated Postgres for every company",
  "Optional two-factor authentication (TOTP)"
];

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const idleReason = searchParams.get("reason") === "idle";

  useEffect(() => {
    ensureDemoAccounts();
  }, []);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const account = await signInToWorkspace(email, password);
      await pullHmsFromSupabase(account.tenantId).catch(() => undefined);
      const hmsMfaRequired = userRequiresHmsMfa(account.email, account.tenantId);

      if (isSupabaseAuthEnabled()) {
        try {
          await fetch("/api/auth/ensure-user", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ email, password, name: account.name })
          });
          await signInWithPassword(email, password);
          if (await mustCompleteMfaGate(hmsMfaRequired)) {
            setHmsMfaPending(hmsMfaRequired);
            router.push("/login/mfa");
            return;
          }
        } catch {
          /* Demo session already set; Supabase Auth optional until secret key + users exist */
          if (hmsMfaRequired) {
            setHmsMfaPending(true);
            router.push("/login/mfa");
            return;
          }
        }
      } else if (hmsMfaRequired) {
        setHmsMfaPending(true);
        router.push("/login/mfa");
        return;
      }

      setHmsMfaPending(false);
      const redirect = searchParams.get("redirect");
      router.push(redirect && redirect.startsWith("/") ? redirect : "/apps");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Login failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <PublicSiteShell>
      <div className="mkt-auth-stage">
        <span className="mkt-auth-orb mkt-auth-orb-a" aria-hidden />
        <span className="mkt-auth-orb mkt-auth-orb-b" aria-hidden />

        <div className="relative z-[1] mx-auto grid max-w-6xl items-stretch gap-8 px-4 py-12 md:px-6 md:py-16 lg:grid-cols-[1.05fr_0.95fr] lg:gap-12 lg:py-20">
          <section className="mkt-auth-brand flex flex-col justify-between p-7 sm:p-10 lg:min-h-[34rem]">
            <div className="relative z-[1]">
              <div className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.16em] text-white/90 backdrop-blur">
                <Sparkles className="size-3.5" aria-hidden />
                Secure workspace access
              </div>
              <h1 className="mt-6 text-3xl font-semibold tracking-tight text-white sm:text-4xl lg:text-[2.75rem] lg:leading-[1.1]">
                Sign in to run your company from one ERP.
              </h1>
              <p className="mt-4 max-w-md text-[15px] leading-7 text-white/72">
                Admins, HR, sales, warehouse, and finance each open only the menus their role allows —
                across CRM, stock, plant, hospital HMS, and finance.
              </p>
            </div>

            <ul className="relative z-[1] mt-10 space-y-3">
              {trustPoints.map((point) => (
                <li key={point} className="flex items-start gap-3 text-sm text-white/85">
                  <span className="mt-0.5 grid size-5 shrink-0 place-items-center rounded-full bg-[color:var(--bs-teal)]/25 text-[color:var(--bs-teal)]">
                    <ShieldCheck className="size-3.5" aria-hidden />
                  </span>
                  {point}
                </li>
              ))}
            </ul>
          </section>

          <div className="mkt-auth-card flex flex-col justify-center">
            <div className="flex items-center gap-3">
              <BrandMark />
              <div>
                <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-[color:var(--bs-teal)]">
                  BusinessSuite
                </p>
                <h2 className="text-2xl font-semibold tracking-tight text-[#0a2540]">Welcome back</h2>
              </div>
            </div>
            <p className="mt-3 text-sm text-slate-500">
              No account yet?{" "}
              <Link href="/signup" className="font-semibold text-[color:var(--bs-teal)] hover:underline">
                Start free trial
              </Link>
            </p>

            <form onSubmit={onSubmit} className="mt-7 space-y-4">
              {idleReason ? (
                <p className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800" role="status">
                  Your session ended after 15 minutes of inactivity. Sign in again to continue.
                </p>
              ) : null}
              {error ? (
                <p className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700" role="alert">
                  {error}
                </p>
              ) : null}

              <Field label="Work email">
                <TextInput
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  autoComplete="email"
                  placeholder="you@company.com"
                />
              </Field>

              <Field label="Password">
                <div className="relative">
                  <TextInput
                    type={showPassword ? "text" : "password"}
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    autoComplete="current-password"
                    className="pr-11"
                    placeholder="Enter your password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((v) => !v)}
                    className="absolute inset-y-0 right-0 grid w-11 place-items-center text-slate-400 transition hover:text-[#0a2540]"
                    aria-label={showPassword ? "Hide password" : "Show password"}
                  >
                    {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                  </button>
                </div>
              </Field>

              <div className="flex items-center justify-between gap-3 text-xs">
                <span className="inline-flex items-center gap-1.5 text-slate-500">
                  <Lock className="size-3.5 text-[color:var(--bs-teal)]" aria-hidden />
                  Encrypted session
                </span>
                <Link href="/contact" className="font-semibold text-[color:var(--bs-teal)] hover:underline">
                  Need help?
                </Link>
              </div>

              <MktButton type="submit" className="w-full" disabled={loading}>
                {loading ? "Signing in…" : "Sign in to workspace"}
                <ArrowRight className="size-4" />
              </MktButton>
            </form>

            <p className="mt-6 text-center text-[12px] leading-5 text-slate-400">
              By signing in you agree to our{" "}
              <Link href="/terms" className="underline hover:text-slate-600">
                Terms
              </Link>{" "}
              and{" "}
              <Link href="/privacy" className="underline hover:text-slate-600">
                Privacy Policy
              </Link>
              .
            </p>
          </div>
        </div>
      </div>
    </PublicSiteShell>
  );
}

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <PublicSiteShell>
          <div className="mkt-auth-stage flex items-center justify-center px-4 py-20 text-sm text-slate-500">
            Loading…
          </div>
        </PublicSiteShell>
      }
    >
      <LoginForm />
    </Suspense>
  );
}
