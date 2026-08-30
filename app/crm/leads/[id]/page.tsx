"use client";

import { useParams, useRouter } from "next/navigation";
import { AppShell } from "@/components/app-shell";
import { ModuleBreadcrumbs } from "@/components/common/module-breadcrumbs";
import { PageHeader } from "@/components/common/page-header";
import { StatusBadge } from "@/components/common/status-badge";
import { ExtraFieldsReadout } from "@/components/forms/extra-fields-readout";
import { Panel, Button } from "@/components/ui";
import { getStoredTenantId } from "@/lib/auth/session";
import { money } from "@/lib/utils";
import { convertLeadToCustomer, convertLeadToDeal, getLead, getLeadActivities } from "@/modules/crm/services/crm.store";
import { useConfirm } from "@/components/common/use-confirm";

export default function LeadDetailPage() {
  const params = useParams();
  const router = useRouter();
  const tenantId = getStoredTenantId() ?? "alpha";
  const leadId = params.id as string;
  const lead = getLead(leadId);
  const activities = getLeadActivities(leadId);
  const { askSave, dialog } = useConfirm();

  if (!lead) {
    return (
      <AppShell activeModule="crm">
        <ModuleBreadcrumbs trail={[{ label: "Leads", href: "/crm/leads" }, { label: "Not found" }]} />
        <PageHeader title="Lead not found" />
      </AppShell>
    );
  }

  function handleConvert() {
    askSave({
      editing: true,
      entityLabel: "lead conversion to customer",
      onConfirm: () => {
        try {
          const customer = convertLeadToCustomer(leadId);
          if (customer) router.push(`/crm/customers/${customer.id}`);
        } catch (e) {
          window.alert(e instanceof Error ? e.message : "Cannot convert this lead yet.");
        }
      }
    });
  }

  return (
    <AppShell activeModule="crm">
      {dialog}
      <ModuleBreadcrumbs trail={[{ label: lead.company_name }]} />
      <PageHeader
        title={lead.company_name}
        description={`${lead.lead_no} · ${lead.contact_name}`}
        actionLabel={lead.status !== "converted" ? "Convert to Customer" : undefined}
        onAction={lead.status !== "converted" ? handleConvert : undefined}
      />
      <div className="grid gap-4 lg:grid-cols-2">
        <Panel>
          <h2 className="text-lg font-bold text-ink">Lead Details</h2>
          <dl className="mt-4 grid gap-3 text-sm">
            <div className="flex justify-between"><dt className="text-slate-500">Status</dt><dd><StatusBadge status={lead.status} /></dd></div>
            <div className="flex justify-between"><dt className="text-slate-500">Priority</dt><dd className="capitalize">{lead.priority}</dd></div>
            <div className="flex justify-between"><dt className="text-slate-500">Email</dt><dd>{lead.email}</dd></div>
            <div className="flex justify-between"><dt className="text-slate-500">Phone</dt><dd>{lead.phone}</dd></div>
            <div className="flex justify-between"><dt className="text-slate-500">Source</dt><dd className="capitalize">{lead.source.replace(/_/g, " ")}</dd></div>
            <div className="flex justify-between"><dt className="text-slate-500">Estimated Value</dt><dd>{money(lead.estimated_value)}</dd></div>
            <div className="flex justify-between"><dt className="text-slate-500">Score</dt><dd>{lead.score ?? 0}</dd></div>
          </dl>
          {lead.notes ? <p className="mt-4 text-sm text-slate-600">{lead.notes}</p> : null}
          <ExtraFieldsReadout tenantId={tenantId} formKey="crm.lead" recordId={lead.id} />
        </Panel>
        <Panel>
          <h2 className="text-lg font-bold text-ink">Activity Timeline</h2>
          <ul className="mt-4 space-y-3">
            {activities.length === 0 ? (
              <li className="text-sm text-slate-500">No activities yet.</li>
            ) : (
              activities.map((a) => (
                <li key={a.id} className="rounded-md border border-line bg-cloud px-3 py-2 text-sm">
                  <p className="font-semibold text-ink">{a.subject}</p>
                  <p className="text-slate-500 capitalize">{a.activity_type} · {a.description}</p>
                </li>
              ))
            )}
          </ul>
        </Panel>
      </div>
      <div className="mt-4 flex flex-wrap gap-2">
        {lead.status !== "converted" ? (
          <Button
            type="button"
            variant="secondary"
            onClick={() =>
              askSave({
                editing: true,
                entityLabel: "lead conversion to opportunity",
                onConfirm: () => {
                  const deal = convertLeadToDeal(leadId);
                  if (deal) router.push("/crm/deals");
                }
              })
            }
          >
            Convert to opportunity
          </Button>
        ) : null}
        <Button variant="secondary" onClick={() => router.push("/crm/leads")}>Back to Leads</Button>
      </div>
    </AppShell>
  );
}
