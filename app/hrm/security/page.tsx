"use client";

import { useEffect, useState } from "react";
import { ShieldCheck } from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { PageHeader } from "@/components/common/page-header";
import { ModuleBreadcrumbs } from "@/components/common/module-breadcrumbs";
import { Badge, Button, Field, Panel, TextInput } from "@/components/ui";
import { getStoredTenantId, getStoredUserEmail } from "@/lib/auth/session";
import {
  enrollTotp,
  challengeAndVerifyTotp,
  isSupabaseAuthEnabled,
  listMfaFactors,
  signInWithPassword,
  unenrollFactor
} from "@/lib/auth/supabase-mfa";
import { findAccountByEmail } from "@/lib/auth/public-auth";
import {
  getSecurityPolicy,
  pullHrmFromSupabase,
  pushHrmToSupabase,
  upsertSecurityPolicy
} from "@/modules/hrm/services/hrm.store";

export default function SecurityPage() {
  const tenantId = getStoredTenantId() ?? "alpha";
  const [form, setForm] = useState({ mfa_required: false, session_hours: 24, password_min_length: 8 });
  const [saved, setSaved] = useState(false);
  const [mfaStatus, setMfaStatus] = useState("");
  const [enrollQr, setEnrollQr] = useState<string | null>(null);
  const [factorId, setFactorId] = useState<string | null>(null);
  const [verifyCode, setVerifyCode] = useState("");
  const [syncMsg, setSyncMsg] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    const policy = getSecurityPolicy(tenantId);
    if (policy) {
      setForm({
        mfa_required: policy.mfa_required,
        session_hours: policy.session_hours,
        password_min_length: policy.password_min_length
      });
    }
  }, [tenantId]);

  useEffect(() => {
    if (!isSupabaseAuthEnabled()) {
      setMfaStatus("Supabase Auth not configured (publishable key).");
      return;
    }
    void (async () => {
      try {
        const factors = await listMfaFactors();
        const verified = factors.totp?.filter((f) => f.status === "verified") ?? [];
        setMfaStatus(verified.length ? `Authenticator enrolled (${verified.length})` : "No authenticator enrolled yet");
      } catch {
        setMfaStatus("Sign in via Supabase Auth to manage MFA (needs SUPABASE_SECRET_KEY on login).");
      }
    })();
  }, []);

  function save(e: React.FormEvent) {
    e.preventDefault();
    upsertSecurityPolicy(tenantId, {
      mfa_required: form.mfa_required,
      session_hours: form.session_hours,
      password_min_length: form.password_min_length
    });
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }

  async function startEnroll() {
    setBusy(true);
    setSyncMsg("");
    try {
      const email = getStoredUserEmail();
      const account = email ? findAccountByEmail(email) : null;
      if (email && account) {
        await fetch("/api/auth/ensure-user", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email, password: account.password, name: account.name })
        });
        await signInWithPassword(email, account.password);
      }
      const data = await enrollTotp();
      setFactorId(data.id);
      setEnrollQr(data.totp.qr_code);
      setMfaStatus("Scan the QR code, then enter a verification code.");
    } catch (err) {
      setMfaStatus(err instanceof Error ? err.message : "MFA enroll failed");
    } finally {
      setBusy(false);
    }
  }

  async function confirmEnroll(e: React.FormEvent) {
    e.preventDefault();
    if (!factorId) return;
    setBusy(true);
    try {
      await challengeAndVerifyTotp(factorId, verifyCode.trim());
      setEnrollQr(null);
      setVerifyCode("");
      setMfaStatus("Authenticator verified and active.");
      upsertSecurityPolicy(tenantId, { ...form, mfa_required: true });
      setForm((f) => ({ ...f, mfa_required: true }));
    } catch (err) {
      setMfaStatus(err instanceof Error ? err.message : "Verification failed");
    } finally {
      setBusy(false);
    }
  }

  async function removeMfa() {
    setBusy(true);
    try {
      const factors = await listMfaFactors();
      for (const f of factors.totp ?? []) {
        await unenrollFactor(f.id);
      }
      setMfaStatus("Authenticator removed.");
    } catch (err) {
      setMfaStatus(err instanceof Error ? err.message : "Could not remove MFA");
    } finally {
      setBusy(false);
    }
  }

  async function syncPush() {
    setBusy(true);
    setSyncMsg("");
    try {
      await pushHrmToSupabase();
      setSyncMsg("Pushed HRM local data to Supabase.");
    } catch (err) {
      setSyncMsg(err instanceof Error ? err.message : "Push failed");
    } finally {
      setBusy(false);
    }
  }

  async function syncPull() {
    setBusy(true);
    setSyncMsg("");
    try {
      await pullHrmFromSupabase(tenantId);
      setSyncMsg("Pulled HRM data from Supabase into this browser.");
    } catch (err) {
      setSyncMsg(err instanceof Error ? err.message : "Pull failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <AppShell activeModule="hrm">
      <PageHeader title="Security Policy" description="Authentication, MFA, and HRM Supabase sync for this company." />
      <ModuleBreadcrumbs />

      <div className="grid max-w-3xl gap-5">
        <Panel>
          <div className="mb-4 flex items-center gap-2">
            <ShieldCheck className="size-5 text-teal" aria-hidden="true" />
            <h2 className="text-lg font-bold text-ink">Access &amp; authentication</h2>
          </div>
          <form onSubmit={save} className="grid gap-5">
            <label className="flex items-center justify-between rounded-[var(--bs-radius)] border border-line bg-cloud px-4 py-3">
              <span>
                <span className="block text-sm font-semibold text-ink">Require multi-factor authentication</span>
                <span className="block text-xs text-slate-500">Company policy flag stored with HRM security settings.</span>
              </span>
              <input
                type="checkbox"
                className="size-5 accent-[color:var(--bs-teal)]"
                checked={form.mfa_required}
                onChange={(e) => setForm({ ...form, mfa_required: e.target.checked })}
              />
            </label>

            <Field label="Session duration (hours)" hint="How long a user session remains valid before requiring re-login.">
              <TextInput
                type="number"
                min={1}
                max={720}
                required
                value={form.session_hours}
                onChange={(e) => setForm({ ...form, session_hours: Number(e.target.value) })}
              />
            </Field>

            <Field label="Minimum password length" hint="Minimum number of characters required for user passwords.">
              <TextInput
                type="number"
                min={6}
                max={64}
                required
                value={form.password_min_length}
                onChange={(e) => setForm({ ...form, password_min_length: Number(e.target.value) })}
              />
            </Field>

            <div className="flex items-center gap-3">
              <Button type="submit">Save policy</Button>
              {saved ? <Badge tone="success">Saved</Badge> : null}
            </div>
          </form>
        </Panel>

        <Panel>
          <h2 className="mb-2 text-lg font-bold text-ink">Supabase Auth MFA (TOTP)</h2>
          <p className="mb-4 text-sm text-slate-500">{mfaStatus}</p>
          {enrollQr ? (
            <form onSubmit={confirmEnroll} className="grid gap-4">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={enrollQr} alt="MFA QR code" className="mx-auto h-48 w-48 rounded-[var(--bs-radius)] border border-line bg-white p-2" />
              <Field label="Enter code from authenticator">
                <TextInput
                  inputMode="numeric"
                  maxLength={6}
                  required
                  value={verifyCode}
                  onChange={(e) => setVerifyCode(e.target.value)}
                />
              </Field>
              <Button type="submit" disabled={busy}>
                Verify enrollment
              </Button>
            </form>
          ) : (
            <div className="flex flex-wrap gap-2">
              <Button type="button" disabled={busy} onClick={() => void startEnroll()}>
                Enroll authenticator
              </Button>
              <Button type="button" variant="secondary" disabled={busy} onClick={() => void removeMfa()}>
                Remove MFA
              </Button>
            </div>
          )}
        </Panel>

        <Panel>
          <h2 className="mb-2 text-lg font-bold text-ink">HRM ↔ Supabase sync</h2>
          <p className="mb-4 text-sm text-slate-500">
            Requires <code className="text-xs">SUPABASE_SECRET_KEY</code>. Changes also auto-push shortly after local saves.
          </p>
          <div className="flex flex-wrap gap-2">
            <Button type="button" disabled={busy} onClick={() => void syncPush()}>
              Push to Supabase
            </Button>
            <Button type="button" variant="secondary" disabled={busy} onClick={() => void syncPull()}>
              Pull from Supabase
            </Button>
          </div>
          {syncMsg ? <p className="mt-3 text-sm font-semibold text-ink">{syncMsg}</p> : null}
        </Panel>
      </div>
    </AppShell>
  );
}
