import { createClient, type SupabaseClient } from '@supabase/supabase-js'

// These come from .env locally (copy .env.example) and from GitHub Actions
// secrets when deployed. The anon key is safe to expose in the browser; the
// database is protected by Row Level Security.
const url = import.meta.env.VITE_SUPABASE_URL as string | undefined
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined

// When both values are present we run in CLOUD mode (sign-in + real-time sync).
// Otherwise the app falls back to LOCAL mode (no sign-in, device-only data).
export const isCloudMode = Boolean(url && anonKey)

export const supabase: SupabaseClient | null =
  url && anonKey
    ? createClient(url, anonKey, {
        auth: { persistSession: true, autoRefreshToken: true },
      })
    : null
