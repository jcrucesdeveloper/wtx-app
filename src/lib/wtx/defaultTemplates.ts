import pushDay from '../../../examples/templates/push-day.wtt?raw'
import pullDay from '../../../examples/templates/pull-day.wtt?raw'
import legDay from '../../../examples/templates/leg-day.wtt?raw'

/** Starter routines seeded into a first-time visitor's library. */
export const DEFAULT_TEMPLATES: { filename: string; rawText: string }[] = [
  { filename: 'leg-day.wtt', rawText: legDay },
  { filename: 'pull-day.wtt', rawText: pullDay },
  { filename: 'push-day.wtt', rawText: pushDay },
]
