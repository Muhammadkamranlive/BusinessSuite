# Deploy BusinessSuite online

Two services go live:

| Service | Host | What it runs |
|---------|------|----------------|
| **ERP app + API routes** | [Vercel](https://vercel.com) | Next.js UI + `/api/*` (billing, automation, sync, email proxy) |
| **Email API** | [Render](https://render.com) (or Firebase / Railway) | Express + Nodemailer (Gmail) — templates & send |

Postgres lives on your cloud database project (migrations in `supabase/migrations/`).

---

## Quick checklist

```bash
# 1. Preflight
node scripts/deploy-preflight.mjs
npm run build

# 2. Database migrations (once per project)
npm run db:link    # link your cloud Postgres project
npm run db:push

# 3. Deploy Email API → Render (see § Email API below)
# 4. Deploy ERP → Vercel (see § Vercel below)
# 5. Set EMAIL_API_URL on Vercel to the Render URL
# 6. Smoke test: /api/health/supabase · /api/email/health · /signup
```

---

## 1. Database (migrations)

1. Create a Postgres project (Dashboard → New project).
2. Copy **Project URL** and **API keys** (publishable + secret).
3. Link CLI and push migrations:

```bash
cp .env.example .env.local
# fill NEXT_PUBLIC_SUPABASE_URL, keys, SUPABASE_SECRET_KEY

npm run db:link     # or: supabase link --project-ref YOUR_REF
npm run db:push
npm run db:check
```

---

## 2. Email API (Render — recommended)

The Email API is a standalone Express app in `email-api/`. Vercel serverless is **not** a good fit for long-running SMTP; use Render with the included Dockerfile.

### Option A — Render Blueprint

1. Push this repo to GitHub.
2. [Render Dashboard](https://dashboard.render.com) → **New** → **Blueprint**.
3. Connect the repo — Render reads `render.yaml` at the repo root.
4. Set secrets when prompted:
   - `GMAIL_USER` — sender Gmail address
   - `GMAIL_APP_PASSWORD` — Google App Password (16 chars)
   - `MAIL_FROM` — usually same as GMAIL_USER
5. Deploy. Copy the service URL, e.g. `https://businesssuite-email-api.onrender.com`.

### Option B — Docker (Railway, Fly.io, VPS)

```bash
cd email-api
docker build -t businesssuite-email-api .
docker run -p 8787:8787 \
  -e GMAIL_USER=you@gmail.com \
  -e GMAIL_APP_PASSWORD=xxxx \
  -e EMAIL_API_KEY=your-secret \
  -v email-data:/data \
  businesssuite-email-api
```

Health: `GET https://YOUR-HOST/health`

### Option C — Firebase Functions

See `email-api/README.md` → `firebase deploy --only functions`.

### Point ERP at Email API

On **Vercel**, set (Production + Preview):

```env
EMAIL_API_URL=https://businesssuite-email-api.onrender.com
EMAIL_API_KEY=<same value as on Render>
```

ERP proxies mail through `/api/email/*` — Gmail secrets never go to the browser.

---

## 3. ERP app (Vercel)

Existing production (if already linked):

- App: https://businesssuite-erp-cloud.vercel.app

### First-time deploy

```bash
npm install -g vercel
vercel login
vercel link          # team + project name: businesssuite-erp-cloud

# Set env vars (repeat for each, or use Dashboard → Settings → Environment Variables)
vercel env add NEXT_PUBLIC_SUPABASE_URL production
vercel env add NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY production
vercel env add SUPABASE_SECRET_KEY production
vercel env add NEXT_PUBLIC_APP_URL production
vercel env add EMAIL_API_URL production
vercel env add EMAIL_API_KEY production
vercel env add NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY production
vercel env add STRIPE_SECRET_KEY production
vercel env add STRIPE_WEBHOOK_SECRET production

vercel --prod
```

Or: connect the GitHub repo in the Vercel dashboard — `vercel.json` sets build/install commands.

### Required environment variables

| Variable | Where | Notes |
|----------|-------|-------|
| `NEXT_PUBLIC_SUPABASE_URL` | Vercel | Project URL |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | Vercel | Publishable key |
| `SUPABASE_SECRET_KEY` | Vercel **server only** | Never `NEXT_PUBLIC_` |
| `NEXT_PUBLIC_APP_URL` | Vercel | e.g. `https://businesssuite-erp-cloud.vercel.app` |
| `EMAIL_API_URL` | Vercel | Render / Firebase URL |
| `EMAIL_API_KEY` | Vercel + Email host | Must match |
| `NEXT_PUBLIC_DB_PRIMARY` | Vercel | `true` for cloud demos |
| Stripe keys | Vercel | Billing (optional for mock mode) |

Full list: `.env.example` and `docs/DEPLOY-VERCEL.md`.

---

## 4. Stripe webhook (production billing)

1. Stripe Dashboard → Developers → Webhooks → Add endpoint.
2. URL: `https://YOUR-VERCEL-DOMAIN.vercel.app/api/payments/stripe/webhook`
3. Events: `checkout.session.completed`, `invoice.paid`, `customer.subscription.*` (as needed).
4. Copy signing secret → `STRIPE_WEBHOOK_SECRET` on Vercel.

---

## 5. Smoke tests after deploy

```bash
# ERP health
curl -s https://YOUR-APP.vercel.app/api/health/supabase | jq

# Email API (via ERP proxy)
curl -s https://YOUR-APP.vercel.app/api/email/health | jq

# Email API direct
curl -s https://YOUR-EMAIL-API.onrender.com/health | jq
```

In the browser:

1. Open `/` — marketing site loads.
2. `/signup` — create company (Stripe mock works without keys).
3. Login as demo admin — sidebar modules appear.
4. Rule Engine → test email (needs Email API + `EMAIL_DRY_RUN=false`).

---

## 6. Custom domain

**Vercel:** Project → Settings → Domains → add `erp.yourcompany.com`.

Update:

```env
NEXT_PUBLIC_APP_URL=https://erp.yourcompany.com
ZOOM_REDIRECT_URI=https://erp.yourcompany.com/api/integrations/zoom/callback
```

**Render:** Email API → Settings → Custom Domain (optional).

---

## Troubleshooting

| Symptom | Fix |
|---------|-----|
| `/api/health/supabase` fails | Run `db:push`; check `SUPABASE_SECRET_KEY` |
| Emails not sending | Check `EMAIL_API_URL`, `EMAIL_API_KEY`, Gmail App Password |
| Blank after signup | Set `NEXT_PUBLIC_APP_URL`; complete Stripe or use mock billing |
| Build fails on Vercel | Run `npm run build` locally; ensure lockfile is committed |

More detail: `docs/DEPLOY-VERCEL.md`.
