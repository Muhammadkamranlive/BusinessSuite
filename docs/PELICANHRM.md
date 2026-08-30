# PelicanHRM → BusinessSuite ERP (Multi-tenant)

**Source of truth:** `PelicanHRM.pdf` (Staff HRM Project) + existing ERP `/hrm`  
**Constraint:** Every HR entity is **tenant-scoped** (`tenant_id`). Entire ERP remains multi-tenant.  
**Reference clone:** ignored — implement against PDF + current app only.

---

## Staff HRM modules (from PDF)

| # | PDF module | ERP route(s) | Phase |
|---|------------|--------------|-------|
| 1 | Authentication / Authorization / MFA | `/settings/access`, `/hrm/security` | 1 |
| 2 | Company Management | `/hrm/company` (+ tenants) | 1–2 |
| 3 | Employee / Profile management | `/hrm/employees` | 3 |
| 4 | Recruitment / Onboard / Offboard | `/hrm/recruitment`, onboard/offboard flows | 3 |
| 5 | Attendance System | `/hrm/attendance` | 4 |
| 6 | Payroll Management | `/hrm/payroll` | 5 |
| 7 | Provident Fund | `/hrm/provident-fund` | 5 |
| 8 | Time Sheet | `/hrm/timesheets` | 4 |
| 9 | Leave Management | `/hrm/leaves`, leave types | 4 |
| 10 | Asset Management | `/hrm/assets` | 6 |
| 11 | Document Management | `/hrm/documents` (ENS-style: checklist, library, assign, types, recycle bin) | 3 |
| 12 | Reports & Analytics | `/hrm/reports` | 6 |
| 13 | Notifications | `/hrm/notifications` + admin notifications | 6 |
| 14 | Payment Gateway (optional) | `/hrm/payments` | 6 |
| 15 | Workflow integrations | `/hrm/workflows` | 6 |
| — | Admin Portal (super user) | `/settings/*` | exists |
| — | Designations / Shifts / Holidays (ERP + PK ops) | `/hrm/designations`, `/hrm/shifts`, `/hrm/holidays` | 2 |
| — | Loans / Disciplinary / EOBI (ops completeness) | `/hrm/loans`, `/hrm/disciplinary`, `/hrm/eobi` | 5–6 |

---

## Phases

### Phase 1 — Multi-tenant foundation
- Expand HR domain model (all entities carry `tenant_id`)
- Persist demo data per-tenant in store (localStorage) until Supabase Auth CRUD
- SQL migration for Pelican HR tables + RLS tenant policies
- HR security / MFA policy screen
- Menu registry + nav for all HR routes
- Live HR dashboard (tenant-scoped stats)

### Phase 2 — Organization masters
- Company HR profile
- Departments CRUD
- Designations CRUD
- Shifts CRUD
- Holidays CRUD

### Phase 3 — People lifecycle
- Employees full create/edit/view (PK-friendly profile fields)
- Recruitment pipeline (candidates → hire)
- Onboard / offboard checklists
- HR document vault

### Phase 4 — Time & leave
- Attendance mark / list / status
- Timesheets submit / approve
- Leave types + apply + approve/reject

### Phase 5 — Compensation
- Payroll runs (generate from employees)
- Provident Fund config + contributions
- EOBI config
- Loans apply / approve

### Phase 6 — Ops & platform extras
- Assets assign / return
- Disciplinary actions
- HR reports
- HR notifications
- Payment gateway stub
- Workflow integrations stub
- ACL gates on pages

---

## Multi-tenant rules (mandatory)

1. Every query filters by `tenant_id` from session (`getStoredTenantId`).
2. Seed data for `alpha` (and optionally `beta`) — switching tenant changes HR data.
3. SQL tables include `tenant_id` + RLS `tenant_isolation`.
4. No cross-tenant IDs in UI lists.

---

## Execution status

| Phase | Status |
|-------|--------|
| 1 Foundation | Done — model, store (`businesssuite:hrm:v1`), migration `20260808000004_pelican_hrm_schema.sql`, security page, live overview, full nav |
| 2 Org masters | Done — company, departments, designations, shifts, holidays |
| 3 People | Done — employees CRUD/detail, recruitment, documents, onboarding tasks on profile |
| 4 Time & leave | Done — attendance, timesheets, leave types + dual approve |
| 5 Compensation | Done — payroll generate/finalize, PF, EOBI, loans |
| 6 Ops extras | Done — assets, disciplinary, reports, notifications, payments, workflows |

**Pages:** 24 routes under `app/hrm/**`  
**Multi-tenant:** every store list/create filters by `tenant_id`; seed data for `alpha` + `beta`.  
**Nav UX:** Product-level sidebar drill-down — click **HRM** / **CRM** / **Data Warehouse** to open that product’s menus + Back. Documents is its own product. Breadcrumbs via `ModuleBreadcrumbs`.

### How to demo
1. Sign in with a company HR account from `DEMO_CREDENTIALS.txt` (not Super Admin)
2. Open **HRM** — overview stats are live from tenant store
3. Switch company/tenant in shell (if available) to see `beta` isolation
4. Walk PDF modules via HR menus: Recruitment → Attendance → Leaves → Payroll → PF → Assets → Security

### Hardening (wired — needs your API keys in `.env.local`)

| Area | Status | Env keys |
|------|--------|----------|
| HRM → Supabase tables | Dual-write + Push/Pull on `/hrm/security`; API `/api/hrm/sync` | `SUPABASE_SECRET_KEY`, `NEXT_PUBLIC_HRM_USE_SUPABASE` |
| MFA (Supabase Auth TOTP) | Enroll on `/hrm/security`; challenge `/login/mfa` | `SUPABASE_SECRET_KEY` (+ Auth enabled in project) |
| Stripe demo receipts | Test charges from `/hrm/payments` (not real employee ACH out) | `STRIPE_SECRET_KEY`, `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` |
| Zoom OAuth | Connect on `/hrm/workflows` | `ZOOM_CLIENT_ID`, `ZOOM_CLIENT_SECRET`, `ZOOM_REDIRECT_URI` |
| PDF salary slips / bank letters | Buttons on `/hrm/payroll` (jspdf) | none |
| Company letterhead + custom employee forms | `/hrm/company`, `/hrm/forms`, `/hrm/my-forms` | none (local demo store) |

Also run `npm run db:push` so Pelican HR migrations exist on the linked project.