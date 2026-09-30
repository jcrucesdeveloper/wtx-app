import { computed, ref } from 'vue'
import { defineStore } from 'pinia'
import type { Session } from '@supabase/supabase-js'
import { isSupabaseConfigured, requireSupabase, supabase } from '@/services/supabase'
import { track } from '@/services/analytics'
import { accessTokenUserId, parseAuthCallback } from '@/lib/authCallback'
import { publicRouteUrl } from '@/lib/publicUrl'
import type { Tables } from '@/lib/supabase/database.types'
import { useSyncStore } from '@/stores/sync'
import { useRoomStore } from '@/stores/room'
import { useRoutinesStore } from '@/stores/routines'
import { useSessionsStore } from '@/stores/sessions'
import { useActiveSessionStore } from '@/stores/activeSession'

export type Profile = Tables<'profiles'>

/**
 * The profile columns the app may read. Listed rather than `*`: invite_code
 * is only readable by its owner, through `my_invite_code()`, so selecting
 * every column is refused.
 */
export const PROFILE_COLUMNS = 'id, display_name, bio, created_at, updated_at'

/** Outcome of {@link useAuthStore}'s `signUp`. */
export type SignUpResult = 'signed-in' | 'confirm-email'

/** Where Supabase sends the sign-up confirmation link. Must be in the project's Redirect URLs allowlist. */
export const AUTH_CALLBACK_PATH = '/auth/callback'
/** Where Supabase sends the password recovery link. Must be in the project's Redirect URLs allowlist. */
export const AUTH_RESET_PATH = '/auth/reset'

/** Outcome of {@link useAuthStore}'s `completeAuthRedirect`. */
export type AuthRedirectResult =
  | { status: 'none' }
  | { status: 'signed-in'; recovery: boolean }
  | { status: 'error'; reason: 'expired' | 'invalid' }

/**
 * The account, if any. Without one the app is purely local-first; creating
 * one (or logging in) turns on sync and group workouts.
 */
export const useAuthStore = defineStore('auth', () => {
  const session = ref<Session | null>(null)
  const profile = ref<Profile | null>(null)
  /** This account's follow code — private to its owner, so loaded on its own. */
  const inviteCode = ref<string | null>(null)
  const ready = ref(!isSupabaseConfigured)
  /** True while the session came from a password-recovery link and a new password is still due. */
  const recovering = ref(false)

  const user = computed(() => session.value?.user ?? null)
  const isLoggedIn = computed(() => user.value !== null)

  let readyResolve: () => void = () => {}
  const readyPromise = new Promise<void>((resolve) => {
    if (ready.value) resolve()
    else readyResolve = resolve
  })

  /** Resolves once the stored session (if any) has been restored. */
  function whenReady(): Promise<void> {
    return readyPromise
  }

  async function loadProfile() {
    const uid = user.value?.id
    if (!uid) {
      profile.value = null
      return
    }
    const sb = requireSupabase()
    const [{ data }, code] = await Promise.all([
      sb.from('profiles').select(PROFILE_COLUMNS).eq('id', uid).maybeSingle(),
      sb.rpc('my_invite_code'),
    ])
    if (user.value?.id !== uid) return
    profile.value = data
    inviteCode.value = code.data ?? null
  }

  /**
   * Replaces this account's follow code with a fresh one — old links and QR
   * codes stop working. People already following stay followed. Throws on
   * failure (`rate_limited` after too many resets in a day).
   */
  async function rotateInviteCode(): Promise<string> {
    const uid = user.value?.id
    const { data, error } = await requireSupabase().rpc('rotate_invite_code')
    if (error || !data) throw error ?? new Error('rotate_invite_code returned nothing')
    if (user.value?.id === uid) inviteCode.value = data
    return data
  }

  let lastUserId: string | null = null

  function onSession(next: Session | null) {
    session.value = next
    const uid = next?.user.id ?? null
    if (uid === lastUserId) return
    lastUserId = uid
    const sync = useSyncStore()
    if (uid) {
      void loadProfile()
      void sync.start(uid)
    } else {
      profile.value = null
      inviteCode.value = null
      sync.stop()
    }
  }

  /** Restores the stored session and follows auth changes. Call once on startup. */
  async function init() {
    if (!supabase) return
    const { data } = await supabase.auth.getSession()
    onSession(data.session)
    supabase.auth.onAuthStateChange((event, next) => {
      if (event === 'PASSWORD_RECOVERY') recovering.value = true
      // Supabase warns against awaiting other client calls inside this callback.
      setTimeout(() => onSession(next), 0)
    })
    ready.value = true
    readyResolve()
  }

  /**
   * Creates an account. The profile row is created by a database trigger from
   * `display_name`; the device's routines and sessions upload on first sync.
   *
   * @returns `'confirm-email'` when the project requires email confirmation first.
   */
  async function signUp(email: string, password: string, displayName: string): Promise<SignUpResult> {
    const { data, error } = await requireSupabase().auth.signUp({
      email: email.trim(),
      password,
      options: {
        data: { display_name: displayName.trim() },
        emailRedirectTo: publicRouteUrl(AUTH_CALLBACK_PATH),
      },
    })
    if (error) throw error
    track('account_created')
    if (!data.session) return 'confirm-email'
    onSession(data.session)
    return 'signed-in'
  }

  async function signIn(email: string, password: string) {
    const { data, error } = await requireSupabase().auth.signInWithPassword({
      email: email.trim(),
      password,
    })
    if (error) throw error
    onSession(data.session)
  }

  /**
   * Turns an auth email's redirect URL (sign-up confirmation or password
   * recovery) into a session. Works for both the web page the link opened
   * and a deep link handed to the native app.
   *
   * @param urlOrPath - The full URL or the router `fullPath` (with hash).
   */
  async function completeAuthRedirect(urlOrPath: string): Promise<AuthRedirectResult> {
    const parsed = parseAuthCallback(urlOrPath)
    if (!parsed) return { status: 'none' }
    if (parsed.kind === 'error') return { status: 'error', reason: parsed.reason }

    await whenReady()
    // A link for another account than the one on this device: log that one out
    // properly first (push its changes, clear its local copy), as a manual
    // switch would, so its data never syncs into the other account.
    const linkUserId = parsed.kind === 'tokens' ? accessTokenUserId(parsed.accessToken) : null
    if (user.value && linkUserId !== user.value.id) await signOut()

    const auth = requireSupabase().auth
    let response: { data: { session: Session | null }; error: unknown }
    let recovery = false
    if (parsed.kind === 'tokens') {
      recovery = parsed.type === 'recovery'
      response = await auth.setSession({
        access_token: parsed.accessToken,
        refresh_token: parsed.refreshToken,
      })
    } else if (parsed.kind === 'token-hash') {
      recovery = parsed.type === 'recovery'
      response = await auth.verifyOtp({ token_hash: parsed.tokenHash, type: parsed.type })
    } else {
      response = await auth.exchangeCodeForSession(parsed.code)
    }

    const session = response.data.session
    if (response.error || !session) {
      const code = (response.error as { code?: string } | null)?.code
      return { status: 'error', reason: code === 'otp_expired' ? 'expired' : 'invalid' }
    }
    if (recovery) recovering.value = true
    onSession(session)
    return { status: 'signed-in', recovery: recovery || recovering.value }
  }

  /** Emails a password reset link that opens the app's reset screen. */
  async function requestPasswordReset(email: string) {
    const { error } = await requireSupabase().auth.resetPasswordForEmail(email.trim(), {
      redirectTo: publicRouteUrl(AUTH_RESET_PATH),
    })
    if (error) throw error
  }

  /** Sets a new password for the logged-in (or recovering) account. */
  async function updatePassword(password: string) {
    const { error } = await requireSupabase().auth.updateUser({ password })
    if (error) throw error
    recovering.value = false
  }

  /** Wipes the device copy of the account's data, back to a fresh local-first install. */
  function clearLocalData() {
    useRoomStore().reset()
    useActiveSessionStore().discard()
    useRoutinesStore().resetToDefaults()
    useSessionsStore().clear()
    useSyncStore().reset()
  }

  /**
   * Logs out. Pending changes are pushed first (best effort), then this
   * device's copy is cleared — it all lives in the account now.
   */
  async function signOut() {
    const sync = useSyncStore()
    try {
      await sync.syncNow()
    } catch {
      /* offline — the local copy goes anyway; the account keeps what it has */
    }
    sync.stop()
    await requireSupabase().auth.signOut({ scope: 'local' })
    onSession(null)
    clearLocalData()
  }

  /** Saves the public profile fields — name (1–24 chars) and bio (up to 150). */
  async function updateProfile(fields: { displayName?: string; bio?: string }) {
    const uid = user.value?.id
    if (!uid) return
    const { data, error } = await requireSupabase()
      .from('profiles')
      .update({
        ...(fields.displayName !== undefined ? { display_name: fields.displayName.trim() } : {}),
        ...(fields.bio !== undefined ? { bio: fields.bio.trim() } : {}),
      })
      .eq('id', uid)
      .select(PROFILE_COLUMNS)
      .single()
    if (error) throw error
    profile.value = data
  }

  async function updateDisplayName(name: string) {
    await updateProfile({ displayName: name })
  }

  /** Permanently deletes the account and everything synced to it, then clears this device. */
  async function deleteAccount() {
    const sb = requireSupabase()
    const { error } = await sb.functions.invoke('delete-account', { method: 'POST' })
    if (error) throw error
    useSyncStore().stop()
    await sb.auth.signOut({ scope: 'local' })
    onSession(null)
    clearLocalData()
  }

  return {
    session,
    user,
    profile,
    inviteCode,
    ready,
    recovering,
    isLoggedIn,
    whenReady,
    init,
    signUp,
    signIn,
    signOut,
    completeAuthRedirect,
    requestPasswordReset,
    updatePassword,
    updateProfile,
    updateDisplayName,
    rotateInviteCode,
    deleteAccount,
  }
})
