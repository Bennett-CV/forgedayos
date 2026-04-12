import { Briefcase, Heart, DollarSign, BookOpen, Users } from 'lucide-react';

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
  health: {
    key: 'health',
    label: 'Health',
    icon: Heart,
    color: 'hsl(142, 70%, 50%)',
    bgClass: 'bg-chart-2/10',
    textClass: 'text-chart-2',
    borderClass: 'border-chart-2/30',
  },
  wealth: {
    key: 'wealth',
    label: 'Wealth',
    icon: DollarSign,
    color: 'hsl(38, 92%, 60%)',
    bgClass: 'bg-chart-3/10',
    textClass: 'text-chart-3',
    borderClass: 'border-chart-3/30',
  },
  learning: {
    key: 'learning',
    label: 'Learning',
    icon: BookOpen,
    color: 'hsl(262, 83%, 65%)',
    bgClass: 'bg-chart-4/10',
    textClass: 'text-chart-4',
    borderClass: 'border-chart-4/30',
  },
  relationships: {
    key: 'relationships',
    label: 'Relationships',
    icon: Users,
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
  health: [
    { title: 'Lifting', category: 'lifting', unit: 'minutes', defaultPoints: 4 },
    { title: 'Running', category: 'running', unit: 'miles', defaultPoints: 3 },
    { title: 'Cardio', category: 'cardio', unit: 'minutes', defaultPoints: 3 },
    { title: 'Mobility / Stretch', category: 'mobility', unit: 'minutes', defaultPoints: 2 },
  ],
  wealth: [
    { title: 'Invested', category: 'investing', unit: '$', defaultPoints: 4 },
    { title: 'Saved', category: 'saving', unit: '$', defaultPoints: 3 },
    { title: 'Side income earned', category: 'side_income', unit: '$', defaultPoints: 5 },
    { title: 'Budget review', category: 'budgeting', unit: 'reviews', defaultPoints: 2 },
  ],
  learning: [
    { title: 'Read', category: 'reading', unit: 'pages', defaultPoints: 2 },
    { title: 'Course / Tutorial', category: 'courses', unit: 'minutes', defaultPoints: 3 },
    { title: 'Podcast', category: 'podcasts', unit: 'episodes', defaultPoints: 1 },
    { title: 'Writing', category: 'writing', unit: 'words', defaultPoints: 3 },
  ],
  relationships: [
    { title: 'Quality time', category: 'quality_time', unit: 'hours', defaultPoints: 3 },
    { title: 'Reached out', category: 'networking', unit: 'people', defaultPoints: 2 },
    { title: 'Date / Social event', category: 'social', unit: 'events', defaultPoints: 3 },
    { title: 'Family call', category: 'family', unit: 'calls', defaultPoints: 2 },
  ],
};