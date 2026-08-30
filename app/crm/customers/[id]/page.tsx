"use client";

import { useParams } from "next/navigation";
import Link from "next/link";
import { AppShell } from "@/components/app-shell";
import { ModuleBreadcrumbs } from "@/components/common/module-breadcrumbs";
import { PageHeader } from "@/components/common/page-header";
import { StatusBadge } from "@/components/common/status-badge";
import { ExtraFieldsReadout } from "@/components/forms/extra-fields-readout";
import { Button, Panel } from "@/components/ui";
import { getStoredTenantId } from "@/lib/auth/session";
import { money } from "@/lib/utils";
import { getCustomer, listActivities, listContacts, listDeals, listTickets } from "@/modules/crm/services/crm.store";
import { customerOpenAr, listInvoices, listQuotations } from "@/modules/sales/services/sales.store";

export default function CustomerDetailPage() {
  const params = useParams();
  const tenantId = getStoredTenantId() ?? "alpha";
  const customer = getCustomer(params.id as string);

  if (!customer) {
    return (
      <AppShell activeModule="crm">
        <ModuleBreadcrumbs trail={[{ label: "Customers", href: "/crm/customers" }, { label: "Not found" }]} />
        <PageHeader title="Customer not found" />
      </AppShell>
    );
  }

  const contacts = listContacts(tenantId).filter((c) => c.customer_id === customer.id);
  const deals = listDeals(tenantId).filter((d) => d.customer_id === customer.id);
  const activities = listActivities(tenantId).filter((a) => a.related_type === "customer" && a.related_id === customer.id);
  const invoices = listInvoices(tenantId).filter((i) => i.customer_name === customer.name || i.customer_id === customer.id);
  const quotes = listQuotations(tenantId).filter((q) => q.customer_name === customer.name || q.customer_id === customer.id);
  const tickets = listTickets(tenantId).filter((t) => t.customer_id === customer.id);
  const ar = customerOpenAr(tenantId, customer.name);

  return (
    <AppShell activeModule="crm">
      <ModuleBreadcrumbs trail={[{ label: customer.name }]} />
      <PageHeader title={customer.name} description={`${customer.customer_no} · credit ${money(customer.credit_limit ?? 0)} · AR ${money(ar)}`} />
      <div className="grid gap-4 lg:grid-cols-2">
        <Panel>
          <h2 className="text-lg font-bold text-ink">Account</h2>
          <dl className="mt-3 grid gap-3 text-sm md:grid-cols-2">
            <div><dt className="text-slate-500">Type</dt><dd className="capitalize font-medium">{customer.type}</dd></div>
            <div><dt className="text-slate-500">Status</dt><dd><StatusBadge status={customer.status} /></dd></div>
            <div><dt className="text-slate-500">Email</dt><dd>{customer.email}</dd></div>
            <div><dt className="text-slate-500">Phone</dt><dd>{customer.phone}</dd></div>
            <div><dt className="text-slate-500">Industry</dt><dd>{customer.industry ?? "—"}</dd></div>
            <div><dt className="text-slate-500">Credit terms</dt><dd>{customer.credit_terms ?? "—"}</dd></div>
            <div><dt className="text-slate-500">Billing</dt><dd>{customer.billing_address ?? "—"}</dd></div>
            <div><dt className="text-slate-500">Shipping</dt><dd>{customer.shipping_address ?? "—"}</dd></div>
          </dl>
          <ExtraFieldsReadout tenantId={tenantId} formKey="crm.customer" recordId={customer.id} />
        </Panel>
        <Panel>
          <h2 className="text-lg font-bold text-ink">Contacts</h2>
          <ul className="mt-3 space-y-2 text-sm">
            {contacts.map((c) => <li key={c.id}>{c.full_name} · {c.email} {c.is_primary ? "(primary)" : ""}</li>)}
            {contacts.length === 0 ? <li className="text-slate-500">No contacts. <Link className="text-teal" href="/crm/contacts">Add</Link></li> : null}
          </ul>
        </Panel>
        <Panel>
          <h2 className="text-lg font-bold text-ink">Deals & quotes</h2>
          <ul className="mt-3 space-y-2 text-sm">
            {deals.map((d) => <li key={d.id}>{d.title} · {money(d.amount)} · {d.stage}</li>)}
            {quotes.map((q) => <li key={q.id}>{q.quotation_no} · {money(q.total_amount)} · {q.status}</li>)}
            {deals.length === 0 && quotes.length === 0 ? <li className="text-slate-500">None yet</li> : null}
          </ul>
        </Panel>
        <Panel>
          <h2 className="text-lg font-bold text-ink">Invoices</h2>
          <ul className="mt-3 space-y-2 text-sm">
            {invoices.map((i) => <li key={i.id}>{i.invoice_no} · {money(i.balance_due)} due · {i.status}</li>)}
            {invoices.length === 0 ? <li className="text-slate-500">No invoices</li> : null}
          </ul>
        </Panel>
        <Panel>
          <h2 className="text-lg font-bold text-ink">Tickets</h2>
          <ul className="mt-3 space-y-2 text-sm">
            {tickets.map((t) => <li key={t.id}>{t.ticket_no} · {t.subject} · {t.status}</li>)}
            {tickets.length === 0 ? <li className="text-slate-500">No tickets</li> : null}
          </ul>
        </Panel>
        <Panel>
          <h2 className="text-lg font-bold text-ink">Activity</h2>
          <ul className="mt-3 space-y-2 text-sm">
            {activities.map((a) => <li key={a.id}>{a.subject} · {a.activity_type}</li>)}
            {activities.length === 0 ? <li className="text-slate-500">No activities</li> : null}
          </ul>
        </Panel>
      </div>
      <Button href="/crm/customers" variant="secondary" className="mt-4">Back</Button>
    </AppShell>
  );
}
