/**
 * Milestone definitions — MON-61
 * 13 kid milestones + 7 parent milestones.
 * Triggers are evaluated in App.tsx against live state.
 */

export type MilestoneCategory = 'Volume' | 'Streak' | 'Money' | 'Battle' | 'Monster' | 'Parent';
export type MilestoneSize     = 'small' | 'medium' | 'large';
export type MilestoneAudience = 'kid' | 'parent';

export interface MilestoneDef {
  id:        string;
  name:      string;
  icon:      string;            // emoji
  category:  MilestoneCategory;
  size:      MilestoneSize;
  audience:  MilestoneAudience;
  tagline:   string;
  xpReward:  number;
}

export const MILESTONES: MilestoneDef[] = [
  // ── Kid milestones ──────────────────────────────────────────────────────────
  {
    id: 'first-chore',
    name: 'First Chore Done',
    icon: '🐣',
    category: 'Volume',
    size: 'small',
    audience: 'kid',
    tagline: 'Every legend starts with one chore.',
    xpReward: 25,
  },
  {
    id: 'chores-10',
    name: 'On a Roll',
    icon: '💪',
    category: 'Volume',
    size: 'small',
    audience: 'kid',
    tagline: '10 chores down. Your monster is proud.',
    xpReward: 50,
  },
  {
    id: 'chores-50',
    name: 'Household Hero',
    icon: '🏠',
    category: 'Volume',
    size: 'medium',
    audience: 'kid',
    tagline: '50 chores approved. The house bows to you.',
    xpReward: 150,
  },
  {
    id: 'streak-3',
    name: '3-Day Streak',
    icon: '🔥',
    category: 'Streak',
    size: 'small',
    audience: 'kid',
    tagline: 'Three days in a row. Keep the fire burning.',
    xpReward: 30,
  },
  {
    id: 'streak-7',
    name: '7-Day Streak',
    icon: '📅',
    category: 'Streak',
    size: 'medium',
    audience: 'kid',
    tagline: 'A full week of showing up. Unreal.',
    xpReward: 100,
  },
  {
    id: 'perfect-week',
    name: 'Perfect Week',
    icon: '⭐',
    category: 'Streak',
    size: 'medium',
    audience: 'kid',
    tagline: '100% completion. The boss never stood a chance.',
    xpReward: 200,
  },
  {
    id: 'money-10',
    name: 'First $10 Earned',
    icon: '🐷',
    category: 'Money',
    size: 'medium',
    audience: 'kid',
    tagline: 'Ten whole dollars. All yours.',
    xpReward: 75,
  },
  {
    id: 'money-25',
    name: 'First $25 Earned',
    icon: '💵',
    category: 'Money',
    size: 'medium',
    audience: 'kid',
    tagline: 'Twenty-five dollars. You earned every cent.',
    xpReward: 150,
  },
  {
    id: 'money-100',
    name: 'First $100 Earned',
    icon: '💯',
    category: 'Money',
    size: 'large',
    audience: 'kid',
    tagline: 'One hundred dollars. You did that.',
    xpReward: 500,
  },
  {
    id: 'first-boss',
    name: 'First Boss Captured',
    icon: '🏆',
    category: 'Battle',
    size: 'large',
    audience: 'kid',
    tagline: 'Your first jar. Your first legend.',
    xpReward: 250,
  },
  {
    id: 'rare-find',
    name: 'Rare Find',
    icon: '🌀',
    category: 'Battle',
    size: 'medium',
    audience: 'kid',
    tagline: 'A rare variant, out of nowhere. Hold on to it.',
    xpReward: 100,
  },
  {
    id: 'first-evolution',
    name: 'First Evolution',
    icon: '✨',
    category: 'Monster',
    size: 'large',
    audience: 'kid',
    tagline: 'Your monster grew. Because you did too.',
    xpReward: 300,
  },
  {
    id: 'goal-getter',
    name: 'Goal Getter',
    icon: '🎯',
    category: 'Money',
    size: 'large',
    audience: 'kid',
    tagline: 'You set a goal and reached it. That\'s everything.',
    xpReward: 200,
  },

  // ── Parent milestones ────────────────────────────────────────────────────────
  {
    id: 'parent-first-approval',
    name: 'First Approval',
    icon: '✅',
    category: 'Parent',
    size: 'small',
    audience: 'parent',
    tagline: 'The first of many. Great start.',
    xpReward: 0,
  },
  {
    id: 'parent-first-payout',
    name: 'First Payout',
    icon: '💸',
    category: 'Parent',
    size: 'small',
    audience: 'parent',
    tagline: 'Paid out. They earned it.',
    xpReward: 0,
  },
  {
    id: 'parent-quick-draw',
    name: 'Quick Draw',
    icon: '⚡',
    category: 'Parent',
    size: 'small',
    audience: 'parent',
    tagline: 'Approved in under 5 minutes. Lightning fast.',
    xpReward: 0,
  },
  {
    id: 'parent-set-goal',
    name: 'Set the Goal',
    icon: '🎁',
    category: 'Parent',
    size: 'small',
    audience: 'parent',
    tagline: 'First goal created. Now they have something to aim for.',
    xpReward: 0,
  },
  {
    id: 'parent-battle-ready',
    name: 'Battle Ready',
    icon: '👨‍👩‍👧',
    category: 'Parent',
    size: 'small',
    audience: 'parent',
    tagline: 'First boss battle revealed. Let\'s go.',
    xpReward: 0,
  },
  {
    id: 'parent-full-roster',
    name: 'Full Roster',
    icon: '📋',
    category: 'Parent',
    size: 'medium',
    audience: 'parent',
    tagline: 'Every kid has at least one chore. The system is live.',
    xpReward: 0,
  },
  {
    id: 'parent-month-strong',
    name: 'Month Strong',
    icon: '🗓️',
    category: 'Parent',
    size: 'medium',
    audience: 'parent',
    tagline: '30 days in. The routine is real.',
    xpReward: 0,
  },
];

export function getMilestone(id: string): MilestoneDef | undefined {
  return MILESTONES.find(m => m.id === id);
}

export const KID_MILESTONES    = MILESTONES.filter(m => m.audience === 'kid');
export const PARENT_MILESTONES = MILESTONES.filter(m => m.audience === 'parent');
