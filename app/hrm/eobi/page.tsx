"use client";

import { useMemo, useState } from "react";
import { CalendarClock, Landmark } from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { PageHeader } from "@/components/common/page-header";
import { ModuleBreadcrumbs } from "@/components/common/module-breadcrumbs";
import { Badge, Button, Field, Panel, StatTile, TextInput } from "@/components/ui";
import { money } from "@/lib/utils";
import { getStoredTenantId } from "@/lib/auth/session";
import { getCurrentEobiAmount, listEobiSettings, setEobiAmount } from "@/modules/hrm/services/hrm.store";

function todayIso() {
  return new Date().toISOString().slice(0, 10);
}

export default function EobiPage() {
  const tenantId = getStoredTenantId() ?? "alpha";
  const [refreshKey, setRefreshKey] = useState(0);
  const [amount, setAmount] = useState("370");
  const [effectiveFrom, setEffectiveFrom] = useState(todayIso());
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  const settings = useMemo(() => listEobiSettings(tenantId), [tenantId, refreshKey]);
  const currentAmount = useMemo(() => getCurrentEobiAmount(tenantId), [tenantId, refreshKey]);

  const sortedSettings = useMemo(() => [...settings].sort((a, b) => (a.effective_from < b.effective_from ? 1 : -1)), [settings]);

  function refresh() {
    setRefreshKey((n) => n + 1);
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setNotice("");
    const value = Number(amount);
    if (!Number.isFinite(value) || value < 0) {
      setError("Enter a valid EOBI amount.");
      return;
    }
    if (!effectiveFrom) {
      setError("Select an effective date.");
      return;
    }
    setEobiAmount(tenantId, value, effectiveFrom);
    setNotice(`EOBI amount updated to ${money(value)} effective ${effectiveFrom}.`);
    refresh();
  }

  return (
    <AppShell activeModule="hrm">
      <PageHeader title="EOBI" description="Manage the flat EOBI (Employees' Old-Age Benefits Institution) contribution amount." />
      <ModuleBreadcrumbs />

      <div className="mb-6 grid gap-4 sm:grid-cols-2">
        <StatTile label="Current amount" value={money(currentAmount)} detail="Applied per employee per period" icon={Landmark} tone="teal" />
        <StatTile label="Rate changes recorded" value={String(settings.length)} detail="Historical settings" icon={CalendarClock} tone="mint" />
      </div>

      {error ? <p className="mb-4 text-sm font-semibold text-[color:var(--bs-coral)]">{error}</p> : null}
      {notice ? <p className="mb-4 text-sm font-semibold text-emerald-600">{notice}</p> : null}

      <div className="grid gap-5 lg:grid-cols-[1fr_1.4fr]">
        <Panel>
          <h2 className="mb-4 text-lg font-bold text-ink">Set new amount</h2>
          <form onSubmit={handleSubmit} className="space-y-4">
            <Field label="Amount" hint="Flat amount per employee per pay period">
              <TextInput required type="number" min="0" step="1" value={amount} onChange={(e) => setAmount(e.target.value)} />
            </Field>
            <Field label="Effective from">
              <TextInput required type="date" value={effectiveFrom} onChange={(e) => setEffectiveFrom(e.target.value)} />
            </Field>
            <Button type="submit">Update amount</Button>
          </form>
        </Panel>

        <Panel className="overflow-hidden p-0">
          <div className="border-b border-line px-4 py-3">
            <h2 className="text-lg font-bold text-ink">Amount history</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full text-left text-sm">
              <thead>
                <tr className="border-b border-line bg-cloud">
                  {["Effective From", "Amount"].map((h) => (
                    <th key={h} className="px-4 py-3 font-semibold text-slate-600">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {sortedSettings.map((s) => (
                  <tr key={s.id} className="border-b border-line">
                    <td className="px-4 py-3 text-ink">
                      <span className="inline-flex items-center gap-2">
                        <CalendarClock className="size-4 text-slate-400" aria-hidden="true" />
                        {s.effective_from}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <Badge tone={s.amount === currentAmount ? "success" : "neutral"}>{money(s.amount)}</Badge>
                    </td>
                  </tr>
                ))}
                {sortedSettings.length === 0 ? (
                  <tr>
                    <td colSpan={2} className="px-4 py-8 text-center text-sm text-slate-500">
                      No EOBI settings configured yet.
                    </td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </div>
        </Panel>
      </div>
    </AppShell>
  );
}
