import { describe, it, expect, beforeEach, vi } from 'vitest'
import { defineComponent, h } from 'vue'
import { mount } from '@vue/test-utils'
import { createPinia, setActivePinia, type Pinia } from 'pinia'
import { i18n } from '@/i18n'
import { useRoutinesStore } from '@/stores/routines'
import { parseSessionText } from '@/lib/parseSession'
import type { FeedPost } from '@/stores/feed'
import { ROUTINE_MAX } from '@/lib/supabase/limits'
import { useSaveRoutineCopy } from '../useSaveRoutineCopy'

vi.mock('@/services/analytics', () => ({ track: vi.fn<(event: string) => void>() }))
vi.mock('@/lib/exercises/imageCache', () => ({ warmExerciseImages: vi.fn<() => Promise<void>>() }))

const WTT = '# Push Day\nunit: kg\n\nBench Press | reps 3x8 | 60 | rest 90s\n'

function post(section?: string): FeedPost {
  const parsed = parseSessionText('# Push Day - 2026-10-01\nunit: kg\n\nBench Press | 3x8 | 60\n1 | 60 | 8\n')
  if (!parsed.ok) throw new Error(parsed.error)
  return {
    sessionId: 's1',
    posterId: 'ana',
    posterName: 'Ana',
    createdAt: '2026-10-01T10:00:00Z',
    session: parsed.session,
    snapshot: {
      personalRecords: [],
      comparison: undefined,
      milestone: undefined,
      weekStreak: 1,
      elapsedSeconds: 60,
      routine: section ? { wtt: WTT, section } : { wtt: WTT },
    },
    kudosCount: 0,
    kudosByMe: false,
  }
}

function setup(pinia: Pinia) {
  let api!: ReturnType<typeof useSaveRoutineCopy>
  const Host = defineComponent({
    setup() {
      api = useSaveRoutineCopy()
      return () => h('div')
    },
  })
  mount(Host, { global: { plugins: [pinia, i18n] } })
  return api
}

describe('useSaveRoutineCopy', () => {
  let pinia: Pinia

  beforeEach(() => {
    localStorage.clear()
    i18n.global.locale.value = 'en'
    pinia = createPinia()
    setActivePinia(pinia)
  })

  it('adds a renamed copy with its rest times to the library', () => {
    const routines = useRoutinesStore()
    const before = routines.routines.length
    const result = setup(pinia).saveCopy(post())
    expect(result.status).toBe('saved')
    if (result.status !== 'saved') return
    expect(result.name).toBe('Push Day (from @Ana)')
    expect(routines.routines).toHaveLength(before + 1)
    expect(result.routine.filename).toBe('Push Day (from @Ana).wtt')
    expect(result.routine.rawText).toContain('rest 1m30s')
    expect(result.routine.sectionId).toBeUndefined()
  })

  it('uses the Spanish suffix in Spanish', () => {
    i18n.global.locale.value = 'es'
    const result = setup(pinia).saveCopy(post())
    expect(result.status === 'saved' && result.name).toBe('Push Day (de @Ana)')
    i18n.global.locale.value = 'en'
  })

  it("files it under the user's section of the same name, or makes one", () => {
    const routines = useRoutinesStore()
    const ppl = routines.addSection('PPL')
    const save = setup(pinia).saveCopy

    const first = save(post('ppl'))
    expect(first.status === 'saved' && first.routine.sectionId).toBe(ppl.id)

    const second = save(post('Deload'))
    const deload = routines.sections.find((s) => s.name === 'Deload')
    expect(deload).toBeDefined()
    expect(second.status === 'saved' && second.routine.sectionId).toBe(deload!.id)
    expect(routines.sections).toHaveLength(2)
  })

  it('refuses at the routine limit and leaves the library alone', () => {
    localStorage.setItem(
      'wtx:routines',
      JSON.stringify(
        Array.from({ length: ROUTINE_MAX }, (_, i) => ({
          id: `r${i}`,
          filename: `r${i}.wtt`,
          rawText: WTT.replace('Push Day', `R${i}`),
          addedAt: i,
        })),
      ),
    )
    const routines = useRoutinesStore()
    expect(routines.routines).toHaveLength(ROUTINE_MAX)
    expect(setup(pinia).saveCopy(post()).status).toBe('limit')
    expect(routines.routines).toHaveLength(ROUTINE_MAX)
  })
})
