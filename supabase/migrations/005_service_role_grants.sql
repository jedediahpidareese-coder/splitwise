-- Migration: let the service role (used by the notify Edge Function) read the
-- shared tables. Newer Supabase projects don't auto-grant this. Safe to re-run.

grant select, insert, update, delete on all tables in schema public to service_role;
