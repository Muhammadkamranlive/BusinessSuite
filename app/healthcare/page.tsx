"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Ambulance,
  BedDouble,
  Building2,
  FlaskConical,
  HeartPulse,
  Pill,
  Stethoscope,
  Users,
  Video
} from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { ModuleBreadcrumbs } from "@/components/common/module-breadcrumbs";
import { ModuleStartGuide } from "@/components/guides/module-start-guide";
import { ActionCard, Panel, SectionHeader, StatTile } from "@/components/ui";
import { getStoredTenantId } from "@/lib/auth/session";
import { money } from "@/lib/utils";
import { catalogHref, catalogSpecsForModule } from "@/modules/catalog/catalog-registry";
import {
  getClinicalAnalytics,
  listAdmissions,
  pullHmsClinicalFromSupabase,
  subscribeHmsClinical
} from "@/modules/healthcare/services/hms-clinical.store";
import { listPatients, pullHmsFromSupabase, subscribeHms } from "@/modules/healthcare/services/hms.store";

const HMS_CATALOG_SLUGS = new Set([
  "healthcare.patients",
  "healthcare.opd",
  "healthcare.wards",
  "healthcare.beds",
  "healthcare.admissions",
  "healthcare.emergency",
  "healthcare.prescriptions",
  "healthcare.pharmacy",
  "healthcare.dispensing",
  "healthcare.lab_orders",
  "healthcare.radiology",
  "healthcare.claims",
  "healthcare.nursing",
  "healthcare.vitals",
  "healthcare.rosters",
  "healthcare.equipment",
  "healthcare.emr"
]);

export default function HealthcareHomePage() {
  const tenantId = getStoredTenantId() ?? "alpha";
  const [tick, setTick] = useState(0);

  useEffect(() => {
    void pullHmsClinicalFromSupabase(tenantId).finally(() => setTick((t) => t + 1));
    void pullHmsFromSupabase(tenantId).finally(() => setTick((t) => t + 1));
    const u1 = subscribeHmsClinical(() => setTick((t) => t + 1));
    const u2 = subscribeHms(() => setTick((t) => t + 1));
    return () => {
      u1();
      u2();
    };
  }, [tenantId]);

  const patients = useMemo(() => listPatients(tenantId), [tenantId, tick]);
  const admissions = useMemo(() => listAdmissions(tenantId).filter((a) => a.status === "admitted"), [tenantId, tick]);
  const analytics = useMemo(() => getClinicalAnalytics(tenantId), [tenantId, tick]);
  const catalogSpecs = useMemo(
    () => catalogSpecsForModule("healthcare").filter((s) => !HMS_CATALOG_SLUGS.has(s.slug)),
    []
  );

  return (
    <AppShell activeModule="healthcare">
      <ModuleBreadcrumbs />
      <ModuleStartGuide module="healthcare" />
      <div className="mb-6 grid gap-4 md:grid-cols-4">
        <StatTile label="Patients" value={String(patients.length)} detail="HMS registration / MRN" icon={Users} tone="teal" />
        <StatTile label="IPD stays" value={String(admissions.length)} detail="Currently admitted" icon={HeartPulse} tone="coral" />
        <StatTile label="Occupied beds" value={`${analytics.occupancy_rate}%`} detail={`${analytics.occupied_beds}/${analytics.total_beds} beds`} icon={BedDouble} tone="amber" />
        <StatTile label="Clinical revenue" value={money(analytics.revenue_total)} detail={`${analytics.pending_labs} pending labs`} icon={Stethoscope} tone="mint" />
      </div>
      <Panel className="mb-4">
        <SectionHeader title="HMS Phase 1 (PHI / DB)" eyebrow="Dedicated tables · RLS · audit · DSAR" />
        <div className="mt-4 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          <ActionCard href="/healthcare/patients" title="Patients" detail="Auto-MRN, consent, duplicate check, DSAR" icon={Users} />
          <ActionCard href="/healthcare/opd" title="OPD encounters" detail="Tokens, live queue, visit flow" icon={Stethoscope} />
          <ActionCard href="/healthcare/emr" title="EMR / SOAP chart" detail="Notes, problems, allergies, meds" icon={HeartPulse} />
          <ActionCard href="/healthcare/billing" title="Clinical billing" detail="Encounter invoices & payments" icon={Users} />
          <ActionCard href="/healthcare/hms-compliance" title="HMS compliance" detail="PHI audit, break-glass, roles" icon={BedDouble} />
          <ActionCard href="/healthcare/portal" title="Patient portal" detail="Book OPD, invoices stub, messaging" icon={Users} />
        </div>
      </Panel>
      <Panel className="mb-4">
        <SectionHeader title="HMS Phase 2 — IPD & nursing" eyebrow="Wards · beds · admissions · vitals · MAR" />
        <div className="mt-4 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          <ActionCard href="/healthcare/wards" title="Wards" detail="Ward masters and types" icon={Building2} />
          <ActionCard href="/healthcare/beds" title="Beds" detail="Status and housekeeping" icon={BedDouble} />
          <ActionCard href="/healthcare/admissions" title="IPD admissions" detail="Admit, transfer, discharge" icon={HeartPulse} />
          <ActionCard href="/healthcare/vitals" title="Vitals" detail="BP, pulse, temp, SpO₂" icon={Stethoscope} />
          <ActionCard href="/healthcare/nursing" title="Nursing MAR" detail="Schedule and administer meds" icon={Pill} />
          <ActionCard href="/healthcare/rosters" title="Staff & rosters" detail="Clinical staff and shifts" icon={Users} />
        </div>
      </Panel>
      <Panel className="mb-4">
        <SectionHeader title="HMS Phase 3 — Clinical orders" eyebrow="Rx · lab · radiology · ED · telemedicine" />
        <div className="mt-4 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          <ActionCard href="/healthcare/prescriptions" title="Prescriptions" detail="Draft, issue, allergy check" icon={Pill} />
          <ActionCard href="/healthcare/lab-orders" title="Lab orders" detail="Barcode samples, critical results" icon={FlaskConical} />
          <ActionCard href="/healthcare/radiology" title="Radiology" detail="Imaging orders and sign-off" icon={Stethoscope} />
          <ActionCard href="/healthcare/emergency" title="Emergency / ED" detail="Triage intakes and ambulance" icon={Ambulance} />
          <ActionCard href="/healthcare/telemedicine" title="Telemedicine" detail="Scheduled video sessions" icon={Video} />
          <ActionCard href="/healthcare/claims" title="Insurance claims" detail="Eligibility and submission" icon={HeartPulse} />
        </div>
      </Panel>
      <Panel className="mb-4">
        <SectionHeader title="HMS Phase 4 — Pharmacy & ops" eyebrow="Stock · dispense · equipment · branches" />
        <div className="mt-4 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          <ActionCard href="/healthcare/pharmacy" title="Pharmacy stock" detail="SKU, expiry, low-stock alerts" icon={Pill} />
          <ActionCard href="/healthcare/dispensing" title="Dispensing" detail="Dispense from issued Rx" icon={Pill} />
          <ActionCard href="/healthcare/equipment" title="Biomedical equipment" detail="Asset registry and PM" icon={Building2} />
          <ActionCard href="/healthcare/branches" title="Branches" detail="Multi-site hospital registry" icon={Building2} />
          <ActionCard href="/healthcare/notifications" title="Notifications" detail="Prefs, alerts, message threads" icon={Users} />
          <ActionCard href="/healthcare/reports" title="Healthcare analytics" detail={`${analytics.low_stock_count} low stock · ${analytics.pending_labs} labs`} icon={FlaskConical} />
        </div>
      </Panel>
      <Panel className="mb-4">
        <SectionHeader title="Rx marketplace" eyebrow="Verified clinicians · multi-pharmacy ordering" />
        <div className="mt-4 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          <ActionCard href="/healthcare/marketplace" title="Browse marketplace" detail="Catalog, categories, featured products" icon={HeartPulse} />
          <ActionCard href="/healthcare/providers" title="Provider verification" detail="NPI, license, approve / suspend" icon={Users} />
          <ActionCard href="/healthcare/clinic-orders" title="Clinic orders" detail="Patient-specific Rx workflows" icon={Stethoscope} />
          <ActionCard href="/healthcare/fulfillment" title="Pharmacy fulfillment" detail="Accept, ship, track" icon={BedDouble} />
          <ActionCard href="/healthcare/pharmacies" title="Pharmacy partners" detail="API or manual integration profiles" icon={HeartPulse} />
          <ActionCard href="/healthcare/marketplace-analytics" title="Marketplace analytics" detail="Revenue, AOV, top products" icon={Users} />
        </div>
      </Panel>
      <Panel>
        <SectionHeader title="Hospital catalogs" eyebrow="Remaining masters — doctors, appointments, lab tests, quality" />
        <div className="mt-4 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {catalogSpecs.map((spec) => (
            <ActionCard
              key={spec.slug}
              href={catalogHref(spec.slug)}
              title={spec.title}
              detail={spec.description}
              icon={HeartPulse}
            />
          ))}
        </div>
      </Panel>
    </AppShell>
  );
}
