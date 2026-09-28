#!/usr/bin/env node
/**
 * HMS RBAC matrix denial tests — AGENT_SPEC §3 acceptance criteria.
 * Usage: node scripts/hms-rbac-matrix-test.mjs
 */
import {
  canHmsRoleAccess,
  exportRbacMatrixMarkdown,
  HMS_RBAC_MATRIX
} from "../lib/healthcare/hms-rbac-core.mjs";

/** @typedef {{ role: string; resource: string; action: string; expect: boolean; note?: string }} DenialCase */

/** Every cell marked "None" in AGENT_SPEC §3 must deny the action. */
/** @type {DenialCase[]} */
const DENIAL_CASES = [
  { role: "doctor", resource: "billing", action: "read", expect: false, note: "Doctor → Billing None" },
  { role: "doctor", resource: "inventory", action: "read", expect: false },
  { role: "doctor", resource: "audit_logs", action: "read", expect: false },
  { role: "nurse", resource: "billing", action: "read", expect: false },
  { role: "nurse", resource: "clinical_records", action: "delete", expect: false, note: "Nurse write only" },
  { role: "receptionist", resource: "clinical_records", action: "read", expect: false },
  { role: "receptionist", resource: "billing", action: "read", expect: false, note: "Create only" },
  { role: "receptionist", resource: "billing", action: "create", expect: true },
  { role: "lab_technician", resource: "billing", action: "read", expect: false },
  { role: "pharmacist", resource: "clinical_records", action: "write", expect: false, note: "Rx read only" },
  { role: "pharmacist", resource: "billing", action: "read", expect: false },
  { role: "billing_staff", resource: "clinical_records", action: "read", expect: false },
  { role: "patient", resource: "inventory", action: "read", expect: false },
  { role: "it_security", resource: "patients_data", action: "read", expect: false },
  { role: "it_security", resource: "clinical_records", action: "read", expect: false },
  { role: "it_security", resource: "audit_logs", action: "read", expect: true },
  { role: "it_security", resource: "admin_config", action: "full", expect: true },
  { role: "super_admin", resource: "audit_logs", action: "write", expect: false, note: "Audit read only" },
  { role: "super_admin", resource: "audit_logs", action: "read", expect: true },
  { role: "hospital_admin", resource: "clinical_records", action: "write", expect: false, note: "Read only" },
  { role: "hospital_admin", resource: "clinical_records", action: "read", expect: true }
];

/** @type {DenialCase[]} */
const ALLOW_CASES = [
  { role: "doctor", resource: "clinical_records", action: "write", expect: true },
  { role: "doctor", resource: "patients_data", action: "read", expect: true },
  { role: "billing_staff", resource: "billing", action: "full", expect: true },
  { role: "pharmacist", resource: "inventory", action: "full", expect: true },
  { role: "lab_technician", resource: "inventory", action: "read", expect: true }
];

function assertCase(c) {
  const got = canHmsRoleAccess(c.role, c.resource, c.action);
  if (got !== c.expect) {
    throw new Error(
      `RBAC FAIL: ${c.role} ${c.resource}/${c.action} expected ${c.expect} got ${got}${c.note ? ` (${c.note})` : ""}`
    );
  }
}

console.log("HMS RBAC Matrix — AGENT_SPEC §3\n");
console.log("Roles:", Object.keys(HMS_RBAC_MATRIX).join(", "));
console.log("\n── Matrix (exported) ──\n");
console.log(exportRbacMatrixMarkdown());
console.log("\n── Denial tests ──\n");

let passed = 0;
for (const c of [...DENIAL_CASES, ...ALLOW_CASES]) {
  assertCase(c);
  passed += 1;
  console.log(`  OK  ${c.role} · ${c.resource} · ${c.action} → ${c.expect}`);
}

console.log(`\nAll ${passed} RBAC assertions passed.`);
