# Warehouse + Data Warehouse Plan (BusinessSuite ERP)

**Stack:** Next.js App Router **SSR** — no PWA, no barcode app, no offline mode.  
**Scope:** Multi-tenant **warehouse / wholesale** for **all product types** + professional **Data Warehouse / BI** with **tenant-branded PDFs**.

---

## Implementation status (Data Warehouse)

| Phase | Deliverable | Status |
|---|---|---|
| **DW-1** | Multi-tenant warehouse query layer (`buildTenantWarehouse`) aggregating Sales, Inventory, Purchases, Finance, CRM, HRM | **Done** |
| **DW-2** | Shared tenant letterhead PDF engine (`tenant-pdf`) — logo, header, footer | **Done** |
| **DW-3** | Live `/reports` Report Center (not demo-data charts) + domain PDF downloads | **Done** |
| **DW-4** | Custom report → branded PDF (`/reports/custom`) | **Done** |
| **DW-5** | BI snapshots persist (`snapshots.store` + Report Center save/list). Supabase `bi_report_snapshots` + `bi_tenant_kpi_overview` migration ready | **Done** |
| **Ops-1** | Create forms: Products, Warehouses, Movements, Suppliers, POs, Quotations, Payments, Customers, Deals, Activities | **Done** |
| **Ops-2** | Missing nav routes (orders, GRN, categories, transfers, finance income/journals/taxes, CRM contacts/follow-ups, projects subpages) | **Done** |
| **Ops-3** | Traditional accordion sidebar (auto-expand + URL highlight) | **Done** |
| **Ops-4** | Line-item documents + GRN/SO/return stock posting | **Done** |

---

## Goals

1. Every report is **tenant-scoped** (`tenant_id` / session company).  
2. Data Warehouse reads **live operational modules** (all product types).  
3. Every PDF uses **tenant branding**: logo, letterhead title, address, phone, email, footer, brand color.  
4. Report Center covers Sales, Inventory, Purchases, Finance, CRM, HRM (+ executive pack).

---

## Out of scope

PWA · native mobile · camera barcode · offline POS · tobacco-only compliance (MSAi/.TOB) · industry lock-in.

---

## Architecture

```text
Session tenant_id
        │
        ▼
modules/reporting/services/data-warehouse.ts
  buildTenantWarehouse(tenantId)
  ├── sales (invoices, payments, quotations, AR)
  ├── inventory (products, stock, low stock, movements)
  ├── purchases (POs, suppliers)
  ├── finance (P&L, expenses)
  ├── crm (leads, customers, deals)
  └── hrm (employees, leaves, payroll)
        │
        ├──▶ /reports UI (live dashboards + saved snapshots)
        ├──▶ /reports/custom (domain picker → PDF / snapshot)
        └──▶ tenant-pdf.ts → branded PDF downloads
```

### Key files

| File | Role |
|---|---|
| `modules/reporting/model.ts` | Snapshot + branding types |
| `modules/reporting/services/tenant-branding.ts` | Letterhead from HRM company profile |
| `modules/reporting/services/data-warehouse.ts` | Tenant-scoped aggregation |
| `modules/reporting/services/tenant-pdf.ts` | Shared PDF letterhead helper |
| `modules/reporting/services/report-pdfs.ts` | Domain PDF exporters |
| `modules/reporting/services/snapshots.store.ts` | Persist/load BI snapshots (local; SQL optional) |
| `app/reports/page.tsx` | Report Center |
| `app/reports/custom/page.tsx` | Custom report v1 |
| `supabase/migrations/20260810000008_bi_data_warehouse.sql` | Cloud snapshot table + KPI view |

**Branding:** `getTenantBranding(tenantId)` from HRM company profile (+ fallback to demo tenant name). Set under **HRM → Company**.

---

## What we already have (ops)

| Area | Status |
|---|---|
| Multi-tenant shell + ACL | Done |
| Inventory products / warehouses / movements / low stock | Live stores + forms |
| Sales invoices / quotations / orders / returns / payments | Live stores + line items |
| Purchases suppliers / POs / GRN / bills / payments | Live stores + GRN stock post |
| Finance COA / expenses / income / journals / taxes / P&L | Live stores + forms |
| CRM customers / leads / deals / contacts / follow-ups | Live stores + forms |
| Projects / tasks / timesheets / reports | Live `projects.store` |
| Documents workspace | Done |
| HRM + company letterhead fields | Strong |
| `/reports` | **Live DW** + saved snapshots |
| Tenant extra form fields | **Done** — per-company extra fields after fixed form fields; answers stored as JSON (`ExtraFieldsBlock`, Admin → Extra form fields) |
| Record lifecycle | **Done** — confirm before save/update/trash/restore; search/sort/filter; CSV/PDF of filtered lists; soft-delete recycle bin (`/settings/recycle-bin`); audit log persistence |

---

## PDF branding standard

| Element | Source |
|---|---|
| Logo | `logo_data_url` |
| Title | `letterhead_title` or legal name |
| Contact block | address, phone, email, tax/NTN |
| Accent | `brand_color` |
| Footer | letterhead footer + page numbers |

---

## Phased rollout notes

### Phase DW-1–4 (shipped in app)
- Client-side warehouse over existing module stores
- No cross-tenant leakage: always filter by `getStoredTenantId()`
- PDFs never use a hard-coded company name

### Phase DW-5 (shipped in app + SQL ready)
1. Report Center **Save snapshot** persists KPIs via `snapshots.store` (localStorage).
2. Run migration `20260810000008_bi_data_warehouse.sql` when dual-writing to Postgres.
3. Use `bi_tenant_kpi_overview` for server dashboards when ops data is in Postgres.

### Ops data entry (shipped)
List pages include **Add** forms. Document lines on invoices, quotations, sales orders, returns, POs, GRNs, and vendor bills. **Fulfill SO** / **Post GRN** / **received return** post stock. Module hubs show **live tenant store** stats.

| Module | Forms / workflows |
|---|---|
| Inventory | Add product (+ category), warehouse, movement, transfer, adjustment |
| Purchases | Supplier, PO lines, GRN post-to-stock, vendor bill lines, payments |
| Sales | Quotation → SO, SO fulfill + invoice, invoice lines, return restock, payments |
| CRM | Lead, customer, contact, deal, activity, follow-up complete |
| Finance | Accounts, expenses, income, journals, taxes, P&L |
| Projects | Project, task, timesheet, reports |

### Optional later
- Stripe ACH / live payment gateway  
- Full Supabase dual-write for ops tables  
- Custom role builder UI beyond ACL matrices  

---

## Summary

| Lens | Decision |
|---|---|
| Platform | Next.js SSR, multi-tenant |
| Analytics | Professional Data Warehouse over **all** modules |
| Documents | Tenant-branded PDFs for every domain report |
| Vertical | All product types — not tobacco-specific |
