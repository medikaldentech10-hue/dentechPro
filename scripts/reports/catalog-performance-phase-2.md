# Catalog Performance Phase 2

## Scope

This pass targets `/products` route latency without changing auth, RLS, request flow, pricing rules, product import, SKU scripts, image workflow, or product card presentation.

## Confirmed Bottleneck

Before this pass, `src/lib/products.ts` used a broad list query:

- queried up to 5000 active products for the selected brand
- loaded active variants for every returned product
- applied search matching in application memory
- grouped families in application memory after broad hydration
- awaited catalog search analytics separately in the page render path before the previous safe patch moved it to `after()`

This made common catalog routes slow even with pagination because pagination happened after broad product and variant loading.

## Query Strategy Before

1. Fetch many active products with category data.
2. Fetch variants for all those products.
3. Match product/category/variant search terms in memory.
4. Group visible rows into product families.
5. Slice the grouped result for the requested page.

## Query Strategy After

1. For non-search catalog pages, fetch only a bounded product window for the current page instead of the full catalog.
2. For search pages, ask Supabase for candidate product ids first:
   - exact SKU-like searches query `product_variants.variant_code` / `manufacturer_ref`
   - model/code/text searches query variant fields and product fields
   - category terms resolve to category ids, then to candidate product ids
3. Hydrate only candidate/windowed products and their active variants.
4. Keep family grouping and exact variant selector behavior on the reduced candidate set.
5. Continue selecting explicit columns only.

## Pagination / Limit Behavior

- Product page size remains 24 cards.
- Non-search pages fetch a bounded raw product window of `pageSize * 4` before grouping.
- Search pages cap candidate product hydration to 500 product rows.
- Active variants only are loaded for listing cards.
- Inactive Batch 01 variants remain excluded from public addable options.

## Safety Notes

- Public/pending product list queries still omit price and stock fields.
- Approved/admin list queries can include price/stock as before.
- Product detail behavior is not changed in this pass.
- SKU scripts and image replacement workflows were not applied.

## Before Median Timings

Measured against production before deploying this Phase 2 query change, 3 runs per route:

| Route | Median |
| --- | ---: |
| `/products` | 2429ms |
| `/products?q=801` | 2236ms |
| `/products?q=JOT-801-FG-010` | 2209ms |
| `/products?q=polisher` | 2351ms |
| `/products?q=arkansas` | 1791ms |
| `/products?q=JOT-859L-FG-014` | 1970ms |

## Remaining Risks

- Family grouping is still application-side.
- Search relevance still depends on candidate queries plus local scoring.
- If category pages need exact grouped counts, a future database-backed family key or materialized search view would be cleaner.
