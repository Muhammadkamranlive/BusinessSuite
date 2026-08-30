"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { AppShell } from "@/components/app-shell";
import { PageHeader } from "@/components/common/page-header";
import { ModuleBreadcrumbs } from "@/components/common/module-breadcrumbs";
import { ConfirmDialog } from "@/components/common/confirm-dialog";
import { StatusBadge } from "@/components/common/status-badge";
import { useConfirm } from "@/components/common/use-confirm";
import { ExtraFieldsBlock } from "@/components/forms/extra-fields-block";
import { ExtraFieldsReadout } from "@/components/forms/extra-fields-readout";
import { Badge, Button, Field, Panel, SectionHeader, SelectInput, TextInput } from "@/components/ui";
import { canMenu } from "@/modules/admin/services/acl.store";
import { getSelfServiceContext } from "@/lib/auth/current-employee";
import { getStoredTenantId } from "@/lib/auth/session";
import { getExtraFieldValues, persistExtraFields } from "@/modules/forms/services/extra-fields.store";
import { money } from "@/lib/utils";
import {
  allowanceTotal,
  estimatedIncomeTax,
  grossPay,
  housingAllowance,
  isEobiEnrolled,
  isPfEnrolled,
  medicalAllowance,
  otherAllowance,
  tenureLabel,
  transportAllowance
} from "@/modules/hrm/services/compensation";
import {
  completeOnboardingTask,
  createOnboardingTask,
  getCompanyProfile,
  getCurrentEobiAmount,
  getCurrentPfPercent,
  getDepartmentName,
  getDesignationName,
  getEmployee,
  getManager,
  getPayrollRun,
  getShiftName,
  listAssets,
  listAttendanceForEmployee,
  listDepartments,
  listDesignations,
  listDirectReports,
  listEmployees,
  listHrDocuments,
  listLeaveRequestsForEmployee,
  listLoans,
  listOnboardingTasksForEmployee,
  listPfContributionsForEmployee,
  listPayrollItemsForEmployee,
  listShifts,
  listTimesheetsForEmployee,
  resignEmployee,
  updateEmployee
} from "@/modules/hrm/services/hrm.store";
import { downloadSalarySlip } from "@/modules/hrm/services/payroll-pdf";
import { WorkerWorkdayPanels } from "@/components/hrm/worker-workday-panels";
import type { Employee, EmploymentType, TaxStatus } from "@/modules/hrm/model";

const TABS = [
  { id: "overview", label: "Overview" },
  { id: "job", label: "Job" },
  { id: "personal", label: "Personal" },
  { id: "identity", label: "Identity" },
  { id: "career", label: "Career" },
  { id: "compensation", label: "Compensation", pay: true },
  { id: "pay", label: "Pay", pay: true },
  { id: "benefits", label: "Benefits", pay: true },
  { id: "time", label: "Time" },
  { id: "balances", label: "Leave" },
  { id: "team", label: "Team" },
  { id: "history", label: "History" },
  { id: "documents", label: "Documents" }
] as const;

type TabId = (typeof TABS)[number]["id"];

function initials(name: string) {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");
}

function Dl({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div>
      <dt className="text-slate-500">{label}</dt>
      <dd className="font-medium text-ink">{value}</dd>
    </div>
  );
}

export default function EmployeeDetailPage() {
  const employeeId = useParams().id as string;
  const tenantId = getStoredTenantId() ?? "alpha";
  const router = useRouter();
  const searchParams = useSearchParams();
  const { employee: me, selfService, profile } = getSelfServiceContext(tenantId);
  const canEdit = canMenu(profile.role, profile.email, "hrm.employees", "update");
  const { askSave, dialog } = useConfirm();

  const requestedTab = (searchParams.get("tab") as TabId) || "overview";
  const [tab, setTab] = useState<TabId>(requestedTab);
  const [employee, setEmployee] = useState<Employee | null>(null);
  const [departments, setDepartments] = useState<ReturnType<typeof listDepartments>>([]);
  const [designations, setDesignations] = useState<ReturnType<typeof listDesignations>>([]);
  const [shifts, setShifts] = useState<ReturnType<typeof listShifts>>([]);
  const [peers, setPeers] = useState<Employee[]>([]);
  const [tasks, setTasks] = useState<ReturnType<typeof listOnboardingTasksForEmployee>>([]);
  const [documents, setDocuments] = useState<ReturnType<typeof listHrDocuments>>([]);
  const [editing, setEditing] = useState(false);
  const [extraJson, setExtraJson] = useState("");
  const [form, setForm] = useState({
    full_name: "",
    email: "",
    phone: "",
    department_id: "",
    designation_id: "",
    shift_id: "",
    manager_id: "",
    employment_type: "full_time" as EmploymentType,
    basic_salary: "",
    housing_allowance: "",
    transport_allowance: "",
    medical_allowance: "",
    other_allowance: "",
    joining_date: "",
    cnic: "",
    bank_name: "",
    bank_account: "",
    address: "",
    location: "",
    business_title: "",
    emergency_contact: "",
    tax_status: "filer" as TaxStatus,
    tax_ntn: "",
    pf_enrolled: true,
    eobi_enrolled: true
  });
  const [confirmResign, setConfirmResign] = useState(false);
  const [resignDate, setResignDate] = useState(new Date().toISOString().slice(0, 10));
  const [taskForm, setTaskForm] = useState({ title: "", due_date: "" });

  function refresh() {
    const emp = getEmployee(employeeId) ?? null;
    setEmployee(emp);
    setDepartments(listDepartments(tenantId));
    setDesignations(listDesignations(tenantId));
    setShifts(listShifts(tenantId));
    setPeers(listEmployees(tenantId).filter((e) => e.id !== employeeId && e.status !== "terminated"));
    setTasks(listOnboardingTasksForEmployee(employeeId));
    setDocuments(listHrDocuments(tenantId).filter((doc) => doc.employee_id === employeeId));
    if (emp) {
      setForm({
        full_name: emp.full_name,
        email: emp.email,
        phone: emp.phone,
        department_id: emp.department_id,
        designation_id: emp.designation_id ?? "",
        shift_id: emp.shift_id ?? "",
        manager_id: emp.manager_id ?? "",
        employment_type: emp.employment_type,
        basic_salary: String(emp.basic_salary),
        housing_allowance: String(housingAllowance(emp)),
        transport_allowance: String(transportAllowance(emp)),
        medical_allowance: String(medicalAllowance(emp)),
        other_allowance: String(otherAllowance(emp)),
        joining_date: emp.joining_date,
        cnic: emp.cnic ?? "",
        bank_name: emp.bank_name ?? "",
        bank_account: emp.bank_account ?? "",
        address: emp.address ?? "",
        location: emp.location ?? "",
        business_title: emp.business_title ?? "",
        emergency_contact: emp.emergency_contact ?? "",
        tax_status: emp.tax_status ?? "filer",
        tax_ntn: emp.tax_ntn ?? "",
        pf_enrolled: emp.pf_enrolled !== false,
        eobi_enrolled: emp.eobi_enrolled !== false
      });
    }
  }

  useEffect(() => {
    refresh();
  }, [employeeId, tenantId]);

  useEffect(() => {
    if (TABS.some((t) => t.id === requestedTab)) setTab(requestedTab);
  }, [requestedTab]);

  const isOwn = Boolean(me && employee && me.id === employee.id);
  const canSeePay = !selfService || isOwn;
  const visibleTabs = TABS.filter((item) => !("pay" in item && item.pay) || canSeePay);
  const activeTab = visibleTabs.some((item) => item.id === tab) ? tab : "overview";

  const manager = employee ? getManager(employee) : null;
  const reports = employee ? listDirectReports(employee.id).filter((e) => e.status !== "terminated") : [];
  const slips = useMemo(() => {
    if (!employee) return [];
    return listPayrollItemsForEmployee(employee.id)
      .map((item) => ({ item, run: getPayrollRun(item.run_id) }))
      .filter((row) => row.run)
      .sort((a, b) => ((a.run?.period ?? "") < (b.run?.period ?? "") ? 1 : -1));
  }, [employee]);
  const pfRows = employee ? listPfContributionsForEmployee(employee.id).sort((a, b) => (a.period < b.period ? 1 : -1)) : [];
  const attendance = employee ? listAttendanceForEmployee(employee.id).slice().sort((a, b) => (a.attendance_date < b.attendance_date ? 1 : -1)).slice(0, 12) : [];
  const timesheets = employee ? listTimesheetsForEmployee(tenantId, employee.id).slice(0, 12) : [];
  const leaves = employee ? listLeaveRequestsForEmployee(employee.id) : [];
  const loans = employee ? listLoans(tenantId).filter((l) => l.employee_id === employee.id) : [];
  const assets = employee ? listAssets(tenantId).filter((a) => a.assigned_employee_id === employee.id) : [];

  function selectTab(next: TabId) {
    setTab(next);
    router.replace(`/hrm/employees/${employeeId}?tab=${next}`, { scroll: false });
  }

  function doSave() {
    if (!employee) return;
    updateEmployee(employee.id, {
      full_name: form.full_name.trim(),
      email: form.email.trim(),
      phone: form.phone.trim(),
      department_id: form.department_id,
      designation_id: form.designation_id || null,
      shift_id: form.shift_id || null,
      manager_id: form.manager_id || null,
      employment_type: form.employment_type,
      basic_salary: Number(form.basic_salary) || 0,
      housing_allowance: Number(form.housing_allowance) || 0,
      transport_allowance: Number(form.transport_allowance) || 0,
      medical_allowance: Number(form.medical_allowance) || 0,
      other_allowance: Number(form.other_allowance) || 0,
      joining_date: form.joining_date,
      cnic: form.cnic.trim() || null,
      bank_name: form.bank_name.trim() || null,
      bank_account: form.bank_account.trim() || null,
      address: form.address.trim() || null,
      location: form.location.trim() || null,
      business_title: form.business_title.trim() || null,
      emergency_contact: form.emergency_contact.trim() || null,
      tax_status: form.tax_status,
      tax_ntn: form.tax_ntn.trim() || null,
      pf_enrolled: form.pf_enrolled,
      eobi_enrolled: form.eobi_enrolled
    });
    persistExtraFields(tenantId, "hrm.employee", employee.id, extraJson);
    setExtraJson("");
    setEditing(false);
    refresh();
  }

  function saveEdit(e: React.FormEvent) {
    e.preventDefault();
    askSave({ editing: true, entityLabel: "worker profile", onConfirm: doSave });
  }

  function submitTask(e: React.FormEvent) {
    e.preventDefault();
    if (!taskForm.title.trim() || !employee) return;
    createOnboardingTask(tenantId, {
      employee_id: employee.id,
      title: taskForm.title.trim(),
      status: "pending",
      due_date: taskForm.due_date || null
    });
    setTaskForm({ title: "", due_date: "" });
    refresh();
  }

  if (!employee) {
    return (
      <AppShell activeModule="hrm">
        <PageHeader title="Employee not found" />
        <ModuleBreadcrumbs trail={[{ label: "Profile" }]} />
      </AppShell>
    );
  }

  const title = employee.business_title || getDesignationName(employee.designation_id);

  return (
    <AppShell activeModule="hrm">
      <PageHeader
        title={employee.full_name}
        description={`${employee.employee_no} · ${title} · ${getDepartmentName(employee.department_id)}`}
        actionLabel={editing || !canEdit ? undefined : "Edit profile"}
        onAction={
          editing || !canEdit
            ? undefined
            : () => {
                setExtraJson(getExtraFieldValues(tenantId, "hrm.employee", employee.id));
                setEditing(true);
              }
        }
      />
      <ModuleBreadcrumbs trail={[{ label: "Employees", href: "/hrm/employees" }, { label: employee.full_name }]} />

      <Panel className="mb-5">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex min-w-0 items-center gap-4">
            <span className="bs-chat-avatar !h-14 !w-14 !text-base">{initials(employee.full_name)}</span>
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="truncate text-lg font-bold text-ink">{employee.full_name}</h2>
                <StatusBadge status={employee.status} />
              </div>
              <p className="text-sm text-slate-500">
                {title} · Reports to {manager ? (
                  <Link href={`/hrm/employees/${manager.id}`} className="font-semibold text-teal hover:underline">{manager.full_name}</Link>
                ) : "—"}
              </p>
              <p className="text-xs text-slate-500">{employee.location || employee.address || "—"} · Tenure {tenureLabel(employee.joining_date)}</p>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button href="/hrm/organization" variant="secondary">Organization</Button>
            {isOwn ? <Button href="/hrm/my-pay" variant="ghost">My Pay</Button> : null}
            {canEdit && employee.status === "active" ? (
              <>
                <TextInput type="date" className="!h-11 !w-40 !text-xs" value={resignDate} onChange={(e) => setResignDate(e.target.value)} aria-label="Resignation date" />
                <Button variant="danger" onClick={() => setConfirmResign(true)}>Resign</Button>
              </>
            ) : null}
          </div>
        </div>
        <div className="bs-worker-tabs mt-5 border-b border-line">
          {visibleTabs.map((item) => (
            <button
              key={item.id}
              type="button"
              className={`bs-worker-tab ${activeTab === item.id ? "is-active" : ""}`}
              onClick={() => selectTab(item.id)}
            >
              {item.label}
            </button>
          ))}
        </div>
      </Panel>

      {editing ? (
        <Panel className="mb-5">
          <SectionHeader title="Edit worker" />
          <form onSubmit={saveEdit} className="grid gap-4 md:grid-cols-2">
            <Field label="Full name">
              <TextInput required value={form.full_name} onChange={(e) => setForm({ ...form, full_name: e.target.value })} />
            </Field>
            <Field label="Business title">
              <TextInput value={form.business_title} onChange={(e) => setForm({ ...form, business_title: e.target.value })} />
            </Field>
            <Field label="Email">
              <TextInput required type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
            </Field>
            <Field label="Phone">
              <TextInput required value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
            </Field>
            <Field label="Employment type">
              <SelectInput value={form.employment_type} onChange={(e) => setForm({ ...form, employment_type: e.target.value as EmploymentType })}>
                <option value="full_time">Full time</option>
                <option value="part_time">Part time</option>
                <option value="contract">Contract</option>
                <option value="intern">Intern</option>
              </SelectInput>
            </Field>
            <Field label="Reports to">
              <SelectInput value={form.manager_id} onChange={(e) => setForm({ ...form, manager_id: e.target.value })}>
                <option value="">— None (org root) —</option>
                {peers.map((p) => (
                  <option key={p.id} value={p.id}>{p.full_name}</option>
                ))}
              </SelectInput>
            </Field>
            <Field label="Department">
              <SelectInput required value={form.department_id} onChange={(e) => setForm({ ...form, department_id: e.target.value })}>
                {departments.map((d) => (
                  <option key={d.id} value={d.id}>{d.name}</option>
                ))}
              </SelectInput>
            </Field>
            <Field label="Designation">
              <SelectInput value={form.designation_id} onChange={(e) => setForm({ ...form, designation_id: e.target.value })}>
                <option value="">— None —</option>
                {designations.map((d) => (
                  <option key={d.id} value={d.id}>{d.name}</option>
                ))}
              </SelectInput>
            </Field>
            <Field label="Shift">
              <SelectInput value={form.shift_id} onChange={(e) => setForm({ ...form, shift_id: e.target.value })}>
                <option value="">— None —</option>
                {shifts.map((s) => (
                  <option key={s.id} value={s.id}>{s.name}</option>
                ))}
              </SelectInput>
            </Field>
            <Field label="Joining date">
              <TextInput required type="date" value={form.joining_date} onChange={(e) => setForm({ ...form, joining_date: e.target.value })} />
            </Field>
            {canSeePay ? (
              <>
                <Field label="Basic salary">
                  <TextInput required type="number" min={0} value={form.basic_salary} onChange={(e) => setForm({ ...form, basic_salary: e.target.value })} />
                </Field>
                <Field label="Housing">
                  <TextInput type="number" min={0} value={form.housing_allowance} onChange={(e) => setForm({ ...form, housing_allowance: e.target.value })} />
                </Field>
                <Field label="Transport">
                  <TextInput type="number" min={0} value={form.transport_allowance} onChange={(e) => setForm({ ...form, transport_allowance: e.target.value })} />
                </Field>
                <Field label="Medical">
                  <TextInput type="number" min={0} value={form.medical_allowance} onChange={(e) => setForm({ ...form, medical_allowance: e.target.value })} />
                </Field>
                <Field label="Other allowance">
                  <TextInput type="number" min={0} value={form.other_allowance} onChange={(e) => setForm({ ...form, other_allowance: e.target.value })} />
                </Field>
                <Field label="Tax status">
                  <SelectInput value={form.tax_status} onChange={(e) => setForm({ ...form, tax_status: e.target.value as TaxStatus })}>
                    <option value="filer">Filer</option>
                    <option value="non_filer">Non-filer</option>
                  </SelectInput>
                </Field>
                <Field label="NTN">
                  <TextInput value={form.tax_ntn} onChange={(e) => setForm({ ...form, tax_ntn: e.target.value })} />
                </Field>
                <Field label="Provident fund">
                  <SelectInput value={form.pf_enrolled ? "yes" : "no"} onChange={(e) => setForm({ ...form, pf_enrolled: e.target.value === "yes" })}>
                    <option value="yes">Enrolled</option>
                    <option value="no">Not enrolled</option>
                  </SelectInput>
                </Field>
                <Field label="EOBI">
                  <SelectInput value={form.eobi_enrolled ? "yes" : "no"} onChange={(e) => setForm({ ...form, eobi_enrolled: e.target.value === "yes" })}>
                    <option value="yes">Enrolled</option>
                    <option value="no">Not enrolled</option>
                  </SelectInput>
                </Field>
                <Field label="Bank name">
                  <TextInput value={form.bank_name} onChange={(e) => setForm({ ...form, bank_name: e.target.value })} />
                </Field>
                <Field label="Bank account">
                  <TextInput value={form.bank_account} onChange={(e) => setForm({ ...form, bank_account: e.target.value })} />
                </Field>
              </>
            ) : null}
            <Field label="CNIC">
              <TextInput value={form.cnic} onChange={(e) => setForm({ ...form, cnic: e.target.value })} />
            </Field>
            <Field label="Emergency contact">
              <TextInput value={form.emergency_contact} onChange={(e) => setForm({ ...form, emergency_contact: e.target.value })} />
            </Field>
            <Field label="Location">
              <TextInput value={form.location} onChange={(e) => setForm({ ...form, location: e.target.value })} />
            </Field>
            <Field label="Address" className="md:col-span-2">
              <TextInput value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} />
            </Field>
            <ExtraFieldsBlock formKey="hrm.employee" valueJson={extraJson} onChange={setExtraJson} />
            <div className="flex gap-2 md:col-span-2">
              <Button type="submit">Save changes</Button>
              <Button type="button" variant="secondary" onClick={() => { setEditing(false); setExtraJson(""); refresh(); }}>Cancel</Button>
            </div>
          </form>
        </Panel>
      ) : null}

      {activeTab === "overview" ? (
        <div className="grid gap-5 xl:grid-cols-[1.4fr_1fr]">
          <Panel>
            <SectionHeader title="Contact" />
            <dl className="grid gap-4 text-sm md:grid-cols-2">
              <Dl label="Email" value={employee.email} />
              <Dl label="Phone" value={employee.phone} />
              <Dl label="Location" value={employee.location || employee.address || "—"} />
              <Dl label="Emergency" value={employee.emergency_contact ?? "—"} />
            </dl>
            <ExtraFieldsReadout tenantId={tenantId} formKey="hrm.employee" recordId={employee.id} />
          </Panel>
          <Panel>
            <SectionHeader title="Job snapshot" />
            <dl className="grid gap-4 text-sm">
              <Dl label="Department" value={getDepartmentName(employee.department_id)} />
              <Dl label="Designation" value={getDesignationName(employee.designation_id)} />
              <Dl label="Shift" value={getShiftName(employee.shift_id)} />
              <Dl label="Type" value={employee.employment_type.replace("_", " ")} />
              <Dl label="Joined" value={`${employee.joining_date} · ${tenureLabel(employee.joining_date)}`} />
              <Dl label="Direct reports" value={String(reports.length)} />
            </dl>
          </Panel>
        </div>
      ) : null}

      {activeTab === "job" ? (
        <Panel>
          <SectionHeader title="Job details" />
          <dl className="grid gap-4 text-sm md:grid-cols-2">
            <Dl label="Business title" value={title} />
            <Dl label="Employee no" value={employee.employee_no} />
            <Dl label="Department" value={getDepartmentName(employee.department_id)} />
            <Dl label="Designation" value={getDesignationName(employee.designation_id)} />
            <Dl label="Manager" value={manager ? <Link href={`/hrm/employees/${manager.id}`} className="text-teal hover:underline">{manager.full_name}</Link> : "—"} />
            <Dl label="Shift" value={getShiftName(employee.shift_id)} />
            <Dl label="Employment type" value={<span className="capitalize">{employee.employment_type.replace("_", " ")}</span>} />
            <Dl label="Status" value={<StatusBadge status={employee.status} />} />
            <Dl label="Joining date" value={employee.joining_date} />
            <Dl label="Resignation date" value={employee.resignation_date ?? "—"} />
            {canSeePay ? <Dl label="CNIC" value={employee.cnic ?? "—"} /> : null}
            <Dl label="Machine ID" value={employee.machine_id ?? "—"} />
          </dl>
        </Panel>
      ) : null}

      {["personal", "identity", "career", "history", "balances"].includes(activeTab) ? (
        <WorkerWorkdayPanels tenantId={tenantId} employeeId={employee.id} tab={activeTab} canEdit={canEdit} />
      ) : null}

      {activeTab === "compensation" && canSeePay ? (
        <Panel>
          <SectionHeader title="Compensation" eyebrow="Total rewards" />
          <dl className="grid gap-4 text-sm md:grid-cols-3">
            <Dl label="Basic" value={money(employee.basic_salary)} />
            <Dl label="Housing" value={money(housingAllowance(employee))} />
            <Dl label="Transport" value={money(transportAllowance(employee))} />
            <Dl label="Medical" value={money(medicalAllowance(employee))} />
            <Dl label="Other" value={money(otherAllowance(employee))} />
            <Dl label="Gross" value={money(grossPay(employee))} />
            <Dl label="Est. income tax" value={money(estimatedIncomeTax(employee))} />
            <Dl label="Tax status" value={<span className="capitalize">{employee.tax_status ?? "filer"}</span>} />
            <Dl label="NTN" value={employee.tax_ntn ?? "—"} />
            <Dl label="Allowances" value={money(allowanceTotal(employee))} />
          </dl>
        </Panel>
      ) : null}

      {activeTab === "pay" && canSeePay ? (
        <Panel>
          <SectionHeader title="Payslips" />
          <p className="mb-3 text-sm text-slate-500">Bank: {employee.bank_name ? `${employee.bank_name} · ${employee.bank_account ?? "—"}` : "—"}</p>
          <div className="space-y-2">
            {slips.map(({ item, run }) => (
              <div key={item.id} className="flex flex-wrap items-center justify-between gap-2 rounded-[var(--bs-radius)] border border-line px-3 py-2">
                <div>
                  <p className="text-sm font-semibold text-ink">{run?.period} · Net {money(item.net)}</p>
                  <p className="text-xs text-slate-500">
                    Gross {money(item.basic + item.allowances)} · Tax {money(item.tax ?? 0)} · EOBI {money(item.eobi ?? 0)} · PF {money(item.pf)}
                  </p>
                </div>
                {run ? (
                  <Button
                    type="button"
                    variant="secondary"
                    className="!min-h-8 !px-3 !text-xs"
                    onClick={() => downloadSalarySlip({ company: getCompanyProfile(tenantId), employee, run, item })}
                  >
                    Salary slip PDF
                  </Button>
                ) : null}
              </div>
            ))}
            {slips.length === 0 ? <p className="text-sm text-slate-400">No payslips yet.</p> : null}
          </div>
        </Panel>
      ) : null}

      {activeTab === "benefits" && canSeePay ? (
        <div className="grid gap-5 lg:grid-cols-2">
          <Panel>
            <SectionHeader title="Provident fund" />
            <p className="mb-3 text-sm text-slate-500">
              {isPfEnrolled(employee) ? `Enrolled · company rate ${getCurrentPfPercent(tenantId)}% of basic` : "Not enrolled"}
            </p>
            <div className="space-y-2">
              {pfRows.slice(0, 8).map((row) => (
                <div key={row.id} className="flex justify-between rounded-[var(--bs-radius)] border border-line px-3 py-2 text-sm">
                  <span>{row.period}</span>
                  <span className="font-semibold">{money(row.employee_amount + row.employer_amount)}</span>
                </div>
              ))}
              {pfRows.length === 0 ? <p className="text-sm text-slate-400">No PF contributions posted.</p> : null}
            </div>
          </Panel>
          <Panel>
            <SectionHeader title="EOBI & loans" />
            <p className="mb-3 text-sm text-slate-500">
              {isEobiEnrolled(employee) ? `Enrolled · ${money(getCurrentEobiAmount(tenantId))} per period` : "Not enrolled"}
            </p>
            <div className="space-y-2">
              {loans.map((loan) => (
                <div key={loan.id} className="flex justify-between rounded-[var(--bs-radius)] border border-line px-3 py-2 text-sm">
                  <span>{loan.reason}</span>
                  <span className="font-semibold">{money(loan.amount)} · {loan.status}</span>
                </div>
              ))}
              {loans.length === 0 ? <p className="text-sm text-slate-400">No loans on file.</p> : null}
            </div>
          </Panel>
          <div className="lg:col-span-2">
            <WorkerWorkdayPanels tenantId={tenantId} employeeId={employee.id} tab="benefits" canEdit={canEdit} />
          </div>
        </div>
      ) : null}

      {activeTab === "time" ? (
        <div className="grid gap-5 lg:grid-cols-3">
          <Panel>
            <SectionHeader title="Attendance" />
            <div className="space-y-2">
              {attendance.map((row) => (
                <div key={row.id} className="flex justify-between text-sm">
                  <span>{row.attendance_date}</span>
                  <StatusBadge status={row.status} />
                </div>
              ))}
              {attendance.length === 0 ? <p className="text-sm text-slate-400">No attendance yet.</p> : null}
            </div>
          </Panel>
          <Panel>
            <SectionHeader title="Timesheets" />
            <div className="space-y-2">
              {timesheets.map((row) => (
                <div key={row.id} className="flex justify-between text-sm">
                  <span>{row.work_date} · {row.hours}h</span>
                  <StatusBadge status={row.status} />
                </div>
              ))}
              {timesheets.length === 0 ? <p className="text-sm text-slate-400">No timesheets yet.</p> : null}
            </div>
          </Panel>
          <Panel>
            <SectionHeader title="Leave" />
            <div className="space-y-2">
              {leaves.map((row) => (
                <div key={row.id} className="text-sm">
                  <p className="font-semibold text-ink">{row.leave_type}</p>
                  <p className="text-xs text-slate-500">{row.start_date} → {row.end_date} · {row.status}</p>
                </div>
              ))}
              {leaves.length === 0 ? <p className="text-sm text-slate-400">No leave requests.</p> : null}
            </div>
          </Panel>
        </div>
      ) : null}

      {activeTab === "team" ? (
        <div className="grid gap-5 lg:grid-cols-2">
          <Panel>
            <SectionHeader title="Manager" />
            {manager ? (
              <Link href={`/hrm/employees/${manager.id}`} className="bs-org-card !w-full">
                <p className="font-bold text-ink">{manager.full_name}</p>
                <p className="text-xs text-slate-500">{manager.business_title || getDesignationName(manager.designation_id)}</p>
              </Link>
            ) : (
              <p className="text-sm text-slate-400">This worker is an organization root.</p>
            )}
          </Panel>
          <Panel>
            <SectionHeader title="Direct reports" />
            <div className="space-y-2">
              {reports.map((row) => (
                <Link key={row.id} href={`/hrm/employees/${row.id}`} className="flex items-center justify-between rounded-[var(--bs-radius)] border border-line px-3 py-2">
                  <span className="text-sm font-semibold text-ink">{row.full_name}</span>
                  <span className="text-xs text-slate-500">{row.business_title || getDesignationName(row.designation_id)}</span>
                </Link>
              ))}
              {reports.length === 0 ? <p className="text-sm text-slate-400">No direct reports.</p> : null}
            </div>
          </Panel>
        </div>
      ) : null}

      {activeTab === "documents" ? (
        <div className="grid gap-5 lg:grid-cols-2">
          <Panel>
            <SectionHeader title="Onboarding" eyebrow="Checklist" />
            {canEdit ? (
              <form onSubmit={submitTask} className="mb-4 grid gap-2 md:grid-cols-[1fr_180px_auto]">
                <TextInput placeholder="Task title" value={taskForm.title} onChange={(e) => setTaskForm({ ...taskForm, title: e.target.value })} />
                <TextInput type="date" value={taskForm.due_date} onChange={(e) => setTaskForm({ ...taskForm, due_date: e.target.value })} />
                <Button type="submit">Add task</Button>
              </form>
            ) : null}
            <div className="space-y-2">
              {tasks.map((t) => (
                <div key={t.id} className="flex items-center justify-between rounded-[var(--bs-radius)] border border-line px-3 py-2">
                  <div>
                    <p className="text-sm font-semibold text-ink">{t.title}</p>
                    <p className="text-xs text-slate-500">{t.due_date ? `Due ${t.due_date}` : "No due date"}</p>
                  </div>
                  {t.status === "pending" && canEdit ? (
                    <Button variant="secondary" className="!min-h-8 !px-3 !text-xs" onClick={() => { completeOnboardingTask(t.id); refresh(); }}>Mark done</Button>
                  ) : (
                    <Badge tone={t.status === "done" ? "success" : "neutral"}>{t.status === "done" ? "Done" : "Pending"}</Badge>
                  )}
                </div>
              ))}
              {tasks.length === 0 ? <p className="text-sm text-slate-400">No onboarding tasks yet.</p> : null}
            </div>
          </Panel>
          <Panel>
            <SectionHeader title="HR documents & assets" />
            <div className="space-y-2">
              {documents.map((doc) => (
                <div key={doc.id} className="flex items-center justify-between rounded-[var(--bs-radius)] border border-line px-3 py-2">
                  <div>
                    <p className="text-sm font-semibold text-ink">{doc.title}</p>
                    <p className="text-xs text-slate-500">{doc.category}</p>
                  </div>
                  <StatusBadge status={doc.status} />
                </div>
              ))}
              {assets.map((asset) => (
                <div key={asset.id} className="flex items-center justify-between rounded-[var(--bs-radius)] border border-line px-3 py-2">
                  <div>
                    <p className="text-sm font-semibold text-ink">{asset.name}</p>
                    <p className="text-xs text-slate-500">{asset.tag_code}</p>
                  </div>
                  <StatusBadge status={asset.status} />
                </div>
              ))}
              {documents.length === 0 && assets.length === 0 ? <p className="text-sm text-slate-400">No documents or assets assigned.</p> : null}
            </div>
          </Panel>
        </div>
      ) : null}

      <ConfirmDialog
        open={confirmResign}
        title="Resign employee?"
        message={`${employee.full_name} will be marked as offboarding effective ${resignDate}.`}
        confirmLabel="Confirm resignation"
        onCancel={() => setConfirmResign(false)}
        onConfirm={() => {
          resignEmployee(employee.id, resignDate);
          setConfirmResign(false);
          refresh();
        }}
      />
      {dialog}
    </AppShell>
  );
}
