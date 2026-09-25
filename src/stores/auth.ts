import { computed, ref } from 'vue'
import { defineStore } from 'pinia'
import type { Session } from '@supabase/supabase-js'
import { isSupabaseConfigured, requireSupabase, supabase } from '@/services/supabase'
import type { Tables } from '@/lib/supabase/database.types'
import { useSyncStore } from '@/stores/sync'
import { useRoomStore } from '@/stores/room'
import { useRoutinesStore } from '@/stores/routines'
import { useSessionsStore } from '@/stores/sessions'
import { useActiveSessionStore } from '@/stores/activeSession'

export type Profile = Tables<'profiles'>

/** Outcome of {@link useAuthStore}'s `signUp`. */
export type SignUpResult = 'signed-in' | 'confirm-email'

/**
 * The account, if any. Without one the app is purely local-first; creating
 * one (or logging in) turns on sync and group workouts.
 */
export const useAuthStore = defineStore('auth', () => {
  const session = ref<Session | null>(null)
  const profile = ref<Profile | null>(null)
  const ready = ref(!isSupabaseConfigured)

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
    const { data } = await requireSupabase().from('profiles').select('*').eq('id', uid).maybeSingle()
    if (user.value?.id === uid) profile.value = data
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
      sync.stop()
    }
  }

  /** Restores the stored session and follows auth changes. Call once on startup. */
  async function init() {
    if (!supabase) return
    const { data } = await supabase.auth.getSession()
    onSession(data.session)
    supabase.auth.onAuthStateChange((_event, next) => {
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
      options: { data: { display_name: displayName.trim() } },
    })
    if (error) throw error
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

  async function updateDisplayName(name: string) {
    const uid = user.value?.id
    if (!uid) return
    const { data, error } = await requireSupabase()
      .from('profiles')
      .update({ display_name: name.trim() })
      .eq('id', uid)
      .select()
      .single()
    if (error) throw error
    profile.value = data
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
    ready,
    isLoggedIn,
    whenReady,
    init,
    signUp,
    signIn,
    signOut,
    updateDisplayName,
    deleteAccount,
  }
})
