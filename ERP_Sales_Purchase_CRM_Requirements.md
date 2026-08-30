# ERP — Requirements, Quality Audit & Fix Backlog

Last updated: **18 Aug 2026**.

---

## Honest status (read this first)

**The product is not industry-complete.** Earlier notes that ops work was “done” meant: menus exist, pages load, data can sync to Postgres. That is **not** the same as industry-grade ERP.

Use three levels when reviewing any menu:

| Level | Meaning | Example |
|-------|---------|---------|
| **A — Menu exists** | Route + list/form CRUD + export | HRM Loans, Sales Price Lists |
| **B — Partial logic** | Some business rules in the store, gaps in UI or payroll/finance link | Credit hold on SO, 3-way match in store but not on bill form |
| **C — Industry ready** | Policy/config, calculations, enforcement, audit, integration with related modules | Payroll with PF/EOBI/tax (HRM payroll is closer to this) |

**Goal now:** do **not** add new menus. **Fix existing A → B → C** on what is already in the sidebar.

---

## Case study: HRM Employee Loans (your example)

**Menu:** Compensation → **Loans** (`/hrm/loans`)  
**Current level:** **A** (surface CRUD only)

### What exists today

- Form: employee, loan amount, **manual** monthly repayment, start date, reason
- Status buttons: Pending → Approve → Activate → Close (no confirm on approve)
- Stats: pending count, active count, “outstanding” = sum of **full principal** (ignores repayments)
- DB table `hrm_loans`: `amount`, `repayment_amount`, `start_date`, `reason`, `status`
- Separate **Salary disbursements** page can pay “Loan disbursement” — **not linked** to loan record
- Payroll `generatePayroll()` deducts tax, EOBI, PF — **no loan EMI deduction**
- Legacy PelicanHRM had `loan_deduction` on payroll; this build does not

### What industry standard requires (fix on same menu — no new module)

| # | Fix | Who configures | Notes |
|---|-----|----------------|-------|
| 1 | **Loan policy / parameters** | HR Admin (Company settings or Loans → Policy) | Max amount, max % of gross salary, min tenure (months in company), max concurrent loans, allowed during probation or not, default interest rate, max tenure (months) |
| 2 | **Eligibility check on submit** | System from policy + employee master | Block or warn if: amount > cap, tenure < min, salary × max % exceeded, active loan exists, employee inactive/probation |
| 3 | **Interest rate & tenure** | HR on approve, or from policy | Fields: `interest_rate`, `tenure_months`, loan type (salary advance / emergency / housing) |
| 4 | **EMI calculation** | System | Generate schedule: principal, interest portion, balance per month (flat or reducing balance — pick one and document) |
| 5 | **EMI schedule view** | HR + employee (read-only on profile) | Table of due dates, installment amount, paid/unpaid, link to payroll run |
| 6 | **Payroll deduction** | Auto on payroll run | Deduct due installment(s) from net pay; show **Loan recovery** line on payslip; update outstanding balance |
| 7 | **Disbursement link** | On Activate | Create `PaymentTxn` with `loan_id`; do not rely on manual payout |
| 8 | **Outstanding balance** | Ledger | Running balance after each recovery; close only when balance = 0 |
| 9 | **Approval trail** | Audit | `approved_by`, `approved_at`, optional manager approval before HR |
| 10 | **Employee self-service** | Employee role | Apply from profile; manager queue then HR (optional phase 2 on same flow) |

### Schema additions needed (migration — still one Loans menu)

- `hrm_loan_policies` (tenant-level parameters)
- Extend `hrm_loans`: `interest_rate`, `tenure_months`, `outstanding_balance`, `disbursed_at`, `approved_by`, `policy_id`
- `hrm_loan_installments` (EMI schedule rows)
- Extend `PayrollItem`: `loan_deduction`
- Link `hrm_payment_txns.loan_id`

### Nav / wording (Loans area)

| Current | Industry label |
|---------|----------------|
| Loans | **Employee loans & advances** |
| Request loan | **New loan application** |
| Monthly repayment (manual field) | **Installment amount** (read-only after EMI calc) or remove until calculated |
| Salary disbursements (for loan) | **Loan disbursement** (auto from approved loan) |
| Activate | **Disburse & start recovery** |

---

## Fix backlog — existing menus only

Priority: **business logic + integration** before new reports or new modules.

### HRM (sample — same pattern applies to leave, benefits, assets, etc.)

| Menu | Level | Fix existing (do not add menus) |
|------|-------|----------------------------------|
| **Loans** | **C (local)** | Policy, eligibility, EMI, schedule, payroll deduction, disbursement link — implemented on `/hrm/loans`; verify end-to-end |
| **Payroll** | B | Wire loan recovery; payslip line for loan; PF/EOBI already partial |
| **Leave Requests** | B | Accrual rules, balance check, delegation — verify not just status dropdown |
| **Provident Fund / EOBI** | B | Enrollment rules vs manual flags on employee |
| **Compensation / Pay grades** | B | Ensure job/grade drives salary bands on employee |
| **Attendance / Timesheets** | B | Link to payroll hours; OT rules |
| **Recruitment / Requisitions** | A–B | Requisition → candidate → offer chain completeness |
| **Workflows** | B | Designer exists; verify approvals actually gate transactions |

### CRM

| Menu | Level | Fix existing |
|------|-------|--------------|
| **Leads** | B | Enforce scoring on convert; show eligibility to convert; assignment rules |
| **Customers** | B | Credit limit enforced on SO (exists) — also show warning on quote |
| **Deals Pipeline** | B | Capture win/loss reason on stage change; link quotation id on deal |
| **Activities / Follow-ups** | A | Due date reminders; overdue highlight (in-app, not email yet) |
| **Campaigns** | A | ROI = spend vs converted leads; link leads to campaign |
| **Tickets** | B | SLA breach indicator; status workflow (open → in progress → resolved) |
| **Customer groups** | A | Apply price group when quoting (tie to sales price list) |
| **Contacts** | A | Primary contact enforcement; one primary per account |

**Nav wording**

| Current | Suggested |
|---------|-----------|
| Deals Pipeline | **Opportunities** |
| Customer groups | **Customer segments** |
| Follow-ups | **Open activities** |
| CRM Reports | **CRM analytics** |

### Sales

| Menu | Level | Fix existing |
|------|-------|--------------|
| **Quotations** | B | Approve → pending_approval path; pull price from price list in line editor; expiry date enforcement |
| **Sales Orders** | B | Credit hold UX; block fulfill when hold; reservation optional |
| **Delivery Notes** | B | Create from fulfilled SO; partial qty lines |
| **Invoices** | B | From SO/DN chain; tax from product/customer |
| **Price Lists** | **B** | Line-item UI + `priceForProduct` wired into quotations/orders/invoices |
| **Credit Notes** | B | Link to return / invoice balance |
| **Payments Received** | B | Allocate to invoice; advance handling |
| **Sales Returns** | B | Auto credit note option |
| **Sales Team** | A | Assign salesperson on customer; show on quote |

**Nav wording**

| Current | Suggested |
|---------|-----------|
| Payments Received | **Customer receipts** |
| Sales Returns | **Return authorizations (RMA)** |
| Delivery Notes | **Delivery notes (dispatch)** |
| Sales Team | **Sales representatives** |

### Purchase

| Menu | Level | Fix existing |
|------|-------|--------------|
| **Requisitions** | **B** | Submit → approve/reject workflow; convert to PO (no manual status dropdown) |
| **RFQ** | B | Line-level vendor quote comparison; award creates PO with lines |
| **Purchase Orders** | B | From requisition/RFQ ids; approval before send |
| **Goods Receipts** | B | QC status workflow; qty vs PO variance |
| **Vendor Bills** | **B** | PO + GRN dropdowns on create; ids passed for 3-way match in store |
| **Payments Made** | B | Match to bill; update paid amount |
| **Suppliers** | B | Preferred vendor flag for RFQ |

**Nav wording**

| Current | Suggested |
|---------|-----------|
| Purchase (module) | **Procurement** |
| RFQ | **Request for quotation** |
| Goods Receipts | **Goods receipt notes (GRN)** |
| Payments Made | **Supplier payments** |
| Vendor Bills | **Supplier invoices** |

### Finance / Inventory (cross-cutting)

| Area | Fix existing |
|------|--------------|
| **GL posting** | Ensure every sales/purchase doc that should post does (invoice, payment, bill, credit note) |
| **Stock** | Fulfill/GRN already move stock — add low-stock → requisition suggestion |
| **Document numbering** | Already DB-backed — verify sequences after migration push |

---

## What the last dev round actually did (database ops)

This was **infrastructure**, not industry completion:

- Removed hardcoded JS seeds for CRM/Sales/Purchase/Inventory/Finance/Projects
- Added migration `20260817000010_ops_sales_purchase_crm.sql` (tables for campaigns, RFQ, delivery, match, etc.)
- Dual-write `/api/ops/sync` when `SUPABASE_SECRET_KEY` is set
- Some **B-level** hooks: credit hold, aging, quote approve, RFQ award, 3-way match **in store**

**Still required by you:** `npm run db:push` + `SUPABASE_SECRET_KEY` in `.env.local`.  
**Industry enforcement round (18 Aug 2026):** leave/attendance/payroll GL, hire chain, price+credit+tax, CN/RMA, 3-way **block**, RFQ lines, GRN QC, low-stock PR, segments→price, tickets SLA, campaign ROI, P&L from journals — **implemented in code**; typecheck clean. Still not: statutory tax slabs, biometric attendance, real bank files, FIFO lots, email/calendar.

---

## Requirements checklist (feature coverage)

Below is the original gap sheet. **Do not read “Partial” as shippable.** Use the fix backlog above for depth.

Legend: **Have** = menu + usable flow | **Partial** = A or B | **Missing** = no menu

---

## 1. SALES MODULE

### 1.1 Master Data
- Customer master — **Partial**
- Customer groups / price groups — **Partial** (A on groups; no pricing enforcement)
- Item/product linkage — **Partial**
- Price lists — **Partial** (A header UI; lines in store only)
- Discount schemes — **Partial** (store only)
- Tax configuration — **Partial**
- Salesperson / territory — **Partial**
- Commission structure — **Partial**

### 1.2 Pre-Sales
- Lead-to-quotation — **Have**
- Quotation versioning — **Partial**
- Quotation approval — **Partial**
- Quotation-to-order — **Have**
- Expiry & reminders — **Missing**

### 1.3 Order Management
- SO creation — **Have**
- Multi-level approval — **Missing**
- Credit limit check — **Partial** (B on SO)
- ATP / stock check — **Partial**
- Partial fulfillment / backorder — **Missing**
- Order amendment audit — **Partial**
- Blanket orders — **Missing**
- Split shipment — **Missing**

### 1.4–1.10 Pricing, Delivery, Invoicing, Returns, Collections, Analytics, Controls
See prior checklist — most **Partial** or **Missing** at industry depth. Strongest: document numbering, audit, RBAC, quote→SO, credit hold, AR aging.

---

## 2. PURCHASE MODULE

Strongest: **RFQ award → PO**, GRN → stock. Weakest: **requisition approval**, **bill 3-way match UI**, AP aging, vendor performance.

---

## 3. CRM MODULE

Strongest: **Deals kanban**, **customer 360**, lead convert/score. Weakest: **campaigns**, **contacts**, assignment rules, email/calendar.

---

## 4. CROSS-MODULE

- Stock visibility — **Partial**
- Auto GL — **Partial**
- Approval engine — **Missing** (`ops_approvals` unused)
- Notifications — **Missing**

---

## 5. HRM MODULE

Pelican/Workday breadth exists in **menus**; depth varies. **Payroll (PF/EOBI/tax)** is among the best (**B**). **Loans** is **A**. See case study and HRM fix table above.

---

## Recommended fix order (no new menus)

1. **HRM Loans** — policy, EMI, payroll deduction (template for other compensation features)
2. **Sales Price Lists** — line UI + wire into quotation lines
3. **Purchase Vendor Bills** — PO/GRN ids on form + tolerance settings
4. **Purchase Requisitions** — real submit/approve, convert to PO
5. **CRM Customer groups → Sales pricing** — enforcement chain
6. **Nav labels** — one pass on `lib/permissions.ts` for professional wording
7. Push migration + enable Supabase sync (enables multi-user truth)

---

## How to use this document

1. Pick one **existing menu** (start with Loans).
2. List gaps vs industry (policy, calc, integration, audit).
3. Implement fixes + migration on **same route**.
4. Mark menu **B** then **C** in this file.
5. Do **not** mark “complete” until payroll/finance/stock links work where applicable.
