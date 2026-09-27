import * as Sentry from '@sentry/vue'
import type { App } from 'vue'
import { RoomError } from '@/stores/room'

const dsn = import.meta.env.VITE_SENTRY_DSN?.trim()

export const isCrashReportingConfigured = !!dsn

/**
 * Crash reporting via Sentry — a silent no-op when VITE_SENTRY_DSN isn't set,
 * so a clone of this repo without a Sentry project behaves exactly as before.
 * Call once at startup, right after `createApp`.
 */
export function initCrashReporting(app: App): void {
  if (!dsn) return
  Sentry.init({
    app,
    dsn,
    release: __APP_VERSION__,
    // Expected, already-translated-and-handled outcomes (a full room, a
    // vanished invite code) aren't bugs — only report genuine exceptions.
    beforeSend(event, hint) {
      return hint.originalException instanceof RoomError ? null : event
    },
  })
}
