import { useState, useRef, useCallback, useEffect } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, ScrollView,
  StatusBar, Platform, Image, TextInput, Switch, Modal, KeyboardAvoidingView,
  Animated, Easing, Dimensions, PanResponder, ActionSheetIOS, FlatList, Pressable,
} from 'react-native';
import { SafeAreaView, SafeAreaProvider, useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Ellipse, Circle, Path, Polygon, Line, Defs, LinearGradient as SvgLinearGradient, RadialGradient, Stop } from 'react-native-svg';
import { EvolutionAnimation } from './src/components/EvolutionAnimation';
import { ChestReveal, type ChestTier } from './src/components/ChestReveal';
import { pickForTier, COLLECTIBLES } from './src/data/collectibles';
import { MascotBanner } from './src/components/MascotBanner';
import { CreamBg } from './src/components/CreamBg';
import { KidProfileCreation, getAvatarImage } from './src/screens/KidProfileCreation';
import { ParentOnboarding } from './src/screens/ParentOnboarding';
import { KidWelcome, KwDebugValues, KW_DEBUG_DEFAULTS } from './src/screens/KidWelcome';
import { TrophyRoom } from './src/screens/TrophyRoom';
import { saveBossCapture } from './src/storage/bossCaptures';
import { getBossDisplay } from './src/data/bossLookup';
import { getCollectibles, type CollectibleEntry } from './src/storage/collectibles';
import { earnMilestone } from './src/storage/milestones';
import { getMilestone, type MilestoneDef } from './src/data/milestones';
import { MilestoneToast } from './src/components/MilestoneToast';
import { ScreenHeading } from './src/design-system/components/ScreenHeading';
import { Button } from './src/design-system/components/Button';
import { ListCell } from './src/design-system/components/ListCell';
import { ProgressBar } from './src/design-system/components/ProgressBar';
import { PressableShadow } from './src/design-system/components/PressableShadow';
import { useFonts, FredokaOne_400Regular } from '@expo-google-fonts/fredoka-one';
import { Nunito_400Regular, Nunito_600SemiBold, Nunito_700Bold, Nunito_800ExtraBold, Nunito_900Black } from '@expo-google-fonts/nunito';
import { SpaceMono_400Regular, SpaceMono_700Bold } from '@expo-google-fonts/space-mono';
import {
  Inter_300Light,
  Inter_400Regular,
  Inter_500Medium,
  Inter_600SemiBold,
  Inter_700Bold,
  Inter_800ExtraBold,
  Inter_900Black,
} from '@expo-google-fonts/inter';
import { shadows, scale, fontSize } from './src/design-system/tokens';
import { Video, ResizeMode, Audio } from 'expo-av';
import { LinearGradient } from 'expo-linear-gradient';
import * as Clipboard from 'expo-clipboard';

// ─── Disable system accessibility font scaling globally ───────────────────────
// Our scale() utility handles all proportional sizing; allowing the OS to also
// scale fonts causes double-scaling on accessibility text-size settings.
// @ts-ignore
Text.defaultProps = { ...(Text.defaultProps ?? {}), allowFontScaling: false, adjustsFontSizeToFit: true, minimumFontScale: 0.7 };
// @ts-ignore
TextInput.defaultProps = { ...(TextInput.defaultProps ?? {}), allowFontScaling: false };

// ─── Types ────────────────────────────────────────────────────────────────────

type ChoreId = 'dishes' | 'trash' | 'bed' | 'vacuum' | 'laundry' | 'sweep' | 'wipe' | 'mop' | 'plants' | 'recycling' | 'windows' | 'bathroom';
type Tab     = 'home' | 'world' | 'wallet';
type Screen  = Tab | 'boss-intro' | 'arena' | 'result' | 'evolve' | 'goalFlow' | 'kidPayout' | 'chestReveal' | 'trophyRoom';
type MonsterIdx = 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7;

type ParentTab    = 'home' | 'chores' | 'money' | 'settings';
type ParentScreen = 'parentHome' | 'chores' | 'addChore' | 'editChore' | 'payRates' | 'rateGuide' | 'rewards' | 'settings' | 'parentPayout';
type ViewMode     = 'kid' | 'parent';

interface Chore   { id: ChoreId; name: string; icon: string | number; bg: string; xp: number; multiplier: number; }
interface Monster { name: string; level: number; needed: number; }
interface Boss {
  name: string;
  tagline: string;
  taglineHighlight?: string;
  power: number;
  bonus: number;
  captureCoins: number;       // coins awarded on capture (win)
  weakness: string;           // what chore type counters this boss
  video: ReturnType<typeof require>;
  bgImage?: ReturnType<typeof require>;   // static BG image (replaces video when set)
  bossImage?: ReturnType<typeof require>; // boss character overlay (with reveal/darkness logic)
  tiers: number[];            // monsterIdx values that can face this boss
  threat: 'Easy' | 'Medium' | 'Hard' | 'Extreme';
  threatNote: string;
  hp: number;                 // boss HP per stat table
  attackMin: number;          // boss attack roll min
  attackMax: number;          // boss attack roll max
  zapZone: 'very-wide' | 'wide' | 'normal' | 'narrow' | 'very-narrow';
}

interface ManagedChore {
  id: string; name: string; description: string;
  frequency: string; icon: string | number; bg: string;
  status: 'active' | 'pending' | 'approved' | 'rejected';
  rejectionNote?: string;
  difficulty: 1 | 2 | 3;
  assignedTo: string[];
  weeklyCompletions: number;
}

// ─── Data ─────────────────────────────────────────────────────────────────────

const CHORES: Chore[] = [
  { id: 'dishes',   name: 'Wash the dishes',          icon: require('./assets/icons/chore=iconDishes.png'),  bg: '#FFF9E6', xp: 10, multiplier: 1.0 },
  { id: 'trash',    name: 'Take out the trash',        icon: require('./assets/icons/chore=iconGarbage.png'), bg: '#F0F7F0', xp: 10, multiplier: 1.0 },
  { id: 'bed',      name: 'Make your bed',              icon: require('./assets/icons/chore=iconBed.png'),     bg: '#EAF3FB', xp: 10, multiplier: 0.5 },
  { id: 'vacuum',   name: 'Vacuum the living room',    icon: require('./assets/icons/chore=iconVacuum.png'),  bg: '#F5F0FB', xp: 25, multiplier: 2.0 },
  { id: 'laundry',  name: 'Put away laundry',           icon: require('./assets/icons/chore=iconLaundry.png'), bg: '#FFF0F0', xp: 10, multiplier: 1.0 },
  { id: 'sweep',    name: 'Sweep the kitchen',          icon: require('./assets/icons/chore=iconBroom.png'),   bg: '#FFF9E6', xp: 10, multiplier: 1.0 },
  { id: 'wipe',     name: 'Wipe down counters',         icon: require('./assets/icons/chore=iconSoap.png'),    bg: '#F0F7F0', xp: 10, multiplier: 0.5 },
  { id: 'mop',      name: 'Mop the floor',              icon: require('./assets/icons/chore=iconSoap.png'),    bg: '#EAF3FB', xp: 25, multiplier: 1.5 },
  { id: 'plants',   name: 'Water the plants',           icon: '🪴',                                            bg: '#F0F7F0', xp: 10, multiplier: 0.5 },
  { id: 'recycling',name: 'Sort the recycling',         icon: require('./assets/icons/chore=iconGarbage.png'), bg: '#F0F7F0', xp: 10, multiplier: 0.5 },
  { id: 'windows',  name: 'Clean the windows',          icon: '🪟',                                            bg: '#EAF3FB', xp: 10, multiplier: 1.0 },
  { id: 'bathroom', name: 'Clean the bathroom',         icon: require('./assets/icons/chore=iconSoap.png'),    bg: '#F5F0FB', xp: 25, multiplier: 2.5 },
];

const choreCoins = (chore: Chore, baseRate: string): number =>
  Math.round(parseFloat(baseRate) * 100 * chore.multiplier);

const fmtCoins = (cents: number): string =>
  cents >= 100 ? `$${(cents / 100).toFixed(2)}` : `${cents}¢`;

const MONSTER_FALLBACK_NAMES = [
  'Zorp','Gloop','Fizzle','Blorp','Snuggz','Wumbo','Glitch','Zappy',
  'Munchie','Wobble','Boing','Squigg','Noodlz','Chompy','Flapz','Zumi',
];
const randomFallbackName = () =>
  MONSTER_FALLBACK_NAMES[Math.floor(Math.random() * MONSTER_FALLBACK_NAMES.length)];

const MONSTERS: Monster[] = [
  { name: 'Grumble',  level: 1, needed: 100 },  // 0 → 100
  { name: 'Fanglet',  level: 2, needed: 150 },  // 100 → 250
  { name: 'Bristor',  level: 3, needed: 250 },  // 250 → 500  (Evolution 1)
  { name: 'Vexling',  level: 4, needed: 300 },  // 500 → 800
  { name: 'Thornax',  level: 5, needed: 400 },  // 800 → 1200
  { name: 'Zorphax',  level: 6, needed: 500 },  // 1200 → 1700 (Evolution 2)
  { name: 'Dreadmaw', level: 7, needed: 600 },  // 1700 → 2300
  { name: 'Vorthak',  level: 8, needed: 700 },  // 2300 → 3000 (max)
];

const BOSSES: Boss[] = [
  // ── Boss 1 — Tier 0 ────────────────────────────────────────────────────────
  {
    name: 'Lint Lurker',
    tagline: "It hid under the couch. For years.",
    taglineHighlight: 'years',
    power: 28, bonus: 75, captureCoins: 75,
    weakness: 'Sweeping',
    video: require('./assets/boss-intro.mp4'),
    bossImage: require('./assets/bosses/boss=lintlurker.png'),
    tiers: [0],
    threat: 'Easy', threatNote: 'A perfect first boss. Knock it out fast.',
    hp: 28, attackMin: 8, attackMax: 12, zapZone: 'very-wide',
  },
  // ── Boss 2 — Tier 0-1 ──────────────────────────────────────────────────────
  {
    name: 'Toothpaste Ooze',
    tagline: "It drips. It spreads. It never dries.",
    taglineHighlight: 'never dries',
    power: 34, bonus: 100, captureCoins: 100,
    weakness: 'Wiping',
    video: require('./assets/boss-intro.mp4'),
    bossImage: require('./assets/bosses/boss=toothpaste.png'),
    tiers: [0, 1],
    threat: 'Easy', threatNote: "Slow and gooey. Don't let it spread.",
    hp: 34, attackMin: 9, attackMax: 13, zapZone: 'very-wide',
  },
  // ── Boss 3 — Tier 1-2 ──────────────────────────────────────────────────────
  {
    name: 'Cracklebug',
    tagline: "Every crumb is a throne. Every floor is its kingdom.",
    taglineHighlight: 'kingdom',
    power: 40, bonus: 125, captureCoins: 125,
    weakness: 'Vacuuming',
    video: require('./assets/boss-intro.mp4'),
    bossImage: require('./assets/bosses/boss=cracklebug.png'),
    tiers: [1, 2],
    threat: 'Easy', threatNote: 'Vacuum thoroughly and it has nowhere to hide.',
    hp: 40, attackMin: 10, attackMax: 14, zapZone: 'wide',
  },
  // ── Boss 4 — Tier 2-3 ──────────────────────────────────────────────────────
  {
    name: 'The Pile',
    tagline: "You kept adding to it. Now it fights back.",
    taglineHighlight: 'fights back',
    power: 50, bonus: 150, captureCoins: 150,
    weakness: 'Organizing',
    video: require('./assets/boss-intro.mp4'),
    bossImage: require('./assets/bosses/boss=pile.png'),
    tiers: [2, 3],
    threat: 'Medium', threatNote: 'Consistent chores are your best weapon.',
    hp: 50, attackMin: 11, attackMax: 16, zapZone: 'wide',
  },
  // ── Boss 5 — Tier 3-4 ──────────────────────────────────────────────────────
  {
    name: 'Junk Giant',
    tagline: "He Collects It All. You Clean It Up.",
    taglineHighlight: 'all',
    power: 62, bonus: 200, captureCoins: 200,
    weakness: 'Organizing',
    video: require('./assets/boss-junk-giant.mp4'),
    bossImage: require('./assets/bosses/boss=junkgiant.png'),
    tiers: [3, 4],
    threat: 'Medium', threatNote: 'Many kids lose their streak here.',
    hp: 62, attackMin: 13, attackMax: 18, zapZone: 'normal',
  },
  // ── Boss 6 — Tier 4-5 ──────────────────────────────────────────────────────
  {
    name: 'The Clatter',
    tagline: "Everything you left out. Now it's angry.",
    taglineHighlight: 'angry',
    power: 76, bonus: 250, captureCoins: 250,
    weakness: 'Folding',
    video: require('./assets/boss-intro.mp4'),
    bossImage: require('./assets/bosses/boss=clatter.png'),
    tiers: [4, 5],
    threat: 'Medium', threatNote: 'Skipped chores echo loudly here.',
    hp: 76, attackMin: 15, attackMax: 20, zapZone: 'normal',
  },
  // ── Boss 7 — Tier 5-6 ──────────────────────────────────────────────────────
  {
    name: 'Grimelord',
    tagline: "Filth given form. Neglect given a name.",
    taglineHighlight: 'name',
    power: 90, bonus: 300, captureCoins: 300,
    weakness: 'Scrubbing',
    video: require('./assets/boss-intro.mp4'),
    bossImage: require('./assets/bosses/boss=grimelord.png'),
    tiers: [5, 6],
    threat: 'Hard', threatNote: "The Grimelord rewards only full effort.",
    hp: 90, attackMin: 17, attackMax: 22, zapZone: 'normal',
  },
  // ── Boss 8 — Tier 6-7 ──────────────────────────────────────────────────────
  {
    name: 'Forkfang',
    tagline: "Left in the sink too long. Now it bites.",
    taglineHighlight: 'bites',
    power: 106, bonus: 350, captureCoins: 350,
    weakness: 'Washing',
    video: require('./assets/boss-intro.mp4'),
    bossImage: require('./assets/bosses/boss=forkfang.png'),
    tiers: [6, 7],
    threat: 'Hard', threatNote: 'Full completion strongly recommended.',
    hp: 106, attackMin: 19, attackMax: 25, zapZone: 'narrow',
  },
  // ── Boss 9 — Tier 7 ────────────────────────────────────────────────────────
  {
    name: 'Vacuumbite',
    tagline: "It swallowed the last clean corner. Of everything.",
    taglineHighlight: 'everything',
    power: 124, bonus: 400, captureCoins: 400,
    weakness: 'Vacuuming',
    video: require('./assets/boss-intro.mp4'),
    bossImage: require('./assets/bosses/boss=vaccuumbite.png'),
    tiers: [7],
    threat: 'Hard', threatNote: 'Only the most consistent kids survive.',
    hp: 124, attackMin: 21, attackMax: 28, zapZone: 'narrow',
  },
  // ── Boss 10 — Tier 7 ───────────────────────────────────────────────────────
  {
    name: 'The Overflow',
    tagline: "The mess spilled over. There's no containing it.",
    taglineHighlight: 'no containing it',
    power: 145, bonus: 450, captureCoins: 450,
    weakness: 'Mopping',
    video: require('./assets/boss-intro.mp4'),
    bossImage: require('./assets/bosses/boss=overflow.png'),
    tiers: [7],
    threat: 'Extreme', threatNote: 'Extreme focus required. No missed days.',
    hp: 145, attackMin: 23, attackMax: 32, zapZone: 'narrow',
  },
  // ── Boss 11 — Tier 7 ───────────────────────────────────────────────────────
  {
    name: 'Mildew Queen',
    tagline: "She's been growing in the walls since last winter.",
    taglineHighlight: 'growing',
    power: 190, bonus: 500, captureCoins: 500,
    weakness: 'Scrubbing',
    video: require('./assets/boss-intro.mp4'),
    bossImage: require('./assets/bosses/boss=mildewqueen.png'),
    tiers: [7],
    threat: 'Extreme', threatNote: 'Top performers only. No shortcuts.',
    hp: 190, attackMin: 25, attackMax: 36, zapZone: 'very-narrow',
  },
  // ── Boss 12 — Tier 7 ───────────────────────────────────────────────────────
  {
    name: 'Dishocalypse',
    tagline: "Every dish you ignored. Every one.",
    taglineHighlight: 'every one',
    power: 190, bonus: 500, captureCoins: 500,
    weakness: 'Washing',
    video: require('./assets/boss-intro.mp4'),
    bossImage: require('./assets/bosses/boss=dishocalype.png'),
    tiers: [7],
    threat: 'Extreme', threatNote: 'Full completion strongly recommended.',
    hp: 190, attackMin: 25, attackMax: 36, zapZone: 'very-narrow',
  },
  // ── Boss 13 — Tier 7 ───────────────────────────────────────────────────────
  {
    name: 'Void Fridge',
    tagline: "What's inside? Nobody checks. That's the problem.",
    taglineHighlight: "That's the problem",
    power: 215, bonus: 550, captureCoins: 550,
    weakness: 'Cleaning',
    video: require('./assets/boss-intro.mp4'),
    bossImage: require('./assets/bosses/boss=voidfridge.png'),
    tiers: [7],
    threat: 'Extreme', threatNote: 'Top performers only. No shortcuts.',
    hp: 215, attackMin: 26, attackMax: 38, zapZone: 'very-narrow',
  },
  // ── Boss 14 — Tier 7 ───────────────────────────────────────────────────────
  {
    name: 'The Forgotten',
    tagline: "It was never cleaned. It never forgot.",
    taglineHighlight: 'never forgot',
    power: 240, bonus: 600, captureCoins: 600,
    weakness: 'Consistency',
    video: require('./assets/boss-intro.mp4'),
    bossImage: require('./assets/bosses/boss=forgotten.png'),
    tiers: [7],
    threat: 'Extreme', threatNote: 'The ultimate test. 100% completion or bust.',
    hp: 240, attackMin: 28, attackMax: 40, zapZone: 'very-narrow',
  },
];

/** Returns this week's boss for the child's current evolution tier.
 *  Rotates through the eligible pool by ISO week number so siblings
 *  on the same tier face different bosses in different weeks. */
function getWeeklyBoss(monsterIdx: MonsterIdx): Boss {
  const pool = BOSSES.filter(b => b.tiers.includes(monsterIdx));
  if (!pool.length) return BOSSES[0];
  const week = Math.floor(Date.now() / (7 * 24 * 60 * 60 * 1000)); // ms → weeks
  return pool[week % pool.length];
}

/** Returns the locked boss if one escaped, otherwise falls back to the weekly rotation. */
function resolveCurrentBoss(monsterIdx: MonsterIdx, lockedBossName: string | null): Boss {
  if (lockedBossName) {
    const locked = BOSSES.find(b => b.name === lockedBossName);
    if (locked) return locked;
  }
  return getWeeklyBoss(monsterIdx);
}

/** Days (0–6) until the next Sunday. 0 = today IS Sunday. */
function daysUntilSunday(offsetDays = 0): number {
  const day = new Date(Date.now() + offsetDays * 86_400_000).getDay(); // 0=Sun
  return day === 0 ? 0 : 7 - day;
}

/** Returns the Monday date-string for the week containing the given offset date. */
function getWeekMondayKey(offsetDays = 0): string {
  const d = new Date(Date.now() + offsetDays * 86_400_000);
  const day = d.getDay(); // 0=Sun
  const diff = day === 0 ? -6 : 1 - day; // Mon of this week
  d.setDate(d.getDate() + diff);
  d.setHours(0, 0, 0, 0);
  return d.toDateString();
}

/** Ms remaining until next Sunday midnight. */
function msUntilSunday(): number {
  const now = new Date();
  const target = new Date(now);
  const d = now.getDay();
  if (d !== 0) target.setDate(now.getDate() + (7 - d));
  target.setHours(0, 0, 0, 0);
  return Math.max(0, target.getTime() - now.getTime());
}

const FREQUENCY_OPTIONS = ['Every day', '2 times per week', '3 times per week', 'Once a week', 'As needed'];

function frequencyToWeeklyTarget(frequency: string): number {
  switch (frequency) {
    case 'Every day':        return 7;
    case '3 times per week': return 3;
    case '2 times per week': return 2;
    case 'Once a week':      return 1;
    case 'As needed':        return 1;
    default:                 return 1;
  }
}

/** Returns today's date string, offset by `days` for debug simulation. */
function getSimulatedToday(offsetDays: number = 0): string {
  if (offsetDays === 0) return new Date().toDateString();
  return new Date(Date.now() + offsetDays * 86_400_000).toDateString();
}

/** Resets eligible chores to 'active' at the start of a new day.
 *  A chore is eligible if its weeklyCompletions is below the weekly target
 *  and it is currently 'approved' or 'rejected'. 'pending' chores are left
 *  alone — the parent still needs to act on them. */
function applyDailyReset(chores: ManagedChore[]): ManagedChore[] {
  return chores.map(c => {
    const target      = frequencyToWeeklyTarget(c.frequency);
    const completions = c.weeklyCompletions ?? 0;
    if (completions < target && (c.status === 'approved' || c.status === 'rejected')) {
      return { ...c, status: 'active' as const, rejectionNote: undefined };
    }
    return c;
  });
}

const DIFFICULTY_MULTIPLIERS: Record<1 | 2 | 3, number> = { 1: 1.0, 2: 1.5, 3: 2.0 };
const XP_BY_DIFFICULTY:      Record<1 | 2 | 3, number> = { 1: 10,  2: 25,  3: 50  };
const DIFFICULTY_LABELS: Record<1 | 2 | 3, string> = { 1: 'Easy', 2: 'Medium', 3: 'Hard' };

const CHORE_ICONS: { icon: string | number; bg: string }[] = [
  { icon: require('./assets/icons/chore=iconBed.png'),     bg: '#FEF3D7' },
  { icon: require('./assets/icons/chore=iconLaundry.png'), bg: '#FFF9E6' },
  { icon: '☕',                                             bg: '#FFF0E6' },
  { icon: require('./assets/icons/chore=iconGarbage.png'), bg: '#F0F7F0' },
  { icon: '🐾',                                             bg: '#FFF9E6' },
  { icon: '🪴',                                             bg: '#F0F7F0' },
  { icon: require('./assets/icons/chore=iconDishes.png'),  bg: '#FFF9E6' },
  { icon: require('./assets/icons/chore=iconBroom.png'),   bg: '#F5F0FB' },
  { icon: require('./assets/icons/chore=iconSoap.png'),    bg: '#EAF3FB' },
  { icon: require('./assets/icons/chore=iconVacuum.png'),  bg: '#F5F0FB' },
];

const DEFAULT_MANAGED_CHORES: ManagedChore[] = [
  { id: '1', name: 'Make your bed',      description: 'Make your bed neatly every morning.', frequency: 'Every day',        difficulty: 1, assignedTo: [], icon: require('./assets/icons/chore=iconBed.png'),     bg: '#FEF3D7', status: 'active', weeklyCompletions: 0 },
  { id: '2', name: 'Fold the laundry',   description: 'Fold and put away laundry.',          frequency: 'Every day',        difficulty: 1, assignedTo: [], icon: require('./assets/icons/chore=iconLaundry.png'), bg: '#FFF9E6', status: 'active', weeklyCompletions: 0 },
  { id: '3', name: 'Clean the bathroom', description: 'Clean sink, toilet, and floor.',      frequency: '2 times per week', difficulty: 3, assignedTo: [], icon: require('./assets/icons/chore=iconSoap.png'),    bg: '#EAF3FB', status: 'active', weeklyCompletions: 0 },
  { id: '4', name: 'Take out the trash', description: 'Take all trash cans to the curb.',    frequency: '2 times per week', difficulty: 2, assignedTo: [], icon: require('./assets/icons/chore=iconGarbage.png'), bg: '#F0F7F0', status: 'active', weeklyCompletions: 0 },
  { id: '5', name: 'Water the plants',   description: 'Water all indoor and outdoor plants.',frequency: '3 times per week', difficulty: 1, assignedTo: [], icon: '🪴',                                             bg: '#F0F7F0', status: 'active', weeklyCompletions: 0 },
  { id: '6', name: 'Feed the pet',       description: 'Fill food and water bowls.',          frequency: 'Every day',        difficulty: 1, assignedTo: [], icon: '🐾',                                             bg: '#FFF9E6', status: 'active', weeklyCompletions: 0 },
  { id: '7', name: 'Vacuum the floors',  description: 'Vacuum all carpeted rooms.',           frequency: '2 times per week', difficulty: 2, assignedTo: [], icon: require('./assets/icons/chore=iconVacuum.png'), bg: '#EAF3FB', status: 'active', weeklyCompletions: 0 },
  { id: '8', name: 'Sweep & mop',        description: 'Sweep and mop the kitchen floor.',     frequency: '2 times per week', difficulty: 2, assignedTo: [], icon: require('./assets/icons/chore=iconBroom.png'),  bg: '#F5F0FB', status: 'active', weeklyCompletions: 0 },
  { id: '9', name: 'Wash the dishes',    description: 'Wash, dry, and put away dishes.',      frequency: 'Every day',        difficulty: 2, assignedTo: [], icon: require('./assets/icons/chore=iconDishes.png'), bg: '#FFF9E6', status: 'active', weeklyCompletions: 0 },
  { id: '10', name: 'Tidy your room',   description: 'Put everything back in its place.',    frequency: 'Every day',        difficulty: 1, assignedTo: [], icon: require('./assets/icons/chore=iconBroom.png'),  bg: '#F0F7F0', status: 'active', weeklyCompletions: 0 },
];

// ─── Colors ───────────────────────────────────────────────────────────────────

const C = {
  bg: '#F7F6F2', surface: '#FFFFFF', border: '#ECEAE4',
  text: '#1A1A1A', muted: '#ABABAB', hint: '#C0BEB8',
  accent: '#4C9FE8',
  gold: '#996B00', goldLight: '#FFF9E6', goldBorder: '#F0C840',
  win: '#F0F7F0', loss: '#FFF0F0',
  warmBg: '#EFEDE6',
};

function lerp(a: number, b: number, t: number) { return a + (b - a) * t; }


// ─── Win odds: weekly XP vs level threshold ───────────────────────────────────
// ≥70% of level XP → likely win (70–90%), <40% → likely loss (10–40%)

function calcWinOdds(weeklyXp: number, levelNeeded: number): number {
  const ratio = levelNeeded > 0 ? Math.min(1, weeklyXp / levelNeeded) : 0;
  if (ratio >= 0.7) return Math.round(lerp(70, 90, (ratio - 0.7) / 0.3));
  if (ratio < 0.4)  return Math.round(lerp(10, 40, ratio / 0.4));
  return Math.round(lerp(40, 70, (ratio - 0.4) / 0.3));
}

// ─── Battle narration ─────────────────────────────────────────────────────────

function battleScript(monsterName: string, bossName: string, won: boolean) {
  return won ? [
    { delay: 0,    text: `${monsterName} charges forward!`,                        bold: false },
    { delay: 900,  text: `${bossName} strikes back — ${monsterName} holds firm.`,  bold: false },
    { delay: 1900, text: `${monsterName} lands a massive hit!`,                    bold: false },
    { delay: 2900, text: `${bossName} is weakening...`,                            bold: false },
    { delay: 3700, text: `${monsterName} wins! 🎉`,                                bold: true  },
  ] : [
    { delay: 0,    text: `${monsterName} charges forward!`,                        bold: false },
    { delay: 900,  text: `${bossName} blocks and counters hard.`,                  bold: false },
    { delay: 1900, text: `${monsterName} stumbles — but doesn't give up.`,         bold: false },
    { delay: 2900, text: `${bossName} overpowers with a final blow.`,              bold: false },
    { delay: 3700, text: `${monsterName} falls. Better luck next week.`,           bold: true  },
  ];
}

// ─── Monster images ───────────────────────────────────────────────────────────

type MonsterId = 'slime' | 'robot' | 'flamer' | 'candy' | 'food';

const SLIME_IMAGES = [
  require('./assets/monstirs/slime/slimer_1.png'),
  require('./assets/monstirs/slime/slimer_2.png'),
  require('./assets/monstirs/slime/slimer_3.png'),
  require('./assets/monstirs/slime/slimer_4.png'),
  require('./assets/monstirs/slime/slimer_5.png'),
  require('./assets/monstirs/slime/slimer_6.png'),
  require('./assets/monstirs/slime/slimer_7.png'),
  require('./assets/monstirs/slime/slimer_8.png'),
];

const ROBOT_IMAGES = [
  require('./assets/monstirs/robot monstir/robot_1.png'),
  require('./assets/monstirs/robot monstir/robot_2.png'),
  require('./assets/monstirs/robot monstir/robot_3.png'),
  require('./assets/monstirs/robot monstir/robot_4.png'),
  require('./assets/monstirs/robot monstir/robot_5.png'),
  require('./assets/monstirs/robot monstir/robot_6.png'),
  require('./assets/monstirs/robot monstir/robot_7.png'),
  require('./assets/monstirs/robot monstir/robot_8.png'),
];

const FLAMER_IMAGES = [
  require('./assets/monstirs/flamer/flamer_1.png'),
  require('./assets/monstirs/flamer/flamer_2.png'),
  require('./assets/monstirs/flamer/flamer_3.png'),
  require('./assets/monstirs/flamer/flamer_4.png'),
  require('./assets/monstirs/flamer/flamer_5.png'),
  require('./assets/monstirs/flamer/flamer_6.png'),
  require('./assets/monstirs/flamer/flamer_7.png'),
  require('./assets/monstirs/flamer/flamer_8.png'),
];

/** All 8 evolution images keyed by selected monster */
const MONSTER_IMAGES_BY_KIND: Record<MonsterId, typeof SLIME_IMAGES> = {
  slime:  SLIME_IMAGES,
  robot:  ROBOT_IMAGES,
  flamer: FLAMER_IMAGES,
  candy:  SLIME_IMAGES,   // placeholder until candy assets exist
  food:   SLIME_IMAGES,   // placeholder until food assets exist
};

/** Platform image for each monster */
const PLATFORM_BY_KIND: Record<MonsterId, number> = {
  slime:  require('./assets/platforms/platformSlime.png'),
  robot:  require('./assets/platforms/platformRobot.png'),
  flamer: require('./assets/platforms/platformLava.png'),
  candy:  require('./assets/platforms/platformSlime.png'), // placeholder
  food:   require('./assets/platforms/platformSlime.png'), // placeholder
};

/** width / height aspect ratio for each platform image */
const PLATFORM_ASPECT_BY_KIND: Record<MonsterId, number> = {
  slime:  672 / 448,   // platformSlime.png natural dims
  robot:  340 / 230,   // platformRobot.png natural dims
  flamer: 672 / 448,   // platformLava.png — update if different
  candy:  672 / 448,   // placeholder
  food:   672 / 448,   // placeholder
};

// Boss SVGs — spikier and more intimidating

function BossGrumbloth({ size = 90 }: { size?: number }) {
  return (
    <Image
      source={require('./assets/spikid.png')}
      style={{ width: size, height: size }}
      resizeMode="contain"
    />
  );
}

function BossMireflax({ size = 90 }: { size?: number }) {
  return (
    <Svg viewBox="0 0 110 110" width={size} height={size}>
      <Ellipse cx="55" cy="68" rx="38" ry="33" fill="#C8A8F0" />
      <Ellipse cx="55" cy="52" rx="30" ry="27" fill="#A070D8" />
      <Polygon points="40,20 36,42 50,32"  fill="#A070D8" />
      <Polygon points="70,20 74,42 60,32"  fill="#A070D8" />
      <Polygon points="55,14 48,34 55,26 62,34" fill="#A070D8" />
      <Polygon points="30,30 28,50 42,40"  fill="#A070D8" />
      <Polygon points="80,30 82,50 68,40"  fill="#A070D8" />
      <Circle cx="43" cy="50" r="8"   fill="white" />
      <Circle cx="67" cy="50" r="8"   fill="white" />
      <Circle cx="45" cy="50" r="4.5" fill="#2A005A" />
      <Circle cx="69" cy="50" r="4.5" fill="#2A005A" />
      <Circle cx="43" cy="48" r="2"   fill="white" />
      <Circle cx="67" cy="48" r="2"   fill="white" />
      <Path d="M43 67 L48 61 L52 67 L55 61 L58 67 L62 61 L67 67" stroke="#7040A8" strokeWidth="3" fill="none" strokeLinecap="round" />
      <Ellipse cx="55" cy="92" rx="26" ry="9" fill="rgba(0,0,0,0.07)" />
    </Svg>
  );
}

function BossVorthak({ size = 90 }: { size?: number }) {
  return (
    <Svg viewBox="0 0 110 110" width={size} height={size}>
      <Ellipse cx="55" cy="70" rx="40" ry="35" fill="#2A2A4A" />
      <Ellipse cx="55" cy="52" rx="32" ry="29" fill="#3A3A6A" />
      <Polygon points="55,8 46,30 55,22 64,30"  fill="#5A5A8A" />
      <Polygon points="34,14 30,38 46,26"        fill="#5A5A8A" />
      <Polygon points="76,14 80,38 64,26"        fill="#5A5A8A" />
      <Polygon points="20,30 18,54 36,42"        fill="#5A5A8A" />
      <Polygon points="90,30 92,54 74,42"        fill="#5A5A8A" />
      <Circle cx="42" cy="50" r="9"   fill="#FF4040" />
      <Circle cx="68" cy="50" r="9"   fill="#FF4040" />
      <Circle cx="42" cy="50" r="5"   fill="#FF0000" />
      <Circle cx="68" cy="50" r="5"   fill="#FF0000" />
      <Circle cx="40" cy="48" r="2.5" fill="white" />
      <Circle cx="66" cy="48" r="2.5" fill="white" />
      <Path d="M42 68 L47 60 L51 68 L55 60 L59 68 L63 60 L68 68" stroke="#8080C0" strokeWidth="3.5" fill="none" strokeLinecap="round" />
      <Ellipse cx="55" cy="95" rx="28" ry="10" fill="rgba(0,0,0,0.15)" />
    </Svg>
  );
}

/** Returns the right image for a given monster kind + evolution level */
function monsterImgSrc(kind: MonsterId, idx: MonsterIdx) {
  return MONSTER_IMAGES_BY_KIND[kind][idx];
}
const BOSS_SVGS = [BossGrumbloth, BossMireflax, BossVorthak];

// ─── Shared primitives ────────────────────────────────────────────────────────

interface SwitcherOption { label: string; emoji: string; bg: string; image?: number; }

function ViewSwitcher({ selected, options, onSelect, dark = false }: {
  selected: string;
  options: SwitcherOption[];
  onSelect: (opt: SwitcherOption) => void;
  dark?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const scrimOpacity = useRef(new Animated.Value(0)).current;
  const sheetY      = useRef(new Animated.Value(300)).current;

  const openSheet = () => {
    setOpen(true);
    scrimOpacity.setValue(1);
    sheetY.setValue(300);
    Animated.spring(sheetY, { toValue: 0, useNativeDriver: true, tension: 65, friction: 11 }).start();
  };

  const closeSheet = (cb?: () => void) => {
    Animated.timing(sheetY, { toValue: 300, duration: 220, useNativeDriver: true, easing: Easing.in(Easing.ease) }).start(() => {
      setOpen(false);
      cb?.();
    });
  };

  return (
    <>
      <TouchableOpacity onPress={openSheet} activeOpacity={0.7} style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
        <Text style={[sw.trigger, dark && sw.triggerDark]}>{selected} ▾</Text>
      </TouchableOpacity>

      <Modal visible={open} transparent animationType="none" onRequestClose={() => closeSheet()}>
        <Animated.View style={[sw.scrim, { opacity: scrimOpacity }]}>
          <TouchableOpacity style={{ flex: 1 }} activeOpacity={1} onPress={() => closeSheet()} />
          <Animated.View style={[sw.sheet, { transform: [{ translateY: sheetY }] }]} onStartShouldSetResponder={() => true}>
            <View style={sw.sheetHandle} />
            <Text style={sw.sheetTitle}>Switch view</Text>
            {options.map((opt, i) => {
              const active = opt.label === selected;
              return (
                <TouchableOpacity
                  key={opt.label}
                  style={[sw.option, i < options.length - 1 && sw.optionBorder]}
                  activeOpacity={0.7}
                  onPress={() => closeSheet(() => onSelect(opt))}
                >
                  <View style={[sw.optionAvatar, { backgroundColor: opt.bg }]}>
                    {opt.image != null
                      ? <Image source={opt.image} style={{ width: 32, height: 32, borderRadius: 16 }} resizeMode="cover" />
                      : <Text style={{ fontSize: scale(18) }}>{opt.emoji}</Text>}
                  </View>
                  <Text style={[sw.optionLabel, active && sw.optionLabelActive]}>{opt.label}</Text>
                  {active && <Text style={sw.check}>✓</Text>}
                </TouchableOpacity>
              );
            })}
            <View style={{ height: 24 }} />
          </Animated.View>
        </Animated.View>
      </Modal>
    </>
  );
}

const sw = StyleSheet.create({
  trigger:         { fontSize: scale(18), fontFamily: 'Inter_700Bold', color: '#1A1A1A' },
  triggerDark:     { color: '#1A1A1A' },
  scrim:           { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'flex-end' },
  sheet:           { backgroundColor: '#FFFFFF', borderTopLeftRadius: 24, borderTopRightRadius: 24, borderWidth: 2, borderColor: '#1A1A1A', borderBottomWidth: 0, paddingTop: 12, overflow: 'hidden' },
  sheetHandle:     { width: 40, height: 4, borderRadius: 2, backgroundColor: '#D0CEC8', alignSelf: 'center', marginBottom: 8 },
  sheetTitle:      { fontSize: scale(12), fontFamily: 'Inter_700Bold', color: '#ABABAB', letterSpacing: 0.8, textTransform: 'uppercase', paddingHorizontal: 16, paddingTop: 6, paddingBottom: 10 },
  option:          { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 16, paddingVertical: 14 },
  optionBorder:    { borderBottomWidth: 1, borderBottomColor: '#F0EEE8' },
  optionAvatar:    { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  optionLabel:     { flex: 1, fontSize: scale(16), fontFamily: 'Inter_600SemiBold', color: '#1A1A1A' },
  optionLabelActive: { color: '#6B35F0' },
  check:           { fontSize: scale(16), color: '#6B35F0', fontFamily: 'Inter_700Bold' },
});


// ─── Avatar picker + age range ────────────────────────────────────────────────

const AGE_RANGES = ['Ages 4–6', 'Ages 7–9', 'Ages 10–12', 'Ages 13+'];
const AVATAR_INDICES = [0, 1, 2, 3, 4, 5, 6, 7] as const;

function useSheet(initialY = 300) {
  const [open, setOpen] = useState(false);
  const scrimOpacity = useRef(new Animated.Value(0)).current;
  const sheetY       = useRef(new Animated.Value(initialY)).current;

  const openSheet = () => {
    setOpen(true);
    scrimOpacity.setValue(1);
    sheetY.setValue(initialY);
    Animated.spring(sheetY, { toValue: 0, useNativeDriver: true, tension: 65, friction: 11 }).start();
  };

  const closeSheet = (cb?: () => void) => {
    Animated.timing(sheetY, { toValue: initialY, duration: 220, useNativeDriver: true, easing: Easing.in(Easing.ease) }).start(() => {
      setOpen(false);
      cb?.();
    });
  };

  return { open, openSheet, closeSheet, scrimOpacity, sheetY };
}

function AvatarPickerSheet({ selected, onSelect }: {
  selected: number;
  onSelect: (idx: number) => void;
}) {
  const { open, openSheet, closeSheet, scrimOpacity, sheetY } = useSheet();

  return (
    <>
      <TouchableOpacity style={av.trigger} onPress={openSheet} activeOpacity={0.8}>
        <Image source={getAvatarImage(selected)} style={av.triggerImg} resizeMode="cover" />
      </TouchableOpacity>

      <Modal visible={open} transparent animationType="none" onRequestClose={() => closeSheet()}>
        <Animated.View style={[av.scrim, { opacity: scrimOpacity }]}>
          <TouchableOpacity style={{ flex: 1 }} activeOpacity={1} onPress={() => closeSheet()} />
          <Animated.View style={[av.sheet, { transform: [{ translateY: sheetY }] }]} onStartShouldSetResponder={() => true}>
            <View style={av.handle} />
            <Text style={av.title}>Choose avatar</Text>
            <View style={av.grid}>
              {AVATAR_INDICES.map(idx => (
                <TouchableOpacity
                  key={idx}
                  style={[av.cell, selected === idx && av.cellActive]}
                  onPress={() => { onSelect(idx); closeSheet(); }}
                  activeOpacity={0.8}
                >
                  <Image source={getAvatarImage(idx)} style={av.cellImg} resizeMode="cover" />
                </TouchableOpacity>
              ))}
            </View>
            <View style={{ height: Platform.OS === 'ios' ? 28 : 12 }} />
          </Animated.View>
        </Animated.View>
      </Modal>
    </>
  );
}

function AgeRangeSheet({ selected, onSelect }: {
  selected: string;
  onSelect: (range: string) => void;
}) {
  const { open, openSheet, closeSheet, scrimOpacity, sheetY } = useSheet();

  function handlePress() {
    if (Platform.OS === 'ios') {
      ActionSheetIOS.showActionSheetWithOptions(
        { options: [...AGE_RANGES, 'Cancel'], cancelButtonIndex: AGE_RANGES.length, title: 'Age range' },
        (i) => { if (i < AGE_RANGES.length) onSelect(AGE_RANGES[i]); },
      );
    } else {
      openSheet();
    }
  }

  return (
    <>
      <TouchableOpacity onPress={handlePress} activeOpacity={0.7}>
        <Text style={av.ageLabel}>{selected} ▾</Text>
      </TouchableOpacity>

      <Modal visible={open} transparent animationType="none" onRequestClose={() => closeSheet()}>
        <Animated.View style={[av.scrim, { opacity: scrimOpacity }]}>
          <TouchableOpacity style={{ flex: 1 }} activeOpacity={1} onPress={() => closeSheet()} />
          <Animated.View style={[av.sheet, { transform: [{ translateY: sheetY }] }]} onStartShouldSetResponder={() => true}>
            <View style={av.handle} />
            <Text style={av.title}>Age range</Text>
            {AGE_RANGES.map((range, i) => (
              <TouchableOpacity
                key={range}
                style={[av.ageRow, i < AGE_RANGES.length - 1 && av.ageRowBorder]}
                activeOpacity={0.7}
                onPress={() => closeSheet(() => onSelect(range))}
              >
                <Text style={[av.ageRowLabel, selected === range && av.ageRowLabelActive]}>{range}</Text>
                {selected === range && <Text style={av.ageCheck}>✓</Text>}
              </TouchableOpacity>
            ))}
            <View style={{ height: Platform.OS === 'ios' ? 28 : 12 }} />
          </Animated.View>
        </Animated.View>
      </Modal>
    </>
  );
}

const PURPLE = '#6B35F0';

const av = StyleSheet.create({
  // Avatar trigger
  trigger:    { width: 50, height: 50, borderRadius: 25, overflow: 'hidden', borderWidth: 2.5, borderColor: '#1A1A1A', backgroundColor: '#fff' },
  triggerImg: { width: '100%', height: '100%' },
  // Age range trigger
  ageLabel:   { fontSize: scale(13), fontFamily: 'Inter_600SemiBold', color: '#1A1A1A', opacity: 0.55 },
  // Shared sheet chrome
  scrim:      { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'flex-end' },
  sheet:      { backgroundColor: '#fff', borderTopLeftRadius: 24, borderTopRightRadius: 24, borderWidth: 2, borderColor: '#1A1A1A', borderBottomWidth: 0, paddingTop: 12, overflow: 'hidden' },
  handle:     { width: 40, height: 4, borderRadius: 2, backgroundColor: '#D0CEC8', alignSelf: 'center', marginBottom: 8 },
  title:      { fontSize: scale(12), fontFamily: 'Inter_700Bold', color: '#ABABAB', letterSpacing: 0.8, textTransform: 'uppercase', paddingHorizontal: 16, paddingTop: 6, paddingBottom: 14 },
  // Avatar grid
  grid:       { flexDirection: 'row', flexWrap: 'wrap', paddingHorizontal: 12, paddingBottom: 4 },
  cell:       { width: '22%', margin: '1.5%', aspectRatio: 1, borderRadius: 14, overflow: 'hidden', borderWidth: 2.5, borderColor: 'transparent', backgroundColor: '#F3F1EC' },
  cellActive: { borderColor: PURPLE },
  cellImg:    { width: '100%', height: '100%' },
  // Age range rows
  ageRow:       { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 16 },
  ageRowBorder: { borderBottomWidth: 1, borderBottomColor: '#F0EEE8' },
  ageRowLabel:  { flex: 1, fontSize: scale(17), fontFamily: 'Inter_600SemiBold', color: '#1A1A1A' },
  ageRowLabelActive: { color: PURPLE },
  ageCheck:     { fontSize: scale(17), color: PURPLE, fontFamily: 'Inter_700Bold' },
});

function ChoreIcon({ icon, size }: { icon: string | number; size: number }) {
  if (typeof icon === 'number') {
    return <Image source={icon} style={{ width: size, height: size }} resizeMode="contain" />;
  }
  return <Text style={{ fontSize: size * 0.8 }}>{icon}</Text>;
}

function Header({ title, coins, showCoins = true }: { title: string; coins?: number; showCoins?: boolean }) {
  return (
    <View style={s.header}>
      <Text style={s.wordmark}>{title}</Text>
      {showCoins && coins !== undefined && (
        <View style={s.coinPill}><Text style={s.coinText}>{coins}¢</Text></View>
      )}
    </View>
  );
}

const NAV_TABS: { id: Tab; label: string; icon: ReturnType<typeof require> }[] = [
  { id: 'home',   label: 'Monsters', icon: require('./assets/icons/Property 1=navHome.png')   },
  { id: 'world',  label: 'World',    icon: require('./assets/icons/Property 1=navQuests.png') },
  { id: 'wallet', label: 'Wallet',   icon: require('./assets/icons/Property 1=navWallet.png') },
];

function TabBar({ active, onNav }: { active: Tab; onNav: (t: Tab) => void }) {
  return (
    <View style={s.tabBar} pointerEvents="box-none">
      <View style={s.tabBarInner}>
        {NAV_TABS.map(t => {
          const isActive = active === t.id;
          return (
            <TouchableOpacity
              key={t.id}
              style={s.tab}
              onPress={() => onNav(t.id)}
              activeOpacity={0.7}
            >
              <View style={[s.tabIconWrap, isActive && s.tabIconWrapActive]}>
                <Image source={t.icon} style={s.tabIcon} resizeMode="contain" />
                <Text style={[s.tabLabel, isActive && s.tabLabelActive]}>{t.label}</Text>
              </View>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
}

function ChoreRow({ chore, done, onPress, baseRate }: { chore: Chore; done: boolean; onPress: () => void; baseRate: string }) {
  return (
    <ListCell
      iconBg={chore.bg}
      icon={<ChoreIcon icon={chore.icon} size={44} />}
      title={chore.name}
      subtitle={`+${fmtCoins(choreCoins(chore, baseRate))}  ·  +${chore.xp} XP`}
      onPress={done ? undefined : onPress}
      style={done ? s.choreRowDone : undefined}
      right={
        <View style={[s.choreCheck, done && s.choreCheckDone]}>
          {done && <View style={s.checkDot} />}
        </View>
      }
    />
  );
}

// ─── Parent Tab Bar ───────────────────────────────────────────────────────────

const PARENT_NAV_ICONS: Record<ParentTab, { src: number; label: string }> = {
  home:     { src: require('./assets/icons/NavHomeParent.png'),    label: 'Home'     },
  chores:   { src: require('./assets/icons/navChores.png'),        label: 'Chores'   },
  money:    { src: require('./assets/icons/navMoney.png'),         label: 'Money'    },
  settings: { src: require('./assets/icons/navHomeSettings.png'),  label: 'Settings' },
};

function ParentTabBar({ active, onNav }: { active: ParentTab; onNav: (t: ParentTab) => void }) {
  const tabs: ParentTab[] = ['home', 'chores', 'money', 'settings'];
  return (
    <View style={s.tabBar} pointerEvents="box-none">
      <View style={s.tabBarInner}>
        {tabs.map(t => {
          const isActive = active === t;
          const { src } = PARENT_NAV_ICONS[t];
          return (
            <TouchableOpacity key={t} style={[{ flex: 1, alignItems: 'center' as const, justifyContent: 'center' as const, borderRadius: 32, paddingVertical: 6 }, isActive && s.tabIconWrapActive]} onPress={() => onNav(t)} activeOpacity={0.7}>
              <Image source={src} style={s.tabIcon} resizeMode="contain" />
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
}

// ─── Kid Screens ──────────────────────────────────────────────────────────────

function AnimatedQuestRow({ chore, done, onPress, baseRate }: { chore: Chore; done: boolean; onPress: () => void; baseRate: string }) {
  const checkScale    = useRef(new Animated.Value(done ? 1 : 0)).current;
  const sweepOpacity  = useRef(new Animated.Value(done ? 1 : 0)).current;
  const prevDone      = useRef(done);

  useEffect(() => {
    if (done && !prevDone.current) {
      Animated.parallel([
        Animated.spring(checkScale, { toValue: 1, useNativeDriver: true, tension: 280, friction: 6 }),
        Animated.timing(sweepOpacity, { toValue: 1, duration: 350, easing: Easing.out(Easing.quad), useNativeDriver: true }),
      ]).start();
    } else if (!done && prevDone.current) {
      checkScale.setValue(0);
      sweepOpacity.setValue(0);
    }
    prevDone.current = done;
  }, [done]);

  return (
    <TouchableOpacity
      style={s.homeQuestCard}
      onPress={done ? undefined : onPress}
      activeOpacity={0.7}
    >
      <Animated.View style={[s.homeQuestSweep, { opacity: sweepOpacity }]} />
      <View style={[s.homeQuestIcon, { backgroundColor: chore.bg }]}>
        <ChoreIcon icon={chore.icon} size={45} />
      </View>
      <View style={s.homeQuestInfo}>
        <Text style={[s.homeQuestTitle, done && s.homeQuestTitleDone]}>{chore.name}</Text>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
          <Text style={{ fontSize: scale(14) }}>🪙</Text>
          <Text style={s.homeQuestReward}>{fmtCoins(choreCoins(chore, baseRate))}</Text>
        </View>
      </View>
      <Animated.View style={[s.homeQuestCheck, done && s.homeQuestCheckDone, done && { transform: [{ scale: checkScale }] }]}>
        {done && <View style={s.homeQuestCheckDot} />}
      </Animated.View>
    </TouchableOpacity>
  );
}

function AnimatedManagedQuestRow({ chore, onPress, baseRate }: { chore: ManagedChore; onPress: () => void; baseRate: string }) {
  const checkScale   = useRef(new Animated.Value(chore.status === 'approved' ? 1 : 0)).current;
  const sweepOpacity = useRef(new Animated.Value(chore.status === 'approved' ? 1 : 0)).current;
  const pendingPulse = useRef(new Animated.Value(1)).current;
  const shakeX       = useRef(new Animated.Value(0)).current;
  const prevStatus   = useRef(chore.status);

  useEffect(() => {
    const prev = prevStatus.current;
    const next = chore.status;

    if (next === 'approved' && prev !== 'approved') {
      Animated.parallel([
        Animated.spring(checkScale, { toValue: 1, useNativeDriver: true, tension: 280, friction: 6 }),
        Animated.timing(sweepOpacity, { toValue: 1, duration: 350, easing: Easing.out(Easing.quad), useNativeDriver: true }),
      ]).start();
    } else if (next !== 'approved' && prev === 'approved') {
      checkScale.setValue(0);
      sweepOpacity.setValue(0);
    }

    if (next === 'rejected' && prev !== 'rejected') {
      Animated.sequence([
        Animated.timing(shakeX, { toValue: 10,  duration: 55, useNativeDriver: true }),
        Animated.timing(shakeX, { toValue: -10, duration: 55, useNativeDriver: true }),
        Animated.timing(shakeX, { toValue: 7,   duration: 55, useNativeDriver: true }),
        Animated.timing(shakeX, { toValue: -7,  duration: 55, useNativeDriver: true }),
        Animated.timing(shakeX, { toValue: 0,   duration: 55, useNativeDriver: true }),
      ]).start();
    }

    prevStatus.current = next;
  }, [chore.status]);

  useEffect(() => {
    if (chore.status === 'pending') {
      const loop = Animated.loop(
        Animated.sequence([
          Animated.timing(pendingPulse, { toValue: 0.4, duration: 900, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
          Animated.timing(pendingPulse, { toValue: 1,   duration: 900, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
        ])
      );
      loop.start();
      return () => loop.stop();
    } else {
      pendingPulse.setValue(1);
    }
  }, [chore.status]);

  const coinsAmt = Math.round(parseFloat(baseRate) * 100 * DIFFICULTY_MULTIPLIERS[chore.difficulty]);
  const isPending  = chore.status === 'pending';
  const isApproved = chore.status === 'approved';
  const isRejected = chore.status === 'rejected';
  const isTappable = chore.status === 'active' || chore.status === 'rejected';

  return (
    <Animated.View style={{ transform: [{ translateX: shakeX }] }}>
      <TouchableOpacity
        style={[
          s.homeQuestCard,
          isPending  && s.homeQuestCardPending,
          isRejected && s.homeQuestCardRejected,
        ]}
        onPress={isTappable ? onPress : undefined}
        activeOpacity={isTappable ? 0.7 : 1}
      >
        {isApproved && <Animated.View style={[s.homeQuestSweep, { opacity: sweepOpacity }]} />}
        {isPending  && <View style={s.homeQuestSweepPending} />}

        <View style={[s.homeQuestIcon, { backgroundColor: chore.bg, opacity: isPending ? 0.6 : 1 }]}>
          <ChoreIcon icon={chore.icon} size={45} />
        </View>

        <View style={s.homeQuestInfo}>
          <Text style={[s.homeQuestTitle, isApproved && s.homeQuestTitleDone]}>{chore.name}</Text>
          {isPending ? (
            <Animated.Text style={[s.pendingLabel, { opacity: pendingPulse }]}>⏳ Waiting for approval...</Animated.Text>
          ) : isRejected ? (
            <>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 3 }}>
                  <Image source={require('./assets/icons/icon-coin.png')} style={{ width: scale(14), height: scale(14) }} resizeMode="contain" />
                  <Text style={s.homeQuestReward}>{fmtCoins(coinsAmt)}</Text>
                </View>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 3 }}>
                  <Image source={require('./assets/icons/icon-star.png')} style={{ width: scale(13), height: scale(13) }} resizeMode="contain" />
                  <Text style={[s.homeQuestReward, { color: '#C47F00' }]}>{XP_BY_DIFFICULTY[chore.difficulty]} XP</Text>
                </View>
              </View>
              <View style={s.rejectionBubble}>
                <Text style={s.rejectionNote}>{chore.rejectionNote || "Let's try that again!"}</Text>
              </View>
              <Text style={s.retryLabel}>Tap to resubmit</Text>
            </>
          ) : (
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 3 }}>
                <Image source={require('./assets/icons/icon-coin.png')} style={{ width: scale(14), height: scale(14) }} resizeMode="contain" />
                <Text style={s.homeQuestReward}>{fmtCoins(coinsAmt)}</Text>
              </View>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 3 }}>
                <Image source={require('./assets/icons/icon-star.png')} style={{ width: scale(13), height: scale(13) }} resizeMode="contain" />
                <Text style={[s.homeQuestReward, { color: '#C47F00' }]}>{XP_BY_DIFFICULTY[chore.difficulty]} XP</Text>
              </View>
            </View>
          )}
        </View>

        {isPending ? (
          <Animated.View style={[s.pendingBadge, { opacity: pendingPulse }]}>
            <Text style={{ fontSize: scale(16) }}>⏳</Text>
          </Animated.View>
        ) : (
          <Animated.View style={[s.homeQuestCheck, isApproved && s.homeQuestCheckDone, isApproved && { transform: [{ scale: checkScale }] }]}>
            {isApproved && <View style={s.homeQuestCheckDot} />}
          </Animated.View>
        )}
      </TouchableOpacity>
    </Animated.View>
  );
}

type XpPop = { id: number; label: string; y: Animated.Value; opacity: Animated.Value; kind: 'xp' | 'coin' };

function HomeScreen({ monsterIdx, monsterName, xp, coins, managedChores, onCompleteManaged, currentKidName, onSwitchToParent, onOpenDebug, dbgMonsterSize, dbgMonsterY, dbgPlatformSize, dbgPlatformY, monsterImg, platformImg, platformAspect, baseRate, requireApproval, onNavigateToWallet, onRenameMonster, kidProfiles, onSwitchToKid, initialAvatarIdx }: {
  monsterIdx: MonsterIdx; monsterName: string; xp: number; coins: number;
  managedChores: ManagedChore[]; onCompleteManaged: (id: string) => void;
  currentKidName: string;
  onSwitchToParent: () => void;
  onOpenDebug: () => void;
  dbgMonsterSize: number;
  dbgMonsterY: number;
  dbgPlatformSize: number;
  dbgPlatformY: number;
  monsterImg: number;
  platformImg: number;
  platformAspect: number;
  baseRate: string;
  requireApproval: boolean;
  onNavigateToWallet: () => void;
  onRenameMonster: (name: string) => void;
  kidProfiles: { name: string; avatarColor: string; avatarIdx: number }[];
  onSwitchToKid: (name: string) => void;
  initialAvatarIdx: number;
}) {
  const monster    = MONSTERS[monsterIdx];
  const need       = monster.needed;
  const pct        = Math.min(100, Math.round((xp / need) * 100));
  const dailyChores  = managedChores.filter(c =>
    (c.assignedTo.length === 0 || c.assignedTo.includes(currentKidName))
  );
  const remaining    = dailyChores.filter(c => c.status === 'active' || c.status === 'rejected').length;
  const allDailyDone = dailyChores.length > 0 && dailyChores.every(c => c.status === 'approved');
  const allSubmitted = !allDailyDone && dailyChores.length > 0 && dailyChores.every(c => c.status === 'approved' || c.status === 'pending');
  const dollars    = (coins / 100).toFixed(2);
  const [kidAvatarIdx, setKidAvatarIdx] = useState(initialAvatarIdx);
  const [kidAgeRange,  setKidAgeRange]  = useState('Ages 7–9');
  const [showRename, setShowRename]     = useState(false);
  const [renameText, setRenameText]     = useState(monsterName);
  const [toastMsg, setToastMsg]         = useState<string | null>(null);
  const toastTimer                      = useRef<ReturnType<typeof setTimeout> | null>(null);
  const showToast = (msg: string) => {
    setToastMsg(null);
    setTimeout(() => {
      setToastMsg(msg);
      if (toastTimer.current) clearTimeout(toastTimer.current);
      toastTimer.current = setTimeout(() => setToastMsg(null), 2100);
    }, 0);
  };

  // Monster idle bob
  const bobAnim = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(bobAnim, { toValue: 1, duration: 1500, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
        Animated.timing(bobAnim, { toValue: 0, duration: 1500, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, []);
  const bobTranslate = bobAnim.interpolate({ inputRange: [0, 1], outputRange: [0, -8] });

  // Monster pulse on chore complete
  const monsterScale = useRef(new Animated.Value(1)).current;
  const pulseMonster = useCallback(() => {
    Animated.sequence([
      Animated.spring(monsterScale, { toValue: 1.14, useNativeDriver: true, tension: 300, friction: 5 }),
      Animated.spring(monsterScale, { toValue: 1, useNativeDriver: true, tension: 200, friction: 8 }),
    ]).start();
  }, []);

  // XP bar animated width (0–100 interpolated to percentage string)
  const xpWidthAnim = useRef(new Animated.Value(pct)).current;
  useEffect(() => {
    Animated.spring(xpWidthAnim, { toValue: pct, useNativeDriver: false, tension: 40, friction: 7 }).start();
  }, [pct]);

  // +XP floating popups
  const [xpPops, setXpPops] = useState<XpPop[]>([]);
  const popIdRef = useRef(0);
  const showPop = useCallback((label: string, kind: 'xp' | 'coin', delay = 0) => {
    const id = ++popIdRef.current;
    const y = new Animated.Value(0);
    const opacity = new Animated.Value(0);
    setXpPops(prev => [...prev, { id, label, y, opacity, kind }]);
    Animated.sequence([
      Animated.delay(delay),
      Animated.parallel([
        Animated.timing(opacity, { toValue: 1, duration: 120, useNativeDriver: true }),
        Animated.timing(y, { toValue: -80, duration: 1400, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
      ]),
    ]).start();
    setTimeout(() => {
      Animated.timing(opacity, { toValue: 0, duration: 700, useNativeDriver: true }).start(
        () => setXpPops(prev => prev.filter(p => p.id !== id))
      );
    }, delay + 700);
  }, []);

  const handleCompleteManaged = useCallback((c: ManagedChore) => {
    pulseMonster();
    if (requireApproval) {
      showPop('Submitted! ✋', 'xp');
    } else {
      showPop(`+${c.difficulty} XP`, 'xp');
      showPop(`+${fmtCoins(Math.round(parseFloat(baseRate) * 100 * DIFFICULTY_MULTIPLIERS[c.difficulty]))}`, 'coin', 120);
    }
    onCompleteManaged(c.id);
  }, [pulseMonster, showPop, onCompleteManaged, baseRate, requireApproval]);

  return (
    <View style={s.homeRoot}>
      <Image
        source={require('./assets/appBG.png')}
        style={{ position: 'absolute', width: '100%', aspectRatio: 1024 / 1536, bottom: 0 }}
        resizeMode="contain"
      />
      {/* Header */}
      <View style={s.homeHeader}>
        <View style={s.homeHeaderLeft}>
          <AvatarPickerSheet selected={kidAvatarIdx} onSelect={setKidAvatarIdx} />
          <View style={{ gap: 2 }}>
            <ViewSwitcher
              selected={currentKidName || 'Kid view'}
              options={[
                ...kidProfiles.map(k => ({ label: k.name, emoji: '🧒', bg: k.avatarColor || '#EAE4FF', image: getAvatarImage(k.avatarIdx) })),
                { label: 'Parent view', emoji: '👩', bg: '#C5F215' },
              ]}
              onSelect={(opt) => { if (opt.label === 'Parent view') onSwitchToParent(); else onSwitchToKid(opt.label); }}
            />
          </View>
        </View>
        <TouchableOpacity onPress={onNavigateToWallet} activeOpacity={0.75} style={s.homeBalancePill}>
          <Text style={s.homeBalanceText}>${dollars}</Text>
          <Image source={require('./assets/icons/icon-coin.png')} style={{ width: scale(20), height: scale(20) }} resizeMode="contain" />
        </TouchableOpacity>
      </View>

      <ScrollView style={{ flex: 1 }} showsVerticalScrollIndicator={false} contentContainerStyle={s.homeScroll}>
        {/* Character Card — long press opens debug menu */}
        <View style={s.homeCharCard}>
          <TouchableOpacity
            activeOpacity={1}
            onLongPress={onOpenDebug}
            delayLongPress={600}
            style={{ overflow: 'visible' }}
          >
            <View style={s.homeCharImage}>
              {/* Outer bob wraps both monster + platform so they float together */}
              <Animated.View style={{ alignItems: 'center', transform: [{ translateY: bobTranslate }, { scale: monsterScale }] }}>
                {/* Monster — independent Y offset */}
                <View style={{ transform: [{ translateY: dbgMonsterY }], zIndex: 2 }}>
                  <Image
                    source={monsterImg}
                    style={{ width: dbgMonsterSize, height: dbgMonsterSize }}
                    resizeMode="contain"
                  />
                </View>
                {/* Platform — independent Y offset */}
                <Image
                  source={platformImg}
                  style={{ width: dbgPlatformSize, height: dbgPlatformSize / platformAspect, marginTop: -60, zIndex: 1, transform: [{ translateY: dbgPlatformY }] }}
                  resizeMode="contain"
                />
              </Animated.View>
            </View>
          </TouchableOpacity>
          <View style={s.homeCharInfo}>
            <View style={s.homeCharNameRow}>
              <TouchableOpacity onPress={() => { setRenameText(monsterName); setShowRename(true); }} activeOpacity={0.7} style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                <Text style={s.homeCharName}>{monsterName}</Text>
                <Image source={require('./assets/icons/icon-pencil.png')} style={{ width: scale(16), height: scale(16), opacity: 0.5 }} resizeMode="contain" />
              </TouchableOpacity>
              <Text style={s.homeCharLevel}>LEVEL {monster.level}</Text>
            </View>
            <View style={s.homeXpTrack}>
              <Animated.View style={[s.homeXpFill, {
                width: xpWidthAnim.interpolate({ inputRange: [0, 100], outputRange: ['0%', '100%'] }),
              }]} />
            </View>
            <Text style={s.homeXpText}>{xp}/{need}xp</Text>
          </View>
        </View>

        {/* Quests Header */}
        <View style={s.homeQuestsHeader}>
          <Text style={s.homeQuestsTitle}>Today's quests</Text>
          {!allDailyDone && remaining > 0 && (
            <View style={s.homeLeftPill}>
              <Text style={s.homeLeftText}>{remaining} left</Text>
            </View>
          )}
        </View>

        {/* Quest Items or Completion Banner */}
        {allDailyDone ? (
          <View style={s.allDoneCard}>
            <Text style={s.allDoneEmoji}>🎉</Text>
            <Text style={s.allDoneTitle}>You got all your chores done!</Text>
            <Text style={s.allDoneSub}>Come back tomorrow for more</Text>
          </View>
        ) : allSubmitted ? (
          <>
            {dailyChores.map(c => (
              <AnimatedManagedQuestRow
                key={c.id}
                chore={c}
                onPress={() => handleCompleteManaged(c)}
                baseRate={baseRate}
              />
            ))}
            <View style={s.allDoneCard}>
              <Text style={s.allDoneEmoji}>⏳</Text>
              <Text style={s.allDoneTitle}>Nice work! Waiting for parent approval</Text>
              <Text style={s.allDoneSub}>Your parent will review soon</Text>
            </View>
          </>
        ) : (
          dailyChores.map(c => (
            <AnimatedManagedQuestRow
              key={c.id}
              chore={c}
              onPress={() => handleCompleteManaged(c)}
              baseRate={baseRate}
            />
          ))
        )}
      </ScrollView>

      {/* floating reward popups */}
      <View style={s.homeXpPopLayer} pointerEvents="none">
        {xpPops.map(pop => (
          <Animated.View
            key={pop.id}
            style={[
              pop.kind === 'xp' ? s.homeXpPopPill : s.homeCoinPopPill,
              { opacity: pop.opacity, transform: [{ translateY: pop.y }, { translateX: pop.kind === 'coin' ? 52 : -52 }] },
            ]}
          >
            <Text style={pop.kind === 'xp' ? s.homeXpPop : s.homeCoinPop}>{pop.label}</Text>
          </Animated.View>
        ))}
      </View>

      {/* Rename mascot modal */}
      <Modal visible={showRename} transparent animationType="fade" onRequestClose={() => setShowRename(false)}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
        <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', justifyContent: 'flex-end', paddingBottom: 32, paddingHorizontal: 16 }}>
          <View style={{ backgroundColor: '#F7F6F2', borderRadius: 24, padding: 24, gap: 16 }}>
            <Text style={{ fontSize: scale(20), fontFamily: 'Inter_900Black', color: '#1A1A1A' }}>Name your Monstir</Text>
            <TextInput
              style={{ backgroundColor: '#ECEAE4', borderRadius: 12, borderWidth: 2, borderColor: '#1A1A1A', paddingHorizontal: 16, paddingVertical: 14, fontSize: scale(16), fontFamily: 'Inter_700Bold', color: '#1A1A1A' }}
              value={renameText}
              onChangeText={setRenameText}
              autoCapitalize="words"
              placeholder="Give them a name…"
              placeholderTextColor="#ABABAB"
              maxLength={12}
              autoFocus
              returnKeyType="done"
              onSubmitEditing={() => { onRenameMonster(renameText.trim() || monsterName); setShowRename(false); showToast('Name saved!'); }}
            />
            <Button label="Save name" onPress={() => { onRenameMonster(renameText.trim() || monsterName); setShowRename(false); showToast('Name saved!'); }} />
            <TouchableOpacity onPress={() => setShowRename(false)} activeOpacity={0.7} style={{ alignItems: 'center', paddingVertical: 8 }}>
              <Text style={{ fontSize: scale(14), color: '#ABABAB', fontFamily: 'Inter_600SemiBold' }}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
        </KeyboardAvoidingView>
      </Modal>

      {toastMsg && <Toast key={toastMsg + Date.now()} message={toastMsg} />}
    </View>
  );
}

// ─── World Screen (formerly BattleScreen) ────────────────────────────────────
// Mid-week: war room / countdown. Sunday: battle is live.

function useCountdown() {
  const [ms, setMs] = useState(msUntilSunday());
  useEffect(() => {
    const id = setInterval(() => setMs(msUntilSunday()), 1000);
    return () => clearInterval(id);
  }, []);
  return ms;
}

function formatCountdown(ms: number) {
  const totalSec = Math.floor(ms / 1000);
  const d = Math.floor(totalSec / 86400);
  const h = Math.floor((totalSec % 86400) / 3600);
  const m = Math.floor((totalSec % 3600) / 60);
  if (d > 0) return `${d}D  ${h}H  ${m}M`;
  if (h > 0) return `${h}H  ${m}M`;
  return `${m}M`;
}

function countdownParts(ms: number): [string, string, string, string] {
  const totalSec = Math.floor(ms / 1000);
  const d = Math.floor(totalSec / 86400);
  const h = Math.floor((totalSec % 86400) / 3600);
  const m = Math.floor((totalSec % 3600) / 60);
  const s = totalSec % 60;
  const pad = (n: number) => String(n).padStart(2, '0');
  return [pad(d), pad(h), pad(m), pad(s)];
}

function WorldScreen({ monsterIdx, coins, done, xp, weeklyXp, managedChores, onStartBattle, onSwitchToParent, onNavigateToWallet, monsterName, kidProfiles, onSwitchToKid, currentKidName, initialAvatarIdx, currentBoss, debugDayOffset, weekApprovalDays }: {
  monsterIdx: MonsterIdx; coins: number; xp: number; weeklyXp: number;
  done: Partial<Record<ChoreId, boolean>>; managedChores: ManagedChore[];
  onStartBattle: () => void;
  onSwitchToParent: () => void;
  onNavigateToWallet: () => void;
  monsterName: string;
  kidProfiles: { name: string; avatarColor: string; avatarIdx: number }[];
  onSwitchToKid: (name: string) => void;
  currentKidName: string;
  initialAvatarIdx: number;
  currentBoss: Boss;
  debugDayOffset: number;
  weekApprovalDays: string[];
}) {
  const boss        = currentBoss;
  const monster     = MONSTERS[monsterIdx];
  const [kidAvatarIdx, setKidAvatarIdx] = useState(initialAvatarIdx);
  const [kidAgeRange,  setKidAgeRange]  = useState('Ages 7–9');
  const dollars = (coins / 100).toFixed(2);
  const totalChores = managedChores.length || 1;
  const totalWeeklyTarget = managedChores.reduce((sum, c) => sum + frequencyToWeeklyTarget(c.frequency), 0) || 1;
  const totalWeeklyDone   = managedChores.reduce((sum, c) => sum + (c.weeklyCompletions ?? 0), 0);
  const doneCount   = totalWeeklyDone;   // total completions this week (accounts for recurring chores)
  const chorePct    = Math.min(100, Math.round((totalWeeklyDone / totalWeeklyTarget) * 100));
  const winOdds     = calcWinOdds(weeklyXp, monster.needed);
  const power       = weeklyXp;
  const countdownMs = useCountdown();
  const days         = daysUntilSunday(debugDayOffset);
  const simDayOfWeek = new Date(Date.now() + debugDayOffset * 86_400_000).getDay(); // 0=Sun,6=Sat
  const isBattleDay  = days === 0;   // Sunday
  const isSaturday   = days === 1;   // Saturday — big reveal
  const isFriday     = days === 2;   // Friday — power check

  // Spec: hidden Mon–Fri, full reveal Saturday, battle Sunday
  const revealLevel       = isBattleDay || isSaturday ? 2 : 0;
  const silhouetteOpacity = revealLevel === 0 ? 0.88 : 0;

  // Teaser copy — each day of week has a distinct feel
  const teaserLine1 = isBattleDay
    ? '⚔️  BATTLE DAY!'
    : isSaturday
      ? '👁  BOSS REVEALED!'
      : isFriday
        ? '⚡  POWER CHECK'
        : 'Something stirs...';
  const teaserLine2 = isBattleDay
    ? 'Your boss awaits. Fight!'
    : isSaturday
      ? boss.tagline
      : isFriday
        ? 'How ready are you for Sunday?'
        : `Boss arrives in ${days} day${days === 1 ? '' : 's'}`;

  // Power forecast: XP remaining to reach next level
  const xpToNextLevel = Math.max(0, monster.needed - xp);
  const powerForecastMsg = xpToNextLevel === 0
    ? 'You\'re at max power — ready to evolve!'
    : `${xpToNextLevel} XP to reach Lv ${monster.level + 1}`;

  const cdParts = countdownParts(countdownMs);
  const threatSkulls = { Easy: 1, Medium: 3, Hard: 4, Extreme: 5 }[boss.threat] ?? 3;
  const threatColors: Record<string, string> = { Easy: '#3AB56A', Medium: '#6B35F0', Hard: '#F59E0B', Extreme: '#EF4444' };

  return (
    <View style={{ flex: 1, backgroundColor: '#C5F215' }}>
      {/* Texture overlay — mirrors CreamBg but with lime green */}
      <Image source={require('./assets/appBG.png')} style={{ position: 'absolute', width: '100%', aspectRatio: 1024 / 1536, bottom: 0 }} resizeMode="contain" />
      {/* Header */}
      <View style={s.homeHeader}>
        <View style={s.homeHeaderLeft}>
          <AvatarPickerSheet selected={kidAvatarIdx} onSelect={setKidAvatarIdx} />
          <View style={{ gap: 2 }}>
            <ViewSwitcher
              selected={currentKidName || 'Kid view'}
              options={[
                ...kidProfiles.map(k => ({ label: k.name, emoji: '🧒', bg: k.avatarColor || '#EAE4FF', image: getAvatarImage(k.avatarIdx) })),
                { label: 'Parent view', emoji: '👩', bg: '#C5F215' },
              ]}
              onSelect={(opt) => { if (opt.label === 'Parent view') onSwitchToParent(); else onSwitchToKid(opt.label); }}
            />
          </View>
        </View>
        <TouchableOpacity onPress={onNavigateToWallet} activeOpacity={0.75} style={s.homeBalancePill}>
          <Text style={s.homeBalanceText}>${dollars}</Text>
          <Image source={require('./assets/icons/icon-coin.png')} style={{ width: scale(20), height: scale(20) }} resizeMode="contain" />
        </TouchableOpacity>
      </View>

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ paddingHorizontal: scale(16), paddingTop: scale(8), paddingBottom: scale(120), gap: scale(12) }}
        showsVerticalScrollIndicator={false}
      >
        {/* ── Boss Card + overlapping Countdown ── */}
        <View>
          <View style={w.bossCard}>
            {/* Video always plays as the card background */}
            <Video source={boss.video} style={StyleSheet.absoluteFill} resizeMode={ResizeMode.COVER} shouldPlay isLooping isMuted />
            {/* Gradient for readability */}
            <LinearGradient colors={['rgba(0,0,0,0.05)', 'rgba(0,0,0,0.65)']} style={StyleSheet.absoluteFill} />
            {/* Boss image fades in as reveal level increases */}
            {boss.bossImage && silhouetteOpacity < 1 && (
              <Image
                source={boss.bossImage}
                style={[StyleSheet.absoluteFill, { opacity: 1 - silhouetteOpacity }]}
                resizeMode="cover"
              />
            )}
            {/* Light mystery tint when boss is still hidden */}
            {silhouetteOpacity > 0 && (
              <View style={[StyleSheet.absoluteFill, { backgroundColor: 'rgba(13,8,32,0.35)' }]} />
            )}

            {/* Top-left badge */}
            <View style={w.bossTagPill}>
              <Image source={require('./assets/icons/icon-skull.png')} style={{ width: scale(30), height: scale(30), marginRight: 5 }} resizeMode="contain" />
              <Text style={w.bossTagText}>BOSS BATTLE!</Text>
            </View>

            {/* Bottom text — extra bottom padding so countdown overlap doesn't cover it */}
            <View style={[w.bossCardContent, { paddingBottom: isBattleDay ? scale(16) : scale(80) }]}>
              <Text style={w.teaserLine1}>{teaserLine1}</Text>
              {!isBattleDay && (
                <Text style={w.teaserLine2}>
                  {'Arriving in '}
                  <Text style={{ color: '#C5F215', fontFamily: 'FredokaOne_400Regular' }}>{days} day{days !== 1 ? 's' : ''}</Text>
                </Text>
              )}
            </View>
          </View>

          {/* Countdown overlaps the bottom of the boss card */}
          {!isBattleDay && (
            <View style={w.countdownCard}>
              {(['DAYS', 'HRS', 'MINS', 'SECS'] as const).map((unit, i) => (
                <View key={unit} style={w.countdownSegment}>
                  <Text style={w.countdownNum}>{cdParts[i]}</Text>
                  <Text style={w.countdownUnit}>{unit}</Text>
                </View>
              ))}
            </View>
          )}
        </View>

        {/* ── Boss Stats ── */}
        <Text style={w.sectionHeader}>Boss stats</Text>
        <View style={w.intelRow}>
          {/* Weakness */}
          <View style={[w.intelChip, { flex: 1, gap: 12 }]}>
            <Text style={[w.sectionTitle, { letterSpacing: 0.8 }]}>WEAKNESS</Text>
            {revealLevel < 2 ? (
              <>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                  <Image source={require('./assets/icons/icon-starbox.png')} style={{ width: 48, height: 48 }} resizeMode="contain" />
                  <Text style={[w.intelValue, { fontSize: scale(16) }]}>???</Text>
                </View>
                <Text style={{ fontSize: scale(11), color: C.muted, fontFamily: 'Inter_600SemiBold' }}>Do more chores{'\n'}to unlock.</Text>
                <View style={w.unlockArrow}>
                  <Image source={require('./assets/icons/icon-lightning.png')} style={{ width: 14, height: 14 }} resizeMode="contain" />
                </View>
              </>
            ) : (
              <>
                <View style={w.weaknessPill}>
                  <Image source={require('./assets/icons/icon-starbox.png')} style={{ width: scale(16), height: scale(16) }} resizeMode="contain" />
                  <Text style={w.weaknessText}>{boss.weakness}</Text>
                </View>
              </>
            )}
          </View>

          {/* Threat Level */}
          <View style={[w.intelChip, { flex: 1, gap: 12 }]}>
            <Text style={[w.sectionTitle, { letterSpacing: 0.8 }]}>THREAT LEVEL</Text>
            <View style={{ flexDirection: 'row', gap: 4 }}>
              {[1,2,3,4,5].map(n => (
                <Image key={n} source={n <= threatSkulls ? require('./assets/icons/icon-skull.png') : require('./assets/icons/icon-skulldisabled.png')} style={{ width: scale(24), height: scale(24) }} resizeMode="contain" />
              ))}
            </View>
            <View style={[w.threatPill, { backgroundColor: threatColors[boss.threat] }]}>
              <Text style={w.threatPillText}>{boss.threat}</Text>
            </View>
            <Text style={{ fontSize: scale(11), color: C.muted, fontFamily: 'Inter_600SemiBold' }}>{boss.threatNote}</Text>
          </View>
        </View>

        {/* ── Your Stats ── */}
        <Text style={w.sectionHeader}>Your stats this week</Text>

        {/* Readiness */}
        <View style={w.sectionCard}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 14 }}>
            <Image source={require('./assets/icons/icon-lightning.png')} style={{ width: scale(18), height: scale(18) }} resizeMode="contain" />
            <Text style={[w.sectionTitle, { letterSpacing: 0.8 }]}>YOUR READINESS</Text>
          </View>
          <View style={w.readinessRow}>
            <Text style={w.readinessLabel}>Chores completed</Text>
            <Text style={w.readinessValue}>{doneCount}/{totalWeeklyTarget}</Text>
          </View>
          <ProgressBar value={chorePct} max={100} fillColor="#6B35F0" style={{ marginVertical: 8 }} />
          <View style={w.readinessRow}>
            <Text style={w.readinessLabel}>Battle power</Text>
            <Text style={[w.readinessValue, { fontSize: scale(28), color: '#6B35F0' }]}>{power}</Text>
          </View>
          <View style={[w.forecastPill, { flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 10 }]}>
            <View style={{ width: 36, height: 36, borderRadius: 8, backgroundColor: '#E0D4FF', alignItems: 'center', justifyContent: 'center' }}>
              <Image source={require('./assets/icons/icon-graph.png')} style={{ width: 22, height: 22 }} resizeMode="contain" />
            </View>
            <Text style={[w.forecastText, { flex: 1, textAlign: 'left' }]}>{powerForecastMsg}</Text>
          </View>
        </View>

        {/* What's at Stake */}
        <View style={w.sectionCard}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 14 }}>
            <Image source={require('./assets/icons/icon-trophy.png')} style={{ width: scale(18), height: scale(18) }} resizeMode="contain" />
            <Text style={[w.sectionTitle, { letterSpacing: 0.8 }]}>WHAT'S AT STAKE</Text>
          </View>
          <View style={w.stakeRow}>
            <View style={w.stakeItem}>
              <Image source={require('./assets/icons/icon-coin.png')} style={w.stakeIcon} resizeMode="contain" />
              <Text style={w.stakeVal}>{boss.captureCoins}</Text>
              <Text style={w.stakeLbl}>coins</Text>
            </View>
            <View style={w.stakeItem}>
              <Image source={require('./assets/icons/icon-star.png')} style={w.stakeIcon} resizeMode="contain" />
              <Text style={w.stakeVal}>50xp</Text>
              <Text style={w.stakeLbl}>XP</Text>
            </View>
            <View style={w.stakeItem}>
              <Image source={require('./assets/icons/icon-gem.png')} style={w.stakeIcon} resizeMode="contain" />
              <Text style={w.stakeVal}>1</Text>
              <Text style={w.stakeLbl}>shard</Text>
            </View>
          </View>
          {monsterIdx < 7 && (
            <View style={w.evolutionHint}>
              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
                <Image source={require('./assets/icons/IconStar.png')} style={{ width: 20, height: 20 }} resizeMode="contain" />
                <Text style={w.evolutionHintText}>Win this battle and {monsterName} could evolve!</Text>
              </View>
            </View>
          )}
        </View>

        {/* 7-day dot row */}
        <View style={{ flexDirection: 'row', justifyContent: 'center', gap: 8, marginBottom: 4 }}>
          {['M','T','W','T','F','S','S'].map((label, i) => {
            // i=0 Mon … i=6 Sun
            const jsDay = i === 6 ? 0 : i + 1; // convert to JS getDay()
            const todayJs = simDayOfWeek;
            const isPast = (jsDay !== 0 && todayJs !== 0 && jsDay < todayJs) ||
                           (todayJs === 0 && jsDay !== 0); // Sun = all past
            const isToday = jsDay === todayJs;
            // filled if this day had at least one approval (Mon=1..Sat=6)
            const dateForDay = new Date(Date.now() + debugDayOffset * 86_400_000);
            const diff = jsDay === 0 ? (7 - dateForDay.getDay()) % 7 : jsDay - dateForDay.getDay();
            dateForDay.setDate(dateForDay.getDate() + diff);
            const filled = weekApprovalDays.includes(dateForDay.toDateString());
            return (
              <View key={i} style={{ alignItems: 'center', gap: 3 }}>
                <View style={{
                  width: 10, height: 10, borderRadius: 5,
                  backgroundColor: filled ? '#C5F215' : isToday ? '#FFFFFF' : 'rgba(255,255,255,0.25)',
                  borderWidth: isToday ? 2 : 0, borderColor: '#C5F215',
                }} />
                <Text style={{ fontFamily: 'Inter_700Bold', fontSize: scale(9), color: isToday ? '#C5F215' : 'rgba(255,255,255,0.5)' }}>{label}</Text>
              </View>
            );
          })}
        </View>

        {/* Battle Button */}
        {isBattleDay ? (
          <PressableShadow style={w.battleBtnPurple} onPress={onStartBattle}>
            <Text style={w.battleBtnPurpleText}>⚔️  Fight Now!</Text>
          </PressableShadow>
        ) : (
          <View style={[w.battleBtnPurple, { opacity: 0.5 }]}>
            <Text style={w.battleBtnPurpleText}>
              {isSaturday ? '⚔️  Battle unlocks tomorrow' : `⚔️  Battle Day: Sunday`}
            </Text>
          </View>
        )}

        {/* DEBUG */}
        <TouchableOpacity style={s.debugBtn} onPress={onStartBattle} activeOpacity={0.7}>
          <Text style={s.debugBtnText}>🐛  Debug — trigger battle instantly</Text>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}

// ─── Battle Flow Screens ──────────────────────────────────────────────────────

function useBob(delay = 0, amplitude = 8, period = 3000) {
  const anim = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    const loop = Animated.loop(Animated.sequence([
      Animated.timing(anim, { toValue: -amplitude, duration: period / 2, delay, useNativeDriver: true, easing: Easing.inOut(Easing.ease) }),
      Animated.timing(anim, { toValue: 0,          duration: period / 2,          useNativeDriver: true, easing: Easing.inOut(Easing.ease) }),
    ]));
    loop.start();
    return () => loop.stop();
  }, []);
  return anim;
}

function useAura() {
  const anim = useRef(new Animated.Value(1)).current;
  useEffect(() => {
    const loop = Animated.loop(Animated.sequence([
      Animated.timing(anim, { toValue: 1.2, duration: 1250, useNativeDriver: true }),
      Animated.timing(anim, { toValue: 1,   duration: 1250, useNativeDriver: true }),
    ]));
    loop.start();
    return () => loop.stop();
  }, []);
  return anim;
}


// ── 3. Boss Intro Screen ──────────────────────────────────────────────────────

function BossIntroScreen({ monsterIdx, onReady, bossOverride }: {
  monsterIdx: MonsterIdx;
  onReady: () => void;
  bossOverride?: Boss;
}) {
  const { top: safeTop } = useSafeAreaInsets();
  const boss = bossOverride ?? getWeeklyBoss(monsterIdx);

  // Responsive font size: fit the longest word within available width.
  // Fredoka One glyphs are ~0.75× the font size wide on average (wide display font).
  const [word1, ...rest] = boss.name.split(' ');
  const word2 = rest.join(' ');
  const screenW      = Dimensions.get('window').width;
  const availableW   = screenW - 40; // 20px padding each side
  const longestWord  = word1.length >= word2.length ? word1 : word2;
  const sizeFromWidth = Math.floor(availableW / (longestWord.length * 0.75));
  const bossNameSize  = Math.min(scale(68), sizeFromWidth);

  const screenOpacity = useRef(new Animated.Value(0)).current;
  const nameY         = useRef(new Animated.Value(-28)).current;
  const nameOpacity   = useRef(new Animated.Value(0)).current;
  const shakeX        = useRef(new Animated.Value(0)).current;
  const cardY         = useRef(new Animated.Value(36)).current;
  const cardOpacity   = useRef(new Animated.Value(0)).current;
  const btnScale      = useRef(new Animated.Value(0.85)).current;
  const btnOpacity    = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.sequence([
      Animated.timing(screenOpacity, { toValue: 1, duration: 320, useNativeDriver: true }),
      Animated.parallel([
        Animated.timing(nameOpacity, { toValue: 1, duration: 200, useNativeDriver: true }),
        Animated.spring(nameY, { toValue: 0, friction: 6, tension: 65, useNativeDriver: true }),
      ]),
      Animated.sequence([
        Animated.timing(shakeX, { toValue: 14,  duration: 55, useNativeDriver: true }),
        Animated.timing(shakeX, { toValue: -14, duration: 55, useNativeDriver: true }),
        Animated.timing(shakeX, { toValue: 9,   duration: 45, useNativeDriver: true }),
        Animated.timing(shakeX, { toValue: -9,  duration: 45, useNativeDriver: true }),
        Animated.timing(shakeX, { toValue: 0,   duration: 35, useNativeDriver: true }),
      ]),
      Animated.parallel([
        Animated.timing(cardOpacity, { toValue: 1, duration: 280, useNativeDriver: true }),
        Animated.spring(cardY, { toValue: 0, friction: 7, tension: 80, useNativeDriver: true }),
      ]),
      Animated.parallel([
        Animated.timing(btnOpacity, { toValue: 1, duration: 220, useNativeDriver: true }),
        Animated.spring(btnScale,   { toValue: 1, friction: 5, tension: 90, useNativeDriver: true }),
      ]),
    ]).start();
  }, []);

  // Tagline with one word highlighted in slime lime
  const renderTagline = () => {
    const h = boss.taglineHighlight;
    const upper = boss.tagline.toUpperCase();
    if (!h) return <Text style={bi.tagline}>{upper}</Text>;
    const hUpper = h.toUpperCase();
    const idx = upper.indexOf(hUpper);
    if (idx === -1) return <Text style={bi.tagline}>{upper}</Text>;
    return (
      <Text style={bi.tagline}>
        {upper.slice(0, idx)}
        <Text style={[bi.tagline, { color: '#C5F215' }]}>{hUpper}</Text>
        {upper.slice(idx + hUpper.length)}
      </Text>
    );
  };

  const rewards = [
    { icon: require('./assets/icons/icon-coin.png'),   label: `${boss.captureCoins} coins` },
    { icon: require('./assets/icons/icon-star.png'), label: '50 xp'          },
    { icon: require('./assets/icons/icon-gem.png'),  label: '1 shard'        },
  ];

  return (
    <Animated.View style={{ flex: 1, opacity: screenOpacity }}>
      <StatusBar barStyle="light-content" translucent backgroundColor="transparent" />

      {/* Full-bleed video */}
      <Video
        source={boss.video}
        style={StyleSheet.absoluteFill}
        resizeMode={ResizeMode.COVER}
        shouldPlay
        isLooping
      />

      {/* Gradient: strong at top and bottom, clear in the middle */}
      <LinearGradient
        colors={['rgba(0,0,0,0.72)', 'transparent', 'rgba(0,0,0,0.88)']}
        locations={[0, 0.42, 1]}
        style={StyleSheet.absoluteFill}
      />

      <View style={{ flex: 1, paddingHorizontal: 20, paddingTop: safeTop + 16, paddingBottom: 32 }}>

        {/* BOSS BATTLE pill */}
        <View style={[bi.badgePill, { flexDirection: 'row', alignItems: 'center', gap: 6 }]}>
          <Image source={require('./assets/icons/icon-skull.png')} style={{ width: scale(16), height: scale(16) }} resizeMode="contain" />
          <Text style={bi.badgeText}><Text style={{ color: '#FFC928' }}>BOSS</Text> BATTLE! </Text>
          <Image source={require('./assets/icons/icon-lightning.png')} style={{ width: scale(14), height: scale(14) }} resizeMode="contain" />
        </View>

        {/* Boss name + tagline */}
        <Animated.View style={{ transform: [{ translateY: nameY }, { translateX: shakeX }], opacity: nameOpacity, marginTop: 10 }}>
          <View>
            {/* Line 1 — white */}
            <ScreenHeading
              textStyle={{ fontSize: bossNameSize, lineHeight: bossNameSize + 2, textAlign: 'center', color: '#FFFFFF' }}
              dropShadow={{ x: 4, y: 4 }}
            >
              {word1}
            </ScreenHeading>
            {/* Line 2 — slime lime, overlaps line 1 slightly */}
            <ScreenHeading
              style={{ marginTop: -Math.round(bossNameSize * 0.22) }}
              textStyle={{ fontSize: bossNameSize, lineHeight: bossNameSize + 2, textAlign: 'center', color: '#C5F215' }}
              dropShadow={{ x: 4, y: 4 }}
            >
              {word2}
            </ScreenHeading>
          </View>
          <View style={{ marginTop: 12, alignItems: 'center' }}>
            {renderTagline()}
          </View>
        </Animated.View>

        <View style={{ flex: 1 }} />

        {/* Possible Rewards */}
        <Animated.View style={{ opacity: cardOpacity, transform: [{ translateY: cardY }], marginBottom: 14 }}>
          <View style={bi.rewardsPill}>
            <Text style={bi.rewardsPillText}>POSSIBLE REWARDS</Text>
          </View>
          <View style={bi.rewardsCard}>
            {rewards.map((r, i) => (
              <View key={i} style={{ alignItems: 'center', gap: 6 }}>
                <Image source={r.icon} style={{ width: scale(60), height: scale(60) }} resizeMode="contain" />
                <Text style={{ fontSize: scale(14), fontWeight: '800', color: '#1A1A1A', fontFamily: 'FredokaOne_400Regular' }}>{r.label}</Text>
              </View>
            ))}
          </View>
        </Animated.View>

        {/* BATTLE! button — slime lime */}
        <Animated.View style={{ opacity: btnOpacity, transform: [{ scale: btnScale }] }}>
          <TouchableOpacity
            onPress={onReady}
            activeOpacity={0.85}
            style={bi.battleBtn}
          >
            <Text style={bi.battleBtnText}>BATTLE!</Text>
          </TouchableOpacity>
        </Animated.View>

      </View>
    </Animated.View>
  );
}

// ── 4. Result Screen ──────────────────────────────────────────────────────────

function ResultScreen({ monsterIdx, captured, bonusCoins, onDone, monsterImg, bossName }: {
  monsterIdx: MonsterIdx; captured: boolean; bonusCoins: number; onDone: () => void; monsterImg: number; bossName?: string;
}) {
  const boss = getWeeklyBoss(monsterIdx);
  const displayBossName = bossName ?? boss.name;
  return (
    <View style={{ flex: 1, backgroundColor: C.bg, alignItems: 'center', justifyContent: 'center', padding: 24, gap: 20 }}>
      {captured
        ? <Image source={require('./assets/icons/icon-trophy.png')} style={{ width: scale(56), height: scale(56) }} resizeMode="contain" />
        : <Image source={require('./assets/icons/icon-skull.png')}  style={{ width: scale(56), height: scale(56) }} resizeMode="contain" />
      }
      <Text style={{ fontSize: scale(32), fontFamily: 'Inter_900Black', color: C.text, letterSpacing: -0.5, textAlign: 'center' }}>
        {captured ? 'CAPTURED!' : `${displayBossName} got away...`}
      </Text>
      <Text style={{ fontSize: scale(15), color: C.muted, textAlign: 'center', lineHeight: scale(22) }}>
        {captured
          ? `It's yours! You earned ${bonusCoins} coins.`
          : `This time.\nIt's wounded. Keep doing your chores\nand it'll be weaker next battle.`}
      </Text>
      <TouchableOpacity
        style={{ backgroundColor: '#C5F215', borderWidth: 2, borderColor: '#1A1A1A', borderRadius: 14, paddingVertical: 16, paddingHorizontal: 40, ...SOLID_SHADOW }}
        onPress={onDone}
        activeOpacity={0.8}
      >
        <Text style={{ fontSize: scale(16), fontFamily: 'Inter_900Black', color: '#1A1A1A' }}>Back to Home</Text>
      </TouchableOpacity>
    </View>
  );
}

// ── 5. Battle Arena — helpers ─────────────────────────────────────────────────

function calcPowerRating(pct: number, idx: number, streak: number): number {
  let base: number;
  if (pct >= 100) base = 100;
  else if (pct >= 80) base = 80;
  else if (pct >= 60) base = 55;
  else if (pct >= 40) base = 30;
  else base = Math.max(5, Math.round((pct / 40) * 15));
  return base + idx * 10 + (streak >= 5 ? 5 : 0);
}

const SHARD_CAP = 12; // max shards a player can bring into a battle

function calcWeeklyShards(pct: number): number {
  if (pct >= 100) return 6;
  if (pct >= 80)  return 4;
  if (pct >= 60)  return 3;
  if (pct >= 40)  return 2;
  return 1;
}

function comboFromScore(score: number): { label: string; color: string } {
  if (score >= 90) return { label: 'UNSTOPPABLE!!',      color: '#C5F215' };
  if (score >= 75) return { label: 'Out of this world!', color: '#6B35F0' };
  if (score >= 50) return { label: 'Huge hit!',          color: '#F59E0B' };
  if (score >= 30) return { label: 'Nice combo!',        color: '#3B8A3A' };
  return              { label: 'Weak hit...',            color: '#ABABAB' };
}

// ── Mini-game: Zap Strike ─────────────────────────────────────────────────────
const ZAP_ZONES: Record<Boss['zapZone'], { green: number; yellow: number; orange: number }> = {
  'very-wide':   { green: 0.42, yellow: 0.62, orange: 0.80 },
  'wide':        { green: 0.30, yellow: 0.52, orange: 0.72 },
  'normal':      { green: 0.22, yellow: 0.44, orange: 0.66 },
  'narrow':      { green: 0.14, yellow: 0.34, orange: 0.58 },
  'very-narrow': { green: 0.08, yellow: 0.26, orange: 0.50 },
};

function ZapStrikeGame({ onScore, zapZone = 'normal' }: { onScore: (s: number) => void; zapZone?: Boss['zapZone'] }) {
  const needle    = useRef(new Animated.Value(0)).current;
  const needleRef = useRef(0);
  const [scores, setScores] = useState<number[]>([]);
  const [done,   setDone]   = useState(false);
  const TRACK_W = scale(280);
  const zones = ZAP_ZONES[zapZone];

  useEffect(() => {
    const id = needle.addListener(({ value }) => { needleRef.current = value; });
    const anim = Animated.loop(Animated.sequence([
      Animated.timing(needle, { toValue: 1, duration: 1200, useNativeDriver: false, easing: Easing.linear }),
      Animated.timing(needle, { toValue: 0, duration: 1200, useNativeDriver: false, easing: Easing.linear }),
    ]));
    anim.start();
    return () => { needle.removeListener(id); anim.stop(); };
  }, []);

  const getZapScore = (pos: number): number => {
    const p = Math.abs(pos - 0.5) * 2; // 0=center, 1=edge
    if (p < zones.green)  return 100;
    if (p < zones.yellow) return 65;
    if (p < zones.orange) return 40;
    return 0;
  };

  const handleTap = () => {
    if (done) return;
    const score = getZapScore(needleRef.current);
    setScores(prev => {
      const next = [...prev, score];
      if (next.length >= 3) {
        setDone(true);
        setTimeout(() => onScore(Math.max(...next)), 700);
      }
      return next;
    });
  };

  const zoneColor = (score: number) =>
    score >= 100 ? '#22A050' : score >= 65 ? '#C5F215' : score >= 40 ? '#F59E0B' : '#ABABAB';

  return (
    <View style={{ alignItems: 'center', gap: scale(18), paddingHorizontal: scale(20) }}>
      <Text style={b.mgTitle}>ZAP STRIKE</Text>
      <Text style={b.mgInstr}>Tap when the needle hits the green zone!</Text>

      {/* Track */}
      <View style={{ width: TRACK_W, height: scale(36), borderRadius: scale(18), overflow: 'hidden', borderWidth: 2, borderColor: '#1A1A1A', position: 'relative', backgroundColor: '#FF6B35' }}>
        <View style={{ position:'absolute', left: TRACK_W*((0.5-zones.orange)), right: TRACK_W*((0.5-zones.orange)), top:0, bottom:0, backgroundColor:'#F59E0B' }} />
        <View style={{ position:'absolute', left: TRACK_W*((0.5-zones.yellow)), right: TRACK_W*((0.5-zones.yellow)), top:0, bottom:0, backgroundColor:'#C5F215' }} />
        <View style={{ position:'absolute', left: TRACK_W*((0.5-zones.green)), right: TRACK_W*((0.5-zones.green)), top:0, bottom:0, backgroundColor:'#22A050' }} />
        <Animated.View style={{
          position:'absolute', top:0, bottom:0, width: scale(4), backgroundColor:'#1A1A1A',
          left: needle.interpolate({ inputRange:[0,1], outputRange:[0, TRACK_W - scale(4)] }),
        }} />
      </View>

      {/* Score dots */}
      <View style={{ flexDirection:'row', gap: scale(10) }}>
        {[0,1,2].map(i => (
          <View key={i} style={{ width: scale(48), height: scale(40), borderRadius: scale(10), borderWidth: 2, borderColor:'#1A1A1A',
            backgroundColor: scores[i] !== undefined ? zoneColor(scores[i]) : '#F7F6F2', alignItems:'center', justifyContent:'center' }}>
            <Text style={{ fontFamily: 'Inter_900Black', fontSize: scale(14), color:'#1A1A1A' }}>
              {scores[i] !== undefined ? scores[i] : '–'}
            </Text>
          </View>
        ))}
      </View>

      <TouchableOpacity onPress={handleTap} disabled={done}
        style={[b.mgMainBtn, done && { backgroundColor: '#ABABAB' }]} activeOpacity={0.8}>
        <Text style={b.mgMainBtnText}>{done ? '...' : `TAP! (${3 - scores.length} left)`}</Text>
      </TouchableOpacity>
    </View>
  );
}

// ── Mini-game: Frenzy ─────────────────────────────────────────────────────────
const FRENZY_THRESHOLDS = [
  { count: 9,  color: '#3B8A3A' },
  { count: 12, color: '#F59E0B' },
  { count: 15, color: '#6B35F0' },
  { count: 17, color: '#C5F215' },
];

function FrenzyGame({ onScore }: { onScore: (s: number) => void; onFlash?: (color: string) => void }) {
  const TAP_GAIN   = 0.10;
  const DRAIN      = 0.012;
  const DURATION   = 3000;
  const fillRef    = useRef(0);
  const fillAnim   = useRef(new Animated.Value(0)).current;
  const doneRef    = useRef(false);
  const startTime  = useRef(Date.now());
  const [done,     setDone]     = useState(false);
  const [timeLeft, setTimeLeft] = useState(DURATION);

  const resolve = () => {
    if (doneRef.current) return;
    doneRef.current = true;
    setDone(true);
    const score = fillRef.current >= 1 ? 100 : Math.round(fillRef.current * 100);
    setTimeout(() => onScore(score), 400);
  };

  // Combined drain + timer loop (50ms tick)
  useEffect(() => {
    const iv = setInterval(() => {
      if (doneRef.current) return;
      // Drain
      fillRef.current = Math.max(0, fillRef.current - DRAIN);
      Animated.timing(fillAnim, { toValue: fillRef.current, duration: 50, useNativeDriver: false, easing: Easing.linear }).start();
      // Timer
      const rem = Math.max(0, DURATION - (Date.now() - startTime.current));
      setTimeLeft(rem);
      if (rem <= 0) resolve();
    }, 50);
    return () => clearInterval(iv);
  }, []);

  const handleTap = () => {
    if (doneRef.current) return;
    fillRef.current = Math.min(1, fillRef.current + TAP_GAIN);
    Animated.spring(fillAnim, { toValue: fillRef.current, useNativeDriver: false, tension: 200, friction: 10 }).start();
    if (fillRef.current >= 1) resolve();
  };

  return (
    <View style={{ paddingHorizontal: scale(20) }}>
      <View style={{ backgroundColor: '#FAF9F4', borderRadius: scale(20), borderWidth: 2.5, borderColor: '#1A1A1A', padding: scale(24), gap: scale(20), ...SOLID_SHADOW }}>

        <Text style={{ fontFamily: 'Inter_800ExtraBold', fontSize: scale(18), color: '#1A1A1A', textAlign: 'center' }}>
          Tap the button to charge energy!
        </Text>

        {/* Meter row */}
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: scale(10) }}>
          <View style={{ width: scale(44), height: scale(44), borderRadius: scale(22), backgroundColor: '#FFFFFF', borderWidth: 2, borderColor: '#1A1A1A', alignItems: 'center', justifyContent: 'center', ...SOLID_SHADOW }}>
            <Image source={require('./assets/icons/icon-lightning.png')} style={{ width: scale(26), height: scale(26) }} resizeMode="contain" />
          </View>
          <View style={{ flex: 1, height: scale(28), borderRadius: scale(100), borderWidth: 2, borderColor: '#1A1A1A', backgroundColor: '#ECECEC', overflow: 'hidden', padding: 2 }}>
            <Animated.View style={{
              width: fillAnim.interpolate({ inputRange: [0, 1], outputRange: ['0%', '100%'] }) as any,
              height: '100%',
              borderRadius: scale(100),
              borderWidth: 2,
              borderColor: '#1A1A1A',
              backgroundColor: fillAnim.interpolate({
                inputRange: [0, 0.4, 0.7, 1],
                outputRange: ['#F5C842', '#F5A023', '#E86020', '#D03020'],
              }) as any,
            }} />
          </View>
        </View>

        {/* Charge button */}
        <TouchableOpacity
          onPress={handleTap}
          disabled={done}
          activeOpacity={0.75}
          style={{ backgroundColor: done ? '#ABABAB' : '#C5F215', borderRadius: scale(100), borderWidth: 2.5, borderColor: '#1A1A1A', paddingVertical: scale(18), alignItems: 'center', ...SOLID_SHADOW }}
        >
          <Text style={{ fontFamily: 'Inter_700Bold', fontSize: scale(20), color: '#1A1A1A' }}>
            {done ? '⚡ Charged!' : `Charge!  ${Math.ceil(timeLeft / 1000)}s`}
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

// ── Mini-game: Overcharge ─────────────────────────────────────────────────────
function OverchargeGame({ onScore }: { onScore: (s: number) => void }) {
  const charge    = useRef(new Animated.Value(0)).current;
  const chargeRef = useRef(0);
  const animRef   = useRef<Animated.CompositeAnimation | null>(null);
  const [chargeVal, setChargeVal] = useState(0);
  const [released,  setReleased]  = useState(false);
  const GREEN_MIN = 0.55, GREEN_MAX = 0.80;
  const BAR_H = scale(180);

  useEffect(() => {
    const id = charge.addListener(({ value }) => {
      chargeRef.current = value;
      setChargeVal(value);
    });
    return () => charge.removeListener(id);
  }, []);

  const onPressIn = () => {
    if (released) return;
    animRef.current = Animated.timing(charge, { toValue: 1, duration: 2500, useNativeDriver: false, easing: Easing.linear });
    animRef.current.start(({ finished }) => { if (finished) doRelease(); });
  };

  const doRelease = () => {
    if (released) return;
    animRef.current?.stop();
    setReleased(true);
    const pos = chargeRef.current;
    let score: number;
    if (pos >= GREEN_MIN && pos <= GREEN_MAX) {
      score = Math.round(65 + ((pos - GREEN_MIN) / (GREEN_MAX - GREEN_MIN)) * 35);
    } else if (pos > GREEN_MAX) {
      score = Math.round(Math.max(0, 65 * (1 - (pos - GREEN_MAX) / (1 - GREEN_MAX))));
    } else {
      score = Math.round((pos / GREEN_MIN) * 40);
    }
    setTimeout(() => onScore(score), 600);
  };

  const inGreen = chargeVal >= GREEN_MIN && chargeVal <= GREEN_MAX;

  return (
    <View style={{ alignItems: 'center', gap: scale(16), paddingHorizontal: scale(20) }}>
      <Text style={b.mgTitle}>OVERCHARGE</Text>
      <Text style={b.mgInstr}>Hold and release in the green zone!</Text>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: scale(16) }}>
        <View style={{ width: scale(36), height: BAR_H, borderRadius: scale(10), backgroundColor: '#ECEAE4', borderWidth: 2, borderColor: '#1A1A1A', overflow: 'hidden', position: 'relative' }}>
          <View style={{ position: 'absolute', bottom: GREEN_MIN * BAR_H, height: (GREEN_MAX - GREEN_MIN) * BAR_H, left: 0, right: 0, backgroundColor: 'rgba(197,242,21,0.35)' }} />
          <Animated.View style={{
            position: 'absolute', bottom: 0, left: 0, right: 0,
            height: charge.interpolate({ inputRange: [0, 1], outputRange: ['0%', '100%'] }) as any,
            backgroundColor: charge.interpolate({ inputRange: [0, GREEN_MIN, GREEN_MAX, 1], outputRange: ['#6B35F0', '#C5F215', '#C5F215', '#FF3B55'] }) as any,
          }} />
        </View>
        <View style={{ gap: scale(4) }}>
          <Text style={{ fontSize: scale(11), fontFamily: 'Inter_700Bold', color: '#3B8A3A' }}>← GREEN ZONE</Text>
          <Text style={{ fontSize: scale(11), fontFamily: 'Inter_700Bold', color: '#F59E0B', marginTop: scale(4) }}>← TOO MUCH</Text>
        </View>
      </View>
      <TouchableOpacity onPressIn={onPressIn} onPressOut={doRelease} disabled={released}
        style={[b.mgMainBtn, { backgroundColor: inGreen ? '#C5F215' : released ? '#ABABAB' : '#6B35F0' }]} activeOpacity={0.9}>
        <Text style={[b.mgMainBtnText, { color: inGreen ? '#1A1A1A' : '#fff' }]}>{released ? '⚡' : 'HOLD'}</Text>
      </TouchableOpacity>
    </View>
  );
}

// ── Attack name flavour text by monster type ──────────────────────────────────
const ATTACK_NAMES: Record<MonsterId, Record<string, string>> = {
  slime:  { 'zap-strike':'Goop Zap',       'frenzy':'Slime Frenzy',    'overcharge':'Ooze Overload',   'whack':'Glob Smack',     'block-breaker':'Slime Code',    'power-slash':'Goo Slash',      'earthquake':'Slime Quake',    'defuse':'Bubble Bomb',    'combo-chain':'Slime Chain',    'shake-potion':'Goo Brew',       'slingshot':'Goop Shot',     'feed-boss':'Slime Soup'    },
  flamer: { 'zap-strike':'Ember Blast',    'frenzy':'Inferno Frenzy',  'overcharge':'Magma Surge',     'whack':'Scorch Spot',    'block-breaker':'Fire Code',     'power-slash':'Flame Slash',    'earthquake':'Magma Quake',    'defuse':'Fire Bomb',      'combo-chain':'Fire Chain',     'shake-potion':'Lava Brew',      'slingshot':'Ember Shot',    'feed-boss':'Hot Pot'       },
  robot:  { 'zap-strike':'Shock Strike',   'frenzy':'Glitch Frenzy',   'overcharge':'Power Surge',     'whack':'Bug Zap',        'block-breaker':'Hack Attack',   'power-slash':'Blade Slash',    'earthquake':'System Crash',   'defuse':'Circuit Bomb',   'combo-chain':'Combo Protocol', 'shake-potion':'Circuit Brew',   'slingshot':'Rail Shot',     'feed-boss':'Debug Stew'    },
  candy:  { 'zap-strike':'Sugar Rush',     'frenzy':'Candy Frenzy',    'overcharge':'Syrup Surge',     'whack':'Jawbreaker',     'block-breaker':'Sweet Code',    'power-slash':'Lollipop Slash', 'earthquake':'Candy Quake',    'defuse':'Pop Rocks Bomb', 'combo-chain':'Sweet Chain',    'shake-potion':'Sugar Brew',     'slingshot':'Candy Shot',    'feed-boss':'Candy Cauldron'},
  food:   { 'zap-strike':'Sauce Splat',    'frenzy':'Food Fight',      'overcharge':'Grease Surge',    'whack':'Splat Smack',    'block-breaker':'Crumb Code',    'power-slash':'Noodle Slash',   'earthquake':'Kitchen Crash',  'defuse':'Mess Bomb',      'combo-chain':'Leftover Chain', 'shake-potion':'Secret Sauce',   'slingshot':'Bread Roll',    'feed-boss':'Mystery Broth' },
};
function atkName(monsterId: MonsterId, mechanic: string, fallback: string): string {
  return ATTACK_NAMES[monsterId]?.[mechanic] ?? fallback;
}

// ── Mini-game: Shake the Potion ───────────────────────────────────────────────

const INGREDIENTS = [
  { key: 'booger',   src: require('./assets/battleui/Ingredient=booger.png')   },
  { key: 'burger',   src: require('./assets/battleui/Ingredient=burger.png')   },
  { key: 'cereal',   src: require('./assets/battleui/Ingredient=cereal.png')   },
  { key: 'eyelid',   src: require('./assets/battleui/Ingredient=eyelid.png')   },
  { key: 'fang',     src: require('./assets/battleui/Ingredient=fang.png')     },
  { key: 'fish',     src: require('./assets/battleui/Ingredient=fish.png')     },
  { key: 'leaf',     src: require('./assets/battleui/Ingredient=leaf.png')     },
  { key: 'meat',     src: require('./assets/battleui/Ingredient=meat.png')     },
  { key: 'milk',     src: require('./assets/battleui/Ingredient=milk.png')     },
  { key: 'pancakes', src: require('./assets/battleui/Ingredient=pancakes.png') },
  { key: 'pizza',    src: require('./assets/battleui/Ingredient=pizza.png')    },
  { key: 'slime',    src: require('./assets/battleui/Ingredient=slime.png')    },
  { key: 'sock',     src: require('./assets/battleui/Ingredient=sock.png')     },
  { key: 'taco',     src: require('./assets/battleui/Ingredient=taco.png')     },
  { key: 'toenail',  src: require('./assets/battleui/Ingredient=toenail.png')  },
  { key: 'tooth',    src: require('./assets/battleui/Ingredient=tooth.png')    },
  { key: 'tp',       src: require('./assets/battleui/Ingredient=tp.png')       },
  { key: 'yarn',     src: require('./assets/battleui/Ingredient=yarn.png')     },
];

function ShakePotionGame({ onScore }: { onScore: (s: number) => void }) {
  const [phase,    setPhase]    = useState<'picking' | 'shaking'>('picking');
  const [selected, setSelected] = useState<string[]>([]);
  const [shown] = useState(() =>
    [...INGREDIENTS].sort(() => Math.random() - 0.5).slice(0, 4)
  );

  if (phase === 'picking') {
    const toggle = (key: string) => {
      setSelected(prev =>
        prev.includes(key) ? prev.filter(k => k !== key) : prev.length < 3 ? [...prev, key] : prev
      );
    };
    return (
      <View style={{ paddingHorizontal: scale(20) }}>
        <View style={{ backgroundColor: '#FAF9F4', borderRadius: scale(20), borderWidth: 2.5, borderColor: '#1A1A1A', padding: scale(20), gap: scale(16), alignItems: 'center', ...SOLID_SHADOW }}>
          <Text style={{ fontFamily: 'Inter_800ExtraBold', fontSize: scale(18), color: '#1A1A1A', textAlign: 'center' }}>
            Choose three ingredients!
          </Text>

          {/* Ingredient grid — 2 rows of 4 */}
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: scale(10) }}>
            {shown.map(ing => {
              const sel = selected.includes(ing.key);
              return (
                <TouchableOpacity
                  key={ing.key}
                  onPress={() => toggle(ing.key)}
                  activeOpacity={0.75}
                  style={{
                    width: scale(64), height: scale(64),
                    borderRadius: scale(32),
                    backgroundColor: sel ? '#EAE4FF' : 'transparent',
                    borderWidth: sel ? 2.5 : 0,
                    borderColor: '#6B35F0',
                    alignItems: 'center', justifyContent: 'center',
                  }}
                >
                  <Image source={ing.src} style={{ width: scale(48), height: scale(48) }} resizeMode="contain" />
                </TouchableOpacity>
              );
            })}
          </View>

          <TouchableOpacity
            onPress={() => { if (selected.length === 3) setPhase('shaking'); }}
            disabled={selected.length < 3}
            activeOpacity={0.75}
            style={{ width: '100%', backgroundColor: selected.length === 3 ? '#C5F215' : '#D0CEC8', borderRadius: scale(100), borderWidth: 2.5, borderColor: '#1A1A1A', paddingVertical: scale(18), alignItems: 'center', ...SOLID_SHADOW }}
          >
            <Text style={{ fontFamily: 'Inter_700Bold', fontSize: scale(20), color: '#1A1A1A' }}>
              {selected.length === 3 ? 'Create the potion!' : `Pick ${3 - selected.length} more`}
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return <ShakePotionShake onScore={onScore} />;
}

function ShakePotionShake({ onScore }: { onScore: (s: number) => void }) {
  const DURATION  = 3000;
  const TARGET    = 30;   // taps for 100% score
  const tapsRef   = useRef(0);
  const doneRef   = useRef(false);
  const startTime = useRef(Date.now());
  const [taps,     setTaps]     = useState(0);
  const [done,     setDone]     = useState(false);
  const [timeLeft, setTimeLeft] = useState(DURATION);

  // Shake animation (translateX + rotate)
  const shakeX   = useRef(new Animated.Value(0)).current;
  const shakeRot = useRef(new Animated.Value(0)).current;

  // Liquid colour animated 0→1
  const liquidProg = useRef(new Animated.Value(0)).current;

  const resolve = () => {
    if (doneRef.current) return;
    doneRef.current = true;
    setDone(true);
    const score = Math.min(100, Math.round((tapsRef.current / TARGET) * 100));
    setTimeout(() => onScore(score), 400);
  };

  // Timer
  useEffect(() => {
    const iv = setInterval(() => {
      if (doneRef.current) return;
      const rem = Math.max(0, DURATION - (Date.now() - startTime.current));
      setTimeLeft(rem);
      if (rem <= 0) resolve();
    }, 50);
    return () => clearInterval(iv);
  }, []);

  const triggerShake = () => {
    Animated.sequence([
      Animated.parallel([
        Animated.timing(shakeX,   { toValue: -12, duration: 40, useNativeDriver: true }),
        Animated.timing(shakeRot, { toValue: -8,  duration: 40, useNativeDriver: true }),
      ]),
      Animated.parallel([
        Animated.timing(shakeX,   { toValue: 12,  duration: 40, useNativeDriver: true }),
        Animated.timing(shakeRot, { toValue: 8,   duration: 40, useNativeDriver: true }),
      ]),
      Animated.parallel([
        Animated.timing(shakeX,   { toValue: -8,  duration: 35, useNativeDriver: true }),
        Animated.timing(shakeRot, { toValue: -5,  duration: 35, useNativeDriver: true }),
      ]),
      Animated.parallel([
        Animated.timing(shakeX,   { toValue: 0,   duration: 35, useNativeDriver: true }),
        Animated.timing(shakeRot, { toValue: 0,   duration: 35, useNativeDriver: true }),
      ]),
    ]).start();
  };

  const handleTap = () => {
    if (doneRef.current) return;
    const next = tapsRef.current + 1;
    tapsRef.current = next;
    setTaps(next);
    triggerShake();
    // Liquid colour progress
    Animated.timing(liquidProg, {
      toValue: Math.min(1, next / TARGET),
      duration: 150,
      useNativeDriver: false,
    }).start();
    if (next >= TARGET) resolve();
  };

  const rotateDeg = shakeRot.interpolate({ inputRange: [-360, 360], outputRange: ['-360deg', '360deg'] });

  // Liquid colour: purple → blue → teal → lime
  const liquidColor = liquidProg.interpolate({
    inputRange:  [0,         0.33,       0.66,       1        ],
    outputRange: ['#7C3AED', '#2563EB',  '#0891B2',  '#65A30D'],
  });

  return (
    <View style={{ paddingHorizontal: scale(20) }}>
      <View style={{ backgroundColor: '#FAF9F4', borderRadius: scale(20), borderWidth: 2.5, borderColor: '#1A1A1A', padding: scale(24), gap: scale(20), alignItems: 'center', ...SOLID_SHADOW }}>

        <Text style={{ fontFamily: 'Inter_800ExtraBold', fontSize: scale(18), color: '#1A1A1A', textAlign: 'center' }}>
          Shake the potion!
        </Text>

        {/* Potion with animated liquid colour overlay */}
        <Animated.View style={{ transform: [{ translateX: shakeX }, { rotate: rotateDeg }] }}>
          <View style={{ width: scale(120), height: scale(140), alignItems: 'center', justifyContent: 'center' }}>
            {/* Base potion image */}
            <Image
              source={require('./assets/battleui/potionicon.png')}
              style={{ width: scale(120), height: scale(140) }}
              resizeMode="contain"
            />
            {/* Colour overlay — sits on top, blend mode shifts liquid hue */}
            <Animated.View style={{
              position: 'absolute',
              width: scale(120),
              height: scale(140),
              backgroundColor: liquidColor,
              mixBlendMode: 'color',
              opacity: 0.75,
            } as any} />
          </View>
        </Animated.View>

        {/* Shake button */}
        <TouchableOpacity
          onPress={handleTap}
          disabled={done}
          activeOpacity={0.7}
          style={{ width: '100%', backgroundColor: done ? '#ABABAB' : '#C5F215', borderRadius: scale(100), borderWidth: 2.5, borderColor: '#1A1A1A', paddingVertical: scale(18), alignItems: 'center', ...SOLID_SHADOW }}
        >
          <Text style={{ fontFamily: 'Inter_700Bold', fontSize: scale(20), color: '#1A1A1A' }}>
            {done ? '✨ Done!' : `Shake!  ${Math.ceil(timeLeft / 1000)}s`}
          </Text>
        </TouchableOpacity>

      </View>
    </View>
  );
}

// ── Mini-game: Slingshot ─────────────────────────────────────────────────────
function SlingshotGame({ onScore }: { onScore: (s: number) => void }) {
  const { width: SW, height: SH } = Dimensions.get('window');
  const SHOTS    = 3;
  const HANDLE_W = scale(200);
  const HANDLE_H = scale(200);
  const SLING_L  = scale(30);   // handle left edge on screen
  const SLING_B  = scale(20);   // handle bottom offset

  // Prong tip offsets within the handle image
  const TIP_LX = HANDLE_W * 0.18;
  const TIP_LY = HANDLE_H * 0.17;
  const TIP_RX = HANDLE_W * 0.82;
  const TIP_RY = HANDLE_H * 0.17;
  // Rock rest position — midpoint between prong tips
  const REST_X = (TIP_LX + TIP_RX) / 2;

  // Rock offset from rest (0,0 = at rest in fork)
  // Rock offset animated values (0,0 = at rest in fork)
  const rockDX = useRef(new Animated.Value(0)).current;
  const rockDY = useRef(new Animated.Value(0)).current;
  const [pull, setPull] = useState({ dx: 0, dy: 0 });

  const shotsRef    = useRef(SHOTS);
  const [shotsLeft, setShotsLeft] = useState(SHOTS);
  const [firing,    setFiring]    = useState(false);
  const [done,      setDone]      = useState(false);
  const [hit,       setHit]       = useState(false);
  const [miss,      setMiss]      = useState(false);
  const totalScore                = useRef(0);
  const [containerH, setContainerH] = useState(SH * 0.5);

  // Hitzone — centred horizontally, near the top of the action area
  const HITZONE_R  = scale(52);
  const hitzoneX   = SW / 2;
  const hitzoneY   = scale(60); // from top of container

  // Rock rest position in container coordinates
  const restX = SLING_L + REST_X;
  const restY = containerH - SLING_B - HANDLE_H + (TIP_LY + scale(6));

  // Prong tips in container coordinates (for SVG bands)
  const tipLX = SLING_L + TIP_LX;
  const tipRX = SLING_L + TIP_RX;
  const tipY  = containerH - SLING_B - HANDLE_H + TIP_LY;

  // Bare-bones PanResponder — just track g.dx/g.dy, no clamping
  const panResponder = useRef(PanResponder.create({
    onStartShouldSetPanResponder: () => true,
    onMoveShouldSetPanResponder:  () => true,
    onPanResponderMove: (_, g) => {
      rockDX.setValue(g.dx);
      rockDY.setValue(g.dy);
      setPull({ dx: g.dx, dy: g.dy });
    },
    onPanResponderRelease: (_, g) => {
      const dist = Math.sqrt(g.dx * g.dx + g.dy * g.dy);
      if (dist < 10) {
        rockDX.setValue(0); rockDY.setValue(0);
        setPull({ dx: 0, dy: 0 });
        return;
      }
      const power = Math.min(1, dist / 200);

      // Hit = fired upward (pulled down, dy > 20) AND horizontal aim
      // lands within the hitzone's x-range (centre ± radius).
      const finalX = restX + (-g.dx * 4);
      const firedUp = g.dy > 20;
      const inXRange = Math.abs(finalX - hitzoneX) < HITZONE_R * 2.5;
      const isHit = firedUp && inXRange;
      totalScore.current += isHit ? Math.round(power * 100) : 0;
      setFiring(true);
      setPull({ dx: 0, dy: 0 });

      // Fly opposite to pull direction
      Animated.parallel([
        Animated.timing(rockDX, { toValue: -g.dx * 4, duration: 600, useNativeDriver: true, easing: Easing.out(Easing.quad) }),
        Animated.timing(rockDY, { toValue: -g.dy * 4, duration: 600, useNativeDriver: true, easing: Easing.out(Easing.quad) }),
      ]).start(() => {
        if (isHit) setHit(true); else setMiss(true);
        setTimeout(() => {
          setHit(false); setMiss(false);
          const next = shotsRef.current - 1;
          shotsRef.current = next;
          setShotsLeft(next);
          if (next <= 0) {
            setDone(true);
            setTimeout(() => onScore(Math.min(100, Math.round(totalScore.current / SHOTS))), 300);
          } else {
            rockDX.setValue(0); rockDY.setValue(0);
            setPull({ dx: 0, dy: 0 });
            setFiring(false);
          }
        }, 350);
      });
    },
  })).current;

  // Trajectory dots
  const dots = (() => {
    const { dx, dy } = pull;
    const dist = Math.sqrt(dx * dx + dy * dy);
    if (dist < 10) return [];
    const power = Math.min(1, dist / 200);
    const vx = -(dx / dist) * power * 20;
    const vy = -(dy / dist) * power * 20;
    return Array.from({ length: 10 }, (_, i) => {
      const t = (i + 1) * 3;
      return { x: restX + dx + vx * t, y: restY + dy + vy * t + 0.15 * t * t, op: 0.8 - i * 0.07 };
    });
  })();

  return (
    <View style={{ flex: 1 }} onLayout={e => setContainerH(e.nativeEvent.layout.height)} {...panResponder.panHandlers}>

      {/* Hitzone ring — top centre of action area */}
      {!done && (
        <View style={{
          position: 'absolute',
          top: hitzoneY - HITZONE_R,
          left: hitzoneX - HITZONE_R,
          width: HITZONE_R * 2,
          height: HITZONE_R * 2,
          borderRadius: HITZONE_R,
          borderWidth: 3,
          borderColor: hit ? '#C5F215' : 'rgba(255,255,255,0.5)',
          borderStyle: 'dashed',
          backgroundColor: hit ? 'rgba(197,242,21,0.15)' : 'rgba(255,255,255,0.08)',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1,
        }} pointerEvents="none">
          <Text style={{ fontSize: scale(22), opacity: 0.7 }}>🎯</Text>
        </View>
      )}

      {/* SVG: elastic bands + trajectory dots — zIndex 2, visually above handle */}
      <Svg width={SW} height={containerH} style={[StyleSheet.absoluteFill, { zIndex: 2 }]} pointerEvents="none">
        {dots.map((d, i) => <Circle key={i} cx={d.x} cy={d.y} r={scale(5)} fill="white" opacity={d.op} />)}
        {!firing && <>
          <Line x1={tipLX} y1={tipY} x2={restX + pull.dx} y2={restY + pull.dy} stroke="#4C1D95" strokeWidth={scale(8)} strokeLinecap="round" />
          <Line x1={tipRX} y1={tipY} x2={restX + pull.dx} y2={restY + pull.dy} stroke="#4C1D95" strokeWidth={scale(8)} strokeLinecap="round" />
        </>}
      </Svg>

      {/* Rock — zIndex 3, visually on top of everything, touches pass through */}
      <Animated.View
        pointerEvents="none"
        style={{ position: 'absolute', zIndex: 3, width: scale(58), height: scale(54), left: restX - scale(29), top: restY - scale(27), transform: [{ translateX: rockDX }, { translateY: rockDY }] }}
      >
        <Image source={require('./assets/battleui/slingshotrock.png')} style={{ width: scale(58), height: scale(54) }} resizeMode="contain" />
      </Animated.View>

      {/* Slingshot handle — visual only, zIndex 1 behind bands */}
      <View style={{ position: 'absolute', bottom: SLING_B, left: SLING_L, width: HANDLE_W, height: HANDLE_H, zIndex: 1 }}>
        <Image source={require('./assets/battleui/slingshothandle.png')} style={{ width: HANDLE_W, height: HANDLE_H }} resizeMode="contain" />
      </View>

      {/* HIT */}
      {hit && <View style={{ ...StyleSheet.absoluteFillObject, alignItems: 'center', justifyContent: 'center' }} pointerEvents="none">
        <Text style={{ fontFamily: 'FredokaOne_400Regular', fontSize: scale(52), color: '#C5F215' }}>💥 HIT!</Text>
      </View>}
      {miss && <View style={{ ...StyleSheet.absoluteFillObject, alignItems: 'center', justifyContent: 'center' }} pointerEvents="none">
        <Text style={{ fontFamily: 'FredokaOne_400Regular', fontSize: scale(52), color: '#FF6B6B' }}>Miss!</Text>
      </View>}

      {/* Ammo — vertical stack beside the slingshot */}
      <View style={{ position: 'absolute', bottom: SLING_B, left: SLING_L + HANDLE_W + scale(8), flexDirection: 'column', gap: scale(6), justifyContent: 'center', height: HANDLE_H }}>
        {Array.from({ length: SHOTS }).map((_, i) => (
          <Image key={i} source={require('./assets/battleui/slingshotrock.png')} style={{ width: scale(36), height: scale(34), opacity: i < shotsLeft ? 1 : 0.2 }} resizeMode="contain" />
        ))}
      </View>

      {!firing && !done && <View style={{ position: 'absolute', bottom: HANDLE_H + scale(40), left: 0, right: 0, alignItems: 'center' }}>
        <Text style={{ fontFamily: 'Inter_600SemiBold', fontSize: scale(15), color: 'rgba(255,255,255,0.85)' }}>Pull back and release!</Text>
      </View>}
    </View>
  );
}

// ── Mini-game: Feed the Boss ─────────────────────────────────────────────────

// Grossness score per ingredient (higher = grosser = more damage)
const GROSSNESS: Record<string, number> = {
  // Very gross
  booger:   97,
  toenail:  96,
  sock:     95,
  tp:       90,
  eyelid:   88,
  tooth:    82,
  slime:    85,
  // Kinda gross
  fang:     68,
  fish:     52,
  meat:     55,
  // Not gross (yummy foods)
  taco:     14,
  burger:   14,
  yarn:     18,
  leaf:     15,
  pizza:    12,
  milk:     12,
  cereal:   10,
  pancakes: 10,
};

const FEED_GROSS_QUIPS   = ["BLECH! That's AWFUL! 🤢", "You tricked me!! 😤", "What IS this?!", "I'm gonna be sick...", "DISGUSTING! 😫"];
const FEED_MEDIUM_QUIPS  = ["Hmm... not bad...", "I've had worse.", "Could be grosser.", "Meh. 😐"];
const FEED_YUMMY_QUIPS   = ["Mmm! Delicious! 😋", "PERFECT! More please!", "Now THAT'S a brew!", "Ooh yummy! 😍"];

function FeedBossGame({ onScore, onBossReact }: { onScore: (s: number) => void; onBossReact: (text: string) => void }) {
  const NEEDED = 3;
  const { width: SW } = Dimensions.get('window');

  // Pick 4 random ingredients
  const [shown] = useState(() =>
    [...INGREDIENTS].sort(() => Math.random() - 0.5).slice(0, 4)
  );

  const [dropped, setDropped]       = useState<string[]>([]);
  const droppedRef                  = useRef<string[]>([]);
  const [splashing, setSplashing]   = useState<string | null>(null);
  const doneRef2                    = useRef(false);
  const [done, setDone]             = useState(false);
  const cauldronRef = useRef<View>(null);
  const cauldronScreen = useRef({ x: 0, y: 0, width: 0, height: 0 });

  // Per-ingredient animated positions
  const anims = useRef(shown.map(() => ({
    x: new Animated.Value(0),
    y: new Animated.Value(0),
    opacity: new Animated.Value(1),
  }))).current;

  const dropIngredient = (key: string, idx: number) => {
    if (droppedRef.current.includes(key) || doneRef2.current) return;
    const next = [...droppedRef.current, key];
    droppedRef.current = next;
    setSplashing(key);
    Animated.timing(anims[idx].opacity, { toValue: 0, duration: 400, useNativeDriver: true }).start(() => {
      setSplashing(null);
      setDropped([...next]);
      if (next.length >= NEEDED) {
        doneRef2.current = true;
        setDone(true);
        const gross = next.reduce((sum, k) => sum + (GROSSNESS[k] ?? 30), 0) / NEEDED;
        const quips = gross > 70 ? FEED_GROSS_QUIPS : gross > 40 ? FEED_MEDIUM_QUIPS : FEED_YUMMY_QUIPS;
        setTimeout(() => onBossReact(quips[Math.floor(Math.random() * quips.length)]), 200);
        setTimeout(() => onScore(Math.min(100, Math.round(gross))), 900);
      }
    });
  };

  const makePanResponder = (key: string, idx: number) =>
    PanResponder.create({
      onStartShouldSetPanResponder: () => !droppedRef.current.includes(key) && !doneRef2.current,
      onMoveShouldSetPanResponder:  () => !droppedRef.current.includes(key) && !doneRef2.current,
      onPanResponderMove: (_, g) => {
        anims[idx].x.setValue(g.dx);
        anims[idx].y.setValue(g.dy);
      },
      onPanResponderRelease: (_, g) => {
        // Check if released over cauldron
        const { x, y, width, height } = cauldronScreen.current;
        const cx = x + width / 2;
        const cy = y + height / 2;
        const dist = Math.sqrt((g.moveX - cx) ** 2 + (g.moveY - cy) ** 2);

        if (dist < width * 0.8) {
          dropIngredient(key, idx);
        } else {
          // Snap back
          Animated.parallel([
            Animated.spring(anims[idx].x, { toValue: 0, useNativeDriver: true }),
            Animated.spring(anims[idx].y, { toValue: 0, useNativeDriver: true }),
          ]).start();
        }
      },
    });

  const panResponders = useRef(shown.map((ing, i) => makePanResponder(ing.key, i))).current;

  // Liquid colour darkens as gross ingredients go in
  const grossSoFar = dropped.reduce((s, k) => s + (GROSSNESS[k] ?? 30), 0) / Math.max(1, dropped.length);
  const liquidColor = grossSoFar > 70 ? '#2D4A1E' : grossSoFar > 40 ? '#4A2D6B' : '#6B35F0';

  return (
    <View style={{ paddingHorizontal: scale(16) }}>
      <View style={{ backgroundColor: '#FAF9F4', borderRadius: scale(20), borderWidth: 2.5, borderColor: '#1A1A1A', padding: scale(20), alignItems: 'center', gap: scale(16), ...SOLID_SHADOW }}>

        <Text style={{ fontFamily: 'Inter_800ExtraBold', fontSize: scale(18), color: '#1A1A1A', textAlign: 'center' }}>
          Make the yuckiest brew!
        </Text>

        {/* Cauldron */}
        <View ref={cauldronRef} onLayout={() => {
          cauldronRef.current?.measureInWindow((x, y, width, height) => {
            cauldronScreen.current = { x, y, width, height };
          });
        }}>
          <Image
            source={require('./assets/battleui/cauldron.png')}
            style={{ width: scale(130), height: scale(120) }}
            resizeMode="contain"
          />
          {/* Ingredient count badge */}
          <View style={{ position: 'absolute', top: -scale(8), right: -scale(8), width: scale(28), height: scale(28), borderRadius: scale(14), backgroundColor: dropped.length === NEEDED ? '#C5F215' : '#6B35F0', borderWidth: 2, borderColor: '#1A1A1A', alignItems: 'center', justifyContent: 'center' }}>
            <Text style={{ fontFamily: 'Inter_900Black', fontSize: scale(13), color: '#1A1A1A' }}>{dropped.length}</Text>
          </View>
        </View>

        {/* Ingredients row — draggable */}
        <View style={{ flexDirection: 'row', justifyContent: 'center', gap: scale(12), width: '100%' }}>
          {shown.map((ing, i) => {
            const isDropped = dropped.includes(ing.key);
            return (
              <Animated.View
                key={ing.key}
                style={{
                  opacity: isDropped ? 0.15 : anims[i].opacity,
                  transform: [{ translateX: anims[i].x }, { translateY: anims[i].y }],
                }}
                {...(!isDropped ? panResponders[i].panHandlers : {})}
              >
                <View style={{ width: scale(60), height: scale(60), borderRadius: scale(30), backgroundColor: isDropped ? '#F0F0F0' : '#EAE4FF', borderWidth: 2, borderColor: isDropped ? '#D0D0D0' : '#6B35F0', alignItems: 'center', justifyContent: 'center' }}>
                  <Image source={ing.src} style={{ width: scale(44), height: scale(44) }} resizeMode="contain" />
                </View>
              </Animated.View>
            );
          })}
        </View>

        {done && (
          <Text style={{ fontFamily: 'Inter_800ExtraBold', fontSize: scale(16), color: '#6B35F0', textAlign: 'center' }}>
            {grossSoFar > 70 ? '🤢 Disgustingly perfect!' : grossSoFar > 40 ? '😬 Pretty gross!' : '😅 Not gross enough...'}
          </Text>
        )}

        {!done && (
          <Text style={{ fontFamily: 'Inter_500Medium', fontSize: scale(12), color: '#ABABAB' }}>
            Drag {NEEDED - dropped.length} more ingredient{NEEDED - dropped.length !== 1 ? 's' : ''} into the cauldron
          </Text>
        )}
      </View>
    </View>
  );
}

// ── Mini-game: Whack the Weak Spot ────────────────────────────────────────────
function WhackGame({ onScore }: { onScore: (s: number) => void }) {
  const [count,   setCount]   = useState(0);
  const [timeLeft,setTimeLeft]= useState(4000);
  const [started, setStarted] = useState(false);
  const [done,    setDone]    = useState(false);
  const [spot, setSpot] = useState({ x: 50, y: 50 });
  const countRef = useRef(0);
  const startRef = useRef(0);
  const AREA_W   = scale(280);
  const AREA_H   = scale(160);

  const moveSpot = () => setSpot({ x: 10 + Math.random() * 80, y: 10 + Math.random() * 80 });

  useEffect(() => {
    if (!started) return;
    const iv = setInterval(() => {
      const rem = Math.max(0, 4000 - (Date.now() - startRef.current));
      setTimeLeft(rem);
      if (rem <= 0) {
        clearInterval(iv);
        setDone(true);
        setTimeout(() => onScore(Math.min(100, Math.round((countRef.current / 12) * 100))), 400);
      }
    }, 50);
    return () => clearInterval(iv);
  }, [started]);

  const handleTap = () => {
    if (done) return;
    if (!started) { setStarted(true); startRef.current = Date.now(); }
    countRef.current += 1;
    setCount(countRef.current);
    moveSpot();
  };

  const timerPct = started ? (timeLeft / 4000) * 100 : 100;
  return (
    <View style={{ alignItems:'center', gap: scale(10), paddingHorizontal: scale(20) }}>
      <Text style={b.mgTitle}>WHACK THE WEAK SPOT</Text>
      <Text style={b.mgInstr}>Tap the glowing spot as fast as you can!</Text>
      <View style={{ width: scale(240), height: scale(10), borderRadius: scale(6), backgroundColor:'#ECEAE4', borderWidth:1.5, borderColor:'#1A1A1A', overflow:'hidden' }}>
        <View style={{ width:`${timerPct}%`, height:'100%', borderRadius: scale(6), backgroundColor: timerPct > 50 ? '#C5F215' : timerPct > 20 ? '#F59E0B' : '#FF3B55' }} />
      </View>
      <View style={{ width: AREA_W, height: AREA_H, backgroundColor:'#F0EDFF', borderRadius: scale(12), borderWidth:2, borderColor:'#1A1A1A', overflow:'hidden' }}>
        <TouchableOpacity
          onPress={handleTap} disabled={done} activeOpacity={0.7}
          style={{ position:'absolute', width: scale(52), height: scale(52), borderRadius: scale(26),
            backgroundColor: done ? '#ABABAB' : '#FF3B55',
            left: (AREA_W - scale(52)) * (spot.x / 100),
            top: (AREA_H - scale(52)) * (spot.y / 100),
            justifyContent:'center', alignItems:'center',
          }}
        >
          <Text style={{ fontSize: scale(22) }}>💥</Text>
        </TouchableOpacity>
      </View>
      <Text style={{ fontFamily:'FredokaOne_400Regular', fontSize: scale(48), color:'#1A1A1A' }}>{count}</Text>
    </View>
  );
}

// ── Mini-game: Block Breaker / Combo Chain ────────────────────────────────────
const BB_COLORS = ['#FF3B55', '#6B35F0', '#C5F215', '#F59E0B'];
const BB_LABELS = ['●', '■', '▲', '★'];

function SequenceGame({ onScore, fast = false }: { onScore: (s: number) => void; fast?: boolean }) {
  const SEQ = useRef(Array.from({ length: 4 }, () => Math.floor(Math.random() * 4))).current;
  const [gPhase, setGPhase] = useState<'show' | 'wait' | 'input' | 'done'>('show');
  const [showIdx, setShowIdx] = useState(0);
  const [inputIdx, setInputIdx] = useState(0);
  const showDelay = fast ? 380 : 650;

  useEffect(() => {
    if (gPhase !== 'show') return;
    if (showIdx < 4) {
      const t = setTimeout(() => setShowIdx(i => i + 1), showDelay);
      return () => clearTimeout(t);
    }
    const t = setTimeout(() => setGPhase(fast ? 'input' : 'wait'), fast ? 180 : 420);
    return () => clearTimeout(t);
  }, [gPhase, showIdx]);

  useEffect(() => {
    if (gPhase !== 'wait') return;
    const t = setTimeout(() => setGPhase('input'), 350);
    return () => clearTimeout(t);
  }, [gPhase]);

  const handleTap = (idx: number) => {
    if (gPhase !== 'input') return;
    if (SEQ[inputIdx] !== idx) {
      setGPhase('done');
      setTimeout(() => onScore(Math.round((inputIdx / 4) * 100)), 500);
    } else if (inputIdx + 1 >= 4) {
      setGPhase('done');
      setTimeout(() => onScore(100), 500);
    } else {
      setInputIdx(i => i + 1);
    }
  };

  const activeShow = gPhase === 'show' ? showIdx - 1 : -1;
  const showSequence = gPhase === 'show' || (!fast && gPhase === 'input');

  return (
    <View style={{ alignItems:'center', gap: scale(14), paddingHorizontal: scale(20) }}>
      <Text style={b.mgTitle}>{fast ? 'COMBO CHAIN' : 'BLOCK BREAKER'}</Text>
      <Text style={b.mgInstr}>
        {gPhase === 'show' ? 'Watch the sequence...' : gPhase === 'wait' ? 'Get ready!' : gPhase === 'input' ? `Repeat it! (${inputIdx + 1}/4)` : '✓'}
      </Text>
      <View style={{ flexDirection:'row', gap: scale(8) }}>
        {SEQ.map((ci, i) => {
          const lit = gPhase === 'show' && i < showIdx;
          return (
            <View key={i} style={{ width: scale(44), height: scale(44), borderRadius: scale(10),
              backgroundColor: (lit || showSequence) ? BB_COLORS[ci] : '#ECEAE4',
              borderWidth:2, borderColor:'#1A1A1A', justifyContent:'center', alignItems:'center',
              transform:[{ scale: activeShow === i ? 1.2 : 1 }],
            }}>
              {(lit || showSequence) && <Text style={{ fontSize: scale(18), fontFamily: 'Inter_900Black', color:'#1A1A1A' }}>{BB_LABELS[ci]}</Text>}
            </View>
          );
        })}
      </View>
      <View style={{ flexDirection:'row', flexWrap:'wrap', gap: scale(10), justifyContent:'center' }}>
        {BB_COLORS.map((color, i) => (
          <TouchableOpacity key={i} onPress={() => handleTap(i)} disabled={gPhase !== 'input'} activeOpacity={0.75}
            style={{ width: scale(62), height: scale(62), borderRadius: scale(14),
              backgroundColor: gPhase === 'input' ? color : '#ECEAE4',
              borderWidth:2, borderColor:'#1A1A1A', justifyContent:'center', alignItems:'center' }}>
            <Text style={{ fontSize: scale(22), fontFamily: 'Inter_900Black', color:'#1A1A1A' }}>{BB_LABELS[i]}</Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );
}

// ── Mini-game: Power Slash ────────────────────────────────────────────────────
function PowerSlashGame({ onScore }: { onScore: (s: number) => void }) {
  const TARGET_X_PCT = useRef(10 + Math.random() * 80).current;
  const AREA_W = scale(280); const AREA_H = scale(190);
  const START  = { x: AREA_W / 2, y: AREA_H - scale(24) };
  const END    = { x: AREA_W * (TARGET_X_PCT / 100), y: scale(24) };
  const lineLen = Math.sqrt((END.x-START.x)**2 + (END.y-START.y)**2);
  const lineDir = { x:(END.x-START.x)/lineLen, y:(END.y-START.y)/lineLen };
  const angleDeg = Math.atan2(END.y-START.y, END.x-START.x) * 180 / Math.PI;
  const [trail, setTrail] = useState<{ x:number; y:number; ok:boolean }[]>([]);
  const [done,  setDone]  = useState(false);
  const scored = useRef(false);

  const distToLine = (px:number, py:number) => {
    const dx = px-START.x, dy = py-START.y;
    return Math.abs(dx*lineDir.y - dy*lineDir.x);
  };
  const coverage = (pts: { x:number; y:number }[]) => {
    if (!pts.length) return 0;
    const p = pts[pts.length-1];
    const proj = (p.x-START.x)*lineDir.x + (p.y-START.y)*lineDir.y;
    return Math.min(1, Math.max(0, proj/lineLen));
  };

  const panResponder = useRef(PanResponder.create({
    onStartShouldSetPanResponder: () => !scored.current,
    onMoveShouldSetPanResponder:  () => !scored.current,
    onPanResponderGrant: (e) => {
      const { locationX:x, locationY:y } = e.nativeEvent;
      setTrail([{ x, y, ok: distToLine(x,y) < scale(26) }]);
    },
    onPanResponderMove: (e) => {
      const { locationX:x, locationY:y } = e.nativeEvent;
      setTrail(prev => [...prev, { x, y, ok: distToLine(x,y) < scale(26) }]);
    },
    onPanResponderRelease: () => {
      if (scored.current) return;
      scored.current = true; setDone(true);
      setTrail(prev => {
        if (!prev.length) { setTimeout(() => onScore(0), 300); return prev; }
        const cov = coverage(prev);
        const acc = prev.filter(p => p.ok).length / prev.length;
        setTimeout(() => onScore(Math.round(Math.min(100, cov*60 + acc*40))), 400);
        return prev;
      });
    },
  })).current;

  return (
    <View style={{ alignItems:'center', gap: scale(10), paddingHorizontal: scale(20) }}>
      <Text style={b.mgTitle}>POWER SLASH</Text>
      <Text style={b.mgInstr}>Drag from the circle to the star!</Text>
      <View style={{ width: AREA_W, height: AREA_H, backgroundColor:'#F0EDFF', borderRadius: scale(12), borderWidth:2, borderColor:'#1A1A1A', overflow:'hidden' }} {...panResponder.panHandlers}>
        {/* Guide line */}
        <View style={{ position:'absolute', width: lineLen, height:2, backgroundColor:'#DDDAFF',
          left: START.x, top: START.y, transformOrigin:'0 0',
          transform:[{ rotate:`${angleDeg}deg` }] }} />
        {/* Trail dots */}
        {trail.map((pt, i) => (
          <View key={i} style={{ position:'absolute', width: scale(8), height: scale(8), borderRadius: scale(4),
            backgroundColor: pt.ok ? '#22A050' : '#FF3B55',
            left: pt.x-scale(4), top: pt.y-scale(4) }} />
        ))}
        {/* Start */}
        <View style={{ position:'absolute', width: scale(32), height: scale(32), borderRadius: scale(16), backgroundColor:'#6B35F0', borderWidth:2, borderColor:'#1A1A1A', left: START.x-scale(16), top: START.y-scale(16), justifyContent:'center', alignItems:'center' }}>
          <Text style={{ color:'#fff', fontFamily: 'Inter_900Black', fontSize: scale(14) }}>●</Text>
        </View>
        {/* End */}
        <View style={{ position:'absolute', width: scale(28), height: scale(28), borderRadius: scale(14), backgroundColor:'#C5F215', borderWidth:2, borderColor:'#1A1A1A', left: END.x-scale(14), top: END.y-scale(14), justifyContent:'center', alignItems:'center' }}>
          <Text style={{ fontSize: scale(14) }}>★</Text>
        </View>
      </View>
      {done && <Text style={{ fontSize: scale(14), fontFamily: 'Inter_700Bold', color:'#6B35F0' }}>Slash scored!</Text>}
    </View>
  );
}

// ── Mini-game: Earthquake ─────────────────────────────────────────────────────
function EarthquakeGame({ onScore }: { onScore: (s: number) => void }) {
  const [timeLeft, setTimeLeft] = useState(3000);
  const [started,  setStarted]  = useState(false);
  const [done,     setDone]     = useState(false);
  const [count,    setCount]    = useState(0);
  const lastSide = useRef<'left'|'right'|null>(null);
  const altCount = useRef(0);
  const startRef = useRef(0);

  useEffect(() => {
    if (!started) return;
    const iv = setInterval(() => {
      const rem = Math.max(0, 3000 - (Date.now() - startRef.current));
      setTimeLeft(rem);
      if (rem <= 0) {
        clearInterval(iv); setDone(true);
        setTimeout(() => onScore(Math.min(100, Math.round((altCount.current / 16) * 100))), 400);
      }
    }, 50);
    return () => clearInterval(iv);
  }, [started]);

  const handleSide = (side: 'left'|'right') => {
    if (done) return;
    if (!started) { setStarted(true); startRef.current = Date.now(); }
    if (lastSide.current === side) return; // same side — no credit
    lastSide.current = side;
    altCount.current += 1;
    setCount(altCount.current);
  };

  const timerPct = started ? (timeLeft / 3000) * 100 : 100;
  return (
    <View style={{ alignItems:'center', gap: scale(12) }}>
      <Text style={b.mgTitle}>EARTHQUAKE</Text>
      <Text style={b.mgInstr}>Alternate left and right — don't repeat the same side!</Text>
      <View style={{ width: scale(240), height: scale(10), borderRadius: scale(6), backgroundColor:'#ECEAE4', borderWidth:1.5, borderColor:'#1A1A1A', overflow:'hidden' }}>
        <View style={{ width:`${timerPct}%`, height:'100%', borderRadius: scale(6), backgroundColor: timerPct > 50 ? '#C5F215' : timerPct > 20 ? '#F59E0B' : '#FF3B55' }} />
      </View>
      <Text style={{ fontFamily:'FredokaOne_400Regular', fontSize: scale(52), color:'#1A1A1A' }}>{count}</Text>
      <View style={{ flexDirection:'row', gap: scale(12) }}>
        {(['left','right'] as const).map(side => (
          <TouchableOpacity key={side} onPress={() => handleSide(side)} disabled={done} activeOpacity={0.6}
            style={{ width: scale(118), height: scale(76), borderRadius: scale(16),
              backgroundColor: done ? '#ABABAB' : side === 'left' ? '#6B35F0' : '#FF3B55',
              borderWidth:2, borderColor:'#1A1A1A', justifyContent:'center', alignItems:'center' }}>
            <Text style={{ color:'#fff', fontFamily: 'Inter_900Black', fontSize: scale(30) }}>{side === 'left' ? '←' : '→'}</Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );
}

// ── Mini-game: Defuse ─────────────────────────────────────────────────────────
const DEFUSE_WIRES = [
  { id:0, label:'RED',    bg:'#FF3B55', text:'#fff'     },
  { id:1, label:'BLUE',   bg:'#3B82F6', text:'#fff'     },
  { id:2, label:'YELLOW', bg:'#F59E0B', text:'#1A1A1A'  },
];

function DefuseGame({ onScore }: { onScore: (s: number) => void }) {
  const wrongWire = useRef(Math.floor(Math.random() * 3)).current;
  const [timeLeft, setTimeLeft] = useState(3000);
  const [done, setDone] = useState(false);
  const startRef = useRef(Date.now());

  useEffect(() => {
    const iv = setInterval(() => {
      const rem = Math.max(0, 3000 - (Date.now() - startRef.current));
      setTimeLeft(rem);
      if (rem <= 0) { clearInterval(iv); setDone(true); setTimeout(() => onScore(0), 300); }
    }, 50);
    return () => clearInterval(iv);
  }, []);

  const handleCut = (id: number) => {
    if (done) return;
    setDone(true);
    if (id === wrongWire) {
      setTimeout(() => onScore(0), 400);
    } else {
      const elapsed = Date.now() - startRef.current;
      const speedBonus = Math.max(0, (3000 - elapsed) / 3000);
      setTimeout(() => onScore(Math.round(70 + speedBonus * 30)), 400);
    }
  };

  const timerPct = (timeLeft / 3000) * 100;
  return (
    <View style={{ alignItems:'center', gap: scale(14), paddingHorizontal: scale(20) }}>
      <Text style={b.mgTitle}>DEFUSE</Text>
      <Text style={[b.mgInstr, { color:'#FF3B55' }]}>Don't cut the {DEFUSE_WIRES[wrongWire].label} wire!</Text>
      <View style={{ width: scale(240), height: scale(10), borderRadius: scale(6), backgroundColor:'#ECEAE4', borderWidth:1.5, borderColor:'#1A1A1A', overflow:'hidden' }}>
        <View style={{ width:`${timerPct}%`, height:'100%', borderRadius: scale(6), backgroundColor: timerPct > 50 ? '#C5F215' : timerPct > 20 ? '#F59E0B' : '#FF3B55' }} />
      </View>
      <View style={{ gap: scale(10), width:'100%' }}>
        {DEFUSE_WIRES.map(w => (
          <TouchableOpacity key={w.id} onPress={() => handleCut(w.id)} disabled={done} activeOpacity={0.8}
            style={{ height: scale(52), borderRadius: scale(14), backgroundColor: done ? '#ECEAE4' : w.bg,
              borderWidth:2, borderColor:'#1A1A1A', justifyContent:'center', alignItems:'center', opacity: done ? 0.5 : 1 }}>
            <Text style={{ color: w.text, fontFamily: 'Inter_900Black', fontSize: scale(16) }}>✂ CUT {w.label} WIRE</Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );
}

// ── 5. Interactive Battle Arena ───────────────────────────────────────────────

type BattlePhase = 'choosing' | 'zap-strike' | 'frenzy' | 'overcharge' | 'whack' | 'block-breaker' | 'power-slash' | 'earthquake' | 'defuse' | 'combo-chain' | 'shake-potion' | 'slingshot' | 'feed-boss' | 'combo-reveal' | 'boss-turn';

type AttackCardId = 'zap-strike'|'frenzy'|'overcharge'|'whack'|'block-breaker'|'power-slash'|'earthquake'|'defuse'|'combo-chain'|'shake-potion'|'slingshot'|'feed-boss'|'weakness'|'defend';
interface AttackCard { id: AttackCardId; mechanic: BattlePhase|'weakness'|'defend'; label: string; baseDmg: number; shardCost: number; emoji: string; cardBg: string; icon: ReturnType<typeof require>; }

const ATTACK_POOL: Omit<AttackCard,'label'>[] = [
  { id:'zap-strike',    mechanic:'zap-strike',    baseDmg:24, shardCost:0, emoji:'⚡', cardBg:'#EAF3FB', icon: require('./assets/icons/icon-lightning.png') },
  { id:'frenzy',        mechanic:'frenzy',        baseDmg:32, shardCost:0, emoji:'👊', cardBg:'#F0F7F0', icon: require('./assets/icons/icon-streak.png') },
  { id:'overcharge',    mechanic:'overcharge',    baseDmg:42, shardCost:2, emoji:'🔋', cardBg:'#EAE4FF', icon: require('./assets/icons/icon-star.png') },
  { id:'whack',         mechanic:'whack',         baseDmg:28, shardCost:0, emoji:'💥', cardBg:'#FFF0EE', icon: require('./assets/icons/icon-skull.png') },
  { id:'block-breaker', mechanic:'block-breaker', baseDmg:36, shardCost:0, emoji:'🧩', cardBg:'#FFF9E0', icon: require('./assets/icons/icon-completed.png') },
  { id:'power-slash',   mechanic:'power-slash',   baseDmg:30, shardCost:0, emoji:'⚔', cardBg:'#F0EDFF', icon: require('./assets/icons/icon-trophy.png') },
  { id:'earthquake',    mechanic:'earthquake',    baseDmg:32, shardCost:0, emoji:'🌍', cardBg:'#FFF0E0', icon: require('./assets/icons/icon-timer.png') },
  { id:'defuse',        mechanic:'defuse',        baseDmg:38, shardCost:1, emoji:'💣', cardBg:'#FFF0EE', icon: require('./assets/icons/icon-gem.png') },
  { id:'combo-chain',   mechanic:'combo-chain',   baseDmg:34, shardCost:0, emoji:'🔗', cardBg:'#F0F7F0', icon: require('./assets/icons/icon-graph.png') },
  { id:'shake-potion',  mechanic:'shake-potion',  baseDmg:36, shardCost:0, emoji:'🧪', cardBg:'#F0EDFF', icon: require('./assets/battleui/potionicon.png') },
  { id:'slingshot',     mechanic:'slingshot',     baseDmg:38, shardCost:0, emoji:'🪃', cardBg:'#FFF9E0', icon: require('./assets/battleui/slingshotrock.png') },
  { id:'feed-boss',     mechanic:'feed-boss',     baseDmg:40, shardCost:0, emoji:'🫕', cardBg:'#EAE4FF', icon: require('./assets/battleui/cauldron.png') },
];

function BattleArenaScreen({ monsterIdx, monsterImg, monsterName, monsterId, totalPower, completionPct, shards: initialShards, weaknessUnlocked, guaranteedWin, onBattleEnd, bossOverride, initialBossHp }: {
  monsterIdx: MonsterIdx; monsterImg: number; monsterName: string; monsterId: MonsterId;
  totalPower: number; completionPct: number; shards: number; weaknessUnlocked: boolean;
  guaranteedWin: boolean; onBattleEnd: (result: 'captured' | 'got-away', shardsUsed: number, remainingBossHp?: number) => void;
  initialBossHp?: number;
  bossOverride?: Boss;
}) {
  const boss    = bossOverride ?? getWeeklyBoss(monsterIdx);
  const BossSvg = BOSS_SVGS[monsterIdx % BOSS_SVGS.length];

  const INTRO_QUIPS = [
    'Clean your CLOCK!',
    'You dare\nchallenge ME?!',
    'This ends NOW! 😤',
    'Nobody beats\nthis boss!',
    'Prepare yourself!',
  ];
  const HIT_QUIPS = [
    'OW! That tickled.',
    'Not the good stuff!',
    'My bristles!! 😤',
    'Powers... fading...',
    'You got lucky!',
    "That'll leave\na mark!",
    'Toothpaste\nEVERYWHERE!',
    'I taste defeat...',
    'Unacceptable!! 😤',
    "I'm warning you!",
    'My dentist will\nhear about this!',
    'Ow ow ow OW!',
  ];

  const [quip, setQuip]         = useState('');
  const bubbleAnim              = useRef(new Animated.Value(0)).current;
  const bubbleTimer             = useRef<ReturnType<typeof setTimeout> | null>(null);

  const MAX_LINE = 18;
  const clampQuip = (text: string) =>
    text.split('\n').map(line => line.length > MAX_LINE ? line.slice(0, MAX_LINE - 1) + '…' : line).slice(0, 2).join('\n');

  const showBubble = useCallback((text: string, duration = 2200) => {
    if (bubbleTimer.current) clearTimeout(bubbleTimer.current);
    setQuip(clampQuip(text));
    bubbleAnim.setValue(0);
    Animated.spring(bubbleAnim, { toValue: 1, useNativeDriver: true, tension: 180, friction: 10 }).start();
    bubbleTimer.current = setTimeout(() => {
      Animated.timing(bubbleAnim, { toValue: 0, duration: 300, useNativeDriver: true }).start();
    }, duration);
  }, [bubbleAnim]);

  // Intro quip on mount
  useEffect(() => {
    const t = setTimeout(() => {
      showBubble(INTRO_QUIPS[Math.floor(Math.random() * INTRO_QUIPS.length)], 2500);
    }, 400);
    return () => clearTimeout(t);
  }, []);


  const PLAYER_MAX = Math.round(50 + totalPower * 0.5);
  const ENEMY_MAX   = boss.hp;
  const ENEMY_START = initialBossHp != null ? Math.min(initialBossHp, ENEMY_MAX) : ENEMY_MAX;

  const [playerHp,    setPlayerHp]    = useState(PLAYER_MAX);
  const [enemyHp,     setEnemyHp]     = useState(ENEMY_START);
  const [shards,      setShards]      = useState(initialShards);
  const [shardsUsed,  setShardsUsed]  = useState(0);
  const [phase,       setPhase]       = useState<BattlePhase>('choosing');
  const [defending,   setDefending]   = useState(false);
  const [weaknessUsed,setWeaknessUsed]= useState(false);
  const [log,         setLog]         = useState(`${boss.name} appears! What will ${monsterName} do?`);
  const [combo,       setCombo]       = useState<{ label:string; color:string; score:number } | null>(null);
  const [live,        setLive]        = useState(true);
  const [hand,        setHand]        = useState<AttackCard[]>([]);
  const [activeCard,  setActiveCard]  = useState<AttackCard | null>(null);

  const playerHpAnim = useRef(new Animated.Value(1)).current;
  const enemyHpAnim  = useRef(new Animated.Value(ENEMY_START / ENEMY_MAX)).current;
  const bobPlayer    = useBob(0,   7, 3000);
  const bobEnemy     = useBob(800, 7, 3000);
  const flashAnim    = useRef(new Animated.Value(0)).current;
  const whiteFlash   = useRef(new Animated.Value(0)).current;

  const playerHpRef = useRef(PLAYER_MAX);
  const enemyHpRef  = useRef(ENEMY_START);

  // Feed the Boss — boss pleads for something yummy when that phase starts
  useEffect(() => {
    if (phase === 'feed-boss') {
      setTimeout(() => showBubble("Make me something\nYUMMY! 😋", 3000), 300);
    }
  }, [phase]);

  const animHp = (anim: Animated.Value, ratio: number) =>
    Animated.timing(anim, { toValue: ratio, duration: 500, useNativeDriver: false }).start();

  // Deal a new random hand of 4 cards whenever entering the choosing phase
  useEffect(() => {
    if (phase !== 'choosing' || !live) return;
    const eligible = ATTACK_POOL
      .filter(a => a.shardCost === 0 || shards >= a.shardCost)
      .map(a => ({ ...a, label: atkName(monsterId, a.id, a.id) } as AttackCard));
    const shuffled = [...eligible].sort(() => Math.random() - 0.5);
    let picks: AttackCard[] = shuffled.slice(0, 3);
    if (weaknessUnlocked && !weaknessUsed) {
      const wCard: AttackCard = { id:'weakness', mechanic:'weakness', label:'Weakness Attack', baseDmg:45, shardCost:0, emoji:'⭐', cardBg:'#FFF9E0', icon: require('./assets/icons/icon-starbox.png') };
      picks = [wCard, ...picks.slice(0, 2)];
    }
    const dCard: AttackCard = { id:'defend', mechanic:'defend', label:'Defend', baseDmg:0, shardCost:0, emoji:'🛡', cardBg:'#FFF0F0', icon: require('./assets/icons/icon-skulldisabled.png') };
    setHand([...picks, dCard]);
  }, [phase, live]);

  const triggerWhiteFlash = () => {
    whiteFlash.setValue(1);
    Animated.timing(whiteFlash, { toValue: 0, duration: 350, useNativeDriver: true, easing: Easing.out(Easing.quad) }).start();
  };

  const flashScreen = (color: string) => {
    flashAnim.setValue(1);
    Animated.timing(flashAnim, { toValue: 0, duration: 600, useNativeDriver: false }).start();
  };

  // Granular stepped power multiplier (MON-19 9-step table)
  const powerMult = completionPct >= 100 ? 1.00
                  : completionPct >= 80  ? 0.75
                  : completionPct >= 60  ? 0.55
                  : completionPct >= 40  ? 0.35
                  : completionPct >= 30  ? 0.28
                  : completionPct >= 20  ? 0.24
                  : completionPct >= 10  ? 0.18
                  : completionPct >= 1   ? 0.12
                  : 0.08;

  // Evolution damage cap — per-level, all 8 monster evolutions
  const EVO_CAP_FACTORS = [0.55, 0.62, 0.68, 0.74, 0.80, 0.88, 0.94, 1.0];
  const evolutionCapFactor = EVO_CAP_FACTORS[monsterIdx] ?? 1.0;

  const playerDamage = (baseDmg: number, score: number): number => {
    const raw = baseDmg * (score / 100) * powerMult;
    const crit = Math.random() < 0.08;
    const withCrit = crit ? raw * 1.8 : raw;
    return Math.round(withCrit * evolutionCapFactor);
  };

  // Aggression multiplier: Bosses 1–4 only. Ends fights fast at very low completion
  // rather than letting them drag for 20 turns dealing no damage.
  const bossArrayIdx = BOSSES.indexOf(boss);
  const isEarlyBoss  = bossArrayIdx >= 0 && bossArrayIdx <= 3;
  const aggressionMult = isEarlyBoss
    ? completionPct === 0  ? 7.0
    : completionPct < 20   ? 5.0
    : completionPct < 40   ? 3.0
    : completionPct < 60   ? 2.0
    : 1.0
    : 1.0;

  const bossDamage = (isDefending: boolean): number => {
    const roll    = boss.attackMin + Math.floor(Math.random() * (boss.attackMax - boss.attackMin + 1));
    const reduced = roll * (1.0 - powerMult * 0.5) * aggressionMult;
    return Math.round(isDefending ? reduced * 0.5 : reduced);
  };

  const applyPlayerAttack = (dmg: number, attackName: string) => {
    const newEH = Math.max(0, enemyHpRef.current - dmg);
    enemyHpRef.current = newEH;
    setEnemyHp(newEH);
    animHp(enemyHpAnim, newEH / ENEMY_MAX);
    triggerWhiteFlash();
    showBubble(HIT_QUIPS[Math.floor(Math.random() * HIT_QUIPS.length)], 1800);
    setLog(`${monsterName} used ${attackName}! Dealt ${dmg} damage!`);
    if (newEH <= 0) {
      setLive(false);
      setTimeout(() => onBattleEnd('captured', shardsUsed), 900);
      return true;
    }
    return false;
  };

  const doBossTurn = (wasDefending: boolean) => {
    setPhase('boss-turn');
    const ENEMY_ATTACKS = ['Dark Swirl', 'Shadow Claw', 'Chaos Bolt', 'Vortex Slam'];
    setTimeout(() => {
      const d    = bossDamage(wasDefending);
      const atk  = ENEMY_ATTACKS[Math.floor(Math.random() * ENEMY_ATTACKS.length)];
      const shield = wasDefending ? ' (blocked half)' : '';
      // Guaranteed win: boss can't kill you
      const newPH = guaranteedWin
        ? Math.max(1, playerHpRef.current - d)
        : Math.max(0, playerHpRef.current - d);
      playerHpRef.current = newPH;
      setPlayerHp(newPH);
      animHp(playerHpAnim, newPH / PLAYER_MAX);
      triggerWhiteFlash();
      setLog(`${boss.name} used ${atk}!${shield} Dealt ${d} dmg!`);
      if (newPH <= 0) {
        setLive(false);
        setTimeout(() => onBattleEnd('got-away', shardsUsed, enemyHpRef.current), 900);
        return;
      }
      setTimeout(() => {
        setDefending(false);
        setPhase('choosing');
        setLog(`What will ${monsterName} do?`);
      }, 1200);
    }, 1300);
  };

  const handleScore = (attackName: string, baseDmg: number, score: number, shardCost = 0) => {
    const dmg = playerDamage(baseDmg, score);
    const info = comboFromScore(score);
    setCombo({ ...info, score });
    flashScreen(info.color);
    if (shardCost > 0) {
      setShards(s => s - shardCost);
      setShardsUsed(u => u + shardCost);
    }
    setPhase('combo-reveal');
    setTimeout(() => {
      setCombo(null);
      const won = applyPlayerAttack(dmg, attackName);
      if (!won) doBossTurn(defending);
    }, 1400);
  };

  const handleDefend = () => {
    if (phase !== 'choosing' || !live) return;
    setDefending(true);
    setLog(`${monsterName} braces for impact!`);
    doBossTurn(true);
  };

  const handleWeakness = () => {
    if (phase !== 'choosing' || !live || weaknessUsed) return;
    setWeaknessUsed(true);
    // Guaranteed ~95 score, base 45 dmg, minimum 20 dmg always applied
    const rawDmg = playerDamage(45, 95);
    const dmg = Math.max(20, rawDmg);
    const info = comboFromScore(95);
    setCombo({ ...info, score: 95 });
    flashScreen(info.color);
    setPhase('combo-reveal');
    setTimeout(() => {
      setCombo(null);
      const won = applyPlayerAttack(dmg, 'Weakness Attack ⭐');
      if (!won) doBossTurn(defending);
    }, 1400);
  };

  const handleCardPlay = (card: AttackCard) => {
    if (phase !== 'choosing' || !live) return;
    if (card.id === 'defend')   { handleDefend();   return; }
    if (card.id === 'weakness') { handleWeakness(); return; }
    setActiveCard(card);
    setPhase(card.mechanic as BattlePhase);
  };

  const { top: safeTop } = useSafeAreaInsets();

  return (
    <View style={{ flex: 1, backgroundColor: '#2D0E6B' }}>
      <Image
        source={require('./assets/battleui/battlebg.png')}
        style={{ position: 'absolute', top: -safeTop, left: 0, width: Dimensions.get('window').width, height: Dimensions.get('window').height + safeTop }}
        resizeMode="stretch"
      />
      <StatusBar barStyle="light-content" backgroundColor="transparent" translucent />


      {/* Combo colour flash */}
      {combo && (
        <Animated.View pointerEvents="none" style={{
          ...StyleSheet.absoluteFillObject, zIndex: 99,
          backgroundColor: combo.color, opacity: flashAnim.interpolate({ inputRange:[0,1], outputRange:[0, 0.35] }),
        }} />
      )}

      {/* HP bars — no cards, no avatars, straight on the bg */}
      <View style={{ position: 'absolute', top: 0, left: 0, right: 0, zIndex: 10, paddingHorizontal: 16, paddingTop: 40, paddingBottom: 8, flexDirection: 'row', gap: 12 }}>
        {/* Player */}
        <View style={{ flex: 1, gap: 4 }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
            <Text style={{ fontFamily: 'Inter_700Bold', fontSize: scale(13), color: '#FFFFFF' }}>{monsterName}</Text>
            <Text style={{ fontFamily: 'Inter_600SemiBold', fontSize: scale(11), color: 'rgba(255,255,255,0.7)' }}>{playerHp}/{PLAYER_MAX}</Text>
          </View>
          <View style={b.hpTrack}>
            <Animated.View style={[b.hpFill, { backgroundColor: '#C5F215', width: playerHpAnim.interpolate({ inputRange:[0,1], outputRange:['0%','100%'] }) as any }]} />
          </View>
        </View>

        <Text style={{ fontFamily: 'Inter_900Black', fontSize: scale(11), color: 'rgba(255,255,255,0.5)', alignSelf: 'center', marginTop: -6 }}>VS</Text>

        {/* Boss */}
        <View style={{ flex: 1, gap: 4 }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
            <Text style={{ fontFamily: 'Inter_700Bold', fontSize: scale(13), color: '#FFFFFF' }}>{boss.name}</Text>
            <Text style={[{ fontFamily: 'Inter_600SemiBold', fontSize: scale(11), color: 'rgba(255,255,255,0.7)' }, enemyHp < ENEMY_MAX * 0.25 && { color: '#FF6B6B' }]}>{enemyHp}/{ENEMY_MAX}</Text>
          </View>
          <View style={b.hpTrack}>
            <Animated.View style={[b.hpFill, { backgroundColor: '#F59E0B', width: enemyHpAnim.interpolate({ inputRange:[0,1], outputRange:['0%','100%'] }) as any }]} />
          </View>
        </View>
      </View>

      {/* Boss — large, centered, hovering */}
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', overflow: 'visible' }}>
        {/* Radial gradient glow behind boss */}
        <Svg width={500} height={500} style={{ position: 'absolute', marginTop: 300, mixBlendMode: 'overlay' } as any}>
          <Defs>
            <RadialGradient id="bossGlow" cx="50%" cy="50%" r="50%">
              <Stop offset="0%"   stopColor="#D6D6D6" stopOpacity="0.9" />
              <Stop offset="40%"  stopColor="#D6D6D6" stopOpacity="0.5" />
              <Stop offset="75%"  stopColor="#D6D6D6" stopOpacity="0.15" />
              <Stop offset="100%" stopColor="#D6D6D6" stopOpacity="0" />
            </RadialGradient>
          </Defs>
          <Circle cx="250" cy="250" r="250" fill="url(#bossGlow)" />
        </Svg>
        {(() => {
          const bossArt    = boss.bossImage;
          const jarArt     = getBossDisplay(boss.name)?.jar;
          const src        = bossArt ?? jarArt;
          const isJarOnly  = !bossArt && !!jarArt;
          if (!src) return null;
          return (
            <Animated.Image
              source={src}
              style={[
                { marginTop: 350, transform: [{ translateY: bobEnemy }] },
                isJarOnly
                  ? { width: scale(390), height: scale(390) }
                  : { width: scale(615), height: scale(702) },
              ]}
              resizeMode="contain"
            />
          );
        })()}

        {/* Speech bubble — upper right of boss */}
        <Animated.View style={{
          position: 'absolute',
          top: 136,
          right: -20,
          width: 200,
          height: 160,
          opacity: bubbleAnim,
          transform: [{ scale: bubbleAnim.interpolate({ inputRange: [0, 1], outputRange: [0.7, 1] }) }],
          alignItems: 'center',
          justifyContent: 'center',
        }}>
          <Image
            source={require('./assets/battleui/speechbubble.png')}
            style={{ position: 'absolute', width: 200, height: 160 }}
            resizeMode="stretch"
          />
          <Text style={{
            fontFamily: 'FredokaOne_400Regular',
            fontSize: scale(20),
            color: '#1A1A1A',
            textAlign: 'center',
            paddingHorizontal: 18,
            paddingBottom: 20,
            lineHeight: scale(24),
          }}>{quip}</Text>
        </Animated.View>
      </View>


      {/* ── Action area ── */}
      <View style={{ flex:1 }}>

        {/* Combo reveal */}
        {phase === 'combo-reveal' && combo && (
          <View style={{ flex:1, alignItems:'center', justifyContent:'center', gap: scale(8) }}>
            <Text style={{ fontFamily:'FredokaOne_400Regular', fontSize: scale(42), color: combo.color, textAlign:'center' }}>{combo.label}</Text>
            <Text style={{ fontSize: scale(22), fontFamily: 'Inter_900Black', color:'#FFFFFF' }}>{combo.score} pts</Text>
          </View>
        )}

        {/* Boss turn */}
        {phase === 'boss-turn' && (
          <View style={{ flex:1, alignItems:'center', justifyContent:'center' }}>
            <Text style={{ fontSize: scale(32), fontFamily: 'Inter_900Black', color:'#FF6B6B' }}>⚔ Boss Attack!</Text>
          </View>
        )}

        {/* ── Mini-games (all use activeCard for name + dmg) ── */}
        {phase === 'zap-strike'    && activeCard && <View style={{ flex:1, justifyContent:'center' }}><ZapStrikeGame   onScore={s => handleScore(activeCard.label, activeCard.baseDmg, s, activeCard.shardCost)} zapZone={boss.zapZone} /></View>}
        {phase === 'frenzy'        && activeCard && <View style={{ flex:1, justifyContent:'center' }}><FrenzyGame       onScore={s => handleScore(activeCard.label, activeCard.baseDmg, s, activeCard.shardCost)} onFlash={flashScreen} /></View>}
        {phase === 'overcharge'    && activeCard && <View style={{ flex:1, justifyContent:'center' }}><OverchargeGame   onScore={s => handleScore(activeCard.label, activeCard.baseDmg, s, activeCard.shardCost)} /></View>}
        {phase === 'whack'         && activeCard && <View style={{ flex:1, justifyContent:'center' }}><WhackGame        onScore={s => handleScore(activeCard.label, activeCard.baseDmg, s, activeCard.shardCost)} /></View>}
        {phase === 'block-breaker' && activeCard && <View style={{ flex:1, justifyContent:'center' }}><SequenceGame     onScore={s => handleScore(activeCard.label, activeCard.baseDmg, s, activeCard.shardCost)} fast={false} /></View>}
        {phase === 'power-slash'   && activeCard && <View style={{ flex:1, justifyContent:'center' }}><PowerSlashGame   onScore={s => handleScore(activeCard.label, activeCard.baseDmg, s, activeCard.shardCost)} /></View>}
        {phase === 'earthquake'    && activeCard && <View style={{ flex:1, justifyContent:'center' }}><EarthquakeGame   onScore={s => handleScore(activeCard.label, activeCard.baseDmg, s, activeCard.shardCost)} /></View>}
        {phase === 'defuse'        && activeCard && <View style={{ flex:1, justifyContent:'center' }}><DefuseGame       onScore={s => handleScore(activeCard.label, activeCard.baseDmg, s, activeCard.shardCost)} /></View>}
        {phase === 'combo-chain'   && activeCard && <View style={{ flex:1, justifyContent:'center' }}><SequenceGame     onScore={s => handleScore(activeCard.label, activeCard.baseDmg, s, activeCard.shardCost)} fast={true} /></View>}
        {phase === 'shake-potion'  && activeCard && <View style={{ flex:1, justifyContent:'center' }}><ShakePotionGame  onScore={s => handleScore(activeCard.label, activeCard.baseDmg, s, activeCard.shardCost)} /></View>}
        {phase === 'slingshot'     && activeCard && <SlingshotGame onScore={s => handleScore(activeCard.label, activeCard.baseDmg, s, activeCard.shardCost)} />}
        {phase === 'feed-boss'     && activeCard && <View style={{ flex:1, justifyContent:'center' }}><FeedBossGame onScore={s => handleScore(activeCard.label, activeCard.baseDmg, s, activeCard.shardCost)} onBossReact={t => showBubble(t, 2500)} /></View>}

        {/* ── Card hand (choosing phase) ── */}
        {phase === 'choosing' && (
          <View style={b.actionArea}>
            <View style={b.handGrid}>
              {hand.map((card) => (
                <TouchableOpacity
                  key={card.id}
                  style={b.handCard}
                  onPress={() => handleCardPlay(card)}
                  activeOpacity={0.82}
                >
                  <Image source={card.icon} style={{ width: 44, height: 44 }} resizeMode="contain" />
                  <Text style={b.handLabel} numberOfLines={2}>{card.label}</Text>
                  <Text style={b.handCost}>
                    {card.shardCost > 0 ? `💎 ${card.shardCost}` : card.id === 'defend' ? 'Skip turn' : card.id === 'weakness' ? 'One use' : `${card.baseDmg} dmg`}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* Shard pip bar */}
            <View style={b.coreRow}>
              <Text style={b.coreLabel}>SHARDS</Text>
              <View style={b.corePips}>
                {Array.from({ length: Math.max(6, shards) }).map((_, i) => (
                  <View key={i} style={[b.corePip, i < shards ? b.corePipOn : b.corePipOff]} />
                ))}
              </View>
              <Text style={b.coreCount}>💎{shards}</Text>
            </View>
          </View>
        )}
      </View>
    </View>
  );
}


// ─── Confetti data (module-level, deterministic) ─────────────────────────────
const CONF_EMOJIS = ['🪙', '⭐', '✨', '💫', '🌟'];
const CONF_DATA = [
  { x: 0.08, dur: 2200, delay: 0,   emoji: CONF_EMOJIS[0] },
  { x: 0.18, dur: 2600, delay: 100, emoji: CONF_EMOJIS[1] },
  { x: 0.28, dur: 2000, delay: 200, emoji: CONF_EMOJIS[2] },
  { x: 0.38, dur: 2400, delay: 300, emoji: CONF_EMOJIS[3] },
  { x: 0.48, dur: 2800, delay: 400, emoji: CONF_EMOJIS[4] },
  { x: 0.58, dur: 2100, delay: 500, emoji: CONF_EMOJIS[0] },
  { x: 0.68, dur: 2500, delay: 600, emoji: CONF_EMOJIS[1] },
  { x: 0.78, dur: 2300, delay: 700, emoji: CONF_EMOJIS[2] },
  { x: 0.88, dur: 2700, delay: 800, emoji: CONF_EMOJIS[3] },
  { x: 0.12, dur: 2000, delay: 900, emoji: CONF_EMOJIS[4] },
  { x: 0.52, dur: 2600, delay: 150, emoji: CONF_EMOJIS[0] },
  { x: 0.72, dur: 2200, delay: 450, emoji: CONF_EMOJIS[2] },
];

// ─── KidPayoutScreen ─────────────────────────────────────────────────────────

function KidPayoutScreen({ amount, completedCount, battleWon, battleBonus, monsterImg, monsterName, onDismiss }: {
  amount: number; completedCount: number; battleWon: boolean | null;
  battleBonus: number | null; monsterImg: number; monsterName: string;
  onDismiss: () => void;
}) {
  const { width: W, height: H } = Dimensions.get('window');
  const insets = useSafeAreaInsets();
  const bgColor = battleWon === true ? '#C5F215' : '#FFF9E6';

  // Confetti animated values — use ref to avoid recreating on re-render
  const confettiAnims = useRef(
    CONF_DATA.map(() => new Animated.Value(0))
  ).current;

  // Monster bob
  const monsterBob = useBob(0, 10, 2000);

  // Bank counter animation
  const [displayAmount, setDisplayAmount] = useState(amount);

  useEffect(() => {
    if (amount === 0) return;
    const steps = 30;
    const stepSize = amount / steps;
    let current = amount;
    let count = 0;
    const iv = setInterval(() => {
      count++;
      current = Math.max(0, amount - Math.round(stepSize * count));
      setDisplayAmount(current);
      if (count >= steps) clearInterval(iv);
    }, 1500 / steps);
    return () => clearInterval(iv);
  }, []);

  // Start confetti loops
  useEffect(() => {
    const anims = confettiAnims.map((anim, i) =>
      Animated.loop(
        Animated.timing(anim, {
          toValue: 1,
          duration: CONF_DATA[i].dur,
          delay: CONF_DATA[i].delay,
          useNativeDriver: true,
        })
      )
    );
    anims.forEach(a => a.start());
    return () => anims.forEach(a => a.stop());
  }, []);

  const breakdownBase = completedCount + ' chores ✓';
  const breakdownSuffix = battleWon === true ? ' + Boss Battle' : battleWon === false ? ' + Better luck next week!' : '';

  return (
    <View style={{ flex: 1, backgroundColor: bgColor }}>
      <StatusBar barStyle="dark-content" backgroundColor={bgColor} translucent />
      {/* Confetti layer — starts above the status bar */}
      <View style={StyleSheet.absoluteFill} pointerEvents="none">
        {confettiAnims.map((anim, i) => {
          const translateY = anim.interpolate({
            inputRange: [0, 1],
            outputRange: [-60, H + 60],
          });
          return (
            <Animated.Text
              key={i}
              style={{
                position: 'absolute',
                left: CONF_DATA[i].x * W,
                top: 0,
                fontSize: scale(22),
                transform: [{ translateY }],
                opacity: anim.interpolate({ inputRange: [0, 0.1, 0.85, 1], outputRange: [0, 1, 1, 0] }),
              }}
            >
              {CONF_DATA[i].emoji}
            </Animated.Text>
          );
        })}
      </View>

      <ScrollView contentContainerStyle={{ flexGrow: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 24, paddingTop: insets.top + 24, paddingBottom: insets.bottom + 24, gap: 16 }} showsVerticalScrollIndicator={false}>
        {/* Monster */}
        <Animated.Image
          source={monsterImg}
          style={{ width: scale(200), height: scale(200), transform: [{ translateY: monsterBob }] }}
          resizeMode="contain"
        />

        {/* Amount */}
        {amount > 0 ? (
          <>
            <Text style={{ fontSize: scale(72), fontWeight: '900', color: '#1A1A1A', fontFamily: 'FredokaOne_400Regular', letterSpacing: -2 }}>
              ${(amount / 100).toFixed(2)}
            </Text>
            <Text style={{ fontSize: scale(22), fontFamily: 'Inter_700Bold', color: '#1A1A1A' }}>earned this week!</Text>
          </>
        ) : (
          <Text style={{ fontSize: scale(28), fontFamily: 'Inter_900Black', color: '#1A1A1A', textAlign: 'center' }}>Great work this week! 🎉</Text>
        )}

        {/* Breakdown pill */}
        <View style={{ backgroundColor: '#FFFFFF', borderRadius: 100, borderWidth: 2, borderColor: '#1A1A1A', paddingHorizontal: 18, paddingVertical: 10, flexDirection: 'row', alignItems: 'center', gap: 4, ...SOLID_SHADOW }}>
          <Text style={{ fontSize: scale(14), fontFamily: 'Inter_700Bold', color: '#1A1A1A' }}>{breakdownBase}{breakdownSuffix}</Text>
          {battleWon === true && <Image source={require('./assets/icons/icon-trophy.png')} style={{ width: scale(14), height: scale(14) }} resizeMode="contain" />}
        </View>

        {/* Bank counter */}
        {amount > 0 && (
          <View style={{ backgroundColor: 'rgba(0,0,0,0.08)', borderRadius: 14, paddingHorizontal: 20, paddingVertical: 12 }}>
            <Text style={{ fontSize: scale(15), fontFamily: 'Inter_700Bold', color: '#1A1A1A', textAlign: 'center' }}>
              Bank balance: {fmtCoins(displayAmount)}
            </Text>
          </View>
        )}

        {/* Collect button */}
        <TouchableOpacity
          style={{ backgroundColor: '#FFFFFF', borderRadius: 18, borderWidth: 2.5, borderColor: '#1A1A1A', paddingVertical: 20, paddingHorizontal: 48, alignItems: 'center', ...SOLID_SHADOW, marginTop: 8 }}
          onPress={onDismiss}
          activeOpacity={0.8}
        >
          <Text style={{ fontSize: scale(20), fontFamily: 'Inter_900Black', color: '#1A1A1A' }}>Collect!</Text>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}

function GoalDetailScreen({ goal, onBack, onEdit, baseRate, monsterName }: {
  goal: SavedGoal;
  onBack: () => void;
  onEdit: () => void;
  baseRate: string;
  monsterName?: string;
}) {
  const mn             = monsterName ?? '';
  const targetCents    = Math.round(parseFloat(goal.amount || '0') * 100);
  const pct            = targetCents > 0 ? Math.min(1, goal.savedCents / targetCents) : 0;
  const leftCents      = Math.max(0, targetCents - goal.savedCents);
  const weeklyEarnings = Math.max(1, parseFloat(baseRate) * 100 * 5);
  const weeksToGo      = leftCents > 0 ? Math.ceil(leftCents / weeklyEarnings) : 0;
  const weeksSaving    = Math.round(goal.savedCents / weeklyEarnings);
  const totalWeeks     = Math.round(targetCents / weeklyEarnings);

  // Always format as $X.XX — never mix cents and dollars on this screen
  const fmtD = (cents: number) => `$${(cents / 100).toFixed(2)}`;

  // Next payday day name (defaults to next Friday; will be driven by a setting later)
  const nextPayDay = (() => {
    const DAYS = ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'];
    const today = new Date();
    const daysUntil = ((5 - today.getDay() + 7) % 7) || 7; // next Friday
    const next = new Date(today);
    next.setDate(today.getDate() + daysUntil);
    return DAYS[next.getDay()];
  })();

  // ── Stage label ────────────────────────────────────────────────────────────
  const stageLabel =
    pct >= 1    ? 'Goal reached!'
    : pct >= 0.9  ? 'Almost done!'
    : pct >= 0.5  ? 'Over halfway!'
    : pct >= 0.25 ? 'Building momentum'
    : 'Just getting started';

  const stageLabelColor = pct >= 1 ? '#111111' : '#6B35F0';  // dark on lime when reached

  // ── Mascot copy by progress state ──────────────────────────────────────────
  const mascotMsg =
    pct >= 1    ? `You did it!! ${mn} is SO proud of you! 🎉`
    : pct >= 0.75 ? `So close! One more week could do it! 💪`
    : pct >= 0.5  ? `Halfway there! ${mn} can almost taste the victory! 🎮`
    : pct >= 0.25 ? `You're building momentum — keep those chores going!`
    : pct > 0     ? `${mn} is rooting for you! Keep going! 🔥`
    : `Start completing chores to get closer to your goal! 💪`;

  // ── Stat card helper ────────────────────────────────────────────────────────
  type CardVariant = 'default' | 'purple' | 'green';
  const StatCard = ({ icon, value, label, variant = 'default' }: {
    icon: React.ReactNode; value: string; label: string; variant?: CardVariant;
  }) => {
    const bg     = variant === 'purple' ? '#EAE4FF' : C.bg;
    const border = variant === 'purple' ? '#6B35F0' : '#1A1A1A';
    const valCol = variant === 'purple' ? '#6B35F0' : '#1A1A1A';
    return (
      <View style={{ flex: 1, backgroundColor: bg, borderRadius: 16, borderWidth: 2, borderColor: border, padding: 16, gap: 4, ...SOLID_SHADOW }}>
        {icon}
        <Text style={{ fontSize: scale(22), fontFamily: 'Inter_900Black', color: valCol, letterSpacing: -0.5, marginTop: 4 }} numberOfLines={1} adjustsFontSizeToFit>
          {value}
        </Text>
        <Text style={{ fontSize: scale(12), color: '#ABABAB', fontFamily: 'Inter_600SemiBold', lineHeight: scale(17) }}>
          {label}
        </Text>
      </View>
    );
  };

  const coinIcon     = <Image source={require('./assets/icons/icon-coin.png')}     style={{ width: scale(32), height: scale(32) }} resizeMode="contain" />;
  const calIcon      = <Image source={require('./assets/icons/icon-calendar.png')} style={{ width: scale(32), height: scale(32) }} resizeMode="contain" />;
  const starIcon     = <Image source={require('./assets/icons/icon-star.png')}     style={{ width: scale(32), height: scale(32) }} resizeMode="contain" />;
  const streakIcon   = <Image source={require('./assets/icons/icon-streak.png')}   style={{ width: scale(32), height: scale(32) }} resizeMode="contain" />;
  const gemIcon      = <Image source={require('./assets/icons/icon-gem.png')}      style={{ width: scale(32), height: scale(32) }} resizeMode="contain" />;

  // ── Stat cards per state (0% = 1 row of 2; all others = 2 rows of 2) ────────
  const statRows: [React.ReactNode, React.ReactNode][] = (() => {
    if (pct >= 1) {
      // 100% — celebration layout (green)
      return [
        [
          <StatCard key="a" icon={coinIcon}   value={fmtD(targetCents)}   label="Goal reached!"    variant="green" />,
          <StatCard key="b" icon={starIcon}   value="100%"                 label="Complete"         variant="green" />,
        ],
        [
          <StatCard key="c" icon={calIcon}    value={`${totalWeeks}w`}     label="It took you"      variant="default" />,
          <StatCard key="d" icon={gemIcon}    value="Amazing!"             label="You did it"        variant="green" />,
        ],
      ];
    }
    if (pct >= 0.9) {
      // 90–99% — final push
      return [
        [
          <StatCard key="a" icon={coinIcon}   value={fmtD(goal.savedCents)} label="Saved so far"    variant="purple" />,
          <StatCard key="b" icon={coinIcon}   value={fmtD(leftCents)}       label="Almost there!"   variant="purple" />,
        ],
        [
          <StatCard key="c" icon={calIcon}    value={nextPayDay}            label="Could be the day!" variant="green" />,
          <StatCard key="d" icon={starIcon}   value={`${Math.round(pct * 100)}%`} label="% of the way there" variant="default" />,
        ],
      ];
    }
    if (pct >= 0.5) {
      // 50–89% — over halfway
      return [
        [
          <StatCard key="a" icon={coinIcon}   value={fmtD(goal.savedCents)} label="Saved so far"    variant="purple" />,
          <StatCard key="b" icon={coinIcon}   value={fmtD(leftCents)}       label="So close!"        variant="default" />,
        ],
        [
          <StatCard key="c" icon={calIcon}    value={`~${weeksToGo}w`}      label="Weeks to go"      variant="default" />,
          <StatCard key="d" icon={streakIcon} value={`${weeksSaving}w`}     label="Weeks on a streak" variant="default" />,
        ],
      ];
    }
    if (pct >= 0.25) {
      // 25–49% — building momentum: weeks-to-go appears for the first time
      return [
        [
          <StatCard key="a" icon={coinIcon}   value={fmtD(goal.savedCents)} label="Saved so far"    variant="purple" />,
          <StatCard key="b" icon={coinIcon}   value={fmtD(leftCents)}       label="Still needed"     variant="default" />,
        ],
        [
          <StatCard key="c" icon={calIcon}    value={`~${weeksToGo}w`}      label="Weeks to go"      variant="default" />,
          <StatCard key="d" icon={streakIcon} value={`${Math.max(1, weeksSaving)}w`} label="Weeks saving" variant="default" />,
        ],
      ];
    }
    // 0–24% — just getting started: 2 cards only, no weeks-to-go
    return [
      [
        <StatCard key="a" icon={calIcon}  value={nextPayDay}        label="Next allowance" variant="purple" />,
        <StatCard key="b" icon={coinIcon} value={fmtD(targetCents)} label="Goal target"    variant="default" />,
      ],
    ];
  })();

  const heroBg = pct >= 1 ? '#D8F52F' : '#6B35F0';  // slime lime when goal reached

  // ── Confetti (shown only when goal reached) ──────────────────────────────
  const { width: SW, height: SH } = Dimensions.get('window');
  const CONFETTI_COLORS = ['#D8F52F', '#6B35F0', '#FF6B6B', '#F59E0B', '#3B82F6', '#EC4899'];
  const confettiPieces = useRef(
    Array.from({ length: 40 }, (_, i) => ({
      x:     Math.random() * SW,
      delay: Math.random() * 1200,
      color: CONFETTI_COLORS[i % CONFETTI_COLORS.length],
      size:  6 + Math.random() * 8,
      anim:  new Animated.Value(0),
      rot:   new Animated.Value(0),
    }))
  ).current;

  useEffect(() => {
    if (pct < 1) return;
    const anims = confettiPieces.map(p =>
      Animated.loop(
        Animated.parallel([
          Animated.timing(p.anim, { toValue: 1, duration: 1800 + Math.random() * 800, delay: p.delay, useNativeDriver: true, easing: Easing.linear }),
          Animated.timing(p.rot,  { toValue: 1, duration: 1200 + Math.random() * 600, delay: p.delay, useNativeDriver: true, easing: Easing.linear }),
        ])
      )
    );
    anims.forEach(a => a.start());
    return () => anims.forEach(a => a.stop());
  }, [pct]);

  return (
    <View style={{ flex: 1, backgroundColor: C.bg }}>
      {/* Confetti rain */}
      {pct >= 1 && (
        <View style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, zIndex: 99, pointerEvents: 'none' } as any}>
          {confettiPieces.map((p, i) => (
            <Animated.View
              key={i}
              style={{
                position: 'absolute',
                left: p.x,
                width: p.size,
                height: p.size,
                borderRadius: 2,
                backgroundColor: p.color,
                transform: [
                  { translateY: p.anim.interpolate({ inputRange: [0, 1], outputRange: [-20, SH + 20] }) },
                  { rotate: p.rot.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '360deg'] }) },
                ],
              }}
            />
          ))}
        </View>
      )}
      {/* Edit / close row */}
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingTop: 16, paddingBottom: 8 }}>
        <TouchableOpacity onPress={onEdit} style={{ width: 44, height: 44, alignItems: 'center', justifyContent: 'center' }} activeOpacity={0.7}>
          <Image source={require('./assets/icons/icon-pencil.png')} style={{ width: scale(24), height: scale(24) }} resizeMode="contain" />
        </TouchableOpacity>
        <TouchableOpacity onPress={onBack} style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: '#ECEAE4', alignItems: 'center', justifyContent: 'center' }} activeOpacity={0.7}>
          <Text style={{ fontSize: scale(18), fontFamily: 'Inter_700Bold', color: '#1A1A1A', lineHeight: scale(20) }}>✕</Text>
        </TouchableOpacity>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 60, gap: 16 }}>

        {/* ── Hero card ── */}
        <View style={{ backgroundColor: heroBg, borderRadius: 24, borderWidth: 2, borderColor: '#1A1A1A', paddingVertical: 32, alignItems: 'center', ...SOLID_SHADOW }}>
          <View style={{ width: scale(200), height: scale(200), borderRadius: scale(100), backgroundColor: 'rgba(255,255,255,0.15)', alignItems: 'center', justifyContent: 'center' }}>
            <Image source={goal.icon} style={{ width: scale(180), height: scale(180) }} resizeMode="contain" />
          </View>
        </View>

        {/* ── Name ── */}
        <Text style={{ fontSize: scale(30), fontFamily: 'Inter_900Black', color: '#1A1A1A', textAlign: 'center', letterSpacing: -0.5 }}>
          {goal.name}
        </Text>

        {/* ── Amount + progress ── */}
        <View style={{ gap: 10 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            <Image source={require('./assets/icons/icon-coin.png')} style={{ width: scale(22), height: scale(22) }} resizeMode="contain" />
            <Text style={{ fontSize: scale(20), fontFamily: 'Inter_900Black', color: '#1A1A1A' }}>{fmtD(goal.savedCents)}</Text>
            <Text style={{ fontSize: scale(16), color: '#ABABAB', fontFamily: 'Inter_600SemiBold' }}>/ {fmtD(targetCents)}</Text>
          </View>
          <ProgressBar value={pct * 100} max={100} fillColor={heroBg} />
          <View style={{ flexDirection: 'row', justifyContent: 'flex-end' }}>
            <Text style={{ fontSize: scale(13), fontFamily: 'Inter_700Bold', color: heroBg }}>
              {leftCents > 0 ? `${fmtD(leftCents)} left!` : '🎉 Goal reached!'}
            </Text>
          </View>
        </View>

        {/* ── Stage label pill ── */}
        <View style={{ alignSelf: 'flex-start', backgroundColor: pct >= 1 ? '#D8F52F' : '#EAE4FF', borderRadius: 100, paddingHorizontal: 14, paddingVertical: 6, borderWidth: 1.5, borderColor: '#1A1A1A' }}>
          <Text style={{ fontSize: scale(12), fontFamily: 'Inter_800ExtraBold', color: '#1A1A1A', letterSpacing: 0.3 }}>{stageLabel}</Text>
        </View>

        {/* ── Stat cards (1 row at 0–24%, 2 rows otherwise) ── */}
        <View style={{ gap: 12 }}>
          <View style={{ flexDirection: 'row', gap: 12 }}>{statRows[0]}</View>
          {statRows[1] && <View style={{ flexDirection: 'row', gap: 12 }}>{statRows[1]}</View>}
        </View>

        {/* ── Mascot banner ── */}
        <MascotBanner message={mascotMsg} />

      </ScrollView>
    </View>
  );
}

function Toast({ message }: { message: string }) {
  const opacity = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.sequence([
      Animated.timing(opacity, { toValue: 1, duration: 200, useNativeDriver: true }),
      Animated.delay(1600),
      Animated.timing(opacity, { toValue: 0, duration: 300, useNativeDriver: true }),
    ]).start();
  }, []);
  return (
    <Animated.View style={{ position: 'absolute', top: 60, left: 24, right: 24, opacity, alignItems: 'center', pointerEvents: 'none' }}>
      <View style={{ backgroundColor: '#1A1A1A', borderRadius: 100, paddingHorizontal: 20, paddingVertical: 12 }}>
        <Text style={{ color: '#FFFFFF', fontSize: scale(14), fontFamily: 'Inter_700Bold' }}>{message}</Text>
      </View>
    </Animated.View>
  );
}

function WalletScreen({ coins, done, battleResult, monsterIdx, baseRate, goals, onAddGoal, onOpenGoalFlow, currentStreak, onEditGoal, onDeleteGoal, monsterName, weeklyXp, onSwitchToParent, managedChores, kidProfiles, onSwitchToKid, currentKidName, initialAvatarIdx, onOpenTrophyRoom, onOpenRelicDetail }: {
  coins: number;
  done: Partial<Record<ChoreId, boolean>>;
  battleResult: 'captured' | 'got-away' | null;
  monsterIdx: MonsterIdx;
  baseRate: string;
  goals: SavedGoal[];
  onAddGoal: (data: GoalData) => void;
  onOpenGoalFlow: () => void;
  currentStreak: number;
  onEditGoal: (goal: SavedGoal) => void;
  onDeleteGoal: (id: string) => void;
  monsterName?: string;
  weeklyXp: number;
  onSwitchToParent: () => void;
  managedChores: ManagedChore[];
  kidProfiles: { name: string; avatarColor: string; avatarIdx: number }[];
  onSwitchToKid: (name: string) => void;
  currentKidName: string;
  initialAvatarIdx: number;
  onOpenTrophyRoom: () => void;
  onOpenRelicDetail: (itemKey: string) => void;
}) {
  const completedChoresCount = managedChores.filter(c => c.status === 'approved').length;
  const [showGoalModal, setShowGoalModal]           = useState(false);
  const [selectedGoal, setSelectedGoal]             = useState<SavedGoal | null>(null);
  const [editingGoal, setEditingGoal]               = useState<SavedGoal | null>(null);
  const [kidAvatarIdx, setKidAvatarIdx]             = useState(initialAvatarIdx);
  const [kidAgeRange,  setKidAgeRange]              = useState('Ages 7–9');
  const [recentTrophies, setRecentTrophies]         = useState<CollectibleEntry[]>([]);
  useEffect(() => {
    getCollectibles().then(all => {
      const seen = new Set<string>();
      setRecentTrophies(all.filter(e => { if (seen.has(e.itemKey)) return false; seen.add(e.itemKey); return true; }).slice(0, 3));
    });
  }, []);
  const [toastMsg, setToastMsg]           = useState<string | null>(null);
  const toastTimer                        = useRef<ReturnType<typeof setTimeout> | null>(null);
  const showToast = (msg: string) => {
    setToastMsg(null); // reset first so re-mount triggers fresh animation
    setTimeout(() => {
      setToastMsg(msg);
      if (toastTimer.current) clearTimeout(toastTimer.current);
      toastTimer.current = setTimeout(() => setToastMsg(null), 2100);
    }, 0);
  };
  const dollars = (coins / 100).toFixed(2);

  const currentGoal = goals[0] ?? null;
  const targetCents = currentGoal ? Math.round(parseFloat(currentGoal.amount || '0') * 100) : 0;
  const savedCents  = currentGoal?.savedCents ?? 0;
  const pct         = targetCents > 0 ? Math.min(1, savedCents / targetCents) : 0;
  const leftCents   = Math.max(0, targetCents - savedCents);

  return (
    <View style={{ flex: 1, backgroundColor: C.bg }}>
      <Image
        source={require('./assets/appBG.png')}
        style={{ position: 'absolute', width: '100%', aspectRatio: 1024 / 1536, bottom: 0 }}
        resizeMode="contain"
      />
      {/* Same header as Home / World tabs */}
      <View style={[s.homeHeader, { backgroundColor: 'transparent' }]}>
        <View style={s.homeHeaderLeft}>
          <AvatarPickerSheet selected={kidAvatarIdx} onSelect={setKidAvatarIdx} />
          <View style={{ gap: 2 }}>
            <ViewSwitcher
              selected={currentKidName || 'Kid view'}
              options={[
                ...kidProfiles.map(k => ({ label: k.name, emoji: '🧒', bg: k.avatarColor || '#EAE4FF', image: getAvatarImage(k.avatarIdx) })),
                { label: 'Parent view', emoji: '👩', bg: '#C5F215' },
              ]}
              onSelect={(opt) => { if (opt.label === 'Parent view') onSwitchToParent(); else onSwitchToKid(opt.label); }}
            />
          </View>
        </View>
        <View style={s.homeBalancePill}>
          <Text style={s.homeBalanceText}>${dollars}</Text>
          <Image source={require('./assets/icons/icon-coin.png')} style={{ width: scale(20), height: scale(20) }} resizeMode="contain" />
        </View>
      </View>

      <ScrollView
        style={{ flex: 1, backgroundColor: C.bg }}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 120, paddingTop: 16, gap: 16 }}
      >

        {/* ── Stat pills row ────────────────────────── */}
        <View style={{ flexDirection: 'row', gap: 12 }}>
          {/* Streak */}
          <View style={{ flex: 1, backgroundColor: '#FFFFFF', borderRadius: 16, borderWidth: 2, borderColor: '#1A1A1A', padding: 16, flexDirection: 'row', alignItems: 'center', gap: 12, ...SOLID_SHADOW }}>
            <Image source={require('./assets/icons/icon-streak.png')} style={{ width: scale(36), height: scale(36) }} resizeMode="contain" />
            <View>
              <Text style={{ fontSize: scale(24), fontFamily: 'Inter_900Black', color: '#1A1A1A', letterSpacing: -1 }}>{currentStreak}</Text>
              <Text style={{ fontSize: scale(12), color: '#ABABAB', fontFamily: 'Inter_600SemiBold' }}>Day Streak</Text>
            </View>
          </View>
          {/* Coins */}
          <View style={{ flex: 1, backgroundColor: '#FFFFFF', borderRadius: 16, borderWidth: 2, borderColor: '#1A1A1A', padding: 16, flexDirection: 'row', alignItems: 'center', gap: 12, ...SOLID_SHADOW }}>
            <Image source={require('./assets/icons/icon-coin.png')} style={{ width: scale(36), height: scale(36) }} resizeMode="contain" />
            <View>
              <Text style={{ fontSize: scale(24), fontFamily: 'Inter_900Black', color: '#1A1A1A', letterSpacing: -1 }}>{coins.toLocaleString()}</Text>
              <Text style={{ fontSize: scale(12), color: '#ABABAB', fontFamily: 'Inter_600SemiBold' }}>Coins</Text>
            </View>
          </View>
        </View>

        {/* ── Current goal card ─────────────────────── */}
        <View style={{ backgroundColor: '#FFFFFF', borderRadius: 20, borderWidth: 2, borderColor: '#1A1A1A', padding: 20, ...SOLID_SHADOW }}>
          {/* Header label */}
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 16 }}>
            <Image source={require('./assets/icons/icon-goals.png')} style={{ width: scale(20), height: scale(20) }} resizeMode="contain" />
            <Text style={{ fontSize: scale(12), fontFamily: 'Inter_900Black', color: '#1A1A1A', letterSpacing: 1.5 }}>CURRENT GOAL</Text>
          </View>

          {currentGoal ? (
            <TouchableOpacity onPress={() => setSelectedGoal(currentGoal)} activeOpacity={0.85}>
              {/* Goal image in lavender circle */}
              <View style={{ alignItems: 'center', marginBottom: 16 }}>
                <View style={{ width: scale(180), height: scale(180), borderRadius: scale(90), backgroundColor: '#EAE4FF', alignItems: 'center', justifyContent: 'center' }}>
                  <Image source={currentGoal.icon} style={{ width: scale(160), height: scale(160) }} resizeMode="contain" />
                </View>
              </View>

              {/* Name */}
              <Text style={{ fontSize: scale(22), fontFamily: 'Inter_900Black', color: '#1A1A1A', textAlign: 'center', marginBottom: 12 }}>
                {currentGoal.name}
              </Text>

              {/* Amount row */}
              <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 4, marginBottom: 10 }}>
                <Text style={{ fontSize: scale(18), fontFamily: 'Inter_900Black', color: '#1A1A1A' }}>{fmtCoins(savedCents)}</Text>
                <Text style={{ fontSize: scale(14), color: '#ABABAB', fontFamily: 'Inter_600SemiBold' }}>/ ${currentGoal.amount}</Text>
              </View>

              {/* Progress bar + left label */}
              <ProgressBar value={pct * 100} max={100} fillColor={pct >= 1 ? '#D8F52F' : '#6B35F0'} style={{ marginBottom: 6 }} />
              <View style={{ flexDirection: 'row', justifyContent: 'flex-end' }}>
                <Text style={{ fontSize: scale(13), fontFamily: 'Inter_700Bold', color: pct >= 1 ? '#111111' : '#6B35F0' }}>
                  {leftCents > 0 ? `${fmtCoins(leftCents)} left!` : '🎉 Goal reached!'}
                </Text>
              </View>
            </TouchableOpacity>
          ) : (
            /* Empty state */
            <TouchableOpacity
              style={{ alignItems: 'center', paddingVertical: 24, gap: 10 }}
              onPress={() => { setEditingGoal(null); setShowGoalModal(true); }}
              activeOpacity={0.8}
            >
              <View style={{ width: scale(100), height: scale(100), borderRadius: scale(50), backgroundColor: '#EAE4FF', alignItems: 'center', justifyContent: 'center' }}>
                <Image source={require('./assets/icons/icon-goals.png')} style={{ width: scale(52), height: scale(52) }} resizeMode="contain" />
              </View>
              <Text style={{ fontSize: scale(16), fontFamily: 'Inter_800ExtraBold', color: '#1A1A1A' }}>No goal set yet</Text>
              <Text style={{ fontSize: scale(13), color: '#ABABAB', textAlign: 'center' }}>What are you saving up for?</Text>
              <View style={{ backgroundColor: '#6B35F0', borderRadius: 12, borderWidth: 2, borderColor: '#1A1A1A', paddingHorizontal: 20, paddingVertical: 10, marginTop: 4, ...SOLID_SHADOW }}>
                <Text style={{ fontSize: scale(14), fontFamily: 'Inter_800ExtraBold', color: '#FFFFFF' }}>+ Set a goal</Text>
              </View>
            </TouchableOpacity>
          )}
        </View>

        {/* ── This week ─────────────────────────────── */}
        <View>
          <Text style={{ fontSize: scale(20), fontFamily: 'Inter_900Black', color: '#1A1A1A', marginBottom: 12 }}>This week</Text>
          <View style={{ backgroundColor: '#FFFFFF', borderRadius: 20, borderWidth: 2, borderColor: '#1A1A1A', padding: 20, flexDirection: 'row', ...SOLID_SHADOW }}>
            {/* Chores Done */}
            <View style={{ flex: 1, alignItems: 'center', gap: 6 }}>
              <Image source={require('./assets/icons/icon-completed.png')} style={{ width: scale(36), height: scale(36) }} resizeMode="contain" />
              <Text style={{ fontSize: scale(28), fontFamily: 'Inter_900Black', color: '#1A1A1A', letterSpacing: -1 }}>{completedChoresCount}</Text>
              <Text style={{ fontSize: scale(11), color: '#ABABAB', fontFamily: 'Inter_600SemiBold', textAlign: 'center' }}>Chores Done</Text>
            </View>
            {/* Divider */}
            <View style={{ width: 1, backgroundColor: '#ECEAE4', marginVertical: 4 }} />
            {/* Coins Earned */}
            <View style={{ flex: 1, alignItems: 'center', gap: 6 }}>
              <Image source={require('./assets/icons/icon-coin.png')} style={{ width: scale(36), height: scale(36) }} resizeMode="contain" />
              <Text style={{ fontSize: scale(28), fontFamily: 'Inter_900Black', color: '#1A1A1A', letterSpacing: -1 }}>{coins.toLocaleString()}</Text>
              <Text style={{ fontSize: scale(11), color: '#ABABAB', fontFamily: 'Inter_600SemiBold', textAlign: 'center' }}>Coins Earned</Text>
            </View>
            {/* Divider */}
            <View style={{ width: 1, backgroundColor: '#ECEAE4', marginVertical: 4 }} />
            {/* XP Earned */}
            <View style={{ flex: 1, alignItems: 'center', gap: 6 }}>
              <Image source={require('./assets/icons/icon-star.png')} style={{ width: scale(36), height: scale(36) }} resizeMode="contain" />
              <Text style={{ fontSize: scale(28), fontFamily: 'Inter_900Black', color: '#1A1A1A', letterSpacing: -1 }}>{weeklyXp.toLocaleString()}</Text>
              <Text style={{ fontSize: scale(11), color: '#ABABAB', fontFamily: 'Inter_600SemiBold', textAlign: 'center' }}>XP earned</Text>
            </View>
          </View>
        </View>

        {/* ── Recent trophies ──────────────────────── */}
        {recentTrophies.length > 0 && (
          <View>
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
              <Text style={{ fontSize: scale(20), fontFamily: 'Inter_900Black', color: '#1A1A1A' }}>Recent trophies</Text>
              <TouchableOpacity onPress={onOpenTrophyRoom} activeOpacity={0.7}>
                <Text style={{ fontSize: fontSize.base, fontFamily: 'Inter_700Bold', color: '#6B35F0' }}>See all →</Text>
              </TouchableOpacity>
            </View>
            <View style={{ gap: 8 }}>
              {recentTrophies.map((entry) => {
                const def = COLLECTIBLES.find(c => c.key === entry.itemKey);
                const rarityColors: Record<string, string> = { Common: '#666666', Rare: '#1A6BB5', Epic: '#6B35F0', Legendary: '#B8600A' };
                const rarityBg:     Record<string, string> = { Common: '#F3F3F3', Rare: '#EAF3FB', Epic: '#EDE9FC', Legendary: '#FFF3C4' };
                const col    = rarityColors[entry.rarity] ?? '#666666';
                const iconBg = rarityBg[entry.rarity]     ?? '#F3F3F3';
                return (
                  <ListCell
                    key={entry.id}
                    iconBg={iconBg}
                    icon={def ? <Image source={def.image} style={{ width: scale(44), height: scale(44) }} resizeMode="contain" /> : null}
                    title={COLLECTIBLES.find(c => c.key === entry.itemKey)?.name ?? entry.itemName}
                    subtitle={entry.weekLabel}
                    onPress={() => onOpenRelicDetail(entry.itemKey)}
                    right={
                      <View style={{ backgroundColor: col + '18', borderRadius: 20, paddingHorizontal: 10, paddingVertical: 4, borderWidth: 1.5, borderColor: col }}>
                        <Text style={{ fontSize: scale(10), fontFamily: 'Inter_800ExtraBold', color: col, letterSpacing: 0.3 }}>{entry.rarity.toUpperCase()}</Text>
                      </View>
                    }
                  />
                );
              })}
            </View>
          </View>
        )}

        {/* ── Other goals (if more than one) ───────── */}
        {goals.length > 1 && (
          <View>
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
              <Text style={{ fontSize: scale(20), fontFamily: 'Inter_900Black', color: '#1A1A1A' }}>Other goals</Text>
              <TouchableOpacity
                style={{ backgroundColor: '#C5F215', borderRadius: 20, borderWidth: 2, borderColor: '#1A1A1A', paddingHorizontal: 14, paddingVertical: 6, ...SOLID_SHADOW }}
                onPress={() => { setEditingGoal(null); setShowGoalModal(true); }}
                activeOpacity={0.8}
              >
                <Text style={{ fontSize: scale(13), fontFamily: 'Inter_800ExtraBold', color: '#1A1A1A' }}>+ Add</Text>
              </TouchableOpacity>
            </View>
            <View style={{ gap: 10 }}>
              {goals.slice(1).map(goal => {
                const tCents = Math.round(parseFloat(goal.amount || '0') * 100);
                const p      = tCents > 0 ? Math.min(1, goal.savedCents / tCents) : 0;
                return (
                  <TouchableOpacity
                    key={goal.id}
                    onPress={() => setSelectedGoal(goal)}
                    activeOpacity={0.8}
                    style={{ backgroundColor: '#FFFFFF', borderRadius: 14, borderWidth: 2, borderColor: '#1A1A1A', padding: 14, ...SOLID_SHADOW }}
                  >
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 10 }}>
                      <Image source={goal.icon} style={{ width: scale(40), height: scale(40) }} resizeMode="contain" />
                      <View style={{ flex: 1 }}>
                        <Text style={{ fontSize: scale(16), fontFamily: 'Inter_700Bold', color: '#1A1A1A' }}>{goal.name}</Text>
                        <Text style={{ fontSize: scale(13), color: '#ABABAB', marginTop: 2 }}>{fmtCoins(goal.savedCents)} saved of ${goal.amount}</Text>
                      </View>
                      <Text style={{ fontSize: scale(14), fontFamily: 'Inter_800ExtraBold', color: '#6B35F0' }}>{Math.round(p * 100)}%</Text>
                    </View>
                    <ProgressBar value={p * 100} max={100} fillColor="#6B35F0" height={8} />
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>
        )}


      </ScrollView>

      {/* Goal detail modal */}
      <Modal
        visible={selectedGoal !== null && !showGoalModal}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setSelectedGoal(null)}
      >
        <SafeAreaProvider>
          <StatusBar barStyle="dark-content" />
          {selectedGoal && (
            <GoalDetailScreen
              goal={selectedGoal}
              onBack={() => setSelectedGoal(null)}
              onEdit={() => { setEditingGoal(selectedGoal); setSelectedGoal(null); setShowGoalModal(true); }}
              baseRate={baseRate}
              monsterName={monsterName}
            />
          )}
        </SafeAreaProvider>
      </Modal>

      {/* Goal creation / edit modal */}
      <Modal
        visible={showGoalModal}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => { setShowGoalModal(false); setEditingGoal(null); }}
      >
        <SafeAreaProvider>
          <StatusBar barStyle="dark-content" />
          <GoalCreationFlow
            onDone={() => { setShowGoalModal(false); setEditingGoal(null); }}
            onCancel={() => { setShowGoalModal(false); setEditingGoal(null); }}
            onGoalCreated={(data) => {
              if (editingGoal) {
                onEditGoal({ ...editingGoal, name: data.name, amount: data.amount, color: data.color, icon: data.icon, category: data.category });
                showToast('Goal updated! ✅');
              } else {
                onAddGoal(data);
                showToast('Goal created! 🎯');
              }
            }}
            onDeleteGoal={() => {
              if (editingGoal) {
                onDeleteGoal(editingGoal.id);
                // Dismiss both modals and clear all related state at once
                // so the wallet screen is fully restored in one render pass
                setShowGoalModal(false);
                setEditingGoal(null);
                setSelectedGoal(null);
                showToast('Goal deleted');
              }
            }}
            savedCents={editingGoal?.savedCents}
            initialData={editingGoal ? { name: editingGoal.name, amount: editingGoal.amount, category: editingGoal.category, color: editingGoal.color, icon: editingGoal.icon } : undefined}
            monsterName={monsterName}
          />
        </SafeAreaProvider>
      </Modal>

      {/* Toast */}
      {toastMsg && <Toast key={toastMsg + Date.now()} message={toastMsg} />}
    </View>
  );
}

function EvolveScreen({ fromIdx, onDone, monsterId }: { fromIdx: MonsterIdx; onDone: () => void; monsterId: MonsterId }) {
  const toIdx     = Math.min(fromIdx + 1, 7) as MonsterIdx;
  const toM       = MONSTERS[toIdx];
  const fromImg   = monsterImgSrc(monsterId, fromIdx);
  const toImg     = monsterImgSrc(monsterId, toIdx);

  const { width: W, height: H } = Dimensions.get('window');
  const cx        = W / 2;
  const monsterCY = H * 0.44;

  // All animation state kept in a ref to avoid stale closures in the RAF loop
  const v = useRef({
    t: 0,
    bgDark: 0, beamReach: 0, beamIntensity: 0,
    sourceFlare: 0, chargeRing: 0, screenWhite: 0, purpleFlash: 0,
    monsterAlpha: 1, monsterScale: 1,
    newMonsterAlpha: 0, newMonsterScale: 0,
    bannerOpacity: 0, ctaOpacity: 0,
    shakeX: 0, shakeY: 0,
  }).current;

  type Ring     = { r: number; alpha: number; key: number };
  type Particle = { x: number; y: number; vx: number; vy: number; r: number; color: string; alpha: number; key: number };
  const ringsRef     = useRef<Ring[]>([]);
  const particlesRef = useRef<Particle[]>([]);
  const ringKey      = useRef(0);
  const pKey         = useRef(0);

  const [, setTick]  = useState(0);
  const isMounted    = useRef(true);
  useEffect(() => () => { isMounted.current = false; }, []);

  useEffect(() => {
    let rafId: number;
    let running = true;

    // Frame loop — updates rings/particles and triggers re-render
    const frame = () => {
      if (!running) return;
      v.t += 0.025;
      ringsRef.current.forEach(r => { r.r += 2.5; r.alpha -= 0.016; });
      ringsRef.current = ringsRef.current.filter(r => r.alpha > 0);
      particlesRef.current.forEach(p => { p.x += p.vx; p.y += p.vy; p.vy += 0.08; p.alpha -= 0.013; });
      particlesRef.current = particlesRef.current.filter(p => p.alpha > 0);
      if (isMounted.current) setTick(n => n + 1);
      rafId = requestAnimationFrame(frame);
    };
    rafId = requestAnimationFrame(frame);

    // Smooth value interpolator
    const animV = (set: (x: number) => void, from: number, to: number, dur: number, ease = (t: number) => t) =>
      new Promise<void>(resolve => {
        const start = Date.now();
        const tick = () => {
          if (!running) { resolve(); return; }
          const p = Math.min((Date.now() - start) / dur, 1);
          set(from + (to - from) * ease(p));
          if (p < 1) requestAnimationFrame(tick); else resolve();
        };
        requestAnimationFrame(tick);
      });

    const wait      = (ms: number) => new Promise<void>(r => setTimeout(r, ms));
    const easeOut   = (t: number) => 1 - (1 - t) ** 2;
    const easeInOut = (t: number) => t < 0.5 ? 2 * t * t : 1 - (-2 * t + 2) ** 2 / 2;
    const easeOut5  = (t: number) => 1 - (1 - t) ** 5;

    const spawnRing = () => ringsRef.current.push({ r: 8, alpha: 0.85, key: ringKey.current++ });
    const spawnParticles = () => {
      // Heavy purple palette — just a few whites for pop
      const cols = ['#a855f7', '#9333ea', '#c084fc', '#7c3aed', '#d8b4fe', '#a855f7', '#6d28d9', '#ffffff', '#e9d5ff', '#c5f215'];
      // Radial burst — 30 particles
      for (let i = 0; i < 30; i++) {
        const a   = (i / 30) * Math.PI * 2;
        const spd = 6 + Math.random() * 10;
        particlesRef.current.push({ x: cx, y: monsterCY, vx: Math.cos(a) * spd, vy: Math.sin(a) * spd - 3, r: 5 + Math.random() * 9, color: cols[i % cols.length], alpha: 1, key: pKey.current++ });
      }
      // Upward shower sparks
      for (let i = 0; i < 20; i++) {
        particlesRef.current.push({ x: cx + (Math.random() - 0.5) * 120, y: monsterCY - Math.random() * 80, vx: (Math.random() - 0.5) * 5, vy: -(7 + Math.random() * 10), r: 3 + Math.random() * 6, color: cols[Math.floor(Math.random() * cols.length)], alpha: 1, key: pKey.current++ });
      }
      // Chunky close-range shards
      for (let i = 0; i < 10; i++) {
        const a = Math.random() * Math.PI * 2;
        const spd = 2 + Math.random() * 4;
        particlesRef.current.push({ x: cx + (Math.random()-0.5)*40, y: monsterCY + (Math.random()-0.5)*40, vx: Math.cos(a)*spd, vy: Math.sin(a)*spd - 1, r: 8 + Math.random() * 10, color: i % 2 === 0 ? '#7c3aed' : '#a855f7', alpha: 0.85, key: pKey.current++ });
      }
    };
    const doShake = (amp: number, dur: number) => {
      const start = Date.now();
      const tick = () => {
        if (!running) return;
        const e = Date.now() - start;
        if (e < dur) {
          const d = 1 - e / dur;
          v.shakeX = (Math.random() - 0.5) * amp * 2 * d;
          v.shakeY = (Math.random() - 0.5) * amp * 2 * d;
          setTimeout(tick, 28);
        } else { v.shakeX = 0; v.shakeY = 0; }
      };
      tick();
    };

    (async () => {
      // 1. Charge build-up
      await Promise.all([
        animV(x => v.bgDark = x,      0, 1,   1300, easeInOut),
        animV(x => v.chargeRing = x,  0, 1,   1300, easeOut),
        animV(x => v.sourceFlare = x, 0, 0.4, 900,  easeOut),
      ]);
      // 2. Beam shoots down (fast!)
      await Promise.all([
        animV(x => v.beamReach = x,     0,   1,    210, easeOut5),
        animV(x => v.beamIntensity = x, 0,   0.75, 190, easeOut),
        animV(x => v.sourceFlare = x,   0.4, 1,    190, easeOut),
      ]);
      // 3. Hold — monster trembles in beam
      doShake(4, 900);
      spawnRing(); spawnRing();
      await wait(200); spawnRing();
      await animV(x => v.beamIntensity = x, 0.75, 1, 180, easeOut);
      await wait(320); spawnRing();
      await wait(150);
      // 4. Flash!
      doShake(30, 800);
      // Purple pre-flash then white out
      await Promise.all([
        animV(x => v.purpleFlash = x,   0, 1,   80, easeOut5),
        animV(x => v.beamIntensity = x, 1, 2.5, 80),
        animV(x => v.sourceFlare = x,   1, 2,   80),
      ]);
      await Promise.all([
        animV(x => v.screenWhite = x,   0, 1,   90, easeOut5),
        animV(x => v.purpleFlash = x,   1, 0,   90),
        animV(x => v.beamIntensity = x, 2.5, 0, 90),
        animV(x => v.sourceFlare = x,   2, 0,   90),
        animV(x => v.monsterAlpha = x,  1, 0,   90),
      ]);
      spawnParticles(); spawnParticles(); // double burst
      spawnRing(); spawnRing(); spawnRing(); spawnRing(); spawnRing();
      await wait(75);
      // 5. Reveal new monster
      await Promise.all([
        animV(x => v.screenWhite = x,      1, 0,   700, easeOut),
        animV(x => v.newMonsterScale = x,  0, 1.2, 420, easeOut5),
        animV(x => v.newMonsterAlpha = x,  0, 1,   420, easeOut),
        animV(x => v.chargeRing = x,       1, 0,   400),
        animV(x => v.bgDark = x,           1, 0.5, 650),
      ]);
      await animV(x => v.newMonsterScale = x, 1.2, 1, 320, easeOut);
      await animV(x => v.bannerOpacity = x, 0, 1, 400, easeOut);
      await animV(x => v.ctaOpacity = x,    0, 1, 300, easeOut);
    })().catch(() => {});

    return () => { running = false; cancelAnimationFrame(rafId); };
  }, []);

  const beamBottom  = v.beamReach * monsterCY;
  const bOuter = 140, bMid = 60, bCore = 10;

  return (
    <View style={{ flex: 1, backgroundColor: '#0a0814' }}>

      {/* SVG layer: beam, charge rings, particles */}
      <Svg width={W} height={H} style={StyleSheet.absoluteFill} pointerEvents="none">
        <Defs>
          <SvgLinearGradient id="bOuter" x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0"   stopColor="#c084fc" stopOpacity={Math.min(1, v.beamIntensity * 0.7)} />
            <Stop offset="0.5" stopColor="#a855f7" stopOpacity={Math.min(1, v.beamIntensity * 0.4)} />
            <Stop offset="1"   stopColor="#7c3aed" stopOpacity="0" />
          </SvgLinearGradient>
          <SvgLinearGradient id="bMid" x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0"   stopColor="#e9d5ff" stopOpacity={Math.min(1, v.beamIntensity * 0.85)} />
            <Stop offset="0.7" stopColor="#c084fc" stopOpacity={Math.min(1, v.beamIntensity * 0.5)} />
            <Stop offset="1"   stopColor="#a855f7" stopOpacity="0" />
          </SvgLinearGradient>
          <SvgLinearGradient id="bCore" x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0" stopColor="#ffffff" stopOpacity={Math.min(1, v.beamIntensity)} />
            <Stop offset="1" stopColor="#e9d5ff" stopOpacity={Math.min(1, v.beamIntensity * 0.7)} />
          </SvgLinearGradient>
        </Defs>

        {/* Full-screen nebula glow when beam fires */}
        {v.beamIntensity > 0.05 && (
          <Ellipse cx={cx} cy={-20} rx={W} ry={H * 0.55} fill={`rgba(120,60,220,${Math.min(0.4, v.beamIntensity * 0.25)})`} />
        )}

        {/* Charge rings + spokes */}
        {v.chargeRing > 0 && [0,1,2,3,4,5].map(i => {
          const r = 70 + i * 18 + Math.sin(v.t * 4) * 6;
          return <Circle key={i} cx={cx} cy={monsterCY} r={r} fill="none" stroke={`rgba(190,140,255,${v.chargeRing * (0.28 - i * 0.04)})`} strokeWidth={2.5 + i * 0.5} />;
        })}
        {v.chargeRing > 0 && Array.from({ length: 12 }, (_, i) => {
          const a = (i / 12) * Math.PI * 2 + v.t * 1.2;
          const d = 130 + v.chargeRing * 22;
          return (
            <Line key={i}
              x1={cx + Math.cos(a) * d}  y1={monsterCY + Math.sin(a) * d}
              x2={cx + Math.cos(a) * 52} y2={monsterCY + Math.sin(a) * 52}
              stroke={`rgba(220,180,255,${v.chargeRing * 0.55})`} strokeWidth={2}
            />
          );
        })}

        {/* Ground rings */}
        {ringsRef.current.map(r => (
          <Circle key={r.key} cx={cx} cy={monsterCY + 55} r={r.r} fill="none" stroke={`rgba(168,85,247,${r.alpha})`} strokeWidth={2.5} />
        ))}

        {/* Beam — three layers */}
        {v.beamIntensity > 0.01 && beamBottom > 2 && <>
          {/* Wide outer purple glow */}
          <Polygon points={`${cx},0 ${cx-bOuter},${beamBottom} ${cx+bOuter},${beamBottom}`} fill="url(#bOuter)" />
          {/* Mid white-purple layer */}
          <Polygon points={`${cx},0 ${cx-bMid},${beamBottom}   ${cx+bMid},${beamBottom}`}   fill="url(#bMid)" />
          {/* Bright core */}
          <Polygon points={`${cx},0 ${cx-bCore},${beamBottom}  ${cx+bCore},${beamBottom}`}  fill="url(#bCore)" />
          {/* Huge bloom at impact */}
          <Ellipse cx={cx} cy={beamBottom} rx={180} ry={55} fill={`rgba(168,85,247,${Math.min(0.5, v.beamIntensity * 0.4)})`} />
          <Ellipse cx={cx} cy={beamBottom} rx={110} ry={36} fill={`rgba(220,180,255,${Math.min(0.7, v.beamIntensity * 0.55)})`} />
          <Ellipse cx={cx} cy={beamBottom} rx={55}  ry={20} fill={`rgba(255,255,255,${Math.min(0.9, v.beamIntensity * 0.75)})`} />
        </>}

        {/* Source flare — huge */}
        {v.sourceFlare > 0.01 && <>
          <Ellipse cx={cx} cy={0} rx={Math.min(W, 160 + v.sourceFlare * 120)} ry={Math.min(W, 160 + v.sourceFlare * 120)} fill={`rgba(160,80,255,${Math.min(0.6, v.sourceFlare * 0.5)})`} />
          <Ellipse cx={cx} cy={0} rx={80 + v.sourceFlare * 60} ry={80 + v.sourceFlare * 60} fill={`rgba(220,170,255,${Math.min(0.8, v.sourceFlare * 0.7)})`} />
          <Ellipse cx={cx} cy={0} rx={36} ry={36} fill={`rgba(255,255,255,${Math.min(1, v.sourceFlare)})`} />
        </>}

        {/* Particles */}
        {particlesRef.current.map(p => (
          <Circle key={p.key} cx={p.x} cy={p.y} r={p.r} fill={p.color} opacity={Math.max(0, p.alpha)} />
        ))}
      </Svg>

      {/* Old monster (shakes in beam) */}
      {v.monsterAlpha > 0.01 && (
        <View style={{
          position: 'absolute',
          top: monsterCY - 170, left: cx - 100, width: 200, height: 200,
          opacity: v.monsterAlpha,
          transform: [{ scale: v.monsterScale }, { translateX: v.shakeX }, { translateY: v.shakeY }],
        }}>
          <View style={{ flex: 1, borderRadius: 100, backgroundColor: 'rgba(168,85,247,0.15)', alignItems: 'center', justifyContent: 'center' }}>
            <Image source={fromImg} style={{ width: 180, height: 180 }} resizeMode="contain" />
          </View>
        </View>
      )}

      {/* New monster springs in */}
      {v.newMonsterAlpha > 0.01 && (
        <View style={{
          position: 'absolute',
          top: monsterCY - 230, left: cx - 160, width: 320, height: 320,
          opacity: v.newMonsterAlpha,
          transform: [{ scale: v.newMonsterScale }],
        }}>
          <View style={{ flex: 1, borderRadius: 160, backgroundColor: 'rgba(197,242,21,0.12)', borderWidth: 3, borderColor: '#C5F215', alignItems: 'center', justifyContent: 'center' }}>
            <Image source={toImg} style={{ width: 300, height: 300 }} resizeMode="contain" />
          </View>
        </View>
      )}

      {/* EVOLVED! banner */}
      {v.bannerOpacity > 0.01 && (
        <View style={{ position: 'absolute', bottom: 200, left: 0, right: 0, alignItems: 'center', opacity: v.bannerOpacity }}>
          <Text style={{ fontSize: scale(52), fontFamily: 'Inter_900Black', color: '#C5F215', letterSpacing: -1 }}>EVOLVED!</Text>
          <Text style={{ fontSize: scale(15), color: 'rgba(255,255,255,0.65)', marginTop: 6 }}>{toM.name} · Level {toM.level}</Text>
        </View>
      )}

      {/* Continue button */}
      {v.ctaOpacity > 0.01 && (
        <View style={{ position: 'absolute', bottom: 60, left: 24, right: 24, opacity: v.ctaOpacity }}>
          <TouchableOpacity style={s.evCta} onPress={onDone} activeOpacity={0.85}>
            <Text style={s.evCtaText}>Continue</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Purple pre-flash */}
      {v.purpleFlash > 0.01 && (
        <View style={[StyleSheet.absoluteFill, { backgroundColor: '#7c3aed', opacity: v.purpleFlash }]} pointerEvents="none" />
      )}

      {/* White mega-flash */}
      {v.screenWhite > 0.01 && (
        <View style={[StyleSheet.absoluteFill, { backgroundColor: 'white', opacity: v.screenWhite }]} pointerEvents="none" />
      )}
    </View>
  );
}

// ─── Parent Screens ───────────────────────────────────────────────────────────

function ParentPayoutScreen({ kidName, coins, baseCoins, battleBonus, battleWon, completedChores, onConfirm, onBack }: {
  kidName: string; coins: number; baseCoins: number; battleBonus: number | null;
  battleWon: boolean | null; completedChores: ManagedChore[];
  onConfirm: () => void; onBack: () => void;
}) {
  return (
    <CreamBg>
      {/* Header */}
      <View style={p.screenHeader}>
        <TouchableOpacity onPress={onBack} style={p.backBtn} activeOpacity={0.7}>
          <Text style={p.backBtnText}>←</Text>
        </TouchableOpacity>
        <Text style={p.screenTitle}>Payout</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView style={{ flex: 1 }} showsVerticalScrollIndicator={false} contentContainerStyle={{ padding: 16, gap: 16, paddingBottom: 120 }}>
        {/* Intro line */}
        <Text style={{ fontSize: scale(16), color: '#1A1A1A', fontFamily: 'Inter_600SemiBold' }}>
          Here's what {kidName} earned this week.
        </Text>

        {/* Main card */}
        <View style={[p.sectionCard, { gap: 0 }]}>
          {/* Big amount */}
          <View style={{ alignItems: 'center', paddingVertical: 20, borderBottomWidth: 1, borderBottomColor: '#ECEAE4' }}>
            <Text style={{ fontSize: scale(48), fontWeight: '900', color: '#1A1A1A', fontFamily: 'FredokaOne_400Regular', letterSpacing: -1 }}>
              {fmtCoins(coins)}
            </Text>
          </View>

          {/* Breakdown rows */}
          <View style={{ paddingTop: 4 }}>
            <View style={p.payoutBreakdownRow}>
              <Text style={p.payoutBreakdownLabel}>Chores completed</Text>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                <Text style={{ fontSize: scale(13), color: '#3B8A3A' }}>
                  {completedChores.length} chores ✓
                </Text>
                <Text style={p.payoutBreakdownValue}>{fmtCoins(baseCoins)}</Text>
              </View>
            </View>

            {battleWon === true && (
              <View style={p.payoutBreakdownRow}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
                  <Text style={p.payoutBreakdownLabel}>Boss Battle won</Text>
                  <Image source={require('./assets/icons/icon-trophy.png')} style={{ width: scale(13), height: scale(13) }} resizeMode="contain" />
                </View>
                <Text style={p.payoutBreakdownValue}>+{fmtCoins(battleBonus!)}</Text>
              </View>
            )}
            {battleWon === false && (
              <View style={[p.payoutBreakdownRow, { borderBottomWidth: 0 }]}>
                <Text style={{ fontSize: scale(14), color: '#ABABAB', fontStyle: 'italic' }}>Battle bonus not earned this week</Text>
              </View>
            )}
          </View>

          {/* Separator + total */}
          <View style={{ borderTopWidth: 2, borderTopColor: '#1A1A1A', marginTop: battleWon === null ? 0 : 0 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 14 }}>
              <Text style={p.payoutTotalLabel}>Total</Text>
              <Text style={p.payoutTotalValue}>{fmtCoins(coins)}</Text>
            </View>
          </View>
        </View>
      </ScrollView>

      {/* Sticky CTA */}
      <View style={{ position: 'absolute', bottom: 0, left: 0, right: 0, padding: 16, paddingBottom: Platform.OS === 'ios' ? 32 : 16, backgroundColor: '#FFFFFF', borderTopWidth: 1, borderTopColor: '#ECEAE4' }}>
        <TouchableOpacity style={p.payoutCta} onPress={onConfirm} activeOpacity={0.8}>
          <Text style={p.payoutCtaText}>I've paid {kidName} {fmtCoins(coins)} ✓</Text>
        </TouchableOpacity>
        <Text style={{ fontSize: scale(12), color: '#ABABAB', textAlign: 'center', marginTop: 8 }}>
          This is a reminder to pay, not a transfer. You're in control of how you pay.
        </Text>
      </View>
    </CreamBg>
  );
}

function ParentHomeScreen({ onNav, onSwitchToKid, onAddKid, onEditKid, managedChores, onApprove, onReject, baseRate, onPayKid, kidName, coins, kidProfiles }: {
  onNav: (s: ParentScreen) => void;
  onSwitchToKid: () => void;
  onAddKid: () => void;
  onEditKid: (k: { name: string; avatarColor: string; avatarIdx: number }) => void;
  managedChores: ManagedChore[];
  onApprove: (id: string) => void;
  onReject: (id: string, note: string) => void;
  baseRate: string;
  onPayKid: () => void;
  kidName: string;
  coins: number;
  kidProfiles: { name: string; avatarColor: string; avatarIdx: number }[];
}) {
  const [rejectingId, setRejectingId] = useState<string | null>(null);
  const [rejectNote, setRejectNote]   = useState('');
  const isSunday     = daysUntilSunday() === 0;
  const showPayCell  = coins > 0 || isSunday;
  const tasksTotal     = managedChores.reduce((sum, c) => sum + frequencyToWeeklyTarget(c.frequency), 0);
  const tasksCompleted = managedChores.reduce((sum, c) => sum + (c.weeklyCompletions ?? 0), 0);
  const xpEarned       = managedChores.reduce((sum, c) => sum + (c.weeklyCompletions ?? 0) * XP_BY_DIFFICULTY[c.difficulty], 0);
  const progress       = tasksTotal > 0 ? tasksCompleted / tasksTotal : 0;

  return (
    <CreamBg>
      {/* Header */}
      <View style={p.homeHeader}>
        <View style={p.homeHeaderLeft}>
          <View style={p.homeAvatar}>
            <Text style={{ fontSize: scale(24) }}>👩</Text>
          </View>
          <ViewSwitcher
            selected="Parent view"
            dark
            options={[
              { label: 'Parent view', emoji: '👩', bg: '#C5F215' },
              { label: 'Kid view',    emoji: '🧒', bg: '#EAE4FF' },
            ]}
            onSelect={(opt) => { if (opt.label === 'Kid view') onSwitchToKid(); }}
          />
        </View>
        <TouchableOpacity style={p.homeBell} activeOpacity={0.7}>
          <Text style={{ fontSize: scale(22) }}>🔔</Text>
        </TouchableOpacity>
      </View>

      <ScrollView style={{ flex: 1 }} showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 100, paddingTop: 8 }}>

        {/* Kids row */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 20, gap: 20, paddingVertical: 12 }}>
          {kidProfiles.map((k, i) => (
            <TouchableOpacity key={i} style={{ alignItems: 'center', gap: 6 }} activeOpacity={0.7} onPress={() => onEditKid(k)}>
              <View style={{ width: 72, height: 72, borderRadius: 36, backgroundColor: k.avatarColor, alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: '#1A1A1A', ...SOLID_SHADOW }}>
                <Image source={getAvatarImage(k.avatarIdx)} style={{ width: 56, height: 56, borderRadius: 28 }} resizeMode="cover" />
              </View>
              <Text style={{ fontSize: scale(14), fontFamily: 'Inter_700Bold', color: '#1A1A1A' }}>{k.name}</Text>
            </TouchableOpacity>
          ))}
          <TouchableOpacity style={{ alignItems: 'center', gap: 6 }} activeOpacity={0.7} onPress={onAddKid}>
            <View style={{ width: 72, height: 72, borderRadius: 36, borderWidth: 2, borderColor: '#D0CEC8', borderStyle: 'dashed', alignItems: 'center', justifyContent: 'center' }}>
              <Text style={{ fontSize: scale(28), color: '#ABABAB' }}>+</Text>
            </View>
            <Text style={{ fontSize: scale(14), fontFamily: 'Inter_600SemiBold', color: '#ABABAB' }}>Add kid</Text>
          </TouchableOpacity>
        </ScrollView>

        {/* This week's overview */}
        <View style={[p.sectionCard, { marginHorizontal: 16, marginBottom: 12 }]}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
            <Text style={{ fontSize: scale(16), fontFamily: 'Inter_700Bold', color: '#1A1A1A' }}>This week's overview</Text>
            <TouchableOpacity activeOpacity={0.7}><Text style={{ fontSize: scale(14), fontFamily: 'Inter_600SemiBold', color: '#6B35F0' }}>View report ›</Text></TouchableOpacity>
          </View>
          <View style={{ flexDirection: 'row', gap: 16 }}>
            <View style={{ flex: 1, gap: 8 }}>
              <Text style={{ fontSize: scale(12), fontFamily: 'Inter_600SemiBold', color: '#ABABAB' }}>Tasks completed</Text>
              <Text style={{ fontSize: scale(28), fontFamily: 'Inter_900Black', color: '#1A1A1A' }}>{tasksCompleted} <Text style={{ fontSize: scale(18), color: '#ABABAB' }}>/ {tasksTotal}</Text></Text>
              <ProgressBar value={progress * 100} max={100} fillColor="#3B8A3A" height={8} />
            </View>
            <View style={{ flex: 1, gap: 8 }}>
              <Text style={{ fontSize: scale(12), fontFamily: 'Inter_600SemiBold', color: '#ABABAB' }}>XP earned</Text>
              <Text style={{ fontSize: scale(28), fontFamily: 'Inter_900Black', color: '#1A1A1A' }}>{xpEarned.toLocaleString()} <Text style={{ fontSize: scale(14), color: '#ABABAB' }}>XP</Text></Text>
              <Text style={{ fontSize: scale(22) }}>⭐</Text>
            </View>
          </View>
        </View>

        {/* Team banner */}
        <View style={{ marginHorizontal: 16, marginBottom: 20, overflow: 'visible' }}>
          <MascotBanner message="Small steps today lead to big rewards tomorrow!" />
        </View>

        {/* Needs your attention */}
        {(() => {
          const pending = managedChores.filter(c => c.status === 'pending');
          return (
            <View style={{ paddingHorizontal: 16 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 10 }}>
                <Text style={{ fontSize: scale(17), fontFamily: 'Inter_800ExtraBold', color: '#1A1A1A' }}>Needs your attention</Text>
                {pending.length > 0 && (
                  <View style={p.pendingTabBadge}>
                    <Text style={p.pendingTabBadgeText}>{pending.length}</Text>
                  </View>
                )}
              </View>
              {pending.length === 0 && coins === 0 ? (
                <Text style={{ fontSize: scale(14), color: '#ABABAB', fontFamily: 'Inter_500Medium', paddingVertical: 8 }}>
                  You're all clear — nothing needs your attention right now.
                </Text>
              ) : pending.length === 0 ? null : (
                <View style={{ gap: 10 }}>
                  {pending.map(chore => (
                    <View key={chore.id} style={p.pendingReviewCard}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 12 }}>
                        <View style={[p.choreManageIcon, { backgroundColor: chore.bg }]}>
                          <ChoreIcon icon={chore.icon} size={38} />
                        </View>
                        <View style={{ flex: 1 }}>
                          <Text style={p.choreManageName}>{chore.name}</Text>
                          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 2, marginTop: 2 }}>
                            <Text style={p.choreManageFreq}>{chore.assignedTo.length > 0 ? chore.assignedTo.join(', ') : 'Everyone'}{' · '}</Text>
                            {Array.from({ length: chore.difficulty }).map((_, i) => (
                              <Image key={i} source={require('./assets/icons/icon-star.png')} style={{ width: scale(11), height: scale(11) }} resizeMode="contain" />
                            ))}
                          </View>
                        </View>
                        <Text style={p.choreManageRate}>
                          ${(parseFloat(baseRate || '0') * DIFFICULTY_MULTIPLIERS[chore.difficulty]).toFixed(2)}
                        </Text>
                      </View>
                      {rejectingId === chore.id ? (
                        <View style={{ gap: 8 }}>
                          <TextInput
                            style={[p.formInput, { minHeight: 44 }]}
                            placeholder="Optional note for kid..."
                            autoCapitalize="sentences"
                            value={rejectNote}
                            onChangeText={setRejectNote}
                            multiline
                            placeholderTextColor={C.hint}
                          />
                          <View style={{ flexDirection: 'row', gap: 8 }}>
                            <TouchableOpacity
                              style={p.rejectConfirmBtn}
                              onPress={() => { onReject(chore.id, rejectNote); setRejectingId(null); setRejectNote(''); }}
                              activeOpacity={0.7}
                            >
                              <Text style={p.rejectConfirmBtnText}>Send back</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                              style={[p.rejectBtn, { flex: 1 }]}
                              onPress={() => { setRejectingId(null); setRejectNote(''); }}
                              activeOpacity={0.7}
                            >
                              <Text style={p.rejectBtnText}>Cancel</Text>
                            </TouchableOpacity>
                          </View>
                        </View>
                      ) : (
                        <View style={{ flexDirection: 'row', gap: 8 }}>
                          <TouchableOpacity style={p.approveBtn} onPress={() => onApprove(chore.id)} activeOpacity={0.7}>
                            <Text style={p.approveBtnText}>✓ Approve</Text>
                          </TouchableOpacity>
                          <TouchableOpacity style={p.rejectBtn} onPress={() => { setRejectingId(chore.id); setRejectNote(''); }} activeOpacity={0.7}>
                            <Text style={p.rejectBtnText}>✗ Send back</Text>
                          </TouchableOpacity>
                        </View>
                      )}
                    </View>
                  ))}
                </View>
              )}
            </View>
          );
        })()}

        {/* Pay out — only visible when there are coins to pay or it's Sunday */}
        {showPayCell && (
          <TouchableOpacity
            style={[p.sectionCard, { marginHorizontal: 16, marginTop: 12, backgroundColor: '#C5F215', flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 16 }]}
            onPress={onPayKid}
            activeOpacity={0.8}
          >
            <View style={{ flex: 1 }}>
              <Text style={{ fontSize: scale(16), fontFamily: 'Inter_800ExtraBold', color: '#1A1A1A' }}>Pay {kidName} 💸</Text>
              <Text style={{ fontSize: scale(13), color: '#1A1A1A', opacity: 0.7, marginTop: 2 }}>
                {coins > 0 ? `${fmtCoins(coins)} ready to pay out` : "It's payout day — review this week's earnings"}
              </Text>
            </View>
            <Text style={{ fontSize: scale(22) }}>›</Text>
          </TouchableOpacity>
        )}

      </ScrollView>
    </CreamBg>
  );
}

function ParentChoresScreen({ chores, onBack, showBack, onAdd, onEdit, baseRate }: {
  chores: ManagedChore[];
  onBack: () => void;
  showBack?: boolean;
  onAdd: () => void;
  onEdit: (c: ManagedChore) => void;
  baseRate: string;
}) {
  const [activeTab, setActiveTab] = useState<'active' | 'completed'>('active');

  const filtered = chores.filter(c => {
    if (activeTab === 'active')    return c.status === 'active' || c.status === 'rejected' || c.status === 'pending';
    if (activeTab === 'completed') return c.status === 'approved';
    return false;
  });

  return (
    <CreamBg>
      {/* Header */}
      <View style={p.screenHeader}>
        {showBack ? (
          <TouchableOpacity onPress={onBack} style={p.backBtn} activeOpacity={0.7}>
            <Text style={p.backBtnText}>←</Text>
          </TouchableOpacity>
        ) : (
          <View style={{ width: 40 }} />
        )}
        <Text style={p.screenTitle}>Chores</Text>
        <TouchableOpacity onPress={onAdd} style={p.addBtn} activeOpacity={0.7}>
          <Text style={p.addBtnText}>+</Text>
        </TouchableOpacity>
      </View>

      {/* Toggle */}
      <View style={p.toggleRow}>
        <TouchableOpacity
          style={[p.togglePill, activeTab === 'active' && p.togglePillActive]}
          onPress={() => setActiveTab('active')}
          activeOpacity={0.7}
        >
          <Text style={[p.toggleText, activeTab === 'active' && p.toggleTextActive]}>Active</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[p.togglePill, activeTab === 'completed' && p.togglePillActive]}
          onPress={() => setActiveTab('completed')}
          activeOpacity={0.7}
        >
          <Text style={[p.toggleText, activeTab === 'completed' && p.toggleTextActive]}>Completed</Text>
        </TouchableOpacity>
      </View>

      <ScrollView style={{ flex: 1 }} showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 16, paddingTop: 12, paddingBottom: 100, gap: 10 }}>
        {filtered.map(chore => (
            <TouchableOpacity key={chore.id} style={p.choreManageRow} onPress={() => onEdit(chore)} activeOpacity={0.7}>
              <View style={[p.choreManageIcon, { backgroundColor: chore.bg }]}>
                <ChoreIcon icon={chore.icon} size={38} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={p.choreManageName}>{chore.name}</Text>
                <Text style={p.choreManageFreq}>
                  {chore.frequency} · {chore.assignedTo.length > 0 ? chore.assignedTo.join(', ') : 'Everyone'}
                </Text>
              </View>
              <View style={{ alignItems: 'flex-end', gap: 2 }}>
                <View style={{ flexDirection: 'row', gap: 2 }}>
                  {Array.from({ length: chore.difficulty }).map((_, i) => (
                    <Image key={i} source={require('./assets/icons/icon-star.png')} style={{ width: scale(12), height: scale(12) }} resizeMode="contain" />
                  ))}
                </View>
                <Text style={p.choreManageRate}>${(parseFloat(baseRate || '0') * DIFFICULTY_MULTIPLIERS[chore.difficulty]).toFixed(2)}</Text>
              </View>
              <Text style={p.choreManageDrag}>⠿</Text>
            </TouchableOpacity>
          ))
        }
        {filtered.length === 0 && (
          <Text style={{ color: C.muted, textAlign: 'center', marginTop: 40, fontSize: scale(14) }}>
            No {activeTab} chores
          </Text>
        )}
      </ScrollView>
    </CreamBg>
  );
}

function AddEditChoreScreen({ existing, onBack, onSave, onDelete, kids, baseRate }: {
  existing: ManagedChore | null;
  onBack: () => void;
  onSave: (c: ManagedChore) => void;
  onDelete?: () => void;
  kids: string[];
  baseRate: string;
}) {
  const isEdit = existing !== null;
  const [name, setName]               = useState(existing?.name ?? '');
  const [description, setDescription] = useState(existing?.description ?? '');
  const [frequency, setFrequency]     = useState(existing?.frequency ?? FREQUENCY_OPTIONS[0]);
  const [difficulty, setDifficulty]   = useState<1 | 2 | 3>(existing?.difficulty ?? 1);
  const [assignedTo, setAssignedTo]   = useState<string[]>(existing?.assignedTo ?? []);
  const [selectedIcon, setSelectedIcon] = useState<{ icon: string | number; bg: string }>(
    existing ? { icon: existing.icon, bg: existing.bg } : CHORE_ICONS[0]
  );

  const cycleFrequency = () => {
    const idx = FREQUENCY_OPTIONS.indexOf(frequency);
    setFrequency(FREQUENCY_OPTIONS[(idx + 1) % FREQUENCY_OPTIONS.length]);
  };

  const handleSave = () => {
    const chore: ManagedChore = {
      id: existing?.id ?? Date.now().toString(),
      name,
      description,
      frequency,
      difficulty,
      assignedTo,
      icon: selectedIcon.icon,
      bg: selectedIcon.bg,
      status: existing?.status ?? 'active' as const,
      weeklyCompletions: existing?.weeklyCompletions ?? 0,
    };
    onSave(chore);
  };

  return (
    <CreamBg>
      {/* Header */}
      <View style={p.screenHeader}>
        <TouchableOpacity onPress={onBack} style={p.backBtn} activeOpacity={0.7}>
          <Text style={p.backBtnText}>←</Text>
        </TouchableOpacity>
        <Text style={p.screenTitle}>{isEdit ? 'Edit chore' : 'Add chore'}</Text>
        {isEdit ? (
          <TouchableOpacity onPress={onDelete} style={p.backBtn} activeOpacity={0.7}>
            <Text style={{ fontSize: scale(20) }}>🗑️</Text>
          </TouchableOpacity>
        ) : (
          <TouchableOpacity style={p.backBtn} activeOpacity={0.7}>
            <Text style={{ fontSize: scale(20) }}>🔖</Text>
          </TouchableOpacity>
        )}
      </View>

      <ScrollView style={{ flex: 1 }} showsVerticalScrollIndicator={false} contentContainerStyle={{ padding: 16, gap: 16, paddingBottom: 100 }}>
        {/* Icon Display */}
        <View style={{ alignItems: 'center', marginBottom: 8 }}>
          <View style={[p.iconDisplay, { backgroundColor: selectedIcon.bg }]}>
            <ChoreIcon icon={selectedIcon.icon} size={60} />
            <View style={p.iconEditBadge}>
              <Image source={require('./assets/icons/icon-pencil.png')} style={{ width: scale(14), height: scale(14) }} resizeMode="contain" />
            </View>
          </View>
        </View>

        {/* Form Fields */}
        <View style={p.formCard}>
          <Text style={p.formLabel}>Chore name</Text>
          <TextInput
            style={p.formInput}
            value={name}
            onChangeText={setName}
            autoCapitalize="words"
            placeholder="e.g. Make your bed"
            placeholderTextColor={C.hint}
          />
        </View>

        <View style={p.formCard}>
          <Text style={p.formLabel}>Description (optional)</Text>
          <TextInput
            style={p.formInput}
            value={description}
            onChangeText={setDescription}
            autoCapitalize="sentences"
            placeholder="Add a short description..."
            placeholderTextColor={C.hint}
            multiline
          />
        </View>

        <View style={p.formCard}>
          <Text style={p.formLabel}>Frequency</Text>
          <TouchableOpacity style={p.formDropdownRow} onPress={cycleFrequency} activeOpacity={0.7}>
            <Text style={p.formDropdownValue}>{frequency}</Text>
            <Text style={{ fontSize: scale(14), color: C.muted }}>▾</Text>
          </TouchableOpacity>
        </View>

        {/* Difficulty */}
        <View style={p.formCard}>
          <Text style={p.formLabel}>Difficulty</Text>
          <View style={{ flexDirection: 'row', gap: 8 }}>
            {([1, 2, 3] as const).map(level => {
              const active = difficulty === level;
              const pay = (parseFloat(baseRate || '0') * DIFFICULTY_MULTIPLIERS[level]).toFixed(2);
              return (
                <TouchableOpacity
                  key={level}
                  style={[p.difficultyBtn, active && p.difficultyBtnActive]}
                  onPress={() => setDifficulty(level)}
                  activeOpacity={0.7}
                >
                  <View style={{ flexDirection: 'row', gap: 2, justifyContent: 'center' }}>
                    {Array.from({ length: level }).map((_, i) => (
                      <Image key={i} source={require('./assets/icons/icon-star.png')} style={{ width: scale(14), height: scale(14) }} resizeMode="contain" />
                    ))}
                  </View>
                  <Text style={[p.difficultyLabel, active && p.difficultyLabelActive]}>
                    {DIFFICULTY_LABELS[level]}
                  </Text>
                  <Text style={[p.difficultyPay, active && p.difficultyPayActive]}>${pay}</Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        {/* Assign to */}
        <View style={p.formCard}>
          <Text style={p.formLabel}>Assign to</Text>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
            <TouchableOpacity
              style={[p.kidPill, assignedTo.length === 0 && p.kidPillActive]}
              onPress={() => setAssignedTo([])}
              activeOpacity={0.7}
            >
              <Text style={[p.kidPillText, assignedTo.length === 0 && p.kidPillTextActive]}>Everyone</Text>
            </TouchableOpacity>
            {kids.map(kid => {
              const selected = assignedTo.includes(kid);
              return (
                <TouchableOpacity
                  key={kid}
                  style={[p.kidPill, selected && p.kidPillActive]}
                  onPress={() => setAssignedTo(prev =>
                    prev.includes(kid) ? prev.filter(k => k !== kid) : [...prev, kid]
                  )}
                  activeOpacity={0.7}
                >
                  <Text style={[p.kidPillText, selected && p.kidPillTextActive]}>{kid}</Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        {/* Icon Picker */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginHorizontal: -16 }} contentContainerStyle={{ paddingHorizontal: 16, gap: 10, paddingVertical: 4 }}>
          {CHORE_ICONS.map((item) => {
            const isSelected = item.icon === selectedIcon.icon;
            return (
              <TouchableOpacity
                key={String(item.icon)}
                style={[p.iconPickerItem, { backgroundColor: item.bg }, isSelected && p.iconPickerSelected]}
                onPress={() => setSelectedIcon(item)}
                activeOpacity={0.7}
              >
                <ChoreIcon icon={item.icon} size={40} />
              </TouchableOpacity>
            );
          })}
        </ScrollView>

        {/* Buttons */}
        {isEdit && (
          <TouchableOpacity style={p.cancelBtn} onPress={onBack} activeOpacity={0.7}>
            <Text style={p.cancelBtnText}>Cancel</Text>
          </TouchableOpacity>
        )}
        <TouchableOpacity style={p.saveBtn} onPress={handleSave} activeOpacity={0.85}>
          <Text style={p.saveBtnText}>{isEdit ? 'Save changes' : 'Save chore'}</Text>
        </TouchableOpacity>
      </ScrollView>
    </CreamBg>
  );
}

function PayRatesScreen({ onBack, onRateGuide, baseRate, setBaseRate, weeklyCapEnabled, setWeeklyCap, battleCoinBonusEnabled, setBattleCoinBonusEnabled, battleCoinBonusMultiplier, setBattleCoinBonusMultiplier }: {
  onBack: () => void;
  onRateGuide: () => void;
  baseRate: string;
  setBaseRate: (v: string) => void;
  weeklyCapEnabled: boolean;
  setWeeklyCap: (v: boolean) => void;
  battleCoinBonusEnabled: boolean;
  setBattleCoinBonusEnabled: (v: boolean) => void;
  battleCoinBonusMultiplier: number;
  setBattleCoinBonusMultiplier: (v: number) => void;
}) {
  const MULTIPLIER_STEPS = [0.5, 0.75, 1.0, 1.25, 1.5, 2.0];

  return (
    <CreamBg>
      {/* Header */}
      <View style={p.screenHeader}>
        <TouchableOpacity onPress={onBack} style={p.backBtn} activeOpacity={0.7}>
          <Text style={p.backBtnText}>←</Text>
        </TouchableOpacity>
        <Text style={[p.screenTitle, { fontSize: scale(16) }]}>Pay rates & economy</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView style={{ flex: 1 }} showsVerticalScrollIndicator={false} contentContainerStyle={{ padding: 16, gap: 14, paddingBottom: 100 }}>
        {/* Default currency */}
        <View style={p.sectionCard}>
          <Text style={p.sectionCardTitle}>Default currency</Text>
          <Text style={p.sectionCardSub}>This is what kids earn for completed chores.</Text>
          <View style={p.dropdownRow}>
            <Text style={p.dropdownValue}>🪙 Monstir Coins (MC)</Text>
            <Text style={{ fontSize: scale(14), color: C.muted }}>▾</Text>
          </View>
        </View>

        {/* Global settings */}
        <View style={p.sectionCard}>
          <Text style={p.sectionCardTitle}>Global settings</Text>

          <View style={p.settingsRow}>
            <View style={{ flex: 1 }}>
              <Text style={p.settingsRowLabel}>Base rate suggestion</Text>
              <Text style={p.settingsRowSub}>We'll suggest rates based on this amount.</Text>
            </View>
            <View style={p.rateInputPill}>
              <Text style={{ fontSize: scale(14), color: C.text }}>$</Text>
              <TextInput
                style={p.rateInput}
                value={baseRate}
                onChangeText={setBaseRate}
                keyboardType="decimal-pad"
              />
            </View>
          </View>

          <View style={[p.settingsRow, { borderTopWidth: 1, borderTopColor: C.border, marginTop: 12, paddingTop: 12 }]}>
            <View style={{ flex: 1 }}>
              <Text style={p.settingsRowLabel}>Weekly earning cap (optional)</Text>
              <Text style={p.settingsRowSub}>Limit the max amount your kid can earn in a week.</Text>
            </View>
            <Switch
              value={weeklyCapEnabled}
              onValueChange={setWeeklyCap}
              trackColor={{ false: '#D0CEC8', true: '#C5F215' }}
              thumbColor={weeklyCapEnabled ? '#1A1A1A' : '#F4F3F4'}
            />
          </View>

        </View>

        {/* Battle capture bonus */}
        <View style={p.sectionCard}>
          <Text style={p.sectionCardTitle}>Battle capture bonus</Text>
          <Text style={p.sectionCardSub}>Award coins when your kid captures a boss in battle.</Text>

          <View style={[p.settingsRow, { marginTop: 12 }]}>
            <View style={{ flex: 1 }}>
              <Text style={p.settingsRowLabel}>Enable capture payout</Text>
              <Text style={p.settingsRowSub}>Pay out the boss's capture value on win.</Text>
            </View>
            <Switch
              value={battleCoinBonusEnabled}
              onValueChange={setBattleCoinBonusEnabled}
              trackColor={{ false: '#D0CEC8', true: '#C5F215' }}
              thumbColor={battleCoinBonusEnabled ? '#1A1A1A' : '#F4F3F4'}
            />
          </View>

          {battleCoinBonusEnabled && (
            <View style={{ marginTop: 16, gap: 10 }}>
              <Text style={[p.settingsRowLabel, { marginBottom: 4 }]}>
                Multiplier: <Text style={{ color: '#6B35F0', fontFamily: 'Inter_900Black' }}>{battleCoinBonusMultiplier}×</Text>
              </Text>
              <Text style={p.settingsRowSub}>Scales the coin reward. 1× = full capture value.</Text>
              <View style={{ flexDirection: 'row', gap: 8, flexWrap: 'wrap', marginTop: 8 }}>
                {MULTIPLIER_STEPS.map(step => {
                  const selected = battleCoinBonusMultiplier === step;
                  return (
                    <TouchableOpacity
                      key={step}
                      onPress={() => setBattleCoinBonusMultiplier(step)}
                      activeOpacity={0.8}
                      style={{
                        paddingVertical: 8, paddingHorizontal: 14,
                        borderRadius: 20,
                        backgroundColor: selected ? '#1A1A1A' : '#F0EDE7',
                        borderWidth: 2,
                        borderColor: selected ? '#1A1A1A' : '#D0CEC8',
                      }}
                    >
                      <Text style={{ fontSize: scale(13), fontFamily: 'Inter_700Bold', color: selected ? '#C5F215' : C.muted }}>
                        {step}×
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>
          )}
        </View>

        {/* History row */}
        <TouchableOpacity style={p.sectionCard} activeOpacity={0.7}>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
            <Text style={p.sectionCardTitle}>View economy history</Text>
            <Text style={{ fontSize: scale(18), color: C.muted }}>›</Text>
          </View>
        </TouchableOpacity>

        {/* Rate guide link */}
        <TouchableOpacity onPress={onRateGuide} activeOpacity={0.7} style={{ alignItems: 'center', paddingVertical: 8 }}>
          <Text style={p.rateGuideLink}>Rate guide ›</Text>
        </TouchableOpacity>
      </ScrollView>
    </CreamBg>
  );
}

function RateGuideScreen({ onBack }: { onBack: () => void }) {
  const rates = [
    { effort: 'Very easy', time: '< 5 min',     range: '$0.10 – $0.25', dot: '#3B8A3A' },
    { effort: 'Easy',      time: '5 – 15 min',  range: '$0.25 – $0.75', dot: '#3B8A3A' },
    { effort: 'Medium',    time: '15 – 30 min', range: '$0.75 – $1.50', dot: '#F5A623' },
    { effort: 'Hard',      time: '30 – 60 min', range: '$1.50 – $2.50', dot: '#F5823A' },
    { effort: 'Very hard', time: '60+ min',     range: '$2.50+',        dot: '#E53E3E' },
  ];

  return (
    <CreamBg>
      {/* Header */}
      <View style={p.screenHeader}>
        <TouchableOpacity onPress={onBack} style={p.backBtn} activeOpacity={0.7}>
          <Text style={p.backBtnText}>←</Text>
        </TouchableOpacity>
        <Text style={p.screenTitle}>Rate guide</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView style={{ flex: 1 }} showsVerticalScrollIndicator={false} contentContainerStyle={{ padding: 16, gap: 14, paddingBottom: 100 }}>
        {/* Info card */}
        <View style={p.rateInfoCard}>
          <View style={{ flex: 1 }}>
            <Text style={p.rateInfoText}>These are suggested rates based on typical time and effort.</Text>
            <TouchableOpacity style={p.learnMoreBtn} activeOpacity={0.7}>
              <Text style={p.learnMoreText}>Learn more</Text>
            </TouchableOpacity>
          </View>
          <Text style={{ fontSize: scale(40) }}>🪙</Text>
        </View>

        {/* Table */}
        <View style={p.sectionCard}>
          {/* Header row */}
          <View style={[p.rateTableRow, { borderBottomWidth: 1, borderBottomColor: C.border, paddingBottom: 10, marginBottom: 4 }]}>
            <Text style={[p.rateTableHeader, { flex: 1.2 }]}>Effort</Text>
            <Text style={[p.rateTableHeader, { flex: 1.2 }]}>Time</Text>
            <Text style={[p.rateTableHeader, { flex: 1.4 }]}>Suggested rate</Text>
          </View>
          {rates.map((row, i) => (
            <View key={row.effort} style={[p.rateTableRow, i < rates.length - 1 && { borderBottomWidth: 1, borderBottomColor: '#F0EEE8', paddingBottom: 12, marginBottom: 4 }]}>
              <View style={[{ flex: 1.2, flexDirection: 'row', alignItems: 'center', gap: 6 }]}>
                <View style={[p.rateDot, { backgroundColor: row.dot }]} />
                <Text style={p.rateTableCell}>{row.effort}</Text>
              </View>
              <Text style={[p.rateTableCell, { flex: 1.2 }]}>{row.time}</Text>
              <Text style={[p.rateTableCell, { flex: 1.4 }]}>{row.range}</Text>
            </View>
          ))}
        </View>

        {/* Note card */}
        <View style={p.noteCard}>
          <Text style={{ fontSize: scale(20), marginRight: 8 }}>💡</Text>
          <Text style={p.noteText}>These are just suggestions. You know your child and what's fair!</Text>
        </View>
      </ScrollView>
    </CreamBg>
  );
}

// ─── Parent Settings Screens ──────────────────────────────────────────────────

type SettingsSubScreen = 'main' | 'kids' | 'battle' | 'account' | 'approval';

function SettingsRow({ iconBg, iconEmoji, title, subtitle, badge, onPress }: {
  iconBg: string; iconEmoji: string; title: string; subtitle?: string;
  badge?: string | number; onPress?: () => void;
}) {
  return (
    <TouchableOpacity style={ps.row} onPress={onPress} activeOpacity={onPress ? 0.7 : 1}>
      <View style={[ps.rowIcon, { backgroundColor: iconBg }]}>
        <Text style={{ fontSize: scale(17) }}>{iconEmoji}</Text>
      </View>
      <View style={{ flex: 1 }}>
        <Text style={ps.rowTitle}>{title}</Text>
        {subtitle ? <Text style={ps.rowSub}>{subtitle}</Text> : null}
      </View>
      {badge !== undefined && (
        <View style={ps.badge}><Text style={ps.badgeText}>{badge}</Text></View>
      )}
      <Text style={ps.chevron}>›</Text>
    </TouchableOpacity>
  );
}

function ParentSettingsScreen({ onNav, baseRate, onAddKid, onEditKid, kids, kidApprovalSettings, setKidApprovalSettings, kidProfiles }: {
  onNav: (s: ParentScreen) => void;
  baseRate: string;
  onAddKid?: () => void;
  onEditKid?: (k: { name: string; avatarColor: string; avatarIdx: number }) => void;
  kids: string[];
  kidApprovalSettings: Record<string, boolean>;
  setKidApprovalSettings: (v: Record<string, boolean>) => void;
  kidProfiles: { name: string; avatarColor: string; avatarIdx: number }[];
}) {
  const [sub, setSub] = useState<SettingsSubScreen>('main');
  const anyApproval = kids.some(k => kidApprovalSettings[k] !== false);

  if (sub === 'kids')     return <SettingsKidsScreen     onBack={() => setSub('main')} onAddKid={onAddKid} onEditKid={onEditKid} kidProfiles={kidProfiles} />;
  if (sub === 'battle')   return <SettingsBattleScreen   onBack={() => setSub('main')} baseRate={baseRate} />;
  if (sub === 'account')  return <SettingsAccountScreen  onBack={() => setSub('main')} />;
  if (sub === 'approval') return <SettingsApprovalScreen onBack={() => setSub('main')} kids={kids} kidApprovalSettings={kidApprovalSettings} setKidApprovalSettings={setKidApprovalSettings} kidProfiles={kidProfiles} />;

  return (
    <CreamBg>
      <View style={p.screenHeader}>
        <View style={{ width: 40 }} />
        <Text style={p.screenTitle}>Settings</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 120 }}>
        {/* Family */}
        <Text style={ps.sectionLabel}>FAMILY</Text>
        <View style={ps.group}>
          <SettingsRow iconBg="#6B35F0" iconEmoji="👨‍👩‍👧" title="Kids" subtitle={kidProfiles.map(k => k.name).join(', ') || 'No kids yet'} badge={kidProfiles.length || undefined} onPress={() => setSub('kids')} />
        </View>

        {/* Chores */}
        <Text style={ps.sectionLabel}>CHORES</Text>
        <View style={ps.group}>
          <SettingsRow iconBg="#F59E0B" iconEmoji="💰" title="Pay rates & economy" subtitle="Currency, base rate, earning cap" onPress={() => onNav('payRates')} />
          <View style={ps.divider} />
          <SettingsRow iconBg="#10B981" iconEmoji="✅" title="Chore library" subtitle="Manage & create chores" onPress={() => onNav('chores')} />
          <View style={ps.divider} />
          <SettingsRow iconBg="#6366F1" iconEmoji="🕐" title="Approval settings" subtitle={anyApproval ? `${kids.filter(k => kidApprovalSettings[k] !== false).length} of ${kids.length} kids require approval` : 'Auto-approve all'} onPress={() => setSub('approval')} />
        </View>

        {/* Battles */}
        <Text style={ps.sectionLabel}>BATTLES</Text>
        <View style={ps.group}>
          <SettingsRow iconBg="#EF4444" iconEmoji="⚔️" title="Battle & bonuses" subtitle="Boss rewards, monetary bonuses" onPress={() => setSub('battle')} />
        </View>

        {/* Account */}
        <Text style={ps.sectionLabel}>ACCOUNT</Text>
        <View style={ps.group}>
          <SettingsRow iconBg="#8B5CF6" iconEmoji="👤" title="Account" subtitle="Email, password, notifications" onPress={() => setSub('account')} />
          <View style={ps.divider} />
          <SettingsRow iconBg="#64748B" iconEmoji="❓" title="Help & support" />
          <View style={ps.divider} />
          <SettingsRow iconBg="#94A3B8" iconEmoji="ℹ️" title="About Monstir" />
        </View>
      </ScrollView>
    </CreamBg>
  );
}

// ─── Add / Edit Kid Modal ─────────────────────────────────────────────────────

const KID_AVATAR_COLORS = ['#E0D4FF', '#FFD6E4', '#C8EEFF', '#D6FFE8', '#FFF3C8', '#FFE0CC'];
const KID_AGE_RANGES: import('./src/screens/ParentOnboarding').OnboardingChild['ageRange'][] = ['5-6', '7-9', '10-12', '13+'];

function AddEditKidModal({
  visible,
  initial,
  onClose,
  onSave,
}: {
  visible: boolean;
  initial: import('./src/screens/ParentOnboarding').OnboardingChild | null;
  onClose: () => void;
  onSave: (data: { name: string; avatarIdx: number; avatarColor: string; ageRange: import('./src/screens/ParentOnboarding').OnboardingChild['ageRange'] }) => void;
}) {
  const isEdit = initial != null;
  const [name, setName]           = useState(initial?.name ?? '');
  const [avatarIdx, setAvatarIdx] = useState(initial?.avatarIdx ?? 0);
  const [ageRange, setAgeRange]   = useState<import('./src/screens/ParentOnboarding').OnboardingChild['ageRange']>(initial?.ageRange ?? '7-9');
  const slideAnim = useRef(new Animated.Value(600)).current;

  useEffect(() => {
    if (visible) {
      setName(initial?.name ?? '');
      setAvatarIdx(initial?.avatarIdx ?? 0);
      setAgeRange(initial?.ageRange ?? '7-9');
      slideAnim.setValue(600);
      Animated.spring(slideAnim, { toValue: 0, useNativeDriver: true, tension: 80, friction: 14 }).start();
    }
  }, [visible, initial]);

  const handleSave = () => {
    const trimmed = name.trim();
    if (!trimmed) return;
    const color = initial?.avatarColor ?? KID_AVATAR_COLORS[avatarIdx % KID_AVATAR_COLORS.length];
    onSave({ name: trimmed, avatarIdx, avatarColor: color, ageRange });
  };

  return (
    <Modal visible={visible} transparent animationType="none" onRequestClose={onClose}>
      {/* Overlay appears instantly; only the sheet slides up */}
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <Pressable style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', justifyContent: 'flex-end' }} onPress={onClose}>
          <Pressable onPress={e => e.stopPropagation()}>
            <Animated.View style={{ backgroundColor: '#FAF9F5', borderTopLeftRadius: 28, borderTopRightRadius: 28, transform: [{ translateY: slideAnim }] }}>
              <ScrollView
                bounces={false}
                keyboardShouldPersistTaps="handled"
                contentContainerStyle={{ paddingHorizontal: 20, paddingTop: 12, paddingBottom: 44 }}
              >
                <View style={{ width: 40, height: 4, backgroundColor: '#D0CEC8', borderRadius: 2, alignSelf: 'center', marginBottom: 20 }} />
                <Text style={{ fontSize: scale(20), fontFamily: 'Inter_800ExtraBold', color: '#1A1A1A', marginBottom: 24, textAlign: 'center' }}>{isEdit ? 'Edit kid' : 'Add a kid'}</Text>

                {/* Avatar picker */}
                <Text style={{ fontSize: scale(11), fontFamily: 'Inter_700Bold', color: '#ABABAB', marginBottom: 10, letterSpacing: 0.8 }}>CHOOSE AVATAR</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 10, paddingBottom: 4, marginBottom: 20 }}>
                  {[0,1,2,3,4,5,6,7].map(i => (
                    <TouchableOpacity key={i} onPress={() => setAvatarIdx(i)} activeOpacity={0.8}
                      style={{ width: 64, height: 64, borderRadius: 32, backgroundColor: KID_AVATAR_COLORS[i % KID_AVATAR_COLORS.length], alignItems: 'center', justifyContent: 'center', borderWidth: avatarIdx === i ? 3 : 2, borderColor: avatarIdx === i ? '#6B35F0' : '#E0DDD6' }}>
                      <Image source={getAvatarImage(i)} style={{ width: 50, height: 50, borderRadius: 25 }} resizeMode="cover" />
                    </TouchableOpacity>
                  ))}
                </ScrollView>

                {/* Name */}
                <Text style={{ fontSize: scale(11), fontFamily: 'Inter_700Bold', color: '#ABABAB', marginBottom: 8, letterSpacing: 0.8 }}>NAME</Text>
                <TextInput
                  value={name}
                  onChangeText={t => setName(t.slice(0, 12))}
                  autoCapitalize="words"
                  placeholder="Child's name"
                  placeholderTextColor="#C0BDB7"
                  style={{ backgroundColor: '#FFFFFF', borderRadius: 12, borderWidth: 2, borderColor: '#1A1A1A', paddingHorizontal: 16, paddingVertical: 14, fontSize: scale(16), fontFamily: 'Inter_600SemiBold', color: '#1A1A1A', marginBottom: 20 }}
                />

                {/* Age range */}
                <Text style={{ fontSize: scale(11), fontFamily: 'Inter_700Bold', color: '#ABABAB', marginBottom: 10, letterSpacing: 0.8 }}>AGE RANGE</Text>
                <View style={{ flexDirection: 'row', gap: 8, marginBottom: 28 }}>
                  {KID_AGE_RANGES.map(r => (
                    <TouchableOpacity key={r} onPress={() => setAgeRange(r)} activeOpacity={0.8}
                      style={{ flex: 1, paddingVertical: 12, borderRadius: 12, alignItems: 'center', backgroundColor: ageRange === r ? '#6B35F0' : '#FFFFFF', borderWidth: 2, borderColor: ageRange === r ? '#6B35F0' : '#E0DDD6' }}>
                      <Text style={{ fontSize: scale(14), fontFamily: 'Inter_700Bold', color: ageRange === r ? '#FFFFFF' : '#1A1A1A' }}>{r}</Text>
                    </TouchableOpacity>
                  ))}
                </View>

                <Button label={isEdit ? 'Save changes' : 'Add kid'} onPress={handleSave} disabled={!name.trim()} />
              </ScrollView>
            </Animated.View>
          </Pressable>
        </Pressable>
      </KeyboardAvoidingView>
    </Modal>
  );
}

function SettingsKidsScreen({ onBack, onAddKid, onEditKid, kidProfiles }: { onBack: () => void; onAddKid?: () => void; onEditKid?: (k: { name: string; avatarColor: string; avatarIdx: number }) => void; kidProfiles: { name: string; avatarColor: string; avatarIdx: number }[] }) {
  return (
    <CreamBg>
      <View style={p.screenHeader}>
        <TouchableOpacity onPress={onBack} style={p.backBtn} activeOpacity={0.7}>
          <Text style={p.backBtnText}>←</Text>
        </TouchableOpacity>
        <Text style={p.screenTitle}>Kids</Text>
        <View style={{ width: 40 }} />
      </View>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 120 }}>
        <Text style={ps.sectionLabel}>PROFILES</Text>
        <View style={ps.group}>
          {kidProfiles.map((k, i) => (
            <View key={i}>
              {i > 0 && <View style={ps.divider} />}
              <TouchableOpacity style={ps.row} activeOpacity={0.7} onPress={() => onEditKid?.(k)}>
                <View style={[ps.kidAvatar, { backgroundColor: k.avatarColor }]}>
                  <Image source={getAvatarImage(k.avatarIdx)} style={{ width: 32, height: 32, borderRadius: 16 }} resizeMode="cover" />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={ps.rowTitle}>{k.name}</Text>
                </View>
                <Text style={ps.chevron}>›</Text>
              </TouchableOpacity>
            </View>
          ))}
        </View>
        {onAddKid && <Button label="+ Add kid" onPress={onAddKid} style={{ margin: 16 }} />}
      </ScrollView>
    </CreamBg>
  );
}

function BonusSlider({ value, onChange, onDragging }: { value: number; onChange: (v: number) => void; onDragging?: (d: boolean) => void }) {
  const trackRef  = useRef<View>(null);
  const trackX    = useRef(0);
  const trackW    = useRef(1);

  const pctFromPageX = (pageX: number) =>
    Math.round(Math.max(0, Math.min(100, ((pageX - trackX.current) / trackW.current) * 100)));

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder:  () => true,
      onPanResponderGrant: (_e, gs) => { onDragging?.(true);  onChange(pctFromPageX(gs.x0)); },
      onPanResponderMove:  (_e, gs) => { onChange(pctFromPageX(gs.moveX)); },
      onPanResponderRelease:   () => { onDragging?.(false); },
      onPanResponderTerminate: () => { onDragging?.(false); },
    })
  ).current;

  return (
    <View
      ref={trackRef}
      style={ps.sliderTrack}
      onLayout={() => {
        trackRef.current?.measure((_x, _y, w, _h, px) => {
          trackX.current = px;
          trackW.current = w || 1;
        });
      }}
      {...panResponder.panHandlers}
    >
      <View style={[ps.sliderFill, { width: `${value}%` as any }]} />
      <View style={[ps.sliderThumb, { left: `${value}%` as any }]} />
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 16 }}>
        {[0, 25, 50, 75, 100].map(v => (
          <Text key={v} style={[ps.sliderTickLabel, value === v && { color: '#6B35F0', fontFamily: 'Inter_700Bold' }]}>{v}%</Text>
        ))}
      </View>
    </View>
  );
}

function SettingsBattleScreen({ onBack, baseRate }: { onBack: () => void; baseRate: string }) {
  const [bonusEnabled, setBonusEnabled]   = useState(true);
  const [bonusPct, setBonusPct]           = useState(25);
  const [scrollEnabled, setScrollEnabled] = useState(true);
  const cosmetics = ['Monster skin', 'Victory dance', 'XP boost', 'Badge', 'Evolution progress'];

  const base = parseFloat(baseRate) || 0;
  const bonusAmount = (base * bonusPct / 100).toFixed(2);

  return (
    <CreamBg>
      <View style={p.screenHeader}>
        <TouchableOpacity onPress={onBack} style={p.backBtn} activeOpacity={0.7}>
          <Text style={p.backBtnText}>←</Text>
        </TouchableOpacity>
        <Text style={p.screenTitle}>Battle & bonuses</Text>
        <View style={{ width: 40 }} />
      </View>
      <ScrollView scrollEnabled={scrollEnabled} showsVerticalScrollIndicator={false} contentContainerStyle={{ padding: 16, gap: 12, paddingBottom: 120 }}>
        {/* Hero card */}
        <View style={ps.battleHero}>
          <Text style={{ fontSize: scale(48) }}>👾</Text>
          <View style={{ flex: 1 }}>
            <Text style={ps.battleHeroTitle}>Boss battles</Text>
            <Text style={ps.battleHeroSub}>Kids earn XP fighting bosses. Configure whether winning also earns real money.</Text>
          </View>
        </View>

        {/* Monetary bonus toggle */}
        <Text style={[ps.sectionLabel, { paddingHorizontal: 0, paddingTop: 4 }]}>MONETARY BONUS</Text>
        <View style={p.sectionCard}>
          <View style={{ flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12 }}>
            <View style={{ flex: 1 }}>
              <Text style={ps.rowTitle}>Cash bonus for winning</Text>
              <Text style={ps.rowSub}>Pay a bonus when a boss is defeated</Text>
            </View>
            <TouchableOpacity
              style={[ps.toggle, bonusEnabled && ps.toggleOn]}
              onPress={() => setBonusEnabled(v => !v)}
              activeOpacity={0.8}
            >
              <View style={[ps.toggleThumb, bonusEnabled && ps.toggleThumbOn]} />
            </TouchableOpacity>
          </View>

          {bonusEnabled && (
            <View style={{ marginTop: 16, paddingTop: 16, borderTopWidth: 1, borderTopColor: C.border, gap: 16 }}>
              {/* Base rate + impact */}
              <View style={ps.impactRow}>
                <View style={ps.impactCell}>
                  <Text style={ps.impactLabel}>Base rate</Text>
                  <Text style={ps.impactValue}>${base.toFixed(2)}<Text style={ps.impactUnit}>/chore</Text></Text>
                </View>
                <Text style={ps.impactArrow}>×</Text>
                <View style={ps.impactCell}>
                  <Text style={ps.impactLabel}>Bonus</Text>
                  <Text style={[ps.impactValue, { color: '#6B35F0' }]}>{bonusPct}%</Text>
                </View>
                <Text style={ps.impactArrow}>=</Text>
                <View style={[ps.impactCell, ps.impactCellHighlight]}>
                  <Text style={ps.impactLabel}>Per win</Text>
                  <Text style={[ps.impactValue, { color: '#6B35F0' }]}>${bonusAmount}</Text>
                </View>
              </View>

              {/* Slider */}
              <BonusSlider value={bonusPct} onChange={setBonusPct} onDragging={(d) => setScrollEnabled(!d)} />
            </View>
          )}
        </View>

        {/* Cosmetic rewards */}
        <Text style={[ps.sectionLabel, { paddingHorizontal: 0, paddingTop: 4 }]}>ALWAYS UNLOCKED ON WIN</Text>
        <View style={[p.sectionCard, { backgroundColor: '#F3EEFF' }]}>
          <Text style={[ps.rowTitle, { color: '#6B35F0', marginBottom: 10 }]}>✨  Cosmetic rewards</Text>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
            {cosmetics.map(c => (
              <View key={c} style={ps.cosmeticPill}><Text style={ps.cosmeticText}>{c}</Text></View>
            ))}
          </View>
        </View>

        <View style={p.noteCard}>
          <Text style={{ fontSize: scale(18), marginRight: 8 }}>💡</Text>
          <Text style={p.noteText}>Cosmetic rewards are always given when a boss is defeated, regardless of the cash bonus setting.</Text>
        </View>
      </ScrollView>
    </CreamBg>
  );
}

const KID_AVATARS: Record<string, { emoji: string; bg: string }> = {
  Sam:   { emoji: '🦎', bg: '#E8F5E9' },
  Lily:  { emoji: '🐱', bg: '#FFF0F6' },
  Max:   { emoji: '🐉', bg: '#E3F2FD' },
};

function SettingsApprovalScreen({ onBack, kids, kidApprovalSettings, setKidApprovalSettings, kidProfiles }: {
  onBack: () => void;
  kids: string[];
  kidApprovalSettings: Record<string, boolean>;
  setKidApprovalSettings: (v: Record<string, boolean>) => void;
  kidProfiles: { name: string; avatarColor: string; avatarIdx: number }[];
}) {
  const allOn  = kids.every(k => kidApprovalSettings[k] !== false);
  const allOff = kids.every(k => kidApprovalSettings[k] === false);

  const toggle = (kid: string) => {
    setKidApprovalSettings({ ...kidApprovalSettings, [kid]: !(kidApprovalSettings[kid] ?? true) });
  };
  const setAll = (val: boolean) => {
    setKidApprovalSettings(Object.fromEntries(kids.map(k => [k, val])));
  };

  return (
    <CreamBg>
      <View style={p.screenHeader}>
        <TouchableOpacity onPress={onBack} style={p.backBtn} activeOpacity={0.7}>
          <Text style={p.backBtnText}>←</Text>
        </TouchableOpacity>
        <Text style={p.screenTitle}>Approval settings</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ padding: 16, gap: 14, paddingBottom: 120 }}>
        {/* Hero */}
        <View style={[ps.battleHero, { backgroundColor: '#1A3A2A' }]}>
          <Text style={{ fontSize: scale(44) }}>✅</Text>
          <View style={{ flex: 1 }}>
            <Text style={ps.battleHeroTitle}>Chore approval</Text>
            <Text style={ps.battleHeroSub}>Choose which kids need your sign-off before earning XP and coins.</Text>
          </View>
        </View>

        {/* Quick actions */}
        <View style={{ flexDirection: 'row', gap: 10 }}>
          <TouchableOpacity
            style={[p.sectionCard, { flex: 1, alignItems: 'center', paddingVertical: 14, opacity: allOn ? 0.45 : 1 }]}
            onPress={() => setAll(true)}
            activeOpacity={0.7}
            disabled={allOn}
          >
            <Text style={{ fontSize: scale(20), marginBottom: 4 }}>🔒</Text>
            <Text style={{ fontSize: scale(12), fontFamily: 'Inter_700Bold', color: C.text }}>Require all</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[p.sectionCard, { flex: 1, alignItems: 'center', paddingVertical: 14, opacity: allOff ? 0.45 : 1 }]}
            onPress={() => setAll(false)}
            activeOpacity={0.7}
            disabled={allOff}
          >
            <Image source={require('./assets/icons/icon-lightning.png')} style={{ width: scale(22), height: scale(22), marginBottom: 4 }} resizeMode="contain" />
            <Text style={{ fontSize: scale(12), fontFamily: 'Inter_700Bold', color: C.text }}>Auto-approve all</Text>
          </TouchableOpacity>
        </View>

        {/* Per-kid toggles */}
        <View style={p.sectionCard}>
          {kids.map((kid, idx) => {
            const needsApproval = kidApprovalSettings[kid] ?? true;
            const profile = kidProfiles.find(k => k.name === kid);
            return (
              <View key={kid}>
                {idx > 0 && <View style={{ height: 1, backgroundColor: C.border }} />}
                <View style={{ flexDirection: 'row', alignItems: 'center', paddingVertical: 14, gap: 12 }}>
                  {/* Avatar */}
                  <View style={{ width: 42, height: 42, borderRadius: 21, backgroundColor: profile?.avatarColor ?? '#F0F0F0', alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: '#1A1A1A' }}>
                    <Image source={getAvatarImage(profile?.avatarIdx ?? 0)} style={{ width: 32, height: 32, borderRadius: 16 }} resizeMode="cover" />
                  </View>
                  {/* Name + status */}
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontSize: scale(15), fontFamily: 'Inter_700Bold', color: C.text }}>{kid}</Text>
                    <Text style={{ fontSize: scale(12), color: needsApproval ? '#2A7A2A' : '#F59E0B', fontFamily: 'Inter_600SemiBold', marginTop: 1 }}>
                      {needsApproval ? 'Needs your approval' : 'Auto-approves'}
                    </Text>
                  </View>
                  {/* Toggle */}
                  <TouchableOpacity
                    style={[ps.toggle, needsApproval && ps.toggleOn]}
                    onPress={() => toggle(kid)}
                    activeOpacity={0.8}
                  >
                    <View style={[ps.toggleThumb, needsApproval && ps.toggleThumbOn]} />
                  </TouchableOpacity>
                </View>
              </View>
            );
          })}
        </View>

        {/* Explainer */}
        <View style={p.noteCard}>
          <Text style={{ fontSize: scale(18), marginRight: 8 }}>💡</Text>
          <Text style={p.noteText}>
            When approval is on, a kid's completed chore shows up under "Needs your attention" — XP and coins are held until you tap Approve. When off, they're awarded instantly.
          </Text>
        </View>
      </ScrollView>
    </CreamBg>
  );
}

function SettingsAccountScreen({ onBack }: { onBack: () => void }) {
  return (
    <CreamBg>
      <View style={p.screenHeader}>
        <TouchableOpacity onPress={onBack} style={p.backBtn} activeOpacity={0.7}>
          <Text style={p.backBtnText}>←</Text>
        </TouchableOpacity>
        <Text style={p.screenTitle}>Account</Text>
        <View style={{ width: 40 }} />
      </View>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 120 }}>
        {/* Avatar */}
        <View style={{ alignItems: 'center', paddingVertical: 28 }}>
          <View style={ps.accountAvatar}>
            <Text style={ps.accountAvatarText}>A</Text>
          </View>
          <Text style={[ps.rowTitle, { fontSize: scale(18), marginTop: 10 }]}>Alex</Text>
          <Text style={ps.rowSub}>alex@example.com</Text>
        </View>

        <View style={ps.group}>
          <SettingsRow iconBg="#8B5CF6" iconEmoji="👤" title="Profile information" />
          <View style={ps.divider} />
          <SettingsRow iconBg="#6366F1" iconEmoji="📧" title="Email & password" />
          <View style={ps.divider} />
          <SettingsRow iconBg="#F59E0B" iconEmoji="🔔" title="Notifications" />
          <View style={ps.divider} />
          <SettingsRow iconBg="#10B981" iconEmoji="🔒" title="Privacy & security" />
        </View>

        <TouchableOpacity style={ps.logoutBtn} activeOpacity={0.8}>
          <Text style={ps.logoutText}>Log out</Text>
        </TouchableOpacity>
      </ScrollView>
    </CreamBg>
  );
}

// ─── Goal Creation Flow ───────────────────────────────────────────────────────

interface GoalCreationFlowProps {
  onDone: () => void;
  onCancel: () => void;
  onGoalCreated?: (data: GoalData) => void;
  onDeleteGoal?: () => void;
  savedCents?: number;
  initialData?: Partial<GoalData>;
  monsterName?: string;
}

interface GoalData {
  name: string;
  amount: string;
  category: string;
  color: string;
  icon: number; // ImageRequireSource from require('./assets/icons/goalIcons/…')
}

interface SavedGoal {
  id: string;
  name: string;
  amount: string;     // target in dollars e.g. "25.00"
  category: string;
  color: string;
  icon: number; // ImageRequireSource
  savedCents: number; // how much has been saved so far
  milestones: string[];   // 4 reward labels e.g. ['Helmet', 'Trick Unlocked', 'Glow Board', 'Celebration!']
  activityFeed: { label: string; pts: number; when: string }[];  // recent progress items
}


const GOAL_OPTIONS: { icon: number; name: string; amount: string }[] = [
  { icon: require('./assets/icons/goalIcons/Switch.png'),                name: 'Nintendo Switch',   amount: '299.99' },
  { icon: require('./assets/icons/goalIcons/Roblox.png'),                name: 'Roblox Gift Card',  amount: '25.00'  },
  { icon: require('./assets/icons/goalIcons/Bike.png'),                  name: 'New bike',          amount: '120.00' },
  { icon: require('./assets/icons/goalIcons/Headset.png'),               name: 'Headphones',        amount: '60.00'  },
  { icon: require('./assets/icons/goalIcons/Scooter.png'),               name: 'Scooter',           amount: '80.00'  },
  { icon: require('./assets/icons/goalIcons/TV.png'),                    name: 'New TV',            amount: '200.00' },
  { icon: require('./assets/icons/goalIcons/Shoes.png'),                 name: 'New shoes',         amount: '70.00'  },
  { icon: require('./assets/icons/goalIcons/Legp.png'),                  name: 'Lego set',          amount: '50.00'  },
  { icon: require('./assets/icons/goalIcons/Plushie.png'),               name: 'Stuffed animal',    amount: '30.00'  },
  { icon: require('./assets/icons/goalIcons/Animal.png'),                name: 'Adopt a pet',       amount: '100.00' },
  { icon: require('./assets/icons/goalIcons/Pizza.png'),                 name: 'Pizza party',       amount: '25.00'  },
  { icon: require('./assets/icons/goalIcons/Movie.png'),                 name: 'Movie night',       amount: '15.00'  },
  { icon: require('./assets/icons/goalIcons/Sleepover.png'),             name: 'Sleepover party',   amount: '40.00'  },
  { icon: require('./assets/icons/goalIcons/Ice Ceam Party.png'),        name: 'Ice cream party',   amount: '20.00'  },
  { icon: require('./assets/icons/goalIcons/Money.png'),                 name: 'Custom goal',       amount: ''       },
];

function GoalCreationFlow({ onDone, onCancel, onGoalCreated, onDeleteGoal, savedCents, initialData, monsterName }: GoalCreationFlowProps) {
  // When editing an existing goal, jump straight to details (step 2)
  const [step, setStep]           = useState<number>(initialData ? 2 : 1);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const [goalData, setGoalData] = useState<GoalData>({
    name:     initialData?.name     ?? '',
    amount:   initialData?.amount   ?? '',
    category: initialData?.category ?? '',
    color:    '#6B35F0',
    icon:     initialData?.icon     ?? require('./assets/icons/goalIcons/Money.png'),
  });
  // Tracks which preset key to use for the mascot message (separate from goalData.name
  // so custom-goal typed names still resolve to the "Custom goal" message)
  const [mascotKey, setMascotKey]   = useState<string>(initialData?.name ?? '');
  // Inline amount text field (decimal-pad, replaces old numpad screen)
  const [amountText, setAmountText] = useState<string>(initialData?.amount ?? '');
  const [photoAdded, setPhotoAdded] = useState(false);
  const [search, setSearch]         = useState('');

  const go = (n: number) => setStep(n);

  // Selecting a preset auto-fills details and jumps to step 2
  const handleGoalOptionSelect = (idx: number) => {
    const opt      = GOAL_OPTIONS[idx];
    const autoName = opt.name === 'Custom goal' ? '' : opt.name;
    setGoalData(prev => ({ ...prev, name: autoName, amount: opt.amount, icon: opt.icon }));
    setAmountText(opt.amount);
    setMascotKey(opt.name);
    go(2);
  };

  // ── Mascot bubble copy ──────────────────────────────────────────────────────
  const mn = monsterName ?? '';
  const MASCOT_MESSAGES: Record<string, string> = {
    'Nintendo Switch':  `${mn} is ready to play some games! 🎮`,
    'Roblox Gift Card': `${mn} wants to jump in Roblox with you! 🌟`,
    'New bike':         `${mn} says zoom zoom! 🚲`,
    'Headphones':       `${mn} has great taste in music! 🎧`,
    'Scooter':          `${mn} says let's ride! 🛴`,
    'New TV':           `${mn} is ready for movie night! 📺`,
    'New shoes':        `${mn} loves your style! 👟`,
    'Lego set':         `${mn} is ready to build! 🧱`,
    'Stuffed animal':   `${mn} thinks it's super cute! 🧸`,
    'Adopt a pet':      `${mn} loves animals too! 🐾`,
    'Pizza party':      `${mn} is getting hungry! 🍕`,
    'Movie night':      `${mn} has the popcorn ready! 🍿`,
    'Sleepover party':  `${mn} wants to join the fun! 🌙`,
    'Ice cream party':  `${mn} says yes to sprinkles! 🍦`,
    'Custom goal':      `Whatever it is, ${mn}'s going for it with you! 💪`,
  };
  const mascotMsg = MASCOT_MESSAGES[mascotKey]
    ?? (monsterName ? `Nice goal! ${monsterName} thinks you're going to crush it! 💪`
                    : "Nice goal! You're going to crush it! 💪");

  // ── Step 2 validation ───────────────────────────────────────────────────────
  const amountNum  = parseFloat(amountText);
  const canProceed = goalData.name.trim().length > 0 && !isNaN(amountNum) && amountNum > 0;

  // ── Real-time search filter ─────────────────────────────────────────────────
  const filteredOptions = GOAL_OPTIONS.filter(opt =>
    opt.name.toLowerCase().includes(search.toLowerCase())
  );

  // ── Step 1: Pick your goal ──────────────────────────────────────────────────
  if (step === 1) {
    return (
      <View style={s.gfRoot}>
        <View style={s.gfBackRow}>
          <TouchableOpacity style={s.gfBackBtn} onPress={onCancel} activeOpacity={0.7}>
            <Text style={s.gfBackText}>←</Text>
          </TouchableOpacity>
        </View>
        <View style={[s.gfScrollTop, { flex: 1 }]}>
          <Text style={s.gfScreenTitle}>Pick your goal</Text>
          <Text style={s.gfScreenSub}>What are you saving up for?</Text>

          {/* Search bar */}
          <View style={s.gfSearchRow}>
            <Image source={require('./assets/icons/icon-search.png')} style={{ width: scale(18), height: scale(18) }} resizeMode="contain" />
            <TextInput
              style={s.gfSearchInput}
              value={search}
              onChangeText={setSearch}
              placeholder="Search goals…"
              placeholderTextColor="#C0BEB8"
              returnKeyType="search"
            />
            {search.length > 0 && (
              <TouchableOpacity onPress={() => setSearch('')} activeOpacity={0.7} style={s.gfSearchClear}>
                <Text style={{ fontSize: scale(14), color: '#ABABAB' }}>✕</Text>
              </TouchableOpacity>
            )}
          </View>

          <ScrollView showsVerticalScrollIndicator={false} style={{ flex: 1 }}>
            <View style={{ gap: 10, paddingTop: 4, paddingBottom: 32 }}>
              {filteredOptions.map((opt, idx) => {
                const realIdx = GOAL_OPTIONS.indexOf(opt);
                const isCustom = opt.name === 'Custom goal';
                return (
                  <TouchableOpacity
                    key={opt.name}
                    style={[s.gfGoalRow, isCustom && { borderStyle: 'dashed' }]}
                    onPress={() => handleGoalOptionSelect(realIdx)}
                    activeOpacity={0.7}
                  >
                    <View style={s.gfGoalIconCircle}>
                      <Image source={opt.icon} style={{ width: scale(36), height: scale(36) }} resizeMode="contain" />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={s.gfGoalName}>{opt.name}</Text>
                      <Text style={s.gfGoalPrice}>
                        {opt.amount ? `$${opt.amount}` : 'Set your own amount'}
                      </Text>
                    </View>
                    <Text style={{ fontSize: scale(18), color: '#ABABAB' }}>›</Text>
                  </TouchableOpacity>
                );
              })}
              {filteredOptions.length === 0 && (
                <View style={{ alignItems: 'center', paddingVertical: 32 }}>
                  <Text style={{ fontSize: scale(40) }}>🤔</Text>
                  <Text style={{ fontSize: scale(14), color: '#ABABAB', marginTop: 8 }}>No results for "{search}"</Text>
                  <Button label="Create custom goal" onPress={() => handleGoalOptionSelect(GOAL_OPTIONS.length - 1)} style={{ marginTop: 16, width: 'auto', paddingHorizontal: 24, alignSelf: 'center' }} />
                </View>
              )}
            </View>
          </ScrollView>
        </View>
      </View>
    );
  }

  // ── Step 2: Goal details ────────────────────────────────────────────────────
  if (step === 2) {
    return (
      <View style={s.gfRoot}>
        <View style={s.gfBackRow}>
          <TouchableOpacity style={s.gfBackBtn} onPress={() => initialData ? onCancel() : go(1)} activeOpacity={0.7}>
            <Text style={s.gfBackText}>←</Text>
          </TouchableOpacity>
        </View>
        <ScrollView contentContainerStyle={s.gfScrollTop} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
          <Text style={s.gfScreenTitle}>Goal details</Text>
          <Text style={s.gfScreenSub}>Confirm the name and amount.</Text>

          {/* Goal name */}
          <View style={{ marginTop: 20 }}>
            <View style={s.gfLabelRow}>
              <Text style={s.gfFieldLabel}>Goal name</Text>
              <Text style={s.gfCharCount}>{goalData.name.length}/30</Text>
            </View>
            <TextInput
              style={s.gfInput}
              value={goalData.name}
              autoCapitalize="words"
              onChangeText={v => setGoalData(prev => ({ ...prev, name: v.slice(0, 30) }))}
              placeholder="e.g. New bike"
              placeholderTextColor="#C0BEB8"
              returnKeyType="next"
            />
          </View>

          {/* Target amount — inline decimal-pad input */}
          <View style={{ marginTop: 16 }}>
            <Text style={s.gfFieldLabel}>Target amount</Text>
            <View style={[s.gfInput, { flexDirection: 'row', alignItems: 'center', gap: 4, paddingVertical: 0, height: 52 }]}>
              <Text style={{ fontSize: scale(16), color: '#1A1A1A', fontFamily: 'Inter_700Bold' }}>$</Text>
              <TextInput
                style={{ flex: 1, fontSize: scale(16), color: '#1A1A1A', paddingVertical: 0 }}
                value={amountText}
                onChangeText={v => {
                  // allow digits and single decimal point, max 8 chars
                  const clean = v.replace(/[^0-9.]/g, '');
                  const parts = clean.split('.');
                  const safe  = parts.length > 2 ? parts[0] + '.' + parts.slice(1).join('') : clean;
                  if (safe.length <= 8) setAmountText(safe);
                }}
                placeholder="0.00"
                placeholderTextColor="#C0BEB8"
                keyboardType="decimal-pad"
                returnKeyType="done"
              />
            </View>
          </View>

          {/* Photo (optional) */}
          <View style={{ marginTop: 16 }}>
            <Text style={s.gfFieldLabel}>Add a photo <Text style={s.gfCharCount}>(optional)</Text></Text>
            {photoAdded ? (
              <View style={s.gfPhotoPreview}>
                <View style={[s.gfPhotoPlaceholder, { height: 140 }]}>
                  <Image source={goalData.icon} style={{ width: scale(52), height: scale(52) }} resizeMode="contain" />
                  <Text style={{ color: '#ABABAB', marginTop: 6, fontSize: scale(12) }}>Photo preview</Text>
                </View>
                <TouchableOpacity style={s.gfPhotoRemove} onPress={() => setPhotoAdded(false)} activeOpacity={0.7}>
                  <Text style={s.gfPhotoRemoveText}>✕</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <View style={{ flexDirection: 'row', gap: 10, marginTop: 6 }}>
                <TouchableOpacity
                  style={[s.gfBtnOutline, { flex: 1, paddingVertical: 12 }]}
                  onPress={() => setPhotoAdded(true)}
                  activeOpacity={0.7}
                >
                  <Text style={s.gfBtnOutlineText}>📷  Camera</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[s.gfBtnOutline, { flex: 1, paddingVertical: 12 }]}
                  onPress={() => setPhotoAdded(true)}
                  activeOpacity={0.7}
                >
                  <Text style={s.gfBtnOutlineText}>🖼  Gallery</Text>
                </TouchableOpacity>
              </View>
            )}
          </View>

          <View style={{ height: 32 }} />
          {/* Primary action button — "Save Changes" when editing, "Next" when creating */}
          <Button
            label={initialData ? 'Save Changes' : 'Next'}
            disabled={!canProceed}
            onPress={() => {
              if (!canProceed) return;
              const committed = { ...goalData, amount: parseFloat(amountText).toFixed(2) };
              setGoalData(committed);
              if (initialData) {
                onGoalCreated?.(committed);
                onDone();
              } else {
                go(3);
              }
            }}
          />

          {/* Delete button — only shown when editing */}
          {initialData && (
            <TouchableOpacity
              style={[s.gfBtnOutline, { marginTop: 12, paddingVertical: 16 }]}
              onPress={() => setShowDeleteConfirm(true)}
              activeOpacity={0.8}
            >
              <Text style={[s.gfBtnOutlineText, { color: '#E53E3E' }]}>Delete Goal</Text>
            </TouchableOpacity>
          )}

        </ScrollView>

        {/* Delete confirmation — absolutely-positioned overlay so it sits inside the
            same modal layer as GoalCreationFlow. A nested <Modal> blocks the outer
            modal from dismissing on iOS, so we use a plain View overlay instead. */}
        {showDeleteConfirm && (
          <View style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.45)', justifyContent: 'flex-end', paddingBottom: 32, paddingHorizontal: 16 }}>
            <View style={{ backgroundColor: '#F7F6F2', borderRadius: 24, padding: 24, gap: 12 }}>
              <Text style={{ fontSize: scale(22), fontFamily: 'Inter_900Black', color: '#1A1A1A', letterSpacing: -0.3 }}>
                Delete this goal?
              </Text>
              {(savedCents ?? 0) > 0 ? (
                <Text style={{ fontSize: scale(15), color: '#6B6B6B', lineHeight: scale(22) }}>
                  {`Your progress ($${((savedCents ?? 0) / 100).toFixed(2)} saved) will stay in your balance. This can't be undone.`}
                </Text>
              ) : (
                <Text style={{ fontSize: scale(15), color: '#6B6B6B', lineHeight: scale(22) }}>
                  {"This can't be undone."}
                </Text>
              )}
              <TouchableOpacity
                style={[s.gfBtnPrimary, { backgroundColor: '#1A1A1A', marginTop: 8 }]}
                onPress={() => onDeleteGoal?.()}
                activeOpacity={0.85}
              >
                <Text style={s.gfBtnPrimaryText}>Yes, delete it</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[s.gfBtnOutline, { paddingVertical: 16 }]}
                onPress={() => setShowDeleteConfirm(false)}
                activeOpacity={0.8}
              >
                <Text style={s.gfBtnOutlineText}>Keep saving</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

      </View>
    );
  }

  // ── Step 3: Goal preview ────────────────────────────────────────────────────
  if (step === 3) {
    // Snapshot the formatted amount for display
    const displayAmt = goalData.amount ? `$${goalData.amount}` : `$${parseFloat(amountText).toFixed(2)}`;
    return (
      <View style={s.gfRoot}>
        <View style={s.gfBackRow}>
          <TouchableOpacity style={s.gfBackBtn} onPress={() => go(2)} activeOpacity={0.7}>
            <Text style={s.gfBackText}>←</Text>
          </TouchableOpacity>
        </View>
        <ScrollView contentContainerStyle={s.gfScrollTop} showsVerticalScrollIndicator={false}>
          <Text style={s.gfScreenTitle}>Goal preview</Text>
          <Text style={s.gfScreenSub}>{"Here's how your goal will look!"}</Text>

          {/* Goal card */}
          <View style={[s.gfPreviewCard, { borderColor: goalData.color }]}>
            <Image source={goalData.icon} style={{ width: scale(64), height: scale(64), alignSelf: 'center', marginBottom: 8 }} resizeMode="contain" />
            <Text style={s.gfPreviewName}>{goalData.name || 'My goal'}</Text>
            <Text style={s.gfPreviewAmount}>{displayAmt}</Text>
            <ProgressBar value={0} max={100} fillColor={goalData.color} height={8} style={{ marginBottom: 4 }} />
            <Text style={s.gfProgressPct}>0%</Text>
          </View>

          {/* Mascot bubble — goal-specific copy using child's monster name */}
          <MascotBanner message={mascotMsg} />

          <View style={{ height: 24 }} />
          <Button
            label="Create goal"
            onPress={() => {
              const finalData: GoalData = { ...goalData, amount: goalData.amount || parseFloat(amountText).toFixed(2) };
              onGoalCreated?.(finalData);
              onDone();
            }}
          />
        </ScrollView>
      </View>
    );
  }
}

// ─── Onboarding Flow ─────────────────────────────────────────────────────────

interface OnboardingFlowProps {
  onReady: () => void;
}

function OnboardingFlow({ onReady }: OnboardingFlowProps) {
  const [step, setStep] = useState<number>(0);

  const PaginationDots = ({ current }: { current: number }) => (
    <View style={{ flexDirection: 'row', gap: 6, justifyContent: 'center', marginBottom: 24 }}>
      {[0, 1, 2].map(i => (
        <View
          key={i}
          style={{
            width: 8, height: 8, borderRadius: 4,
            backgroundColor: current === i ? '#6B35F0' : '#D0CEC8',
          }}
        />
      ))}
    </View>
  );

  // Slide 0 — Complete chores
  if (step === 0) {
    return (
      <CreamBg>
        <TouchableOpacity
          style={ob.skipBtn}
          onPress={onReady}
          activeOpacity={0.7}
        >
          <Text style={ob.skipText}>Skip</Text>
        </TouchableOpacity>

        {/* Top half */}
        <View style={ob.topHalf}>
          <View style={ob.robotCircle}>
            <Image
              source={require('./assets/monstirs/robot monstir/robot_1.png')}
              style={{ width: 200, height: 200 }}
              resizeMode="contain"
            />
            {/* XP badge */}
            <View style={ob.xpBadge}>
              <Text style={{ fontSize: scale(14) }}>⭐</Text>
              <Text style={ob.xpBadgeText}>+50 XP</Text>
            </View>
          </View>
        </View>

        {/* Bottom white card */}
        <View style={ob.bottomCard}>
          <PaginationDots current={0} />
          <Text style={ob.slideTitle}>
            Complete{' '}
            <Text style={ob.slideTitleWord}>chores</Text>
          </Text>
          <View style={ob.yellowUnderline} />
          <Text style={ob.slideSubtitle}>
            Finish tasks around the house to earn XP and coins.
          </Text>
          <Button label="Next →" onPress={() => setStep(1)} />
        </View>
      </CreamBg>
    );
  }

  // Slide 1 — Level up & evolve
  if (step === 1) {
    return (
      <View style={{ flex: 1, backgroundColor: '#EAE4FF' }}>
        <TouchableOpacity style={ob.skipBtn} onPress={onReady} activeOpacity={0.7}>
          <Text style={ob.skipText}>Skip</Text>
        </TouchableOpacity>

        {/* Top half */}
        <View style={ob.topHalf}>
          <View style={[ob.robotCircle, { backgroundColor: '#D4CAFF' }]}>
            <Image
              source={require('./assets/monstirs/robot monstir/robot_7.png')}
              style={{ width: 220, height: 220 }}
              resizeMode="contain"
            />
            {/* Level up badge */}
            <View style={[ob.xpBadge, { borderColor: '#6B35F0' }]}>
              <Text style={{ fontSize: scale(14) }}>👑</Text>
              <Text style={[ob.xpBadgeText, { color: '#6B35F0', fontFamily: 'Inter_800ExtraBold' }]}>LEVEL UP!</Text>
            </View>
          </View>
        </View>

        {/* Bottom white card */}
        <View style={ob.bottomCard}>
          <PaginationDots current={1} />
          <Text style={ob.slideTitle}>
            Level up &{' '}
            <Text style={ob.slideTitleWord}>evolve</Text>
          </Text>
          <View style={ob.yellowUnderline} />
          <Text style={ob.slideSubtitle}>
            The more you do, the stronger your Monstir becomes!
          </Text>
          <Button label="Next →" onPress={() => setStep(2)} />
        </View>
      </View>
    );
  }

  // Slide 2 — Earn rewards
  if (step === 2) {
    return (
      <CreamBg>
        <TouchableOpacity style={ob.skipBtn} onPress={onReady} activeOpacity={0.7}>
          <Text style={ob.skipText}>Skip</Text>
        </TouchableOpacity>

        {/* Top half */}
        <View style={ob.topHalf}>
          <View style={{ alignItems: 'center', gap: 12 }}>
            {/* 2x2 grid of reward icons */}
            <View style={{ flexDirection: 'row', gap: 12 }}>
              {(['⭐', '📖', '👟', '🧢'] as string[]).map((emoji, i) => (
                <View key={i} style={ob.rewardIcon}>
                  <Text style={{ fontSize: scale(32) }}>{emoji}</Text>
                </View>
              ))}
            </View>
            {/* Treasure chest */}
            <View style={ob.chestBox}>
              <Text style={{ fontSize: scale(80) }}>🎁</Text>
            </View>
          </View>
        </View>

        {/* Bottom white card */}
        <View style={ob.bottomCard}>
          <PaginationDots current={2} />
          <Text style={ob.slideTitle}>
            Earn{' '}
            <Text style={ob.slideTitleWord}>rewards</Text>
          </Text>
          <View style={ob.yellowUnderline} />
          <Text style={ob.slideSubtitle}>
            Unlock cool items, accessories, and new evolutions!
          </Text>
          <Button label="Next →" onPress={onReady} />
        </View>
      </CreamBg>
    );
  }
}

// ─── Landing Screen ───────────────────────────────────────────────────────────

function LandingScreen({ onLogin, onCreateAccount }: { onLogin: () => void; onCreateAccount: () => void }) {
  const [email, setEmail]       = useState('');
  const [password, setPassword] = useState('');
  const [showPw, setShowPw]     = useState(false);

  return (
    <View style={{ flex: 1, backgroundColor: '#C5F215' }}>

      {/* ── Background texture ── */}
      <Image
        source={require('./assets/appBGsignup.png')}
        style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }}
        resizeMode="contain"
      />

      {/* ── Sparkle decorations ── */}
      <Text style={{ position: 'absolute', top: 130, left: 28,  fontSize: scale(28), color: '#1A1A1A', fontFamily: 'Inter_900Black' }}>✦</Text>
      <Text style={{ position: 'absolute', top: 108, right: 44, fontSize: scale(24), color: '#6B35F0'             }}>✦</Text>
      <View style={{ position: 'absolute', top: 198, right: 28, width: 6, height: 6, borderRadius: 3, backgroundColor: '#1A1A1A' }} />
      <View style={{ position: 'absolute', top: 172, left: 118, width: 7, height: 7, borderRadius: 4, backgroundColor: '#FF6B2B' }} />
      <Text style={{ position: 'absolute', bottom: 168, right: 28, fontSize: scale(22), color: '#F5C518'          }}>✦</Text>
      <View style={{ position: 'absolute', bottom: 210, right: 76, width: 5, height: 5, borderRadius: 3, backgroundColor: '#1A1A1A' }} />

      {/* ── Main content ── */}
      <View style={{ flex: 1, paddingHorizontal: 28, justifyContent: 'center', alignItems: 'center', paddingBottom: 80 }}>

        <Image source={require('./assets/monstirLogo.png')} style={{ width: 280, height: 103, marginBottom: 36 }} resizeMode="contain" />

        <Text style={{ fontSize: scale(28), fontFamily: 'Inter_900Black', color: '#1A1A1A', textAlign: 'center', marginBottom: 6 }}>Welcome back!</Text>
        <Text style={{ fontSize: scale(16), color: '#4A4A4A', textAlign: 'center', marginBottom: 28 }}>Log in to your Monstir account.</Text>

        {/* Email */}
        <TextInput
          style={{ width: '100%', backgroundColor: '#FFFFFF', borderRadius: 100, borderWidth: 2, borderColor: '#1A1A1A', paddingHorizontal: 24, paddingVertical: 18, fontSize: scale(16), color: '#1A1A1A', marginBottom: 12 }}
          value={email}
          onChangeText={setEmail}
          placeholder="Email"
          placeholderTextColor="#C0BEB8"
          keyboardType="email-address"
          autoCapitalize="none"
          returnKeyType="next"
        />

        {/* Password */}
        <View style={{ width: '100%', flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFFFFF', borderRadius: 100, borderWidth: 2, borderColor: '#1A1A1A', paddingHorizontal: 24, paddingVertical: 18, marginBottom: 20 }}>
          <TextInput
            style={{ flex: 1, fontSize: scale(16), color: '#1A1A1A' }}
            value={password}
            onChangeText={setPassword}
            placeholder="Password"
            placeholderTextColor="#C0BEB8"
            secureTextEntry={!showPw}
            returnKeyType="done"
            onSubmitEditing={onLogin}
          />
          <TouchableOpacity onPress={() => setShowPw(v => !v)} activeOpacity={0.7} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
            <Text style={{ fontSize: scale(16), color: '#ABABAB' }}>{showPw ? '🙈' : '👁'}</Text>
          </TouchableOpacity>
        </View>

        {/* Log in */}
        <Button label="Log in" onPress={onLogin} style={{ marginBottom: 14 }} />

        {/* Create an account */}
        <Button label="Create an account" onPress={onCreateAccount} variant="secondary" />

      </View>
    </View>
  );
}

// ─── Login Screen ─────────────────────────────────────────────────────────────

interface LoginScreenProps {
  onBack: () => void;
  onSuccess: () => void;
  onSignUp: () => void;
}

function LoginScreen({ onBack, onSuccess, onSignUp }: LoginScreenProps) {
  const [email, setEmail]               = useState('');
  const [password, setPassword]         = useState('');
  const [showPassword, setShowPassword] = useState(false);

  return (
    <CreamBg>
      {/* Decorative elements */}
      <Text style={auth.leafDecor}>🌿</Text>
      <View style={auth.purpleBlob} />
      <Text style={[auth.sparkle, { top: 120, right: 60 }]}>⭐</Text>
      <Text style={[auth.sparkle, { top: 200, left: 40 }]}>✦</Text>
      <Text style={[auth.sparkle, { bottom: 200, right: 40 }]}>⭐</Text>

      <ScrollView contentContainerStyle={{ flexGrow: 1, paddingHorizontal: 24, paddingTop: 20, paddingBottom: 40 }} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
        {/* Back button */}
        <TouchableOpacity onPress={onBack} style={auth.backBtn} activeOpacity={0.7}>
          <Text style={auth.backBtnText}>←</Text>
        </TouchableOpacity>

        <Text style={auth.title}>Welcome back!</Text>
        <Text style={auth.subtitle}>Log in to your Monstir account.</Text>

        <View style={{ gap: 14, marginTop: 28 }}>
          {/* Email input */}
          <View style={auth.inputRow}>
            <Text style={auth.inputIcon}>📧</Text>
            <TextInput
              style={auth.textInput}
              value={email}
              onChangeText={setEmail}
              placeholder="Email"
              placeholderTextColor="#C0BEB8"
              keyboardType="email-address"
              autoCapitalize="none"
            />
          </View>

          {/* Password input */}
          <View style={auth.inputRow}>
            <Text style={auth.inputIcon}>🔒</Text>
            <TextInput
              style={[auth.textInput, { flex: 1 }]}
              value={password}
              onChangeText={setPassword}
              placeholder="Password"
              placeholderTextColor="#C0BEB8"
              secureTextEntry={!showPassword}
            />
            <TouchableOpacity onPress={() => setShowPassword(v => !v)} activeOpacity={0.7} style={{ paddingHorizontal: 8 }}>
              <Text style={{ fontSize: scale(18) }}>{showPassword ? '🙈' : '👁'}</Text>
            </TouchableOpacity>
          </View>

          {/* Forgot password */}
          <TouchableOpacity style={{ alignSelf: 'flex-end' }} activeOpacity={0.7}>
            <Text style={{ fontSize: scale(14), color: '#6B35F0', fontFamily: 'Inter_600SemiBold' }}>Forgot password?</Text>
          </TouchableOpacity>

          {/* Log in button */}
          <Button label="Log in" onPress={onSuccess} />

          {/* Divider */}
          <View style={auth.dividerRow}>
            <View style={auth.dividerLine} />
            <Text style={auth.dividerText}>or</Text>
            <View style={auth.dividerLine} />
          </View>

          {/* Google button */}
          <TouchableOpacity style={auth.googleBtn} activeOpacity={0.85}>
            <Text style={{ color: '#4285F4', fontFamily: 'Inter_900Black', fontSize: scale(18) }}>G</Text>
            <Text style={auth.googleBtnText}>Continue with Google</Text>
          </TouchableOpacity>

          {/* Sign up link */}
          <View style={{ flexDirection: 'row', justifyContent: 'center', marginTop: 8, gap: 4 }}>
            <Text style={{ fontSize: scale(14), color: '#ABABAB' }}>Don't have an account?</Text>
            <TouchableOpacity onPress={onSignUp} activeOpacity={0.7}>
              <Text style={{ fontSize: scale(14), color: '#6B35F0', fontFamily: 'Inter_700Bold' }}>Sign up</Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
    </CreamBg>
  );
}

// ─── Sign Up Screen ───────────────────────────────────────────────────────────

interface SessionUser { name: string; email: string; }

interface SignupScreenProps {
  onBack: () => void;
  onSuccess: (user: SessionUser) => void;
  onLogin: () => void;
}

function SignupScreen({ onBack, onSuccess, onLogin }: SignupScreenProps) {
  const [name, setName]                       = useState('');
  const [email, setEmail]                     = useState('');
  const [password, setPassword]               = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword]       = useState(false);
  const [showConfirm, setShowConfirm]         = useState(false);
  const [error, setError]                     = useState('');

  const handleSubmit = () => {
    if (!name.trim() || !email.trim() || !password || !confirmPassword) {
      setError('Please fill in all fields.'); return;
    }
    if (password !== confirmPassword) {
      setError('Passwords don\'t match.'); return;
    }
    if (password.length < 6) {
      setError('Password must be at least 6 characters.'); return;
    }
    setError('');
    onSuccess({ name: name.trim(), email: email.trim().toLowerCase() });
  };

  const inputStyle = {
    width: '100%' as const,
    backgroundColor: '#FFFFFF',
    borderRadius: 100,
    borderWidth: 2,
    borderColor: '#1A1A1A',
    paddingHorizontal: 24,
    paddingVertical: 18,
    fontSize: scale(16),
    color: '#1A1A1A',
  };

  return (
    <View style={{ flex: 1, backgroundColor: '#C5F215' }}>

      {/* ── Background texture ── */}
      <Image
        source={require('./assets/appBGsignup.png')}
        style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }}
        resizeMode="contain"
      />

      {/* ── Sparkle decorations ── */}
      <Text style={{ position: 'absolute', top: 130, left: 28,  fontSize: scale(28), color: '#1A1A1A', fontFamily: 'Inter_900Black' }}>✦</Text>
      <Text style={{ position: 'absolute', top: 108, right: 44, fontSize: scale(24), color: '#6B35F0'             }}>✦</Text>
      <View style={{ position: 'absolute', top: 198, right: 28, width: 6, height: 6, borderRadius: 3, backgroundColor: '#1A1A1A' }} />
      <View style={{ position: 'absolute', top: 172, left: 118, width: 7, height: 7, borderRadius: 4, backgroundColor: '#FF6B2B' }} />
      <Text style={{ position: 'absolute', bottom: 168, right: 28, fontSize: scale(22), color: '#F5C518'          }}>✦</Text>
      <View style={{ position: 'absolute', bottom: 210, right: 76, width: 5, height: 5, borderRadius: 3, backgroundColor: '#1A1A1A' }} />

      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
        <ScrollView
          contentContainerStyle={{ flexGrow: 1, paddingHorizontal: 28, paddingTop: 56, paddingBottom: 120 }}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* Back button */}
          <TouchableOpacity onPress={onBack} activeOpacity={0.7} style={{ marginBottom: 16, alignSelf: 'flex-start' }}>
            <Text style={{ fontSize: scale(24), color: '#1A1A1A', fontFamily: 'Inter_900Black' }}>←</Text>
          </TouchableOpacity>

          {/* Logo */}
          <Image
            source={require('./assets/monstirLogo.png')}
            style={{ width: 280, height: 103, alignSelf: 'center', marginBottom: 32 }}
            resizeMode="contain"
          />

          {/* Heading */}
          <Text style={{ fontSize: scale(28), fontFamily: 'Inter_900Black', color: '#1A1A1A', textAlign: 'center', marginBottom: 6 }}>
            Create account
          </Text>
          <Text style={{ fontSize: scale(16), color: '#4A4A4A', textAlign: 'center', marginBottom: 28 }}>
            Join Monstir and start your adventure!
          </Text>

          <View style={{ gap: 12 }}>
            {/* Name */}
            <TextInput
              style={inputStyle}
              value={name}
              onChangeText={setName}
              placeholder="Name"
              placeholderTextColor="#C0BEB8"
              autoCapitalize="words"
              returnKeyType="next"
            />

            {/* Email */}
            <TextInput
              style={inputStyle}
              value={email}
              onChangeText={setEmail}
              placeholder="Email"
              placeholderTextColor="#C0BEB8"
              keyboardType="email-address"
              autoCapitalize="none"
              returnKeyType="next"
            />

            {/* Password */}
            <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFFFFF', borderRadius: 100, borderWidth: 2, borderColor: '#1A1A1A', paddingHorizontal: 24, paddingVertical: 18 }}>
              <TextInput
                style={{ flex: 1, fontSize: scale(16), color: '#1A1A1A' }}
                value={password}
                onChangeText={setPassword}
                placeholder="Password"
                placeholderTextColor="#C0BEB8"
                secureTextEntry={!showPassword}
                returnKeyType="next"
              />
              <TouchableOpacity onPress={() => setShowPassword(v => !v)} activeOpacity={0.7} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                <Text style={{ fontSize: scale(16), color: '#ABABAB' }}>{showPassword ? '🙈' : '👁'}</Text>
              </TouchableOpacity>
            </View>

            {/* Confirm password */}
            <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFFFFF', borderRadius: 100, borderWidth: 2, borderColor: '#1A1A1A', paddingHorizontal: 24, paddingVertical: 18 }}>
              <TextInput
                style={{ flex: 1, fontSize: scale(16), color: '#1A1A1A' }}
                value={confirmPassword}
                onChangeText={setConfirmPassword}
                placeholder="Confirm password"
                placeholderTextColor="#C0BEB8"
                secureTextEntry={!showConfirm}
                returnKeyType="done"
                onSubmitEditing={handleSubmit}
              />
              <TouchableOpacity onPress={() => setShowConfirm(v => !v)} activeOpacity={0.7} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                <Text style={{ fontSize: scale(16), color: '#ABABAB' }}>{showConfirm ? '🙈' : '👁'}</Text>
              </TouchableOpacity>
            </View>

            {/* Validation error */}
            {!!error && (
              <Text style={{ fontSize: scale(13), color: '#E53935', textAlign: 'center', fontFamily: 'Inter_600SemiBold', marginTop: -4 }}>
                {error}
              </Text>
            )}

            {/* Create account button */}
            <TouchableOpacity
              style={{
                backgroundColor: '#6B35F0',
                borderRadius: 100,
                paddingVertical: 18,
                alignItems: 'center',
                marginTop: 8,
                borderWidth: 2.5,
                borderColor: '#1A1A1A',
              }}
              onPress={handleSubmit}
              activeOpacity={0.85}
            >
              <Text style={{ fontSize: scale(18), fontFamily: 'Inter_900Black', color: '#FFFFFF' }}>Create an account</Text>
            </TouchableOpacity>

            {/* Log in link */}
            <TouchableOpacity
              style={{
                backgroundColor: '#FFFFFF',
                borderRadius: 100,
                paddingVertical: 18,
                alignItems: 'center',
                borderWidth: 2.5,
                borderColor: '#1A1A1A',
                shadowColor: '#1A1A1A',
                shadowOffset: { width: 0, height: 4 },
                shadowOpacity: 0.12,
                shadowRadius: 0,
                elevation: 3,
              }}
              onPress={onLogin}
              activeOpacity={0.85}
            >
              <Text style={{ fontSize: scale(18), fontFamily: 'Inter_900Black', color: '#1A1A1A' }}>Log in</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

// ─── Root ─────────────────────────────────────────────────────────────────────

type AppMode = 'splash' | 'onboarding' | 'landing' | 'login' | 'signup' | 'parentOnboarding' | 'kidWelcome' | 'kidProfile' | 'app';

// ─── Splash Screen ────────────────────────────────────────────────────────────

function SplashScreen({ onDone }: { onDone: () => void }) {
  const opacity = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    const t = setTimeout(() => {
      Animated.timing(opacity, {
        toValue: 0,
        duration: 500,
        easing: Easing.out(Easing.ease),
        useNativeDriver: true,
      }).start(() => onDone());
    }, 2200);
    return () => clearTimeout(t);
  }, []);

  return (
    <Animated.View style={[splashStyles.root, { opacity }]}>
      <StatusBar barStyle="dark-content" backgroundColor="#dbf73b" />
      {/* Background blob image */}
      <Image
        source={require('./assets/appBG.png')}
        style={splashStyles.bg}
        resizeMode="cover"
      />
      {/* Logo */}
      <Image
        source={require('./assets/monstirLogo.png')}
        style={splashStyles.logo}
        resizeMode="contain"
      />
    </Animated.View>
  );
}

const splashStyles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#dbf73b',
    alignItems: 'center',
    justifyContent: 'center',
  },
  bg: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    width: '100%',
    height: '100%',
  },
  logo: {
    width: 280,
    height: 103,
  },
});

function AppInner() {
  const [activeToast, setActiveToast]     = useState<MilestoneDef | null>(null);
  const [toastMilestoneId, setToastMid]   = useState<string | null>(null);
  const [appMode, setAppMode]             = useState<AppMode>('splash');
  const [sessionUser, setSessionUser] = useState<SessionUser | null>(null);
  const [kidWelcomeName, setKidWelcomeName] = useState('there');
  const [selectedMonsterId,   setSelectedMonsterId]   = useState<MonsterId>('slime');
  const [selectedMonsterName, setSelectedMonsterName] = useState<string>('');
  const fallbackMonsterName = useRef(randomFallbackName()).current;
  const effectiveMonsterName = selectedMonsterName || fallbackMonsterName;
  const [screen, setScreen]             = useState<Screen>('home');
  const [tab, setTab]                   = useState<Tab>('home');
  const [trophyOrigin, setTrophyOrigin]       = useState<Tab>('home');
  const [trophyInitialKey, setTrophyInitialKey] = useState<string | undefined>(undefined);
  const [monsterIdx, setMonsterIdx]     = useState<MonsterIdx>(0);
  const [xp, setXp]                     = useState(0);
  const [coins, setCoins]               = useState(0);
  const [done, setDone]                 = useState<Partial<Record<ChoreId, boolean>>>({});
  const [bonusCoins, setBonusCoins]     = useState(0);
  const [battleResult, setBattleResult]     = useState<'captured' | 'got-away' | null>(null);
  const [woundedBossHp, setWoundedBossHp]   = useState<Record<string, number>>({});
  const [lockedBossName, setLockedBossName] = useState<string | null>(null);
  const [chestTier, setChestTier]           = useState<ChestTier>('Common');
  const [chorePctAtBattle, setChorePctAtBattle] = useState(0);
  const [chestCollectible, setChestCollectible] = useState(() => pickForTier('Common'));
  const [battleCoinBonusEnabled,    setBattleCoinBonusEnabled]    = useState(false);
  const [battleCoinBonusMultiplier, setBattleCoinBonusMultiplier] = useState(1.0);

  // Parent state
  const [viewMode, setViewMode]               = useState<ViewMode>('kid');
  const [parentScreen, setParentScreen]       = useState<ParentScreen>('parentHome');
  const [prevParentScreen, setPrevParentScreen] = useState<ParentScreen>('parentHome');
  const [parentTab, setParentTab]             = useState<ParentTab>('home');
  const [managedChores, setManagedChores]     = useState<ManagedChore[]>(DEFAULT_MANAGED_CHORES);
  const [editingChore, setEditingChore]       = useState<ManagedChore | null>(null);
  const [baseRate, setBaseRate]               = useState('0.50');
  const [setupChildren, setSetupChildren]     = useState<import('./src/screens/ParentOnboarding').OnboardingChild[]>([]);
  const [kids, setKids]                       = useState<string[]>([]);
  const [currentKidName, setCurrentKidName]   = useState('');
  const [kidOnboardingDone, setKidOnboardingDone] = useState<Record<string, boolean>>({});
  const [weeklyCapEnabled, setWeeklyCap]      = useState(false);
  // Per-kid approval settings — true = needs parent sign-off, false = auto-approve
  const [kidApprovalSettings, setKidApprovalSettings] = useState<Record<string, boolean>>({});
  const requireApproval = kidApprovalSettings[currentKidName] ?? false;
  const [showKidProfile, setShowKidProfile]   = useState(false);
  const [kidModalVisible, setKidModalVisible] = useState(false);
  const [kidModalInitial, setKidModalInitial] = useState<import('./src/screens/ParentOnboarding').OnboardingChild | null>(null);
  const [parentToast, setParentToast]         = useState<string | null>(null);
  const parentToastTimer                      = useRef<ReturnType<typeof setTimeout> | null>(null);
  const showParentToast = (msg: string) => {
    setParentToast(null);
    setTimeout(() => {
      setParentToast(msg);
      if (parentToastTimer.current) clearTimeout(parentToastTimer.current);
      parentToastTimer.current = setTimeout(() => setParentToast(null), 2100);
    }, 30);
  };
  const openKidModal = (initial: import('./src/screens/ParentOnboarding').OnboardingChild | null) => {
    setKidModalInitial(initial);
    setKidModalVisible(true);
  };
  const handleKidModalSave = (data: { name: string; avatarIdx: number; avatarColor: string; ageRange: import('./src/screens/ParentOnboarding').OnboardingChild['ageRange'] }) => {
    setKidModalVisible(false);
    if (kidModalInitial) {
      // Edit existing
      setSetupChildren(prev => prev.map(c => c.id === kidModalInitial.id ? { ...c, ...data } : c));
      setKids(prev => prev.map(n => n === kidModalInitial.name ? data.name : n));
      if (kidModalInitial.name !== data.name) {
        setCurrentKidName(cn => cn === kidModalInitial.name ? data.name : cn);
        setKidApprovalSettings(prev => {
          const next = { ...prev };
          if (kidModalInitial.name in next) { next[data.name] = next[kidModalInitial.name]; delete next[kidModalInitial.name]; }
          return next;
        });
      }
      showParentToast('Profile updated ✅');
    } else {
      // Add new
      const newChild: import('./src/screens/ParentOnboarding').OnboardingChild = {
        id: Date.now().toString(),
        name: data.name,
        avatarIdx: data.avatarIdx,
        avatarColor: data.avatarColor,
        ageRange: data.ageRange,
        difficulty: 'Easy',
        selectedChoreIds: [],
      };
      setSetupChildren(prev => [...prev, newChild]);
      setKids(prev => [...prev, data.name]);
      setKidApprovalSettings(prev => ({ ...prev, [data.name]: true }));
      showParentToast(`${data.name} added! 🎉`);
    }
  };
  const [pendingEvolution, setPendingEvolution] = useState(false);
  const [goals, setGoals] = useState<SavedGoal[]>([]);
  const [currentStreak, setCurrentStreak] = useState(0);
  const [shards, setShards] = useState(0);
  const [lastChoreDate, setLastChoreDate]     = useState<string>('');
  const [lastWeekReset, setLastWeekReset]     = useState<string>('');
  const [weekApprovalDays, setWeekApprovalDays] = useState<string[]>([]); // date strings of days with ≥1 approval
  const [weeklyXp, setWeeklyXp]           = useState(0);
  const [kidPayoutPending, setKidPayoutPending] = useState(false);
  const [payoutSnapshot, setPayoutSnapshot] = useState<{
    amount: number; completedCount: number; battleWon: boolean | null; battleBonus: number | null;
  } | null>(null);

  // ── Daily chore reset ─────────────────────────────────────────────────────
  const [lastResetDate,  setLastResetDate]  = useState<string>('');
  const [debugDayOffset, setDebugDayOffset] = useState(0);

  useEffect(() => {
    const today = getSimulatedToday(debugDayOffset);
    // Use functional updater so we read latest lastResetDate without adding it to deps
    setLastResetDate(prev => {
      if (prev !== today) {
        setManagedChores(chores => applyDailyReset(chores));
        return today;
      }
      return prev;
    });
  }, [debugDayOffset]); // also fires on mount (prev will be '' !== today)

  // ── Global debug state (dev only) ─────────────────────────────────────────
  const [debugOpen, setDebugOpen]             = useState(false);
  const [debugMinimized, setDebugMinimized]   = useState(false);
  const [debugTab,  setDebugTab]              = useState<'xp' | 'layout' | 'kw' | 'nav' | 'battle' | 'days'>('xp');
  const [dbgBossIdx,         setDbgBossIdx]         = useState(0);
  const [dbgCompletionPct,   setDbgCompletionPct]   = useState(80);
  const [dbgWeaknessUnlocked,setDbgWeaknessUnlocked]= useState(false);
  const [dbgShards,          setDbgShards]          = useState(4);
  const [dbgBattleActive,    setDbgBattleActive]    = useState(false);
  const [dbgMonsterSize,  setDbgMonsterSize]  = useState(() => scale(287));
  const [dbgMonsterY,     setDbgMonsterY]     = useState(() => scale(68));
  const [dbgPlatformSize, setDbgPlatformSize] = useState(() => scale(484));
  const [dbgPlatformY,    setDbgPlatformY]    = useState(() => scale(-18));
  // Merge with defaults so hot-reload state preserved from older builds
  // never leaves new fields undefined (which renders as NaN in the debug panel).
  const [kwDbg, setKwDbg] = useState<KwDebugValues>(() => ({ ...KW_DEBUG_DEFAULTS }));
  useEffect(() => {
    setKwDbg(prev => ({ ...KW_DEBUG_DEFAULTS, ...prev }));
  }, []);

  // Fire deferred evolution when the kid switches back to their view
  useEffect(() => {
    if (viewMode === 'kid' && pendingEvolution) {
      setPendingEvolution(false);
      setScreen('evolve');
    }
  }, [viewMode, pendingEvolution]);

  // Fire deferred kid payout celebration when the kid switches back to their view
  useEffect(() => {
    if (viewMode === 'kid' && kidPayoutPending) {
      setKidPayoutPending(false);
      setScreen('kidPayout' as any);
    }
  }, [viewMode, kidPayoutPending]);

  // Allow audio to play through iOS silent switch
  useEffect(() => {
    Audio.setAudioModeAsync({ playsInSilentModeIOS: true });
  }, []);
  const openDebug = () => { if (__DEV__) setDebugOpen(true); };

  const completeChore = useCallback((c: Chore) => {
    const newXp = xp + c.xp;
    setDone(prev => ({ ...prev, [c.id]: true }));
    setXp(newXp);
    setWeeklyXp(prev => prev + c.xp);
    setCoins(prev => prev + choreCoins(c, baseRate));
    if (monsterIdx < MONSTERS.length - 1 && newXp >= MONSTERS[monsterIdx].needed) {
      setScreen('evolve');
    }
  }, [xp, monsterIdx]);

  const submitManagedChore = useCallback((id: string) => {
    const chore = managedChores.find(c => c.id === id);
    if (!chore || (chore.status !== 'active' && chore.status !== 'rejected')) return;
    if (requireApproval) {
      setManagedChores(prev => prev.map(c => c.id === id ? { ...c, status: 'pending' as const, rejectionNote: undefined } : c));
    } else {
      const newCompletions = (chore.weeklyCompletions ?? 0) + 1;
      setManagedChores(prev => prev.map(c => c.id === id ? { ...c, status: 'approved' as const, weeklyCompletions: newCompletions } : c));
      // ── XP with streak bonus ──────────────────────────────────────────────────
      const today = getSimulatedToday(debugDayOffset);
      const isNewDay = lastChoreDate !== today;
      const newStreak = isNewDay ? currentStreak + 1 : currentStreak;
      const baseXp = XP_BY_DIFFICULTY[chore.difficulty];
      let earnedXp = baseXp;
      if (isNewDay && newStreak > 0 && newStreak % 7 === 0) earnedXp += 25;          // +25 flat on 7-day
      else if (isNewDay && newStreak > 0 && newStreak % 3 === 0) earnedXp = Math.round(earnedXp * 1.1); // +10% on 3-day
      const newXp = xp + earnedXp;
      setXp(newXp);
      setWeeklyXp(prev => prev + earnedXp);
      const earnedCoins = Math.round(parseFloat(baseRate) * 100 * DIFFICULTY_MULTIPLIERS[chore.difficulty]);
      setCoins(prev => prev + earnedCoins);
      if (monsterIdx < MONSTERS.length - 1 && newXp >= MONSTERS[monsterIdx].needed) {
        setScreen('evolve');
      }
      // Update active goal progress
      setGoals(prev => {
        if (prev.length === 0) return prev;
        return prev.map((g, i) => i === 0 ? {
          ...g,
          savedCents: g.savedCents + earnedCoins,
          activityFeed: [
            { label: chore.name, pts: earnedCoins, when: 'Today' },
            ...g.activityFeed.slice(0, 9),
          ],
        } : g);
      });
      // Streak update
      if (isNewDay) {
        setCurrentStreak(newStreak);
        setLastChoreDate(today);
      }
    }
  }, [managedChores, xp, monsterIdx, baseRate, kidApprovalSettings, currentKidName, currentStreak, lastChoreDate, debugDayOffset]);

  // ── Monday midnight weekly reset ─────────────────────────────────────────────
  useEffect(() => {
    const mondayKey = getWeekMondayKey(debugDayOffset);
    if (lastWeekReset === mondayKey) return; // already reset this week
    const simDay = new Date(Date.now() + debugDayOffset * 86_400_000).getDay();
    if (simDay !== 1 && debugDayOffset === 0) return; // not Monday in real time (debug can force it)
    // Reset weekly chore completions and approval days
    setManagedChores(prev => prev.map(c => ({
      ...c,
      weeklyCompletions: 0,
      status: c.status === 'approved' || c.status === 'rejected' ? 'active' as const : c.status,
      rejectionNote: undefined,
    })));
    setWeeklyXp(0);
    setWeekApprovalDays([]);
    setLastWeekReset(mondayKey);
  }, [debugDayOffset, lastWeekReset]);

  // ── Milestone helper ─────────────────────────────────────────────────────────
  const checkMilestone = useCallback(async (id: string) => {
    const wasNew = await earnMilestone(id);
    if (!wasNew) return;
    const def = getMilestone(id);
    if (!def) return;
    setToastMid(id);
    setActiveToast(def);
  }, []);

  const approveManagedChore = useCallback((id: string) => {
    const chore = managedChores.find(c => c.id === id);
    if (!chore || chore.status !== 'pending') return;
    const newCompletions = (chore.weeklyCompletions ?? 0) + 1;
    setManagedChores(prev => prev.map(c => c.id === id ? { ...c, status: 'approved' as const, weeklyCompletions: newCompletions } : c));
    // ── XP with streak bonus ──────────────────────────────────────────────────
    const today = getSimulatedToday(debugDayOffset);
    const isNewDay = lastChoreDate !== today;
    const newStreak = isNewDay ? currentStreak + 1 : currentStreak;
    const baseXp = XP_BY_DIFFICULTY[chore.difficulty];
    let earnedXp = baseXp;
    if (isNewDay && newStreak > 0 && newStreak % 7 === 0) earnedXp += 25;
    else if (isNewDay && newStreak > 0 && newStreak % 3 === 0) earnedXp = Math.round(earnedXp * 1.1);
    const newXp = xp + earnedXp;
    setXp(newXp);
    setWeeklyXp(prev => prev + earnedXp);
    const earnedCoins = Math.round(parseFloat(baseRate) * 100 * DIFFICULTY_MULTIPLIERS[chore.difficulty]);
    setCoins(prev => prev + earnedCoins);
    if (monsterIdx < MONSTERS.length - 1 && newXp >= MONSTERS[monsterIdx].needed) {
      checkMilestone('first-evolution');
      if (viewMode === 'kid') {
        setScreen('evolve');
      } else {
        setPendingEvolution(true);
      }
    }
    // Update active goal progress
    setGoals(prev => {
      if (prev.length === 0) return prev;
      return prev.map((g, i) => i === 0 ? {
        ...g,
        savedCents: g.savedCents + earnedCoins,
        activityFeed: [
          { label: chore.name, pts: earnedCoins, when: 'Today' },
          ...g.activityFeed.slice(0, 9),
        ],
      } : g);
    });
    // Streak + approval day tracking
    if (isNewDay) {
      setCurrentStreak(newStreak);
      setLastChoreDate(today);
      setWeekApprovalDays(prev => prev.includes(today) ? prev : [...prev, today]);
    }

    // ── Milestone triggers ────────────────────────────────────────────────────
    // Count lifetime approved chores after this approval
    const totalApproved = managedChores.filter(c => c.status === 'approved').length + 1;
    if (totalApproved >= 1)  checkMilestone('first-chore');
    if (totalApproved >= 10) checkMilestone('chores-10');
    if (totalApproved >= 50) checkMilestone('chores-50');
    // Streak milestones
    if (newStreak >= 3) checkMilestone('streak-3');
    if (newStreak >= 7) checkMilestone('streak-7');
    // Money milestones (total coins ever earned, approximate from current + earned)
    const totalCoinsAfter = coins + earnedCoins;
    if (totalCoinsAfter >= 1000)  checkMilestone('money-10');
    if (totalCoinsAfter >= 2500)  checkMilestone('money-25');
    if (totalCoinsAfter >= 10000) checkMilestone('money-100');
    // Goal Getter — check if current goal is reached after this coin add
    const currentGoal = goals[0];
    if (currentGoal) {
      const targetCents = Math.round(parseFloat(currentGoal.amount || '0') * 100);
      if (targetCents > 0 && currentGoal.savedCents + earnedCoins >= targetCents) {
        checkMilestone('goal-getter');
      }
    }
    // Parent milestones
    checkMilestone('parent-first-approval');
  }, [managedChores, xp, monsterIdx, baseRate, viewMode, currentStreak, lastChoreDate, debugDayOffset, checkMilestone, coins]);

  const rejectManagedChore = useCallback((id: string, note: string) => {
    setManagedChores(prev => prev.map(c => c.id === id ? { ...c, status: 'rejected' as const, rejectionNote: note || undefined } : c));
  }, [managedChores]);

  const confirmPayout = useCallback(() => {
    setCoins(0);
    setKidPayoutPending(true);
    setParentScreen('parentHome');
  }, []);

  const openPayout = useCallback(() => {
    const approvedChores = managedChores.filter(c => c.status === 'approved');
    const boss = resolveCurrentBoss(monsterIdx, lockedBossName);
    const bBonus = battleResult === 'captured' ? boss.captureCoins : null;
    setPayoutSnapshot({
      amount: coins,
      completedCount: approvedChores.length,
      battleWon: battleResult === 'captured' ? true : battleResult === 'got-away' ? false : null,
      battleBonus: bBonus,
    });
    setParentScreen('parentPayout');
  }, [managedChores, monsterIdx, battleResult, coins]);

  const tierFromPct = (pct: number): ChestTier => {
    if (pct >= 90) return 'Legendary';
    if (pct >= 75) return 'Epic';
    if (pct >= 50) return 'Rare';
    return 'Common';
  };

    const handleBattleEnd = useCallback((result: 'captured' | 'got-away', shardsUsed: number, completionPctOverride?: number, bossOverride?: Boss, remainingBossHp?: number) => {
    const boss = bossOverride ?? resolveCurrentBoss(monsterIdx, lockedBossName);
    let coinsEarned = 0;
    if (result === 'captured' && battleCoinBonusEnabled) {
      coinsEarned = Math.round(boss.captureCoins * battleCoinBonusMultiplier);
      setCoins(prev => prev + coinsEarned);
      setBonusCoins(coinsEarned);
    } else {
      setBonusCoins(0);
    }
    const xpSnapshot = weeklyXp;
    setBattleResult(result);
    // Track wounded boss HP and lock boss until captured
    if (result === 'got-away') {
      setLockedBossName(boss.name);
      if (remainingBossHp != null && remainingBossHp > 0) {
        setWoundedBossHp(prev => ({ ...prev, [boss.name]: remainingBossHp }));
      }
    } else if (result === 'captured') {
      setLockedBossName(null);
      setWoundedBossHp(prev => { const next = { ...prev }; delete next[boss.name]; return next; });
    }
    setWeeklyXp(0);
    setManagedChores(prev => prev.map(c => ({ ...c, weeklyCompletions: 0, status: 'active' as const, rejectionNote: undefined })));
    setShards(prev => Math.max(0, prev - shardsUsed));

    if (result === 'captured') {
      let pct: number;
      if (completionPctOverride !== undefined) {
        pct = completionPctOverride;
      } else {
        const totalTarget = managedChores.reduce((sum, c) => sum + frequencyToWeeklyTarget(c.frequency), 0) || 1;
        const totalDone   = managedChores.reduce((sum, c) => sum + (c.weeklyCompletions ?? 0), 0);
        pct = Math.min(100, Math.round((totalDone / totalTarget) * 100));
      }
      setChorePctAtBattle(pct);
      const t = tierFromPct(pct);
      setChestTier(t);
      setChestCollectible(pickForTier(t));

      const now = new Date();
      const weekStart = new Date(now); weekStart.setDate(now.getDate() - now.getDay());
      const weekEnd   = new Date(weekStart); weekEnd.setDate(weekStart.getDate() + 6);
      const fmt = (d: Date) => d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
      checkMilestone('first-boss');

      saveBossCapture({
        id:            `${Date.now()}-${boss.name}`,
        bossName:      boss.name,
        capturedAt:    now.toISOString(),
        weekLabel:     `${fmt(weekStart)} – ${fmt(weekEnd)}`,
        weakness:      boss.weakness,
        threat:        boss.threat,
        completionPct: pct,
        coinsEarned,
        xpEarned:      xpSnapshot,
      }).catch(() => {});

      setScreen('chestReveal');
    } else {
      setScreen('result');
    }
  }, [monsterIdx, battleCoinBonusEnabled, battleCoinBonusMultiplier, managedChores, weeklyXp]);

  const startBattle = useCallback(() => { setScreen('boss-intro'); }, []);

  const navTab = useCallback((t: Tab) => { setTab(t); setScreen(t); }, []);
  const showTabBar = ['home', 'world', 'wallet'].includes(screen);

  const handleEvolveDone = useCallback(() => {
    setMonsterIdx(prev => (prev + 1) as MonsterIdx);
    setXp(0);
    setDone({});
    setTab('home');
    setScreen('home');
  }, []);

  // Parent navigation — always track where we came from so back buttons work correctly
  const navParent = (s: ParentScreen) => {
    setPrevParentScreen(parentScreen);
    setParentScreen(s);
  };
  const navParentTab = (t: ParentTab) => {
    setParentTab(t);
    // Tab bar taps are root navigations — there's no "back" from here
    setPrevParentScreen('parentHome');
    if (t === 'home')     setParentScreen('parentHome');
    if (t === 'chores')   setParentScreen('chores');
    if (t === 'money')    setParentScreen('rewards');
    if (t === 'settings') setParentScreen('settings');
  };
  const goBack = () => setParentScreen(prevParentScreen);
  const openEditChore = (chore: ManagedChore) => {
    setPrevParentScreen(parentScreen);
    setEditingChore(chore);
    setParentScreen('editChore');
  };
  const saveChore = (chore: ManagedChore) => {
    setManagedChores(prev => {
      const exists = prev.find(c => c.id === chore.id);
      return exists ? prev.map(c => c.id === chore.id ? chore : c) : [...prev, chore];
    });
    setParentScreen('chores');
  };
  const deleteChore = (id: string) => { setManagedChores(prev => prev.filter(c => c.id !== id)); setParentScreen('chores'); };

  const addGoal = useCallback((data: GoalData) => {
    const goal: SavedGoal = {
      id: Date.now().toString(),
      name: data.name,
      amount: data.amount,
      category: data.category,
      color: data.color,
      icon: data.icon,
      savedCents: coins,   // credit whatever the kid has already earned
      milestones: ['Keep it up!', 'Halfway there!', 'Almost done!', 'Goal unlocked!'],
      activityFeed: [],
    };
    setGoals(prev => [...prev, goal]);
  }, [coins]);

  const editGoal = useCallback((updated: SavedGoal) => {
    setGoals(prev => prev.map(g => g.id === updated.id ? updated : g));
  }, []);

  const deleteGoal = useCallback((id: string) => {
    setGoals(prev => prev.filter(g => g.id !== id));
  }, []);

  // Avatar index for the currently active kid (0 = fallback)
  const currentKidAvatarIdx = setupChildren.find(c => c.name === currentKidName)?.avatarIdx ?? 0;

  // Switch the active kid — shows KidWelcome the first time, otherwise goes straight to kid view
  const switchToKid = (name: string) => {
    setCurrentKidName(name);
    setKidWelcomeName(name);
    if (!kidOnboardingDone[name]) {
      setAppMode('kidWelcome');
    } else {
      setViewMode('kid');
    }
  };

  if (appMode === 'splash') {
    return (
      <SafeAreaProvider>
        <SplashScreen onDone={() => setAppMode('onboarding')} />
      </SafeAreaProvider>
    );
  }

  if (appMode === 'onboarding') {
    return (
      <SafeAreaProvider>
        <SafeAreaView style={{ flex: 1, backgroundColor: 'transparent' }}>
          <StatusBar barStyle="dark-content" />
          <OnboardingFlow
            onReady={() => setAppMode('landing')}
          />
        </SafeAreaView>
      </SafeAreaProvider>
    );
  }

  if (appMode === 'landing') {
    return (
      <SafeAreaProvider>
        <SafeAreaView style={{ flex: 1, backgroundColor: '#C5F215' }}>
          <StatusBar barStyle="dark-content" backgroundColor="#C5F215" />
          <LandingScreen
            onLogin={() => setAppMode('app')}
            onCreateAccount={() => setAppMode('signup')}
          />
        </SafeAreaView>
      </SafeAreaProvider>
    );
  }

  if (appMode === 'login') {
    return (
      <SafeAreaProvider>
        <SafeAreaView style={{ flex: 1, backgroundColor: 'transparent' }}>
          <StatusBar barStyle="dark-content" />
          <LoginScreen
            onBack={() => setAppMode('onboarding')}
            onSuccess={() => setAppMode('app')}
            onSignUp={() => setAppMode('signup')}
          />
        </SafeAreaView>
      </SafeAreaProvider>
    );
  }

  if (appMode === 'signup') {
    return (
      <SafeAreaProvider>
        <SafeAreaView style={{ flex: 1, backgroundColor: '#C5F215' }}>
          <StatusBar barStyle="dark-content" backgroundColor="#C5F215" />
          <SignupScreen
            onBack={() => setAppMode('landing')}
            onSuccess={(user) => { setSessionUser(user); setAppMode('parentOnboarding'); }}
            onLogin={() => setAppMode('landing')}
          />
        </SafeAreaView>
      </SafeAreaProvider>
    );
  }

  if (appMode === 'parentOnboarding') {
    return (
      <SafeAreaProvider>
        <StatusBar barStyle="dark-content" />
        <ParentOnboarding
          onComplete={(setup) => {
            const names = setup.children.map(c => c.name.trim()).filter(Boolean);
            setSetupChildren(setup.children);
            setKids(names);
            setKidApprovalSettings(Object.fromEntries(names.map(k => [k, true])));
            if (names.length > 0) setCurrentKidName(names[0]);
            setViewMode('parent');
            setAppMode('app');
          }}
        />
      </SafeAreaProvider>
    );
  }

  if (appMode === 'kidWelcome') {
    return (
      <SafeAreaProvider>
        <Pressable style={{ flex: 1 }} onLongPress={openDebug} delayLongPress={600}>
          <KidWelcome
            dbg={kwDbg}
            childName={kidWelcomeName}
            onComplete={(monsterId, monsterName) => {
              if (monsterId === 'slime' || monsterId === 'robot' || monsterId === 'flamer') {
                setSelectedMonsterId(monsterId);
              }
              setSelectedMonsterName(monsterName);
              setKidOnboardingDone(prev => ({ ...prev, [currentKidName]: true }));
              setViewMode('kid');
              setAppMode('app');
            }}
          />
        </Pressable>
        {debugOpen && renderDebugPanel()}
      </SafeAreaProvider>
    );
  }

  if (appMode === 'kidProfile') {
    return (
      <SafeAreaProvider>
        <StatusBar barStyle="dark-content" />
        <KidProfileCreation
          onComplete={() => setAppMode('app')}
          onSkip={() => setAppMode('app')}
        />
      </SafeAreaProvider>
    );
  }

  // ── Derive per-monster assets from the user's KidWelcome selection ──────────
  const monsterImages  = MONSTER_IMAGES_BY_KIND[selectedMonsterId];
  const platformImg    = PLATFORM_BY_KIND[selectedMonsterId];
  const platformAspect = PLATFORM_ASPECT_BY_KIND[selectedMonsterId];
  const currentMonsterImg = monsterImages[monsterIdx];
  const nextMonsterImg    = monsterImages[Math.min(monsterIdx + 1, 7) as MonsterIdx];

  return (
    <SafeAreaProvider>
    <SafeAreaView edges={['top']} style={[s.root, (screen === 'home' || screen === 'world' || viewMode === 'parent') && { backgroundColor: viewMode === 'parent' ? '#FFFFFF' : '#C5F215' }, (viewMode === 'kid' && screen === 'wallet') && { backgroundColor: C.bg }]}>
      <StatusBar barStyle="dark-content" backgroundColor={viewMode === 'parent' ? '#FFFFFF' : (screen === 'home' || screen === 'world' ? '#C5F215' : viewMode === 'kid' && screen === 'wallet' ? C.bg : C.surface)} />
      <View style={{ flex: 1, backgroundColor: 'transparent' }}>
        {viewMode === 'kid' ? (
          <>
            {screen === 'home'     && <HomeScreen   key={currentKidName} initialAvatarIdx={currentKidAvatarIdx} monsterIdx={monsterIdx} monsterName={effectiveMonsterName} xp={xp} coins={coins} managedChores={managedChores} onCompleteManaged={submitManagedChore} currentKidName={currentKidName} onSwitchToParent={() => setViewMode('parent')} onOpenDebug={openDebug} dbgMonsterSize={dbgMonsterSize} dbgMonsterY={dbgMonsterY} dbgPlatformSize={dbgPlatformSize} dbgPlatformY={dbgPlatformY} monsterImg={currentMonsterImg} platformImg={platformImg} platformAspect={platformAspect} baseRate={baseRate} requireApproval={requireApproval} onNavigateToWallet={() => { setTab('wallet'); setScreen('wallet'); }} onRenameMonster={setSelectedMonsterName} kidProfiles={setupChildren.map(c => ({ name: c.name, avatarColor: c.avatarColor, avatarIdx: c.avatarIdx }))} onSwitchToKid={switchToKid} />}
            {screen === 'world'      && <WorldScreen key={currentKidName} initialAvatarIdx={currentKidAvatarIdx} monsterIdx={monsterIdx} coins={coins} done={done} xp={xp} weeklyXp={weeklyXp} managedChores={managedChores} onStartBattle={startBattle} onSwitchToParent={() => setViewMode('parent')} onNavigateToWallet={() => { setTab('wallet'); setScreen('wallet'); }} monsterName={effectiveMonsterName} currentKidName={currentKidName} kidProfiles={setupChildren.map(c => ({ name: c.name, avatarColor: c.avatarColor, avatarIdx: c.avatarIdx }))} onSwitchToKid={switchToKid} currentBoss={resolveCurrentBoss(monsterIdx, lockedBossName)} debugDayOffset={debugDayOffset} weekApprovalDays={weekApprovalDays} />}
            <Modal visible={screen === 'boss-intro'} animationType="fade" statusBarTranslucent transparent={false}>
              <BossIntroScreen monsterIdx={monsterIdx} onReady={() => setScreen('arena')} bossOverride={resolveCurrentBoss(monsterIdx, lockedBossName)} />
            </Modal>
            {screen === 'arena'      && (() => {
              if (dbgBattleActive) {
                const totalPower = calcPowerRating(dbgCompletionPct, monsterIdx, dbgWeaknessUnlocked ? 5 : 0);
                return <BattleArenaScreen
                  monsterIdx={monsterIdx} monsterImg={currentMonsterImg} monsterName={effectiveMonsterName} monsterId={selectedMonsterId}
                  totalPower={totalPower} completionPct={dbgCompletionPct} shards={dbgShards} weaknessUnlocked={dbgWeaknessUnlocked}
                  guaranteedWin={dbgCompletionPct >= 100} onBattleEnd={(r, u, remainingHp) => { setDbgBattleActive(false); handleBattleEnd(r, u, dbgCompletionPct, BOSSES[dbgBossIdx], remainingHp); }}
                  bossOverride={BOSSES[dbgBossIdx]}
                  initialBossHp={woundedBossHp[BOSSES[dbgBossIdx].name]}
                />;
              }
              const totalWeeklyTarget = managedChores.reduce((sum, c) => sum + frequencyToWeeklyTarget(c.frequency), 0) || 1;
              const totalWeeklyDone   = managedChores.reduce((sum, c) => sum + (c.weeklyCompletions ?? 0), 0);
              const completionPct = Math.min(100, Math.round((totalWeeklyDone / totalWeeklyTarget) * 100));
              const totalPower = calcPowerRating(completionPct, monsterIdx, currentStreak);
              const weeklyShards = calcWeeklyShards(completionPct);
              const battleShards = Math.min(SHARD_CAP, shards + weeklyShards);
              const weaknessUnlocked = completionPct >= 50 && currentStreak >= 5;
              const guaranteedWin = completionPct >= 100;
              const currentBoss = resolveCurrentBoss(monsterIdx, lockedBossName);
              return <BattleArenaScreen
                monsterIdx={monsterIdx} monsterImg={currentMonsterImg} monsterName={effectiveMonsterName} monsterId={selectedMonsterId}
                totalPower={totalPower} completionPct={completionPct} shards={battleShards} weaknessUnlocked={weaknessUnlocked}
                guaranteedWin={guaranteedWin} onBattleEnd={(r, u, remainingHp) => handleBattleEnd(r, u, undefined, undefined, remainingHp)}
                bossOverride={currentBoss}
                initialBossHp={woundedBossHp[currentBoss.name]}
              />;
            })()}
            {screen === 'result'   && <ResultScreen monsterIdx={monsterIdx} captured={battleResult === 'captured'} bonusCoins={bonusCoins} onDone={() => { setTab('home'); setScreen('home'); }} monsterImg={currentMonsterImg} bossName={resolveCurrentBoss(monsterIdx, lockedBossName).name} />}
            {screen === 'chestReveal' && (
              <ChestReveal
                tier={chestTier}
                completionPct={chorePctAtBattle}
                collectible={chestCollectible}
                weekLabel={new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                onDone={() => { setTrophyOrigin('home'); setScreen('trophyRoom'); }}
              />
            )}
            {screen === 'trophyRoom' && (
              <TrophyRoom
                monsterIdx={monsterIdx}
                monsterImg={currentMonsterImg}
                monsterName={effectiveMonsterName}
                xp={xp}
                initialRelicKey={trophyInitialKey}
                onBack={() => { setTrophyInitialKey(undefined); setTab(trophyOrigin); setScreen(trophyOrigin); }}
              />
            )}
            {screen === 'wallet'   && <WalletScreen key={currentKidName} initialAvatarIdx={currentKidAvatarIdx} coins={coins} done={done} battleResult={battleResult} monsterIdx={monsterIdx} baseRate={baseRate} goals={goals} onAddGoal={addGoal} onOpenGoalFlow={() => setScreen('goalFlow')} currentStreak={currentStreak} onEditGoal={editGoal} onDeleteGoal={deleteGoal} monsterName={effectiveMonsterName} weeklyXp={weeklyXp} onSwitchToParent={() => setViewMode('parent')} managedChores={managedChores} currentKidName={currentKidName} kidProfiles={setupChildren.map(c => ({ name: c.name, avatarColor: c.avatarColor, avatarIdx: c.avatarIdx }))} onSwitchToKid={switchToKid} onOpenTrophyRoom={() => { setTrophyInitialKey(undefined); setTrophyOrigin('wallet'); setScreen('trophyRoom'); }}
                onOpenRelicDetail={(key) => { setTrophyInitialKey(key); setTrophyOrigin('wallet'); setScreen('trophyRoom'); }} />}
            {screen === 'goalFlow' && <GoalCreationFlow onDone={() => setScreen('home')} onCancel={() => setScreen('home')} onGoalCreated={addGoal} monsterName={effectiveMonsterName} />}
            {screen === 'kidPayout' && payoutSnapshot && <KidPayoutScreen amount={payoutSnapshot.amount} completedCount={payoutSnapshot.completedCount} battleWon={payoutSnapshot.battleWon} battleBonus={payoutSnapshot.battleBonus} monsterImg={currentMonsterImg} monsterName={effectiveMonsterName} onDismiss={() => { setPayoutSnapshot(null); setScreen('home'); setTab('home'); }} />}
            {showTabBar && <TabBar active={tab} onNav={navTab} />}
            {activeToast && (
              <MilestoneToast
                milestone={activeToast}
                onDismiss={() => setActiveToast(null)}
                onView={() => {
                  setActiveToast(null);
                  setTrophyInitialKey(undefined);
                  setTrophyOrigin(tab);
                  setScreen('trophyRoom');
                }}
              />
            )}
          </>
        ) : (
          <>
            {parentScreen === 'parentHome' && <ParentHomeScreen onNav={navParent} onSwitchToKid={() => setViewMode('kid')} onAddKid={() => openKidModal(null)} onEditKid={k => { const full = setupChildren.find(c => c.name === k.name); if (full) openKidModal(full); }} managedChores={managedChores} onApprove={approveManagedChore} onReject={rejectManagedChore} baseRate={baseRate} onPayKid={openPayout} kidName={currentKidName} coins={coins} kidProfiles={setupChildren.map(c => ({ name: c.name, avatarColor: c.avatarColor, avatarIdx: c.avatarIdx }))} />}
            {parentScreen === 'parentPayout' && payoutSnapshot && <ParentPayoutScreen kidName={currentKidName} coins={payoutSnapshot.amount} baseCoins={payoutSnapshot.amount - (payoutSnapshot.battleBonus ?? 0)} battleBonus={payoutSnapshot.battleBonus} battleWon={payoutSnapshot.battleWon} completedChores={managedChores.filter(c => c.status === 'approved')} onConfirm={confirmPayout} onBack={goBack} />}
            {(parentScreen === 'chores' || parentScreen === 'addChore' || parentScreen === 'editChore') && <ParentChoresScreen chores={managedChores} onBack={goBack} showBack={prevParentScreen === 'settings'} onAdd={() => { setPrevParentScreen(parentScreen); setEditingChore(null); setParentScreen('addChore'); }} onEdit={openEditChore} baseRate={baseRate} />}
            {parentScreen === 'payRates'  && <PayRatesScreen onBack={goBack} onRateGuide={() => { setPrevParentScreen('payRates'); setParentScreen('rateGuide'); }} baseRate={baseRate} setBaseRate={setBaseRate} weeklyCapEnabled={weeklyCapEnabled} setWeeklyCap={setWeeklyCap} battleCoinBonusEnabled={battleCoinBonusEnabled} setBattleCoinBonusEnabled={setBattleCoinBonusEnabled} battleCoinBonusMultiplier={battleCoinBonusMultiplier} setBattleCoinBonusMultiplier={setBattleCoinBonusMultiplier} />}
            {parentScreen === 'rateGuide' && <RateGuideScreen onBack={goBack} />}
            {parentScreen === 'rewards'   && <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}><Text>Rewards coming soon</Text></View>}
            {parentScreen === 'settings'  && <ParentSettingsScreen onNav={navParent} baseRate={baseRate} onAddKid={() => openKidModal(null)} onEditKid={k => { const full = setupChildren.find(c => c.name === k.name); if (full) openKidModal(full); }} kids={kids} kidApprovalSettings={kidApprovalSettings} setKidApprovalSettings={setKidApprovalSettings} kidProfiles={setupChildren.map(c => ({ name: c.name, avatarColor: c.avatarColor, avatarIdx: c.avatarIdx }))} />}
            {parentScreen !== 'parentPayout' && (
              <ParentTabBar active={parentTab} onNav={navParentTab} />
            )}
            {/* Add / Edit chore — slides up as a bottom sheet */}
            <Modal
              visible={parentScreen === 'addChore' || parentScreen === 'editChore'}
              animationType="slide"
              presentationStyle="pageSheet"
              onRequestClose={goBack}
            >
              <SafeAreaProvider>
                <StatusBar barStyle="dark-content" />
                <AddEditChoreScreen
                  existing={editingChore}
                  onBack={goBack}
                  onSave={saveChore}
                  onDelete={editingChore ? () => deleteChore(editingChore.id) : undefined}
                  kids={kids}
                  baseRate={baseRate}
                />
              </SafeAreaProvider>
            </Modal>
          </>
        )}
        <EvolutionAnimation
          monsterBefore={currentMonsterImg}
          monsterAfter={nextMonsterImg}
          onComplete={handleEvolveDone}
          visible={screen === 'evolve'}
        />
      </View>
    </SafeAreaView>

    {/* Kid profile creation — triggered from parent dashboard */}
    <Modal visible={showKidProfile} animationType="slide" presentationStyle="fullScreen">
      <SafeAreaProvider>
        <StatusBar barStyle="dark-content" />
        <KidProfileCreation
          onComplete={() => setShowKidProfile(false)}
          onSkip={() => setShowKidProfile(false)}
        />
      </SafeAreaProvider>
    </Modal>

    {/* Add / Edit kid modal */}
    <AddEditKidModal
      visible={kidModalVisible}
      initial={kidModalInitial}
      onClose={() => setKidModalVisible(false)}
      onSave={handleKidModalSave}
    />
    {parentToast && <Toast key={parentToast + Date.now()} message={parentToast} />}

    {/* Global debug overlay */}
    {debugOpen && renderDebugPanel()}

    </SafeAreaProvider>
  );

  // ── renderDebugPanel ──────────────────────────────────────────────────────
  function renderDebugPanel() {
    if (!__DEV__) return null;
    const monster = MONSTERS[monsterIdx];
    const need    = monster.needed;

    async function copyValues() {
      const lines = [
        '// KidWelcome layout',
        ...Object.entries(kwDbg).map(([k, v]) => `  ${k}: ${v},`),
        '',
        '// HomeScreen layout',
        `  dbgMonsterSize:  ${dbgMonsterSize},`,
        `  dbgPlatformSize: ${dbgPlatformSize},`,
        `  dbgMonsterY:     ${dbgMonsterY},`,
        `  dbgPlatformY:    ${dbgPlatformY},`,
      ];
      await Clipboard.setStringAsync(lines.join('\n'));
    }

    const kwControls: { key: keyof KwDebugValues; label: string; steps: number[]; min: number; max: number }[] = [
      { key: 'headingTop',    label: 'HEADING TOP',    steps: [-5,-1,1,5],   min: 0,   max: 200 },
      { key: 'subtitleTop',   label: 'SUBTITLE TOP',   steps: [-5,-1,1,5],   min: 0,   max: 200 },
      { key: 'shadowX',       label: 'SHADOW X',       steps: [-2,-1,1,2],   min: -20, max: 20  },
      { key: 'shadowY',       label: 'SHADOW Y',       steps: [-2,-1,1,2],   min: -20, max: 20  },
      { key: 'monsterSize',   label: 'MONSTER SIZE',   steps: [-20,-5,5,20], min: 80,   max: 500  },
      { key: 'monsterX',     label: 'MONSTER X',      steps: [-20,-5,5,20], min: -300, max: 300  },
      { key: 'monsterY',     label: 'MONSTER Y',      steps: [-20,-5,5,20], min: -300, max: 300  },
      { key: 'platformSize', label: 'PLATFORM SIZE',  steps: [-20,-5,5,20], min: 80,   max: 500  },
      { key: 'platformX',    label: 'PLATFORM X',     steps: [-20,-5,5,20], min: -300, max: 300  },
      { key: 'platformY',    label: 'PLATFORM Y',     steps: [-20,-5,5,20], min: -300, max: 300  },
      { key: 'overlapPct',    label: 'OVERLAP %',      steps: [-5,-1,1,5],   min: 0,   max: 80  },
      { key: 'cardImgH',      label: 'CARD IMG H',     steps: [-10,-2,2,10], min: 40,  max: 300 },
      { key: 'splashImgRatio',label: 'SPLASH IMG %',   steps: [-5,-1,1,5],   min: 20,  max: 120 },
      { key: 'splashImgW',    label: 'SPLASH IMG W',   steps: [-20,-5,5,20], min: 100, max: 600 },
      { key: 'splashImgX',    label: 'SPLASH IMG X',   steps: [-20,-5,5,20], min: -300, max: 300 },
      { key: 'splashImgY',    label: 'SPLASH IMG Y',   steps: [-20,-5,5,20], min: -300, max: 300 },
    ];

    return (
      <TouchableOpacity style={s.debugScrim} activeOpacity={1} onPress={() => setDebugOpen(false)}>
        <View onStartShouldSetResponder={() => true}>
          <View style={s.debugPanel}>
            {/* Header row */}
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <Text style={[s.debugTitle, { flex: 1 }]}>🐛 Debug</Text>
              <TouchableOpacity
                onPress={() => setDebugMinimized(m => !m)}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              >
                <Text style={{ fontSize: scale(18), color: '#888' }}>
                  {debugMinimized ? '▴' : '▾'}
                </Text>
              </TouchableOpacity>
            </View>

            {!debugMinimized && <>
            {/* Tabs */}
            <View style={s.debugTabs}>
              {(['xp', 'layout', 'kw', 'nav', 'battle', 'days'] as const).map(t => (
                <TouchableOpacity key={t} style={[s.debugTab, debugTab === t && s.debugTabActive]} onPress={() => setDebugTab(t)}>
                  <Text style={[s.debugTabText, debugTab === t && s.debugTabTextActive]}>
                    {t === 'xp' ? 'XP' : t === 'layout' ? 'Layout' : t === 'kw' ? 'KW' : t === 'nav' ? 'Nav' : t === 'battle' ? '⚔' : '📅'}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <ScrollView style={{ maxHeight: 400 }} showsVerticalScrollIndicator={false} nestedScrollEnabled>
              {debugTab === 'xp' ? (
                <View style={{ gap: 12 }}>
                  <Text style={s.debugSub}>Monster {monsterIdx + 1}/8 · {monster.name} · {xp}/{need} XP</Text>
                  <Text style={s.debugSectionLabel}>JUMP TO EVOLUTION</Text>
                  <View style={s.debugGrid}>
                    {(MONSTERS as Monster[]).map((m, i) => (
                      <TouchableOpacity
                        key={i}
                        style={[s.debugChip, monsterIdx === i && s.debugChipActive]}
                        onPress={() => { setMonsterIdx(i as MonsterIdx); setXp(0); setDone({}); setDebugOpen(false); }}
                      >
                        <Text style={[s.debugChipText, monsterIdx === i && s.debugChipTextActive]}>
                          {i + 1} · {m.name}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                  <Text style={s.debugSectionLabel}>TWEAK XP</Text>
                  <View style={s.debugRow}>
                    {[1, 5, 10, 50].map(n => (
                      <TouchableOpacity key={`m${n}`} style={s.debugXpBtn} onPress={() => setXp(v => Math.max(0, v - n))}>
                        <Text style={s.debugXpBtnTxt}>−{n}</Text>
                      </TouchableOpacity>
                    ))}
                    {[1, 5, 10, 50].map(n => (
                      <TouchableOpacity key={`p${n}`} style={[s.debugXpBtn, s.debugXpBtnGreen]} onPress={() => setXp(v => v + n)}>
                        <Text style={s.debugXpBtnTxt}>+{n}</Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                  <TouchableOpacity style={s.debugMaxBtn} onPress={() => { setXp(need); setDebugOpen(false); }}>
                    <Text style={s.debugMaxTxt}>⚡ Trigger next evolution ({need - xp} XP needed)</Text>
                  </TouchableOpacity>
                </View>

              ) : debugTab === 'layout' ? (
                <View style={{ gap: 12 }}>
                  {([
                    { label: 'MONSTER SIZE', value: dbgMonsterSize, set: setDbgMonsterSize, steps: [-20,-5,5,20], min: 50 },
                    { label: 'MONSTER Y',    value: dbgMonsterY,    set: setDbgMonsterY,    steps: [-10,-2,2,10], min: -500 },
                    { label: 'PLATFORM SIZE', value: dbgPlatformSize, set: setDbgPlatformSize, steps: [-20,-5,5,20], min: 20 },
                    { label: 'PLATFORM Y', value: dbgPlatformY, set: setDbgPlatformY, steps: [-10,-2,2,10], min: -500 },
                  ] as { label: string; value: number; set: React.Dispatch<React.SetStateAction<number>>; steps: number[]; min: number }[]).map(({ label, value, set, steps, min }) => (
                    <View key={label}>
                      <Text style={s.debugSectionLabel}>{label}  <Text style={{ color: '#C5F215' }}>{value}px</Text></Text>
                      <View style={s.debugRow}>
                        {steps.map(n => (
                          <TouchableOpacity key={n} style={[s.debugXpBtn, n > 0 && s.debugXpBtnGreen]} onPress={() => set((v: number) => Math.max(min, v + n))}>
                            <Text style={s.debugXpBtnTxt}>{n > 0 ? `+${n}` : n}</Text>
                          </TouchableOpacity>
                        ))}
                      </View>
                    </View>
                  ))}
                </View>

              ) : debugTab === 'kw' ? (
                <View style={{ gap: 12 }}>
                  <Text style={s.debugSub}>Kid Welcome layout</Text>
                  {kwControls.map(({ key, label, steps, min, max }) => (
                    <View key={key}>
                      <Text style={s.debugSectionLabel}>{label}  <Text style={{ color: '#C5F215' }}>{kwDbg[key]}</Text></Text>
                      <View style={s.debugRow}>
                        {steps.map(n => (
                          <TouchableOpacity
                            key={n}
                            style={[s.debugXpBtn, n > 0 && s.debugXpBtnGreen]}
                            onPress={() => setKwDbg(prev => ({ ...prev, [key]: Math.max(min, Math.min(max, prev[key] + n)) }))}
                          >
                            <Text style={s.debugXpBtnTxt}>{n > 0 ? `+${n}` : n}</Text>
                          </TouchableOpacity>
                        ))}
                      </View>
                    </View>
                  ))}
                  <TouchableOpacity style={s.debugCloseBtn} onPress={() => setKwDbg(KW_DEBUG_DEFAULTS)}>
                    <Text style={s.debugCloseTxt}>↩ Reset KW defaults</Text>
                  </TouchableOpacity>
                </View>

              ) : debugTab === 'nav' ? (
                <View style={{ gap: 10 }}>
                  <Text style={s.debugSectionLabel}>GO TO SCREEN</Text>
                  {([
                    { label: '👋  Onboarding',       mode: 'onboarding'       },
                    { label: '🔑  Login',             mode: 'login'            },
                    { label: '📝  Sign Up',           mode: 'signup'           },
                    { label: '👨‍👩‍👧  Parent Setup',      mode: 'parentOnboarding' },
                    { label: '🧒  Kid Profile Setup', mode: 'kidProfile'       },
                    { label: '👾  Kid Welcome',       mode: 'kidWelcome'       },
                  ] as { label: string; mode: AppMode }[]).map(({ label, mode }) => (
                    <TouchableOpacity
                      key={mode}
                      style={s.debugResetBtn}
                      onPress={() => {
                        if (mode === 'kidWelcome') setKidWelcomeName('Henry');
                        setAppMode(mode);
                        setDebugOpen(false);
                      }}
                      activeOpacity={0.8}
                    >
                      <Text style={s.debugResetTxt}>{label}</Text>
                    </TouchableOpacity>
                  ))}
                  <TouchableOpacity
                    style={s.debugResetBtn}
                    onPress={() => {
                      setChorePctAtBattle(dbgCompletionPct);
                      const dt = tierFromPct(dbgCompletionPct);
                      setChestTier(dt);
                      setChestCollectible(pickForTier(dt));
                      setScreen('chestReveal');
                      setDebugOpen(false);
                    }}
                    activeOpacity={0.8}
                  >
                    <Text style={s.debugResetTxt}>🎁  Win Reveal (chest) — {dbgCompletionPct}% → {tierFromPct(dbgCompletionPct)}</Text>
                  </TouchableOpacity>
                </View>

              ) : debugTab === 'battle' ? (
                /* ── Battle Simulator ── */
                <View style={{ gap: 14 }}>
                  <Text style={s.debugSectionLabel}>PICK BOSS</Text>
                  <View style={s.debugGrid}>
                    {BOSSES.map((b, i) => {
                      const jar = getBossDisplay(b.name)?.jar;
                      return (
                        <TouchableOpacity
                          key={i}
                          style={[s.debugChip, dbgBossIdx === i && s.debugChipActive, { flexDirection: 'row', alignItems: 'center', gap: 6 }]}
                          onPress={() => setDbgBossIdx(i)}
                        >
                          {jar && <Image source={jar} style={{ width: scale(22), height: scale(22) }} resizeMode="contain" />}
                          <Text style={[s.debugChipText, dbgBossIdx === i && s.debugChipTextActive]}>
                            {b.name}
                          </Text>
                        </TouchableOpacity>
                      );
                    })}
                  </View>

                  <Text style={s.debugSectionLabel}>COMPLETION %  <Text style={{ color: '#C5F215' }}>{dbgCompletionPct}%</Text></Text>
                  <View style={s.debugRow}>
                    {[0, 40, 60, 80, 100].map(v => (
                      <TouchableOpacity key={v} style={[s.debugChip, dbgCompletionPct === v && s.debugChipActive]} onPress={() => setDbgCompletionPct(v)}>
                        <Text style={[s.debugChipText, dbgCompletionPct === v && s.debugChipTextActive]}>{v}%</Text>
                      </TouchableOpacity>
                    ))}
                  </View>

                  <Text style={s.debugSectionLabel}>SHARDS  <Text style={{ color: '#C5F215' }}>{dbgShards}</Text></Text>
                  <View style={s.debugRow}>
                    {[0, 1, 2, 4, 6, 8].map(v => (
                      <TouchableOpacity key={v} style={[s.debugChip, dbgShards === v && s.debugChipActive]} onPress={() => setDbgShards(v)}>
                        <Text style={[s.debugChipText, dbgShards === v && s.debugChipTextActive]}>{v}</Text>
                      </TouchableOpacity>
                    ))}
                  </View>

                  <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                    <Text style={s.debugSectionLabel}>WEAKNESS UNLOCKED</Text>
                    <Switch value={dbgWeaknessUnlocked} onValueChange={setDbgWeaknessUnlocked} trackColor={{ true: '#6B35F0' }} />
                  </View>

                  {/* Computed preview */}
                  <View style={{ backgroundColor: '#1A1A1A', borderRadius: 10, padding: 10, gap: 4 }}>
                    <Text style={{ color: '#C5F215', fontSize: scale(11), fontFamily: 'Inter_700Bold' }}>
                      Power: {calcPowerRating(dbgCompletionPct, monsterIdx, dbgWeaknessUnlocked ? 5 : 0)}  ·  Boss HP: {BOSSES[dbgBossIdx].hp}  ·  Monster HP: {Math.round(50 + calcPowerRating(dbgCompletionPct, monsterIdx, 0) * 0.5)}
                    </Text>
                    <Text style={{ color: '#ABABAB', fontSize: scale(11) }}>
                      Guaranteed win: {dbgCompletionPct >= 100 ? 'YES ✅' : 'no'}
                    </Text>
                  </View>

                  <TouchableOpacity
                    style={[s.debugMaxBtn, { backgroundColor: '#6B35F0' }]}
                    onPress={() => {
                      setDbgBattleActive(true);
                      setScreen('arena');
                      setDebugOpen(false);
                    }}
                  >
                    <Text style={[s.debugMaxTxt, { color: '#fff' }]}>
                      ⚔ Launch debug battle — {BOSSES[dbgBossIdx].name}
                    </Text>
                  </TouchableOpacity>
                </View>

              ) : debugTab === 'days' ? (
                /* ── Day Simulator ── */
                (() => {
                  const simDay     = getSimulatedToday(debugDayOffset);
                  const simDate    = new Date(Date.now() + debugDayOffset * 86_400_000);
                  const dayNames   = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];
                  const dayName    = dayNames[simDate.getDay()];
                  const willReset  = managedChores.filter(c => {
                    const target = frequencyToWeeklyTarget(c.frequency);
                    return (c.weeklyCompletions ?? 0) < target && (c.status === 'approved' || c.status === 'rejected');
                  });
                  return (
                    <View style={{ gap: 12 }}>
                      {/* Current simulated date */}
                      <View style={{ backgroundColor: '#1A1A1A', borderRadius: 10, padding: 12, alignItems: 'center' }}>
                        <Text style={{ color: '#ABABAB', fontSize: scale(10), fontFamily: 'Inter_700Bold', letterSpacing: 1 }}>SIMULATED DATE</Text>
                        <Text style={{ color: '#C5F215', fontSize: scale(18), fontFamily: 'Inter_900Black', marginTop: 4 }}>{dayName} · {simDay}</Text>
                        {debugDayOffset !== 0 && (
                          <Text style={{ color: '#ABABAB', fontSize: scale(11), marginTop: 2 }}>
                            {debugDayOffset > 0 ? `+${debugDayOffset}` : debugDayOffset} day{Math.abs(debugDayOffset) !== 1 ? 's' : ''} from today
                          </Text>
                        )}
                      </View>

                      {/* Day navigation */}
                      <Text style={s.debugSectionLabel}>ADVANCE / REWIND DAY</Text>
                      <View style={[s.debugRow, { justifyContent: 'center', gap: 8 }]}>
                        <TouchableOpacity style={[s.debugXpBtn, { flex: 1 }]} onPress={() => setDebugDayOffset(d => d - 1)}>
                          <Text style={s.debugXpBtnTxt}>◀ −1 day</Text>
                        </TouchableOpacity>
                        <TouchableOpacity style={[s.debugXpBtn, s.debugXpBtnGreen, { flex: 1 }]} onPress={() => setDebugDayOffset(d => d + 1)}>
                          <Text style={s.debugXpBtnTxt}>+1 day ▶</Text>
                        </TouchableOpacity>
                      </View>
                      {debugDayOffset !== 0 && (
                        <TouchableOpacity style={s.debugCloseBtn} onPress={() => setDebugDayOffset(0)}>
                          <Text style={s.debugCloseTxt}>↩ Back to today</Text>
                        </TouchableOpacity>
                      )}

                      {/* Weekly chore progress */}
                      <Text style={s.debugSectionLabel}>WEEKLY CHORE PROGRESS</Text>
                      {managedChores.map(c => {
                        const target = frequencyToWeeklyTarget(c.frequency);
                        const done   = c.weeklyCompletions ?? 0;
                        const pct    = Math.round((done / target) * 100);
                        return (
                          <View key={c.id} style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                            <View style={{ flex: 1 }}>
                              <Text style={{ color: '#FFFFFF', fontSize: scale(11), fontFamily: 'Inter_600SemiBold' }} numberOfLines={1}>{c.name}</Text>
                              <Text style={{ color: '#ABABAB', fontSize: scale(10) }}>{c.frequency} · {done}/{target} · {c.status}</Text>
                            </View>
                            <Text style={{ color: done >= target ? '#C5F215' : '#888', fontSize: scale(12), fontFamily: 'Inter_900Black', minWidth: 36, textAlign: 'right' }}>{pct}%</Text>
                          </View>
                        );
                      })}

                      {/* What will reset on next day advance */}
                      {willReset.length > 0 && (
                        <>
                          <Text style={s.debugSectionLabel}>RESETS NEXT DAY ADVANCE ({willReset.length})</Text>
                          {willReset.map(c => (
                            <Text key={c.id} style={{ color: '#F59E0B', fontSize: scale(11) }}>↺  {c.name} ({c.status})</Text>
                          ))}
                        </>
                      )}
                    </View>
                  );
                })()
              ) : null}
            </ScrollView>

            <TouchableOpacity style={s.debugCopyBtn} onPress={copyValues} activeOpacity={0.8}>
              <Text style={s.debugCopyTxt}>📋  Copy values</Text>
            </TouchableOpacity>

            <TouchableOpacity style={s.debugCloseBtn} onPress={() => setDebugOpen(false)}>
              <Text style={s.debugCloseTxt}>Close</Text>
            </TouchableOpacity>
            </>}
          </View>
        </View>
      </TouchableOpacity>
    );
  }
}

export default function App() {
  const [fontsLoaded] = useFonts({
    FredokaOne_400Regular,
    Inter_300Light,
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
    Inter_700Bold,
    Inter_800ExtraBold,
    Inter_900Black,
    Nunito_400Regular,
    Nunito_600SemiBold,
    Nunito_700Bold,
    Nunito_800ExtraBold,
    Nunito_900Black,
    SpaceMono_400Regular,
    SpaceMono_700Bold,
  });
  if (!fontsLoaded) return null;
  return <AppInner />;
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const SOLID_SHADOW = shadows.solid;

const s = StyleSheet.create({
  root:            { flex: 1, backgroundColor: C.surface },
  header:          { backgroundColor: C.surface, paddingHorizontal: 20, paddingVertical: 14, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderBottomWidth: 0.5, borderBottomColor: C.border },
  wordmark:        { fontSize: scale(17), fontFamily: 'Inter_900Black', color: C.text, letterSpacing: -0.4 },
  coinPill:        { backgroundColor: C.goldLight, borderWidth: 1, borderColor: C.goldBorder, borderRadius: 20, paddingHorizontal: 10, paddingVertical: 4 },
  coinText:        { fontSize: scale(12), fontFamily: 'Inter_700Bold', color: C.gold },
  hero:            { backgroundColor: C.surface, padding: 20, paddingBottom: 16, alignItems: 'center', borderBottomWidth: 0.5, borderBottomColor: C.border },
  lvChip:          { fontSize: scale(10), fontFamily: 'Inter_700Bold', letterSpacing: 1.8, color: C.muted, marginBottom: 4 },
  monsterName:     { fontSize: scale(22), fontFamily: 'Inter_900Black', color: C.text, letterSpacing: -0.5, marginBottom: 14 },
  monsterBubble:   { width: 100, height: 100, backgroundColor: C.bg, borderRadius: 50, alignItems: 'center', justifyContent: 'center', marginBottom: 12 },
  xpRow:           { width: '100%', flexDirection: 'row', justifyContent: 'space-between', marginBottom: 5 },
  xpLabel:         { fontSize: scale(11), fontFamily: 'Inter_700Bold', color: C.hint },
  xpTrack:         { width: '100%', height: 5, backgroundColor: C.border, borderRadius: 5, overflow: 'hidden' },
  xpFill:          { height: '100%', backgroundColor: C.accent, borderRadius: 5 },
  sectionLabel:    { fontSize: scale(10), fontFamily: 'Inter_700Bold', letterSpacing: 1.8, color: C.hint, paddingHorizontal: 20, paddingTop: 14, paddingBottom: 8, backgroundColor: C.bg },
  choreList:       { gap: 6, paddingHorizontal: 12 },
  choreRow:        { backgroundColor: C.surface, borderWidth: 0.5, borderColor: C.border, borderRadius: 14, padding: 11, paddingHorizontal: 13, flexDirection: 'row', alignItems: 'center', gap: 11 },
  choreRowDone:    { backgroundColor: C.bg },
  choreIcon:       { width: 36, height: 36, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  choreInfo:       { flex: 1 },
  choreName:       { fontSize: scale(13), fontFamily: 'Inter_700Bold', color: C.text },
  choreNameDone:   { color: C.hint, textDecorationLine: 'line-through' },
  choreSub:        { fontSize: scale(11), color: C.hint, marginTop: 1 },
  choreGold:       { color: C.gold, fontFamily: 'Inter_700Bold' },
  choreCheck:      { width: 22, height: 22, borderRadius: 11, borderWidth: 1.5, borderColor: '#DDDBD5', alignItems: 'center', justifyContent: 'center' },
  choreCheckDone:  { backgroundColor: C.accent, borderColor: C.accent },
  checkDot:        { width: 7, height: 7, borderRadius: 4, backgroundColor: 'white' },
  tabBar:          { position: 'absolute', bottom: 36, left: 12, right: 12 },
  tabBarInner:     { flexDirection: 'row', backgroundColor: '#fff', borderRadius: 100, borderWidth: 2, borderColor: '#1A1A1A', paddingVertical: 8, paddingHorizontal: 6, justifyContent: 'space-between', alignItems: 'center', ...Platform.select({ ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.12, shadowRadius: 12 }, android: { elevation: 8 } }) },
  tab:             { flex: 1, alignItems: 'center', gap: 3 },
  tabIconWrap:     { width: 98, borderRadius: 32, alignItems: 'center', justifyContent: 'center', paddingVertical: 6, gap: 2 },
  tabIconWrapActive: { backgroundColor: '#EAE4FF' },
  tabIcon:         { width: 44, height: 44 },
  tabLabel:        { fontSize: scale(10), fontFamily: 'Inter_600SemiBold', color: '#ABABAB', letterSpacing: 0.1 },
  tabLabelActive:  { color: '#6B35F0' },
  // home screen
  homeRoot:           { flex: 1, backgroundColor: 'transparent' },
  homeHeader:         { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingTop: 16, paddingBottom: 16 },
  homeHeaderLeft:     { flexDirection: 'row', alignItems: 'center', gap: 10 },
  homeKidView:        { fontSize: scale(18), fontFamily: 'Inter_700Bold', color: '#1A1A1A' },
  homeBalancePill:    { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', borderWidth: 2.5, borderColor: '#1A1A1A', borderRadius: 100, paddingHorizontal: 14, paddingVertical: 8, gap: 6 },
  homeBalanceText:    { fontSize: scale(18), fontFamily: 'Inter_700Bold', color: '#1A1A1A' },
  homeScroll:         { paddingHorizontal: 20, paddingBottom: 120, paddingTop: 10 },
  homeCharCard:       { backgroundColor: '#FFFFFF', borderRadius: 20, borderWidth: 2.5, borderColor: '#1A1A1A', marginBottom: 24, ...SOLID_SHADOW },
  homeCharImage:      { height: 340, alignItems: 'center', justifyContent: 'center', backgroundColor: '#FFFFFF', borderTopLeftRadius: 18, borderTopRightRadius: 18, overflow: 'visible' },
  homeCharInfo:       { padding: 14 },
  homeCharNameRow:    { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  homeCharName:       { fontSize: scale(30), fontFamily: 'Inter_900Black', color: '#1A1A1A' },
  homeCharLevel:      { fontSize: scale(15), fontFamily: 'Inter_800ExtraBold', color: '#6B35F0' },
  homeXpTrack:        { height: 16, backgroundColor: '#E0DCDC', borderRadius: 100, marginBottom: 5, overflow: 'hidden', borderWidth: 2, borderColor: '#1A1A1A' },
  homeXpFill:         { height: '100%', backgroundColor: '#6B35F0', borderRadius: 100 },
  homeXpText:         { fontSize: scale(13), fontFamily: 'Inter_500Medium', color: '#1A1A1A' },
  homeXpPopLayer:     { position: 'absolute', bottom: 200, left: 0, right: 0, alignItems: 'center', pointerEvents: 'none' } as any,
  homeXpPopPill:      { backgroundColor: '#FFFFFF', borderWidth: 3, borderColor: '#2D006E', borderRadius: 100, paddingHorizontal: 14, paddingVertical: 5 },
  homeXpPop:          { fontSize: scale(18), fontFamily: 'Inter_900Black', color: '#2D006E', letterSpacing: 0.2 },
  homeCoinPopPill:    { backgroundColor: '#FFFFFF', borderWidth: 3, borderColor: '#1A6600', borderRadius: 100, paddingHorizontal: 14, paddingVertical: 5 },
  homeCoinPop:        { fontSize: scale(18), fontFamily: 'Inter_900Black', color: '#1A6600', letterSpacing: 0.2 },
  homeQuestsHeader:   { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  homeQuestsTitle:    { fontSize: scale(22), fontFamily: 'Inter_800ExtraBold', color: '#1A1A1A' },
  homeLeftPill:       { backgroundColor: '#ADE9DF', borderRadius: 100, paddingHorizontal: 16, paddingVertical: 8, borderWidth: 2, borderColor: '#1A1A1A' },
  homeLeftText:       { fontSize: scale(15), fontFamily: 'Inter_700Bold', color: '#1A1A1A' },
  homeQuestCard:      { flexDirection: 'row', alignItems: 'center', backgroundColor: '#FAF9F4', borderRadius: 16, borderWidth: 2, borderColor: '#1A1A1A', padding: 12, marginBottom: 10, gap: 12, ...SOLID_SHADOW },
  homeQuestSweep:     { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: '#E8FFA0', borderRadius: 14 },
  homeQuestCardDone:  { opacity: 0.5 },
  homeQuestIcon:      { width: 58, height: 58, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  homeQuestInfo:      { flex: 1 },
  homeQuestTitle:     { fontSize: scale(17), fontFamily: 'Inter_700Bold', color: '#1A1A1A', marginBottom: 3 },
  homeQuestTitleDone: { textDecorationLine: 'line-through', color: '#ABABAB' },
  homeQuestReward:    { fontSize: scale(15), fontFamily: 'Inter_600SemiBold', color: '#1A1A1A' },
  homeQuestCheck:     { width: 30, height: 30, borderRadius: 15, borderWidth: 2, borderColor: '#1A1A1A' },
  homeQuestCheckDone: { backgroundColor: '#6B35F0', borderColor: '#6B35F0', alignItems: 'center', justifyContent: 'center' },
  homeQuestCheckDot:  { width: 8, height: 8, borderRadius: 4, backgroundColor: 'white' },
  homeQuestCardPending: { borderColor: '#E6A817', backgroundColor: '#FFFBF0' },
  homeQuestSweepPending: { position: 'absolute' as const, top: 0, left: 0, right: 0, bottom: 0, backgroundColor: '#FFF3C4', borderRadius: 14 },
  pendingLabel: { fontSize: scale(13), fontFamily: 'Inter_600SemiBold' as const, color: '#C47F00' },
  pendingBadge: { width: 30, height: 30, borderRadius: 15, backgroundColor: '#FFF3C4', borderWidth: 2, borderColor: '#E6A817', alignItems: 'center' as const, justifyContent: 'center' as const },
  homeQuestCardRejected: { borderColor: '#E84040', backgroundColor: '#FFF5F5' },
  rejectionBubble: { marginTop: 4, backgroundColor: '#FFE5E5', borderRadius: 8, paddingHorizontal: 8, paddingVertical: 4 },
  rejectionNote: { fontSize: scale(12), color: '#C00', fontStyle: 'italic' as const },
  retryLabel: { fontSize: scale(12), fontFamily: 'Inter_700Bold' as const, color: '#E84040', marginTop: 2 },
  allDoneCard:        { backgroundColor: '#FFFFFF', borderRadius: 20, borderWidth: 2.5, borderColor: '#1A1A1A', padding: 32, alignItems: 'center' as const, gap: 8, ...SOLID_SHADOW },
  allDoneEmoji:       { fontSize: scale(48), marginBottom: 4 },
  allDoneTitle:       { fontSize: scale(20), fontFamily: 'Inter_800ExtraBold' as const, color: '#1A1A1A', textAlign: 'center' as const },
  allDoneSub:         { fontSize: scale(15), fontFamily: 'Inter_500Medium' as const, color: '#ABABAB', textAlign: 'center' as const },
  battleCard:      { backgroundColor: C.surface, borderWidth: 2, borderColor: '#1A1A1A', borderRadius: 14, padding: 14, paddingHorizontal: 16, ...SOLID_SHADOW },
  battleCardLabel: { fontSize: scale(10), fontFamily: 'Inter_700Bold', letterSpacing: 1.8, color: C.muted, marginBottom: 4 },
  battlePower:     { fontSize: scale(32), fontFamily: 'Inter_900Black', color: C.text, letterSpacing: -1, lineHeight: scale(36) },
  battleCardSub:   { fontSize: scale(11), color: C.muted, marginTop: 3 },
  pctRow:          { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 10 },
  pctTrack:        { flex: 1, height: 6, backgroundColor: C.border, borderRadius: 6, overflow: 'hidden' },
  pctFill:         { height: '100%', borderRadius: 6, backgroundColor: C.accent },
  pctLbl:          { fontSize: scale(11), fontFamily: 'Inter_700Bold', color: C.accent, minWidth: 30, textAlign: 'right' },
  bossCard:        { backgroundColor: C.surface, borderWidth: 2, borderColor: '#1A1A1A', borderRadius: 14, padding: 12, paddingHorizontal: 14, flexDirection: 'row', alignItems: 'center', gap: 12, ...SOLID_SHADOW },
  bossName:        { fontSize: scale(14), fontFamily: 'Inter_900Black', color: C.text },
  bossSub:         { fontSize: scale(11), color: C.muted, marginTop: 1 },
  bossPow:         { fontSize: scale(13), fontFamily: 'Inter_700Bold', color: C.text },
  oddsRow:         { flexDirection: 'row', gap: 8 },
  oddsCard:        { flex: 1, backgroundColor: C.bg, borderRadius: 12, borderWidth: 2, borderColor: '#1A1A1A', padding: 12, alignItems: 'center', ...SOLID_SHADOW },
  oddsVal:         { fontSize: scale(20), fontFamily: 'Inter_900Black', color: C.text },
  oddsLbl:         { fontSize: scale(10), color: C.muted, fontFamily: 'Inter_700Bold', letterSpacing: 0.5, marginTop: 2 },
  battleBtn:       { backgroundColor: '#1A1A1A', borderRadius: 100, paddingVertical: 18, alignItems: 'center', borderWidth: 2, borderColor: '#1A1A1A', ...SOLID_SHADOW },
  battleBtnText:   { fontSize: scale(17), fontFamily: 'Inter_900Black', color: 'white', letterSpacing: -0.3 },
  debugBtn:        { backgroundColor: C.bg, borderWidth: 0.5, borderColor: C.border, borderRadius: 10, padding: 10, alignItems: 'center' },
  debugBtnText:    { fontSize: scale(11), fontFamily: 'Inter_700Bold', color: C.muted, letterSpacing: 0.3 },
  arenaStage:      { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24, backgroundColor: C.surface },
  arenaVs:         { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 16, width: '100%' },
  arenaFighter:    { alignItems: 'center', gap: 8 },
  arenaName:       { fontSize: scale(11), fontFamily: 'Inter_700Bold', color: C.muted, letterSpacing: 0.5 },
  arenaVsLabel:    { fontSize: scale(22), fontFamily: 'Inter_900Black', color: C.border },
  arenaLog:        { width: '100%', backgroundColor: C.bg, borderRadius: 12, padding: 14, minHeight: 72, marginTop: 20 },
  arenaLogText:    { fontSize: scale(13), color: C.text, lineHeight: scale(20) },
  arenaLogBold:    { fontFamily: 'Inter_700Bold' },
  resultScreen:    { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24, backgroundColor: C.surface, gap: 6 },
  resultChip:      { fontSize: scale(10), fontFamily: 'Inter_700Bold', letterSpacing: 1.8, color: C.muted },
  resultH:         { fontSize: scale(28), fontFamily: 'Inter_900Black', color: C.text, letterSpacing: -0.5 },
  resultSub:       { fontSize: scale(13), color: C.muted, marginBottom: 6 },
  resultCoins:     { fontSize: scale(22), fontFamily: 'Inter_900Black', color: C.gold },
  resultCoinsLbl:  { fontSize: scale(12), color: C.muted, marginBottom: 20 },
  evCta:              { backgroundColor: '#C5F215', borderRadius: 14, paddingHorizontal: 36, paddingVertical: 15, borderWidth: 2, borderColor: '#1A1A1A', width: '100%', alignItems: 'center' },
  evCtaText:          { fontSize: scale(16), fontFamily: 'Inter_900Black', color: '#1A1A1A', letterSpacing: -0.3 },
  evolveScreen:       { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24, gap: 8 },
  evolveOverlayBg:    { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: '#1A0A2E' },
  evolveRingContainer:{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, alignItems: 'center', justifyContent: 'center' },
  evolveRing:         { position: 'absolute', width: 200, height: 200, borderRadius: 100, borderWidth: 2, borderColor: '#6B35F0', opacity: 0 },
  evolveBanner:       { fontSize: scale(42), fontFamily: 'Inter_900Black', color: '#C5F215', letterSpacing: -1, textAlign: 'center' },
  evolveSide:         { alignItems: 'center', gap: 6 },
  evolveName:         { fontSize: scale(14), fontFamily: 'Inter_900Black', color: C.text },
  evolveLvl:          { fontSize: scale(11), fontFamily: 'Inter_700Bold', color: C.muted },
  evolveSub:          { fontSize: scale(14), color: 'rgba(255,255,255,0.6)', textAlign: 'center', marginTop: 8 },
  walletTotal:     { backgroundColor: C.surface, borderRadius: 14, borderWidth: 2, borderColor: '#1A1A1A', padding: 16, paddingBottom: 12, ...SOLID_SHADOW },
  walletLabel:     { fontSize: scale(10), fontFamily: 'Inter_700Bold', letterSpacing: 1.8, color: C.muted, marginBottom: 4 },
  walletAmount:    { fontSize: scale(34), fontFamily: 'Inter_900Black', color: C.text, letterSpacing: -1 },
  walletSub:       { fontSize: scale(11), color: C.muted, marginTop: 2 },
  walletRow:       { backgroundColor: C.surface, borderWidth: 2, borderColor: '#1A1A1A', borderRadius: 12, padding: 10, paddingHorizontal: 12, flexDirection: 'row', alignItems: 'center', gap: 10, ...SOLID_SHADOW },
  walletRowName:   { flex: 1, fontSize: scale(12), fontFamily: 'Inter_700Bold', color: C.text },
  walletRowCoins:  { fontSize: scale(13), fontFamily: 'Inter_900Black', color: C.gold },
  // ── Goal flow ──
  gfRoot:              { flex: 1, backgroundColor: '#FFFFFF' },
  gfBackRow:           { paddingHorizontal: 24, paddingTop: 16, paddingBottom: 4 },
  gfBackBtn:           { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  gfBackText:          { fontSize: scale(24), color: '#1A1A1A', fontFamily: 'Inter_600SemiBold' },
  gfScrollCenter:      { flexGrow: 1, alignItems: 'center', paddingHorizontal: 24, paddingBottom: 40, justifyContent: 'center' },
  gfScrollTop:         { flexGrow: 1, paddingHorizontal: 24, paddingBottom: 40, paddingTop: 8 },
  gfRobotCircle:       { width: 160, height: 160, borderRadius: 80, backgroundColor: '#EAE4FF', alignItems: 'center', justifyContent: 'center', marginBottom: 24 },
  gfBigTitle:          { fontSize: scale(34), fontFamily: 'Inter_900Black', color: '#1A1A1A', textAlign: 'center', lineHeight: scale(40), marginBottom: 8 },
  gfCreatedTitle:      { fontSize: scale(34), fontFamily: 'Inter_900Black', color: '#6B35F0', textAlign: 'center', marginBottom: 8 },
  gfSubtitle:          { fontSize: scale(16), color: '#ABABAB', textAlign: 'center', marginBottom: 8 },
  gfScreenTitle:       { fontSize: scale(28), fontFamily: 'Inter_900Black', color: '#1A1A1A', marginBottom: 6 },
  gfScreenSub:         { fontSize: scale(15), color: '#ABABAB', marginBottom: 16 },
  gfBtnPrimary:        { backgroundColor: '#6B35F0', borderRadius: 14, padding: 16, alignItems: 'center', width: '100%' },
  gfBtnPrimaryText:    { fontSize: scale(16), fontFamily: 'Inter_800ExtraBold', color: '#FFFFFF' },
  gfBtnOutline:        { borderRadius: 14, padding: 16, alignItems: 'center', width: '100%', borderWidth: 1.5, borderColor: '#ECEAE4', backgroundColor: '#FFFFFF' },
  gfBtnOutlineText:    { fontSize: scale(16), fontFamily: 'Inter_700Bold', color: '#1A1A1A' },
  gfSkipLink:          { fontSize: scale(15), fontFamily: 'Inter_600SemiBold', color: '#ABABAB' },
  gfSearchRow:         { flexDirection: 'row', alignItems: 'center', backgroundColor: '#F5F3EF', borderRadius: 12, borderWidth: 2, borderColor: '#1A1A1A', paddingHorizontal: 12, paddingVertical: 10, gap: 8, marginBottom: 12 },
  gfSearchInput:       { flex: 1, fontSize: scale(15), color: '#1A1A1A', paddingVertical: 0 },
  gfSearchClear:       { padding: 4 },
  gfCategoryGrid:      { flexDirection: 'row', flexWrap: 'wrap', gap: 10, justifyContent: 'space-between', marginTop: 8 },
  gfCategoryCard:      { width: '31%', backgroundColor: '#FFFFFF', borderRadius: 14, borderWidth: 2, borderColor: '#1A1A1A', alignItems: 'center', paddingVertical: 16, paddingHorizontal: 8, ...SOLID_SHADOW },
  gfCategoryLabel:     { fontSize: scale(13), fontFamily: 'Inter_600SemiBold', color: '#1A1A1A', marginTop: 6, textAlign: 'center' },
  gfGoalRow:           { flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFFFFF', borderRadius: 14, borderWidth: 2, borderColor: '#1A1A1A', padding: 14, gap: 12, ...SOLID_SHADOW },
  gfGoalRowSelected:   { borderColor: '#6B35F0', borderWidth: 2 },
  gfGoalIconCircle:    { width: 56, height: 56, borderRadius: 28, backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: '#ECEAE4', alignItems: 'center', justifyContent: 'center' },
  gfGoalName:          { fontSize: scale(16), fontFamily: 'Inter_700Bold', color: '#1A1A1A' },
  gfGoalPrice:         { fontSize: scale(13), color: '#ABABAB', marginTop: 2 },
  gfGoalCheck:         { width: 26, height: 26, borderRadius: 13, borderWidth: 2, borderColor: '#ECEAE4', alignItems: 'center', justifyContent: 'center' },
  gfGoalCheckSelected: { backgroundColor: '#6B35F0', borderColor: '#6B35F0' },
  gfGoalCheckDot:      { width: 8, height: 8, borderRadius: 4, backgroundColor: '#FFFFFF' },
  gfLabelRow:          { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 },
  gfFieldLabel:        { fontSize: scale(14), fontFamily: 'Inter_700Bold', color: '#1A1A1A' },
  gfCharCount:         { fontSize: scale(12), color: '#ABABAB' },
  gfInput:             { borderWidth: 2, borderColor: '#1A1A1A', borderRadius: 12, padding: 14, fontSize: scale(16), color: '#1A1A1A', backgroundColor: '#FFFFFF', justifyContent: 'center' },
  gfPhotoDash:         { borderWidth: 1.5, borderColor: '#D0CEC8', borderRadius: 12, padding: 20, alignItems: 'center', justifyContent: 'center', borderStyle: 'dashed', marginTop: 6, gap: 6 },
  gfPhotoText:         { fontSize: scale(14), color: '#ABABAB' },
  gfPhotoPreview:      { marginTop: 20, borderRadius: 14, overflow: 'hidden', position: 'relative' },
  gfPhotoPlaceholder:  { height: 180, backgroundColor: '#EAE4FF', alignItems: 'center', justifyContent: 'center', borderRadius: 14 },
  gfPhotoRemove:       { position: 'absolute', top: 8, right: 8, width: 30, height: 30, borderRadius: 15, backgroundColor: 'rgba(0,0,0,0.5)', alignItems: 'center', justifyContent: 'center' },
  gfPhotoRemoveText:   { color: '#FFFFFF', fontSize: scale(14), fontFamily: 'Inter_700Bold' },
  gfAmountDisplay:     { fontSize: scale(52), fontFamily: 'Inter_900Black', color: '#6B35F0', textAlign: 'center', marginVertical: 16 },
  gfAmountHint:        { fontSize: scale(13), color: '#ABABAB', textAlign: 'center', marginBottom: 24 },
  gfNumpad:            { flexDirection: 'row', flexWrap: 'wrap', gap: 10, justifyContent: 'center' },
  gfNumKey:            { width: '30%', backgroundColor: '#FFFFFF', borderRadius: 14, borderWidth: 2, borderColor: '#1A1A1A', paddingVertical: 18, alignItems: 'center', justifyContent: 'center', ...SOLID_SHADOW },
  gfNumKeyText:        { fontSize: scale(22), fontFamily: 'Inter_700Bold', color: '#1A1A1A' },
  gfColorGrid:         { flexDirection: 'row', flexWrap: 'wrap', gap: 14, justifyContent: 'center', marginTop: 16 },
  gfColorSwatch:       { width: 64, height: 64, borderRadius: 32, alignItems: 'center', justifyContent: 'center' },
  gfColorSwatchSelected: { borderWidth: 3, borderColor: '#1A1A1A' },
  gfColorCheck:        { fontSize: scale(22), color: '#FFFFFF', fontFamily: 'Inter_900Black' },
  gfPreviewCard:       { backgroundColor: '#FFFFFF', borderRadius: 16, borderWidth: 2, borderColor: '#1A1A1A', padding: 16, width: '100%', marginTop: 16, ...SOLID_SHADOW },
  gfPreviewName:       { fontSize: scale(22), fontFamily: 'Inter_800ExtraBold', color: '#1A1A1A', textAlign: 'center', marginBottom: 4 },
  gfPreviewAmount:     { fontSize: scale(16), color: '#ABABAB', textAlign: 'center', marginBottom: 12 },
  gfProgressTrack:     { height: 8, backgroundColor: '#ECEAE4', borderRadius: 4, overflow: 'hidden', marginBottom: 4 },
  gfProgressFill:      { height: '100%', borderRadius: 4 },
  gfProgressPct:       { fontSize: scale(12), color: '#ABABAB', textAlign: 'right' },
  gfRobotRow:          { flexDirection: 'row', alignItems: 'center', gap: 12, marginTop: 16, width: '100%' },
  gfSpeechBubble:      { flex: 1, backgroundColor: '#FFFFFF', borderRadius: 14, borderWidth: 2, borderColor: '#1A1A1A', padding: 12, ...SOLID_SHADOW },
  gfSpeechText:        { fontSize: scale(14), color: '#1A1A1A', lineHeight: scale(20) },
  gfConfettiDot:       { position: 'absolute', width: 10, height: 10, borderRadius: 5 },
  gfAllowanceLabel:    { fontSize: scale(14), color: '#ABABAB', textAlign: 'center', marginBottom: 4 },
  gfAllowanceDate:     { fontSize: scale(28), fontFamily: 'Inter_900Black', color: '#6B35F0', textAlign: 'center', marginBottom: 4 },
  gfAllowanceDays:     { fontSize: scale(15), color: '#ABABAB', textAlign: 'center' },
  // debug overlay
  debugScrim:        { position: 'absolute', top: 0, left: 0, right: 0, bottom: 120, backgroundColor: 'rgba(0,0,0,0.55)', justifyContent: 'flex-end' } as any,
  debugPanel:        { backgroundColor: '#1A1A1A', borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 20, gap: 12 },
  debugTabs:         { flexDirection: 'row', backgroundColor: '#2A2A2A', borderRadius: 10, padding: 3, gap: 3 },
  debugTab:          { flex: 1, paddingVertical: 7, borderRadius: 8, alignItems: 'center' },
  debugTabActive:    { backgroundColor: '#3A3A3A' },
  debugTabText:      { fontSize: scale(12), fontFamily: 'Inter_600SemiBold', color: '#666' },
  debugTabTextActive:{ color: '#FFFFFF' },
  debugResetBtn:     { backgroundColor: '#2A2A2A', borderRadius: 10, paddingVertical: 13, paddingHorizontal: 16 },
  debugResetTxt:     { fontSize: scale(14), fontFamily: 'Inter_600SemiBold', color: '#FFFFFF' },
  debugTitle:        { fontSize: scale(16), fontFamily: 'Inter_800ExtraBold', color: '#fff' },
  debugSub:          { fontSize: scale(12), color: '#888', marginTop: -6 },
  debugSectionLabel: { fontSize: scale(10), fontFamily: 'Inter_700Bold', color: '#FFFFFF', letterSpacing: 1.5, marginTop: 4 },
  debugGrid:         { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  debugChip:         { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20, backgroundColor: '#2E2E2E' },
  debugChipActive:   { backgroundColor: '#C5F215' },
  debugChipText:     { fontSize: scale(12), fontFamily: 'Inter_600SemiBold', color: '#aaa' },
  debugChipTextActive: { color: '#1A1A1A' },
  debugRow:          { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  debugXpBtn:        { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 10, backgroundColor: '#2E2E2E' },
  debugXpBtnGreen:   { backgroundColor: '#2A4A1A' },
  debugXpBtnTxt:     { fontSize: scale(13), fontFamily: 'Inter_700Bold', color: '#fff' },
  debugMaxBtn:       { backgroundColor: '#6B35F0', borderRadius: 12, padding: 14, alignItems: 'center' },
  debugMaxTxt:       { fontSize: scale(14), fontFamily: 'Inter_700Bold', color: '#fff' },
  debugCopyBtn:      { backgroundColor: '#6B35F0', borderRadius: 12, padding: 12, alignItems: 'center' },
  debugCopyTxt:      { fontSize: scale(14), fontFamily: 'Inter_700Bold', color: '#fff' },
  debugCloseBtn:     { backgroundColor: '#2E2E2E', borderRadius: 12, padding: 12, alignItems: 'center' },
  debugCloseTxt:     { fontSize: scale(14), fontFamily: 'Inter_600SemiBold', color: '#888' },
});

// ─── Parent Styles ────────────────────────────────────────────────────────────

const p = StyleSheet.create({
  // Tab bar
  tabBarWrap:       { position: 'absolute', bottom: 0, left: 0, right: 0, backgroundColor: '#FFFFFF', borderTopWidth: 1, borderTopColor: '#ECEAE4', paddingBottom: Platform.OS === 'ios' ? 20 : 10 },
  tabBarRow:        { flexDirection: 'row', justifyContent: 'space-around', alignItems: 'center', paddingTop: 10, paddingHorizontal: 8 },
  tabItem:          { flex: 1, alignItems: 'center' },
  tabPill:          { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 10, paddingVertical: 6, borderRadius: 20 },
  tabPillActive:    { backgroundColor: '#EAE4FF' },
  tabLabel:         { fontSize: scale(12), fontFamily: 'Inter_600SemiBold', color: C.muted },
  tabLabelActive:   { color: '#6B35F0', fontFamily: 'Inter_700Bold' },

  // Screen header
  screenHeader:     { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: '#ECEAE4', backgroundColor: '#FFFFFF' },
  screenTitle:      { fontSize: scale(18), fontFamily: 'Inter_800ExtraBold', color: '#1A1A1A', flex: 1, textAlign: 'center' },
  backBtn:          { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  backBtnText:      { fontSize: scale(22), color: '#1A1A1A', fontFamily: 'Inter_600SemiBold' },
  addBtn:           { width: 40, height: 40, borderRadius: 10, backgroundColor: '#C5F215', borderWidth: 2, borderColor: '#1A1A1A', alignItems: 'center', justifyContent: 'center' },
  addBtnText:       { fontSize: scale(22), color: '#1A1A1A', fontFamily: 'Inter_700Bold', lineHeight: scale(26) },

  // Parent home
  homeHeader:       { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingTop: 16, paddingBottom: 16, backgroundColor: '#F7F6F2' },
  homeHeaderLeft:   { flexDirection: 'row', alignItems: 'center', gap: 10 },
  homeAvatar:       { width: 48, height: 48, borderRadius: 24, backgroundColor: '#fff', borderWidth: 2, borderColor: '#1A1A1A', alignItems: 'center', justifyContent: 'center' },
  homeParentView:   { fontSize: scale(17), fontFamily: 'Inter_700Bold', color: '#1A1A1A' },
  homeBell:         { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },

  // Hero card
  heroCard:         { marginHorizontal: 16, marginTop: 8, borderRadius: 20, backgroundColor: '#C5F215', borderWidth: 2, borderColor: '#1A1A1A', ...SOLID_SHADOW },
  heroContent:     { flexDirection: 'row', alignItems: 'center', padding: 20, paddingBottom: 0 },
  heroTitle:        { fontSize: scale(32), fontFamily: 'Inter_900Black', color: '#1A1A1A', letterSpacing: -0.5, marginBottom: 6 },
  heroSub:          { fontSize: scale(14), color: '#1A1A1A', lineHeight: scale(20), opacity: 0.8 },
  heroCurve:        { height: 24, backgroundColor: '#FFFFFF', borderTopLeftRadius: 20, borderTopRightRadius: 20, marginTop: 12 },

  // Menu cards
  menuCard:         { backgroundColor: '#FFFFFF', borderRadius: 14, borderWidth: 2, borderColor: '#1A1A1A', padding: 16, flexDirection: 'row', alignItems: 'center', gap: 14, ...SOLID_SHADOW },
  menuCardIcon:     { width: 48, height: 48, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  menuCardTitle:    { fontSize: scale(16), fontFamily: 'Inter_700Bold', color: '#1A1A1A', marginBottom: 3 },
  menuCardSub:      { fontSize: scale(13), color: '#ABABAB' },
  menuCardArrow:    { fontSize: scale(22), color: '#1A1A1A', fontFamily: 'Inter_300Light' },

  // Chore manage rows
  choreManageRow:   { backgroundColor: '#FFFFFF', borderRadius: 14, borderWidth: 2, borderColor: '#1A1A1A', padding: 12, flexDirection: 'row', alignItems: 'center', gap: 12, ...SOLID_SHADOW },
  choreManageIcon:  { width: 52, height: 52, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  choreManageName:  { fontSize: scale(16), fontFamily: 'Inter_700Bold', color: '#1A1A1A', marginBottom: 2 },
  choreManageFreq:  { fontSize: scale(13), color: '#ABABAB' },
  choreManageRate:  { fontSize: scale(16), fontFamily: 'Inter_700Bold', color: '#3B8A3A' },
  choreManageDrag:  { fontSize: scale(20), color: '#C0BEB8', marginLeft: 8 },

  // Toggle pills
  toggleRow:        { flexDirection: 'row', gap: 10, paddingHorizontal: 16, paddingVertical: 12 },
  togglePill:       { paddingHorizontal: 20, paddingVertical: 8, borderRadius: 20, backgroundColor: '#F0EEE8' },
  togglePillActive: { backgroundColor: '#6B35F0' },
  toggleText:       { fontSize: scale(14), fontFamily: 'Inter_600SemiBold', color: '#ABABAB' },
  toggleTextActive: { color: '#FFFFFF' },

  // Add/Edit chore form
  iconDisplay:      { width: 96, height: 96, borderRadius: 20, alignItems: 'center', justifyContent: 'center', position: 'relative' },
  iconEditBadge:    { position: 'absolute', bottom: 2, right: 2, width: 26, height: 26, borderRadius: 13, backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: '#ECEAE4', alignItems: 'center', justifyContent: 'center' },
  formCard:         { backgroundColor: '#FFFFFF', borderRadius: 14, borderWidth: 2, borderColor: '#1A1A1A', padding: 16, ...SOLID_SHADOW },
  formLabel:        { fontSize: scale(13), fontFamily: 'Inter_700Bold', color: '#ABABAB', marginBottom: 8, textTransform: 'uppercase', letterSpacing: 0.5 },
  formInput:        { borderWidth: 2, borderColor: '#1A1A1A', borderRadius: 10, padding: 14, fontSize: scale(16), color: '#1A1A1A' },
  formDropdownRow:  { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderWidth: 2, borderColor: '#1A1A1A', borderRadius: 10, padding: 14 },
  formDropdownValue:{ fontSize: scale(16), color: '#1A1A1A' },
  rateDollarSign:   { fontSize: scale(18), fontFamily: 'Inter_600SemiBold', color: '#1A1A1A' },
  // Difficulty picker
  difficultyBtn:        { flex: 1, backgroundColor: '#F7F6F2', borderRadius: 12, borderWidth: 2, borderColor: '#ECEAE4', padding: 10, alignItems: 'center' as const, gap: 4 },
  difficultyBtnActive:  { backgroundColor: '#EAE4FF', borderColor: '#6B35F0' },
  difficultyStars:      { fontSize: scale(14) },
  difficultyLabel:      { fontSize: scale(12), fontFamily: 'Inter_700Bold' as const, color: '#ABABAB' },
  difficultyLabelActive:{ color: '#6B35F0' },
  difficultyPay:        { fontSize: scale(13), fontFamily: 'Inter_700Bold' as const, color: '#ABABAB' },
  difficultyPayActive:  { color: '#3B8A3A' },
  // Kid assignment pills
  kidPill:          { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 100, borderWidth: 2, borderColor: '#ECEAE4', backgroundColor: '#F7F6F2' },
  kidPillActive:    { backgroundColor: '#C5F215', borderColor: '#1A1A1A' },
  kidPillText:      { fontSize: scale(14), fontFamily: 'Inter_600SemiBold' as const, color: '#ABABAB' },
  kidPillTextActive:{ color: '#1A1A1A' },
  iconPickerItem:   { width: 56, height: 56, borderRadius: 14, alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: 'transparent' },
  iconPickerSelected: { borderColor: '#6B35F0', backgroundColor: '#EAE4FF' },
  saveBtn:          { backgroundColor: '#C5F215', borderRadius: 14, borderWidth: 1.5, borderColor: '#1A1A1A', padding: 16, alignItems: 'center' },
  saveBtnText:      { fontSize: scale(16), fontFamily: 'Inter_800ExtraBold', color: '#1A1A1A' },
  cancelBtn:        { backgroundColor: '#FFFFFF', borderRadius: 14, borderWidth: 1.5, borderColor: '#1A1A1A', padding: 16, alignItems: 'center' },
  cancelBtnText:    { fontSize: scale(16), fontFamily: 'Inter_700Bold', color: '#1A1A1A' },

  // Pay rates
  sectionCard:      { backgroundColor: '#FFFFFF', borderRadius: 14, borderWidth: 2, borderColor: '#1A1A1A', padding: 16, ...SOLID_SHADOW },
  sectionCardTitle: { fontSize: scale(16), fontFamily: 'Inter_700Bold', color: '#1A1A1A', marginBottom: 4 },
  sectionCardSub:   { fontSize: scale(13), color: '#ABABAB', marginBottom: 12 },
  dropdownRow:      { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderWidth: 2, borderColor: '#1A1A1A', borderRadius: 10, padding: 12, marginTop: 4 },
  dropdownValue:    { fontSize: scale(15), color: '#1A1A1A' },
  settingsRow:      { flexDirection: 'row', alignItems: 'center', gap: 12 },
  settingsRowLabel: { fontSize: scale(15), fontFamily: 'Inter_600SemiBold', color: '#1A1A1A', marginBottom: 2 },
  settingsRowSub:   { fontSize: scale(12), color: '#ABABAB', lineHeight: scale(17) },
  rateInputPill:    { flexDirection: 'row', alignItems: 'center', backgroundColor: '#F7F6F2', borderRadius: 10, borderWidth: 2, borderColor: '#1A1A1A', paddingHorizontal: 12, paddingVertical: 8, gap: 4, minWidth: 80 },
  rateInput:        { fontSize: scale(15), fontFamily: 'Inter_700Bold', color: '#1A1A1A', minWidth: 48 },
  rateGuideLink:    { fontSize: scale(15), fontFamily: 'Inter_700Bold', color: '#6B35F0' },

  // Rate guide
  rateInfoCard:     { backgroundColor: '#FEF9EC', borderRadius: 14, borderWidth: 2, borderColor: '#1A1A1A', padding: 16, flexDirection: 'row', alignItems: 'center', gap: 12, ...SOLID_SHADOW },
  rateInfoText:     { fontSize: scale(14), color: '#1A1A1A', lineHeight: scale(20), marginBottom: 10 },
  learnMoreBtn:     { backgroundColor: '#6B35F0', borderRadius: 8, paddingHorizontal: 14, paddingVertical: 8, alignSelf: 'flex-start' },
  learnMoreText:    { fontSize: scale(13), fontFamily: 'Inter_700Bold', color: '#FFFFFF' },
  rateTableRow:     { flexDirection: 'row', alignItems: 'center', paddingVertical: 10 },
  rateTableHeader:  { fontSize: scale(13), fontFamily: 'Inter_800ExtraBold', color: '#1A1A1A' },
  rateTableCell:    { fontSize: scale(13), color: '#1A1A1A' },
  rateDot:          { width: 8, height: 8, borderRadius: 4 },
  noteCard:         { backgroundColor: '#FFFFFF', borderRadius: 14, borderWidth: 2, borderColor: '#1A1A1A', padding: 16, flexDirection: 'row', alignItems: 'flex-start', gap: 4, ...SOLID_SHADOW },
  noteText:         { flex: 1, fontSize: scale(14), color: '#1A1A1A', lineHeight: scale(20) },

  // Pending approval styles
  approveBtn:           { flex: 1, backgroundColor: '#C5F215', borderRadius: 10, borderWidth: 2, borderColor: '#1A1A1A', padding: 10, alignItems: 'center' as const },
  approveBtnText:       { fontSize: scale(14), fontFamily: 'Inter_800ExtraBold' as const, color: '#1A1A1A' },
  rejectBtn:            { flex: 1, backgroundColor: '#FFFFFF', borderRadius: 10, borderWidth: 2, borderColor: '#1A1A1A', padding: 10, alignItems: 'center' as const },
  rejectBtnText:        { fontSize: scale(14), fontFamily: 'Inter_700Bold' as const, color: '#E84040' },
  rejectConfirmBtn:     { flex: 1, backgroundColor: '#E84040', borderRadius: 10, padding: 10, alignItems: 'center' as const },
  rejectConfirmBtnText: { fontSize: scale(14), fontFamily: 'Inter_800ExtraBold' as const, color: '#FFFFFF' },
  pendingReviewCard:    { backgroundColor: '#FFFFFF', borderRadius: 14, borderWidth: 2, borderColor: '#E6A817', padding: 14, ...SOLID_SHADOW },
  pendingTabBadge:      { backgroundColor: '#E6A817', borderRadius: 10, minWidth: 20, height: 20, alignItems: 'center' as const, justifyContent: 'center' as const, paddingHorizontal: 5 },
  pendingTabBadgeText:  { fontSize: scale(11), fontFamily: 'Inter_800ExtraBold' as const, color: '#FFFFFF' },

  // Payout screen styles
  payoutBreakdownRow: { flexDirection: 'row' as const, alignItems: 'center' as const, justifyContent: 'space-between' as const, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: '#ECEAE4' },
  payoutBreakdownLabel: { fontSize: scale(15), color: '#1A1A1A', fontFamily: 'Inter_600SemiBold' as const },
  payoutBreakdownValue: { fontSize: scale(15), color: '#1A1A1A', fontFamily: 'Inter_700Bold' as const },
  payoutTotalLabel: { fontSize: scale(17), fontFamily: 'Inter_800ExtraBold' as const, color: '#1A1A1A' },
  payoutTotalValue: { fontSize: scale(17), fontFamily: 'Inter_900Black' as const, color: '#3B8A3A' },
  payoutCta: { backgroundColor: '#C5F215', borderRadius: 16, borderWidth: 2, borderColor: '#1A1A1A', padding: 18, alignItems: 'center' as const, ...SOLID_SHADOW },
  payoutCtaText: { fontSize: scale(17), fontFamily: 'Inter_900Black' as const, color: '#1A1A1A' },
});

// ─── Settings Styles (ps prefix) ─────────────────────────────────────────────

const ps = StyleSheet.create({
  sectionLabel:   { fontSize: scale(11), fontFamily: 'Inter_700Bold', color: '#ABABAB', letterSpacing: 0.8, paddingHorizontal: 20, paddingTop: 20, paddingBottom: 6 },
  group:          { marginHorizontal: 16, backgroundColor: '#FFFFFF', borderRadius: 16, borderWidth: 2, borderColor: '#1A1A1A', ...SOLID_SHADOW },
  divider:        { height: 1, backgroundColor: '#F0EEE8', marginLeft: 68 },
  row:            { flexDirection: 'row', alignItems: 'center', paddingVertical: 13, paddingHorizontal: 16, gap: 12 },
  rowIcon:        { width: 36, height: 36, borderRadius: 9, alignItems: 'center', justifyContent: 'center' },
  rowTitle:       { fontSize: scale(15), fontFamily: 'Inter_600SemiBold', color: '#1A1A1A' },
  rowSub:         { fontSize: scale(12), color: '#ABABAB', marginTop: 1 },
  badge:          { backgroundColor: '#6B35F0', borderRadius: 10, paddingHorizontal: 8, paddingVertical: 2 },
  badgeText:      { fontSize: scale(12), fontFamily: 'Inter_700Bold', color: '#FFFFFF' },
  chevron:        { fontSize: scale(20), color: '#C0BEB8', fontFamily: 'Inter_300Light' },
  kidAvatar:      { width: 42, height: 42, borderRadius: 21, alignItems: 'center', justifyContent: 'center' },
  battleHero:     { backgroundColor: '#3D1FA3', borderRadius: 16, borderWidth: 2, borderColor: '#1A1A1A', padding: 20, flexDirection: 'row', alignItems: 'center', gap: 14, ...SOLID_SHADOW },
  battleHeroTitle:{ fontSize: scale(18), fontFamily: 'Inter_800ExtraBold', color: '#FFFFFF', marginBottom: 4 },
  battleHeroSub:  { fontSize: scale(13), color: 'rgba(255,255,255,0.7)', lineHeight: scale(18) },
  toggle:         { width: 44, height: 26, borderRadius: 13, backgroundColor: '#E0DCDC', justifyContent: 'center', paddingHorizontal: 3 },
  toggleOn:       { backgroundColor: '#6B35F0' },
  toggleThumb:    { width: 20, height: 20, borderRadius: 10, backgroundColor: '#FFFFFF' },
  toggleThumbOn:  { alignSelf: 'flex-end' },
  sliderTrack:    { height: 6, backgroundColor: '#E0DCDC', borderRadius: 3, position: 'relative', marginBottom: 4 },
  sliderFill:     { position: 'absolute', left: 0, top: 0, bottom: 0, backgroundColor: '#6B35F0', borderRadius: 3 },
  sliderThumb:    { position: 'absolute', top: -7, marginLeft: -10, width: 20, height: 20, borderRadius: 10, backgroundColor: '#6B35F0', borderWidth: 3, borderColor: '#FFFFFF', shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.2, shadowRadius: 4 },
  sliderTickLabel:{ fontSize: scale(11), color: '#ABABAB' },
  impactRow:      { flexDirection: 'row', alignItems: 'center', gap: 8 },
  impactCell:     { flex: 1, backgroundColor: '#F7F6F2', borderRadius: 10, padding: 10, alignItems: 'center' },
  impactCellHighlight: { backgroundColor: '#EAE4FF' },
  impactLabel:    { fontSize: scale(10), fontFamily: 'Inter_700Bold', color: '#ABABAB', letterSpacing: 0.5, marginBottom: 4, textTransform: 'uppercase' },
  impactValue:    { fontSize: scale(18), fontFamily: 'Inter_900Black', color: '#1A1A1A' },
  impactUnit:     { fontSize: scale(12), fontFamily: 'Inter_500Medium', color: '#ABABAB' },
  impactArrow:    { fontSize: scale(18), color: '#ABABAB', fontFamily: 'Inter_300Light' },
  cosmeticPill:   { backgroundColor: '#FFFFFF', borderRadius: 20, borderWidth: 1.5, borderColor: '#C4B5FD', paddingHorizontal: 12, paddingVertical: 5 },
  cosmeticText:   { fontSize: scale(12), fontFamily: 'Inter_600SemiBold', color: '#6B35F0' },
  accountAvatar:  { width: 72, height: 72, borderRadius: 36, backgroundColor: '#EAE4FF', alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: '#1A1A1A' },
  accountAvatarText: { fontSize: scale(28), fontFamily: 'Inter_800ExtraBold', color: '#6B35F0' },
  logoutBtn:      { margin: 16, marginTop: 20, backgroundColor: '#FFFFFF', borderRadius: 14, borderWidth: 2, borderColor: '#1A1A1A', padding: 16, alignItems: 'center', ...SOLID_SHADOW },
  logoutText:     { fontSize: scale(16), fontFamily: 'Inter_700Bold', color: '#E53935' },
});

// ─── Onboarding Styles (ob prefix) ───────────────────────────────────────────

const ob = StyleSheet.create({
  skipBtn:           { position: 'absolute', top: 16, right: 20, zIndex: 10, padding: 8 },
  skipText:          { fontSize: scale(15), fontFamily: 'Inter_600SemiBold', color: '#6B35F0' },
  topHalf:           { flex: 1, alignItems: 'center', justifyContent: 'center', paddingTop: 60 },
  robotCircle:       { width: 260, height: 260, borderRadius: 130, backgroundColor: '#EDE8D8', alignItems: 'center', justifyContent: 'center', position: 'relative' },
  xpBadge:           { position: 'absolute', top: 16, left: 0, flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: '#FFFFFF', borderWidth: 1.5, borderColor: '#6B35F0', borderRadius: 100, paddingHorizontal: 10, paddingVertical: 5 },
  xpBadgeText:       { fontSize: scale(13), fontFamily: 'Inter_700Bold', color: '#6B35F0' },
  bottomCard:        { backgroundColor: '#FFFFFF', borderTopLeftRadius: 28, borderTopRightRadius: 28, paddingHorizontal: 28, paddingTop: 28, paddingBottom: 32 },
  slideTitle:        { fontSize: scale(28), fontFamily: 'Inter_900Black', color: '#1A1A1A', marginBottom: 2 },
  slideTitleWord:    { color: '#1A1A1A' },
  yellowUnderline:   { height: 3, width: 80, backgroundColor: '#F5C842', borderRadius: 2, marginBottom: 12 },
  slideSubtitle:     { fontSize: scale(15), color: '#777', lineHeight: scale(22), marginBottom: 24 },
  rewardIcon:        { width: 80, height: 80, backgroundColor: '#FFFFFF', borderRadius: 16, borderWidth: 1, borderColor: '#ECEAE4', alignItems: 'center', justifyContent: 'center' },
  chestBox:          { alignItems: 'center', justifyContent: 'center' },
  featuresCard:      { backgroundColor: '#FFFFFF', borderRadius: 18, borderWidth: 2, borderColor: '#1A1A1A', padding: 20, ...SOLID_SHADOW },
  featureRow:        { flexDirection: 'row', alignItems: 'center', gap: 14, paddingVertical: 12 },
  featureDivider:    { height: 1, backgroundColor: '#ECEAE4' },
  featureLabel:      { fontSize: scale(15), fontFamily: 'Inter_700Bold', color: '#1A1A1A' },
  createAccountBtn:  { backgroundColor: '#C5F215', borderRadius: 14, borderWidth: 2, borderColor: '#1A1A1A', padding: 16, alignItems: 'center' },
  createAccountBtnText: { fontSize: scale(16), fontFamily: 'Inter_800ExtraBold', color: '#1A1A1A' },
  haveAccountBtn:    { backgroundColor: '#FFFFFF', borderRadius: 14, borderWidth: 2, borderColor: '#1A1A1A', padding: 16, alignItems: 'center' },
  haveAccountBtnText: { fontSize: scale(16), fontFamily: 'Inter_700Bold', color: '#1A1A1A' },
});

// ─── Auth Styles (auth prefix) ────────────────────────────────────────────────

// ─── World Screen Styles ──────────────────────────────────────────────────────

const w = StyleSheet.create({
  // Boss card
  bossCard: {
    height: 310, borderRadius: 20, overflow: 'hidden',
    borderWidth: 2, borderColor: '#1A1A1A', justifyContent: 'space-between',
    ...SOLID_SHADOW,
  },
  bossTagPill: {
    alignSelf: 'flex-start', flexDirection: 'row', alignItems: 'center',
    backgroundColor: '#6B35F0', borderRadius: 100,
    paddingHorizontal: 14, paddingVertical: 7,
    borderWidth: 2, borderColor: '#1A1A1A',
    margin: scale(14),
  },
  bossTagText: {
    color: '#fff', fontFamily: 'Inter_900Black', fontSize: scale(14), letterSpacing: 0.8,
  },
  bossCardContent: { padding: scale(16), gap: scale(4) },
  teaserLine1: {
    color: '#fff', fontFamily: 'FredokaOne_400Regular', fontSize: scale(28),
    textShadowColor: '#000', textShadowOffset: { width: 2, height: 2 }, textShadowRadius: 0,
  },
  teaserLine2: {
    color: 'rgba(255,255,255,0.9)', fontSize: scale(16), fontFamily: 'Inter_600SemiBold',
  },

  // Countdown card
  countdownCard: {
    backgroundColor: '#EAE4FF', borderRadius: 20, borderWidth: 2, borderColor: '#1A1A1A',
    flexDirection: 'row', justifyContent: 'space-around', paddingVertical: scale(16), paddingHorizontal: scale(8),
    marginTop: -70, width: '96%', alignSelf: 'center' as const,
    ...SOLID_SHADOW,
  },
  countdownSegment: { alignItems: 'center', flex: 1 },
  countdownNum: { fontFamily: 'FredokaOne_400Regular', fontSize: scale(32), color: '#1A1A1A', letterSpacing: 0 },
  countdownUnit: { fontSize: scale(14), fontFamily: 'Inter_600SemiBold', color: '#6B35F0', marginTop: 2 },

  // Section header (on green bg)
  sectionHeader: { fontSize: scale(22), fontFamily: 'Inter_900Black', color: '#1A1A1A', marginTop: scale(4) },

  // Intel row
  intelRow: { flexDirection: 'row', gap: scale(10) },
  intelChip: {
    backgroundColor: C.surface, borderRadius: 16, padding: scale(14),
    borderWidth: 2, borderColor: '#1A1A1A', ...SOLID_SHADOW,
  },
  intelLabel: { fontSize: scale(10), fontFamily: 'Inter_800ExtraBold', color: C.muted, letterSpacing: 1, marginBottom: 6 },
  intelValue: { fontSize: scale(22), fontFamily: 'Inter_900Black', color: '#1A1A1A' },
  weaknessBox: {
    width: 48, height: 48, borderRadius: 12, backgroundColor: '#FFF9E0',
    alignItems: 'center', justifyContent: 'center', marginBottom: 4,
  },
  weaknessPill: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    backgroundColor: '#FFF9E0', borderRadius: 10, paddingHorizontal: 10, paddingVertical: 5,
    borderWidth: 2, borderColor: '#F0C040', alignSelf: 'flex-start',
  },
  weaknessIcon: { fontSize: scale(16) },
  weaknessText: { fontSize: scale(13), fontFamily: 'Inter_800ExtraBold', color: '#8B6800' },
  unlockArrow: {
    width: 28, height: 28, borderRadius: 14, backgroundColor: '#3AB56A',
    alignItems: 'center', justifyContent: 'center', alignSelf: 'flex-end', marginTop: 6,
  },
  threatPill: {
    alignSelf: 'flex-start', borderRadius: 100, paddingHorizontal: 14, paddingVertical: 5,
    borderWidth: 2, borderColor: '#1A1A1A',
  },
  threatPillText: { fontSize: scale(12), fontFamily: 'Inter_800ExtraBold', color: '#fff' },

  // Section card
  sectionCard: {
    backgroundColor: C.surface, borderRadius: 20, padding: scale(16),
    borderWidth: 2, borderColor: '#1A1A1A', ...SOLID_SHADOW,
  },
  sectionTitle: { fontSize: scale(14), fontFamily: 'Inter_900Black', color: '#1A1A1A', letterSpacing: 0.3 },

  // Readiness
  readinessRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  readinessLabel: { fontSize: scale(13), color: C.muted, fontFamily: 'Inter_600SemiBold' },
  readinessValue: { fontSize: scale(15), fontFamily: 'Inter_800ExtraBold', color: '#1A1A1A' },
  trackWrap: { height: 14, backgroundColor: '#E8E4F2', borderRadius: 100, overflow: 'hidden' },
  trackFill: { height: '100%', backgroundColor: '#6B35F0', borderRadius: 100 },
  forecastPill: {
    backgroundColor: '#F0EBFF', borderRadius: 14, padding: scale(10),
    borderWidth: 2, borderColor: '#C5B8E8',
  },
  forecastText: { fontSize: scale(13), color: '#5A2DB8', fontFamily: 'Inter_700Bold' },

  // What's at stake
  stakeRow: { flexDirection: 'row', justifyContent: 'space-around', paddingVertical: scale(8) },
  stakeItem: { alignItems: 'center', gap: scale(4) },
  stakeIcon: { width: scale(52), height: scale(52) },
  stakeVal: { fontSize: scale(16), fontFamily: 'Inter_900Black', color: '#1A1A1A' },
  stakeLbl: { fontSize: scale(11), color: C.muted, fontFamily: 'Inter_600SemiBold' },
  evolutionHint: {
    backgroundColor: '#FFF4E0', borderRadius: 12, padding: scale(10),
    borderWidth: 2, borderColor: '#F0C060', marginTop: 8,
  },
  evolutionHintText: { fontSize: scale(13), color: '#7A4800', fontFamily: 'Inter_700Bold', textAlign: 'center' },

  // Battle button
  battleBtnPurple: {
    backgroundColor: '#6B35F0', borderRadius: 100, paddingVertical: 20,
    alignItems: 'center', borderWidth: 2, borderColor: '#1A1A1A', ...SOLID_SHADOW,
  },
  battleBtnPurpleText: { fontSize: scale(20), fontFamily: 'Inter_900Black', color: '#fff', letterSpacing: -0.3 },

  // Legacy (kept for BossIntroScreen compatibility)
  countdownBox: { marginTop: scale(8), alignSelf: 'stretch', backgroundColor: 'rgba(255,255,255,0.92)', borderRadius: 14, paddingVertical: scale(10), borderWidth: 2, borderColor: '#1A1A1A' },
  countdownText: { color: '#1A1A1A', fontFamily: 'FredokaOne_400Regular', fontSize: scale(26), textAlign: 'center', letterSpacing: 2 },
});

// ─── Battle Flow Styles ───────────────────────────────────────────────────────

const bi = StyleSheet.create({
  badgePill: {
    alignSelf: 'center',
    backgroundColor: 'rgba(10,10,10,0.80)',
    borderRadius: 28, paddingHorizontal: 18, paddingVertical: 9,
    borderWidth: 1.5, borderColor: 'rgba(255,255,255,0.22)',
  },
  badgeText: {
    fontSize: scale(13), fontFamily: 'Inter_800ExtraBold', color: '#FFFFFF', letterSpacing: 1,
  },
  bossNameFallback: {
    fontSize: scale(72), fontFamily: 'Inter_900Black', color: '#FFFFFF',
    letterSpacing: -1, lineHeight: scale(76),
    textShadowColor: '#000', textShadowOffset: { width: 4, height: 5 }, textShadowRadius: 0,
  },
  tagline: {
    fontSize: scale(17), fontFamily: 'Inter_800ExtraBold', color: '#FFFFFF',
    letterSpacing: 0.3, lineHeight: scale(23), textAlign: 'center',
    textShadowColor: 'rgba(0,0,0,0.9)',
    textShadowOffset: { width: 2, height: 3 },
    textShadowRadius: 2,
  },
  rewardsPill: {
    alignSelf: 'center',
    backgroundColor: 'rgba(10,10,10,0.82)',
    borderRadius: 28, paddingHorizontal: 22, paddingVertical: 10,
    borderWidth: 1.5, borderColor: 'rgba(255,255,255,0.22)',
    marginBottom: -18,
    zIndex: 1,
  },
  rewardsPillText: {
    fontSize: scale(13), fontFamily: 'Inter_800ExtraBold', color: '#FFFFFF', letterSpacing: 2,
  },
  rewardsCard: {
    backgroundColor: '#FAF9F4', borderRadius: 20,
    borderWidth: 2.5, borderColor: '#1A1A1A',
    paddingTop: 32, paddingBottom: 22, paddingHorizontal: 16,
    flexDirection: 'row', justifyContent: 'space-around', alignItems: 'center',
    ...SOLID_SHADOW,
  },
  battleBtn: {
    backgroundColor: '#C5F215',
    borderRadius: 50, paddingVertical: 18, alignItems: 'center',
    borderWidth: 2.5, borderColor: '#1A1A1A',
    ...SOLID_SHADOW,
  },
  battleBtnText: {
    fontSize: scale(20), fontFamily: 'Inter_900Black', color: '#1A1A1A', letterSpacing: 0.5,
  },
});

const b = StyleSheet.create({
  // ── Battle Arena ──────────────────────────────────────────────────────────
  hpRow:           { flexDirection: 'row', gap: 8, paddingHorizontal: 12, paddingTop: 8, paddingBottom: 10 },
  hpCard:          { flex: 1, backgroundColor: C.surface, borderWidth: 2, borderColor: '#1A1A1A', borderRadius: 14, padding: 10, flexDirection: 'row', gap: 8, alignItems: 'center', ...SOLID_SHADOW },
  hpAvatarWell:    { width: 38, height: 38, borderRadius: 10, backgroundColor: C.warmBg, alignItems: 'center', justifyContent: 'center', borderWidth: 1.5, borderColor: C.border, flexShrink: 0 },
  hpName:          { fontSize: scale(12), fontFamily: 'Inter_700Bold', color: C.text },
  hpVal:           { fontSize: scale(11), fontFamily: 'Inter_700Bold', color: C.muted },
  hpTrack:         { height: 20, borderRadius: 100, backgroundColor: '#ECECEC', marginTop: 4, borderWidth: 2, borderColor: '#1A1A1A', padding: 2, overflow: 'hidden' },
  hpFill:          { flex: 1, borderRadius: 100, borderWidth: 2, borderColor: '#1A1A1A' },
  hpVs:            { fontSize: scale(11), fontFamily: 'Inter_900Black', color: C.border, alignSelf: 'center' },

  stage:           { flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-around', paddingHorizontal: 20, paddingBottom: 8, height: 160 },
  stageFighter:    { alignItems: 'center', gap: 6 },
  stageArtP:       { width: 100, height: 100, borderRadius: 16, backgroundColor: '#EAE4FF', borderWidth: 2, borderColor: '#1A1A1A', alignItems: 'center', justifyContent: 'center', ...SOLID_SHADOW },
  stageArtE:       { width: 100, height: 100, borderRadius: 16, backgroundColor: C.warmBg, borderWidth: 2, borderColor: '#1A1A1A', alignItems: 'center', justifyContent: 'center', ...SOLID_SHADOW },
  stageTag:        { fontSize: scale(11), fontFamily: 'Inter_700Bold', color: C.muted, backgroundColor: C.surface, borderRadius: 100, paddingHorizontal: 10, paddingVertical: 2, borderWidth: 1, borderColor: C.border },

  actionArea:      { flex: 1, paddingHorizontal: 14, justifyContent: 'flex-end', paddingBottom: 24, gap: 8 },
  spRow:           { flexDirection: 'row', gap: 8 },
  spCard:          { flex: 1, backgroundColor: C.surface, borderWidth: 2, borderColor: '#1A1A1A', borderRadius: 12, paddingVertical: 10, paddingHorizontal: 6, alignItems: 'center', gap: 2, ...SOLID_SHADOW },
  spCardZap:       { backgroundColor: '#EAF3FB' },
  spCardCharge:    { backgroundColor: '#F0F7F0' },
  spCardMega:      { backgroundColor: '#EAE4FF' },
  spOff:           { opacity: 0.35 },
  spEmoji:         { fontSize: scale(18) },
  spLabel:         { fontSize: scale(11), fontFamily: 'Inter_700Bold', color: C.text },
  spCost:          { fontSize: scale(10), fontFamily: 'Inter_700Bold', color: C.muted },
  coreRow:         { flexDirection: 'row', alignItems: 'center', gap: 8 },
  coreLabel:       { fontSize: scale(10), fontFamily: 'Inter_700Bold', letterSpacing: 1.5, color: '#6B35F0' },
  corePips:        { flex: 1, flexDirection: 'row', gap: 3 },
  corePip:         { flex: 1, height: 12, borderRadius: 3 },
  corePipOn:       { backgroundColor: '#6B35F0' },
  corePipOff:      { backgroundColor: C.border },
  coreCount:       { fontSize: scale(12), fontFamily: 'Inter_700Bold', color: '#6B35F0', minWidth: 20, textAlign: 'right' },

  // ── Mini-game shared ──────────────────────────────────────────────────────
  mgTitle:    { fontSize: scale(11), fontFamily: 'Inter_800ExtraBold', color: '#ABABAB', letterSpacing: 1.5 },
  mgInstr:    { fontSize: scale(15), fontFamily: 'Inter_700Bold', color: '#1A1A1A', textAlign: 'center' },
  mgMainBtn:  { backgroundColor: '#6B35F0', borderRadius: 100, paddingHorizontal: scale(40), paddingVertical: scale(18), borderWidth: 2, borderColor: '#1A1A1A', ...SOLID_SHADOW },
  mgMainBtnText: { color: '#fff', fontFamily: 'Inter_900Black', fontSize: scale(18) },
  mgBigTap:   { width: scale(130), height: scale(130), borderRadius: scale(65), backgroundColor: '#6B35F0', borderWidth: 3, borderColor: '#1A1A1A', alignItems: 'center', justifyContent: 'center', ...SOLID_SHADOW },

  // ── Card hand ─────────────────────────────────────────────────────────────
  handGrid:   { flexDirection: 'row', flexWrap: 'wrap', gap: 8, justifyContent: 'center' },
  handCard:   { width: '47%', borderRadius: 14, borderWidth: 2, borderColor: '#1A1A1A', paddingVertical: scale(12), paddingHorizontal: scale(10), alignItems: 'center', gap: 6, minHeight: scale(110), justifyContent: 'center', backgroundColor: '#FAF9F4', ...SOLID_SHADOW },
  handEmoji:  { fontSize: scale(22) },
  handLabel:  { fontFamily: 'FredokaOne_400Regular', fontSize: scale(24), color: '#1A1A1A', textAlign: 'center', lineHeight: scale(26) },
  handCost:   { fontSize: scale(12), fontFamily: 'Inter_600SemiBold', color: '#ABABAB' },
});

const auth = StyleSheet.create({
  backBtn:       { width: 44, height: 44, alignItems: 'center', justifyContent: 'center', marginBottom: 8 },
  backBtnText:   { fontSize: scale(24), color: '#1A1A1A', fontFamily: 'Inter_600SemiBold' },
  title:         { fontSize: scale(30), fontFamily: 'Inter_900Black', color: '#1A1A1A', marginBottom: 6 },
  subtitle:      { fontSize: scale(15), color: '#ABABAB' },
  inputRow:      { flexDirection: 'row', alignItems: 'center', borderRadius: 14, borderWidth: 2, borderColor: '#1A1A1A', backgroundColor: '#FFFFFF', paddingHorizontal: 14, paddingVertical: 14, gap: 10 },
  inputIcon:     { fontSize: scale(20) },
  textInput:     { flex: 1, fontSize: scale(16), color: '#1A1A1A', padding: 0 },
  dividerRow:    { flexDirection: 'row', alignItems: 'center', gap: 12 },
  dividerLine:   { flex: 1, height: 1, backgroundColor: '#ECEAE4' },
  dividerText:   { fontSize: scale(14), color: '#ABABAB', fontFamily: 'Inter_500Medium' },
  googleBtn:     { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, backgroundColor: '#FFFFFF', borderRadius: 14, borderWidth: 1.5, borderColor: '#ECEAE4', padding: 16 },
  googleBtnText: { fontSize: scale(16), fontFamily: 'Inter_700Bold', color: '#1A1A1A' },
  leafDecor:     { position: 'absolute', bottom: 60, left: -10, fontSize: scale(72), opacity: 0.5 },
  purpleBlob:    { position: 'absolute', bottom: 80, right: -20, borderRadius: 60, backgroundColor: '#6B35F0', opacity: 0.15, width: 120, height: 120 },
  sparkle:       { position: 'absolute', fontSize: scale(20), opacity: 0.6 },
});
