import { describe, it, expect, beforeEach, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'

type SignInResult = { data: { session: unknown }; error: null }
const auth = vi.hoisted(() => ({
  signInWithPassword: vi.fn<(creds: unknown) => Promise<SignInResult>>(),
  signOut: vi.fn<(opts: unknown) => Promise<{ error: null }>>(() => Promise.resolve({ error: null })),
}))

vi.mock('@/services/supabase', () => {
  // Every query succeeds with no rows — these tests are about what stays on the device.
  function from() {
    const builder = Promise.resolve({ data: [] as unknown[], error: null })
    const chain = builder as typeof builder & Record<string, () => typeof builder>
    for (const m of ['select', 'eq', 'neq', 'in', 'gt', 'order', 'range', 'upsert', 'update', 'maybeSingle'])
      chain[m] = () => builder
    return builder
  }
  return {
    supabase: null,
    isSupabaseConfigured: true,
    requireSupabase: () => ({ auth, from }),
  }
})
vi.mock('@/lib/exercises/imageCache', () => ({ warmExerciseImages: () => Promise.resolve() }))
vi.mock('@/services/analytics', () => ({ track: () => {} }))

import { useAuthStore } from '@/stores/auth'
import { useSyncStore } from '@/stores/sync'
import { useSessionsStore } from '@/stores/sessions'

const A = '00000000-0000-4000-8000-00000000000a'
const B = '00000000-0000-4000-8000-00000000000b'
const id = (n: number) => `00000000-0000-4000-8000-${String(n).padStart(12, '0')}`
const TEXT = (name: string) => `# ${name} - 2026-09-01\n`

function signInAs(uid: string) {
  auth.signInWithPassword.mockResolvedValueOnce({
    data: { session: { user: { id: uid }, access_token: 't' } },
    error: null,
  })
  return useAuthStore().signIn('x@example.com', 'pw')
}

/** Leaves the device as a forced sign-out would: A's sync state and data still here. */
function seedAccountA(upsertSessionIds: string[]) {
  localStorage.setItem(
    'wtx:sync',
    JSON.stringify({
      userId: A,
      firstSyncDone: true,
      foreignSessionsChecked: true,
      routinesCursor: null,
      sessionsCursor: null,
      routinesDirty: false,
      deletedRoutineIds: [],
      upsertSessionIds,
      deletedSessionIds: [],
    }),
  )
  setActivePinia(createPinia())
  useSessionsStore().applyRemote([
    { id: id(1), rawText: TEXT('A synced'), addedAt: 1 },
    { id: id(2), rawText: TEXT('A unsynced'), addedAt: 2 },
    { id: id(3), rawText: TEXT('Device only'), addedAt: 3, localOnly: true },
  ])
}

describe('auth: account data on the device', () => {
  beforeEach(() => {
    localStorage.clear()
    setActivePinia(createPinia())
    auth.signInWithPassword.mockReset()
  })

  it("never lets a new account's first sync pick up the previous account's data", async () => {
    seedAccountA([id(2)])
    const sync = useSyncStore()
    const start = vi.spyOn(sync, 'start').mockResolvedValue()

    await signInAs(B)

    const sessions = useSessionsStore().sessions
    // A's synced copy is gone; the unsynced one and the device-only one stay, both device-only.
    expect(sessions.map((s) => s.id).sort()).toEqual([id(2), id(3)])
    expect(sessions.every((s) => s.localOnly)).toBe(true)
    expect(sync.ownerId).toBeNull()
    expect(start).toHaveBeenCalledWith(B)
  })

  it('leaves everything in place when the same account signs back in', async () => {
    seedAccountA([id(2)])
    const sync = useSyncStore()
    vi.spyOn(sync, 'start').mockResolvedValue()

    await signInAs(A)

    const sessions = useSessionsStore().sessions
    expect(sessions).toHaveLength(3)
    expect(sessions.find((s) => s.id === id(2))?.localOnly).toBeUndefined()
    expect(sync.ownerId).toBe(A)
  })

  it('warns before logging out while offline, then keeps unsynced and device-only sessions', async () => {
    seedAccountA([])
    await signInAs(A)
    await useSyncStore().syncNow()
    const added = useSessionsStore().add(TEXT('Offline workout'))

    const onLine = vi.spyOn(navigator, 'onLine', 'get').mockReturnValue(false)
    const store = useAuthStore()
    const check = await store.checkLogout()
    expect(check).toMatchObject({ synced: false, offline: true, unsyncedSessions: 1, deviceOnlySessions: 1 })

    await store.signOut()
    onLine.mockRestore()

    const sessions = useSessionsStore().sessions
    expect(sessions.map((s) => s.id).sort()).toEqual([id(3), added.id].sort())
    expect(sessions.every((s) => s.localOnly)).toBe(true)
    expect(store.isLoggedIn).toBe(false)
    expect(useSyncStore().ownerId).toBeNull()
  })

  it('reports a clean log-out once everything has synced', async () => {
    seedAccountA([])
    await signInAs(A)
    const check = await useAuthStore().checkLogout()
    expect(check).toMatchObject({ synced: true, unsyncedSessions: 0, deviceOnlySessions: 1, activeWorkout: false })
  })
})
