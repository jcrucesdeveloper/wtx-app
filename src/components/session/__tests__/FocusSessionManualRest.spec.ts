import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { nextTick } from 'vue'
import { mount, type VueWrapper } from '@vue/test-utils'
import { createPinia, setActivePinia, type Pinia } from 'pinia'
import { i18n } from '@/i18n'
import { useRoutinesStore } from '@/stores/routines'
import { useActiveSessionStore } from '@/stores/activeSession'
import FocusSession from '../FocusSession.vue'

vi.mock('@/services/supabase', () => ({
  supabase: null,
  isSupabaseConfigured: false,
  requireSupabase: () => {
    throw new Error('no server in tests')
  },
}))

const ROUTINE = `# Push Day
unit: kg

Bench Press | reps 2x8 | 60 | rest 1m30s
`

describe('FocusSession: starting a rest by hand', () => {
  let pinia: Pinia
  let wrapper: VueWrapper | undefined

  beforeEach(() => {
    localStorage.clear()
    i18n.global.locale.value = 'en'
    pinia = createPinia()
    setActivePinia(pinia)
    Element.prototype.scrollIntoView = vi.fn<() => void>()
  })

  afterEach(() => {
    wrapper?.unmount()
    document.body.innerHTML = ''
  })

  function start() {
    const routines = useRoutinesStore()
    const activeSession = useActiveSessionStore()
    const routine = routines.add(ROUTINE, '')
    const parsed = routines.parsed(routine.id)
    if (!parsed?.ok) throw new Error('routine should parse')
    activeSession.start(routine, parsed.template)
    return activeSession
  }

  const playButton = () => wrapper!.find('[data-test="rest-start"]')

  it('keeps the rest chip, with its play button, once the exercise is done', async () => {
    const store = start()
    wrapper = mount(FocusSession, { attachTo: document.body, global: { plugins: [pinia, i18n] } })
    const ids = store.session!.draft.exercises[0]!.loggedSets.map((s) => s.id)
    for (const id of ids) store.completeSet(0, id)
    await nextTick()
    // Resting after the last set: the timer has the controls, no play button.
    expect(playButton().exists()).toBe(false)

    store.skipRestTimer()
    await nextTick()
    expect(playButton().exists()).toBe(true)

    await playButton().trigger('click')
    expect(store.session!.restSetId).toBe(ids[ids.length - 1])
  })
})
