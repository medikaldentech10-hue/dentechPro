alter table public.order_drafts
add column if not exists request_number text;

create or replace function public.generate_order_draft_request_number(
  target_created_at timestamptz default now()
)
returns text
language plpgsql
as $$
declare
  request_day date := timezone('Europe/Istanbul', coalesce(target_created_at, now()))::date;
  request_prefix text := 'REQ-' || to_char(request_day, 'YYYYMMDD');
  next_sequence integer;
begin
  perform pg_advisory_xact_lock(hashtext(request_prefix));

  select coalesce(
    max(split_part(request_number, '-', 3)::integer),
    0
  ) + 1
    into next_sequence
  from public.order_drafts
  where request_number like request_prefix || '-%';

  return request_prefix || '-' || lpad(next_sequence::text, 3, '0');
end;
$$;

create or replace function public.set_order_draft_request_number()
returns trigger
language plpgsql
as $$
begin
  if new.created_at is null then
    new.created_at = now();
  end if;

  if new.request_number is null or btrim(new.request_number) = '' then
    new.request_number = public.generate_order_draft_request_number(new.created_at);
  end if;

  return new;
end;
$$;

drop trigger if exists set_order_draft_request_number on public.order_drafts;

create trigger set_order_draft_request_number
before insert on public.order_drafts
for each row
execute function public.set_order_draft_request_number();

with numbered_requests as (
  select
    id,
    'REQ-' ||
      to_char(timezone('Europe/Istanbul', created_at), 'YYYYMMDD') ||
      '-' ||
      lpad(
        row_number() over (
          partition by timezone('Europe/Istanbul', created_at)::date
          order by created_at, id
        )::text,
        3,
        '0'
      ) as next_request_number
  from public.order_drafts
  where request_number is null or btrim(request_number) = ''
)
update public.order_drafts as order_drafts
set request_number = numbered_requests.next_request_number
from numbered_requests
where order_drafts.id = numbered_requests.id;

create unique index order_drafts_request_number_idx
on public.order_drafts (request_number)
where request_number is not null;

revoke all on function public.generate_order_draft_request_number(timestamptz) from public;
revoke all on function public.generate_order_draft_request_number(timestamptz) from anon;
revoke all on function public.generate_order_draft_request_number(timestamptz) from authenticated;

revoke all on function public.set_order_draft_request_number() from public;
revoke all on function public.set_order_draft_request_number() from anon;
revoke all on function public.set_order_draft_request_number() from authenticated;
