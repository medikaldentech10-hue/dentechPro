# Dentech Pro Launch Freeze Report

Generated: 2026-06-25

## Production Baseline

- Production URL: https://dentech-pro.vercel.app
- Verified production deployment id: `CahURwAhYMJLApciUDBL5ma8pDQa`
- Verified deployed commit: `a4b5e96`
- Launch mode: controlled real use

## Scope Freeze

No feature work was performed during this freeze verification.

Do not run before launch unless explicitly approved:

- `sku:normalize:apply`
- `sku:normalize:apply-safe-only`
- image replacement apply
- broad product import
- Batch 02 import

## Known Limitations

- Payment is manual. There is no online checkout.
- Shipping/cargo module is not implemented.
- Batch 01 variants are inserted as inactive draft-safe catalog rows and need admin price, stock, image, and activation review.
- Some JOTA variants remain in manual SKU review.
- SKU reference matcher is the source of truth.
- Legacy SKU normalizer is safety/report-only.
- Signup confirmation email is not expected while Supabase email confirmation is disabled.
- Custom SMTP should be configured before relying on production auth emails.
- Product image standardization is prepared but not applied.

## Critical User Flow Smoke Test

### Logged-out

Routes checked:

- `/login`: 200
- `/register`: 200
- `/products`: 200
- `/products?q=801`: 200
- `/products?q=JOT-801-FG-010`: 200
- `/products?q=polisher`: 200
- `/products?q=arkansas`: 200
- `/request`: 307 redirect to `/login`

Result:

- Catalog browse works.
- No add-to-request controls are visible.
- No admin links are visible.
- No visible price leak was found. Product cards show the hidden/contact state instead of prices.

### Pending User

Test account: `mvp-pending@test.dentech.local`

Result:

- `/products?q=801`: 200
- `/request`: 307 redirect to `/pending-approval`
- No add-to-request controls are visible.
- No visible price access.

### Approved User

Test account: `mvp-doctor@test.dentech.local`

Result:

- `/dashboard`: 200
- `/products?q=JOT-801-FG-010`: 200
- `/request`: 200
- Prices are visible with `+ KDV`.
- Add-to-request controls are available.
- Request draft behavior and request history are covered by `node scripts/verify-request-flow.mjs`.

### Admin

Test account: `mvp-admin@test.dentech.local`

Routes checked:

- `/admin`: 200
- `/admin/users`: 200
- `/admin/products`: 200
- `/admin/products/[test-product-id]`: 200
- `/admin/requests`: 200
- `/admin/requests/[test-request-id]`: 200
- `/admin/customers`: 200
- `/admin/search-logs`: 200

Result:

- Admin dashboard and management routes load.
- Admin product detail loads.
- Admin request detail loads.
- Admin users page loads for approval workflow.
- Admin search logs load.

### PDF Quote Export

Result:

- A temporary test request draft was created, PDF quote route was requested as admin, and the draft was cleaned up.
- `/admin/requests/[id]/quote`: 200
- Content type: `application/pdf`
- PDF size: 13,650 bytes
- No database status, stock, or payment mutation was performed by PDF generation.

## Data Safety Checks

### SKU Integrity

- Duplicate SKU groups: 0
- `npm.cmd run sku:rewrite:dry-reference`: passed
- Reference matcher duplicate target conflicts: 0
- Reference matcher existing target conflicts: 0
- `npm.cmd run sku:normalize:dry`: passed
- Legacy normalizer duplicate target conflicts: 0
- Legacy normalizer existing SKU conflicts: 0

### Batch 01 Inactive Variants

All 8 Batch 01 variants were found and remain inactive:

- `JOT-801-FG-008`
- `JOT-801-FG-021`
- `JOT-801XL-FG-014`
- `JOT-801XL-FG-018`
- `JOT-833-EFG-023`
- `JOT-83O-EFFG-018`
- `JOT-83O-EFFG-021`
- `JOT-83O-EFFG-023`

Batch 01 state:

- `is_active=false`: yes
- `price=null`: yes
- `stock_quantity=0`: yes
- `stock_status=ask_for_stock`: yes

### Addable Active Catalog

- Active addable variants found: 239
- Existing active products remain addable for approved/admin users.
- Inactive Batch 01 variants are not addable publicly.

## Local Verification

- `npm.cmd run lint`: passed
- `npm.cmd run build`: passed
  - Initial sandbox run compiled but hit sandbox `spawn EPERM`.
  - Escalated verification build passed.
- `node scripts/verify-request-flow.mjs`: passed 29/29
- `npm.cmd run sku:rewrite:dry-reference`: passed
- `npm.cmd run sku:normalize:dry`: passed

## Operational Checklist

- Admin user exists.
- Test approved user exists.
- Pending user approval process is understood.
- `/admin/users` is used for registered app users.
- `/admin/customers` is used only for sales/customer records.
- Batch 01 inactive variants need price, stock, image, and activation review before use.
- Do not activate a product or variant without price/stock review.
- Manual payment/request process is understood.
- WhatsApp/order follow-up process is understood.
- Supabase custom SMTP should be configured before expecting production auth emails.
- Use real accessible emails only for testing.
- Do not use fake customer emails for production account tests.
- Do not run legacy SKU apply.
- Do not run image replacement apply.
- Do not import Batch 02 before post-launch catalog planning.

## No-Go Conditions Reviewed

- Price leak: not found
- Unauthorized add controls: not found
- Approved user cannot create request: not found
- Admin cannot view/manage requests: not found
- Admin cannot approve users page inaccessible: not found
- Duplicate SKU conflict: not found
- Build/test failure: not found
- PDF quote broken: not found
- Auth route broken: not found

## Final Status

GO: controlled launch ready
