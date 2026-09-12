/** Starter training templates. Days are 1-indexed WorkoutProgram rows. */

function ex(name, sets, reps, extra = {}) {
  return { name, sets, reps, isAmrap: false, isCardio: false, ...extra };
}

export const WORKOUT_PRESETS = [
  {
    id: "full_body_3",
    name: "3-day Full Body",
    caption: "Three strength days. Rest between them.",
    days: [
      {
        day: 1,
        label: "Full Body A",
        type: "strength",
        exercises: [
          ex("Goblet Squat", 3, 8),
          ex("Incline Dumbbell Bench Press", 3, 8),
          ex("Chest Support Row", 3, 8),
          ex("Romanian Deadlift", 3, 8),
          ex("Plank", 3, 30),
        ],
      },
      {
        day: 2,
        label: "Full Body B",
        type: "strength",
        exercises: [
          ex("Rear Foot Elevated Split Squat", 3, 6),
          ex("1 Arm Dumbbell Overhead Press", 3, 8),
          ex("Chin-Up", 3, null, { isAmrap: true }),
          ex("Single Leg Hip Thrust", 3, 10),
          ex("Incline Dumbbell Curls", 3, 10),
        ],
      },
      {
        day: 3,
        label: "Full Body C",
        type: "strength",
        exercises: [
          ex("Trap / Goblet Squat", 3, 10),
          ex("Close-Grip Pushups", 3, null, { isAmrap: true }),
          ex("Bird Dog Row", 3, 8),
          ex("Single Leg Romanian Deadlift", 3, 8),
          ex("Alternating Lateral Raise", 3, 10),
        ],
      },
    ],
  },
  {
    id: "upper_lower",
    name: "Upper / Lower",
    caption: "Four days. Pair upper and lower.",
    days: [
      {
        day: 1,
        label: "Upper A",
        type: "strength",
        exercises: [
          ex("Incline Dumbbell Bench Press", 3, 8),
          ex("Chest Support Row", 3, 8),
          ex("1 Arm Dumbbell Overhead Press", 3, 8),
          ex("Chin-Up", 3, null, { isAmrap: true }),
          ex("Incline Dumbbell Curls", 3, 10),
          ex("Bodyweight Triceps Extensions", 3, null, { isAmrap: true }),
        ],
      },
      {
        day: 2,
        label: "Lower A",
        type: "strength",
        exercises: [
          ex("Goblet Squat", 3, 8),
          ex("Romanian Deadlift", 3, 8),
          ex("Rear Foot Elevated Split Squat", 3, 6),
          ex("Single Leg Hip Thrust", 3, 10),
          ex("Calf Raise", 3, 12),
        ],
      },
      {
        day: 3,
        label: "Upper B",
        type: "strength",
        exercises: [
          ex("Hollow-Body 1 Arm Press", 3, 6),
          ex("Bird Dog Row", 3, 8),
          ex("Alternating Lateral Raise", 3, 10),
          ex("Bench Plank Rows", 3, 10),
          ex("Alternating Dumbbell Curls", 3, 8),
          ex("Close-Grip Pushups", 3, null, { isAmrap: true }),
        ],
      },
      {
        day: 4,
        label: "Lower B",
        type: "strength",
        exercises: [
          ex("Offset Lateral Lunge", 3, 6),
          ex("Step-Through Lunge", 3, 5),
          ex("Single Leg Romanian Deadlift", 3, 8),
          ex("1 Arm/1 Leg Bridge Press", 3, 6),
          ex("Copenhagen Side Plank Pressout", 3, 8),
        ],
      },
    ],
  },
  {
    id: "ppl",
    name: "Push / Pull / Legs",
    caption: "Six days, or run the first three twice a week.",
    days: [
      {
        day: 1,
        label: "Push A",
        type: "strength",
        exercises: [
          ex("Incline Dumbbell Bench Press", 3, 8),
          ex("1 Arm Dumbbell Overhead Press", 3, 8),
          ex("Alternating Lateral Raise", 3, 10),
          ex("Close-Grip Pushups", 3, null, { isAmrap: true }),
          ex("Bodyweight Triceps Extensions", 3, null, { isAmrap: true }),
        ],
      },
      {
        day: 2,
        label: "Pull A",
        type: "strength",
        exercises: [
          ex("Chest Support Row", 3, 8),
          ex("Chin-Up", 3, null, { isAmrap: true }),
          ex("Bird Dog Row", 3, 8),
          ex("Alternating Reverse Flyes", 3, 8),
          ex("Incline Dumbbell Curls", 3, 10),
        ],
      },
      {
        day: 3,
        label: "Legs A",
        type: "strength",
        exercises: [
          ex("Goblet Squat", 3, 8),
          ex("Romanian Deadlift", 3, 8),
          ex("Rear Foot Elevated Split Squat", 3, 6),
          ex("Single Leg Hip Thrust", 3, 10),
          ex("Calf Raise", 3, 12),
        ],
      },
      {
        day: 4,
        label: "Push B",
        type: "strength",
        exercises: [
          ex("Hollow-Body 1 Arm Press", 3, 6),
          ex("Prone Overhead Press", 3, 10),
          ex("Alternating Lateral Raise", 3, 8),
          ex("Close-Grip Pushups", 3, null, { isAmrap: true }),
          ex("Hollow Body Triceps Extensions", 3, 10),
        ],
      },
      {
        day: 5,
        label: "Pull B",
        type: "strength",
        exercises: [
          ex("Bench Plank Rows", 3, 10),
          ex("Chin-Up", 3, null, { isAmrap: true }),
          ex("Alternating Reverse Flyes", 3, 6),
          ex("Alternating Iso Hammer Curls", 3, 8),
          ex("Alternating Dumbbell Curls", 3, 8),
        ],
      },
      {
        day: 6,
        label: "Legs B",
        type: "strength",
        exercises: [
          ex("Offset Lateral Lunge", 3, 6),
          ex("Step-Through Lunge", 3, 5),
          ex("Single Leg Romanian Deadlift", 3, 8),
          ex("1 Arm/1 Leg Bridge Press", 3, 6),
          ex("Copenhagen Side Plank Pressout", 3, 8),
        ],
      },
    ],
  },
];

export const CUSTOM_DAY_COUNTS = [3, 4, 5, 6];

export function blankProgram(dayCount = 3) {
  const n = CUSTOM_DAY_COUNTS.includes(dayCount) ? dayCount : 3;
  return Array.from({ length: n }, (_, i) => ({
    day: i + 1,
    label: `Day ${i + 1}`,
    type: "strength",
    exercises: [],
  }));
}

export function presetById(id) {
  return WORKOUT_PRESETS.find(p => p.id === id) || null;
}

export function clonePresetDays(preset) {
  return (preset?.days || []).map(d => ({
    day: d.day,
    label: d.label,
    type: d.type,
    exercises: (d.exercises || []).map(e => ({ ...e })),
  }));
}

export function programDayCount(program) {
  if (!Array.isArray(program) || program.length === 0) return 0;
  return program.filter(d => d && d.day != null).length;
}

export function sortedProgramDays(program) {
  return [...(program || [])].filter(d => d && d.day != null).sort((a, b) => a.day - b.day);
}

export function dayGridClass(count) {
  if (count <= 3) return "grid-cols-3";
  if (count === 4) return "grid-cols-4";
  if (count === 5) return "grid-cols-5";
  return "grid-cols-3";
}
