import { useI18n } from 'vue-i18n'
import type { PlateLevel, PlateStep } from '@/lib/plateLevel'

/** The words for a plate level, shared by everywhere it is shown. */
export function usePlateLabels() {
  const { t } = useI18n()

  /** "20 kg plate", "3 × 25 kg plates", or "No plate yet". */
  function plateTitle(step: PlateStep | null): string {
    if (!step) return t('social.profile.level.none')
    if (step.count > 1) return t('social.profile.level.plates', { count: step.count })
    return t('social.profile.level.plate', { kg: step.kg })
  }

  /** What the next plate takes, e.g. "13 more for the 20 kg plate". */
  function nextLine(level: PlateLevel): string {
    const { current, next, remaining } = level
    if (!next) return t('social.profile.level.max')
    if (!current) return t('social.profile.level.first')
    return next.count > 1
      ? t('social.profile.level.nextStack', { count: remaining }, remaining)
      : t('social.profile.level.next', { count: remaining, kg: next.kg }, remaining)
  }

  return { plateTitle, nextLine }
}
