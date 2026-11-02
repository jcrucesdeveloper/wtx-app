import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { nextTick } from 'vue'
import { mount, type VueWrapper } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { i18n } from '@/i18n'
import { useUiStore } from '@/stores/ui'
import { ROUTINE_MAX } from '@/lib/supabase/limits'
import CreateRoutineSheet from '../CreateRoutineSheet.vue'

vi.mock('vue-router', () => ({ useRouter: () => ({ push: vi.fn<(to: unknown) => void>() }) }))
vi.mock('@/lib/exercises/imageCache', () => ({ warmExerciseImages: () => Promise.resolve() }))

const TEXT = (name: string) => `# ${name}\nunit: kg\n\nSquat | reps 3x5 | 100\n`

function submitButton(): HTMLButtonElement {
  const found = [...document.body.querySelectorAll('button')].find((b) => b.textContent?.includes('Create routine'))
  if (!found) throw new Error('no submit button')
  return found
}

describe('CreateRoutineSheet', () => {
  let wrapper: VueWrapper | undefined

  beforeEach(() => {
    localStorage.clear()
    i18n.global.locale.value = 'en'
  })

  afterEach(() => {
    wrapper?.unmount()
    document.body.innerHTML = ''
  })

  async function open(librarySize: number) {
    localStorage.setItem(
      'wtx:routines',
      JSON.stringify(
        Array.from({ length: librarySize }, (_, i) => ({
          id: `r${i}`,
          filename: `r${i}.wtt`,
          rawText: TEXT(`R${i}`),
          addedAt: i,
        })),
      ),
    )
    const pinia = createPinia()
    setActivePinia(pinia)
    wrapper = mount(CreateRoutineSheet, { attachTo: document.body, global: { plugins: [pinia, i18n] } })
    useUiStore().open('create')
    await nextTick()
    await nextTick()
  }

  it('says the library is full and blocks creating at the cap', async () => {
    await open(ROUTINE_MAX)
    expect(document.body.textContent).toContain(`Your library is full (${ROUTINE_MAX} routines)`)
    expect(submitButton().disabled).toBe(true)
  })

  it('says nothing about the cap below it', async () => {
    await open(3)
    expect(document.body.textContent).not.toContain('Your library is full')
  })
})
