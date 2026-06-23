-- Migration: partial settle-up (per-transaction amounts + general paydown).
-- Run once in the Supabase SQL Editor. Safe to re-run.

alter table public.settlements
  add column if not exists allocations jsonb not null default '{}'::jsonb;
