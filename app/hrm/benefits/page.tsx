"use client";

import { useMemo, useState } from "react";
import { AppShell } from "@/components/app-shell";
import { ModuleBreadcrumbs } from "@/components/common/module-breadcrumbs";
import { PageHeader } from "@/components/common/page-header";
import { StatusBadge } from "@/components/common/status-badge";
import { useConfirm } from "@/components/common/use-confirm";
import { ExtraFieldsBlock } from "@/components/forms/extra-fields-block";
import { Button, Field, Panel, SelectInput, TextInput } from "@/components/ui";
import { getSelfServiceContext } from "@/lib/auth/current-employee";
import { getStoredTenantId } from "@/lib/auth/session";
import { money } from "@/lib/utils";
import { persistExtraFields } from "@/modules/forms/services/extra-fields.store";
import { getEmployeeName, listEmployees } from "@/modules/hrm/services/hrm.store";
import {
  createBenefitPlan,
  createPaymentElection,
  enrollBenefit,
  listBenefitPlans,
  listEnrollments,
  listPaymentElections,
  updateEnrollment
} from "@/modules/hrm/services/workday.store";
import type { BenefitCategory, CoverageLevel } from "@/modules/hrm/workday-model";

export default function BenefitsPage() {
  const tenantId = getStoredTenantId() ?? "alpha";
  const { employee, selfService } = getSelfServiceContext(tenantId);
  const { askSave, dialog } = useConfirm();
  const [tick, setTick] = useState(0);
  const [extraJson, setExtraJson] = useState("");
  const [planForm, setPlanForm] = useState({ name: "", category: "medical" as BenefitCategory, employee_cost: "100", employer_cost: "300" });
  const [enrollForm, setEnrollForm] = useState({ employee_id: employee?.id ?? "", plan_id: "", coverage: "self" as CoverageLevel });
  const [electionForm, setElectionForm] = useState({
    employee_id: employee?.id ?? "",
    bank_name: "",
    bank_account: "",
    percent: "100"
  });

  const plans = useMemo(() => listBenefitPlans(tenantId), [tenantId, tick]);
  const people = useMemo(() => listEmployees(tenantId), [tenantId]);
  const rows = useMemo(
    () => listEnrollments(tenantId, selfService ? employee?.id : undefined),
    [tenantId, selfService, employee, tick]
  );
  const elections = useMemo(
    () => listPaymentElections(tenantId, selfService ? employee?.id : undefined),
    [tenantId, selfService, employee, tick]
  );

  return (
    <AppShell activeModule="hrm">
      <PageHeader title="Benefits" description="Plans, open enrollment, dependents coverage, and payment elections." />
      <ModuleBreadcrumbs />
      <div className="grid gap-5 xl:grid-cols-2">
        {selfService ? null : (
          <Panel>
            <h2 className="mb-3 text-lg font-bold text-ink">Benefit plan</h2>
            <form
              className="grid gap-3"
              onSubmit={(e) => {
                e.preventDefault();
                askSave({
                  editing: false,
                  entityLabel: "benefit plan",
                  onConfirm: () => {
                    const row = createBenefitPlan(tenantId, {
                      name: planForm.name.trim(),
                      category: planForm.category,
                      employee_cost: Number(planForm.employee_cost) || 0,
                      employer_cost: Number(planForm.employer_cost) || 0
                    });
                    persistExtraFields(tenantId, "hrm.benefit_plan", row.id, extraJson);
                    setTick((n) => n + 1);
                  }
                });
              }}
            >
              <Field label="Name"><TextInput required value={planForm.name} onChange={(e) => setPlanForm({ ...planForm, name: e.target.value })} /></Field>
              <Field label="Category">
                <SelectInput value={planForm.category} onChange={(e) => setPlanForm({ ...planForm, category: e.target.value as BenefitCategory })}>
                  <option value="medical">Medical</option>
                  <option value="dental">Dental</option>
                  <option value="life">Life</option>
                  <option value="vision">Vision</option>
                </SelectInput>
              </Field>
              <Field label="Employee cost / month"><TextInput type="number" min={0} value={planForm.employee_cost} onChange={(e) => setPlanForm({ ...planForm, employee_cost: e.target.value })} /></Field>
              <Field label="Employer cost / month"><TextInput type="number" min={0} value={planForm.employer_cost} onChange={(e) => setPlanForm({ ...planForm, employer_cost: e.target.value })} /></Field>
              <ExtraFieldsBlock formKey="hrm.benefit_plan" valueJson={extraJson} onChange={setExtraJson} />
              <Button type="submit">Add plan</Button>
            </form>
            <ul className="mt-4 space-y-2 text-sm">
              {plans.map((p) => (
                <li key={p.id} className="rounded-[var(--bs-radius)] border border-line px-3 py-2">
                  <span className="font-semibold">{p.name}</span> · {p.category} · EE {money(p.employee_cost)} / ER {money(p.employer_cost)}
                </li>
              ))}
            </ul>
          </Panel>
        )}
        <Panel>
          <h2 className="mb-3 text-lg font-bold text-ink">Enroll</h2>
          <form
            className="grid gap-3"
            onSubmit={(e) => {
              e.preventDefault();
              askSave({
                editing: false,
                entityLabel: "enrollment",
                onConfirm: () => {
                  const row = enrollBenefit(tenantId, {
                    employee_id: enrollForm.employee_id,
                    plan_id: enrollForm.plan_id,
                    coverage: enrollForm.coverage,
                    status: "enrolled",
                    effective_from: new Date().toISOString().slice(0, 10)
                  });
                  persistExtraFields(tenantId, "hrm.benefit_enrollment", row.id, extraJson);
                  setTick((n) => n + 1);
                }
              });
            }}
          >
            {selfService ? null : (
              <Field label="Worker">
                <SelectInput required value={enrollForm.employee_id} onChange={(e) => setEnrollForm({ ...enrollForm, employee_id: e.target.value })}>
                  <option value="">Select</option>
                  {people.map((p) => <option key={p.id} value={p.id}>{p.full_name}</option>)}
                </SelectInput>
              </Field>
            )}
            <Field label="Plan">
              <SelectInput required value={enrollForm.plan_id} onChange={(e) => setEnrollForm({ ...enrollForm, plan_id: e.target.value })}>
                <option value="">Select</option>
                {plans.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
              </SelectInput>
            </Field>
            <Field label="Coverage">
              <SelectInput value={enrollForm.coverage} onChange={(e) => setEnrollForm({ ...enrollForm, coverage: e.target.value as CoverageLevel })}>
                <option value="self">Self</option>
                <option value="self_spouse">Self + spouse</option>
                <option value="family">Family</option>
              </SelectInput>
            </Field>
            <Button type="submit">Enroll</Button>
          </form>
        </Panel>
        <Panel className="xl:col-span-2">
          <h2 className="mb-3 text-lg font-bold text-ink">Enrollments</h2>
          <div className="overflow-x-auto">
            <table className="min-w-full text-left text-sm">
              <thead>
                <tr className="border-b border-line bg-cloud">
                  {["Worker", "Plan", "Coverage", "Status", ""].map((h) => <th key={h || "actions"} className="px-3 py-2 font-semibold text-slate-600">{h}</th>)}
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={r.id} className="border-b border-line">
                    <td className="px-3 py-2">{getEmployeeName(r.employee_id)}</td>
                    <td className="px-3 py-2">{plans.find((p) => p.id === r.plan_id)?.name}</td>
                    <td className="px-3 py-2">{r.coverage.replace("_", " ")}</td>
                    <td className="px-3 py-2"><StatusBadge status={r.status} /></td>
                    <td className="px-3 py-2">
                      {r.status === "enrolled" ? (
                        <Button
                          type="button"
                          variant="secondary"
                          className="!min-h-8 !px-2 !text-xs"
                          onClick={() =>
                            askSave({
                              editing: true,
                              entityLabel: "benefit waiver",
                              onConfirm: () => {
                                updateEnrollment(r.id, { status: "waived" });
                                setTick((n) => n + 1);
                              }
                            })
                          }
                        >
                          Waive
                        </Button>
                      ) : null}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <h3 className="mb-2 mt-6 font-bold text-ink">Payment elections</h3>
          <form
            className="mb-4 grid gap-3 md:grid-cols-4"
            onSubmit={(e) => {
              e.preventDefault();
              askSave({
                editing: false,
                entityLabel: "payment election",
                onConfirm: () => {
                  const row = createPaymentElection(tenantId, {
                    employee_id: selfService && employee ? employee.id : electionForm.employee_id,
                    bank_name: electionForm.bank_name.trim(),
                    bank_account: electionForm.bank_account.trim(),
                    percent: Number(electionForm.percent) || 100,
                    is_primary: elections.length === 0
                  });
                  persistExtraFields(tenantId, "hrm.payment_election", row.id, extraJson);
                  setElectionForm({ ...electionForm, bank_name: "", bank_account: "", percent: "100" });
                  setTick((n) => n + 1);
                }
              });
            }}
          >
            {selfService ? null : (
              <Field label="Worker">
                <SelectInput required value={electionForm.employee_id} onChange={(e) => setElectionForm({ ...electionForm, employee_id: e.target.value })}>
                  <option value="">Select</option>
                  {people.map((p) => <option key={p.id} value={p.id}>{p.full_name}</option>)}
                </SelectInput>
              </Field>
            )}
            <Field label="Bank"><TextInput required value={electionForm.bank_name} onChange={(e) => setElectionForm({ ...electionForm, bank_name: e.target.value })} /></Field>
            <Field label="Account"><TextInput required value={electionForm.bank_account} onChange={(e) => setElectionForm({ ...electionForm, bank_account: e.target.value })} /></Field>
            <Field label="%"><TextInput type="number" min={1} max={100} value={electionForm.percent} onChange={(e) => setElectionForm({ ...electionForm, percent: e.target.value })} /></Field>
            <div className="flex items-end"><Button type="submit">Add election</Button></div>
          </form>
          <ul className="space-y-1 text-sm">
            {elections.map((e) => (
              <li key={e.id}>{getEmployeeName(e.employee_id)} · {e.bank_name} {e.bank_account} · {e.percent}% {e.is_primary ? "(primary)" : ""}</li>
            ))}
            {elections.length === 0 ? <li className="text-slate-500">No bank split on file.</li> : null}
          </ul>
        </Panel>
      </div>
      {dialog}
    </AppShell>
  );
}
