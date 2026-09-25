import { useI18n } from 'vue-i18n'
import { findCatalogEntryByName } from '@/lib/exercises/exerciseCatalog'

/**
 * Resolves an exercise's stored (canonical English) name to a display name in
 * the current locale. Storage/matching always uses the English name — this is
 * a display-only lookup, reactive to locale switches.
 */
export function useExerciseName() {
  const { locale } = useI18n()

  function exerciseName(name: string): string {
    if (locale.value !== 'es') return name
    return findCatalogEntryByName(name)?.nameEs ?? name
  }

  return { exerciseName }
}
