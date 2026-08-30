# BusinessSuite — World ERP CRUD coverage

Last updated: **18 Aug 2026**  
Sources: existing BusinessSuite menus, [Gluon Finance](https://gluonerp.com/finance-management-system-gluon-erp/), [InstaCare HMS](https://instacare.com.pk/hospital-management-system-software-in-pakistan/), plus typical SAP / Odoo / Dynamics / Oracle NetSuite CRUD catalogs.

**Rule:** add extra menus. Do **not** remove existing routes.

**This round:** every item in **CRUD now** is a local list/form (create, edit, trash, extra fields, export). No email, SMS, bank APIs, or PACS.

---

## Third-party integrations (later — do not block CRUD)

| Integration | Why later |
|-------------|-----------|
| Email / SMTP / Outlook / Gmail | Lead, invoice, appointment reminders |
| SMS / WhatsApp | OPD queue, payment reminders |
| Bank statement auto-sync (OFX/API) | Gluon bank reconciliation import |
| Payment gateways (Stripe, JazzCash, Easypaisa) | Receipts / hospital billing |
| PACS / DICOM viewers | Radiology imaging |
| Biometric / device attendance | HR clock-in |
| E-invoicing (FBR / PEPPOL) | Tax authority |
| Calendar (Google / Outlook) | Appointments |
| Zoom / Meet | Telemedicine / interviews |
| Pharmacy drug databases | Formulary |
| Maps / geo-fence | Attendance |
| SIEM / immutable audit export | Compliance |
| One-click cloud backup vendor | InstaCare backup |

---

## Already in BusinessSuite (kept)

CRM, Sales, Procurement, Inventory, HRM, Documents, Finance (COA, expenses, income, journals, tax, P&L), Projects, BI, Administration.

---

## CRUD added this round

### Finance (Gluon-style)

| Menu | Route |
|------|--------|
| Banks | `/finance/banks` |
| Bank accounts | `/finance/bank-accounts` |
| Cheques / PDC | `/finance/cheques` |
| Bank reconciliation | `/finance/reconciliation` |
| Fiscal years | `/finance/fiscal-years` |
| Accounting periods | `/finance/periods` |
| Budgets | `/finance/budgets` |
| Voucher types | `/finance/voucher-types` |
| Withholding certificates | `/finance/withholding` |
| Currencies | `/finance/currencies` |
| Payment terms | `/finance/payment-terms` |
| Finance partners | `/finance/partners` |
| General ledger | `/finance/ledgers` |
| Trial balance | `/finance/trial-balance` |
| Balance sheet | `/finance/balance-sheet` |
| Cash flow | `/finance/cash-flow` |

### Purchases extra

| Debit notes | `/purchases/debit-notes` |

### Inventory extra

| Units of measure | `/inventory/uom` |
| Batches / lots | `/inventory/batches` |
| Serial numbers | `/inventory/serials` |
| Bins / locations | `/inventory/bins` |
| Brands | `/inventory/brands` |

### Operations (manufacturing, maintenance, quality, contracts)

| Bills of materials | `/operations/bom` |
| Work orders | `/operations/work-orders` |
| Maintenance orders | `/operations/maintenance` |
| Quality inspections | `/operations/inspections` |
| Contracts | `/operations/contracts` |
| Vehicles / fleet | `/operations/fleet` |
| Warranty claims | `/operations/warranties` |

### Healthcare (InstaCare-style HMS CRUD)

| Patients (UPMRN) | `/healthcare/patients` |
| Doctors | `/healthcare/doctors` |
| Appointments | `/healthcare/appointments` |
| OPD visits | `/healthcare/opd` |
| Wards | `/healthcare/wards` |
| Beds | `/healthcare/beds` |
| IPD admissions | `/healthcare/admissions` |
| Emergency / ED | `/healthcare/emergency` |
| Prescriptions | `/healthcare/prescriptions` |
| Pharmacy items | `/healthcare/pharmacy` |
| Dispensing | `/healthcare/dispensing` |
| Lab tests | `/healthcare/lab-tests` |
| Lab orders | `/healthcare/lab-orders` |
| Radiology orders | `/healthcare/radiology` |
| Diagnoses | `/healthcare/diagnoses` |
| EMR notes | `/healthcare/emr` |
| OT / surgeries | `/healthcare/ot` |
| Nursing notes | `/healthcare/nursing` |
| Vitals | `/healthcare/vitals` |
| Treatment plans | `/healthcare/treatment-plans` |
| Consents | `/healthcare/consents` |
| Insurance policies | `/healthcare/insurance` |
| Claims | `/healthcare/claims` |
| Infection control | `/healthcare/infection` |
| Quality / CQI | `/healthcare/quality` |
| Biomedical equipment | `/healthcare/equipment` |
| Duty rosters | `/healthcare/rosters` |
| CSSD logs | `/healthcare/cssd` |
| PHC audit checklist | `/healthcare/phc-audit` |
| Recycle bin | `/healthcare/recycle-bin` |

### Administration extra

| Third-party integrations (later list) | `/settings/integrations` |

---

## Implementation note (18 Aug 2026)

Local CRUD list/form pages are in the sidebar (create, edit, trash, extra fields, CSV/PDF). Existing CRM / Sales / Procurement / Inventory / HRM / Finance / Projects menus were **not** removed.

Statements (ledger, trial balance, balance sheet, cash flow) read posted journals. Email, SMS, bank feeds, PACS, and other vendors stay on **Administration → Third-party integrations** until those APIs are wired.

