alter table public.profiles enable row level security;
alter table public.categories enable row level security;
alter table public.products enable row level security;
alter table public.product_variants enable row level security;
alter table public.user_approvals enable row level security;
alter table public.audit_logs enable row level security;
alter table public.customers enable row level security;
alter table public.order_drafts enable row level security;
alter table public.order_items enable row level security;
alter table public.orders enable row level security;
alter table public.payment_links enable row level security;
alter table public.sales_notes enable row level security;
alter table public.discount_permissions enable row level security;
alter table public.search_logs enable row level security;

revoke all on table public.profiles from anon, authenticated;
revoke all on table public.categories from anon, authenticated;
revoke all on table public.products from anon, authenticated;
revoke all on table public.product_variants from anon, authenticated;
revoke all on table public.user_approvals from anon, authenticated;
revoke all on table public.audit_logs from anon, authenticated;
revoke all on table public.customers from anon, authenticated;
revoke all on table public.order_drafts from anon, authenticated;
revoke all on table public.order_items from anon, authenticated;
revoke all on table public.orders from anon, authenticated;
revoke all on table public.payment_links from anon, authenticated;
revoke all on table public.sales_notes from anon, authenticated;
revoke all on table public.discount_permissions from anon, authenticated;
revoke all on table public.search_logs from anon, authenticated;

grant select on table public.profiles to authenticated;
grant update (full_name, phone, user_type) on table public.profiles to authenticated;

grant select on table public.categories to anon, authenticated;
grant select on table public.products to anon, authenticated;
grant select on table public.product_variants to authenticated;

grant all on table public.profiles to service_role;
grant all on table public.categories to service_role;
grant all on table public.products to service_role;
grant all on table public.product_variants to service_role;
grant all on table public.user_approvals to service_role;
grant all on table public.audit_logs to service_role;
grant all on table public.customers to service_role;
grant all on table public.order_drafts to service_role;
grant all on table public.order_items to service_role;
grant all on table public.orders to service_role;
grant all on table public.payment_links to service_role;
grant all on table public.sales_notes to service_role;
grant all on table public.discount_permissions to service_role;
grant all on table public.search_logs to service_role;

drop policy if exists "Authenticated users can read own profile" on public.profiles;
create policy "Authenticated users can read own profile"
on public.profiles
for select
to authenticated
using ((select auth.uid()) = id);

drop policy if exists "Authenticated users can update safe own profile fields" on public.profiles;
create policy "Authenticated users can update safe own profile fields"
on public.profiles
for update
to authenticated
using ((select auth.uid()) = id)
with check ((select auth.uid()) = id);

drop policy if exists "Anyone can read active categories" on public.categories;
create policy "Anyone can read active categories"
on public.categories
for select
to anon, authenticated
using (status = 'active');

drop policy if exists "Anyone can read active products" on public.products;
create policy "Anyone can read active products"
on public.products
for select
to anon, authenticated
using (is_active = true);

drop policy if exists "Approved roles can read active variants" on public.product_variants;
create policy "Approved roles can read active variants"
on public.product_variants
for select
to authenticated
using (
  is_active = true
  and exists (
    select 1
    from public.products
    where products.id = product_variants.product_id
      and products.is_active = true
  )
  and exists (
    select 1
    from public.profiles
    where profiles.id = (select auth.uid())
      and profiles.is_active = true
      and profiles.can_view_prices = true
      and profiles.role in (
        'admin',
        'sales_rep',
        'approved_doctor',
        'approved_lab',
        'approved_vet'
      )
  )
);
