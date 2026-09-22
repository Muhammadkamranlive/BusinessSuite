# Backup & Restore Runbook — BusinessSuite HMS

Operational guide for Supabase-managed backups and restore procedures for the Hospital Management System.

## Overview

Production HMS data lives in **Supabase Postgres** (Team plan with HIPAA add-on). Supabase provides managed daily backups and optional Point-in-Time Recovery (PITR) on eligible plans.

**Targets (from AGENT_SPEC §6):**

| Metric | Target |
|--------|--------|
| **RPO** (Recovery Point Objective) | < 1 hour (with PITR enabled) |
| **RTO** (Recovery Time Objective) | < 4 hours |

## Daily backups (Supabase managed)

1. Open [Supabase Dashboard](https://supabase.com/dashboard) → your project → **Database** → **Backups**.
2. Confirm **Daily backups** are enabled (included on Team; PITR is a paid add-on).
3. Note the retention window shown in the dashboard (typically 7 days on Pro/Team; longer with enterprise).

### Verify backups

- [ ] Backups page shows a successful backup within the last 24 hours.
- [ ] PITR status is documented if enabled (restore window start/end timestamps).
- [ ] Record verification date and operator in your internal ops log.

## Restore procedures

### Option A — Point-in-Time Recovery (PITR)

Use when you need to recover to a specific timestamp (e.g., accidental bulk delete).

1. Dashboard → **Database** → **Backups** → **Point in time**.
2. Select target timestamp **before** the incident.
3. Supabase provisions a **new** project/database at that point — plan DNS/connection string cutover.
4. Run smoke tests (auth, tenant RLS, sample patient read) before directing production traffic.
5. Document incident, restore time, and data reconciliation steps.

### Option B — Download logical backup

Use for archival or restoring to a **non-production** environment with **synthetic data only**.

1. Dashboard → **Database** → **Backups** → download latest backup (when available on your plan).
2. Restore into a **dedicated staging** instance — never overwrite production from a stale file without change control.

### Option C — Supabase support / enterprise restore

For large incidents or cross-region recovery, open a Supabase support ticket with project ref, incident time (UTC), and target RPO/RTO.

## Staging & PHI policy

**Never copy production PHI to staging.**

- Staging must use **synthetic seed data** only (demo patients, fake MRNs).
- If you must test restore mechanics, restore to an **isolated** project with network restrictions and delete after validation.
- See AGENT_SPEC §11: *"Staging environment with synthetic (non-real) patient data only."*

## Quarterly restore test (recommended)

1. Restore latest backup to an isolated test project (or PITR sandbox).
2. Verify: login, RLS tenant isolation, appointments list, audit log append-only.
3. Record pass/fail and duration vs RTO target.
4. Update this runbook if steps or dashboard paths change.

## Related

- AGENT_SPEC §2 — Automated backup schedule (documented here)
- AGENT_SPEC §6 — RTO < 4h, RPO < 1h, tested restore quarterly
- Supabase docs: [Database Backups](https://supabase.com/docs/guides/platform/backups)
