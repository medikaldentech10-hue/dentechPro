alter table public.search_logs
  add column if not exists normalized_query text,
  add column if not exists interpreted_tokens jsonb,
  add column if not exists user_role text,
  add column if not exists source text default 'catalog';

update public.search_logs
set source = 'catalog'
where source is null;
