import { queueOpsRemoteSync, registerOpsModule } from "@/modules/ops/services/ops-remote";
import type { UUID } from "@/modules/core/types";

export type DocumentSequence = {
  tenant_id: UUID;
  module_code: string;
  prefix: string;
  next_number: number;
  updated_at?: string;
};

const DEFAULT_PREFIXES: Record<string, string> = {
  lead: "LEAD",
  customer: "CUST",
  quotation: "QUO",
  sales_order: "SO",
  sales_return: "SR",
  invoice: "INV",
  purchase_order: "PO",
  goods_receipt: "GRN",
  vendor_bill: "BILL",
  vendor_payment: "VPAY",
  employee: "EMP",
  payment: "PAY",
  expense: "EXP",
  income: "INC",
  journal: "JRN",
  project: "PRJ",
  supplier: "SUP",
  deal: "DEAL",
  activity: "ACT",
  transfer: "TRF",
  adjustment: "ADJ",
  delivery: "DN",
  credit_note: "CN",
  debit_note: "DNTE",
  requisition: "PR",
  rfq: "RFQ",
  campaign: "CMP",
  ticket: "TKT"
};

let sequences: DocumentSequence[] = [];

function defaultPrefix(moduleCode: string) {
  return DEFAULT_PREFIXES[moduleCode] ?? moduleCode.toUpperCase().slice(0, 4);
}

export function listDocumentSequences(tenantId?: UUID) {
  if (!tenantId) return sequences;
  return sequences.filter((s) => s.tenant_id === tenantId);
}

export function applyDocumentSequences(rows: DocumentSequence[] | undefined) {
  if (!rows) return;
  sequences = rows.map((s) => ({
    tenant_id: s.tenant_id,
    module_code: s.module_code,
    prefix: s.prefix || defaultPrefix(s.module_code),
    next_number: Number(s.next_number) || 1,
    updated_at: s.updated_at
  }));
}

export function setSequencePrefix(tenantId: UUID, moduleCode: string, prefix: string) {
  const row = sequences.find((s) => s.tenant_id === tenantId && s.module_code === moduleCode);
  if (row) {
    row.prefix = prefix.trim() || row.prefix;
    row.updated_at = new Date().toISOString();
  } else {
    sequences.push({
      tenant_id: tenantId,
      module_code: moduleCode,
      prefix: prefix.trim() || defaultPrefix(moduleCode),
      next_number: 1,
      updated_at: new Date().toISOString()
    });
  }
  queueOpsRemoteSync();
}

export function generateDocumentNumber(tenantId: UUID, moduleCode: string) {
  let row = sequences.find((s) => s.tenant_id === tenantId && s.module_code === moduleCode);
  if (!row) {
    row = {
      tenant_id: tenantId,
      module_code: moduleCode,
      prefix: defaultPrefix(moduleCode),
      next_number: 1,
      updated_at: new Date().toISOString()
    };
    sequences.push(row);
  }
  const n = row.next_number;
  row.next_number = n + 1;
  row.updated_at = new Date().toISOString();
  queueOpsRemoteSync();
  return `${row.prefix}-${String(n).padStart(5, "0")}`;
}

export function resetNumbering() {
  sequences = [];
}

registerOpsModule({
  build: () => ({ sequences: sequences as unknown as Record<string, unknown>[] }),
  apply: (snapshot) => applyDocumentSequences(snapshot.sequences as unknown as DocumentSequence[] | undefined)
});
