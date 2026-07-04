alter table public.profiles
add column if not exists requested_role text,
add column if not exists clinic_name text,
add column if not exists company_name text,
add column if not exists city text,
add column if not exists district text,
add column if not exists specialty text;

alter table public.profiles
drop constraint if exists profiles_requested_role_check;

alter table public.profiles
add constraint profiles_requested_role_check check (
  requested_role is null
  or requested_role in ('doctor', 'lab', 'vet', 'other')
);
