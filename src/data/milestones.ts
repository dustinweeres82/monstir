/**
 * Milestone definitions — 20 kid + 20 parent.
 * Curated for retention: first wins, habit loops, progression ladders, personality moments.
 * Triggers are evaluated in App.tsx against live state.
 */

export type MilestoneCategory =
  | 'Volume' | 'Streak' | 'Money' | 'Battle' | 'Monster'
  | 'Parent' | 'Ledger' | 'Consistency' | 'Multi-kid' | 'Personality';
export type MilestoneSize     = 'small' | 'medium' | 'large';
export type MilestoneAudience = 'kid' | 'parent';

export interface MilestoneDef {
  id:        string;
  name:      string;
  icon:      string;
  image?:    ReturnType<typeof require>;
  category:  MilestoneCategory;
  size:      MilestoneSize;
  audience:  MilestoneAudience;
  tagline:   string;
  xpReward:  number;
}

export const MILESTONES: MilestoneDef[] = [

  // ─── Kid milestones (20) ─────────────────────────────────────────────────────

  // First wins — immediate dopamine
  {
    id: 'first-chore',
    name: 'First Chore',
    icon: '🐣',
    image: require('../../assets/icons/milestones/Milestone=First_Chore.png'),
    category: 'Volume',
    size: 'small',
    audience: 'kid',
    tagline: 'Completed your very first chore.',
    xpReward: 25,
  },
  {
    id: 'first-coins',
    name: 'First Coins',
    icon: '🪙',
    image: require('../../assets/icons/milestones/Milestone=First_Coins.png'),
    category: 'Money',
    size: 'small',
    audience: 'kid',
    tagline: 'Earned your first allowance.',
    xpReward: 25,
  },
  {
    id: 'first-evolution',
    name: 'First Evolution',
    icon: '✨',
    image: require('../../assets/icons/milestones/Milestone=First_Evolution.png'),
    category: 'Monster',
    size: 'large',
    audience: 'kid',
    tagline: 'Your monster evolved for the first time.',
    xpReward: 300,
  },

  // Volume — progress ladder
  {
    id: 'chores-10',
    name: 'On a Roll',
    icon: '💪',
    image: require('../../assets/icons/milestones/Milestone=On_a_Roll.png'),
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
    image: require('../../assets/icons/milestones/Milestone=Household_Hero.png'),
    category: 'Volume',
    size: 'medium',
    audience: 'kid',
    tagline: '50 chores approved. The house bows to you.',
    xpReward: 150,
  },

  // Consistency — habit formation ladder
  {
    id: 'streak-3',
    name: '3-Day Streak',
    icon: '🔥',
    image: require('../../assets/icons/milestones/Milestone=3-Day_Streak.png'),
    category: 'Streak',
    size: 'small',
    audience: 'kid',
    tagline: 'Three days in a row. Keep the fire burning.',
    xpReward: 30,
  },
  {
    id: 'no-days-off',
    name: 'No Days Off',
    icon: '📅',
    image: require('../../assets/icons/milestones/Milestone=No_Days_Off.png'),
    category: 'Consistency',
    size: 'medium',
    audience: 'kid',
    tagline: 'At least one chore every day for a week.',
    xpReward: 100,
  },
  {
    id: 'week-warrior',
    name: 'Week Warrior',
    icon: '⭐',
    image: require('../../assets/icons/milestones/Milestone=Week_Warrior.png'),
    category: 'Consistency',
    size: 'medium',
    audience: 'kid',
    tagline: 'Completed every assigned chore in a week.',
    xpReward: 200,
  },
  {
    id: 'two-peat',
    name: 'Two-Peat',
    icon: '🔄',
    image: require('../../assets/icons/milestones/Milestone=Two-Peat.png'),
    category: 'Consistency',
    size: 'medium',
    audience: 'kid',
    tagline: 'Every chore done two weeks in a row.',
    xpReward: 250,
  },
  {
    id: 'month-strong',
    name: 'Month Strong',
    icon: '🗓️',
    image: require('../../assets/icons/milestones/Milestone=Month_Strong.png'),
    category: 'Consistency',
    size: 'large',
    audience: 'kid',
    tagline: '30 days with at least one chore per day.',
    xpReward: 500,
  },

  // Money — tangible reward milestones
  {
    id: 'money-10',
    name: 'First $10 Earned',
    icon: '🐷',
    image: require('../../assets/icons/milestones/Milestone=First_$10_Earned.png'),
    category: 'Money',
    size: 'medium',
    audience: 'kid',
    tagline: 'Ten whole dollars. All yours.',
    xpReward: 75,
  },
  {
    id: 'money-100',
    name: 'First $100 Earned',
    icon: '💯',
    image: require('../../assets/icons/milestones/Milestone=First_$100_Earned.png'),
    category: 'Money',
    size: 'large',
    audience: 'kid',
    tagline: 'One hundred dollars. You did that.',
    xpReward: 500,
  },
  {
    id: 'goal-getter',
    name: 'Goal Getter',
    icon: '🎯',
    image: require('../../assets/icons/milestones/Milestone=Goal_Getter.png'),
    category: 'Money',
    size: 'large',
    audience: 'kid',
    tagline: "You set a goal and reached it. That's everything.",
    xpReward: 200,
  },

  // Battle / Boss — excitement peaks
  {
    id: 'boss-slayer',
    name: 'Boss Slayer',
    icon: '🏆',
    image: require('../../assets/icons/milestones/Milestone=Boss_Slayer.png'),
    category: 'Battle',
    size: 'large',
    audience: 'kid',
    tagline: 'Family defeats their first boss.',
    xpReward: 250,
  },
  {
    id: 'kid-undefeated',
    name: 'Undefeated',
    icon: '🛡️',
    image: require('../../assets/icons/milestones/Milestone=Undefeated.png'),
    category: 'Battle',
    size: 'large',
    audience: 'kid',
    tagline: 'Family wins 4 boss battles in a row.',
    xpReward: 300,
  },

  // Monster / Collectibles — gacha hooks
  {
    id: 'rare-find',
    name: 'Rare Find',
    icon: '🌀',
    image: require('../../assets/icons/milestones/Milestone=Rare_Find.png'),
    category: 'Monster',
    size: 'medium',
    audience: 'kid',
    tagline: 'Monster evolved into a rare variant.',
    xpReward: 100,
  },
  {
    id: 'collector',
    name: 'Collector',
    icon: '🎒',
    image: require('../../assets/icons/milestones/Milestone=Collector.png'),
    category: 'Monster',
    size: 'medium',
    audience: 'kid',
    tagline: 'Unlocked 5 collectibles.',
    xpReward: 100,
  },
  {
    id: 'full-power',
    name: 'Full Power',
    icon: '⚡',
    image: require('../../assets/icons/milestones/Milestone=Full_Power.png'),
    category: 'Monster',
    size: 'large',
    audience: 'kid',
    tagline: 'Monster reached max level.',
    xpReward: 500,
  },

  // Personality — delight & shareability
  {
    id: 'last-minute-larry',
    name: 'Last Minute Larry',
    icon: '⏰',
    image: require('../../assets/icons/milestones/Milestone=Last_Minute_Larry.png'),
    category: 'Personality',
    size: 'small',
    audience: 'kid',
    tagline: 'Completed 5+ chores on Sunday before the reveal.',
    xpReward: 50,
  },
  {
    id: 'grudging-respect',
    name: 'Grudging Respect',
    icon: '😤',
    image: require('../../assets/icons/milestones/Milestone=Grudging_Respect.png'),
    category: 'Personality',
    size: 'medium',
    audience: 'kid',
    tagline: 'Parent approved after you resubmitted a rejected chore.',
    xpReward: 50,
  },

  // ─── Parent milestones (20) ───────────────────────────────────────────────────

  // First wins
  {
    id: 'parent-first-approval',
    name: 'First Approval',
    icon: '✅',
    image: require('../../assets/icons/milestones/Milestone=First_Approval.png'),
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
    image: require('../../assets/icons/milestones/Milestone=First_Payout.png'),
    category: 'Parent',
    size: 'small',
    audience: 'parent',
    tagline: 'Paid out. They earned it.',
    xpReward: 0,
  },

  // Setup
  {
    id: 'parent-full-roster',
    name: 'Full Roster',
    icon: '📋',
    image: require('../../assets/icons/milestones/Milestone=Full_Roster.png'),
    category: 'Parent',
    size: 'medium',
    audience: 'parent',
    tagline: 'Every kid has at least one chore. The system is live.',
    xpReward: 0,
  },
  {
    id: 'parent-negotiator',
    name: 'The Negotiator',
    icon: '🤝',
    image: require('../../assets/icons/milestones/Milestone=The_Negotiator.png'),
    category: 'Parent',
    size: 'small',
    audience: 'parent',
    tagline: 'Created your first custom chore. Your rules.',
    xpReward: 0,
  },

  // Speed / power user
  {
    id: 'parent-quick-draw',
    name: 'Quick Draw',
    icon: '⚡',
    image: require('../../assets/icons/milestones/Milestone=Quick_Draw.png'),
    category: 'Parent',
    size: 'small',
    audience: 'parent',
    tagline: 'Approved in under 5 minutes. Lightning fast.',
    xpReward: 0,
  },
  {
    id: 'parent-speed-run',
    name: 'Speed Run',
    icon: '🏃',
    image: require('../../assets/icons/milestones/Milestone=Speed_Run.png'),
    category: 'Parent',
    size: 'small',
    audience: 'parent',
    tagline: 'Approved 5 chores in one day. Unstoppable.',
    xpReward: 0,
  },

  // Time-of-day quirks
  {
    id: 'parent-night-owl',
    name: 'Night Owl',
    icon: '🦉',
    image: require('../../assets/icons/milestones/Milestone=Night_Owl.png'),
    category: 'Personality',
    size: 'small',
    audience: 'parent',
    tagline: 'Approved a chore after 10pm. Dedicated.',
    xpReward: 0,
  },
  {
    id: 'parent-morning-person',
    name: 'Morning Person',
    icon: '🌅',
    image: require('../../assets/icons/milestones/Milestone=Morning_Person.png'),
    category: 'Personality',
    size: 'small',
    audience: 'parent',
    tagline: 'Approved a chore before 7am. Respect.',
    xpReward: 0,
  },

  // Ledger / money
  {
    id: 'parent-clean-slate',
    name: 'Clean Slate',
    icon: '🧹',
    image: require('../../assets/icons/milestones/Milestone=Clean_Slate.png'),
    category: 'Ledger',
    size: 'small',
    audience: 'parent',
    tagline: 'Marked all earned allowance as paid. Balanced.',
    xpReward: 0,
  },
  {
    id: 'parent-triple-digits',
    name: 'Triple Digits',
    icon: '💯',
    image: require('../../assets/icons/milestones/Milestone=Triple_Digits.png'),
    category: 'Ledger',
    size: 'medium',
    audience: 'parent',
    tagline: '$100 total paid out across all kids.',
    xpReward: 0,
  },
  {
    id: 'parent-running-tab',
    name: 'Running Tab',
    icon: '💰',
    image: require('../../assets/icons/milestones/Milestone=Running_Tab.png'),
    category: 'Ledger',
    size: 'large',
    audience: 'parent',
    tagline: '$500 paid out lifetime. Legendary.',
    xpReward: 0,
  },

  // Consistency ladder
  {
    id: 'parent-hands-on',
    name: 'Hands On',
    icon: '🖐️',
    image: require('../../assets/icons/milestones/Milestone=Hands_On.png'),
    category: 'Consistency',
    size: 'medium',
    audience: 'parent',
    tagline: 'Approved at least one chore every day for a week.',
    xpReward: 0,
  },
  {
    id: 'parent-habit-formed',
    name: 'Habit Formed',
    icon: '🔁',
    image: require('../../assets/icons/milestones/Milestone=Habit_Formed.png'),
    category: 'Consistency',
    size: 'medium',
    audience: 'parent',
    tagline: '4 weeks straight with at least one approval per week.',
    xpReward: 0,
  },
  {
    id: 'parent-month-strong',
    name: 'Month Strong',
    icon: '🗓️',
    image: require('../../assets/icons/milestones/Milestone=Month_Strong-1.png'),
    category: 'Consistency',
    size: 'medium',
    audience: 'parent',
    tagline: '30 days in. The routine is real.',
    xpReward: 0,
  },
  {
    id: 'parent-long-game',
    name: 'The Long Game',
    icon: '📈',
    image: require('../../assets/icons/milestones/Milestone=The_Long_Game.png'),
    category: 'Consistency',
    size: 'large',
    audience: 'parent',
    tagline: '90 days active. This is a lifestyle.',
    xpReward: 0,
  },

  // Multi-kid
  {
    id: 'parent-no-favourites',
    name: 'No Favourites',
    icon: '⚖️',
    image: require('../../assets/icons/milestones/Milestone=No_Favourites.png'),
    category: 'Multi-kid',
    size: 'medium',
    audience: 'parent',
    tagline: 'Approved chores for every kid in the same week.',
    xpReward: 0,
  },

  // Personality — delight & humor
  {
    id: 'parent-auditor',
    name: 'The Auditor',
    icon: '🔍',
    image: require('../../assets/icons/milestones/Milestone=The_Auditor.png'),
    category: 'Personality',
    size: 'small',
    audience: 'parent',
    tagline: "Rejected a chore submission. Didn't just rubber-stamp it.",
    xpReward: 0,
  },
  {
    id: 'parent-sunday-scaries',
    name: 'Sunday Scaries',
    icon: '😬',
    image: require('../../assets/icons/milestones/Milestone=Sunday_Scaries.png'),
    category: 'Personality',
    size: 'small',
    audience: 'parent',
    tagline: 'Opened the app within 5 minutes of the boss reveal going live.',
    xpReward: 0,
  },
  {
    id: 'parent-night-before',
    name: 'Night Before',
    icon: '🌙',
    image: require('../../assets/icons/milestones/Milestone=Night_Before.png'),
    category: 'Personality',
    size: 'small',
    audience: 'parent',
    tagline: 'Approved 10+ chores on a Saturday. Cutting it close.',
    xpReward: 0,
  },
  {
    id: 'parent-read-manual',
    name: 'Read the Manual',
    icon: '📖',
    image: require('../../assets/icons/milestones/MilestoneReadTheManual.png'),
    category: 'Personality',
    size: 'small',
    audience: 'parent',
    tagline: 'Visited Settings. Most parents never do.',
    xpReward: 0,
  },
];

export function getMilestone(id: string): MilestoneDef | undefined {
  return MILESTONES.find(m => m.id === id);
}

export const KID_MILESTONES    = MILESTONES.filter(m => m.audience === 'kid');
export const PARENT_MILESTONES = MILESTONES.filter(m => m.audience === 'parent');
