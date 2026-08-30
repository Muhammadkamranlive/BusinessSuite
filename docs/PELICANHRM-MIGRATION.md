# PELICAN / Legacy HRM → BusinessSuite ERP (Next.js)

**Purpose:** Understand the old client HRM, capture full requirements, compare with BusinessSuite ERP today, and define an execution plan to rebuild it in a modern multi-tenant Next.js + Supabase stack so we can re-approach the client with a stronger product.

**Date:** 2026-08-08  
**Status:** Analysis complete — implementation not started

---

## 1. Source access notes

| Item | Result |
|------|--------|
| Requested repo | `https://github.com/Muhammadkamranlive/PELICANHRM.git` |
| Access | **404 / private** — not cloneable without auth |
| Public equivalent found | [`Muhammadkamranlive/HRM`](https://github.com/Muhammadkamranlive/HRM) |
| Stack of public HRM | ASP.NET Core MVC **.NET 7**, EF Core, **SQL Server**, Identity + Roles, SignalR, Bootstrap/jQuery |
| Solution name | `itgsgroup` (ITGS Group HRMS) |
| Local reference (this project) | `_reference/HRM-src/` — models, key controllers, Program.cs, DbContext |
| Full clone | Blocked / timed out (repo includes `bin/`, `obj/`, `packages/`, large `wwwroot`) |

> **Assumption for this doc:** `PELICANHRM` is the same (or white-labeled) codebase as public `HRM` / `itgsgroup`. If Pelican has extra private modules, re-run this analysis after you make the private repo cloneable (SSH key / PAT / zip drop into `_reference/PELICANHRM`).

---

## 2. What the old HRM already has (feature inventory)

### 2.1 Tech & architecture (legacy)

- Monolithic **MVC** app with Razor Views
- **ASP.NET Identity** users = employees (heavy `ApplicationUser` profile)
- **Company-scoped** masters (`companyId` on most tables)
- **SQL Server** + EF Code First + **SQL Views** for attendance/payroll reports
- Biometric / machine punch ingestion API (`ReceiveDataController`)
- Dual approval flags on requests: `status` + `hrstatus` (manager + HR)
- Pakistan-oriented payroll: **EOBI**, **PF**, **income tax slabs**, SESSI, bank letter, CPR

### 2.2 Controllers / modules (29)

| Module | Controller | What it does |
|--------|------------|--------------|
| Dashboard | `Home` | After-login HR vs employee dashboards |
| Employees | `Employee` | CRUD-ish profiles, active/resign lists, docs download, profile |
| Family | `EmpFamily` | Dependents + family documents |
| Company | `Company` | Multi-company master (NTN, sales tax, address, location) |
| Location | `Location` | Location master |
| Department | `Department` | Dept per company |
| Designation | `Designation` | Job titles per company |
| Shift | `Shift` | Shift from/to times |
| Fiscal year | `FascalYear` | FY periods for leave/tax |
| Leave types | `LeaveType` | Leave quotas by FY |
| Leave apply | `LeaveApply` | Apply / pending / approve / reject |
| Leave request inbox | `LeaveRequest` | Approval queue UI |
| Attendance | `Attendance` | Monthly detail, daily, reconciliation, deduction counts, leave counts |
| Raw punches | `ReceiveData` | Machine punch ingest (device → DB) |
| COAT | `COAT` / `COATRequest` | Correct attendance time requests + approval |
| Sandwich attendance | `SandwichAtt` | Sandwich rule exceptions |
| Holidays | `GazettedHoliday`, `CompanyHoliday` | Public + company holidays |
| Disciplinary | `DiciplinaryAction` | Actions that feed attendance deductions |
| Loans | `LoanApply`, `LoanRequest`, `LoanOpening` | Apply, approve, opening balance, ledger view |
| Salary breakup | `SalaryBreakup` | % components (basic, HRA, etc.) |
| Tax slabs | `Slabs` | Income tax brackets by FY |
| PF | `PF` | Provident fund % |
| EOBI | `EOBI` | EOBI amount by FY |
| Payroll | `PayRoll` | Generate payroll, finalize, salary slip, bank letter, tax certificate |
| Roles | `Roles` | Identity roles |
| Realtime | `Hub/` | SignalR notifications (scaffolded) |

### 2.3 Domain entities (DbSets)

`companies`, `departments`, `designations`, `shift`, `empDocs`, `empFamily`, `empFamilyDocs`, `fascalYears`, `salaryBreakup`, `locations`, `slabs`, `leaveTypes`, `LeaveNames`, `leaveApplies`, `loanApplies`, `loanOpenings`, `Correct_AttendTime` (COAT), `rawattendances`, `tempMonthAtts`, `diciplinaryActions`, `gazettedHolidays`, `companyHolidays`, `sandwichAtts`, `EOBIs`, `PFs`, `payRolls`

**SQL views:** Reconciliation, TempMonthAtt, DeductionCount, LeaveCount, Loan, empAttend, GetPakTime

### 2.4 Employee profile fields (legacy strength)

Emp ID, biometric `machineId`, name, father name, CNIC (+ issue/expiry), passport, current/permanent address, marital status, contact + emergency, joining/resignation, employment type, salary, bank + account, profile picture, attendance type, company / department / designation / shift / role, document uploads, family members + docs.

### 2.5 Payroll calculation surface (legacy)

Gross → basic / HRA / medical / conveyance / utility / food / other allowances → working days / day salary → attendance deduction → PF → EOBI → income tax → loan deduction → SESSI → other → arrears / bonus / taxable arrears → net salary + remarks + CPR. Outputs: salary slip, bank letter, income tax certificate.

### 2.6 Attendance engine (legacy)

- Raw device punches → monthly temp attendance
- Late / absent / half-day / early going / holiday / leave flags
- Reconciliation (working days vs Sundays/Saturdays/holidays/presents)
- Deduction count from late/absent/disciplinary
- COAT (correct punch time) workflow
- Sandwich attendance handling

### 2.7 What is *weak* in the old app (why Next.js rewrite wins)

- Single-tenant-ish company switch, not true SaaS multi-tenant + RLS
- Employee = Identity user tightly coupled (hard to scale RBAC)
- MVC + jQuery UX (dated vs modern ERP shell)
- SQL Server only; views mixed into EF awkwardly
- Incomplete SignalR; mixed ViewModels as DbSets
- Hard to sell as cloud SaaS / Upwork portfolio product
- No CRM / Inventory / Finance suite around HRM

---

## 3. Full requirements list (must deliver to match / beat old HRM)

Treat these as the **client acceptance checklist**. Priority: P0 = parity blockers, P1 = expected by HR teams in PK, P2 = differentiators / advanced.

### 3.1 Foundation (P0)

1. Multi-tenant company isolation (Supabase RLS)
2. Auth + roles: Super Admin, Company Admin, HR Manager, Manager, Employee, Viewer
3. Menu-level ACL: View / Create / Update / Delete (BusinessSuite model)
4. Audit log for HR mutations
5. Document numbering (employee no, leave no, payroll run no)
6. Fiscal year master per tenant
7. Locations + companies (map legacy company → tenant or branch)

### 3.2 Organization masters (P0)

8. Departments CRUD + manager
9. Designations CRUD
10. Shifts CRUD (start/end, grace, late threshold)
11. Holidays: gazetted + company calendars
12. Leave types + annual quotas by fiscal year

### 3.3 Employee lifecycle (P0)

13. Employee create / edit / deactivate / resign
14. Full PK profile: CNIC, addresses, bank, emergency contact, employment type
15. Biometric / machine ID mapping
16. Profile photo + document vault
17. Family / dependents + docs
18. Link user account ↔ employee (self-service portal)
19. Active vs resigned directories
20. Org assignment: dept, designation, shift, location

### 3.4 Attendance (P0 / P1)

21. Manual attendance entry + bulk
22. Raw punch import API (replace `ReceiveData`)
23. Daily attendance register
24. Monthly attendance sheet (late, absent, half-day, early leave, leave, holiday)
25. Attendance reconciliation report
26. Deduction count report (late/absent/disciplinary)
27. COAT — Correct Attendance Time request + HR/manager approval
28. Sandwich attendance rules / exceptions
29. Shift-aware late calculation (Pakistan time)

### 3.5 Leave (P0)

30. Employee leave apply
31. Leave balances by type / FY
32. Manager approval + HR approval (two-step)
33. Leave calendar / conflict checks
34. Leave count / utilization reports

### 3.6 Loans (P1)

35. Loan opening balances
36. Loan apply (amount, repayment, start date)
37. Dual approval (manager + HR)
38. Loan ledger (received / pay / balance)
39. Auto payroll loan deduction

### 3.7 Disciplinary (P1)

40. Disciplinary actions linked to employee + date
41. Feed into attendance deduction counts / payroll

### 3.8 Compensation & Pakistan statutory (P0 for this client)

42. Salary breakup templates (% components)
43. Income tax slabs by FY
44. PF % config
45. EOBI config
46. Payroll generate for month/year (all employees)
47. Attendance-linked deductions
48. Payroll finalize / lock
49. Salary slip PDF
50. Bank letter / payment file
51. Income tax certificate
52. Arrears, bonus, other additions/deductions, remarks, CPR

### 3.9 Self-service & UX (P1)

53. Employee dashboard (own attendance, leaves, payslips, loans)
54. HR dashboard (pending approvals, headcount, attendance %)
55. Notifications (in-app; optional email)
56. Mobile-responsive professional UI (BusinessSuite design system)
57. Global search + ACL-gated menus

### 3.10 Platform differentiators vs old app (P1 / P2) — “our own project”

58. Full ERP suite around HRM (CRM, Inventory, Sales, Purchase, Finance, Projects, Reports)
59. Public marketing site + CMS (blogs, menus, pages) already started
60. Theme / design tokens from Admin
61. Cloud deploy (Vercel) + Supabase Auth (not localStorage demo)
62. API-first HR services for future mobile app
63. Import/export CSV for employees & attendance
64. Optional: biometric vendor adapters, WhatsApp leave alerts

---

## 4. What BusinessSuite ERP already has (HRM today)

### 4.1 Routes / UI (demo layer)

| Route | Status |
|-------|--------|
| `/hrm` | Hub with **static** demo stats/charts (`lib/demo-data`) |
| `/hrm/employees` | List only |
| `/hrm/employees/[id]` | Read-only profile (few fields) |
| `/hrm/departments` | List only |
| `/hrm/attendance` | List only |
| `/hrm/leaves` | List + approve/reject (in-memory) |
| `/hrm/payroll` | Salary sum list only |
| `/hrm/designations` | **Missing page** (nav link exists) |

### 4.2 In-memory store (`modules/hrm/services/hrm.store.ts`)

- Departments, Employees (basic), Attendance, LeaveRequests
- `createEmployee` exists but **no UI**
- No designations, shifts, holidays, loans, PF, EOBI, tax, payroll runs, COAT, family, docs

### 4.3 SQL schema (exists, **not wired**)

Tables: `departments`, `employees`, `attendance`, `leave_requests`  
Missing: designations table (column exists without FK), payroll, leave policies, shifts, holidays, loans, etc.  
RLS incomplete for several HR tables.

### 4.4 Platform strengths we keep / sell

- Next.js App Router + Tailwind design system
- Multi-module ERP shell + menu registry ACL
- Admin: tenants, users, roles, access control, audit, theme, CMS
- Public login/signup for all roles
- Supabase project linked + migrations foundation

**Verdict:** ERP shell is strong; **HRM depth is ~20–30% of legacy** and mostly demo UI.

---

## 5. Gap matrix (legacy → ERP)

| Capability | Old HRM | ERP now | Gap |
|------------|---------|---------|-----|
| Dept / Designation / Shift | Full CRUD | Dept list only | Large |
| Employee PK profile + docs + family | Full | Basic fields | Large |
| Biometric punch ingest | Yes | No | Large |
| Monthly attendance engine | Yes + SQL views | Static list | Large |
| COAT / sandwich / holidays | Yes | No | Large |
| Leave apply + balances + dual approve | Yes | Approve only | Medium–Large |
| Loans | Yes | No | Large |
| Disciplinary | Yes | No | Medium |
| Salary breakup / tax / PF / EOBI | Yes | No | Large |
| Payroll generate + slips + bank letter | Yes | Fake list | Large |
| Roles / Identity | ASP.NET Identity | Demo ACL | Medium (rebuild on Supabase Auth) |
| Multi-company | companyId | tenants | Map carefully |
| Realtime notifications | SignalR partial | Notifications module demo | Medium |
| Surrounding ERP modules | HR-only | CRM…Finance present | **ERP advantage** |
| Modern SaaS UX / CMS / theme | No | Yes | **ERP advantage** |

---

## 6. Execution plan (phased)

### Phase A — Access & baseline (0.5–1 day)

1. Obtain private `PELICANHRM` (PAT/SSH or zip) → `_reference/PELICANHRM`
2. Diff against public `HRM`; update this MD if extras exist
3. Freeze client demo script (screenshots from old README + our ERP landing)

### Phase B — Domain model & migrations (3–5 days) — P0 schema

Extend Supabase business schema for HRM parity:

- `designations`, `shifts`, `locations`, `fiscal_years`
- Expand `employees` (CNIC, bank, machine_id, addresses, resignation, attend_type, …)
- `employee_documents`, `employee_families`, `family_documents`
- `holidays` (gazetted | company)
- `leave_types`, `leave_balances`, expand `leave_requests` (dual status, leave_type_id)
- `attendance_punches` (raw), keep `attendance` (daily summary)
- `coat_requests`, `sandwich_exceptions`, `disciplinary_actions`
- `loan_openings`, `loan_applications`, `loan_ledger`
- `salary_components`, `tax_slabs`, `pf_settings`, `eobi_settings`
- `payroll_runs`, `payroll_items`
- RLS policies + seed for demo tenant
- Register all menus in `lib/menu-registry.ts` with view/create/update/delete

### Phase C — HR services layer (Next.js) (4–6 days)

1. Replace `hrm.store` with Supabase repositories (`modules/hrm/services/*`)
2. Shared types in `modules/hrm/model.ts`
3. Server actions / API routes for mutations
4. Wire audit + numbering
5. Page-level `canMenu` gates on every HR screen

### Phase D — Masters & employees UI (4–6 days)

Ship professional CRUD under `/hrm/...`:

- Designations, Shifts, Fiscal years, Holidays, Leave types
- Employees: create/edit wizard, documents, family tabs, resign flow
- Departments with manager + headcount

### Phase E — Leave & attendance (5–8 days)

1. Leave apply (employee) + dual approval queues
2. Balances & leave reports
3. Attendance daily/monthly UI
4. Punch import endpoint (secure API key / device token)
5. Reconciliation + deduction reports
6. COAT + sandwich workflows

### Phase F — Pakistan payroll (6–10 days)

1. Salary breakup, slabs, PF, EOBI config screens
2. Payroll run generator (month close)
3. Preview → finalize → lock
4. Salary slip + bank letter + tax certificate (PDF)
5. Loan deduction integration

### Phase G — Self-service & polish (3–5 days)

1. Employee portal home
2. Notifications for approvals
3. CSV import/export
4. Replace demo hub stats with live queries
5. Performance + empty states + mobile layout

### Phase H — Auth & go-live (3–5 days)

1. Move from localStorage demo session → **Supabase Auth**
2. Map roles to ACL
3. Deploy Vercel + production Supabase
4. Client demo environment + sample PK data
5. Proposal deck: “Modern cloud HRM + full ERP”

### Suggested order to approach the client

1. **Week 1–2:** Phases A–D → show org + employee parity UI in ERP shell  
2. **Week 3–4:** Phase E → attendance/leave demo with punch import story  
3. **Week 5–6:** Phase F → payroll slip/bank letter (client’s money path)  
4. **Week 7:** Phase G–H → cloud login + proposal  

---

## 7. Product positioning (how we pitch)

**Old:** On-prem ASP.NET MVC HRM (SQL Express), company-scoped, Pakistan payroll-ready, biometric ingest.  
**New (ours):** Same HR depth (or better) **inside** BusinessSuite ERP Cloud — multi-tenant, RBAC menu rights, modern UI, CMS, and upsell path to CRM / Inventory / Finance.

Client message:

> We rebuilt your HRM workflows on a cloud ERP foundation: employees, attendance (including device punches), dual-approval leave, loans, and full Pakistan payroll (PF, EOBI, tax slabs, slips, bank letter) — plus room to grow into a full suite.

---

## 8. Immediate next actions for you

1. **Make `PELICANHRM` accessible** (prefer zip into `_reference/PELICANHRM` if GitHub stays private).
2. Confirm whether public `HRM`/`itgsgroup` is 100% the same codebase.
3. Confirm must-have for first client demo: **(a)** employees+leave, **(b)** attendance+punches, **(c)** full payroll — pick 1–2 for sprint 1.
4. Say **“start Phase B”** when ready to implement schema + menus.

---

## 9. Reference paths in this repo

| Path | Contents |
|------|----------|
| `_reference/HRM-src/` | Extracted models + key controllers from public HRM |
| `app/hrm/` | Current ERP HRM pages |
| `modules/hrm/` | Current in-memory HRM store |
| `database/business-schema.sql` / `supabase/migrations/` | Existing HR tables |
| `lib/menu-registry.ts` / `lib/permissions.ts` | Menu ACL |

---

*Document generated for BusinessSuite ERP Cloud migration planning. Update section 1–2 after private PELICANHRM is available.*
