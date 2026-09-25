import { describe, it, expect, afterEach } from 'vitest'
import { i18n } from '@/i18n'
import en from '../en.json'
import es from '../es.json'

type Messages = { [key: string]: string | string[] | Messages }

/** Every leaf message path, e.g. `room.live.pr` (array items as `…body.0`). */
function leafKeys(messages: Messages, prefix = ''): string[] {
  return Object.entries(messages).flatMap(([key, value]) => {
    const path = `${prefix}${key}`
    if (typeof value === 'string') return [path]
    if (Array.isArray(value)) return value.map((_, i) => `${path}.${i}`)
    return leafKeys(value, `${path}.`)
  })
}

afterEach(() => {
  i18n.global.locale.value = 'en'
})

describe('locales', () => {
  it('English and Spanish define the same keys', () => {
    expect(leafKeys(es as Messages).sort()).toEqual(leafKeys(en as Messages).sort())
  })

  // vue-i18n only compiles a message when it's first shown, and a syntax error
  // (a bare `@`, `{`, `|`…) blanks the whole screen — so compile them all here.
  for (const [locale, messages] of [
    ['en', en],
    ['es', es],
  ] as const) {
    it(`every ${locale} message compiles`, () => {
      i18n.global.locale.value = locale
      const failures: string[] = []
      for (const key of leafKeys(messages as Messages)) {
        const path = key.replace(/\.(\d+)$/, '')
        try {
          if (/\.\d+$/.test(key)) i18n.global.tm(path)
          else i18n.global.t(key, { count: 2, name: 'Ana', emoji: '🔥' }, 2)
        } catch (e) {
          failures.push(`${key}: ${(e as Error).message}`)
        }
      }
      expect(failures).toEqual([])
    })
  }
})
