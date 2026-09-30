/**
 * Parsing of the URLs Supabase Auth redirects to from its emails (sign-up
 * confirmation, password recovery). Kept pure so it can be unit-tested; the
 * auth store turns the result into a session.
 *
 * Supabase can hand the result over in several shapes, depending on the flow
 * and the email template:
 * - implicit flow (the client default): `#access_token=…&refresh_token=…&type=recovery`
 * - PKCE flow: `?code=…`
 * - custom templates using `{{ .TokenHash }}`: `?token_hash=…&type=recovery`
 * - failures (expired / already used link): `?error=…&error_code=otp_expired&error_description=…`,
 *   in the query or the hash.
 */

/** The email-link types `verifyOtp` accepts via `token_hash`. */
export type EmailOtpType = 'signup' | 'invite' | 'magiclink' | 'recovery' | 'email_change' | 'email'

const EMAIL_OTP_TYPES: readonly string[] = [
  'signup',
  'invite',
  'magiclink',
  'recovery',
  'email_change',
  'email',
]

export type AuthCallback =
  | { kind: 'tokens'; accessToken: string; refreshToken: string; type: string | null }
  | { kind: 'code'; code: string }
  | { kind: 'token-hash'; tokenHash: string; type: EmailOtpType }
  | { kind: 'error'; reason: 'expired' | 'invalid'; description: string | null }

/**
 * The user id (`sub` claim) of a Supabase access token, without verifying it —
 * only used to tell whether a link belongs to the account already on the device.
 */
export function accessTokenUserId(accessToken: string): string | null {
  const payload = accessToken.split('.')[1]
  if (!payload) return null
  try {
    const json = atob(payload.replace(/-/g, '+').replace(/_/g, '/'))
    const sub = (JSON.parse(json) as { sub?: unknown }).sub
    return typeof sub === 'string' ? sub : null
  } catch {
    return null
  }
}

/**
 * Reads the auth result out of a callback URL or router `fullPath`.
 *
 * @returns `null` when the URL carries nothing auth-related.
 */
export function parseAuthCallback(urlOrPath: string): AuthCallback | null {
  let url: URL
  try {
    url = new URL(urlOrPath, 'https://callback.invalid')
  } catch {
    return null
  }
  const query = url.searchParams
  const hash = new URLSearchParams(url.hash.replace(/^#/, ''))
  const get = (key: string) => hash.get(key) ?? query.get(key)

  const error = get('error') ?? get('error_code')
  if (error) {
    const code = get('error_code') ?? error
    return {
      kind: 'error',
      reason: code === 'otp_expired' ? 'expired' : 'invalid',
      description: get('error_description'),
    }
  }

  const accessToken = hash.get('access_token')
  const refreshToken = hash.get('refresh_token')
  if (accessToken && refreshToken) {
    return { kind: 'tokens', accessToken, refreshToken, type: hash.get('type') }
  }

  const tokenHash = query.get('token_hash')
  const type = query.get('type')
  if (tokenHash && type && EMAIL_OTP_TYPES.includes(type)) {
    return { kind: 'token-hash', tokenHash, type: type as EmailOtpType }
  }

  const code = query.get('code')
  if (code) return { kind: 'code', code }

  return null
}
