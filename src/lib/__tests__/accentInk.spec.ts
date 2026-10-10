import { describe, expect, it } from 'vitest'
import { inkOnAccent } from '@/lib/accentInk'
import { ACCENT_COLORS } from '@/config/theme'

describe('inkOnAccent', () => {
  it('keeps white on the dark, saturated accents', () => {
    for (const accent of ['#e0263a', '#3b82f6', '#8b5cf6', '#f43f5e']) {
      expect(inkOnAccent(accent)).toBe('#ffffff')
    }
  })

  it('switches to dark ink on the light accents', () => {
    for (const accent of ['#10b981', '#f59e0b', '#06b6d4', '#84cc16']) {
      expect(inkOnAccent(accent)).toBe('#111214')
    }
  })

  it('has an answer for every accent on offer', () => {
    for (const { value } of ACCENT_COLORS) {
      expect(['#ffffff', '#111214']).toContain(inkOnAccent(value))
    }
  })

  it('falls back to white for something that is not a hex colour', () => {
    expect(inkOnAccent('red')).toBe('#ffffff')
  })
})
