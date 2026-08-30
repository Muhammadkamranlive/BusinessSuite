"use client";

import { useState } from "react";
import { useConfirm } from "@/components/common/use-confirm";
import { ExtraFieldsBlock } from "@/components/forms/extra-fields-block";
import { Button, Field, Panel, SectionHeader, SelectInput, TextInput } from "@/components/ui";
import { persistExtraFields } from "@/modules/forms/services/extra-fields.store";
import { money } from "@/lib/utils";
import { getEmployeeName } from "@/modules/hrm/services/hrm.store";
import {
  completeOffboardingTask,
  createCertification,
  createCosting,
  createDependent,
  createEducation,
  createEmergencyContact,
  createExperience,
  createIdentityDoc,
  getCostCenterName,
  getPayGradeName,
  getPositionTitle,
  getWorkLocationName,
  getWorkerProfile,
  listBenefitPlans,
  listCertifications,
  listCostCenters,
  listCosting,
  listDependents,
  listEducation,
  listEmergencyContacts,
  listEnrollments,
  listExperience,
  listIdentityDocs,
  listJobChanges,
  listLeaveBalances,
  listOffboarding,
  listPaymentElections
} from "@/modules/hrm/services/workday.store";
import { listLeaveTypes } from "@/modules/hrm/services/hrm.store";
import type { IdentityKind } from "@/modules/hrm/workday-model";

export function WorkerWorkdayPanels({
  tenantId,
  employeeId,
  tab,
  canEdit
}: {
  tenantId: string;
  employeeId: string;
  tab: string;
  canEdit: boolean;
}) {
  const { askSave, dialog } = useConfirm();
  const [tick, setTick] = useState(0);
  const [extraJson, setExtraJson] = useState("");
  const wp = getWorkerProfile(employeeId);
  const deps = listDependents(tenantId, employeeId);
  const ems = listEmergencyContacts(tenantId, employeeId);
  const edu = listEducation(tenantId, employeeId);
  const exp = listExperience(tenantId, employeeId);
  const certs = listCertifications(tenantId, employeeId);
  const ids = listIdentityDocs(tenantId, employeeId);
  const history = listJobChanges(tenantId, employeeId);
  const balances = listLeaveBalances(tenantId, employeeId);
  const types = listLeaveTypes(tenantId);
  const enroll = listEnrollments(tenantId, employeeId);
  const plans = listBenefitPlans(tenantId);
  const elections = listPaymentElections(tenantId, employeeId);
  const cost = listCosting(tenantId, employeeId);
  const off = listOffboarding(tenantId, employeeId);
  const centers = listCostCenters(tenantId);
  void tick;

  const [dep, setDep] = useState({ full_name: "", relation: "Spouse", date_of_birth: "" });
  const [em, setEm] = useState({ full_name: "", relation: "Father", phone: "" });
  const [idForm, setIdForm] = useState({ kind: "passport" as IdentityKind, number: "", expiry: "", country: "", issued_on: "" });
  const [eduForm, setEduForm] = useState({ school: "", degree: "", field: "", year: "" });
  const [expForm, setExpForm] = useState({ company: "", title: "", start_date: "", end_date: "" });
  const [certForm, setCertForm] = useState({ name: "", issuer: "", expiry: "" });
  const [costForm, setCostForm] = useState({ cost_center_id: "", percent: "100" });

  if (tab === "personal") {
    return (
      <div className="grid gap-5 lg:grid-cols-2">
        <Panel>
          <SectionHeader title="Legal vs preferred" />
          <dl className="grid gap-3 text-sm">
            <div><dt className="text-slate-500">Preferred</dt><dd className="font-medium">{wp?.preferred_name ?? "—"}</dd></div>
            <div><dt className="text-slate-500">Legal</dt><dd className="font-medium">{wp?.legal_name ?? "—"}</dd></div>
            <div><dt className="text-slate-500">Pronouns</dt><dd className="font-medium">{wp?.pronouns ?? "—"}</dd></div>
            <div><dt className="text-slate-500">Worker type</dt><dd className="font-medium capitalize">{wp?.worker_type ?? "employee"}</dd></div>
            <div><dt className="text-slate-500">Probation end</dt><dd className="font-medium">{wp?.probation_end ?? "—"}</dd></div>
            <div><dt className="text-slate-500">Contract end</dt><dd className="font-medium">{wp?.contract_end ?? "—"}</dd></div>
            <div><dt className="text-slate-500">Notice (days)</dt><dd className="font-medium">{wp?.notice_days ?? "—"}</dd></div>
          </dl>
        </Panel>
        <Panel>
          <SectionHeader title="Dependents" />
          <ul className="mb-3 space-y-1 text-sm">
            {deps.map((d) => <li key={d.id}>{d.full_name} · {d.relation} · {d.date_of_birth ?? ""}</li>)}
            {deps.length === 0 ? <li className="text-slate-400">None</li> : null}
          </ul>
          {canEdit ? (
            <form
              className="grid gap-2"
              onSubmit={(e) => {
                e.preventDefault();
                askSave({
                  editing: false,
                  entityLabel: "dependent",
                  onConfirm: () => {
                    const row = createDependent(tenantId, { employee_id: employeeId, ...dep, national_id: null });
                    persistExtraFields(tenantId, "hrm.dependent", row.id, extraJson);
                    setDep({ full_name: "", relation: "Spouse", date_of_birth: "" });
                    setTick((n) => n + 1);
                  }
                });
              }}
            >
              <TextInput placeholder="Name" required value={dep.full_name} onChange={(e) => setDep({ ...dep, full_name: e.target.value })} />
              <TextInput placeholder="Relation" value={dep.relation} onChange={(e) => setDep({ ...dep, relation: e.target.value })} />
              <TextInput type="date" value={dep.date_of_birth} onChange={(e) => setDep({ ...dep, date_of_birth: e.target.value })} />
              <ExtraFieldsBlock formKey="hrm.dependent" valueJson={extraJson} onChange={setExtraJson} />
              <Button type="submit">Add dependent</Button>
            </form>
          ) : null}
        </Panel>
        <Panel>
          <SectionHeader title="Emergency contacts" />
          <ul className="space-y-1 text-sm">
            {ems.map((c) => <li key={c.id}>{c.full_name} · {c.relation} · {c.phone}</li>)}
            {ems.length === 0 ? <li className="text-slate-400">None</li> : null}
          </ul>
          {canEdit ? (
            <form
              className="mt-3 grid gap-2"
              onSubmit={(e) => {
                e.preventDefault();
                askSave({
                  editing: false,
                  entityLabel: "emergency contact",
                  onConfirm: () => {
                    createEmergencyContact(tenantId, { employee_id: employeeId, ...em, is_primary: true });
                    setEm({ full_name: "", relation: "Father", phone: "" });
                    setTick((n) => n + 1);
                  }
                });
              }}
            >
              <TextInput placeholder="Name" required value={em.full_name} onChange={(e) => setEm({ ...em, full_name: e.target.value })} />
              <TextInput placeholder="Phone" required value={em.phone} onChange={(e) => setEm({ ...em, phone: e.target.value })} />
              <Button type="submit">Add contact</Button>
            </form>
          ) : null}
        </Panel>
        {dialog}
      </div>
    );
  }

  if (tab === "identity") {
    return (
      <Panel>
        <SectionHeader title="Identity documents" eyebrow="Passport · visa · labour card" />
        <div className="overflow-x-auto">
          <table className="min-w-full text-left text-sm">
            <thead>
              <tr className="border-b border-line bg-cloud">
                {["Kind", "Number", "Country", "Issued", "Expiry"].map((h) => <th key={h} className="px-3 py-2 font-semibold text-slate-600">{h}</th>)}
              </tr>
            </thead>
            <tbody>
              {ids.map((d) => (
                <tr key={d.id} className="border-b border-line">
                  <td className="px-3 py-2 capitalize">{d.kind.replace("_", " ")}</td>
                  <td className="px-3 py-2">{d.number}</td>
                  <td className="px-3 py-2">{d.country ?? "—"}</td>
                  <td className="px-3 py-2">{d.issued_on ?? "—"}</td>
                  <td className="px-3 py-2">{d.expiry ?? "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {canEdit ? (
          <form
            className="mt-4 grid gap-3 md:grid-cols-3"
            onSubmit={(e) => {
              e.preventDefault();
              askSave({
                editing: false,
                entityLabel: "identity document",
                onConfirm: () => {
                  const row = createIdentityDoc(tenantId, {
                    employee_id: employeeId,
                    kind: idForm.kind,
                    number: idForm.number,
                    country: idForm.country || null,
                    issued_on: idForm.issued_on || null,
                    expiry: idForm.expiry || null
                  });
                  persistExtraFields(tenantId, "hrm.identity", row.id, extraJson);
                  setIdForm({ kind: "passport", number: "", expiry: "", country: "", issued_on: "" });
                  setTick((n) => n + 1);
                }
              });
            }}
          >
            <Field label="Kind">
              <SelectInput value={idForm.kind} onChange={(e) => setIdForm({ ...idForm, kind: e.target.value as IdentityKind })}>
                <option value="passport">Passport</option>
                <option value="visa">Visa</option>
                <option value="labour_card">Labour card</option>
                <option value="cnic">CNIC</option>
                <option value="iqama">Iqama</option>
              </SelectInput>
            </Field>
            <Field label="Number"><TextInput required value={idForm.number} onChange={(e) => setIdForm({ ...idForm, number: e.target.value })} /></Field>
            <Field label="Country"><TextInput value={idForm.country} onChange={(e) => setIdForm({ ...idForm, country: e.target.value })} /></Field>
            <Field label="Issued"><TextInput type="date" value={idForm.issued_on} onChange={(e) => setIdForm({ ...idForm, issued_on: e.target.value })} /></Field>
            <Field label="Expiry"><TextInput type="date" value={idForm.expiry} onChange={(e) => setIdForm({ ...idForm, expiry: e.target.value })} /></Field>
            <ExtraFieldsBlock formKey="hrm.identity" valueJson={extraJson} onChange={setExtraJson} />
            <Button type="submit">Add document</Button>
          </form>
        ) : null}
        {dialog}
      </Panel>
    );
  }

  if (tab === "career") {
    return (
      <div className="grid gap-5 lg:grid-cols-2">
        <Panel>
          <SectionHeader title="Position & org" />
          <dl className="grid gap-3 text-sm">
            <div><dt className="text-slate-500">Position</dt><dd className="font-medium">{getPositionTitle(wp?.position_id)}</dd></div>
            <div><dt className="text-slate-500">Location</dt><dd className="font-medium">{getWorkLocationName(wp?.location_id)}</dd></div>
            <div><dt className="text-slate-500">Cost center</dt><dd className="font-medium">{getCostCenterName(wp?.cost_center_id)}</dd></div>
            <div><dt className="text-slate-500">Pay grade</dt><dd className="font-medium">{getPayGradeName(wp?.pay_grade_id)}</dd></div>
            <div><dt className="text-slate-500">Matrix manager</dt><dd className="font-medium">{wp?.matrix_manager_id ? getEmployeeName(wp.matrix_manager_id) : "—"}</dd></div>
            <div><dt className="text-slate-500">OT eligible</dt><dd className="font-medium">{wp?.overtime_eligible === false ? "No" : "Yes"}</dd></div>
          </dl>
          <p className="mt-3 text-xs text-slate-500">Costing: {cost.map((c) => `${getCostCenterName(c.cost_center_id)} ${c.percent}%`).join(" · ") || "—"}</p>
          {canEdit ? (
            <form
              className="mt-3 grid gap-2 md:grid-cols-2"
              onSubmit={(e) => {
                e.preventDefault();
                askSave({
                  editing: false,
                  entityLabel: "costing allocation",
                  onConfirm: () => {
                    const row = createCosting(tenantId, {
                      employee_id: employeeId,
                      cost_center_id: costForm.cost_center_id,
                      percent: Number(costForm.percent) || 0,
                      effective_from: new Date().toISOString().slice(0, 10)
                    });
                    persistExtraFields(tenantId, "hrm.costing", row.id, extraJson);
                    setTick((n) => n + 1);
                  }
                });
              }}
            >
              <Field label="Cost center">
                <SelectInput required value={costForm.cost_center_id} onChange={(e) => setCostForm({ ...costForm, cost_center_id: e.target.value })}>
                  <option value="">Select</option>
                  {centers.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                </SelectInput>
              </Field>
              <Field label="Percent"><TextInput type="number" min={1} max={100} value={costForm.percent} onChange={(e) => setCostForm({ ...costForm, percent: e.target.value })} /></Field>
              <Button type="submit" className="md:col-span-2">Add costing split</Button>
            </form>
          ) : null}
        </Panel>
        <Panel>
          <SectionHeader title="Education" />
          <ul className="mb-3 space-y-1 text-sm">
            {edu.map((e) => <li key={e.id}>{e.degree} {e.field} · {e.school} ({e.year})</li>)}
            {edu.length === 0 ? <li className="text-slate-400">None</li> : null}
          </ul>
          {canEdit ? (
            <form
              className="grid gap-2"
              onSubmit={(ev) => {
                ev.preventDefault();
                askSave({
                  editing: false,
                  entityLabel: "education",
                  onConfirm: () => {
                    const row = createEducation(tenantId, { employee_id: employeeId, ...eduForm, field: eduForm.field || null, year: eduForm.year || null });
                    persistExtraFields(tenantId, "hrm.education", row.id, extraJson);
                    setEduForm({ school: "", degree: "", field: "", year: "" });
                    setTick((n) => n + 1);
                  }
                });
              }}
            >
              <TextInput required placeholder="School" value={eduForm.school} onChange={(e) => setEduForm({ ...eduForm, school: e.target.value })} />
              <TextInput required placeholder="Degree" value={eduForm.degree} onChange={(e) => setEduForm({ ...eduForm, degree: e.target.value })} />
              <TextInput placeholder="Field" value={eduForm.field} onChange={(e) => setEduForm({ ...eduForm, field: e.target.value })} />
              <TextInput placeholder="Year" value={eduForm.year} onChange={(e) => setEduForm({ ...eduForm, year: e.target.value })} />
              <ExtraFieldsBlock formKey="hrm.education" valueJson={extraJson} onChange={setExtraJson} />
              <Button type="submit">Add education</Button>
            </form>
          ) : null}
        </Panel>
        <Panel>
          <SectionHeader title="Experience" />
          <ul className="mb-3 space-y-1 text-sm">
            {exp.map((e) => <li key={e.id}>{e.title} · {e.company} {e.start_date ? `· ${e.start_date}` : ""}</li>)}
            {exp.length === 0 ? <li className="text-slate-400">None</li> : null}
          </ul>
          {canEdit ? (
            <form
              className="grid gap-2"
              onSubmit={(ev) => {
                ev.preventDefault();
                askSave({
                  editing: false,
                  entityLabel: "experience",
                  onConfirm: () => {
                    const row = createExperience(tenantId, {
                      employee_id: employeeId,
                      ...expForm,
                      start_date: expForm.start_date || null,
                      end_date: expForm.end_date || null
                    });
                    persistExtraFields(tenantId, "hrm.experience", row.id, extraJson);
                    setExpForm({ company: "", title: "", start_date: "", end_date: "" });
                    setTick((n) => n + 1);
                  }
                });
              }}
            >
              <TextInput required placeholder="Company" value={expForm.company} onChange={(e) => setExpForm({ ...expForm, company: e.target.value })} />
              <TextInput required placeholder="Title" value={expForm.title} onChange={(e) => setExpForm({ ...expForm, title: e.target.value })} />
              <TextInput type="date" value={expForm.start_date} onChange={(e) => setExpForm({ ...expForm, start_date: e.target.value })} />
              <TextInput type="date" value={expForm.end_date} onChange={(e) => setExpForm({ ...expForm, end_date: e.target.value })} />
              <Button type="submit">Add experience</Button>
            </form>
          ) : null}
        </Panel>
        <Panel>
          <SectionHeader title="Certifications" />
          <ul className="mb-3 space-y-1 text-sm">
            {certs.map((c) => <li key={c.id}>{c.name} · {c.issuer ?? "—"} · exp {c.expiry ?? "—"}</li>)}
            {certs.length === 0 ? <li className="text-slate-400">None</li> : null}
          </ul>
          {canEdit ? (
            <form
              className="grid gap-2"
              onSubmit={(ev) => {
                ev.preventDefault();
                askSave({
                  editing: false,
                  entityLabel: "certification",
                  onConfirm: () => {
                    const row = createCertification(tenantId, {
                      employee_id: employeeId,
                      name: certForm.name,
                      issuer: certForm.issuer || null,
                      expiry: certForm.expiry || null
                    });
                    persistExtraFields(tenantId, "hrm.certification", row.id, extraJson);
                    setCertForm({ name: "", issuer: "", expiry: "" });
                    setTick((n) => n + 1);
                  }
                });
              }}
            >
              <TextInput required placeholder="Name" value={certForm.name} onChange={(e) => setCertForm({ ...certForm, name: e.target.value })} />
              <TextInput placeholder="Issuer" value={certForm.issuer} onChange={(e) => setCertForm({ ...certForm, issuer: e.target.value })} />
              <TextInput type="date" value={certForm.expiry} onChange={(e) => setCertForm({ ...certForm, expiry: e.target.value })} />
              <Button type="submit">Add certification</Button>
            </form>
          ) : null}
        </Panel>
        {dialog}
      </div>
    );
  }

  if (tab === "history") {
    return (
      <Panel>
        <SectionHeader title="Job history" eyebrow="Effective-dated changes" />
        <ul className="space-y-2 text-sm">
          {history.map((h) => (
            <li key={h.id} className="rounded-[var(--bs-radius)] border border-line px-3 py-2">
              <span className="font-semibold capitalize">{h.type.replace("_", " ")}</span> · {h.effective_date} · {h.status} · {h.reason}
            </li>
          ))}
          {off.map((t) => (
            <li key={t.id} className="flex items-center justify-between gap-2 text-slate-600">
              <span>Offboarding: {t.title} · {t.status}</span>
              {canEdit && t.status === "pending" ? (
                <Button
                  type="button"
                  variant="secondary"
                  className="!min-h-8 !px-2 !text-xs"
                  onClick={() =>
                    askSave({
                      editing: true,
                      entityLabel: "offboarding task",
                      onConfirm: () => {
                        completeOffboardingTask(t.id);
                        setTick((n) => n + 1);
                      }
                    })
                  }
                >
                  Mark done
                </Button>
              ) : null}
            </li>
          ))}
          {history.length === 0 ? <li className="text-slate-400">No job changes yet.</li> : null}
        </ul>
        {dialog}
      </Panel>
    );
  }

  if (tab === "balances") {
    return (
      <Panel>
        <SectionHeader title="Leave balances" />
        <ul className="space-y-2 text-sm">
          {balances.map((b) => {
            const type = types.find((t) => t.id === b.leave_type_id);
            const remaining = b.entitled - b.used - b.pending;
            return (
              <li key={b.id} className="flex justify-between rounded-[var(--bs-radius)] border border-line px-3 py-2">
                <span>{type?.name ?? "Leave"} {b.year}</span>
                <span>{remaining} remaining · {b.used} used · {b.pending} pending / {b.entitled}</span>
              </li>
            );
          })}
        </ul>
      </Panel>
    );
  }

  if (tab === "benefits") {
    return (
      <div className="grid gap-5 lg:grid-cols-2">
        <Panel>
          <SectionHeader title="Benefit enrollments" />
          <ul className="space-y-2 text-sm">
            {enroll.map((e) => (
              <li key={e.id} className="flex justify-between rounded-[var(--bs-radius)] border border-line px-3 py-2">
                <span>{plans.find((p) => p.id === e.plan_id)?.name ?? "Plan"} · {e.coverage.replace("_", " ")}</span>
                <span className="capitalize">{e.status}</span>
              </li>
            ))}
            {enroll.length === 0 ? <li className="text-slate-400">None</li> : null}
          </ul>
        </Panel>
        <Panel>
          <SectionHeader title="Payment elections" />
          <ul className="space-y-1 text-sm">
            {elections.map((e) => (
              <li key={e.id}>{e.bank_name} {e.bank_account} · {e.percent}% {e.is_primary ? "(primary)" : ""}</li>
            ))}
            {elections.length === 0 ? <li className="text-slate-400">No bank split on file.</li> : null}
          </ul>
          <p className="mt-3 text-xs text-slate-500">
            Monthly EE premiums {money(enroll.filter((e) => e.status === "enrolled").reduce((s, e) => s + (plans.find((p) => p.id === e.plan_id)?.employee_cost ?? 0), 0))}
          </p>
        </Panel>
      </div>
    );
  }

  return null;
}
