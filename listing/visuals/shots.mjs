// The store screenshot set, in order (the first two carry the most weight —
// listing/research/01-aso-strategy.md). Each screen is a real frame of the
// recorded app (see clips.mjs), taken in the same language as its headline.
//
// clip/at: which take and moment (marker[+offset]).
// focus:   which part of the full-height capture the device frame shows.

export const SHOTS = [
  {
    id: '01-log',
    clip: 'workout',
    at: 'bench-done+0.1',
    focus: 'top',
    eyebrow: { en: 'Track', es: 'Registra' },
    headline: { en: 'Log every set in <em>one tap</em>.', es: 'Registra cada serie con <em>un toque</em>.' },
    subhead: {
      en: "Last time's weight and reps are already filled in.",
      es: 'El peso y las repeticiones de la última vez ya vienen puestos.',
    },
  },
  {
    id: '02-records',
    clip: 'workout',
    at: 'recap+1.6',
    focus: 'top',
    eyebrow: { en: 'Progress', es: 'Progreso' },
    headline: { en: 'See what you <em>beat</em>.', es: 'Mira qué <em>superaste</em>.' },
    subhead: {
      en: 'Personal records, the comparison with last time and your streak, the moment you finish.',
      es: 'Récords personales, la comparación con la última vez y tu racha, apenas terminas.',
    },
  },
  {
    id: '03-streak',
    clip: 'history',
    at: 'prev-month+1.0',
    focus: 'top',
    eyebrow: { en: 'History', es: 'Historial' },
    headline: { en: "Don't break the <em>streak</em>.", es: 'No rompas la <em>racha</em>.' },
    subhead: {
      en: 'Every workout on a calendar, with your week streak.',
      es: 'Cada entrenamiento en un calendario, con tu racha semanal.',
    },
  },
  {
    id: '04-routines',
    clip: 'routine',
    at: 'detail+1.5',
    focus: 'top',
    eyebrow: { en: 'Plan', es: 'Planifica' },
    headline: { en: 'Your routines, <em>ready to go</em>.', es: 'Tus rutinas, <em>listas para entrenar</em>.' },
    subhead: {
      en: '870+ exercises with images. Start any routine in one tap.',
      es: 'Más de 870 ejercicios con imágenes. Empieza cualquier rutina con un toque.',
    },
  },
  {
    id: '05-text',
    clip: 'routine',
    at: 'source+1.5',
    focus: 'bottom',
    eyebrow: { en: 'Plain text', es: 'Texto simple' },
    headline: { en: 'Your workout is <em>just text</em>.', es: 'Tu rutina es <em>solo texto</em>.' },
    subhead: {
      en: 'Read it, edit it, paste it anywhere.',
      es: 'Léela, edítala y pégala donde quieras.',
    },
  },
  {
    id: '06-share',
    clip: 'routine',
    at: 'qr+2',
    focus: 'bottom',
    eyebrow: { en: 'Share', es: 'Comparte' },
    headline: { en: 'Share it with a <em>scan</em>.', es: 'Compártela con un <em>QR</em>.' },
    subhead: {
      en: 'Friends add your routine by scanning it. No account needed.',
      es: 'Tus amigos agregan tu rutina escaneándola. Sin crear cuenta.',
    },
  },
]

export const LANGS = ['en', 'es']
