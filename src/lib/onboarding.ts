const SEEN_KEY = 'wtx:onboarded'

/** Whether this device has already been through the first-run intro. */
export function hasSeenOnboarding(): boolean {
  try {
    return localStorage.getItem(SEEN_KEY) === '1'
  } catch {
    // Storage unavailable — don't trap the user in onboarding on every navigation.
    return true
  }
}

export function markOnboardingSeen(): void {
  try {
    localStorage.setItem(SEEN_KEY, '1')
  } catch {
    /* storage unavailable */
  }
}
