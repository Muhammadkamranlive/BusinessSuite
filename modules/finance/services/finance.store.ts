import type { TenantEntity, UUID } from "@/modules/core/types";
import { generateDocumentNumber } from "@/modules/core/services/numbering.service";
import { logCreate } from "@/modules/core/services/audit.service";
import { bindTrashRestore, trashEntityInCollection, updateEntityInCollection } from "@/modules/core/services/entity-crud";
import { loadPersisted, savePersisted } from "@/modules/core/services/local-persist";
import { queueOpsRemoteSync, registerOpsModule } from "@/modules/ops/services/ops-remote";

function now() { return new Date().toISOString(); }
function id() { return crypto.randomUUID(); }

export interface ChartAccount extends TenantEntity {
  account_code: string;
  account_name: string;
  account_type: "asset" | "liability" | "equity" | "income" | "expense";
  is_active: boolean;
}

export interface Expense extends TenantEntity {
  expense_no: string;
  expense_date: string;
  account_name: string;
  amount: number;
  description: string;
  payment_method: string;
}

export interface IncomeEntry extends TenantEntity {
  income_no: string;
  income_date: string;
  account_name: string;
  amount: number;
  description: string;
}

export interface JournalEntry extends TenantEntity {
  journal_no: string;
  journal_date: string;
  account_name: string;
  debit: number;
  credit: number;
  memo: string;
  reference_type?: string | null;
  reference_id?: UUID | null;
}

export interface TaxRate extends TenantEntity {
  name: string;
  rate: number;
  country: string;
  status: "active" | "inactive";
}

const STORAGE_KEY = "businesssuite:finance:v3";
const STORAGE_VERSION = 3;

let accounts: ChartAccount[] = [];
let expenses: Expense[] = [];
let income: IncomeEntry[] = [];
let journals: JournalEntry[] = [];
let taxes: TaxRate[] = [];

let hydrated = false;

function persist() {
  savePersisted(STORAGE_KEY, { version: STORAGE_VERSION, accounts, expenses, income, journals, taxes });
  queueOpsRemoteSync();
}

function ensureHydrated() {
  if (hydrated) return;
  hydrated = true;
  const snap = loadPersisted<{
    version: number;
    accounts: ChartAccount[];
    expenses: Expense[];
    income: IncomeEntry[];
    journals: JournalEntry[];
    taxes: TaxRate[];
  }>(STORAGE_KEY);
  if (snap?.version === STORAGE_VERSION && Array.isArray(snap.accounts)) {
    accounts = snap.accounts;
    expenses = snap.expenses ?? expenses;
    income = snap.income ?? income;
    journals = snap.journals ?? [];
    taxes = snap.taxes ?? [];
  }
}

export function listAccounts(tenantId: UUID) {
  ensureHydrated();
  return accounts.filter((a) => a.tenant_id === tenantId && a.is_active !== false);
}

export function createAccount(tenantId: UUID, data: Omit<ChartAccount, "id" | "tenant_id" | "created_at" | "updated_at">) {
  ensureHydrated();
  const row: ChartAccount = { ...data, id: id(), tenant_id: tenantId, created_at: now(), updated_at: now(), is_active: data.is_active ?? true };
  accounts.unshift(row);
  persist();
  return row;
}

export function listExpenses(tenantId: UUID) {
  ensureHydrated();
  return expenses.filter((e) => e.tenant_id === tenantId && e.is_active !== false);
}

export function listIncome(tenantId: UUID) {
  ensureHydrated();
  return income.filter((i) => i.tenant_id === tenantId && i.is_active !== false);
}

export function getTrialBalance(tenantId: UUID) {
  ensureHydrated();
  const map = new Map<string, { debit: number; credit: number }>();
  for (const j of journals.filter((row) => row.tenant_id === tenantId && row.is_active !== false)) {
    const cur = map.get(j.account_name) ?? { debit: 0, credit: 0 };
    cur.debit += j.debit || 0;
    cur.credit += j.credit || 0;
    map.set(j.account_name, cur);
  }
  return [...map.entries()].map(([account, v]) => ({
    account,
    debit: v.debit,
    credit: v.credit,
    balance: v.debit - v.credit
  }));
}

export function getLedger(tenantId: UUID, accountName: string) {
  ensureHydrated();
  return journals
    .filter((j) => j.tenant_id === tenantId && j.is_active !== false && j.account_name === accountName)
    .sort((a, b) => a.journal_date.localeCompare(b.journal_date));
}

export function getBalanceSheet(tenantId: UUID) {
  const tb = getTrialBalance(tenantId);
  const typeOf = (name: string) => accounts.find((a) => a.tenant_id === tenantId && a.account_name === name)?.account_type;
  const bucket = (pred: (t: string | undefined, name: string) => boolean) =>
    tb.filter((r) => pred(typeOf(r.account), r.account)).reduce((s, r) => s + r.balance, 0);
  const assets = bucket((t, n) => t === "asset" || /receivable|cash|inventory|bank/i.test(n));
  const liabilities = bucket((t, n) => t === "liability" || /payable|tax|eobi|pf /i.test(n));
  const equity = bucket((t, n) => t === "equity" || /capital|retained/i.test(n));
  const income = bucket((t, n) => t === "income" || /revenue|sales|income/i.test(n));
  const expense = bucket((t, n) => t === "expense" || /expense|cogs|salaries/i.test(n));
  const retained = income - expense;
  return { assets, liabilities, equity: equity + retained, retained };
}

export function getCashFlow(tenantId: UUID) {
  ensureHydrated();
  const operating = journals
    .filter((j) => j.tenant_id === tenantId && j.is_active !== false && /cash/i.test(j.account_name))
    .reduce((s, j) => s + (j.debit || 0) - (j.credit || 0), 0);
  return { operating, investing: 0, financing: 0, net: operating };
}

export function getProfitAndLoss(tenantId: UUID) {
  ensureHydrated();
  const typeOf = (name: string) => accounts.find((a) => a.tenant_id === tenantId && a.account_name === name)?.account_type;
  let totalIncome = 0;
  let totalExpenses = 0;
  for (const j of journals.filter((row) => row.tenant_id === tenantId && row.is_active !== false)) {
    const t = typeOf(j.account_name);
    const inferred =
      t ??
      (/revenue|sales|income/i.test(j.account_name) ? "income" : /expense|cogs|salaries|pf expense/i.test(j.account_name) ? "expense" : null);
    if (inferred === "income") totalIncome += (j.credit || 0) - (j.debit || 0);
    if (inferred === "expense") totalExpenses += (j.debit || 0) - (j.credit || 0);
  }
  if (!journals.some((j) => j.tenant_id === tenantId && j.is_active !== false)) {
    totalIncome = income.filter((i) => i.tenant_id === tenantId && i.is_active !== false).reduce((s, i) => s + i.amount, 0);
    totalExpenses = expenses.filter((e) => e.tenant_id === tenantId && e.is_active !== false).reduce((s, e) => s + e.amount, 0);
  }
  return { totalIncome, totalExpenses, profit: totalIncome - totalExpenses };
}

export function createExpense(tenantId: UUID, data: Omit<Expense, "id" | "tenant_id" | "expense_no" | "created_at" | "updated_at">) {
  ensureHydrated();
  const expense: Expense = { ...data, id: id(), tenant_id: tenantId, expense_no: generateDocumentNumber(tenantId, "expense"), created_at: now(), updated_at: now(), is_active: true };
  expenses.unshift(expense);
  persist();
  postLedgerPair(tenantId, expense.expense_date, `Expense ${expense.expense_no}`, expense.account_name || "Operating Expenses", "Cash", expense.amount, "expense", expense.id);
  logCreate({ tenantId, module: "finance", entityName: "expense", entityId: expense.id, newData: expense as unknown as Record<string, unknown> });
  return expense;
}

export function createIncome(tenantId: UUID, data: Omit<IncomeEntry, "id" | "tenant_id" | "income_no" | "created_at" | "updated_at">) {
  ensureHydrated();
  const row: IncomeEntry = { ...data, id: id(), tenant_id: tenantId, income_no: generateDocumentNumber(tenantId, "income"), created_at: now(), updated_at: now(), is_active: true };
  income.unshift(row);
  persist();
  postLedgerPair(tenantId, row.income_date, `Income ${row.income_no}`, "Cash", row.account_name || "Other Income", row.amount, "income", row.id);
  logCreate({ tenantId, module: "finance", entityName: "income", entityId: row.id, newData: row as unknown as Record<string, unknown> });
  return row;
}

export function listJournals(tenantId: UUID) {
  ensureHydrated();
  return journals.filter((j) => j.tenant_id === tenantId && j.is_active !== false);
}

export function createJournal(tenantId: UUID, data: Omit<JournalEntry, "id" | "tenant_id" | "journal_no" | "created_at" | "updated_at">) {
  ensureHydrated();
  const row: JournalEntry = {
    ...data,
    id: id(),
    tenant_id: tenantId,
    journal_no: generateDocumentNumber(tenantId, "journal"),
    created_at: now(),
    updated_at: now(),
    is_active: true
  };
  journals.unshift(row);
  persist();
  return row;
}

export function listTaxes(tenantId: UUID) {
  ensureHydrated();
  return taxes.filter((t) => t.tenant_id === tenantId && t.is_active !== false);
}

export function createTax(tenantId: UUID, data: Omit<TaxRate, "id" | "tenant_id" | "created_at" | "updated_at">) {
  ensureHydrated();
  const row: TaxRate = { ...data, id: id(), tenant_id: tenantId, created_at: now(), updated_at: now(), is_active: true };
  taxes.unshift(row);
  persist();
  return row;
}


const accountRef = { get: () => accounts, set: (rows: ChartAccount[]) => { accounts = rows; }, persist, module: "finance", entityName: "account", labelOf: (row: ChartAccount) => `${row.account_code} · ${row.account_name}` };
const expenseRef = { get: () => expenses, set: (rows: Expense[]) => { expenses = rows; }, persist, module: "finance", entityName: "expense", labelOf: (row: Expense) => `${row.expense_no} · ${row.account_name}` };
const incomeRef = { get: () => income, set: (rows: IncomeEntry[]) => { income = rows; }, persist, module: "finance", entityName: "income", labelOf: (row: IncomeEntry) => `${row.income_no} · ${row.account_name}` };
const journalRef = { get: () => journals, set: (rows: JournalEntry[]) => { journals = rows; }, persist, module: "finance", entityName: "journal", labelOf: (row: JournalEntry) => `${row.journal_no} · ${row.account_name}` };
const taxRef = { get: () => taxes, set: (rows: TaxRate[]) => { taxes = rows; }, persist, module: "finance", entityName: "tax", labelOf: (row: TaxRate) => row.name };

bindTrashRestore(accountRef);
bindTrashRestore(expenseRef);
bindTrashRestore(incomeRef);
bindTrashRestore(journalRef);
bindTrashRestore(taxRef);

export function updateAccount(id: UUID, data: Partial<ChartAccount>) { ensureHydrated(); return updateEntityInCollection(accountRef, id, data); }
export function trashAccount(id: UUID) { ensureHydrated(); return trashEntityInCollection(accountRef, id); }
export function updateExpense(id: UUID, data: Partial<Expense>) { ensureHydrated(); return updateEntityInCollection(expenseRef, id, data); }
export function trashExpense(id: UUID) { ensureHydrated(); return trashEntityInCollection(expenseRef, id); }
export function updateIncome(id: UUID, data: Partial<IncomeEntry>) { ensureHydrated(); return updateEntityInCollection(incomeRef, id, data); }
export function trashIncome(id: UUID) { ensureHydrated(); return trashEntityInCollection(incomeRef, id); }
export function updateJournal(id: UUID, data: Partial<JournalEntry>) { ensureHydrated(); return updateEntityInCollection(journalRef, id, data); }
export function trashJournal(id: UUID) { ensureHydrated(); return trashEntityInCollection(journalRef, id); }
export function updateTax(id: UUID, data: Partial<TaxRate>) { ensureHydrated(); return updateEntityInCollection(taxRef, id, data); }
export function trashTax(id: UUID) { ensureHydrated(); return trashEntityInCollection(taxRef, id); }

export function postLedgerPair(
  tenantId: UUID,
  date: string,
  memo: string,
  debitAccount: string,
  creditAccount: string,
  amount: number,
  referenceType?: string,
  referenceId?: UUID
) {
  if (!amount) return;
  createJournal(tenantId, {
    journal_date: date,
    account_name: debitAccount,
    debit: amount,
    credit: 0,
    memo,
    reference_type: referenceType ?? null,
    reference_id: referenceId ?? null
  });
  createJournal(tenantId, {
    journal_date: date,
    account_name: creditAccount,
    debit: 0,
    credit: amount,
    memo,
    reference_type: referenceType ?? null,
    reference_id: referenceId ?? null
  });
}

registerOpsModule({
  build: () => ({
    accounts: accounts as unknown as Record<string, unknown>[],
    expenses: expenses as unknown as Record<string, unknown>[],
    income: income as unknown as Record<string, unknown>[],
    journals: journals as unknown as Record<string, unknown>[],
    taxes: taxes as unknown as Record<string, unknown>[]
  }),
  apply: (snapshot) => {
    if (snapshot.accounts) accounts = snapshot.accounts as unknown as ChartAccount[];
    if (snapshot.expenses) expenses = snapshot.expenses as unknown as Expense[];
    if (snapshot.income) income = snapshot.income as unknown as IncomeEntry[];
    if (snapshot.journals) journals = snapshot.journals as unknown as JournalEntry[];
    if (snapshot.taxes) taxes = snapshot.taxes as unknown as TaxRate[];
    savePersisted(STORAGE_KEY, { version: STORAGE_VERSION, accounts, expenses, income, journals, taxes });
  }
});
