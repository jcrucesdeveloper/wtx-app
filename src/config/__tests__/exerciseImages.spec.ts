import { describe, expect, it } from 'vitest'
import { EXERCISE_IMAGES_REF, EXERCISE_IMAGES_REPO, exerciseImageUrl } from '../exerciseImages'

describe('exerciseImageUrl', () => {
  it('builds a jsDelivr URL pinned to the configured ref', () => {
    expect(exerciseImageUrl('Barbell_Squat', 0)).toBe(
      `https://cdn.jsdelivr.net/gh/${EXERCISE_IMAGES_REPO}@${EXERCISE_IMAGES_REF}/exercises/Barbell_Squat/0.webp`,
    )
  })

  it('builds a distinct URL per frame', () => {
    expect(exerciseImageUrl('Barbell_Squat', 0)).not.toBe(exerciseImageUrl('Barbell_Squat', 1))
  })
})
