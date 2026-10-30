import { describe, it, expect } from 'vitest'
import {
  cameraFailure,
  captureSize,
  fitFrame,
  isMirrored,
  otherFacing,
  photoAreaPercent,
} from '@/lib/cameraFrame'
import { photoRect, workoutCardFrame, type WorkoutCardFormat } from '@/lib/workoutCard'

describe('fitFrame', () => {
  it('fits a story into a phone screen by its height', () => {
    // 360 wide, 600 tall between the bars: the 9:16 card is height-bound.
    expect(fitFrame(360, 600, 1080, 1920)).toEqual({ width: 337, height: 600 })
  })

  it('fits a story into a wide room by its height and a tall room by its width', () => {
    expect(fitFrame(1000, 400, 1080, 1920)).toEqual({ width: 225, height: 400 })
    expect(fitFrame(300, 2000, 1080, 1920)).toEqual({ width: 300, height: 533 })
  })

  it('keeps the shape of the card', () => {
    const { width, height } = fitFrame(390, 640, 1080, 1080)
    expect(width).toBe(height)
    expect(width).toBe(390)
  })

  it('is empty until there is room', () => {
    expect(fitFrame(0, 600, 1080, 1920)).toEqual({ width: 0, height: 0 })
    expect(fitFrame(360, -1, 1080, 1920)).toEqual({ width: 0, height: 0 })
  })
})

describe('photoAreaPercent', () => {
  it.each<WorkoutCardFormat>(['story', 'square'])(
    'is the photo look’s photo rect, as a share of the %s card',
    (format) => {
      const data = { highlight: { label: 'PR', text: 'Bench 100 kg' } }
      const frame = workoutCardFrame(format)
      const rect = photoRect(data, format)
      const area = photoAreaPercent(data, format)
      expect(parseFloat(area.left)).toBeCloseTo((rect.x / frame.width) * 100)
      expect(parseFloat(area.top)).toBeCloseTo((rect.y / frame.height) * 100)
      expect(parseFloat(area.width)).toBeCloseTo((rect.width / frame.width) * 100)
      expect(parseFloat(area.height)).toBeCloseTo((rect.height / frame.height) * 100)
    },
  )

  it('leaves more of the card to the photo without a highlight', () => {
    const withLine = parseFloat(photoAreaPercent({ highlight: { label: 'PR', text: 'x' } }).height)
    const without = parseFloat(photoAreaPercent({ highlight: undefined }).height)
    expect(without).toBeGreaterThan(withLine)
  })
})

describe('cameraFailure', () => {
  const named = (name: string) => Object.assign(new Error(name), { name })

  it('reads a refusal as denied: another camera would be refused too', () => {
    expect(cameraFailure(named('NotAllowedError'))).toBe('denied')
    expect(cameraFailure(named('SecurityError'))).toBe('denied')
    expect(cameraFailure(named('PermissionDeniedError'))).toBe('denied')
  })

  it('reads anything else as unavailable, for the system camera to try', () => {
    expect(cameraFailure(named('NotFoundError'))).toBe('unavailable')
    expect(cameraFailure(named('NotReadableError'))).toBe('unavailable')
    expect(cameraFailure(named('OverconstrainedError'))).toBe('unavailable')
    expect(cameraFailure(new TypeError('no mediaDevices'))).toBe('unavailable')
    expect(cameraFailure('boom')).toBe('unavailable')
    expect(cameraFailure(null)).toBe('unavailable')
  })
})

describe('isMirrored', () => {
  it('follows the side the camera says it faces', () => {
    expect(isMirrored('environment', 'user')).toBe(true)
    expect(isMirrored('user', 'environment')).toBe(false)
  })

  it('falls back to the side asked for when the camera doesn’t say', () => {
    expect(isMirrored('user', undefined)).toBe(true)
    expect(isMirrored('environment', undefined)).toBe(false)
    expect(isMirrored('user', '')).toBe(true)
  })
})

describe('otherFacing', () => {
  it('switches sides', () => {
    expect(otherFacing('user')).toBe('environment')
    expect(otherFacing('environment')).toBe('user')
  })
})

describe('captureSize', () => {
  it('keeps a frame up to the limit as shot', () => {
    expect(captureSize(1080, 1920)).toEqual({ width: 1080, height: 1920 })
  })

  it('scales a bigger frame down by its long side, in proportion', () => {
    expect(captureSize(4032, 3024)).toEqual({ width: 2160, height: 1620 })
    expect(captureSize(3024, 4032, 1000)).toEqual({ width: 750, height: 1000 })
  })
})
