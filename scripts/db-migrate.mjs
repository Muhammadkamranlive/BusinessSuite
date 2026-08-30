#!/usr/bin/env node
/**
 * Apply SQL migrations from supabase/migrations in filename order.
 *
 * Requires SUPABASE_DB_URL (or DATABASE_URL) in .env.local
 *
 * Usage:
 *   npm run db:status
 *   npm run db:migrate
 */

import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import pg from "pg";

const { Client } = pg;
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
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    if (!(key in process.env)) process.env[key] = value;
  }
}

const root = path.resolve(__dirname, "..");
loadEnvFile(path.join(root, ".env"));
loadEnvFile(path.join(root, ".env.local"));

const migrationsDir = path.join(root, "supabase", "migrations");
const command = process.argv[2] || "migrate";

function listMigrations() {
  if (!fs.existsSync(migrationsDir)) return [];
  return fs
    .readdirSync(migrationsDir)
    .filter((name) => name.endsWith(".sql") && name !== "ALL_IN_ONE.sql")
    .sort();
}

function getDbUrl() {
  return process.env.SUPABASE_DB_URL || process.env.DATABASE_URL || "";
}

function printStructure() {
  const files = listMigrations();
  console.log("Initial project migration structure:\n");
  console.log("supabase/migrations/");
  for (const file of files) {
    const full = path.join(migrationsDir, file);
    const size = fs.statSync(full).size;
    console.log(`  - ${file} (${size} bytes)`);
  }
  const allInOne = path.join(migrationsDir, "ALL_IN_ONE.sql");
  if (fs.existsSync(allInOne)) {
    console.log(`  - ALL_IN_ONE.sql (${fs.statSync(allInOne).size} bytes) [manual fallback]`);
  }
}

function printDbUrlHelp() {
  console.log(`
To apply migrations directly, add your DB URL to .env.local:

  SUPABASE_DB_URL=postgresql://postgres.[PROJECT_REF]:[PASSWORD]@aws-0-[REGION].pooler.supabase.com:6543/postgres

Or the direct connection:

  SUPABASE_DB_URL=postgresql://postgres:[PASSWORD]@db.xknvxjzrtfgvuiaiccii.supabase.co:5432/postgres

Get it from:
  Supabase Dashboard → Project Settings → Database → Connection string → URI

Then run:
  npm run db:migrate
`);
}

async function ensureMigrationsTable(client) {
  await client.query(`
    create table if not exists public.schema_migrations (
      id text primary key,
      applied_at timestamptz not null default now()
    );
  `);
}

async function appliedSet(client) {
  const { rows } = await client.query("select id from public.schema_migrations");
  return new Set(rows.map((r) => r.id));
}

async function migrate() {
  const files = listMigrations();
  if (!files.length) {
    console.error("No migration files found in supabase/migrations");
    process.exit(1);
  }

  printStructure();

  const dbUrl = getDbUrl();
  if (!dbUrl || dbUrl.includes("[PASSWORD]") || dbUrl.includes("YOUR_PASSWORD")) {
    printDbUrlHelp();
    process.exit(1);
  }

  const client = new Client({
    connectionString: dbUrl,
    ssl: { rejectUnauthorized: false }
  });

  console.log("\nConnecting to database...");
  try {
    await client.connect();
  } catch (error) {
    console.error("Could not connect. Check SUPABASE_DB_URL password/host.");
    console.error(error instanceof Error ? error.message : error);
    process.exit(1);
  }

  try {
    await ensureMigrationsTable(client);
    const done = await appliedSet(client);

    for (const file of files) {
      if (done.has(file)) {
        console.log(`✓ skip (already applied): ${file}`);
        continue;
      }

      const sql = fs.readFileSync(path.join(migrationsDir, file), "utf8");
      console.log(`→ applying: ${file}`);
      try {
        await client.query("begin");
        await client.query(sql);
        await client.query("insert into public.schema_migrations (id) values ($1)", [file]);
        await client.query("commit");
        console.log(`✓ applied: ${file}`);
      } catch (error) {
        await client.query("rollback");
        console.error(`✗ failed: ${file}`);
        console.error(error instanceof Error ? error.message : error);
        process.exit(1);
      }
    }

    console.log("\nAll migrations applied.");
  } finally {
    await client.end();
  }
}

if (command === "status" || command === "structure") {
  printStructure();
  const dbUrl = getDbUrl();
  console.log(`\nSUPABASE_DB_URL: ${dbUrl ? "set" : "MISSING"}`);
  if (!dbUrl) printDbUrlHelp();
} else {
  migrate().catch((error) => {
    console.error(error);
    process.exit(1);
  });
}
