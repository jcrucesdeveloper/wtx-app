/**
 * Who publishes WTX and how to reach them, for the Terms and Privacy Policy
 * (in the app and in the hostable `public/*.html` pages). Empty when unset:
 * callers fall back to the localized `legal.fallback.*` wording.
 */
export const SUPPORT_EMAIL = import.meta.env.VITE_SUPPORT_EMAIL?.trim() ?? ''
export const LEGAL_NAME = import.meta.env.VITE_LEGAL_NAME?.trim() ?? ''
