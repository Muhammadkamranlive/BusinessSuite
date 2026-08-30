"use client";

import { AppShell } from "@/components/app-shell";
import { AdminSubnav } from "@/components/admin/admin-subnav";
import { ModuleBreadcrumbs } from "@/components/common/module-breadcrumbs";
import { PageHeader } from "@/components/common/page-header";
import { Panel } from "@/components/ui";

const LATER: Array<{ name: string; why: string; status?: string }> = [
  {
    name: "Email / Gmail (Nodemailer)",
    why: "Shared email-api + templates — credentials, leave, invoices, orders, surveys",
    status: "Live — /settings/email-templates"
  },
  { name: "SMS / WhatsApp", why: "OPD queue and payment reminders" },
  { name: "Bank statement auto-sync (OFX / API)", why: "Bank reconciliation file import" },
  { name: "Payment gateways (Stripe, JazzCash, Easypaisa)", why: "Receipts and hospital billing" },
  { name: "PACS / DICOM viewers", why: "Radiology imaging" },
  { name: "Biometric / device attendance", why: "HR clock-in devices" },
  { name: "E-invoicing (FBR / PEPPOL)", why: "Tax authority filing" },
  { name: "Calendar (Google / Outlook)", why: "Appointment sync" },
  { name: "Zoom / Meet", why: "Telemedicine and interviews" },
  { name: "Pharmacy drug databases", why: "Formulary lookup" },
  { name: "Maps / geo-fence", why: "Field attendance" },
  { name: "SIEM / immutable audit export", why: "Compliance export" },
  { name: "Cloud backup vendor", why: "One-click offsite backup" }
];

export default function IntegrationsPage() {
  return (
    <AppShell activeModule="settings">
      <ModuleBreadcrumbs />
      <AdminSubnav active="/settings/integrations" />
      <PageHeader
        title="Third-party integrations"
        description="Listed for later. CRUD modules in this ERP do not depend on these vendors."
      />
      <Panel>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-slate-500">
                <th className="px-3 py-2">Integration</th>
                <th>Why later</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {LATER.map((row) => (
                <tr key={row.name} className="border-t border-line">
                  <td className="px-3 py-3 font-semibold">{row.name}</td>
                  <td>{row.why}</td>
                  <td>{row.status ?? "Later"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Panel>
    </AppShell>
  );
}
