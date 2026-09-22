"use client";

import { useEffect, useMemo, useState } from "react";
import { AppShell } from "@/components/app-shell";
import { ModuleBreadcrumbs } from "@/components/common/module-breadcrumbs";
import { PageHeader } from "@/components/common/page-header";
import { StatusBadge } from "@/components/common/status-badge";
import { DataListToolbar } from "@/components/common/data-list-toolbar";
import { useConfirm } from "@/components/common/use-confirm";
import { ExtraFieldsBlock } from "@/components/forms/extra-fields-block";
import { Button, Field, Panel, SelectInput, TextInput } from "@/components/ui";
import { getStoredTenantId } from "@/lib/auth/session";
import { exportListCsv } from "@/lib/list-export";
import { filterAndSort } from "@/lib/list-query";
import { persistExtraFields } from "@/modules/forms/services/extra-fields.store";
import {
  createAmbulanceDispatch,
  createEmergencyIntake,
  listAmbulanceDispatches,
  listEmergencyIntakes,
  pullHmsClinicalFromSupabase,
  subscribeHmsClinical,
  updateAmbulanceDispatch,
  type HmsAmbulanceDispatch,
  type HmsEmergencyIntake
} from "@/modules/healthcare/services/hms-clinical.store";
import { listPatients, pullHmsFromSupabase, subscribeHms } from "@/modules/healthcare/services/hms.store";

export default function HmsEmergencyPage() {
  const tenantId = getStoredTenantId() ?? "alpha";
  const { askSave, dialog } = useConfirm();
  const [tab, setTab] = useState<"ed" | "ambulance">("ed");
  const [intakes, setIntakes] = useState<HmsEmergencyIntake[]>([]);
  const [dispatches, setDispatches] = useState<HmsAmbulanceDispatch[]>([]);
  const [patients, setPatients] = useState(listPatients(tenantId));
  const [search, setSearch] = useState("");
  const [openEd, setOpenEd] = useState(false);
  const [openAmb, setOpenAmb] = useState(false);
  const [edForm, setEdForm] = useState({ patient_id: "", triage_priority: "urgent" as const, chief_complaint: "", incomplete_registration: false });
  const [ambForm, setAmbForm] = useState({ patient_name: "", pickup_location: "", destination: "", vehicle_id: "" });
  const [extraJson, setExtraJson] = useState("");

  function refresh() {
    setIntakes(listEmergencyIntakes(tenantId));
    setDispatches(listAmbulanceDispatches(tenantId));
    setPatients(listPatients(tenantId));
  }
  useEffect(() => {
    void pullHmsClinicalFromSupabase(tenantId).finally(() => refresh());
    void pullHmsFromSupabase(tenantId).finally(() => refresh());
    const u1 = subscribeHmsClinical(() => refresh());
    const u2 = subscribeHms(() => refresh());
    return () => {
      u1();
      u2();
    };
  }, [tenantId]);

  const edFiltered = useMemo(
    () =>
      filterAndSort(intakes as unknown as Array<Record<string, unknown>>, {
        search,
        searchFields: ["intake_no", "patient_name", "triage_priority"],
        sortField: "created_at",
        sortDir: "desc"
      }) as unknown as HmsEmergencyIntake[],
    [intakes, search]
  );

  const ambFiltered = useMemo(
    () =>
      filterAndSort(dispatches as unknown as Array<Record<string, unknown>>, {
        search,
        searchFields: ["dispatch_no", "patient_name", "status"],
        sortField: "dispatched_at",
        sortDir: "desc"
      }) as unknown as HmsAmbulanceDispatch[],
    [dispatches, search]
  );

  function doEdIntake() {
    const patient = patients.find((p) => p.id === edForm.patient_id);
    if (!patient) return;
    const row = createEmergencyIntake(tenantId, {
      patient_id: patient.id,
      patient_name: patient.full_name,
      triage_priority: edForm.triage_priority,
      chief_complaint: edForm.chief_complaint || null,
      incomplete_registration: edForm.incomplete_registration,
      encounter_id: null,
      actor: "triage_nurse"
    });
    persistExtraFields(tenantId, "healthcare.hms.emergency", row.id, extraJson);
    setOpenEd(false);
    refresh();
  }

  function doAmbDispatch() {
    const row = createAmbulanceDispatch(tenantId, {
      patient_name: ambForm.patient_name || null,
      pickup_location: ambForm.pickup_location || null,
      destination: ambForm.destination || null,
      vehicle_id: ambForm.vehicle_id || null
    });
    persistExtraFields(tenantId, "healthcare.hms.ambulance", row.id, extraJson);
    setOpenAmb(false);
    refresh();
  }

  return (
    <AppShell activeModule="healthcare">
      {dialog}
      <ModuleBreadcrumbs />
      <PageHeader
        title="Emergency / ED"
        description="Triage intakes and ambulance dispatch tracking."
        actionLabel={tab === "ed" ? "New ED intake" : "Dispatch ambulance"}
        onAction={() => (tab === "ed" ? setOpenEd(true) : setOpenAmb(true))}
      />
      <div className="mb-4 flex flex-wrap gap-2">
        <Button type="button" variant={tab === "ed" ? "primary" : "secondary"} onClick={() => setTab("ed")}>
          ED intakes ({intakes.length})
        </Button>
        <Button type="button" variant={tab === "ambulance" ? "primary" : "secondary"} onClick={() => setTab("ambulance")}>
          Ambulance ({dispatches.length})
        </Button>
      </div>
      {openEd ? (
        <Panel className="mb-4">
          <form
            className="grid gap-3 md:grid-cols-2"
            onSubmit={(e) => {
              e.preventDefault();
              askSave({ editing: false, entityLabel: "ED intake", onConfirm: doEdIntake });
            }}
          >
            <Field label="Patient">
              <SelectInput value={edForm.patient_id} onChange={(e) => setEdForm({ ...edForm, patient_id: e.target.value })}>
                <option value="">Select…</option>
                {patients.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.mrn} · {p.full_name}
                  </option>
                ))}
              </SelectInput>
            </Field>
            <Field label="Triage priority">
              <SelectInput value={edForm.triage_priority} onChange={(e) => setEdForm({ ...edForm, triage_priority: e.target.value as typeof edForm.triage_priority })}>
                <option value="resuscitation">Resuscitation</option>
                <option value="emergency">Emergency</option>
                <option value="urgent">Urgent</option>
                <option value="semi_urgent">Semi-urgent</option>
                <option value="non_urgent">Non-urgent</option>
              </SelectInput>
            </Field>
            <Field label="Chief complaint" className="md:col-span-2">
              <TextInput value={edForm.chief_complaint} onChange={(e) => setEdForm({ ...edForm, chief_complaint: e.target.value })} />
            </Field>
            <label className="md:col-span-2 flex items-center gap-2 text-sm">
              <input type="checkbox" checked={edForm.incomplete_registration} onChange={(e) => setEdForm({ ...edForm, incomplete_registration: e.target.checked })} />
              Incomplete registration
            </label>
            <div className="md:col-span-2">
              <ExtraFieldsBlock formKey="healthcare.hms.emergency" valueJson={extraJson} onChange={setExtraJson} />
            </div>
            <div className="md:col-span-2 flex gap-2">
              <Button type="submit">Register intake</Button>
              <Button type="button" variant="ghost" onClick={() => setOpenEd(false)}>
                Cancel
              </Button>
            </div>
          </form>
        </Panel>
      ) : null}
      {openAmb ? (
        <Panel className="mb-4">
          <form
            className="grid gap-3 md:grid-cols-2"
            onSubmit={(e) => {
              e.preventDefault();
              askSave({ editing: false, entityLabel: "ambulance dispatch", onConfirm: doAmbDispatch });
            }}
          >
            <Field label="Patient name">
              <TextInput value={ambForm.patient_name} onChange={(e) => setAmbForm({ ...ambForm, patient_name: e.target.value })} />
            </Field>
            <Field label="Vehicle ID">
              <TextInput value={ambForm.vehicle_id} onChange={(e) => setAmbForm({ ...ambForm, vehicle_id: e.target.value })} />
            </Field>
            <Field label="Pickup">
              <TextInput value={ambForm.pickup_location} onChange={(e) => setAmbForm({ ...ambForm, pickup_location: e.target.value })} />
            </Field>
            <Field label="Destination">
              <TextInput value={ambForm.destination} onChange={(e) => setAmbForm({ ...ambForm, destination: e.target.value })} />
            </Field>
            <div className="md:col-span-2">
              <ExtraFieldsBlock formKey="healthcare.hms.ambulance" valueJson={extraJson} onChange={setExtraJson} />
            </div>
            <div className="md:col-span-2 flex gap-2">
              <Button type="submit">Dispatch</Button>
              <Button type="button" variant="ghost" onClick={() => setOpenAmb(false)}>
                Cancel
              </Button>
            </div>
          </form>
        </Panel>
      ) : null}
      <Panel>
        <DataListToolbar
          search={search}
          onSearchChange={setSearch}
          onExportCsv={() =>
            exportListCsv({
              tenantId,
              module: "healthcare",
              filename: tab === "ed" ? "hms-ed-intakes" : "hms-ambulance",
              rows:
                tab === "ed"
                  ? edFiltered.map((r) => ({
                      Intake: r.intake_no,
                      MRN: r.patient_id ? patients.find((p) => p.id === r.patient_id)?.mrn ?? "—" : "—",
                      Triage: r.triage_priority
                    }))
                  : ambFiltered.map((r) => ({ Dispatch: r.dispatch_no, Status: r.status, Pickup: r.pickup_location ?? "" }))
            })
          }
        />
        <div className="mt-3 overflow-x-auto">
          {tab === "ed" ? (
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-slate-500">
                  <th className="px-3 py-2">Intake</th>
                  <th>MRN</th>
                  <th>Triage</th>
                  <th>Complaint</th>
                </tr>
              </thead>
              <tbody>
                {edFiltered.map((row) => (
                  <tr key={row.id} className="border-t border-line">
                    <td className="px-3 py-3 font-semibold">{row.intake_no}</td>
                    <td>{row.patient_id ? patients.find((p) => p.id === row.patient_id)?.mrn ?? "—" : "—"}</td>
                    <td>
                      <StatusBadge status={row.triage_priority} />
                    </td>
                    <td className="max-w-xs truncate">{row.chief_complaint || "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-slate-500">
                  <th className="px-3 py-2">Dispatch</th>
                  <th>Route</th>
                  <th>Status</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {ambFiltered.map((row) => (
                  <tr key={row.id} className="border-t border-line">
                    <td className="px-3 py-3 font-semibold">{row.dispatch_no}</td>
                    <td>
                      {row.pickup_location ?? "—"} → {row.destination ?? "—"}
                    </td>
                    <td>
                      <StatusBadge status={row.status} />
                    </td>
                    <td>
                      {row.status === "dispatched" ? (
                        <Button type="button" variant="secondary" className="!px-2 !py-1 text-xs" onClick={() => {
                          updateAmbulanceDispatch(row.id, { status: "en_route" });
                          refresh();
                        }}>
                          En route
                        </Button>
                      ) : null}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </Panel>
    </AppShell>
  );
}
