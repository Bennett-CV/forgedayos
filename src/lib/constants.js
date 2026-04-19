import { Briefcase, Dumbbell, Utensils, Wallet, Sparkles } from 'lucide-react';

export const PILLARS = {
  career: {
    key: 'career',
    label: 'Career',
    icon: Briefcase,
    color: 'hsl(173, 80%, 50%)',
    bgClass: 'bg-chart-1/10',
    textClass: 'text-chart-1',
    borderClass: 'border-chart-1/30',
  },
  lifts: {
    key: 'lifts',
    label: 'Lifts',
    icon: Dumbbell,
    color: 'hsl(142, 70%, 50%)',
    bgClass: 'bg-chart-2/10',
    textClass: 'text-chart-2',
    borderClass: 'border-chart-2/30',
  },
  nutrition: {
    key: 'nutrition',
    label: 'Nutrition',
    icon: Utensils,
    color: 'hsl(38, 92%, 60%)',
    bgClass: 'bg-chart-3/10',
    textClass: 'text-chart-3',
    borderClass: 'border-chart-3/30',
  },
  finance: {
    key: 'finance',
    label: 'Finance',
    icon: Wallet,
    color: 'hsl(262, 83%, 65%)',
    bgClass: 'bg-chart-4/10',
    textClass: 'text-chart-4',
    borderClass: 'border-chart-4/30',
  },
  mindfulness: {
    key: 'mindfulness',
    label: 'Mindfulness',
    icon: Sparkles,
    color: 'hsl(350, 80%, 60%)',
    bgClass: 'bg-chart-5/10',
    textClass: 'text-chart-5',
    borderClass: 'border-chart-5/30',
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