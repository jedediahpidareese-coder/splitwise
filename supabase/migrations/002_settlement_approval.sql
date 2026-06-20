-- Migration: two-party settle-up approval.
-- Run this once in the Supabase SQL Editor on an existing project
-- (already included in schema.sql for fresh installs). Safe to re-run.

alter table public.settlements
  add column if not exists requested_by uuid references public.profiles (id),
  add column if not exists status text not null default 'approved'
    check (status in ('pending', 'approved')),
  add column if not exists approved_at timestamptz;
