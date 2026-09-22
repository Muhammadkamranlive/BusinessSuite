#!/usr/bin/env node
/**
 * Apply Healthcare demo seed for Alpha Trading LLC (UI slug: alpha).
 *
 * SQL: supabase/seed/healthcare_alpha_demo.sql
 * Tenant: 00000000-0000-0000-0000-000000000101
 *
 * Usage: npm run db:seed:healthcare
 *
 * Prefers `supabase db query --linked` (Postgres). Falls back to note if CLI fails.
 */
import { spawnSync } from "child_process";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { createClient } from "@supabase/supabase-js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, "..");
const seedFile = path.join(root, "supabase", "seed", "healthcare_alpha_demo.sql");
const TENANT = "00000000-0000-0000-0000-000000000101";

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

if (!fs.existsSync(seedFile)) {
  console.error(`Missing seed file: ${seedFile}`);
  process.exit(1);
}

console.log("Healthcare seed → Alpha Trading LLC (alpha)");
console.log(`  tenant_id: ${TENANT}`);
console.log(`  file: ${path.relative(root, seedFile)}\n`);

const sql = fs.readFileSync(seedFile, "utf8");

function trySupabaseDbQuery() {
  // Newer CLI: supabase db query --linked -f file
  let r = spawnSync(
    "npx",
    ["supabase", "db", "query", "--linked", "-f", seedFile],
    { cwd: root, encoding: "utf8", shell: process.platform === "win32" }
  );
  if (r.status === 0) return { ok: true, method: "supabase db query -f" };

  // Alternate: pipe SQL via stdin
  r = spawnSync("npx", ["supabase", "db", "query", "--linked"], {
    cwd: root,
    input: sql,
    encoding: "utf8",
    shell: process.platform === "win32"
  });
  if (r.status === 0) return { ok: true, method: "supabase db query stdin" };

  // Older: db execute
  r = spawnSync("npx", ["supabase", "db", "execute", "--file", seedFile], {
    cwd: root,
    encoding: "utf8",
    shell: process.platform === "win32"
  });
  if (r.status === 0) return { ok: true, method: "supabase db execute" };

  return {
    ok: false,
    stderr: [r.stderr, r.stdout].filter(Boolean).join("\n").slice(-2000)
  };
}

const applied = trySupabaseDbQuery();
if (!applied.ok) {
  console.error("Could not apply SQL via Supabase CLI.");
  if (applied.stderr) console.error(applied.stderr);
  console.error(`
Manual options:
  1) npx supabase db query --linked -f supabase/seed/healthcare_alpha_demo.sql
  2) Paste the SQL into Supabase Dashboard → SQL Editor → Run
`);
  process.exit(1);
}

console.log(`Applied via ${applied.method}\n`);
console.log("→ Verifying Alpha Healthcare row counts…\n");

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const secret = process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !secret) {
  console.error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SECRET_KEY for verify.");
  process.exit(2);
}

const admin = createClient(url, secret, {
  auth: { persistSession: false, autoRefreshToken: false }
});

const checks = [
  "hms_patients",
  "hms_appointments",
  "hms_encounters",
  "hms_clinical_notes",
  "hms_admissions",
  "hms_wards",
  "hms_beds",
  "hms_prescriptions",
  "hms_lab_orders",
  "hms_pharmacy_stock",
  "hms_imaging_orders",
  "hms_insurance_claims",
  "hms_telemedicine_sessions",
  "hms_emergency_intakes",
  "hms_staff",
  "hms_branches",
  "hms_pharmacy_purchase_orders",
  "catalog_records",
  "pharmacy_partners",
  "marketplace_products"
];

let missing = 0;
for (const table of checks) {
  const { error, count } = await admin
    .from(table)
    .select("*", { count: "exact", head: true })
    .eq("tenant_id", TENANT);
  if (error) {
    missing += 1;
    console.log(`  FAIL  ${table}: ${error.message}`);
  } else if ((count ?? 0) < 1) {
    missing += 1;
    console.log(`  EMPTY ${table} (rows=0)`);
  } else {
    console.log(`  OK    ${table} (rows≈${count})`);
  }
}

if (missing) {
  console.error(`\n${missing} check(s) failed. Seed may be incomplete.`);
  process.exit(2);
}

console.log(`
Done. Log in as admin@demo.com (tenant Alpha Trading LLC / alpha) and open Healthcare.
Reload / pull sync if lists were open before seeding.
`);
