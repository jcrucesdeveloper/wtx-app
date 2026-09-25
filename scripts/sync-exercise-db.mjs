// Re-syncs src/lib/exercises/exerciseCatalog.json from the upstream
// free-exercise-db dataset.
//
// Usage: node scripts/sync-exercise-db.mjs [ref]
//   ref defaults to the REF constant below (a pinned commit).
//
// After running, review the diff and update the "Upstream commit" line in
// src/lib/exercises/README.md.

import { writeFile } from 'node:fs/promises'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const REF = process.argv[2] ?? 'a859101d633a01c4a1a920d6a8ce41dabba0705f'
const REPO = 'yuhonas/free-exercise-db'
const SRC_PATH = 'dist/exercises.json'

// Upstream's `primaryMuscles` is 17 values deep — too granular to search or
// tag by. Collapse it to the general groups people actually search for.
const MUSCLE_GROUP_BY_MUSCLE = {
  chest: 'Chest',
  lats: 'Back',
  'middle back': 'Back',
  'lower back': 'Back',
  traps: 'Back',
  shoulders: 'Shoulders',
  biceps: 'Arms',
  triceps: 'Arms',
  forearms: 'Arms',
  abdominals: 'Abs',
  quadriceps: 'Legs',
  hamstrings: 'Legs',
  calves: 'Legs',
  glutes: 'Legs',
  adductors: 'Legs',
  abductors: 'Legs',
  neck: 'Neck',
}

function muscleGroupFor(primaryMuscles) {
  const muscle = primaryMuscles[0]
  const group = MUSCLE_GROUP_BY_MUSCLE[muscle]
  if (!group) throw new Error(`No muscle group mapped for upstream muscle "${muscle}"`)
  return group
}

// A handful of upstream names carry a competition-discipline suffix (e.g.
// "Bench Press - Powerlifting"). We tag by muscle group, not sport — strip it.
const DISCIPLINE_SUFFIX = /\s*-\s*(Powerlifting|Strongman|Olympic Weightlifting|Weightlifting|CrossFit)$/i

function cleanName(name) {
  return name.replace(DISCIPLINE_SUFFIX, '').trim()
}

// Friendlier names for entries whose upstream name is either inconsistently
// equipment-tagged (prefix vs. suffix vs. untagged) or overly
// clinical/specific for a personal workout tracker. Keyed by upstream `id`
// (stable across renames — see README.md) so this survives re-syncs even
// though `exerciseCatalog.json` itself is regenerated from scratch.
//
// Convention: `Base Movement (Equipment)`, equipment as a parenthetical
// suffix rather than a prefix, so variants of the same movement sort/cluster
// together. The bare name (no parenthetical) is reserved for the default/most
// common implementation of a movement (e.g. barbell for Bench Press, Squat,
// Deadlift). Non-equipment qualifiers (grip, position) are folded into the
// same parenthetical when they're the meaningful differentiator, dropped when
// they aren't (e.g. a lone "Standing" with no "Seated" counterpart).
const NAME_OVERRIDES = {
  // --- Equipment-family consolidation ---
  'Band_Good_Morning': 'Good Morning (Band)',
  'Barbell_Deadlift': 'Deadlift',
  'Leverage_Deadlift': 'Deadlift (Machine)',
  'Barbell_Hack_Squat': 'Hack Squat (Barbell)',
  'Barbell_Incline_Shoulder_Raise': 'Incline Shoulder Raise (Barbell)',
  'Dumbbell_Incline_Shoulder_Raise': 'Incline Shoulder Raise (Dumbbell)',
  'Barbell_Seated_Calf_Raise': 'Seated Calf Raise (Barbell)',
  'Barbell_Shoulder_Press': 'Shoulder Press (Barbell)',
  'Cable_Shoulder_Press': 'Shoulder Press (Cable)',
  'Dumbbell_Shoulder_Press': 'Shoulder Press (Dumbbell)',
  'Leverage_Shoulder_Press': 'Shoulder Press (Machine)',
  'Barbell_Shrug': 'Shrug (Barbell)',
  'Dumbbell_Shrug': 'Shrug (Dumbbell)',
  'Leverage_Shrug': 'Shrug (Machine)',
  'Barbell_Side_Bend': 'Side Bend (Barbell)',
  'Dumbbell_Side_Bend': 'Side Bend (Dumbbell)',
  'Barbell_Squat': 'Squat',
  'Bodyweight_Squat': 'Squat (Bodyweight)',
  'Dumbbell_Squat': 'Squat (Dumbbell)',
  'Smith_Machine_Squat': 'Squat (Smith Machine)',
  'Barbell_Squat_To_A_Bench': 'Squat To A Bench (Barbell)',
  'Dumbbell_Squat_To_A_Bench': 'Squat To A Bench (Dumbbell)',
  'Barbell_Step_Ups': 'Step Ups (Barbell)',
  'Dumbbell_Step_Ups': 'Step Ups (Dumbbell)',
  'Barbell_Walking_Lunge': 'Walking Lunge (Barbell)',
  'Bodyweight_Walking_Lunge': 'Walking Lunge (Bodyweight)',
  'Dumbbell_Bench_Press': 'Bench Press (Dumbbell)',
  'Machine_Bench_Press': 'Bench Press (Machine)',
  'Smith_Machine_Bench_Press': 'Bench Press (Smith Machine)',
  'Bodyweight_Flyes': 'Flyes (Bodyweight)',
  'Dumbbell_Flyes': 'Flyes (Dumbbell)',
  'Cable_Chest_Press': 'Chest Press (Cable)',
  'Leverage_Chest_Press': 'Chest Press (Machine)',
  'Cable_Iron_Cross': 'Iron Cross (Cable)',
  'Cable_Preacher_Curl': 'Preacher Curl (Cable)',
  'Cable_Reverse_Crunch': 'Reverse Crunch (Cable)',
  'Dumbbell_Clean': 'Clean (Dumbbell)',
  'Dumbbell_Bicep_Curl': 'Bicep Curl (Dumbbell)',
  'Machine_Bicep_Curl': 'Bicep Curl (Machine)',
  'Dumbbell_Floor_Press': 'Floor Press (Dumbbell)',
  'Dumbbell_One-Arm_Upright_Row': 'One-Arm Upright Row (Dumbbell)',
  'Smith_Machine_One-Arm_Upright_Row': 'One-Arm Upright Row (Smith Machine)',
  'Kettlebell_Hang_Clean': 'Hang Clean (Kettlebell)',
  'Kettlebell_Overhead_Triceps_Extension': 'Overhead Triceps Extension (Kettlebell)',
  'Sled_Overhead_Triceps_Extension': 'Overhead Triceps Extension (Sled)',
  'Kettlebell_Pistol_Squat': 'Pistol Squat (Kettlebell)',
  'Smith_Machine_Pistol_Squat': 'Pistol Squat (Smith Machine)',
  'Smith_Machine_Leg_Press': 'Leg Press (Smith Machine)',

  // --- Verbose / overly clinical names simplified ---
  'Back_Flyes_-_With_Bands': 'Back Flyes (Band)',
  'Barbell_Ab_Rollout_-_On_Knees': 'Ab Rollout (Barbell)',
  'Barbell_Bench_Press_-_Medium_Grip': 'Bench Press (Medium Grip)',
  'Barbell_Incline_Bench_Press_-_Medium_Grip': 'Incline Bench Press',
  'Bench_Press_-_With_Bands': 'Bench Press (Band)',
  'Bent_Over_Dumbbell_Rear_Delt_Raise_With_Head_On_Bench': 'Rear Delt Raise (Chest-Supported)',
  'Bent_Over_Two-Dumbbell_Row_With_Palms_In': 'Bent-Over Row (Neutral Grip)',
  'Bottoms-Up_Clean_From_The_Hang_Position': 'Bottoms-Up Hang Clean (Kettlebell)',
  'Cable_Hammer_Curls_-_Rope_Attachment': 'Hammer Curl (Cable)',
  'Calf_Raises_-_With_Bands': 'Calf Raise (Band)',
  'Cross_Over_-_With_Bands': 'Cross Over (Band)',
  'Crunch_-_Hands_Overhead': 'Crunch (Hands Overhead)',
  'Crunch_-_Legs_On_Exercise_Ball': 'Crunch (Legs On Ball)',
  'Decline_Close-Grip_Bench_To_Skull_Crusher': 'Decline Skull Crusher (Close-Grip)',
  'Dips_-_Chest_Version': 'Dip (Chest)',
  'Dips_-_Triceps_Version': 'Dip (Triceps)',
  'Double_Kettlebell_Alternating_Hang_Clean': 'Double Kettlebell Hang Clean',
  'Dumbbell_Lying_One-Arm_Rear_Lateral_Raise': 'One-Arm Lying Rear Delt Raise',
  'Dumbbell_Tricep_Extension_-Pronated_Grip': 'Triceps Extension (Dumbbell, Pronated)',
  'Extended_Range_One-Arm_Kettlebell_Floor_Press': 'One-Arm Kettlebell Floor Press (Extended Range)',
  'Hang_Clean_-_Below_the_Knees': 'Hang Clean (Below Knees)',
  'Hang_Snatch_-_Below_Knees': 'Hang Snatch (Below Knees)',
  'Hyperextensions_With_No_Hyperextension_Bench': 'Hyperextension (No Bench)',
  'Incline_Dumbbell_Bench_With_Palms_Facing_In': 'Incline Dumbbell Press (Neutral Grip)',
  'Incline_Dumbbell_Flyes_-_With_A_Twist': 'Incline Dumbbell Flye (With Twist)',
  'Intermediate_Hip_Flexor_and_Quad_Stretch': 'Hip Flexor & Quad Stretch',
  'Isometric_Neck_Exercise_-_Front_And_Back': 'Neck Isometric Hold (Front & Back)',
  'Isometric_Neck_Exercise_-_Sides': 'Neck Isometric Hold (Side)',
  'Kettlebell_Halo_With_Overhead_Extension': 'Kettlebell Halo (Overhead Extension)',
  'Kettlebell_Turkish_Get-Up_Lunge_style': 'Kettlebell Turkish Get-Up (Lunge Style)',
  'Kettlebell_Turkish_Get-Up_Squat_style': 'Kettlebell Turkish Get-Up (Squat Style)',
  'Kneeling_Cable_Crunch_With_Alternating_Oblique_Twists': 'Kneeling Cable Crunch (Oblique Twist)',
  'Lateral_Raise_-_With_Bands': 'Lateral Raise (Band)',
  'Lying_Close-Grip_Bar_Curl_On_High_Pulley': 'Lying Close-Grip Curl (Cable)',
  'Lying_Close-Grip_Barbell_Triceps_Extension_Behind_The_Head': 'Skull Crusher (Behind Head)',
  'Lying_Close-Grip_Barbell_Triceps_Press_To_Chin': 'Skull Crusher (To Chin)',
  'Oblique_Crunches_-_On_The_Floor': 'Oblique Crunches (Floor)',
  'One_Arm_Pronated_Dumbbell_Triceps_Extension': 'One-Arm Triceps Extension (Dumbbell, Pronated)',
  'One_Arm_Supinated_Dumbbell_Triceps_Extension': 'One-Arm Triceps Extension (Dumbbell, Supinated)',
  'One-Arm_Kettlebell_Military_Press_To_The_Side': 'One-Arm Kettlebell Side Press',
  'Palms-Down_Dumbbell_Wrist_Curl_Over_A_Bench': 'Wrist Curl (Dumbbell, Palms-Down)',
  'Palms-Up_Barbell_Wrist_Curl_Over_A_Bench': 'Wrist Curl (Barbell, Palms-Up)',
  'Palms-Up_Dumbbell_Wrist_Curl_Over_A_Bench': 'Wrist Curl (Dumbbell, Palms-Up)',
  'Push_Press_-_Behind_the_Neck': 'Push Press (Behind Neck)',
  'Push-Ups_-_Close_Triceps_Position': 'Push-Up (Close-Grip)',
  'Pushups_Close_and_Wide_Hand_Positions': 'Push-Up (Close & Wide Grip)',
  'Seated_Bent-Over_One-Arm_Dumbbell_Triceps_Extension': 'Seated One-Arm Bent-Over Triceps Extension',
  'Seated_Bent-Over_Two-Arm_Dumbbell_Triceps_Extension': 'Seated Two-Arm Bent-Over Triceps Extension',
  'Seated_Close-Grip_Concentration_Barbell_Curl': 'Concentration Curl (Barbell, Close-Grip)',
  'Seated_One-Arm_Dumbbell_Palms-Down_Wrist_Curl': 'One-Arm Wrist Curl (Dumbbell, Palms-Down)',
  'Seated_One-Arm_Dumbbell_Palms-Up_Wrist_Curl': 'One-Arm Wrist Curl (Dumbbell, Palms-Up)',
  'Seated_Two-Arm_Palms-Up_Low-Pulley_Wrist_Curl': 'Two-Arm Wrist Curl (Cable, Palms-Up)',
  'Shoulder_Press_-_With_Bands': 'Shoulder Press (Band)',
  'Sled_Drag_-_Harness': 'Sled Drag (Harness)',
  'Squats_-_With_Bands': 'Squat (Band)',
  'Standing_Bent-Over_One-Arm_Dumbbell_Triceps_Extension': 'Standing One-Arm Bent-Over Triceps Extension',
  'Standing_Bent-Over_Two-Arm_Dumbbell_Triceps_Extension': 'Standing Two-Arm Bent-Over Triceps Extension',
  'Standing_Dumbbell_Straight-Arm_Front_Delt_Raise_Above_Head': 'Front Delt Raise (Straight-Arm, Overhead)',
  'Standing_Low-Pulley_One-Arm_Triceps_Extension': 'One-Arm Triceps Extension (Low Cable)',
  'Standing_One-Arm_Dumbbell_Curl_Over_Incline_Bench': 'Standing One-Arm Curl (Incline Bench)',
  'Standing_One-Arm_Dumbbell_Triceps_Extension': 'One-Arm Triceps Extension (Dumbbell)',
  'Standing_Overhead_Barbell_Triceps_Extension': 'Overhead Triceps Extension (Barbell)',
  'Standing_Palm-In_One-Arm_Dumbbell_Press': 'One-Arm Dumbbell Press (Neutral Grip)',
  'Standing_Palms-Up_Barbell_Behind_The_Back_Wrist_Curl': 'Wrist Curl (Barbell, Behind Back)',
  'Triceps_Pushdown_-_Rope_Attachment': 'Triceps Pushdown (Rope)',
  'Triceps_Pushdown_-_V-Bar_Attachment': 'Triceps Pushdown (V-Bar)',
  'Upright_Row_-_With_Bands': 'Upright Row (Band)',
  'Weighted_Sit-Ups_-_With_Bands': 'Weighted Sit-Up (Band)',
}

function friendlyName(id, name) {
  return NAME_OVERRIDES[id] ?? name
}

// --- Spanish name generation -----------------------------------------------
//
// `nameEs` is a display-only Spanish name generated for every entry (see
// src/lib/exercises/README.md). It never affects `id` or `name` — those stay
// the stable, English identity used for storage/matching throughout the app.
//
// Three layers, checked in order:
//  1. `BASE_PHRASE_ES` — hand-picked, natural Spanish for ~250 common/
//     important base phrases (equipment tag stripped), so the exercises
//     people actually search/log most read naturally. Keyed by the final
//     (post-cleanup) English base phrase, so one entry automatically covers
//     every equipment variant of that movement (e.g. "Bench Press" covers
//     "Bench Press (Dumbbell)", "Bench Press (Machine)", etc.).
//  2. `NAME_OVERRIDES_ES` — whole-name Spanish for idiomatic/nickname
//     exercises that don't decompose sensibly word-by-word.
//  3. A compositional fallback: translates a trailing "(Equipment)" tag via
//     `EQUIPMENT_ES`, then the base phrase via greedy multi-word phrase
//     matching (`PHRASES_ES` and any dictionary) falling back to word-by-word
//     substitution, with a Spanish noun-first reorder when the phrase ends in
//     a recognized movement noun (the common English "[modifiers] [movement]"
//     shape). An unrecognized word passes through unchanged rather than
//     breaking the whole name.

const EQUIPMENT_ES = {
  barbell: 'Barra',
  dumbbell: 'Mancuerna',
  cable: 'Polea',
  machine: 'Máquina',
  'smith machine': 'Máquina Smith',
  kettlebell: 'Kettlebell',
  band: 'Banda',
  bodyweight: 'Peso Corporal',
  sled: 'Trineo',
  'medium grip': 'Agarre Medio',
  'close-grip': 'Agarre Cerrado',
  'close & wide grip': 'Agarre Cerrado y Abierto',
  'wide-grip': 'Agarre Abierto',
  'wide grip': 'Agarre Abierto',
  'neutral grip': 'Agarre Neutro',
  'clean grip': 'Agarre de Cargada',
  pronated: 'Prono',
  supinated: 'Supino',
  'palms-up': 'Palmas Arriba',
  'palms-down': 'Palmas Abajo',
  'behind back': 'Detrás de la Espalda',
  'behind head': 'Detrás de la Cabeza',
  'behind neck': 'Detrás de la Nuca',
  'below knees': 'Debajo de las Rodillas',
  'to chin': 'Hasta la Barbilla',
  'chest-supported': 'Con Pecho Apoyado',
  'extended range': 'Rango Extendido',
  floor: 'En el Suelo',
  'front & back': 'Frontal y Trasero',
  'hands overhead': 'Manos Sobre la Cabeza',
  harness: 'Arnés',
  'incline bench': 'Banco Inclinado',
  'legs on ball': 'Piernas Sobre el Balón',
  'low cable': 'Polea Baja',
  'lunge style': 'Estilo Zancada',
  'squat style': 'Estilo Sentadilla',
  military: 'Militar',
  'multiple response': 'Respuesta Múltiple',
  'single response': 'Respuesta Simple',
  'no bench': 'Sin Banco',
  'oblique twist': 'Giro Oblicuo',
  'overhead extension': 'Extensión Overhead',
  rope: 'Cuerda',
  side: 'Lateral',
  'straight-arm, overhead': 'Brazo Recto, Overhead',
  triceps: 'Tríceps',
  chest: 'Pecho',
  'v-bar': 'Barra V',
  'with twist': 'Con Giro',
  'pull through': 'Paso a Través',
  'back extensions': 'Extensiones de Espalda',
  bridge: 'Puente',
  prone: 'Boca Abajo',
  stretch: 'Estiramiento',
  'or hurdle hops': 'o Saltos de Valla',
}

function translateEquipmentTag(tag) {
  const key = tag.toLowerCase()
  if (EQUIPMENT_ES[key]) return EQUIPMENT_ES[key]
  if (tag.includes(',')) {
    return tag
      .split(',')
      .map((part) => translateEquipmentTag(part.trim()))
      .join(', ')
  }
  return tag
}

const MOVEMENT_ES = {
  press: 'Press',
  curl: 'Curl',
  squat: 'Sentadilla',
  squats: 'Sentadillas',
  deadlift: 'Peso Muerto',
  deadlifts: 'Pesos Muertos',
  row: 'Remo',
  rows: 'Remos',
  raise: 'Elevación',
  raises: 'Elevaciones',
  extension: 'Extensión',
  crunch: 'Abdominal',
  crunches: 'Abdominales',
  lunge: 'Zancada',
  lunges: 'Zancadas',
  shrug: 'Encogimiento de Hombros',
  dip: 'Fondo',
  dips: 'Fondos',
  fly: 'Apertura',
  flye: 'Apertura',
  flyes: 'Aperturas',
  clean: 'Cargada',
  snatch: 'Arrancada',
  jerk: 'Envión',
  swing: 'Balanceo',
  swings: 'Balanceos',
  stretch: 'Estiramiento',
  twist: 'Giro',
  hold: 'Sostén',
  walk: 'Caminata',
  drag: 'Arrastre',
  sprint: 'Sprint',
  jump: 'Salto',
  throw: 'Lanzamiento',
  halo: 'Halo',
  windmill: 'Molinillo',
  rollout: 'Rollout',
  chop: 'Golpe',
  rotation: 'Rotación',
  circle: 'Círculo',
  circles: 'Círculos',
  march: 'Marcha',
  bridge: 'Puente',
  kickback: 'Patada de Tríceps',
  pushdown: 'Extensión en Polea',
  pulldown: 'Jalón',
  pullover: 'Pullover',
  'skull crusher': 'Press Francés',
  skullcrusher: 'Press Francés',
  hyperextension: 'Hiperextensión',
  hyperextensions: 'Hiperextensiones',
  'sit-up': 'Abdominal',
  'sit-ups': 'Abdominales',
  situp: 'Abdominal',
  situps: 'Abdominales',
  'push-up': 'Flexión',
  'push-ups': 'Flexiones',
  pushup: 'Flexión',
  pushups: 'Flexiones',
  'pull-up': 'Dominada',
  'pull-ups': 'Dominadas',
  pullup: 'Dominada',
  pullups: 'Dominadas',
  'chin-up': 'Dominada Supina',
  plank: 'Plancha',
  superman: 'Superman',
  carry: 'Acarreo',
  pull: 'Tirón',
  push: 'Empuje',
  thrust: 'Empuje de Cadera',
  scoop: 'Barrido',
  slam: 'Golpe al Suelo',
  climb: 'Escalada',
  thruster: 'Thruster',
  bound: 'Salto Bound',
  skip: 'Salto de Cuerda',
  skipping: 'Salto de Cuerda',
  step: 'Paso',
  'step-up': 'Step-Up',
  'step ups': 'Elevaciones de Banco',
  drivers: 'Piernas Alternadas',
  glide: 'Deslizamiento',
  vacuum: 'Vacío Abdominal',
  wiper: 'Limpiaparabrisas',
  wipers: 'Limpiaparabrisas',
  crawl: 'Gateo',
  hop: 'Salto',
  hops: 'Saltos',
  jogging: 'Trote',
  running: 'Carrera',
  walking: 'Caminata',
  bicycling: 'Ciclismo',
  rowing: 'Remo (Cardio)',
  skating: 'Patinaje',
  jackknife: 'Navaja',
  bench: 'Banco',
  box: 'Cajón',
  curls: 'Curls',
  split: 'Dividido',
  hang: 'Colgante',
  bar: 'Barra',
  plate: 'Disco',
  preacher: 'Predicador',
  hammer: 'Martillo',
  balance: 'Equilibrio',
  lift: 'Levantamiento',
  flat: 'Plano',
  chair: 'Silla',
  blocks: 'Bloques',
  'ez-bar': 'Barra EZ',
  ez: 'EZ',
  'pull-in': 'Recogida',
  pulley: 'Polea',
  'single-arm': 'a Un Brazo',
  leverage: 'Máquina',
  head: 'Cabeza',
  butt: 'Glúteo',
  concentration: 'Concentración',
  depth: 'Profundidad',
  kick: 'Patada',
  kicks: 'Patadas',
  exercise: 'Ejercicio',
  face: 'Cara',
  flexor: 'Flexor',
  flexors: 'Flexores',
  hack: 'Hack',
  iron: 'Hierro',
  treadmill: 'Cinta de Correr',
  pass: 'Pase',
  muscle: 'Músculo',
  drill: 'Drill',
  resistance: 'Resistencia',
  rack: 'Rack',
  'straight-arm': 'Brazo Recto',
  bend: 'Flexión Lateral',
  bends: 'Flexiones Laterales',
  speed: 'Velocidad',
  ups: '',
  roller: 'Rodillo',
  bike: 'Bicicleta',
  touchers: 'Toques',
  board: 'Tabla',
  'low-pulley': 'Polea Baja',
  'two-dumbbell': 'con Dos Mancuernas',
  'bent-arm': 'Brazo Flexionado',
  stationary: 'Estático',
  mid: 'Medio',
  presses: 'Press',
  internal: 'Interna',
  external: 'Externa',
  flip: 'Volteo',
  russian: 'Ruso',
  car: 'Auto',
  quick: 'Rápido',
  chain: 'Cadena',
  chains: 'Cadenas',
  handle: 'Mango',
  chin: 'Barbilla',
  dead: 'Muerto',
  deficit: 'Déficit',
  leap: 'Salto Largo',
  cone: 'Cono',
  chins: 'Dominadas',
  ham: 'Isquiotibial',
  hug: 'Abrazo',
  inner: 'Interno',
  inverted: 'Invertido',
  load: 'Carga',
  turkish: 'Turco',
  'get-up': 'Levantamiento',
  tuck: 'Encogido',
  parallel: 'Paralelas',
  landmine: 'Landmine',
  jammer: 'Landmine',
  through: 'a Través',
  't-bar': 'Barra T',
  middle: 'Medio',
  olympic: 'Olímpico',
  laterals: 'Laterales',
  pallof: 'Pallof',
  pelvic: 'Pélvico',
  tilt: 'Inclinación',
  pistol: 'Pistola',
  feet: 'Pies',
  foot: 'Pie',
  rickshaw: 'Rickshaw',
  romanian: 'Rumano',
  stride: 'Zancada',
  thigh: 'Muslo',
  zottman: 'Zottman',
  bands: 'Bandas',
  grip: 'Agarre',
  long: 'Largo',
  up: 'Arriba',
  arm: 'Brazo',
  arms: 'Brazos',
  upright: 'Vertical',
  body: 'Cuerpo',
  lower: 'Inferior',
  upper: 'Superior',
  stance: 'Postura',
  ball: 'Balón',
  stiff: 'Rígido',
  guillotine: 'Guillotina',
  windmills: 'Molinillos',
  cardio: 'Cardio',
  jerks: 'Envión',
}

const MODIFIER_ES = {
  standing: 'de Pie',
  seated: 'Sentado',
  lying: 'Acostado',
  incline: 'Inclinado',
  inclined: 'Inclinado',
  decline: 'Declinado',
  declined: 'Declinado',
  'one-arm': 'a Una Mano',
  'one arm': 'a Una Mano',
  'two-arm': 'a Dos Manos',
  'two arm': 'a Dos Manos',
  'one-legged': 'a Una Pierna',
  'single-leg': 'a Una Pierna',
  'single leg': 'a Una Pierna',
  reverse: 'Inverso',
  alternating: 'Alterno',
  alternate: 'Alterno',
  wide: 'Abierto',
  'wide-grip': 'Agarre Abierto',
  close: 'Cerrado',
  behind: 'Detrás de',
  overhead: 'Overhead',
  front: 'Frontal',
  rear: 'Trasero',
  side: 'Lateral',
  bent: 'Inclinado',
  'bent-over': 'Inclinado',
  kneeling: 'Arrodillado',
  single: 'Simple',
  double: 'Doble',
  straight: 'Recto',
  high: 'Alto',
  low: 'Bajo',
  weighted: 'Con Peso',
  narrow: 'Estrecho',
  elevated: 'Elevado',
  suspended: 'Suspendido',
  supine: 'Supino',
  prone: 'Boca Abajo',
  wall: 'En la Pared',
  smith: 'Smith',
  power: 'de Fuerza',
  full: 'Completo',
  partial: 'Parcial',
  assisted: 'Asistido',
  banded: 'con Banda',
  plyo: 'Pliométrico',
  medicine: 'Medicinal',
  cross: 'Cruzado',
  'cross-body': 'Cruzado',
  crossover: 'Cruzado',
  neutral: 'Neutro',
  palm: 'Palma',
  'palm-in': 'Palmas Adentro',
  'palm-up': 'Palmas Arriba',
  'palms-in': 'Palmas Adentro',
  'palms-up': 'Palmas Arriba',
  'palms-down': 'Palmas Abajo',
  vertical: 'Vertical',
  horizontal: 'Horizontal',
  static: 'Estático',
  isometric: 'Isométrico',
  dynamic: 'Dinámico',
  advanced: 'Avanzado',
  intermediate: 'Intermedio',
  natural: 'Natural',
  open: 'Abierto',
  mixed: 'Mixto',
  stiff: 'Rígido',
  'stiff-legged': 'Piernas Rígidas',
  sumo: 'Sumo',
  bottoms: 'Fondo',
  'bottoms-up': 'Fondo Arriba',
  hanging: 'Colgado',
  world: 'del Mundo',
  worlds: 'del Mundo',
  around: 'Alrededor',
  linear: 'Lineal',
  lateral: 'Lateral',
  diagonal: 'Diagonal',
  scissor: 'Tijera',
  spider: 'Araña',
  frog: 'Rana',
  bear: 'Oso',
  monster: 'Monstruo',
  cocoon: 'Capullo',
  cocoons: 'Capullos',
  forward: 'Hacia Adelante',
  backward: 'Hacia Atrás',
}

const BODYPART_ES = {
  chest: 'Pecho',
  shoulder: 'Hombro',
  shoulders: 'Hombros',
  deltoid: 'Deltoides',
  delt: 'Deltoides',
  triceps: 'Tríceps',
  tricep: 'Tríceps',
  biceps: 'Bíceps',
  bicep: 'Bíceps',
  forearm: 'Antebrazo',
  leg: 'Pierna',
  legs: 'Piernas',
  calf: 'Pantorrilla',
  calves: 'Pantorrillas',
  hip: 'Cadera',
  hips: 'Caderas',
  back: 'Espalda',
  lat: 'Dorsal',
  lats: 'Dorsales',
  neck: 'Cuello',
  wrist: 'Muñeca',
  ankle: 'Tobillo',
  knee: 'Rodilla',
  knees: 'Rodillas',
  glute: 'Glúteo',
  glutes: 'Glúteos',
  hamstring: 'Isquiotibial',
  hamstrings: 'Isquiotibiales',
  quad: 'Cuádriceps',
  quadriceps: 'Cuádriceps',
  groin: 'Ingle',
  adductor: 'Aductor',
  abductor: 'Abductor',
  oblique: 'Oblicuo',
  obliques: 'Oblicuos',
  abs: 'Abdominales',
  ab: 'Abdominal',
  stomach: 'Estómago',
  torso: 'Torso',
  spine: 'Columna',
  spinal: 'Espinal',
  elbow: 'Codo',
  elbows: 'Codos',
  finger: 'Dedo',
  fingers: 'Dedos',
  toe: 'Dedo del Pie',
  toes: 'Dedos del Pie',
  gastrocnemius: 'Gastrocnemio',
  soleus: 'Sóleo',
  achilles: 'Aquiles',
  sternum: 'Esternón',
  scapular: 'Escapular',
  rhomboid: 'Romboides',
  rhomboids: 'Romboides',
  brachialis: 'Braquial',
  tibialis: 'Tibial',
  peroneal: 'Peroneo',
  peroneals: 'Peroneos',
  iliotibial: 'Iliotibial',
  piriformis: 'Piriforme',
}

const CONNECTOR_ES = {
  with: 'con',
  and: 'y',
  to: 'a',
  from: 'de',
  on: 'en',
  the: '',
  over: 'sobre',
  a: 'un',
  an: 'un',
  of: 'de',
  in: 'en',
  at: 'en',
  or: 'o',
  against: 'contra',
  into: 'hacia',
  off: 'de',
  for: 'para',
  by: 'por',
  its: 'su',
}

const PHRASES_ES = {
  'good morning': 'Buenos Días',
  'good mornings': 'Buenos Días',
  'skull crusher': 'Press Francés',
  'skull crushers': 'Press Francés',
  'iron cross': 'Cruz de Hierro',
  'iron crosses': 'Cruces de Hierro',
  'muscle up': 'Muscle Up',
  'muscle snatch': 'Arrancada de Fuerza',
  'get-up': 'Levantamiento',
  'turkish get-up': 'Levantamiento Turco',
  'push up': 'Flexión',
  'push ups': 'Flexiones',
  'pull up': 'Dominada',
  'pull ups': 'Dominadas',
  'chin up': 'Dominada Supina',
  'sit up': 'Abdominal',
  'sit ups': 'Abdominales',
  "farmer's walk": 'Paseo del Granjero',
  'upright row': 'Remo Vertical',
  'face pull': 'Jalón a la Cara',
  'wrist roller': 'Rodillo de Muñeca',
  'bottoms up': 'Fondo Arriba',
  'step ups': 'Elevaciones de Banco',
  'step up': 'Elevación de Banco',
  'latissimus dorsi': 'Dorsal Ancho',
  'mountain climbers': 'Escaladores',
  'mountain climber': 'Escalador',
}

// Whole-name overrides for idiomatic/nickname exercises that don't
// decompose sensibly word-by-word.
const NAME_OVERRIDES_ES = {
  'Adductor/Groin': 'Aductor/Ingle',
  'Atlas Stone Trainer': 'Entrenador de Piedra Atlas',
  'Atlas Stones': 'Piedras Atlas',
  'Battling Ropes': 'Cuerdas de Batalla',
  'Body-Up': 'Elevación Corporal',
  'Butt-Ups': 'Elevaciones de Glúteo',
  Butterfly: 'Mariposa',
  "Child's Pose": 'Postura del Niño',
  'Circus Bell': 'Campana de Circo',
  "Conan's Wheel": 'Rueda de Conan',
  Crucifix: 'Crucifijo',
  'Elliptical Trainer': 'Elíptica',
  'Gorilla Chin/Crunch': 'Dominada/Abdominal Gorila',
  Groiners: 'Estiramiento Dinámico de Ingle',
  Inchworm: 'Oruga',
  'London Bridges': 'Puentes de Londres',
  'Moving Claw Series': 'Serie de Garra en Movimiento',
  'One Half Locust': 'Media Postura de la Langosta',
  'Otis-Up': 'Otis-Up',
  'Rocky Pull-Ups/Pulldowns': 'Dominadas/Jalones Rocky',
  'Spell Caster': 'Spell Caster',
  Stairmaster: 'Escaladora',
  'Trail Running/Walking': 'Correr/Caminar por Sendero',
  'Wind Sprints': 'Sprints Cortos',
  Pyramid: 'Pirámide',
}

// Hand-picked, natural-sounding Spanish for the most common/important base
// phrases (equipment tag stripped) — see the layer explanation above.
const BASE_PHRASE_ES = {
  'Bench Press': 'Press de Banca',
  Squat: 'Sentadilla',
  Deadlift: 'Peso Muerto',
  'Romanian Deadlift': 'Peso Muerto Rumano',
  'Sumo Deadlift': 'Peso Muerto Sumo',
  'Stiff-Legged Barbell Deadlift': 'Peso Muerto con Piernas Rígidas',
  'Stiff-Legged Dumbbell Deadlift': 'Peso Muerto con Mancuernas y Piernas Rígidas',
  'Trap Bar Deadlift': 'Peso Muerto con Barra Hexagonal',
  'Rack Pulls': 'Peso Muerto Parcial en Rack',
  'Rickshaw Deadlift': 'Peso Muerto Rickshaw',
  'Deficit Deadlift': 'Peso Muerto con Déficit',
  'Axle Deadlift': 'Peso Muerto con Barra Gruesa',
  'Car Deadlift': 'Peso Muerto con Auto',
  'Shoulder Press': 'Press de Hombro',
  Shrug: 'Encogimiento de Hombros',
  'Side Bend': 'Flexión Lateral de Torso',
  'Chest Press': 'Press de Pecho',
  'Bicep Curl': 'Curl de Bíceps',
  'Preacher Curl': 'Curl Predicador',
  'Concentration Curl': 'Curl de Concentración',
  'Concentration Curls': 'Curl de Concentración',
  'Reverse Crunch': 'Abdominal Inverso',
  Clean: 'Cargada',
  'Power Clean': 'Cargada de Potencia',
  'Hang Clean': 'Cargada Colgante',
  'Clean and Jerk': 'Cargada y Envión',
  'Clean and Press': 'Cargada y Press',
  'Clean Pull': 'Tirón de Cargada',
  'Clean Shrug': 'Encogimiento de Cargada',
  'Clean Deadlift': 'Peso Muerto de Cargada',
  'Split Clean': 'Cargada con Tijera',
  'Floor Press': 'Press en el Suelo',
  'Overhead Triceps Extension': 'Extensión de Tríceps Overhead',
  'Triceps Extension': 'Extensión de Tríceps',
  'Pistol Squat': 'Sentadilla Pistola',
  'Leg Press': 'Prensa de Piernas',
  'Good Morning': 'Buenos Días',
  'Hack Squat': 'Sentadilla Hack',
  'Incline Shoulder Raise': 'Elevación Inclinada de Hombro',
  'Seated Calf Raise': 'Elevación de Talones Sentado',
  'Squat To A Bench': 'Sentadilla al Banco',
  'Step Ups': 'Subidas al Banco',
  'Walking Lunge': 'Zancada Caminando',
  Flyes: 'Aperturas',
  'Iron Cross': 'Cruz de Hierro',
  'One-Arm Upright Row': 'Remo Vertical a Una Mano',
  'Upright Row': 'Remo Vertical',
  'Front Squat': 'Sentadilla Frontal',
  'Goblet Squat': 'Sentadilla Goblet',
  'Zercher Squats': 'Sentadilla Zercher',
  'Box Squat': 'Sentadilla al Cajón',
  'Overhead Squat': 'Sentadilla Overhead',
  'Split Squats': 'Sentadilla Dividida',
  'Split Squat with Dumbbells': 'Sentadilla Dividida con Mancuernas',
  'Jump Squat': 'Sentadilla con Salto',
  'Bent-Over Row': 'Remo Inclinado',
  'Bent Over Barbell Row': 'Remo con Barra Inclinado',
  'Inverted Row': 'Remo Invertido',
  'Seated Cable Rows': 'Remo en Polea Sentado',
  'T-Bar Row with Handle': 'Remo en Barra T',
  'Lat Pulldown': 'Jalón al Pecho',
  'Wide-Grip Lat Pulldown': 'Jalón al Pecho con Agarre Abierto',
  'One Arm Lat Pulldown': 'Jalón a Una Mano',
  'Straight-Arm Pulldown': 'Jalón con Brazos Rectos',
  'Rope Straight-Arm Pulldown': 'Jalón con Cuerda y Brazos Rectos',
  'Lateral Raise': 'Elevación Lateral',
  'Side Lateral Raise': 'Elevación Lateral',
  'Front Raise': 'Elevación Frontal',
  'Front Dumbbell Raise': 'Elevación Frontal con Mancuernas',
  'Front Delt Raise': 'Elevación Frontal de Deltoides',
  'Rear Delt Raise': 'Elevación Posterior de Deltoides',
  'Reverse Flyes': 'Aperturas Inversas',
  'Face Pull': 'Jalón a la Cara',
  'Triceps Pushdown': 'Extensión de Tríceps en Polea',
  'Skull Crusher': 'Press Francés',
  'Leg Curl': 'Curl de Pierna',
  'Seated Leg Curl': 'Curl de Pierna Sentado',
  'Standing Leg Curl': 'Curl de Pierna de Pie',
  'Lying Leg Curls': 'Curl de Pierna Acostado',
  'Leg Extensions': 'Extensión de Piernas',
  'Calf Raise': 'Elevación de Talones',
  'Standing Calf Raises': 'Elevación de Talones de Pie',
  'Hip Thrust': 'Hip Thrust',
  'Barbell Hip Thrust': 'Hip Thrust con Barra',
  Lunge: 'Zancada',
  Crunch: 'Abdominal',
  Crunches: 'Abdominales',
  Plank: 'Plancha',
  Dip: 'Fondo',
  'Bench Dips': 'Fondos en Banco',
  'Parallel Bar Dip': 'Fondos en Paralelas',
  'Ring Dips': 'Fondos en Anillas',
  'Chin-Up': 'Dominada Supina',
  Pullups: 'Dominadas',
  'Muscle Up': 'Muscle Up',
  'Military Press': 'Press Militar',
  'Standing Military Press': 'Press Militar de Pie',
  'Seated Barbell Military Press': 'Press Militar Sentado con Barra',
  'Two-Arm Kettlebell Military Press': 'Press Militar con Kettlebell a Dos Manos',
  'Arnold Dumbbell Press': 'Press Arnold',
  "Farmer's Walk": 'Paseo del Granjero',
  'Kettlebell Turkish Get-Up': 'Levantamiento Turco con Kettlebell',
  'Box Jump': 'Salto al Cajón',
  'Battling Ropes': 'Cuerdas de Batalla',
  'Mountain Climbers': 'Escaladores',
  'Russian Twist': 'Giro Ruso',
  'Cable Russian Twists': 'Giro Ruso en Polea',
  'Wrist Curl': 'Curl de Muñeca',
  'Cable Wrist Curl': 'Curl de Muñeca en Polea',
  'One-Arm Wrist Curl': 'Curl de Muñeca a Una Mano',
  'Two-Arm Wrist Curl': 'Curl de Muñeca a Dos Manos',
  'Cable Crossover': 'Cruce de Poleas',
  'Cable Crunch': 'Abdominal en Polea',
  'Cable Deadlifts': 'Peso Muerto en Polea',
  'Power Clean from Blocks': 'Cargada de Potencia desde Bloques',
  'Power Snatch': 'Arrancada de Potencia',
  'Power Jerk': 'Envión de Potencia',
  Snatch: 'Arrancada',
  'Snatch Balance': 'Balance de Arrancada',
  'Snatch Deadlift': 'Peso Muerto de Arrancada',
  'Snatch Pull': 'Tirón de Arrancada',
  'Snatch Shrug': 'Encogimiento de Arrancada',
  'Split Jerk': 'Envión con Tijera',
  'Split Jump': 'Salto con Tijera',
  'Split Snatch': 'Arrancada con Tijera',
  'Push Press': 'Empuje de Press',
  'Hang Snatch': 'Arrancada Colgante',
  'Sled Push': 'Empuje de Trineo',
  'Sled Drag': 'Arrastre de Trineo',
  'Sled Row': 'Remo con Trineo',
  'Kettlebell Halo': 'Halo con Kettlebell',
  'Kettlebell Windmill': 'Molinillo con Kettlebell',
  'Kettlebell Thruster': 'Thruster con Kettlebell',
  'One-Arm Kettlebell Row': 'Remo con Kettlebell a Una Mano',
  'One-Arm Kettlebell Snatch': 'Arrancada con Kettlebell a Una Mano',
  'One-Arm Kettlebell Swings': 'Balanceo con Kettlebell a Una Mano',
  'Reverse Hyperextension': 'Hiperextensión Inversa',
  Hyperextension: 'Hiperextensión',
  Hyperextensions: 'Hiperextensiones',
  'Glute Ham Raise': 'Elevación Glúteo-Femoral',
  'Glute Kickback': 'Patada de Glúteo',
  'Hip Extension with Bands': 'Extensión de Cadera con Banda',
  'Standing Hip Flexors': 'Estiramiento de Flexores de Cadera de Pie',
  'Torso Rotation': 'Rotación de Torso',
  'Wide Stance Barbell Squat': 'Sentadilla con Barra y Postura Ancha',
  'Wide Stance Stiff Legs': 'Peso Muerto Piernas Rígidas Postura Ancha',
  'Narrow Stance Squats': 'Sentadilla con Postura Estrecha',
  'One Arm Dumbbell Row': 'Remo con Mancuerna a Una Mano',
  'One-Arm Dumbbell Row': 'Remo con Mancuerna a Una Mano',
  'One-Arm Dumbbell Press': 'Press con Mancuerna a Una Mano',
  'Reverse Grip Bent-Over Rows': 'Remo Inclinado con Agarre Supino',
  'Reverse Barbell Curl': 'Curl Inverso con Barra',
  'Reverse Cable Curl': 'Curl Inverso en Polea',
  'Spider Curl': 'Curl Araña',
  'Drag Curl': 'Curl de Arrastre',
  'Zottman Curl': 'Curl Zottman',
  'EZ-Bar Curl': 'Curl con Barra EZ',
  'Barbell Curl': 'Curl con Barra',
  'Hammer Curl': 'Curl Martillo',
  'Hammer Curls': 'Curl Martillo',
  'Rope Climb': 'Escalada de Cuerda',
  'Cuban Press': 'Press Cubano',
  'Bent Press': 'Press Inclinado',
  'Svend Press': 'Press Svend',
  'JM Press': 'Press JM',
  'Tate Press': 'Press Tate',
  'Pallof Press': 'Press Pallof',
  'Pallof Press With Rotation': 'Press Pallof con Rotación',
  'Neck Press': 'Press al Cuello',
  'Board Press': 'Press con Tablas',
  'Pin Presses': 'Press en Pines',
  'Chain Press': 'Press con Cadenas',
  Superman: 'Superman',
  'Dead Bug': 'Dead Bug',
  Inchworm: 'Oruga',
  'Sumo Deadlift with Bands': 'Peso Muerto Sumo con Bandas',
  'Sumo Deadlift with Chains': 'Peso Muerto Sumo con Cadenas',
  'Deadlift with Bands': 'Peso Muerto con Bandas',
  'Deadlift with Chains': 'Peso Muerto con Cadenas',
  'Squat with Bands': 'Sentadilla con Bandas',
  'Squat with Chains': 'Sentadilla con Cadenas',
  'Ab Roller': 'Rueda Abdominal',
  'Ab Rollout': 'Rollout Abdominal',
  'Ab Crunch Machine': 'Máquina de Abdominales',
  'Standing Long Jump': 'Salto Largo de Pie',
  'Vertical Swing': 'Balanceo Vertical',
  'Wind Sprints': 'Sprints Cortos',
  'Depth Jump Leap': 'Salto de Profundidad',
  'Tire Flip': 'Volteo de Llanta',
  'Yoke Walk': 'Caminata con Yugo',
  'Log Lift': 'Levantamiento de Tronco',
  'Sandbag Load': 'Carga de Saco de Arena',
  'Keg Load': 'Carga de Barril',
  'Atlas Stones': 'Piedras Atlas',
  'Prowler Sprint': 'Sprint con Prowler',
  Butterfly: 'Mariposa',
  'Incline Bench Press': 'Press de Banca Inclinado',
  'Decline Barbell Bench Press': 'Press de Banca Declinado con Barra',
  'Decline Dumbbell Bench Press': 'Press de Banca Declinado con Mancuernas',
  'Wide-Grip Barbell Bench Press': 'Press de Banca con Barra y Agarre Abierto',
  'Wide-Grip Decline Barbell Bench Press': 'Press de Banca Declinado con Barra y Agarre Abierto',
  'Close-Grip Barbell Bench Press': 'Press de Banca con Agarre Cerrado',
  'Decline Skull Crusher': 'Press Francés Declinado',
  'Incline Dumbbell Press': 'Press Inclinado con Mancuernas',
  'Decline Dumbbell Flyes': 'Aperturas Declinadas con Mancuernas',
  'Incline Dumbbell Flye': 'Apertura Inclinada con Mancuerna',
  'Incline Dumbbell Flyes': 'Aperturas Inclinadas con Mancuernas',
  'Standing Dumbbell Press': 'Press de Pie con Mancuernas',
  'Seated Dumbbell Press': 'Press Sentado con Mancuernas',
  'Standing Barbell Calf Raise': 'Elevación de Talones de Pie con Barra',
  'Standing Dumbbell Calf Raise': 'Elevación de Talones de Pie con Mancuernas',
  'Seated Dumbbell Curl': 'Curl con Mancuernas Sentado',
  'Standing Dumbbell Reverse Curl': 'Curl Inverso de Pie con Mancuernas',
  'Standing Dumbbell Upright Row': 'Remo Vertical de Pie con Mancuernas',
  'Standing Dumbbell Triceps Extension': 'Extensión de Tríceps de Pie con Mancuernas',
  'One-Arm Triceps Extension': 'Extensión de Tríceps a Una Mano',
  'Alternate Hammer Curl': 'Curl Martillo Alterno',
  'Cross Body Hammer Curl': 'Curl Martillo Cruzado',
  'Incline Hammer Curls': 'Curl Martillo Inclinado',
  'Standing Concentration Curl': 'Curl de Concentración de Pie',
  'Standing Biceps Cable Curl': 'Curl de Bíceps de Pie en Polea',
  'Standing One-Arm Cable Curl': 'Curl en Polea de Pie a Una Mano',
  'Lying Cable Curl': 'Curl en Polea Acostado',
  'Reverse Plate Curls': 'Curl Inverso con Disco',
  'Finger Curls': 'Curl de Dedos',
  'Hip Circles': 'Círculos de Cadera',
  'Standing Hip Circles': 'Círculos de Cadera de Pie',
  'Ankle Circles': 'Círculos de Tobillo',
  'Arm Circles': 'Círculos de Brazo',
  'Wrist Circles': 'Círculos de Muñeca',
  'Elbow Circles': 'Círculos de Codo',
  'Knee Circles': 'Círculos de Rodilla',
  'Shoulder Circles': 'Círculos de Hombro',
}

function stripSmrSuffix(base) {
  const m = base.match(/^(.*)-SMR$/i)
  return m ? m[1].trim() : null
}

const ES_DICTS = [MOVEMENT_ES, MODIFIER_ES, BODYPART_ES, CONNECTOR_ES, EQUIPMENT_ES]

function lookupWordEs(word) {
  const key = word.toLowerCase()
  for (const dict of ES_DICTS) {
    if (key in dict) return { found: true, es: dict[key] }
  }
  return { found: false, es: null }
}

/** Translates a base phrase (no trailing parenthetical), greedily matching
 * known multi-word phrases first, then falling back to word-by-word lookup,
 * then reordering so a trailing movement noun (the common English shape)
 * leads, matching Spanish noun-first word order. */
function translateBasePhrase(base) {
  const words = base.split(/\s+/)
  const cleanWords = words.map((w) => w.replace(/^[("]+|[)".,]+$/g, ''))
  const segments = []
  let i = 0
  while (i < words.length) {
    let matched = false
    for (let span = Math.min(4, words.length - i); span >= 2; span--) {
      const phrase = cleanWords
        .slice(i, i + span)
        .join(' ')
        .toLowerCase()
      let es = PHRASES_ES[phrase]
      let isHead = false
      if (es === undefined && phrase in MOVEMENT_ES) {
        es = MOVEMENT_ES[phrase]
        isHead = true
      }
      if (es === undefined) {
        for (const dict of [MODIFIER_ES, BODYPART_ES, CONNECTOR_ES, EQUIPMENT_ES]) {
          if (phrase in dict) {
            es = dict[phrase]
            break
          }
        }
      }
      if (es !== undefined) {
        segments.push({ es, isHead })
        i += span
        matched = true
        break
      }
    }
    if (matched) continue

    const raw = words[i]
    const clean = cleanWords[i]
    if (!clean) {
      segments.push({ es: raw, isHead: false })
      i++
      continue
    }
    if (clean.includes('/')) {
      const parts = clean.split('/').map((p) => {
        const { found, es } = lookupWordEs(p)
        return found ? es : p
      })
      segments.push({ es: parts.join('/'), isHead: false })
      i++
      continue
    }
    const key = clean.toLowerCase()
    const { found, es } = lookupWordEs(clean)
    segments.push(
      found
        ? { es: es === '' ? '' : raw.replace(clean, es), isHead: key in MOVEMENT_ES }
        : { es: raw, isHead: false },
    )
    i++
  }

  if (segments.length > 1 && segments[segments.length - 1].isHead) {
    const [head] = segments.splice(segments.length - 1, 1)
    segments.unshift(head)
  }

  return segments
    .map((s) => s.es)
    .filter(Boolean)
    .join(' ')
    .replace(/\s+/g, ' ')
    .trim()
}

function translateName(name) {
  const m = name.match(/^(.*?)\s*\(([^)]*)\)\s*$/)
  let base = m ? m[1] : name
  const tag = m ? m[2] : null

  const curated = BASE_PHRASE_ES[base] ?? NAME_OVERRIDES_ES[base]
  if (curated) {
    const tagEs = tag ? translateEquipmentTag(tag) : null
    return tagEs ? `${curated} (${tagEs})` : curated
  }

  const smrBase = stripSmrSuffix(base)
  if (smrBase !== null) base = smrBase

  const text = translateBasePhrase(base)
  const tagEs = tag ? translateEquipmentTag(tag) : null
  const finalText = smrBase !== null ? `${text} (Automasaje)` : text
  return tagEs ? `${finalText} (${tagEs})` : finalText
}

const outFile = join(
  dirname(fileURLToPath(import.meta.url)),
  '..',
  'src',
  'lib',
  'exercises',
  'exerciseCatalog.json',
)

const url = `https://raw.githubusercontent.com/${REPO}/${REF}/${SRC_PATH}`
const res = await fetch(url)
if (!res.ok) {
  throw new Error(`Failed to fetch ${url}: ${res.status} ${res.statusText}`)
}

/** @type {Array<{id: string, name: string, primaryMuscles: string[]}>} */
const raw = await res.json()

const trimmed = raw
  .map((exercise) => {
    const name = friendlyName(exercise.id, cleanName(exercise.name))
    return {
      id: exercise.id,
      name,
      nameEs: translateName(name),
      muscleGroup: muscleGroupFor(exercise.primaryMuscles),
      primaryMuscles: exercise.primaryMuscles,
    }
  })
  .sort((a, b) => a.name.localeCompare(b.name))

const seenNames = new Set()
for (const exercise of trimmed) {
  if (seenNames.has(exercise.name)) {
    throw new Error(`Cleaning names produced a duplicate: "${exercise.name}"`)
  }
  seenNames.add(exercise.name)
  if (!exercise.nameEs.trim()) {
    throw new Error(`No Spanish name generated for "${exercise.name}" (${exercise.id})`)
  }
}

await writeFile(outFile, JSON.stringify(trimmed, null, 2) + '\n')

console.log(`synced ${trimmed.length} exercises (ref ${REF})`)
console.log('Now: review the diff, bump README.md.')
