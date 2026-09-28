# HMS Compliance Operations Guide

Operational checklist for Hospital Management System compliance guardrails (AGENT_SPEC §2–3, §7–11).

## Row Level Security (RLS)

- All `hms_*` and marketplace PHI tables have RLS enabled in migrations `20260918000022` through `20260919000025`.
- Tenant isolation uses `current_tenant_id()` policies.
- `hms_phi_audit_logs` is append-only (INSERT + SELECT only; no UPDATE/DELETE policies).

**Verify:**

```bash
npm run db:audit:hms
```

Exit code `2` = missing PHI table. Exit code `1` = RLS not enabled on a reachable table.

## MFA

- HMS role assignments set `mfa_required` for clinical staff.
- Login gate at `/login/mfa` when Supabase TOTP is enrolled or HMS role requires MFA.

## Session idle timeout

- Clinical staff: 15-minute idle logout via `SessionIdleGuard`.
- Configure: `HMS_IDLE_TIMEOUT_MS` / `NEXT_PUBLIC_HMS_IDLE_TIMEOUT_MS`.

## Break-glass emergency access

- UI: `/healthcare/hms-compliance` → Break-glass panel.
- Requires justification text; writes to `hms_break_glass` and PHI audit log.
- Triggers security alert to `admin@demo.com` (no patient names in alert body).

## RBAC (Section 3 matrix)

- Server guard: `guardHealthcarePhiRoute` + optional `canHmsRoleAccess` for resource-level checks.
- Matrix source: `lib/healthcare/hms-rbac-core.mjs`.

**Test denial patterns:**

```bash
npm run test:hms-rbac
```

## DSAR & anonymization

- **DSAR:** Patients page → export machine-readable JSON (audit logged).
- **Erasure:** `anonymizePatient` — anonymizes under retention hold; no hard delete when obligation exists.

## Rate limits & lockout

- Login: 5 failed attempts → 30-minute lockout (`account-lockout.ts`).
- Healthcare sync, booking, portal: `enforceRateLimit` in API guards.
- Lockout triggers security alert (generic — no passwords).

## PHI redaction in logs

- Use `redactPhi()` / `safeLog()` from `lib/healthcare/phi-redact.ts` in server error paths.
- Never log full names, phone, email, national ID, addresses, or diagnosis free text.

## API compliance audit (in-app)

- Endpoint: `GET /api/healthcare/compliance-audit?tenantId=alpha`
- Guarded, rate-limited; appends `compliance_audit_run` to PHI audit log.
- UI: HMS compliance command center → **Run compliance audit**.

## Backups

- Supabase managed daily backups; PITR optional on eligible plans.
- See [BACKUP_RESTORE.md](./BACKUP_RESTORE.md) for RPO/RTO targets and quarterly restore test.

## Staging & PHI

- **Never** copy production PHI to staging (AGENT_SPEC §11).
- Staging uses synthetic seed data only: `npm run db:seed:healthcare`.

## Related scripts

| Script | Purpose |
|--------|---------|
| `npm run db:audit:hms` | Full PHI table + RLS audit (CLI) |
| `npm run test:hms-rbac` | RBAC matrix denial tests |
| `npm run db:verify-marketplace` | Marketplace + HMS table presence |

## Alerting

- Failed login lockout → `emitSecurityAlert` → admin/finance in-app + email (generic).
- Break-glass → security alert with title "Break-glass access used".
- Compliance audit run → PHI audit log entry (no PHI in diffs).
