#!/usr/bin/env node
/**
 * Load .env / .env.local and verify Supabase REST connectivity.
 * Usage: node scripts/check-supabase.mjs
 */

import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

function loadEnvFile(filePath) {
  if (!fs.existsSync(filePath)) return;
  const lines = fs.readFileSync(filePath, "utf8").split(/\r?\n/);
  for (const line of lines) {
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
const key =
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const secret =
  process.env.SUPABASE_SECRET_KEY ||
  process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!url || !key) {
  console.error("Missing NEXT_PUBLIC_SUPABASE_URL or publishable key in .env.local");
  process.exit(1);
}

async function main() {
  console.log("Checking Supabase connection...");
  console.log(`URL: ${url}`);
  console.log(`Publishable key: set (${key.slice(0, 18)}...)`);
  console.log(`Secret key: ${secret ? "set (server-only)" : "MISSING — paste SUPABASE_SECRET_KEY into .env.local"}`);

  const healthRes = await fetch(`${url}/auth/v1/health`, {
    headers: {
      apikey: key,
      Authorization: `Bearer ${key}`
    }
  });

  const healthBody = await healthRes.text();
  console.log(`Auth health: HTTP ${healthRes.status}`);
  if (healthBody) console.log(healthBody);

  const restRes = await fetch(`${url}/rest/v1/tenants?select=id,name&limit=3`, {
    headers: {
      apikey: key,
      Authorization: `Bearer ${key}`,
      Accept: "application/json"
    }
  });

  const restBody = await restRes.text();
  console.log(`REST tenants: HTTP ${restRes.status}`);
  console.log(restBody.slice(0, 500));

  if (!healthRes.ok && !restRes.ok) {
    console.error("Connection check failed.");
    process.exit(1);
  }

  if (restRes.status === 404 || restBody.includes("PGRST205") || restBody.includes("does not exist")) {
    console.log("API reachable. Tables not found yet — run: npm run db:migrate");
  } else if (restRes.ok) {
    console.log("Connected. tenants table is reachable.");
  } else {
    console.log("API reachable with auth. Review REST response above.");
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
