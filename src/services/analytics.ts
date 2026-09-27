import type { AppEventName } from '@/lib/supabase/database.types'

/** Whatever backs product analytics — swap the active one without touching call sites. */
export interface AnalyticsProvider {
  track(event: AppEventName): void
}

let provider: AnalyticsProvider | null = null

/** Call once at startup with the active provider (or `null` to turn analytics off). */
export function setAnalyticsProvider(next: AnalyticsProvider | null): void {
  provider = next
}

/**
 * Fire-and-forget product analytics. A no-op until a provider is set, and
 * never awaited or retried by its callers: losing one event is fine, unlike
 * sync data.
 */
export function track(event: AppEventName): void {
  provider?.track(event)
}
