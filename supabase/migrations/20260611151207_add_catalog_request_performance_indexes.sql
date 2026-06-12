create extension if not exists pg_trgm with schema extensions;

create index if not exists products_active_brand_category_updated_idx
on public.products (is_active, brand, category_id, updated_at desc);

create index if not exists products_brand_active_name_idx
on public.products (brand, is_active, product_name);

create index if not exists products_product_name_trgm_idx
on public.products using gin (product_name gin_trgm_ops);

create index if not exists products_product_group_code_trgm_idx
on public.products using gin (product_group_code gin_trgm_ops);

create index if not exists product_variants_product_active_idx
on public.product_variants (product_id, is_active);

create index if not exists product_variants_variant_code_trgm_idx
on public.product_variants using gin (variant_code gin_trgm_ops);

create index if not exists product_variants_manufacturer_ref_trgm_idx
on public.product_variants using gin (manufacturer_ref gin_trgm_ops);

create index if not exists order_drafts_status_source_created_idx
on public.order_drafts (status, source, created_at desc);
