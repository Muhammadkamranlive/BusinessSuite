import type { ModuleKey } from "@/lib/permissions";

export type CatalogFieldKind = "text" | "number" | "date" | "select" | "textarea";

export type CatalogField = {
  key: string;
  label: string;
  kind: CatalogFieldKind;
  required?: boolean;
  options?: string[];
  search?: boolean;
};

export type CatalogSpec = {
  slug: string;
  module: ModuleKey;
  entityName: string;
  formKey: string;
  title: string;
  description: string;
  fields: CatalogField[];
  statusOptions: string[];
};

function F(key: string, label: string, kind: CatalogFieldKind = "text", extra: Partial<CatalogField> = {}): CatalogField {
  return { key, label, kind, search: kind === "text", ...extra };
}

export const catalogSpecs: CatalogSpec[] = [
  {
    slug: "finance.banks",
    module: "finance",
    entityName: "bank",
    formKey: "finance.bank",
    title: "Banks",
    description: "Bank masters for accounts, cheques, and reconciliation.",
    statusOptions: ["active", "inactive"],
    fields: [F("code", "Code", "text", { required: true }), F("name", "Bank name", "text", { required: true }), F("swift", "SWIFT / BIC"), F("country", "Country")]
  },
  {
    slug: "finance.bank_accounts",
    module: "finance",
    entityName: "bank_account",
    formKey: "finance.bank_account",
    title: "Bank accounts",
    description: "Company bank accounts linked to cash and GL.",
    statusOptions: ["active", "inactive"],
    fields: [F("code", "Account code", "text", { required: true }), F("name", "Account title", "text", { required: true }), F("bank_name", "Bank"), F("account_no", "Account number"), F("iban", "IBAN"), F("currency", "Currency"), F("gl_account", "GL account")]
  },
  {
    slug: "finance.cheques",
    module: "finance",
    entityName: "cheque",
    formKey: "finance.cheque",
    title: "Cheques / PDC",
    description: "Post-dated and issued cheques (Gluon-style PDC register).",
    statusOptions: ["open", "deposited", "cleared", "bounced", "cancelled"],
    fields: [F("cheque_no", "Cheque no", "text", { required: true }), F("party_name", "Party", "text", { required: true }), F("cheque_date", "Cheque date", "date", { required: true }), F("amount", "Amount", "number", { required: true }), F("bank_name", "Bank"), F("type", "Type", "select", { options: ["received", "issued"] }), F("notes", "Notes", "textarea")]
  },
  {
    slug: "finance.reconciliation",
    module: "finance",
    entityName: "bank_reconciliation",
    formKey: "finance.reconciliation",
    title: "Bank reconciliation",
    description: "Statement vs book balance. File import is a later integration.",
    statusOptions: ["draft", "in_progress", "matched", "closed"],
    fields: [F("statement_date", "Statement date", "date", { required: true }), F("bank_account", "Bank account", "text", { required: true }), F("statement_balance", "Statement balance", "number"), F("book_balance", "Book balance", "number"), F("notes", "Notes", "textarea")]
  },
  {
    slug: "finance.fiscal_years",
    module: "finance",
    entityName: "fiscal_year",
    formKey: "finance.fiscal_year",
    title: "Fiscal years",
    description: "Company financial years for period close.",
    statusOptions: ["open", "closed"],
    fields: [F("code", "Year code", "text", { required: true }), F("name", "Name", "text", { required: true }), F("start_date", "Start", "date", { required: true }), F("end_date", "End", "date", { required: true })]
  },
  {
    slug: "finance.periods",
    module: "finance",
    entityName: "accounting_period",
    formKey: "finance.period",
    title: "Accounting periods",
    description: "Monthly or quarterly books periods.",
    statusOptions: ["open", "soft_closed", "closed"],
    fields: [F("code", "Period", "text", { required: true }), F("fiscal_year", "Fiscal year"), F("start_date", "Start", "date"), F("end_date", "End", "date")]
  },
  {
    slug: "finance.budgets",
    module: "finance",
    entityName: "budget",
    formKey: "finance.budget",
    title: "Budgets",
    description: "Account / cost-center budget vs actual planning.",
    statusOptions: ["draft", "approved", "closed"],
    fields: [F("name", "Budget name", "text", { required: true }), F("period", "Period"), F("account_name", "Account"), F("cost_center", "Cost center"), F("amount", "Amount", "number", { required: true })]
  },
  {
    slug: "finance.voucher_types",
    module: "finance",
    entityName: "voucher_type",
    formKey: "finance.voucher_type",
    title: "Voucher types",
    description: "JV, BP, BR, CP, CR numbering classes.",
    statusOptions: ["active", "inactive"],
    fields: [F("code", "Code", "text", { required: true }), F("name", "Name", "text", { required: true }), F("prefix", "Number prefix")]
  },
  {
    slug: "finance.withholding",
    module: "finance",
    entityName: "withholding_certificate",
    formKey: "finance.withholding",
    title: "Withholding certificates",
    description: "WHT / tax deduction certificates (FBR filing is later).",
    statusOptions: ["draft", "issued", "filed"],
    fields: [F("cert_no", "Certificate no", "text", { required: true }), F("party_name", "Party", "text", { required: true }), F("section", "Tax section"), F("amount", "Amount", "number"), F("cert_date", "Date", "date")]
  },
  {
    slug: "finance.currencies",
    module: "finance",
    entityName: "currency",
    formKey: "finance.currency",
    title: "Currencies",
    description: "Currency masters and manual rates (live FX feed is later).",
    statusOptions: ["active", "inactive"],
    fields: [F("code", "ISO code", "text", { required: true }), F("name", "Name", "text", { required: true }), F("symbol", "Symbol"), F("rate", "Rate to PKR", "number")]
  },
  {
    slug: "finance.payment_terms",
    module: "finance",
    entityName: "payment_term",
    formKey: "finance.payment_term",
    title: "Payment terms",
    description: "Net 15 / Net 30 terms used on AR and AP.",
    statusOptions: ["active", "inactive"],
    fields: [F("code", "Code", "text", { required: true }), F("name", "Name", "text", { required: true }), F("days", "Days", "number")]
  },
  {
    slug: "finance.partners",
    module: "finance",
    entityName: "finance_partner",
    formKey: "finance.partner",
    title: "Finance partners",
    description: "Parties for vouchers (customers and suppliers remain in their modules).",
    statusOptions: ["active", "inactive"],
    fields: [F("code", "Code", "text", { required: true }), F("name", "Name", "text", { required: true }), F("kind", "Kind", "select", { options: ["customer", "supplier", "employee", "other"] }), F("tax_no", "NTN / tax no"), F("phone", "Phone")]
  },
  {
    slug: "purchases.debit_notes",
    module: "purchases",
    entityName: "debit_note",
    formKey: "purchases.debit_note",
    title: "Debit notes",
    description: "Supplier debit notes / charge-backs.",
    statusOptions: ["open", "applied", "cancelled"],
    fields: [F("note_no", "Note no", "text", { required: true }), F("supplier_name", "Supplier", "text", { required: true }), F("bill_no", "Against bill"), F("note_date", "Date", "date"), F("amount", "Amount", "number", { required: true }), F("reason", "Reason", "textarea")]
  },
  {
    slug: "inventory.uom",
    module: "inventory",
    entityName: "uom",
    formKey: "inventory.uom",
    title: "Units of measure",
    description: "UOM catalog (pcs, kg, box).",
    statusOptions: ["active", "inactive"],
    fields: [F("code", "Code", "text", { required: true }), F("name", "Name", "text", { required: true }), F("ratio", "Base ratio", "number")]
  },
  {
    slug: "inventory.batches",
    module: "inventory",
    entityName: "batch",
    formKey: "inventory.batch",
    title: "Batches / lots",
    description: "Lot numbers and expiry (pharmacy-ready).",
    statusOptions: ["active", "expired", "quarantine"],
    fields: [F("batch_no", "Batch no", "text", { required: true }), F("product_name", "Product", "text", { required: true }), F("qty", "Quantity", "number"), F("mfg_date", "Mfg date", "date"), F("expiry_date", "Expiry", "date"), F("warehouse", "Warehouse")]
  },
  {
    slug: "inventory.serials",
    module: "inventory",
    entityName: "serial",
    formKey: "inventory.serial",
    title: "Serial numbers",
    description: "Serialized items and asset tags.",
    statusOptions: ["in_stock", "sold", "returned", "scrapped"],
    fields: [F("serial_no", "Serial no", "text", { required: true }), F("product_name", "Product", "text", { required: true }), F("warehouse", "Warehouse")]
  },
  {
    slug: "inventory.bins",
    module: "inventory",
    entityName: "bin",
    formKey: "inventory.bin",
    title: "Bins / locations",
    description: "Putaway bins inside a warehouse.",
    statusOptions: ["active", "inactive"],
    fields: [F("code", "Bin code", "text", { required: true }), F("warehouse", "Warehouse", "text", { required: true }), F("zone", "Zone"), F("aisle", "Aisle")]
  },
  {
    slug: "inventory.brands",
    module: "inventory",
    entityName: "brand",
    formKey: "inventory.brand",
    title: "Brands",
    description: "Product brand masters.",
    statusOptions: ["active", "inactive"],
    fields: [F("code", "Code", "text", { required: true }), F("name", "Brand name", "text", { required: true })]
  },
  {
    slug: "operations.bom",
    module: "operations",
    entityName: "bom",
    formKey: "operations.bom",
    title: "Bills of materials",
    description: "Finished item and component list.",
    statusOptions: ["draft", "active", "obsolete"],
    fields: [F("code", "BOM code", "text", { required: true }), F("finished_item", "Finished item", "text", { required: true }), F("component", "Component"), F("qty", "Qty", "number"), F("uom", "UOM")]
  },
  {
    slug: "operations.work_orders",
    module: "operations",
    entityName: "work_order",
    formKey: "operations.work_order",
    title: "Work orders",
    description: "Manufacturing / assembly orders.",
    statusOptions: ["planned", "released", "in_progress", "done", "cancelled"],
    fields: [F("wo_no", "WO no", "text", { required: true }), F("item", "Item", "text", { required: true }), F("qty", "Qty", "number"), F("due_date", "Due", "date"), F("notes", "Notes", "textarea")]
  },
  {
    slug: "operations.maintenance",
    module: "operations",
    entityName: "maintenance_order",
    formKey: "operations.maintenance",
    title: "Maintenance orders",
    description: "Preventive and breakdown maintenance.",
    statusOptions: ["open", "scheduled", "done", "cancelled"],
    fields: [F("order_no", "Order no", "text", { required: true }), F("asset_name", "Asset / equipment", "text", { required: true }), F("kind", "Kind", "select", { options: ["preventive", "breakdown", "calibration"] }), F("due_date", "Due", "date"), F("notes", "Notes", "textarea")]
  },
  {
    slug: "operations.inspections",
    module: "operations",
    entityName: "quality_inspection",
    formKey: "operations.inspection",
    title: "Quality inspections",
    description: "Incoming / in-process / outgoing QC.",
    statusOptions: ["pending", "passed", "failed", "hold"],
    fields: [F("insp_no", "Inspection no", "text", { required: true }), F("item", "Item", "text", { required: true }), F("stage", "Stage", "select", { options: ["incoming", "in_process", "outgoing"] }), F("result_notes", "Notes", "textarea")]
  },
  {
    slug: "operations.contracts",
    module: "operations",
    entityName: "contract",
    formKey: "operations.contract",
    title: "Contracts",
    description: "Customer / vendor / AMC contracts.",
    statusOptions: ["draft", "active", "expired", "terminated"],
    fields: [F("contract_no", "Contract no", "text", { required: true }), F("title", "Title", "text", { required: true }), F("party_name", "Party"), F("kind", "Kind", "select", { options: ["customer", "vendor", "amc", "lease"] }), F("start_date", "Start", "date"), F("end_date", "End", "date"), F("value", "Value", "number")]
  },
  {
    slug: "operations.fleet",
    module: "operations",
    entityName: "vehicle",
    formKey: "operations.fleet",
    title: "Vehicles / fleet",
    description: "Company vehicles and registration.",
    statusOptions: ["active", "in_shop", "retired"],
    fields: [F("reg_no", "Registration", "text", { required: true }), F("make", "Make"), F("model", "Model"), F("year", "Year"), F("driver", "Driver")]
  },
  {
    slug: "operations.warranties",
    module: "operations",
    entityName: "warranty_claim",
    formKey: "operations.warranty",
    title: "Warranty claims",
    description: "Customer or vendor warranty claims.",
    statusOptions: ["open", "approved", "rejected", "closed"],
    fields: [F("claim_no", "Claim no", "text", { required: true }), F("product_name", "Product", "text", { required: true }), F("party_name", "Party"), F("claim_date", "Date", "date"), F("notes", "Notes", "textarea")]
  },
  {
    slug: "healthcare.patients",
    module: "healthcare",
    entityName: "patient",
    formKey: "healthcare.patient",
    title: "Patients",
    description: "UPMRN-style patient master (InstaCare registration).",
    statusOptions: ["active", "inactive", "deceased"],
    fields: [F("mrn", "MRN / UPMRN", "text", { required: true }), F("full_name", "Full name", "text", { required: true }), F("gender", "Gender", "select", { options: ["male", "female", "other"] }), F("dob", "Date of birth", "date"), F("phone", "Phone", "text", { required: true }), F("cnic", "CNIC"), F("blood_group", "Blood group"), F("address", "Address", "textarea")]
  },
  {
    slug: "healthcare.doctors",
    module: "healthcare",
    entityName: "doctor",
    formKey: "healthcare.doctor",
    title: "Doctors",
    description: "Consultant directory and specialties.",
    statusOptions: ["active", "inactive"],
    fields: [F("code", "Code", "text", { required: true }), F("full_name", "Name", "text", { required: true }), F("specialty", "Specialty", "text", { required: true }), F("pmc_no", "PMC no"), F("phone", "Phone"), F("fee", "Consult fee", "number")]
  },
  {
    slug: "healthcare.appointments",
    module: "healthcare",
    entityName: "appointment",
    formKey: "healthcare.appointment",
    title: "Appointments",
    description: "Clinic booking and no-show tracking (reminders later).",
    statusOptions: ["booked", "checked_in", "completed", "no_show", "cancelled"],
    fields: [F("patient_name", "Patient", "text", { required: true }), F("doctor_name", "Doctor", "text", { required: true }), F("appt_date", "Date", "date", { required: true }), F("appt_time", "Time"), F("reason", "Reason")]
  },
  {
    slug: "healthcare.opd",
    module: "healthcare",
    entityName: "opd_visit",
    formKey: "healthcare.opd",
    title: "OPD visits",
    description: "Outpatient encounters and queue token.",
    statusOptions: ["waiting", "in_consult", "done", "cancelled"],
    fields: [F("visit_no", "Visit no", "text", { required: true }), F("patient_name", "Patient", "text", { required: true }), F("doctor_name", "Doctor"), F("visit_date", "Date", "date"), F("token_no", "Token"), F("chief_complaint", "Chief complaint", "textarea")]
  },
  {
    slug: "healthcare.wards",
    module: "healthcare",
    entityName: "ward",
    formKey: "healthcare.ward",
    title: "Wards",
    description: "IPD ward masters.",
    statusOptions: ["active", "inactive"],
    fields: [F("code", "Code", "text", { required: true }), F("name", "Ward name", "text", { required: true }), F("floor", "Floor"), F("gender", "Gender mix", "select", { options: ["mixed", "male", "female", "pediatric"] })]
  },
  {
    slug: "healthcare.beds",
    module: "healthcare",
    entityName: "bed",
    formKey: "healthcare.bed",
    title: "Beds",
    description: "Bed allocation inventory.",
    statusOptions: ["vacant", "occupied", "blocked", "maintenance"],
    fields: [F("bed_no", "Bed no", "text", { required: true }), F("ward", "Ward", "text", { required: true }), F("kind", "Kind", "select", { options: ["general", "private", "icu", "nicu"] })]
  },
  {
    slug: "healthcare.admissions",
    module: "healthcare",
    entityName: "admission",
    formKey: "healthcare.admission",
    title: "IPD admissions",
    description: "Admit, stay, and discharge.",
    statusOptions: ["admitted", "transferred", "discharged", "absconded"],
    fields: [F("adm_no", "Admission no", "text", { required: true }), F("patient_name", "Patient", "text", { required: true }), F("ward", "Ward"), F("bed_no", "Bed"), F("admit_date", "Admit date", "date"), F("discharge_date", "Discharge date", "date"), F("diagnosis", "Diagnosis")]
  },
  {
    slug: "healthcare.emergency",
    module: "healthcare",
    entityName: "ed_case",
    formKey: "healthcare.emergency",
    title: "Emergency / ED",
    description: "Triage and urgent cases.",
    statusOptions: ["triage", "treatment", "admitted", "discharged", "referred"],
    fields: [F("case_no", "Case no", "text", { required: true }), F("patient_name", "Patient", "text", { required: true }), F("triage", "Triage", "select", { options: ["red", "yellow", "green", "black"] }), F("arrival", "Arrival", "date"), F("notes", "Notes", "textarea")]
  },
  {
    slug: "healthcare.prescriptions",
    module: "healthcare",
    entityName: "prescription",
    formKey: "healthcare.prescription",
    title: "Prescriptions",
    description: "e-Prescription header (pharmacy dispense is separate).",
    statusOptions: ["draft", "signed", "dispensed", "cancelled"],
    fields: [F("rx_no", "Rx no", "text", { required: true }), F("patient_name", "Patient", "text", { required: true }), F("doctor_name", "Doctor"), F("rx_date", "Date", "date"), F("medicines", "Medicines", "textarea")]
  },
  {
    slug: "healthcare.pharmacy",
    module: "healthcare",
    entityName: "pharmacy_item",
    formKey: "healthcare.pharmacy",
    title: "Pharmacy items",
    description: "Drug master, expiry, and reorder.",
    statusOptions: ["active", "inactive", "controlled"],
    fields: [F("sku", "SKU", "text", { required: true }), F("name", "Drug name", "text", { required: true }), F("strength", "Strength"), F("form", "Form", "select", { options: ["tablet", "syrup", "injection", "cream", "other"] }), F("qty", "Qty on hand", "number"), F("expiry_date", "Expiry", "date"), F("reorder_level", "Reorder", "number")]
  },
  {
    slug: "healthcare.dispensing",
    module: "healthcare",
    entityName: "dispense",
    formKey: "healthcare.dispense",
    title: "Dispensing",
    description: "Pharmacy issue against prescription.",
    statusOptions: ["pending", "issued", "returned"],
    fields: [F("issue_no", "Issue no", "text", { required: true }), F("patient_name", "Patient", "text", { required: true }), F("rx_no", "Rx no"), F("drug_name", "Drug"), F("qty", "Qty", "number"), F("issue_date", "Date", "date")]
  },
  {
    slug: "healthcare.lab_tests",
    module: "healthcare",
    entityName: "lab_test",
    formKey: "healthcare.lab_test",
    title: "Lab tests",
    description: "LIS test catalog.",
    statusOptions: ["active", "inactive"],
    fields: [F("code", "Code", "text", { required: true }), F("name", "Test name", "text", { required: true }), F("specimen", "Specimen"), F("turnaround_hours", "TAT hours", "number"), F("price", "Price", "number")]
  },
  {
    slug: "healthcare.lab_orders",
    module: "healthcare",
    entityName: "lab_order",
    formKey: "healthcare.lab_order",
    title: "Lab orders",
    description: "Sample tracking and result entry.",
    statusOptions: ["ordered", "collected", "in_lab", "reported", "cancelled"],
    fields: [F("order_no", "Order no", "text", { required: true }), F("patient_name", "Patient", "text", { required: true }), F("test_name", "Test"), F("order_date", "Date", "date"), F("result", "Result", "textarea")]
  },
  {
    slug: "healthcare.radiology",
    module: "healthcare",
    entityName: "radiology_order",
    formKey: "healthcare.radiology",
    title: "Radiology orders",
    description: "Imaging requests (PACS viewer is later).",
    statusOptions: ["ordered", "performed", "reported", "cancelled"],
    fields: [F("order_no", "Order no", "text", { required: true }), F("patient_name", "Patient", "text", { required: true }), F("modality", "Modality", "select", { options: ["xray", "ultrasound", "ct", "mri", "other"] }), F("order_date", "Date", "date"), F("findings", "Findings", "textarea")]
  },
  {
    slug: "healthcare.diagnoses",
    module: "healthcare",
    entityName: "diagnosis",
    formKey: "healthcare.diagnosis",
    title: "Diagnoses",
    description: "ICD-style diagnosis register per patient.",
    statusOptions: ["active", "resolved"],
    fields: [F("patient_name", "Patient", "text", { required: true }), F("icd_code", "ICD code"), F("description", "Description", "text", { required: true }), F("diagnosed_on", "Date", "date")]
  },
  {
    slug: "healthcare.emr",
    module: "healthcare",
    entityName: "emr_note",
    formKey: "healthcare.emr",
    title: "EMR notes",
    description: "Visit notes and history (not a third-party EHR).",
    statusOptions: ["draft", "signed"],
    fields: [F("patient_name", "Patient", "text", { required: true }), F("note_date", "Date", "date"), F("author", "Author"), F("note", "Clinical note", "textarea", { required: true })]
  },
  {
    slug: "healthcare.ot",
    module: "healthcare",
    entityName: "surgery",
    formKey: "healthcare.ot",
    title: "OT / surgeries",
    description: "Theatre scheduling and surgical notes.",
    statusOptions: ["scheduled", "in_ot", "completed", "cancelled"],
    fields: [F("ot_no", "OT case no", "text", { required: true }), F("patient_name", "Patient", "text", { required: true }), F("procedure", "Procedure", "text", { required: true }), F("surgeon", "Surgeon"), F("ot_date", "Date", "date"), F("notes", "Notes", "textarea")]
  },
  {
    slug: "healthcare.nursing",
    module: "healthcare",
    entityName: "nursing_note",
    formKey: "healthcare.nursing",
    title: "Nursing notes",
    description: "Ward nursing documentation and handover.",
    statusOptions: ["open", "handed_over"],
    fields: [F("patient_name", "Patient", "text", { required: true }), F("ward", "Ward"), F("shift", "Shift", "select", { options: ["morning", "evening", "night"] }), F("note_date", "Date", "date"), F("note", "Note", "textarea", { required: true })]
  },
  {
    slug: "healthcare.vitals",
    module: "healthcare",
    entityName: "vital",
    formKey: "healthcare.vital",
    title: "Vitals",
    description: "BP, pulse, temp, SpO2.",
    statusOptions: ["recorded"],
    fields: [F("patient_name", "Patient", "text", { required: true }), F("taken_at", "Taken at", "date"), F("bp", "BP"), F("pulse", "Pulse"), F("temp", "Temp"), F("spo2", "SpO2")]
  },
  {
    slug: "healthcare.treatment_plans",
    module: "healthcare",
    entityName: "treatment_plan",
    formKey: "healthcare.treatment_plan",
    title: "Treatment plans",
    description: "Structured plan with cost estimate.",
    statusOptions: ["draft", "active", "completed"],
    fields: [F("plan_no", "Plan no", "text", { required: true }), F("patient_name", "Patient", "text", { required: true }), F("title", "Title", "text", { required: true }), F("estimate", "Cost estimate", "number"), F("details", "Details", "textarea")]
  },
  {
    slug: "healthcare.consents",
    module: "healthcare",
    entityName: "consent",
    formKey: "healthcare.consent",
    title: "Consents",
    description: "Informed consent register (e-sign later).",
    statusOptions: ["pending", "signed", "withdrawn"],
    fields: [F("patient_name", "Patient", "text", { required: true }), F("consent_type", "Type", "text", { required: true }), F("consent_date", "Date", "date"), F("witness", "Witness"), F("notes", "Notes", "textarea")]
  },
  {
    slug: "healthcare.insurance",
    module: "healthcare",
    entityName: "insurance_policy",
    formKey: "healthcare.insurance",
    title: "Insurance policies",
    description: "Patient coverage masters.",
    statusOptions: ["active", "expired"],
    fields: [F("policy_no", "Policy no", "text", { required: true }), F("patient_name", "Patient", "text", { required: true }), F("payer", "Payer / TPA"), F("expiry_date", "Expiry", "date")]
  },
  {
    slug: "healthcare.claims",
    module: "healthcare",
    entityName: "insurance_claim",
    formKey: "healthcare.claim",
    title: "Insurance claims",
    description: "Pre-auth and claim tracking (clearing house later).",
    statusOptions: ["draft", "submitted", "approved", "rejected", "paid"],
    fields: [F("claim_no", "Claim no", "text", { required: true }), F("patient_name", "Patient", "text", { required: true }), F("payer", "Payer"), F("amount", "Amount", "number"), F("claim_date", "Date", "date")]
  },
  {
    slug: "healthcare.infection",
    module: "healthcare",
    entityName: "infection_incident",
    formKey: "healthcare.infection",
    title: "Infection control",
    description: "HAI incidents and precaution logs.",
    statusOptions: ["open", "investigating", "closed"],
    fields: [F("incident_no", "Incident no", "text", { required: true }), F("patient_name", "Patient"), F("organism", "Organism"), F("ward", "Ward"), F("incident_date", "Date", "date"), F("notes", "Notes", "textarea")]
  },
  {
    slug: "healthcare.quality",
    module: "healthcare",
    entityName: "quality_incident",
    formKey: "healthcare.quality",
    title: "Quality / CQI",
    description: "Incidents, errors, and CAPA.",
    statusOptions: ["reported", "review", "capa", "closed"],
    fields: [F("incident_no", "Incident no", "text", { required: true }), F("title", "Title", "text", { required: true }), F("severity", "Severity", "select", { options: ["low", "medium", "high", "sentinel"] }), F("incident_date", "Date", "date"), F("notes", "Notes", "textarea")]
  },
  {
    slug: "healthcare.equipment",
    module: "healthcare",
    entityName: "biomed_equipment",
    formKey: "healthcare.equipment",
    title: "Biomedical equipment",
    description: "Asset register for clinical devices.",
    statusOptions: ["in_service", "maintenance", "retired"],
    fields: [F("tag", "Asset tag", "text", { required: true }), F("name", "Name", "text", { required: true }), F("department", "Department"), F("next_pm", "Next PM", "date")]
  },
  {
    slug: "healthcare.rosters",
    module: "healthcare",
    entityName: "duty_roster",
    formKey: "healthcare.roster",
    title: "Duty rosters",
    description: "Doctor / nurse duty calendar.",
    statusOptions: ["planned", "published"],
    fields: [F("staff_name", "Staff", "text", { required: true }), F("role", "Role"), F("shift", "Shift", "select", { options: ["morning", "evening", "night"] }), F("roster_date", "Date", "date", { required: true }), F("unit", "Unit / ward")]
  },
  {
    slug: "healthcare.cssd",
    module: "healthcare",
    entityName: "cssd_log",
    formKey: "healthcare.cssd",
    title: "CSSD logs",
    description: "Sterilization cycle records.",
    statusOptions: ["loaded", "sterile", "failed"],
    fields: [F("cycle_no", "Cycle no", "text", { required: true }), F("load_desc", "Load", "text", { required: true }), F("cycle_date", "Date", "date"), F("operator", "Operator"), F("notes", "Notes", "textarea")]
  },
  {
    slug: "healthcare.phc_audit",
    module: "healthcare",
    entityName: "phc_audit",
    formKey: "healthcare.phc_audit",
    title: "PHC audit checklist",
    description: "MSDS domain checklist and CAPA (not a live PHC API).",
    statusOptions: ["open", "compliant", "gap", "closed"],
    fields: [F("domain", "MSDS domain", "text", { required: true }), F("item", "Checklist item", "text", { required: true }), F("owner", "Owner"), F("due_date", "Due", "date"), F("notes", "Notes", "textarea")]
  }
];

export function getCatalogSpec(slug: string) {
  return catalogSpecs.find((s) => s.slug === slug);
}

export function catalogSpecsForModule(module: ModuleKey) {
  return catalogSpecs.filter((s) => s.module === module);
}

/** finance.bank_accounts → /finance/bank-accounts */
export function catalogHref(slug: string) {
  const [mod, ...rest] = slug.split(".");
  return `/${mod}/${rest.join(".").replace(/_/g, "-")}`;
}
