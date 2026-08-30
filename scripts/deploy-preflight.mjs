#!/usr/bin/env node
/**
 * Pre-deploy checks — run before Vercel / Render deploy.
 * Usage: node scripts/deploy-preflight.mjs
 */
import { execSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

const root = path.resolve(import.meta.dirname, "..");
let failed = 0;

function ok(msg) {
  console.log(`✓ ${msg}`);
}

function fail(msg) {
  console.error(`✗ ${msg}`);
  failed += 1;
}

function has(file) {
  return fs.existsSync(path.join(root, file));
}

console.log("BusinessSuite deploy preflight\n");

if (has("package.json")) ok("package.json found");
else fail("package.json missing");

if (has("pnpm-lock.yaml") || has("package-lock.json")) ok("Lockfile present");
else fail("Add pnpm-lock.yaml or package-lock.json before deploy");

if (has("vercel.json")) ok("vercel.json present (Next.js on Vercel)");
else fail("vercel.json missing");

if (has("email-api/Dockerfile")) ok("email-api/Dockerfile present");
else fail("email-api/Dockerfile missing");

if (has(".env.example")) ok(".env.example template present");
else fail(".env.example missing");

try {
  execSync("npm run typecheck", { cwd: root, stdio: "pipe" });
  ok("TypeScript check passed");
} catch {
  fail("npm run typecheck failed — fix before deploy");
}

if (has(".next/BUILD_ID")) {
  ok("Production build exists (.next/) — run npm run build if stale");
} else {
  console.log("· No .next build yet — run: npm run build");
}

console.log("\nRequired production env (Vercel → Settings → Environment Variables):");
[
  "NEXT_PUBLIC_SUPABASE_URL",
  "NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY",
  "SUPABASE_SECRET_KEY",
  "NEXT_PUBLIC_APP_URL",
  "EMAIL_API_URL",
  "EMAIL_API_KEY",
  "NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY",
  "STRIPE_SECRET_KEY"
].forEach((v) => console.log(`  · ${v}`));

console.log("\nEmail API host (Render / Railway / Firebase):");
["GMAIL_USER", "GMAIL_APP_PASSWORD", "EMAIL_API_KEY", "EMAIL_DRY_RUN"].forEach((v) =>
  console.log(`  · ${v}`)
);

console.log("\nDatabase: npm run db:link && npm run db:push\n");

process.exit(failed ? 1 : 0);
