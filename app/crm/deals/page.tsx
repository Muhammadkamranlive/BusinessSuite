"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { AppShell } from "@/components/app-shell";
import { ModuleBreadcrumbs } from "@/components/common/module-breadcrumbs";
import { PageHeader } from "@/components/common/page-header";
import { DataListToolbar } from "@/components/common/data-list-toolbar";
import { RecordRowActions } from "@/components/common/record-row-actions";
import { useConfirm } from "@/components/common/use-confirm";
import { ExtraFieldsBlock } from "@/components/forms/extra-fields-block";
import { ExtraFieldsReadout } from "@/components/forms/extra-fields-readout";
import { Button, Field, Panel, SelectInput, TextInput } from "@/components/ui";
import { getStoredTenantId } from "@/lib/auth/session";
import { exportListCsv, exportListPdf } from "@/lib/list-export";
import { filterAndSort } from "@/lib/list-query";
import { getExtraFieldValues, persistExtraFields } from "@/modules/forms/services/extra-fields.store";
import { money } from "@/lib/utils";
import { createDeal, listCustomers, listDeals, trashDeal, updateDeal, updateDealStage } from "@/modules/crm/services/crm.store";
import { convertDealToQuotation } from "@/modules/sales/services/sales.store";
import type { Customer, Deal, DealStage } from "@/modules/crm/types";

const stages: DealStage[] = ["prospecting", "proposal", "negotiation", "won", "lost"];

const empty = {
  title: "",
  customer_id: "",
  stage: "prospecting" as DealStage,
  amount: "",
  probability: "50",
  expected_close_date: ""
};

export default function DealsPage() {
  const router = useRouter();
  const tenantId = getStoredTenantId() ?? "alpha";
  const { askSave, askTrash, dialog } = useConfirm();
  const [deals, setDeals] = useState<Deal[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [sortField, setSortField] = useState("title");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");
  const [openForm, setOpenForm] = useState(false);
  const [editing, setEditing] = useState<Deal | null>(null);
  const [error, setError] = useState("");
  const [form, setForm] = useState(empty);
  const [extraJson, setExtraJson] = useState("");

  function refresh() {
    setDeals(listDeals(tenantId));
    setCustomers(listCustomers(tenantId));
  }

  useEffect(() => {
    refresh();
  }, [tenantId]);

  const filtered = useMemo(
    () =>
      filterAndSort(deals as unknown as Array<Record<string, unknown>>, {
        search,
        searchFields: ["title", "deal_no", "stage", "status"],
        statusField: "stage",
        statusValue: statusFilter,
        sortField,
        sortDir
      }) as unknown as Deal[],
    [deals, search, statusFilter, sortField, sortDir]
  );

  function openCreate() {
    setEditing(null);
    setForm(empty);
    setExtraJson("");
    setError("");
    setOpenForm(true);
  }

  function openEdit(row: Deal) {
    setEditing(row);
    setForm({
      title: row.title,
      customer_id: row.customer_id ?? "",
      stage: row.stage,
      amount: String(row.amount),
      probability: String(row.probability),
      expected_close_date: row.expected_close_date ?? ""
    });
    setExtraJson(getExtraFieldValues(tenantId, "crm.deal", row.id));
    setError("");
    setOpenForm(true);
  }

  function moveDeal(dealId: string, stage: DealStage) {
    try {
      const reason = stage === "won" || stage === "lost" ? window.prompt("Win/loss reason (required):") ?? "" : undefined;
      updateDealStage(dealId, stage, reason);
      refresh();
    } catch (e) {
      window.alert(e instanceof Error ? e.message : "Stage change blocked.");
    }
  }

  function doSave() {
    setError("");
    if (!form.title.trim()) {
      setError("Deal title is required.");
      return;
    }
    const stage = form.stage;
    const payload = {
      title: form.title.trim(),
      customer_id: form.customer_id || null,
      lead_id: editing?.lead_id ?? null,
      stage,
      amount: Number(form.amount) || 0,
      probability: Number(form.probability) || 0,
      expected_close_date: form.expected_close_date || null,
      assigned_to: editing?.assigned_to ?? null,
      status: (stage === "won" ? "won" : stage === "lost" ? "lost" : "open") as Deal["status"]
    };
    if (editing) {
      updateDeal(editing.id, payload);
      persistExtraFields(tenantId, "crm.deal", editing.id, extraJson);
    } else {
      const row = createDeal(tenantId, payload);
      persistExtraFields(tenantId, "crm.deal", row.id, extraJson);
    }
    setExtraJson("");
    setForm(empty);
    setEditing(null);
    setOpenForm(false);
    refresh();
  }

  function submit(e: React.FormEvent) {
    e.preventDefault();
    askSave({
      editing: Boolean(editing),
      entityLabel: "deal",
      onConfirm: doSave
    });
  }

  return (
    <AppShell activeModule="crm">
      <PageHeader title="Deals Pipeline" description="Create deals and move them through stages." actionLabel="New deal" onAction={openCreate} />
      <ModuleBreadcrumbs />

      {openForm ? (
        <Panel className="mb-4">
          <form onSubmit={submit} className="grid gap-3 md:grid-cols-3">
            {error ? <p className="md:col-span-3 text-sm text-rose-600">{error}</p> : null}
            <Field label="Title" className="md:col-span-2">
              <TextInput value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} required />
            </Field>
            <Field label="Customer">
              <SelectInput value={form.customer_id} onChange={(e) => setForm({ ...form, customer_id: e.target.value })}>
                <option value="">Optional…</option>
                {customers.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </SelectInput>
            </Field>
            <Field label="Amount">
              <TextInput type="number" min={0} value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} />
            </Field>
            <Field label="Probability %">
              <TextInput type="number" min={0} max={100} value={form.probability} onChange={(e) => setForm({ ...form, probability: e.target.value })} />
            </Field>
            <Field label="Stage">
              <SelectInput value={form.stage} onChange={(e) => setForm({ ...form, stage: e.target.value as DealStage })}>
                {stages.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </SelectInput>
            </Field>
            <Field label="Expected close">
              <TextInput type="date" value={form.expected_close_date} onChange={(e) => setForm({ ...form, expected_close_date: e.target.value })} />
            </Field>
            <ExtraFieldsBlock formKey="crm.deal" valueJson={extraJson} onChange={setExtraJson} />
            <div className="md:col-span-3 flex gap-2">
              <Button type="submit">{editing ? "Update deal" : "Save deal"}</Button>
              <Button
                type="button"
                variant="secondary"
                onClick={() => {
                  setExtraJson("");
                  setEditing(null);
                  setOpenForm(false);
                }}
              >
                Cancel
              </Button>
            </div>
          </form>
        </Panel>
      ) : null}

      <Panel className="mb-4">
        <DataListToolbar
          search={search}
          onSearchChange={setSearch}
          searchPlaceholder="Search deals…"
          filterLabel="stages"
          filterValue={statusFilter}
          filterOptions={stages.map((s) => ({ value: s, label: s }))}
          onFilterChange={setStatusFilter}
          sortValue={sortField}
          sortOptions={[
            { value: "title", label: "Title" },
            { value: "deal_no", label: "Deal no" },
            { value: "amount", label: "Amount" },
            { value: "stage", label: "Stage" },
            { value: "probability", label: "Probability" }
          ]}
          onSortChange={setSortField}
          sortDir={sortDir}
          onSortDirChange={setSortDir}
          onExportCsv={() =>
            exportListCsv({
              tenantId,
              module: "crm",
              filename: "deals",
              rows: filtered.map((d) => ({
                No: d.deal_no,
                Title: d.title,
                Stage: d.stage,
                Amount: d.amount,
                Probability: d.probability,
                Status: d.status
              }))
            })
          }
          onExportPdf={() =>
            exportListPdf({
              tenantId,
              module: "crm",
              title: "Deals",
              filename: "deals",
              columns: ["No", "Title", "Stage", "Amount", "Status"],
              rows: filtered.map((d) => [d.deal_no, d.title, d.stage, String(d.amount), d.status])
            })
          }
        />
      </Panel>

      <div className="grid gap-4 overflow-x-auto lg:grid-cols-5">
        {stages.map((stage) => {
          const stageDeals = filtered.filter((d) => d.stage === stage);
          return (
            <Panel key={stage} className="min-w-[220px]">
              <h3 className="mb-3 text-sm font-bold uppercase tracking-wide text-teal capitalize">{stage}</h3>
              <div className="space-y-2">
                {stageDeals.map((deal) => (
                  <div key={deal.id} className="rounded-md border border-line bg-cloud p-3">
                    <p className="font-semibold text-ink">{deal.title}</p>
                    <ExtraFieldsReadout tenantId={tenantId} formKey="crm.deal" recordId={deal.id} />
                    <p className="mt-1 text-sm text-slate-500">
                      {money(deal.amount)} · {deal.probability}%
                    </p>
                    <SelectInput
                      className="mt-2 !h-8 text-xs"
                      value={deal.stage}
                      onChange={(e) => moveDeal(deal.id, e.target.value as DealStage)}
                    >
                      {stages.map((s) => (
                        <option key={s} value={s}>
                          {s}
                        </option>
                      ))}
                    </SelectInput>
                    <div className="mt-2 flex flex-col gap-2">
                      <Button
                        type="button"
                        variant="secondary"
                        onClick={() =>
                          askSave({
                            editing: false,
                            entityLabel: "quotation from deal",
                            onConfirm: () => {
                              const customer = customers.find((c) => c.id === deal.customer_id);
                              convertDealToQuotation(tenantId, deal, customer?.name || deal.title);
                              router.push("/sales/quotations");
                            }
                          })
                        }
                      >
                        Create quotation
                      </Button>
                      <RecordRowActions
                        onEdit={() => openEdit(deal)}
                        onTrash={() =>
                          askTrash({
                            entityLabel: "deal",
                            name: deal.title,
                            onConfirm: () => {
                              trashDeal(deal.id);
                              refresh();
                            }
                          })
                        }
                      />
                    </div>
                  </div>
                ))}
                {stageDeals.length === 0 ? <p className="text-xs text-slate-400">No deals</p> : null}
              </div>
            </Panel>
          );
        })}
      </div>
      {dialog}
    </AppShell>
  );
}
