"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { AppShell } from "@/components/app-shell";
import { ModuleBreadcrumbs } from "@/components/common/module-breadcrumbs";
import { PageHeader } from "@/components/common/page-header";
import { StatusBadge } from "@/components/common/status-badge";
import { DataListToolbar } from "@/components/common/data-list-toolbar";
import { RecordRowActions } from "@/components/common/record-row-actions";
import { useConfirm } from "@/components/common/use-confirm";
import { ExtraFieldsBlock } from "@/components/forms/extra-fields-block";
import { ExtraFieldsReadout } from "@/components/forms/extra-fields-readout";
import { Button, Field, Panel, SelectInput, TextInput } from "@/components/ui";
import { DocumentLinesEditor } from "@/components/ops/document-lines-editor";
import { getStoredTenantId, getStoredUserEmail } from "@/lib/auth/session";
import { exportListCsv, exportListPdf } from "@/lib/list-export";
import { filterAndSort } from "@/lib/list-query";
import { getExtraFieldValues, persistExtraFields } from "@/modules/forms/services/extra-fields.store";
import { money } from "@/lib/utils";
import { listCustomers } from "@/modules/crm/services/crm.store";
import { listProducts } from "@/modules/inventory/services/inventory.store";
import { emptyDocumentLine, linesSubtotal, type DocumentLine } from "@/modules/ops/document-line";
import {
  approveQuotation,
  convertQuotationToOrder,
  createQuotation,
  listQuotations,
  trashQuotation,
  updateQuotation,
  type Quotation
} from "@/modules/sales/services/sales.store";

const empty = {
  customer_name: "",
  quotation_date: new Date().toISOString().slice(0, 10),
  valid_until: "",
  status: "draft" as Quotation["status"]
};

export default function QuotationsPage() {
  const router = useRouter();
  const tenantId = getStoredTenantId() ?? "alpha";
  const { askSave, askTrash, dialog } = useConfirm();
  const [quotations, setQuotations] = useState<Quotation[]>([]);
  const [customers, setCustomers] = useState<ReturnType<typeof listCustomers>>([]);
  const [products, setProducts] = useState<ReturnType<typeof listProducts>>([]);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [sortField, setSortField] = useState("quotation_no");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");
  const [openForm, setOpenForm] = useState(false);
  const [editing, setEditing] = useState<Quotation | null>(null);
  const [error, setError] = useState("");
  const [form, setForm] = useState(empty);
  const [lines, setLines] = useState<DocumentLine[]>([emptyDocumentLine()]);
  const [extraJson, setExtraJson] = useState("");

  function refresh() {
    setQuotations(listQuotations(tenantId));
    setCustomers(listCustomers(tenantId));
    setProducts(listProducts(tenantId));
  }

  useEffect(() => {
    refresh();
  }, [tenantId]);

  const filtered = useMemo(
    () =>
      filterAndSort(quotations as unknown as Array<Record<string, unknown>>, {
        search,
        searchFields: ["quotation_no", "customer_name", "status"],
        statusField: "status",
        statusValue: statusFilter,
        sortField,
        sortDir
      }) as unknown as Quotation[],
    [quotations, search, statusFilter, sortField, sortDir]
  );

  function openCreate() {
    setEditing(null);
    setForm({ ...empty, quotation_date: new Date().toISOString().slice(0, 10) });
    setLines([emptyDocumentLine()]);
    setExtraJson("");
    setError("");
    setOpenForm(true);
  }

  function openEdit(row: Quotation) {
    setEditing(row);
    setForm({
      customer_name: row.customer_name,
      quotation_date: row.quotation_date,
      valid_until: row.valid_until,
      status: row.status
    });
    setLines(row.lines?.length ? row.lines : [emptyDocumentLine()]);
    setExtraJson(getExtraFieldValues(tenantId, "sales.quotation", row.id));
    setError("");
    setOpenForm(true);
  }

  function doSave() {
    setError("");
    if (!form.customer_name.trim()) {
      setError("Customer is required.");
      return;
    }
    const quoteDate = form.quotation_date || new Date().toISOString().slice(0, 10);
    const payload = {
      customer_name: form.customer_name.trim(),
      quotation_date: quoteDate,
      valid_until: form.valid_until || quoteDate,
      status: form.status,
      total_amount: linesSubtotal(lines),
      lines
    };
    if (editing) {
      updateQuotation(editing.id, payload);
      persistExtraFields(tenantId, "sales.quotation", editing.id, extraJson);
    } else {
      const row = createQuotation(tenantId, payload);
      persistExtraFields(tenantId, "sales.quotation", row.id, extraJson);
    }
    setExtraJson("");
    setForm({ ...empty, quotation_date: new Date().toISOString().slice(0, 10) });
    setLines([emptyDocumentLine()]);
    setEditing(null);
    setOpenForm(false);
    refresh();
  }

  function submit(e: React.FormEvent) {
    e.preventDefault();
    askSave({
      editing: Boolean(editing),
      entityLabel: "quotation",
      onConfirm: doSave
    });
  }

  return (
    <AppShell activeModule="sales">
      <PageHeader
        title="Quotations"
        description="Proposals before invoicing. Convert to a sales order when accepted."
        actionLabel="New quotation"
        onAction={openCreate}
      />
      <ModuleBreadcrumbs />
      {openForm ? (
        <Panel className="mb-4">
          <form onSubmit={submit} className="grid gap-3 md:grid-cols-3">
            {error ? <p className="md:col-span-3 text-sm text-rose-600">{error}</p> : null}
            <Field label="Customer">
              <SelectInput value={form.customer_name} onChange={(e) => setForm({ ...form, customer_name: e.target.value })}>
                <option value="">Select…</option>
                {customers.map((c) => (
                  <option key={c.id} value={c.name}>
                    {c.name}
                  </option>
                ))}
              </SelectInput>
            </Field>
            <Field label="Or type name">
              <TextInput value={form.customer_name} onChange={(e) => setForm({ ...form, customer_name: e.target.value })} required />
            </Field>
            <Field label="Status">
              <SelectInput value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value as Quotation["status"] })}>
                {["draft", "sent", "pending_approval", "accepted", "rejected", "expired"].map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </SelectInput>
            </Field>
            <Field label="Quote date">
              <TextInput type="date" value={form.quotation_date} onChange={(e) => setForm({ ...form, quotation_date: e.target.value })} />
            </Field>
            <Field label="Valid until">
              <TextInput type="date" value={form.valid_until} onChange={(e) => setForm({ ...form, valid_until: e.target.value })} />
            </Field>
            <DocumentLinesEditor lines={lines} onChange={setLines} products={products} tenantId={tenantId} />
            <ExtraFieldsBlock formKey="sales.quotation" valueJson={extraJson} onChange={setExtraJson} />
            <div className="md:col-span-3 flex gap-2">
              <Button type="submit">{editing ? "Update quotation" : "Save quotation"}</Button>
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
      <Panel>
        <DataListToolbar
          search={search}
          onSearchChange={setSearch}
          searchPlaceholder="Search quotations…"
          filterLabel="statuses"
          filterValue={statusFilter}
          filterOptions={[
            { value: "draft", label: "draft" },
            { value: "sent", label: "sent" },
            { value: "pending_approval", label: "pending approval" },
            { value: "accepted", label: "accepted" },
            { value: "rejected", label: "rejected" },
            { value: "expired", label: "expired" }
          ]}
          onFilterChange={setStatusFilter}
          sortValue={sortField}
          sortOptions={[
            { value: "quotation_no", label: "Quotation no" },
            { value: "customer_name", label: "Customer" },
            { value: "quotation_date", label: "Date" },
            { value: "total_amount", label: "Amount" },
            { value: "status", label: "Status" }
          ]}
          onSortChange={setSortField}
          sortDir={sortDir}
          onSortDirChange={setSortDir}
          onExportCsv={() =>
            exportListCsv({
              tenantId,
              module: "sales",
              filename: "quotations",
              rows: filtered.map((q) => ({
                No: q.quotation_no,
                Customer: q.customer_name,
                Date: q.quotation_date,
                Amount: q.total_amount,
                Status: q.status
              }))
            })
          }
          onExportPdf={() =>
            exportListPdf({
              tenantId,
              module: "sales",
              title: "Quotations",
              filename: "quotations",
              columns: ["No", "Customer", "Date", "Amount", "Status"],
              rows: filtered.map((q) => [q.quotation_no, q.customer_name, q.quotation_date, String(q.total_amount), q.status])
            })
          }
        />
        <table className="min-w-full text-left text-sm">
          <thead>
            <tr className="border-b border-line bg-cloud">
              {["Quotation No", "Customer", "Date", "Amount", "Status", ""].map((h) => (
                <th key={h || "a"} className="px-3 py-3 font-semibold text-slate-600">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filtered.map((q) => (
              <tr key={q.id} className="border-b border-line">
                <td className="px-3 py-3 font-medium">
                  {q.quotation_no}
                  <ExtraFieldsReadout tenantId={tenantId} formKey="sales.quotation" recordId={q.id} />
                </td>
                <td className="px-3 py-3">{q.customer_name}</td>
                <td className="px-3 py-3">{q.quotation_date}</td>
                <td className="px-3 py-3">{money(q.total_amount)}</td>
                <td className="px-3 py-3">
                  <StatusBadge status={q.status} />
                </td>
                <td className="px-3 py-3">
                  <div className="flex flex-wrap gap-2">
                    <RecordRowActions
                      onEdit={() => openEdit(q)}
                      onTrash={() =>
                        askTrash({
                          entityLabel: "quotation",
                          name: q.quotation_no,
                          onConfirm: () => {
                            trashQuotation(q.id);
                            refresh();
                          }
                        })
                      }
                    />
                    {q.status !== "accepted" && q.status !== "rejected" && q.status !== "expired" ? (
                      <Button
                        variant="secondary"
                        className="!min-h-8 !px-3 !text-xs"
                        onClick={() =>
                          askSave({
                            editing: true,
                            entityLabel: "quotation approval",
                            onConfirm: () => {
                              try {
                                approveQuotation(q.id, getStoredUserEmail() ?? "approver");
                                refresh();
                              } catch (e) {
                                setError(e instanceof Error ? e.message : "Cannot approve quotation.");
                              }
                            }
                          })
                        }
                      >
                        Approve
                      </Button>
                    ) : null}
                    {q.status !== "rejected" && q.status !== "expired" ? (
                      <Button
                        variant="secondary"
                        className="!min-h-8 !px-3 !text-xs"
                        onClick={() =>
                          askSave({
                            editing: false,
                            entityLabel: "sales order from quotation",
                            onConfirm: () => {
                              try {
                                convertQuotationToOrder(tenantId, q.id);
                                refresh();
                                router.push("/sales/orders");
                              } catch (e) {
                                setError(e instanceof Error ? e.message : "Cannot convert quotation.");
                              }
                            }
                          })
                        }
                      >
                        Convert to SO
                      </Button>
                    ) : null}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </Panel>
      {dialog}
    </AppShell>
  );
}
