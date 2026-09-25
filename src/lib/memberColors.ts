/** Distinct, theme-independent colors for telling room members apart. */
const MEMBER_COLORS = ['#4f7cff', '#ff7a59', '#2bb673', '#b25cff', '#f5b700', '#00b8d9', '#ff4f8b', '#8a9a5b']

/** A member's color from their position in the room's join order. */
export function memberColor(index: number): string {
  return MEMBER_COLORS[((index % MEMBER_COLORS.length) + MEMBER_COLORS.length) % MEMBER_COLORS.length]!
}

/** Up to two initials for an avatar: "Ana María" → "AM", "tomi" → "T". */
export function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean)
  return parts
    .slice(0, 2)
    .map((p) => p[0]!.toUpperCase())
    .join('')
}

/** A stable color for a person across the app (feed, profiles), from their account id. */
export function colorForId(id: string): string {
  // FNV-1a, with the high bits folded down: the palette index only reads the low bits.
  let hash = 0x811c9dc5
  for (let i = 0; i < id.length; i++) hash = Math.imul(hash ^ id.charCodeAt(i), 0x01000193)
  hash ^= hash >>> 16
  return memberColor(hash >>> 0)
}
