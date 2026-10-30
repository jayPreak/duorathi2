import { seeded } from './dates';

// Weekly leagues. Duolingo runs these server-side (contest start/end, tiered
// cohorts); offline we simulate a deterministic cohort of rivals whose XP
// grows through the week.

export const TIERS = [
  { name: 'Bronze', color: '#cd7f32' },
  { name: 'Silver', color: '#a8b3bd' },
  { name: 'Gold', color: '#ffc800' },
  { name: 'Sapphire', color: '#1cb0f6' },
  { name: 'Ruby', color: '#ff4b4b' },
  { name: 'Emerald', color: '#58cc02' },
  { name: 'Amethyst', color: '#ce82ff' },
  { name: 'Pearl', color: '#ffb2c8' },
  { name: 'Obsidian', color: '#4b4b4b' },
  { name: 'Diamond', color: '#58e1ff' },
] as const;

export const COHORT_SIZE = 20;
export const PROMOTE = 5;
export const DEMOTE = 5;

const NAMES = [
  'Aarav', 'Isha', 'Omkar', 'Sneha', 'Tanvi', 'Rohan', 'Gauri', 'Siddharth', 'Neha', 'Pranav',
  'Mukta', 'Aditya', 'Rutuja', 'Varun', 'Sayali', 'Kunal', 'Anushka', 'Yash', 'Pooja', 'Tejas',
  'Shreya', 'Nikhil', 'Ketaki', 'Harsh', 'Madhura', 'Abhay', 'Radhika', 'Swapnil',
];

export interface Rival {
  name: string;
  xp: number;
  emoji: string;
}

const AVATARS = ['🦉', '🐯', '🦊', '🐼', '🐸', '🐵', '🐨', '🦁', '🐰', '🐻', '🐧', '🦄'];

/** rivals for a week+tier, with XP proportional to how much of the week has elapsed */
export const rivalsFor = (week: string, tier: number, now = Date.now()): Rival[] => {
  const rng = seeded(`league:${week}:${tier}`);
  const [y, m, d] = week.split('-').map(Number);
  const elapsed = Math.min(1, Math.max(0, (now - new Date(y, m - 1, d).getTime()) / (7 * 86_400_000)));
  const names = [...NAMES].sort(() => rng() - 0.5);
  return Array.from({ length: COHORT_SIZE - 1 }, (_, i) => {
    // weekly totals skew higher in higher tiers; a few rivals are very active
    const weekly = Math.round((40 + rng() * 260 + (rng() < 0.15 ? 400 : 0)) * (1 + tier * 0.35));
    // activity curve: some front-load, some cram at the end
    const shape = 0.6 + rng() * 1.2;
    return { name: names[i % names.length], xp: Math.round(weekly * elapsed ** shape), emoji: AVATARS[i % AVATARS.length] };
  });
};

export interface Standing {
  name: string;
  xp: number;
  emoji: string;
  isYou: boolean;
}

export const standings = (week: string, tier: number, youName: string, youXp: number, now = Date.now()): Standing[] =>
  [
    ...rivalsFor(week, tier, now).map((r) => ({ ...r, isYou: false })),
    { name: youName, xp: youXp, emoji: '⭐', isYou: true },
  ].sort((a, b) => b.xp - a.xp || (a.isYou ? -1 : 1));

/** tier change at week rollover, from final rank (1-based) */
export const tierAfterWeek = (tier: number, rank: number) => {
  if (rank <= PROMOTE && tier < TIERS.length - 1) return tier + 1;
  if (rank > COHORT_SIZE - DEMOTE && tier > 0) return tier - 1;
  return tier;
};
