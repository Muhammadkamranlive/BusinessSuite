"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { AppShell } from "@/components/app-shell";
import { ModuleBreadcrumbs } from "@/components/common/module-breadcrumbs";
import { PageHeader } from "@/components/common/page-header";
import { useConfirm } from "@/components/common/use-confirm";
import { Button, Field, Panel, SectionHeader, SelectInput, TextArea, TextInput } from "@/components/ui";
import { getStoredTenantId } from "@/lib/auth/session";
import {
  addAllergy,
  addMedication,
  addProblem,
  amendClinicalNote,
  checkDrugAllergy,
  createClinicalNote,
  listAllergies,
  listClinicalNotes,
  listMedications,
  listPatients,
  listProblems,
  pullHmsFromSupabase,
  subscribeHms,
  type HmsClinicalNote
} from "@/modules/healthcare/services/hms.store";
import {
  listEmrAttachments,
  pullHmsClinicalFromSupabase,
  registerEmrAttachment,
  subscribeHmsClinical
} from "@/modules/healthcare/services/hms-clinical.store";
import { uploadHmsDocument } from "@/modules/healthcare/services/hms-document-storage";

export default function EmrPage() {
  const tenantId = getStoredTenantId() ?? "alpha";
  const { askSave, dialog } = useConfirm();
  const [patients, setPatients] = useState(listPatients(tenantId));
  const [patientId, setPatientId] = useState("");
  const [notes, setNotes] = useState<HmsClinicalNote[]>([]);
  const [author, setAuthor] = useState("Dr. Staff");
  const [soap, setSoap] = useState({ subjective: "", objective: "", assessment: "", plan: "" });
  const [problem, setProblem] = useState({ problem: "", icd10_code: "" });
  const [allergy, setAllergy] = useState({ allergen: "", reaction: "", severity: "moderate" });
  const [med, setMed] = useState({ drug_name: "", dose: "", frequency: "", route: "PO" });
  const [allergyWarn, setAllergyWarn] = useState("");
  const [attachments, setAttachments] = useState(listEmrAttachments(tenantId));
  const [uploading, setUploading] = useState(false);

  function refresh() {
    setPatients(listPatients(tenantId));
    if (patientId) {
      setNotes(listClinicalNotes(tenantId, patientId));
      setAttachments(listEmrAttachments(tenantId, patientId));
    }
  }
  useEffect(() => {
    void pullHmsFromSupabase(tenantId).finally(() => refresh());
    void pullHmsClinicalFromSupabase(tenantId).finally(() => refresh());
    const u1 = subscribeHms(() => refresh());
    const u2 = subscribeHmsClinical(() => refresh());
    return () => {
      u1();
      u2();
    };
  }, [tenantId, patientId]);

  const patient = patients.find((p) => p.id === patientId);
  const problems = patientId ? listProblems(tenantId, patientId) : [];
  const allergies = patientId ? listAllergies(tenantId, patientId) : [];
  const medications = patientId ? listMedications(tenantId, patientId) : [];

  return (
    <AppShell activeModule="healthcare">
      {dialog}
      <ModuleBreadcrumbs />
      <PageHeader title="EMR / Clinical chart" description="SOAP notes with amendment history, problem/allergy/med lists, basic drug–allergy CDS." />
      <Panel className="mb-4">
        <div className="flex flex-wrap items-end gap-3">
          <Field label="Patient" className="min-w-[240px] flex-1">
            <SelectInput
              value={patientId}
              onChange={(e) => {
                setPatientId(e.target.value);
                setNotes(listClinicalNotes(tenantId, e.target.value));
              }}
            >
              <option value="">Select patient…</option>
              {patients.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.mrn} · {p.full_name}
                </option>
              ))}
            </SelectInput>
          </Field>
          {patientId ? (
            <Link
              href={`/healthcare/appointments?followUp=${patientId}`}
              className="inline-flex min-h-[44px] items-center rounded-[var(--bs-radius)] border border-line px-4 text-sm font-semibold text-teal hover:bg-cloud"
            >
              Schedule follow-up
            </Link>
          ) : null}
        </div>
      </Panel>
      {patient ? (
        <div className="grid gap-4 lg:grid-cols-2">
          <Panel>
            <SectionHeader title="SOAP note" eyebrow="Amendments preserve originals" />
            <form
              className="mt-3 grid gap-3"
              onSubmit={(e) => {
                e.preventDefault();
                askSave({
                  editing: false,
                  entityLabel: "clinical note",
                  onConfirm: () => {
                    createClinicalNote(tenantId, {
                      patient_id: patient.id,
                      encounter_id: null,
                      patient_name: patient.full_name,
                      author_name: author,
                      note_type: "soap",
                      ...soap,
                      free_text: null,
                      created_by: author
                    });
                    setSoap({ subjective: "", objective: "", assessment: "", plan: "" });
                    refresh();
                  }
                });
              }}
            >
              <Field label="Author">
                <TextInput value={author} onChange={(e) => setAuthor(e.target.value)} />
              </Field>
              <Field label="Subjective">
                <TextArea value={soap.subjective} onChange={(e) => setSoap({ ...soap, subjective: e.target.value })} />
              </Field>
              <Field label="Objective">
                <TextArea value={soap.objective} onChange={(e) => setSoap({ ...soap, objective: e.target.value })} />
              </Field>
              <Field label="Assessment">
                <TextArea value={soap.assessment} onChange={(e) => setSoap({ ...soap, assessment: e.target.value })} />
              </Field>
              <Field label="Plan">
                <TextArea value={soap.plan} onChange={(e) => setSoap({ ...soap, plan: e.target.value })} />
              </Field>
              <Button type="submit">Save note</Button>
            </form>
            <div className="mt-4 space-y-3">
              {notes.map((n) => (
                <div key={n.id} className="rounded-[var(--bs-radius)] border border-line p-3 text-sm">
                  <div className="font-semibold">
                    v{n.version_no} · {n.author_name}
                  </div>
                  <div className="text-xs text-slate-500">{n.created_at.slice(0, 19).replace("T", " ")}</div>
                  <p className="mt-2">
                    <strong>S:</strong> {n.subjective || "—"}
                  </p>
                  <p>
                    <strong>O:</strong> {n.objective || "—"}
                  </p>
                  <p>
                    <strong>A:</strong> {n.assessment || "—"}
                  </p>
                  <p>
                    <strong>P:</strong> {n.plan || "—"}
                  </p>
                  <Button
                    type="button"
                    variant="secondary"
                    className="mt-2 !px-2 !py-1 text-xs"
                    onClick={() => {
                      amendClinicalNote(tenantId, n.id, { plan: `${n.plan || ""} [amended]` }, author);
                      refresh();
                    }}
                  >
                    Amend (keep original)
                  </Button>
                </div>
              ))}
            </div>
          </Panel>
          <div className="grid gap-4">
            <Panel>
              <SectionHeader title="Problem list" eyebrow="Active / resolved" />
              <form
                className="mt-3 flex flex-wrap gap-2"
                onSubmit={(e) => {
                  e.preventDefault();
                  if (!problem.problem.trim()) return;
                  addProblem(tenantId, {
                    patient_id: patient.id,
                    problem: problem.problem.trim(),
                    icd10_code: problem.icd10_code || null,
                    status: "active",
                    onset_date: null,
                    resolved_date: null,
                    notes: null,
                    created_by: author
                  });
                  setProblem({ problem: "", icd10_code: "" });
                  refresh();
                }}
              >
                <TextInput placeholder="Problem" value={problem.problem} onChange={(e) => setProblem({ ...problem, problem: e.target.value })} />
                <TextInput placeholder="ICD-10" value={problem.icd10_code} onChange={(e) => setProblem({ ...problem, icd10_code: e.target.value })} />
                <Button type="submit">Add</Button>
              </form>
              <ul className="mt-3 space-y-1 text-sm">
                {problems.map((p) => (
                  <li key={p.id}>
                    {p.problem} {p.icd10_code ? `(${p.icd10_code})` : ""} — {p.status}
                  </li>
                ))}
              </ul>
            </Panel>
            <Panel>
              <SectionHeader title="Allergies" eyebrow="Checked on prescribe" />
              <form
                className="mt-3 flex flex-wrap gap-2"
                onSubmit={(e) => {
                  e.preventDefault();
                  if (!allergy.allergen.trim()) return;
                  addAllergy(tenantId, {
                    patient_id: patient.id,
                    allergen: allergy.allergen.trim(),
                    reaction: allergy.reaction || null,
                    severity: allergy.severity as "mild" | "moderate" | "severe",
                    status: "active",
                    created_by: author
                  });
                  setAllergy({ allergen: "", reaction: "", severity: "moderate" });
                  refresh();
                }}
              >
                <TextInput placeholder="Allergen" value={allergy.allergen} onChange={(e) => setAllergy({ ...allergy, allergen: e.target.value })} />
                <TextInput placeholder="Reaction" value={allergy.reaction} onChange={(e) => setAllergy({ ...allergy, reaction: e.target.value })} />
                <Button type="submit">Add</Button>
              </form>
              <ul className="mt-3 space-y-1 text-sm">
                {allergies.map((a) => (
                  <li key={a.id}>
                    {a.allergen} — {a.severity} ({a.reaction || "—"})
                  </li>
                ))}
              </ul>
            </Panel>
            <Panel>
              <SectionHeader title="EMR attachments" eyebrow="Private hms-documents bucket" />
              <input
                type="file"
                className="mt-3 block w-full text-sm"
                disabled={uploading}
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (!file || !patient) return;
                  setUploading(true);
                  void uploadHmsDocument({
                    tenantId,
                    ownerKey: patient.id,
                    file,
                    prefix: "emr"
                  })
                    .then((blob) => {
                      registerEmrAttachment(tenantId, {
                        patient_id: patient.id,
                        encounter_id: null,
                        clinical_note_id: notes[0]?.id ?? null,
                        file_name: blob.fileName,
                        storage_path: blob.storagePath,
                        content_type: blob.fileType,
                        file_size: blob.fileSize,
                        actor: author
                      });
                      refresh();
                    })
                    .finally(() => setUploading(false));
                  e.target.value = "";
                }}
              />
              <ul className="mt-3 space-y-1 text-sm">
                {attachments.map((a) => (
                  <li key={a.id}>
                    {a.file_name} · {(a.file_size / 1024).toFixed(1)} KB
                  </li>
                ))}
              </ul>
            </Panel>
            <Panel>
              <SectionHeader title="Current medications" eyebrow="Drug–allergy CDS" />
              {allergyWarn ? <p className="mt-2 text-sm text-rose-600">{allergyWarn}</p> : null}
              <form
                className="mt-3 grid gap-2"
                onSubmit={(e) => {
                  e.preventDefault();
                  if (!med.drug_name.trim()) return;
                  const hits = checkDrugAllergy(tenantId, patient.id, med.drug_name);
                  if (hits.length) {
                    setAllergyWarn(`Allergy alert: ${hits.map((h) => h.allergen).join(", ")}`);
                    return;
                  }
                  setAllergyWarn("");
                  addMedication(tenantId, {
                    patient_id: patient.id,
                    drug_name: med.drug_name.trim(),
                    dose: med.dose || null,
                    frequency: med.frequency || null,
                    route: med.route || null,
                    status: "current",
                    started_at: new Date().toISOString().slice(0, 10),
                    stopped_at: null,
                    created_by: author
                  });
                  setMed({ drug_name: "", dose: "", frequency: "", route: "PO" });
                  refresh();
                }}
              >
                <TextInput placeholder="Drug" value={med.drug_name} onChange={(e) => setMed({ ...med, drug_name: e.target.value })} />
                <div className="flex flex-wrap gap-2">
                  <TextInput placeholder="Dose" value={med.dose} onChange={(e) => setMed({ ...med, dose: e.target.value })} />
                  <TextInput placeholder="Frequency" value={med.frequency} onChange={(e) => setMed({ ...med, frequency: e.target.value })} />
                  <Button type="submit">Add med</Button>
                </div>
              </form>
              <ul className="mt-3 space-y-1 text-sm">
                {medications.map((m) => (
                  <li key={m.id}>
                    {m.drug_name} {m.dose} {m.frequency} ({m.status})
                  </li>
                ))}
              </ul>
            </Panel>
          </div>
        </div>
      ) : null}
    </AppShell>
  );
}
