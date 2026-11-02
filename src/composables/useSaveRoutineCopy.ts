import { useI18n } from 'vue-i18n'
import { useRoutinesStore, cleanSectionName, type StoredRoutine } from '@/stores/routines'
import { canCreateRoutine, routineCopyFromPost } from '@/lib/copyRoutine'
import type { FeedPost } from '@/stores/feed'

export type SaveRoutineCopyResult =
  | { status: 'saved'; routine: StoredRoutine; name: string; fromRoutine: boolean }
  | { status: 'limit' }
  | { status: 'failed' }

/**
 * "Save to my library" on a friend's post: adds a copy of the routine they
 * followed as a new routine this user owns, named "<name> (from @friend)",
 * filed under a section of the same name as theirs (reusing one this user
 * already has, else making it). It's an ordinary local routine from then on,
 * synced like any other.
 */
export function useSaveRoutineCopy() {
  const { t } = useI18n()
  const routines = useRoutinesStore()

  function sectionNamed(name: string) {
    const clean = cleanSectionName(name)
    if (!clean) return undefined
    const key = clean.toLocaleLowerCase()
    return (
      routines.sections.find((s) => s.name.toLocaleLowerCase() === key) ?? routines.addSection(clean)
    )
  }

  function saveCopy(post: FeedPost): SaveRoutineCopyResult {
    if (!canCreateRoutine(routines.routines.length)) return { status: 'limit' }
    try {
      const copy = routineCopyFromPost(post, t('social.copyRoutine.suffix', { friend: post.posterName }))
      const routine = routines.add(copy.rawText, copy.filename)
      const section = copy.sectionName ? sectionNamed(copy.sectionName) : undefined
      if (section) routines.moveToSection(routine.id, section.id)
      return { status: 'saved', routine, name: copy.name, fromRoutine: copy.fromRoutine }
    } catch {
      return { status: 'failed' }
    }
  }

  return { saveCopy }
}
