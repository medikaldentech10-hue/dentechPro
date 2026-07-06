create table public.rate_limit_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.profiles(id) on delete cascade,
  action text not null,
  ip_hash text,
  metadata jsonb,
  created_at timestamptz not null default now()
);

alter table public.rate_limit_events enable row level security;

revoke all on table public.rate_limit_events from anon, authenticated;
grant all on table public.rate_limit_events to service_role;

create index if not exists rate_limit_events_user_action_created_idx
on public.rate_limit_events (user_id, action, created_at desc);

create index if not exists rate_limit_events_action_created_idx
on public.rate_limit_events (action, created_at desc);

create index if not exists rate_limit_events_ip_action_created_idx
on public.rate_limit_events (ip_hash, action, created_at desc)
where ip_hash is not null;

comment on table public.rate_limit_events is
  'Server-side abuse protection events. Cleanup entries older than 30 days periodically.';
