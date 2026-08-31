# BusinessSuite Email API

Shared **Email & Notification** infrastructure for the ERP. Modules call this service instead of sending mail themselves.

## Stack

- Node.js + Express
- Nodemailer → Gmail (App Password)
- JSON template store (`data/templates.json`)
- Firebase Functions wrapper (`src/firebase.js`) for HTTPS deploy

## Quick start (local)

```bash
cd email-api
cp .env.example .env
# edit GMAIL_USER + GMAIL_APP_PASSWORD (Google Account → App passwords)
npm install
npm run dev   # nodemon — auto-restarts on src/ changes
```

Health: `GET http://127.0.0.1:8787/health`

### Dry run (no real send)

```env
EMAIL_DRY_RUN=true
```

## API

| Method | Path | Purpose |
|--------|------|---------|
| GET | `/health` | Transport check |
| GET | `/templates` | List templates |
| GET | `/templates/key/:key` | Get by key |
| POST | `/templates` | Create template |
| PUT | `/templates/:id` | Update |
| DELETE | `/templates/:id` | Delete (non-system) |
| POST | `/templates/preview` | Render preview |
| POST | `/templates/reset-system` | Re-seed built-in templates |
| POST | `/send` | Send raw or templated email |

### Send with template

```json
POST /send
{
  "to": "user@company.com",
  "templateKey": "user.credentials",
  "tenantId": "alpha",
  "variables": {
    "company_name": "Alpha Trading",
    "user_name": "Sara",
    "user_email": "sara@alpha.com",
    "password": "TempPass123!",
    "role_label": "HR Manager",
    "login_url": "https://app.example.com/login"
  }
}
```

Auth (optional): header `x-email-api-key: <EMAIL_API_KEY>`

## Built-in template keys

- `user.credentials`
- `leave.submitted` / `leave.approved` / `leave.rejected`
- `invoice.generated`
- `order.approved`
- `survey.assigned`
- `generic.notification`

## Deploy on Vercel (recommended)

The Email API runs as a **separate Vercel project** (`email-api/`) — not Firebase.

```bash
cd email-api
npx vercel deploy --prod --yes
```

Production URL (example): `https://email-api-olive.vercel.app`

### Vercel environment variables

In **Vercel → email-api → Settings → Environment Variables** (Production):

| Variable | Description |
|----------|-------------|
| `GMAIL_USER` | Sender Gmail address |
| `GMAIL_APP_PASSWORD` | Google App Password (16 chars) |
| `MAIL_FROM` | Usually same as GMAIL_USER |
| `MAIL_FROM_NAME` | e.g. BusinessSuite ERP |
| `EMAIL_API_KEY` | Shared secret with ERP |
| `EMAIL_DRY_RUN` | `false` for live send |

Then **Redeploy** the email-api project.

### Wire ERP (main Vercel app)

On **businesssuite-erp-cloud** → Environment Variables:

```env
EMAIL_API_URL=https://email-api-olive.vercel.app
EMAIL_API_KEY=<same as email-api project>
```

Redeploy ERP: `npx vercel deploy --prod --yes`

Health checks:

```bash
curl https://email-api-olive.vercel.app/health
curl https://businesssuite-erp-cloud.vercel.app/api/email/health
```

**Note:** Template edits on Vercel use `/tmp` storage (ephemeral). Built-in system templates always seed on cold start. For durable custom templates, use the ERP **Email templates** admin or deploy with a persistent disk host instead.

## Firebase deploy (optional)

```bash
cd email-api
npm install
# set secrets in Firebase / Google Cloud:
# GMAIL_USER, GMAIL_APP_PASSWORD, EMAIL_API_KEY, MAIL_FROM_NAME
firebase deploy --only functions
```

Point the ERP env vars:

```env
EMAIL_API_URL=https://us-central1-<project>.cloudfunctions.net/emailApi
EMAIL_API_KEY=...
```

## ERP wiring

Next.js proxies through `/api/email/*` (`lib/email/server.ts` → `EMAIL_API_URL`) so browser code never holds Gmail secrets.

| ERP call site | Template key |
|---------------|--------------|
| Admin user invite (`inviteUser`) | `user.credentials` |
| HRM leave create / approve / reject | `leave.submitted` / `leave.approved` / `leave.rejected` |
| Sales invoice create | `invoice.generated` |
| Sales order confirmed | `order.approved` |
| HR forms assign | `survey.assigned` |

Admin UI: **Administration → Email templates** (`/settings/email-templates`).

Root scripts: `npm run email:install` · `npm run email:dev`

