#!/usr/bin/env node
/**
 * Verify Healthcare marketplace + HMS tables exist in remote Supabase.
 * Usage: node scripts/verify-marketplace-tables.mjs
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { createClient } from "@supabase/supabase-js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, "..");

function loadEnvFile(filePath) {
  if (!fs.existsSync(filePath)) return;
  for (const line of fs.readFileSync(filePath, "utf8").split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq === -1) continue;
    const key = trimmed.slice(0, eq).trim();
    let value = trimmed.slice(eq + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    if (!(key in process.env)) process.env[key] = value;
  }
}

loadEnvFile(path.join(root, ".env"));
loadEnvFile(path.join(root, ".env.local"));

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const secret = process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!url || !secret) {
  console.error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SECRET_KEY");
  process.exit(1);
}

/** @type {{ group: string; tables: string[] }[]} */
const groups = [
  {
    group: "22 marketplace",
    tables: [
      "pharmacy_partners",
      "marketplace_products",
      "provider_credentials",
      "clinic_orders",
      "marketplace_compliance_events"
    ]
  },
  {
    group: "23 HMS core",
    tables: [
      "hms_patients",
      "hms_patient_consents",
      "hms_encounters",
      "hms_clinical_notes",
      "hms_invoices",
      "hms_phi_audit_logs",
      "hms_break_glass",
      "hms_role_assignments"
    ]
  },
  {
    group: "24 HMS clinical",
    tables: [
      "hms_wards",
      "hms_beds",
      "hms_admissions",
      "hms_prescriptions",
      "hms_lab_orders",
      "hms_pharmacy_stock",
      "hms_imaging_orders",
      "hms_telemedicine_sessions",
      "hms_ambulance_dispatches"
    ]
  },
  {
    group: "25 HMS polish",
    tables: [
      "auth_account_lockouts",
      "hms_emr_attachments",
      "hms_pharmacy_purchase_orders",
      "hms_branch_share_consents",
      "hms_appointment_waitlist",
      "hms_doctor_leave",
      "hms_reminder_queue"
    ]
  }
];

const admin = createClient(url, secret, {
  auth: { persistSession: false, autoRefreshToken: false }
});

let missing = 0;
const groupStatus = [];

for (const { group, tables } of groups) {
  let groupMissing = 0;
  console.log(`\n[${group}]`);
  for (const table of tables) {
    const { error, count } = await admin.from(table).select("*", { count: "exact", head: true });
    if (error) {
      missing += 1;
      groupMissing += 1;
      console.log(`  MISSING/ERROR  ${table}: ${error.message}`);
    } else {
      console.log(`  OK            ${table} (rows≈${count ?? 0})`);
    }
  }
  groupStatus.push({ group, ok: groupMissing === 0 });
}

console.log("\n── Summary ──");
for (const s of groupStatus) {
  console.log(`  ${s.ok ? "APPLIED" : "MISSING"}  ${s.group}`);
}

if (missing) {
  console.error(`\n${missing} table(s) not available. Migration history may be out of sync.`);
  console.error("Repair the missing version(s), then push again, e.g.:");
  console.error("  npx supabase migration repair 20260919000023 --status reverted");
  console.error("  npx supabase migration repair 20260919000024 --status reverted");
  console.error("  npx supabase migration repair 20260919000025 --status reverted");
  console.error("  npm run db:push");
  process.exit(2);
}

console.log("\nAll marketplace + HMS migrations (22–25) present on remote.");
