import { Briefcase, Dumbbell, Utensils, Wallet, Sparkles } from 'lucide-react';

export const PILLARS = {
  career: {
    key: 'career',
    label: 'Career',
    description: 'Deep work, outreach, shipping, growth',
    icon: Briefcase,
    color: 'oklch(0.55 0.13 260)',
    bgClass: 'bg-card',
    textClass: 'text-ink',
    borderClass: 'border-border',
  },
  lifts: {
    key: 'lifts',
    label: 'Lifts',
    description: 'Strength training, cardio, mobility',
    icon: Dumbbell,
    color: 'oklch(0.50 0.13 150)',
    bgClass: 'bg-card',
    textClass: 'text-ink',
    borderClass: 'border-border',
  },
  nutrition: {
    key: 'nutrition',
    label: 'Nutrition',
    description: 'Meals, macros, calories, weight',
    icon: Utensils,
    color: 'oklch(0.55 0.13 70)',
    bgClass: 'bg-card',
    textClass: 'text-ink',
    borderClass: 'border-border',
  },
  finance: {
    key: 'finance',
    label: 'Finance',
    description: 'Budget, investing, saving, income',
    icon: Wallet,
    color: 'oklch(0.52 0.13 210)',
    bgClass: 'bg-card',
    textClass: 'text-ink',
    borderClass: 'border-border',
  },
  mindfulness: {
    key: 'mindfulness',
    label: 'Mindfulness',
    description: 'Journaling, meditation, reading',
    icon: Sparkles,
    color: 'oklch(0.52 0.13 335)',
    bgClass: 'bg-card',
    textClass: 'text-ink',
    borderClass: 'border-border',
  },
};

export const PILLAR_KEYS = Object.keys(PILLARS);

export const ACTIVITY_PRESETS = {
  career: [
    { title: 'Cold outreach', category: 'outreach', unit: 'contacts', defaultPoints: 3 },
    { title: 'Ship feature', category: 'shipping', unit: 'features', defaultPoints: 5 },
    { title: 'Meeting / Call', category: 'meetings', unit: 'meetings', defaultPoints: 2 },
    { title: 'Deep work session', category: 'deep_work', unit: 'hours', defaultPoints: 4 },
  ],
  lifts: [
    { title: 'Strength session', category: 'lifting', unit: 'minutes', defaultPoints: 4 },
    { title: 'Cardio / Run', category: 'running', unit: 'miles', defaultPoints: 3 },
    { title: 'Mobility / Stretch', category: 'mobility', unit: 'minutes', defaultPoints: 2 },
    { title: 'PR hit', category: 'pr', unit: 'lifts', defaultPoints: 5 },
  ],
  nutrition: [
    { title: 'Hit protein goal', category: 'protein', unit: 'g', defaultPoints: 3 },
    { title: 'Logged meals', category: 'meal_log', unit: 'meals', defaultPoints: 2 },
    { title: 'Stayed in calories', category: 'calories', unit: 'days', defaultPoints: 3 },
    { title: 'Meal prepped', category: 'meal_prep', unit: 'meals', defaultPoints: 4 },
  ],
  finance: [
    { title: 'Invested', category: 'investing', unit: '$', defaultPoints: 4 },
    { title: 'Saved', category: 'saving', unit: '$', defaultPoints: 3 },
    { title: 'Side income earned', category: 'side_income', unit: '$', defaultPoints: 5 },
    { title: 'Budget review', category: 'budgeting', unit: 'reviews', defaultPoints: 2 },
  ],
  mindfulness: [
    { title: 'Morning journal', category: 'morning', unit: 'entries', defaultPoints: 3 },
    { title: 'Evening journal', category: 'evening', unit: 'entries', defaultPoints: 3 },
    { title: 'Meditation', category: 'meditation', unit: 'minutes', defaultPoints: 3 },
    { title: 'Gratitude', category: 'gratitude', unit: 'entries', defaultPoints: 2 },
  ],
};