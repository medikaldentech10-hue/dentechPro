# Dentech Pro

Production-ready Next.js skeleton for DENTech Medikal's B2B dental product search, sales, and order request platform.

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

Copy `.env.example` to `.env.local` and fill Supabase values when auth/data work begins.

Set `DENTECH_WHATSAPP_NUMBER` in `.env.local` to control where request-list
WhatsApp messages are sent. The MVP placeholder value is `905XXXXXXXXX`; use a
country-code-prefixed number without `+`.

## Product Import

Import the initial JOTA MVP catalog with:

```bash
npm run import:products
```

The importer reads `scripts/data/jota-mvp-products.json`, creates missing JOTA
categories, and idempotently updates products by `product_group_code` and
variants by `variant_code`. It requires `NEXT_PUBLIC_SUPABASE_URL` and
`SUPABASE_SERVICE_ROLE_KEY` in the environment. Do not expose the service role
key to browser code.

The seed import is treated as the source of truth for the product and variant
fields handled by `scripts/import-products.mjs`. Manual admin edits to those
same fields can be overwritten when the import is re-run.

## Current Scope

This is an MVP foundation. It includes public, user, sales, and admin route
groups; B2B request language; JOTA-focused categories; Supabase auth helpers;
admin approval; a server-side product catalog service; and draft request-list
submission to WhatsApp. AI search, final order conversion, payment logic, and
product import from the full Ikas export are intentionally not implemented yet.
