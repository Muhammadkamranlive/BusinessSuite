# HOSPITAL MANAGEMENT SYSTEM — MASTER AGENT BUILD SPECIFICATION
### Version 1.0 | Stack: Next.js + Supabase (Postgres/Auth/Storage) + Node.js backend services
### Purpose: This file is the single source of truth for AI coding agents (e.g., Claude Code) to build this project end-to-end. Treat every checklist item as a required deliverable, not a suggestion. Do not mark a module complete until every acceptance criterion under it is met.

---

## 0. HOW TO USE THIS FILE (AGENT INSTRUCTIONS)

1. Build in the phase order given in **Section 12**. Do not skip ahead to Phase 3 modules before Phase 1 acceptance criteria pass.
2. Every table that stores PHI/PII **must** have Row Level Security (RLS) enabled in Supabase before it is used in any API route — this is non-negotiable and blocks merge.
3. Every API route touching PHI must: authenticate → authorize (RBAC check) → validate input → write an audit log entry → return minimum-necessary data.
4. Never log PHI to console, error trackers, or analytics. Redact before logging.
5. Treat Section 2 (Compliance Guardrails) as constraints that apply to *every* module below, not a separate task.
6. After each module, run the acceptance criteria listed for it before proceeding.
7. Ask for human confirmation before: deleting patient data, disabling RLS, changing retention periods, or modifying audit log tables.

---

## 1. PROJECT OVERVIEW

**System:** Multi-branch Hospital Management System with web admin (Next.js) and mobile apps (patient + staff).

**Primary stack:**
- Frontend/Admin: Next.js (App Router), TypeScript, Tailwind CSS
- Backend services: Node.js (for workloads needing more than Supabase Edge Functions — e.g., HL7 parsing, PDF generation, third-party integrations)
- Database/Auth/Storage: Supabase (Postgres, Supabase Auth, Supabase Storage, Edge Functions)
- Mobile: React Native (patient app + staff app) — shares TypeScript types with backend
- Hosting: Vercel (Next.js) + Supabase (Team plan, HIPAA add-on enabled) + Node service on a container host with signed BAA

**Non-negotiable constraints:**
- HIPAA (if serving US patients/providers)
- GDPR (if serving EU data subjects)
- ISO/IEC 27001-aligned security architecture
- Full audit trail on all PHI access
- BAAs required with every subprocessor touching PHI (Supabase, Vercel, SMS/email provider, error monitoring, AI features if any)

---

## 2. COMPLIANCE GUARDRAILS (apply to every module)

- [ ] RLS enabled on 100% of tables containing PHI/PII
- [ ] All PHI encrypted at rest (Supabase handles this at infra level; verify config) and in transit (TLS enforced)
- [ ] MFA required for all staff/admin roles (patients: optional but recommended)
- [ ] RBAC enforced server-side on every API route (never trust client-side role checks alone)
- [ ] Audit log table capturing: user_id, action, table/record affected, timestamp, IP/device, before/after diff (for edits)
- [ ] Audit logs are append-only (no UPDATE/DELETE permission for any role, including admin, via RLS policy)
- [ ] Session timeout: 15 min idle for clinical staff sessions, configurable
- [ ] Break-glass emergency access flow: requires justification text field, triggers immediate alert to Security Officer, logged separately
- [ ] Consent capture and versioning table (every consent has effective_date, version, and linked document)
- [ ] GDPR Data Subject Access Request (DSAR) export endpoint — generates full patient data export in machine-readable format (JSON/CSV)
- [ ] GDPR erasure workflow — anonymizes (not hard-deletes) records under legal retention hold; hard-deletes only records with no retention obligation
- [ ] No PHI in URL query strings, client-side logs, or third-party analytics payloads
- [ ] Rate limiting on all public-facing API routes (login, booking, patient portal)
- [ ] Automated backup schedule (daily minimum) verified and documented
- [ ] Environment secrets (Supabase service key, API keys) never exposed to client bundle — verify via build output check

**Acceptance test for this section:** Run a full data-flow audit — list every table, mark PHI/non-PHI, confirm RLS policy exists for every PHI table, confirm audit logging fires on a test read/write.

---

## 3. USER ROLES & PERMISSIONS MATRIX

| Role | Patients Data | Clinical Records | Billing | Inventory | Staff/HR | Admin Config | Audit Logs |
|---|---|---|---|---|---|---|---|
| Super Admin | Full | Full | Full | Full | Full | Full | Read |
| Hospital Admin | Full (branch) | Read | Full (branch) | Full (branch) | Full (branch) | Branch config | Read (branch) |
| Doctor | Read/Write (assigned) | Full (assigned patients) | None | None | None | None | None |
| Nurse | Read/Write (assigned) | Read/Write (vitals, notes) | None | None | None | None | None |
| Receptionist | Read/Write (registration) | None | Create invoices | None | None | None | None |
| Lab Technician | Read (assigned orders) | Write (results only) | None | Read (lab stock) | None | None | None |
| Pharmacist | Read (assigned Rx) | Read (Rx only) | None | Full (pharmacy) | None | None | None |
| Billing Staff | Read | None | Full | None | None | None | None |
| Patient (mobile) | Own record only | Own record (read) | Own invoices (read/pay) | None | None | None | None |
| IT/Security Admin | None (no clinical access by default) | None | None | None | None | Full | Full |

**Acceptance criteria:** Implement as Postgres RLS policies keyed on `auth.uid()` + a `roles`/`role_assignments` table. Write a test suite that attempts cross-role access and confirms denial for every cell marked "None" above.

---

## 4. FUNCTIONAL MODULES — COMPLETE REQUIREMENTS

### 4.1 Authentication & User Management
- [ ] Email/password + OTP login (Supabase Auth)
- [ ] MFA (TOTP) for staff/admin roles — enforced, not optional
- [ ] Biometric login support on mobile (device-level, backed by secure token storage)
- [ ] Password policy: min 12 chars, complexity rules, rotation reminder every 90 days for staff
- [ ] Account lockout after 5 failed attempts, with admin-triggered unlock
- [ ] Role assignment workflow (admin assigns roles; changes are audit-logged)
- [ ] User de-provisioning workflow (immediate access revocation, device de-auth)
- [x] SSO support (optional, Phase 4) for enterprise hospital clients *(`/healthcare/sso` stub — **live IdP NOT done**)*

### 4.2 Patient Registration & Management
- [ ] New patient registration (walk-in, online via app, referral-based)
- [ ] Auto-generated unique MRN (Medical Record Number)
- [ ] Demographics: name, DOB, gender, address, phone, email, national ID, emergency contact
- [ ] Insurance details capture (payer, policy number, group number)
- [ ] Duplicate detection: fuzzy match on name + DOB + phone before creating new MRN
- [ ] Patient search: by MRN, name, phone, national ID, DOB
- [ ] Consent capture at registration (treatment consent, data-sharing consent) — versioned, timestamped, linked to signed document
- [ ] Family/dependent linking (guardian manages dependent's records)
- [ ] Patient merge tool (admin-only, for resolving duplicate records — must preserve full audit trail of the merge)

### 4.3 OPD (Outpatient) Management
- [ ] Token/queue generation and real-time queue display
- [ ] Doctor-wise and department-wise scheduling
- [ ] Visit history log per patient
- [ ] Vitals capture form (BP, temp, weight, height, SpO2, pulse)
- [ ] Consultation notes (structured + free text)
- [ ] Follow-up appointment scheduling directly from consultation screen

### 4.4 IPD (Inpatient) Management
- [ ] Admission workflow (from OPD referral or direct emergency admission)
- [ ] Bed/ward assignment with real-time availability
- [ ] Transfer workflow (ward-to-ward, with reason logging)
- [ ] Discharge workflow with discharge summary auto-generation (PDF)
- [ ] Nursing rounds charting (vitals, medication administration record - MAR)
- [ ] Mortality/death record handling with restricted access tier

### 4.5 Electronic Health Records (EHR/EMR)
- [ ] Structured clinical notes (SOAP format fields)
- [ ] Problem list (active/resolved), allergy list, current medication list — always reflects current state, historized on change
- [ ] ICD-10 diagnosis coding lookup/autocomplete
- [ ] Clinical decision support: drug-drug interaction check, drug-allergy check on prescribing
- [ ] File/document attachment (scanned referrals, external reports) via Supabase Storage with signed URLs (never public buckets)
- [ ] Full version history on every clinical note edit (no silent overwrites — append amendment, keep original visible)

### 4.6 Appointment & Scheduling
- [ ] Multi-doctor, multi-department, multi-branch calendar
- [ ] Online booking via patient mobile app
- [ ] Reschedule/cancel with audit trail and reason capture
- [ ] Automated reminders (push/SMS/email) respecting patient notification preferences
- [ ] Doctor leave/availability management
- [ ] Waitlist auto-fill when a slot opens

### 4.7 e-Prescribing
- [ ] Digital prescription creation (drug, dose, frequency, duration, route)
- [ ] Drug database integration with interaction/allergy checking
- [ ] Route to hospital pharmacy or export as printable/e-prescription for external pharmacy
- [ ] Full prescription history per patient, immutable once issued (corrections create a new linked record, not an edit)

### 4.8 Laboratory Management
- [ ] Lab order entry linked to patient encounter
- [ ] Barcode/QR sample tracking
- [ ] Manual result entry + HL7 interface hook for analyzer auto-import (stub interface acceptable in MVP, real integration in Phase 2)
- [ ] Critical value alerting (push notification to ordering physician)
- [ ] PDF report generation and secure delivery to patient app/portal

### 4.9 Radiology & Imaging
- [ ] Imaging order management (X-ray, CT, MRI, ultrasound)
- [ ] DICOM file storage reference (actual DICOM viewer can be a licensed third-party PACS viewer embedded via iframe/SDK — do not build a DICOM renderer from scratch)
- [ ] Radiologist reporting workflow with sign-off

### 4.10 Pharmacy Management
- [ ] Stock management with batch number and expiry date tracking
- [ ] Dispensing workflow tied to e-prescriptions
- [ ] Low-stock and near-expiry automated alerts
- [ ] Purchase order and supplier record management
- [ ] Drug interaction reference database

### 4.11 Billing, Invoicing & Insurance
- [ ] OPD/IPD itemized billing (consultation, procedure, room, pharmacy, lab charges auto-aggregated per encounter)
- [ ] Insurance eligibility check (stub/mock in MVP; real payer API integration in later phase)
- [ ] Claims generation (structure data per X12 837 or regional equivalent — actual submission integration is Phase 3)
- [ ] Payment gateway integration (Stripe/Razorpay or regional equivalent) — PCI-DSS scope isolated from PHI scope
- [ ] Refunds, discounts, credit note handling
- [ ] Tax-compliant invoice generation (region-configurable)

### 4.12 Inventory & Asset Management
- [ ] Medical equipment registry with maintenance schedule and alerts
- [x] General consumables inventory (separate from pharmacy stock) *(`/healthcare/consumables`)*
- [ ] Asset audit log

### 4.13 HR & Staff Management
- [ ] Staff onboarding profile (credentials, license number, license expiry alerts)
- [ ] Duty roster/shift scheduling
- [ ] Attendance and leave management
- [ ] Basic payroll data structure (full payroll processing can be a Phase 4/external integration)

### 4.14 Ward & Bed Management
- [ ] Real-time bed availability dashboard (by ward type: general/ICU/private)
- [ ] Housekeeping/turnaround status per bed

### 4.15 Ambulance & Emergency
- [ ] Ambulance dispatch record and GPS tracking (integration stub acceptable in MVP)
- [ ] Emergency intake fast-path (minimal-field registration, completed later)
- [ ] Triage priority flagging

### 4.16 Telemedicine
- [ ] Video consultation booking and session (via a compliant video SDK — verify the provider offers a BAA; do not use a generic non-healthcare video API for PHI-containing sessions)
- [ ] Post-consultation note capture, same EHR pipeline as in-person visits

### 4.17 Reporting & Analytics
- [ ] Operational dashboard (occupancy, revenue, patient flow, appointment no-show rate)
- [ ] Clinical/quality reports
- [ ] Custom report builder with PDF/Excel export
- [ ] Regulatory/public health report templates (region-configurable)

### 4.18 Notifications & Communication
- [ ] In-app secure messaging (patient↔doctor, staff↔staff) — encrypted at rest, no PHI in push notification payload body (use generic "New message" notification, PHI only visible after in-app auth)
- [ ] SMS/email/push engine with per-patient notification preference settings
- [ ] Result-ready, appointment, and billing alerts

### 4.19 Multi-Branch/Multi-Tenant
- [ ] Branch-level data isolation via RLS (tenant_id/branch_id on every table)
- [ ] Super-admin cross-branch reporting
- [ ] Cross-branch patient record sharing only with explicit consent flag

---

## 5. MOBILE APPLICATION REQUIREMENTS

### 5.1 Patient App
- [ ] Registration/login (OTP + biometric unlock)
- [ ] Book/reschedule/cancel appointments
- [ ] View EHR summary: prescriptions, lab reports, visit history
- [ ] Download reports as PDF
- [ ] Bill payment in-app
- [ ] Video consultation join
- [ ] Push notifications (generic content only, no PHI in payload)
- [ ] Secure messaging with care team
- [ ] Medication reminders
- [ ] Insurance card image upload
- [ ] Multi-language UI
- [ ] Family/dependent profile switching

### 5.2 Doctor/Staff App
- [ ] Daily schedule/queue view
- [ ] Patient chart access, read/write, with offline cache (encrypted local storage, synced on reconnect)
- [ ] e-Prescription creation
- [ ] Lab/imaging order placement and result viewing
- [ ] Secure staff messaging
- [ ] Critical result push alerts

### 5.3 Common Mobile Requirements
- [ ] App-level PIN/biometric lock in addition to account login
- [ ] Auto-logout after configurable idle period
- [ ] No PHI cached unencrypted on-device
- [ ] Remote session revocation / device de-authorization from admin panel
- [ ] Certificate pinning for API calls (prevent MITM)

---

## 6. NON-FUNCTIONAL REQUIREMENTS

- [ ] API response time < 2s under normal load; async/queued processing for report generation
- [ ] Horizontal scalability of Node services (stateless, containerized)
- [ ] 99.9% uptime target; documented RTO < 4h, RPO < 1h
- [ ] WCAG 2.1 AA accessibility on web and mobile
- [ ] Localization-ready (i18n framework from day one, not retrofitted)
- [ ] Automated daily backups with tested restore procedure (test restore quarterly minimum)

---

## 7. DATA MODEL — CORE ENTITIES

```
patients, patient_consents, encounters (opd/ipd), appointments,
clinical_notes, problem_list, allergy_list, medication_list,
lab_orders, lab_results, imaging_orders, imaging_reports,
prescriptions, prescription_items, pharmacy_stock,
invoices, invoice_line_items, payments, insurance_claims,
wards, beds, admissions, transfers, discharges,
staff, staff_roles, role_assignments, duty_roster,
inventory_items, equipment_assets,
branches/tenants, audit_logs, notifications, notification_preferences,
messages, message_threads, ambulance_dispatches
```

- [ ] Every table above has: `id (uuid)`, `created_at`, `updated_at`, `branch_id` (where applicable), and `created_by`/`updated_by` for audit traceability
- [ ] `audit_logs` table is append-only, indexed by `record_id` + `table_name` + `timestamp`
- [ ] Foreign keys enforced; no orphaned clinical records

---

## 8. API REQUIREMENTS

- [ ] RESTful API design (Next.js API routes / Node services), versioned (`/api/v1/...`)
- [ ] OpenAPI/Swagger documentation auto-generated and kept current
- [x] FHIR-compliant endpoints for external interoperability (Phase 3+) *(`GET /api/healthcare/fhir/Patient|Encounter` stub)*
- [ ] Every mutating endpoint validates input with a schema library (e.g., Zod) before touching the database
- [ ] Every endpoint returns only fields the caller's role is permitted to see (minimum-necessary principle) — do not rely solely on frontend filtering

---

## 9. INTEGRATIONS (mark BAA status before enabling PHI flow through each)

| Integration | Purpose | BAA Required? |
|---|---|---|
| Supabase (Team + HIPAA add-on) | DB/Auth/Storage | Yes — confirm signed before storing PHI |
| Vercel (Pro/Enterprise) | Next.js hosting | Yes — confirm signed before PHI touches edge/serverless functions |
| SMS/Email provider (e.g., Twilio) | Notifications | Yes, if message content includes PHI — prefer generic notification text |
| Payment gateway | Billing | PCI-DSS scope, not HIPAA — keep payment data separate from clinical data |
| Video consult SDK | Telemedicine | Yes — verify BAA before use |
| Error monitoring (e.g., Sentry) | Debugging | Configure PHI scrubbing; BAA if any chance of PHI in payloads |
| HL7/FHIR gateway | Lab/EHR interoperability | Yes, if third-party managed |

---

## 10. TESTING & QA REQUIREMENTS

- [ ] Unit + integration tests, 80%+ coverage on all PHI-handling code paths
- [ ] RLS policy test suite (attempt every "should be denied" access pattern from Section 3 matrix)
- [ ] OWASP Top 10 security testing pre-launch
- [ ] Load testing at expected peak concurrency
- [ ] Accessibility audit (automated + manual) before each release
- [ ] UAT sign-off per module before marking it production-ready

---

## 11. DEPLOYMENT & DEVOPS

- [ ] CI/CD pipeline with test gates (no merge to main without passing RLS + security tests)
- [ ] Staging environment with synthetic (non-real) patient data only — never copy production PHI to staging
- [ ] Infrastructure as code for reproducible environments
- [ ] Centralized logging with PHI redaction filter applied before logs leave the app boundary
- [ ] Alerting on error spikes, failed auth attempts, and anomalous data access patterns

---

## 12. BUILD PHASES (agent execution order)

### Phase 1 — MVP Core
Auth & roles → Patient registration → OPD scheduling → Basic EHR (notes, problem/allergy/med list) → Basic billing → Patient app (booking + record view) → Audit logging + RLS foundation

**Phase 1 acceptance gate:** All Section 2 compliance guardrails pass; Section 3 role matrix enforced and tested.

### Phase 2 — Clinical Depth
IPD management → e-Prescribing → Lab management → Pharmacy → Doctor/staff mobile app → Notifications engine

### Phase 3 — Financial & Interoperability
Insurance claims → Advanced billing → HL7/FHIR integration → Radiology/imaging → Telemedicine

### Phase 4 — Scale & Intelligence
Multi-branch/tenant → Analytics/BI dashboards → HR/payroll depth → Ambulance/emergency module → SSO

**Do not begin a phase until the prior phase's acceptance gate passes.**

---

## 13. DEFINITION OF DONE (per module)

A module is complete only when:
1. All functional checklist items under it are implemented
2. RLS policies exist and are tested for every table it touches
3. Audit logging fires correctly on create/update/delete
4. Unit + integration tests pass at required coverage
5. No PHI appears in logs, error trackers, or URLs (verified by manual review)
6. UAT checklist for that module is signed off

---

*End of specification. Agents should treat unchecked items as open work, not optional scope.*
