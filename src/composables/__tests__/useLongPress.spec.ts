import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { defineComponent, h } from 'vue'
import { mount, type VueWrapper } from '@vue/test-utils'
import { LONG_PRESS_MS, useLongPress } from '../useLongPress'

function pointer(overrides: Partial<PointerEvent> = {}): PointerEvent {
  return {
    isPrimary: true,
    pointerType: 'touch',
    button: 0,
    pointerId: 1,
    clientX: 100,
    clientY: 100,
    ...overrides,
  } as PointerEvent
}

let wrapper: VueWrapper | undefined

function setup() {
  const onLongPress = vi.fn<(key: string) => void>()
  let api!: ReturnType<typeof useLongPress<string>>
  wrapper = mount(
    defineComponent({
      setup() {
        api = useLongPress<string>(onLongPress)
        return () => h('div')
      },
    }),
  )
  return { onLongPress, ...api, handlers: api.bind('row-1') }
}

/** A click the way the browser sends it, bubbling from a button in the page. */
function clickInPage(): { clicked: ReturnType<typeof vi.fn<() => void>>; event: MouseEvent } {
  const button = document.createElement('button')
  const clicked = vi.fn<() => void>()
  button.addEventListener('click', clicked)
  document.body.append(button)
  const event = new MouseEvent('click', { bubbles: true, cancelable: true })
  button.dispatchEvent(event)
  button.remove()
  return { clicked, event }
}

beforeEach(() => vi.useFakeTimers())
afterEach(() => {
  wrapper?.unmount()
  wrapper = undefined
  vi.useRealTimers()
})

describe('useLongPress', () => {
  it('fires once the press has been held long enough', () => {
    const { onLongPress, handlers, pressing } = setup()
    handlers.pointerdown(pointer())
    expect(pressing.value).toBe('row-1')
    vi.advanceTimersByTime(LONG_PRESS_MS - 1)
    expect(onLongPress).not.toHaveBeenCalled()
    vi.advanceTimersByTime(1)
    expect(onLongPress).toHaveBeenCalledExactlyOnceWith('row-1')
    expect(pressing.value).toBeNull()
  })

  it('does not fire when let go early', () => {
    const { onLongPress, handlers, pressing } = setup()
    handlers.pointerdown(pointer())
    vi.advanceTimersByTime(200)
    handlers.pointerup()
    vi.advanceTimersByTime(LONG_PRESS_MS)
    expect(onLongPress).not.toHaveBeenCalled()
    expect(pressing.value).toBeNull()
  })

  it('lets a small wobble through but cancels on a drag', () => {
    const { onLongPress, handlers } = setup()
    handlers.pointerdown(pointer())
    handlers.pointermove(pointer({ clientX: 106, clientY: 104 }))
    vi.advanceTimersByTime(LONG_PRESS_MS)
    expect(onLongPress).toHaveBeenCalledOnce()

    onLongPress.mockClear()
    handlers.pointerdown(pointer())
    handlers.pointermove(pointer({ clientY: 115 }))
    vi.advanceTimersByTime(LONG_PRESS_MS)
    expect(onLongPress).not.toHaveBeenCalled()
  })

  it('cancels when the browser takes the touch for a scroll', () => {
    const { onLongPress, handlers } = setup()
    handlers.pointerdown(pointer())
    handlers.pointercancel()
    vi.advanceTimersByTime(LONG_PRESS_MS)
    expect(onLongPress).not.toHaveBeenCalled()
  })

  it('ignores a right or middle mouse button press, and a second finger', () => {
    const { onLongPress, handlers } = setup()
    handlers.pointerdown(pointer({ pointerType: 'mouse', button: 2 }))
    handlers.pointerdown(pointer({ isPrimary: false }))
    vi.advanceTimersByTime(LONG_PRESS_MS)
    expect(onLongPress).not.toHaveBeenCalled()
  })

  it('swallows the click that ends a long press, and only that one', () => {
    const { handlers } = setup()
    handlers.pointerdown(pointer())
    vi.advanceTimersByTime(LONG_PRESS_MS)
    handlers.pointerup()
    const first = clickInPage()
    expect(first.clicked).not.toHaveBeenCalled()
    expect(first.event.defaultPrevented).toBe(true)
    expect(clickInPage().clicked).toHaveBeenCalledOnce()
  })

  it('does not swallow a later tap when the long press sent no click', () => {
    const { handlers } = setup()
    handlers.pointerdown(pointer())
    vi.advanceTimersByTime(LONG_PRESS_MS)
    handlers.pointerup()
    // The next press, say on the menu that just opened.
    window.dispatchEvent(new Event('pointerdown'))
    expect(clickInPage().clicked).toHaveBeenCalledOnce()

    handlers.pointerdown(pointer())
    vi.advanceTimersByTime(LONG_PRESS_MS)
    handlers.pointerup()
    vi.advanceTimersByTime(1000)
    expect(clickInPage().clicked).toHaveBeenCalledOnce()
  })

  it('leaves a plain tap alone', () => {
    const { handlers } = setup()
    handlers.pointerdown(pointer())
    handlers.pointerup()
    expect(clickInPage().clicked).toHaveBeenCalledOnce()
  })

  it('opens on a context menu instead of the native one, once per press', () => {
    const { onLongPress, handlers } = setup()
    const menu = new Event('contextmenu', { cancelable: true })
    handlers.contextmenu(menu)
    expect(menu.defaultPrevented).toBe(true)
    expect(onLongPress).toHaveBeenCalledOnce()

    // A touch browser's own long press, after the timer already fired.
    onLongPress.mockClear()
    handlers.pointerdown(pointer())
    vi.advanceTimersByTime(LONG_PRESS_MS)
    const late = new Event('contextmenu', { cancelable: true })
    handlers.contextmenu(late)
    expect(late.defaultPrevented).toBe(true)
    expect(onLongPress).toHaveBeenCalledOnce()
  })
})
