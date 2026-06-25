# JOTA SKU Post-Apply Verification

Generated: 2026-06-24

## Scope

- Verified normalized JOTA SKU search after guarded safe-only apply.
- No SKU apply was run during this verification.
- No image replacement apply was run.
- Auth, RLS, request flow, stock/payment, PDF, search, AI, analytics, grouping, variant selector, image workflow, and schema were not changed.

## Database Verification

- Total variants checked: 321
- JOTA/JOTA-related variants: 321
- Normalized SKUs starting with `JOT-`: 189
- Remaining old/non-normalized SKUs: 132
- Duplicate SKU groups: 0

Restored rows confirmed:

| Variant ID | SKU | Product |
| --- | --- | --- |
| `a953a6c0-9b0d-47ef-840b-2893bf4d0697` | `JOTA-852-FG-014` | 852 Chamfer Elmas Frez |
| `43fe662d-2117-4161-8b42-c3b2ac27f0ec` | `JOTA-CQ1-FG-010` | CQ1 Karbit Frez |

Exact SKU lookup counts:

| SKU | Count |
| --- | ---: |
| `JOT-881-FFG-016` | 1 |
| `JOT-881-SGFG-012` | 1 |
| `JOT-9813-FRA-060` | 1 |
| `JOT-9813-GRA-060` | 1 |
| `JOTA-852-FG-014` | 1 |
| `JOTA-CQ1-FG-010` | 1 |

## Production Route Checks

All routes returned `200 OK` unless noted.

| Route | Result | Logged-out price leak | Add controls exposed | Visible UUID | 55.8 regression |
| --- | --- | --- | --- | --- | --- |
| `/products?q=JOT-881-FFG-016` | 200 | No | No | No | No |
| `/products?q=JOT-881-SGFG-012` | 200 | No | No | No | No |
| `/products?q=JOT-9813-FRA-060` | 200 | No | No | No | No |
| `/products?q=JOT-9813-GRA-060` | 200 | No | No | No | No |
| `/products?q=JOTA-852-FG-014` | 200 | No | No | No | No |
| `/products?q=JOTA-CQ1-FG-010` | 200 | No | No | No | No |
| `/products?q=881` | 200 | No | No | No | No |
| `/products?q=014` | 200 | No | No | No | No |
| `/products/8456358d-2455-4514-9d1d-dfc281b54f86` | 200 | No | No | No | No |
| `/products/8456358d-2455-4514-9d1d-dfc281b54f86?variant=8b92b0b2-816d-4a30-95b8-a925df08f09d` | 200 | No | No | No | No |

Admin route protection:

| Route | Logged-out Result |
| --- | --- |
| `/admin/products` | 307 -> `/login` |
| `/admin/products/8456358d-2455-4514-9d1d-dfc281b54f86` | 307 -> `/login` |

## Admin/Product Detail Display

- Live DB confirms normalized SKU `JOT-881-FFG-016` exists on variant `8b92b0b2-816d-4a30-95b8-a925df08f09d`.
- Product detail loads with and without selected variant query.
- Logged-out admin routes remain protected.
- Request-flow verification confirmed admin and approved-user price visibility paths still work.

## Selector And Request Flow

- `node scripts/verify-request-flow.mjs` passed.
- Exact SKU appears in WhatsApp/request output.
- Add-to-request remains unavailable for logged-out and pending users.
- Approved/admin product add paths remain available.
- Draft/request lifecycle still preserves stock.

## Local Verification

- `npm.cmd run sku:normalize:dry`: passed
  - `safe_to_apply_count`: 0
  - `duplicate_conflict_count`: 0
  - `existing_conflict_count`: 0
  - `unsafe_skipped_count`: 132
- `npm.cmd run lint`: passed
- `npm.cmd run build`: passed
- `node scripts/verify-request-flow.mjs`: passed, 29 passed / 0 failed / 0 bugs

## Issues Found

- No duplicate SKU conflicts found.
- No existing SKU conflicts found.
- No `558 -> 55.8` regression found.
- No visible UUID leak found in stripped page text.
- Raw HTML still contains UUIDs in route hrefs and CDN image URLs because current product/detail routing and Ikas asset URLs use IDs internally; these were not visible product copy.
