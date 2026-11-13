// Hand-maintained additions on top of the upstream free-exercise-db catalog,
// merged in by scripts/sync-exercise-db.mjs so they survive every re-sync.
// See src/lib/exercises/README.md ("Overlay").

/**
 * Upstream's `category` → our muscle group, overriding the `primaryMuscles`
 * mapping. A treadmill run or a hamstring stretch is found by what it is,
 * not by the muscle it happens to work most.
 */
export const MUSCLE_GROUP_BY_CATEGORY = {
  cardio: 'Cardio',
  stretching: 'Stretching',
}

/** Groups whose exercises are tracked by time, not weight × reps, by default. */
export const TIMED_MUSCLE_GROUPS = ['Cardio', 'Stretching']

/**
 * Exercises upstream doesn't have: warm-ups, sports and a plain treadmill.
 * Ids carry a `WTX_` prefix so they never collide with an upstream id, and
 * their images are served from the fork's own tag (`CUSTOM_EXERCISE_IMAGES_REF`
 * in src/config/exerciseImages.ts). `imageSource` records where an image came
 * from and under which license; an entry without one has no image.
 *
 * Only public domain or CC0 images, and none showing an identifiable person.
 *
 * @type {Array<{
 *   id: string, name: string, nameEs: string, muscleGroup: string,
 *   equipment: string, primaryMuscles: string[],
 *   imageSource?: { url: string, license: 'Public domain' | 'CC0', author: string }
 * }>}
 */
export const CUSTOM_EXERCISES = [
  // --- Warm-up ---
  {
    id: 'WTX_Warm-Up',
    name: 'Warm-Up',
    nameEs: 'Calentamiento',
    muscleGroup: 'Cardio',
    equipment: 'Bodyweight',
    primaryMuscles: ['quadriceps'],
  },
  {
    id: 'WTX_Jumping_Jacks',
    name: 'Jumping Jacks',
    nameEs: 'Saltos de Tijera',
    muscleGroup: 'Cardio',
    equipment: 'Bodyweight',
    primaryMuscles: ['calves'],
  },
  {
    id: 'WTX_High_Knees',
    name: 'High Knees',
    nameEs: 'Rodillas Arriba',
    muscleGroup: 'Cardio',
    equipment: 'Bodyweight',
    primaryMuscles: ['quadriceps'],
  },
  {
    id: 'WTX_Leg_Swings',
    name: 'Leg Swings',
    nameEs: 'Balanceo de Piernas',
    muscleGroup: 'Stretching',
    equipment: 'Bodyweight',
    primaryMuscles: ['hamstrings'],
  },
  // --- Sports ---
  {
    id: 'WTX_Soccer',
    name: 'Soccer',
    nameEs: 'Fútbol',
    muscleGroup: 'Cardio',
    equipment: 'Other',
    primaryMuscles: ['quadriceps'],
    imageSource: {
      url: 'https://commons.wikimedia.org/wiki/File:60th_LRS_finishes_intramural_soccer_season_strong_5811245.jpg',
      license: 'Public domain',
      author: 'Tech. Sgt. David W. Carbajal',
    },
  },
  {
    id: 'WTX_Basketball',
    name: 'Basketball',
    nameEs: 'Básquetbol',
    muscleGroup: 'Cardio',
    equipment: 'Other',
    primaryMuscles: ['quadriceps'],
    imageSource: {
      url: 'https://commons.wikimedia.org/wiki/File:Basketball_through_hoop.jpg',
      license: 'Public domain',
      author: 'Airman 1st Class Kerelin Molina',
    },
  },
  {
    id: 'WTX_Tennis',
    name: 'Tennis',
    nameEs: 'Tenis',
    muscleGroup: 'Cardio',
    equipment: 'Other',
    primaryMuscles: ['shoulders'],
    imageSource: {
      url: 'https://commons.wikimedia.org/wiki/File:Closeup_of_a_tennis_ball_(2).jpg',
      license: 'CC0',
      author: 'Miscellaneous contributor',
    },
  },
  {
    id: 'WTX_Padel',
    name: 'Padel',
    nameEs: 'Pádel',
    muscleGroup: 'Cardio',
    equipment: 'Other',
    primaryMuscles: ['shoulders'],
    imageSource: {
      url: 'https://commons.wikimedia.org/wiki/File:Padel_court.jpg',
      license: 'CC0',
      author: 'Samson Ssemakadde',
    },
  },
  {
    id: 'WTX_Volleyball',
    name: 'Volleyball',
    nameEs: 'Vóleibol',
    muscleGroup: 'Cardio',
    equipment: 'Other',
    primaryMuscles: ['shoulders'],
    imageSource: {
      url: 'https://commons.wikimedia.org/wiki/File:Beach_volleyball_ball.jpg',
      license: 'Public domain',
      author: 'Thue',
    },
  },
  {
    id: 'WTX_Swimming',
    name: 'Swimming',
    nameEs: 'Natación',
    muscleGroup: 'Cardio',
    equipment: 'Bodyweight',
    primaryMuscles: ['lats'],
    imageSource: {
      url: 'https://commons.wikimedia.org/wiki/File:Swimming_laps_(Unsplash_rAyIvNqlwCY).jpg',
      license: 'CC0',
      author: 'Artem Verbo artemverbo',
    },
  },
  {
    id: 'WTX_Running',
    name: 'Running',
    nameEs: 'Correr',
    muscleGroup: 'Cardio',
    equipment: 'Bodyweight',
    primaryMuscles: ['quadriceps'],
    imageSource: {
      url: 'https://commons.wikimedia.org/wiki/File:Spikes_shoes.jpg',
      license: 'CC0',
      author: 'Defeder',
    },
  },
  {
    id: 'WTX_Boxing',
    name: 'Boxing',
    nameEs: 'Boxeo',
    muscleGroup: 'Cardio',
    equipment: 'Other',
    primaryMuscles: ['shoulders'],
    imageSource: {
      url: 'https://commons.wikimedia.org/wiki/File:Black_boxing_gloves.jpg',
      license: 'Public domain',
      author: 'Airman 1st Class Kerelin Molina',
    },
  },
  {
    id: 'WTX_Hiking',
    name: 'Hiking',
    nameEs: 'Senderismo',
    muscleGroup: 'Cardio',
    equipment: 'Bodyweight',
    primaryMuscles: ['quadriceps'],
    imageSource: {
      url: 'https://commons.wikimedia.org/wiki/File:California_Riding_%26_Hiking_Trail-_Covington_Region_(52583010187).jpg',
      license: 'Public domain',
      author: 'Joshua Tree National Park',
    },
  },
  // --- Treadmill (the specific runs/walks come from upstream) ---
  {
    id: 'WTX_Treadmill',
    name: 'Treadmill',
    nameEs: 'Cinta de Correr',
    muscleGroup: 'Cardio',
    equipment: 'Machine',
    primaryMuscles: ['quadriceps'],
    imageSource: {
      url: 'https://commons.wikimedia.org/wiki/File:Treadmills_at_gym.jpg',
      license: 'Public domain',
      author: 'U.S. Air Force Photo/Staff Sgt Araceli Alarcon',
    },
  },
]

/**
 * Corrections to upstream's tagging, keyed by id, applied after the
 * category/muscle mapping and equipment bucketing. Upstream tags the classic
 * powerlifting bench press by triceps, which hid the most popular lift in
 * the gym from the Chest chip.
 */
export const TAG_FIXES = {
  'Bench_Press_-_Powerlifting': { muscleGroup: 'Chest' },
  Bench_Press_with_Chains: { muscleGroup: 'Chest' },
  Bodyweight_Flyes: { equipment: 'Bodyweight' },
  // Upright rows are a shoulder exercise to gym-goers; upstream splits them by traps.
  Smith_Machine_Upright_Row: { muscleGroup: 'Shoulders' },
  Standing_Dumbbell_Upright_Row: { muscleGroup: 'Shoulders' },
  'Upright_Row_-_With_Bands': { muscleGroup: 'Shoulders' },
  Upright_Barbell_Row: { muscleGroup: 'Shoulders' },
}

/**
 * Popularity, 0–100, for ranking search results (see README.md "Rating").
 *
 * 76–100: StrengthLog's 2025 ranking of the most logged exercises by share
 * of all sets (https://www.strengthlog.com/?p=20720, 700,000+ users): the
 * overall top 25 in order, then the women's top 25 entries that aren't in
 * it. 60–79: staples of common programs that list doesn't reach (incline
 * bench, push-ups, dips, chin-ups, front squat, lunges, calf raises, core
 * work, Olympic lifts, the cardio machines) and WTX's warm-ups and sports.
 * Everything else falls back to `defaultRating()` in the sync script.
 */
export const RATINGS = {
  // StrengthLog overall top 25
  'Bench_Press_-_Powerlifting': 100,
  Barbell_Squat: 98,
  Barbell_Deadlift: 96,
  'Wide-Grip_Lat_Pulldown': 94,
  Barbell_Shoulder_Press: 92,
  Standing_Military_Press: 91,
  Bent_Over_Barbell_Row: 91,
  Side_Lateral_Raise: 90,
  Leg_Extensions: 89,
  Leg_Press: 89,
  Barbell_Curl: 88,
  Triceps_Pushdown: 87,
  Incline_Dumbbell_Press: 87,
  Dumbbell_Bicep_Curl: 86,
  Pullups: 86,
  Seated_Cable_Rows: 85,
  'Triceps_Pushdown_-_Rope_Attachment': 85,
  Lying_Leg_Curls: 84,
  'One-Arm_Dumbbell_Row': 84,
  Dumbbell_Shoulder_Press: 84,
  Romanian_Deadlift: 84,
  Seated_Leg_Curl: 83,
  Hammer_Curls: 83,
  Cable_Crossover: 82,
  Dumbbell_Bench_Press: 82,
  Face_Pull: 82,
  // StrengthLog women's top 25, beyond the overall list
  Barbell_Hip_Thrust: 83,
  Split_Squat_with_Dumbbells: 78,
  'Stiff-Legged_Barbell_Deadlift': 76,
  Thigh_Abductor: 78,
  // The same lifts under another name or grip
  'Barbell_Bench_Press_-_Medium_Grip': 80,
  'Close-Grip_Barbell_Bench_Press': 79,
  // Program staples
  'Barbell_Incline_Bench_Press_-_Medium_Grip': 79,
  Pushups: 79,
  'Dips_-_Chest_Version': 76,
  'Dips_-_Triceps_Version': 76,
  'Chin-Up': 77,
  Front_Squat_Clean_Grip: 74,
  Hack_Squat: 74,
  Goblet_Squat: 73,
  Dumbbell_Squat: 70,
  Sumo_Deadlift: 72,
  Dumbbell_Lunges: 73,
  Barbell_Lunge: 70,
  Bodyweight_Walking_Lunge: 70,
  Standing_Calf_Raises: 74,
  Seated_Calf_Raise: 72,
  Barbell_Shrug: 70,
  Dumbbell_Shrug: 70,
  'EZ-Bar_Skullcrusher': 72,
  Preacher_Curl: 72,
  Concentration_Curls: 66,
  Tricep_Dumbbell_Kickback: 65,
  Cable_Rope_Overhead_Triceps_Extension: 70,
  Arnold_Dumbbell_Press: 70,
  Reverse_Flyes: 70,
  Butterfly: 74,
  Leverage_Chest_Press: 74,
  Machine_Bench_Press: 72,
  Smith_Machine_Bench_Press: 70,
  Smith_Machine_Squat: 70,
  Dumbbell_Flyes: 72,
  'T-Bar_Row_with_Handle': 72,
  Barbell_Glute_Bridge: 70,
  Glute_Kickback: 62,
  'Bent-Arm_Dumbbell_Pullover': 64,
  Machine_Bicep_Curl: 66,
  Leverage_Shoulder_Press: 72,
  Crunches: 74,
  Plank: 76,
  Hanging_Leg_Raise: 73,
  Cable_Crunch: 70,
  Russian_Twist: 68,
  Ab_Roller: 66,
  Mountain_Climbers: 64,
  Hyperextensions_Back_Extensions: 72,
  Good_Morning: 64,
  'One-Arm_Kettlebell_Swings': 66,
  Power_Clean: 68,
  Clean_and_Jerk: 62,
  Power_Snatch: 60,
  Dumbbell_Step_Ups: 64,
  Front_Box_Jump: 62,
  Farmers_Walk: 62,
  // Cardio machines and outdoors
  Running_Treadmill: 78,
  Walking_Treadmill: 74,
  Jogging_Treadmill: 72,
  Bicycling_Stationary: 74,
  Elliptical_Trainer: 72,
  Rowing_Stationary: 72,
  Stairmaster: 70,
  Recumbent_Bike: 64,
  Step_Mill: 62,
  Rope_Jumping: 68,
  Bicycling: 66,
  Trail_Running_Walking: 60,
  // Stretches people actually look for
  Hamstring_Stretch: 58,
  Arm_Circles: 60,
  Childs_Pose: 56,
  Cat_Stretch: 54,
  // WTX additions
  'WTX_Warm-Up': 78,
  WTX_Treadmill: 80,
  WTX_Running: 74,
  WTX_Jumping_Jacks: 66,
  WTX_High_Knees: 58,
  WTX_Leg_Swings: 56,
  WTX_Soccer: 66,
  WTX_Basketball: 64,
  WTX_Swimming: 64,
  WTX_Tennis: 60,
  WTX_Padel: 60,
  WTX_Volleyball: 56,
  WTX_Boxing: 60,
  WTX_Hiking: 58,
}
