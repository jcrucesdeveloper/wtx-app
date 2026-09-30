/**
 * A deliberately short list of hate slurs and explicit sexual terms (English
 * and Spanish) kept out of what other people see: display names, bios, and
 * workouts shared to the feed. It's a floor, not a moderation system —
 * reporting and blocking cover the rest.
 *
 * Mirrors `public.contains_blocked_terms()` in
 * `supabase/migrations/20260930000000_moderation.sql`, which enforces the same
 * rule on profiles server-side. Keep the two lists and normalizations in sync.
 */
const BLOCKED_TERMS: ReadonlySet<string> = new Set([
  // English
  'nigger',
  'nigga',
  'faggot',
  'kike',
  'chink',
  'spic',
  'tranny',
  'retard',
  'cunt',
  'whore',
  'slut',
  'porn',
  'blowjob',
  'jizz',
  // Spanish
  'maricon',
  'marica',
  'sudaca',
  'travelo',
  'puta',
  'puto',
  'culiao',
  'culiado',
  'conchetumare',
  'conchatumadre',
  'porno',
])

const LEET: Record<string, string> = {
  '0': 'o',
  '1': 'i',
  '3': 'e',
  '4': 'a',
  '5': 's',
  '7': 't',
  '@': 'a',
  $: 's',
}

/**
 * Lowercases, folds accents, undoes common leetspeak, turns everything that
 * isn't a letter into a single space, and re-joins words spelled out letter
 * by letter ("p u t a"). Light on purpose: whole-word matching after this
 * avoids flagging innocent words that merely contain a term.
 */
export function normalizeForFilter(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[013457@$]/g, (c) => LEET[c] ?? c)
    .replace(/[^a-z]+/g, ' ')
    .replace(/\b([a-z]) (?=[a-z]\b)/g, '$1')
    .trim()
}

function isBlockedWord(word: string): boolean {
  if (BLOCKED_TERMS.has(word)) return true
  // Plurals: "putas", "maricones".
  if (word.endsWith('s') && BLOCKED_TERMS.has(word.slice(0, -1))) return true
  return word.endsWith('es') && BLOCKED_TERMS.has(word.slice(0, -2))
}

/** Whether any of the given texts contains a blocked term. */
export function containsBlockedTerms(...texts: (string | null | undefined)[]): boolean {
  return texts.some((text) => !!text && normalizeForFilter(text).split(' ').some(isBlockedWord))
}
