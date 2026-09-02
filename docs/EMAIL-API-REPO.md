# Email API — separate repository

The Email API **must not** live in the main ERP git repo. Both Vercel projects were deploying from `BusinessSuite.git`, so the `email-api` project showed the Next.js ERP app.

## Repository

- **ERP:** https://github.com/Muhammadkamranlive/BusinessSuite  
- **Email API:** https://github.com/Muhammadkamranlive/BusinessSuite-Email-API (create & push — see below)

Local clone path (after setup): `/Users/kamran/Documents/BusinessSuite-Email-API`

## One-time setup

### 1. Push Email API repo to GitHub

```bash
cd /Users/kamran/Documents/BusinessSuite-Email-API
git commit -m "Initial commit: BusinessSuite Email API for Vercel"
git remote add origin https://github.com/Muhammadkamranlive/BusinessSuite-Email-API.git
git push -u origin main
```

Create the empty repo on GitHub first: **New repository → BusinessSuite-Email-API** (no README).

### 2. Connect Vercel `email-api` project to the new repo

1. [Vercel Dashboard](https://vercel.com) → project **email-api**
2. **Settings → Git** → Disconnect `BusinessSuite` if connected
3. **Connect Git Repository** → select **BusinessSuite-Email-API**
4. **Root Directory:** leave blank (repo root is the API)
5. **Redeploy**

### 3. Keep ERP project on the monorepo only

Project **businesssuite-erp-cloud** stays connected to **BusinessSuite** (root `/`).

Do **not** set a subdirectory for Email API on the ERP project.

## Environment

| Project | Variables |
|---------|-----------|
| `email-api` | `GMAIL_*`, `EMAIL_API_KEY`, `EMAIL_DRY_RUN` |
| `businesssuite-erp-cloud` | `EMAIL_API_URL`, `EMAIL_API_KEY` |

## Local development

Clone both repos side by side:

```bash
cd ~/Documents/BusinessSuite-Email-API && npm install && npm run dev
cd ~/Documents/ERP && npm run dev
```

ERP `.env.local`:

```env
EMAIL_API_URL=http://127.0.0.1:8787
EMAIL_API_KEY=dev-email-key-change-me
```
