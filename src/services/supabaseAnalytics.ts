import { Capacitor } from '@capacitor/core'
import { isSupabaseConfigured, requireSupabase } from '@/services/supabase'
import type { AnalyticsProvider } from '@/services/analytics'
import { acquisitionSource } from '@/services/acquisition'
import { useAuthStore } from '@/stores/auth'
import type { AppEventName } from '@/lib/supabase/database.types'

/**
 * The default analytics provider: writes to `app_events` on the same
 * Supabase project used for sync, instead of a new vendor. A no-op when
 * Supabase isn't configured.
 */
export const supabaseAnalytics: AnalyticsProvider = {
  track(event: AppEventName) {
    if (!isSupabaseConfigured) return
    const userId = useAuthStore().user?.id ?? null
    void requireSupabase()
      .from('app_events')
      .insert({
        event,
        user_id: userId,
        platform: Capacitor.getPlatform(),
        app_version: __APP_VERSION__,
        source: acquisitionSource(),
      })
      .then(({ error }) => {
        if (error) console.error('[analytics] track failed', error)
      })
  },
}
