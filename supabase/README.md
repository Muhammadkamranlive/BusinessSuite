# BusinessSuite ERP Cloud — Supabase

## Direct apply (like `db push`)

```bash
# 1) one-time: link this folder to your remote project
npm run db:link
# or:
# supabase link --project-ref xknvxjzrtfgvuiaiccii

# 2) push all migrations to remote
npm run db:push
# same as:
# supabase db push
```

`db:link` will ask for your **database password**  
(Dashboard → Project Settings → Database → Database password).

## Migration files

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
  20260824000013_demo_full_client_seed.sql
```

## Verify

```bash
npm run db:check
npm run db:seed:verify
```

cd /Users/kamran/Documents/ERP

set -a
source .env.local
set +a

for key in SUPABASE_SECRET_KEY NEXT_PUBLIC_SUPABASE_URL NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY NEXT_PUBLIC_DB_PRIMARY; do
  val="${(P)key}"
  if [[ -n "$val" ]]; then
    printf '%s' "$val" | npx vercel env add "$key" production,preview,development --force --yes --sensitive
    echo "→ $key"
  fi
done

npx vercel deploy --prod --yes