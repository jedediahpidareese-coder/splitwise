-- SplitWise database schema for Supabase.
-- Paste this whole file into the Supabase SQL Editor and click "Run".
-- Safe to run more than once.

-- ── Tables ───────────────────────────────────────────────────────────────────

create table if not exists public.profiles (
  id           uuid primary key references auth.users (id) on delete cascade,
  display_name text not null,
  created_at   timestamptz not null default now()
);

create table if not exists public.expenses (
  id          uuid primary key default gen_random_uuid(),
  amount      numeric(12, 2) not null check (amount > 0),
  description text not null,
  paid_by     uuid not null references public.profiles (id),
  split_type  text not null check (split_type in ('even', 'owed_full')),
  category    text not null,
  note        text,
  receipt_url text,
  created_by  uuid not null default auth.uid() references public.profiles (id),
  created_at  timestamptz not null default now()
);

create table if not exists public.settlements (
  id         uuid primary key default gen_random_uuid(),
  amount     numeric(12, 2) not null check (amount > 0),
  from_id    uuid not null references public.profiles (id),
  to_id      uuid not null references public.profiles (id),
  created_by uuid not null default auth.uid() references public.profiles (id),
  created_at timestamptz not null default now()
);

-- ── Row Level Security ───────────────────────────────────────────────────────
-- This project is private to two people. Defense in depth, so security does
-- NOT rest solely on the dashboard "disable sign-ups" toggle:
--   1. Only someone who HAS a profile may read/write the shared ledger.
--   2. A trigger caps the app at two profiles, so a stray account can never
--      create a profile (and therefore can never reach the ledger).
-- Together: even if sign-ups were accidentally left on, a stranger who
-- registers gets no profile and can touch nothing.

alter table public.profiles    enable row level security;
alter table public.expenses    enable row level security;
alter table public.settlements enable row level security;

-- A signed-in user is a "member" once they have a profile row.
create or replace function public.is_member()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (select 1 from public.profiles where id = auth.uid());
$$;

drop policy if exists "profiles_read"   on public.profiles;
drop policy if exists "profiles_insert"  on public.profiles;
drop policy if exists "profiles_update"  on public.profiles;
create policy "profiles_read"   on public.profiles for select to authenticated using (true);
create policy "profiles_insert" on public.profiles for insert to authenticated with check (id = auth.uid());
create policy "profiles_update" on public.profiles for update to authenticated using (id = auth.uid()) with check (id = auth.uid());

drop policy if exists "expenses_rw" on public.expenses;
create policy "expenses_rw" on public.expenses for all to authenticated
  using (public.is_member()) with check (public.is_member());

drop policy if exists "settlements_rw" on public.settlements;
create policy "settlements_rw" on public.settlements for all to authenticated
  using (public.is_member()) with check (public.is_member());

-- Hard cap: at most two people.
create or replace function public.enforce_two_profiles()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if (select count(*) from public.profiles) >= 2 then
    raise exception 'This app is limited to two people.';
  end if;
  return new;
end;
$$;

drop trigger if exists trg_two_profiles on public.profiles;
create trigger trg_two_profiles
  before insert on public.profiles
  for each row execute function public.enforce_two_profiles();

-- ── Realtime ─────────────────────────────────────────────────────────────────
-- Push changes from one phone to the other instantly. Guarded so re-running
-- this script doesn't error on "already a member of publication".

do $$
declare
  t text;
begin
  foreach t in array array['expenses', 'settlements', 'profiles'] loop
    if not exists (
      select 1 from pg_publication_tables
      where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = t
    ) then
      execute format('alter publication supabase_realtime add table public.%I', t);
    end if;
  end loop;
end $$;

-- ── Storage: receipt photos ──────────────────────────────────────────────────

insert into storage.buckets (id, name, public)
values ('receipts', 'receipts', true)
on conflict (id) do nothing;

drop policy if exists "receipts_read"   on storage.objects;
drop policy if exists "receipts_upload" on storage.objects;
drop policy if exists "receipts_delete" on storage.objects;
create policy "receipts_read"   on storage.objects for select to authenticated using (bucket_id = 'receipts');
create policy "receipts_upload" on storage.objects for insert to authenticated with check (bucket_id = 'receipts');
create policy "receipts_delete" on storage.objects for delete to authenticated using (bucket_id = 'receipts');

-- ── Grants ───────────────────────────────────────────────────────────────────
-- RLS decides WHICH ROWS each person sees; these table privileges are what let
-- the signed-in ("authenticated") role touch the tables at all. The "anon"
-- (signed-out) role is intentionally NOT granted, so logged-out requests are
-- rejected outright.

grant usage on schema public to authenticated;
grant select, insert, update, delete on public.profiles    to authenticated;
grant select, insert, update, delete on public.expenses    to authenticated;
grant select, insert, update, delete on public.settlements to authenticated;
grant execute on function public.is_member() to authenticated;
