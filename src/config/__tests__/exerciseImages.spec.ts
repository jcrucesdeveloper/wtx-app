import { describe, expect, it } from 'vitest'
import {
  CUSTOM_EXERCISE_IMAGES_REF,
  EXERCISE_IMAGES_REF,
  EXERCISE_IMAGES_REPO,
  exerciseImageUrl,
} from '../exerciseImages'

describe('exerciseImageUrl', () => {
  it('builds a jsDelivr URL pinned to the configured ref', () => {
    expect(exerciseImageUrl('Barbell_Squat', 0)).toBe(
      `https://cdn.jsdelivr.net/gh/${EXERCISE_IMAGES_REPO}@${EXERCISE_IMAGES_REF}/exercises/Barbell_Squat/0.webp`,
    )
  })

  it('builds a distinct URL per frame', () => {
    expect(exerciseImageUrl('Barbell_Squat', 0)).not.toBe(exerciseImageUrl('Barbell_Squat', 1))
  })

  it('serves the exercises WTX adds from their own tag, leaving upstream pinned', () => {
    expect(exerciseImageUrl('WTX_Soccer', 0)).toBe(
      `https://cdn.jsdelivr.net/gh/${EXERCISE_IMAGES_REPO}@${CUSTOM_EXERCISE_IMAGES_REF}/exercises/WTX_Soccer/0.webp`,
    )
    expect(CUSTOM_EXERCISE_IMAGES_REF).not.toBe(EXERCISE_IMAGES_REF)
  })
})
