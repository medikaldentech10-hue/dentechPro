# Dentech Pro Go-Live Checklist

Generated: 2026-06-25

## Auth

- [ ] Register works with a real accessible email address.
- [ ] New users land in `pending_user` / pending approval state.
- [ ] Admin approval changes role, verification status, and price access correctly.
- [ ] Suspended users are blocked from protected dashboards.
- [ ] Login/logout works across public, user, sales, and admin routes.

## User And Customer Separation

- [ ] `/admin/users` lists registered app users from `profiles`.
- [ ] Approved users remain visible in `/admin/users` after approval.
- [ ] `/admin/customers` lists only sales/customer records from `customers`.
- [ ] Registered auth users are not shown as sales customers unless explicitly created there.

## Catalog

- [ ] `/products` loads quickly with pagination.
- [ ] Search works for product names, SKU/code, holder, diameter, color/grit, usage, and category terms.
- [ ] Category filters work and preserve pagination.
- [ ] SKU search works for normalized reference SKUs.
- [ ] Grouped product family cards and exact variant selector still work.
- [ ] Inactive products and variants are not addable in the public catalog.
- [ ] Batch 01 JOTA variants stay inactive until admin completes price, stock, image, and activation.

## Pricing

- [ ] Logged-out visitors do not see prices.
- [ ] Pending users do not see prices.
- [ ] Approved users, sales reps, and admins see prices with `+ KDV`.
- [ ] Client forms do not expose unit price fields.

## Request Flow

- [ ] Approved user can add an exact variant to request list.
- [ ] Request draft quantity edit and item removal work.
- [ ] WhatsApp request submission works.
- [ ] Request history remains visible after submission.
- [ ] Admin request detail loads.
- [ ] PDF quote download works and totals match the request detail.

## Admin

- [ ] Product edit persists.
- [ ] Variant edit persists for SKU, price, stock, stock status, image URL, and active/passive state.
- [ ] Inactive Batch 01 variants show in admin product detail.
- [ ] Admin sees warning before activating inactive variants: `Fiyat ve stok kontrol edilmeden aktif etmeyin.`
- [ ] Active/passive product toggle works.
- [ ] Active/passive variant toggle works.
- [ ] User approval panel works.
- [ ] Search logs page loads and shows recent/top/no-result searches.

## Email

- [ ] Signup confirmation email is not expected while Supabase email confirmation is disabled.
- [ ] Custom SMTP is configured before relying on production auth emails.
- [ ] Test only with real accessible email addresses.

## SEO And Basic Public Hygiene

- [ ] Title and metadata are acceptable for launch.
- [ ] Robots/sitemap behavior is acceptable for MVP launch.
- [ ] No visible public product copy leaks UUID-like internal IDs.
- [ ] Public pages have no Server Component or hydration crash.
- [ ] Product images render with fallback behavior.

## Known Limitations

- Payment is manual tracking only, not online checkout.
- Shipping/cargo workflow is not implemented.
- Some JOTA variants remain inactive or require manual review.
- Batch 02 products are not inserted yet.
- Legacy SKU normalizer is safety-only and not the SKU source of truth.
- Reference SKU matcher is the current SKU source of truth.
