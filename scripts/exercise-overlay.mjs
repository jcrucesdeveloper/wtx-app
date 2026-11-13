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
