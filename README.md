# Dentech Pro

Production-ready Next.js MVP for DENTech Medikal's B2B dental product search,
sales, admin, and order request platform.

## Stack

- Next.js App Router
- TypeScript
- Tailwind CSS v4
- shadcn/ui
- Supabase client setup
- Vercel-ready structure

## Run Locally

```bash
npm install
npm run dev
```

Open http://localhost:3000.

Copy `.env.example` to `.env.local` and fill the Supabase and WhatsApp values.

Set `DENTECH_WHATSAPP_NUMBER` in `.env.local` to control where request-list
WhatsApp messages are sent. The MVP placeholder value is `905XXXXXXXXX`; use a
country-code-prefixed number without `+`.

## Product Import

Import the initial JOTA MVP catalog with:

```bash
npm run import:products
```

Import an Ikas CSV export from `scripts/data/ikas-urunler.csv` with:

```bash
npm run import:ikas
```

The importer creates missing JOTA categories and idempotently updates products
by `product_group_code` or slug/name fallback, and variants by SKU/variant code.
It requires `NEXT_PUBLIC_SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` in the
environment. Do not expose the service role key to browser code.

The seed import is treated as the source of truth for the product and variant
fields handled by `scripts/import-products.mjs`. Manual admin edits to those
same fields can be overwritten when the import is re-run.

## JOTA SKU Maintenance

The authoritative SKU source for JOTA cleanup is
`scripts/data/jota-sku-reference.csv` and the guarded matcher in
`scripts/rewrite-jota-skus-from-reference.mjs`.

Use:

```bash
npm run sku:rewrite:dry-reference
npm run sku:rewrite:apply-safe-reference
```

Only run the apply command after the dry-run reports zero duplicate target
conflicts, zero existing target conflicts, and a positive safe update count.
Rows moved to manual review must stay untouched until reviewed.

`npm run sku:normalize:dry` is now a legacy safety report only. It may still be
useful for duplicate checks, but its apply command is disabled because it can
suggest reverting reference-based polisher SKUs.

## JOTA Batch 01 Missing Variant Workflow

Batch 01 missing variants are planned from
`scripts/reports/jota-missing-products-batch-01-preview.csv`. The batch insert
workflow is intentionally conservative:

```bash
npm run products:jota-batch-01:dry
npm run products:jota-batch-01:apply
```

The dry-run must show all 8 expected rows as `safe_to_insert=true` before apply.
Apply creates only missing variant rows for existing product families, never
overwrites existing products/variants, and inserts new rows as inactive with
`price=null`, `stock_quantity=0`, and `stock_status=ask_for_stock`. Admin must
complete price, stock, image review, and activation before these variants become
visible in the public catalog.

## Vercel Deployment

Set these environment variables in Vercel for Production and Preview:

```bash
NEXT_PUBLIC_SUPABASE_URL=https://<project-ref>.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=<supabase-anon-key>
SUPABASE_SERVICE_ROLE_KEY=<supabase-service-role-key>
DENTECH_WHATSAPP_NUMBER=905XXXXXXXXX
```

Security notes:

- `SUPABASE_SERVICE_ROLE_KEY` is server-only. Never prefix it with
  `NEXT_PUBLIC_`, never expose it in client components, and keep it limited to
  Vercel server runtime variables.
- `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` are safe for
  browser use and are used by Supabase SSR/browser clients.
- RLS policies are expected to remain enabled on the Supabase project.
- The app uses `src/proxy.ts` to refresh Supabase SSR auth cookies on Vercel.
- Product cards use lazy native images with fallbacks, so no Next Image remote
  domain configuration is currently required.

Recommended Vercel settings:

- Framework preset: Next.js
- Install command: `npm install`
- Build command: `npm run build`
- Output directory: leave default

## Supabase Setup

Apply migrations before the first production deployment:

```bash
supabase db push
```

Required Supabase Auth settings:

- Enable email/password sign-in.
- Configure Site URL to the Vercel production URL.
- Add local and preview URLs to Auth redirect URLs as needed, for example
  `http://localhost:3000` and `https://<preview-domain>`.
- Email confirmation is disabled for the MVP when immediate login after admin
  approval is required. In that configuration, a signup confirmation email is
  not expected to be sent.
- Configure a custom SMTP provider before relying on production auth emails.
  Use only real, accessible test email addresses when testing email delivery.

After creating the first user through `/register`, promote that profile to admin
from the Supabase SQL editor:

```sql
update public.profiles
set
  role = 'admin',
  verification_status = 'approved',
  can_view_prices = true,
  is_active = true
where email = 'admin@example.com';
```

Replace `admin@example.com` with the registered admin email. Do not run this for
ordinary users; use the admin approval panel after the first admin exists.

## Current Scope

This is an MVP foundation. It includes public, user, sales, and admin route
groups; B2B request language; JOTA-focused categories; Supabase auth helpers;
admin approval; a server-side product catalog service; Ikas CSV import; admin
product/customer/request management; stock transitions; manual payment notes;
and draft request-list submission to WhatsApp. AI search, final payment
integration, and shipping/cargo workflows are intentionally not implemented yet.
