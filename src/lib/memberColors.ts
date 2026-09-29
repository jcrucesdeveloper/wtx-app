/** Distinct, theme-independent colors for telling room members apart. */
const MEMBER_COLORS = ['#4f7cff', '#ff7a59', '#2bb673', '#b25cff', '#f5b700', '#00b8d9', '#ff4f8b', '#8a9a5b']

/** A member's color from their position in the room's join order. */
export function memberColor(index: number): string {
  return MEMBER_COLORS[((index % MEMBER_COLORS.length) + MEMBER_COLORS.length) % MEMBER_COLORS.length]!
}

/** A person's color from their user id — the same on every screen and device, unlike {@link memberColor}. */
export function colorForId(id: string): string {
  let hash = 0
  for (let i = 0; i < id.length; i++) hash = (hash * 31 + id.charCodeAt(i)) | 0
  return memberColor(hash)
}

/** Up to two initials for an avatar: "Ana María" → "AM", "tomi" → "T". */
export function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean)
  return parts
    .slice(0, 2)
    .map((p) => p[0]!.toUpperCase())
    .join('')
}
