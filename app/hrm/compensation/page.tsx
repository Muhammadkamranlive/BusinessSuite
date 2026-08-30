"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { AppShell } from "@/components/app-shell";
import { DataListToolbar } from "@/components/common/data-list-toolbar";
import { ModuleBreadcrumbs } from "@/components/common/module-breadcrumbs";
import { PageHeader } from "@/components/common/page-header";
import { RecordRowActions } from "@/components/common/record-row-actions";
import { useConfirm } from "@/components/common/use-confirm";
import { ExtraFieldsBlock } from "@/components/forms/extra-fields-block";
import { ExtraFieldsReadout } from "@/components/forms/extra-fields-readout";
import { Button, Field, Panel, SelectInput, TextInput } from "@/components/ui";
import { canMenu } from "@/modules/admin/services/acl.store";
import { getStoredTenantId } from "@/lib/auth/session";
import { getSessionProfile } from "@/lib/auth/session-profile";
import { exportListCsv, exportListPdf } from "@/lib/list-export";
import { filterAndSort } from "@/lib/list-query";
import { money } from "@/lib/utils";
import { getExtraFieldValues, persistExtraFields } from "@/modules/forms/services/extra-fields.store";
import {
  allowanceTotal,
  estimatedIncomeTax,
  grossPay,
  housingAllowance,
  medicalAllowance,
  otherAllowance,
  transportAllowance
} from "@/modules/hrm/services/compensation";
import { getDepartmentName, listEmployees, updateEmployee } from "@/modules/hrm/services/hrm.store";
import { assertSalaryWithinGrade } from "@/modules/hrm/services/workday.store";
import type { Employee, TaxStatus } from "@/modules/hrm/model";

export default function CompensationPage() {
  const tenantId = getStoredTenantId() ?? "alpha";
  const profile = getSessionProfile();
  const canUpdate = canMenu(profile.role, profile.email, "hrm.compensation", "update");
  const { askSave, dialog } = useConfirm();
  const [tick, setTick] = useState(0);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("active");
  const [sortField, setSortField] = useState("full_name");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");
  const [editing, setEditing] = useState<Employee | null>(null);
  const [extraJson, setExtraJson] = useState("");
  const [form, setForm] = useState({
    basic_salary: "",
    housing_allowance: "",
    transport_allowance: "",
    medical_allowance: "",
    other_allowance: "",
    tax_status: "filer" as TaxStatus,
    tax_ntn: "",
    pf_enrolled: true,
    eobi_enrolled: true
  });

  const employees = useMemo(() => listEmployees(tenantId), [tenantId, tick]);
  const filtered = useMemo(
    () =>
      filterAndSort(employees as unknown as Array<Record<string, unknown>>, {
        search,
        searchFields: ["full_name", "employee_no", "email"],
        statusField: "status",
        statusValue: statusFilter,
        sortField,
        sortDir
      }) as unknown as Employee[],
    [employees, search, statusFilter, sortField, sortDir]
  );

  function openEdit(row: Employee) {
    setEditing(row);
    setExtraJson(getExtraFieldValues(tenantId, "hrm.compensation", row.id));
    setForm({
      basic_salary: String(row.basic_salary),
      housing_allowance: String(housingAllowance(row)),
      transport_allowance: String(transportAllowance(row)),
      medical_allowance: String(medicalAllowance(row)),
      other_allowance: String(otherAllowance(row)),
      tax_status: row.tax_status ?? "filer",
      tax_ntn: row.tax_ntn ?? "",
      pf_enrolled: row.pf_enrolled !== false,
      eobi_enrolled: row.eobi_enrolled !== false
    });
  }

  function doSave() {
    if (!editing) return;
    const salary = Number(form.basic_salary) || 0;
    const band = assertSalaryWithinGrade(editing.id, salary);
    if (!band.ok) {
      window.alert(`Salary ${salary} is outside pay grade ${band.grade} (${band.min}–${band.max}).`);
      return;
    }
    updateEmployee(editing.id, {
      basic_salary: Number(form.basic_salary) || 0,
      housing_allowance: Number(form.housing_allowance) || 0,
      transport_allowance: Number(form.transport_allowance) || 0,
      medical_allowance: Number(form.medical_allowance) || 0,
      other_allowance: Number(form.other_allowance) || 0,
      tax_status: form.tax_status,
      tax_ntn: form.tax_ntn.trim() || null,
      pf_enrolled: form.pf_enrolled,
      eobi_enrolled: form.eobi_enrolled
    });
    persistExtraFields(tenantId, "hrm.compensation", editing.id, extraJson);
    setEditing(null);
    setExtraJson("");
    setTick((n) => n + 1);
  }

  return (
    <AppShell activeModule="hrm">
      <PageHeader
        title="Compensation"
        description="Total rewards package: basic, housing, transport, medical, tax status, provident fund, and EOBI."
      />
      <ModuleBreadcrumbs />

      {editing ? (
        <Panel className="mb-5 border-teal/40">
          <h2 className="mb-4 text-lg font-bold text-ink">Edit compensation · {editing.full_name}</h2>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              askSave({ editing: true, entityLabel: "compensation", onConfirm: doSave });
            }}
            className="grid gap-4 md:grid-cols-3"
          >
            <Field label="Basic salary">
              <TextInput required type="number" min={0} value={form.basic_salary} onChange={(e) => setForm({ ...form, basic_salary: e.target.value })} />
            </Field>
            <Field label="Housing allowance">
              <TextInput type="number" min={0} value={form.housing_allowance} onChange={(e) => setForm({ ...form, housing_allowance: e.target.value })} />
            </Field>
            <Field label="Transport allowance">
              <TextInput type="number" min={0} value={form.transport_allowance} onChange={(e) => setForm({ ...form, transport_allowance: e.target.value })} />
            </Field>
            <Field label="Medical allowance">
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
              <TextInput value={form.tax_ntn} onChange={(e) => setForm({ ...form, tax_ntn: e.target.value })} placeholder="Optional" />
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
            <ExtraFieldsBlock formKey="hrm.compensation" valueJson={extraJson} onChange={setExtraJson} />
            <div className="flex flex-wrap gap-2 md:col-span-3">
              <Button type="submit">Save compensation</Button>
              <Button type="button" variant="secondary" onClick={() => { setEditing(null); setExtraJson(""); }}>
                Cancel
              </Button>
            </div>
          </form>
        </Panel>
      ) : null}

      <Panel className="overflow-hidden p-0">
        <div className="p-4">
          <DataListToolbar
            search={search}
            onSearchChange={setSearch}
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
              { value: "basic_salary", label: "Basic" }
            ]}
            onSortChange={setSortField}
            sortDir={sortDir}
            onSortDirChange={setSortDir}
            onExportCsv={() =>
              exportListCsv({
                tenantId,
                module: "hrm",
                filename: "compensation",
                rows: filtered.map((e) => ({
                  Name: e.full_name,
                  Department: getDepartmentName(e.department_id),
                  Basic: e.basic_salary,
                  Gross: grossPay(e),
                  Tax: estimatedIncomeTax(e),
                  PF: e.pf_enrolled === false ? "No" : "Yes",
                  EOBI: e.eobi_enrolled === false ? "No" : "Yes"
                }))
              })
            }
            onExportPdf={() =>
              exportListPdf({
                tenantId,
                module: "hrm",
                title: "Compensation",
                filename: "compensation",
                columns: ["Name", "Department", "Basic", "Gross"],
                rows: filtered.map((e) => [e.full_name, getDepartmentName(e.department_id), String(e.basic_salary), String(grossPay(e))])
              })
            }
          />
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full text-left text-sm">
            <thead>
              <tr className="border-b border-line bg-cloud">
                {["Worker", "Department", "Basic", "Allowances", "Gross", "Tax", "PF / EOBI", ""].map((h) => (
                  <th key={h || "a"} className="px-4 py-3 font-semibold text-slate-600">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map((e) => (
                <tr key={e.id} className="border-b border-line">
                  <td className="px-4 py-3">
                    <Link href={`/hrm/employees/${e.id}?tab=compensation`} className="font-semibold text-teal hover:underline">
                      {e.full_name}
                    </Link>
                    <ExtraFieldsReadout tenantId={tenantId} formKey="hrm.compensation" recordId={e.id} />
                  </td>
                  <td className="px-4 py-3">{getDepartmentName(e.department_id)}</td>
                  <td className="px-4 py-3">{money(e.basic_salary)}</td>
                  <td className="px-4 py-3">{money(allowanceTotal(e))}</td>
                  <td className="px-4 py-3 font-semibold text-ink">{money(grossPay(e))}</td>
                  <td className="px-4 py-3 capitalize">{e.tax_status ?? "filer"}</td>
                  <td className="px-4 py-3 text-xs text-slate-500">
                    {e.pf_enrolled === false ? "PF off" : "PF on"} · {e.eobi_enrolled === false ? "EOBI off" : "EOBI on"}
                  </td>
                  <td className="px-4 py-3">
                    {canUpdate ? (
                      <RecordRowActions onEdit={() => openEdit(e)} />
                    ) : null}
                  </td>
                </tr>
              ))}
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-4 py-8 text-center text-sm text-slate-500">No workers match this filter.</td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </Panel>
      {dialog}
    </AppShell>
  );
}
