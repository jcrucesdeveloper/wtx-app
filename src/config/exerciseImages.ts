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

/**
 * Exercises WTX adds on top of upstream (ids starting `WTX_`, see
 * scripts/exercise-overlay.mjs) have their images on a later tag of the same
 * fork, so adding them never moves the pinned upstream images. Until that tag
 * exists their images simply don't load, which the UI already treats as an
 * exercise without an image.
 */
export const CUSTOM_EXERCISE_IMAGES_REF = 'wtx-v2'

const CDN = `https://cdn.jsdelivr.net/gh/${EXERCISE_IMAGES_REPO}`

/** Whether a catalog id is one WTX added (see scripts/exercise-overlay.mjs). */
export function isCustomExerciseId(catalogId: string): boolean {
  return catalogId.startsWith('WTX_')
}

/** `frame` 0 is the exercise's start position, 1 is the end/continuation. */
export function exerciseImageUrl(catalogId: string, frame: 0 | 1): string {
  const ref = isCustomExerciseId(catalogId) ? CUSTOM_EXERCISE_IMAGES_REF : EXERCISE_IMAGES_REF
  return `${CDN}@${ref}/exercises/${catalogId}/${frame}.webp`
}
