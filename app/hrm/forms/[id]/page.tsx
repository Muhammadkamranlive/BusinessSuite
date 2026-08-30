"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { AppShell } from "@/components/app-shell";
import { PageHeader } from "@/components/common/page-header";
import { ModuleBreadcrumbs } from "@/components/common/module-breadcrumbs";
import { CompanyLetterhead } from "@/components/forms/company-letterhead";
import { Badge, Button, Field, Panel, SelectInput, TextArea, TextInput } from "@/components/ui";
import { getStoredTenantId, getStoredUserEmail } from "@/lib/auth/session";
import type { FormAssignScope, FormField, FormFieldType } from "@/modules/forms/model";
import {
  getCustomForm,
  listFormAssignments,
  newFieldId,
  sendFormToEmployees,
  updateCustomForm
} from "@/modules/forms/services/forms.store";
import { getCompanyProfile, getEmployeeName, listDepartments, listEmployees } from "@/modules/hrm/services/hrm.store";

export default function CustomFormDetailPage() {
  const params = useParams();
  const router = useRouter();
  const formId = String(params.id || "");
  const tenantId = getStoredTenantId() ?? "alpha";
  const [tick, setTick] = useState(0);
  const refresh = () => setTick((n) => n + 1);

  const form = useMemo(() => getCustomForm(formId), [formId, tick]);
  const company = useMemo(() => getCompanyProfile(tenantId), [tenantId, tick]);
  const employees = useMemo(() => listEmployees(tenantId).filter((e) => e.status === "active" || e.status === "onboarding"), [tenantId, tick]);
  const departments = useMemo(() => listDepartments(tenantId), [tenantId, tick]);
  const sent = useMemo(() => listFormAssignments(tenantId).filter((a) => a.form_id === formId), [tenantId, formId, tick]);

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [showLetterhead, setShowLetterhead] = useState(true);
  const [status, setStatus] = useState<"draft" | "published" | "archived">("draft");
  const [fields, setFields] = useState<FormField[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");

  const [scope, setScope] = useState<FormAssignScope>("all");
  const [employeeId, setEmployeeId] = useState("");
  const [departmentId, setDepartmentId] = useState("");
  const [dueDate, setDueDate] = useState("");

  if (form && !loaded) {
    setTitle(form.title);
    setDescription(form.description ?? "");
    setShowLetterhead(form.show_letterhead);
    setStatus(form.status);
    setFields(form.fields.map((f) => ({ ...f })));
    setLoaded(true);
  }

  if (!form) {
    return (
      <AppShell activeModule="hrm">
        <PageHeader title="Form not found" />
        <ModuleBreadcrumbs trail={[{ label: "Custom forms", href: "/hrm/forms" }]} />
        <Panel>
          <p className="text-sm text-slate-500">This form does not exist.</p>
          <Button type="button" className="mt-3" onClick={() => router.push("/hrm/forms")}>
            Back to forms
          </Button>
        </Panel>
      </AppShell>
    );
  }

  function updateField(idx: number, patch: Partial<FormField>) {
    setFields((rows) => rows.map((row, i) => (i === idx ? { ...row, ...patch } : row)));
  }

  function save() {
    setError("");
    const cleaned = fields.map((f) => ({ ...f, label: f.label.trim() })).filter((f) => f.label);
    if (!title.trim() || !cleaned.length) {
      setError("Title and at least one labeled field are required.");
      return;
    }
    updateCustomForm(formId, {
      title: title.trim(),
      description: description.trim() || null,
      show_letterhead: showLetterhead,
      status,
      fields: cleaned
    });
    setNotice("Form saved.");
    setLoaded(false);
    refresh();
  }

  function send(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setNotice("");
    try {
      const created = sendFormToEmployees(tenantId, formId, {
        scope,
        employeeId: employeeId || null,
        departmentId: departmentId || null,
        dueDate: dueDate || null,
        assignedBy: getStoredUserEmail()
      });
      setNotice(`Sent to ${created.length} employee(s). They will see it under My forms.`);
      refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not send form");
    }
  }

  return (
    <AppShell activeModule="hrm">
      <PageHeader title={form.title} description="Edit fields, publish, and send to employees." />
      <ModuleBreadcrumbs trail={[{ label: "Custom forms", href: "/hrm/forms" }, { label: form.title }]} />

      {error ? <p className="mb-4 text-sm font-semibold text-[color:var(--bs-coral)]">{error}</p> : null}
      {notice ? <p className="mb-4 text-sm font-semibold text-emerald-700">{notice}</p> : null}

      {showLetterhead ? <CompanyLetterhead company={company} subtitle={title || form.title} /> : null}

      <Panel className="mb-5">
        <div className="grid gap-4 md:grid-cols-2">
          <Field label="Title" className="md:col-span-2">
            <TextInput value={title} onChange={(e) => setTitle(e.target.value)} />
          </Field>
          <Field label="Description" className="md:col-span-2">
            <TextArea rows={2} value={description} onChange={(e) => setDescription(e.target.value)} />
          </Field>
          <Field label="Status">
            <SelectInput value={status} onChange={(e) => setStatus(e.target.value as typeof status)}>
              <option value="draft">Draft</option>
              <option value="published">Published</option>
              <option value="archived">Archived</option>
            </SelectInput>
          </Field>
          <label className="flex items-end gap-2 pb-2 text-sm font-semibold text-ink">
            <input type="checkbox" checked={showLetterhead} onChange={(e) => setShowLetterhead(e.target.checked)} className="size-4 accent-[color:var(--bs-teal)]" />
            Show letterhead
          </label>
        </div>
        <div className="mt-4 flex flex-wrap gap-2">
          <Button type="button" onClick={save}>
            Save form
          </Button>
          <Link href={`/hrm/forms/${formId}/responses`}>
            <Button type="button" variant="secondary">
              View responses ({sent.filter((a) => a.status !== "pending").length})
            </Button>
          </Link>
        </div>
      </Panel>

      <Panel className="mb-5">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-bold text-ink">Fields</h2>
          <Button
            type="button"
            variant="secondary"
            onClick={() =>
              setFields((f) => [...f, { id: newFieldId(), label: "", type: "text", required: false }])
            }
          >
            Add field
          </Button>
        </div>
        <div className="space-y-3">
          {fields.map((f, idx) => (
            <div key={f.id} className="grid gap-3 rounded-[var(--bs-radius)] border border-line p-3 md:grid-cols-3">
              <Field label="Label">
                <TextInput value={f.label} onChange={(e) => updateField(idx, { label: e.target.value })} />
              </Field>
              <Field label="Type">
                <SelectInput value={f.type} onChange={(e) => updateField(idx, { type: e.target.value as FormFieldType })}>
                  <option value="text">Short text</option>
                  <option value="textarea">Long text</option>
                  <option value="number">Number</option>
                  <option value="date">Date</option>
                  <option value="select">Dropdown</option>
                  <option value="checkbox">Checkbox</option>
                  <option value="file">File upload</option>
                </SelectInput>
              </Field>
              <label className="flex items-end gap-2 pb-2 text-sm font-semibold">
                <input type="checkbox" checked={f.required} onChange={(e) => updateField(idx, { required: e.target.checked })} className="size-4 accent-[color:var(--bs-teal)]" />
                Required
              </label>
              {f.type === "select" ? (
                <Field label="Options" className="md:col-span-3">
                  <TextInput value={f.options ?? ""} onChange={(e) => updateField(idx, { options: e.target.value })} />
                </Field>
              ) : null}
            </div>
          ))}
        </div>
      </Panel>

      <Panel className="mb-5">
        <h2 className="mb-4 text-lg font-bold text-ink">Send to employees</h2>
        <form onSubmit={send} className="grid gap-4 md:grid-cols-2">
          <Field label="Audience">
            <SelectInput value={scope} onChange={(e) => setScope(e.target.value as FormAssignScope)}>
              <option value="all">All active / onboarding employees</option>
              <option value="department">One department</option>
              <option value="single">One employee</option>
            </SelectInput>
          </Field>
          <Field label="Due date">
            <TextInput type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} />
          </Field>
          {scope === "single" ? (
            <Field label="Employee" className="md:col-span-2">
              <SelectInput required value={employeeId} onChange={(e) => setEmployeeId(e.target.value)}>
                <option value="">Select…</option>
                {employees.map((emp) => (
                  <option key={emp.id} value={emp.id}>
                    {emp.full_name}
                  </option>
                ))}
              </SelectInput>
            </Field>
          ) : null}
          {scope === "department" ? (
            <Field label="Department" className="md:col-span-2">
              <SelectInput required value={departmentId} onChange={(e) => setDepartmentId(e.target.value)}>
                <option value="">Select…</option>
                {departments.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.name}
                  </option>
                ))}
              </SelectInput>
            </Field>
          ) : null}
          <div className="md:col-span-2">
            <Button type="submit">Send form</Button>
          </div>
        </form>

        <div className="mt-6 space-y-2">
          <p className="text-sm font-bold text-ink">Assignments ({sent.length})</p>
          {sent.slice(0, 12).map((a) => (
            <div key={a.id} className="flex flex-wrap items-center justify-between gap-2 rounded-[var(--bs-radius)] border border-line px-3 py-2 text-sm">
              <span>{getEmployeeName(a.employee_id)}</span>
              <Badge tone={a.status === "pending" ? "warning" : a.status === "reviewed" ? "info" : "success"}>{a.status}</Badge>
            </div>
          ))}
          {sent.length === 0 ? <p className="text-sm text-slate-500">Not sent yet.</p> : null}
        </div>
      </Panel>
    </AppShell>
  );
}
