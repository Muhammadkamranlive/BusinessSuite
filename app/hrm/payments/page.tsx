"use client";

import { useMemo, useState } from "react";
import { AppShell } from "@/components/app-shell";
import { PageHeader } from "@/components/common/page-header";
import { ModuleBreadcrumbs } from "@/components/common/module-breadcrumbs";
import { StatusBadge } from "@/components/common/status-badge";
import { useConfirm } from "@/components/common/use-confirm";
import { ExtraFieldsBlock } from "@/components/forms/extra-fields-block";
import { ExtraFieldsReadout } from "@/components/forms/extra-fields-readout";
import { Button, Field, Panel, SelectInput, TextInput } from "@/components/ui";
import { getStoredTenantId } from "@/lib/auth/session";
import { persistExtraFields } from "@/modules/forms/services/extra-fields.store";
import { money } from "@/lib/utils";
import type { PaymentPurpose } from "@/modules/hrm/model";
import {
  completePayoutFromProvider,
  createEmployeeDisbursement,
  createSalaryDisbursementsFromPayroll,
  getCompanyProfile,
  getEmployee,
  getEmployeeName,
  getPayrollItemsForRun,
  listEmployees,
  listPaymentTxns,
  listPayrollRuns,
  markPaymentFailed,
  markPaymentPaid,
  markPayrollDisbursementsPaid
} from "@/modules/hrm/services/hrm.store";
import { downloadBankLetter } from "@/modules/hrm/services/payroll-pdf";
import { PAYOUT_PROVIDERS, type PayoutProvider } from "@/modules/hrm/services/payout-providers";

export default function PaymentsPage() {
  const tenantId = getStoredTenantId() ?? "alpha";
  const { askSave, dialog } = useConfirm();
  const [tick, setTick] = useState(0);
  const refresh = () => setTick((n) => n + 1);
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [selectedRunId, setSelectedRunId] = useState("");
  const [provider, setProvider] = useState<PayoutProvider>("ach");
  const [payingId, setPayingId] = useState<string | null>(null);
  const [payingAll, setPayingAll] = useState(false);
  const [extraJson, setExtraJson] = useState("");
  const [form, setForm] = useState({
    employee_id: "",
    amount: "",
    purpose: "advance" as PaymentPurpose,
    reference: "",
    notes: ""
  });

  const txns = useMemo(() => listPaymentTxns(tenantId), [tenantId, tick]);
  const employees = useMemo(() => listEmployees(tenantId).filter((e) => e.status === "active"), [tenantId, tick]);
  const finalizedRuns = useMemo(
    () => listPayrollRuns(tenantId).filter((r) => r.status === "finalized").sort((a, b) => (a.period < b.period ? 1 : -1)),
    [tenantId, tick]
  );

  const pending = txns.filter((t) => t.status === "pending");
  const pendingTotal = pending.reduce((sum, t) => sum + t.amount, 0);
  const paidTotal = txns.filter((t) => t.status === "paid").reduce((sum, t) => sum + t.amount, 0);
  const providerMeta = PAYOUT_PROVIDERS.find((p) => p.id === provider);

  async function sendPayout(txnId: string) {
    const txn = txns.find((t) => t.id === txnId);
    if (!txn || txn.status !== "pending") return;
    setPayingId(txnId);
    setError("");
    setNotice("");
    try {
      const res = await fetch("/api/payments/payout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          provider,
          amount: txn.amount,
          currency: "usd",
          paymentTxnId: txn.id,
          tenantId,
          employeeId: txn.employee_id,
          employeeName: getEmployeeName(txn.employee_id),
          bankName: txn.bank_name,
          bankAccount: txn.bank_account,
          purpose: txn.purpose
        })
      });
      const json = (await res.json()) as {
        ok?: boolean;
        reference?: string;
        message?: string;
        provider?: string;
        dashboardUrl?: string;
      };
      if (!res.ok || !json.ok || !json.reference) {
        throw new Error(json.message ?? "Payout failed");
      }
      completePayoutFromProvider(txn.id, {
        provider: json.provider ?? provider,
        reference: json.reference,
        message: json.message
      });
      const link =
        json.dashboardUrl ||
        (json.reference.startsWith("pi_") || json.reference.startsWith("ch_")
          ? `https://dashboard.stripe.com/test/payments/${json.reference}`
          : "");
      setNotice(
        link
          ? `${getEmployeeName(txn.employee_id)} · ${money(txn.amount)} · ${json.message ?? "Paid"} · Open Stripe: ${link}`
          : `${getEmployeeName(txn.employee_id)} · ${money(txn.amount)} · ${json.message ?? "Paid"}`
      );
      refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Payout failed");
    } finally {
      setPayingId(null);
    }
  }

  async function sendAllPending() {
    if (!pending.length) return;
    setPayingAll(true);
    setError("");
    setNotice("");
    let okCount = 0;
    const failures: string[] = [];
    for (const txn of pending) {
      try {
        const res = await fetch("/api/payments/payout", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            provider,
            amount: txn.amount,
            currency: "usd",
            paymentTxnId: txn.id,
            tenantId,
            employeeId: txn.employee_id,
            employeeName: getEmployeeName(txn.employee_id),
            bankName: txn.bank_name,
            bankAccount: txn.bank_account,
            purpose: txn.purpose
          })
        });
        const json = (await res.json()) as { ok?: boolean; reference?: string; message?: string; provider?: string };
        if (!res.ok || !json.ok || !json.reference) {
          failures.push(`${getEmployeeName(txn.employee_id)}: ${json.message ?? "failed"}`);
          continue;
        }
        completePayoutFromProvider(txn.id, {
          provider: json.provider ?? provider,
          reference: json.reference,
          message: json.message
        });
        okCount += 1;
      } catch (err) {
        failures.push(`${getEmployeeName(txn.employee_id)}: ${err instanceof Error ? err.message : "failed"}`);
      }
    }
    refresh();
    setPayingAll(false);
    if (okCount) setNotice(`Sent ${okCount} payout(s) via ${providerMeta?.label ?? provider}.`);
    if (failures.length) setError(failures.slice(0, 3).join(" · "));
  }

  function doCreateFromPayroll() {
    setError("");
    setNotice("");
    try {
      if (!selectedRunId) throw new Error("Select a finalized payroll period.");
      const created = createSalaryDisbursementsFromPayroll(tenantId, selectedRunId);
      setNotice(`Created ${created.length} pending payout(s). Choose a platform and click Send payout.`);
      refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not create disbursements");
    }
  }

  function createFromPayroll(e: React.FormEvent) {
    e.preventDefault();
    askSave({ editing: false, entityLabel: "payroll disbursements", onConfirm: doCreateFromPayroll });
  }

  function doSubmitAdHoc() {
    setError("");
    setNotice("");
    try {
      const row = createEmployeeDisbursement(tenantId, {
        employee_id: form.employee_id,
        amount: Number(form.amount),
        purpose: form.purpose,
        reference: form.reference.trim() || null,
        notes: form.notes.trim() || null
      });
      persistExtraFields(tenantId, "hrm.payout", row.id, extraJson);
      setExtraJson("");
      setForm({ employee_id: "", amount: "", purpose: "advance", reference: "", notes: "" });
      setShowForm(false);
      setNotice("Payout created. Select a platform and send it.");
      refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not create disbursement");
    }
  }

  function submitAdHoc(e: React.FormEvent) {
    e.preventDefault();
    askSave({ editing: false, entityLabel: "payout", onConfirm: doSubmitAdHoc });
  }

  function exportBankLetterForRun(runId: string) {
    const run = finalizedRuns.find((r) => r.id === runId);
    if (!run) return;
    const items = getPayrollItemsForRun(runId)
      .map((item) => {
        const employee = getEmployee(item.employee_id);
        return employee ? { employee, item } : null;
      })
      .filter((row): row is NonNullable<typeof row> => Boolean(row));
    downloadBankLetter({ company: getCompanyProfile(tenantId), run, items });
  }

  return (
    <AppShell activeModule="hrm">
      <PageHeader
        title="Salary disbursements"
        description="US demo payouts to employee accounts via ACH, Stripe, PayPal, or Wise."
        actionLabel={showForm ? undefined : "Other payout"}
        onAction={() => { setExtraJson(""); setShowForm(true); }}
      />
      <ModuleBreadcrumbs />

      <Panel className="mb-5 border-teal/30 bg-cloud/60">
        <p className="text-sm font-semibold text-ink">Demo payouts</p>
        <ol className="mt-2 list-decimal space-y-1 pl-5 text-sm text-slate-600">
          <li>Finalize payroll → create employee payouts (pending rows with bank details).</li>
          <li>Pick a US platform below → <span className="font-semibold text-ink">Send payout</span> (or Send all pending).</li>
          <li>
            <span className="font-semibold text-ink">ACH / PayPal / Wise</span> = simulated.{" "}
            <span className="font-semibold text-ink">Stripe</span> = look in Stripe Dashboard →{" "}
            <span className="font-semibold text-ink">Payments</span> with{" "}
            <span className="font-semibold text-ink">Test mode</span> ON (toggle top-right). Do not look under{" "}
            <span className="font-semibold text-ink">Payouts</span> — that is Stripe → your bank, not employee salary demos.
          </li>
        </ol>
      </Panel>

      {error ? <p className="mb-4 text-sm font-semibold text-[color:var(--bs-coral)]">{error}</p> : null}
      {notice ? <p className="mb-4 text-sm font-semibold text-emerald-700">{notice}</p> : null}

      <div className="mb-5 grid gap-4 sm:grid-cols-2">
        <Panel>
          <p className="text-sm font-medium text-slate-500">Pending payouts</p>
          <p className="mt-2 text-2xl font-bold text-ink">{money(pendingTotal)}</p>
          <p className="mt-1 text-xs text-slate-500">{pending.length} employee(s)</p>
        </Panel>
        <Panel>
          <p className="text-sm font-medium text-slate-500">Already paid</p>
          <p className="mt-2 text-2xl font-bold text-ink">{money(paidTotal)}</p>
        </Panel>
      </div>

      <Panel className="mb-5">
        <h2 className="mb-3 text-lg font-bold text-ink">Payout platform</h2>
        <div className="grid gap-4 md:grid-cols-[1fr_auto] md:items-end">
          <Field label="Send via" hint={providerMeta?.hint}>
            <SelectInput value={provider} onChange={(e) => setProvider(e.target.value as PayoutProvider)}>
              {PAYOUT_PROVIDERS.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.label}
                </option>
              ))}
            </SelectInput>
          </Field>
          <Button type="button" disabled={!pending.length || payingAll || Boolean(payingId)} onClick={() => void sendAllPending()}>
            {payingAll ? "Sending…" : `Send all pending (${pending.length})`}
          </Button>
        </div>
      </Panel>

      <Panel className="mb-5">
        <h2 className="mb-4 text-lg font-bold text-ink">Create from finalized payroll</h2>
        <form onSubmit={createFromPayroll} className="grid gap-4 md:grid-cols-[1fr_auto_auto] md:items-end">
          <Field label="Finalized payroll period">
            <SelectInput required value={selectedRunId} onChange={(e) => setSelectedRunId(e.target.value)}>
              <option value="">Select period…</option>
              {finalizedRuns.map((run) => (
                <option key={run.id} value={run.id}>
                  {run.period} · {run.employee_count} employees · net {money(run.total_net)}
                </option>
              ))}
            </SelectInput>
          </Field>
          <Button type="submit">Create employee payouts</Button>
          {selectedRunId ? (
            <Button type="button" variant="secondary" onClick={() => exportBankLetterForRun(selectedRunId)}>
              Bank letter PDF
            </Button>
          ) : (
            <span />
          )}
        </form>
        {selectedRunId ? (
          <div className="mt-3">
            <Button
              type="button"
              variant="secondary"
              className="!text-xs"
              onClick={() => {
                const n = markPayrollDisbursementsPaid(tenantId, selectedRunId);
                setNotice(n ? `Marked ${n} as paid (manual).` : "No pending rows for this period.");
                refresh();
              }}
            >
              Mark all pending for this period as paid (skip gateway)
            </Button>
          </div>
        ) : null}
      </Panel>

      {showForm ? (
        <Panel className="mb-5">
          <h2 className="mb-4 text-lg font-bold text-ink">Other payout to an employee</h2>
          <form onSubmit={submitAdHoc} className="grid gap-4 md:grid-cols-2">
            <Field label="Employee">
              <SelectInput required value={form.employee_id} onChange={(e) => setForm({ ...form, employee_id: e.target.value })}>
                <option value="">Select employee…</option>
                {employees.map((emp) => (
                  <option key={emp.id} value={emp.id}>
                    {emp.full_name} · {emp.bank_name ?? "No bank"} {emp.bank_account ? `· ${emp.bank_account}` : ""}
                  </option>
                ))}
              </SelectInput>
            </Field>
            <Field label="Purpose">
              <SelectInput value={form.purpose} onChange={(e) => setForm({ ...form, purpose: e.target.value as PaymentPurpose })}>
                <option value="loan">Loan disbursement</option>
                <option value="advance">Salary advance</option>
                <option value="reimbursement">Reimbursement</option>
                <option value="other">Other</option>
              </SelectInput>
            </Field>
            <Field label="Amount">
              <TextInput type="number" min="0" step="0.01" required value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} />
            </Field>
            <Field label="Reference">
              <TextInput value={form.reference} onChange={(e) => setForm({ ...form, reference: e.target.value })} />
            </Field>
            <Field label="Notes" className="md:col-span-2">
              <TextInput value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
            </Field>
            <ExtraFieldsBlock formKey="hrm.payout" valueJson={extraJson} onChange={setExtraJson} />
            <div className="flex items-end gap-2 md:col-span-2">
              <Button type="submit">Create payout</Button>
              <Button type="button" variant="secondary" onClick={() => { setExtraJson(""); setShowForm(false); }}>
                Cancel
              </Button>
            </div>
          </form>
        </Panel>
      ) : null}

      <Panel className="overflow-hidden p-0">
        <div className="overflow-x-auto">
          <table className="min-w-full text-left text-sm">
            <thead>
              <tr className="border-b border-line bg-cloud">
                {["Employee", "Purpose", "Bank account", "Amount", "Platform / Ref", "Status", "Actions"].map((h) => (
                  <th key={h} className="px-3 py-3 font-semibold text-slate-600">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {[...txns]
                .sort((a, b) => (a.created_at < b.created_at ? 1 : -1))
                .map((t) => (
                  <tr key={t.id} className="border-b border-line">
                    <td className="px-3 py-3 font-medium text-ink">
                      {getEmployeeName(t.employee_id)}
                      <ExtraFieldsReadout tenantId={tenantId} formKey="hrm.payout" recordId={t.id} />
                    </td>
                    <td className="px-3 py-3 capitalize">{t.purpose?.replace(/_/g, " ") ?? "—"}</td>
                    <td className="px-3 py-3 text-xs text-slate-600">
                      <div>{t.bank_name ?? "—"}</div>
                      <div className="font-mono">{t.bank_account ?? "No account on file"}</div>
                    </td>
                    <td className="px-3 py-3 font-semibold">{money(t.amount)}</td>
                    <td className="px-3 py-3 text-xs">
                      <div className="capitalize">{t.method?.replace(/_/g, " ") ?? "—"}</div>
                      <div className="font-mono text-slate-500">{t.reference ?? "—"}</div>
                    </td>
                    <td className="px-3 py-3">
                      <StatusBadge status={t.status} />
                    </td>
                    <td className="px-3 py-3">
                      {t.status === "pending" ? (
                        <div className="flex flex-wrap gap-1">
                          <Button
                            className="!px-2 !py-1 !text-xs"
                            disabled={payingAll || payingId === t.id}
                            onClick={() => void sendPayout(t.id)}
                          >
                            {payingId === t.id ? "Sending…" : "Send payout"}
                          </Button>
                          <Button
                            variant="secondary"
                            className="!px-2 !py-1 !text-xs"
                            disabled={Boolean(payingId) || payingAll}
                            onClick={() => {
                              markPaymentPaid(t.id);
                              setNotice(`Marked paid manually — ${getEmployeeName(t.employee_id)}`);
                              refresh();
                            }}
                          >
                            Mark paid
                          </Button>
                          <Button
                            variant="danger"
                            className="!px-2 !py-1 !text-xs"
                            disabled={Boolean(payingId) || payingAll}
                            onClick={() => {
                              markPaymentFailed(t.id);
                              refresh();
                            }}
                          >
                            Failed
                          </Button>
                        </div>
                      ) : (
                        <span className="text-xs text-slate-400">Done</span>
                      )}
                    </td>
                  </tr>
                ))}
              {txns.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-3 py-8 text-center text-slate-400">
                    No disbursements yet. Finalize payroll, then create employee payouts above.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </Panel>
      {dialog}
    </AppShell>
  );
}
