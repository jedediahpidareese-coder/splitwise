-- Migration: itemized settle-up (settle specific transactions).
-- Run once in the Supabase SQL Editor. Safe to re-run.

alter table public.settlements
  add column if not exists expense_ids uuid[] not null default '{}';

-- A selection whose items cancel out nets to $0, which is a valid settle-up.
alter table public.settlements drop constraint if exists settlements_amount_check;
alter table public.settlements add constraint settlements_amount_check check (amount >= 0);
