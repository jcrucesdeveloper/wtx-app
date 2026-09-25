const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

/**
 * A random v4 UUID. Every id the app stores is one, so rows can be synced to
 * Supabase (`uuid` primary keys) as-is.
 *
 * Falls back to `getRandomValues`, then `Math.random`, where `randomUUID` is
 * unavailable (non-secure contexts, older WebViews).
 */
export function newUuid(): string {
  try {
    return crypto.randomUUID()
  } catch {
    const bytes = new Uint8Array(16)
    try {
      crypto.getRandomValues(bytes)
    } catch {
      for (let i = 0; i < bytes.length; i++) bytes[i] = Math.floor(Math.random() * 256)
    }
    bytes[6] = (bytes[6]! & 0x0f) | 0x40
    bytes[8] = (bytes[8]! & 0x3f) | 0x80
    const hex = Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('')
    return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`
  }
}

/** Whether `value` is a UUID — older data may still carry `r_…` / `sess_…` / `s_…` ids. */
export function isUuid(value: string): boolean {
  return UUID_RE.test(value)
}
