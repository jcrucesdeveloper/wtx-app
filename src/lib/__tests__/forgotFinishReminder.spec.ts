import { describe, it, expect } from 'vitest'
import { FORGOT_FINISH_AFTER_MS, forgotFinishReminderAt } from '../forgotFinishReminder'

const START = Date.parse('2026-11-01T10:00:00Z')

describe('forgotFinishReminderAt', () => {
  it('fires five hours after the workout started', () => {
    expect(FORGOT_FINISH_AFTER_MS).toBe(5 * 60 * 60 * 1000)
    expect(forgotFinishReminderAt(START, START + 1000)).toBe(START + FORGOT_FINISH_AFTER_MS)
  })

  it('is not scheduled once that moment has passed', () => {
    expect(forgotFinishReminderAt(START, START + FORGOT_FINISH_AFTER_MS)).toBeNull()
    expect(forgotFinishReminderAt(START, START + FORGOT_FINISH_AFTER_MS + 1)).toBeNull()
  })

  it('is not scheduled without a workout', () => {
    expect(forgotFinishReminderAt(undefined, START)).toBeNull()
    expect(forgotFinishReminderAt(null, START)).toBeNull()
    expect(forgotFinishReminderAt(Number.NaN, START)).toBeNull()
  })
})
