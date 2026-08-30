"use client";

import { useMemo, useState } from "react";
import { AppShell } from "@/components/app-shell";
import { ModuleBreadcrumbs } from "@/components/common/module-breadcrumbs";
import { PageHeader } from "@/components/common/page-header";
import { StatusBadge } from "@/components/common/status-badge";
import { useConfirm } from "@/components/common/use-confirm";
import { ExtraFieldsBlock } from "@/components/forms/extra-fields-block";
import { Button, Field, Panel, SelectInput, TextArea, TextInput } from "@/components/ui";
import { getSelfServiceContext } from "@/lib/auth/current-employee";
import { getStoredTenantId } from "@/lib/auth/session";
import { persistExtraFields } from "@/modules/forms/services/extra-fields.store";
import { getEmployeeName, listEmployees } from "@/modules/hrm/services/hrm.store";
import { createGoal, createReview, listGoals, listReviews, updateGoal } from "@/modules/hrm/services/workday.store";
import type { ReviewRating } from "@/modules/hrm/workday-model";

export default function TalentPage() {
  const tenantId = getStoredTenantId() ?? "alpha";
  const { employee, selfService, profile } = getSelfServiceContext(tenantId);
  const { askSave, dialog } = useConfirm();
  const [tick, setTick] = useState(0);
  const [extraJson, setExtraJson] = useState("");
  const [goalForm, setGoalForm] = useState({ employee_id: employee?.id ?? "", title: "", period: "2026-H2", progress: "0" });
  const [reviewForm, setReviewForm] = useState({ employee_id: "", cycle: "2026 Mid-year", rating: "meets" as ReviewRating, comments: "" });

  const people = useMemo(() => listEmployees(tenantId), [tenantId]);
  const goals = useMemo(() => listGoals(tenantId, selfService ? employee?.id : undefined), [tenantId, selfService, employee, tick]);
  const reviews = useMemo(() => listReviews(tenantId, selfService ? employee?.id : undefined), [tenantId, selfService, employee, tick]);

  return (
    <AppShell activeModule="hrm">
      <PageHeader title="Talent" description="Goals, performance reviews, and career history — Workday talent core." />
      <ModuleBreadcrumbs />
      <div className="grid gap-5 xl:grid-cols-2">
        <Panel>
          <h2 className="mb-3 text-lg font-bold text-ink">Goal</h2>
          <form
            className="grid gap-3"
            onSubmit={(e) => {
              e.preventDefault();
              askSave({
                editing: false,
                entityLabel: "goal",
                onConfirm: () => {
                  const row = createGoal(tenantId, {
                    employee_id: goalForm.employee_id,
                    title: goalForm.title.trim(),
                    period: goalForm.period,
                    progress: Number(goalForm.progress) || 0,
                    status: "in_progress"
                  });
                  persistExtraFields(tenantId, "hrm.goal", row.id, extraJson);
                  setTick((n) => n + 1);
                }
              });
            }}
          >
            {selfService ? null : (
              <Field label="Worker">
                <SelectInput required value={goalForm.employee_id} onChange={(e) => setGoalForm({ ...goalForm, employee_id: e.target.value })}>
                  <option value="">Select</option>
                  {people.map((p) => <option key={p.id} value={p.id}>{p.full_name}</option>)}
                </SelectInput>
              </Field>
            )}
            <Field label="Title"><TextInput required value={goalForm.title} onChange={(e) => setGoalForm({ ...goalForm, title: e.target.value })} /></Field>
            <Field label="Period"><TextInput required value={goalForm.period} onChange={(e) => setGoalForm({ ...goalForm, period: e.target.value })} /></Field>
            <ExtraFieldsBlock formKey="hrm.goal" valueJson={extraJson} onChange={setExtraJson} />
            <Button type="submit">Add goal</Button>
          </form>
          <ul className="mt-4 space-y-2">
            {goals.map((g) => (
              <li key={g.id} className="rounded-[var(--bs-radius)] border border-line px-3 py-2 text-sm">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span><span className="font-semibold">{g.title}</span> · {getEmployeeName(g.employee_id)} · {g.progress}%</span>
                  <StatusBadge status={g.status} />
                </div>
                <div className="mt-2 flex flex-wrap gap-2">
                    {[25, 50, 75, 100].map((pct) => (
                      <Button
                        key={pct}
                        type="button"
                        variant="secondary"
                        className="!min-h-8 !px-2 !text-xs"
                        onClick={() =>
                          askSave({
                            editing: true,
                            entityLabel: "goal progress",
                            onConfirm: () => {
                              updateGoal(g.id, { progress: pct, status: pct >= 100 ? "completed" : "in_progress" });
                              setTick((n) => n + 1);
                            }
                          })
                        }
                      >
                        {pct}%
                      </Button>
                    ))}
                  </div>
              </li>
            ))}
          </ul>
        </Panel>
        <Panel>
          <h2 className="mb-3 text-lg font-bold text-ink">Performance review</h2>
          {selfService ? (
            <ul className="space-y-2">
              {reviews.map((r) => (
                <li key={r.id} className="rounded-[var(--bs-radius)] border border-line px-3 py-2 text-sm">
                  <span className="font-semibold">{r.cycle}</span> · {r.rating ?? "—"} · {r.comments}
                </li>
              ))}
            </ul>
          ) : (
            <form
              className="grid gap-3"
              onSubmit={(e) => {
                e.preventDefault();
                askSave({
                  editing: false,
                  entityLabel: "review",
                  onConfirm: () => {
                    const row = createReview(tenantId, {
                      employee_id: reviewForm.employee_id,
                      cycle: reviewForm.cycle,
                      rating: reviewForm.rating,
                      comments: reviewForm.comments,
                      status: "completed",
                      reviewer_name: profile.name
                    });
                    persistExtraFields(tenantId, "hrm.review", row.id, extraJson);
                    setTick((n) => n + 1);
                  }
                });
              }}
            >
              <Field label="Worker">
                <SelectInput required value={reviewForm.employee_id} onChange={(e) => setReviewForm({ ...reviewForm, employee_id: e.target.value })}>
                  <option value="">Select</option>
                  {people.map((p) => <option key={p.id} value={p.id}>{p.full_name}</option>)}
                </SelectInput>
              </Field>
              <Field label="Cycle"><TextInput required value={reviewForm.cycle} onChange={(e) => setReviewForm({ ...reviewForm, cycle: e.target.value })} /></Field>
              <Field label="Rating">
                <SelectInput value={reviewForm.rating} onChange={(e) => setReviewForm({ ...reviewForm, rating: e.target.value as ReviewRating })}>
                  <option value="exceeds">Exceeds</option>
                  <option value="meets">Meets</option>
                  <option value="developing">Developing</option>
                  <option value="unsatisfactory">Unsatisfactory</option>
                </SelectInput>
              </Field>
              <Field label="Comments"><TextArea rows={3} value={reviewForm.comments} onChange={(e) => setReviewForm({ ...reviewForm, comments: e.target.value })} /></Field>
              <Button type="submit">Complete review</Button>
            </form>
          )}
        </Panel>
      </div>
      {dialog}
    </AppShell>
  );
}
