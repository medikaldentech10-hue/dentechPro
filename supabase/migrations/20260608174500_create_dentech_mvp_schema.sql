create extension if not exists pgcrypto;

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text,
  email text,
  phone text,
  role text not null default 'pending_user',
  user_type text,
  verification_status text not null default 'pending',
  can_view_prices boolean not null default false,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint profiles_role_check check (
    role in (
      'admin',
      'sales_rep',
      'pending_user',
      'approved_doctor',
      'approved_lab',
      'approved_vet',
      'suspended_user'
    )
  ),
  constraint profiles_user_type_check check (
    user_type is null
    or user_type in ('doctor', 'lab', 'vet', 'sales', 'admin', 'other')
  ),
  constraint profiles_verification_status_check check (
    verification_status in ('pending', 'approved', 'rejected', 'suspended')
  ),
  constraint profiles_price_visibility_check check (
    can_view_prices = false
    or role in ('admin', 'sales_rep', 'approved_doctor', 'approved_lab', 'approved_vet')
  )
);

create table public.customers (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  company_name text,
  customer_type text not null,
  phone text,
  email text,
  city text,
  district text,
  tax_no text,
  invoice_address text,
  assigned_sales_rep_id uuid references public.profiles(id),
  notes text,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint customers_customer_type_check check (
    customer_type in ('doctor', 'clinic', 'lab', 'vet', 'dealer', 'other')
  )
);

create table public.categories (
  id uuid primary key default gen_random_uuid(),
  parent_id uuid references public.categories(id),
  name text not null,
  slug text unique not null,
  status text not null default 'active',
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint categories_status_check check (
    status in ('active', 'coming_soon', 'disabled')
  )
);

create table public.products (
  id uuid primary key default gen_random_uuid(),
  brand text not null default 'JOTA',
  category_id uuid references public.categories(id),
  product_group_code text not null,
  product_name text not null,
  description text,
  usage_area text,
  target_user_type text[],
  material_tags text[],
  procedure_tags text[],
  image_url text,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.product_variants (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products(id) on delete cascade,
  variant_code text not null,
  manufacturer_ref text,
  ikas_product_id text,
  ikas_url text,
  connection_type text,
  iso_shank text,
  diameter numeric,
  length numeric,
  grit text,
  color text,
  package_quantity integer not null default 1,
  price numeric(12, 2),
  currency text not null default 'TRY',
  stock_quantity integer not null default 0,
  reserved_quantity integer not null default 0,
  stock_status text not null default 'in_stock',
  uts_no text,
  image_url text,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint product_variants_package_quantity_check check (package_quantity > 0),
  constraint product_variants_price_check check (price is null or price >= 0),
  constraint product_variants_stock_quantity_check check (stock_quantity >= 0),
  constraint product_variants_reserved_quantity_check check (reserved_quantity >= 0),
  constraint product_variants_stock_status_check check (
    stock_status in ('in_stock', 'low_stock', 'out_of_stock', 'ask_for_stock')
  )
);

create table public.order_drafts (
  id uuid primary key default gen_random_uuid(),
  created_by_user_id uuid references public.profiles(id),
  customer_id uuid references public.customers(id),
  source text not null default 'web',
  status text not null default 'draft',
  subtotal numeric(12, 2) not null default 0,
  discount_total numeric(12, 2) not null default 0,
  total numeric(12, 2) not null default 0,
  note text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint order_drafts_source_check check (
    source in ('web', 'sales', 'whatsapp', 'admin')
  ),
  constraint order_drafts_status_check check (
    status in (
      'draft',
      'whatsapp_approval_pending',
      'payment_pending',
      'payment_received',
      'preparing',
      'shipped',
      'completed',
      'cancelled'
    )
  ),
  constraint order_drafts_subtotal_check check (subtotal >= 0),
  constraint order_drafts_discount_total_check check (discount_total >= 0),
  constraint order_drafts_total_check check (total >= 0)
);

create table public.order_items (
  id uuid primary key default gen_random_uuid(),
  order_draft_id uuid not null references public.order_drafts(id) on delete cascade,
  variant_id uuid not null references public.product_variants(id),
  quantity integer not null default 1,
  unit_price numeric(12, 2),
  discount_percent numeric(5, 2) not null default 0,
  discount_amount numeric(12, 2) not null default 0,
  line_total numeric(12, 2) not null default 0,
  note text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint order_items_quantity_check check (quantity > 0),
  constraint order_items_unit_price_check check (unit_price is null or unit_price >= 0),
  constraint order_items_discount_percent_check check (
    discount_percent >= 0 and discount_percent <= 100
  ),
  constraint order_items_discount_amount_check check (discount_amount >= 0),
  constraint order_items_line_total_check check (line_total >= 0)
);

create table public.orders (
  id uuid primary key default gen_random_uuid(),
  order_draft_id uuid references public.order_drafts(id),
  customer_id uuid references public.customers(id),
  created_by_user_id uuid references public.profiles(id),
  status text not null default 'whatsapp_approval_pending',
  payment_status text not null default 'unpaid',
  payment_method text,
  payment_link text,
  cargo_company text,
  cargo_tracking_no text,
  total numeric(12, 2) not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint orders_status_check check (
    status in (
      'whatsapp_approval_pending',
      'payment_pending',
      'payment_received',
      'preparing',
      'shipped',
      'completed',
      'cancelled'
    )
  ),
  constraint orders_payment_status_check check (
    payment_status in ('unpaid', 'pending', 'paid', 'refunded', 'cancelled')
  ),
  constraint orders_payment_method_check check (
    payment_method is null
    or payment_method in ('iban', 'pos_link', 'ikas_link', 'cash', 'other')
  ),
  constraint orders_total_check check (total >= 0)
);

create table public.payment_links (
  id uuid primary key default gen_random_uuid(),
  order_id uuid references public.orders(id) on delete cascade,
  provider text,
  url text not null,
  status text not null default 'active',
  expires_at timestamptz,
  created_by_user_id uuid references public.profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint payment_links_status_check check (
    status in ('active', 'used', 'expired', 'cancelled')
  )
);

create table public.sales_notes (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid references public.customers(id) on delete cascade,
  sales_rep_id uuid references public.profiles(id),
  note text not null,
  follow_up_date date,
  status text not null default 'open',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint sales_notes_status_check check (status in ('open', 'done', 'cancelled'))
);

create table public.user_approvals (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.profiles(id) on delete cascade,
  reviewed_by_user_id uuid references public.profiles(id),
  status text not null default 'pending',
  note text,
  reviewed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint user_approvals_status_check check (
    status in ('pending', 'approved', 'rejected', 'suspended')
  )
);

create table public.discount_permissions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid unique references public.profiles(id) on delete cascade,
  can_apply_discount boolean not null default false,
  max_discount_percent numeric(5, 2) not null default 0,
  requires_admin_approval_above numeric(5, 2),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint discount_permissions_max_discount_percent_check check (
    max_discount_percent >= 0 and max_discount_percent <= 20
  ),
  constraint discount_permissions_requires_admin_approval_above_check check (
    requires_admin_approval_above is null
    or (
      requires_admin_approval_above >= 0
      and requires_admin_approval_above <= 20
    )
  )
);

create table public.search_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.profiles(id),
  query text not null,
  detected_intent text,
  result_count integer not null default 0,
  used_ai boolean not null default false,
  created_at timestamptz not null default now(),
  constraint search_logs_result_count_check check (result_count >= 0)
);

create table public.audit_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.profiles(id),
  action text not null,
  entity_type text not null,
  entity_id uuid,
  old_value jsonb,
  new_value jsonb,
  ip_address inet,
  created_at timestamptz not null default now()
);

create trigger set_profiles_updated_at
before update on public.profiles
for each row execute function public.set_updated_at();

create trigger set_customers_updated_at
before update on public.customers
for each row execute function public.set_updated_at();

create trigger set_categories_updated_at
before update on public.categories
for each row execute function public.set_updated_at();

create trigger set_products_updated_at
before update on public.products
for each row execute function public.set_updated_at();

create trigger set_product_variants_updated_at
before update on public.product_variants
for each row execute function public.set_updated_at();

create trigger set_order_drafts_updated_at
before update on public.order_drafts
for each row execute function public.set_updated_at();

create trigger set_order_items_updated_at
before update on public.order_items
for each row execute function public.set_updated_at();

create trigger set_orders_updated_at
before update on public.orders
for each row execute function public.set_updated_at();

create trigger set_payment_links_updated_at
before update on public.payment_links
for each row execute function public.set_updated_at();

create trigger set_sales_notes_updated_at
before update on public.sales_notes
for each row execute function public.set_updated_at();

create trigger set_user_approvals_updated_at
before update on public.user_approvals
for each row execute function public.set_updated_at();

create trigger set_discount_permissions_updated_at
before update on public.discount_permissions
for each row execute function public.set_updated_at();

create index profiles_role_idx on public.profiles (role);
create index profiles_verification_status_idx on public.profiles (verification_status);
create index profiles_email_idx on public.profiles (email);

create index customers_assigned_sales_rep_id_idx on public.customers (assigned_sales_rep_id);
create index customers_customer_type_idx on public.customers (customer_type);
create index customers_city_idx on public.customers (city);
create index customers_is_active_idx on public.customers (is_active);

create index categories_parent_id_idx on public.categories (parent_id);
create index categories_status_idx on public.categories (status);
create index categories_sort_order_idx on public.categories (sort_order);

create index products_product_group_code_idx on public.products (product_group_code);
create index products_brand_idx on public.products (brand);
create index products_category_id_idx on public.products (category_id);
create index products_is_active_idx on public.products (is_active);

create index product_variants_variant_code_idx on public.product_variants (variant_code);
create index product_variants_manufacturer_ref_idx on public.product_variants (manufacturer_ref);
create index product_variants_product_id_idx on public.product_variants (product_id);
create index product_variants_stock_status_idx on public.product_variants (stock_status);
create index product_variants_grit_idx on public.product_variants (grit);
create index product_variants_connection_type_idx on public.product_variants (connection_type);
create index product_variants_is_active_idx on public.product_variants (is_active);

create index order_drafts_created_by_user_id_idx on public.order_drafts (created_by_user_id);
create index order_drafts_customer_id_idx on public.order_drafts (customer_id);
create index order_drafts_status_idx on public.order_drafts (status);
create index order_drafts_source_idx on public.order_drafts (source);

create index order_items_order_draft_id_idx on public.order_items (order_draft_id);
create index order_items_variant_id_idx on public.order_items (variant_id);

create index orders_order_draft_id_idx on public.orders (order_draft_id);
create index orders_customer_id_idx on public.orders (customer_id);
create index orders_created_by_user_id_idx on public.orders (created_by_user_id);
create index orders_status_idx on public.orders (status);
create index orders_payment_status_idx on public.orders (payment_status);

create index payment_links_order_id_idx on public.payment_links (order_id);
create index payment_links_created_by_user_id_idx on public.payment_links (created_by_user_id);
create index payment_links_status_idx on public.payment_links (status);
create index payment_links_expires_at_idx on public.payment_links (expires_at);

create index sales_notes_customer_id_idx on public.sales_notes (customer_id);
create index sales_notes_sales_rep_id_idx on public.sales_notes (sales_rep_id);
create index sales_notes_status_idx on public.sales_notes (status);
create index sales_notes_follow_up_date_idx on public.sales_notes (follow_up_date);

create index user_approvals_user_id_idx on public.user_approvals (user_id);
create index user_approvals_reviewed_by_user_id_idx on public.user_approvals (reviewed_by_user_id);
create index user_approvals_status_idx on public.user_approvals (status);

create index discount_permissions_user_id_idx on public.discount_permissions (user_id);

create index search_logs_user_id_idx on public.search_logs (user_id);
create index search_logs_created_at_idx on public.search_logs (created_at desc);
create index search_logs_used_ai_idx on public.search_logs (used_ai);

create index audit_logs_user_id_idx on public.audit_logs (user_id);
create index audit_logs_entity_idx on public.audit_logs (entity_type, entity_id);
create index audit_logs_action_idx on public.audit_logs (action);
create index audit_logs_created_at_idx on public.audit_logs (created_at desc);

with root_frezler as (
  insert into public.categories (name, slug, status, sort_order)
  values ('Frezler', 'frezler', 'active', 10)
  on conflict (slug) do update
    set name = excluded.name,
        status = excluded.status,
        sort_order = excluded.sort_order
  returning id
),
jota_frezler as (
  insert into public.categories (parent_id, name, slug, status, sort_order)
  select id, 'JOTA Frezler', 'jota-frezler', 'active', 20
  from root_frezler
  on conflict (slug) do update
    set parent_id = excluded.parent_id,
        name = excluded.name,
        status = excluded.status,
        sort_order = excluded.sort_order
  returning id
),
subcategory_seed (name, slug, sort_order) as (
  values
    ('Elmas Frezler', 'elmas-frezler', 30),
    ('Karbit Frezler', 'karbit-frezler', 40),
    ('Aşındırıcı Taşlar', 'asindirici-taslar', 50),
    ('Ayırıcı Diskler', 'ayirici-diskler', 60),
    ('Cilalama Frezleri', 'cilalama-frezleri', 70),
    ('Diğer Ürünler', 'diger-urunler', 80)
)
insert into public.categories (parent_id, name, slug, status, sort_order)
select jota_frezler.id, subcategory_seed.name, subcategory_seed.slug, 'active', subcategory_seed.sort_order
from jota_frezler
cross join subcategory_seed
on conflict (slug) do update
  set parent_id = excluded.parent_id,
      name = excluded.name,
      status = excluded.status,
      sort_order = excluded.sort_order;

insert into public.categories (name, slug, status, sort_order)
values
  ('Ölçü Materyalleri', 'olcu-materyalleri', 'coming_soon', 100),
  ('Klinik Cihazları', 'klinik-cihazlari', 'coming_soon', 110),
  ('Pedodonti Ürünleri', 'pedodonti-urunleri', 'coming_soon', 120),
  ('Laboratuvar Ürünleri', 'laboratuvar-urunleri', 'coming_soon', 130),
  ('Veteriner Dental Ürünler', 'veteriner-dental-urunler', 'coming_soon', 140)
on conflict (slug) do update
  set name = excluded.name,
      status = excluded.status,
      sort_order = excluded.sort_order;
