"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { ShieldCheck } from "lucide-react";
import { PublicSiteShell } from "@/components/layout/public-site-shell";
import { BrandMark } from "@/components/marketing/brand-mark";
import { MktButton } from "@/components/marketing/mkt-button";
import { Field, TextInput } from "@/components/ui";
import { findAccountByEmail } from "@/lib/auth/public-auth";
import { getStoredUserEmail } from "@/lib/auth/session";
import { isHmsMfaPending, setHmsMfaPending } from "@/lib/auth/hms-session-policy";
import {
  challengeAndVerifyTotp,
  enrollTotp,
  hasTotpEnrolled,
  isSupabaseAuthEnabled,
  listMfaFactors,
  mustCompleteMfaGate,
  needsMfaChallenge,
  signInWithPassword
} from "@/lib/auth/supabase-mfa";

export default function MfaChallengePage() {
  const router = useRouter();
  const [factorId, setFactorId] = useState("");
  const [code, setCode] = useState("");
  const [error, setError] = useState("");
  const [info, setInfo] = useState("");
  const [loading, setLoading] = useState(false);
  const [enrollQr, setEnrollQr] = useState<string | null>(null);
  const [enrollMode, setEnrollMode] = useState(false);
  const [hmsRequired, setHmsRequired] = useState(false);
  const [lostMode, setLostMode] = useState(false);
  const [resetPassword, setResetPassword] = useState("");

  useEffect(() => {
    void (async () => {
      try {
        const pending = isHmsMfaPending();
        setHmsRequired(pending);

        if (!isSupabaseAuthEnabled()) {
          if (!pending) router.replace("/apps");
          return;
        }

        const gateNeeded = await mustCompleteMfaGate(pending);
        if (!gateNeeded) {
          setHmsMfaPending(false);
          router.replace("/apps");
          return;
        }

        const enrolled = await hasTotpEnrolled();
        if (!enrolled) {
          setEnrollMode(true);
          return;
        }

        const factors = await listMfaFactors();
        const totp = factors.totp?.[0];
        if (totp?.id) setFactorId(totp.id);
        else setEnrollMode(true);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Unable to load MFA factors");
      }
    })();
  }, [router]);

  async function startEnroll() {
    setError("");
    setInfo("");
    setLoading(true);
    try {
      const email = getStoredUserEmail();
      const account = email ? findAccountByEmail(email) : null;
      if (email && account?.password) {
        await fetch("/api/auth/ensure-user", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email, password: account.password, name: account.name })
        });
        await signInWithPassword(email, account.password);
      }
      const data = await enrollTotp("BusinessSuite HMS");
      setFactorId(data.id);
      setEnrollQr(data.totp.qr_code);
      setEnrollMode(true);
      setLostMode(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "MFA enrollment failed");
    } finally {
      setLoading(false);
    }
  }

  async function resetLostAuthenticator() {
    setError("");
    setInfo("");
    setLoading(true);
    try {
      const email = getStoredUserEmail();
      if (!email) throw new Error("Sign in again, then use Lost authenticator.");
      if (!resetPassword.trim()) throw new Error("Enter your account password to confirm.");

      const res = await fetch("/api/auth/mfa-reset", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password: resetPassword })
      });
      const json = (await res.json()) as { ok?: boolean; error?: string; message?: string };
      if (!res.ok || !json.ok) throw new Error(json.error || "Could not reset authenticator.");

      await signInWithPassword(email, resetPassword);
      setInfo(json.message || "Old authenticator removed. Scan the new QR code.");
      setFactorId("");
      setEnrollQr(null);
      setCode("");
      setResetPassword("");
      await startEnroll();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Reset failed");
      setLoading(false);
    }
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      if (!isSupabaseAuthEnabled()) {
        throw new Error("Two-factor authentication requires Supabase Auth to be configured.");
      }
      if (!factorId) throw new Error("No authenticator enrolled for this account.");
      await challengeAndVerifyTotp(factorId, code.trim());
      if (!(await needsMfaChallenge())) {
        setHmsMfaPending(false);
        router.push("/apps");
      } else {
        throw new Error("Verification incomplete — try again.");
      }
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
            {hmsRequired ? (
              <p className="text-sm text-slate-500">
                Your HMS clinical role requires two-factor authentication before accessing the workspace.
              </p>
            ) : (
              <p className="text-sm text-slate-500">Enter the 6-digit code from your authenticator app.</p>
            )}

            {!isSupabaseAuthEnabled() ? (
              <p className="mt-4 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800" role="alert">
                Supabase Auth is not configured. Contact your administrator to enable MFA for HMS staff.
              </p>
            ) : lostMode ? (
              <div className="mt-6 space-y-4">
                <p className="text-sm text-slate-600">
                  If you removed the account from Microsoft Authenticator, confirm your password. We will remove the old
                  factor from Supabase and show a new QR code to scan again.
                </p>
                {error ? (
                  <p className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700" role="alert">
                    {error}
                  </p>
                ) : null}
                {info ? (
                  <p className="rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-800">
                    {info}
                  </p>
                ) : null}
                <Field label="Account password">
                  <TextInput
                    type="password"
                    required
                    value={resetPassword}
                    onChange={(e) => setResetPassword(e.target.value)}
                    autoComplete="current-password"
                    placeholder="Your login password"
                  />
                </Field>
                <MktButton type="button" className="w-full" disabled={loading} onClick={() => void resetLostAuthenticator()}>
                  {loading ? "Resetting…" : "Remove old authenticator & show new QR"}
                </MktButton>
                <button
                  type="button"
                  className="w-full text-center text-sm font-semibold text-[color:var(--bs-teal)] hover:underline"
                  onClick={() => {
                    setLostMode(false);
                    setError("");
                  }}
                >
                  Back to enter code
                </button>
              </div>
            ) : enrollMode && !enrollQr ? (
              <div className="mt-6 space-y-4">
                <p className="text-sm text-slate-600">Enroll an authenticator app to continue.</p>
                {error ? (
                  <p className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700" role="alert">
                    {error}
                  </p>
                ) : null}
                <MktButton type="button" className="w-full" disabled={loading} onClick={() => void startEnroll()}>
                  {loading ? "Starting…" : "Set up authenticator"}
                </MktButton>
              </div>
            ) : (
              <form onSubmit={onSubmit} className="mt-6 space-y-4">
                {enrollQr ? (
                  <div className="flex flex-col items-center gap-3">
                    <p className="text-center text-sm text-slate-600">Scan this QR code with Microsoft Authenticator, then enter the 6-digit code.</p>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={enrollQr} alt="Authenticator QR code" className="size-44 rounded-lg border border-line" />
                  </div>
                ) : null}
                {error ? (
                  <p className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700" role="alert">
                    {error}
                  </p>
                ) : null}
                {info ? (
                  <p className="rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-800">
                    {info}
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
                  {loading ? "Verifying…" : enrollQr ? "Verify and activate" : "Verify and continue"}
                </MktButton>
                {!enrollQr ? (
                  <button
                    type="button"
                    className="w-full text-center text-sm font-semibold text-[color:var(--bs-teal)] hover:underline"
                    onClick={() => {
                      setLostMode(true);
                      setError("");
                    }}
                  >
                    Lost authenticator? Reset and scan a new QR
                  </button>
                ) : null}
              </form>
            )}
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
