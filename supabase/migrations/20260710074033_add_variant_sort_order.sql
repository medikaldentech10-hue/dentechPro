alter table public.product_variants
add column if not exists sort_order integer not null default 0;

update public.product_variants as uuid_variant
set is_active = false
where uuid_variant.is_active = true
  and btrim(uuid_variant.variant_code) ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$'
  and exists (
    select 1
    from public.product_variants as real_variant
    where real_variant.id <> uuid_variant.id
      and real_variant.product_id = uuid_variant.product_id
      and real_variant.is_active = true
      and btrim(real_variant.variant_code) <> ''
      and btrim(real_variant.variant_code) !~* '^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$'
      and real_variant.connection_type is not distinct from uuid_variant.connection_type
      and real_variant.color is not distinct from uuid_variant.color
      and real_variant.diameter is not distinct from uuid_variant.diameter
      and real_variant.grit is not distinct from uuid_variant.grit
      and real_variant.length is not distinct from uuid_variant.length
      and real_variant.package_quantity is not distinct from uuid_variant.package_quantity
  );

create index if not exists product_variants_catalog_sort_idx
on public.product_variants (
  product_id,
  connection_type,
  grit,
  color,
  diameter,
  length,
  sort_order
)
where is_active = true;
