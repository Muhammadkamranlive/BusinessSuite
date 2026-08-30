"use client";

import { useMemo } from "react";
import { BedDouble, HeartPulse, Stethoscope, Users } from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { ModuleBreadcrumbs } from "@/components/common/module-breadcrumbs";
import { ModuleStartGuide } from "@/components/guides/module-start-guide";
import { ActionCard, Panel, SectionHeader, StatTile } from "@/components/ui";
import { getStoredTenantId } from "@/lib/auth/session";
import { catalogHref, catalogSpecsForModule } from "@/modules/catalog/catalog-registry";
import { listCatalog } from "@/modules/catalog/services/catalog.store";

export default function HealthcareHomePage() {
  const tenantId = getStoredTenantId() ?? "alpha";
  const specs = catalogSpecsForModule("healthcare");
  const patients = useMemo(() => listCatalog("healthcare.patients", tenantId), [tenantId]);
  const appointments = useMemo(() => listCatalog("healthcare.appointments", tenantId), [tenantId]);
  const admissions = useMemo(() => listCatalog("healthcare.admissions", tenantId), [tenantId]);
  const beds = useMemo(() => listCatalog("healthcare.beds", tenantId), [tenantId]);
  const occupied = beds.filter((b) => b.status === "occupied").length;

  return (
    <AppShell activeModule="healthcare">
      <ModuleBreadcrumbs />
      <ModuleStartGuide module="healthcare" />
      <div className="mb-6 grid gap-4 md:grid-cols-4">
        <StatTile label="Patients" value={String(patients.length)} detail="Registration / UPMRN" icon={Users} tone="teal" />
        <StatTile label="Appointments" value={String(appointments.length)} detail="Clinic bookings" icon={Stethoscope} tone="mint" />
        <StatTile label="IPD stays" value={String(admissions.length)} detail="Admit / transfer / discharge" icon={HeartPulse} tone="coral" />
        <StatTile label="Occupied beds" value={String(occupied)} detail={`${beds.length} beds on file`} icon={BedDouble} tone="amber" />
      </div>
      <Panel>
        <SectionHeader title="Hospital catalogs" eyebrow="InstaCare-style HMS CRUD — imaging and SMS later" />
        <div className="mt-4 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {specs.map((spec) => (
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
