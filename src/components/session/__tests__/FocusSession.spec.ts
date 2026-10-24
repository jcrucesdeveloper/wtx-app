import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { nextTick } from 'vue'
import { mount, type VueWrapper } from '@vue/test-utils'
import { createPinia, setActivePinia, type Pinia } from 'pinia'
import { i18n } from '@/i18n'
import { useRoutinesStore } from '@/stores/routines'
import { useActiveSessionStore } from '@/stores/activeSession'
import { LONG_PRESS_MS } from '@/composables/useLongPress'
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
    Object.defineProperty(event, 'isPrimary', { value: true })
    el.dispatchEvent(event)
  }

  /** Presses a row for `ms`, lets go, and sends the click a release does. */
  async function press(index: number, ms = LONG_PRESS_MS) {
    vi.useFakeTimers()
    const el = rows()[index]!.find('.set__hold').element
    pointer(el, 'pointerdown', 100, 100)
    vi.advanceTimersByTime(ms)
    pointer(el, 'pointerup', 100, 100)
    await rows()[index]!.find('.set__prev').trigger('click')
  }

  /** A row of the open sheet, by its label. */
  function menuItem(label: string) {
    return [...document.querySelectorAll<HTMLButtonElement>('button')].find(
      (b) => b.querySelector('.row__label')?.textContent?.trim() === label,
    )
  }
  const menuTitle = () => document.querySelector('.sheet__head h2')?.textContent?.trim()

  it("holding a row opens its set's menu without picking the set", async () => {
    startSession(pinia)
    mountSession()

    await press(1)

    expect(menuTitle()).toBe('Set 2')
    expect(menuItem('Delete set 2')).toBeDefined()
    expect(rows()[1]!.classes()).toContain('set--held')
    expect(rows()[0]!.classes()).toContain('set--current')
  })

  it('a quick tap still picks the set, and a drag opens nothing', async () => {
    startSession(pinia)
    mountSession()

    // A scroll that started on the row: it moved, so holding on is no press.
    vi.useFakeTimers()
    const el = rows()[1]!.find('.set__hold').element
    pointer(el, 'pointerdown', 100, 100)
    pointer(el, 'pointermove', 100, 130)
    vi.advanceTimersByTime(LONG_PRESS_MS * 2)
    await nextTick()
    expect(menuTitle()).toBeUndefined()
    expect(rows()[1]!.classes()).not.toContain('set--pressing')

    await press(2, 120)
    expect(menuTitle()).toBeUndefined()
    expect(rows()[2]!.classes()).toContain('set--current')
  })

  it('opens the same menu on a right-click', async () => {
    startSession(pinia)
    mountSession()

    await rows()[1]!.find('.set__hold').trigger('contextmenu')

    expect(menuTitle()).toBe('Set 2')
  })

  it('deletes the set from its menu, and offers it back', async () => {
    const activeSession = startSession(pinia)
    mountSession()
    const second = activeSession.session!.draft.exercises[0]!.loggedSets[1]!.id

    await press(1)
    menuItem('Delete set 2')!.click()
    await nextTick()

    expect(labels()).toEqual(['1', '2'])
    expect(menuTitle()).toBeUndefined()
    expect(wrapper!.find('.undo').text()).toContain('Set 2 deleted')

    await wrapper!.find('.undo__btn').trigger('click')

    expect(activeSession.session!.draft.exercises[0]!.loggedSets[1]!.id).toBe(second)
    expect(labels()).toEqual(['1', '2', '3'])
    expect(wrapper!.find('.undo').exists()).toBe(false)
  })

  it('makes the held set a warm-up or a drop set from its menu', async () => {
    startSession(pinia)
    mountSession()

    await press(1)
    menuItem('Drop set')!.click()
    await nextTick()
    expect(labels()).toEqual(['1', 'D', '2'])

    await press(0)
    menuItem('Warm-up')!.click()
    await nextTick()
    expect(labels()).toEqual(['W', 'D', '1'])
  })

  it('stops offering the undo after a few seconds', async () => {
    startSession(pinia)
    mountSession()

    await press(0)
    menuItem('Delete set 1')!.click()
    await nextTick()
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
    const item = [...document.querySelectorAll<HTMLButtonElement>('button')].find((b) =>
      b.textContent?.includes('Delete set 3'),
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

    await press(2)
    menuItem('Delete set 3')!.click()
    await nextTick()

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
    wrapper = mount(FocusSession, { attachTo: document.body, global: { plugins: [pinia, i18n] } })
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

  it('still undoes a deleted set after the host moves its exercise', async () => {
    const activeSession = start()
    const bench = activeSession.session!.draft.exercises[0]!
    const second = bench.loggedSets[1]!.id
    activeSession.completeSet(0, bench.loggedSets[0]!.id)
    await nextTick()

    await wrapper!.findAll('li.set')[1]!.find('.set__prev').trigger('click')
    await wrapper!.find('.now__more').trigger('click')
    const item = [...document.querySelectorAll<HTMLButtonElement>('button')].find((b) =>
      b.textContent?.includes('Delete set 2'),
    )
    item!.click()
    await nextTick()
    expect(bench.loggedSets.map((s) => s.id)).not.toContain(second)

    activeSession.followRoomOrder([2, 0, 1], 1)
    await nextTick()
    await wrapper!.find('.undo__btn').trigger('click')

    expect(activeSession.session!.draft.exercises[1]).toBe(bench)
    expect(bench.loggedSets[1]!.id).toBe(second)
    expect(shown()).toBe('Bench Press')
  })

  it('moves on to the new first exercise when nothing was started yet', async () => {
    const activeSession = start()
    activeSession.followRoomOrder([2, 0, 1], 1)
    await nextTick()
    expect(shown()).toBe('Dips')
  })
})

describe('FocusSession: the rest time beside the set type', () => {
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
  })

  function mountSession() {
    wrapper = mount(FocusSession, {
      attachTo: document.body,
      global: { plugins: [pinia, i18n] },
    })
    return wrapper
  }

  const restButton = () => wrapper!.find('.now__meta .rest-time')

  it('sits once beside the one button, not on every set', () => {
    const activeSession = startSession(pinia)
    activeSession.setRestSeconds(0, 90)
    mountSession()

    expect(wrapper!.findAll('li.set .rest-time')).toHaveLength(0)
    expect(wrapper!.findAll('.dock .rest-time')).toHaveLength(0)
    expect(wrapper!.findAll('.now__meta .rest-time')).toHaveLength(1)
    expect(restButton().text()).toBe('1:30')
    expect(restButton().attributes('aria-label')).toBe('Rest 1:30. Change the rest timer')
  })

  it('says when the exercise rests not at all', async () => {
    const activeSession = startSession(pinia)
    activeSession.setRestSeconds(0, 0)
    mountSession()
    await nextTick()

    expect(restButton().text()).toBe('Off')
    expect(restButton().attributes('aria-label')).toBe('No rest timer. Set one')
  })

  it('keeps showing the setting while a rest counts down', async () => {
    const activeSession = startSession(pinia)
    activeSession.setRestSeconds(0, 90)
    mountSession()

    await wrapper!.find('.primary-action').trigger('click')
    await nextTick()

    expect(activeSession.session!.restEndsAt).not.toBeNull()
    expect(restButton().text()).toBe('1:30')
  })

  it("opens the exercise's rest sheet", async () => {
    const activeSession = startSession(pinia)
    activeSession.setRestSeconds(0, 90)
    mountSession()

    await restButton().trigger('click')
    await nextTick()

    expect(document.body.querySelector('[role="dialog"][aria-label="Rest timer"]')).not.toBeNull()
  })
})

describe('FocusSession: a step between exercises', () => {
  const TWO = `# Push Day
unit: kg

Bench Press | reps 2x8 | 60 | rest 1m30s
Overhead Press | reps 3x10 | 40
`
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

  function start(source = TWO, options?: { roomId: string }) {
    const routines = useRoutinesStore()
    const activeSession = useActiveSessionStore()
    const routine = routines.add(source, '')
    const parsed = routines.parsed(routine.id)
    if (!parsed?.ok) throw new Error('routine should parse')
    activeSession.start(routine, parsed.template, options)
    wrapper = mount(FocusSession, { attachTo: document.body, global: { plugins: [pinia, i18n] } })
    return activeSession
  }

  const shown = () => wrapper!.find('.now__name').text()
  const primary = () => wrapper!.find('.primary-action')
  const rows = () => wrapper!.findAll('li.set')

  /** Logs every open set of the exercise on screen with the big button. */
  async function logAll() {
    while (primary().text().startsWith('Log')) await primary().trigger('click')
  }

  it('stays on a finished exercise, with what comes next, until Next is tapped', async () => {
    const activeSession = start()
    await logAll()

    expect(shown()).toBe('Bench Press')
    expect(rows().every((row) => row.classes().includes('set--done'))).toBe(true)
    expect(primary().text()).toBe('Next: Overhead Press')
    const card = wrapper!.find('.up-next')
    expect(card.text()).toContain('Up next')
    expect(card.text()).toContain('Overhead Press')
    expect(card.text()).toContain('3 × 10 · 40 kg')
    // The rest after the last set keeps running through the step.
    expect(activeSession.session!.restEndsAt).not.toBeNull()

    await primary().trigger('click')
    expect(shown()).toBe('Overhead Press')
    expect(primary().text()).toContain('Log set 1')
    expect(wrapper!.find('.up-next').exists()).toBe(false)
    expect(activeSession.session!.restEndsAt).not.toBeNull()
  })

  it('finishes from the last exercise, with no step after it', async () => {
    start()
    await logAll()
    await primary().trigger('click')
    await logAll()

    expect(shown()).toBe('Overhead Press')
    expect(primary().text()).toBe('Finish workout')
    expect(wrapper!.find('.up-next').exists()).toBe(false)
    await primary().trigger('click')
    expect(wrapper!.emitted('finish')).toHaveLength(1)
  })

  it('goes back to editing a set taken back in the step, without moving on', async () => {
    start()
    await logAll()

    await rows()[1]!.find('.set__done').trigger('click')
    expect(shown()).toBe('Bench Press')
    expect(primary().text()).toBe('Log set 2')
    expect(wrapper!.find('.up-next').exists()).toBe(false)

    await primary().trigger('click')
    expect(shown()).toBe('Bench Press')
    expect(primary().text()).toBe('Next: Overhead Press')
  })

  it('logs a set added in the step, and still waits for Next', async () => {
    start()
    await logAll()

    await wrapper!.find('.sets__add').trigger('click')
    expect(primary().text()).toBe('Log set 3')
    await primary().trigger('click')
    expect(shown()).toBe('Bench Press')
    expect(primary().text()).toBe('Next: Overhead Press')
  })

  it('stays on the finished exercise when the host reorders the workout', async () => {
    const activeSession = start(TWO, { roomId: 'room-1' })
    await logAll()

    activeSession.followRoomOrder([1, 0], 1)
    await nextTick()
    expect(shown()).toBe('Bench Press')
    expect(primary().text()).toBe('Next: Overhead Press')

    await primary().trigger('click')
    expect(shown()).toBe('Overhead Press')
  })
})

describe('FocusSession: in a group, the host moving on moves this screen', () => {
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
    Element.prototype.scrollIntoView = vi.fn<() => void>()
  })
  afterEach(() => {
    wrapper?.unmount()
    document.body.innerHTML = ''
    vi.restoreAllMocks()
  })

  function start() {
    const routines = useRoutinesStore()
    const activeSession = useActiveSessionStore()
    const routine = routines.add(THREE, '')
    const parsed = routines.parsed(routine.id)
    if (!parsed?.ok) throw new Error('routine should parse')
    activeSession.start(routine, parsed.template, { roomId: 'room-1' })
    wrapper = mount(FocusSession, { attachTo: document.body, global: { plugins: [pinia, i18n] } })
    return activeSession
  }

  const shown = () => wrapper!.find('.now__name').text()

  it('says which exercise is on screen', async () => {
    const activeSession = start()
    expect(activeSession.focusedExercise?.name).toBe('Bench Press')
    await wrapper!.findAll('.where__step')[1]!.trigger('click')
    expect(activeSession.focusedExercise?.name).toBe('Overhead Press')
  })

  it("goes to the host's exercise", async () => {
    const activeSession = start()
    activeSession.followRoomFocus(2)
    await nextTick()
    expect(shown()).toBe('Dips')
    expect(activeSession.focusRequest).toBeNull()
  })

  it('waits for a number being typed, then goes', async () => {
    const activeSession = start()
    const weight = wrapper!.find<HTMLInputElement>('.fields input')
    weight.element.focus()
    await weight.trigger('focus')
    activeSession.followRoomFocus(2)
    await nextTick()
    expect(shown()).toBe('Bench Press')

    weight.element.blur()
    await weight.trigger('blur')
    await new Promise((resolve) => setTimeout(resolve, 0))
    await nextTick()
    expect(shown()).toBe('Dips')
  })

  it('lets a member go back to another exercise afterwards', async () => {
    const activeSession = start()
    activeSession.followRoomFocus(2)
    await nextTick()
    // Remounting (leaving the screen and coming back) doesn't replay the move.
    wrapper!.unmount()
    wrapper = mount(FocusSession, { attachTo: document.body, global: { plugins: [pinia, i18n] } })
    await nextTick()
    expect(shown()).toBe('Bench Press')
  })
})

describe('FocusSession: a timed exercise is one entry', () => {
  const TIMED = `# Core
unit: kg

Plank | time 1m
Bench Press | reps 2x8 | 60
`
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
    vi.useRealTimers()
  })

  function start() {
    const routines = useRoutinesStore()
    const activeSession = useActiveSessionStore()
    const routine = routines.add(TIMED, '')
    const parsed = routines.parsed(routine.id)
    if (!parsed?.ok) throw new Error('routine should parse')
    activeSession.start(routine, parsed.template)
    wrapper = mount(FocusSession, { attachTo: document.body, global: { plugins: [pinia, i18n] } })
    return activeSession
  }

  const primary = () => wrapper!.find('.primary-action')
  const plank = (store: ReturnType<typeof useActiveSessionStore>) =>
    store.session!.draft.exercises[0]!

  it('shows its time and target, with no list of sets, no add set and no set type', () => {
    start()
    const fields = wrapper!.findAll<HTMLInputElement>('.fields input')
    expect(fields).toHaveLength(1)
    expect(fields[0]!.element.value).toBe('1:00')
    expect(fields[0]!.attributes('inputmode')).toBe('numeric')
    expect(wrapper!.find('.now__set').text()).toBe('Target 1:00')
    expect(wrapper!.find('.sets').exists()).toBe(false)
    expect(wrapper!.find('.sets__add').exists()).toBe(false)
    expect(wrapper!.find('.now__type').exists()).toBe(false)
    expect(primary().text()).toBe('Log time')
  })

  it('logs once, then shows what was logged and moves on', async () => {
    const store = start()
    await primary().trigger('click')

    expect(plank(store).loggedSets).toMatchObject([{ completed: true, reps: 60, weight: 0 }])
    expect(wrapper!.find('.fields').exists()).toBe(false)
    expect(wrapper!.find('.logged').text()).toContain('1:00')
    expect(primary().text()).toBe('Next: Bench Press')
  })

  it('opens the logged time again to correct it', async () => {
    const store = start()
    await primary().trigger('click')
    await wrapper!.find('.logged').trigger('click')

    expect(wrapper!.findAll('.fields input')).toHaveLength(1)
    expect(primary().text()).toBe('Done editing')
    expect(plank(store).loggedSets[0]!.completed).toBe(true)
  })

  it('times it with the stopwatch, and logging stops it', async () => {
    vi.useFakeTimers()
    const store = start()
    await wrapper!.find('.stopwatch').trigger('click')
    expect(wrapper!.find('.stopwatch').text()).toBe('Stop timer')

    vi.advanceTimersByTime(42_000)
    await nextTick()
    expect(wrapper!.find('[role="timer"]').text()).toBe('0:42')

    await primary().trigger('click')
    expect(plank(store).loggedSets).toMatchObject([{ completed: true, reps: 42 }])
  })

  it('puts the stopwatch time in the field when stopped, ready to log', async () => {
    vi.useFakeTimers()
    const store = start()
    await wrapper!.find('.stopwatch').trigger('click')
    vi.advanceTimersByTime(75_000)
    await wrapper!.find('.stopwatch').trigger('click')

    expect(wrapper!.find<HTMLInputElement>('.fields input').element.value).toBe('1:15')
    expect(plank(store).loggedSets[0]!.completed).toBe(false)
  })

  it('has no delete-set in the exercise menu', async () => {
    start()
    await wrapper!.find('.now__more').trigger('click')
    await nextTick()
    expect(document.body.textContent).toContain('Track by weight and reps')
    expect(document.body.textContent).not.toContain('Delete set')
  })
})
