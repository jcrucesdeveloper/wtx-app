import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '@/lib/supabase/database.types'

export type WtxSupabaseClient = SupabaseClient<Database>

// The client appends its own paths (/auth/v1, /rest/v1, …), so tolerate a
// pasted REST endpoint or trailing slash: `https://x.supabase.co/rest/v1/` → `https://x.supabase.co`.
const url = import.meta.env.VITE_SUPABASE_URL?.trim()
  .replace(/\/(rest|auth)\/v1\/?$/, '')
  .replace(/\/+$/, '')
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

/**
 * The Supabase client, or `null` when the project isn't configured — in which
 * case the app stays purely local-first and the Social tab explains why.
 *
 * The auth session lives in `localStorage` (also inside the Capacitor
 * WebView) and refreshes itself in the background.
 */
export const supabase: WtxSupabaseClient | null =
  url && anonKey
    ? createClient<Database>(url, anonKey, {
        auth: {
          persistSession: true,
          autoRefreshToken: true,
          detectSessionInUrl: false,
          storageKey: 'wtx:auth',
        },
      })
    : null

export const isSupabaseConfigured = supabase !== null

/** The configured client — only call this behind a logged-in / configured check. */
export function requireSupabase(): WtxSupabaseClient {
  if (!supabase) throw new Error('Supabase is not configured.')
  return supabase
}
