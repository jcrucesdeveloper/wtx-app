/** Mirrors the `profiles.display_name` check constraint. */
export const NAME_MAX = 24
/** Mirrors the `profiles.bio` check constraint. */
export const BIO_MAX = 150

export function isValidDisplayName(name: string): boolean {
  const n = name.trim()
  return n.length >= 1 && n.length <= NAME_MAX
}

/** A bio is optional; it only has to fit once trimmed. */
export function isValidBio(bio: string): boolean {
  return bio.trim().length <= BIO_MAX
}
