"use client";

import { useEffect, useMemo, useState } from "react";
import { AppShell } from "@/components/app-shell";
import { PageHeader } from "@/components/common/page-header";
import { ModuleBreadcrumbs } from "@/components/common/module-breadcrumbs";
import { DataListToolbar } from "@/components/common/data-list-toolbar";
import { RecordRowActions } from "@/components/common/record-row-actions";
import { useConfirm } from "@/components/common/use-confirm";
import { ExtraFieldsBlock } from "@/components/forms/extra-fields-block";
import { ExtraFieldsReadout } from "@/components/forms/extra-fields-readout";
import { Badge, Button, Field, Panel, SelectInput, TextArea, TextInput } from "@/components/ui";
import { getStoredTenantId } from "@/lib/auth/session";
import { exportListCsv, exportListPdf } from "@/lib/list-export";
import { filterAndSort } from "@/lib/list-query";
import { persistExtraFields } from "@/modules/forms/services/extra-fields.store";
import {
  createCandidate,
  deleteCandidate,
  listCandidates,
  listDepartments,
  moveCandidateStage,
  updateCandidate
} from "@/modules/hrm/services/hrm.store";
import { hireCandidate } from "@/modules/hrm/services/workday.store";
import type { Candidate, CandidateStage } from "@/modules/hrm/model";

const stages: CandidateStage[] = ["applied", "screening", "interview", "offer", "hired", "rejected"];

const stageTone: Record<CandidateStage, "neutral" | "success" | "warning" | "danger" | "info"> = {
  applied: "neutral",
  screening: "info",
  interview: "warning",
  offer: "info",
  hired: "success",
  rejected: "danger"
};

const emptyForm = { full_name: "", email: "", phone: "", position: "", source: "", notes: "" };

export default function RecruitmentPage() {
  const tenantId = getStoredTenantId() ?? "alpha";
  const { askSave, askTrash, dialog } = useConfirm();
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [search, setSearch] = useState("");
  const [stageFilter, setStageFilter] = useState("all");
  const [sortField, setSortField] = useState("full_name");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");
  const [openForm, setOpenForm] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [extraJson, setExtraJson] = useState("");
  const [hireTarget, setHireTarget] = useState<Candidate | null>(null);
  const [hireNote, setHireNote] = useState("");
  const [hireSalary, setHireSalary] = useState("");
  const departments = listDepartments(tenantId);

  function refresh() {
    setCandidates(listCandidates(tenantId));
  }

  useEffect(() => {
    refresh();
  }, [tenantId]);

  const filtered = useMemo(
    () =>
      filterAndSort(candidates as unknown as Array<Record<string, unknown>>, {
        search,
        searchFields: ["full_name", "email", "position", "source"],
        statusField: "stage",
        statusValue: stageFilter,
        sortField,
        sortDir
      }) as unknown as Candidate[],
    [candidates, search, stageFilter, sortField, sortDir]
  );

  function doSave() {
    const row = createCandidate(tenantId, {
      full_name: form.full_name.trim(),
      email: form.email.trim(),
      phone: form.phone.trim(),
      position: form.position.trim(),
      stage: "applied",
      source: form.source.trim() || null,
      notes: form.notes.trim() || null
    });
    persistExtraFields(tenantId, "hrm.candidate", row.id, extraJson);
    setExtraJson("");
    setOpenForm(false);
    setForm(emptyForm);
    refresh();
  }

  function submit(e: React.FormEvent) {
    e.preventDefault();
    askSave({
      editing: false,
      entityLabel: "candidate",
      onConfirm: doSave
    });
  }

  function changeStage(candidate: Candidate, stage: CandidateStage) {
    if (stage === "hired") {
      setHireTarget(candidate);
      setHireNote(candidate.notes ?? "");
      return;
    }
    moveCandidateStage(candidate.id, stage);
    refresh();
  }

  function confirmHire() {
    if (!hireTarget) return;
    try {
      hireCandidate(tenantId, hireTarget.id, { basic_salary: Number(hireSalary) || 0, department_id: departments[0]?.id });
      updateCandidate(hireTarget.id, { notes: hireNote.trim() || null });
      setHireTarget(null);
      setHireNote("");
      setHireSalary("");
      refresh();
    } catch (e) {
      window.alert(e instanceof Error ? e.message : "Hire failed.");
    }
  }

  return (
    <AppShell activeModule="hrm">
      <PageHeader title="Recruitment" description="Candidate pipeline and hiring." actionLabel="Add candidate" onAction={() => { setExtraJson(""); setOpenForm(true); }} />
      <ModuleBreadcrumbs />

      {openForm ? (
        <Panel className="mb-5 border-teal/40">
          <h2 className="mb-4 text-lg font-bold text-ink">Add candidate</h2>
          <form onSubmit={submit} className="grid gap-4 md:grid-cols-2">
            <Field label="Full name">
              <TextInput required value={form.full_name} onChange={(e) => setForm({ ...form, full_name: e.target.value })} />
            </Field>
            <Field label="Position">
              <TextInput required value={form.position} onChange={(e) => setForm({ ...form, position: e.target.value })} />
            </Field>
            <Field label="Email">
              <TextInput required type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
            </Field>
            <Field label="Phone">
              <TextInput required value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
            </Field>
            <Field label="Source" className="md:col-span-2">
              <TextInput value={form.source} onChange={(e) => setForm({ ...form, source: e.target.value })} placeholder="e.g. LinkedIn, referral" />
            </Field>
            <Field label="Notes" className="md:col-span-2">
              <TextArea rows={3} value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} placeholder="Optional" />
            </Field>
            <ExtraFieldsBlock formKey="hrm.candidate" valueJson={extraJson} onChange={setExtraJson} />
            <div className="flex gap-2 md:col-span-2">
              <Button type="submit">Add candidate</Button>
              <Button type="button" variant="secondary" onClick={() => { setExtraJson(""); setOpenForm(false); }}>Cancel</Button>
            </div>
          </form>
        </Panel>
      ) : null}

      <div className="grid gap-4 md:grid-cols-3 xl:grid-cols-6">
        {stages.map((stage) => (
          <Panel key={stage} className="p-3">
            <div className="mb-2 flex items-center justify-between">
              <Badge tone={stageTone[stage]}>{stage}</Badge>
              <span className="text-xs font-semibold text-slate-400">{candidates.filter((c) => c.stage === stage).length}</span>
            </div>
          </Panel>
        ))}
      </div>

      <Panel className="mt-4 overflow-hidden p-0">
        <div className="p-4">
          <DataListToolbar
            search={search}
            onSearchChange={setSearch}
            searchPlaceholder="Search name, position, source…"
            filterLabel="stages"
            filterValue={stageFilter}
            filterOptions={stages.map((s) => ({ value: s, label: s }))}
            onFilterChange={setStageFilter}
            sortValue={sortField}
            sortOptions={[
              { value: "full_name", label: "Name" },
              { value: "position", label: "Position" },
              { value: "stage", label: "Stage" }
            ]}
            onSortChange={setSortField}
            sortDir={sortDir}
            onSortDirChange={setSortDir}
            onExportCsv={() =>
              exportListCsv({
                tenantId,
                module: "hrm",
                filename: "candidates",
                rows: filtered.map((c) => ({
                  Name: c.full_name,
                  Position: c.position,
                  Email: c.email,
                  Phone: c.phone,
                  Source: c.source ?? "",
                  Stage: c.stage
                }))
              })
            }
            onExportPdf={() =>
              exportListPdf({
                tenantId,
                module: "hrm",
                title: "Candidates",
                filename: "candidates",
                columns: ["Name", "Position", "Stage", "Email"],
                rows: filtered.map((c) => [c.full_name, c.position, c.stage, c.email])
              })
            }
          />
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full text-left text-sm">
            <thead>
              <tr className="border-b border-line bg-cloud">
                {["Candidate", "Position", "Contact", "Source", "Stage", "Notes", ""].map((h) => (
                  <th key={h || "a"} className="px-4 py-3 font-semibold text-slate-600">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map((c) => (
                <tr key={c.id} className="border-b border-line">
                  <td className="px-4 py-3 font-medium text-ink">
                    {c.full_name}
                    <ExtraFieldsReadout tenantId={tenantId} formKey="hrm.candidate" recordId={c.id} />
                  </td>
                  <td className="px-4 py-3">{c.position}</td>
                  <td className="px-4 py-3 text-slate-500">
                    <p>{c.email}</p>
                    <p className="text-xs">{c.phone}</p>
                  </td>
                  <td className="px-4 py-3">{c.source ?? "—"}</td>
                  <td className="px-4 py-3">
                    <SelectInput className="min-w-[140px]" value={c.stage} onChange={(e) => changeStage(c, e.target.value as CandidateStage)}>
                      {stages.map((s) => (
                        <option key={s} value={s} className="capitalize">{s}</option>
                      ))}
                    </SelectInput>
                  </td>
                  <td className="max-w-[220px] px-4 py-3 text-slate-500">{c.notes ?? "—"}</td>
                  <td className="px-4 py-3">
                    <RecordRowActions
                      onTrash={() =>
                        askTrash({
                          entityLabel: "candidate",
                          name: c.full_name,
                          onConfirm: () => {
                            deleteCandidate(c.id);
                            refresh();
                          }
                        })
                      }
                    />
                  </td>
                </tr>
              ))}
              {filtered.length === 0 ? (
                <tr><td colSpan={7} className="px-4 py-8 text-center text-slate-400">No candidates found.</td></tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </Panel>

      {hireTarget ? (
        <Panel className="fixed inset-x-0 bottom-0 z-50 mx-auto mb-6 max-w-lg border-teal/40 shadow-soft">
          <h3 className="mb-2 text-lg font-bold text-ink">Hire {hireTarget.full_name}?</h3>
          <p className="mb-3 text-sm text-slate-500">Creates an employee record, fills a matching open position, and starts onboarding.</p>
          <Field label="Starting basic salary">
            <TextInput type="number" value={hireSalary} onChange={(e) => setHireSalary(e.target.value)} placeholder="0" />
          </Field>
          <Field label="Hire note">
            <TextArea rows={3} value={hireNote} onChange={(e) => setHireNote(e.target.value)} placeholder="e.g. Start date, offered salary…" />
          </Field>
          <div className="mt-3 flex gap-2">
            <Button onClick={confirmHire}>Confirm hire</Button>
            <Button variant="secondary" onClick={() => { setHireTarget(null); setHireNote(""); }}>Cancel</Button>
          </div>
        </Panel>
      ) : null}

      {dialog}
    </AppShell>
  );
}
