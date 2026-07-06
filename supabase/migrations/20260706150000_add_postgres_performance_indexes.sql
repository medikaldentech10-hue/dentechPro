create index if not exists order_drafts_created_by_updated_idx
on public.order_drafts (created_by_user_id, updated_at desc);

create index if not exists order_drafts_created_by_status_updated_idx
on public.order_drafts (created_by_user_id, status, updated_at desc);

create index if not exists order_drafts_created_at_desc_idx
on public.order_drafts (created_at desc);

create index if not exists profiles_created_at_desc_idx
on public.profiles (created_at desc);

create index if not exists profiles_role_created_at_idx
on public.profiles (role, created_at desc);

create index if not exists profiles_verification_status_created_at_idx
on public.profiles (verification_status, created_at desc);

create index if not exists products_is_active_usage_area_idx
on public.products (is_active, usage_area);

create index if not exists product_variants_active_stock_quantity_idx
on public.product_variants (is_active, stock_quantity);

create index if not exists audit_logs_entity_action_created_idx
on public.audit_logs (entity_type, entity_id, action, created_at desc);
