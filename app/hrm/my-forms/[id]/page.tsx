"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { Suspense } from "react";
import { AppShell } from "@/components/app-shell";
import { PageHeader } from "@/components/common/page-header";
import { ModuleBreadcrumbs } from "@/components/common/module-breadcrumbs";
import { CompanyLetterhead } from "@/components/forms/company-letterhead";
import { FileDropzone } from "@/components/common/file-dropzone";
import { Button, Field, Panel, SelectInput, TextArea, TextInput } from "@/components/ui";
import { getStoredTenantId } from "@/lib/auth/session";
import {
  getCustomForm,
  getFormAssignment,
  getResponseForAssignment,
  submitFormResponse
} from "@/modules/forms/services/forms.store";
import { getCompanyProfile } from "@/modules/hrm/services/hrm.store";

function FillFormInner() {
  const params = useParams();
  const searchParams = useSearchParams();
  const router = useRouter();
  const assignmentId = String(params.id || "");
  const tenantId = getStoredTenantId() ?? "alpha";

  const assignment = useMemo(() => getFormAssignment(assignmentId), [assignmentId]);
  const form = useMemo(() => (assignment ? getCustomForm(assignment.form_id) : undefined), [assignment]);
  const company = useMemo(() => getCompanyProfile(tenantId), [tenantId]);
  const existing = useMemo(() => getResponseForAssignment(assignmentId), [assignmentId]);
  const readOnly = assignment?.status === "submitted" || assignment?.status === "reviewed";

  const [answers, setAnswers] = useState<Record<string, string | boolean | null>>(() => {
    const base: Record<string, string | boolean | null> = { ...(existing?.answers ?? {}) };
    return base;
  });
  const [fileNames, setFileNames] = useState<Record<string, string>>(() => ({ ...(existing?.file_names ?? {}) }));
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  function setAnswer(fieldId: string, value: string | boolean | null) {
    setAnswers((prev) => ({ ...prev, [fieldId]: value }));
  }

  async function onFile(fieldId: string, file: File | null) {
    if (!file) return;
    if (file.size > 2_500_000) {
      setError("Please keep uploads under ~2.5MB for demo storage.");
      return;
    }
    const reader = new FileReader();
    const dataUrl = await new Promise<string>((resolve, reject) => {
      reader.onload = () => resolve(String(reader.result || ""));
      reader.onerror = () => reject(reader.error);
      reader.readAsDataURL(file);
    });
    setAnswer(fieldId, dataUrl);
    setFileNames((prev) => ({ ...prev, [fieldId]: file.name }));
  }

  function submit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setNotice("");
    try {
      submitFormResponse(tenantId, assignmentId, answers, fileNames);
      setNotice("Submitted to HR. Thank you.");
      router.push("/hrm/my-forms");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Submit failed");
    }
  }

  if (!assignment || !form) {
    return (
      <AppShell activeModule="hrm">
        <PageHeader title="Form not found" />
        <ModuleBreadcrumbs trail={[{ label: "My forms", href: "/hrm/my-forms" }]} />
      </AppShell>
    );
  }

  return (
    <AppShell activeModule="hrm">
      <PageHeader title={form.title} description={form.description || "Complete and submit for HR."} />
      <ModuleBreadcrumbs trail={[{ label: "My forms", href: "/hrm/my-forms" }, { label: form.title }]} />

      {form.show_letterhead ? <CompanyLetterhead company={company} subtitle={form.title} /> : null}

      {error ? <p className="mb-4 text-sm font-semibold text-[color:var(--bs-coral)]">{error}</p> : null}
      {notice ? <p className="mb-4 text-sm font-semibold text-emerald-700">{notice}</p> : null}

      <Panel>
        <form onSubmit={submit} className="grid gap-4">
          {form.fields.map((field) => {
            const value = answers[field.id];
            if (field.type === "file") {
              return (
                <div key={field.id}>
                  {readOnly ? (
                    <Field label={`${field.label}${field.required ? " *" : ""}`} hint={field.help_text}>
                      {typeof value === "string" && value ? (
                        <a href={value} target="_blank" rel="noreferrer" className="text-sm font-semibold text-teal hover:underline">
                          {fileNames[field.id] || "View uploaded file"}
                        </a>
                      ) : (
                        <span className="text-sm text-slate-500">No file</span>
                      )}
                    </Field>
                  ) : (
                    <FileDropzone
                      label={`${field.label}${field.required ? " *" : ""}`}
                      hint={field.help_text || "PDF, image, or Office file"}
                      required={field.required && !value}
                      fileName={fileNames[field.id]}
                      previewUrl={typeof value === "string" && value.startsWith("data:image") ? value : undefined}
                      onFile={(file) => void onFile(field.id, file)}
                      onClear={() => {
                        setAnswer(field.id, null);
                        setFileNames((prev) => {
                          const next = { ...prev };
                          delete next[field.id];
                          return next;
                        });
                      }}
                    />
                  )}
                </div>
              );
            }
            return (
              <Field key={field.id} label={`${field.label}${field.required ? " *" : ""}`} hint={field.help_text}>
                {field.type === "textarea" ? (
                  <TextArea
                    rows={4}
                    required={field.required && !readOnly}
                    disabled={readOnly}
                    value={typeof value === "string" ? value : ""}
                    onChange={(e) => setAnswer(field.id, e.target.value)}
                  />
                ) : field.type === "select" ? (
                  <SelectInput
                    required={field.required && !readOnly}
                    disabled={readOnly}
                    value={typeof value === "string" ? value : ""}
                    onChange={(e) => setAnswer(field.id, e.target.value)}
                  >
                    <option value="">Select…</option>
                    {(field.options || "")
                      .split(",")
                      .map((o) => o.trim())
                      .filter(Boolean)
                      .map((o) => (
                        <option key={o} value={o}>
                          {o}
                        </option>
                      ))}
                  </SelectInput>
                ) : field.type === "checkbox" ? (
                  <label className="flex items-center gap-2 text-sm font-semibold text-ink">
                    <input
                      type="checkbox"
                      disabled={readOnly}
                      checked={value === true}
                      onChange={(e) => setAnswer(field.id, e.target.checked)}
                      className="size-4 accent-[color:var(--bs-teal)]"
                    />
                    Yes
                  </label>
                ) : (
                  <TextInput
                    type={field.type === "number" ? "number" : field.type === "date" ? "date" : "text"}
                    required={field.required && !readOnly}
                    disabled={readOnly}
                    placeholder={field.placeholder}
                    value={typeof value === "string" ? value : ""}
                    onChange={(e) => setAnswer(field.id, e.target.value)}
                  />
                )}
              </Field>
            );
          })}

          <div className="flex flex-wrap gap-2">
            {!readOnly ? <Button type="submit">Submit to HR</Button> : null}
            <Link href={`/hrm/my-forms?employeeId=${searchParams.get("employeeId") || ""}`}>
              <Button type="button" variant="secondary">
                Back
              </Button>
            </Link>
          </div>
        </form>
      </Panel>
    </AppShell>
  );
}

export default function FillMyFormPage() {
  return (
    <Suspense fallback={<div className="p-6 text-sm text-slate-500">Loading form…</div>}>
      <FillFormInner />
    </Suspense>
  );
}
