"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { AppShell } from "@/components/app-shell";
import { PageHeader } from "@/components/common/page-header";
import { ModuleBreadcrumbs } from "@/components/common/module-breadcrumbs";
import { StatusBadge } from "@/components/common/status-badge";
import { DataListToolbar } from "@/components/common/data-list-toolbar";
import { RecordRowActions } from "@/components/common/record-row-actions";
import { useConfirm } from "@/components/common/use-confirm";
import { ExtraFieldsBlock } from "@/components/forms/extra-fields-block";
import { ExtraFieldsReadout } from "@/components/forms/extra-fields-readout";
import { Button, Field, Panel, SelectInput, TextInput } from "@/components/ui";
import { canMenu } from "@/modules/admin/services/acl.store";
import { getStoredTenantId } from "@/lib/auth/session";
import { getSessionProfile } from "@/lib/auth/session-profile";
import { isSelfServiceRole } from "@/lib/employee-menus";
import { DEMO_PASSWORD } from "@/lib/auth/public-auth";
import { provisionEmployeeLogin } from "@/lib/auth/provision-login";
import { exportListCsv, exportListPdf } from "@/lib/list-export";
import { filterAndSort } from "@/lib/list-query";
import { persistExtraFields } from "@/modules/forms/services/extra-fields.store";
import { money } from "@/lib/utils";
import {
  createEmployee,
  getDepartmentName,
  getDesignationName,
  listDepartments,
  listDesignations,
  listEmployees,
  listShifts,
  trashEmployee
} from "@/modules/hrm/services/hrm.store";
import type { Employee, EmploymentType } from "@/modules/hrm/model";

const emptyForm = {
  full_name: "",
  email: "",
  phone: "",
  department_id: "",
  designation_id: "",
  shift_id: "",
  employment_type: "full_time" as EmploymentType,
  basic_salary: "",
  joining_date: "",
  cnic: "",
  bank_name: "",
  bank_account: "",
  manager_id: "",
  create_login: true
};

export default function EmployeesPage() {
  const tenantId = getStoredTenantId() ?? "alpha";
  const profile = getSessionProfile();
  const canCreate = canMenu(profile.role, profile.email, "hrm.employees", "create");
  const canDelete = canMenu(profile.role, profile.email, "hrm.employees", "delete");
  const hidePay = isSelfServiceRole(profile.role);
  const { askSave, askTrash, dialog } = useConfirm();
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [departments, setDepartments] = useState<ReturnType<typeof listDepartments>>([]);
  const [designations, setDesignations] = useState<ReturnType<typeof listDesignations>>([]);
  const [shifts, setShifts] = useState<ReturnType<typeof listShifts>>([]);
  const [search, setSearch] = useState("");
  const [departmentFilter, setDepartmentFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [sortField, setSortField] = useState("full_name");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");
  const [openForm, setOpenForm] = useState(false);
  const [error, setError] = useState("");
  const [form, setForm] = useState(emptyForm);
  const [extraJson, setExtraJson] = useState("");

  function refresh() {
    setEmployees(listEmployees(tenantId));
    setDepartments(listDepartments(tenantId));
    setDesignations(listDesignations(tenantId));
    setShifts(listShifts(tenantId));
  }

  useEffect(() => {
    refresh();
  }, [tenantId]);

  const filtered = useMemo(() => {
    let rows = employees;
    if (departmentFilter !== "all") rows = rows.filter((e) => e.department_id === departmentFilter);
    return filterAndSort(rows as unknown as Array<Record<string, unknown>>, {
      search,
      searchFields: ["full_name", "employee_no", "email", "phone"],
      statusField: "status",
      statusValue: statusFilter,
      sortField,
      sortDir
    }) as unknown as Employee[];
  }, [employees, search, departmentFilter, statusFilter, sortField, sortDir]);

  function doSave() {
    setError("");
    if (!form.department_id) {
      setError("Department is required.");
      return;
    }
    const row = createEmployee(tenantId, {
      full_name: form.full_name.trim(),
      email: form.email.trim(),
      phone: form.phone.trim(),
      father_name: null,
      cnic: form.cnic.trim() || null,
      bank_name: form.bank_name.trim() || null,
      bank_account: form.bank_account.trim() || null,
      department_id: form.department_id,
      designation_id: form.designation_id || null,
      shift_id: form.shift_id || null,
      employment_type: form.employment_type,
      status: "active",
      basic_salary: Number(form.basic_salary) || 0,
      manager_id: form.manager_id || null,
      joining_date: form.joining_date || new Date().toISOString().slice(0, 10),
      resignation_date: null,
      emergency_contact: null,
      address: null,
      machine_id: null
    });
    persistExtraFields(tenantId, "hrm.employee", row.id, extraJson);
    setExtraJson("");
    if (form.create_login && form.email.trim()) {
      provisionEmployeeLogin({
        name: row.full_name,
        email: row.email,
        tenantId
      });
    }
    setOpenForm(false);
    setForm(emptyForm);
    refresh();
  }

  function submit(e: React.FormEvent) {
    e.preventDefault();
    askSave({
      editing: false,
      entityLabel: "employee",
      onConfirm: doSave
    });
  }

  return (
    <AppShell activeModule="hrm">
      <PageHeader
        title="Employees"
        description="Worker directory and profiles."
        actionLabel={canCreate ? "Add employee" : undefined}
        onAction={canCreate ? () => { setExtraJson(""); setOpenForm(true); } : undefined}
      />
      <ModuleBreadcrumbs />

      {openForm ? (
        <Panel className="mb-5 border-teal/40">
          <h2 className="mb-4 text-lg font-bold text-ink">Add employee</h2>
          <form onSubmit={submit} className="grid gap-4 md:grid-cols-3">
            {error ? <p className="text-sm text-[color:var(--bs-coral)] md:col-span-3">{error}</p> : null}
            <Field label="Full name">
              <TextInput required value={form.full_name} onChange={(e) => setForm({ ...form, full_name: e.target.value })} />
            </Field>
            <Field label="Email">
              <TextInput required type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
            </Field>
            <Field label="Phone">
              <TextInput required value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
            </Field>
            <Field label="Department">
              <SelectInput required value={form.department_id} onChange={(e) => setForm({ ...form, department_id: e.target.value })}>
                <option value="">Select department</option>
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
                <option value="">Department head (default)</option>
                {employees.filter((e) => e.status === "active").map((e) => (
                  <option key={e.id} value={e.id}>{e.full_name}</option>
                ))}
              </SelectInput>
            </Field>
            <Field label="Basic salary">
              <TextInput required type="number" min={0} value={form.basic_salary} onChange={(e) => setForm({ ...form, basic_salary: e.target.value })} />
            </Field>
            <Field label="Joining date">
              <TextInput required type="date" value={form.joining_date} onChange={(e) => setForm({ ...form, joining_date: e.target.value })} />
            </Field>
            <Field label="CNIC">
              <TextInput value={form.cnic} onChange={(e) => setForm({ ...form, cnic: e.target.value })} placeholder="Optional" />
            </Field>
            <Field label="Bank name">
              <TextInput value={form.bank_name} onChange={(e) => setForm({ ...form, bank_name: e.target.value })} placeholder="Optional" />
            </Field>
            <Field label="Bank account">
              <TextInput value={form.bank_account} onChange={(e) => setForm({ ...form, bank_account: e.target.value })} placeholder="Optional" />
            </Field>
            <ExtraFieldsBlock formKey="hrm.employee" valueJson={extraJson} onChange={setExtraJson} />
            <label className="flex items-start gap-2 text-sm font-semibold md:col-span-3">
              <input
                type="checkbox"
                className="mt-1"
                checked={form.create_login}
                onChange={(e) => setForm({ ...form, create_login: e.target.checked })}
              />
              <span>
                Create a login for this employee
                <span className="mt-1 block text-xs font-normal text-slate-500">
                  They sign in with this email and password {DEMO_PASSWORD}. They only see their own timesheets, attendance, tasks, and documents.
                </span>
              </span>
            </label>
            <div className="flex gap-2 md:col-span-3">
              <Button type="submit">Add employee</Button>
              <Button type="button" variant="secondary" onClick={() => { setOpenForm(false); setError(""); setExtraJson(""); }}>Cancel</Button>
            </div>
          </form>
        </Panel>
      ) : null}

      <Panel className="overflow-hidden p-0">
        <div className="p-4">
          <DataListToolbar
            search={search}
            onSearchChange={setSearch}
            searchPlaceholder="Search name, employee no, email…"
            filterLabel="statuses"
            filterValue={statusFilter}
            filterOptions={[
              { value: "active", label: "active" },
              { value: "onboarding", label: "onboarding" },
              { value: "offboarding", label: "offboarding" },
              { value: "inactive", label: "inactive" },
              { value: "terminated", label: "terminated" }
            ]}
            onFilterChange={setStatusFilter}
            sortValue={sortField}
            sortOptions={[
              { value: "full_name", label: "Name" },
              { value: "employee_no", label: "Employee no" },
              { value: "status", label: "Status" },
              ...(hidePay ? [] : [{ value: "basic_salary", label: "Salary" }])
            ]}
            onSortChange={setSortField}
            sortDir={sortDir}
            onSortDirChange={setSortDir}
            rightSlot={
              <SelectInput value={departmentFilter} onChange={(e) => setDepartmentFilter(e.target.value)} aria-label="Department">
                <option value="all">All departments</option>
                {departments.map((d) => (
                  <option key={d.id} value={d.id}>{d.name}</option>
                ))}
              </SelectInput>
            }
            onExportCsv={() =>
              exportListCsv({
                tenantId,
                module: "hrm",
                filename: "employees",
                rows: filtered.map((e) => ({
                  No: e.employee_no,
                  Name: e.full_name,
                  Department: getDepartmentName(e.department_id),
                  Designation: getDesignationName(e.designation_id),
                  Email: e.email,
                  Status: e.status,
                  ...(hidePay ? {} : { Salary: e.basic_salary })
                }))
              })
            }
            onExportPdf={() =>
              exportListPdf({
                tenantId,
                module: "hrm",
                title: "Employees",
                filename: "employees",
                columns: ["No", "Name", "Department", "Status"],
                rows: filtered.map((e) => [e.employee_no, e.full_name, getDepartmentName(e.department_id), e.status])
              })
            }
          />
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full text-left text-sm">
            <thead>
              <tr className="border-b border-line bg-cloud">
                {["Employee No", "Name", "Department", "Designation", "Email", "Status", ...(hidePay ? [] : ["Salary"]), ""].map((h) => (
                  <th key={h || "a"} className="px-4 py-3 font-semibold text-slate-600">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map((e) => (
                <tr key={e.id} className="border-b border-line">
                  <td className="px-4 py-3 font-medium text-ink">{e.employee_no}</td>
                  <td className="px-4 py-3">
                    {e.full_name}
                    <ExtraFieldsReadout tenantId={tenantId} formKey="hrm.employee" recordId={e.id} />
                  </td>
                  <td className="px-4 py-3">{getDepartmentName(e.department_id)}</td>
                  <td className="px-4 py-3">{getDesignationName(e.designation_id)}</td>
                  <td className="px-4 py-3">{e.email}</td>
                  <td className="px-4 py-3"><StatusBadge status={e.status} /></td>
                  {hidePay ? null : <td className="px-4 py-3">{money(e.basic_salary)}</td>}
                  <td className="px-4 py-3">
                    <div className="flex flex-wrap items-center gap-2">
                      <Link href={`/hrm/employees/${e.id}`} className="font-semibold text-teal hover:underline text-xs">View</Link>
                      {canDelete ? (
                      <RecordRowActions
                        onTrash={() =>
                          askTrash({
                            entityLabel: "employee",
                            name: e.full_name,
                            onConfirm: () => {
                              trashEmployee(e.id);
                              refresh();
                            }
                          })
                        }
                      />
                      ) : null}
                    </div>
                  </td>
                </tr>
              ))}
              {filtered.length === 0 ? (
                <tr><td colSpan={hidePay ? 7 : 8} className="px-4 py-8 text-center text-slate-400">No employees found.</td></tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </Panel>
      {dialog}
    </AppShell>
  );
}
