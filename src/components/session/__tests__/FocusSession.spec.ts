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

Bench Press | reps 3x8 | 60
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

describe('FocusSession: tapping a number to edit it', () => {
  let pinia: Pinia
  let wrapper: VueWrapper | undefined
  let select: ReturnType<typeof vi.spyOn>

  beforeEach(() => {
    localStorage.clear()
    i18n.global.locale.value = 'en'
    pinia = createPinia()
    select = vi.spyOn(HTMLInputElement.prototype, 'select')
    // jsdom has no layout; the focus handler scrolls the field into view.
    Element.prototype.scrollIntoView = vi.fn<() => void>()
  })

  afterEach(() => {
    wrapper?.unmount()
    document.body.innerHTML = ''
    vi.restoreAllMocks()
  })

  function mountSession() {
    wrapper = mount(FocusSession, {
      attachTo: document.body,
      global: { plugins: [pinia, i18n] },
    })
    return wrapper
  }

  const rows = () => wrapper!.findAll('li.set')
  const fields = () => wrapper!.findAll<HTMLInputElement>('.fields input')

  it("focuses and selects the current set's weight, inside the tap", async () => {
    startSession(pinia)
    mountSession()

    await rows()[0]!.findAll('.set__num')[0]!.trigger('click')

    const weight = fields()[0]!.element
    expect(document.activeElement).toBe(weight)
    expect(select).toHaveBeenCalled()
    expect(select.mock.contexts.at(-1)).toBe(weight)
  })

  it('picks a logged set and focuses its weight once its fields arrive', async () => {
    const activeSession = startSession(pinia)
    const first = activeSession.session!.draft.exercises[0]!.loggedSets[0]!
    activeSession.updateSet(0, first.id, { weight: 62.5, reps: 8 })
    activeSession.completeSet(0, first.id)
    mountSession()
    expect(fields()[0]!.element.value).toBe('60')

    await rows()[0]!.findAll('.set__num')[0]!.trigger('click')
    await nextTick()

    const weight = fields()[0]!.element
    expect(weight.value).toBe('62.5')
    expect(document.activeElement).toBe(weight)
    expect(select.mock.contexts.at(-1)).toBe(weight)
    // Still logged, being corrected in place; the stand-in input is gone.
    expect(first.completed).toBe(true)
    expect(wrapper!.text()).toContain('Done editing')
    expect(document.querySelectorAll('input[aria-hidden="true"]')).toHaveLength(0)
  })

  it('focuses the reps field when the reps are tapped', async () => {
    startSession(pinia)
    mountSession()

    await rows()[1]!.findAll('.set__num')[1]!.trigger('click')
    await nextTick()

    expect(rows()[1]!.classes()).toContain('set--current')
    expect(document.activeElement).toBe(fields()[1]!.element)
  })

  it("focuses a timed exercise's time field when its time is tapped", async () => {
    const activeSession = startSession(pinia)
    activeSession.setExerciseKind(0, 'time')
    mountSession()

    await rows()[1]!.findAll('.set__num')[1]!.trigger('click')
    await nextTick()

    expect(rows()[1]!.classes()).toContain('set--current')
    // One field, the mm:ss time, in place of weight and reps.
    expect(fields()).toHaveLength(1)
    expect(document.activeElement).toBe(fields()[0]!.element)
    expect(fields()[0]!.attributes('inputmode')).toBe('numeric')
    expect(document.querySelectorAll('input[aria-hidden="true"]')).toHaveLength(0)
  })

  it('only picks the set when the rest of the row is tapped', async () => {
    startSession(pinia)
    mountSession()

    await rows()[1]!.find('.set__prev').trigger('click')
    await nextTick()

    expect(rows()[1]!.classes()).toContain('set--current')
    expect(document.activeElement?.tagName).not.toBe('INPUT')
  })
})
