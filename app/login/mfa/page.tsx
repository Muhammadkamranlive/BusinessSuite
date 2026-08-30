"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { ShieldCheck } from "lucide-react";
import { PublicSiteShell } from "@/components/layout/public-site-shell";
import { BrandMark } from "@/components/marketing/brand-mark";
import { MktButton } from "@/components/marketing/mkt-button";
import { Field, TextInput } from "@/components/ui";
import { challengeAndVerifyTotp, listMfaFactors, needsMfaChallenge } from "@/lib/auth/supabase-mfa";

export default function MfaChallengePage() {
  const router = useRouter();
  const [factorId, setFactorId] = useState("");
  const [code, setCode] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    void (async () => {
      try {
        const needed = await needsMfaChallenge();
        if (!needed) {
          router.replace("/dashboard");
          return;
        }
        const factors = await listMfaFactors();
        const totp = factors.totp?.[0];
        if (totp?.id) setFactorId(totp.id);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Unable to load MFA factors");
      }
    })();
  }, [router]);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      if (!factorId) throw new Error("No authenticator enrolled for this account.");
      await challengeAndVerifyTotp(factorId, code.trim());
      router.push("/dashboard");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Invalid code");
    } finally {
      setLoading(false);
    }
  }

  return (
    <PublicSiteShell>
      <div className="mkt-auth-stage flex items-center justify-center">
        <span className="mkt-auth-orb mkt-auth-orb-a" aria-hidden />
        <span className="mkt-auth-orb mkt-auth-orb-b" aria-hidden />
        <div className="relative z-[1] mx-auto w-full max-w-md px-4 py-16">
          <div className="mkt-auth-card">
            <div className="mb-5 flex items-center gap-3">
              <BrandMark />
              <div>
                <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-[color:var(--bs-teal)]">
                  Security check
                </p>
                <h1 className="flex items-center gap-2 text-xl font-semibold tracking-tight text-[#0a2540]">
                  <ShieldCheck className="size-5 text-[color:var(--bs-teal)]" aria-hidden />
                  Two-factor authentication
                </h1>
              </div>
            </div>
            <p className="text-sm text-slate-500">Enter the 6-digit code from your authenticator app.</p>
            <form onSubmit={onSubmit} className="mt-6 space-y-4">
              {error ? (
                <p className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700" role="alert">
                  {error}
                </p>
              ) : null}
              <Field label="Authentication code">
                <TextInput
                  inputMode="numeric"
                  pattern="[0-9]{6}"
                  maxLength={6}
                  required
                  value={code}
                  onChange={(e) => setCode(e.target.value)}
                  autoComplete="one-time-code"
                  placeholder="000000"
                  className="tracking-[0.35em]"
                />
              </Field>
              <MktButton type="submit" className="w-full" disabled={loading || !factorId}>
                {loading ? "Verifying…" : "Verify and continue"}
              </MktButton>
            </form>
            <p className="mt-4 text-center text-sm text-slate-500">
              <Link href="/login" className="font-semibold text-[color:var(--bs-teal)] hover:underline">
                Back to sign in
              </Link>
            </p>
          </div>
        </div>
      </div>
    </PublicSiteShell>
  );
}
