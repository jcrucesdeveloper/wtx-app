// @vitest-environment node
import { describe, expect, it } from 'vitest'
import en from '../../src/locales/en.json'
import es from '../../src/locales/es.json'
import { buildLegalPage, escapeHtml, legalVars, renderMessage, toBlocks } from '../build-legal.mjs'

describe('build-legal', () => {
  it('escapes text and fills placeholders with HTML values', () => {
    expect(renderMessage('Mail <us> at {contactEmail}.', { contactEmail: '<a>x</a>' })).toBe(
      'Mail &lt;us&gt; at <a>x</a>.',
    )
  })

  it('throws on an unknown placeholder', () => {
    expect(() => renderMessage('Hi {nme}', { name: 'x' })).toThrow(/nme/)
  })

  it('flattens paragraphs and { heading, body } sections', () => {
    expect(toBlocks(['intro', { heading: 'H', body: ['a', 'b'] }])).toEqual([
      { kind: 'paragraph', text: 'intro' },
      { kind: 'heading', text: 'H' },
      { kind: 'paragraph', text: 'a' },
      { kind: 'paragraph', text: 'b' },
    ])
  })

  it('links a configured email and falls back to the localized wording otherwise', () => {
    expect(legalVars(en.legal, { VITE_SUPPORT_EMAIL: 'a&b' }).contactEmail).toBe(
      '<a href="mailto:a&amp;b">a&amp;b</a>',
    )
    expect(legalVars(es.legal, {}).controller).toBe(escapeHtml(es.legal.fallback.controller))
  })

  it('builds both languages with no leftover placeholders', () => {
    for (const doc of ['privacy', 'terms', 'deletion']) {
      const html = buildLegalPage(
        doc,
        { en, es },
        { VITE_SUPPORT_EMAIL: 'dev', VITE_LEGAL_NAME: 'Dev' },
      )
      expect(html).toContain('<article id="en" lang="en">')
      expect(html).toContain('<article id="es" lang="es">')
      expect(html).toContain(`<h1>${escapeHtml(en.legal[doc].title)}</h1>`)
      expect(html).not.toMatch(/\{\w+\}/)
      expect(html).not.toContain('<script')
    }
  })

  it('points the deletion page back at the privacy policy', () => {
    const html = buildLegalPage('deletion', { en, es }, {})
    expect(html).toContain('href="privacy.html#en"')
    expect(html).toContain('href="privacy.html#es"')
  })
})
