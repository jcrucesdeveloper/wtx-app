import { describe, it, expect } from 'vitest'
import { normalizeSource, sourceFromUrl } from '../acquisition'

describe('normalizeSource', () => {
  it('lowercases and trims a plain label', () => {
    expect(normalizeSource(' TikTok ')).toBe('tiktok')
  })

  it('rejects anything that is not a short label', () => {
    expect(normalizeSource('')).toBeNull()
    expect(normalizeSource('a b')).toBeNull()
    expect(normalizeSource('<script>')).toBeNull()
    expect(normalizeSource('x'.repeat(33))).toBeNull()
    expect(normalizeSource(null)).toBeNull()
  })
})

describe('sourceFromUrl', () => {
  it('reads the src tag', () => {
    expect(sourceFromUrl('/', '?src=tiktok')).toBe('tiktok')
  })

  it('falls back to utm_source', () => {
    expect(sourceFromUrl('/', '?utm_source=Instagram&utm_medium=social')).toBe('instagram')
  })

  it('prefers a tag over the kind of shared link', () => {
    expect(sourceFromUrl('/import', '?r=abc&src=reddit')).toBe('reddit')
  })

  it('names the kind of shared link when there is no tag', () => {
    expect(sourceFromUrl('/import', '?r=abc')).toBe('share-routine')
    expect(sourceFromUrl('/social/join', '?code=ABCD')).toBe('share-room')
    expect(sourceFromUrl('/social/follow', '?follow=xyz')).toBe('share-follow')
    expect(sourceFromUrl('/social/posts/123', '')).toBe('share-post')
  })

  it('is null for an ordinary visit', () => {
    expect(sourceFromUrl('/', '')).toBeNull()
    expect(sourceFromUrl('/sessions', '?src=not valid')).toBeNull()
  })
})
