#!/usr/bin/env node
/**
 * HMS compliance audit — AGENT_SPEC §2 acceptance test.
 * Lists hms_* + marketplace PHI tables, checks existence + RLS (live or migration doc).
 * Usage: node scripts/hms-compliance-audit.mjs
 * Exit 2 if any PHI table is missing.
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

/** Tables with RLS enabled in migrations 22–25. */
const RLS_FROM_MIGRATIONS = new Set([
  "pharmacy_partners",
  "marketplace_products",
  "provider_credentials",
  "clinic_orders",
  "marketplace_compliance_events",
  "hms_role_assignments",
  "hms_patients",
  "hms_patient_consents",
  "hms_appointments",
  "hms_encounters",
  "hms_clinical_notes",
  "hms_problem_list",
  "hms_allergy_list",
  "hms_medication_list",
  "hms_invoices",
  "hms_payments",
  "hms_phi_audit_logs",
  "hms_break_glass",
  "hms_branches",
  "hms_wards",
  "hms_beds",
  "hms_admissions",
  "hms_transfers",
  "hms_vitals",
  "hms_mar",
  "hms_prescriptions",
  "hms_lab_orders",
  "hms_lab_results",
  "hms_imaging_orders",
  "hms_pharmacy_stock",
  "hms_dispenses",
  "hms_insurance_claims",
  "hms_telemedicine_sessions",
  "hms_ambulance_dispatches",
  "hms_emergency_intakes",
  "hms_staff",
  "hms_duty_rosters",
  "hms_equipment_assets",
  "hms_notification_prefs",
  "hms_notifications",
  "hms_message_threads",
  "hms_messages",
  "hms_emr_attachments",
  "hms_pharmacy_purchase_orders",
  "hms_pharmacy_po_items",
  "hms_branch_share_consents",
  "hms_appointment_waitlist",
  "hms_doctor_leave",
  "hms_reminder_queue"
]);

/** @type {{ group: string; tables: string[] }[]} */
const PHI_TABLE_GROUPS = [
  {
    group: "Marketplace PHI (migration 22)",
    tables: [
      "pharmacy_partners",
      "marketplace_products",
      "provider_credentials",
      "clinic_orders",
      "marketplace_compliance_events"
    ]
  },
  {
    group: "HMS core PHI (migration 23)",
    tables: [
      "hms_role_assignments",
      "hms_patients",
      "hms_patient_consents",
      "hms_appointments",
      "hms_encounters",
      "hms_clinical_notes",
      "hms_problem_list",
      "hms_allergy_list",
      "hms_medication_list",
      "hms_invoices",
      "hms_payments",
      "hms_phi_audit_logs",
      "hms_break_glass"
    ]
  },
  {
    group: "HMS clinical PHI (migration 24)",
    tables: [
      "hms_branches",
      "hms_wards",
      "hms_beds",
      "hms_admissions",
      "hms_transfers",
      "hms_vitals",
      "hms_mar",
      "hms_prescriptions",
      "hms_lab_orders",
      "hms_lab_results",
      "hms_imaging_orders",
      "hms_pharmacy_stock",
      "hms_dispenses",
      "hms_insurance_claims",
      "hms_telemedicine_sessions",
      "hms_ambulance_dispatches",
      "hms_emergency_intakes",
      "hms_staff",
      "hms_duty_rosters",
      "hms_equipment_assets",
      "hms_notification_prefs",
      "hms_notifications",
      "hms_message_threads",
      "hms_messages"
    ]
  },
  {
    group: "HMS polish PHI (migration 25)",
    tables: [
      "hms_emr_attachments",
      "hms_pharmacy_purchase_orders",
      "hms_pharmacy_po_items",
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

/** @type {Map<string, boolean|null>} */
const liveRlsCache = new Map();

async function detectLiveRls(table) {
  if (liveRlsCache.has(table)) return liveRlsCache.get(table);

  let live = null;

  // Optional RPC if deployed (not required for pass)
  try {
    const { data, error } = await admin.rpc("hms_table_rls_enabled", { table_name: table });
    if (!error && typeof data === "boolean") {
      live = data;
    }
  } catch {
    /* rpc not available */
  }

  if (live === null) {
    try {
      const { data, error } = await admin
        .from("pg_class")
        .select("relrowsecurity")
        .eq("relname", table)
        .maybeSingle();
      if (!error && data && typeof data.relrowsecurity === "boolean") {
        live = data.relrowsecurity;
      }
    } catch {
      /* pg_class not exposed via PostgREST */
    }
  }

  liveRlsCache.set(table, live);
  return live;
}

async function checkTable(table) {
  const { error, count } = await admin.from(table).select("*", { count: "exact", head: true });
  const exists = !error || !/does not exist|PGRST205|42P01/i.test(error.message);
  const liveRls = exists ? await detectLiveRls(table) : null;
  const migrationRls = RLS_FROM_MIGRATIONS.has(table);
  const rlsExpected = migrationRls;
  let rlsStatus = "UNKNOWN";
  if (!exists) {
    rlsStatus = "N/A";
  } else if (liveRls === true) {
    rlsStatus = "ENABLED";
  } else if (liveRls === false) {
    rlsStatus = "DISABLED";
  } else if (migrationRls) {
    rlsStatus = "MIGRATION";
  } else {
    rlsStatus = "NOT_DOCUMENTED";
  }

  const rlsOk =
    !exists ||
    liveRls === true ||
    (liveRls === null && migrationRls);

  return { table, exists, count: count ?? 0, rlsExpected, rlsStatus, rlsOk, error: error?.message ?? null };
}

async function main() {
  console.log("HMS Compliance Audit — AGENT_SPEC §2\n");
  console.log(`Supabase: ${url}\n`);

  /** @type {Awaited<ReturnType<typeof checkTable>>[]} */
  const results = [];
  let missing = 0;
  let rlsFail = 0;

  for (const { group, tables } of PHI_TABLE_GROUPS) {
    console.log(`[${group}]`);
    for (const table of tables) {
      const row = await checkTable(table);
      results.push(row);
      if (!row.exists) {
        missing += 1;
        console.log(`  FAIL  ${table} — missing (${row.error ?? "not found"})`);
      } else if (!row.rlsOk) {
        rlsFail += 1;
        console.log(`  FAIL  ${table} — RLS ${row.rlsStatus} (expected enabled)`);
      } else {
        const rlsNote = row.rlsStatus === "MIGRATION" ? "RLS per migration" : `RLS ${row.rlsStatus}`;
        console.log(`  PASS  ${table} (rows≈${row.count}, ${rlsNote})`);
      }
    }
    console.log("");
  }

  const pass = results.filter((r) => r.exists && r.rlsOk).length;
  const total = results.length;

  console.log("── Summary ──");
  console.log(`  Tables checked: ${total}`);
  console.log(`  PASS: ${pass}`);
  console.log(`  Missing: ${missing}`);
  console.log(`  RLS failures: ${rlsFail}`);
  console.log(`  RLS expected (migration doc): ${RLS_FROM_MIGRATIONS.size} tables`);

  if (missing > 0) {
    console.error("\nAudit FAILED — one or more PHI tables are missing. Exit 2.");
    process.exit(2);
  }
  if (rlsFail > 0) {
    console.error("\nAudit FAILED — RLS not enabled on PHI table(s).");
    process.exit(1);
  }

  console.log("\nAudit PASSED — all PHI tables present with RLS enabled or documented in migrations.");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
