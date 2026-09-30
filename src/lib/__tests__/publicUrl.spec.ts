import { afterEach, describe, expect, it, vi } from 'vitest'
import { deepLinkToRoute, publicOrigin, publicRouteUrl, publicUrl } from '../publicUrl'

afterEach(() => {
  vi.unstubAllEnvs()
})

describe('publicUrl', () => {
  it('uses VITE_PUBLIC_URL when set, ignoring any path or trailing slash', () => {
    vi.stubEnv('VITE_PUBLIC_URL', 'https://wtx.app/')
    expect(publicOrigin()).toBe('https://wtx.app')
    expect(publicUrl('/social/follow?follow=K7QM3X9P')).toBe(
      'https://wtx.app/social/follow?follow=K7QM3X9P',
    )
    vi.stubEnv('VITE_PUBLIC_URL', '  https://wtx.app/some/path  ')
    expect(publicOrigin()).toBe('https://wtx.app')
  })

  it('falls back to the current origin when unset or malformed', () => {
    vi.stubEnv('VITE_PUBLIC_URL', '')
    expect(publicUrl('/import')).toBe(`${window.location.origin}/import`)
    vi.stubEnv('VITE_PUBLIC_URL', 'not a url')
    expect(publicOrigin()).toBe(window.location.origin)
  })

  it('adds a missing leading slash', () => {
    vi.stubEnv('VITE_PUBLIC_URL', 'https://wtx.app')
    expect(publicUrl('import')).toBe('https://wtx.app/import')
  })

  it('prefixes the router base for route paths', () => {
    vi.stubEnv('VITE_PUBLIC_URL', 'https://wtx.app')
    vi.stubEnv('BASE_URL', '/')
    expect(publicRouteUrl('/auth/callback')).toBe('https://wtx.app/auth/callback')
    vi.stubEnv('BASE_URL', '/app/')
    expect(publicRouteUrl('/auth/reset')).toBe('https://wtx.app/app/auth/reset')
  })
})

describe('deepLinkToRoute', () => {
  const origin = 'https://wtx.app'

  it('keeps path, query and hash of links on the public host', () => {
    expect(deepLinkToRoute('https://wtx.app/social/follow?follow=K7QM3X9P', origin)).toBe(
      '/social/follow?follow=K7QM3X9P',
    )
    expect(
      deepLinkToRoute('https://WTX.app/auth/callback#access_token=a&refresh_token=b', origin),
    ).toBe('/auth/callback#access_token=a&refresh_token=b')
    expect(deepLinkToRoute('https://wtx.app', origin)).toBe('/')
  })

  it('rejects other hosts and garbage', () => {
    expect(deepLinkToRoute('https://evil.example/social/follow', origin)).toBeNull()
    expect(deepLinkToRoute('https://wtx.app.evil.example/social', origin)).toBeNull()
    expect(deepLinkToRoute('javascript:alert(1)', origin)).toBeNull()
    expect(deepLinkToRoute('not a url', origin)).toBeNull()
  })

  it('strips the router base', () => {
    vi.stubEnv('BASE_URL', '/app/')
    expect(deepLinkToRoute('https://wtx.app/app/social/join?code=K7QM3X', origin)).toBe(
      '/social/join?code=K7QM3X',
    )
  })
})
