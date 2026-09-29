import { describe, expect, it } from 'vitest'
import { i18n } from '@/i18n'
import { toLegalBlocks } from '../legalDoc'

describe('toLegalBlocks', () => {
  it('keeps flat paragraph arrays working', () => {
    expect(toLegalBlocks<string>(['a', 'b'], (m) => m.toUpperCase())).toEqual([
      { kind: 'paragraph', text: 'A' },
      { kind: 'paragraph', text: 'B' },
    ])
  })

  it('turns { heading, body } items into a heading and its paragraphs', () => {
    expect(toLegalBlocks<string>(['intro', { heading: 'H', body: ['p'] }], (m) => m)).toEqual([
      { kind: 'paragraph', text: 'intro' },
      { kind: 'heading', text: 'H' },
      { kind: 'paragraph', text: 'p' },
    ])
  })

  it('returns nothing for a missing body', () => {
    expect(toLegalBlocks(undefined, String)).toEqual([])
  })

  it('renders the real locale texts with the contact placeholders filled', () => {
    const { tm, rt } = i18n.global
    for (const locale of ['en', 'es'] as const) {
      i18n.global.locale.value = locale
      for (const doc of ['privacy', 'terms']) {
        const blocks = toLegalBlocks<Parameters<typeof rt>[0]>(tm(`legal.${doc}.body`), (m) =>
          rt(m, { controller: 'Dev Name', contactEmail: 'dev-mail' }),
        )
        expect(blocks.some((b) => b.kind === 'heading')).toBe(true)
        const text = blocks.map((b) => b.text).join('\n')
        expect(text).toContain('dev-mail')
        expect(text).toContain('Dev Name')
        expect(text).not.toMatch(/[{}]/)
      }
    }
    i18n.global.locale.value = 'en'
  })
})
