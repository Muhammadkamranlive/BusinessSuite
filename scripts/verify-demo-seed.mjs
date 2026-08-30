#!/usr/bin/env node
/**
 * Verify demo seed row counts in Supabase (requires SUPABASE_SECRET_KEY in .env.local).
 * Usage: node scripts/verify-demo-seed.mjs
 */

import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

function loadEnvFile(filePath) {
  if (!fs.existsSync(filePath)) return;
  for (const line of fs.readFileSync(filePath, "utf8").split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq === -1) continue;
    const key = trimmed.slice(0, eq).trim();
    let value = trimmed.slice(eq + 1).trim();
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }
    if (!(key in process.env)) process.env[key] = value;
  }
}

const root = path.resolve(__dirname, "..");
loadEnvFile(path.join(root, ".env"));
loadEnvFile(path.join(root, ".env.local"));

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const secret = process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;

const TENANTS = [
  { slug: "alpha", id: "00000000-0000-0000-0000-000000000101" },
  { slug: "medix", id: "00000000-0000-0000-0000-000000000102" },
  { slug: "autoparts", id: "00000000-0000-0000-0000-000000000103" },
  { slug: "textile", id: "00000000-0000-0000-0000-000000000104" }
];

const MODULE_TABLES = {
  hrm: ["employees", "leave_requests", "hrm_candidates", "hrm_payroll_runs", "hrm_assets"],
  crm: ["customers", "leads", "deals", "crm_contacts", "crm_campaigns", "crm_tickets"],
  sales: ["quotations", "invoices", "sales_orders", "delivery_notes", "payments_received"],
  purchase: ["suppliers", "purchase_requisitions", "purchase_rfqs", "purchase_orders", "goods_receipts", "vendor_bills"],
  inventory: ["products", "warehouses", "stock_balances", "stock_movements", "stock_transfers"],
  finance: ["chart_of_accounts", "expenses", "income_entries", "journal_entries"],
  projects: ["projects", "project_tasks", "project_timesheets"],
  catalog: ["catalog_records"]
};

async function count(table, tenantId) {
  const res = await fetch(`${url}/rest/v1/${table}?select=id&tenant_id=eq.${tenantId}`, {
    headers: {
      apikey: secret,
      Authorization: `Bearer ${secret}`,
      Prefer: "count=exact"
    }
  });
  const range = res.headers.get("content-range") || "";
  const m = range.match(/\/(\d+)$/);
  return m ? Number(m[1]) : 0;
}

async function main() {
  if (!url || !secret) {
    console.error("Set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SECRET_KEY in .env.local");
    process.exit(1);
  }

  console.log("Demo seed verification (all modules, per tenant):\n");
  let ok = true;
  for (const t of TENANTS) {
    console.log(`— ${t.slug}`);
    for (const [module, tables] of Object.entries(MODULE_TABLES)) {
      const counts = await Promise.all(tables.map((table) => count(table, t.id)));
      const missing = tables.filter((_, i) => counts[i] === 0);
      if (missing.length) ok = false;
      const summary = tables.map((table, i) => `${table}=${counts[i]}`).join(", ");
      console.log(`  ${module}: ${summary}${missing.length ? `  ← missing: ${missing.join(", ")}` : ""}`);
    }
    console.log("");
  }

  if (!ok) {
    console.log("Run: npm run db:push");
    process.exit(1);
  }
  console.log("All demo tenants have module seed data.");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
