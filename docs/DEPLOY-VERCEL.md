# BusinessSuite ERP — Vercel deployment guide

Deploy the Next.js app on **Vercel**, Postgres in the cloud, Email API on **Render** (or Firebase), and optional **Stripe** / **Zoom** integrations.

**Start here:** [DEPLOY-ONLINE.md](./DEPLOY-ONLINE.md) — full checklist (ERP + Email API + database).

**Current production (if already deployed):**

- App: https://businesssuite-erp-cloud.vercel.app
- Vercel dashboard: https://vercel.com/muhammad-kamrans-projects-5ae8b16d/businesssuite-erp-cloud

---

## Architecture

| Layer | Service | Role |
|-------|---------|------|
| Frontend + API | Vercel | Next.js App Router, serverless API routes (`runtime = "nodejs"`) |
| Database | Supabase Postgres | Tenants, HRM, CRM/Sales/Purchase/Inventory/Finance, catalog CRUD |
| Billing | Stripe | SaaS subscriptions + HRM payments |
| Optional | Zoom OAuth | HRM workflows meeting integration |

Most modules **dual-write**: browser `localStorage` + Supabase when `SUPABASE_SECRET_KEY` is set and sync flags are enabled.

---

## 1. Prerequisites

Install on your machine:

```bash
# Node.js 20+ (22 recommended)
node -v

# pnpm (lockfile is pnpm)
corepack enable
corepack prepare pnpm@latest --activate
pnpm -v

# Supabase CLI (database migrations)
npm install -g supabase
supabase --version

# Vercel CLI (optional — dashboard deploy works too)
npm install -g vercel
vercel --version
```

Accounts needed:

- [Supabase](https://supabase.com) project (this repo links to ref `xknvxjzrtfgvuiaiccii` — use your own ref if different)
- [Vercel](https://vercel.com) account
- [Stripe](https://stripe.com) account (billing)
- [Zoom Marketplace](https://marketplace.zoom.us) app (optional, for HRM Zoom)

---

## 2. Clone and install

```bash
cd /path/to/ERP
pnpm install
```

Copy environment template:

```bash
cp .env.example .env.local
```

Edit `.env.local` with your Supabase and Stripe keys (see section 4).

---

## 3. Verify local build

Always run a production build before deploying:

```bash
pnpm run typecheck
pnpm run build
pnpm run start
# Open http://127.0.0.1:3000
```

---

## 4. Environment variables

### 4.1 Full list

Create `.env.local` from `.env.example`. Every variable below must be set on **Vercel → Project → Settings → Environment Variables** for **Production** (and Preview if you use preview deploys).

| Variable | Scope | Required | Description |
|----------|-------|----------|-------------|
| `NEXT_PUBLIC_SUPABASE_URL` | Public | Yes | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | Public | Yes | Publishable / anon API key |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Public | Yes | Same as publishable if you only have one public key |
| `SUPABASE_SECRET_KEY` | **Server only** | Yes | Secret / service role key — never prefix with `NEXT_PUBLIC_` |
| `NEXT_PUBLIC_APP_URL` | Public | Yes | Production URL, e.g. `https://businesssuite-erp-cloud.vercel.app` |
| `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` | Public | Billing | Stripe publishable key |
| `STRIPE_SECRET_KEY` | Server only | Billing | Stripe secret key |
| `STRIPE_WEBHOOK_SECRET` | Server only | Billing | From Stripe webhook endpoint |
| `NEXT_PUBLIC_HRM_USE_SUPABASE` | Public | Optional | Set `true` to dual-write HRM to Postgres (default: on when secret key exists) |
| `NEXT_PUBLIC_OPS_USE_SUPABASE` | Public | Optional | Set `true` for CRM/Sales/Purchase/Inventory/Finance sync |
| `ZOOM_CLIENT_ID` | Server | Optional | Zoom OAuth app |
| `ZOOM_CLIENT_SECRET` | Server | Optional | Zoom OAuth app |
| `ZOOM_REDIRECT_URI` | Server | Optional | `https://YOUR-DOMAIN.vercel.app/api/integrations/zoom/callback` |
| `SUPABASE_DB_URL` | Local CLI only | Optional | Direct Postgres URL for non-CLI migration tools |

**Production overrides** (change from localhost):

```bash
NEXT_PUBLIC_APP_URL=https://businesssuite-erp-cloud.vercel.app
ZOOM_REDIRECT_URI=https://businesssuite-erp-cloud.vercel.app/api/integrations/zoom/callback
```

### 4.2 Local-only file (never commit)

`.env.local` is gitignored. Do **not** commit `.env`, `.env.local`, or API secrets.

### 4.3 Add vars on Vercel (CLI)

One variable at a time (repeat for each key):

```bash
cd /path/to/ERP
vercel login
vercel link          # pick team + businesssuite-erp-cloud

# Example: add server secret to production
vercel env add SUPABASE_SECRET_KEY production
# paste value when prompted

vercel env add NEXT_PUBLIC_APP_URL production
# https://businesssuite-erp-cloud.vercel.app
```

List what is configured:

```bash
vercel env ls production
```

Pull from Vercel to local (overwrites `.env.local` — backup first):

```bash
vercel env pull .env.local
```

---

## 5. Database (Supabase migrations)

Apply all SQL migrations **before** relying on production data sync.

### 5.1 Link project (one time)

```bash
npm run db:link
# equivalent:
# supabase link --project-ref xknvxjzrtfgvuiaiccii
```

Enter the **database password** from Supabase Dashboard → Project Settings → Database.

### 5.2 Push migrations

```bash
npm run db:push
# equivalent:
# supabase db push
```

Migration files (in order):

```
supabase/migrations/
  20260701000001_platform_schema.sql
  20260804000002_business_schema.sql
  20260804000003_seed_demo_data.sql
  20260808000004_pelican_hrm_schema.sql
  20260808000005_document_management.sql
  20260809000006_hrm_payment_disbursements.sql
  20260810000007_hrm_custom_forms.sql
  20260810000008_bi_data_warehouse.sql
  20260816000009_hrm_workday_schema.sql
  20260817000010_ops_sales_purchase_crm.sql
  20260818000011_hrm_loans_industry.sql
  20260818000012_catalog_world_crud.sql
```

### 5.3 Verify connectivity

```bash
npm run db:check
```

Expected: `ok: true`, `configured: true`, and `secret: true` when `SUPABASE_SECRET_KEY` is in `.env.local`.

Check migration status:

```bash
npm run db:status
```

Repair a stuck migration (only if Supabase CLI reports drift):

```bash
npm run db:repair
```

---

## 6. Deploy to Vercel

The repo includes `vercel.json`:

- Framework: Next.js
- Install: `pnpm install --frozen-lockfile`
- Build: `pnpm run build`
- Region: `sin1` (Singapore)

### 6.1 Option A — Vercel CLI (fastest)

```bash
cd /path/to/ERP

# First time: authenticate
vercel login

# Link to existing project (or create new)
vercel link

# Preview deployment
vercel deploy

# Production deployment
vercel deploy --prod
```

If the folder name is uppercase (e.g. `ERP`), set the project name explicitly on first deploy:

```bash
vercel deploy --prod --yes
# vercel.json already sets "name": "businesssuite-erp-cloud"
```

### 6.2 Option B — GitHub + Vercel dashboard

1. Push the repo to GitHub (see git steps below).
2. Vercel → **Add New Project** → Import repository.
3. Framework preset: **Next.js** (auto-detected).
4. Build command: `pnpm run build` (or leave default if `vercel.json` is picked up).
5. Install command: `pnpm install --frozen-lockfile`.
6. Add all environment variables from section 4.
7. Click **Deploy**.

### 6.3 Initial git setup (if not on GitHub yet)

```bash
cd /path/to/ERP
git init -b main
git add -A
git status   # confirm no .env.local or secrets staged
git commit -m "Initial commit"
git remote add origin https://github.com/YOUR_ORG/businesssuite-erp-cloud.git
git push -u origin main
```

---

## 7. Post-deploy configuration

### 7.1 Health check

```bash
curl -s https://businesssuite-erp-cloud.vercel.app/api/health/supabase | jq
```

Look for:

- `"ok": true`
- `"configured": true`
- `"keys": { "publishable": true, "secret": true }`
- `"migrated": true`

### 7.2 Stripe webhook

1. Stripe Dashboard → **Developers → Webhooks → Add endpoint**
2. URL: `https://businesssuite-erp-cloud.vercel.app/api/payments/stripe/webhook`
3. Events: subscription and payment events your app handles (checkout, invoice, customer.subscription.*)
4. Copy **Signing secret** → Vercel env `STRIPE_WEBHOOK_SECRET`
5. Redeploy:

```bash
vercel deploy --prod
```

### 7.3 Zoom OAuth (optional)

1. Zoom Marketplace → create OAuth app
2. Redirect URL: `https://businesssuite-erp-cloud.vercel.app/api/integrations/zoom/callback`
3. Set `ZOOM_CLIENT_ID`, `ZOOM_CLIENT_SECRET`, `ZOOM_REDIRECT_URI` on Vercel
4. Redeploy

### 7.4 Custom domain (optional)

Vercel → Project → **Settings → Domains** → add domain → follow DNS instructions.

Then update:

```bash
NEXT_PUBLIC_APP_URL=https://erp.yourcompany.com
ZOOM_REDIRECT_URI=https://erp.yourcompany.com/api/integrations/zoom/callback
```

Redeploy after changing env vars.

---

## 8. Day-to-day commands

| Task | Command |
|------|---------|
| Local dev | `pnpm run dev` |
| Typecheck | `pnpm run typecheck` |
| Production build locally | `pnpm run build` |
| Preview deploy | `vercel deploy` |
| Production deploy | `vercel deploy --prod` |
| View deployment logs | `vercel inspect DEPLOYMENT_URL --logs` |
| List env vars | `vercel env ls production` |
| DB push after new migration | `npm run db:push` |
| Supabase health | `npm run db:check` |

After **any** env var change on Vercel, trigger a new production deploy:

```bash
vercel deploy --prod
```

---

## 9. Smoke test checklist

After deploy, verify:

- [ ] Landing page loads: `/`
- [ ] Login works: `/login`
- [ ] Dashboard after login: `/dashboard`
- [ ] Supabase health: `/api/health/supabase`
- [ ] New modules require auth: `/operations`, `/healthcare`
- [ ] Stripe billing page loads: `/settings/billing` (test mode keys)
- [ ] HRM / CRM pages open without console errors

Demo credentials (if seed migration ran): see `DEMO_CREDENTIALS.txt` in the repo root.

---

## 10. Known limitations on Vercel

1. **Read-only filesystem** — Saving theme (`/api/theme`) or product brand (`/api/product`) writes to `config/theme.json` and `config/product.json`. On serverless, those writes **do not persist** across invocations. Bundled defaults still load; use Supabase/KV later for editable theme in production.

2. **localStorage primary** — Without `SUPABASE_SECRET_KEY` and sync flags, data lives in each user's browser only.

3. **No Firebase** — This stack is Next.js + Supabase Postgres, not Firebase Hosting/Firestore.

4. **Middleware** — Auth gate is cookie-based (`businesssuite_session`). Protected prefixes include `/dashboard`, `/crm`, `/sales`, `/purchases`, `/inventory`, `/hrm`, `/finance`, `/projects`, `/operations`, `/healthcare`, `/documents`, `/reports`, `/settings`, `/billing`, `/activate`.

---

## 11. Troubleshooting

### Build fails on Vercel

```bash
pnpm run build    # reproduce locally
pnpm run typecheck
```

Check Vercel build logs for TypeScript or missing env at build time.

### `secret: false` on health endpoint

`SUPABASE_SECRET_KEY` is missing or wrong on Vercel. Add it under **Environment Variables → Production**, then redeploy.

### `db:push` asks for password / fails

- Reset DB password in Supabase Dashboard if forgotten
- Run `npm run db:link` again
- Ensure Supabase CLI is logged in: `supabase login`

### Project name error (`ERP` folder)

Use `vercel.json` `"name": "businesssuite-erp-cloud"` or deploy from a lowercase folder name.

### Stripe webhook 400

- Confirm `STRIPE_WEBHOOK_SECRET` matches the endpoint in Stripe Dashboard
- Use the **production** Vercel URL in the webhook URL
- Redeploy after updating the secret

---

## 12. Quick reference — full first-time deploy

```bash
# 1. Install
cd /path/to/ERP
pnpm install
cp .env.example .env.local
# edit .env.local with your keys

# 2. Database
supabase login
npm run db:link
npm run db:push
npm run db:check

# 3. Local verify
pnpm run build

# 4. Vercel
vercel login
vercel link
# Add all env vars in Vercel dashboard (section 4)
# Set NEXT_PUBLIC_APP_URL to your Vercel URL

# 5. Deploy
vercel deploy --prod

# 6. Post-deploy
curl -s https://YOUR-APP.vercel.app/api/health/supabase
# Configure Stripe webhook + Zoom redirect URLs
vercel deploy --prod
```

---

## Related files

- `.env.example` — variable template
- `vercel.json` — Vercel build settings
- `supabase/README.md` — database-only notes
- `middleware.ts` — route protection
- `package.json` — `db:*` and `build` scripts
