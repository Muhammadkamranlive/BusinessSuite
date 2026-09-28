#!/usr/bin/env node
/**
 * HMS RBAC matrix smoke test — documents Section 3 deny patterns for CI/manual runs.
 * Usage: node scripts/verify-hms-rbac-matrix.mjs
 *
 * This script validates the static role allowlist used by guardHealthcarePhiRoute.
 * Full RLS cross-role DB tests require Supabase JWT fixtures (not run here).
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const guardPath = path.join(__dirname, "../lib/auth/server/api-guard.ts");
const src = fs.readFileSync(guardPath, "utf8");

const roleBlock = src.match(/HEALTHCARE_PHI_ROLES = new Set<string>\(\[([\s\S]*?)\]\)/);
if (!roleBlock) {
  console.error("Could not parse HEALTHCARE_PHI_ROLES from api-guard.ts");
  process.exit(1);
}

const allowed = [...roleBlock[1].matchAll(/"([^"]+)"/g)].map((m) => m[1]);

/** Section 3 matrix — roles that must NOT have healthcare PHI API access by default. */
const mustDeny = ["viewer", "employee", "patient"];

/** Section 3 matrix — roles that must have healthcare PHI API access. */
const mustAllow = [
  "super_admin",
  "company_admin",
  "doctor",
  "nurse",
  "lab_technician",
  "pharmacist",
  "receptionist",
  "billing_staff",
  "hospital_admin",
  "it_security"
];

let failed = 0;
for (const role of mustDeny) {
  if (allowed.includes(role)) {
    console.error(`FAIL: ${role} should be denied healthcare PHI API access`);
    failed++;
  } else {
    console.log(`OK deny: ${role}`);
  }
}
for (const role of mustAllow) {
  if (!allowed.includes(role)) {
    console.error(`FAIL: ${role} should be allowed healthcare PHI API access`);
    failed++;
  } else {
    console.log(`OK allow: ${role}`);
  }
}

console.log(`\nAllowed roles (${allowed.length}): ${allowed.join(", ")}`);
if (failed) {
  console.error(`\n${failed} RBAC matrix check(s) failed.`);
  process.exit(1);
}
console.log("\nHMS RBAC matrix static checks passed.");
