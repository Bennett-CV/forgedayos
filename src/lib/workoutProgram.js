export const WORKOUT_PROGRAM = {
  1: {
    label: "Day 1",
    type: "strength",
    exercises: [
      { name: "Incline Dumbbell Bench Press", sets: 3, reps: 8 },
      { name: "Chest Support Row", sets: 3, reps: 8 },
      { name: "Goblet Squat", sets: 3, reps: 10 },
      { name: "Alternating Lateral Raise", sets: 3, reps: 6 },
      { name: "Prone Overhead Press", sets: 3, reps: 10 },
      { name: "Offset Lateral Lunge", sets: 3, reps: 5 },
      { name: "Incline Dumbbell Curls", sets: 3, reps: 10 },
      { name: "Bodyweight Triceps Extensions", sets: 3, reps: null, isAmrap: true },
    ],
  },
  2: {
    label: "Day 2",
    type: "cardio",
    exercises: [
      { name: "Cardio", sets: 1, reps: null, isCardio: true },
    ],
  },
  3: {
    label: "Day 3",
    type: "strength",
    exercises: [
      { name: "Rear Foot Elevated Split Squat", sets: 3, reps: 6 },
      { name: "Bird Dog Row", sets: 3, reps: 8 },
      { name: "Hollow-Body 1 Arm Press", sets: 3, reps: 6 },
      { name: "Copenhagen Side Plank Pressout", sets: 3, reps: 8 },
      { name: "Single Leg Hip Thrust", sets: 3, reps: 10 },
      { name: "Alternating Reverse Flyes", sets: 3, reps: 6 },
      { name: "Close-Grip Pushups", sets: 3, reps: null, isAmrap: true },
      { name: "Alternating Dumbbell Curls", sets: 3, reps: 8 },
    ],
  },
  4: {
    label: "Day 4",
    type: "cardio",
    exercises: [
      { name: "Cardio", sets: 1, reps: null, isCardio: true },
    ],
  },
  5: {
    label: "Day 5",
    type: "strength",
    exercises: [
      { name: "Chin-Up", sets: 3, reps: null, isAmrap: true },
      { name: "1 Arm Dumbbell Overhead Press", sets: 3, reps: 8 },
      { name: "Romanian Deadlift", sets: 3, reps: 8 },
      { name: "Bench Plank Rows", sets: 3, reps: 10 },
      { name: "Step-Through Lunge", sets: 3, reps: 5 },
      { name: "1 Arm/1 Leg Bridge Press", sets: 3, reps: 6 },
      { name: "Hollow Body Triceps Extensions", sets: 3, reps: 10 },
      { name: "Alternating Iso Hammer Curls", sets: 3, reps: 8 },
    ],
  },
};

function daysFromLegacy() {
  return [1, 2, 3, 4, 5].map(d => ({
    day: d,
    label: WORKOUT_PROGRAM[d].label,
    type: WORKOUT_PROGRAM[d].type,
    exercises: WORKOUT_PROGRAM[d].exercises.map(e => ({ ...e })),
  }));
}

export const PROGRAM_PRESETS = [
  {
    id: "full_body_3",
    name: "3-day full body",
    blurb: "Three strength days. Rest between sessions.",
    days: [
      {
        day: 1,
        label: "Full Body A",
        type: "strength",
        exercises: [
          { name: "Goblet Squat", sets: 3, reps: 10 },
          { name: "Incline Dumbbell Bench Press", sets: 3, reps: 8 },
          { name: "Chest Support Row", sets: 3, reps: 8 },
          { name: "Romanian Deadlift", sets: 3, reps: 8 },
          { name: "1 Arm Dumbbell Overhead Press", sets: 3, reps: 8 },
          { name: "Incline Dumbbell Curls", sets: 3, reps: 10 },
        ],
      },
      {
        day: 2,
        label: "Full Body B",
        type: "strength",
        exercises: [
          { name: "Rear Foot Elevated Split Squat", sets: 3, reps: 6 },
          { name: "Close-Grip Pushups", sets: 3, reps: null, isAmrap: true },
          { name: "Bird Dog Row", sets: 3, reps: 8 },
          { name: "Single Leg Hip Thrust", sets: 3, reps: 10 },
          { name: "Alternating Lateral Raise", sets: 3, reps: 8 },
          { name: "Bodyweight Triceps Extensions", sets: 3, reps: null, isAmrap: true },
        ],
      },
      {
        day: 3,
        label: "Full Body C",
        type: "strength",
        exercises: [
          { name: "Chin-Up", sets: 3, reps: null, isAmrap: true },
          { name: "Hollow-Body 1 Arm Press", sets: 3, reps: 6 },
          { name: "Step-Through Lunge", sets: 3, reps: 6 },
          { name: "Alternating Reverse Flyes", sets: 3, reps: 8 },
          { name: "Alternating Dumbbell Curls", sets: 3, reps: 8 },
          { name: "Hollow Body Triceps Extensions", sets: 3, reps: 10 },
        ],
      },
    ],
  },
  {
    id: "upper_lower",
    name: "Upper / Lower",
    blurb: "Four days. Upper and lower twice.",
    days: [
      {
        day: 1,
        label: "Upper A",
        type: "strength",
        exercises: [
          { name: "Incline Dumbbell Bench Press", sets: 3, reps: 8 },
          { name: "Chest Support Row", sets: 3, reps: 8 },
          { name: "1 Arm Dumbbell Overhead Press", sets: 3, reps: 8 },
          { name: "Alternating Lateral Raise", sets: 3, reps: 8 },
          { name: "Incline Dumbbell Curls", sets: 3, reps: 10 },
          { name: "Bodyweight Triceps Extensions", sets: 3, reps: null, isAmrap: true },
        ],
      },
      {
        day: 2,
        label: "Lower A",
        type: "strength",
        exercises: [
          { name: "Goblet Squat", sets: 3, reps: 10 },
          { name: "Romanian Deadlift", sets: 3, reps: 8 },
          { name: "Rear Foot Elevated Split Squat", sets: 3, reps: 6 },
          { name: "Single Leg Hip Thrust", sets: 3, reps: 10 },
        ],
      },
      {
        day: 3,
        label: "Upper B",
        type: "strength",
        exercises: [
          { name: "Chin-Up", sets: 3, reps: null, isAmrap: true },
          { name: "Hollow-Body 1 Arm Press", sets: 3, reps: 6 },
          { name: "Bird Dog Row", sets: 3, reps: 8 },
          { name: "Alternating Reverse Flyes", sets: 3, reps: 8 },
          { name: "Alternating Dumbbell Curls", sets: 3, reps: 8 },
          { name: "Hollow Body Triceps Extensions", sets: 3, reps: 10 },
        ],
      },
      {
        day: 4,
        label: "Lower B",
        type: "strength",
        exercises: [
          { name: "Step-Through Lunge", sets: 3, reps: 6 },
          { name: "Offset Lateral Lunge", sets: 3, reps: 6 },
          { name: "1 Arm/1 Leg Bridge Press", sets: 3, reps: 6 },
          { name: "Copenhagen Side Plank Pressout", sets: 3, reps: 8 },
        ],
      },
    ],
  },
  {
    id: "ppl",
    name: "Push / Pull / Legs",
    blurb: "Classic three-day split. Repeat the week if you want six.",
    days: [
      {
        day: 1,
        label: "Push",
        type: "strength",
        exercises: [
          { name: "Incline Dumbbell Bench Press", sets: 3, reps: 8 },
          { name: "1 Arm Dumbbell Overhead Press", sets: 3, reps: 8 },
          { name: "Alternating Lateral Raise", sets: 3, reps: 8 },
          { name: "Close-Grip Pushups", sets: 3, reps: null, isAmrap: true },
          { name: "Bodyweight Triceps Extensions", sets: 3, reps: null, isAmrap: true },
        ],
      },
      {
        day: 2,
        label: "Pull",
        type: "strength",
        exercises: [
          { name: "Chest Support Row", sets: 3, reps: 8 },
          { name: "Chin-Up", sets: 3, reps: null, isAmrap: true },
          { name: "Bird Dog Row", sets: 3, reps: 8 },
          { name: "Alternating Reverse Flyes", sets: 3, reps: 8 },
          { name: "Incline Dumbbell Curls", sets: 3, reps: 10 },
        ],
      },
      {
        day: 3,
        label: "Legs",
        type: "strength",
        exercises: [
          { name: "Goblet Squat", sets: 3, reps: 10 },
          { name: "Romanian Deadlift", sets: 3, reps: 8 },
          { name: "Rear Foot Elevated Split Squat", sets: 3, reps: 6 },
          { name: "Single Leg Hip Thrust", sets: 3, reps: 10 },
          { name: "Step-Through Lunge", sets: 3, reps: 6 },
        ],
      },
    ],
  },
  {
    id: "starter_5",
    name: "Starter 5-day",
    blurb: "Three strength days with two cardio days.",
    days: daysFromLegacy(),
  },
];

export function getProgramPreset(id) {
  return PROGRAM_PRESETS.find(p => p.id === id) || null;
}

export function clonePresetDays(preset) {
  const source = preset?.days || [];
  return source.map(d => ({
    day: d.day,
    label: d.label,
    type: d.type,
    exercises: (d.exercises || []).map(e => ({ ...e })),
  }));
}

export function emptyCustomDays(count = 3) {
  return Array.from({ length: count }, (_, i) => ({
    day: i + 1,
    label: `Day ${i + 1}`,
    type: "strength",
    exercises: [],
  }));
}

export function programDayNumbers(program) {
  return [...new Set((program || []).map(d => Number(d.day)).filter(d => d >= 1))].sort((a, b) => a - b);
}
