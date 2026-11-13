import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { mount, type VueWrapper } from '@vue/test-utils'
import { createPinia, setActivePinia, type Pinia } from 'pinia'
import { i18n } from '@/i18n'
import { useActiveSessionStore } from '@/stores/activeSession'
import { WorkoutParser } from '@/lib/wtx'
import type { StoredRoutine } from '@/stores/routines'
import RestTimeButton from '../RestTimeButton.vue'

const { selection } = vi.hoisted(() => ({ selection: vi.fn<() => Promise<void>>() }))
vi.mock('@/services/haptics', () => ({
  HapticsService: {
    selection,
    restOver: vi.fn<() => Promise<void>>(() => Promise.resolve()),
    light: vi.fn<() => void>(),
    medium: vi.fn<() => void>(),
  },
}))

const TEMPLATE = `# Push Day
unit: kg

Bench Press | reps 3x8 | 60 | rest 1m30s
Overhead Press | reps 2x10 | 30
`

describe('RestTimeButton: starting a rest by hand', () => {
  let pinia: Pinia
  let wrapper: VueWrapper | undefined

  beforeEach(() => {
    localStorage.clear()
    i18n.global.locale.value = 'en'
    pinia = createPinia()
    setActivePinia(pinia)
    selection.mockClear()
  })

  afterEach(() => {
    wrapper?.unmount()
  })

  function start() {
    const store = useActiveSessionStore()
    store.start({ id: 'r1', filename: 'push.wtt' } as StoredRoutine, WorkoutParser.parseTemplate(TEMPLATE))
    return store
  }

  function mountButton(exerciseIndex: number) {
    wrapper = mount(RestTimeButton, {
      props: { exerciseIndex },
      global: { plugins: [pinia, i18n], stubs: { RestTimeSheet: true } },
    })
    return wrapper
  }

  const playButton = () => wrapper!.find('[data-test="rest-start"]')

  it('offers no play button before a set is logged', () => {
    start()
    mountButton(0)
    expect(playButton().exists()).toBe(false)
  })

  it('hides the play button while resting', async () => {
    const store = start()
    store.completeSet(0, store.session!.draft.exercises[0]!.loggedSets[0]!.id)
    mountButton(0)
    expect(playButton().exists()).toBe(false)
  })

  it('hides the play button when the exercise has no rest', () => {
    const store = start()
    store.completeSet(1, store.session!.draft.exercises[1]!.loggedSets[0]!.id)
    mountButton(1)
    expect(playButton().exists()).toBe(false)
  })

  it('shows after a skipped rest, and tapping it starts the rest again', async () => {
    const store = start()
    const setId = store.session!.draft.exercises[0]!.loggedSets[0]!.id
    store.completeSet(0, setId)
    store.skipRestTimer()
    mountButton(0)

    expect(playButton().exists()).toBe(true)
    expect(playButton().attributes('aria-label')).toBe('Start rest now')

    await playButton().trigger('click')
    expect(store.session!.restSetId).toBe(setId)
    expect(store.session!.restDurationSeconds).toBe(90)
    expect(selection).toHaveBeenCalled()
    expect(playButton().exists()).toBe(false)
  })
})
