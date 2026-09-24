/**
 * Exercise images are never bundled into the app — they're fetched on
 * demand from a jsDelivr CDN pointed at a tagged commit of
 * https://github.com/jcrucesdeveloper/free-exercise-db (a fork of
 * yuhonas/free-exercise-db with images resized + converted to WebP).
 * See src/lib/exercises/README.md.
 *
 * `EXERCISE_IMAGES_REF` pins the exact tag so images never change under
 * us unexpectedly. Bump it deliberately, same as
 * scripts/sync-exercise-db.mjs's `REF`.
 */
export const EXERCISE_IMAGES_REPO = 'jcrucesdeveloper/free-exercise-db'
export const EXERCISE_IMAGES_REF = 'wtx-v1'

const BASE_URL = `https://cdn.jsdelivr.net/gh/${EXERCISE_IMAGES_REPO}@${EXERCISE_IMAGES_REF}`

/** `frame` 0 is the exercise's start position, 1 is the end/continuation. */
export function exerciseImageUrl(catalogId: string, frame: 0 | 1): string {
  return `${BASE_URL}/exercises/${catalogId}/${frame}.webp`
}
