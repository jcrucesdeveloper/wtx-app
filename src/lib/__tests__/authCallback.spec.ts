import { describe, expect, it } from 'vitest'
import { accessTokenUserId, parseAuthCallback } from '../authCallback'

describe('accessTokenUserId', () => {
  it('reads the sub claim of a JWT', () => {
    const payload = btoa(JSON.stringify({ sub: 'user-1', role: 'authenticated' }))
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=+$/, '')
    expect(accessTokenUserId(`header.${payload}.signature`)).toBe('user-1')
  })

  it('returns null for anything else', () => {
    expect(accessTokenUserId('not-a-jwt')).toBeNull()
    expect(accessTokenUserId('a.!!!.c')).toBeNull()
    expect(accessTokenUserId(`a.${btoa('{"role":"x"}')}.c`)).toBeNull()
  })
})

describe('parseAuthCallback', () => {
  it('reads implicit-flow tokens from the hash', () => {
    expect(
      parseAuthCallback(
        'https://wtx.app/auth/reset#access_token=jwt.a.b&expires_in=3600&refresh_token=r1&token_type=bearer&type=recovery',
      ),
    ).toEqual({ kind: 'tokens', accessToken: 'jwt.a.b', refreshToken: 'r1', type: 'recovery' })
  })

  it('accepts a router fullPath', () => {
    expect(parseAuthCallback('/auth/callback#access_token=a&refresh_token=b&type=signup')).toEqual({
      kind: 'tokens',
      accessToken: 'a',
      refreshToken: 'b',
      type: 'signup',
    })
  })

  it('reads a PKCE code and a token hash', () => {
    expect(parseAuthCallback('https://wtx.app/auth/callback?code=abc')).toEqual({
      kind: 'code',
      code: 'abc',
    })
    expect(parseAuthCallback('/auth/reset?token_hash=h1&type=recovery')).toEqual({
      kind: 'token-hash',
      tokenHash: 'h1',
      type: 'recovery',
    })
    expect(parseAuthCallback('/auth/reset?token_hash=h1&type=bogus')).toBeNull()
  })

  it('reports expired and invalid links from the query or the hash', () => {
    expect(
      parseAuthCallback(
        'https://wtx.app/auth/reset#error=access_denied&error_code=otp_expired&error_description=Email+link+is+invalid+or+has+expired',
      ),
    ).toEqual({
      kind: 'error',
      reason: 'expired',
      description: 'Email link is invalid or has expired',
    })
    expect(parseAuthCallback('/auth/callback?error=server_error')).toEqual({
      kind: 'error',
      reason: 'invalid',
      description: null,
    })
  })

  it('returns null when nothing auth-related is present', () => {
    expect(parseAuthCallback('https://wtx.app/auth/callback')).toBeNull()
    expect(parseAuthCallback('/auth/reset#access_token=only')).toBeNull()
  })
})
