#!/usr/bin/env node
/**
 * Wrapper around `supabase db push` with clearer HMS migration feedback.
 *
 * Usage: npm run db:push
 */
import { spawnSync } from "child_process";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, "..");
const migrationsDir = path.join(root, "supabase", "migrations");

const EXPECTED = [
  "20260918000022_healthcare_pharmacy_marketplace.sql",
  "20260919000023_healthcare_hms_core.sql",
  "20260919000024_healthcare_hms_phases_2_4.sql",
  "20260919000025_healthcare_hms_polish.sql"
];

function listLocalMigrations() {
  return fs
    .readdirSync(migrationsDir)
    .filter((f) => f.endsWith(".sql"))
    .sort();
}

const local = listLocalMigrations();
console.log(`Local migrations: ${local.length}`);
for (const f of EXPECTED) {
  if (!local.includes(f)) {
    console.error(`Missing expected file: supabase/migrations/${f}`);
    process.exit(1);
  }
  console.log(`  ✓ ${f}`);
}

console.log("\n→ supabase db push\n");
const push = spawnSync("npx", ["supabase", "db", "push"], {
  cwd: root,
  stdio: "inherit",
  shell: process.platform === "win32"
});

if (push.status !== 0) {
  console.error("\ndb push failed.");
  process.exit(push.status || 1);
}

console.log("\n→ Verifying marketplace + HMS tables (migrations 22–25)…\n");
const verify = spawnSync("node", ["scripts/verify-marketplace-tables.mjs"], {
  cwd: root,
  stdio: "inherit"
});

if (verify.status !== 0) {
  console.error(`
Tables are missing even though push reported success / up-to-date.
History may be out of sync. Repair then push again (example for HMS):

  npx supabase migration repair 20260919000023 --status reverted
  npx supabase migration repair 20260919000024 --status reverted
  npx supabase migration repair 20260919000025 --status reverted
  npm run db:push
`);
  process.exit(verify.status || 2);
}

console.log(`
Notes:
  • "Remote database is up to date" means migrations 22–25 are ALREADY applied
    on this project (nothing left to push). That is success, not a failure.
  • Empty tables (rows≈0) are normal until the app syncs/seeds data.
  • To force re-apply a migration you must repair it to reverted first (destructive).
`);
