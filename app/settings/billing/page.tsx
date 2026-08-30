"use client";

import { useEffect, useMemo, useState } from "react";
import { CalendarClock, Building2, FileText, CreditCard } from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { AdminSubnav } from "@/components/admin/admin-subnav";
import { ModuleBreadcrumbs } from "@/components/common/module-breadcrumbs";
import { PageHeader } from "@/components/common/page-header";
import { useConfirm } from "@/components/common/use-confirm";
import { SubscriptionCheckout } from "@/components/billing/subscription-checkout";
import { ExtraFieldsBlock } from "@/components/forms/extra-fields-block";
import { ExtraFieldsReadout } from "@/components/forms/extra-fields-readout";
import { Badge, Button, Field, Panel, StatTile, TextArea, TextInput } from "@/components/ui";
import { getStoredTenantId, getStoredUserEmail } from "@/lib/auth/session";
import { findAccountByEmail } from "@/lib/auth/public-auth";
import { listAdminTenants, upsertTenant, type AdminTenant } from "@/modules/admin/services/admin.store";
import { getExtraFieldValues, persistExtraFields } from "@/modules/forms/services/extra-fields.store";
import {
  daysUntilNextPayment,
  formatMoney,
  getActiveSubscription,
  getPackage,
  listLocalInvoices,
  listTenantSubscriptions,
  nextPaymentLabel,
  type SubscriptionInvoice
} from "@/modules/billing/services/subscriptions.store";

type StripeInvoiceRow = {
  id: string;
  number: string;
  status: string;
  amount_paid: number;
  amount_due: number;
  currency: string;
  created: number;
  period_start: number;
  period_end: number;
  hosted_invoice_url: string | null;
  invoice_pdf: string | null;
};

export default function CompanyBillingPage() {
  const tenantId = getStoredTenantId() ?? "alpha";
  const email = getStoredUserEmail() ?? "";
  const account = email ? findAccountByEmail(email) : null;
  const { askSave, dialog } = useConfirm();
  const [tick, setTick] = useState(0);
  const [tenant, setTenant] = useState<AdminTenant | null>(null);
  const [extraJson, setExtraJson] = useState("");
  const [message, setMessage] = useState("");
  const [stripeInvoices, setStripeInvoices] = useState<StripeInvoiceRow[]>([]);
  const [profile, setProfile] = useState({
    name: "",
    industry: "",
    region: "",
    email: "",
    phone: "",
    website: "",
    address: "",
    bio: ""
  });

  const active = useMemo(() => getActiveSubscription(tenantId), [tenantId, tick]);
  const history = useMemo(() => listTenantSubscriptions(tenantId), [tenantId, tick]);
  const localInvoices = useMemo(() => listLocalInvoices(tenantId), [tenantId, tick]);
  const pkg = active ? getPackage(active.package_id) : null;
  const daysLeft = daysUntilNextPayment(active);

  function refreshTenant() {
    const row = listAdminTenants().find((t) => t.id === tenantId) ?? null;
    setTenant(row);
    if (row) {
      setProfile({
        name: row.name,
        industry: row.industry,
        region: row.region,
        email: row.email,
        phone: row.phone,
        website: row.website ?? "",
        address: row.address ?? "",
        bio: row.bio ?? ""
      });
      setExtraJson(getExtraFieldValues(tenantId, "billing.company", row.id));
    } else {
      setProfile({
        name: account?.name ?? "Company",
        industry: "",
        region: "",
        email: email,
        phone: "",
        website: "",
        address: "",
        bio: ""
      });
      setExtraJson(getExtraFieldValues(tenantId, "billing.company", tenantId));
    }
  }

  useEffect(() => {
    refreshTenant();
  }, [tenantId, tick]);

  useEffect(() => {
    const customerId = active?.stripe_customer_id;
    if (!customerId) {
      setStripeInvoices([]);
      return;
    }
    fetch("/api/billing/invoices", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ customerId })
    })
      .then((r) => r.json())
      .then((data: { ok?: boolean; invoices?: StripeInvoiceRow[] }) => {
        if (data.ok && data.invoices) setStripeInvoices(data.invoices);
      })
      .catch(() => setStripeInvoices([]));
  }, [active?.stripe_customer_id, tick]);

  function saveCompany() {
    askSave({
      editing: true,
      entityLabel: "company profile",
      onConfirm: () => {
        const saved = upsertTenant({
          id: tenant?.id ?? tenantId,
          name: profile.name.trim() || "Company",
          industry: profile.industry.trim() || "General business",
          region: profile.region.trim() || "Global",
          plan: active ? `${active.package_code[0].toUpperCase()}${active.package_code.slice(1)}` : tenant?.plan ?? "Demo Pro",
          status: tenant?.status ?? "active",
          email: profile.email.trim() || email,
          phone: profile.phone.trim(),
          website: profile.website.trim(),
          address: profile.address.trim(),
          bio: profile.bio.trim()
        });
        persistExtraFields(tenantId, "billing.company", saved.id, extraJson);
        setMessage("Company profile saved.");
        setTick((n) => n + 1);
      }
    });
  }

  return (
    <AppShell activeModule="settings">
      <AdminSubnav active="/settings/billing" />
      <PageHeader
        title="My company & subscription"
        description="View company details, subscription invoices, next payment, and update your plan. Add custom bio fields with Extra fields."
      />
      <ModuleBreadcrumbs />
      {message ? <p className="mb-4 text-sm font-semibold text-teal">{message}</p> : null}

      <div className="mb-5 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatTile
          label="Plan"
          value={active ? active.package_code : "None"}
          detail={active ? `${formatMoney(active.amount_cents, active.currency)} / ${active.interval}` : "Not activated"}
          icon={CreditCard}
          tone="teal"
        />
        <StatTile
          label="Status"
          value={active?.status ?? "inactive"}
          detail={pkg?.badge ?? "Subscription"}
          icon={FileText}
          tone={active?.status === "active" ? "mint" : "amber"}
        />
        <StatTile
          label="Next payment"
          value={daysLeft == null ? "—" : daysLeft < 0 ? "Due" : `${daysLeft}d`}
          detail={nextPaymentLabel(active)}
          icon={CalendarClock}
          tone="coral"
        />
        <StatTile
          label="Company"
          value={profile.name || "—"}
          detail={profile.industry || profile.region || "Profile"}
          icon={Building2}
          tone="amber"
        />
      </div>

      <div className="mb-5 grid gap-5 xl:grid-cols-2">
        <Panel>
          <h2 className="mb-1 text-lg font-bold text-ink">Company details</h2>
          <p className="mb-4 text-sm text-slate-500">Update your company profile. Use “Add extra field / Modify form” for custom bio fields.</p>
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Company name" className="sm:col-span-2">
              <TextInput value={profile.name} onChange={(e) => setProfile({ ...profile, name: e.target.value })} />
            </Field>
            <Field label="Industry">
              <TextInput value={profile.industry} onChange={(e) => setProfile({ ...profile, industry: e.target.value })} />
            </Field>
            <Field label="Region">
              <TextInput value={profile.region} onChange={(e) => setProfile({ ...profile, region: e.target.value })} />
            </Field>
            <Field label="Billing email">
              <TextInput type="email" value={profile.email} onChange={(e) => setProfile({ ...profile, email: e.target.value })} />
            </Field>
            <Field label="Phone">
              <TextInput value={profile.phone} onChange={(e) => setProfile({ ...profile, phone: e.target.value })} />
            </Field>
            <Field label="Website" className="sm:col-span-2">
              <TextInput value={profile.website} onChange={(e) => setProfile({ ...profile, website: e.target.value })} />
            </Field>
            <Field label="Address" className="sm:col-span-2">
              <TextInput value={profile.address} onChange={(e) => setProfile({ ...profile, address: e.target.value })} />
            </Field>
            <Field label="Company bio" className="sm:col-span-2">
              <TextArea value={profile.bio} onChange={(e) => setProfile({ ...profile, bio: e.target.value })} placeholder="Short company description…" />
            </Field>
          </div>
          <div className="mt-4">
            <ExtraFieldsBlock formKey="billing.company" valueJson={extraJson} onChange={setExtraJson} />
          </div>
          <div className="mt-4">
            <Button onClick={saveCompany}>Save company profile</Button>
          </div>
          {extraJson ? (
            <div className="mt-4 border-t border-line pt-4">
              <ExtraFieldsReadout tenantId={tenantId} formKey="billing.company" json={extraJson} />
            </div>
          ) : null}
        </Panel>

        <Panel>
          <h2 className="mb-1 text-lg font-bold text-ink">Subscription overview</h2>
          <p className="mb-4 text-sm text-slate-500">Current package and upcoming renewal.</p>
          {active ? (
            <div className="space-y-3 text-sm">
              <div className="flex flex-wrap items-center justify-between gap-2 rounded-[var(--bs-radius)] border border-line bg-cloud px-3 py-3">
                <div>
                  <p className="font-bold capitalize text-ink">{active.package_code} plan</p>
                  <p className="text-slate-500">{pkg?.tagline ?? "BusinessSuite ERP subscription"}</p>
                </div>
                <Badge tone="success">{active.status}</Badge>
              </div>
              <p>
                <span className="font-semibold text-ink">Amount: </span>
                {formatMoney(active.amount_cents, active.currency)} / {active.interval}
              </p>
              <p>
                <span className="font-semibold text-ink">Billing email: </span>
                {active.billing_email}
              </p>
              <p>
                <span className="font-semibold text-ink">Activated: </span>
                {active.activated_at ? new Date(active.activated_at).toLocaleString() : "—"}
              </p>
              <p>
                <span className="font-semibold text-ink">Next payment: </span>
                {nextPaymentLabel(active)}
                {daysLeft != null ? ` (${daysLeft} day${daysLeft === 1 ? "" : "s"})` : ""}
              </p>
              {active.stripe_subscription_id ? (
                <p className="text-xs text-slate-500">Stripe subscription: {active.stripe_subscription_id}</p>
              ) : (
                <p className="text-xs text-slate-500">Local demo subscription (no Stripe customer yet).</p>
              )}
              {pkg ? (
                <ul className="mt-2 space-y-1 text-slate-600">
                  {pkg.features.map((f) => (
                    <li key={f}>· {f}</li>
                  ))}
                </ul>
              ) : null}
            </div>
          ) : (
            <p className="text-sm text-slate-500">No active subscription. Activate below to unlock full ERP for this company.</p>
          )}
        </Panel>
      </div>

      <Panel className="mb-5">
        <h2 className="mb-1 text-lg font-bold text-ink">Subscription invoices</h2>
        <p className="mb-4 text-sm text-slate-500">Receipts for subscription payments. Stripe invoices appear when a Stripe customer is linked.</p>

        <div className="overflow-x-auto">
          <table className="min-w-full text-left text-sm">
            <thead>
              <tr className="border-b border-line bg-cloud">
                {["Invoice", "Plan", "Amount", "Period", "Status", "Paid", "Link"].map((h) => (
                  <th key={h} className="px-3 py-3 font-semibold text-slate-600">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {localInvoices.length === 0 && stripeInvoices.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-3 py-8 text-center text-slate-500">
                    No subscription invoices yet.
                  </td>
                </tr>
              ) : null}

              {localInvoices.map((inv: SubscriptionInvoice) => (
                <tr key={inv.id} className="border-b border-line">
                  <td className="px-3 py-3 font-medium">{inv.invoice_number}</td>
                  <td className="px-3 py-3 capitalize">{inv.package_code}</td>
                  <td className="px-3 py-3">{formatMoney(inv.amount_cents, inv.currency)}</td>
                  <td className="px-3 py-3 text-xs">
                    {inv.period_start ? new Date(inv.period_start).toLocaleDateString() : "—"}
                    {" → "}
                    {inv.period_end ? new Date(inv.period_end).toLocaleDateString() : "—"}
                  </td>
                  <td className="px-3 py-3 capitalize">{inv.status}</td>
                  <td className="px-3 py-3">{inv.paid_at ? new Date(inv.paid_at).toLocaleString() : "—"}</td>
                  <td className="px-3 py-3">
                    {inv.stripe_hosted_invoice_url ? (
                      <a className="font-semibold text-teal hover:underline" href={inv.stripe_hosted_invoice_url} target="_blank" rel="noreferrer">
                        View
                      </a>
                    ) : (
                      "—"
                    )}
                  </td>
                </tr>
              ))}

              {stripeInvoices.map((inv) => (
                <tr key={`stripe-${inv.id}`} className="border-b border-line">
                  <td className="px-3 py-3 font-medium">{inv.number || inv.id}</td>
                  <td className="px-3 py-3">Stripe</td>
                  <td className="px-3 py-3">{formatMoney(inv.amount_paid || inv.amount_due, inv.currency)}</td>
                  <td className="px-3 py-3 text-xs">
                    {inv.period_start ? new Date(inv.period_start * 1000).toLocaleDateString() : "—"}
                    {" → "}
                    {inv.period_end ? new Date(inv.period_end * 1000).toLocaleDateString() : "—"}
                  </td>
                  <td className="px-3 py-3 capitalize">{inv.status}</td>
                  <td className="px-3 py-3">{inv.created ? new Date(inv.created * 1000).toLocaleString() : "—"}</td>
                  <td className="px-3 py-3">
                    {inv.hosted_invoice_url || inv.invoice_pdf ? (
                      <a
                        className="font-semibold text-teal hover:underline"
                        href={inv.hosted_invoice_url || inv.invoice_pdf || "#"}
                        target="_blank"
                        rel="noreferrer"
                      >
                        View
                      </a>
                    ) : (
                      "—"
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Panel>

      <Panel className="mb-5">
        <h2 className="mb-4 text-lg font-bold text-ink">{active ? "Change package" : "Activate subscription"}</h2>
        <SubscriptionCheckout
          tenantId={tenantId}
          companyName={profile.name || tenant?.name || "Company"}
          billingEmail={profile.email || email || "billing@example.com"}
          initialPackageId={active?.package_id}
          initialInterval={active?.interval ?? "month"}
          existingStripeSubscriptionId={active?.stripe_subscription_id}
          onActivated={() => {
            setMessage("Subscription updated.");
            setTick((n) => n + 1);
          }}
        />
      </Panel>

      <Panel>
        <h2 className="mb-3 text-lg font-bold text-ink">Subscription history</h2>
        <div className="overflow-x-auto">
          <table className="min-w-full text-left text-sm">
            <thead>
              <tr className="border-b border-line bg-cloud">
                {["Plan", "Cycle", "Amount", "Status", "Updated"].map((h) => (
                  <th key={h} className="px-3 py-3 font-semibold text-slate-600">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {history.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-3 py-6 text-center text-slate-500">
                    No billing records yet.
                  </td>
                </tr>
              ) : (
                history.map((s) => (
                  <tr key={s.id} className="border-b border-line">
                    <td className="px-3 py-3 capitalize">{s.package_code}</td>
                    <td className="px-3 py-3">{s.interval}</td>
                    <td className="px-3 py-3">{formatMoney(s.amount_cents, s.currency)}</td>
                    <td className="px-3 py-3">{s.status}</td>
                    <td className="px-3 py-3">{new Date(s.updated_at).toLocaleString()}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </Panel>
      {dialog}
    </AppShell>
  );
}
