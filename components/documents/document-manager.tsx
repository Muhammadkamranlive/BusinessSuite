"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  CheckCircle2,
  Download,
  Eye,
  FileCheck2,
  FileText,
  FileUp,
  Search,
  Trash2,
  UploadCloud,
  Users
} from "lucide-react";
import { ConfirmDialog } from "@/components/common/confirm-dialog";
import { FileDropzone } from "@/components/common/file-dropzone";
import { StatusBadge } from "@/components/common/status-badge";
import { useConfirm } from "@/components/common/use-confirm";
import { DocumentChangeTimeline } from "@/components/documents/document-change-timeline";
import { ExtraFieldsBlock } from "@/components/forms/extra-fields-block";
import { ExtraFieldsReadout } from "@/components/forms/extra-fields-readout";
import { Badge, Button, Field, Panel, SelectInput, StatTile, TextArea, TextInput } from "@/components/ui";
import { getStoredTenantId, getStoredUserEmail } from "@/lib/auth/session";
import { getSessionProfile } from "@/lib/auth/session-profile";
import { getSelfServiceContext } from "@/lib/auth/current-employee";
import { canMenu } from "@/modules/admin/services/acl.store";
import { cn } from "@/lib/utils";
import {
  allowedDocumentExtensions,
  documentAssignmentLabels,
  documentCategoryLabels,
  formatFileSize,
  type AssignedScope,
  type DocumentCategory,
  type ManagedDocument
} from "@/modules/documents/model";
import {
  archiveDocumentRequirement,
  assignDocumentType,
  createDocumentRequirement,
  documentStats,
  emptyDocumentBin,
  listActiveRequirements,
  listDeletedDocuments,
  listDocumentAssignments,
  listDocumentHistory,
  listManagedDocuments,
  permanentlyDeleteManagedDocument,
  restoreManagedDocument,
  saveEmployeeDocument,
  softDeleteManagedDocument,
  updateManagedDocument
} from "@/modules/documents/services/documents.store";
import { persistExtraFields } from "@/modules/forms/services/extra-fields.store";
import { listDepartments, listEmployees } from "@/modules/hrm/services/hrm.store";

export type DocumentManagerTab = "checklist" | "library" | "assign" | "types" | "bin";

type PreviewDoc = ManagedDocument | null;

function previewMode(doc: ManagedDocument) {
  const ext = doc.extension.toLowerCase();
  if ([".png", ".jpg", ".jpeg", ".webp", ".gif"].includes(ext)) return "image";
  if (ext === ".pdf") return "pdf";
  if ([".doc", ".docx", ".xls", ".xlsx"].includes(ext)) return "office";
  if ([".csv", ".txt"].includes(ext)) return "text";
  return "unsupported";
}

export function DocumentManager({ initialTab = "checklist" }: { initialTab?: DocumentManagerTab }) {
  const tenantId = getStoredTenantId() ?? "alpha";
  const actorEmail = getSessionProfile().email || getStoredUserEmail() || "";
  const { selfService, employee, profile } = getSelfServiceContext(tenantId);
  const actorName = profile.name || actorEmail;
  const { askSave, dialog: confirmWrite } = useConfirm();

  const [tab, setTab] = useState<DocumentManagerTab>(initialTab);

  useEffect(() => {
    setTab(initialTab);
  }, [initialTab]);

  const [tick, setTick] = useState(0);
  const [message, setMessage] = useState("");
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | ManagedDocument["status"]>("all");
  const [selectedRequirementId, setSelectedRequirementId] = useState("");
  const [selectedEmployeeId, setSelectedEmployeeId] = useState("");
  const [uploadProgress, setUploadProgress] = useState(0);
  const [busy, setBusy] = useState(false);
  const [preview, setPreview] = useState<PreviewDoc>(null);
  const [confirm, setConfirm] = useState<{ title: string; message: string; onConfirm: () => void } | null>(null);

  const [assignNote, setAssignNote] = useState("");
  const [assignScope, setAssignScope] = useState<AssignedScope>("single");
  const [assignDeptId, setAssignDeptId] = useState("");
  const [assignProgress, setAssignProgress] = useState(0);
  const [assignTypeId, setAssignTypeId] = useState("");
  const [assignTemplate, setAssignTemplate] = useState<File | null>(null);
  const [showNewType, setShowNewType] = useState(false);

  const [typeForm, setTypeForm] = useState({
    title: "",
    description: "",
    category: "other" as DocumentCategory,
    required: true,
    extensions: allowedDocumentExtensions.join(", ")
  });
  const [typeExtraJson, setTypeExtraJson] = useState("");
  const [assignExtraJson, setAssignExtraJson] = useState("");

  function refresh() {
    setTick((n) => n + 1);
  }

  const employees = useMemo(() => listEmployees(tenantId), [tenantId, tick]);
  const departments = useMemo(() => listDepartments(tenantId), [tenantId, tick]);
  const requirements = useMemo(() => listActiveRequirements(tenantId), [tenantId, tick]);
  const documents = useMemo(() => listManagedDocuments(tenantId), [tenantId, tick]);
  const allAssignments = useMemo(() => listDocumentAssignments(tenantId), [tenantId, tick]);
  const allHistory = useMemo(() => listDocumentHistory(tenantId), [tenantId, tick]);
  const deleted = useMemo(() => listDeletedDocuments(tenantId), [tenantId, tick]);
  const stats = useMemo(() => documentStats(tenantId), [tenantId, tick]);

  useEffect(() => {
    if (selfService && employee) setSelectedEmployeeId(employee.id);
    else if (!selectedEmployeeId && employees[0]) setSelectedEmployeeId(employees[0].id);
    if (!selectedRequirementId && requirements[0]) setSelectedRequirementId(requirements[0].id);
    if (!assignTypeId && requirements[0]) setAssignTypeId(requirements[0].id);
  }, [employees, requirements, selectedEmployeeId, selectedRequirementId, assignTypeId, selfService, employee]);

  const selectedRequirement = requirements.find((r) => r.id === selectedRequirementId) ?? requirements[0];
  const selectedEmployee = employees.find((e) => e.id === selectedEmployeeId) ?? employees[0];

  const employeeAssignments = useMemo(
    () => allAssignments.filter((row) => row.employee_id === selectedEmployee?.id),
    [allAssignments, selectedEmployee?.id]
  );
  const employeeHistory = useMemo(
    () => allHistory.filter((row) => row.employee_id === selectedEmployee?.id),
    [allHistory, selectedEmployee?.id]
  );
  const pendingForEmployee = employeeAssignments.filter((row) => row.status === "pending");
  const employeeDocs = useMemo(
    () => documents.filter((d) => d.employee_id === selectedEmployee?.id),
    [documents, selectedEmployee?.id]
  );
  const completedIds = useMemo(() => new Set(employeeDocs.map((d) => d.requirement_id)), [employeeDocs]);
  const missingRequired = useMemo(
    () => requirements.filter((r) => r.required && !completedIds.has(r.id)),
    [requirements, completedIds]
  );

  const libraryDocs = useMemo(() => {
    return documents
      .filter((d) => {
        if (selfService && employee && d.employee_id !== employee.id) return false;
        if (statusFilter !== "all" && d.status !== statusFilter) return false;
        if (!query.trim()) return true;
        const q = query.toLowerCase();
        return [d.file_name, d.requirement_title, d.employee_name, d.category].join(" ").toLowerCase().includes(q);
      })
      .sort((a, b) => b.uploaded_at.localeCompare(a.uploaded_at));
  }, [documents, query, statusFilter, selfService, employee]);

  async function onChecklistUpload(file: File, assignmentId?: string, requirementId?: string) {
    if (!selectedEmployee) return;
    const reqId = requirementId || selectedRequirement?.id;
    if (!reqId) return;
    setBusy(true);
    setMessage("");
    try {
      await saveEmployeeDocument({
        tenantId,
        employeeId: selectedEmployee.id,
        requirementId: reqId,
        assignmentId,
        actorEmail,
        actorName,
        file,
        onProgress: setUploadProgress
      });
      setUploadProgress(0);
      setMessage(`Saved “${file.name}” for ${selectedEmployee.full_name}.`);
      refresh();
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "Upload failed");
      setUploadProgress(0);
    } finally {
      setBusy(false);
    }
  }

  function doAssign() {
    if (!assignTypeId) {
      setMessage("Select or create a document type first.");
      return;
    }
    askSave({
      editing: false,
      entityLabel: "document assignment",
      onConfirm: () => {
        void (async () => {
          setBusy(true);
          setMessage("");
          try {
            const rows = await assignDocumentType({
              tenantId,
              actorEmail,
              actorName,
              requirementId: assignTypeId,
              note: assignNote,
              scope: assignScope,
              employeeId: selectedEmployeeId,
              departmentId: assignDeptId,
              templateFile: assignTemplate,
              onProgress: setAssignProgress
            });
            for (const row of rows) {
              persistExtraFields(tenantId, "documents.assign", row.id, assignExtraJson);
            }
            setAssignExtraJson("");
            setAssignProgress(0);
            setAssignNote("");
            setAssignTemplate(null);
            setMessage(`Assigned “${rows[0]?.requirement_title}” to ${rows.length} employee${rows.length === 1 ? "" : "s"}. They can upload it from Required uploads.`);
            refresh();
          } catch (err) {
            setMessage(err instanceof Error ? err.message : "Assign failed");
            setAssignProgress(0);
          } finally {
            setBusy(false);
          }
        })();
      }
    });
  }

  function createType() {
    askSave({
      editing: false,
      entityLabel: "document type",
      onConfirm: () => {
        const extensions = typeForm.extensions
          .split(",")
          .map((x) => x.trim().toLowerCase())
          .filter(Boolean)
          .map((x) => (x.startsWith(".") ? x : `.${x}`));
        const row = createDocumentRequirement(tenantId, {
          title: typeForm.title.trim(),
          description: typeForm.description.trim(),
          category: typeForm.category,
          employment_types: [],
          allowed_extensions: extensions.length ? extensions : [...allowedDocumentExtensions],
          required: typeForm.required
        });
        persistExtraFields(tenantId, "documents.type", row.id, typeExtraJson);
        setTypeExtraJson("");
        setAssignTypeId(row.id);
        setShowNewType(false);
        setTypeForm({
          title: "",
          description: "",
          category: "other",
          required: true,
          extensions: allowedDocumentExtensions.join(", ")
        });
        setMessage(`Document type “${row.title}” is ready to assign.`);
        refresh();
      }
    });
  }

  const allTabs: { id: DocumentManagerTab; label: string; href: string; menuId: string }[] = [
    { id: "checklist", label: "Required uploads", href: "/documents", menuId: "documents.required_uploads" },
    { id: "library", label: "Library", href: "/documents/library", menuId: "documents.library" },
    { id: "assign", label: "Assign to users", href: "/documents/assign", menuId: "documents.assign_to_users" },
    { id: "types", label: "Document types", href: "/documents/types", menuId: "documents.document_types" },
    { id: "bin", label: "Recycle bin", href: "/documents/bin", menuId: "documents.recycle_bin" }
  ];
  const tabs = allTabs.filter((item) => canMenu(profile.role, profile.email, item.menuId, "view"));

  return (
    <div className="space-y-5">
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
        <StatTile label="Required types" value={String(stats.requiredCount)} detail={`${stats.requirements} total types`} icon={FileText} tone="teal" />
        <StatTile label="Uploaded files" value={String(stats.uploaded)} detail={`${stats.verified} verified`} icon={FileCheck2} tone="mint" />
        <StatTile label="Awaiting upload" value={String(stats.pendingAssignments)} detail="Assigned, not yet uploaded" icon={Users} tone="amber" />
        <StatTile label="Needs review" value={String(stats.needsReview)} detail="Awaiting HR action" icon={UploadCloud} tone="coral" />
        <StatTile label="In recycle bin" value={String(stats.inBin)} detail="Soft-deleted" icon={Trash2} tone="coral" />
      </div>

      <div className="flex flex-wrap gap-2">
        {tabs.map((item) => (
          <Link
            key={item.id}
            href={item.href}
            aria-current={tab === item.id ? "page" : undefined}
            className={cn(
              "inline-flex h-10 items-center rounded-[var(--bs-radius)] border px-3 text-sm font-semibold transition",
              tab === item.id
                ? "border-[color:var(--bs-ink)] bg-[color:var(--bs-ink)] text-white shadow-sm"
                : "border-line bg-white text-slate-600 hover:border-teal hover:text-ink"
            )}
          >
            {item.label}
          </Link>
        ))}
      </div>

      {message ? (
        <div className="flex items-center gap-2 rounded-[var(--bs-radius)] border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm font-semibold text-emerald-800">
          <CheckCircle2 className="size-4" />
          {message}
        </div>
      ) : null}

      {tab === "checklist" ? (
        <div className="grid gap-5 xl:grid-cols-[280px_1fr]">
          <Panel className="p-4">
            <Field label="Employee">
              {selfService ? (
                <TextInput readOnly value={selectedEmployee?.full_name ?? employee?.full_name ?? "Not linked"} className="bg-cloud" />
              ) : (
              <SelectInput value={selectedEmployeeId} onChange={(e) => setSelectedEmployeeId(e.target.value)}>
                {employees.map((e) => (
                  <option key={e.id} value={e.id}>{e.full_name}</option>
                ))}
              </SelectInput>
              )}
            </Field>
            <p className="mt-4 text-xs font-bold uppercase tracking-wide text-teal">Checklist</p>
            <ul className="mt-2 space-y-1">
              {requirements.map((req) => {
                const done = completedIds.has(req.id);
                const active = selectedRequirement?.id === req.id;
                return (
                  <li key={req.id}>
                    <button
                      type="button"
                      onClick={() => setSelectedRequirementId(req.id)}
                      className={cn(
                        "flex w-full items-center justify-between rounded-[var(--bs-radius)] border px-3 py-2 text-left text-sm font-semibold transition",
                        active ? "border-ink bg-ink text-white" : "border-line bg-cloud hover:border-teal"
                      )}
                    >
                      <span>{req.title}</span>
                      <Badge tone={done ? "success" : req.required ? "warning" : "neutral"}>
                        {done ? "Done" : req.required ? "Required" : "Optional"}
                      </Badge>
                    </button>
                  </li>
                );
              })}
            </ul>
            {missingRequired.length ? (
              <p className="mt-3 text-xs text-amber-700">{missingRequired.length} required still missing for this employee.</p>
            ) : (
              <p className="mt-3 text-xs text-emerald-700">All required documents uploaded.</p>
            )}
          </Panel>

          <Panel className="p-5">
            {pendingForEmployee.length ? (
              <div className="mb-6 space-y-4">
                <div>
                  <p className="text-xs font-bold uppercase tracking-wide text-teal">Assigned to {selectedEmployee?.full_name}</p>
                  <h2 className="mt-1 text-xl font-bold text-ink">Upload the documents HR requested</h2>
                  <p className="mt-1 text-sm text-slate-500">See who assigned each type, then drop the file here.</p>
                </div>
                {pendingForEmployee.map((row) => {
                  const req = requirements.find((r) => r.id === row.requirement_id);
                  return (
                    <div key={row.id} className="rounded-[var(--bs-radius)] border border-line bg-cloud/60 p-4">
                      <div className="flex flex-wrap items-start justify-between gap-2">
                        <div>
                          <p className="font-bold text-ink">{row.requirement_title}</p>
                          <p className="text-sm text-slate-500">
                            {row.assigned_by_name} assigned this · {documentAssignmentLabels[row.status]}
                          </p>
                          {row.team_note ? <p className="mt-1 text-sm text-slate-600">{row.team_note}</p> : null}
                        </div>
                        <Badge tone="warning">{documentAssignmentLabels[row.status]}</Badge>
                      </div>
                      {row.template_download_url ? (
                        <a className="mt-2 inline-block text-sm font-semibold text-teal hover:underline" href={row.template_download_url} target="_blank" rel="noreferrer">
                          Download HR template ({row.template_file_name})
                        </a>
                      ) : null}
                      <div className="mt-3">
                        <DocumentChangeTimeline events={allHistory.filter((h) => h.assignment_id === row.id)} />
                      </div>
                      <FileDropzone
                        label="Upload this document"
                        hint={req ? `Allowed: ${req.allowed_extensions.join(" · ")}` : undefined}
                        accept={req?.allowed_extensions.join(",")}
                        disabled={busy}
                        progress={uploadProgress}
                        onFile={(file) => void onChecklistUpload(file, row.id, row.requirement_id)}
                      />
                    </div>
                  );
                })}
              </div>
            ) : null}

            {selectedRequirement ? (
              <>
                <h2 className="text-xl font-bold text-ink">{selectedRequirement.title}</h2>
                <p className="mt-1 text-sm text-slate-500">{selectedRequirement.description}</p>
                <div className="mt-3 flex flex-wrap gap-1">
                  {selectedRequirement.allowed_extensions.map((ext) => (
                    <Badge key={ext} tone="neutral">{ext}</Badge>
                  ))}
                </div>
                {employeeHistory.length ? (
                  <div className="mt-5 rounded-[var(--bs-radius)] border border-line p-4">
                    <p className="mb-3 text-xs font-bold uppercase tracking-wide text-slate-400">Change history</p>
                    <DocumentChangeTimeline events={employeeHistory} empty="No assignments yet for this employee." />
                  </div>
                ) : null}
                <div className="mt-5">
                  <FileDropzone
                    label={`Upload for ${selectedEmployee?.full_name}`}
                    hint={`Allowed: ${selectedRequirement.allowed_extensions.join(" · ")}`}
                    accept={selectedRequirement.allowed_extensions.join(",")}
                    disabled={busy}
                    progress={uploadProgress}
                    onFile={(file) => void onChecklistUpload(file, undefined, selectedRequirement.id)}
                  />
                </div>
                <div className="mt-5 space-y-2">
                  <p className="text-xs font-bold uppercase tracking-wide text-slate-400">This employee’s files</p>
                  {employeeDocs.length === 0 ? <p className="text-sm text-slate-500">No files yet.</p> : null}
                  {employeeDocs.map((doc) => (
                    <DocRow
                      key={doc.id}
                      doc={doc}
                      onPreview={() => setPreview(doc)}
                      onVerify={selfService ? undefined : () => { updateManagedDocument(doc.id, { status: "verified" }, { email: actorEmail, name: actorName }); refresh(); }}
                      onReject={selfService ? undefined : () => { updateManagedDocument(doc.id, { status: "rejected" }, { email: actorEmail, name: actorName }); refresh(); }}
                      onDelete={selfService ? undefined : () => setConfirm({
                        title: "Move to recycle bin?",
                        message: `Soft-delete “${doc.file_name}”.`,
                        onConfirm: () => { softDeleteManagedDocument(doc.id); refresh(); setConfirm(null); }
                      })}
                    />
                  ))}
                </div>
              </>
            ) : (
              <p className="text-sm text-slate-500">Create a document type first.</p>
            )}
          </Panel>
        </div>
      ) : null}

      {tab === "library" ? (
        <Panel className="p-5">
          <div className="mb-4 grid gap-3 md:grid-cols-[1fr_180px]">
            <label className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
              <TextInput className="pl-9" placeholder="Search files, employees, types…" value={query} onChange={(e) => setQuery(e.target.value)} />
            </label>
            <SelectInput value={statusFilter} onChange={(e) => setStatusFilter(e.target.value as typeof statusFilter)}>
              <option value="all">All statuses</option>
              <option value="uploaded">Uploaded</option>
              <option value="needs-review">Needs review</option>
              <option value="verified">Verified</option>
              <option value="rejected">Rejected</option>
            </SelectInput>
          </div>
          <div className="space-y-2">
            {libraryDocs.map((doc) => (
              <DocRow
                key={doc.id}
                doc={doc}
                showOwner
                onPreview={() => setPreview(doc)}
                onVerify={selfService ? undefined : () => { updateManagedDocument(doc.id, { status: "verified" }, { email: actorEmail, name: actorName }); refresh(); }}
                onReject={selfService ? undefined : () => { updateManagedDocument(doc.id, { status: "rejected" }, { email: actorEmail, name: actorName }); refresh(); }}
                onReview={selfService ? undefined : () => { updateManagedDocument(doc.id, { status: "needs-review" }, { email: actorEmail, name: actorName }); refresh(); }}
                onDelete={selfService ? undefined : () => setConfirm({
                  title: "Move to recycle bin?",
                  message: `Soft-delete “${doc.file_name}”.`,
                  onConfirm: () => { softDeleteManagedDocument(doc.id); refresh(); setConfirm(null); }
                })}
              />
            ))}
            {libraryDocs.length === 0 ? <p className="py-8 text-center text-sm text-slate-500">No documents match.</p> : null}
          </div>
        </Panel>
      ) : null}

      {tab === "assign" ? (
        <div className="grid gap-5 xl:grid-cols-[1fr_1fr]">
          <Panel className="p-5">
            <div className="mb-4 flex items-center gap-2">
              <Users className="size-5 text-teal" />
              <h2 className="text-lg font-bold text-ink">Assign document from HR</h2>
            </div>
            <p className="mb-4 text-sm text-slate-500">
              Pick a document type (or create one here), choose who should provide it, and assign. Employees see the request with a full change history and upload from Required uploads.
            </p>
            <form
              className="grid gap-4"
              onSubmit={(e) => {
                e.preventDefault();
                doAssign();
              }}
            >
              <Field label="Document type">
                <SelectInput value={assignTypeId} onChange={(e) => setAssignTypeId(e.target.value)}>
                  <option value="">Select a type…</option>
                  {requirements.map((req) => (
                    <option key={req.id} value={req.id}>
                      {req.title} · {documentCategoryLabels[req.category]}{req.required ? " · required" : ""}
                    </option>
                  ))}
                </SelectInput>
              </Field>
              <div className="flex flex-wrap gap-2">
                <Button type="button" variant="secondary" onClick={() => setShowNewType((v) => !v)}>
                  {showNewType ? "Close new type" : "Create new document type"}
                </Button>
                <Button href="/documents/types" variant="ghost" className="!text-xs">
                  Manage all types
                </Button>
              </div>
              {showNewType ? (
                <div className="grid gap-3 rounded-[var(--bs-radius)] border border-line bg-cloud p-3">
                  <Field label="New type title">
                    <TextInput required={showNewType} value={typeForm.title} onChange={(e) => setTypeForm({ ...typeForm, title: e.target.value })} placeholder="e.g. Visa copy" />
                  </Field>
                  <Field label="Description">
                    <TextArea rows={2} value={typeForm.description} onChange={(e) => setTypeForm({ ...typeForm, description: e.target.value })} />
                  </Field>
                  <Field label="Category">
                    <SelectInput value={typeForm.category} onChange={(e) => setTypeForm({ ...typeForm, category: e.target.value as DocumentCategory })}>
                      {Object.entries(documentCategoryLabels).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                    </SelectInput>
                  </Field>
                  <Field label="Allowed extensions">
                    <TextInput value={typeForm.extensions} onChange={(e) => setTypeForm({ ...typeForm, extensions: e.target.value })} />
                  </Field>
                  <label className="flex items-center gap-2 text-sm font-semibold">
                    <input type="checkbox" checked={typeForm.required} onChange={(e) => setTypeForm({ ...typeForm, required: e.target.checked })} />
                    Required on employee checklist
                  </label>
                  <ExtraFieldsBlock formKey="documents.type" valueJson={typeExtraJson} onChange={setTypeExtraJson} />
                  <Button type="button" onClick={() => createType()}>Save type and use it</Button>
                </div>
              ) : null}
              <Field label="Note to the employee">
                <TextArea rows={2} value={assignNote} onChange={(e) => setAssignNote(e.target.value)} placeholder="Optional — why this is needed, due date, etc." />
              </Field>
              <Field label="Assign to">
                <SelectInput value={assignScope} onChange={(e) => setAssignScope(e.target.value as AssignedScope)}>
                  <option value="single">Selected employee</option>
                  <option value="department">Entire department</option>
                  <option value="all">All active employees</option>
                </SelectInput>
              </Field>
              {assignScope === "single" ? (
                <Field label="Employee">
                  <SelectInput value={selectedEmployeeId} onChange={(e) => setSelectedEmployeeId(e.target.value)}>
                    {employees.map((e) => <option key={e.id} value={e.id}>{e.full_name}</option>)}
                  </SelectInput>
                </Field>
              ) : null}
              {assignScope === "department" ? (
                <Field label="Department">
                  <SelectInput value={assignDeptId} onChange={(e) => setAssignDeptId(e.target.value)}>
                    <option value="">Select department</option>
                    {departments.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
                  </SelectInput>
                </Field>
              ) : null}
              <ExtraFieldsBlock formKey="documents.assign" valueJson={assignExtraJson} onChange={setAssignExtraJson} />
              <FileDropzone
                label="Optional template from HR"
                hint="Employees still upload their own copy. Attach a sample or blank form if helpful."
                accept={allowedDocumentExtensions.join(",")}
                disabled={busy}
                progress={assignProgress}
                fileName={assignTemplate?.name}
                fileSize={assignTemplate?.size}
                onFile={(file) => setAssignTemplate(file)}
                onClear={() => setAssignTemplate(null)}
              />
              <Button type="submit" disabled={busy || !assignTypeId}>Assign document type</Button>
            </form>
          </Panel>
          <Panel className="p-5">
            <h3 className="font-bold text-ink">Assignment change history</h3>
            <p className="mt-1 text-sm text-slate-500">Who assigned which type, to whom, and what happened next.</p>
            <div className="mt-4">
              <DocumentChangeTimeline events={allHistory} empty="No assignments yet. Create or select a type, then assign it to people." />
            </div>
            <div className="mt-6 space-y-2">
              <p className="text-xs font-bold uppercase tracking-wide text-slate-400">Open assignments</p>
              {allAssignments.slice(0, 12).map((row) => (
                <div key={row.id} className="rounded-[var(--bs-radius)] border border-line px-3 py-3">
                  <p className="font-semibold text-ink">{row.requirement_title}</p>
                  <p className="mt-1 flex flex-wrap items-center gap-1 text-sm text-slate-600">
                    {row.assigned_by_name}
                    <span className="text-teal">→</span>
                    {row.employee_name}
                  </p>
                  <div className="mt-1 flex flex-wrap gap-1">
                    <Badge tone={row.status === "pending" ? "warning" : row.status === "verified" ? "success" : row.status === "rejected" ? "danger" : "info"}>
                      {documentAssignmentLabels[row.status]}
                    </Badge>
                    <Badge tone="neutral">{documentCategoryLabels[row.category]}</Badge>
                  </div>
                </div>
              ))}
              {allAssignments.length === 0 ? <p className="text-sm text-slate-500">Nothing assigned yet.</p> : null}
            </div>
          </Panel>
        </div>
      ) : null}

      {tab === "types" ? (
        <div className="grid gap-5 xl:grid-cols-[1fr_1fr]">
          <Panel className="p-5">
            <h2 className="mb-4 text-lg font-bold text-ink">Create document type</h2>
            <form onSubmit={(e) => { e.preventDefault(); createType(); }} className="grid gap-4">
              <Field label="Title"><TextInput required value={typeForm.title} onChange={(e) => setTypeForm({ ...typeForm, title: e.target.value })} /></Field>
              <Field label="Description"><TextArea rows={3} value={typeForm.description} onChange={(e) => setTypeForm({ ...typeForm, description: e.target.value })} /></Field>
              <Field label="Category">
                <SelectInput value={typeForm.category} onChange={(e) => setTypeForm({ ...typeForm, category: e.target.value as DocumentCategory })}>
                  {Object.entries(documentCategoryLabels).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                </SelectInput>
              </Field>
              <Field label="Allowed extensions" hint="Comma separated, e.g. .pdf, .png">
                <TextInput value={typeForm.extensions} onChange={(e) => setTypeForm({ ...typeForm, extensions: e.target.value })} />
              </Field>
              <label className="flex items-center gap-2 text-sm font-semibold">
                <input type="checkbox" checked={typeForm.required} onChange={(e) => setTypeForm({ ...typeForm, required: e.target.checked })} />
                Required on employee checklist
              </label>
              <ExtraFieldsBlock formKey="documents.type" valueJson={typeExtraJson} onChange={setTypeExtraJson} />
              <Button type="submit">Create type</Button>
            </form>
          </Panel>
          <Panel className="p-5">
            <h3 className="font-bold text-ink">Active types</h3>
            <ul className="mt-3 space-y-2">
              {requirements.map((req) => (
                <li key={req.id} className="rounded-[var(--bs-radius)] border border-line px-3 py-3">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="font-semibold text-ink">{req.title}</p>
                      <p className="text-xs text-slate-500">{documentCategoryLabels[req.category]} · {req.source}</p>
                      <div className="mt-1 flex flex-wrap gap-1">
                        {req.required ? <Badge tone="warning">Required</Badge> : <Badge tone="neutral">Optional</Badge>}
                        {req.allowed_extensions.map((ext) => <Badge key={ext} tone="info">{ext}</Badge>)}
                      </div>
                      <ExtraFieldsReadout tenantId={tenantId} formKey="documents.type" recordId={req.id} />
                    </div>
                    {req.source === "admin" ? (
                      <Button
                        variant="ghost"
                        className="!min-h-8 !text-xs"
                        onClick={() => {
                          archiveDocumentRequirement(req.id);
                          refresh();
                        }}
                      >
                        Archive
                      </Button>
                    ) : null}
                  </div>
                </li>
              ))}
            </ul>
          </Panel>
        </div>
      ) : null}

      {tab === "bin" ? (
        <Panel className="p-5">
          <div className="mb-4 flex items-center justify-between gap-3">
            <h2 className="text-lg font-bold text-ink">Recycle bin</h2>
            <Button
              variant="danger"
              disabled={!deleted.length}
              onClick={() => setConfirm({
                title: "Empty recycle bin?",
                message: "Permanently delete all soft-deleted documents. Shared storage blobs stay if still referenced.",
                onConfirm: () => { void emptyDocumentBin(tenantId).then(() => { refresh(); setConfirm(null); }); }
              })}
            >
              Empty bin
            </Button>
          </div>
          <div className="space-y-2">
            {deleted.map((doc) => (
              <div key={doc.id} className="flex flex-wrap items-center justify-between gap-2 rounded-[var(--bs-radius)] border border-line px-3 py-3">
                <div>
                  <p className="font-semibold text-ink">{doc.file_name}</p>
                  <p className="text-xs text-slate-500">{doc.employee_name} · deleted {doc.deleted_at ? new Date(doc.deleted_at).toLocaleString() : ""}</p>
                </div>
                <div className="flex gap-1">
                  <Button variant="secondary" className="!min-h-8 !text-xs" onClick={() => { restoreManagedDocument(doc.id); refresh(); }}>Restore</Button>
                  <Button variant="danger" className="!min-h-8 !text-xs" onClick={() => setConfirm({
                    title: "Delete forever?",
                    message: `Permanently remove “${doc.file_name}”.`,
                    onConfirm: () => { void permanentlyDeleteManagedDocument(doc.id).then(() => { refresh(); setConfirm(null); }); }
                  })}>Delete forever</Button>
                </div>
              </div>
            ))}
            {deleted.length === 0 ? <p className="py-8 text-center text-sm text-slate-500">Recycle bin is empty.</p> : null}
          </div>
        </Panel>
      ) : null}

      {preview ? (
        <PreviewDialog doc={preview} onClose={() => setPreview(null)} />
      ) : null}

      {confirmWrite}

      <ConfirmDialog
        open={Boolean(confirm)}
        title={confirm?.title ?? ""}
        message={confirm?.message ?? ""}
        confirmLabel="Confirm"
        onCancel={() => setConfirm(null)}
        onConfirm={() => confirm?.onConfirm()}
      />
    </div>
  );
}

function DocRow({
  doc,
  showOwner,
  onPreview,
  onVerify,
  onReject,
  onReview,
  onDelete
}: {
  doc: ManagedDocument;
  showOwner?: boolean;
  onPreview?: () => void;
  onVerify?: () => void;
  onReject?: () => void;
  onReview?: () => void;
  onDelete?: () => void;
}) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 rounded-[var(--bs-radius)] border border-line px-3 py-3">
      <div className="min-w-0">
        <p className="truncate font-semibold text-ink">{doc.requirement_title}</p>
        <p className="truncate text-xs text-slate-500">
          {doc.file_name} · {formatFileSize(doc.file_size)}
          {showOwner ? ` · ${doc.employee_name}` : ""}
          {doc.source === "hr-team" ? " · From HR" : ""}
        </p>
        <div className="mt-1 flex flex-wrap gap-1">
          <StatusBadge status={doc.status} />
          <Badge tone="neutral">{documentCategoryLabels[doc.category]}</Badge>
        </div>
        <ExtraFieldsReadout tenantId={getStoredTenantId() ?? "alpha"} formKey="documents.assign" recordId={doc.id} />
      </div>
      <div className="flex flex-wrap gap-1">
        {onPreview ? <Button variant="ghost" className="!min-h-8 !text-xs" onClick={onPreview}><Eye className="size-3.5" /> View</Button> : null}
        <a href={doc.download_url} download={doc.file_name} target="_blank" rel="noreferrer">
          <Button variant="secondary" className="!min-h-8 !text-xs" type="button"><Download className="size-3.5" /> Download</Button>
        </a>
        {onReview ? <Button variant="ghost" className="!min-h-8 !text-xs" onClick={onReview}>Request review</Button> : null}
        {onVerify ? <Button variant="secondary" className="!min-h-8 !text-xs" onClick={onVerify}>Verify</Button> : null}
        {onReject ? <Button variant="ghost" className="!min-h-8 !text-xs" onClick={onReject}>Reject</Button> : null}
        {onDelete ? <Button variant="ghost" className="!min-h-8 !text-xs" onClick={onDelete}><Trash2 className="size-3.5" /></Button> : null}
      </div>
    </div>
  );
}

function PreviewDialog({ doc, onClose }: { doc: ManagedDocument; onClose: () => void }) {
  const mode = previewMode(doc);
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" role="dialog" aria-modal="true">
      <div className="max-h-[90vh] w-full max-w-4xl overflow-hidden rounded-[var(--bs-radius)] border border-line bg-white shadow-soft">
        <div className="flex items-center justify-between border-b border-line px-4 py-3">
          <div>
            <p className="font-bold text-ink">{doc.file_name}</p>
            <p className="text-xs text-slate-500">{doc.requirement_title}</p>
          </div>
          <Button variant="secondary" onClick={onClose}>Close</Button>
        </div>
        <div className="max-h-[75vh] overflow-auto bg-cloud p-4">
          {mode === "image" ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={doc.download_url} alt={doc.file_name} className="mx-auto max-h-[70vh] rounded-[var(--bs-radius)]" />
          ) : mode === "pdf" || mode === "text" ? (
            <iframe title={doc.file_name} src={doc.download_url} className="h-[70vh] w-full rounded-[var(--bs-radius)] bg-white" />
          ) : mode === "office" ? (
            <iframe
              title={doc.file_name}
              src={`https://view.officeapps.live.com/op/embed.aspx?src=${encodeURIComponent(doc.download_url)}`}
              className="h-[70vh] w-full rounded-[var(--bs-radius)] bg-white"
            />
          ) : (
            <div className="rounded-[var(--bs-radius)] border border-line bg-white p-8 text-center">
              <FileUp className="mx-auto size-8 text-slate-400" />
              <p className="mt-3 font-semibold text-ink">Preview not available for this file type</p>
              <a className="mt-4 inline-block" href={doc.download_url} download={doc.file_name}>
                <Button>Download file</Button>
              </a>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
