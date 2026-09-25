import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { nextTick } from 'vue'
import { mount, type VueWrapper } from '@vue/test-utils'
import { createPinia, setActivePinia, type Pinia } from 'pinia'
import { i18n } from '@/i18n'
import { useRoutinesStore } from '@/stores/routines'
import { useActiveSessionStore } from '@/stores/activeSession'
import { useSessionsStore } from '@/stores/sessions'
import { useSettingsStore } from '@/stores/settings'
import FinishSessionSheet from '../FinishSessionSheet.vue'

// Accounts on, so the save-target choice is shown; nothing here talks to a server.
vi.mock('@/services/supabase', () => ({
  supabase: null,
  isSupabaseConfigured: true,
  requireSupabase: () => {
    throw new Error('no server in tests')
  },
}))

const ROUTINE = `# Push Day
unit: kg

Bench Press | reps 2x8 | 60
Overhead Press | reps 1x8 | 40
`

function startSession(pinia: Pinia) {
  setActivePinia(pinia)
  const routines = useRoutinesStore()
  const activeSession = useActiveSessionStore()
  const routine = routines.add(ROUTINE, '')
  const parsed = routines.parsed(routine.id)
  if (!parsed?.ok) throw new Error('routine should parse')
  activeSession.start(routine, parsed.template)
  return activeSession
}

function completeAllSets(activeSession: ReturnType<typeof useActiveSessionStore>) {
  activeSession.session!.draft.exercises.forEach((exercise, i) => {
    for (const set of exercise.loggedSets) {
      activeSession.updateSet(i, set.id, { weight: 60, reps: 8 })
      activeSession.completeSet(i, set.id)
    }
  })
}

function button(label: string): HTMLButtonElement {
  const found = [...document.body.querySelectorAll('button')].find((b) =>
    b.textContent?.includes(label),
  )
  if (!found) throw new Error(`no "${label}" button`)
  return found
}

describe('FinishSessionSheet', () => {
  let pinia: Pinia
  let wrapper: VueWrapper | undefined

  beforeEach(() => {
    localStorage.clear()
    i18n.global.locale.value = 'en'
    pinia = createPinia()
    vi.useFakeTimers({ toFake: ['Date'] })
    vi.setSystemTime(new Date(2026, 8, 25, 18, 0))
  })

  afterEach(() => {
    wrapper?.unmount()
    document.body.innerHTML = ''
    vi.useRealTimers()
  })

  async function openSheet() {
    wrapper = mount(FinishSessionSheet, {
      props: { open: false },
      attachTo: document.body,
      global: { plugins: [pinia, i18n] },
    })
    await wrapper.setProps({ open: true })
    await nextTick()
    // Step past the misclick guard.
    vi.setSystemTime(Date.now() + 1000)
    return wrapper
  }

  it('asks before finishing instead of ending the workout right away', async () => {
    startSession(pinia)
    const sheet = await openSheet()
    const text = document.body.textContent ?? ''

    expect(text).toContain('Finish workout?')
    expect(text).toContain('Keep training')
    expect(sheet.emitted('finish')).toBeUndefined()
  })

  it('finishes with the chosen name, saved to the profile by default', async () => {
    const activeSession = startSession(pinia)
    completeAllSets(activeSession)
    const sheet = await openSheet()

    const input = document.body.querySelector('input') as HTMLInputElement
    expect(input.value).toBe('Push Day')
    input.value = 'Heavy push'
    input.dispatchEvent(new Event('input'))
    button('Finish & save').click()

    expect(sheet.emitted('finish')).toEqual([
      [{ routineIdOverride: undefined, name: 'Heavy push', localOnly: false }],
    ])
  })

  it('keeps the session on this device and remembers that choice', async () => {
    const activeSession = startSession(pinia)
    completeAllSets(activeSession)
    const sheet = await openSheet()

    button('This device').click()
    await nextTick()
    button('Finish & save').click()

    expect(sheet.emitted('finish')?.[0]?.[0]).toMatchObject({ localOnly: true })
    expect(useSettingsStore().sessionSaveTarget).toBe('device')
  })

  it('ignores a tap that lands right as it opens', async () => {
    startSession(pinia)
    wrapper = mount(FinishSessionSheet, {
      props: { open: false },
      attachTo: document.body,
      global: { plugins: [pinia, i18n] },
    })
    await wrapper.setProps({ open: true })
    await nextTick()

    button('Finish & save').click()
    expect(wrapper.emitted('finish')).toBeUndefined()
  })

  it('warns about sets that are not marked done', async () => {
    const activeSession = startSession(pinia)
    const firstSet = activeSession.session!.draft.exercises[0]!.loggedSets[0]!
    activeSession.completeSet(0, firstSet.id)
    await openSheet()

    expect(document.body.textContent).toContain("2 sets aren't marked done")
  })

  it('goes on to the routine step when exercises were added', async () => {
    const activeSession = startSession(pinia)
    activeSession.addExercise('Dips')
    const sheet = await openSheet()

    button('Next').click()
    await nextTick()
    expect(document.body.textContent).toContain('Workout changed')
    expect(sheet.emitted('finish')).toBeUndefined()

    button('Just finish this workout').click()
    expect(sheet.emitted('finish')?.[0]?.[0]).toMatchObject({ localOnly: false })
  })
})

describe('finishing a device-only session', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  it('stores it flagged local-only, and it can be moved to the profile later', () => {
    const activeSession = startSession(createPinia())
    const stored = activeSession.finish({ name: 'Solo', localOnly: true })
    const sessions = useSessionsStore()

    expect(sessions.getById(stored.id)?.localOnly).toBe(true)
    expect(sessions.parsed(stored.id)).toMatchObject({ ok: true, session: { name: 'Solo' } })

    sessions.saveToProfile(stored.id)
    expect(sessions.getById(stored.id)?.localOnly).toBeUndefined()
  })
})
