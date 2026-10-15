import { describe, it, expect } from 'vitest'
import {
  clockTextFromDigits,
  digitsFromSeconds,
  formatDurationInput,
  normalizeDurationDigits,
  parseDurationInput,
  secondsFromDigits,
} from '../durationInput'

describe('parseDurationInput', () => {
  it.each([
    ['1:30', 90],
    ['0:05', 5],
    ['10:00', 600],
    ['0:00', 0],
    ['1:00:00', 3600],
    [' 2:15 ', 135],
  ])('reads m:ss / h:mm:ss %j as %i seconds', (input, seconds) => {
    expect(parseDurationInput(input)).toBe(seconds)
  })

  it.each([
    ['90', 90],
    ['130', 90],
    ['5', 5],
    ['0', 0],
    ['0130', 90],
  ])('reads bare digits %j the way the keypad does: %i seconds', (input, seconds) => {
    expect(parseDurationInput(input)).toBe(seconds)
  })

  it.each([
    ['1m30s', 90],
    ['45s', 45],
    ['2m', 120],
    ['1h5m', 3900],
  ])('reads the .wtt compact form %j as %i seconds', (input, seconds) => {
    expect(parseDurationInput(input)).toBe(seconds)
  })

  it.each(['', '   ', 'abc', '1:75', '1:5', '1:60:00', '1:2:3:4', '-1:30', '1.5', '12345', ':30'])(
    'rejects %j',
    (input) => {
      expect(parseDurationInput(input)).toBeNull()
    },
  )
})

describe('keypad digits', () => {
  it('fills in from the right like a kitchen timer', () => {
    expect(clockTextFromDigits('')).toBe('')
    expect(clockTextFromDigits('1')).toBe('0:01')
    expect(clockTextFromDigits('13')).toBe('0:13')
    expect(clockTextFromDigits('130')).toBe('1:30')
    expect(clockTextFromDigits('1300')).toBe('13:00')
  })

  it('shows seconds past 59 as typed, and carries them once read', () => {
    expect(clockTextFromDigits('90')).toBe('0:90')
    expect(secondsFromDigits('90')).toBe(90)
    expect(formatDurationInput(90)).toBe('1:30')
  })

  it('drops anything that is not a digit, leading zeros, and digits past four', () => {
    expect(normalizeDurationDigits('1:30')).toBe('130')
    expect(normalizeDurationDigits('0:05')).toBe('5')
    expect(normalizeDurationDigits('123456')).toBe('1234')
    expect(secondsFromDigits('')).toBeNull()
    expect(secondsFromDigits('000')).toBeNull()
  })

  it('round-trips seconds through the digits that type them', () => {
    for (const seconds of [5, 59, 60, 90, 600, 3725]) {
      expect(secondsFromDigits(digitsFromSeconds(seconds))).toBe(seconds)
    }
    expect(digitsFromSeconds(90)).toBe('130')
    expect(digitsFromSeconds(0)).toBe('')
    expect(digitsFromSeconds(null)).toBe('')
  })
})

describe('formatDurationInput', () => {
  it('formats as m:ss with minutes unbounded', () => {
    expect(formatDurationInput(0)).toBe('0:00')
    expect(formatDurationInput(5)).toBe('0:05')
    expect(formatDurationInput(90)).toBe('1:30')
    expect(formatDurationInput(3725)).toBe('62:05')
    expect(formatDurationInput(-3)).toBe('0:00')
  })
})
