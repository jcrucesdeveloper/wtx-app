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
  .map((exercise) => ({
    id: exercise.id,
    name: friendlyName(exercise.id, cleanName(exercise.name)),
    muscleGroup: muscleGroupFor(exercise.primaryMuscles),
    primaryMuscles: exercise.primaryMuscles,
  }))
  .sort((a, b) => a.name.localeCompare(b.name))

const seenNames = new Set()
for (const exercise of trimmed) {
  if (seenNames.has(exercise.name)) {
    throw new Error(`Cleaning names produced a duplicate: "${exercise.name}"`)
  }
  seenNames.add(exercise.name)
}

await writeFile(outFile, JSON.stringify(trimmed, null, 2) + '\n')

console.log(`synced ${trimmed.length} exercises (ref ${REF})`)
console.log('Now: review the diff, bump README.md.')
