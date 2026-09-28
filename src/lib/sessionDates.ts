import type { useSessionsStore } from '@/stores/sessions'

/** Every logged session's local `YYYY-MM-DD` date — what the streak/calendar helpers key on. */
export function sessionDateStrs(sessions: ReturnType<typeof useSessionsStore>): string[] {
  return sessions.list
    .map((s) => sessions.parsed(s.id))
    .map((r) => (r?.ok ? r.session.date : undefined))
    .filter((d): d is string => d !== undefined)
}
