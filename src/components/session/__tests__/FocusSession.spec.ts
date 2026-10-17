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

describe('FocusSession: deleting a set', () => {
  let pinia: Pinia
  let wrapper: VueWrapper | undefined

  beforeEach(() => {
    localStorage.clear()
    i18n.global.locale.value = 'en'
    pinia = createPinia()
    Element.prototype.scrollIntoView = vi.fn<() => void>()
  })
  afterEach(() => {
    wrapper?.unmount()
    document.body.innerHTML = ''
    vi.restoreAllMocks()
    vi.useRealTimers()
  })

  function mountSession() {
    wrapper = mount(FocusSession, {
      attachTo: document.body,
      global: { plugins: [pinia, i18n] },
    })
    return wrapper
  }

  const rows = () => wrapper!.findAll('li.set')
  const labels = () => rows().map((row) => row.find('.set__tag').text())

  /** jsdom has no PointerEvent: a mouse event under a pointer event's name, as a touch. */
  function pointer(el: Element, type: string, clientX: number, clientY: number) {
    const event = new MouseEvent(type, { bubbles: true, cancelable: true, clientX, clientY })
    Object.defineProperty(event, 'pointerType', { value: 'touch' })
    Object.defineProperty(event, 'pointerId', { value: 1 })
    el.dispatchEvent(event)
  }

  async function swipeLeft(index: number) {
    const slide = rows()[index]!.find('.swipe__slide').element
    pointer(slide, 'pointerdown', 300, 100)
    pointer(slide, 'pointermove', 260, 101)
    pointer(slide, 'pointermove', 180, 102)
    pointer(slide, 'pointerup', 180, 102)
    // The click the end of a drag produces.
    await rows()[index]!.find('.set__prev').trigger('click')
  }

  it('slides a row open to its Delete without picking the set', async () => {
    startSession(pinia)
    mountSession()

    await swipeLeft(1)

    expect(rows()[1]!.find('.swipe__action').classes()).toContain('swipe__action--shown')
    expect(rows()[0]!.classes()).toContain('set--current')
  })

  it('deletes the set from its Delete, and offers it back', async () => {
    const activeSession = startSession(pinia)
    mountSession()
    const second = activeSession.session!.draft.exercises[0]!.loggedSets[1]!.id

    await swipeLeft(1)
    await rows()[1]!.find('.swipe__action').trigger('click')

    expect(labels()).toEqual(['1', '2'])
    expect(wrapper!.find('.undo').text()).toContain('Set 2 deleted')

    await wrapper!.find('.undo__btn').trigger('click')

    expect(activeSession.session!.draft.exercises[0]!.loggedSets[1]!.id).toBe(second)
    expect(labels()).toEqual(['1', '2', '3'])
    expect(wrapper!.find('.undo').exists()).toBe(false)
  })

  it('stops offering the undo after a few seconds', async () => {
    vi.useFakeTimers()
    startSession(pinia)
    mountSession()

    await swipeLeft(0)
    await rows()[0]!.find('.swipe__action').trigger('click')
    expect(wrapper!.find('.undo').exists()).toBe(true)

    vi.advanceTimersByTime(8000)
    await nextTick()
    expect(wrapper!.find('.undo').exists()).toBe(false)
  })

  it("deletes the set you're on from the exercise's menu, too", async () => {
    startSession(pinia)
    mountSession()

    await rows()[2]!.find('.set__prev').trigger('click')
    await wrapper!.find('.now__more').trigger('click')
    const item = [...document.querySelectorAll<HTMLButtonElement>('button')].find(
      (b) => b.textContent?.includes('Delete set 3'),
    )
    expect(item).toBeDefined()
    item!.click()
    await nextTick()

    expect(labels()).toEqual(['1', '2'])
    expect(wrapper!.find('.undo').text()).toContain('Set 3 deleted')
  })

  it('stays on an exercise its last open set was deleted from', async () => {
    const activeSession = startSession(pinia)
    activeSession.addExercise('Squat')
    mountSession()
    const sets = activeSession.session!.draft.exercises[0]!.loggedSets
    activeSession.completeSet(0, sets[0]!.id)
    activeSession.completeSet(0, sets[1]!.id)
    await nextTick()

    await swipeLeft(2)
    await rows()[2]!.find('.swipe__action').trigger('click')

    expect(wrapper!.find('.now__name').text()).toBe('Bench Press')
    expect(wrapper!.find('.primary-action').text()).toContain('Next')
  })
})

describe('FocusSession: a reorder never moves you off the exercise you are on', () => {
  const THREE = `# Push Day
unit: kg

Bench Press | reps 3x8 | 60
Overhead Press | reps 3x8 | 40
Dips | reps 3x10
`
  let pinia: Pinia
  let wrapper: VueWrapper | undefined

  beforeEach(() => {
    localStorage.clear()
    i18n.global.locale.value = 'en'
    pinia = createPinia()
    setActivePinia(pinia)
  })
  afterEach(() => {
    wrapper?.unmount()
    document.body.innerHTML = ''
  })

  function start() {
    const routines = useRoutinesStore()
    const activeSession = useActiveSessionStore()
    const routine = routines.add(THREE, '')
    const parsed = routines.parsed(routine.id)
    if (!parsed?.ok) throw new Error('routine should parse')
    activeSession.start(routine, parsed.template, { roomId: 'room-1' })
    wrapper = mount(FocusSession, { global: { plugins: [pinia, i18n] } })
    return activeSession
  }

  const shown = () => wrapper!.find('.now__name').text()

  it('keeps a half-done exercise on screen when another is moved in front of it', async () => {
    const activeSession = start()
    const bench = activeSession.session!.draft.exercises[0]!
    activeSession.completeSet(0, bench.loggedSets[0]!.id)
    await nextTick()
    expect(shown()).toBe('Bench Press')

    // The host moves Dips to the front — as a guest's session receives it.
    activeSession.followRoomOrder([2, 0, 1], 1)
    await nextTick()
    expect(shown()).toBe('Bench Press')
    expect(wrapper!.text()).toContain('2 of 3')
  })

  it('keeps a half-typed set on screen', async () => {
    const activeSession = start()
    const bench = activeSession.session!.draft.exercises[0]!
    activeSession.updateSet(0, bench.loggedSets[0]!.id, { weight: 62.5 })
    activeSession.followRoomOrder([1, 2, 0], 1)
    await nextTick()
    expect(shown()).toBe('Bench Press')
  })

  it('moves on to the new first exercise when nothing was started yet', async () => {
    const activeSession = start()
    activeSession.followRoomOrder([2, 0, 1], 1)
    await nextTick()
    expect(shown()).toBe('Dips')
  })
})
