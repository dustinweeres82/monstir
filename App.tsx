
import { useState, useRef, useCallback, useEffect, useMemo, Fragment } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, ScrollView,
  StatusBar, Platform, Image, TextInput, Modal, KeyboardAvoidingView,
  Animated, Easing, Dimensions, PanResponder, ActionSheetIOS, FlatList, Pressable,
  ActivityIndicator, LogBox, AccessibilityInfo, AppState, type LayoutChangeEvent,
} from 'react-native';

// Suppress spurious dev-mode RN warning — not a real bug in this codebase
LogBox.ignoreLogs(['Text strings must be rendered within a <Text> component']);
import { SafeAreaView, SafeAreaProvider, useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Ellipse, Circle, Path, Polygon, Line, Defs, LinearGradient as SvgLinearGradient, RadialGradient, Stop } from 'react-native-svg';
import { EvolutionFX } from './src/components/EvolutionFX';
import { ChestReveal, type ChestTier } from './src/components/ChestReveal';
import { pickForTier, COLLECTIBLES } from './src/data/collectibles';
import { MascotBanner } from './src/components/MascotBanner';
import { CreamBg } from './src/components/CreamBg';
import { KidProfileCreation, getAvatarImage } from './src/screens/KidProfileCreation';

const PARENT_AVATAR_DAD = require('./assets/icons/Avatars/parentProfileDad.png');
const PARENT_AVATAR_MOM = require('./assets/icons/Avatars/parentProfileMom.png');
function getParentAvatar(role: string) {
  return role === 'dad' ? PARENT_AVATAR_DAD : PARENT_AVATAR_MOM;
}
import {
  socialAuthEnabled, googleEnabled, isAppleSignInAvailable,
  signInWithGoogle, signInWithApple, type SocialUser,
} from './src/lib/socialAuth';
import { canonicalizeEmail } from './src/lib/email';
import { ParentOnboarding } from './src/screens/ParentOnboarding';
import { KidWelcome, KwDebugValues, KW_DEBUG_DEFAULTS } from './src/screens/KidWelcome';
import { obc, obText, cardShadow, DotGridBg, ObButton, StepDots as ObStepDots, Tag, InfoDot, CodeCells, Keypad, ScreenEnter, Rise } from './src/screens/onboarding/obkit';
import { TrophyRoom } from './src/screens/TrophyRoom';
import { ParentMilestoneDetail } from './src/screens/ParentMilestoneDetail';
import { saveBossCapture, getBossCaptures, mergeBossCaptures, type BossCaptureEntry } from './src/storage/bossCaptures';
import { getBossDisplay } from './src/data/bossLookup';
import { getCollectibles, mergeCollectibles, type CollectibleEntry } from './src/storage/collectibles';
import { earnMilestone, getEarnedMilestones, mergeMilestones, PARENT_OWNER, type EarnedMilestone } from './src/storage/milestones';
import { evalKidMilestones, evalParentMilestones } from './src/lib/milestoneEval';
import { getMilestone, MILESTONES, KID_MILESTONES, type MilestoneDef } from './src/data/milestones';
import { MilestoneToast } from './src/components/MilestoneToast';
import { ErrorBoundary } from './src/components/ErrorBoundary';
import { ScreenHeading } from './src/design-system/components/ScreenHeading';
import { Button } from './src/design-system/components/Button';
import { ListCell } from './src/design-system/components/ListCell';
import { Toggle } from './src/design-system/components/Toggle';
import { FormField } from './src/design-system/components/FormField';
import { ProgressBar } from './src/design-system/components/ProgressBar';
import { PressableShadow } from './src/design-system/components/PressableShadow';
import { ScreenState } from './src/design-system/components/ScreenState';
import { ListRowSkeleton } from './src/design-system/components/Skeleton';
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
import { shadows, scale, fontSize, interFamily, nunitoFamily } from './src/design-system/tokens';
import { useScaleAnimation } from './src/design-system/hooks';
import { VideoView, useVideoPlayer } from 'expo-video';
import { setAudioModeAsync } from 'expo-audio';
import * as Haptics from 'expo-haptics';
import { LinearGradient } from 'expo-linear-gradient';
import * as Clipboard from 'expo-clipboard';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Constants from 'expo-constants';
import { supabase } from './src/lib/supabase';
import { saveOnboardingSetup, loadProfile, loadKids, loadChores, submitChoreCompletion, approveChoreCompletion, rejectChoreCompletion, saveBossCaptureToDb, saveCollectibleToDb, savePayoutToDb, updateKidStats, updateKid, renameKidInHistory, addKid, addChore, updateChore as updateChoreDb, deleteChore as deleteChoreDb, saveProfile, loadGoals, saveAppState, loadPayoutLog, saveMilestoneToDb, loadBossCaptures, loadCollectibles, loadMilestones, saveDisplayName, saveEmailAndPassword } from './src/lib/db';
import { initDebugLog, log, flushNow } from './src/lib/debugLog';
import { DebugTap } from './src/components/DebugTap';

const APP_VERSION = Constants.expoConfig?.version ?? null;

// ─── Disable system accessibility font scaling globally ───────────────────────
// Our scale() utility handles all proportional sizing; allowing the OS to also
// scale fonts causes double-scaling on accessibility text-size settings.
// @ts-ignore
Text.defaultProps = { ...(Text.defaultProps ?? {}), allowFontScaling: false };
// @ts-ignore
TextInput.defaultProps = { ...(TextInput.defaultProps ?? {}), allowFontScaling: false };

// ─── Types ────────────────────────────────────────────────────────────────────

type ChoreId = 'dishes' | 'trash' | 'bed' | 'vacuum' | 'laundry' | 'sweep' | 'wipe' | 'mop' | 'plants' | 'recycling' | 'windows' | 'bathroom';
type Tab     = 'home' | 'world' | 'wallet' | 'trophies';
type Screen  = Tab | 'boss-intro' | 'arena' | 'result' | 'goalFlow' | 'kidPayout' | 'chestReveal' | 'trophyRoom';
type MonsterIdx = 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7;

type ParentTab    = 'home' | 'chores' | 'money' | 'settings';
type ParentScreen = 'parentHome' | 'chores' | 'choreLibrary' | 'addChore' | 'editChore' | 'payRates' | 'rateGuide' | 'rewards' | 'settings' | 'parentPayout' | 'moneyLedger' | 'parentMilestones' | 'kidMilestones';
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
  video: ReturnType<typeof require> | { uri: string };
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

type ChoreStatus = 'active' | 'pending' | 'approved' | 'rejected';

interface ManagedChore {
  id: string; name: string; description: string;
  frequency: string; icon: string | number; bg: string;
  /** Global status (used for unassigned/everyone chores or as fallback) */
  status: ChoreStatus;
  rejectionNote?: string;
  difficulty: 1 | 2 | 3;
  assignedTo: string[];
  weeklyCompletions: number;
  /** Per-child status — keyed by child name. Takes precedence over global status. */
  childStatus?: Record<string, ChoreStatus>;
  /** Per-child rejection notes */
  childRejectionNote?: Record<string, string>;
  /**
   * How a multi-kid ("Everyone") chore is completed:
   *  - 'shared'      → one household task; first kid to finish earns it (global weeklyCompletions)
   *  - 'independent' → each kid has their own copy and own count (childCompletions)
   * Undefined / single-assignee chores behave as 'shared'.
   */
  completionMode?: 'shared' | 'independent';
  /** Per-child weekly completion counts — used when completionMode === 'independent'. */
  childCompletions?: Record<string, number>;
  /** ISO timestamp of when each child submitted (set to pending). Used to show submission time in review sheet. */
  childSubmittedAt?: Record<string, string>;
  /**
   * Backlog of submissions awaiting approval that carried over from PREVIOUS days,
   * keyed by child name. This does NOT include today's live `pending` status — the
   * total awaiting approval for a kid is this backlog plus (today pending ? 1 : 0).
   * Lets daily chores accumulate in the approval queue instead of blocking the kid.
   */
  childPendingCount?: Record<string, number>;
  /**
   * FIFO of cent amounts snapshotted at submit time, one entry per pending unit
   * (oldest first — backlog before today's live pending), keyed by child name.
   * Approval/rejection consumes the head. This pins pay to the rate/difficulty
   * in effect when the kid DID the work, so later edits can't change what's owed.
   * Entries can be missing for submissions made before this field existed —
   * consumers fall back to recomputing from the current rate.
   */
  childPendingCents?: Record<string, number[]>;
  /**
   * FIFO of XP amounts snapshotted at submit time, parallel to childPendingCents.
   * The streak bonus is applied here (first chore of a new day only — same rule
   * as the auto-approve path), so approval timing and batch size can't change
   * how much bonus XP a submission earns.
   */
  childPendingXp?: Record<string, number[]>;
}

// ─── Data ─────────────────────────────────────────────────────────────────────

const CHORES: Chore[] = [
  { id: 'dishes',   name: 'Wash the dishes',          icon: require('./assets/icons/chores/chore=iconDishes.png'),  bg: '#FFF9E6', xp: 10, multiplier: 1.0 },
  { id: 'trash',    name: 'Take out the trash',        icon: require('./assets/icons/chores/chore=iconGarbage.png'), bg: '#F0F7F0', xp: 10, multiplier: 1.0 },
  { id: 'bed',      name: 'Make your bed',              icon: require('./assets/icons/chores/chore=iconBed.png'),     bg: '#EAF3FB', xp: 10, multiplier: 0.5 },
  { id: 'vacuum',   name: 'Vacuum the living room',    icon: require('./assets/icons/chores/chore=iconVacuum.png'),  bg: '#F5F0FB', xp: 25, multiplier: 2.0 },
  { id: 'laundry',  name: 'Put away laundry',           icon: require('./assets/icons/chores/chore=iconLaundry.png'), bg: '#FFF0F0', xp: 10, multiplier: 1.0 },
  { id: 'sweep',    name: 'Sweep the kitchen',          icon: require('./assets/icons/chores/chore=iconBroom.png'),   bg: '#FFF9E6', xp: 10, multiplier: 1.0 },
  { id: 'wipe',     name: 'Wipe down counters',         icon: require('./assets/icons/chores/chore=iconSoap.png'),    bg: '#F0F7F0', xp: 10, multiplier: 0.5 },
  { id: 'mop',      name: 'Mop the floor',              icon: require('./assets/icons/chores/chore=iconSoap.png'),    bg: '#EAF3FB', xp: 25, multiplier: 1.5 },
  { id: 'plants',   name: 'Water the plants',           icon: '🪴',                                            bg: '#F0F7F0', xp: 10, multiplier: 0.5 },
  { id: 'recycling',name: 'Sort the recycling',         icon: require('./assets/icons/chores/chore=iconGarbage.png'), bg: '#F0F7F0', xp: 10, multiplier: 0.5 },
  { id: 'windows',  name: 'Clean the windows',          icon: '🪟',                                            bg: '#EAF3FB', xp: 10, multiplier: 1.0 },
  { id: 'bathroom', name: 'Clean the bathroom',         icon: require('./assets/icons/chores/chore=iconSoap.png'),    bg: '#F5F0FB', xp: 25, multiplier: 2.5 },
];

/** Base-rate dollars (free-text settings input) → cents. NaN-safe: an empty or
 *  malformed rate reads as 0 instead of poisoning every balance with NaN. */
const baseRateCents = (baseRate: string): number => {
  const v = parseFloat(baseRate);
  return Number.isFinite(v) && v > 0 ? Math.round(v * 100) : 0;
};

const choreCoins = (chore: Chore, baseRate: string): number =>
  Math.round(baseRateCents(baseRate) * chore.multiplier);

/** Get the effective status for a chore for a specific child */
const getChoreStatus = (chore: ManagedChore, kidName: string): ChoreStatus => {
  if (chore.childStatus && kidName in chore.childStatus) return chore.childStatus[kidName];
  return chore.status;
};

/** Whether a chore tracks completions independently per child.
 *  - Everyone chores: governed by the explicit completionMode toggle.
 *  - Chores assigned to several specific kids (no toggle): each kid does their
 *    own copy, so they're independent by default. */
const isIndependentChore = (chore: ManagedChore): boolean =>
  chore.completionMode === 'independent' ||
  (chore.completionMode == null && chore.assignedTo.length > 1);

/** Effective weekly completion count for a chore, for a specific child. */
const getChoreCompletions = (chore: ManagedChore, kidName: string): number =>
  isIndependentChore(chore)
    ? chore.childCompletions?.[kidName] ?? 0
    : chore.weeklyCompletions ?? 0;

/** Names of the kids a chore applies to. Empty assignedTo means "everyone". */
const choreEligibleKids = (chore: ManagedChore, allKidNames: string[]): string[] =>
  chore.assignedTo.length === 0 ? allKidNames : chore.assignedTo;

/**
 * Total number of submissions awaiting parent approval for a kid:
 * the carried-over backlog plus today's live `pending` status (if any).
 */
const getPendingCount = (chore: ManagedChore, kidName: string): number =>
  (chore.childPendingCount?.[kidName] ?? 0) + (getChoreStatus(chore, kidName) === 'pending' ? 1 : 0);

/**
 * How many times a kid has "claimed" a chore this week across ALL states —
 * approved completions plus everything awaiting approval (today's pending +
 * carried-over backlog). A chore must never be doable more than its weekly
 * target times, counting every state, so this is what the weekly cap checks.
 */
const getClaimedCount = (chore: ManagedChore, kidName: string): number =>
  getChoreCompletions(chore, kidName) + getPendingCount(chore, kidName);

/** Bumps a kid's weekly completion count by one WITHOUT touching their status.
 *  Used when approving a backlog item (a prior day's submission) so today's
 *  fresh instance is left untouched. */
function bumpCompletionCount(chore: ManagedChore, kidName: string): ManagedChore {
  if (isIndependentChore(chore)) {
    return { ...chore, childCompletions: { ...chore.childCompletions, [kidName]: (chore.childCompletions?.[kidName] ?? 0) + 1 } };
  }
  return { ...chore, weeklyCompletions: (chore.weeklyCompletions ?? 0) + 1 };
}

/** Drop the oldest snapshotted pending amounts (cents + XP) for a kid (no-op when empty). */
function shiftPendingCents(chore: ManagedChore, kidName: string): ManagedChore {
  const cents = chore.childPendingCents?.[kidName];
  const xp    = chore.childPendingXp?.[kidName];
  if ((!cents || cents.length === 0) && (!xp || xp.length === 0)) return chore;
  return {
    ...chore,
    childPendingCents: cents && cents.length > 0 ? { ...chore.childPendingCents, [kidName]: cents.slice(1) } : chore.childPendingCents,
    childPendingXp:    xp    && xp.length > 0    ? { ...chore.childPendingXp,    [kidName]: xp.slice(1) }    : chore.childPendingXp,
  };
}

/** Decrement a kid's carried-over pending backlog by one (floored at 0). */
function decPendingBacklog(chore: ManagedChore, kidName: string): ManagedChore {
  const cur = chore.childPendingCount?.[kidName] ?? 0;
  if (cur <= 0) return chore;
  return { ...chore, childPendingCount: { ...chore.childPendingCount, [kidName]: cur - 1 } };
}

/** Household-wide weekly chore totals. Independent chores count once per
 *  eligible kid (each must do their own); shared chores count once. */
function householdChoreTotals(chores: ManagedChore[], allKidNames: string[]): { target: number; done: number } {
  let target = 0, done = 0;
  for (const c of chores) {
    if (isIndependentChore(c)) {
      const kids = choreEligibleKids(c, allKidNames);
      target += frequencyToWeeklyTarget(c.frequency) * kids.length;
      done   += kids.reduce((s, k) => s + (c.childCompletions?.[k] ?? 0), 0);
    } else {
      target += frequencyToWeeklyTarget(c.frequency);
      done   += c.weeklyCompletions ?? 0;
    }
  }
  return { target, done };
}

/**
 * Returns a copy of `chore` with one completion applied for `kidName`.
 *  - independent → bumps that kid's own count, marks only that kid approved
 *  - shared / single-assignee → bumps the single household count and marks all
 *    eligible kids approved (first to finish "earns it" for everyone that day)
 */
function applyChoreCompletion(chore: ManagedChore, kidName: string, allKidNames: string[]): ManagedChore {
  if (isIndependentChore(chore)) {
    return {
      ...chore,
      childStatus:      { ...chore.childStatus, [kidName]: 'approved' as ChoreStatus },
      childCompletions: { ...chore.childCompletions, [kidName]: (chore.childCompletions?.[kidName] ?? 0) + 1 },
    };
  }
  const childStatus: Record<string, ChoreStatus> = { ...chore.childStatus };
  for (const k of choreEligibleKids(chore, allKidNames)) childStatus[k] = 'approved';
  return {
    ...chore,
    status: 'approved' as ChoreStatus,
    weeklyCompletions: (chore.weeklyCompletions ?? 0) + 1,
    childStatus,
  };
}

/** Get the effective rejection note for a chore for a specific child */
const getChoreRejectionNote = (chore: ManagedChore, kidName: string): string | undefined => {
  if (chore.childRejectionNote && kidName in chore.childRejectionNote) return chore.childRejectionNote[kidName];
  return chore.rejectionNote;
};

// Per-chore micro-reward formatter: ¢ under a dollar, $ at/above. Reserved for
// individual chore reward values in the Activity feed (MON-75 Rev 6) — NOT totals.
const fmtCoins = (cents: number): string =>
  cents >= 100 ? `$${(cents / 100).toFixed(2)}` : `${cents}¢`;

// Totals / balances always render in dollars ($0.50, $15.75, $0.00) — MON-75
// Rev 6 convention. Use this for every owed/paid/earned total and pay CTA.
const fmtDollars = (cents: number): string => `$${(cents / 100).toFixed(2)}`;

const MONSTER_FALLBACK_NAMES = [
  'Zorp','Gloop','Fizzle','Blorp','Snuggz','Wumbo','Glitch','Zappy',
  'Munchie','Wobble','Boing','Squigg','Noodlz','Chompy','Flapz','Zumi',
];
/** Deterministic fallback monster name per kid: stable across restarts (no
 *  surprise renames) and different siblings get different names. */
const fallbackNameForKid = (kidName: string): string => {
  let h = 0;
  for (let i = 0; i < kidName.length; i++) h = (h * 31 + kidName.charCodeAt(i)) >>> 0;
  return MONSTER_FALLBACK_NAMES[h % MONSTER_FALLBACK_NAMES.length];
};

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
    video: { uri: 'https://pub-02af5b05c8cb4ae4a4d7374fd7384d7b.r2.dev/bosses/intros/boss_intro-lint_lurker.mp4' },
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
    video: { uri: 'https://pub-02af5b05c8cb4ae4a4d7374fd7384d7b.r2.dev/bosses/intros/boss_intro-toothpaste.mp4' },
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
    video: { uri: 'https://pub-02af5b05c8cb4ae4a4d7374fd7384d7b.r2.dev/bosses/intros/boss_intro-cracklebug.mp4' },
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
    video: { uri: 'https://pub-02af5b05c8cb4ae4a4d7374fd7384d7b.r2.dev/bosses/intros/boss_intro-the_pile.mp4' },
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
    video: { uri: 'https://pub-02af5b05c8cb4ae4a4d7374fd7384d7b.r2.dev/bosses/intros/boss_intro-junk_giant.mp4' },
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
    video: { uri: 'https://pub-02af5b05c8cb4ae4a4d7374fd7384d7b.r2.dev/bosses/intros/boss_intro-the_clatter.mp4' },
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
    video: { uri: 'https://pub-02af5b05c8cb4ae4a4d7374fd7384d7b.r2.dev/bosses/intros/boss_intro-grimelord.mp4' },
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
    video: { uri: 'https://pub-02af5b05c8cb4ae4a4d7374fd7384d7b.r2.dev/bosses/intros/boss_intro-forkfang.mp4' },
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
    video: { uri: 'https://pub-02af5b05c8cb4ae4a4d7374fd7384d7b.r2.dev/bosses/intros/boss_intro-vacuumbite.mp4' },
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
    video: { uri: 'https://pub-02af5b05c8cb4ae4a4d7374fd7384d7b.r2.dev/bosses/intros/boss_intro-the_overflow.mp4' },
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
    video: { uri: 'https://pub-02af5b05c8cb4ae4a4d7374fd7384d7b.r2.dev/bosses/intros/boss_intro-mildew_queen.mp4' },
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
    video: { uri: 'https://pub-02af5b05c8cb4ae4a4d7374fd7384d7b.r2.dev/bosses/intros/boss_intro-dishocalypse.mp4' },
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
    video: { uri: 'https://pub-02af5b05c8cb4ae4a4d7374fd7384d7b.r2.dev/bosses/intros/boss_intro-void_fridge.mp4' },
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
    video: { uri: 'https://pub-02af5b05c8cb4ae4a4d7374fd7384d7b.r2.dev/bosses/intros/boss_intro-the_forgotten.mp4' },
    bossImage: require('./assets/bosses/boss=forgotten.png'),
    tiers: [7],
    threat: 'Extreme', threatNote: 'The ultimate test. 100% completion or bust.',
    hp: 240, attackMin: 28, attackMax: 40, zapZone: 'very-narrow',
  },
];

/** Returns this week's boss for the child's current evolution tier.
 *  Rotates through the eligible pool once per app week. The index derives from
 *  the local Monday week key — NOT raw epoch weeks, whose buckets flip on
 *  Thursdays UTC and would swap the boss mid-week between the Mon–Sat teaser
 *  and the Sunday battle. Honors debug day-scrubbing via offsetDays. */
function getWeeklyBoss(monsterIdx: MonsterIdx, offsetDays = 0): Boss {
  const pool = BOSSES.filter(b => b.tiers.includes(monsterIdx));
  if (!pool.length) return BOSSES[0];
  const week = Math.floor(new Date(getWeekMondayKey(offsetDays)).getTime() / (7 * 24 * 60 * 60 * 1000));
  return pool[week % pool.length];
}

/** Returns the locked boss if one escaped, otherwise falls back to the weekly rotation. */
function resolveCurrentBoss(monsterIdx: MonsterIdx, lockedBossName: string | null, offsetDays = 0): Boss {
  if (lockedBossName) {
    const locked = BOSSES.find(b => b.name === lockedBossName);
    if (locked) return locked;
  }
  return getWeeklyBoss(monsterIdx, offsetDays);
}

// ─── Cooperative household boss (MON-84) ────────────────────────────────────
// The whole family faces ONE boss identity; each kid fights a tier-scaled
// *instance* of it. Combat stats come from the kid's own tier (so the fight is
// always fair), while the identity (name/art/weakness/tagline) is shared.
type BossStats = Pick<Boss, 'hp' | 'attackMin' | 'attackMax' | 'threat' | 'power' | 'bonus' | 'captureCoins' | 'zapZone'>;

// One representative stat block per monster tier, taken from the boss native to
// that tier. Stable (not week-dependent) so a kid's instance difficulty doesn't
// drift mid-cycle.
const STATS_BY_TIER: BossStats[] = MONSTERS.map((_, tier) => {
  const ref = BOSSES.find(b => b.tiers.includes(tier)) ?? BOSSES[0];
  return { hp: ref.hp, attackMin: ref.attackMin, attackMax: ref.attackMax, threat: ref.threat, power: ref.power, bonus: ref.bonus, captureCoins: ref.captureCoins, zapZone: ref.zapZone };
});

/** A kid's instance of the shared household boss: the household identity wearing
 *  the combat stats of the kid's own monster tier. */
function bossForKid(identity: Boss, kidMonsterIdx: MonsterIdx): Boss {
  return { ...identity, ...(STATS_BY_TIER[kidMonsterIdx] ?? STATS_BY_TIER[0]) };
}

/** Picks the household boss identity, anchored to the household's highest monster
 *  tier so it looks appropriately scary. `excludeName` avoids immediately
 *  repeating the boss just captured (advances one slot in that tier's pool). */
function pickHouseholdBoss(householdTier: MonsterIdx, offsetDays = 0, excludeName?: string): Boss {
  const base = getWeeklyBoss(householdTier, offsetDays);
  if (!excludeName || base.name !== excludeName) return base;
  const pool = BOSSES.filter(b => b.tiers.includes(householdTier));
  if (pool.length <= 1) return base;
  const idx = pool.findIndex(b => b.name === excludeName);
  return pool[(idx + 1) % pool.length];
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

/** Monday date-string (toDateString) for the week containing an arbitrary date. */
function weekMondayKeyForDate(date: Date): string {
  const d = new Date(date);
  const day = d.getDay(); // 0=Sun
  const diff = day === 0 ? -6 : 1 - day; // Mon of this week
  d.setDate(d.getDate() + diff);
  d.setHours(0, 0, 0, 0);
  return d.toDateString();
}

/** "Week of Jun 2" label from a Monday date-string. */
function weekOfLabel(mondayKey: string): string {
  return 'Week of ' + new Date(mondayKey).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

type UnpaidWeek = { weekKey: string; label: string; choreCount: number; earnedCents: number };

/**
 * Per-week breakdown of a kid's unpaid chore earnings — everything approved
 * since their most recent payout (payouts zero the balance, so anything after
 * the last payAt is still owed). Weeks with zero chores never appear because
 * the map is built only from chore-history entries.
 */
function getUnpaidWeeks(
  kidName: string,
  choreHistory: { kidName: string; earnedCents: number; approvedAt: string }[],
  payoutLog: { kidName: string; paidAt: string }[],
): UnpaidWeek[] {
  const lastPaidAt = payoutLog
    .filter(p => p.kidName === kidName)
    .reduce<string | null>((latest, p) => (!latest || p.paidAt > latest ? p.paidAt : latest), null);
  const byWeek = new Map<string, { count: number; cents: number }>();
  choreHistory.forEach(e => {
    if (e.kidName !== kidName) return;
    if (lastPaidAt && e.approvedAt <= lastPaidAt) return;
    const key = weekMondayKeyForDate(new Date(e.approvedAt));
    const cur = byWeek.get(key) ?? { count: 0, cents: 0 };
    cur.count += 1;
    cur.cents += e.earnedCents;
    byWeek.set(key, cur);
  });
  return [...byWeek.entries()]
    .filter(([, v]) => v.count > 0)
    .map(([key, v]) => ({ weekKey: key, label: weekOfLabel(key), choreCount: v.count, earnedCents: v.cents }))
    .sort((a, b) => new Date(a.weekKey).getTime() - new Date(b.weekKey).getTime());
}

type WeekHistoryRow = {
  weekKey: string;
  label: string;        // "This week" | "Last week" | "N weeks ago"
  earnedCents: number;
  choreCount: number;
  paid: boolean;
  paidLabel: string;    // "Paid Sunday" when paid, else ""
};

/** Per-week earnings history for the kid Wallet "By week" list (MON-34) — every
 *  week with approved chores, newest first, each marked paid (green ✓ + the
 *  payout's weekday) or still-owed. A week counts as paid once a payout landed
 *  after its last approval; payouts always clear the full balance, so any earlier
 *  week is fully covered. Capped to the most recent 8 weeks. */
function getKidWeeklyHistory(
  kidName: string,
  choreHistory: { kidName: string; earnedCents: number; approvedAt: string }[],
  payoutLog: { kidName: string; paidAt: string }[],
  debugDayOffset = 0,
): WeekHistoryRow[] {
  const payouts = payoutLog.filter(p => p.kidName === kidName).map(p => p.paidAt).sort();
  const byWeek = new Map<string, { count: number; cents: number; latest: string }>();
  choreHistory.forEach(e => {
    if (e.kidName !== kidName) return;
    const key = weekMondayKeyForDate(new Date(e.approvedAt));
    const cur = byWeek.get(key) ?? { count: 0, cents: 0, latest: '' };
    cur.count += 1;
    cur.cents += e.earnedCents;
    if (e.approvedAt > cur.latest) cur.latest = e.approvedAt;
    byWeek.set(key, cur);
  });
  const currentMonday = new Date(getWeekMondayKey(debugDayOffset)).getTime();
  return [...byWeek.entries()]
    .map(([key, v]) => {
      const coveringPaidAt = payouts.find(at => at >= v.latest) ?? null;
      const weeksAgo = Math.round((currentMonday - new Date(key).getTime()) / (7 * 86_400_000));
      const label = weeksAgo <= 0 ? 'This week' : weeksAgo === 1 ? 'Last week' : `${weeksAgo} weeks ago`;
      const paidLabel = coveringPaidAt
        ? `Paid ${new Date(coveringPaidAt).toLocaleDateString('en-US', { weekday: 'long' })}`
        : '';
      return { weekKey: key, label, earnedCents: v.cents, choreCount: v.count, paid: coveringPaidAt !== null, paidLabel };
    })
    .sort((a, b) => new Date(b.weekKey).getTime() - new Date(a.weekKey).getTime())
    .slice(0, 8);
}

// ─── Single-ledger selectors (MON-75) ──────────────────────────────────────
// One source of truth for every money figure on Home, Money, and the kid peek.
// Before this, Home derived "owed" while Money derived "paid/unpaid" on their
// own, so the same week could show two contradictory numbers (the "two
// witnesses" trust bug). Everything is derived here from the durable records —
// `choreHistory` (approved chores) and `payoutLog` (real-world handoffs) — plus
// the live unpaid balance (`kidCoins`), which uniquely also carries battle-bonus
// coins that never land in `choreHistory`. All figures are cents.

type KidLedger = {
  kidName:             string;
  owedCents:           number;        // unpaid balance owed to this kid (incl. battle bonus)
  paidLifetimeCents:   number;        // sum of all payouts to this kid
  earnedLifetimeCents: number;        // paid + owed — consistent with the two by construction
  earnedThisWeekCents: number;        // approved chores Mon→now (chores only)
  unpaidWeeks:         UnpaidWeek[];   // per-week breakdown of the chore portion of `owed`
  bonusOwedCents:      number;        // owed not tied to any chore week (battle bonus etc.)
  pastDueCents:        number;        // owed from a week earlier than the current one
};

/** Build one kid's ledger slice. `owedCents` is the live unpaid balance
 *  (`kidCoins[name]`) — the source of truth for what's owed, since it alone
 *  includes battle-bonus credit. Earned-lifetime is defined as paid + owed so
 *  the three headline figures can never contradict each other. */
function computeKidLedger(
  kidName: string,
  owedCents: number,
  choreHistory: { kidName: string; earnedCents: number; approvedAt: string }[],
  payoutLog: { kidName: string; amount: number; paidAt: string }[],
  debugDayOffset = 0,
): KidLedger {
  const weekStart      = new Date(getWeekMondayKey(debugDayOffset));
  const currentWeekKey = getWeekMondayKey(debugDayOffset);
  const paidLifetimeCents = payoutLog
    .filter(p => p.kidName === kidName)
    .reduce((s, p) => s + p.amount, 0);
  const earnedThisWeekCents = choreHistory
    .filter(e => e.kidName === kidName && new Date(e.approvedAt) >= weekStart)
    .reduce((s, e) => s + e.earnedCents, 0);
  const unpaidWeeks = getUnpaidWeeks(kidName, choreHistory, payoutLog);
  const weeksTotal  = unpaidWeeks.reduce((s, w) => s + w.earnedCents, 0);
  const pastDueCents = unpaidWeeks
    .filter(w => w.weekKey !== currentWeekKey && new Date(w.weekKey) < new Date(currentWeekKey))
    .reduce((s, w) => s + w.earnedCents, 0);
  return {
    kidName,
    owedCents,
    paidLifetimeCents,
    earnedLifetimeCents: paidLifetimeCents + owedCents,
    earnedThisWeekCents,
    unpaidWeeks,
    // Anything owed beyond the chore weeks is battle-bonus / uncategorized credit.
    bonusOwedCents: Math.max(0, owedCents - weeksTotal),
    pastDueCents,
  };
}

type FamilyLedger = {
  perKid:              KidLedger[];
  owedCents:           number;
  paidLifetimeCents:   number;
  earnedLifetimeCents: number;
  earnedThisWeekCents: number;
  kidsOwedCount:       number;        // how many kids have a nonzero balance
};

/** Family-wide rollup — every total is just the sum of the per-kid slices, so
 *  the family numbers and the per-kid numbers are guaranteed to agree. */
function computeFamilyLedger(
  kidNames: string[],
  kidCoins: Record<string, number>,
  choreHistory: { kidName: string; earnedCents: number; approvedAt: string }[],
  payoutLog: { kidName: string; amount: number; paidAt: string }[],
  debugDayOffset = 0,
): FamilyLedger {
  const perKid = kidNames.map(n => computeKidLedger(n, kidCoins[n] ?? 0, choreHistory, payoutLog, debugDayOffset));
  return {
    perKid,
    owedCents:           perKid.reduce((s, k) => s + k.owedCents, 0),
    paidLifetimeCents:   perKid.reduce((s, k) => s + k.paidLifetimeCents, 0),
    earnedLifetimeCents: perKid.reduce((s, k) => s + k.earnedLifetimeCents, 0),
    earnedThisWeekCents: perKid.reduce((s, k) => s + k.earnedThisWeekCents, 0),
    kidsOwedCount:       perKid.filter(k => k.owedCents > 0).length,
  };
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
    case 'Every day':
    case 'daily':            return 7;
    case '3 times per week':
    case '3x':               return 3;
    case '2 times per week':
    case '2x':               return 2;
    case 'Once a week':
    case 'weekly':
    case '1x':               return 1;
    case 'As needed':        return 1;
    default:                 return 1;
  }
}

/** Returns today's date string, offset by `days` for debug simulation. */
function getSimulatedToday(offsetDays: number = 0): string {
  if (offsetDays === 0) return new Date().toDateString();
  return new Date(Date.now() + offsetDays * 86_400_000).toDateString();
}

/** Whole calendar days from one toDateString() to another (today - prev).
 *  Returns null if `prevDateStr` is empty/unparseable (e.g. first ever chore). */
function daysBetween(prevDateStr: string, todayStr: string): number | null {
  if (!prevDateStr) return null;
  const prev = new Date(prevDateStr);
  const today = new Date(todayStr);
  if (isNaN(prev.getTime()) || isNaN(today.getTime())) return null;
  prev.setHours(0, 0, 0, 0);
  today.setHours(0, 0, 0, 0);
  return Math.round((today.getTime() - prev.getTime()) / 86_400_000);
}

/** Next streak value when a chore is completed.
 *  - same day as last activity → unchanged
 *  - exactly the day after → +1 (streak continues)
 *  - first ever, or a gap of 2+ days → resets to 1 (a single missed day breaks it) */
function nextStreak(currentStreak: number, lastChoreDate: string, today: string): number {
  if (lastChoreDate === today) return currentStreak;      // already counted today
  return daysBetween(lastChoreDate, today) === 1 ? currentStreak + 1 : 1;
}

/** The streak as it stands *right now*, for display and battle mechanics.
 *  A stored streak only stays "alive" if the last activity was today or
 *  yesterday; once a full day is missed it reads as 0 immediately — without
 *  waiting for the next chore to recompute it. */
function liveStreak(currentStreak: number, lastChoreDate: string, today: string): number {
  const gap = daysBetween(lastChoreDate, today);
  if (gap === null) return 0;
  return gap === 0 || gap === 1 ? currentStreak : 0;
}

/** Resets eligible chores to 'active' at the start of a new day.
 *  A chore reappears for a kid only while they're still under the weekly target,
 *  counting EVERY state — approved, pending, and carried-over backlog. So a
 *  2×/week chore never exists as more than 2 instances in a week, no matter how
 *  approvals are timed. 'pending' chores roll into the backlog so the parent can
 *  still approve them. */
function applyDailyReset(chores: ManagedChore[]): ManagedChore[] {
  return chores.map(c => {
    const target      = frequencyToWeeklyTarget(c.frequency);
    const independent = isIndependentChore(c);
    // Shared chores gate on the single household count — including anything still
    // awaiting approval — so the board doesn't reappear past the weekly target.
    if (!independent) {
      const sharedPending = Object.values(c.childPendingCount ?? {}).reduce((a, b) => a + b, 0)
        + Object.values(c.childStatus ?? {}).filter(s => s === 'pending').length;
      if ((c.weeklyCompletions ?? 0) + sharedPending >= target) return c;
    }

    let updated: ManagedChore = { ...c };

    // Reset global status
    if (c.status === 'approved' || c.status === 'rejected') {
      updated = { ...updated, status: 'active' as const, rejectionNote: undefined };
    }

    // Reset per-child status so recurring chores reappear for each kid each day,
    // but only while that kid is under the weekly target across all states.
    if (c.childStatus) {
      const newChildStatus: Record<string, ChoreStatus> = {};
      const newChildRejectionNote: Record<string, string> = { ...(c.childRejectionNote ?? {}) };
      const newPendingCount: Record<string, number> = { ...(c.childPendingCount ?? {}) };
      for (const [kid, st] of Object.entries(c.childStatus)) {
        // Claimed = approved + backlog + today's pending (the one being rolled over).
        const approved = independent ? (c.childCompletions?.[kid] ?? 0) : (c.weeklyCompletions ?? 0);
        const claimed  = approved + (c.childPendingCount?.[kid] ?? 0) + (st === 'pending' ? 1 : 0);
        const kidDone  = claimed >= target;
        if (st === 'pending') {
          // Waiting-for-approval submission rolls into the backlog (stays in the
          // parent's queue). A fresh instance reopens only if still under target;
          // otherwise the kid has met their weekly quota and sees it as done.
          newPendingCount[kid] = (newPendingCount[kid] ?? 0) + 1;
          newChildStatus[kid] = kidDone ? 'approved' : 'active';
        } else if ((st === 'approved' || st === 'rejected') && !kidDone) {
          newChildStatus[kid] = 'active';
          delete newChildRejectionNote[kid];
        } else {
          newChildStatus[kid] = st as ChoreStatus;
        }
      }
      updated = { ...updated, childStatus: newChildStatus, childRejectionNote: newChildRejectionNote, childPendingCount: newPendingCount };
    }

    return updated;
  });
}

const DIFFICULTY_MULTIPLIERS: Record<1 | 2 | 3, number> = { 1: 1.0, 2: 1.5, 3: 2.0 };
const XP_BY_DIFFICULTY:      Record<1 | 2 | 3, number> = { 1: 10,  2: 25,  3: 50  };
const DIFFICULTY_LABELS: Record<1 | 2 | 3, string> = { 1: 'Easy', 2: 'Medium', 3: 'Hard' };

// bg colors are sampled from each PNG icon's own background so the tile blends
// seamlessly with the artwork. Emoji entries keep a hand-picked pastel.
const CHORE_ICONS: { icon: string | number; bg: string }[] = [
  { icon: require('./assets/icons/chores/chore=iconBed.png'),     bg: '#FEF1D4' },
  { icon: require('./assets/icons/chores/chore=iconLaundry.png'), bg: '#E5F3FD' },
  { icon: '☕',                                             bg: '#FFF0E6' },
  { icon: require('./assets/icons/chores/chore=iconGarbage.png'), bg: '#FEE1E9' },
  { icon: '🐾',                                             bg: '#FFF9E6' },
  { icon: '🪴',                                             bg: '#F0F7F0' },
  { icon: require('./assets/icons/chores/chore=iconDishes.png'),  bg: '#FEEDD8' },
  { icon: require('./assets/icons/chores/chore=iconBroom.png'),   bg: '#FDEBE5' },
  { icon: require('./assets/icons/chores/chore=iconSoap.png'),    bg: '#E3F5DD' },
  { icon: require('./assets/icons/chores/chore=iconVacuum.png'),  bg: '#EDE4F7' },
  // New icons — appended so existing saved icons (idx:0–9) keep their meaning.
  { icon: require('./assets/icons/chores/chore=iconBag.png'),         bg: '#E4F1FB' },
  { icon: require('./assets/icons/chores/chore=iconBook.png'),        bg: '#FFF0D2' },
  { icon: require('./assets/icons/chores/chore=iconDishwasher.png'),  bg: '#FDE3E9' },
  { icon: require('./assets/icons/chores/chore=iconDuster.png'),      bg: '#FEF2D8' },
  { icon: require('./assets/icons/chores/chore=iconGroceries.png'),   bg: '#EFE7FA' },
  { icon: require('./assets/icons/chores/chore=iconLights.png'),      bg: '#E8F5E1' },
  { icon: require('./assets/icons/chores/chore=iconMicrowave.png'),   bg: '#FEF1D5' },
  { icon: require('./assets/icons/chores/chore=iconPetfood.png'),     bg: '#E8F5E1' },
  { icon: require('./assets/icons/chores/chore=iconRecycling.png'),   bg: '#F0E9F6' },
  { icon: require('./assets/icons/chores/chore=iconSink.png'),        bg: '#E1EFFB' },
  { icon: require('./assets/icons/chores/chore=iconSpraybottle.png'), bg: '#E3F0FC' },
  { icon: require('./assets/icons/chores/chore=iconToothbrush.png'),  bg: '#EFE6FA' },
  { icon: require('./assets/icons/chores/chore=iconToys.png'),        bg: '#FDE9DB' },
  { icon: require('./assets/icons/chores/chore=iconWashmachine.png'), bg: '#E8F5E1' },
  { icon: require('./assets/icons/chores/chore=iconWateringcan.png'), bg: '#E8F5E1' },
  { icon: require('./assets/icons/chores/chore=iconWindows.png'),     bg: '#FDEDE0' },
];

// Serialize a chore icon for Supabase storage (icon is require() number or emoji string).
function serializeChoreIcon(icon: string | number): string {
  if (typeof icon === 'string') return icon; // emoji — store as-is
  const idx = CHORE_ICONS.findIndex(c => c.icon === icon);
  return idx >= 0 ? `idx:${idx}` : '';
}

// Maps chore-ID strings (stored in Supabase) → require() image sources.
const CHORE_ICON_BY_ID: Record<string, ReturnType<typeof require>> = {
  make_bed:      require('./assets/icons/chores/chore=iconBed.png'),
  tidy_room:     require('./assets/icons/chores/chore=iconBroom.png'),
  put_clothes:   require('./assets/icons/chores/chore=iconLaundry.png'),
  water_plants:  require('./assets/icons/chores/chore=iconSoap.png'),
  set_table:     require('./assets/icons/chores/chore=iconDishes.png'),
  unload_dishes: require('./assets/icons/chores/chore=iconDishes.png'),
  take_trash:    require('./assets/icons/chores/chore=iconGarbage.png'),
  pack_bag:      require('./assets/icons/chores/chore=iconBroom.png'),
  vacuum:        require('./assets/icons/chores/chore=iconVacuum.png'),
  laundry:       require('./assets/icons/chores/chore=iconLaundry.png'),
  wash_dishes:   require('./assets/icons/chores/chore=iconDishes.png'),
  clean_bath:    require('./assets/icons/chores/chore=iconSoap.png'),
  sweep:         require('./assets/icons/chores/chore=iconBroom.png'),
};

// Fallback: match by display name for records saved before the ID-based icon scheme.
const CHORE_ICON_BY_NAME: Record<string, ReturnType<typeof require>> = {
  'Make bed':           require('./assets/icons/chores/chore=iconBed.png'),
  'Tidy room':          require('./assets/icons/chores/chore=iconBroom.png'),
  'Put away clothes':   require('./assets/icons/chores/chore=iconLaundry.png'),
  'Water plants':       require('./assets/icons/chores/chore=iconSoap.png'),
  'Help set table':     require('./assets/icons/chores/chore=iconDishes.png'),
  'Unload dishwasher':  require('./assets/icons/chores/chore=iconDishes.png'),
  'Take out trash':     require('./assets/icons/chores/chore=iconGarbage.png'),
  'Pack school bag':    require('./assets/icons/chores/chore=iconBroom.png'),
  'Vacuum':             require('./assets/icons/chores/chore=iconVacuum.png'),
  'Do laundry':         require('./assets/icons/chores/chore=iconLaundry.png'),
  'Wash dishes':        require('./assets/icons/chores/chore=iconDishes.png'),
  'Clean bathroom':     require('./assets/icons/chores/chore=iconSoap.png'),
  'Sweep floors':       require('./assets/icons/chores/chore=iconBroom.png'),
  'Make your bed':      require('./assets/icons/chores/chore=iconBed.png'),
  'Fold the laundry':   require('./assets/icons/chores/chore=iconLaundry.png'),
  'Clean the bathroom': require('./assets/icons/chores/chore=iconSoap.png'),
  'Take out the trash': require('./assets/icons/chores/chore=iconGarbage.png'),
  'Vacuum the floors':  require('./assets/icons/chores/chore=iconVacuum.png'),
  'Sweep & mop':        require('./assets/icons/chores/chore=iconBroom.png'),
  'Wash the dishes':    require('./assets/icons/chores/chore=iconDishes.png'),
  'Tidy your room':     require('./assets/icons/chores/chore=iconBroom.png'),
};

function resolveChoreIcon(icon: string, name: string): ReturnType<typeof require> | string {
  if (icon.startsWith('idx:')) {
    const idx = parseInt(icon.slice(4), 10);
    return CHORE_ICONS[idx]?.icon ?? '✅';
  }
  return CHORE_ICON_BY_ID[icon] ?? CHORE_ICON_BY_NAME[name] ?? (icon || '✅');
}

function randomUUID(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
    const r = (Math.random() * 16) | 0;
    return (c === 'x' ? r : (r & 0x3) | 0x8).toString(16);
  });
}
const isUUID = (id: string) => /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);

const DEFAULT_MANAGED_CHORES: ManagedChore[] = [
  { id: '_' + randomUUID(), name: 'Make your bed',      description: 'Make your bed neatly every morning.', frequency: 'Every day',        difficulty: 1, assignedTo: [], icon: require('./assets/icons/chores/chore=iconBed.png'),     bg: '#FEF3D7', status: 'active', weeklyCompletions: 0 },
  { id: '_' + randomUUID(), name: 'Fold the laundry',   description: 'Fold and put away laundry.',          frequency: 'Every day',        difficulty: 1, assignedTo: [], icon: require('./assets/icons/chores/chore=iconLaundry.png'), bg: '#FFF9E6', status: 'active', weeklyCompletions: 0 },
  { id: '_' + randomUUID(), name: 'Clean the bathroom', description: 'Clean sink, toilet, and floor.',      frequency: '2 times per week', difficulty: 3, assignedTo: [], icon: require('./assets/icons/chores/chore=iconSoap.png'),    bg: '#EAF3FB', status: 'active', weeklyCompletions: 0 },
  { id: '_' + randomUUID(), name: 'Take out the trash', description: 'Take all trash cans to the curb.',    frequency: '2 times per week', difficulty: 2, assignedTo: [], icon: require('./assets/icons/chores/chore=iconGarbage.png'), bg: '#F0F7F0', status: 'active', weeklyCompletions: 0 },
  { id: '_' + randomUUID(), name: 'Water the plants',   description: 'Water all indoor and outdoor plants.',frequency: '3 times per week', difficulty: 1, assignedTo: [], icon: '🪴',                                             bg: '#F0F7F0', status: 'active', weeklyCompletions: 0 },
  { id: '_' + randomUUID(), name: 'Feed the pet',       description: 'Fill food and water bowls.',          frequency: 'Every day',        difficulty: 1, assignedTo: [], icon: '🐾',                                             bg: '#FFF9E6', status: 'active', weeklyCompletions: 0 },
  { id: '_' + randomUUID(), name: 'Vacuum the floors',  description: 'Vacuum all carpeted rooms.',           frequency: '2 times per week', difficulty: 2, assignedTo: [], icon: require('./assets/icons/chores/chore=iconVacuum.png'), bg: '#EAF3FB', status: 'active', weeklyCompletions: 0 },
  { id: '_' + randomUUID(), name: 'Sweep & mop',        description: 'Sweep and mop the kitchen floor.',     frequency: '2 times per week', difficulty: 2, assignedTo: [], icon: require('./assets/icons/chores/chore=iconBroom.png'),  bg: '#F5F0FB', status: 'active', weeklyCompletions: 0 },
  { id: '_' + randomUUID(), name: 'Wash the dishes',    description: 'Wash, dry, and put away dishes.',      frequency: 'Every day',        difficulty: 2, assignedTo: [], icon: require('./assets/icons/chores/chore=iconDishes.png'), bg: '#FFF9E6', status: 'active', weeklyCompletions: 0 },
  { id: '_' + randomUUID(), name: 'Tidy your room',     description: 'Put everything back in its place.',    frequency: 'Every day',        difficulty: 1, assignedTo: [], icon: require('./assets/icons/chores/chore=iconBroom.png'),  bg: '#F0F7F0', status: 'active', weeklyCompletions: 0 },
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

// Win-odds forecast for the Sunday boss. The arena's player damage, damage
// reduction, and the guaranteed-win threshold all scale off CHORE COMPLETION %
// (see `powerMult` / `guaranteedWin` in BattleArenaScreen) — NOT weekly battle
// power — so the estimate must track completion to be honest. A kid at 17%
// completion deals tiny hits and should read ~20%, not 90%.
function calcWinOdds(completionPct: number): number {
  if (completionPct >= 100) return 99;  // arena makes 100% completion a guaranteed win
  return Math.max(5, Math.min(95, Math.round(completionPct * 0.9 + 5)));
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

/** Clamp an untrusted (DB/legacy) value to a valid evolution index.
 *  An out-of-range monster_idx would make MONSTERS[idx] undefined and crash
 *  every screen that reads `.needed`. */
function toMonsterIdx(v: unknown): MonsterIdx {
  const n = typeof v === 'number' && Number.isFinite(v) ? Math.floor(v) : 0;
  return Math.min(Math.max(n, 0), MONSTERS.length - 1) as MonsterIdx;
}

/** Coerce an untrusted (DB/legacy) value to a known monster kind. */
function toMonsterId(v: unknown): MonsterId {
  return typeof v === 'string' && v in MONSTER_IMAGES_BY_KIND ? (v as MonsterId) : 'slime';
}
const BOSS_SVGS = [BossGrumbloth, BossMireflax, BossVorthak];

// ─── Shared primitives ────────────────────────────────────────────────────────

interface SwitcherOption { label: string; emoji?: string; bg: string; image?: number | ReturnType<typeof require>; }

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
                  key={`${opt.label}-${i}`}
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
  sheetTitle:      { fontSize: scale(12), fontFamily: 'Inter_700Bold', color: '#767676', letterSpacing: 0.8, textTransform: 'uppercase', paddingHorizontal: 16, paddingTop: 8, paddingBottom: 12 },
  option:          { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 16, paddingVertical: 16 },
  optionBorder:    { borderBottomWidth: 1, borderBottomColor: '#F0EEE8' },
  optionAvatar:    { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  optionLabel:     { flex: 1, fontSize: scale(16), fontFamily: 'Inter_600SemiBold', color: '#1A1A1A' },
  optionLabelActive: { color: '#6B35F0' },
  check:           { fontSize: scale(16), color: '#6B35F0', fontFamily: 'Inter_700Bold' },
});


// ─── Avatar picker + age range ────────────────────────────────────────────────

const AGE_RANGES = ['Ages 4–6', 'Ages 7–9', 'Ages 10–12', 'Ages 13+'];
const AVATAR_INDICES = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20] as const;
// Carousel cell pitch for the chore icon picker: avatarCell width (90) + row gap (10).
const ICON_CELL_STRIDE = 100;

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

/** Tracks the OS "Reduce Motion" accessibility setting so animations can skip to
 *  their end state (MON-25 Rev 2: reduced motion renders the result directly). */
function useReducedMotion(): boolean {
  const [reduced, setReduced] = useState(false);
  useEffect(() => {
    let mounted = true;
    AccessibilityInfo.isReduceMotionEnabled().then(v => { if (mounted) setReduced(v); });
    const sub = AccessibilityInfo.addEventListener('reduceMotionChanged', setReduced);
    return () => { mounted = false; sub.remove(); };
  }, []);
  return reduced;
}

// Static avatar badge for the kid header. The avatar is chosen at kid creation
// in onboarding; it is intentionally not editable from the profile selector.
function KidAvatarBadge({ idx }: { idx: number }) {
  return (
    <View style={av.trigger}>
      <Image source={getAvatarImage(idx)} style={av.triggerImg} resizeMode="cover" />
    </View>
  );
}

function ChoreIconPickerSheet({ selected, onSelect }: {
  selected: { icon: string | number; bg: string };
  onSelect: (item: { icon: string | number; bg: string }) => void;
}) {
  const { open, openSheet, closeSheet, scrimOpacity, sheetY } = useSheet();
  const scrollRef = useRef<ScrollView>(null);
  const selectedIdx = CHORE_ICONS.findIndex(i => i.icon === selected.icon);

  // Land the carousel on the current icon each time it opens.
  useEffect(() => {
    if (open && selectedIdx >= 0) {
      requestAnimationFrame(() =>
        scrollRef.current?.scrollTo({ x: Math.max(0, selectedIdx * ICON_CELL_STRIDE - ICON_CELL_STRIDE), animated: false })
      );
    }
  }, [open, selectedIdx]);

  return (
    <>
      <TouchableOpacity
        style={{ width: 88, height: 88, borderRadius: 20, backgroundColor: selected.bg, alignItems: 'center', justifyContent: 'center', borderWidth: 2.5, borderColor: '#1A1A1A' }}
        onPress={openSheet}
        activeOpacity={0.8}
      >
        <ChoreIcon icon={selected.icon} size={56} />
        <View style={[p.iconEditBadge, { position: 'absolute', bottom: -2, right: -2 }]}>
          <Image source={require('./assets/icons/icon-pencil.png')} style={{ width: scale(14), height: scale(14) }} resizeMode="contain" />
        </View>
      </TouchableOpacity>

      <Modal visible={open} transparent animationType="none" onRequestClose={() => closeSheet()}>
        <Animated.View style={[av.scrim, { opacity: scrimOpacity }]}>
          <TouchableOpacity style={{ flex: 1 }} activeOpacity={1} onPress={() => closeSheet()} />
          <Animated.View style={[av.sheet, { transform: [{ translateY: sheetY }] }]} onStartShouldSetResponder={() => true}>
            <View style={av.handle} />
            <Text style={av.title}>Choose icon</Text>
            <ScrollView
              ref={scrollRef}
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={av.avatarRow}
            >
              {CHORE_ICONS.map((item, idx) => {
                const isSelected = idx === selectedIdx;
                return (
                  <TouchableOpacity
                    key={idx}
                    style={[av.avatarCell, { backgroundColor: item.bg, alignItems: 'center', justifyContent: 'center' }, isSelected && av.cellActive]}
                    onPress={() => { onSelect(item); closeSheet(); }}
                    activeOpacity={0.8}
                  >
                    <ChoreIcon icon={item.icon} size={52} />
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
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
  ageLabel:   { fontSize: scale(12), fontFamily: 'Inter_600SemiBold', color: '#1A1A1A', opacity: 0.55 },
  // Shared sheet chrome
  scrim:      { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'flex-end' },
  sheet:      { backgroundColor: '#fff', borderTopLeftRadius: 24, borderTopRightRadius: 24, borderWidth: 2, borderColor: '#1A1A1A', borderBottomWidth: 0, paddingTop: 12, overflow: 'hidden' },
  handle:     { width: 40, height: 4, borderRadius: 2, backgroundColor: '#D0CEC8', alignSelf: 'center', marginBottom: 8 },
  title:      { fontSize: scale(12), fontFamily: 'Inter_700Bold', color: '#767676', letterSpacing: 0.8, textTransform: 'uppercase', paddingHorizontal: 16, paddingTop: 8, paddingBottom: 16 },
  // Horizontal carousel row — shared by the avatar picker and chore icon picker
  avatarRow:  { flexDirection: 'row', paddingHorizontal: 12, paddingBottom: 16, gap: 12 },
  avatarCell: { width: 90, height: 90, borderRadius: 16, overflow: 'hidden', borderWidth: 2.5, borderColor: 'transparent', backgroundColor: '#F3F1EC' },
  cellActive: { borderColor: PURPLE },
  cellImg:    { width: '100%', height: '100%' },
  // Age range rows
  ageRow:       { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 16 },
  ageRowBorder: { borderBottomWidth: 1, borderBottomColor: '#F0EEE8' },
  ageRowLabel:  { flex: 1, fontSize: scale(18), fontFamily: 'Inter_600SemiBold', color: '#1A1A1A' },
  ageRowLabelActive: { color: PURPLE },
  ageCheck:     { fontSize: scale(18), color: PURPLE, fontFamily: 'Inter_700Bold' },
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
  { id: 'home',     label: 'Monsters', icon: require('./assets/icons/navHome.png')   },
  { id: 'world',    label: 'World',    icon: require('./assets/icons/navWorld.png') },
  { id: 'wallet',   label: 'Wallet',   icon: require('./assets/icons/navWallet.png') },
  { id: 'trophies', label: 'Trophies', icon: require('./assets/icons/navTrophy.png') },
];

// ─── Animated nav bar ─────────────────────────────────────────────────────────
// Keeps the floating white-pill chrome but adds (a) a lavender pill that springs
// to the active tab, replacing the old static active background, and (b) an icon
// wiggle the moment a tab becomes active. Built on RN's Animated (the rest of the
// app's animation layer); the spring uses the same physics as the design spec.

const PILL_SPRING = { damping: 20, stiffness: 290, mass: 1 } as const; // ~250ms, subtle overshoot

function NavTabItem({ icon, label, isActive, onPress, onLayout }: {
  icon: number; label: string; isActive: boolean;
  onPress: () => void; onLayout: (e: LayoutChangeEvent) => void;
}) {
  return (
    <TouchableOpacity style={s.tab} onPress={onPress} onLayout={onLayout} activeOpacity={0.7}>
      <View style={s.tabIconWrap}>
        <Image source={icon} style={s.tabIcon} resizeMode="contain" />
        <Text style={[s.tabLabel, isActive && s.tabLabelActive]}>{label}</Text>
      </View>
    </TouchableOpacity>
  );
}

function AnimatedNavBar<T extends string>({ tabs, active, onNav }: {
  tabs: { id: T; label: string; icon: number }[];
  active: T;
  onNav: (id: T) => void;
}) {
  const activeIdx = Math.max(0, tabs.findIndex(t => t.id === active));
  const layouts   = useRef<({ x: number; width: number } | undefined)[]>([]);
  const pillX     = useRef(new Animated.Value(0)).current;
  // Tabs are flex:1 (equal widths), so the pill width is a constant measured at
  // layout — only translateX animates. Keeping the spring on the NATIVE driver
  // matters: the tab tap also mounts the newly selected screen, and a JS-driven
  // layout animation (the old width+x springs) competes with that mount work on
  // the JS thread, making every page switch stutter for the spring's duration.
  const [pillWidth, setPillWidth] = useState(0);
  const [ready, setReady] = useState(false);

  const movePill = useCallback((idx: number, animate: boolean) => {
    const l = layouts.current[idx];
    if (!l) return;
    if (animate) {
      Animated.spring(pillX, { toValue: l.x, useNativeDriver: true, ...PILL_SPRING }).start();
    } else {
      pillX.setValue(l.x);
    }
  }, [pillX]);

  useEffect(() => { if (ready) movePill(activeIdx, true); }, [activeIdx, ready, movePill]);

  const handleItemLayout = (idx: number, e: LayoutChangeEvent) => {
    const { x, width } = e.nativeEvent.layout;
    layouts.current[idx] = { x, width };
    if (ready) {
      // Re-measure (rotation/resize): snap the pill to the active tab's new frame.
      if (idx === activeIdx) { setPillWidth(width); pillX.setValue(x); }
      return;
    }
    if (tabs.every((_, i) => layouts.current[i])) {
      movePill(activeIdx, false);
      setPillWidth(layouts.current[activeIdx]!.width);
      setReady(true);
    }
  };

  return (
    <View style={s.tabBar} pointerEvents="box-none">
      <View style={s.tabBarInner}>
        <Animated.View
          pointerEvents="none"
          style={[s.tabPill, { opacity: ready ? 1 : 0, width: pillWidth, transform: [{ translateX: pillX }] }]}
        />
        {tabs.map((t, idx) => (
          <NavTabItem
            key={t.id}
            icon={t.icon}
            label={t.label}
            isActive={active === t.id}
            onPress={() => onNav(t.id)}
            onLayout={(e) => handleItemLayout(idx, e)}
          />
        ))}
      </View>
    </View>
  );
}

function TabBar({ active, onNav }: { active: Tab; onNav: (t: Tab) => void }) {
  return <AnimatedNavBar tabs={NAV_TABS} active={active} onNav={onNav} />;
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

const PARENT_NAV_TABS: { id: ParentTab; label: string; icon: number }[] =
  (['home', 'chores', 'money', 'settings'] as ParentTab[]).map(id => ({
    id, label: PARENT_NAV_ICONS[id].label, icon: PARENT_NAV_ICONS[id].src,
  }));

function ParentTabBar({ active, onNav }: { active: ParentTab; onNav: (t: ParentTab) => void }) {
  return <AnimatedNavBar tabs={PARENT_NAV_TABS} active={active} onNav={onNav} />;
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
          <Text style={{ fontSize: scale(12) }}>🪙</Text>
          <Text style={s.homeQuestReward}>{fmtCoins(choreCoins(chore, baseRate))}</Text>
        </View>
      </View>
      <Animated.View style={[s.homeQuestCheck, done && s.homeQuestCheckDone, done && { transform: [{ scale: checkScale }] }]}>
        {done && <View style={s.homeQuestCheckDot} />}
      </Animated.View>
    </TouchableOpacity>
  );
}

function AnimatedManagedQuestRow({ chore, onPress, baseRate, kidName, parentRole = '' }: { chore: ManagedChore; onPress: () => void; baseRate: string; kidName: string; parentRole?: string }) {
  const status = getChoreStatus(chore, kidName);
  const rejectionNote = getChoreRejectionNote(chore, kidName);

  const reducedMotion = useReducedMotion();
  const checkScale     = useRef(new Animated.Value(status === 'approved' ? 1 : 0)).current;
  const sweepOpacity   = useRef(new Animated.Value(status === 'approved' ? 1 : 0)).current;
  // Done-badge pop on submit (MON-25 Rev 2). Starts at end state if already pending.
  const doneBadgeScale = useRef(new Animated.Value(status === 'pending' ? 1 : 0)).current;
  const shakeX         = useRef(new Animated.Value(0)).current;
  const prevStatus     = useRef(status);

  useEffect(() => {
    const prev = prevStatus.current;
    const next = status;

    if (next === 'approved' && prev !== 'approved') {
      Animated.parallel([
        Animated.spring(checkScale, { toValue: 1, useNativeDriver: true, tension: 280, friction: 6 }),
        Animated.timing(sweepOpacity, { toValue: 1, duration: 350, easing: Easing.out(Easing.quad), useNativeDriver: true }),
      ]).start();
    } else if (next !== 'approved' && prev === 'approved') {
      checkScale.setValue(0);
      sweepOpacity.setValue(0);
    }

    // Pending: the done badge pops in (0 → 1.15 → 1, ≤250ms). Reduced motion
    // renders the end state directly.
    if (next === 'pending' && prev !== 'pending') {
      if (reducedMotion) {
        doneBadgeScale.setValue(1);
      } else {
        doneBadgeScale.setValue(0);
        Animated.sequence([
          Animated.timing(doneBadgeScale, { toValue: 1.15, duration: 150, easing: Easing.out(Easing.quad), useNativeDriver: true }),
          Animated.timing(doneBadgeScale, { toValue: 1,    duration: 90,  easing: Easing.out(Easing.quad), useNativeDriver: true }),
        ]).start();
      }
    } else if (next !== 'pending' && prev === 'pending') {
      doneBadgeScale.setValue(0);
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
  }, [status]);

  const coinsAmt = Math.round(baseRateCents(baseRate) * DIFFICULTY_MULTIPLIERS[chore.difficulty]);
  const isPending  = status === 'pending';
  const isApproved = status === 'approved';
  const isRejected = status === 'rejected';
  const hasNote    = isRejected && !!rejectionNote;
  // Rejected without note → show as standard active (tap to resubmit, no red styling)
  const isTappable = status === 'active' || status === 'rejected';

  // MON-25 Rev 2: "SENT TO {Dad/Mom/Name} ✓"; fallback when no role is set.
  const sentLabel = parentRole
    ? `SENT TO ${parentRole.toUpperCase()} ✓`
    : 'SENT FOR APPROVAL ✓';

  // Reward chips stay visible on pending (MON-25 Rev 2: "locked in"), dimmed to
  // 85% with a trailing mono tag; per-chore reward stays in ¢ (MON-75 Rev 6).
  const rewardsRow = (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, opacity: isPending ? 0.85 : 1 }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
        <Image source={require('./assets/icons/icon-coin.png')} style={{ width: scale(14), height: scale(14) }} resizeMode="contain" />
        <Text style={s.homeQuestReward}>{fmtCoins(coinsAmt)}</Text>
      </View>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
        <Image source={require('./assets/icons/icon-star.png')} style={{ width: scale(13), height: scale(13) }} resizeMode="contain" />
        <Text style={[s.homeQuestReward, { color: '#C47F00' }]}>{XP_BY_DIFFICULTY[chore.difficulty]} XP</Text>
      </View>
      {isPending && <Text style={s.lockedInTag}>· locked in</Text>}
    </View>
  );

  return (
    <Animated.View style={{ transform: [{ translateX: shakeX }] }}>
      {/* MON-25 Rev 2 (Option A "Sent It"): pending keeps FULL parity with the
          active card — no fade, no tint, same border/shadow. The "done" signal is
          additive (lime done-badge + SENT pill + purple submitted-check), so a
          submitted chore reads as a banked win, not a disabled row. */}
      <View
        style={[
          s.homeQuestCard,
          hasNote    && s.homeQuestCardRejected,
          { flexDirection: 'column', overflow: 'hidden' },
        ]}
      >
        <TouchableOpacity
          style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}
          onPress={isTappable ? onPress : undefined}
          activeOpacity={isTappable ? 0.7 : 1}
        >
          {isApproved && <Animated.View style={[s.homeQuestSweep, { opacity: sweepOpacity }]} />}

          <View style={[s.homeQuestIcon, { backgroundColor: chore.bg }]}>
            <ChoreIcon icon={chore.icon} size={45} />
            {isPending && (
              <Animated.View style={[s.doneBadge, { transform: [{ scale: doneBadgeScale }] }]}>
                <Text style={s.doneBadgeMark}>✓</Text>
              </Animated.View>
            )}
          </View>

          <View style={[s.homeQuestInfo, { flex: 1 }]}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <Text style={[s.homeQuestTitle, isApproved && s.homeQuestTitleDone, { flex: 1 }]}>{chore.name}</Text>
              {hasNote && (
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: '#FAEEDA', borderRadius: 10, paddingHorizontal: 8, paddingVertical: 4 }}>
                  <Text style={{ fontSize: scale(12) }}>💬</Text>
                  <Text style={{ fontSize: scale(12), fontFamily: 'Inter_700Bold', color: '#A0660A' }}>Note</Text>
                </View>
              )}
            </View>
            {isPending && (
              <View style={s.sentPill} accessibilityRole="text" accessibilityLabel={`Sent to ${parentRole || 'parent'}, awaiting approval`}>
                <Text style={s.sentPillText}>{sentLabel}</Text>
              </View>
            )}
            {rewardsRow}
          </View>

          {isPending ? (
            <View style={s.submittedCheck}>
              <Text style={s.submittedCheckMark}>✓</Text>
            </View>
          ) : (
            <Animated.View style={[s.homeQuestCheck, isApproved && s.homeQuestCheckDone, isApproved && { transform: [{ scale: checkScale }] }]}>
              {isApproved && <View style={s.homeQuestCheckDot} />}
            </Animated.View>
          )}
        </TouchableOpacity>

        {/* Amber note banner — only when rejected with a note */}
        {hasNote && (
          <View style={{ backgroundColor: '#FAEEDA', marginTop: 8, borderRadius: 10, padding: 12, flexDirection: 'row', alignItems: 'flex-start', gap: 8 }}>
            <View style={{ flex: 1 }}>
              <Text style={{ fontSize: scale(12), fontFamily: 'Inter_700Bold', color: '#A0660A', marginBottom: 4 }}>From {parentRole ? parentRole.charAt(0).toUpperCase() + parentRole.slice(1) : 'Parent'}</Text>
              <Text style={{ fontSize: scale(12), color: '#7A4D0A', lineHeight: scale(18) }}>{rejectionNote}</Text>
            </View>
            <TouchableOpacity
              style={{ borderWidth: 1.5, borderColor: '#6B35F0', borderRadius: 8, paddingHorizontal: 12, paddingVertical: 4, backgroundColor: 'transparent' }}
              onPress={onPress}
              activeOpacity={0.7}
            >
              <Text style={{ fontSize: scale(12), fontFamily: 'Inter_700Bold', color: '#6B35F0' }}>Try again</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>
    </Animated.View>
  );
}

type XpPop = { id: number; label: string; y: Animated.Value; opacity: Animated.Value; kind: 'xp' | 'coin' };

function HomeScreen({ monsterIdx, monsterName, xp, coins, managedChores, onCompleteManaged, currentKidName, onSwitchToParent, onOpenDebug, dbgMonsterSize, dbgMonsterY, dbgPlatformSize, dbgPlatformY, monsterImg, nextMonsterImg, platformImg, platformAspect, baseRate, parentRole, requireApproval, onNavigateToWallet, onRenameMonster, kidProfiles, onSwitchToKid, initialAvatarIdx, evolutionAutoOpen, onConsumeAutoOpen, onEvolveComplete }: {
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
  nextMonsterImg: number;
  platformImg: number;
  platformAspect: number;
  baseRate: string;
  parentRole?: string;
  requireApproval: boolean;
  onNavigateToWallet: () => void;
  onRenameMonster: (name: string) => void;
  kidProfiles: { name: string; avatarColor: string; avatarIdx: number }[];
  onSwitchToKid: (name: string) => void;
  initialAvatarIdx: number;
  // MON-6 — in-place evolution moment. `evolutionAutoOpen` mirrors the kid's
  // pendingEvolution flag (auto-opens the confirm modal on launch);
  // `onConsumeAutoOpen` clears it so a decline won't re-pop the same launch;
  // `onEvolveComplete` commits the form advance once the result modal is dismissed.
  evolutionAutoOpen: boolean;
  onConsumeAutoOpen: () => void;
  onEvolveComplete: () => void;
}) {
  const monster    = MONSTERS[monsterIdx];
  const need       = monster.needed;
  const pct        = Math.min(100, Math.round((xp / need) * 100));
  // MON-6 — evolution eligibility is derived live so the "Ready to evolve" pill
  // persists after a decline (the auto-open flag is one-shot; this is not).
  const nextM             = MONSTERS[Math.min(monsterIdx + 1, MONSTERS.length - 1)];
  const evolutionEligible = monsterIdx < MONSTERS.length - 1 && xp >= need;
  const allAssignedChores = managedChores.filter(c =>
    c.assignedTo.length === 0 || c.assignedTo.includes(currentKidName)
  );
  const allDailyDone = allAssignedChores.length > 0 && allAssignedChores.every(c => getChoreStatus(c, currentKidName) === 'approved');
  // Only show non-approved chores in the list — approved ones are gone
  const dailyChores  = allAssignedChores.filter(c => getChoreStatus(c, currentKidName) !== 'approved');
  const remaining    = dailyChores.filter(c => { const s = getChoreStatus(c, currentKidName); return s === 'active' || s === 'rejected'; }).length;
  const allSubmitted = !allDailyDone && dailyChores.length > 0 && dailyChores.every(c => getChoreStatus(c, currentKidName) === 'pending');
  const dollars    = (coins / 100).toFixed(2);
  const [kidAgeRange,  setKidAgeRange]  = useState('Ages 7–9');
  const [showRename, setShowRename]     = useState(false);
  const [renameText, setRenameText]     = useState(monsterName);
  const [toastMsg, setToastMsg]         = useState<string | null>(null);

  // ── MON-6 — in-place evolution moment ─────────────────────────────────────
  // The moment plays *inside* the real monster card: its background turns cosmic
  // and the monster cross-fades in place (no overlaid duplicate card). A light
  // full-screen scrim dims the surrounding chrome; the apex flash punches over it.
  const [showEvolveConfirm, setShowEvolveConfirm] = useState(false);
  const [showEvolveResult,  setShowEvolveResult]  = useState(false);
  const [evolving,          setEvolving]          = useState(false);
  const autoOpenedRef = useRef(false);
  const chromeDim = useRef(new Animated.Value(0)).current; // dims chrome around the card
  const evoFlash  = useRef(new Animated.Value(0)).current; // full-screen apex flash

  // Auto-open the confirm modal on launch while eligible (interrupt pattern).
  // Consume the flag immediately so declining won't re-pop on this launch — the
  // pill (still eligible) remains the re-entry point.
  useEffect(() => {
    if (evolutionAutoOpen && evolutionEligible && !autoOpenedRef.current && !evolving) {
      autoOpenedRef.current = true;
      setShowEvolveConfirm(true);
      onConsumeAutoOpen();
    }
  }, [evolutionAutoOpen, evolutionEligible, evolving]);

  // "Yes! ✨" — play the in-place moment. No state commit yet; the form advance
  // lands only when the result modal is dismissed.
  const startEvolve = useCallback(() => {
    setShowEvolveConfirm(false);
    setEvolving(true);
    Animated.timing(chromeDim, { toValue: 0.4, duration: 1600, useNativeDriver: true }).start();
  }, []);

  // Apex — fire the full-screen white flash (driven by EvolutionFX's timeline).
  const onEvolveApex = useCallback(() => {
    Animated.sequence([
      Animated.timing(evoFlash, { toValue: 1, duration: 90, useNativeDriver: true }),
      Animated.timing(evoFlash, { toValue: 0, duration: 360, useNativeDriver: true }),
    ]).start();
  }, []);

  // "Awesome! 🎉" — commit the advance and settle into the new normal.
  const finishEvolve = useCallback(() => {
    setShowEvolveResult(false);
    setEvolving(false);
    chromeDim.setValue(0);
    evoFlash.setValue(0);
    // Snap the XP bar straight to the new baseline. Letting the normal spring run
    // from the old full bar (100%) down to the reset value overshoots past 0 and
    // rebounds — reading as a flicker as the card returns to its resting state.
    const carry = Math.max(0, xp - need);
    xpWidthAnim.setValue(Math.min(100, Math.round((carry / nextM.needed) * 100)));
    onEvolveComplete();
  }, [onEvolveComplete, xp, need, nextM]);
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
      showPop(`+${XP_BY_DIFFICULTY[c.difficulty]} XP`, 'xp');
      showPop(`+${fmtCoins(Math.round(baseRateCents(baseRate) * DIFFICULTY_MULTIPLIERS[c.difficulty]))}`, 'coin', 120);
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
          <KidAvatarBadge idx={initialAvatarIdx} />
          <View style={{ gap: 4 }}>
            <ViewSwitcher
              selected={currentKidName || 'Kid view'}
              options={[
                ...kidProfiles.map(k => ({ label: k.name, emoji: '🧒', bg: k.avatarColor || '#EAE4FF', image: getAvatarImage(k.avatarIdx) })),
                { label: 'Parent view', image: getParentAvatar(parentRole ?? ''), bg: '#C5F215' },
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

      <ScrollView style={{ flex: 1, overflow: 'visible' }} showsVerticalScrollIndicator={false} contentContainerStyle={s.homeScroll}>
        {/* Character Card — long press opens debug menu. During the evolution
            moment, EvolutionFX paints over the card in place (cosmic background +
            monster cross-fade), so the normal monster + stat plate fade out. */}
        <View style={s.homeCharCard}>
          <TouchableOpacity
            activeOpacity={1}
            onLongPress={onOpenDebug}
            delayLongPress={600}
            style={{ overflow: 'visible' }}
          >
            <View style={s.homeCharImage} pointerEvents="box-none">
              {/* Outer bob wraps both monster + platform so they float together */}
              <Animated.View style={{ alignItems: 'center', opacity: evolving ? 0 : 1, transform: [{ translateY: bobTranslate }, { scale: monsterScale }] }} pointerEvents="none">
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
          <View style={[s.homeCharInfo, evolving && { opacity: 0 }]}>
            <View style={s.homeCharNameRow}>
              <TouchableOpacity onPress={() => { setRenameText(monsterName); setShowRename(true); }} activeOpacity={0.7} style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <Text style={s.homeCharName}>{monsterName}</Text>
                <Image source={require('./assets/icons/icon-pencil.png')} style={{ width: scale(16), height: scale(16), opacity: 0.5 }} resizeMode="contain" />
              </TouchableOpacity>
              {evolutionEligible
                ? <ReadyToEvolvePill onPress={() => setShowEvolveConfirm(true)} />
                : <Text style={s.homeCharLevel}>LEVEL {monster.level}</Text>}
            </View>
            <View style={s.homeXpTrack}>
              <Animated.View style={[s.homeXpFill, {
                width: xpWidthAnim.interpolate({ inputRange: [0, 100], outputRange: ['0%', '100%'] }),
              }]} />
            </View>
            <Text style={s.homeXpText}>{Math.min(xp, need)}/{need}xp</Text>
          </View>

          {/* In-place evolution FX — fills the card exactly (no measured overlay) */}
          {evolving && (
            <EvolutionFX
              monsterAreaH={340}
              oldImg={monsterImg}
              newImg={nextMonsterImg}
              platformImg={platformImg}
              platformAspect={platformAspect}
              monsterSize={dbgMonsterSize}
              monsterY={dbgMonsterY}
              platformSize={dbgPlatformSize}
              platformY={dbgPlatformY}
              oldName={monsterName}
              newName={monsterName}
              oldLevel={monster.level}
              newLevel={nextM.level}
              onApex={onEvolveApex}
              onResolve={() => setShowEvolveResult(true)}
            />
          )}
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
                kidName={currentKidName}
                parentRole={parentRole}
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
              kidName={currentKidName}
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
            <Text style={{ fontSize: scale(18), fontFamily: 'Inter_900Black', color: '#1A1A1A' }}>Name your Monstir</Text>
            <TextInput
              style={{ backgroundColor: '#ECEAE4', borderRadius: 12, borderWidth: 2, borderColor: '#1A1A1A', paddingHorizontal: 16, paddingVertical: 16, fontSize: scale(16), fontFamily: 'Inter_700Bold', color: '#1A1A1A' }}
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
              <Text style={{ fontSize: scale(12), color: '#767676', fontFamily: 'Inter_600SemiBold' }}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* MON-6 — chrome dim + apex flash. The cosmic card transform itself is
          rendered in-place inside the card (EvolutionFX); these two full-screen
          layers just dim the surroundings and flash at the burst. */}
      {/* Rendered in a window-level Modal so the dim sits above the bottom tab bar
          and the status bar. Hidden once the result modal takes over (its own
          scrim covers the chrome), avoiding stacked modals. */}
      <Modal transparent visible={evolving && !showEvolveResult} animationType="none" statusBarTranslucent onRequestClose={() => {}}>
        <Animated.View pointerEvents="none" style={[StyleSheet.absoluteFill, { backgroundColor: '#0A0814', opacity: chromeDim }]} />
        <Animated.View pointerEvents="none" style={[StyleSheet.absoluteFill, { backgroundColor: '#FFFFFF', opacity: evoFlash }]} />
      </Modal>

      {/* Confirm modal — auto-opens on launch when eligible, or via the pill */}
      <Modal visible={showEvolveConfirm} transparent animationType="fade" onRequestClose={() => setShowEvolveConfirm(false)}>
        <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', justifyContent: 'center', paddingHorizontal: 24 }}>
          <View style={{ backgroundColor: '#FAF9F4', borderRadius: 24, borderWidth: 2.5, borderColor: '#1A1A1A', padding: 24, gap: 16, ...SOLID_SHADOW }}>
            <Text style={{ fontSize: scale(22), fontFamily: 'Inter_900Black', color: '#1A1A1A', textAlign: 'center' }}>Evolve {monsterName}?</Text>
            <Text style={{ fontSize: scale(16), fontFamily: 'Inter_500Medium', color: '#4A4A4A', textAlign: 'center' }}>{monsterName} is ready to grow into its next form.</Text>
            <Button label="Yes! ✨" onPress={startEvolve} />
            <TouchableOpacity onPress={() => setShowEvolveConfirm(false)} activeOpacity={0.7} style={{ alignItems: 'center', paddingVertical: 8 }}>
              <Text style={{ fontSize: scale(12), color: '#767676', fontFamily: 'Inter_600SemiBold' }}>Not yet</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Result modal — celebrates the new form once the moment settles */}
      <Modal visible={showEvolveResult} transparent animationType="fade" onRequestClose={finishEvolve}>
        <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.55)', justifyContent: 'center', paddingHorizontal: 24 }}>
          <View style={{ backgroundColor: '#FAF9F4', borderRadius: 24, borderWidth: 2.5, borderColor: '#1A1A1A', padding: 24, gap: 16, alignItems: 'center', ...SOLID_SHADOW }}>
            <Image source={nextMonsterImg} style={{ width: scale(160), height: scale(160) }} resizeMode="contain" />
            <Text style={{ fontSize: scale(22), fontFamily: 'Inter_900Black', color: '#1A1A1A', textAlign: 'center' }}>You evolved!</Text>
            <Text style={{ fontSize: scale(16), fontFamily: 'Inter_500Medium', color: '#4A4A4A', textAlign: 'center' }}>{MONSTERS[monsterIdx].name} grew into {nextM.name}!</Text>
            <View style={{ alignSelf: 'stretch' }}><Button label="Awesome! 🎉" onPress={finishEvolve} /></View>
          </View>
        </View>
      </Modal>

      {toastMsg && <Toast key={toastMsg + Date.now()} message={toastMsg} />}
    </View>
  );
}

// MON-6 — pulsing slime-lime "Ready to evolve" pill that replaces the level
// badge in the stat plate when the monster has hit its XP gate. Tap re-opens the
// confirm modal. Reuses existing tokens (lime + ink border + offset shadow).
function ReadyToEvolvePill({ onPress }: { onPress: () => void }) {
  const pulse = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, { toValue: 1, duration: 700, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
        Animated.timing(pulse, { toValue: 0, duration: 700, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, []);
  const sc = pulse.interpolate({ inputRange: [0, 1], outputRange: [1, 1.06] });
  return (
    <TouchableOpacity onPress={onPress} activeOpacity={0.85}>
      <Animated.View style={{ backgroundColor: '#C5F215', borderRadius: 100, borderWidth: 2, borderColor: '#1A1A1A', paddingHorizontal: 12, paddingVertical: 4, transform: [{ scale: sc }], ...SOLID_SHADOW_SM }}>
        <Text style={{ fontSize: scale(12), fontFamily: 'Inter_800ExtraBold', color: '#1A1A1A', letterSpacing: 0.3 }}>READY TO EVOLVE</Text>
      </Animated.View>
    </TouchableOpacity>
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

function WorldScreen({ monsterIdx, coins, done, xp, weeklyXp, managedChores, onStartBattle, onSwitchToParent, onNavigateToWallet, monsterName, kidProfiles, onSwitchToKid, currentKidName, initialAvatarIdx, currentBoss, debugDayOffset, weekApprovalDays, parentRole = '', battleCoinBonusEnabled, battleBonusCoins, bossHpPct = 1, totalFighters = 1, battledThisWeek = false }: {
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
  parentRole?: string;
  debugDayOffset: number;
  weekApprovalDays: string[];
  battleCoinBonusEnabled: boolean;
  battleBonusCoins: number;
  // Cooperative shared HP (MON-84): the family's one boss bar (0–1) and the
  // household size, so the meter can show how worn down he is.
  bossHpPct?: number;
  totalFighters?: number;
  // True once this kid has used their single battle this week (won OR escaped) —
  // prevents same-day re-fighting, incl. farming a freshly-rotated boss after a
  // family capture on Sunday.
  battledThisWeek?: boolean;
}) {
  const boss        = currentBoss;
  const bossJar     = getBossDisplay(boss.name)?.jar;
  const monster     = MONSTERS[monsterIdx];
  const [kidAgeRange,  setKidAgeRange]  = useState('Ages 7–9');
  const dollars = (coins / 100).toFixed(2);
  const myChores = managedChores.filter(c => c.assignedTo.length === 0 || c.assignedTo.includes(currentKidName));
  const totalChores = myChores.length || 1;
  const totalWeeklyTarget = myChores.reduce((sum, c) => sum + frequencyToWeeklyTarget(c.frequency), 0) || 1;
  const totalWeeklyDone   = myChores.reduce((sum, c) => sum + getChoreCompletions(c, currentKidName), 0);
  const doneCount   = totalWeeklyDone;   // this kid's completions this week (accounts for recurring chores)
  const chorePct    = Math.min(100, Math.round((totalWeeklyDone / totalWeeklyTarget) * 100));
  const winOdds     = calcWinOdds(chorePct);
  const power       = weeklyXp;
  const bossVideoPlayer = useVideoPlayer(boss.video, p => { p.loop = true; p.muted = true; p.play(); });
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
      ? boss.name
      : 'Something stirs...';
  const teaserLine2 = isBattleDay
    ? 'Your boss awaits. Fight!'
    : isSaturday
      ? boss.tagline
      : `Boss arrives in ${days} day${days === 1 ? '' : 's'}`;

  // Battle-readiness forecast for THIS week's boss. Reads off battle power
  // (`weeklyXp`) and the win-odds heuristic — NOT cumulative `xp`/evolution,
  // which is a separate track handled by the evolve flow. (Evolution isn't
  // something the kid triggers by maxing weekly power, so we never say "evolve"
  // here.)
  const powerForecastMsg = power === 0
    ? 'No battle power yet — do chores to power up for the boss!'
    : winOdds >= 70
      ? `You're battle-ready — ${winOdds}% chance to beat this boss!`
      : `${winOdds}% win odds — do more chores to boost your power.`;

  const cdParts = countdownParts(countdownMs);
  const threatSkulls = { Easy: 1, Medium: 3, Hard: 4, Extreme: 5 }[boss.threat] ?? 3;
  const threatColors: Record<string, string> = { Easy: '#3AB56A', Medium: '#6B35F0', Hard: '#F59E0B', Extreme: '#EF4444' };

  return (
    <View style={{ flex: 1, backgroundColor: '#C5F215' }}>
      {/* Texture overlay — mirrors CreamBg but with lime green */}
      <Image source={require('./assets/appBG.png')} style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, width: '100%', height: '100%' }} resizeMode="cover" />
      {/* Header */}
      <View style={s.homeHeader}>
        <View style={s.homeHeaderLeft}>
          <KidAvatarBadge idx={initialAvatarIdx} />
          <View style={{ gap: 4 }}>
            <ViewSwitcher
              selected={currentKidName || 'Kid view'}
              options={[
                ...kidProfiles.map(k => ({ label: k.name, emoji: '🧒', bg: k.avatarColor || '#EAE4FF', image: getAvatarImage(k.avatarIdx) })),
                { label: 'Parent view', image: getParentAvatar(parentRole ?? ''), bg: '#C5F215' },
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
            <VideoView player={bossVideoPlayer} style={StyleSheet.absoluteFill} contentFit="cover" nativeControls={false} />
            {/* Gradient for readability */}
            <LinearGradient colors={['rgba(0,0,0,0.05)', 'rgba(0,0,0,0.65)']} style={StyleSheet.absoluteFill} />
            {/* Static boss art is only a faint teaser while the boss is still
                hidden (Mon–Fri). On the Saturday reveal + Sunday battle day the
                looping video IS the boss, so we don't cover it with the still. */}
            {boss.bossImage && silhouetteOpacity > 0 && (
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
              <Image source={require('./assets/icons/icon-skull.png')} style={{ width: scale(30), height: scale(30), marginRight: 4 }} resizeMode="contain" />
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
                <Text style={{ fontSize: scale(12), color: C.muted, fontFamily: 'Inter_600SemiBold' }}>Do more chores{'\n'}to unlock.</Text>
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
            <Text style={{ fontSize: scale(12), color: C.muted, fontFamily: 'Inter_600SemiBold' }}>{boss.threatNote}</Text>
          </View>
        </View>

        {/* What you'll get */}
        <View style={w.sectionCard}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 16 }}>
            <Image source={require('./assets/icons/icon-trophy.png')} style={{ width: scale(18), height: scale(18) }} resizeMode="contain" />
            <Text style={[w.sectionTitle, { letterSpacing: 0.8 }]}>POSSIBLE REWARDS</Text>
          </View>
          <View style={w.stakeRow}>
            {/* Boss jar — always */}
            <View style={w.stakeItem}>
              {bossJar
                ? <Image source={bossJar} style={w.stakeIcon} resizeMode="contain" />
                : <Image source={require('./assets/icons/icon-trophy.png')} style={w.stakeIcon} resizeMode="contain" />}
              <Text style={w.stakeVal}>1</Text>
              <Text style={w.stakeLbl}>boss jar</Text>
            </View>
            {/* Relic — always */}
            <View style={w.stakeItem}>
              <Image source={require('./assets/icons/IconChest.png')} style={w.stakeIcon} resizeMode="contain" />
              <Text style={w.stakeVal}>1</Text>
              <Text style={w.stakeLbl}>relic</Text>
            </View>
            {/* Coins — only if parent has capture bonus on */}
            {battleCoinBonusEnabled && (
              <View style={w.stakeItem}>
                <Image source={require('./assets/icons/icon-coin.png')} style={w.stakeIcon} resizeMode="contain" />
                <Text style={w.stakeVal}>{battleBonusCoins}</Text>
                <Text style={w.stakeLbl}>coins</Text>
              </View>
            )}
          </View>
        </View>

        {/* ── Your Stats ── */}
        <Text style={w.sectionHeader}>Your stats this week</Text>

        {/* Readiness */}
        <View style={w.sectionCard}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 16 }}>
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
          <View style={[w.forecastPill, { flexDirection: 'row', alignItems: 'center', gap: 12, marginTop: 12 }]}>
            <View style={{ width: 36, height: 36, borderRadius: 8, backgroundColor: '#E0D4FF', alignItems: 'center', justifyContent: 'center' }}>
              <Image source={require('./assets/icons/icon-graph.png')} style={{ width: 22, height: 22 }} resizeMode="contain" />
            </View>
            <Text style={[w.forecastText, { flex: 1, textAlign: 'left' }]}>{powerForecastMsg}</Text>
          </View>
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
              <View key={i} style={{ alignItems: 'center', gap: 4 }}>
                <View style={{
                  width: 10, height: 10, borderRadius: 5,
                  backgroundColor: filled ? '#C5F215' : isToday ? '#FFFFFF' : 'rgba(255,255,255,0.25)',
                  borderWidth: isToday ? 2 : 0, borderColor: '#C5F215',
                }} />
                <Text style={{ fontFamily: 'Inter_700Bold', fontSize: scale(12), color: isToday ? '#C5F215' : 'rgba(255,255,255,0.5)' }}>{label}</Text>
              </View>
            );
          })}
        </View>

        {/* Cooperative shared-HP meter (MON-84) — "wear him down together."
            Only meaningful in a multi-kid household once he's been chipped. */}
        {totalFighters > 1 && bossHpPct < 1 && (
          <View style={{ marginBottom: 12, backgroundColor: 'rgba(0,0,0,0.25)', borderRadius: 12, padding: 12 }}>
            <Text style={{ fontFamily: 'Inter_700Bold', fontSize: scale(12), color: '#C5F215', textAlign: 'center' }}>
              {bossHpPct <= 0.2
                ? `${boss.name} is on his last legs — finish him together!`
                : `${boss.name} is at ${Math.round(bossHpPct * 100)}% — keep wearing him down`}
            </Text>
            {/* Shared HP bar */}
            <View style={{ height: 8, borderRadius: 4, backgroundColor: 'rgba(255,255,255,0.18)', marginTop: 8, overflow: 'hidden' }}>
              <View style={{ width: `${Math.max(0, Math.min(100, Math.round(bossHpPct * 100)))}%`, height: '100%', borderRadius: 4, backgroundColor: '#C5F215' }} />
            </View>
          </View>
        )}

        {/* Battle Button — one battle per kid per week */}
        {battledThisWeek ? (
          <Button label="⚔️  Battle used — back next week" onPress={() => {}} disabled />
        ) : (
          <Button
            label={isBattleDay ? '⚔️  Fight Now!' : (isSaturday ? '⚔️  Battle unlocks tomorrow' : '⚔️  Battle Day: Sunday')}
            onPress={onStartBattle}
            disabled={!isBattleDay}
          />
        )}

        {/* DEBUG — dev only */}
        {__DEV__ && (
          <TouchableOpacity style={s.debugBtn} onPress={onStartBattle} activeOpacity={0.7}>
            <Text style={s.debugBtnText}>🐛  Debug — trigger battle instantly</Text>
          </TouchableOpacity>
        )}
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

function BossIntroScreen({ monsterIdx, onReady, bossOverride, battleCoinBonusEnabled = false, battleBonusCoins = 0 }: {
  monsterIdx: MonsterIdx;
  onReady: () => void;
  bossOverride?: Boss;
  battleCoinBonusEnabled?: boolean;
  battleBonusCoins?: number;
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

  const introVideoPlayer = useVideoPlayer(boss.video, p => { p.loop = true; p.play(); });
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

  // Same reward logic as the World screen "Possible Rewards" card: the boss jar
  // and a relic are always earned on capture; coins only when the parent has the
  // capture bonus on. Uses the boss's own jar art, falling back to the trophy.
  const bossJar = getBossDisplay(boss.name)?.jar;
  const rewards = [
    { icon: bossJar ?? require('./assets/icons/icon-trophy.png'), value: '1', label: 'boss jar' },
    { icon: require('./assets/icons/IconChest.png'),              value: '1', label: 'relic'    },
    ...(battleCoinBonusEnabled
      ? [{ icon: require('./assets/icons/icon-coin.png'), value: `${battleBonusCoins}`, label: 'coins' }]
      : []),
  ];

  return (
    <Animated.View style={{ flex: 1, opacity: screenOpacity }}>
      <StatusBar barStyle="light-content" translucent backgroundColor="transparent" />

      {/* Full-bleed video */}
      <VideoView player={introVideoPlayer} style={StyleSheet.absoluteFill} contentFit="cover" nativeControls={false} />

      {/* Gradient: strong at top and bottom, clear in the middle */}
      <LinearGradient
        colors={['rgba(0,0,0,0.72)', 'transparent', 'rgba(0,0,0,0.88)']}
        locations={[0, 0.42, 1]}
        style={StyleSheet.absoluteFill}
      />

      <View style={{ flex: 1, paddingHorizontal: 20, paddingTop: safeTop + 16, paddingBottom: 32 }}>

        {/* BOSS BATTLE pill */}
        <View style={[bi.badgePill, { flexDirection: 'row', alignItems: 'center', gap: 8 }]}>
          <Image source={require('./assets/icons/icon-skull.png')} style={{ width: scale(16), height: scale(16) }} resizeMode="contain" />
          <Text style={bi.badgeText}><Text style={{ color: '#FFC928' }}>BOSS</Text> BATTLE! </Text>
          <Image source={require('./assets/icons/icon-lightning.png')} style={{ width: scale(14), height: scale(14) }} resizeMode="contain" />
        </View>

        {/* Boss name + tagline */}
        <Animated.View style={{ transform: [{ translateY: nameY }, { translateX: shakeX }], opacity: nameOpacity, marginTop: 12 }}>
          <View>
            {/* Line 1 — white */}
            <ScreenHeading
              textStyle={{ fontSize: bossNameSize, lineHeight: bossNameSize + 2, textAlign: 'center', color: '#FFFFFF' }}
              dropShadow={{ x: 4, y: 4 }}
            >
              {word1}
            </ScreenHeading>
            {/* Line 2 — slime lime, only if there's a second word */}
            {!!word2 && (
              <ScreenHeading
                style={{ marginTop: -Math.round(bossNameSize * 0.22) }}
                textStyle={{ fontSize: bossNameSize, lineHeight: bossNameSize + 2, textAlign: 'center', color: '#C5F215' }}
                dropShadow={{ x: 4, y: 4 }}
              >
                {word2}
              </ScreenHeading>
            )}
          </View>
          <View style={{ marginTop: 16, alignItems: 'center' }}>
            {renderTagline()}
          </View>
        </Animated.View>

        <View style={{ flex: 1 }} />

        {/* Possible Rewards */}
        <Animated.View style={{ opacity: cardOpacity, transform: [{ translateY: cardY }], marginBottom: 16 }}>
          <View style={bi.rewardsPill}>
            <Text style={bi.rewardsPillText}>POSSIBLE REWARDS</Text>
          </View>
          <View style={bi.rewardsCard}>
            {rewards.map((r, i) => (
              <View key={i} style={{ alignItems: 'center', gap: 4 }}>
                <Image source={r.icon} style={{ width: scale(60), height: scale(60) }} resizeMode="contain" />
                <Text style={{ fontSize: scale(16), fontWeight: '800', color: '#1A1A1A', fontFamily: 'FredokaOne_400Regular' }}>{r.value}</Text>
                <Text style={{ fontSize: scale(12), color: '#767676', fontFamily: 'Nunito_700Bold' }}>{r.label}</Text>
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
      <Text style={{ fontSize: scale(28), fontFamily: 'Inter_900Black', color: C.text, letterSpacing: -0.5, textAlign: 'center' }}>
        {captured ? 'CAPTURED!' : `${displayBossName} got away...`}
      </Text>
      <Text style={{ fontSize: scale(16), color: C.muted, textAlign: 'center', lineHeight: scale(22) }}>
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
  return              { label: 'Weak hit...',            color: '#767676' };
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
            <Text style={{ fontFamily: 'Inter_900Black', fontSize: scale(12), color:'#1A1A1A' }}>
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
          <View style={{ flex: 1, height: scale(28), borderRadius: scale(100), borderWidth: 2, borderColor: '#1A1A1A', backgroundColor: '#ECECEC', overflow: 'hidden', padding: 4 }}>
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
          <Text style={{ fontFamily: 'Inter_700Bold', fontSize: scale(18), color: '#1A1A1A' }}>
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
          <Text style={{ fontSize: scale(12), fontFamily: 'Inter_700Bold', color: '#3B8A3A' }}>← GREEN ZONE</Text>
          <Text style={{ fontSize: scale(12), fontFamily: 'Inter_700Bold', color: '#F59E0B', marginTop: scale(4) }}>← TOO MUCH</Text>
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
            <Text style={{ fontFamily: 'Inter_700Bold', fontSize: scale(18), color: '#1A1A1A' }}>
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
          <Text style={{ fontFamily: 'Inter_700Bold', fontSize: scale(18), color: '#1A1A1A' }}>
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
    onPanResponderGrant: () => {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    },
    onPanResponderMove: (_, g) => {
      rockDX.setValue(g.dx);
      rockDY.setValue(g.dy);
      const prevDist = Math.sqrt(pull.dx * pull.dx + pull.dy * pull.dy);
      const newDist  = Math.sqrt(g.dx * g.dx + g.dy * g.dy);
      // Tick every ~20px of pull distance
      if (Math.floor(newDist / 20) > Math.floor(prevDist / 20)) {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      }
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
      // Release haptic — heavy thud on fire
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
      setFiring(true);
      setPull({ dx: 0, dy: 0 });

      // Fly opposite to pull direction
      Animated.parallel([
        Animated.timing(rockDX, { toValue: -g.dx * 4, duration: 600, useNativeDriver: true, easing: Easing.out(Easing.quad) }),
        Animated.timing(rockDY, { toValue: -g.dy * 4, duration: 600, useNativeDriver: true, easing: Easing.out(Easing.quad) }),
      ]).start(() => {
        if (isHit) {
          setHit(true);
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        } else {
          setMiss(true);
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
        }
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
        <Text style={{ fontFamily: 'FredokaOne_400Regular', fontSize: scale(44), color: '#C5F215' }}>💥 HIT!</Text>
      </View>}
      {miss && <View style={{ ...StyleSheet.absoluteFillObject, alignItems: 'center', justifyContent: 'center' }} pointerEvents="none">
        <Text style={{ fontFamily: 'FredokaOne_400Regular', fontSize: scale(44), color: '#FF6B6B' }}>Miss!</Text>
      </View>}

      {/* Ammo — vertical stack beside the slingshot */}
      <View style={{ position: 'absolute', bottom: SLING_B, left: SLING_L + HANDLE_W + scale(8), flexDirection: 'column', gap: scale(6), justifyContent: 'center', height: HANDLE_H }}>
        {Array.from({ length: SHOTS }).map((_, i) => (
          <Image key={i} source={require('./assets/battleui/slingshotrock.png')} style={{ width: scale(36), height: scale(34), opacity: i < shotsLeft ? 1 : 0.2 }} resizeMode="contain" />
        ))}
      </View>

      {!firing && !done && <View style={{ position: 'absolute', bottom: HANDLE_H + scale(40), left: 0, right: 0, alignItems: 'center' }}>
        <Text style={{ fontFamily: 'Inter_600SemiBold', fontSize: scale(16), color: 'rgba(255,255,255,0.85)' }}>Pull back and release!</Text>
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
            <Text style={{ fontFamily: 'Inter_900Black', fontSize: scale(12), color: '#1A1A1A' }}>{dropped.length}</Text>
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
          <Text style={{ fontFamily: 'Inter_500Medium', fontSize: scale(12), color: '#767676' }}>
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
      <Text style={{ fontFamily:'FredokaOne_400Regular', fontSize: scale(44), color:'#1A1A1A' }}>{count}</Text>
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
          <Text style={{ color:'#fff', fontFamily: 'Inter_900Black', fontSize: scale(12) }}>●</Text>
        </View>
        {/* End */}
        <View style={{ position:'absolute', width: scale(28), height: scale(28), borderRadius: scale(14), backgroundColor:'#C5F215', borderWidth:2, borderColor:'#1A1A1A', left: END.x-scale(14), top: END.y-scale(14), justifyContent:'center', alignItems:'center' }}>
          <Text style={{ fontSize: scale(12) }}>★</Text>
        </View>
      </View>
      {done && <Text style={{ fontSize: scale(12), fontFamily: 'Inter_700Bold', color:'#6B35F0' }}>Slash scored!</Text>}
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
      <Text style={{ fontFamily:'FredokaOne_400Regular', fontSize: scale(44), color:'#1A1A1A' }}>{count}</Text>
      <View style={{ flexDirection:'row', gap: scale(12) }}>
        {(['left','right'] as const).map(side => (
          <TouchableOpacity key={side} onPress={() => handleSide(side)} disabled={done} activeOpacity={0.6}
            style={{ width: scale(118), height: scale(76), borderRadius: scale(16),
              backgroundColor: done ? '#ABABAB' : side === 'left' ? '#6B35F0' : '#FF3B55',
              borderWidth:2, borderColor:'#1A1A1A', justifyContent:'center', alignItems:'center' }}>
            <Text style={{ color:'#fff', fontFamily: 'Inter_900Black', fontSize: scale(28) }}>{side === 'left' ? '←' : '→'}</Text>
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

  const BOSS_INTRO_QUIPS: Record<string, string[]> = {
    'Lint Lurker':   ['I lived under\nthat couch for YEARS!', 'You dare\ndisturb my dust?!', 'So fluffy...\nSO ANGRY! 😤'],
    'Toothpaste Ooze':['I drip.\nI spread.\nI WIN! 💜', 'You can\'t wipe\nme out!', 'Minty fresh\nDESTRUCTION! 🦷'],
    'Cracklebug':    ['Every crumb is\nMINE! 🍪', 'You dare vacuum\nMY kingdom?!', 'CRUNCH! CRACKLE!\nFEAR ME!'],
    'The Pile':      ['You kept adding\nto me... FOOL!', 'I\'ve been growing\nfor WEEKS! 📦', 'Tidy THIS! 😤'],
    'Junk Giant':    ['I collect it all.\nYOU clean it up! 🗑', 'So much junk...\nso much POWER!', 'You can\'t organize\nme away!'],
    'The Clatter':   ['Everything you\nleft out FIGHTS BACK!', 'CLATTER!\nBANG! CRASH! 💥', 'Should\'ve\npicked it up!'],
    'Grimelord':     ['Filth given form.\nNeglect given FANGS!', 'The grime\nSTRIKES BACK! 🦠', 'You cannot clean\nwhat you cannot see...'],
    'Forkfang':      ['Left me in the\nsink too long! 🍴', 'BITE! STAB!\nSCRATCH! 😤', 'I BITE NOW! 🔱'],
    'Vacuumbite':    ['I swallowed the\nlast clean corner!', 'VROOM VROOM\nof DOOM! 🌀', 'Everything...\nis mine now!'],
    'The Overflow':  ['The mess spilled!\nNO CONTAINING IT!', 'I\'m EVERYWHERE\nnow! 🌊', 'Should\'ve cleaned\nit up sooner...'],
    'Mildew Queen':  ['Growing in the\nwalls since winter! 🍄', 'Bow before your\nMILDEW QUEEN!', 'You\'ll never\nscrub me out!'],
    'Dishocalypse':  ['Every dish you\nignored. EVERY ONE! 🍽', 'APOCALYPSE of\nDIRTY DISHES!', 'The sink...is\nOVERFLOWING! 😤'],
    'Void Fridge':   ['What\'s inside?\nNOBODY KNOWS... 🧊', 'Leftovers of\nDARKNESS!', 'You should\'ve\nchecked sooner...'],
    'The Forgotten': ['It was never cleaned.\nIt never FORGOT! 👁', 'I AM the\nneglect itself!', 'All forgotten things\nreturn... as ME!'],
  };

  const BOSS_HIT_QUIPS: Record<string, string[]> = {
    'Lint Lurker':   ['My FLUFF! 😤', 'Still fuzzy\nand ANGRY!', 'Not the\nlint!! 😱', 'You got lucky!'],
    'Toothpaste Ooze':['I\'m SPREADING\nmore! 💜', 'Oozing with\nRAGE!', 'You can\'t\nstop the goo!', 'Ow ow OOZ!'],
    'Cracklebug':    ['My crumbs!! 😤', 'CRUNCH that\nhurt!', 'Still crackling!', 'The floor...mine!'],
    'The Pile':      ['One piece less...\nSTILL A PILE!', 'I grow back! 📦', 'Unacceptable!! 😤', 'That tickled.'],
    'Junk Giant':    ['My collection!! 🗑', 'I\'ll just collect\nMORE!', 'Ow! My junk!', 'Not the good stuff!'],
    'The Clatter':   ['CLANG! OW! 💥', 'Still clattering!', 'That rattled me!', 'I\'ll CLATTER back!'],
    'Grimelord':     ['The grime\nholds strong! 🦠', 'You can\'t scrub\nme fully!', 'Ow... ow... OW!', 'Filth endures!'],
    'Forkfang':      ['PRONG-PAIN! 🔱', 'My tines!! 😤', 'Sharp and\nSTILL FIGHTING!', 'That\'ll leave a mark!'],
    'Vacuumbite':    ['Still has\nsuction! 🌀', 'VROOM of pain!', 'My motor!! 😤', 'Powers fading...'],
    'The Overflow':  ['Still flowing! 🌊', 'Can\'t hold\nme back!', 'The mess\nspills more!', 'OW! Still oozing!'],
    'Mildew Queen':  ['My spores!! 🍄', 'Still growing\nin the cracks!', 'I taste defeat...\nnot yet!', 'I will REGROW!'],
    'Dishocalypse':  ['My dishes!! 🍽', 'The stack\nstill falls!', 'CRASH! OW!', 'I\'m warning you!'],
    'Void Fridge':   ['The cold... fades 🧊', 'Still chilling\nwith RAGE!', 'My leftovers!!', 'Into the void...'],
    'The Forgotten': ['I remember\nthis pain... 👁', 'Still here.\nStill forgotten.', 'You won\'t\nforget ME!', 'I. Endure.'],
  };

  const fallbackIntro = ['You dare\nchallenge ME?!', 'This ends NOW! 😤', 'Prepare yourself!'];
  const fallbackHit   = ['OW! That tickled.', 'You got lucky!', 'Unacceptable!! 😤', 'Ow ow ow OW!'];

  const INTRO_QUIPS = BOSS_INTRO_QUIPS[boss.name] ?? fallbackIntro;
  const HIT_QUIPS   = BOSS_HIT_QUIPS[boss.name]   ?? fallbackHit;

  const [quip, setQuip]         = useState('');
  const bubbleAnim              = useRef(new Animated.Value(0)).current;
  const bubbleTimer             = useRef<ReturnType<typeof setTimeout> | null>(null);

  const MAX_LINE = 16;
  const clampQuip = (text: string) =>
    text.split('\n').map(line => line.length > MAX_LINE ? line.slice(0, MAX_LINE - 1) + '…' : line).slice(0, 3).join('\n');

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
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium); // player lands a hit
    showBubble(HIT_QUIPS[Math.floor(Math.random() * HIT_QUIPS.length)], 1800);
    setLog(`${monsterName} used ${attackName}! Dealt ${dmg} damage!`);
    if (newEH <= 0) {
      setLive(false);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success); // victory!
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
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy); // boss hits player
      setLog(`${boss.name} used ${atk}!${shield} Dealt ${d} dmg!`);
      if (newPH <= 0) {
        setLive(false);
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error); // defeat
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
            <Text style={{ fontFamily: 'Inter_700Bold', fontSize: scale(12), color: '#FFFFFF' }}>{monsterName}</Text>
            <Text style={{ fontFamily: 'Inter_600SemiBold', fontSize: scale(12), color: 'rgba(255,255,255,0.7)' }}>{playerHp}/{PLAYER_MAX}</Text>
          </View>
          <View style={b.hpTrack}>
            <Animated.View style={[b.hpFill, { backgroundColor: '#C5F215', width: playerHpAnim.interpolate({ inputRange:[0,1], outputRange:['0%','100%'] }) as any }]} />
          </View>
        </View>

        <Text style={{ fontFamily: 'Inter_900Black', fontSize: scale(12), color: 'rgba(255,255,255,0.5)', alignSelf: 'center', marginTop: -6 }}>VS</Text>

        {/* Boss */}
        <View style={{ flex: 1, gap: 4 }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
            <Text style={{ fontFamily: 'Inter_700Bold', fontSize: scale(12), color: '#FFFFFF' }}>{boss.name}</Text>
            <Text style={[{ fontFamily: 'Inter_600SemiBold', fontSize: scale(12), color: 'rgba(255,255,255,0.7)' }, enemyHp < ENEMY_MAX * 0.25 && { color: '#FF6B6B' }]}>{enemyHp}/{ENEMY_MAX}</Text>
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
            fontSize: quip.length > 40 ? scale(15) : quip.length > 24 ? scale(17) : scale(20),
            color: '#1A1A1A',
            textAlign: 'center',
            paddingHorizontal: 20,
            paddingBottom: 20,
            lineHeight: quip.length > 40 ? scale(19) : quip.length > 24 ? scale(21) : scale(24),
          }}>{quip}</Text>
        </Animated.View>
      </View>


      {/* ── Action area ── */}
      <View style={{ flex:1 }}>

        {/* Combo reveal */}
        {phase === 'combo-reveal' && combo && (
          <View style={{ flex:1, alignItems:'center', justifyContent:'center', gap: scale(8) }}>
            <Text style={{ fontFamily:'FredokaOne_400Regular', fontSize: scale(44), color: combo.color, textAlign:'center' }}>{combo.label}</Text>
            <Text style={{ fontSize: scale(22), fontFamily: 'Inter_900Black', color:'#FFFFFF' }}>{combo.score} pts</Text>
          </View>
        )}

        {/* Boss turn */}
        {phase === 'boss-turn' && (
          <View style={{ flex:1, alignItems:'center', justifyContent:'center' }}>
            <Text style={{ fontSize: scale(28), fontFamily: 'Inter_900Black', color:'#FF6B6B' }}>⚔ Boss Attack!</Text>
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

function KidPayoutScreen({ amount, completedCount, weeks, battleWon, battleBonus, monsterImg, monsterName, onDismiss }: {
  amount: number; completedCount: number; weeks: UnpaidWeek[]; battleWon: boolean | null;
  battleBonus: number | null; monsterImg: number; monsterName: string;
  onDismiss: () => void;
}) {
  const { width: W, height: H } = Dimensions.get('window');
  const insets = useSafeAreaInsets();
  const { scaleAnim: collectScale, pressIn: collectPI, pressOut: collectPO } = useScaleAnimation({ toScale: 0.96 });
  const bgColor = battleWon === true ? '#C5F215' : '#FFF9E6';

  // Confetti animated values — use ref to avoid recreating on re-render
  const confettiAnims = useRef(
    CONF_DATA.map(() => new Animated.Value(0))
  ).current;

  // Monster bob
  const monsterBob = useBob(0, 10, 2000);

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

  // Multiple unpaid weeks → switch headline + show one pill per week.
  const isMultiWeek = weeks.length >= 2;
  const headline = isMultiWeek ? `earned across ${weeks.length} weeks!` : 'earned this week!';
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
            <Text style={{ fontSize: scale(22), fontFamily: 'Inter_700Bold', color: '#1A1A1A' }}>{headline}</Text>
          </>
        ) : (
          <Text style={{ fontSize: scale(28), fontFamily: 'Inter_900Black', color: '#1A1A1A', textAlign: 'center' }}>Great work this week! 🎉</Text>
        )}

        {/* Breakdown pills — one per unpaid week when multiple weeks accumulated,
            otherwise the original single chore-count pill (unchanged). */}
        {isMultiWeek ? (
          <View style={{ width: '100%', maxWidth: 360, gap: 8 }}>
            {weeks.map(w => (
              <View key={w.weekKey} style={{ backgroundColor: '#FFFFFF', borderRadius: 100, borderWidth: 2, borderColor: '#1A1A1A', paddingHorizontal: 20, paddingVertical: 12, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', ...SOLID_SHADOW }}>
                <Text style={{ fontSize: scale(12), fontFamily: 'Inter_700Bold', color: '#1A1A1A' }}>{w.label}</Text>
                <Text style={{ fontSize: scale(12), fontFamily: 'Inter_700Bold', color: '#1A1A1A' }}>{w.choreCount} chores ✓</Text>
              </View>
            ))}
            {battleBonus != null && battleBonus > 0 && (
              <View style={{ backgroundColor: '#FFFFFF', borderRadius: 100, borderWidth: 2, borderColor: '#1A1A1A', paddingHorizontal: 20, paddingVertical: 12, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', ...SOLID_SHADOW }}>
                <Text style={{ fontSize: scale(12), fontFamily: 'Inter_700Bold', color: '#1A1A1A' }}>Boss Battle bonus 🏆</Text>
                <Text style={{ fontSize: scale(12), fontFamily: 'Inter_700Bold', color: '#1A1A1A' }}>+{fmtDollars(battleBonus)}</Text>
              </View>
            )}
          </View>
        ) : (
          <View style={{ backgroundColor: '#FFFFFF', borderRadius: 100, borderWidth: 2, borderColor: '#1A1A1A', paddingHorizontal: 20, paddingVertical: 12, flexDirection: 'row', alignItems: 'center', gap: 4, ...SOLID_SHADOW }}>
            <Text style={{ fontSize: scale(12), fontFamily: 'Inter_700Bold', color: '#1A1A1A' }}>{breakdownBase}{breakdownSuffix}</Text>
            {battleWon === true && <Image source={require('./assets/icons/icon-trophy.png')} style={{ width: scale(14), height: scale(14) }} resizeMode="contain" />}
          </View>
        )}

        {/* Collect button */}
        <TouchableOpacity
          style={{ backgroundColor: '#FFFFFF', borderRadius: 18, borderWidth: 2.5, borderColor: '#1A1A1A', paddingVertical: 20, paddingHorizontal: 48, alignItems: 'center', ...SOLID_SHADOW, marginTop: 8 }}
          onPress={onDismiss}
          onPressIn={collectPI} onPressOut={collectPO}
          activeOpacity={1}
        >
          <Animated.View style={{ transform: [{ scale: collectScale }] }}>
            <Text style={{ fontSize: scale(18), fontFamily: 'Inter_900Black', color: '#1A1A1A' }}>Collect!</Text>
          </Animated.View>
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
  const weeklyEarnings = Math.max(1, baseRateCents(baseRate) * 5);
  const weeksToGo      = leftCents > 0 ? Math.ceil(leftCents / weeklyEarnings) : 0;
  const weeksSaving    = Math.round(goal.savedCents / weeklyEarnings);
  const totalWeeks     = Math.round(targetCents / weeklyEarnings);

  // Always format as $X.XX — never mix cents and dollars on this screen
  const fmtD = (cents: number) => `$${(cents / 100).toFixed(2)}`;

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
        <Text style={{ fontSize: scale(12), color: '#767676', fontFamily: 'Inter_600SemiBold', lineHeight: scale(17) }}>
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
          <StatCard key="a" icon={coinIcon}   value={fmtD(goal.savedCents)} label="Earned toward"    variant="purple" />,
          <StatCard key="b" icon={coinIcon}   value={fmtD(leftCents)}       label="Almost there!"   variant="purple" />,
        ],
        [
          <StatCard key="c" icon={calIcon}    value={`~${weeksToGo}w`}      label="Weeks to go"      variant="green" />,
          <StatCard key="d" icon={starIcon}   value={`${Math.round(pct * 100)}%`} label="% of the way there" variant="default" />,
        ],
      ];
    }
    if (pct >= 0.5) {
      // 50–89% — over halfway
      return [
        [
          <StatCard key="a" icon={coinIcon}   value={fmtD(goal.savedCents)} label="Earned toward"    variant="purple" />,
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
          <StatCard key="a" icon={coinIcon}   value={fmtD(goal.savedCents)} label="Earned toward"    variant="purple" />,
          <StatCard key="b" icon={coinIcon}   value={fmtD(leftCents)}       label="Still needed"     variant="default" />,
        ],
        [
          <StatCard key="c" icon={calIcon}    value={`~${weeksToGo}w`}      label="Weeks to go"      variant="default" />,
          <StatCard key="d" icon={streakIcon} value={`${Math.max(1, weeksSaving)}w`} label="Weeks earning" variant="default" />,
        ],
      ];
    }
    // 0–24% — just getting started: 2 cards only, no weeks-to-go
    return [
      [
        <StatCard key="a" icon={coinIcon} value={fmtD(goal.savedCents)} label="Earned toward"  variant="purple" />,
        <StatCard key="b" icon={coinIcon} value={fmtD(targetCents)}     label="Goal target"   variant="default" />,
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

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 120, gap: 16 }}>

        {/* ── Hero card ── */}
        <View style={{ backgroundColor: heroBg, borderRadius: 24, borderWidth: 2, borderColor: '#1A1A1A', paddingVertical: 32, alignItems: 'center', ...SOLID_SHADOW }}>
          <View style={{ width: scale(200), height: scale(200), borderRadius: scale(100), backgroundColor: 'rgba(255,255,255,0.15)', alignItems: 'center', justifyContent: 'center' }}>
            <Image source={goal.icon} style={{ width: scale(180), height: scale(180) }} resizeMode="contain" />
          </View>
        </View>

        {/* ── Name ── */}
        <Text style={{ fontSize: scale(28), fontFamily: 'Inter_900Black', color: '#1A1A1A', textAlign: 'center', letterSpacing: -0.5 }}>
          {goal.name}
        </Text>

        {/* ── Amount + progress ── */}
        <View style={{ gap: 12 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <Image source={require('./assets/icons/icon-coin.png')} style={{ width: scale(22), height: scale(22) }} resizeMode="contain" />
            <Text style={{ fontSize: scale(18), fontFamily: 'Inter_900Black', color: '#1A1A1A' }}>{fmtD(goal.savedCents)}</Text>
            <Text style={{ fontSize: scale(16), color: '#767676', fontFamily: 'Inter_600SemiBold' }}>/ {fmtD(targetCents)}</Text>
          </View>
          <ProgressBar value={pct * 100} max={100} fillColor={heroBg} />
          <View style={{ flexDirection: 'row', justifyContent: 'flex-end' }}>
            <Text style={{ fontSize: scale(12), fontFamily: 'Inter_700Bold', color: heroBg }}>
              {leftCents > 0 ? `${fmtD(leftCents)} left!` : '🎉 Goal reached!'}
            </Text>
          </View>
        </View>

        {/* ── Stage label pill ── */}
        <View style={{ alignSelf: 'flex-start', backgroundColor: pct >= 1 ? '#D8F52F' : '#EAE4FF', borderRadius: 100, paddingHorizontal: 16, paddingVertical: 8, borderWidth: 1.5, borderColor: '#1A1A1A' }}>
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

function Toast({ message, bgColor, textColor }: { message: string; bgColor?: string; textColor?: string }) {
  const opacity = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(-20)).current;
  useEffect(() => {
    Animated.sequence([
      Animated.parallel([
        Animated.timing(opacity,     { toValue: 1, duration: 220, useNativeDriver: true }),
        Animated.spring(translateY,  { toValue: 0, useNativeDriver: true, tension: 80, friction: 12 }),
      ]),
      Animated.delay(2200),
      Animated.timing(opacity, { toValue: 0, duration: 300, useNativeDriver: true }),
    ]).start();
  }, []);
  return (
    <Animated.View style={{ position: 'absolute', top: 60, left: 24, right: 24, opacity, transform: [{ translateY }], alignItems: 'center', pointerEvents: 'none' }}>
      <View style={{ backgroundColor: bgColor ?? '#1A1A1A', borderRadius: 100, paddingHorizontal: 20, paddingVertical: 12, borderWidth: bgColor ? 1.5 : 0, borderColor: bgColor ? 'rgba(0,0,0,0.08)' : 'transparent' }}>
        <Text style={{ color: textColor ?? '#FFFFFF', fontSize: scale(12), fontFamily: 'Inter_700Bold' }}>{message}</Text>
      </View>
    </Animated.View>
  );
}

function WalletScreen({ coins, weeklyEarnedCents, weeklyHistory, done, battleResult, monsterIdx, baseRate, goals, onAddGoal, onOpenGoalFlow, currentStreak, onEditGoal, onDeleteGoal, monsterName, weeklyXp, onSwitchToParent, managedChores, kidProfiles, onSwitchToKid, currentKidName, initialAvatarIdx, onOpenTrophyRoom, onOpenRelicDetail, parentRole = '' }: {
  coins: number;
  weeklyEarnedCents: number;
  weeklyHistory: WeekHistoryRow[];
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
  parentRole?: string;
}) {
  const completedChoresCount = managedChores.filter(c => c.status === 'approved').length;
  const [showGoalModal, setShowGoalModal]           = useState(false);
  const [selectedGoal, setSelectedGoal]             = useState<SavedGoal | null>(null);
  const [editingGoal, setEditingGoal]               = useState<SavedGoal | null>(null);
  const [kidAgeRange,  setKidAgeRange]              = useState('Ages 7–9');
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
          <KidAvatarBadge idx={initialAvatarIdx} />
          <View style={{ gap: 4 }}>
            <ViewSwitcher
              selected={currentKidName || 'Kid view'}
              options={[
                ...kidProfiles.map(k => ({ label: k.name, emoji: '🧒', bg: k.avatarColor || '#EAE4FF', image: getAvatarImage(k.avatarIdx) })),
                { label: 'Parent view', image: getParentAvatar(parentRole ?? ''), bg: '#C5F215' },
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
              <Text style={{ fontSize: scale(22), fontFamily: 'Inter_900Black', color: '#1A1A1A', letterSpacing: -1 }}>{currentStreak}</Text>
              <Text style={{ fontSize: scale(12), color: '#767676', fontFamily: 'Inter_600SemiBold' }}>Day Streak</Text>
            </View>
          </View>
          {/* Coins */}
          <View style={{ flex: 1, backgroundColor: '#FFFFFF', borderRadius: 16, borderWidth: 2, borderColor: '#1A1A1A', padding: 16, flexDirection: 'row', alignItems: 'center', gap: 12, ...SOLID_SHADOW }}>
            <Image source={require('./assets/icons/icon-coin.png')} style={{ width: scale(36), height: scale(36) }} resizeMode="contain" />
            <View>
              <Text style={{ fontSize: scale(22), fontFamily: 'Inter_900Black', color: '#1A1A1A', letterSpacing: -1 }}>{fmtDollars(coins)}</Text>
              <Text style={{ fontSize: scale(12), color: '#767676', fontFamily: 'Inter_600SemiBold' }}>Unpaid</Text>
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
              <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 4, marginBottom: 12 }}>
                <Text style={{ fontSize: scale(18), fontFamily: 'Inter_900Black', color: '#1A1A1A' }}>{fmtDollars(savedCents)}</Text>
                <Text style={{ fontSize: scale(12), color: '#767676', fontFamily: 'Inter_600SemiBold' }}>/ ${currentGoal.amount}</Text>
              </View>

              {/* Progress bar + left label */}
              <ProgressBar value={pct * 100} max={100} fillColor={pct >= 1 ? '#D8F52F' : '#6B35F0'} style={{ marginBottom: 8 }} />
              <View style={{ flexDirection: 'row', justifyContent: 'flex-end' }}>
                <Text style={{ fontSize: scale(12), fontFamily: 'Inter_700Bold', color: pct >= 1 ? '#111111' : '#6B35F0' }}>
                  {leftCents > 0 ? `${fmtDollars(leftCents)} left!` : '🎉 Goal reached!'}
                </Text>
              </View>
            </TouchableOpacity>
          ) : (
            /* Empty state */
            <TouchableOpacity
              style={{ alignItems: 'center', paddingVertical: 24, gap: 12 }}
              onPress={() => { setEditingGoal(null); setShowGoalModal(true); }}
              activeOpacity={0.8}
            >
              <View style={{ width: scale(100), height: scale(100), borderRadius: scale(50), backgroundColor: '#EAE4FF', alignItems: 'center', justifyContent: 'center' }}>
                <Image source={require('./assets/icons/icon-goals.png')} style={{ width: scale(52), height: scale(52) }} resizeMode="contain" />
              </View>
              <Text style={{ fontSize: scale(18), fontFamily: 'Inter_800ExtraBold', color: '#1A1A1A' }}>No goal set yet</Text>
              <Text style={{ fontSize: scale(12), color: '#767676', textAlign: 'center' }}>What are you saving up for?</Text>
              <View style={{ backgroundColor: '#6B35F0', borderRadius: 12, borderWidth: 2, borderColor: '#1A1A1A', paddingHorizontal: 20, paddingVertical: 12, marginTop: 4, ...SOLID_SHADOW }}>
                <Text style={{ fontSize: scale(12), fontFamily: 'Inter_800ExtraBold', color: '#FFFFFF' }}>+ Set a goal</Text>
              </View>
            </TouchableOpacity>
          )}
        </View>

        {/* ── This week ─────────────────────────────── */}
        <View>
          <Text style={{ fontSize: scale(18), fontFamily: 'Inter_900Black', color: '#1A1A1A', marginBottom: 12 }}>This week</Text>
          <View style={{ backgroundColor: '#FFFFFF', borderRadius: 20, borderWidth: 2, borderColor: '#1A1A1A', padding: 20, flexDirection: 'row', ...SOLID_SHADOW }}>
            {/* Chores Done */}
            <View style={{ flex: 1, alignItems: 'center', gap: 8 }}>
              <Image source={require('./assets/icons/icon-completed.png')} style={{ width: scale(36), height: scale(36) }} resizeMode="contain" />
              <Text style={{ fontSize: scale(28), fontFamily: 'Inter_900Black', color: '#1A1A1A', letterSpacing: -1 }}>{completedChoresCount}</Text>
              <Text style={{ fontSize: scale(12), color: '#767676', fontFamily: 'Inter_600SemiBold', textAlign: 'center' }}>Chores Done</Text>
            </View>
            {/* Divider */}
            <View style={{ width: 1, backgroundColor: '#ECEAE4', marginVertical: 4 }} />
            {/* Coins Earned */}
            <View style={{ flex: 1, alignItems: 'center', gap: 8 }}>
              <Image source={require('./assets/icons/icon-coin.png')} style={{ width: scale(36), height: scale(36) }} resizeMode="contain" />
              <Text style={{ fontSize: scale(28), fontFamily: 'Inter_900Black', color: '#1A1A1A', letterSpacing: -1 }}>{fmtDollars(weeklyEarnedCents)}</Text>
              <Text style={{ fontSize: scale(12), color: '#767676', fontFamily: 'Inter_600SemiBold', textAlign: 'center' }}>Earned</Text>
            </View>
            {/* Divider */}
            <View style={{ width: 1, backgroundColor: '#ECEAE4', marginVertical: 4 }} />
            {/* XP Earned */}
            <View style={{ flex: 1, alignItems: 'center', gap: 8 }}>
              <Image source={require('./assets/icons/icon-star.png')} style={{ width: scale(36), height: scale(36) }} resizeMode="contain" />
              <Text style={{ fontSize: scale(28), fontFamily: 'Inter_900Black', color: '#1A1A1A', letterSpacing: -1 }}>{weeklyXp.toLocaleString()}</Text>
              <Text style={{ fontSize: scale(12), color: '#767676', fontFamily: 'Inter_600SemiBold', textAlign: 'center' }}>XP earned</Text>
            </View>
          </View>
        </View>

        {/* ── By week — earnings history (MON-34) ──────────────────────────── */}
        {weeklyHistory.length > 0 && (
          <View>
            <Text style={{ fontSize: scale(22), fontFamily: 'Inter_800ExtraBold', color: '#1A1A1A', marginBottom: 12 }}>By week</Text>
            <View style={{ gap: 12 }}>
              {weeklyHistory.map((w) => (
                <View key={w.weekKey} style={{ backgroundColor: '#FFFFFF', borderRadius: 16, borderWidth: 2, borderColor: '#1A1A1A', paddingHorizontal: 16, paddingVertical: 14, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', ...SOLID_SHADOW }}>
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontSize: scale(18), fontFamily: 'Inter_800ExtraBold', color: '#1A1A1A' }}>{w.label}</Text>
                    <Text style={{ fontSize: scale(12), color: '#767676', fontFamily: 'Inter_600SemiBold', marginTop: 2 }}>
                      {w.paid ? w.paidLabel : `${w.choreCount} chore${w.choreCount === 1 ? '' : 's'} approved`}
                    </Text>
                  </View>
                  <Text style={{ fontSize: scale(18), fontFamily: 'Inter_900Black', color: w.paid ? '#3B8A3A' : '#1A1A1A' }}>
                    {fmtDollars(w.earnedCents)}{w.paid ? ' ✓' : ''}
                  </Text>
                </View>
              ))}
            </View>
            <Text style={{ fontSize: scale(12), fontFamily: 'SpaceMono_700Bold', color: '#767676', textAlign: 'center', letterSpacing: 0.5, lineHeight: scale(18), marginTop: 16 }}>
              MONSTIR TRACKS WHAT YOU EARNED. NO REAL MONEY LIVES IN THE APP.
            </Text>
          </View>
        )}

        {/* ── Other goals (if more than one) ───────── */}
        {goals.length > 1 && (
          <View>
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
              <Text style={{ fontSize: scale(18), fontFamily: 'Inter_900Black', color: '#1A1A1A' }}>Other goals</Text>
              <TouchableOpacity
                style={{ backgroundColor: '#C5F215', borderRadius: 20, borderWidth: 2, borderColor: '#1A1A1A', paddingHorizontal: 16, paddingVertical: 8, ...SOLID_SHADOW }}
                onPress={() => { setEditingGoal(null); setShowGoalModal(true); }}
                activeOpacity={0.8}
              >
                <Text style={{ fontSize: scale(12), fontFamily: 'Inter_800ExtraBold', color: '#1A1A1A' }}>+ Add</Text>
              </TouchableOpacity>
            </View>
            <View style={{ gap: 12 }}>
              {goals.slice(1).map(goal => {
                const tCents = Math.round(parseFloat(goal.amount || '0') * 100);
                const p      = tCents > 0 ? Math.min(1, goal.savedCents / tCents) : 0;
                return (
                  <TouchableOpacity
                    key={goal.id}
                    onPress={() => setSelectedGoal(goal)}
                    activeOpacity={0.8}
                    style={{ backgroundColor: '#FFFFFF', borderRadius: 14, borderWidth: 2, borderColor: '#1A1A1A', padding: 16, ...SOLID_SHADOW }}
                  >
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 12 }}>
                      <Image source={goal.icon} style={{ width: scale(40), height: scale(40) }} resizeMode="contain" />
                      <View style={{ flex: 1 }}>
                        <Text style={{ fontSize: scale(16), fontFamily: 'Inter_700Bold', color: '#1A1A1A' }}>{goal.name}</Text>
                        <Text style={{ fontSize: scale(12), color: '#767676', marginTop: 4 }}>{fmtDollars(goal.savedCents)} of ${goal.amount}</Text>
                      </View>
                      <Text style={{ fontSize: scale(12), fontFamily: 'Inter_800ExtraBold', color: '#6B35F0' }}>{Math.round(p * 100)}%</Text>
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
                onEditGoal({ ...editingGoal, name: data.name, amount: data.amount, color: data.color, iconKey: data.iconKey, icon: data.icon, category: data.category });
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
            initialData={editingGoal ? { name: editingGoal.name, amount: editingGoal.amount, category: editingGoal.category, color: editingGoal.color, iconKey: editingGoal.iconKey, icon: editingGoal.icon } : undefined}
            monsterName={monsterName}
          />
        </SafeAreaProvider>
      </Modal>

      {/* Toast */}
      {toastMsg && <Toast key={toastMsg + Date.now()} message={toastMsg} />}
    </View>
  );
}

// ─── Parent Screens ───────────────────────────────────────────────────────────

function ParentPayoutScreen({ kidCoins, kidProfiles, payoutLog, onConfirm, onBack }: {
  kidCoins: Record<string, number>;
  kidProfiles: { name: string; avatarColor: string; avatarIdx: number }[];
  payoutLog: { kidName: string; amount: number; paidAt: string }[];
  onConfirm: (kidName: string) => void;
  onBack: () => void;
}) {
  const { scaleAnim: backScl, pressIn: backPI, pressOut: backPO } = useScaleAnimation({ toScale: 0.85 });
  const kidsWithBalance = kidProfiles.filter(k => (kidCoins[k.name] ?? 0) > 0);
  const hasAnyBalance   = kidsWithBalance.length > 0;

  return (
    <CreamBg>
      {/* Header */}
      <View style={p.screenHeader}>
        <TouchableOpacity onPress={onBack} onPressIn={backPI} onPressOut={backPO} activeOpacity={1} style={p.backBtn}>
          <Animated.View style={{ transform: [{ scale: backScl }] }}>
            <Text style={p.backBtnText}>←</Text>
          </Animated.View>
        </TouchableOpacity>
        <Text style={p.screenTitle}>Pay out</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView style={{ flex: 1 }} showsVerticalScrollIndicator={false} contentContainerStyle={{ padding: 16, gap: 16, paddingBottom: 40 }}>
        {!hasAnyBalance && (
          <View style={{ alignItems: 'center', paddingVertical: 48, gap: 12 }}>
            <Text style={{ fontSize: scale(28) }}>🎉</Text>
            <Text style={{ fontSize: scale(18), fontFamily: 'Inter_800ExtraBold', color: '#1A1A1A', textAlign: 'center' }}>No pending payouts</Text>
            <Text style={{ fontSize: scale(12), fontFamily: 'Inter_500Medium', color: '#767676', textAlign: 'center' }}>All kids have been paid out.</Text>
          </View>
        )}

        {kidProfiles.map((kid, i) => {
          const balance = kidCoins[kid.name] ?? 0;
          return (
            <View key={`${kid.name}-${i}`} style={[p.sectionCard, { gap: 12 }]}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                <View style={{ width: 48, height: 48, borderRadius: 24, backgroundColor: kid.avatarColor, alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: '#1A1A1A' }}>
                  <Image source={getAvatarImage(kid.avatarIdx)} style={{ width: 38, height: 38, borderRadius: 19 }} resizeMode="cover" />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={{ fontSize: scale(18), fontFamily: 'Inter_800ExtraBold', color: '#1A1A1A' }}>{kid.name}</Text>
                  <Text style={{ fontSize: scale(12), fontFamily: 'Inter_500Medium', color: balance > 0 ? '#3B8A3A' : '#ABABAB', marginTop: 4 }}>
                    {balance > 0 ? `Earned this week: ${fmtDollars(balance)}` : 'Nothing owed right now'}
                  </Text>
                </View>
                {balance > 0 ? (
                  <TouchableOpacity
                    style={{ backgroundColor: '#C5F215', borderRadius: 10, paddingHorizontal: 16, paddingVertical: 8, borderWidth: 2, borderColor: '#1A1A1A' }}
                    onPress={() => onConfirm(kid.name)}
                    activeOpacity={0.75}
                  >
                    <Text style={{ fontSize: scale(12), fontFamily: 'Inter_700Bold', color: '#1A1A1A' }}>Mark as paid</Text>
                  </TouchableOpacity>
                ) : (
                  <View style={{ backgroundColor: '#F0F0F0', borderRadius: 10, paddingHorizontal: 16, paddingVertical: 8 }}>
                    <Text style={{ fontSize: scale(12), fontFamily: 'Inter_600SemiBold', color: '#767676' }}>Paid ✓</Text>
                  </View>
                )}
              </View>
            </View>
          );
        })}

        {payoutLog.length > 0 && (
          <View style={{ gap: 12 }}>
            <Text style={{ fontSize: scale(18), fontFamily: 'Inter_800ExtraBold', color: '#1A1A1A' }}>Recent payouts</Text>
            {payoutLog.slice(0, 20).map((entry, i) => (
              <View key={i} style={[p.sectionCard, { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 16 }]}>
                <View style={{ gap: 4 }}>
                  <Text style={{ fontSize: scale(16), fontFamily: 'Inter_700Bold', color: '#1A1A1A' }}>{entry.kidName}</Text>
                  <Text style={{ fontSize: scale(12), fontFamily: 'Inter_500Medium', color: '#767676' }}>
                    {new Date(entry.paidAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                  </Text>
                </View>
                <Text style={{ fontSize: scale(16), fontFamily: 'Inter_800ExtraBold', color: '#3B8A3A' }}>{fmtDollars(entry.amount)}</Text>
              </View>
            ))}
          </View>
        )}

        <Text style={{ fontSize: scale(12), color: '#767676', textAlign: 'center', marginTop: 4 }}>
          This is a reminder to pay, not a transfer. You're in control of how you pay.
        </Text>
      </ScrollView>
    </CreamBg>
  );
}

// ─── MoneyScreen (MON-75) ─────────────────────────────────────────────────────

type ChoreHistoryEntry = {
  id: string;
  choreName: string;
  kidName: string;
  earnedCents: number;
  approvedAt: string;
  icon: string | number;
  bg: string;
};

function MoneyScreen({
  kidCoins,
  kidProfiles,
  choreHistory,
  payoutLog,
  baseRate,
  onConfirm,
  debugDayOffset = 0,
}: {
  kidCoins: Record<string, number>;
  kidProfiles: { name: string; avatarColor: string; avatarIdx: number }[];
  choreHistory: ChoreHistoryEntry[];
  payoutLog: { kidName: string; amount: number; paidAt: string }[];
  baseRate: string;
  onConfirm: (kidName: string) => void;
  debugDayOffset?: number;
}) {
  const insets = useSafeAreaInsets();

  // ── Single ledger — every figure on this screen derives from here ──────────
  // (MON-75) Home, Money, and the kid peek all read the same selector so the
  // same week can never show two different numbers ("two witnesses" bug).
  const kidNames = kidProfiles.map(k => k.name);
  const ledger = useMemo(
    () => computeFamilyLedger(kidNames, kidCoins, choreHistory, payoutLog, debugDayOffset),
    [kidNames.join('|'), kidCoins, choreHistory, payoutLog, debugDayOffset],
  );
  const owedCents     = ledger.owedCents;
  const settled       = owedCents === 0;

  // ── Activity filter ───────────────────────────────────────────────────────
  const [activityFilter, setActivityFilter] = useState<string>('all');

  // Lazy render: the history is unbounded (one entry per approval, never
  // trimmed), and mounting every row synchronously is what made this screen
  // slow to open. Render the newest chunk and grow on demand via "Show more".
  const ACTIVITY_CHUNK = 30;
  const [visibleCount, setVisibleCount] = useState(ACTIVITY_CHUNK);

  // Per-entry "paid" status, ledger-consistent: an approved chore is paid once a
  // payout dated at/after its approval lands. (The old screen marked an entry
  // paid whenever the kid's *current* balance hit 0, which mislabelled history
  // the moment a new week's earnings arrived.) Seed/test rows are excluded.
  const lastPaidByKid = useMemo(() => {
    const m: Record<string, string> = {};
    payoutLog.forEach(p => { if (!m[p.kidName] || p.paidAt > m[p.kidName]) m[p.kidName] = p.paidAt; });
    return m;
  }, [payoutLog]);
  const isEntryPaid = (e: ChoreHistoryEntry) => {
    const lp = lastPaidByKid[e.kidName];
    return !!lp && e.approvedAt <= lp;
  };
  const cleanedHistory = useMemo(
    () => choreHistory.filter(e => e.choreName.trim().toLowerCase() !== 'test'),
    [choreHistory],
  );

  const filteredHistory = useMemo(() => (
    activityFilter === 'all'
      ? cleanedHistory
      : cleanedHistory.filter(e => e.kidName === activityFilter)
  ), [cleanedHistory, activityFilter]);

  // ── Group by date — only the visible slice (history is newest-first) ───────
  const grouped = useMemo(() => {
    const out: { date: string; entries: ChoreHistoryEntry[] }[] = [];
    const seenDates: Record<string, number> = {};
    filteredHistory.slice(0, visibleCount).forEach(e => {
      const d = new Date(e.approvedAt).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
      if (seenDates[d] === undefined) {
        seenDates[d] = out.length;
        out.push({ date: d, entries: [] });
      }
      out[seenDates[d]].entries.push(e);
    });
    return out;
  }, [filteredHistory, visibleCount]);
  const hiddenCount = Math.max(0, filteredHistory.length - visibleCount);

  // ── Derived for selected kid ──────────────────────────────────────────────

  // MON-83: per-child "Mark paid" breakdown sheet. Opening it on a kid shows a
  // per-week breakdown (one row per unpaid week) before confirming the payout.
  const [payoutSheetKid, setPayoutSheetKid] = useState<string | null>(null);
  const payoutSheetLedger = payoutSheetKid
    ? ledger.perKid.find(k => k.kidName === payoutSheetKid) ?? null
    : null;
  const payoutSheetProfile = payoutSheetKid
    ? kidProfiles.find(k => k.name === payoutSheetKid) ?? null
    : null;
  // Slide-up sheet chrome: the scrim appears instantly (opacity set, not animated)
  // while only the sheet itself slides up — see useSheet. Driven by payoutSheetKid.
  const { open: payoutSheetOpen, openSheet: openPayoutSheet, closeSheet: closePayoutSheet, scrimOpacity: payoutScrimOpacity, sheetY: payoutSheetY } = useSheet(600);
  const closePayoutSheet_ = () => closePayoutSheet(() => setPayoutSheetKid(null));
  useEffect(() => {
    if (payoutSheetKid) openPayoutSheet();
  }, [payoutSheetKid]);
  // Reconcile the per-week rows to the live owed balance (the source of truth)
  // so the breakdown can never out-total what's actually owed, even if
  // choreHistory and the live balance drift apart (the "two witnesses" risk).
  // Payments settle oldest-first, so the owed remainder maps to the NEWEST
  // weeks: walk newest→oldest taking each week up to the remaining owed amount
  // (clamping the last partial week), then any leftover is non-chore credit
  // (battle bonus). Rows + bonus therefore always sum to exactly `owedCents`.
  const payoutSheetRows: UnpaidWeek[] = [];
  let payoutSheetBonus = 0;
  if (payoutSheetLedger) {
    let remaining = payoutSheetLedger.owedCents;
    for (const w of [...payoutSheetLedger.unpaidWeeks].reverse()) {
      if (remaining <= 0) break;
      const amt = Math.min(w.earnedCents, remaining);
      payoutSheetRows.push({ ...w, earnedCents: amt });
      remaining -= amt;
    }
    payoutSheetRows.reverse();
    payoutSheetBonus = remaining;
  }

  // ── Avatar initial color ──────────────────────────────────────────────────
  const AVATAR_COLORS = ['#8B5CF6', '#EC4899', '#F59E0B', '#10B981', '#3B82F6', '#EF4444'];
  const avatarColor = (name: string, idx: number) =>
    kidProfiles.find(k => k.name === name)?.avatarColor ?? AVATAR_COLORS[idx % AVATAR_COLORS.length];

  return (
    <View style={{ flex: 1, backgroundColor: '#F7F6F2' }}>
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ paddingBottom: 120 + insets.bottom }}
        showsVerticalScrollIndicator={false}
      >
        {/* ── Hero Card — owed leads (MON-75) ─────────────────────────────── */}
        <View style={{
          margin: 16,
          borderRadius: 20,
          backgroundColor: '#6B35F0',
          borderWidth: 2.5,
          borderColor: '#1A1A1A',
          ...shadows.solid,
          overflow: 'visible',
        }}>
          <View style={{ padding: 20 }}>
            {/* Label */}
            <Text style={{
              fontFamily: 'Inter_900Black',
              fontSize: scale(16),
              color: 'rgba(255,255,255,0.7)',
              letterSpacing: 1.5,
              textTransform: 'uppercase',
              marginBottom: 4,
            }}>
              {settled ? 'All settled up' : 'You owe'}
            </Text>

            {/* Primary stat — total owed */}
            <Text style={{
              fontFamily: 'Inter_900Black',
              fontSize: scale(44),
              color: '#FFFFFF',
              lineHeight: scale(50),
            }}>
              {fmtDollars(owedCents)}
            </Text>

            {/* Secondary — the action / settled state */}
            <Text style={{
              fontFamily: 'Inter_500Medium',
              fontSize: scale(16),
              color: 'rgba(255,255,255,0.75)',
              marginTop: 4,
              marginBottom: 16,
            }}>
              {/* MON-75 Rev 5: no scheduled payday — the owed total persists until
                  the parent settles it, never tied to a date and never scolding. */}
              {settled ? 'All paid up 🎉' : 'Pay whenever you’re ready'}
            </Text>

            {/* Stat chips — the weekly ledger as a visible equation that adds up:
                EARNED = PAID + OWED (MON-75 Rev 6, Option B). Uses the lifetime-
                consistent triple (earnedLifetime = paidLifetime + owed, guaranteed
                by the ledger) so the relationship always balances and the OWED chip
                equals the hero number — killing the "broken math / two witnesses"
                read. OWED is highlighted (lime ring) as the actionable figure. */}
            {(() => {
              const EQ_LIME = '#D8F52F';
              const eqChips = [
                { label: 'EARNED', value: ledger.earnedLifetimeCents, owed: false },
                { label: 'PAID',   value: ledger.paidLifetimeCents,   owed: false },
                { label: 'OWED',   value: owedCents,                  owed: true  },
              ];
              const glyphs = ['=', '+'];
              return (
                <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 16 }}>
                  {eqChips.map((chip, i) => {
                    // White card with a 2.5px black border. The OWED chip is the
                    // actionable figure: black-bordered card + an outer Slime Lime
                    // ring (purple value), so it reads as the highlighted total.
                    const card = (
                      <View style={{
                        backgroundColor: '#FFFFFF',
                        borderRadius: 11,
                        borderWidth: 2.5,
                        borderColor: '#1A1A1A',
                        paddingVertical: 12,
                        paddingHorizontal: 4,
                        alignItems: 'center',
                        gap: 4,
                        ...(chip.owed ? null : { flex: 1 }),
                      }}>
                        <Text numberOfLines={1} adjustsFontSizeToFit style={{ fontFamily: 'Inter_800ExtraBold', fontSize: scale(16), color: chip.owed ? '#7B3FF2' : '#1A1A1A' }}>
                          {fmtDollars(chip.value)}
                        </Text>
                        <Text style={{ fontFamily: 'Inter_700Bold', fontSize: scale(12), color: '#1A1A1A', letterSpacing: 0.8 }}>
                          {chip.label}
                        </Text>
                      </View>
                    );
                    return (
                      <Fragment key={chip.label}>
                        {chip.owed ? (
                          <View style={{ flex: 1, backgroundColor: EQ_LIME, borderRadius: 15, padding: 4 }}>
                            {card}
                          </View>
                        ) : card}
                        {i < glyphs.length && (
                          <Text style={{ fontFamily: 'Inter_900Black', fontSize: scale(16), color: '#FFFFFF', paddingHorizontal: 8 }}>
                            {glyphs[i]}
                          </Text>
                        )}
                      </Fragment>
                    );
                  })}
                </View>
              );
            })()}

            {/* MON-75 Rev 5: no global "Mark all paid" (payout is strictly
                per-child via the per-kid sheet) and no "Next payday" row /
                payday-settings Edit link — there is no scheduled payday. */}
          </View>
        </View>

        {/* ── Kids Row ────────────────────────────────────────────────────── */}
        <View style={{ marginTop: 4 }}>
          {/* Section header */}
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, marginBottom: 12 }}>
            <Text style={{
              fontFamily: 'Inter_800ExtraBold',
              fontSize: scale(22),
              color: '#1A1A1A',
            }}>Kids</Text>
          </View>

          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 16, gap: 12 }}>
            {ledger.perKid.map((slice, i) => {
              const kid = kidProfiles[i];
              const balance = slice.owedCents;
              const isPaid = balance === 0;
              return (
                <View
                  key={`${kid.name}-${i}`}
                  style={{
                    width: 120,
                    borderRadius: 14,
                    backgroundColor: '#FFFFFF',
                    borderWidth: 2,
                    borderColor: '#1A1A1A',
                    padding: 12,
                    alignItems: 'center',
                    ...shadows.soft,
                  }}
                >
                  {/* Avatar circle */}
                  <View style={{
                    width: 44,
                    height: 44,
                    borderRadius: 22,
                    backgroundColor: avatarColor(kid.name, i),
                    alignItems: 'center',
                    justifyContent: 'center',
                    borderWidth: 2,
                    borderColor: '#1A1A1A',
                    marginBottom: 8,
                  }}>
                    <Image
                      source={getAvatarImage(kid.avatarIdx)}
                      style={{ width: 36, height: 36, borderRadius: 18 }}
                      resizeMode="cover"
                    />
                  </View>
                  <Text style={{ fontFamily: 'Inter_800ExtraBold', fontSize: scale(16), color: '#1A1A1A', marginBottom: 4 }} numberOfLines={1}>
                    {kid.name}
                  </Text>
                  <Text style={{ fontFamily: 'Inter_500Medium', fontSize: scale(16), color: '#767676', letterSpacing: 0.8, textTransform: 'uppercase', marginBottom: 4 }}>
                    This Week
                  </Text>
                  {/* Earned is neutral ink — green is reserved for the settled/paid
                      state only (MON-75 Rev 6), so the row doesn't scan "all done". */}
                  <Text style={{ fontFamily: 'Inter_700Bold', fontSize: scale(16), color: '#1A1A1A', marginBottom: 8 }}>
                    {fmtDollars(slice.earnedThisWeekCents)}
                  </Text>
                  {isPaid ? (
                    <View style={{
                      borderRadius: 6,
                      paddingHorizontal: 8,
                      paddingVertical: 4,
                      backgroundColor: '#F0F7F0',
                      borderWidth: 1,
                      borderColor: '#27AE60',
                    }}>
                      <Text style={{ fontFamily: 'Inter_600SemiBold', fontSize: scale(16), color: '#27AE60' }}>Paid ✓</Text>
                    </View>
                  ) : (
                    /* Pay action lives in the card itself when money is owed
                       (opens the per-child breakdown sheet). */
                    <TouchableOpacity
                      activeOpacity={0.85}
                      onPress={() => setPayoutSheetKid(kid.name)}
                      style={{
                        alignSelf: 'stretch',
                        borderRadius: 8,
                        paddingVertical: 8,
                        alignItems: 'center',
                        backgroundColor: '#C5F215',
                        borderWidth: 2,
                        borderColor: '#1A1A1A',
                      }}
                    >
                      <Text style={{ fontFamily: 'Inter_800ExtraBold', fontSize: scale(12), color: '#1A1A1A' }}>
                        Pay {fmtDollars(balance)}
                      </Text>
                    </TouchableOpacity>
                  )}
                </View>
              );
            })}
          </ScrollView>
        </View>

        {/* ── Activity Feed ────────────────────────────────────────────────── */}
        <View style={{ marginTop: 20, paddingHorizontal: 16 }}>
          {/* Section header */}
          <Text style={{
            fontFamily: 'Inter_800ExtraBold',
            fontSize: scale(22),
            color: '#1A1A1A',
            marginBottom: 12,
          }}>Activity</Text>

          {/* Filter chips */}
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, marginBottom: 16 }}>
            {(['all', ...kidProfiles.map(k => k.name)] as string[]).map((f, i) => {
              const isActive = activityFilter === f;
              return (
                <TouchableOpacity
                  key={`${f}-${i}`}
                  onPress={() => { setActivityFilter(f); setVisibleCount(ACTIVITY_CHUNK); }}
                  activeOpacity={0.75}
                  style={{
                    borderRadius: 20,
                    paddingHorizontal: 16,
                    paddingVertical: 8,
                    backgroundColor: isActive ? '#1A1A1A' : '#FFFFFF',
                    borderWidth: 1.5,
                    borderColor: '#1A1A1A',
                  }}
                >
                  <Text style={{
                    fontFamily: 'Inter_700Bold',
                    fontSize: scale(16),
                    color: isActive ? '#FFFFFF' : '#1A1A1A',
                  }}>
                    {f === 'all' ? 'All Kids' : f}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>

          {/* Grouped entries */}
          {grouped.length === 0 && (
            <View style={{ alignItems: 'center', paddingVertical: 32 }}>
              <Text style={{ fontSize: scale(28) }}>📋</Text>
              <Text style={{ fontFamily: 'Inter_700Bold', fontSize: scale(16), color: '#1A1A1A', marginTop: 8 }}>No activity yet</Text>
              <Text style={{ fontFamily: 'Inter_400Regular', fontSize: scale(16), color: '#767676', marginTop: 4 }}>Approved chores will show up here.</Text>
            </View>
          )}

          {grouped.map(group => (
            <View key={group.date} style={{ marginBottom: 16 }}>
              <Text style={{ fontFamily: 'Inter_700Bold', fontSize: scale(16), color: '#767676', letterSpacing: 0.8, textTransform: 'uppercase', marginBottom: 8 }}>
                {group.date}
              </Text>
              {group.entries.map(entry => {
                const isPaid = isEntryPaid(entry);
                const hasIcon = typeof entry.icon === 'string' && entry.icon.length <= 4;
                return (
                  <View
                    key={entry.id}
                    style={{
                      flexDirection: 'row',
                      alignItems: 'center',
                      backgroundColor: isPaid ? '#FFFFFF' : '#FFFBF0',
                      borderWidth: 2,
                      borderColor: isPaid ? '#1A1A1A' : '#E6A817',
                      borderRadius: 12,
                      padding: 12,
                      marginBottom: 8,
                    }}
                  >
                    {/* Icon box */}
                    <View style={{
                      width: 40,
                      height: 40,
                      borderRadius: 10,
                      backgroundColor: entry.bg,
                      alignItems: 'center',
                      justifyContent: 'center',
                      marginRight: 12,
                      borderWidth: 1.5,
                      borderColor: '#1A1A1A',
                    }}>
                      {hasIcon
                        ? <Text style={{ fontSize: scale(18) }}>{entry.icon as string}</Text>
                        : <Image source={entry.icon as number} style={{ width: 26, height: 26 }} resizeMode="contain" />
                      }
                    </View>

                    {/* Text */}
                    <View style={{ flex: 1 }}>
                      <Text style={{ fontFamily: 'Inter_700Bold', fontSize: scale(16), color: '#1A1A1A' }}>
                        {entry.choreName}
                      </Text>
                      <Text style={{ fontFamily: 'Inter_500Medium', fontSize: scale(16), color: '#767676', marginTop: 0 }}>
                        {entry.kidName}
                      </Text>
                    </View>

                    {/* Amount + badge */}
                    <View style={{ alignItems: 'flex-end', gap: 4 }}>
                      <Text style={{ fontFamily: 'Inter_800ExtraBold', fontSize: scale(16), color: '#3B8A3A' }}>
                        +{fmtCoins(entry.earnedCents)}
                      </Text>
                      <View style={{
                        borderRadius: 5,
                        paddingHorizontal: 8,
                        paddingVertical: 4,
                        backgroundColor: isPaid ? '#E1F5EE' : '#FFFBF0',
                        borderWidth: 1,
                        borderColor: isPaid ? '#27AE60' : '#E6A817',
                      }}>
                        <Text style={{ fontFamily: 'Inter_600SemiBold', fontSize: scale(16), color: isPaid ? '#27AE60' : '#E6A817' }}>
                          {isPaid ? 'Paid' : 'Unpaid'}
                        </Text>
                      </View>
                    </View>
                  </View>
                );
              })}
            </View>
          ))}

          {/* Reveal the next chunk of older history on demand */}
          {hiddenCount > 0 && (
            <TouchableOpacity
              onPress={() => setVisibleCount(c => c + ACTIVITY_CHUNK)}
              activeOpacity={0.75}
              style={{
                alignItems: 'center',
                paddingVertical: 16,
                borderRadius: 12,
                borderWidth: 2,
                borderColor: '#1A1A1A',
                backgroundColor: '#FFFFFF',
                marginTop: 4,
              }}
            >
              <Text style={{ fontFamily: 'Inter_700Bold', fontSize: scale(16), color: '#1A1A1A' }}>
                Show {Math.min(ACTIVITY_CHUNK, hiddenCount)} more · {hiddenCount} older
              </Text>
            </TouchableOpacity>
          )}
        </View>
      </ScrollView>

      {/* ── Per-child "Mark paid" breakdown sheet (MON-83) ─────────────────────
          Per-week breakdown for one child before confirming the payout. Payout
          is strictly per-child — there is no bulk "settle all". */}
      <Modal visible={payoutSheetOpen} transparent animationType="none" onRequestClose={closePayoutSheet_}>
        <Animated.View style={{ flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.45)', opacity: payoutScrimOpacity }}>
          <TouchableOpacity style={{ flex: 1 }} activeOpacity={1} onPress={closePayoutSheet_} />
          {payoutSheetLedger && payoutSheetProfile && (
            <Animated.View style={{ backgroundColor: '#FFFDF7', borderTopLeftRadius: 24, borderTopRightRadius: 24, borderWidth: 2.5, borderColor: '#1A1A1A', paddingHorizontal: 20, paddingTop: 16, paddingBottom: insets.bottom + 24, transform: [{ translateY: payoutSheetY }] }}>
              {/* The transparent Modal's content frame stops at the bottom safe-area
                  line, so the sheet's own padding can't reach the home-indicator zone.
                  This filler overflows below the frame to bleed the cream into the safe
                  area (overflow isn't clipped), eliminating the grey band underneath. */}
              <View style={{ position: 'absolute', left: 0, right: 0, top: '100%', height: 120, backgroundColor: '#FFFDF7' }} pointerEvents="none" />
              <View style={{ alignSelf: 'center', width: 40, height: 5, borderRadius: 3, backgroundColor: '#D9D5CC', marginBottom: 16 }} />
              {/* Header — child avatar + name */}
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 16 }}>
                <View style={{ width: 44, height: 44, borderRadius: 22, backgroundColor: payoutSheetProfile.avatarColor, borderWidth: 2, borderColor: '#1A1A1A', alignItems: 'center', justifyContent: 'center' }}>
                  <Image source={getAvatarImage(payoutSheetProfile.avatarIdx)} style={{ width: 36, height: 36, borderRadius: 18 }} resizeMode="cover" />
                </View>
                <Text style={{ fontFamily: 'Inter_800ExtraBold', fontSize: scale(18), color: '#1A1A1A' }}>Pay {payoutSheetProfile.name}</Text>
              </View>
              {/* One row per unpaid week, reconciled to the owed total (zero-chore
                  weeks are already excluded). */}
              {payoutSheetRows.map(w => (
                <View key={w.weekKey} style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 12 }}>
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontFamily: 'Inter_700Bold', fontSize: scale(16), color: '#1A1A1A' }}>{w.label}</Text>
                    <Text style={{ fontFamily: 'Inter_500Medium', fontSize: scale(12), color: '#767676', marginTop: 4 }}>{w.choreCount} chore{w.choreCount === 1 ? '' : 's'} completed</Text>
                  </View>
                  <Text style={{ fontFamily: 'Inter_800ExtraBold', fontSize: scale(16), color: '#1A1A1A' }}>{fmtDollars(w.earnedCents)}</Text>
                </View>
              ))}
              {/* Owed credit not tied to a chore week (battle bonus etc.) */}
              {payoutSheetBonus > 0 && (
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 12 }}>
                  <Text style={{ fontFamily: 'Inter_700Bold', fontSize: scale(16), color: '#1A1A1A' }}>Boss Battle bonus 🏆</Text>
                  <Text style={{ fontFamily: 'Inter_800ExtraBold', fontSize: scale(16), color: '#1A1A1A' }}>{fmtDollars(payoutSheetBonus)}</Text>
                </View>
              )}
              <View style={{ height: 1, backgroundColor: '#1A1A1A', opacity: 0.12, marginVertical: 8 }} />
              {/* Total owed */}
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                <Text style={{ fontFamily: 'Inter_800ExtraBold', fontSize: scale(16), color: '#1A1A1A' }}>Total owed</Text>
                <Text style={{ fontFamily: 'Inter_900Black', fontSize: scale(22), color: '#1A1A1A' }}>{fmtDollars(payoutSheetLedger.owedCents)}</Text>
              </View>
              <Button label="Mark as paid" onPress={() => { const k = payoutSheetKid; closePayoutSheet(() => { setPayoutSheetKid(null); if (k) onConfirm(k); }); }} />
              <View style={{ height: 10 }} />
              <Button label="Cancel" variant="secondary" onPress={closePayoutSheet_} />
            </Animated.View>
          )}
        </Animated.View>
      </Modal>
    </View>
  );
}

function ParentHomeScreen({ onNav, onSwitchToKid, onAddKid, onEditKid, managedChores, onApprove, onApproveAll, onReject, baseRate, onPayKid, onConfirmPayout, kidName, totalCoins, kidProfiles, kidCoins, choreHistory, payoutLog, weekApprovalDays, debugDayOffset = 0, currentBossName = '', householdBossHpPct = 1, householdTotalFighters = 0 }: {
  onNav: (s: ParentScreen) => void;
  onSwitchToKid: (name: string) => void;
  onAddKid: () => void;
  onEditKid: (k: { name: string; avatarColor: string; avatarIdx: number }) => void;
  managedChores: ManagedChore[];
  onApprove: (id: string, kidName: string) => void;
  onApproveAll: (id: string, kidName: string) => void;
  onReject: (id: string, note: string, kidName: string) => void;
  baseRate: string;
  onPayKid: () => void;
  onConfirmPayout: (kidName: string) => void;
  kidName: string;
  totalCoins: number;
  kidProfiles: { name: string; avatarColor: string; avatarIdx: number }[];
  kidCoins: Record<string, number>;
  choreHistory: { id: string; choreName: string; kidName: string; earnedCents: number; approvedAt: string; icon: string | number; bg: string }[];
  payoutLog: { kidName: string; amount: number; paidAt: string }[];
  weekApprovalDays: string[];
  debugDayOffset?: number;
  currentBossName?: string;
  // Cooperative shared HP (MON-84): the family's one boss bar (0–1) + household size.
  householdBossHpPct?: number;
  householdTotalFighters?: number;
}) {
  const [earnedMilestones, setEarnedMilestones] = useState<EarnedMilestone[]>([]);
  useEffect(() => { getEarnedMilestones(PARENT_OWNER).then(setEarnedMilestones); }, []);
  // Recent kid achievements (most-recent first) for the dashboard card.
  const [recentKidMilestones, setRecentKidMilestones] = useState<{ kidName: string; avatarIdx: number; def: MilestoneDef; earnedAt: string }[]>([]);
  useEffect(() => {
    let alive = true;
    (async () => {
      const all = await Promise.all(kidProfiles.map(async k => {
        const earned = await getEarnedMilestones(k.name);
        return earned
          .map(e => { const def = getMilestone(e.id); return def ? { kidName: k.name, avatarIdx: k.avatarIdx, def, earnedAt: e.earnedAt } : null; })
          .filter((x): x is { kidName: string; avatarIdx: number; def: MilestoneDef; earnedAt: string } => x != null);
      }));
      if (alive) setRecentKidMilestones(all.flat().sort((a, b) => b.earnedAt.localeCompare(a.earnedAt)));
    })();
    return () => { alive = false; };
  }, [kidProfiles]);
  const parentMilestoneDefs = MILESTONES.filter(m => m.audience === 'parent');
  const earnedIds = new Set(earnedMilestones.map(m => m.id));
  // Newest earned = show yellow dot
  const newestEarnedId = earnedMilestones[0]?.id ?? null;

  // ── Week progress for the hero ─────────────────────────────────────────────
  const today      = new Date();
  const dayOfWeek  = today.getDay();                          // 0=Sun, 1=Mon … 6=Sat
  const todayBarIdx = dayOfWeek === 0 ? 6 : dayOfWeek - 1;     // Mon=0 … Sat=5, Sun=6

  const allKidNames = kidProfiles.map(k => k.name);
  // Independent "Everyone" chores count once per eligible kid toward the household total.
  const { target: totalWeeklyTarget, done: totalCompleted } = householdChoreTotals(managedChores, allKidNames);
  const daysLeft = daysUntilSunday();

  // ── Per-kid stats ─────────────────────────────────────────────────────────
  type KidStats = {
    profile: { name: string; avatarColor: string; avatarIdx: number };
    completed: number;
    target: number;
    pendingCount: number;
    earningsCents: number;
  };

  const kidStats: KidStats[] = kidProfiles.map(k => {
    const assignedChores = managedChores.filter(c => c.assignedTo.length === 0 || c.assignedTo.includes(k.name));
    const completed  = assignedChores.reduce((s, c) => s + getChoreCompletions(c, k.name), 0);
    const target     = assignedChores.reduce((s, c) => s + frequencyToWeeklyTarget(c.frequency), 0);
    const pendingCount = assignedChores.reduce((s, c) => s + getPendingCount(c, k.name), 0);
    const earningsCents = assignedChores.reduce((s, c) => {
      const approved = getChoreCompletions(c, k.name);
      return s + approved * Math.round(baseRateCents(baseRate) * DIFFICULTY_MULTIPLIERS[c.difficulty]);
    }, 0);
    return { profile: k, completed, target, pendingCount, earningsCents };
  });

  // ── Single ledger + payday (MON-77) ────────────────────────────────────────
  // Same selectors as the Money tab, so the owed figure on Home and Money can
  // never disagree (the "two witnesses" bug). `owedCents` is the action number
  // the hero footer and the adaptive bar both surface.
  const ledger    = computeFamilyLedger(allKidNames, kidCoins, choreHistory, payoutLog, debugDayOffset);
  const owedCents  = ledger.owedCents;

  // Pending review count — MUST equal the Chores tab "Pending" tile (single
  // source of truth). Computed with the exact same formula it uses: the sum of
  // getPendingCount across every chore × kid, not the number of pending cards.
  const pendingReviewCount = kidProfiles.reduce((acc, k) =>
    acc + managedChores
      .filter(c => c.assignedTo.length === 0 || c.assignedTo.includes(k.name))
      .reduce((s, c) => s + getPendingCount(c, k.name), 0), 0);

  // Adaptive next-action bar — one fixed-height slot, highest applicable wins:
  //   1. reviews pending → route to Chores
  //   2. owed > 0        → route to Money ("Pay out $X")
  //   3. nothing pending or owed → calm "all settled"
  // MON-77 Rev 5: there is no scheduled payday. The owed total persists until the
  // parent settles it, so the payout nudge shows every day a balance exists —
  // never gated on a date (no Sunday "it's payday" treatment), never scolding, and
  // reviews still outrank payout.
  type ActionBar = { kind: 'review' | 'payNow' | 'settled'; label: string; sub?: string; target?: ParentScreen; tone: 'amber' | 'lime' | 'calm' };
  const actionBar: ActionBar = pendingReviewCount > 0
    ? { kind: 'review', tone: 'amber', target: 'chores',
        label: `${pendingReviewCount} chore${pendingReviewCount === 1 ? '' : 's'} to review` }
    : owedCents > 0
      ? { kind: 'payNow', tone: 'lime', target: 'moneyLedger',
          label: `Pay out ${fmtDollars(owedCents)}` }
      : { kind: 'settled', tone: 'calm', label: 'All settled this week' };

  return (
    <CreamBg>
      {/* Kid avatar row removed (MON-77): kids appear only where they carry
          information — Family Status cards below. "Add kid" lives in Settings. */}
      <ScrollView style={{ flex: 1 }} showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 120, paddingTop: 8 }}>

        {/* ── 1. Hero — "this week's battle" (monstir-home-final mockup) ──────── */}
        {(() => {
          // Mockup palette (Monstir Purple family) — kept local to the hero so it
          // matches the approved design exactly without re-tinting the app.
          const HERO_PURPLE = '#7B3FF2';
          const HERO_FOOT   = '#5A23C8';
          const HERO_TRACK  = '#4A1F9E';
          const TRACK_EDGE  = '#3A1782';
          const LIME        = '#D8F52F';
          const MUTE        = '#B8A3E8';
          const DAY_MUTE    = '#9C7AD9';
          const INK         = '#111111';
          const pct = Math.min(100, totalWeeklyTarget > 0 ? Math.round((totalCompleted / totalWeeklyTarget) * 100) : 0);
          const heroDayLabels = ['M', 'T', 'W', 'T', 'F', 'S', 'SUN'];
          return (
            <View style={{ marginHorizontal: 16, marginBottom: 16, borderRadius: 18, borderWidth: 3, borderColor: INK, backgroundColor: HERO_PURPLE, overflow: 'hidden', ...SOLID_SHADOW }}>
              <View style={{ paddingHorizontal: 16, paddingTop: 16, paddingBottom: 16 }}>
                {/* Eyebrow */}
                <Text style={{ fontFamily: 'SpaceMono_700Bold', fontSize: scale(12), letterSpacing: 1.6, textTransform: 'uppercase', color: LIME }}>
                  This week's battle
                </Text>

                {/* Boss identity row — silhouette jar + name + "arrives Sunday" */}
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, marginTop: 12, marginBottom: 16 }}>
                  <View style={{ width: 52, height: 52, borderRadius: 26, borderWidth: 3, borderColor: LIME, backgroundColor: '#3F1D86', alignItems: 'center', justifyContent: 'center' }}>
                    <Text style={{ fontSize: scale(22), color: '#8A6FC4', fontFamily: 'FredokaOne_400Regular' }}>?</Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text numberOfLines={1} style={{ fontFamily: 'FredokaOne_400Regular', fontSize: scale(22), lineHeight: scale(29), color: '#FFFFFF' }}>
                      {currentBossName || 'Boss'}
                    </Text>
                    <Text style={{ fontSize: scale(12), fontFamily: 'Nunito_700Bold', color: MUTE, marginTop: 4 }}>
                      {householdTotalFighters > 1 && householdBossHpPct < 1
                        ? householdBossHpPct <= 0.2
                          ? 'on his last legs · finish him together'
                          : `wearing down · ${Math.round(householdBossHpPct * 100)}% left`
                        : 'arrives Sunday'}
                    </Text>
                  </View>
                </View>

                {/* Statline — chore fraction is the focal stat; days-left right-aligned */}
                <View style={{ flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between', marginBottom: 12 }}>
                  <View style={{ flexDirection: 'row', alignItems: 'flex-end' }}>
                    <Text style={{ fontFamily: 'FredokaOne_400Regular', fontSize: scale(44), lineHeight: scale(60), color: LIME }}>{totalCompleted}</Text>
                    <Text style={{ fontFamily: 'FredokaOne_400Regular', fontSize: scale(22), lineHeight: scale(33), color: '#D9C9FF' }}>/{totalWeeklyTarget} chores</Text>
                  </View>
                  <Text style={{ fontFamily: 'SpaceMono_700Bold', fontSize: scale(12), color: LIME, paddingBottom: 8 }}>
                    {daysLeft} day{daysLeft === 1 ? '' : 's'} left
                  </Text>
                </View>

                {/* Progress bar — solid lime fill (no gradient, per spec) */}
                <View style={{ height: 16, borderRadius: 999, backgroundColor: HERO_TRACK, borderWidth: 2, borderColor: TRACK_EDGE, overflow: 'hidden' }}>
                  <View style={{ height: '100%', width: `${pct}%`, backgroundColor: LIME, borderRadius: 999 }} />
                </View>

                {/* Day markers — a time countdown to Sunday. Elapsed ≠ achieved:
                    past days read solid-muted, never a "success" tick. */}
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 12 }}>
                  {heroDayLabels.map((label, i) => {
                    const isSun     = i === 6;
                    const isToday   = i === todayBarIdx && !isSun;
                    const isElapsed = i < todayBarIdx;
                    const dotStyle = (isSun || isToday)
                      ? { backgroundColor: LIME, borderWidth: 2.5, borderColor: INK }
                      : isElapsed
                        ? { backgroundColor: '#6A3FD0' }
                        : { borderWidth: 2.5, borderColor: DAY_MUTE };
                    return (
                      <View key={i} style={{ alignItems: 'center', gap: 8, flex: 1 }}>
                        <View style={{ width: 22, height: 22, borderRadius: 11, alignItems: 'center', justifyContent: 'center', ...dotStyle }}>
                          {isSun && <Text style={{ fontSize: scale(12), color: INK, fontFamily: 'Nunito_800ExtraBold' }}>⚔︎</Text>}
                        </View>
                        <Text style={{ fontSize: scale(12), fontFamily: 'SpaceMono_700Bold', color: isToday ? LIME : DAY_MUTE }}>{label}</Text>
                      </View>
                    );
                  })}
                </View>
              </View>

              {/* Footer band — money (the coupled outcome); approvals live in the
                  adaptive bar below. Tap routes to the Money ledger. */}
              <TouchableOpacity
                activeOpacity={owedCents > 0 ? 0.85 : 1}
                onPress={() => owedCents > 0 && onNav('moneyLedger')}
                style={{ backgroundColor: HERO_FOOT, borderTopWidth: 2, borderTopColor: TRACK_EDGE, paddingHorizontal: 16, paddingVertical: 12, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}
              >
                <Text style={{ fontSize: scale(12), fontFamily: 'Nunito_700Bold', color: '#E7DEFC' }}>
                  {owedCents > 0
                    ? <>💰  <Text style={{ fontFamily: 'FredokaOne_400Regular', fontSize: scale(18), color: LIME }}>{fmtDollars(owedCents)}</Text> to pay</>
                    : <>✓  All paid up</>}
                </Text>
                {/* MON-77 Rev 5: no scheduled payday → no date, and the Edit link
                    (it opened payday settings, now gone) is removed. The owed
                    footer still taps through to the Money ledger. */}
                {owedCents > 0 && (
                  <Text style={{ fontSize: scale(16), fontFamily: 'Inter_800ExtraBold', color: LIME }}>›</Text>
                )}
              </TouchableOpacity>
            </View>
          );
        })()}

        {/* ── Adaptive next-action bar (MON-77) ────────────────────────────── */}
        {/* One fixed-height slot, highest-priority action only — it routes, so it
            can never grow into a list and push the hero off-screen. */}
        <TouchableOpacity
          activeOpacity={actionBar.target ? 0.85 : 1}
          onPress={() => actionBar.target && onNav(actionBar.target)}
          style={{
            marginHorizontal: 16,
            marginBottom: 16,
            borderRadius: 16,
            borderWidth: 2,
            borderColor: '#1A1A1A',
            paddingHorizontal: 16,
            paddingVertical: 16,
            flexDirection: 'row',
            alignItems: 'center',
            gap: 12,
            backgroundColor: actionBar.tone === 'amber' ? '#FFF4D6' : actionBar.tone === 'lime' ? '#EAF7B0' : '#FFFFFF',
            ...SOLID_SHADOW,
          }}
        >
          <Text style={{ fontSize: scale(18) }}>
            {actionBar.kind === 'review' ? '⏱' : actionBar.kind === 'payNow' ? '💸' : '🎉'}
          </Text>
          <View style={{ flex: 1 }}>
            <Text style={{ fontSize: scale(16), fontFamily: 'Inter_800ExtraBold', color: '#1A1A1A' }}>{actionBar.label}</Text>
            {actionBar.sub && (
              <Text style={{ fontSize: scale(12), fontFamily: 'Inter_500Medium', color: actionBar.tone === 'lime' ? '#A0660A' : '#ABABAB', marginTop: 0 }}>
                {actionBar.sub}
              </Text>
            )}
          </View>
          {actionBar.target && (
            <Text style={{ fontSize: scale(16), fontFamily: 'Inter_800ExtraBold', color: actionBar.tone === 'amber' ? '#E6A817' : '#3B8A3A' }}>›</Text>
          )}
        </TouchableOpacity>

        {/* ── Family Status ────────────────────────────────────────────────── */}
        <View style={{ paddingHorizontal: 16, marginBottom: 16 }}>
          <Text style={{ fontSize: scale(22), fontFamily: 'Inter_800ExtraBold', color: '#1A1A1A', marginBottom: 12 }}>
            Family Status
          </Text>
          <View style={{ gap: 12 }}>
            {kidStats.length === 0 ? (
              <TouchableOpacity style={{ alignItems: 'center', paddingVertical: 20 }} onPress={onAddKid} activeOpacity={0.7}>
                <Text style={{ fontSize: scale(12), fontFamily: 'Inter_600SemiBold', color: '#767676' }}>+ Add a kid to get started</Text>
              </TouchableOpacity>
            ) : kidStats.map((ks, i) => {
              const progress = ks.target > 0 ? Math.min(1, ks.completed / ks.target) : 0;
              const allDone  = ks.completed >= ks.target && ks.target > 0;
              return (
                <TouchableOpacity
                  key={i}
                  activeOpacity={0.8}
                  onPress={() => onNav('moneyLedger')}
                  style={{ backgroundColor: '#FFFFFF', borderRadius: 16, borderWidth: 2, borderColor: '#1A1A1A', padding: 16, flexDirection: 'row', alignItems: 'center', gap: 12, ...SOLID_SHADOW }}
                >
                  {/* Avatar */}
                  <View style={{ width: 44, height: 44, borderRadius: 22, backgroundColor: ks.profile.avatarColor, alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: '#1A1A1A', overflow: 'hidden', flexShrink: 0 }}>
                    <Image source={getAvatarImage(ks.profile.avatarIdx)} style={{ width: 44, height: 44 }} resizeMode="cover" />
                  </View>

                  {/* Middle: name + progress */}
                  <View style={{ flex: 1, gap: 4 }}>
                    <Text style={{ fontSize: scale(16), fontFamily: 'Inter_700Bold', color: '#1A1A1A' }}>{ks.profile.name}</Text>
                    <View style={{ height: 8, borderRadius: 4, borderWidth: 1, borderColor: '#111111', backgroundColor: '#FFFFFF', overflow: 'hidden' }}>
                      <View style={{ width: `${progress * 100}%`, height: '100%', backgroundColor: '#6B35F0' }} />
                    </View>
                    <Text style={{ fontSize: scale(12), fontFamily: 'Inter_500Medium', color: '#767676' }}>
                      {ks.completed} of {ks.target} chores
                    </Text>
                  </View>

                  {/* Right: owed (coupled outcome) + status */}
                  <View style={{ alignItems: 'flex-end', gap: 4, flexShrink: 0 }}>
                    {(ledger.perKid[i]?.owedCents ?? 0) > 0 ? (
                      <Text style={{ fontSize: scale(16), fontFamily: 'Inter_700Bold', color: '#E6A817' }}>
                        {fmtDollars(ledger.perKid[i].owedCents)} owed
                      </Text>
                    ) : (
                      <Text style={{ fontSize: scale(16), fontFamily: 'Inter_700Bold', color: '#3B8A3A' }}>
                        Paid ✓
                      </Text>
                    )}
                    {ks.pendingCount > 0 ? (
                      <Text style={{ fontSize: scale(12), fontFamily: 'Inter_600SemiBold', color: '#E6A817' }}>
                        ⚠ {ks.pendingCount} pending
                      </Text>
                    ) : allDone ? (
                      <Text style={{ fontSize: scale(12), fontFamily: 'Inter_600SemiBold', color: '#3B8A3A' }}>
                        ✓ All done
                      </Text>
                    ) : (
                      <Text style={{ fontSize: scale(12), fontFamily: 'Inter_500Medium', color: '#767676' }}>
                        {ks.target - ks.completed} remaining
                      </Text>
                    )}
                  </View>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        {/* Parent-milestones strip removed (MON-77): parent milestones are parked
            off-Home for alpha — they live in the parent profile / "See all", never
            on Home. Home celebrates kid wins only (below). */}

        {/* ── Recent wins — kid milestone-unlock events, deterministic list ──── */}
        <View style={{ paddingHorizontal: 16, marginBottom: 16 }}>
          <View style={{ backgroundColor: '#FFFFFF', borderRadius: 16, borderWidth: 2, borderColor: '#1A1A1A', padding: 16, ...SOLID_SHADOW }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: recentKidMilestones.length > 0 ? 12 : 0 }}>
              <Text style={{ fontSize: scale(18), fontFamily: 'Inter_800ExtraBold', color: '#1A1A1A' }}>Recent wins</Text>
              <TouchableOpacity onPress={() => onNav('kidMilestones')} activeOpacity={0.7}>
                <Text style={{ fontSize: scale(12), fontFamily: 'Inter_600SemiBold', color: PURPLE }}>See all ›</Text>
              </TouchableOpacity>
            </View>
            {recentKidMilestones.length === 0 ? (
              <Text style={{ fontSize: scale(12), fontFamily: 'Inter_400Regular', color: '#767676', marginTop: 8 }}>
                Your kids haven't earned any milestones yet — they'll appear here as they do.
              </Text>
            ) : (
              recentKidMilestones.slice(0, 3).map((e, i) => (
                <View key={`${e.kidName}-${e.def.id}-${i}`} style={{ flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 8 }}>
                  <View style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: PURPLE, alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: '#1A1A1A', flexShrink: 0 }}>
                    {e.def.image
                      ? <Image source={e.def.image} style={{ width: 24, height: 24 }} resizeMode="contain" />
                      : <Text style={{ fontSize: scale(18) }}>{e.def.icon}</Text>}
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontSize: scale(16), fontFamily: 'Inter_700Bold', color: '#1A1A1A' }} numberOfLines={1}>{e.def.name}</Text>
                    <Text style={{ fontSize: scale(12), fontFamily: 'Inter_500Medium', color: PURPLE }}>{e.kidName}</Text>
                  </View>
                  <Text style={{ fontSize: scale(12), fontFamily: 'Inter_600SemiBold', color: '#767676', flexShrink: 0 }}>{timeAgo(e.earnedAt)}</Text>
                </View>
              ))
            )}
          </View>
        </View>

      </ScrollView>
    </CreamBg>
  );
}

// ─── Chore Review Bottom Sheet ────────────────────────────────────────────────

function ChoreReviewSheet({ chore, kidName = '', kidProfiles, baseRate, onApprove, onApproveAll, onReject, onClose }: {
  chore: ManagedChore | null;
  kidName?: string;
  kidProfiles: { name: string; avatarColor: string; avatarIdx: number }[];
  baseRate: string;
  onApprove: (id: string) => void;
  onApproveAll: (id: string) => void;
  onReject: (id: string, note: string) => void;
  onClose: () => void;
}) {
  const { open, openSheet, closeSheet, scrimOpacity, sheetY } = useSheet(600);
  const [note, setNote] = useState('');
  const prevChoreId = useRef<string | null>(null);

  useEffect(() => {
    if (chore && chore.id !== prevChoreId.current) {
      prevChoreId.current = chore.id;
      setNote('');
      openSheet();
    }
    if (!chore) {
      prevChoreId.current = null;
    }
  }, [chore]);

  if (!chore) return null;

  const assignedLabel = chore.assignedTo.length === 1 ? chore.assignedTo[0] : (chore.assignedTo.length > 1 ? chore.assignedTo.join(', ') : 'Everyone');
  // childName is used for the note field — always the specific kid being reviewed.
  const childName = kidName || assignedLabel;
  // metaLabel is the assignment line in the header card:
  //   • "Everyone + first to finish" → show scope + mode so the parent knows
  //     approving this clears it for the whole household, not just one kid.
  //   • "Everyone + independent" or specific kid → show who submitted.
  const isSharedEveryone = chore.assignedTo.length === 0 && chore.completionMode === 'shared';
  const metaLabel = isSharedEveryone ? 'Everyone · first to finish' : childName;

  const submittedAt = chore.childSubmittedAt?.[kidName];
  const submittedLabel = submittedAt
    ? new Date(submittedAt).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })
    : '—';
  // Show what the NEXT approval will actually pay: the amount snapshotted at
  // submit (oldest unit first), falling back to the current rate for legacy items.
  const nextUnitCents = chore.childPendingCents?.[kidName]?.[0]
    ?? Math.round(baseRateCents(baseRate) * DIFFICULTY_MULTIPLIERS[chore.difficulty]);
  const earnAmt = (nextUnitCents / 100).toFixed(2);

  // How many submissions are waiting (today's + any carried over from prior days).
  const pendingCount = getPendingCount(chore, kidName);
  const handleApprove = () => {
    closeSheet(() => { onApprove(chore.id); onClose(); });
  };
  const handleApproveAll = () => {
    closeSheet(() => { onApproveAll(chore.id); onClose(); });
  };
  const handleReject = () => {
    closeSheet(() => { onReject(chore.id, note.trim()); onClose(); });
  };

  return (
    <Modal visible={open} transparent animationType="none" onRequestClose={() => closeSheet(() => onClose())}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        <Animated.View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', justifyContent: 'flex-end', opacity: scrimOpacity }}>
          <TouchableOpacity style={{ flex: 1 }} activeOpacity={1} onPress={() => closeSheet(() => onClose())} />
          <Animated.View
            style={{ backgroundColor: '#FAF9F5', borderTopLeftRadius: 28, borderTopRightRadius: 28, transform: [{ translateY: sheetY }] }}
            onStartShouldSetResponder={() => true}
          >
            <ScrollView bounces={false} keyboardShouldPersistTaps="handled" contentContainerStyle={{ paddingHorizontal: 20, paddingTop: 12, paddingBottom: Platform.OS === 'ios' ? 44 : 24 }}>
              {/* Handle */}
              <View style={{ width: 40, height: 4, backgroundColor: '#D0CEC8', borderRadius: 2, alignSelf: 'center', marginBottom: 16 }} />

              {/* Title row */}
              <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 16 }}>
                <Text style={{ flex: 1, fontSize: scale(22), fontFamily: 'FredokaOne_400Regular', color: '#1A1A1A' }}>{chore.name}</Text>
                <TouchableOpacity onPress={() => closeSheet(() => onClose())} style={{ width: 34, height: 34, borderRadius: 17, borderWidth: 2, borderColor: '#1A1A1A', backgroundColor: '#FFFFFF', alignItems: 'center', justifyContent: 'center' }} activeOpacity={0.7}>
                  <View style={{ width: 14, height: 14, alignItems: 'center', justifyContent: 'center' }}>
                    <View style={{ position: 'absolute', width: 14, height: 2, backgroundColor: '#1A1A1A', borderRadius: 1, transform: [{ rotate: '45deg' }] }} />
                    <View style={{ position: 'absolute', width: 14, height: 2, backgroundColor: '#1A1A1A', borderRadius: 1, transform: [{ rotate: '-45deg' }] }} />
                  </View>
                </TouchableOpacity>
              </View>

              {/* Meta row */}
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: '#FFFFFF', borderRadius: 14, borderWidth: 2, borderColor: '#1A1A1A', padding: 16, marginBottom: 12 }}>
                <View style={{ width: 48, height: 48, borderRadius: 12, backgroundColor: chore.bg, alignItems: 'center', justifyContent: 'center' }}>
                  <ChoreIcon icon={chore.icon} size={34} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={{ fontSize: scale(16), fontFamily: 'Inter_700Bold', color: '#1A1A1A' }}>{metaLabel} · {chore.frequency}</Text>
                  <Text style={{ fontSize: scale(12), fontFamily: 'Inter_600SemiBold', marginTop: 4 }}>
                    <Text style={{ color: '#767676' }}>Earns </Text>
                    <Text style={{ color: '#6B35F0' }}>${earnAmt}</Text>
                    <Text style={{ color: '#767676' }}> on approval</Text>
                  </Text>
                </View>
              </View>

              {/* Info tiles */}
              <View style={{ flexDirection: 'row', gap: 12, marginBottom: 12 }}>
                <View style={{ flex: 1, backgroundColor: '#FFFFFF', borderRadius: 12, borderWidth: 2, borderColor: '#1A1A1A', padding: 12, alignItems: 'center', gap: 4 }}>
                  <Text style={{ fontSize: scale(12), fontFamily: 'Inter_700Bold', color: '#767676', textTransform: 'uppercase', letterSpacing: 0.8 }}>Submitted</Text>
                  <Text style={{ fontSize: scale(18), fontFamily: 'Inter_800ExtraBold', color: '#1A1A1A' }}>{submittedLabel}</Text>
                </View>
                <View style={{ flex: 1, backgroundColor: '#FFFFFF', borderRadius: 12, borderWidth: 2, borderColor: '#1A1A1A', padding: 12, alignItems: 'center', gap: 4 }}>
                  <Text style={{ fontSize: scale(12), fontFamily: 'Inter_700Bold', color: '#767676', textTransform: 'uppercase', letterSpacing: 0.8 }}>This Week</Text>
                  <Text style={{ fontSize: scale(18), fontFamily: 'Inter_800ExtraBold', color: '#1A1A1A' }}>{getChoreCompletions(chore, kidName)} / {frequencyToWeeklyTarget(chore.frequency)}</Text>
                </View>
              </View>

              {/* Note field */}
              <View style={{ marginBottom: 16 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                  <Text style={{ fontSize: scale(12), fontFamily: 'Inter_700Bold', color: '#1A1A1A' }}>Note for {childName}</Text>
                  <Text style={{ fontSize: scale(12), color: '#767676' }}>optional</Text>
                </View>
                <TextInput
                  style={{ borderWidth: 2, borderColor: '#1A1A1A', borderRadius: 12, padding: 16, fontSize: scale(12), color: '#1A1A1A', minHeight: 80, textAlignVertical: 'top' }}
                  placeholder="e.g. Can you get under the leaves next time?"
                  placeholderTextColor={C.hint}
                  value={note}
                  onChangeText={setNote}
                  multiline
                  autoCapitalize="sentences"
                />
              </View>

              {/* Backlog banner — shown when more than one day is waiting */}
              {pendingCount > 1 && (
                <View style={{ backgroundColor: '#FFF4D6', borderRadius: 12, borderWidth: 2, borderColor: '#E6A817', paddingHorizontal: 16, paddingVertical: 12, marginBottom: 12, flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                  <Text style={{ fontSize: scale(16) }}>⏳</Text>
                  <Text style={{ flex: 1, fontSize: scale(12), fontFamily: 'Inter_700Bold', color: '#A0660A' }}>
                    {pendingCount} days waiting for approval
                  </Text>
                </View>
              )}

              {/* Action buttons */}
              <View style={{ flexDirection: 'row', gap: 12 }}>
                <TouchableOpacity
                  style={{ flex: 1, borderWidth: 2, borderColor: '#1A1A1A', borderRadius: 14, padding: 16, alignItems: 'center', backgroundColor: '#FFFFFF' }}
                  onPress={handleReject}
                  activeOpacity={0.7}
                >
                  <Text style={{ fontSize: scale(16), fontFamily: 'Inter_800ExtraBold', color: '#E84040' }}>✕ Reject</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={{ flex: 1, backgroundColor: '#6B35F0', borderRadius: 14, borderWidth: 2, borderColor: '#1A1A1A', padding: 16, alignItems: 'center' }}
                  onPress={handleApprove}
                  activeOpacity={0.7}
                >
                  <Text style={{ fontSize: scale(16), fontFamily: 'Inter_800ExtraBold', color: '#FFFFFF' }}>{pendingCount > 1 ? '✓ Approve 1' : '✓ Approve'}</Text>
                </TouchableOpacity>
              </View>

              {/* Approve all — only when a backlog has accumulated */}
              {pendingCount > 1 && (
                <TouchableOpacity
                  style={{ marginTop: 12, backgroundColor: '#27AE60', borderRadius: 14, borderWidth: 2, borderColor: '#1A1A1A', padding: 16, alignItems: 'center' }}
                  onPress={handleApproveAll}
                  activeOpacity={0.7}
                >
                  <Text style={{ fontSize: scale(16), fontFamily: 'Inter_800ExtraBold', color: '#FFFFFF' }}>✓✓ Approve all {pendingCount} days</Text>
                </TouchableOpacity>
              )}
            </ScrollView>
          </Animated.View>
        </Animated.View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

// ─── Payout Bottom Sheet ──────────────────────────────────────────────────────
// Confirms a payout for one child, surfacing a per-week breakdown of what's owed
// (especially when multiple unpaid weeks have accumulated). Driven by a non-null
// `target`; opens itself on mount, mirrors ChoreReviewSheet's slide-up chrome.

function PayoutSheet({ target, weeks, totalCents, onConfirm, onClose }: {
  target: { name: string; avatarColor: string; avatarIdx: number } | null;
  weeks: UnpaidWeek[];
  totalCents: number;
  onConfirm: (kidName: string) => void;
  onClose: () => void;
}) {
  const { open, openSheet, closeSheet, scrimOpacity, sheetY } = useSheet(600);
  const insets = useSafeAreaInsets();
  const prevName = useRef<string | null>(null);

  useEffect(() => {
    if (target && target.name !== prevName.current) {
      prevName.current = target.name;
      openSheet();
    }
    if (!target) prevName.current = null;
  }, [target]);

  if (!target) return null;

  const handlePay = () => closeSheet(() => { onConfirm(target.name); onClose(); });

  return (
    <Modal visible={open} transparent animationType="none" onRequestClose={() => closeSheet(() => onClose())}>
      <Animated.View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', justifyContent: 'flex-end', opacity: scrimOpacity }}>
        <TouchableOpacity style={{ flex: 1 }} activeOpacity={1} onPress={() => closeSheet(() => onClose())} />
        <Animated.View
          style={{ backgroundColor: '#FAF9F5', borderTopLeftRadius: 28, borderTopRightRadius: 28, transform: [{ translateY: sheetY }] }}
          onStartShouldSetResponder={() => true}
        >
          <ScrollView bounces={false} contentContainerStyle={{ paddingHorizontal: 20, paddingTop: 12, paddingBottom: insets.bottom + 24 }}>
            {/* Handle */}
            <View style={{ width: 40, height: 4, backgroundColor: '#D0CEC8', borderRadius: 2, alignSelf: 'center', marginBottom: 16 }} />

            {/* Header — avatar + name */}
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 16 }}>
              <Image source={getAvatarImage(target.avatarIdx)} style={{ width: 48, height: 48, borderRadius: 24, borderWidth: 2, borderColor: '#1A1A1A' }} resizeMode="cover" />
              <Text style={{ flex: 1, fontSize: scale(22), fontFamily: 'FredokaOne_400Regular', color: '#1A1A1A' }}>{target.name}</Text>
              <TouchableOpacity onPress={() => closeSheet(() => onClose())} style={{ width: 34, height: 34, borderRadius: 17, borderWidth: 2, borderColor: '#1A1A1A', backgroundColor: '#FFFFFF', alignItems: 'center', justifyContent: 'center' }} activeOpacity={0.7}>
                <View style={{ width: 12, height: 12, backgroundColor: '#1A1A1A', borderRadius: 2 }} />
              </TouchableOpacity>
            </View>

            {/* Per-week rows */}
            <View style={{ gap: 12, marginBottom: 16 }}>
              {weeks.map(w => (
                <View key={w.weekKey} style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFFFFF', borderRadius: 14, borderWidth: 2, borderColor: '#1A1A1A', padding: 16, gap: 12 }}>
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontSize: scale(16), fontFamily: 'Inter_700Bold', color: '#1A1A1A' }}>{w.label}</Text>
                    <Text style={{ fontSize: scale(12), fontFamily: 'Inter_500Medium', color: '#767676', marginTop: 4 }}>
                      {w.choreCount} chore{w.choreCount !== 1 ? 's' : ''} completed
                    </Text>
                  </View>
                  <Text style={{ fontSize: scale(16), fontFamily: 'Inter_800ExtraBold', color: '#6B35F0' }}>{fmtDollars(w.earnedCents)}</Text>
                </View>
              ))}
              {/* Coins beyond the chore-history weeks (boss-capture bonuses) — shown
                  so the rows visibly add up to the total owed below. */}
              {(() => {
                const weeksCents = weeks.reduce((s, w) => s + w.earnedCents, 0);
                const bonus = weeks.length > 0 ? totalCents - weeksCents : 0;
                if (bonus <= 0) return null;
                return (
                  <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFFFFF', borderRadius: 14, borderWidth: 2, borderColor: '#1A1A1A', padding: 16, gap: 12 }}>
                    <View style={{ flex: 1 }}>
                      <Text style={{ fontSize: scale(16), fontFamily: 'Inter_700Bold', color: '#1A1A1A' }}>Boss Battle bonus 🏆</Text>
                    </View>
                    <Text style={{ fontSize: scale(16), fontFamily: 'Inter_800ExtraBold', color: '#6B35F0' }}>{fmtDollars(bonus)}</Text>
                  </View>
                );
              })()}
            </View>

            {/* Divider */}
            <View style={{ height: 1, backgroundColor: '#E2DFD7', marginBottom: 16 }} />

            {/* Total owed */}
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
              <Text style={{ fontSize: scale(16), fontFamily: 'Inter_800ExtraBold', color: '#1A1A1A' }}>Total owed</Text>
              <Text style={{ fontSize: scale(22), fontFamily: 'Inter_900Black', color: '#1A1A1A' }}>{fmtDollars(totalCents)}</Text>
            </View>

            {/* CTA */}
            <TouchableOpacity
              style={{ backgroundColor: '#6B35F0', borderRadius: 14, borderWidth: 2, borderColor: '#1A1A1A', padding: 16, alignItems: 'center', ...SOLID_SHADOW }}
              onPress={handlePay}
              activeOpacity={0.8}
            >
              <Text style={{ fontSize: scale(16), fontFamily: 'Inter_800ExtraBold', color: '#FFFFFF' }}>Mark as paid</Text>
            </TouchableOpacity>
            <TouchableOpacity style={{ padding: 16, alignItems: 'center', marginTop: 4 }} onPress={() => closeSheet(() => onClose())} activeOpacity={0.7}>
              <Text style={{ fontSize: scale(16), fontFamily: 'Inter_700Bold', color: '#767676' }}>Cancel</Text>
            </TouchableOpacity>
          </ScrollView>
        </Animated.View>
      </Animated.View>
    </Modal>
  );
}

// ─── Parent Chores Screen (daily status view) ─────────────────────────────────


function ParentChoresScreen({ chores, history, onBack, showBack, onAdd, onEdit, baseRate, onApprove, onApproveAll, onReject, kidProfiles }: {
  chores: ManagedChore[];
  history: ChoreHistoryEntry[];
  onBack: () => void;
  showBack?: boolean;
  onAdd: () => void;
  onEdit: (c: ManagedChore) => void;
  baseRate: string;
  onApprove: (id: string, kidName: string) => void;
  onApproveAll: (id: string, kidName: string) => void;
  onReject: (id: string, note: string, kidName: string) => void;
  kidProfiles: { name: string; avatarColor: string; avatarIdx: number }[];
}) {
  const [activeTab, setActiveTab] = useState<'today' | 'history'>('today');
  const [reviewingChore, setReviewingChore] = useState<{ chore: ManagedChore; kidName: string } | null>(null);
  const [toastMsg, setToastMsg]     = useState<string | null>(null);
  const [toastBg, setToastBg]       = useState<string | undefined>(undefined);
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const showLocalToast = (msg: string, bg?: string) => {
    setToastMsg(null);
    requestAnimationFrame(() => {
      setToastMsg(msg);
      setToastBg(bg);
      if (toastTimer.current) clearTimeout(toastTimer.current);
      toastTimer.current = setTimeout(() => setToastMsg(null), 3000);
    });
  };

  // Group chores by child for "Today" tab
  const allKidNames = kidProfiles.map(k => k.name);
  const extraKids = chores.flatMap(c => c.assignedTo).filter(n => !allKidNames.includes(n));
  const kidNames = [...allKidNames, ...Array.from(new Set(extraKids))];

  // Bucket a chore for the per-kid sort (MON-64 §3/§D): to-review → not-done → approved.
  // Approved chores are NOT dropped — they recede to the bottom as subdued "done" cards
  // (§6.3, the bridge to History). Filtering them out made "all done" fall through to the
  // empty state and forced approvedCount to 0; both are bugs this restores.
  const bucketRank = (c: ManagedChore, name: string) => {
    if (getPendingCount(c, name) > 0) return 0;                 // to review
    if (getChoreStatus(c, name) === 'approved') return 2;       // approved (receded)
    return 1;                                                   // not done (active/rejected)
  };
  const choresByKid = kidNames.map(name => ({
    name,
    profile: kidProfiles.find(k => k.name === name),
    chores: chores
      .filter(c => c.assignedTo.length === 0 || c.assignedTo.includes(name))
      .sort((a, b) => bucketRank(a, name) - bucketRank(b, name)),
  })).filter(g => g.chores.length > 0);

  // If no kids yet, show unassigned chores under a generic group so they're visible
  const unassignedGroup = kidNames.length === 0 && chores.length > 0
    ? [{ name: 'Everyone', profile: undefined, chores: chores.filter(c => c.assignedTo.length === 0) }]
    : [];

  // Stat counts use per-child status so shared chores count separately per kid
  const approvedCount = choresByKid.reduce((acc, g) => acc + g.chores.filter(c => getChoreStatus(c, g.name) === 'approved').length, 0);
  const pendingCount  = choresByKid.reduce((acc, g) => acc + g.chores.reduce((s, c) => s + getPendingCount(c, g.name), 0), 0);
  const todoCount     = choresByKid.reduce((acc, g) => acc + g.chores.filter(c => { const s = getChoreStatus(c, g.name); return s === 'active' || s === 'rejected'; }).length, 0);

  // History: group entries by day
  const historyGroups = (() => {
    const groups: { label: string; date: string; items: ChoreHistoryEntry[] }[] = [];
    history.forEach(entry => {
      const d = new Date(entry.approvedAt);
      const dateKey = d.toDateString();
      const now = new Date();
      const yesterday = new Date(now); yesterday.setDate(now.getDate() - 1);
      let label = dateKey === now.toDateString() ? 'Today' : dateKey === yesterday.toDateString() ? 'Yesterday' : d.toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' });
      const existing = groups.find(g => g.date === dateKey);
      if (existing) existing.items.push(entry);
      else groups.push({ label, date: dateKey, items: [entry] });
    });
    return groups;
  })();

  const handleApprove = (id: string, kidName: string) => {
    onApprove(id, kidName);
    setReviewingChore(null);
    showLocalToast(`✓ Approved for ${kidName}!`, '#E1F5EE');
  };

  const handleApproveAll = (id: string, kidName: string) => {
    onApproveAll(id, kidName);
    setReviewingChore(null);
    showLocalToast(`✓ Approved all for ${kidName}!`, '#E1F5EE');
  };

  const handleReject = (id: string, note: string, kidName: string) => {
    onReject(id, note, kidName);
    setReviewingChore(null);
    showLocalToast(`✕ Sent back to ${kidName}`, '#FCEBEB');
  };

  return (
    <CreamBg>
      {/* Header — purple bg, Fredoka title, date pill */}

      {/* Action-only hero + compact legend + tabs (MON-64 Rev 5 §4/§C). Supersedes
          the old proportional funnel bar: week-progress lives on Home (MON-77), so
          this hero speaks ONLY when the parent has an action and goes quiet otherwise.
          NOTE: the §4.2 sage "N auto-approved today · spot-check" tier is deferred —
          ChoreHistoryEntry carries no auto-vs-manual flag, so it can't be counted
          without a data-model change (out of scope for the hero/legend pass). The
          ladder degrades to amber-action → quiet-resting. */}
      {(() => {
        return (
          <View style={{ marginHorizontal: 16, marginTop: 16, marginBottom: 12 }}>
            {/* Hero: amber action bar when there's something to review, else a calm line */}
            {pendingCount > 0 ? (
              <View style={{ backgroundColor: '#FBF1DC', borderRadius: 18, borderWidth: 3, borderColor: '#111111', padding: 16, flexDirection: 'row', alignItems: 'center', gap: 16, shadowColor: '#111111', shadowOffset: { width: 0, height: 5 }, shadowOpacity: 1, shadowRadius: 0, elevation: 5 }}>
                <View style={{ minWidth: 44, height: 44, borderRadius: 12, backgroundColor: '#E8A11C', borderWidth: 2.5, borderColor: '#111111', alignItems: 'center', justifyContent: 'center', paddingHorizontal: 8 }}>
                  <Text style={{ fontFamily: 'FredokaOne_400Regular', fontSize: scale(22), color: '#111111' }}>{pendingCount}</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={{ fontFamily: 'FredokaOne_400Regular', fontSize: scale(18), color: '#111111' }}>{pendingCount} {pendingCount === 1 ? 'chore' : 'chores'} to review</Text>
                  <Text style={{ fontFamily: 'Nunito_600SemiBold', fontSize: scale(12), color: '#7A5A18', marginTop: 4 }}>Tap any below to log what they earned.</Text>
                </View>
              </View>
            ) : (
              <View style={{ paddingVertical: 12, paddingHorizontal: 4 }}>
                <Text style={{ fontFamily: 'Nunito_700Bold', fontSize: scale(16), color: '#767676' }}>✓ Nothing to approve right now.</Text>
              </View>
            )}

            {/* Compact count legend (§C): a key to the cells below, not a progress bar.
                Each square lights its status colour only when count > 0; To do stays a
                neutral ink outline always (not-started is not a failure — warm floor). */}
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 20, marginTop: 16, marginBottom: 4, paddingHorizontal: 4 }}>
              {[
                { label: 'To do',     count: todoCount,    fill: 'transparent' },
                { label: 'To review', count: pendingCount, fill: '#E8A11C' },
                { label: 'Approved',  count: approvedCount, fill: '#D8F52F' },
              ].map(s => (
                <View key={s.label} style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                  <View style={{ width: 14, height: 14, borderRadius: 4, borderWidth: 2, borderColor: '#111111', backgroundColor: s.count > 0 ? s.fill : 'transparent' }} />
                  <Text style={{ fontSize: scale(12), fontFamily: 'Nunito_700Bold', color: '#111111' }}>{s.count} {s.label.toLowerCase()}</Text>
                </View>
              ))}
            </View>

            {/* Tabs — Today | History */}
            <View style={{ flexDirection: 'row', borderTopWidth: 1, borderTopColor: '#ECEAE4', alignItems: 'center', marginTop: 8 }}>
              <TouchableOpacity
                style={{ paddingVertical: 12, paddingHorizontal: 4, marginRight: 24, borderBottomWidth: 2.5, borderBottomColor: activeTab === 'today' ? '#6B35F0' : 'transparent' }}
                onPress={() => setActiveTab('today')}
                activeOpacity={0.7}
              >
                <Text style={{ fontSize: scale(16), fontFamily: 'Inter_700Bold', color: activeTab === 'today' ? '#6B35F0' : '#ABABAB' }}>Today</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={{ paddingVertical: 12, paddingHorizontal: 4, borderBottomWidth: 2.5, borderBottomColor: activeTab === 'history' ? '#6B35F0' : 'transparent' }}
                onPress={() => setActiveTab('history')}
                activeOpacity={0.7}
              >
                <Text style={{ fontSize: scale(16), fontFamily: 'Inter_700Bold', color: activeTab === 'history' ? '#6B35F0' : '#ABABAB' }}>History</Text>
              </TouchableOpacity>
            </View>
          </View>
        );
      })()}

      <ScrollView style={{ flex: 1 }} showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 16, paddingTop: 4, paddingBottom: 120 }}>
        {activeTab === 'today' ? (
          choresByKid.length === 0 && unassignedGroup.length === 0 ? (
            <View style={{ alignItems: 'center', paddingTop: 60, gap: 12 }}>
              <Text style={{ fontSize: scale(28) }}>🧹</Text>
              <Text style={{ fontSize: scale(16), fontFamily: 'Inter_700Bold', color: C.text }}>No chores assigned</Text>
              <Text style={{ fontSize: scale(12), color: C.muted, textAlign: 'center' }}>Go to Settings → Chore Library to add chores.</Text>
            </View>
          ) : (
            [...choresByKid, ...unassignedGroup].map((group, gi) => {
              const groupApproved = group.chores.filter(c => getChoreStatus(c, group.name) === 'approved').length;
              const groupToReview = group.chores.reduce((s, c) => s + getPendingCount(c, group.name), 0);
              return (
                <View key={`${group.name}-${gi}`} style={{ marginBottom: 20 }}>
                  {/* Child section header */}
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 12 }}>
                    {group.profile ? (
                      <View style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: group.profile.avatarColor, borderWidth: 2, borderColor: '#1A1A1A', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
                        <Image source={getAvatarImage(group.profile.avatarIdx)} style={{ width: 32, height: 32 }} resizeMode="cover" />
                      </View>
                    ) : (
                      <View style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: '#EAE4FF', borderWidth: 2, borderColor: '#1A1A1A', alignItems: 'center', justifyContent: 'center' }}>
                        <Text style={{ fontSize: scale(18) }}>🧒</Text>
                      </View>
                    )}
                    <Text style={{ flex: 1, fontSize: scale(18), fontFamily: 'FredokaOne_400Regular', color: C.text }}>{group.name}</Text>
                    {/* State-explicit counts, not "done" (kid-completed vs parent-approved
                        are distinct axes — MON-64 Rev 2 / MON-75 chore state model). */}
                    <Text style={{ fontSize: scale(12), fontFamily: 'Inter_600SemiBold', color: C.muted }}>
                      {groupApproved} approved · {groupToReview} to review
                    </Text>
                  </View>

                  {/* Chore cards — gap matches the Chore Library list (10) */}
                  <View style={{ gap: 12 }}>
                    {group.chores.map(chore => {
                      const choreStatus = getChoreStatus(chore, group.name);
                      const pending    = getPendingCount(chore, group.name); // today's + carried-over backlog
                      const reviewable = pending > 0;
                      const isApproved = choreStatus === 'approved' && !reviewable;
                      const isRejected = choreStatus === 'rejected';
                      const rejNote    = getChoreRejectionNote(chore, group.name);
                      const hasNote    = isRejected && !!rejNote;
                      const earnAmt    = (baseRateCents(baseRate) * DIFFICULTY_MULTIPLIERS[chore.difficulty] / 100).toFixed(2);
                      return (
                        <View key={chore.id} style={[s.homeQuestCard, reviewable && s.homeQuestCardPending, reviewable && { borderWidth: 2.5, borderColor: '#E6A817', backgroundColor: '#FBF1DC' }, { flexDirection: 'column', overflow: 'hidden', marginBottom: 0 }]}>
                          {isApproved && <View style={s.homeQuestSweep} />}
                          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                            <View style={[s.homeQuestIcon, { backgroundColor: chore.bg }]}>
                              <ChoreIcon icon={chore.icon} size={45} />
                            </View>
                            <View style={{ flex: 1 }}>
                              <Text style={[s.homeQuestTitle, isApproved && s.homeQuestTitleDone]}>{chore.name}</Text>
                              {/* Adjudication facts, not the schedule (MON-64 Rev 2): who marked
                                  it done + when (amber recency line), then the earn amount. */}
                              {reviewable ? (
                                <>
                                  <Text style={{ fontSize: scale(12), fontFamily: 'Inter_700Bold', color: '#C8860A', marginTop: 4 }}>
                                    {group.name} marked done{(() => { const t = chore.childSubmittedAt?.[group.name]; return t ? ` · ${choreAgo(t)}` : ''; })()}
                                  </Text>
                                  <Text style={{ fontSize: scale(12), fontFamily: 'Inter_800ExtraBold', color: '#1A1A1A', marginTop: 4 }}>${earnAmt}</Text>
                                </>
                              ) : (
                                <Text style={{ fontSize: scale(12), fontFamily: 'Inter_500Medium', color: '#767676', marginTop: 4 }}>${earnAmt}</Text>
                              )}
                            </View>
                            {reviewable ? (
                              <TouchableOpacity
                                style={{ borderRadius: 12, paddingHorizontal: 16, paddingVertical: 12, borderWidth: 2.5, borderColor: '#111111', backgroundColor: '#7B3FF2', flexDirection: 'row', alignItems: 'center', gap: 8, ...SOLID_SHADOW_SM }}
                                onPress={() => setReviewingChore({ chore, kidName: group.name })}
                                activeOpacity={0.85}
                              >
                                <Text style={{ fontSize: scale(12), fontFamily: 'Inter_800ExtraBold', color: '#FFFFFF' }}>Review</Text>
                                {pending > 1 && (
                                  <View style={{ minWidth: scale(18), height: scale(18), borderRadius: scale(9), backgroundColor: 'rgba(255,255,255,0.25)', alignItems: 'center', justifyContent: 'center', paddingHorizontal: 4 }}>
                                    <Text style={{ fontSize: scale(12), fontFamily: 'Inter_800ExtraBold', color: '#FFFFFF' }}>{pending}</Text>
                                  </View>
                                )}
                              </TouchableOpacity>
                            ) : isApproved ? (
                              <View style={{ borderRadius: 100, paddingHorizontal: 12, paddingVertical: 4, borderWidth: 1.5, borderColor: '#27AE60', backgroundColor: '#FFFFFF' }}>
                                <Text style={{ fontSize: scale(12), fontFamily: 'Inter_700Bold', color: '#27AE60' }}>✓ Approved</Text>
                              </View>
                            ) : hasNote ? (
                              <View style={{ borderRadius: 100, paddingHorizontal: 12, paddingVertical: 4, borderWidth: 1.5, borderColor: '#E6A817', backgroundColor: '#FFFFFF' }}>
                                <Text style={{ fontSize: scale(12), fontFamily: 'Inter_700Bold', color: '#E6A817' }}>💬 Note</Text>
                              </View>
                            ) : (
                              <View style={{ borderRadius: 100, paddingHorizontal: 12, paddingVertical: 4, borderWidth: 1.5, borderColor: '#ABABAB', backgroundColor: '#FFFFFF' }}>
                                <Text style={{ fontSize: scale(12), fontFamily: 'Inter_600SemiBold', color: '#767676' }}>Not done</Text>
                              </View>
                            )}
                          </View>
                          {hasNote && (
                            <View style={{ backgroundColor: '#FAEEDA', marginTop: 8, borderRadius: 10, padding: 12, flexDirection: 'row', alignItems: 'flex-start', gap: 8 }}>
                              <View style={{ flex: 1 }}>
                                <Text style={{ fontSize: scale(12), fontFamily: 'Inter_700Bold', color: '#A0660A', marginBottom: 4 }}>Note left for {group.name}</Text>
                                <Text style={{ fontSize: scale(12), color: '#7A4D0A', lineHeight: scale(18) }}>{rejNote}</Text>
                              </View>
                            </View>
                          )}
                        </View>
                      );
                    })}
                  </View>
                </View>
              );
            })
          )
        ) : (
          // History tab
          historyGroups.length === 0 ? (
            <View style={{ alignItems: 'center', paddingTop: 60 }}>
              <Text style={{ fontSize: scale(28), marginBottom: 12 }}>📋</Text>
              <Text style={{ fontSize: scale(16), fontFamily: 'Inter_700Bold', color: C.text, marginBottom: 8 }}>No history yet</Text>
              <Text style={{ fontSize: scale(12), color: C.muted }}>Approved chores will appear here.</Text>
            </View>
          ) : (
            historyGroups.map(group => (
              <View key={group.date} style={{ marginBottom: 20 }}>
                <Text style={{ fontSize: scale(12), fontFamily: 'Inter_800ExtraBold', color: C.muted, marginBottom: 8, textTransform: 'uppercase', letterSpacing: 0.6 }}>{group.label}</Text>
                <View style={{ gap: 8 }}>
                  {group.items.map(entry => (
                    <View key={entry.id} style={[s.homeQuestCard, { marginBottom: 0, overflow: 'hidden' }]}>
                      <View style={[s.homeQuestIcon, { backgroundColor: entry.bg }]}>
                        <ChoreIcon icon={entry.icon} size={45} />
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={s.homeQuestTitle}>{entry.choreName}</Text>
                        <Text style={{ fontSize: scale(12), fontFamily: 'Inter_500Medium', color: '#767676', marginTop: 4 }}>{entry.kidName}</Text>
                      </View>
                      <Text style={{ fontSize: scale(12), fontFamily: 'Inter_700Bold', color: '#6B35F0' }}>+{fmtCoins(entry.earnedCents)}</Text>
                    </View>
                  ))}
                </View>
              </View>
            ))
          )
        )}
      </ScrollView>

      {/* Review sheet */}
      <ChoreReviewSheet
        chore={reviewingChore?.chore ?? null}
        kidName={reviewingChore?.kidName ?? ''}
        kidProfiles={kidProfiles}
        baseRate={baseRate}
        onApprove={(id) => reviewingChore && handleApprove(id, reviewingChore.kidName)}
        onApproveAll={(id) => reviewingChore && handleApproveAll(id, reviewingChore.kidName)}
        onReject={(id, note) => reviewingChore && handleReject(id, note, reviewingChore.kidName)}
        onClose={() => setReviewingChore(null)}
      />

      {/* Toast */}
      {toastMsg && <Toast key={toastMsg + Date.now()} message={toastMsg} bgColor={toastBg} textColor={toastBg ? '#1A1A1A' : undefined} />}
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
  const [completionMode, setCompletionMode] = useState<'shared' | 'independent'>(existing?.completionMode ?? 'shared');
  const [selectedIcon, setSelectedIcon] = useState<{ icon: string | number; bg: string }>(
    existing ? { icon: existing.icon, bg: existing.bg } : CHORE_ICONS[0]
  );
  const [saveError, setSaveError]     = useState('');
  // Completion mode is a household-level choice: always offered for "Everyone"
  // chores (it takes effect as soon as a 2nd kid joins) and for 2+ specific
  // kids. Hidden only when a single specific kid is assigned.
  const modeApplies = assignedTo.length === 0 || assignedTo.length > 1;

  const [freqSheetOpen, setFreqSheetOpen] = useState(false);
  const freqSheetY      = useRef(new Animated.Value(300)).current;
  const freqScrimOp     = useRef(new Animated.Value(0)).current;

  const openFreqSheet = () => {
    setFreqSheetOpen(true);
    freqScrimOp.setValue(0);
    freqSheetY.setValue(300);
    Animated.parallel([
      Animated.timing(freqScrimOp, { toValue: 1, duration: 200, useNativeDriver: true }),
      Animated.spring(freqSheetY, { toValue: 0, useNativeDriver: true, tension: 65, friction: 11 }),
    ]).start();
  };

  const closeFreqSheet = (cb?: () => void) => {
    Animated.timing(freqSheetY, { toValue: 300, duration: 220, useNativeDriver: true, easing: Easing.in(Easing.ease) }).start(() => {
      setFreqSheetOpen(false);
      cb?.();
    });
  };

  const handleSave = () => {
    if (!name.trim()) {
      setSaveError('Please enter a chore name.');
      return;
    }
    setSaveError('');
    try {
      const chore: ManagedChore = {
        id: existing?.id ?? '_' + randomUUID(),
        name: name.trim(),
        description,
        frequency,
        difficulty,
        assignedTo,
        icon: selectedIcon.icon,
        bg: selectedIcon.bg,
        status: existing?.status ?? 'active' as const,
        weeklyCompletions: existing?.weeklyCompletions ?? 0,
        // Mode only applies when 2+ kids are eligible; otherwise behaves as shared.
        completionMode: modeApplies ? completionMode : undefined,
        // Preserve per-child progress when editing an existing chore.
        childStatus:         existing?.childStatus,
        childRejectionNote:  existing?.childRejectionNote,
        childCompletions:    existing?.childCompletions,
      };
      onSave(chore);
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : 'Failed to save chore. Please try again.');
    }
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
            <Text style={{ fontSize: scale(18) }}>🗑️</Text>
          </TouchableOpacity>
        ) : (
          <TouchableOpacity style={p.backBtn} activeOpacity={0.7}>
            <Text style={{ fontSize: scale(18) }}>🔖</Text>
          </TouchableOpacity>
        )}
      </View>

      <ScrollView style={{ flex: 1 }} showsVerticalScrollIndicator={false} contentContainerStyle={{ padding: 16, gap: 16, paddingBottom: 100 }}>
        {/* Icon Picker */}
        <View style={{ alignItems: 'center', marginBottom: 8 }}>
          <ChoreIconPickerSheet selected={selectedIcon} onSelect={setSelectedIcon} />
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
          <TouchableOpacity style={p.formDropdownRow} onPress={openFreqSheet} activeOpacity={0.7}>
            <Text style={p.formDropdownValue}>{frequency}</Text>
            <Text style={{ fontSize: scale(12), color: C.muted }}>▾</Text>
          </TouchableOpacity>
        </View>

        {/* Difficulty */}
        <View style={p.formCard}>
          <Text style={p.formLabel}>Difficulty</Text>
          <View style={{ flexDirection: 'row', gap: 8 }}>
            {([1, 2, 3] as const).map(level => {
              const active = difficulty === level;
              const pay = (baseRateCents(baseRate) * DIFFICULTY_MULTIPLIERS[level] / 100).toFixed(2);
              return (
                <TouchableOpacity
                  key={level}
                  style={[p.difficultyBtn, active && p.difficultyBtnActive]}
                  onPress={() => setDifficulty(level)}
                  activeOpacity={0.7}
                >
                  <View style={{ flexDirection: 'row', gap: 4, justifyContent: 'center' }}>
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

        {/* Completion mode — only meaningful when 2+ kids are eligible */}
        {modeApplies && (
          <View style={p.formCard}>
            <Text style={p.formLabel}>How it's completed</Text>
            <View style={p.modeCard}>
              {([
                { mode: 'shared',      title: 'First to finish earns it',     desc: 'One task. Whoever completes it first gets the credit and the allowance.' },
                { mode: 'independent', title: 'Each completes independently', desc: 'Each child has their own copy. Each can earn credit.' },
              ] as const).map((opt, i) => {
                const active = completionMode === opt.mode;
                return (
                  <TouchableOpacity
                    key={opt.mode}
                    style={[p.modeRow, i > 0 && p.modeRowDivider, active && p.modeRowActive]}
                    onPress={() => setCompletionMode(opt.mode)}
                    activeOpacity={0.7}
                  >
                    <View style={[p.modeRadio, active && p.modeRadioActive]}>
                      {active && <View style={p.modeRadioDot} />}
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={[p.modeTitle, active && p.modeTitleActive]}>{opt.title}</Text>
                      <Text style={p.modeDesc}>{opt.desc}</Text>
                    </View>
                  </TouchableOpacity>
                );
              })}
            </View>
            <View style={{ flexDirection: 'row', gap: 8, marginTop: 12, paddingHorizontal: 4 }}>
              <Text style={{ fontSize: scale(12), color: C.muted }}>ⓘ</Text>
              <Text style={{ flex: 1, fontSize: scale(12), lineHeight: scale(18), color: C.muted, fontFamily: 'Inter_500Medium' }}>
                Good for shared household tasks — dishes, vacuuming, taking out the bins.
              </Text>
            </View>
          </View>
        )}

        {/* Buttons */}
        {!!saveError && (
          <Text style={{ fontSize: scale(12), color: '#E53935', textAlign: 'center', fontFamily: 'Inter_600SemiBold', marginBottom: -8 }}>
            {saveError}
          </Text>
        )}
        <Button label={isEdit ? 'Save changes' : 'Save chore'} onPress={handleSave} />
        {isEdit && (
          <Button label="Cancel" onPress={onBack} variant="secondary" />
        )}
      </ScrollView>

      {/* Frequency bottom sheet */}
      <Modal visible={freqSheetOpen} transparent animationType="none" onRequestClose={() => closeFreqSheet()}>
        <Animated.View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'flex-end', opacity: freqScrimOp }}>
          <TouchableOpacity style={{ flex: 1 }} activeOpacity={1} onPress={() => closeFreqSheet()} />
          <Animated.View style={{ backgroundColor: '#FFFFFF', borderTopLeftRadius: 24, borderTopRightRadius: 24, borderWidth: 2, borderColor: '#1A1A1A', borderBottomWidth: 0, paddingTop: 12, transform: [{ translateY: freqSheetY }] }} onStartShouldSetResponder={() => true}>
            <View style={{ width: 40, height: 4, borderRadius: 2, backgroundColor: '#D0CEC8', alignSelf: 'center', marginBottom: 8 }} />
            <Text style={{ fontSize: scale(12), fontFamily: 'Inter_700Bold', color: '#767676', letterSpacing: 0.8, textTransform: 'uppercase', paddingHorizontal: 16, paddingTop: 8, paddingBottom: 16 }}>Frequency</Text>
            {FREQUENCY_OPTIONS.map((opt, i) => (
              <TouchableOpacity
                key={opt}
                style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingVertical: 16, borderTopWidth: i > 0 ? 1 : 0, borderTopColor: '#F0EEE8' }}
                activeOpacity={0.7}
                onPress={() => closeFreqSheet(() => setFrequency(opt))}
              >
                <Text style={{ fontSize: scale(18), fontFamily: 'Inter_600SemiBold', color: frequency === opt ? '#6B35F0' : '#1A1A1A' }}>{opt}</Text>
                {frequency === opt && <Text style={{ fontSize: scale(18), color: '#6B35F0', fontFamily: 'Inter_700Bold' }}>✓</Text>}
              </TouchableOpacity>
            ))}
            <View style={{ height: Platform.OS === 'ios' ? 28 : 12 }} />
          </Animated.View>
        </Animated.View>
      </Modal>
    </CreamBg>
  );
}

function ChoreLibraryScreen({ chores, onBack, onAdd, onEdit, onDelete, baseRate }: {
  chores: ManagedChore[];
  onBack: () => void;
  onAdd: () => void;
  onEdit: (c: ManagedChore) => void;
  onDelete: (id: string) => void;
  baseRate: string;
}) {
  return (
    <CreamBg>
      <View style={p.screenHeader}>
        <TouchableOpacity onPress={onBack} style={p.backBtn} activeOpacity={0.7}>
          <Text style={p.backBtnText}>←</Text>
        </TouchableOpacity>
        <Text style={p.screenTitle}>Chore Library</Text>
        <TouchableOpacity onPress={onAdd} style={p.backBtn} activeOpacity={0.7}>
          <Text style={{ fontSize: scale(28), color: '#6B35F0' }}>+</Text>
        </TouchableOpacity>
      </View>
      <ScrollView style={{ flex: 1 }} showsVerticalScrollIndicator={false} contentContainerStyle={{ padding: 16, gap: 12, paddingBottom: 120 }}>
        {chores.length === 0 ? (
          <View style={{ alignItems: 'center', paddingTop: 60, gap: 12 }}>
            <Text style={{ fontSize: scale(28) }}>🧹</Text>
            <Text style={{ fontSize: scale(16), fontFamily: 'Inter_700Bold', color: '#1A1A1A' }}>No chores yet</Text>
            <Text style={{ fontSize: scale(12), color: '#767676', textAlign: 'center' }}>Tap + to add your first chore.</Text>
            <Button label="+ Add a chore" onPress={onAdd} style={{ marginTop: 8 }} />
          </View>
        ) : chores.map(chore => {
          const earnAmt = (baseRateCents(baseRate) * DIFFICULTY_MULTIPLIERS[chore.difficulty] / 100).toFixed(2);
          return (
            <TouchableOpacity
              key={chore.id}
              // Flat (no solid drop-shadow) treatment for the library list; keeps
              // the black border. shadowOpacity/elevation:0 neutralizes shadows.solid.
              style={[s.homeQuestCard, { marginBottom: 0, shadowOpacity: 0, elevation: 0 }]}
              onPress={() => onEdit(chore)}
              activeOpacity={0.8}
            >
              <View style={[s.homeQuestIcon, { backgroundColor: chore.bg }]}>
                <ChoreIcon icon={chore.icon} size={45} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={s.homeQuestTitle}>{chore.name}</Text>
                <Text style={{ fontSize: scale(12), fontFamily: 'Inter_500Medium', color: '#767676', marginTop: 4 }}>
                  {chore.frequency} · ${earnAmt}
                </Text>
              </View>
              <Text style={{ fontSize: scale(12), color: '#767676' }}>›</Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>
    </CreamBg>
  );
}

function PayRatesScreen({ onBack, onRateGuide, baseRate, setBaseRate }: {
  onBack: () => void;
  onRateGuide: () => void;
  baseRate: string;
  setBaseRate: (v: string) => void;
}) {

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

      <ScrollView style={{ flex: 1 }} showsVerticalScrollIndicator={false} contentContainerStyle={{ padding: 16, gap: 16, paddingBottom: 120 }}>
        {/* Default currency */}
        <View style={p.sectionCard}>
          <Text style={p.sectionCardTitle}>Default currency</Text>
          <Text style={p.sectionCardSub}>This is what kids earn for completed chores.</Text>
          <View style={p.dropdownRow}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <Image source={require('./assets/icons/icon-coin.png')} style={{ width: scale(22), height: scale(22) }} resizeMode="contain" />
              <Text style={p.dropdownValue}>Dollars</Text>
            </View>
            <Text style={{ fontSize: scale(12), color: C.muted }}>▾</Text>
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
              <Text style={{ fontSize: scale(12), color: C.text }}>$</Text>
              <TextInput
                style={p.rateInput}
                value={baseRate}
                // Digits and a single decimal point only — pasted text or locale
                // commas would otherwise parse to NaN downstream.
                onChangeText={(v) => {
                  const cleaned = v.replace(',', '.').replace(/[^0-9.]/g, '');
                  const firstDot = cleaned.indexOf('.');
                  setBaseRate(firstDot === -1 ? cleaned : cleaned.slice(0, firstDot + 1) + cleaned.slice(firstDot + 1).replace(/\./g, ''));
                }}
                keyboardType="decimal-pad"
              />
            </View>
          </View>

        </View>

        {/* Battle capture bonus moved to Settings → Battle & bonuses (single source). */}

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
    { effort: 'Very easy', time: '< 5 min',    range: '$0.10–$0.25', dot: '#22C55E' },
    { effort: 'Easy',      time: '5–15 min',   range: '$0.25–$0.75', dot: '#84CC16' },
    { effort: 'Medium',    time: '15–30 min',  range: '$0.75–$1.50', dot: '#F59E0B' },
    { effort: 'Hard',      time: '30–60 min',  range: '$1.50–$2.50', dot: '#F97316' },
    { effort: 'Very hard', time: '60+ min',    range: '$2.50+',      dot: '#EF4444' },
  ];

  return (
    <CreamBg>
      <View style={p.screenHeader}>
        <TouchableOpacity onPress={onBack} style={p.backBtn} activeOpacity={0.7}>
          <Text style={p.backBtnText}>←</Text>
        </TouchableOpacity>
        <Text style={p.screenTitle}>Rate guide</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView style={{ flex: 1 }} showsVerticalScrollIndicator={false} contentContainerStyle={{ padding: 16, gap: 16, paddingBottom: 120 }}>

        {/* Purple info card */}
        <View style={p.rateInfoCard}>
          <Text style={{ fontSize: scale(22) }}>💡</Text>
          <Text style={p.rateInfoText}>Suggested rates based on typical time and effort.</Text>
        </View>

        {/* Table card */}
        <View style={[p.sectionCard, { padding: 0, overflow: 'hidden' }]}>
          {/* Dark header */}
          <View style={p.rateTableHead}>
            <Text style={[p.rateTableHeader, { flex: 1.4 }]}>Effort</Text>
            <Text style={[p.rateTableHeader, { flex: 1.2 }]}>Time</Text>
            <Text style={[p.rateTableHeader, { flex: 1.4 }]}>Rate</Text>
          </View>
          {/* Rows */}
          {rates.map((row, i) => (
            <View
              key={row.effort}
              style={[p.rateTableRow, i < rates.length - 1 && { borderBottomWidth: 1, borderBottomColor: '#E8E6E0' }]}
            >
              <View style={{ flex: 1.4, flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <View style={[p.rateDot, { backgroundColor: row.dot }]} />
                <Text style={p.rateTableCell}>{row.effort}</Text>
              </View>
              <Text style={[p.rateTableCell, { flex: 1.2, color: '#888' }]}>{row.time}</Text>
              <Text style={[p.rateTableCell, { flex: 1.4, fontFamily: 'Inter_800ExtraBold' }]}>{row.range}</Text>
            </View>
          ))}
        </View>

        {/* Lime footer card */}
        <View style={p.rateLimeCard}>
          <Text style={{ fontSize: scale(22) }}>🧡</Text>
          <Text style={p.rateLimeText}>These are just suggestions. You know your child and what's fair!</Text>
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
        <Text style={{ fontSize: scale(18) }}>{iconEmoji}</Text>
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

function ParentSettingsScreen({ onNav, baseRate, battleCoinBonusEnabled, setBattleCoinBonusEnabled, battleCoinBonusMultiplier, setBattleCoinBonusMultiplier, onAddKid, onEditKid, kids, kidApprovalSettings, setKidApprovalSettings, kidProfiles, sessionUser, parentRole, pinEnabled, savedPin, onSavePin, onDisablePin, onSaveName, onSignOut }: {
  onNav: (s: ParentScreen) => void;
  baseRate: string;
  battleCoinBonusEnabled: boolean;
  setBattleCoinBonusEnabled: (v: boolean) => void;
  battleCoinBonusMultiplier: number;
  setBattleCoinBonusMultiplier: (v: number) => void;
  onAddKid?: () => void;
  onEditKid?: (k: { name: string; avatarColor: string; avatarIdx: number }) => void;
  kids: string[];
  kidApprovalSettings: Record<string, boolean>;
  setKidApprovalSettings: (v: Record<string, boolean>) => void;
  kidProfiles: { name: string; avatarColor: string; avatarIdx: number }[];
  sessionUser?: SessionUser | null;
  parentRole?: string;
  pinEnabled: boolean;
  savedPin: string;
  onSavePin: (pin: string) => void;
  onDisablePin: () => void;
  onSaveName: (name: string) => void;
  onSignOut: () => void;
}) {
  const [sub, setSub] = useState<SettingsSubScreen>('main');
  const anyApproval = kids.some(k => kidApprovalSettings[k] !== false);

  if (sub === 'kids')     return <SettingsKidsScreen     onBack={() => setSub('main')} onAddKid={onAddKid} onEditKid={onEditKid} kidProfiles={kidProfiles} />;
  if (sub === 'battle')   return <SettingsBattleScreen   onBack={() => setSub('main')} baseRate={baseRate} battleCoinBonusEnabled={battleCoinBonusEnabled} setBattleCoinBonusEnabled={setBattleCoinBonusEnabled} battleCoinBonusMultiplier={battleCoinBonusMultiplier} setBattleCoinBonusMultiplier={setBattleCoinBonusMultiplier} />;
  if (sub === 'account')  return <SettingsAccountScreen  onBack={() => setSub('main')} sessionUser={sessionUser} parentRole={parentRole} pinEnabled={pinEnabled} savedPin={savedPin} onSavePin={onSavePin} onDisablePin={onDisablePin} onSaveName={onSaveName} onSignOut={onSignOut} />;
  if (sub === 'approval') return <SettingsApprovalScreen onBack={() => setSub('main')} kids={kids} kidApprovalSettings={kidApprovalSettings} setKidApprovalSettings={setKidApprovalSettings} kidProfiles={kidProfiles} />;

  return (
    <CreamBg>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 120 }}>
        {/* Family */}
        <Text style={ps.sectionLabel}>Family</Text>
        <View style={ps.group}>
          <SettingsRow iconBg="#6B35F0" iconEmoji="👨‍👩‍👧" title="Kids" subtitle={kidProfiles.map(k => k.name).join(', ') || 'No kids yet'} badge={kidProfiles.length || undefined} onPress={() => setSub('kids')} />
        </View>

        {/* Chores */}
        <Text style={ps.sectionLabel}>Chores</Text>
        <View style={ps.group}>
          <SettingsRow iconBg="#F59E0B" iconEmoji="💰" title="Pay rates & economy" subtitle="Currency, base rate, earning cap" onPress={() => onNav('payRates')} />
          <View style={ps.divider} />
          <SettingsRow iconBg="#10B981" iconEmoji="✅" title="Chore library" subtitle="Manage & create chores" onPress={() => onNav('choreLibrary')} />
          <View style={ps.divider} />
          <SettingsRow iconBg="#6366F1" iconEmoji="🕐" title="Approval settings" subtitle={anyApproval ? `${kids.filter(k => kidApprovalSettings[k] !== false).length} of ${kids.length} kids require approval` : 'Auto-approve all'} onPress={() => setSub('approval')} />
        </View>

        {/* Battles */}
        <Text style={ps.sectionLabel}>Battles</Text>
        <View style={ps.group}>
          <SettingsRow iconBg="#EF4444" iconEmoji="⚔️" title="Battle & bonuses" subtitle="Boss rewards, monetary bonuses" onPress={() => setSub('battle')} />
        </View>

        {/* Progress */}
        <Text style={ps.sectionLabel}>Progress</Text>
        <View style={ps.group}>
          <SettingsRow iconBg="#6B35F0" iconEmoji="🏅" title="Your milestones" subtitle="Badges you've earned as a parent" onPress={() => onNav('parentMilestones')} />
          <SettingsRow iconBg="#7B3FF2" iconEmoji="🌟" title="Kids' achievements" subtitle="Milestones your kids have earned" onPress={() => onNav('kidMilestones')} />
        </View>

        {/* Account */}
        <Text style={ps.sectionLabel}>Account</Text>
        <View style={ps.group}>
          <SettingsRow iconBg="#8B5CF6" iconEmoji="👤" title="Account" subtitle="Email, password, notifications" onPress={() => setSub('account')} />
          <View style={ps.divider} />
          <SettingsRow iconBg="#64748B" iconEmoji="❓" title="Help & support" />
          <View style={ps.divider} />
          <SettingsRow iconBg="#94A3B8" iconEmoji="ℹ️" title="About Monstir" />
        </View>

        {/* Version label doubles as the hidden support gesture: press and hold
            to ship the debug-log buffer (alpha diagnostics). Parent-side only,
            already behind the PIN switcher — a kid never reaches this screen. */}
        <DebugTap reason="manual.settings">
          <Text style={ps.version}>v{APP_VERSION ?? '—'}</Text>
        </DebugTap>
      </ScrollView>
    </CreamBg>
  );
}

// ─── Parent Milestones Screen ─────────────────────────────────────────────────

function ParentMilestonesScreen({ onBack }: { onBack: () => void }) {
  const [earnedMilestones, setEarnedMilestones] = useState<EarnedMilestone[]>([]);
  const [detailMilestone, setDetailMilestone]   = useState<MilestoneDef | null>(null);
  useEffect(() => { getEarnedMilestones(PARENT_OWNER).then(setEarnedMilestones); }, []);
  const earnedMap = new Map(earnedMilestones.map(m => [m.id, m.earnedAt]));
  const parentDefs = MILESTONES.filter(m => m.audience === 'parent');
  const earned = parentDefs.filter(m => earnedMap.has(m.id));
  const locked = parentDefs.filter(m => !earnedMap.has(m.id));

  if (detailMilestone) {
    return (
      <ParentMilestoneDetail
        milestone={detailMilestone}
        earned={earnedMilestones.find(e => e.id === detailMilestone.id)}
        allEarned={earnedMilestones}
        onBack={() => setDetailMilestone(null)}
      />
    );
  }

  const renderRow = (m: MilestoneDef, earnedAt?: string) => (
    <TouchableOpacity key={m.id} onPress={() => setDetailMilestone(m)} activeOpacity={0.8} style={{
      flexDirection: 'row', alignItems: 'center', gap: 16,
      backgroundColor: earnedAt ? '#FFFFFF' : '#F3F1EC',
      borderRadius: 14, borderWidth: 2,
      borderColor: earnedAt ? '#1A1A1A' : '#D0CEC8',
      padding: 16, marginBottom: 12,
      opacity: earnedAt ? 1 : 0.5,
    }}>
      <View style={{
        width: 52, height: 52, borderRadius: 26,
        backgroundColor: earnedAt ? PURPLE : '#ECEAE4',
        alignItems: 'center', justifyContent: 'center',
        borderWidth: 2, borderColor: earnedAt ? '#1A1A1A' : '#D0CEC8',
        flexShrink: 0,
      }}>
        {m.image
          ? <Image source={m.image} style={{ width: 32, height: 32 }} resizeMode="contain" />
          : <Text style={{ fontSize: scale(22) }}>{m.icon}</Text>}
      </View>
      <View style={{ flex: 1 }}>
        <Text style={{ fontFamily: 'Inter_800ExtraBold', fontSize: scale(16), color: '#1A1A1A', marginBottom: 4 }}>{m.name}</Text>
        <Text style={{ fontFamily: 'Inter_400Regular', fontSize: scale(12), color: '#767676', lineHeight: 17 }}>{m.tagline}</Text>
        {earnedAt && (
          <Text style={{ fontFamily: 'Inter_600SemiBold', fontSize: scale(12), color: '#3B6D11', marginTop: 4 }}>
            Earned {new Date(earnedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
          </Text>
        )}
      </View>
      {earnedAt && (
        <View style={{ backgroundColor: '#E8FBB4', borderRadius: 8, borderWidth: 1.5, borderColor: '#3B6D11', paddingHorizontal: 8, paddingVertical: 4 }}>
          <Text style={{ fontFamily: 'Inter_700Bold', fontSize: scale(12), color: '#3B6D11' }}>✓</Text>
        </View>
      )}
    </TouchableOpacity>
  );

  return (
    <CreamBg>
      <View style={p.screenHeader}>
        <TouchableOpacity onPress={onBack} style={p.backBtn} activeOpacity={0.7}>
          <Text style={p.backBtnText}>←</Text>
        </TouchableOpacity>
        <Text style={p.screenTitle}>Your Milestones</Text>
        <View style={p.backBtn} />
      </View>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 120 }}>
        {/* Summary */}
        <View style={{ backgroundColor: PURPLE, borderRadius: 16, borderWidth: 2, borderColor: '#1A1A1A', padding: 20, marginBottom: 24, alignItems: 'center' }}>
          <Text style={{ fontFamily: 'Inter_900Black', fontSize: scale(44), color: '#FFFFFF' }}>{earned.length}</Text>
          <Text style={{ fontFamily: 'Inter_700Bold', fontSize: scale(12), color: 'rgba(255,255,255,0.75)', letterSpacing: 0.5 }}>of {parentDefs.length} milestones earned</Text>
        </View>

        {earned.length > 0 && (
          <>
            <Text style={{ fontFamily: 'Inter_800ExtraBold', fontSize: scale(12), color: '#1A1A1A', letterSpacing: 1, textTransform: 'uppercase', marginBottom: 12 }}>EARNED</Text>
            {earned.map(m => renderRow(m, earnedMap.get(m.id)))}
            <View style={{ height: 20 }} />
          </>
        )}

        {locked.length > 0 && (
          <>
            <Text style={{ fontFamily: 'Inter_800ExtraBold', fontSize: scale(12), color: '#1A1A1A', letterSpacing: 1, textTransform: 'uppercase', marginBottom: 12 }}>LOCKED</Text>
            {locked.map(m => renderRow(m))}
          </>
        )}
      </ScrollView>
    </CreamBg>
  );
}

// ─── Parent view of Kids' Milestones (aggregated, attributed feed) ─────────────

interface KidMilestoneEvent { kidName: string; avatarIdx: number; def: MilestoneDef; earnedAt: string; }

/** Relative "time ago" label for the achievement feed. */
function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const day = 86_400_000;
  if (diff < day)        return 'Today';
  if (diff < 2 * day)    return 'Yesterday';
  if (diff < 7 * day)    return `${Math.floor(diff / day)}d ago`;
  if (diff < 30 * day)   return `${Math.floor(diff / (7 * day))}w ago`;
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

/** Fine-grained "marked done · 2h ago" recency for the approval triage card
 *  (MON-64 Rev 2) — finer than timeAgo, which collapses everything today to "Today". */
function choreAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const m = 60_000, h = 3_600_000, d = 86_400_000;
  if (diff < m)     return 'just now';
  if (diff < h)     return `${Math.floor(diff / m)}m ago`;
  if (diff < d)     return `${Math.floor(diff / h)}h ago`;
  if (diff < 2 * d) return 'yesterday';
  if (diff < 7 * d) return `${Math.floor(diff / d)}d ago`;
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

function ParentKidMilestonesScreen({ kidProfiles, onBack }: {
  kidProfiles: { name: string; avatarIdx: number }[];
  onBack: () => void;
}) {
  const [events, setEvents] = useState<KidMilestoneEvent[]>([]);
  const [filter, setFilter] = useState<string>('All');

  useEffect(() => {
    let alive = true;
    (async () => {
      const all = await Promise.all(kidProfiles.map(async k => {
        const earned = await getEarnedMilestones(k.name);
        return earned
          .map(e => {
            const def = getMilestone(e.id);
            return def ? { kidName: k.name, avatarIdx: k.avatarIdx, def, earnedAt: e.earnedAt } : null;
          })
          .filter((x): x is KidMilestoneEvent => x != null);
      }));
      if (!alive) return;
      const merged = all.flat().sort((a, b) => b.earnedAt.localeCompare(a.earnedAt));
      setEvents(merged);
    })();
    return () => { alive = false; };
  }, [kidProfiles]);

  const shown = filter === 'All' ? events : events.filter(e => e.kidName === filter);

  // Earned-of-total stat. Each kid can earn every kid milestone once, so the
  // ceiling is the catalog size per kid (× the number of kids under "All").
  const totalMilestones = filter === 'All' ? KID_MILESTONES.length * kidProfiles.length : KID_MILESTONES.length;
  const earnedCount = shown.length;

  return (
    <CreamBg>
      <View style={p.screenHeader}>
        <TouchableOpacity onPress={onBack} style={p.backBtn} activeOpacity={0.7}>
          <Text style={p.backBtnText}>←</Text>
        </TouchableOpacity>
        <Text style={p.screenTitle}>Kids' Achievements</Text>
        <View style={p.backBtn} />
      </View>

      {/* Filter chips: All + each kid */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ flexGrow: 0, marginBottom: 4 }} contentContainerStyle={{ paddingHorizontal: 16, gap: 8 }}>
        {['All', ...kidProfiles.map(k => k.name)].map((name, i) => {
          const active = filter === name;
          return (
            <TouchableOpacity key={`${name}-${i}`} onPress={() => setFilter(name)} activeOpacity={0.8} style={{
              backgroundColor: active ? PURPLE : '#FFFFFF',
              borderRadius: 999, borderWidth: 2, borderColor: '#1A1A1A',
              paddingHorizontal: 16, paddingVertical: 8,
            }}>
              <Text style={{ fontFamily: 'Inter_700Bold', fontSize: scale(12), color: active ? '#FFFFFF' : '#1A1A1A' }}>{name}</Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 16, paddingTop: 12, paddingBottom: 120 }}>
        {/* Earned-of-total stat — updates with the active kid filter */}
        <View style={{ backgroundColor: PURPLE, borderRadius: 20, borderWidth: 2.5, borderColor: '#1A1A1A', paddingVertical: 24, alignItems: 'center', marginBottom: 16, ...shadows.solid }}>
          <Text style={{ fontFamily: 'Inter_900Black', fontSize: scale(44), lineHeight: scale(48), color: '#FFFFFF' }}>{earnedCount}</Text>
          <Text style={{ fontFamily: 'Inter_700Bold', fontSize: scale(16), color: 'rgba(255,255,255,0.8)', marginTop: 4 }}>of {totalMilestones} milestones earned</Text>
        </View>
        {shown.length === 0 ? (
          <View style={{ alignItems: 'center', paddingVertical: 60 }}>
            <Text style={{ fontSize: scale(44), marginBottom: 12 }}>🏅</Text>
            <Text style={{ fontFamily: 'Inter_800ExtraBold', fontSize: scale(16), color: '#1A1A1A', marginBottom: 4 }}>No achievements yet</Text>
            <Text style={{ fontFamily: 'Inter_400Regular', fontSize: scale(12), color: '#767676', textAlign: 'center' }}>
              As your kids complete chores, win battles, and hit streaks, their milestones show up here.
            </Text>
          </View>
        ) : shown.map((e, i) => (
          <View key={`${e.kidName}-${e.def.id}-${i}`} style={{
            flexDirection: 'row', alignItems: 'center', gap: 16,
            backgroundColor: '#FFFFFF', borderRadius: 14, borderWidth: 2, borderColor: '#1A1A1A',
            padding: 16, marginBottom: 12,
          }}>
            <View style={{ width: 52, height: 52, borderRadius: 26, backgroundColor: PURPLE, alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: '#1A1A1A', flexShrink: 0 }}>
              {e.def.image
                ? <Image source={e.def.image} style={{ width: 32, height: 32 }} resizeMode="contain" />
                : <Text style={{ fontSize: scale(22) }}>{e.def.icon}</Text>}
            </View>
            <View style={{ flex: 1 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                <Image source={getAvatarImage(e.avatarIdx)} style={{ width: 18, height: 18, borderRadius: 9 }} />
                <Text style={{ fontFamily: 'Inter_700Bold', fontSize: scale(12), color: PURPLE }}>{e.kidName}</Text>
              </View>
              <Text style={{ fontFamily: 'Inter_800ExtraBold', fontSize: scale(16), color: '#1A1A1A' }}>{e.def.name}</Text>
              <Text style={{ fontFamily: 'Inter_400Regular', fontSize: scale(12), color: '#767676', lineHeight: 17 }}>{e.def.tagline}</Text>
            </View>
            <Text style={{ fontFamily: 'Inter_600SemiBold', fontSize: scale(12), color: '#3B6D11', flexShrink: 0 }}>{timeAgo(e.earnedAt)}</Text>
          </View>
        ))}
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
                <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 24 }}>
                  <Text style={{ flex: 1, fontSize: scale(18), fontFamily: 'Inter_800ExtraBold', color: '#1A1A1A' }}>{isEdit ? 'Edit kid' : 'Add a kid'}</Text>
                  <TouchableOpacity onPress={onClose} style={{ width: 34, height: 34, borderRadius: 17, borderWidth: 2, borderColor: '#1A1A1A', backgroundColor: '#FFFFFF', alignItems: 'center', justifyContent: 'center' }} activeOpacity={0.7}>
                    <View style={{ width: 14, height: 14, alignItems: 'center', justifyContent: 'center' }}>
                      <View style={{ position: 'absolute', width: 14, height: 2, backgroundColor: '#1A1A1A', borderRadius: 1, transform: [{ rotate: '45deg' }] }} />
                      <View style={{ position: 'absolute', width: 14, height: 2, backgroundColor: '#1A1A1A', borderRadius: 1, transform: [{ rotate: '-45deg' }] }} />
                    </View>
                  </TouchableOpacity>
                </View>

                {/* Avatar picker */}
                <Text style={{ fontSize: scale(12), fontFamily: 'Inter_700Bold', color: '#767676', marginBottom: 12, letterSpacing: 0.8 }}>CHOOSE AVATAR</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 12, paddingBottom: 4, marginBottom: 20 }}>
                  {AVATAR_INDICES.map(i => (
                    <TouchableOpacity key={i} onPress={() => setAvatarIdx(i)} activeOpacity={0.8}
                      style={{ width: 80, height: 80, borderRadius: 40, backgroundColor: KID_AVATAR_COLORS[i % KID_AVATAR_COLORS.length], alignItems: 'center', justifyContent: 'center', borderWidth: avatarIdx === i ? 3 : 2, borderColor: avatarIdx === i ? '#6B35F0' : '#E0DDD6' }}>
                      <Image source={getAvatarImage(i)} style={{ width: 64, height: 64, borderRadius: 32 }} resizeMode="cover" />
                    </TouchableOpacity>
                  ))}
                </ScrollView>

                {/* Name */}
                <Text style={{ fontSize: scale(12), fontFamily: 'Inter_700Bold', color: '#767676', marginBottom: 8, letterSpacing: 0.8 }}>NAME</Text>
                <TextInput
                  value={name}
                  onChangeText={t => setName(t.slice(0, 12))}
                  autoCapitalize="words"
                  placeholder="Child's name"
                  placeholderTextColor="#C0BDB7"
                  style={{ backgroundColor: '#FFFFFF', borderRadius: 12, borderWidth: 2, borderColor: '#1A1A1A', paddingHorizontal: 16, paddingVertical: 16, fontSize: scale(16), fontFamily: 'Inter_600SemiBold', color: '#1A1A1A', marginBottom: 20 }}
                />

                {/* Age range */}
                <Text style={{ fontSize: scale(12), fontFamily: 'Inter_700Bold', color: '#767676', marginBottom: 12, letterSpacing: 0.8 }}>AGE RANGE</Text>
                <View style={{ flexDirection: 'row', gap: 8, marginBottom: 28 }}>
                  {KID_AGE_RANGES.map(r => (
                    <TouchableOpacity key={r} onPress={() => setAgeRange(r)} activeOpacity={0.8}
                      style={{ flex: 1, paddingVertical: 12, borderRadius: 12, alignItems: 'center', backgroundColor: ageRange === r ? '#6B35F0' : '#FFFFFF', borderWidth: 2, borderColor: ageRange === r ? '#6B35F0' : '#E0DDD6' }}>
                      <Text style={{ fontSize: scale(12), fontFamily: 'Inter_700Bold', color: ageRange === r ? '#FFFFFF' : '#1A1A1A' }}>{r}</Text>
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
      {kidProfiles.length === 0 ? (
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 32, gap: 16, paddingBottom: '20%' }}>
          <View style={{ width: 120, height: 120, borderRadius: 60, backgroundColor: '#EAE4FF', alignItems: 'center', justifyContent: 'center' }}>
            <Image source={getAvatarImage(0)} style={{ width: 96, height: 96, borderRadius: 48 }} resizeMode="cover" />
          </View>
          <Text style={{ fontFamily: 'Inter_800ExtraBold', fontSize: scale(22), color: '#1A1A1A', textAlign: 'center' }}>No kids yet</Text>
          <Text style={{ fontFamily: 'Inter_400Regular', fontSize: scale(16), color: '#767676', textAlign: 'center', lineHeight: 22 }}>
            This is where your children will appear. Add a kid to get started.
          </Text>
          {onAddKid && (
            <View style={{ width: '100%', marginTop: 8 }}>
              <Button label="+ Add kid" onPress={onAddKid} />
            </View>
          )}
        </View>
      ) : (
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 120 }}>
          <Text style={ps.sectionLabel}>Profiles</Text>
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
          {onAddKid && (
            <View style={{ paddingHorizontal: 16, marginTop: 8 }}>
              <Button label="+ Add kid" onPress={onAddKid} />
            </View>
          )}
        </ScrollView>
      )}
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

function SettingsBattleScreen({ onBack, baseRate, battleCoinBonusEnabled, setBattleCoinBonusEnabled, battleCoinBonusMultiplier, setBattleCoinBonusMultiplier }: {
  onBack: () => void;
  baseRate: string;
  battleCoinBonusEnabled: boolean;
  setBattleCoinBonusEnabled: (v: boolean) => void;
  battleCoinBonusMultiplier: number;
  setBattleCoinBonusMultiplier: (v: number) => void;
}) {
  const [scrollEnabled, setScrollEnabled] = useState(true);
  const captureRewards = ['Captured boss', 'Collectible relic'];

  // The slider works in whole percent; the persisted value is a fraction.
  const bonusEnabled   = battleCoinBonusEnabled;
  const setBonusEnabled = setBattleCoinBonusEnabled;
  const bonusPct       = Math.round((battleCoinBonusMultiplier || 0) * 100);
  const setBonusPct    = (pct: number) => setBattleCoinBonusMultiplier(pct / 100);

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
          <Text style={{ fontSize: scale(44) }}>👾</Text>
          <View style={{ flex: 1 }}>
            <Text style={ps.battleHeroTitle}>Boss battles</Text>
            <Text style={ps.battleHeroSub}>Kids earn XP fighting bosses. Configure whether winning also earns real money.</Text>
          </View>
        </View>

        {/* Monetary bonus toggle */}
        <Text style={[ps.sectionLabel, { paddingHorizontal: 0, paddingTop: 4 }]}>Monetary bonus</Text>
        <View style={p.sectionCard}>
          <View style={{ flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12 }}>
            <View style={{ flex: 1 }}>
              <Text style={ps.rowTitle}>Cash bonus for winning</Text>
              <Text style={ps.rowSub}>Pay a bonus when a boss is defeated</Text>
            </View>
            <Toggle value={bonusEnabled} onValueChange={setBonusEnabled} />
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

        {/* Capture rewards */}
        <View style={[p.sectionCard, { backgroundColor: '#F3EEFF' }]}>
          <Text style={[ps.rowTitle, { color: '#6B35F0', marginBottom: 12 }]}>🏆  Capture rewards</Text>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
            {[...captureRewards, ...(bonusEnabled ? ['Cash bonus'] : [])].map(c => (
              <View key={c} style={ps.cosmeticPill}><Text style={ps.cosmeticText}>{c}</Text></View>
            ))}
          </View>
        </View>

        <View style={p.noteCard}>
          <Text style={{ fontSize: scale(18), marginRight: 8 }}>💡</Text>
          <Text style={p.noteText}>When a boss is defeated your kid captures it into their collection and earns a collectible relic — always, regardless of the cash bonus setting.</Text>
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
        <Text style={p.screenTitle}>Chore Approval</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ padding: 16, paddingBottom: 120 }}>
        {/* Header card */}
        <View style={ps.apprHeaderCard}>
          <View style={ps.apprHeaderIcon}>
            <Text style={{ fontSize: scale(22) }}>✅</Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={ps.apprHeaderTitle}>Who needs sign-off?</Text>
            <Text style={ps.apprHeaderSub}>Choose which kids need your approval before earning XP and coins.</Text>
          </View>
        </View>

        {/* Per-kid cards */}
        <Text style={ps.apprSectionLabel}>Per-kid settings</Text>
        {kids.map((kid) => {
          const needsApproval = kidApprovalSettings[kid] ?? true;
          const profile = kidProfiles.find(k => k.name === kid);
          return (
            <View key={kid} style={ps.apprKidCard}>
              {/* Header: avatar + name + badge */}
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                <View style={{ width: 46, height: 46, borderRadius: 23, backgroundColor: profile?.avatarColor ?? '#F0F0F0', alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: '#111', ...SOLID_SHADOW }}>
                  <Image source={getAvatarImage(profile?.avatarIdx ?? 0)} style={{ width: 34, height: 34, borderRadius: 17 }} resizeMode="cover" />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={ps.apprKidName}>{kid}</Text>
                  <View style={[ps.apprBadge, needsApproval ? ps.apprBadgeRequire : ps.apprBadgeAuto]}>
                    <Text style={[ps.apprBadgeText, { color: needsApproval ? '#7B3FF2' : '#5A7A00' }]}>
                      {needsApproval ? '🔒 Needs approval' : '⚡ Auto-approved'}
                    </Text>
                  </View>
                </View>
              </View>

              {/* Toggle row */}
              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12, marginTop: 16 }}>
                <View style={{ flex: 1 }}>
                  <Text style={ps.apprToggleMain}>{needsApproval ? 'Require approval' : 'Auto-approve'}</Text>
                  <Text style={ps.apprToggleSub}>
                    {needsApproval ? 'XP and coins held until you tap Approve.' : 'Rewards granted instantly when marked done.'}
                  </Text>
                </View>
                <Toggle value={needsApproval} onValueChange={() => toggle(kid)} />
              </View>
            </View>
          );
        })}

        {/* Shortcuts */}
        <Text style={ps.apprSectionLabel}>Shortcuts</Text>
        <View style={{ flexDirection: 'row', gap: 8 }}>
          <TouchableOpacity
            style={[ps.apprShortcutBtn, { opacity: allOn ? 0.45 : 1 }]}
            onPress={() => setAll(true)}
            activeOpacity={0.7}
            disabled={allOn}
          >
            <Text style={ps.apprShortcutText}>🔒 Require all</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[ps.apprShortcutBtn, { opacity: allOff ? 0.45 : 1 }]}
            onPress={() => setAll(false)}
            activeOpacity={0.7}
            disabled={allOff}
          >
            <Text style={ps.apprShortcutText}>⚡ Auto all</Text>
          </TouchableOpacity>
        </View>

        {/* Info box */}
        <View style={ps.apprInfoBox}>
          <Text style={{ fontSize: scale(16), marginTop: 0 }}>💡</Text>
          <Text style={ps.apprInfoText}>
            <Text style={{ color: '#7B3FF2', fontFamily: 'Inter_700Bold' }}>Require on</Text> — rewards held until you approve the chore.{'\n'}
            <Text style={{ color: '#7B3FF2', fontFamily: 'Inter_700Bold' }}>Require off</Text> — rewards granted instantly when your kid marks it done.
          </Text>
        </View>
      </ScrollView>
    </CreamBg>
  );
}

type AccountSubScreen = 'main' | 'profile' | 'email' | 'notifications' | 'privacy';

function SettingsAccountScreen({ onBack, sessionUser, parentRole = '', pinEnabled, savedPin, onSavePin, onDisablePin, onSaveName, onSignOut }: {
  onBack: () => void; sessionUser?: SessionUser | null; parentRole?: string;
  pinEnabled: boolean; savedPin: string; onSavePin: (pin: string) => void; onDisablePin: () => void;
  onSaveName: (name: string) => void; onSignOut: () => void;
}) {
  const displayName  = sessionUser?.name  || (parentRole ? parentRole.charAt(0).toUpperCase() + parentRole.slice(1) : 'Parent');
  const displayEmail = sessionUser?.email || '';

  const [sub, setSub] = useState<AccountSubScreen>('main');
  const back = () => setSub('main');

  if (sub === 'profile')       return <AccountProfileScreen       onBack={back} name={displayName} parentRole={parentRole} onSaveName={onSaveName} />;
  if (sub === 'email')         return <AccountEmailScreen         onBack={back} email={displayEmail} />;
  if (sub === 'notifications') return <AccountNotificationsScreen onBack={back} />;
  if (sub === 'privacy')       return <AccountPrivacyScreen       onBack={back} pinEnabled={pinEnabled} savedPin={savedPin} onSavePin={onSavePin} onDisablePin={onDisablePin} />;

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
            <Image source={getParentAvatar(parentRole)} style={{ width: '100%', height: '100%', borderRadius: 999 }} resizeMode="cover" />
          </View>
          <Text style={[ps.rowTitle, { fontSize: scale(18), marginTop: 12 }]}>{displayName}</Text>
          {displayEmail ? <Text style={ps.rowSub}>{displayEmail}</Text> : null}
        </View>

        <View style={ps.group}>
          <SettingsRow iconBg="#8B5CF6" iconEmoji="👤" title="Profile information" onPress={() => setSub('profile')} />
          <View style={ps.divider} />
          <SettingsRow iconBg="#6366F1" iconEmoji="📧" title="Email & password" onPress={() => setSub('email')} />
          <View style={ps.divider} />
          <SettingsRow iconBg="#F59E0B" iconEmoji="🔔" title="Notifications" onPress={() => setSub('notifications')} />
          <View style={ps.divider} />
          <SettingsRow iconBg="#10B981" iconEmoji="🔒" title="Privacy & security" onPress={() => setSub('privacy')} />
        </View>

        <TouchableOpacity style={ps.logoutBtn} activeOpacity={0.8} onPress={onSignOut}>
          <Text style={ps.logoutText}>Log out</Text>
        </TouchableOpacity>
      </ScrollView>
    </CreamBg>
  );
}

// ─── Account sub-screens (MVP) ────────────────────────────────────────────────
// Lightweight scaffolds built on the design system. Inputs are local-only for
// now — wire to Supabase (saveProfile / supabase.auth) when these ship.

/** Shared header for account sub-screens. */
function AccountSubHeader({ title, onBack }: { title: string; onBack: () => void }) {
  return (
    <View style={p.screenHeader}>
      <TouchableOpacity onPress={onBack} style={p.backBtn} activeOpacity={0.7}>
        <Text style={p.backBtnText}>←</Text>
      </TouchableOpacity>
      <Text style={p.screenTitle}>{title}</Text>
      <View style={{ width: 40 }} />
    </View>
  );
}

/** A single labelled toggle row inside a grouped card. */
function AccountToggleRow({ title, subtitle, value, onValueChange, divider }: {
  title: string; subtitle?: string; value: boolean; onValueChange: (v: boolean) => void; divider?: boolean;
}) {
  return (
    <>
      {divider && <View style={ps.divider} />}
      <View style={[ps.row, { justifyContent: 'space-between' }]}>
        <View style={{ flex: 1, paddingRight: 12 }}>
          <Text style={ps.rowTitle}>{title}</Text>
          {subtitle ? <Text style={ps.rowSub}>{subtitle}</Text> : null}
        </View>
        <Toggle value={value} onValueChange={onValueChange} />
      </View>
    </>
  );
}

function AccountProfileScreen({ onBack, name, parentRole, onSaveName }: { onBack: () => void; name: string; parentRole: string; onSaveName: (name: string) => void }) {
  const [displayName, setDisplayName] = useState(name);
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    const trimmed = displayName.trim();
    if (!trimmed) return;
    setSaving(true);
    onSaveName(trimmed);   // update app state + Supabase
    onBack();
  };

  return (
    <CreamBg>
      <AccountSubHeader title="Profile information" onBack={onBack} />
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ padding: 16, gap: 16, paddingBottom: 120 }}>
        <View style={{ alignItems: 'center', paddingVertical: 12 }}>
          <View style={ps.accountAvatar}>
            <Image source={getParentAvatar(parentRole)} style={{ width: '100%', height: '100%', borderRadius: 999 }} resizeMode="cover" />
          </View>
        </View>
        <FormField label="Display name" value={displayName} onChangeText={setDisplayName} placeholder="Your name" autoCapitalize="words" />
        <Button label={saving ? 'Saving…' : 'Save changes'} onPress={handleSave} disabled={!displayName.trim() || displayName.trim() === name} />
      </ScrollView>
    </CreamBg>
  );
}

function AccountEmailScreen({ onBack, email }: { onBack: () => void; email: string }) {
  const [emailVal, setEmailVal] = useState(email);
  const [newPass, setNewPass]   = useState('');
  const [confirm, setConfirm]   = useState('');
  const [saving, setSaving]     = useState(false);
  const [error, setError]       = useState('');
  const [success, setSuccess]   = useState('');

  const emailChanged = emailVal.trim() !== email && emailVal.trim().length > 0;
  const passStarted  = newPass.length > 0;
  const passValid    = passStarted && newPass.length >= 6 && newPass === confirm;
  // If the user has started typing a password but it isn't valid yet, block saving
  const passBlocking = passStarted && !passValid;
  const canSave      = !saving && !passBlocking && (emailChanged || passValid);

  const handleSave = async () => {
    setError('');
    setSuccess('');
    if (passStarted && newPass !== confirm) { setError('Passwords don\'t match.'); return; }
    if (passStarted && newPass.length < 6)  { setError('Password must be at least 6 characters.'); return; }
    setSaving(true);
    const err = await saveEmailAndPassword({
      email:    emailChanged ? emailVal.trim() : undefined,
      password: passValid    ? newPass          : undefined,
    });
    setSaving(false);
    if (err) {
      setError(err);
    } else {
      setSuccess(emailChanged
        ? 'Check your new email for a confirmation link.'
        : 'Password updated successfully.');
      setNewPass('');
      setConfirm('');
    }
  };

  return (
    <CreamBg>
      <AccountSubHeader title="Email & password" onBack={onBack} />
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ padding: 16, gap: 16, paddingBottom: 120 }} keyboardShouldPersistTaps="handled">
        <FormField label="Email address" value={emailVal} onChangeText={v => { setEmailVal(v); setError(''); setSuccess(''); }} placeholder="you@email.com" keyboardType="email-address" autoCapitalize="none" />
        <Text style={[ps.sectionLabel, { paddingHorizontal: 0, paddingTop: 4 }]}>Change password</Text>
        <FormField label="New password" value={newPass} onChangeText={v => { setNewPass(v); setError(''); setSuccess(''); }} placeholder="••••••••" secureTextEntry autoCapitalize="none" />
        <FormField label="Confirm password" value={confirm} onChangeText={v => { setConfirm(v); setError(''); setSuccess(''); }} placeholder="••••••••" secureTextEntry autoCapitalize="none" />
        {!!error   && <Text style={{ fontFamily: interFamily.semibold, fontSize: fontSize.sm, color: '#E53935', textAlign: 'center', marginTop: -8 }}>{error}</Text>}
        {!!success && <Text style={{ fontFamily: interFamily.semibold, fontSize: fontSize.sm, color: '#22C55E', textAlign: 'center', marginTop: -8 }}>{success}</Text>}
        <Button label={saving ? 'Saving…' : 'Save changes'} onPress={handleSave} disabled={!canSave} />
      </ScrollView>
    </CreamBg>
  );
}

function AccountNotificationsScreen({ onBack }: { onBack: () => void }) {
  const [prefs, setPrefs] = useState({ chores: true, approvals: true, summary: true, payouts: false });
  const set = (key: keyof typeof prefs) => (v: boolean) => setPrefs(prev => ({ ...prev, [key]: v }));
  return (
    <CreamBg>
      <AccountSubHeader title="Notifications" onBack={onBack} />
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ padding: 16, gap: 16, paddingBottom: 120 }}>
        <View style={[ps.group, { marginHorizontal: 0 }]}>
          <AccountToggleRow title="Chore completions" subtitle="When a kid marks a chore done" value={prefs.chores} onValueChange={set('chores')} />
          <AccountToggleRow title="Approval requests" subtitle="When a chore needs your sign-off" value={prefs.approvals} onValueChange={set('approvals')} divider />
          <AccountToggleRow title="Weekly summary" subtitle="A recap of the week's progress" value={prefs.summary} onValueChange={set('summary')} divider />
          <AccountToggleRow title="Payout reminders" subtitle="When a kid has coins to cash out" value={prefs.payouts} onValueChange={set('payouts')} divider />
        </View>
      </ScrollView>
    </CreamBg>
  );
}

function AccountPrivacyScreen({ onBack, pinEnabled, savedPin, onSavePin, onDisablePin }: {
  onBack: () => void; pinEnabled: boolean; savedPin: string; onSavePin: (pin: string) => void; onDisablePin: () => void;
}) {
  const [requirePin, setRequirePin] = useState(pinEnabled);
  const [shareUsage, setShareUsage] = useState(true);
  const [pin, setPin] = useState(savedPin);
  const [saved, setSaved] = useState(pinEnabled);

  const onToggle = (v: boolean) => {
    setRequirePin(v);
    if (!v) { setPin(''); setSaved(false); onDisablePin(); }   // turning off clears the PIN
  };
  const onSave = () => { onSavePin(pin); setSaved(true); };

  return (
    <CreamBg>
      <AccountSubHeader title="Privacy & security" onBack={onBack} />
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ padding: 16, gap: 16, paddingBottom: 120 }}>
        <View style={[ps.group, { marginHorizontal: 0 }]}>
          <AccountToggleRow title="Require PIN for parent mode" subtitle="Ask for a PIN when switching from a kid" value={requirePin} onValueChange={onToggle} />
          {requirePin && (
            <View style={{ marginHorizontal: 16, marginBottom: 16, gap: 12, borderTopWidth: 1, borderTopColor: '#F0EEE8', paddingTop: 16 }}>
              <FormField label="Parent PIN" value={pin} onChangeText={(v) => { setPin(v.replace(/[^0-9]/g, '').slice(0, 6)); setSaved(false); }} placeholder="Enter a 4–6 digit PIN" keyboardType="number-pad" secureTextEntry />
              <Button label={saved ? 'PIN saved ✓' : 'Save PIN'} onPress={onSave} disabled={pin.length < 4 || saved} />
            </View>
          )}
          <AccountToggleRow title="Share anonymous usage data" subtitle="Help improve Monstir" value={shareUsage} onValueChange={setShareUsage} divider />
        </View>

        <TouchableOpacity style={[ps.logoutBtn, { marginHorizontal: 0 }]} activeOpacity={0.8} onPress={onBack}>
          <Text style={ps.logoutText}>Delete account</Text>
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
  iconKey: string; // stable key into GOAL_ICONS — this is what gets persisted
  icon: number;    // resolved ImageRequireSource for rendering (derived from iconKey)
}

interface SavedGoal {
  id: string;
  name: string;
  amount: string;     // target in dollars e.g. "25.00"
  category: string;
  color: string;
  iconKey: string;    // stable key into GOAL_ICONS — persisted; survives asset changes
  icon: number;       // resolved ImageRequireSource for rendering (derived from iconKey)
  savedCents: number; // how much has been saved so far
  milestones: string[];   // 4 reward labels e.g. ['Helmet', 'Trick Unlocked', 'Glow Board', 'Celebration!']
  activityFeed: { label: string; pts: number; when: string }[];  // recent progress items
}


// Goal icons are referenced by a stable string KEY, never by the raw require()
// module id. Those numeric ids shift whenever assets are added/removed/reordered,
// which would silently repoint saved goals at the wrong image (e.g. a trophy).
// goalIconSource() resolves a key → image source at render time.
const GOAL_ICONS: Record<string, number> = {
  ps5:        require('./assets/icons/goalIcons/Ps5.png'),
  switch:     require('./assets/icons/goalIcons/Switch.png'),
  roblox:     require('./assets/icons/goalIcons/Roblox.png'),
  bike:       require('./assets/icons/goalIcons/Bike.png'),
  headphones: require('./assets/icons/goalIcons/Headset.png'),
  scooter:    require('./assets/icons/goalIcons/Scooter.png'),
  tv:         require('./assets/icons/goalIcons/TV.png'),
  shoes:      require('./assets/icons/goalIcons/Shoes.png'),
  lego:       require('./assets/icons/goalIcons/Legp.png'),
  plushie:    require('./assets/icons/goalIcons/Plushie.png'),
  pet:        require('./assets/icons/goalIcons/Animal.png'),
  pizza:      require('./assets/icons/goalIcons/Pizza.png'),
  movie:      require('./assets/icons/goalIcons/Movie.png'),
  sleepover:  require('./assets/icons/goalIcons/Sleepover.png'),
  icecream:   require('./assets/icons/goalIcons/Ice Ceam Party.png'),
  money:      require('./assets/icons/goalIcons/Money.png'),
};
const DEFAULT_GOAL_ICON_KEY = 'money';
function goalIconSource(key?: string): number {
  return (key && GOAL_ICONS[key]) || GOAL_ICONS[DEFAULT_GOAL_ICON_KEY];
}

const GOAL_OPTIONS: { key: string; name: string; amount: string }[] = [
  { key: 'ps5',        name: 'PS5',              amount: '499.99' },
  { key: 'switch',     name: 'Nintendo Switch',  amount: '299.99' },
  { key: 'roblox',     name: 'Roblox Gift Card', amount: '25.00'  },
  { key: 'bike',       name: 'New bike',         amount: '120.00' },
  { key: 'headphones', name: 'Headphones',       amount: '60.00'  },
  { key: 'scooter',    name: 'Scooter',          amount: '80.00'  },
  { key: 'tv',         name: 'New TV',           amount: '200.00' },
  { key: 'shoes',      name: 'New shoes',        amount: '70.00'  },
  { key: 'lego',       name: 'Lego set',         amount: '50.00'  },
  { key: 'plushie',    name: 'Stuffed animal',   amount: '30.00'  },
  { key: 'pet',        name: 'Adopt a pet',      amount: '100.00' },
  { key: 'pizza',      name: 'Pizza party',      amount: '25.00'  },
  { key: 'movie',      name: 'Movie night',      amount: '15.00'  },
  { key: 'sleepover',  name: 'Sleepover party',  amount: '40.00'  },
  { key: 'icecream',   name: 'Ice cream party',  amount: '20.00'  },
  { key: 'money',      name: 'Custom goal',      amount: ''       },
];

// Recover an icon key for a goal saved before the key scheme (match by name).
function inferGoalIconKey(name: string): string {
  return GOAL_OPTIONS.find(o => o.name === name)?.key ?? DEFAULT_GOAL_ICON_KEY;
}

// Repair a persisted goal: ensure it has an iconKey and a live `icon` source.
// Fixes goals whose stored numeric icon id went stale after an asset change.
function normalizeGoalIcon(g: SavedGoal): SavedGoal {
  const iconKey = g.iconKey ?? inferGoalIconKey(g.name);
  return { ...g, iconKey, icon: goalIconSource(iconKey) };
}

function GoalCreationFlow({ onDone, onCancel, onGoalCreated, onDeleteGoal, savedCents, initialData, monsterName }: GoalCreationFlowProps) {
  // When editing an existing goal, jump straight to details (step 2)
  const [step, setStep]           = useState<number>(initialData ? 2 : 1);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const [goalData, setGoalData] = useState<GoalData>({
    name:     initialData?.name     ?? '',
    amount:   initialData?.amount   ?? '',
    category: initialData?.category ?? '',
    color:    '#6B35F0',
    iconKey:  initialData?.iconKey  ?? DEFAULT_GOAL_ICON_KEY,
    icon:     goalIconSource(initialData?.iconKey ?? DEFAULT_GOAL_ICON_KEY),
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
    setGoalData(prev => ({ ...prev, name: autoName, amount: opt.amount, iconKey: opt.key, icon: goalIconSource(opt.key) }));
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
                <Text style={{ fontSize: scale(12), color: '#767676' }}>✕</Text>
              </TouchableOpacity>
            )}
          </View>

          <ScrollView showsVerticalScrollIndicator={false} style={{ flex: 1 }}>
            <View style={{ gap: 12, paddingTop: 4, paddingBottom: 32 }}>
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
                      <Image source={goalIconSource(opt.key)} style={{ width: scale(36), height: scale(36) }} resizeMode="contain" />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={s.gfGoalName}>{opt.name}</Text>
                      <Text style={s.gfGoalPrice}>
                        {opt.amount ? `$${opt.amount}` : 'Set your own amount'}
                      </Text>
                    </View>
                    <Text style={{ fontSize: scale(18), color: '#767676' }}>›</Text>
                  </TouchableOpacity>
                );
              })}
              {filteredOptions.length === 0 && (
                <View style={{ alignItems: 'center', paddingVertical: 32 }}>
                  <Text style={{ fontSize: scale(44) }}>🤔</Text>
                  <Text style={{ fontSize: scale(12), color: '#767676', marginTop: 8 }}>No results for "{search}"</Text>
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
                  <Text style={{ color: '#767676', marginTop: 8, fontSize: scale(12) }}>Photo preview</Text>
                </View>
                <TouchableOpacity style={s.gfPhotoRemove} onPress={() => setPhotoAdded(false)} activeOpacity={0.7}>
                  <Text style={s.gfPhotoRemoveText}>✕</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <View style={{ flexDirection: 'row', gap: 12, marginTop: 8 }}>
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
                <Text style={{ fontSize: scale(16), color: '#4A4A4A', lineHeight: scale(22) }}>
                  {`Your progress ($${((savedCents ?? 0) / 100).toFixed(2)} saved) will stay in your balance. This can't be undone.`}
                </Text>
              ) : (
                <Text style={{ fontSize: scale(16), color: '#4A4A4A', lineHeight: scale(22) }}>
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

// MON-85 re-skin: children-first carousel matching the HTML prototype. Welcome
// intro → 3 story slides (chores → allowance+XP → Sunday boss). Mock cards +
// dot-grid bg + staggered entrance. Sign-in untouched downstream (MON-54).
const OB_SLIDES = [
  {
    title: 'Chores are\nthe whole game',
    sub: "Set up real chores and what they're worth. Every one a kid finishes is a step toward Sunday's boss battle. Chores are the only way there.",
  },
  {
    title: 'Earn real\nallowance + XP',
    sub: "Approved chores add real money to a kid's ledger and XP to their Monstir. Monstir tracks every cent, and you just pay out what the app says.",
  },
  {
    title: 'The Sunday\nboss battle',
    sub: 'A week of chores powers up the family for one shared Sunday showdown. Co-op, never kid-vs-kid. Everybody fights the boss together.',
  },
] as const;

function ObSlideCard({ index }: { index: number }) {
  if (index === 0) {
    return (
      <View style={obf.pillCard}>
        <Text style={{ fontSize: scale(28) }}>🧹</Text>
        <View style={{ flex: 1 }}>
          <Text style={obf.pillTtl}>Vacuum</Text>
          <Text style={obf.pillMeta}>+15 XP · 💰 $1.50</Text>
        </View>
        <Tag label="Done!" />
      </View>
    );
  }
  if (index === 1) {
    return (
      <View style={obf.card}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <View>
            <Text style={obf.metaMono}>EMMA'S WALLET</Text>
            <Text style={[obf.bigNum, { color: obc.purple }]}>$8.50</Text>
          </View>
          <View style={{ alignItems: 'flex-end' }}>
            <Text style={obf.metaMono}>MONSTIR XP</Text>
            <Text style={obf.bigNum}>Lvl 3 · 245</Text>
          </View>
        </View>
      </View>
    );
  }
  return (
    <View style={[obf.card, { backgroundColor: obc.purple, alignItems: 'center', borderColor: obc.ink }]}>
      <Text style={{ fontSize: scale(44) }}>👾</Text>
      <Text style={{ fontFamily: obc.display, fontSize: scale(18), color: '#fff', marginTop: 4 }}>Sunday: Dishocalypse</Text>
      <Text style={{ fontFamily: obc.mono, fontSize: scale(12), color: 'rgba(255,255,255,0.85)', marginTop: 4 }}>Family vs. Boss · 4 fighters ready</Text>
    </View>
  );
}

function OnboardingFlow({ onReady }: OnboardingFlowProps) {
  const [step, setStep] = useState<number>(0);

  // Step 0 — Welcome intro
  if (step === 0) {
    return (
      <DotGridBg>
        <SafeAreaView style={obf.safe}>
          <ScreenEnter>
            <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
              <Rise pop>
                <Image source={require('./assets/monstirLogo.png')} style={{ width: 220, height: 82 }} resizeMode="contain" />
              </Rise>
              <Rise delay={120}>
                <Text style={[obText.title, { textAlign: 'center', marginTop: scale(20) }]}>Chores worth{'\n'}showing up for.</Text>
              </Rise>
              <Rise delay={220}>
                <Text style={[obText.sub, { textAlign: 'center', marginTop: scale(10) }]}>Real allowance, Monstirs that grow, and a Sunday boss battle the whole family fights together.</Text>
              </Rise>
            </View>
            <ObButton label="Get started" onPress={() => setStep(1)} />
          </ScreenEnter>
        </SafeAreaView>
      </DotGridBg>
    );
  }

  // Steps 1–3 — story carousel
  const idx = step - 1;
  const slide = OB_SLIDES[idx];
  const last = step === 3;
  return (
    <DotGridBg>
      <SafeAreaView style={obf.safe}>
        <ScreenEnter key={step}>
          <View style={obf.topRow}>
            <View />
            <TouchableOpacity onPress={onReady} activeOpacity={0.7} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
              <Text style={obf.skip}>Skip</Text>
            </TouchableOpacity>
          </View>

          <Rise pop>
            <ObSlideCard index={idx} />
          </Rise>

          <View style={{ flex: 1 }} />

          <Rise delay={150}><Text style={obText.title}>{slide.title}</Text></Rise>
          <Rise delay={250}><Text style={[obText.sub, { marginTop: 12 }]}>{slide.sub}</Text></Rise>
          <Rise delay={330}><ObStepDots step={step} total={3} style={{ marginTop: 16 }} /></Rise>
          <ObButton label={last ? "Let's set it up" : 'Next'} onPress={() => (last ? onReady() : setStep(step + 1))} />
        </ScreenEnter>
      </SafeAreaView>
    </DotGridBg>
  );
}

const obf = StyleSheet.create({
  safe:    { flex: 1, paddingHorizontal: 24, paddingTop: 8, paddingBottom: 8 },
  topRow:  { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', minHeight: 30, marginBottom: 8 },
  skip:    { fontFamily: obc.display, fontSize: scale(18), color: '#9A93AC' },
  card:    { backgroundColor: '#fff', borderWidth: 3, borderColor: obc.ink, borderRadius: obc.radius, padding: 16, ...cardShadow },
  pillCard:{ flexDirection: 'row', alignItems: 'center', gap: 16, backgroundColor: '#fff', borderWidth: 3, borderColor: obc.ink, borderRadius: obc.radius, padding: 16, ...cardShadow },
  pillTtl: { fontFamily: obc.display, fontSize: scale(18), color: obc.ink },
  pillMeta:{ fontFamily: obc.mono, fontSize: scale(12), color: obc.muted, marginTop: 4 },
  metaMono:{ fontFamily: obc.mono, fontSize: scale(12), color: obc.muted },
  bigNum:  { fontFamily: obc.display, fontSize: scale(22), color: obc.ink, marginTop: 4 },
});

// ─── Role selector (MON-85) ─────────────────────────────────────────────────
// Pre-auth "Who's using Monstir?" gate. Parent → existing sign-in (MON-54).
// Kid → device pairing. NOTE: this revives a pre-auth user-type selector that
// MON-54 deliberately omitted; it's part of the two-device direction and pairs
// with the Phase-2 kid-device auth work (see MON-54 / MON-63).
function RoleSelectScreen({ onParent, onKid }: { onParent: () => void; onKid: () => void }) {
  return (
    <DotGridBg>
      <SafeAreaView style={obf.safe}>
        <ScreenEnter>
          <View style={{ flex: 1 }} />
          <View style={{ alignItems: 'center' }}>
            <Image source={require('./assets/monstirLogo.png')} style={{ width: 200, height: 74 }} resizeMode="contain" />
            <Text style={[obText.title, { textAlign: 'center', marginTop: scale(14) }]}>Welcome to Monstir!</Text>
            <Text style={[obText.sub, { textAlign: 'center', marginTop: scale(4) }]}>Who's setting up?</Text>
          </View>
          <View style={{ height: 28 }} />
          <Rise delay={80}>
            <TouchableOpacity style={rs.role} activeOpacity={0.85} onPress={onParent}>
              <View style={[rs.roleIc, { backgroundColor: obc.purple }]}><Text style={{ fontSize: scale(28) }}>🧑</Text></View>
              <View style={{ flex: 1 }}>
                <Text style={rs.roleTitle}>I'm a parent</Text>
                <Text style={rs.roleDesc}>Create chores & run the ledger</Text>
              </View>
            </TouchableOpacity>
          </Rise>
          <Rise delay={160}>
            <TouchableOpacity style={rs.role} activeOpacity={0.85} onPress={onKid}>
              <View style={[rs.roleIc, { backgroundColor: obc.lime }]}><Text style={{ fontSize: scale(28) }}>🙂</Text></View>
              <View style={{ flex: 1 }}>
                <Text style={rs.roleTitle}>I'm a kid</Text>
                <Text style={rs.roleDesc}>Do chores & grow my Monstir</Text>
              </View>
            </TouchableOpacity>
          </Rise>
          <View style={{ flex: 1 }} />
        </ScreenEnter>
      </SafeAreaView>
    </DotGridBg>
  );
}

// ─── Kid device pairing (MON-85) ─────────────────────────────────────────────
// PHASE 1 SCAFFOLD ONLY: code entry is not validated against any backend (kid
// devices aren't authenticated clients yet). Submitting previews the kid setup
// (monster carousel → name). Real code minting/validation + kid-device auth +
// RLS is the Phase-2 backend ticket.
function KidPairingScreen({ onSubmit, onBack }: { onSubmit: (code: string) => void; onBack: () => void }) {
  const [code, setCode] = useState('');
  const press = (d: string) => {
    if (code.length >= 6) return;
    const next = code + d;
    setCode(next);
    // Auto-advance into the preview once 6 digits are in (prototype behavior).
    if (next.length === 6) setTimeout(() => onSubmit(next), 260);
  };
  const del = () => setCode(c => c.slice(0, -1));
  return (
    <DotGridBg>
      <SafeAreaView style={obf.safe}>
        <ScreenEnter>
          <View style={obf.topRow}>
            <TouchableOpacity onPress={onBack} activeOpacity={0.7} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
              <Text style={rs.back}>‹</Text>
            </TouchableOpacity>
            <InfoDot />
          </View>
          <Text style={{ textAlign: 'center', fontSize: scale(44), marginTop: 8 }}>🔗</Text>
          <Text style={[obText.titleSm, { textAlign: 'center', marginTop: 4 }]}>Enter your{'\n'}pairing code</Text>
          <Text style={[obText.sub, { textAlign: 'center', marginTop: 8 }]}>Ask a parent for the 6-digit code from their app.</Text>
          <CodeCells code={code} />
          <View style={{ flex: 1 }} />
          <Keypad onKey={press} onDelete={del} />
          <Text style={rs.note}>Pairing isn't connected yet. This previews your Monstir setup.</Text>
        </ScreenEnter>
      </SafeAreaView>
    </DotGridBg>
  );
}

const rs = StyleSheet.create({
  role:      { flexDirection: 'row', alignItems: 'center', gap: 16, backgroundColor: '#fff', borderWidth: 3, borderColor: obc.ink, borderRadius: obc.radius, padding: 16, marginBottom: 16, ...cardShadow },
  roleIc:    { width: 60, height: 60, borderWidth: 2, borderColor: obc.ink, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  roleTitle: { fontFamily: obc.display, fontSize: scale(22), color: obc.ink },
  roleDesc:  { fontFamily: obc.body, fontSize: scale(12), color: obc.muted, marginTop: 4 },
  back:      { fontFamily: obc.display, fontSize: scale(28), color: obc.ink, lineHeight: scale(32), paddingHorizontal: 4 },
  note:      { fontFamily: obc.bodySemi, fontSize: scale(12), color: obc.muted, textAlign: 'center', marginTop: 16 },
});

// ─── Landing Screen ───────────────────────────────────────────────────────────

// ─── Social auth button (MON-54) ───────────────────────────────────────────────
// Standard Monstir button treatment (3px ink border, 18px radius, 0px 6px 0px
// solid shadow). Apple + Google must be displayed at equal prominence/size per
// App Store Guideline 4.8. Until the console setup + client IDs land (see
// socialAuth.ts), `disabled` is set and these render as inert "coming soon"
// placeholders; once configured they become real pressable sign-in buttons.
function SocialAuthButton({ provider, disabled, loading, onPress }: {
  provider: 'apple' | 'google';
  disabled?: boolean;
  loading?: boolean;
  onPress?: () => void;
}) {
  const isApple = provider === 'apple';
  const inner = (
    <>
      {loading ? (
        <ActivityIndicator color={isApple ? '#FFFFFF' : '#1A1A1A'} />
      ) : (
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 12 }}>
          {isApple
            ? (
              // White Apple mark as SVG — the U+F8FF glyph ignores `color` on iOS
              // and renders dark, invisible on the Deep Ink button.
              <Svg width={scale(18)} height={scale(21)} viewBox="0 0 24 24" style={{ marginTop: -2 }}>
                <Path fill="#FFFFFF" d="M12.152 6.896c-.948 0-2.415-1.078-3.96-1.04-2.04.027-3.91 1.183-4.961 3.014-2.117 3.675-.546 9.103 1.519 12.09 1.013 1.454 2.208 3.09 3.792 3.039 1.52-.065 2.09-.987 3.935-.987 1.831 0 2.35.987 3.96.948 1.637-.026 2.676-1.48 3.676-2.948 1.156-1.688 1.636-3.325 1.662-3.415-.039-.013-3.182-1.221-3.22-4.857-.026-3.04 2.48-4.494 2.597-4.559-1.429-2.09-3.623-2.324-4.39-2.376-2-.156-3.675 1.09-4.61 1.09zM15.53 3.83c.843-1.012 1.4-2.427 1.245-3.83-1.207.052-2.662.805-3.532 1.818-.78.896-1.454 2.338-1.273 3.714 1.338.104 2.715-.688 3.559-1.701" />
              </Svg>
            )
            : <Text style={{ fontSize: scale(18), color: '#4285F4', fontFamily: 'Inter_900Black' }}>G</Text>}
          <Text style={[socialBtn.label, { color: isApple ? '#FFFFFF' : '#1A1A1A' }]}>
            Sign in with {isApple ? 'Apple' : 'Google'}
          </Text>
        </View>
      )}
      {disabled && (
        <View style={socialBtn.soonPill}>
          <Text style={socialBtn.soonText}>Coming soon</Text>
        </View>
      )}
    </>
  );

  const style = [socialBtn.base, isApple ? socialBtn.apple : socialBtn.google, disabled && { opacity: 0.55 }];

  // Placeholder (not configured) → non-interactive View.
  if (disabled || !onPress) return <View style={style}>{inner}</View>;

  return (
    <TouchableOpacity style={style} activeOpacity={0.85} onPress={onPress} disabled={loading}>
      {inner}
    </TouchableOpacity>
  );
}

// Dev-only quick login: skips the OAuth dance (painful on the simulator) by
// signing straight in with a dedicated email+password test account from env.
// Both vars must be set AND __DEV__ true for the button to render — it never
// ships in a release build. Point these at a real password account; an
// OAuth-only address (no password) will just error.
const DEV_LOGIN_EMAIL    = process.env.EXPO_PUBLIC_DEV_EMAIL ?? '';
const DEV_LOGIN_PASSWORD = process.env.EXPO_PUBLIC_DEV_PASSWORD ?? '';

// Screen 2 (MON-54): social-first sign-in/sign-up. Styling is final — Slime Lime
// background + Monstir logo at top are kept; only contents/behavior change here.
function LandingScreen({ onEmailPath, onSocialSuccess, onDevSuccess }: {
  onEmailPath: () => void;
  onSocialSuccess: (user: SocialUser) => void;
  onDevSuccess?: () => void;
}) {
  // On iOS, Apple is listed first per platform convention; Google leads elsewhere.
  const appleFirst = Platform.OS === 'ios';
  const [busy, setBusy]   = useState<'apple' | 'google' | null>(null);
  const [devBusy, setDevBusy] = useState(false);
  const [error, setError] = useState('');

  const handleDevLogin = async () => {
    if (devBusy) return;
    setError('');
    setDevBusy(true);
    const { error: authError } = await supabase.auth.signInWithPassword({
      email: canonicalizeEmail(DEV_LOGIN_EMAIL),
      password: DEV_LOGIN_PASSWORD,
    });
    setDevBusy(false);
    if (authError) { setError(`Dev login failed: ${authError.message}`); return; }
    onDevSuccess?.();
  };
  // Apple availability is re-checked at runtime (device/OS support); the button is
  // hidden if the SDK reports it unavailable so we never show a dead control.
  const [appleAvailable, setAppleAvailable] = useState(false);
  useEffect(() => { isAppleSignInAvailable().then(setAppleAvailable); }, []);

  const handleSocial = async (provider: 'apple' | 'google') => {
    if (busy) return;
    setError('');
    setBusy(provider);
    const result = provider === 'apple' ? await signInWithApple() : await signInWithGoogle();
    setBusy(null);
    if (result.ok) { onSocialSuccess(result.user); return; }
    // Cancelled → return to this screen silently (no toast), per ticket edge cases.
    if (result.cancelled) return;
    setError(result.message ?? 'Sign-in failed. Please try again.');
  };

  // Render a provider button: real + pressable when configured, else "coming soon".
  const renderProvider = (provider: 'apple' | 'google') => {
    // Apple sign-in is iOS-only — never render the Apple row on other platforms
    // (no disabled "coming soon" placeholder on Android/web).
    if (provider === 'apple' && Platform.OS !== 'ios') return null;
    if (!socialAuthEnabled) return <SocialAuthButton key={provider} provider={provider} disabled />;
    // Apple configured but unavailable on this device → fall back to placeholder.
    if (provider === 'apple' && !appleAvailable) return <SocialAuthButton key={provider} provider="apple" disabled />;
    if (provider === 'google' && !googleEnabled) return <SocialAuthButton key={provider} provider="google" disabled />;
    return (
      <SocialAuthButton
        key={provider}
        provider={provider}
        loading={busy === provider}
        onPress={() => handleSocial(provider)}
      />
    );
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
      <Text style={{ position: 'absolute', top: 108, right: 44, fontSize: scale(22), color: '#6B35F0'             }}>✦</Text>
      <View style={{ position: 'absolute', top: 198, right: 28, width: 6, height: 6, borderRadius: 3, backgroundColor: '#1A1A1A' }} />
      <View style={{ position: 'absolute', top: 172, left: 118, width: 7, height: 7, borderRadius: 4, backgroundColor: '#FF6B2B' }} />
      <Text style={{ position: 'absolute', bottom: 168, right: 28, fontSize: scale(22), color: '#F5C518'          }}>✦</Text>
      <View style={{ position: 'absolute', bottom: 210, right: 76, width: 5, height: 5, borderRadius: 3, backgroundColor: '#1A1A1A' }} />

      {/* ── Main content ── */}
      <View style={{ flex: 1, paddingHorizontal: 28, justifyContent: 'center', alignItems: 'center', paddingBottom: 80 }}>

        <Image source={require('./assets/monstirLogo.png')} style={{ width: 280, height: 103, marginBottom: 36 }} resizeMode="contain" />

        <Text style={{ fontSize: scale(28), fontFamily: 'FredokaOne_400Regular', color: '#1A1A1A', textAlign: 'center', marginBottom: 8 }}>Sign in to continue</Text>
        <Text style={{ fontSize: scale(16), fontFamily: 'Nunito_600SemiBold', color: '#4A4A4A', textAlign: 'center', marginBottom: 32 }}>So your family's monsters are always safe.</Text>

        {/* Social providers — equal prominence, Apple first on iOS */}
        <View style={{ width: '100%', gap: 16 }}>
          {(appleFirst ? ['apple', 'google'] : ['google', 'apple']).map(p => renderProvider(p as 'apple' | 'google'))}
        </View>

        {/* Social sign-in error (cancellations stay silent) */}
        {!!error && (
          <Text style={{ fontSize: scale(12), color: '#B3261E', fontFamily: 'Nunito_700Bold', textAlign: 'center', marginTop: 16 }}>
            {error}
          </Text>
        )}

        {/* Email fallback — framed to steer Google/Apple holders to one-tap */}
        <TouchableOpacity onPress={onEmailPath} activeOpacity={0.7} style={{ marginTop: 28 }} hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}>
          <Text style={{ fontSize: scale(16), fontFamily: 'Nunito_700Bold', color: '#1A1A1A', textDecorationLine: 'underline' }}>
            I don't have a Google or Apple account
          </Text>
        </TouchableOpacity>

        {/* Dev-only: one-tap login with the env test account (never ships). */}
        {__DEV__ && !!DEV_LOGIN_EMAIL && (
          <TouchableOpacity
            onPress={handleDevLogin}
            disabled={devBusy}
            activeOpacity={0.7}
            style={{ marginTop: 24, backgroundColor: '#1A1A1A', borderRadius: 100, paddingHorizontal: 20, paddingVertical: 12, flexDirection: 'row', alignItems: 'center', gap: 8, opacity: devBusy ? 0.6 : 1 }}
          >
            {devBusy && <ActivityIndicator size="small" color="#C5F215" />}
            <Text style={{ fontSize: scale(12), fontFamily: 'Inter_700Bold', color: '#C5F215' }}>
              🛠 Dev login ({DEV_LOGIN_EMAIL})
            </Text>
          </TouchableOpacity>
        )}

      </View>
    </View>
  );
}

const socialBtn = StyleSheet.create({
  base: {
    width: '100%',
    borderRadius: 18,
    borderWidth: 3,
    borderColor: '#1A1A1A',
    paddingVertical: 16,
    alignItems: 'center',
    justifyContent: 'center',
    ...Platform.select({
      ios:     { shadowColor: '#1A1A1A', shadowOffset: { width: 0, height: 6 }, shadowOpacity: 1, shadowRadius: 0 },
      android: { elevation: 6 },
      default: {},
    }),
  },
  apple:  { backgroundColor: '#1A1A1A' },
  google: { backgroundColor: '#FFFFFF' },
  label:  { fontSize: scale(18), fontFamily: 'Inter_700Bold' },
  soonPill: { marginTop: 8, backgroundColor: 'rgba(0,0,0,0.08)', borderRadius: 100, paddingHorizontal: 12, paddingVertical: 4 },
  soonText: { fontSize: scale(12), fontFamily: 'Inter_600SemiBold', color: '#1A1A1A' },
});

// ─── Login Screen ─────────────────────────────────────────────────────────────

interface LoginScreenProps {
  onBack: () => void;
  onSuccess: () => void;
  onSignUp: () => void;
  onForgotPassword: () => void;
  onUnconfirmed: (email: string) => void;
}

function LoginScreen({ onBack, onSuccess, onSignUp, onForgotPassword, onUnconfirmed }: LoginScreenProps) {
  const [email, setEmail]               = useState('');
  const [password, setPassword]         = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError]               = useState('');
  const [loading, setLoading]           = useState(false);

  const handleLogin = async () => {
    // Dev shortcut: empty fields → skip auth
    if (!email.trim() && !password) { onSuccess(); return; }
    if (!email.trim() || !password) { setError('Please enter your email and password.'); return; }
    setError('');
    setLoading(true);
    const trimmed = canonicalizeEmail(email);
    const { error: authError } = await supabase.auth.signInWithPassword({ email: trimmed, password });
    setLoading(false);
    if (authError) {
      // Unconfirmed email → friendly check-your-email state, not a generic failure (MON-54).
      if (/email not confirmed/i.test(authError.message)) { onUnconfirmed(trimmed); return; }
      // OAuth-only accounts have no password, so signInWithPassword returns this same
      // generic "invalid credentials" error — steer the user to the social buttons
      // instead of leaving them stuck retrying a password that was never set (MON-54).
      if (/invalid login credentials/i.test(authError.message)) {
        setError('Incorrect email or password. If you signed up with Google or Apple, go back and use that button.');
        return;
      }
      setError(authError.message);
      return;
    }
    onSuccess();
  };

  const inputStyle = {
    width: '100%' as const,
    backgroundColor: '#FFFFFF',
    borderRadius: 100,
    borderWidth: 2,
    borderColor: '#1A1A1A',
    paddingHorizontal: 24,
    paddingVertical: 20,
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
      <Text style={{ position: 'absolute', top: 108, right: 44, fontSize: scale(22), color: '#6B35F0'             }}>✦</Text>
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
            <Text style={{ fontSize: scale(22), color: '#1A1A1A', fontFamily: 'Inter_900Black' }}>←</Text>
          </TouchableOpacity>

          {/* Logo */}
          <Image
            source={require('./assets/monstirLogo.png')}
            style={{ width: 280, height: 103, alignSelf: 'center', marginBottom: 32 }}
            resizeMode="contain"
          />

          {/* Heading */}
          <Text style={{ fontSize: scale(28), fontFamily: 'Inter_900Black', color: '#1A1A1A', textAlign: 'center', marginBottom: 8 }}>
            Welcome back!
          </Text>
          <Text style={{ fontSize: scale(16), color: '#4A4A4A', textAlign: 'center', marginBottom: 28 }}>
            Log in to your Monstir account.
          </Text>

          <View style={{ gap: 12 }}>
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
            <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFFFFF', borderRadius: 100, borderWidth: 2, borderColor: '#1A1A1A', paddingHorizontal: 24, paddingVertical: 20 }}>
              <TextInput
                style={{ flex: 1, fontSize: scale(16), color: '#1A1A1A' }}
                value={password}
                onChangeText={setPassword}
                placeholder="Password"
                placeholderTextColor="#C0BEB8"
                secureTextEntry={!showPassword}
                returnKeyType="done"
                onSubmitEditing={handleLogin}
              />
              <TouchableOpacity onPress={() => setShowPassword(v => !v)} activeOpacity={0.7} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                <Text style={{ fontSize: scale(16), color: '#767676' }}>{showPassword ? '🙈' : '👁'}</Text>
              </TouchableOpacity>
            </View>

            {/* Forgot password */}
            <TouchableOpacity style={{ alignSelf: 'flex-end' }} activeOpacity={0.7} onPress={onForgotPassword}>
              <Text style={{ fontSize: scale(12), color: '#6B35F0', fontFamily: 'Inter_700Bold' }}>Forgot password?</Text>
            </TouchableOpacity>

            {/* Validation error */}
            {!!error && (
              <Text style={{ fontSize: scale(12), color: '#E53935', textAlign: 'center', fontFamily: 'Inter_600SemiBold', marginTop: -4 }}>
                {error}
              </Text>
            )}

            {/* Log in button */}
            <Button label={loading ? 'Logging in…' : 'Log in'} onPress={handleLogin} style={{ marginTop: 8 }} />

            {/* Sign up link */}
            <Button label="Create an account" onPress={onSignUp} variant="secondary" />
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

// ─── Sign Up Screen ───────────────────────────────────────────────────────────

interface SessionUser { name: string; email: string; }

interface SignupScreenProps {
  onBack: () => void;
  onSuccess: (user: SessionUser) => void;
  onLogin: () => void;
  /** Confirmation required → signUp returned a null session; route to Check Your Email (MON-54). */
  onConfirmPending: (user: SessionUser) => void;
  initialName?: string;
  initialEmail?: string;
}

function SignupScreen({ onBack, onSuccess, onLogin, onConfirmPending, initialName = '', initialEmail = '' }: SignupScreenProps) {
  const [name, setName]                       = useState(initialName);
  const [email, setEmail]                     = useState(initialEmail);
  const [password, setPassword]               = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword]       = useState(false);
  const [showConfirm, setShowConfirm]         = useState(false);
  const [error, setError]                     = useState('');

  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
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
    setLoading(true);
    const cleanEmail = canonicalizeEmail(email);
    const cleanName  = name.trim();
    const { data, error: authError } = await supabase.auth.signUp({
      email: cleanEmail,
      password,
      options: { data: { name: cleanName } },
    });
    setLoading(false);
    if (authError) { setError(authError.message); return; }
    // Supabase enumeration protection: signing up with an already-registered email
    // returns an obfuscated user with an EMPTY identities array and sends NO email.
    // Detect it so returning Google/Apple users aren't stranded on "Check Your Email"
    // waiting for a confirmation that never arrives (MON-54).
    if (data.user && Array.isArray(data.user.identities) && data.user.identities.length === 0) {
      setError('This email already has an account. Go back and sign in with Google or Apple instead.');
      return;
    }
    // With email confirmation on, signUp returns a null session — never enter the
    // app shell pre-confirmation. Route to Check Your Email instead (MON-54).
    if (!data.session) { onConfirmPending({ name: cleanName, email: cleanEmail }); return; }
    onSuccess({ name: cleanName, email: cleanEmail });
  };

  const inputStyle = {
    width: '100%' as const,
    backgroundColor: '#FFFFFF',
    borderRadius: 100,
    borderWidth: 2,
    borderColor: '#1A1A1A',
    paddingHorizontal: 24,
    paddingVertical: 20,
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
      <Text style={{ position: 'absolute', top: 108, right: 44, fontSize: scale(22), color: '#6B35F0'             }}>✦</Text>
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
            <Text style={{ fontSize: scale(22), color: '#1A1A1A', fontFamily: 'Inter_900Black' }}>←</Text>
          </TouchableOpacity>

          {/* Logo */}
          <Image
            source={require('./assets/monstirLogo.png')}
            style={{ width: 280, height: 103, alignSelf: 'center', marginBottom: 32 }}
            resizeMode="contain"
          />

          {/* Heading */}
          <Text style={{ fontSize: scale(28), fontFamily: 'Inter_900Black', color: '#1A1A1A', textAlign: 'center', marginBottom: 8 }}>
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
            <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFFFFF', borderRadius: 100, borderWidth: 2, borderColor: '#1A1A1A', paddingHorizontal: 24, paddingVertical: 20 }}>
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
                <Text style={{ fontSize: scale(16), color: '#767676' }}>{showPassword ? '🙈' : '👁'}</Text>
              </TouchableOpacity>
            </View>

            {/* Confirm password */}
            <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFFFFF', borderRadius: 100, borderWidth: 2, borderColor: '#1A1A1A', paddingHorizontal: 24, paddingVertical: 20 }}>
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
                <Text style={{ fontSize: scale(16), color: '#767676' }}>{showConfirm ? '🙈' : '👁'}</Text>
              </TouchableOpacity>
            </View>

            {/* Validation error */}
            {!!error && (
              <Text style={{ fontSize: scale(12), color: '#E53935', textAlign: 'center', fontFamily: 'Inter_600SemiBold', marginTop: -4 }}>
                {error}
              </Text>
            )}

            {/* Create account button */}
            <Button label={loading ? 'Creating account…' : 'Create an account'} onPress={handleSubmit} style={{ marginTop: 8 }} />

            {/* Log in link */}
            <Button label="Log in" onPress={onLogin} variant="secondary" />
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

// ─── Check Your Email (MON-54) ──────────────────────────────────────────────────
// Reused by both the email-signup confirmation flow and the forgot-password flow
// via the `mode` prop. Empty-state tone is anticipation, not limbo.
function CheckEmailScreen({ email, mode, onBack }: {
  email: string;
  mode: 'confirm' | 'reset';
  onBack: () => void;
}) {
  const [cooldown, setCooldown] = useState(0);
  const [status, setStatus]     = useState('');
  const [sending, setSending]   = useState(false);

  useEffect(() => {
    if (cooldown <= 0) return;
    const t = setTimeout(() => setCooldown(c => c - 1), 1000);
    return () => clearTimeout(t);
  }, [cooldown]);

  const handleResend = async () => {
    if (cooldown > 0 || sending) return;
    setStatus('');
    setSending(true);
    const { error } = mode === 'confirm'
      ? await supabase.auth.resend({ type: 'signup', email })
      : await supabase.auth.resetPasswordForEmail(email, { redirectTo: RESET_PASSWORD_REDIRECT });
    setSending(false);
    if (error) { setStatus(error.message); return; }
    setStatus('Sent! Check your inbox.');
    setCooldown(30);   // throttle resends to prevent spam
  };

  const body = mode === 'confirm'
    ? `We sent a confirmation link to ${email}. Tap it to verify your account, then come back and log in.`
    : `If an account exists for ${email}, we've sent a link to reset your password. Open it to choose a new one.`;

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
      <Text style={{ position: 'absolute', top: 108, right: 44, fontSize: scale(22), color: '#6B35F0'             }}>✦</Text>
      <View style={{ position: 'absolute', top: 198, right: 28, width: 6, height: 6, borderRadius: 3, backgroundColor: '#1A1A1A' }} />
      <View style={{ position: 'absolute', top: 172, left: 118, width: 7, height: 7, borderRadius: 4, backgroundColor: '#FF6B2B' }} />
      <Text style={{ position: 'absolute', bottom: 168, right: 28, fontSize: scale(22), color: '#F5C518'          }}>✦</Text>
      <View style={{ position: 'absolute', bottom: 210, right: 76, width: 5, height: 5, borderRadius: 3, backgroundColor: '#1A1A1A' }} />

      <ScrollView
        contentContainerStyle={{ flexGrow: 1, paddingHorizontal: 28, paddingTop: 56, paddingBottom: 120 }}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* Back button */}
        <TouchableOpacity onPress={onBack} activeOpacity={0.7} style={{ marginBottom: 16, alignSelf: 'flex-start' }}>
          <Text style={{ fontSize: scale(22), color: '#1A1A1A', fontFamily: 'Inter_900Black' }}>←</Text>
        </TouchableOpacity>

        <View style={{ alignItems: 'center', marginTop: 24 }}>
          <Text style={{ fontSize: scale(72), marginBottom: 16 }}>📬</Text>
          <Text style={{ fontSize: scale(28), fontFamily: 'Inter_900Black', color: '#1A1A1A', textAlign: 'center', marginBottom: 8 }}>Check your email!</Text>
          <Text style={{ fontSize: scale(16), color: '#4A4A4A', textAlign: 'center', marginTop: 4, lineHeight: scale(22) }}>{body}</Text>
        </View>

        <View style={{ gap: 16, marginTop: 32 }}>
          {!!status && (
            <Text style={{ textAlign: 'center', fontSize: scale(12), fontFamily: 'Inter_600SemiBold', color: status.startsWith('Sent') ? '#1A6B1A' : '#E53935' }}>
              {status}
            </Text>
          )}

          <Button
            label={cooldown > 0 ? `Resend in ${cooldown}s` : sending ? 'Sending…' : 'Resend email'}
            onPress={handleResend}
            disabled={cooldown > 0 || sending}
          />

          <TouchableOpacity onPress={onBack} activeOpacity={0.7} style={{ alignSelf: 'center', marginTop: 4 }} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
            <Text style={{ fontSize: scale(12), color: '#6B35F0', fontFamily: 'Inter_700Bold' }}>
              {mode === 'confirm' ? 'Wrong email? Go back' : 'Back to log in'}
            </Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </View>
  );
}

// ─── Forgot Password — in-app request screen (MON-54) ────────────────────────────
function ForgotPasswordScreen({ onBack, onSent }: { onBack: () => void; onSent: (email: string) => void }) {
  const [email, setEmail]     = useState('');
  const [error, setError]     = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    if (!email.trim()) { setError('Please enter your email.'); return; }
    setError('');
    setLoading(true);
    const trimmed = canonicalizeEmail(email);
    // Neutral outcome regardless of whether an account/password identity exists —
    // don't reveal which providers an email uses (MON-54 edge cases).
    const { error: authError } = await supabase.auth.resetPasswordForEmail(trimmed, { redirectTo: RESET_PASSWORD_REDIRECT });
    setLoading(false);
    if (authError) { setError(authError.message); return; }
    onSent(trimmed);
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
      <Text style={{ position: 'absolute', top: 108, right: 44, fontSize: scale(22), color: '#6B35F0'             }}>✦</Text>
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
            <Text style={{ fontSize: scale(22), color: '#1A1A1A', fontFamily: 'Inter_900Black' }}>←</Text>
          </TouchableOpacity>

          {/* Logo */}
          <Image
            source={require('./assets/monstirLogo.png')}
            style={{ width: 280, height: 103, alignSelf: 'center', marginBottom: 32 }}
            resizeMode="contain"
          />

          {/* Heading */}
          <Text style={{ fontSize: scale(28), fontFamily: 'Inter_900Black', color: '#1A1A1A', textAlign: 'center', marginBottom: 8 }}>
            Forgot password?
          </Text>
          <Text style={{ fontSize: scale(16), color: '#4A4A4A', textAlign: 'center', marginBottom: 28 }}>
            Enter your email and we'll send you a link to reset it.
          </Text>

          <View style={{ gap: 12 }}>
            {/* Email */}
            <TextInput
              style={{ width: '100%', backgroundColor: '#FFFFFF', borderRadius: 100, borderWidth: 2, borderColor: '#1A1A1A', paddingHorizontal: 24, paddingVertical: 20, fontSize: scale(16), color: '#1A1A1A' }}
              value={email}
              onChangeText={setEmail}
              placeholder="Email"
              placeholderTextColor="#C0BEB8"
              keyboardType="email-address"
              autoCapitalize="none"
              returnKeyType="done"
              onSubmitEditing={handleSubmit}
            />

            {/* Validation error */}
            {!!error && (
              <Text style={{ fontSize: scale(12), color: '#E53935', textAlign: 'center', fontFamily: 'Inter_600SemiBold', marginTop: -4 }}>
                {error}
              </Text>
            )}

            <Button label={loading ? 'Sending…' : 'Send reset link'} onPress={handleSubmit} style={{ marginTop: 8 }} />
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

// ─── Root ─────────────────────────────────────────────────────────────────────

type AppMode = 'splash' | 'onboarding' | 'roleSelect' | 'kidPairing' | 'landing' | 'login' | 'signup' | 'checkEmail' | 'forgotPassword' | 'parentOnboarding' | 'kidWelcome' | 'kidProfile' | 'app';

// Marketing-site page that receives the Supabase recovery token (MON-54).
const RESET_PASSWORD_REDIRECT = 'https://monstirapp.com/reset-password';

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

/** A co-op chest owed to a kid because the family finished off a boss this kid
 *  had already worn down (escaped) earlier in the cycle. Carries everything the
 *  reveal + trophy need so it can be shown the next time they open their profile
 *  (the other kids aren't at the device when the bar empties). */
interface PendingCoopChest {
  bossName:      string;
  weakness:      string;
  threat:        string;
  completionPct: number;
  xpEarned:      number;
  coinsEarned:   number;
}

interface KidMonsterState {
  monsterIdx: MonsterIdx;
  selectedMonsterId: MonsterId;
  selectedMonsterName: string;
  xp: number;
  weeklyXp: number;
  done: Partial<Record<ChoreId, boolean>>;
  battleResult: 'captured' | 'got-away' | null;
  lockedBossName: string | null;
  currentStreak: number;
  lastChoreDate: string;
  pendingEvolution: boolean;
  /** Banked battle shards. Per kid — siblings must not share a wallet. */
  shards: number;
  /** True once this week's shard grant was claimed (first battle entry); reset Monday. */
  weeklyShardsClaimed: boolean;
  /** A co-op chest owed because the family finished a boss this kid had already
   *  worn down; null when nothing is pending. Shown on next profile open. */
  pendingCoopChest: PendingCoopChest | null;
  /** Consecutive boss wins with no escape in between — drives the Undefeated milestone. */
  battleWinStreak: number;
}

const DEFAULT_KID_MONSTER_STATE: KidMonsterState = {
  monsterIdx: 0,
  selectedMonsterId: 'slime',
  selectedMonsterName: '',
  xp: 0,
  weeklyXp: 0,
  done: {},
  battleResult: null,
  lockedBossName: null,
  currentStreak: 0,
  lastChoreDate: '',
  pendingEvolution: false,
  shards: 0,
  weeklyShardsClaimed: false,
  pendingCoopChest: null,
  battleWinStreak: 0,
};

function AppInner() {
  const [activeToast, setActiveToast]     = useState<{ def: MilestoneDef; kidName?: string } | null>(null);
  const [toastMilestoneId, setToastMid]   = useState<string | null>(null);
  const [appMode, setAppMode]             = useState<AppMode>('splash');
  const [sessionUser, setSessionUser] = useState<SessionUser | null>(null);

  // ── Episodic debug logging ───────────────────────────────────────────────
  // family_id is read at flush time off this ref, so the buffer always tags
  // the currently signed-in parent without threading auth state through the
  // logger. Set in the bootstrap on session restore/login; cleared on sign-out.
  const familyIdRef = useRef<string | null>(null);
  useEffect(() => {
    initDebugLog({
      client: supabase,
      getContext: () => ({ family_id: familyIdRef.current, app_version: APP_VERSION }),
    });
    log('app.launch', { v: APP_VERSION });
    const sub = AppState.addEventListener('change', (next) => {
      log('app.state', { next });
      if (next === 'background') flushNow('session.background');
    });
    return () => sub.remove();
  }, []);
  // Pending auth state for the email confirmation / password-reset round trips (MON-54).
  const [pendingAuthEmail, setPendingAuthEmail] = useState('');
  const [pendingAuthName, setPendingAuthName]   = useState('');
  const [checkEmailMode, setCheckEmailMode]     = useState<'confirm' | 'reset'>('confirm');
  const [kidWelcomeName, setKidWelcomeName] = useState('there');
  // MON-85 Phase 1: when KidWelcome is reached via the (stubbed) device-pairing
  // flow rather than the on-device profile switcher, it's a preview — completing
  // it returns to the role selector instead of writing a kid profile / entering
  // the app (no authenticated kid device exists yet).
  const [kidWelcomePreview, setKidWelcomePreview] = useState(false);
  const [kidMonsterState, setKidMonsterState] = useState<Record<string, KidMonsterState>>({});
  const getKidMonster = (name: string): KidMonsterState => kidMonsterState[name] ?? { ...DEFAULT_KID_MONSTER_STATE };
  const setKidMonster = (name: string, updater: (prev: KidMonsterState) => KidMonsterState) =>
    setKidMonsterState(prev => ({ ...prev, [name]: updater(prev[name] ?? { ...DEFAULT_KID_MONSTER_STATE }) }));
  // ── Cooperative household boss (MON-84) ──────────────────────────────────
  // The family shares ONE boss identity AND one HP bar (`hpPct`, 0–1). Every
  // kid fights a tier-scaled instance seeded at `hpPct` of their own max HP;
  // damage carries between siblings. `participants` records who has chipped in
  // this cycle (with the completion % at the time they fought) so that when the
  // bar finally empties EVERY participant — not just the kid who landed the
  // finishing blow — is owed a chest. When the bar hits 0 the boss is captured
  // and rotates to a fresh identity with a full bar. Persisted to AsyncStorage
  // only for now (Supabase sync is a follow-up; multi-device is out of scope).
  const [householdBoss, setHouseholdBoss] = useState<{
    bossName: string;
    hpPct: number;
    participants: { name: string; completionPct: number; xpSnapshot: number }[];
  }>({ bossName: '', hpPct: 1, participants: [] });
  const [screen, setScreen]             = useState<Screen>('home');
  const [tab, setTab]                   = useState<Tab>('home');
  const [trophyOrigin, setTrophyOrigin]       = useState<Tab>('home');
  const [trophyInitialKey, setTrophyInitialKey] = useState<string | undefined>(undefined);
  const [kidCoins, setKidCoins]         = useState<Record<string, number>>({});
  const [bonusCoins, setBonusCoins]     = useState(0);
  const [chestTier, setChestTier]           = useState<ChestTier>('Common');
  const [chorePctAtBattle, setChorePctAtBattle] = useState(0);
  const [chestCollectible, setChestCollectible] = useState(() => pickForTier('Common'));
  // Cooperative win outcome (MON-84), captured at battle end and shown on the
  // reveal screen: did this win finish the family capture, or just wear the
  // boss down further (and how many fights remain)?
  const [coopWin, setCoopWin] = useState<{ familyCaptured: boolean; fightsLeft: number; totalFighters: number; bossName: string } | null>(null);
  const [battleCoinBonusEnabled,    setBattleCoinBonusEnabled]    = useState(false);
  // Fraction of the base chore rate paid on a boss win (0.25 = 25%). Was a
  // multiple of the boss's capture value; now a % of base rate (one model,
  // configured on the Battle & bonuses screen).
  const [battleCoinBonusMultiplier, setBattleCoinBonusMultiplier] = useState(0.25);

  // Parent state
  const [viewMode, setViewMode]               = useState<ViewMode>('kid');
  const [parentScreen, setParentScreen]       = useState<ParentScreen>('parentHome');
  const [prevParentScreen, setPrevParentScreen] = useState<ParentScreen>('parentHome');
  const [parentTab, setParentTab]             = useState<ParentTab>('home');

  // ── Nav breadcrumbs for the debug-log buffer ─────────────────────────────
  // This app has no NavigationContainer (screen is plain state), so the
  // equivalent of onStateChange is an effect over the active surface. These
  // breadcrumbs are the connective tissue between the explicit domain.action
  // logs; route names only, never any kid data.
  useEffect(() => { log('nav.screen', { mode: appMode, screen, parent: parentScreen }); },
    [appMode, screen, parentScreen]);
  const [managedChores, setManagedChores]     = useState<ManagedChore[]>(DEFAULT_MANAGED_CHORES);
  const [choreHistory, setChoreHistory]       = useState<{ id: string; choreName: string; kidName: string; earnedCents: number; approvedAt: string; icon: string | number; bg: string }[]>([]);
  const [appDataLoaded, setAppDataLoaded]     = useState(false);
  const [editingChore, setEditingChore]       = useState<ManagedChore | null>(null);
  const [baseRate, setBaseRate]               = useState('0.50');
  const [parentRole, setParentRole]           = useState('');
  const [setupChildren, setSetupChildren]     = useState<import('./src/screens/ParentOnboarding').OnboardingChild[]>([]);
  const [kids, setKids]                       = useState<string[]>([]);
  const [currentKidName, setCurrentKidName]   = useState('');
  const [kidOnboardingDone, setKidOnboardingDone] = useState<Record<string, boolean>>({});
  // Kid-welcome writes (monster choice + onboarding flag) that fired before the
  // kid's real Supabase UUID was available are queued here by name, then flushed
  // once the UUID lands. Without this the choice never persists and the kid is
  // bounced back to the monster picker on the next reload.
  const pendingKidWelcomeWrites = useRef<Record<string, { monster_id: MonsterId; monster_name: string; kid_onboarding_done: true }>>({});
  // Parent PIN gate — guards switching from a kid into parent view
  const [parentPin, setParentPin]             = useState('');
  const [parentPinEnabled, setParentPinEnabled] = useState(false);
  const [pinModalOpen, setPinModalOpen]       = useState(false);
  // Per-kid approval settings — true = needs parent sign-off, false = auto-approve
  const [kidApprovalSettings, setKidApprovalSettings] = useState<Record<string, boolean>>({});
  // Missing entry defaults to TRUE (requires approval) — must match the settings
  // UI, which renders unset kids as "requires approval" (`?? true`).
  const requireApproval = kidApprovalSettings[currentKidName] ?? true;
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
      updateKid(kidModalInitial.id, { name: data.name, avatar_idx: data.avatarIdx, avatar_color: data.avatarColor, age_range: data.ageRange }).catch(e => console.warn('[DB] updateKid error:', e));
      if (kidModalInitial.name !== data.name) {
        const oldName = kidModalInitial.name;
        const newName = data.name;
        // Per-kid state is keyed by display name across many maps; re-key every
        // one so a rename doesn't orphan the kid's progress, money, goals, or
        // monster (which would otherwise re-trigger the monster picker).
        const renameKey = <T,>(rec: Record<string, T> | undefined): Record<string, T> | undefined => {
          if (!rec || !(oldName in rec)) return rec;
          const next = { ...rec }; next[newName] = next[oldName]; delete next[oldName]; return next;
        };
        setCurrentKidName(cn => cn === oldName ? newName : cn);
        setKidApprovalSettings(prev => renameKey(prev) ?? prev);
        setKidCoins(prev => renameKey(prev) ?? prev);
        setKidPayoutPending(prev => renameKey(prev) ?? prev);
        setKidMonsterState(prev => renameKey(prev) ?? prev);
        setKidOnboardingDone(prev => renameKey(prev) ?? prev);
        setGoalsByKid(prev => renameKey(prev) ?? prev);
        // Name-keyed history arrays (drive money owed) and per-chore records.
        setChoreHistory(prev => prev.map(h => h.kidName === oldName ? { ...h, kidName: newName } : h));
        setPayoutLog(prev => prev.map(p => p.kidName === oldName ? { ...p, kidName: newName } : p));
        setManagedChores(prev => prev.map(c => ({
          ...c,
          childStatus:        renameKey(c.childStatus),
          childCompletions:   renameKey(c.childCompletions),
          childRejectionNote: renameKey(c.childRejectionNote),
          childSubmittedAt:   renameKey(c.childSubmittedAt),
          childPendingCount:  renameKey(c.childPendingCount),
          childPendingCents:  renameKey(c.childPendingCents),
          childPendingXp:     renameKey(c.childPendingXp),
        })));
        // Re-key the durable DB rows (chore_history / payouts) too.
        renameKidInHistory(oldName, newName).catch(e => console.warn('[DB] renameKidInHistory error:', e));
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
      addKid({ name: data.name, avatar_idx: data.avatarIdx, avatar_color: data.avatarColor, age_range: data.ageRange })
        .then(row => { if (row?.id) setSetupChildren(prev => prev.map(c => c.id === newChild.id ? { ...c, id: row.id } : c)); })
        .catch(e => console.warn('[DB] addKid error:', e));
    }
  };
  // Goals are per kid profile — each child has their own savings goals.
  const [goalsByKid, setGoalsByKid] = useState<Record<string, SavedGoal[]>>({});
  const getKidGoals = (name: string): SavedGoal[] => goalsByKid[name] ?? [];
  const setKidGoals = (name: string, updater: (prev: SavedGoal[]) => SavedGoal[]) =>
    setGoalsByKid(prev => ({ ...prev, [name]: updater(prev[name] ?? []) }));
  const approvalSeq = useRef(0); // monotonic counter for unique chore-history ids when approving many at once
  const [lastWeekReset, setLastWeekReset]     = useState<string>('');
  const [weekApprovalDays, setWeekApprovalDays] = useState<string[]>([]); // date strings of days with ≥1 approval — persisted
  const getKidCoins  = useCallback((name: string) => kidCoins[name] ?? 0, [kidCoins]);
  // Guard against NaN/Infinity: one bad amount would poison the stored balance
  // (and sync the corruption to Supabase via the debounced kid-stats sync).
  const addKidCoins  = useCallback((name: string, amount: number) => {
    if (!Number.isFinite(amount)) { console.warn(`[coins] ignored non-finite amount for ${name}:`, amount); return; }
    setKidCoins(prev => ({ ...prev, [name]: (Number.isFinite(prev[name]) ? prev[name] : 0) + amount }));
  }, []);
  const resetKidCoins = useCallback((name: string) => setKidCoins(prev => ({ ...prev, [name]: 0 })), []);

  // ── Per-kid monster state shortcuts for the active kid ────────────────────
  const _km = getKidMonster(currentKidName);
  const monsterIdx          = _km.monsterIdx;
  const selectedMonsterId   = _km.selectedMonsterId;
  const selectedMonsterName = _km.selectedMonsterName;
  const xp                  = _km.xp;
  const weeklyXp            = _km.weeklyXp;
  const done                = _km.done;
  const battleResult        = _km.battleResult;
  const lockedBossName      = _km.lockedBossName;
  const currentStreak       = _km.currentStreak;
  const lastChoreDate       = _km.lastChoreDate;
  const pendingEvolution    = _km.pendingEvolution;
  const shards              = _km.shards;
  const weeklyShardsClaimed = _km.weeklyShardsClaimed;
  const pendingCoopChest    = _km.pendingCoopChest;
  const effectiveMonsterName = selectedMonsterName || fallbackNameForKid(currentKidName);

  const [kidPayoutPending, setKidPayoutPending] = useState<Record<string, boolean>>({});
  const [payoutLog, setPayoutLog] = useState<{ kidName: string; amount: number; paidAt: string }[]>([]);
  // Keyed by kid name: paying two kids back-to-back must not overwrite the
  // first kid's celebration data before they've seen it.
  const [payoutSnapshot, setPayoutSnapshot] = useState<Record<string, {
    amount: number; completedCount: number; weeks: UnpaidWeek[]; battleWon: boolean | null; battleBonus: number | null;
  }>>({});

  // ── Load all user data from Supabase after login or on startup ─────────────
  const loadUserDataFromSupabase = useCallback(async () => {
    try {
        const { data: { session } } = await supabase.auth.getSession();
        console.log('[bootstrap] session:', session?.user?.email ?? 'none');
        if (!session) return false;

        setSessionUser({ name: session.user.user_metadata?.name ?? '', email: session.user.email ?? '' });
        familyIdRef.current = session.user.id;   // tag debug-log flushes with this parent

        // ── Per-account cache guard ───────────────────────────────────────────
        // The `monstir:*` AsyncStorage keys are device-global, but the DB rows
        // they mirror are scoped per user.id (parent_id / RLS). If a different
        // account signs in on this device than the one we last cached for, the
        // merge below would fold the previous family's kids/chores into the new
        // account ("adds the kids altogether"). Drop the stale cache first so
        // the DB stays the single source of truth for the signed-in user.
        // (Sign-out already sweeps these; this also covers session restores and
        // first-login-after-pre-auth-play where sign-out never ran.) The session
        // token lives under Supabase's own `sb-*` key, so this never logs out.
        try {
          const prevUserId = await AsyncStorage.getItem('monstir:lastUserId');
          if (prevUserId && prevUserId !== session.user.id) {
            const allKeys = await AsyncStorage.getAllKeys();
            const toRemove = allKeys.filter(k => k.startsWith('monstir:') && k !== 'monstir:lastUserId');
            if (toRemove.length > 0) await AsyncStorage.multiRemove(toRemove);
            console.log('[bootstrap] account switched — cleared', toRemove.length, 'stale cache keys');
          }
          await AsyncStorage.setItem('monstir:lastUserId', session.user.id);
        } catch {}

        const [profile, dbKids, dbChores, dbGoals, dbPayouts, savedApproval, savedChores, savedGoalsLocal, savedGoalsByKidLocal, savedLastWeekReset, savedHouseholdBoss] = await Promise.all([
          loadProfile(),
          loadKids(),
          loadChores(),
          loadGoals(),
          loadPayoutLog(),
          AsyncStorage.getItem('monstir:kidApprovalSettings'),
          AsyncStorage.getItem('monstir:managedChores'),
          AsyncStorage.getItem('monstir:goals'),
          AsyncStorage.getItem('monstir:goalsByKid'),
          AsyncStorage.getItem('monstir:lastWeekReset'),
          AsyncStorage.getItem('monstir:householdBoss'),
        ]);
        if (savedHouseholdBoss) {
          try {
            const hb = JSON.parse(savedHouseholdBoss);
            if (hb && typeof hb.bossName === 'string') {
              // Migrate the legacy { bossName, felledBy } shape: a partially
              // felled boss starts the new shared bar at full and lets the
              // family re-wear it down (no clean HP to recover from felledBy).
              setHouseholdBoss({
                bossName:     hb.bossName,
                hpPct:        typeof hb.hpPct === 'number' ? hb.hpPct : 1,
                participants: Array.isArray(hb.participants) ? hb.participants : [],
              });
            }
          } catch {}
        }
        console.log('[bootstrap] profile:', JSON.stringify(profile));
        console.log('[bootstrap] dbKids:', JSON.stringify(dbKids));
        console.log('[bootstrap] dbChores count:', dbChores?.length);

        if (profile) {
          if (profile.parent_role)                             setParentRole(profile.parent_role);
          if (profile.base_rate)                               setBaseRate((profile.base_rate / 100).toFixed(2));
          if (profile.battle_coin_bonus_enabled !== undefined) setBattleCoinBonusEnabled(profile.battle_coin_bonus_enabled ?? false);
          if (profile.battle_coin_bonus_multiplier)            setBattleCoinBonusMultiplier(Number(profile.battle_coin_bonus_multiplier));
          if (profile.parent_pin)                              setParentPin(profile.parent_pin);
          if (profile.parent_pin_enabled !== undefined)        setParentPinEnabled(profile.parent_pin_enabled);
        }

        // Per-kid goals are built from dbKids.goals_json inside the kids block
        // below. Legacy global goals (old single-list storage) are migrated onto
        // the first kid so existing users don't lose their goal.
        const legacyGlobalGoals: SavedGoal[] = (() => {
          if (Array.isArray(dbGoals) && dbGoals.length > 0) return (dbGoals as SavedGoal[]).map(normalizeGoalIcon);
          if (savedGoalsLocal) { try { const g = JSON.parse(savedGoalsLocal); if (Array.isArray(g)) return (g as SavedGoal[]).map(normalizeGoalIcon); } catch {} }
          return [];
        })();
        const localGoalsByKid: Record<string, SavedGoal[]> = (() => {
          if (savedGoalsByKidLocal) { try { const m = JSON.parse(savedGoalsByKidLocal); return Object.fromEntries(Object.entries(m).map(([k, arr]) => [k, (arr as SavedGoal[]).map(normalizeGoalIcon)])); } catch {} }
          return {};
        })();

        // Payout log from Supabase
        if (Array.isArray(dbPayouts) && dbPayouts.length > 0) {
          setPayoutLog((dbPayouts as { kid_name?: string; amount_cents?: number; paid_at?: string }[]).map((p) => ({
            kidName:  p.kid_name  ?? '',
            amount:   p.amount_cents ?? 0,
            paidAt:   p.paid_at   ?? new Date().toISOString(),
          })));
        }

        // Chore history + week approval days — from Supabase profile JSON, fall back to AsyncStorage
        if (profile?.chore_history_json)     { try { setChoreHistory(JSON.parse(profile.chore_history_json)); } catch {} }
        else { const h = await AsyncStorage.getItem('monstir:choreHistory');       if (h) { try { setChoreHistory(JSON.parse(h)); } catch {} } }

        if (profile?.week_approval_days_json) { try { setWeekApprovalDays(JSON.parse(profile.week_approval_days_json)); } catch {} }
        else { const w = await AsyncStorage.getItem('monstir:weekApprovalDays');   if (w) { try { setWeekApprovalDays(JSON.parse(w)); } catch {} } }

        if (profile?.last_week_reset)         { setLastWeekReset(profile.last_week_reset); }
        else if (savedLastWeekReset)           { setLastWeekReset(savedLastWeekReset); }

        // Per-kid approval settings — prefer Supabase full map, fall back to AsyncStorage
        const localApproval: Record<string, boolean> = (() => {
          const source = profile?.kid_approval_settings_json ?? savedApproval;
          if (source) { try { const a = JSON.parse(source); if (a && typeof a === 'object' && !Array.isArray(a)) return a; } catch {} }
          return {};
        })();
        setKidApprovalSettings(localApproval);

        if (dbKids && dbKids.length > 0) {
          const names = dbKids.map((k: { name: string }) => k.name);
          setKids(names);
          setCurrentKidName(names[0]);
          setSetupChildren(dbKids.map((k: { id: string; name: string; avatar_color: string; avatar_idx: number; age_range: string }) => ({
            id:               k.id,
            name:             k.name,
            avatarColor:      k.avatar_color ?? '#EAE4FF',
            avatarIdx:        k.avatar_idx ?? 0,
            ageRange:         (k.age_range ?? '7-9') as '5-6' | '7-9' | '10-12' | '13+',
            difficulty:       'Easy' as const,
            selectedChoreIds: [],
          })));
          // Granular local setting wins; the DB boolean only seeds kids with no
          // local entry (e.g. fresh install on a new device).
          setKidApprovalSettings(Object.fromEntries(names.map((n: string) => [n, localApproval[n] ?? (profile?.require_approval ?? true)])));

          // Hydrate XP, coins, streak, goals from DB
          const kidMonsterInit: Record<string, KidMonsterState> = {};
          const kidCoinsInit: Record<string, number> = {};
          const goalsInit: Record<string, SavedGoal[]> = {};
          for (const k of dbKids as { name: string; xp: number; weekly_xp: number; coins: number; current_streak: number; last_chore_date: string | null; monster_idx: number; monster_id: string | null; monster_name: string | null; kid_onboarding_done: boolean; goals_json?: string | null }[]) {
            kidMonsterInit[k.name] = {
              ...DEFAULT_KID_MONSTER_STATE,
              xp:                  k.xp ?? 0,
              weeklyXp:            k.weekly_xp ?? 0,
              currentStreak:       k.current_streak ?? 0,
              lastChoreDate:       k.last_chore_date ?? '',
              monsterIdx:          toMonsterIdx(k.monster_idx),
              selectedMonsterId:   toMonsterId(k.monster_id),
              selectedMonsterName: k.monster_name ?? '',
            };
            kidCoinsInit[k.name] = k.coins ?? 0;
            // Goals: prefer DB column, fall back to local per-kid map
            let kidGoals: SavedGoal[] = [];
            if (k.goals_json) { try { const g = JSON.parse(k.goals_json); if (Array.isArray(g)) kidGoals = (g as SavedGoal[]).map(normalizeGoalIcon); } catch {} }
            if (kidGoals.length === 0 && Array.isArray(localGoalsByKid[k.name])) kidGoals = localGoalsByKid[k.name];
            goalsInit[k.name] = kidGoals;
            if (k.kid_onboarding_done) {
              setKidOnboardingDone(prev => ({ ...prev, [k.name]: true }));
            }
          }
          // Migrate legacy global goals onto the first kid if nobody has goals yet
          if (legacyGlobalGoals.length > 0 && names[0] && Object.values(goalsInit).every(g => g.length === 0)) {
            goalsInit[names[0]] = legacyGlobalGoals;
          }
          setKidMonsterState(kidMonsterInit);
          setKidCoins(kidCoinsInit);
          setGoalsByKid(goalsInit);
        }

        const choresToMerge = profile?.chores_state_json ?? savedChores;

        if (dbChores && dbChores.length > 0) {
          // Build UUID → name map from the kids we just loaded
          const kidIdToName: Record<string, string> = {};
          for (const k of (dbKids ?? [])) kidIdToName[k.id] = k.name;

          const mapped: ManagedChore[] = dbChores.map((c: { id: string; name: string; icon: string; frequency: string; difficulty: number; assigned_to: string[]; completion_mode?: string | null }) => ({
            id:                c.id,
            name:              c.name,
            description:       '',
            icon:              resolveChoreIcon(c.icon ?? '', c.name),
            bg:                '#EAE4FF',
            frequency:         (c.frequency ?? 'daily') as ManagedChore['frequency'],
            difficulty:        (c.difficulty === 3 ? 3 : c.difficulty === 2 ? 2 : 1) as 1 | 2 | 3,
            // assigned_to contains kid UUIDs — map them to names so the kid-view filter works
            assignedTo:        (c.assigned_to ?? []).map((id: string) => kidIdToName[id] ?? id),
            status:            'active' as const,
            weeklyCompletions: 0,
            completionMode:    c.completion_mode === 'independent' ? 'independent' : c.completion_mode === 'shared' ? 'shared' : undefined,
          }));

          if (choresToMerge) {
            try {
              let migrated = false;
              const local: ManagedChore[] = (JSON.parse(choresToMerge) as ManagedChore[]).map(c => {
                if (!isUUID(c.id) && !c.id.startsWith('_')) {
                  migrated = true;
                  return { ...c, id: '_' + randomUUID() };
                }
                return c;
              });
              const merged = mapped.map(db => {
                const loc = local.find(l => l.id === db.id || l.name === db.name);
                if (!loc) return db;
                return {
                  ...db,
                  childStatus:        loc.childStatus,
                  childRejectionNote: loc.childRejectionNote,
                  childCompletions:   loc.childCompletions,
                  childSubmittedAt:   loc.childSubmittedAt,
                  childPendingCount:  loc.childPendingCount,
                  weeklyCompletions:  loc.weeklyCompletions ?? db.weeklyCompletions,
                  status:             loc.status ?? db.status,
                };
              });
              setManagedChores(merged);
              if (migrated) {
                saveAppState({ chores_state_json: JSON.stringify(merged) })
                  .catch(e => console.warn('[DB] migrate chore IDs error:', e));
              }
            } catch { setManagedChores(mapped); }
          } else {
            setManagedChores(mapped);
          }
        } else if (choresToMerge) {
          // No DB chores yet — migrate non-UUID IDs in saved state and restore
          try {
            let migrated = false;
            const local: ManagedChore[] = (JSON.parse(choresToMerge) as ManagedChore[]).map(c => {
              if (!isUUID(c.id) && !c.id.startsWith('_')) {
                migrated = true;
                return { ...c, id: '_' + randomUUID() };
              }
              return c;
            });
            setManagedChores(local);
            if (migrated) {
              saveAppState({ chores_state_json: JSON.stringify(local) })
                .catch(e => console.warn('[DB] migrate chore IDs error:', e));
            }
          } catch {}
        }

        // ── Hydrate trophies from Supabase into per-kid local storage ──────────
        // Trophies are written to Supabase on earn but read from local storage;
        // pull the durable copy back so they survive reinstalls / new devices.
        const fmtD = (d: Date) => d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
        const capRarity = (s: string) => s ? (s.charAt(0).toUpperCase() + s.slice(1)) : s;
        await Promise.all((dbKids ?? []).map(async (k: { id: string; name: string }) => {
          try {
            const [caps, cols, miles] = await Promise.all([
              loadBossCaptures(k.id),
              loadCollectibles(k.id),
              loadMilestones(k.id),
            ]);

            const captureEntries: BossCaptureEntry[] = (caps as { id: string; boss_name: string; captured_at: string; coins_earned: number; xp_earned: number; completion_pct: number | null }[]).map(r => {
              const d  = new Date(r.captured_at);
              const ws = new Date(d);  ws.setDate(d.getDate() - d.getDay());
              const we = new Date(ws); we.setDate(ws.getDate() + 6);
              const disp = getBossDisplay(r.boss_name);
              return {
                id:            r.id,
                bossName:      r.boss_name,
                capturedAt:    r.captured_at,
                weekLabel:     `${fmtD(ws)} – ${fmtD(we)}`,
                weakness:      disp?.weakness ?? '',
                threat:        disp?.threat ?? 'Easy',
                completionPct: r.completion_pct ?? 0,
                coinsEarned:   r.coins_earned ?? 0,
                xpEarned:      r.xp_earned ?? 0,
              };
            });

            const collectibleEntries: CollectibleEntry[] = (cols as { id: string; collectible_id: string; rarity: string; earned_at: string }[]).map(r => {
              const def = COLLECTIBLES.find(c => c.key === r.collectible_id);
              return {
                id:        r.id,
                itemKey:   r.collectible_id,
                itemName:  def?.name ?? r.collectible_id,
                rarity:    (def?.rarity ?? capRarity(r.rarity ?? 'common')) as CollectibleEntry['rarity'],
                earnedAt:  r.earned_at,
                weekLabel: fmtD(new Date(r.earned_at)),
              };
            });

            const milestoneEntries: EarnedMilestone[] = (miles as { milestone_id: string; earned_at: string }[]).map(r => ({
              id:       r.milestone_id,
              earnedAt: r.earned_at,
            }));

            await Promise.all([
              mergeBossCaptures(k.name, captureEntries),
              mergeCollectibles(k.name, collectibleEntries),
              mergeMilestones(k.name, milestoneEntries),
            ]);
          } catch (e) {
            console.warn('[DB] trophy hydration failed for', k.name, e);
          }
        }));

        // Hydrate parent milestones from the profile (Part 1 gap) so the parent's
        // own achievements survive reinstall / new device.
        if (profile?.parent_milestones_json) {
          try {
            const parentMiles = JSON.parse(profile.parent_milestones_json) as EarnedMilestone[];
            if (Array.isArray(parentMiles)) await mergeMilestones(PARENT_OWNER, parentMiles);
          } catch {}
        }

        setAppDataLoaded(true);
        setViewMode('parent');
        // A freshly created account (social sign-in or an email signup that never
        // finished onboarding) has no kids yet — send them through parent
        // onboarding instead of dropping them into an empty app shell (MON-54).
        const hasOnboarded = Array.isArray(dbKids) && dbKids.length > 0;
        setAppMode(hasOnboarded ? 'app' : 'parentOnboarding');
        return true;
    } catch (e) {
      console.warn('[DB] loadUserData failed, falling back to AsyncStorage:', e);
      const [choreSaved, historySaved, approvalDaysSaved] = await Promise.all([
        AsyncStorage.getItem('monstir:managedChores'),
        AsyncStorage.getItem('monstir:choreHistory'),
        AsyncStorage.getItem('monstir:weekApprovalDays'),
      ]);
      if (choreSaved)        { try { setManagedChores(JSON.parse(choreSaved)); } catch {} }
      if (historySaved)      { try { setChoreHistory(JSON.parse(historySaved)); } catch {} }
      if (approvalDaysSaved) { try { setWeekApprovalDays(JSON.parse(approvalDaysSaved)); } catch {} }
      setAppDataLoaded(true);
      return false;
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // ── On startup: load from Supabase if session exists, else AsyncStorage ──
  useEffect(() => {
    async function bootstrap() {
      // Hydrate the week-reset marker before appDataLoaded flips on, so the weekly
      // reset effect can tell "already reset this week" from "new week began".
      try { const lwr = await AsyncStorage.getItem('monstir:lastWeekReset'); if (lwr) setLastWeekReset(lwr); } catch {}
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        await loadUserDataFromSupabase();
      } else {
        const [choreSaved, historySaved, approvalDaysSaved, goalsByKidSaved, goalsSaved] = await Promise.all([
          AsyncStorage.getItem('monstir:managedChores'),
          AsyncStorage.getItem('monstir:choreHistory'),
          AsyncStorage.getItem('monstir:weekApprovalDays'),
          AsyncStorage.getItem('monstir:goalsByKid'),
          AsyncStorage.getItem('monstir:goals'),
        ]);
        if (choreSaved)        { try { setManagedChores(JSON.parse(choreSaved)); } catch {} }
        if (historySaved)      { try { setChoreHistory(JSON.parse(historySaved)); } catch {} }
        if (approvalDaysSaved) { try { setWeekApprovalDays(JSON.parse(approvalDaysSaved)); } catch {} }
        if (goalsByKidSaved)   { try { const m = JSON.parse(goalsByKidSaved); setGoalsByKid(Object.fromEntries(Object.entries(m).map(([k, arr]) => [k, (arr as SavedGoal[]).map(normalizeGoalIcon)]))); } catch {} }
        else if (goalsSaved)   { try { const g = JSON.parse(goalsSaved); if (Array.isArray(g) && g.length > 0 && currentKidName) setGoalsByKid({ [currentKidName]: (g as SavedGoal[]).map(normalizeGoalIcon) }); } catch {} }
        setAppDataLoaded(true);
      }
    }
    bootstrap();
  }, []);

  const choresStateSyncTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => {
    if (!appDataLoaded) return;
    AsyncStorage.setItem('monstir:managedChores', JSON.stringify(managedChores)).catch(() => {});
    if (choresStateSyncTimer.current) clearTimeout(choresStateSyncTimer.current);
    choresStateSyncTimer.current = setTimeout(() => {
      saveAppState({ chores_state_json: JSON.stringify(managedChores) }).catch(e => console.warn('[DB] saveAppState (choresState) error:', e));
    }, 2000);
  }, [managedChores, appDataLoaded]);

  // ── Persist pay-rate settings to Supabase (debounced) ────────────────────
  const payRateSyncTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => {
    if (!appDataLoaded) return;
    if (payRateSyncTimer.current) clearTimeout(payRateSyncTimer.current);
    payRateSyncTimer.current = setTimeout(() => {
      const rateNum = Math.round(parseFloat(baseRate) * 100) || 50;
      saveProfile({
        base_rate: rateNum,

        battle_coin_bonus_enabled: battleCoinBonusEnabled,
        battle_coin_bonus_multiplier: battleCoinBonusMultiplier,
      }).catch(e => console.warn('[DB] saveProfile (rates) error:', e));
    }, 1500);
  }, [baseRate, battleCoinBonusEnabled, battleCoinBonusMultiplier, appDataLoaded]);

  // ── Persist per-kid approval settings to Supabase ───────────────────────
  useEffect(() => {
    if (!appDataLoaded) return;
    AsyncStorage.setItem('monstir:kidApprovalSettings', JSON.stringify(kidApprovalSettings)).catch(() => {});
    saveAppState({ kid_approval_settings_json: JSON.stringify(kidApprovalSettings) }).catch(e => console.warn('[DB] saveAppState (kidApproval) error:', e));
  }, [kidApprovalSettings, appDataLoaded]);

  // ── Persist per-kid goals to Supabase + AsyncStorage ─────────────────────
  const goalSyncTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => {
    if (!appDataLoaded) return;
    AsyncStorage.setItem('monstir:goalsByKid', JSON.stringify(goalsByKid)).catch(() => {});
    if (goalSyncTimer.current) clearTimeout(goalSyncTimer.current);
    goalSyncTimer.current = setTimeout(() => {
      // Each kid's goals live on their own kids row (goals_json column)
      for (const [name, kidGoals] of Object.entries(goalsByKid)) {
        const kidDbId = setupChildren.find(c => c.name === name)?.id;
        if (kidDbId) updateKid(kidDbId, { goals_json: JSON.stringify(kidGoals) }).catch(e => console.warn('[DB] saveGoals error:', e));
      }
    }, 1000);
  }, [goalsByKid, appDataLoaded, setupChildren]);

  const appStateSyncTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => {
    if (!appDataLoaded) return;
    AsyncStorage.setItem('monstir:choreHistory', JSON.stringify(choreHistory)).catch(() => {});
    if (appStateSyncTimer.current) clearTimeout(appStateSyncTimer.current);
    appStateSyncTimer.current = setTimeout(() => {
      saveAppState({ chore_history_json: JSON.stringify(choreHistory) }).catch(e => console.warn('[DB] saveAppState (history) error:', e));
    }, 2000);
  }, [choreHistory, appDataLoaded]);

  useEffect(() => {
    if (!appDataLoaded) return;
    AsyncStorage.setItem('monstir:weekApprovalDays', JSON.stringify(weekApprovalDays)).catch(() => {});
    saveAppState({ week_approval_days_json: JSON.stringify(weekApprovalDays) }).catch(e => console.warn('[DB] saveAppState (approvalDays) error:', e));
  }, [weekApprovalDays, appDataLoaded]);

  // ── Sync kid XP / coins to Supabase (debounced) ──────────────────────────
  const kidSyncTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => {
    if (!appDataLoaded) return;
    if (kidSyncTimer.current) clearTimeout(kidSyncTimer.current);
    kidSyncTimer.current = setTimeout(() => {
      for (const name of Object.keys(kidMonsterState)) {
        const kidDbId = setupChildren.find(c => c.name === name)?.id;
        if (!kidDbId || !isUUID(kidDbId)) continue;
        const km = kidMonsterState[name];
        updateKidStats(kidDbId, {
          xp:              km.xp,
          weekly_xp:       km.weeklyXp,
          coins:           kidCoins[name] ?? 0,
          current_streak:  km.currentStreak,
          last_chore_date: km.lastChoreDate || undefined,
          monster_idx:     km.monsterIdx,
          monster_name:    km.selectedMonsterName || undefined,
        }).catch(e => console.warn('[DB] updateKidStats error:', e));
      }
    }, 2000); // 2s debounce — avoids hammering DB on rapid updates
    return () => { if (kidSyncTimer.current) clearTimeout(kidSyncTimer.current); };
    // setupChildren is a dep so the sync re-fires when a kid's temporary local
    // id is replaced by its real Supabase UUID (otherwise stats never persist).
  }, [kidMonsterState, kidCoins, appDataLoaded, setupChildren]);

  // ── Flush queued kid-welcome writes once the kid's real UUID resolves ──────
  useEffect(() => {
    const pend = pendingKidWelcomeWrites.current;
    for (const name of Object.keys(pend)) {
      const id = setupChildren.find(c => c.name === name)?.id;
      if (id && isUUID(id)) {
        updateKid(id, pend[name]).catch(e => console.warn('[DB] flush kid-welcome write error:', e));
        delete pend[name];
      }
    }
  }, [setupChildren]);

  // ── Stuck-evolution recovery: if XP is already past the threshold on load ─
  // This happens when the app is killed during the evolve animation, leaving
  // xp > needed but monsterIdx un-advanced. Checks EVERY kid (not just the one
  // active at load) and raises pendingEvolution — the dedicated effect then
  // shows the evolve screen when that kid is (or becomes) the active view.
  useEffect(() => {
    if (!appDataLoaded) return;
    setKidMonsterState(prev => {
      let changed = false;
      const next = { ...prev };
      for (const [name, km] of Object.entries(prev)) {
        if (!km.pendingEvolution && km.monsterIdx < MONSTERS.length - 1 && km.xp >= MONSTERS[km.monsterIdx].needed) {
          next[name] = { ...km, pendingEvolution: true };
          changed = true;
        }
      }
      return changed ? next : prev;
    });
  }, [appDataLoaded]); // intentionally runs only once after load

  // ── Daily chore reset ─────────────────────────────────────────────────────
  const [lastResetDate,  setLastResetDate]  = useState<string>('');
  const [debugDayOffset, setDebugDayOffset] = useState(0);
  // Active kid's streak as it stands today (reads 0 the moment a day is missed).
  const liveCurrentStreak = liveStreak(currentStreak, lastChoreDate, getSimulatedToday(debugDayOffset));

  // ── Cooperative household boss derivations (MON-84) ───────────────────────
  // Identity is shared across the family and anchored to the highest monster
  // tier; each kid fights a tier-scaled instance of it. `activeKidBoss` is the
  // current kid's instance (identity + their own tier's combat stats).
  const householdTier: MonsterIdx = (setupChildren.length
    ? Math.max(...setupChildren.map(c => (kidMonsterState[c.name] ?? DEFAULT_KID_MONSTER_STATE).monsterIdx))
    : monsterIdx) as MonsterIdx;
  const householdIdentity: Boss = (householdBoss.bossName
    ? BOSSES.find(b => b.name === householdBoss.bossName)
    : null) ?? pickHouseholdBoss(householdTier, debugDayOffset);
  const activeKidBoss: Boss = bossForKid(householdIdentity, monsterIdx);
  // Shared-bar progress for the current household boss.
  const householdKidNames = setupChildren.map(c => c.name);
  const householdHpPct = householdBoss.hpPct;

  // Seed the household boss once the family is loaded and none is set, and prune
  // `participants` to current kids (a removed kid shouldn't stay owed a chest).
  useEffect(() => {
    if (!appDataLoaded || householdKidNames.length === 0) return;
    setHouseholdBoss(prev => {
      const participants = prev.participants.filter(p => householdKidNames.includes(p.name));
      const bossName = prev.bossName || pickHouseholdBoss(householdTier, debugDayOffset).name;
      return (bossName === prev.bossName && participants.length === prev.participants.length) ? prev : { ...prev, bossName, participants };
    });
  }, [appDataLoaded, householdKidNames.join('|'), householdTier]);

  // Persist the household boss locally (Supabase sync is a MON-84 follow-up).
  useEffect(() => {
    if (!appDataLoaded) return;
    AsyncStorage.setItem('monstir:householdBoss', JSON.stringify(householdBoss)).catch(() => {});
  }, [householdBoss, appDataLoaded]);

  // ── Battle-power reconciliation: keep weekly power honest with completions ──
  // "Battle power" (`weeklyXp`) is a scalar on the kid row; "Chores completed"
  // is restored from the chores blob. The two are persisted through different
  // paths and can drift across reloads/devices — e.g. a lost or reset weekly_xp
  // write leaves a kid showing 10/21 chores done but 0 battle power. On load —
  // and only AFTER the weekly reset has reconciled this week's marker, so we
  // never recompute from completions that are about to be wiped — derive the
  // completion floor (completions × base XP) and heal `weeklyXp` up to it if it
  // has fallen below. We heal UP only, never down: the live value can legitimately
  // sit above the floor thanks to streak bonuses, and clobbering it would drop
  // power the kid actually earned.
  //
  // CRUCIAL: skip any kid who has already battled this week (`battleResult != null`).
  // The battle deliberately consumes the week's power to 0 while leaving the chore
  // board intact, so post-battle "completions > 0, weeklyXp 0" is correct, not a
  // lost write — healing it would resurrect spent power. `battleResult` is null at
  // week start and only set once a battle happens, so it's the right discriminator.
  // Runs once.
  const didReconcilePower = useRef(false);
  useEffect(() => {
    if (!appDataLoaded || didReconcilePower.current) return;
    if (lastWeekReset !== getWeekMondayKey(debugDayOffset)) return; // wait for reset to settle
    didReconcilePower.current = true;
    setKidMonsterState(prev => {
      let changed = false;
      const next = { ...prev };
      for (const name of Object.keys(prev)) {
        if (prev[name].battleResult != null) continue; // power already spent this week
        const myChores = managedChores.filter(c => c.assignedTo.length === 0 || c.assignedTo.includes(name));
        const floor = myChores.reduce((sum, c) => sum + getChoreCompletions(c, name) * XP_BY_DIFFICULTY[c.difficulty], 0);
        if (floor > prev[name].weeklyXp) {
          next[name] = { ...prev[name], weeklyXp: floor };
          changed = true;
        }
      }
      return changed ? next : prev;
    });
  }, [appDataLoaded, lastWeekReset, debugDayOffset, managedChores]);

  useEffect(() => {
    // Wait for persisted chores to hydrate first. Otherwise this fires on the
    // pre-hydration default list, marks lastResetDate=today, and the real chores
    // (loaded a tick later) skip the daily reset — leaving yesterday's approved
    // daily chores stuck 'approved' so they never reappear in the kid's list.
    if (!appDataLoaded) return;
    const today = getSimulatedToday(debugDayOffset);
    // Use functional updater so we read latest lastResetDate without adding it to deps
    setLastResetDate(prev => {
      if (prev !== today) {
        setManagedChores(chores => applyDailyReset(chores));
        return today;
      }
      return prev;
    });
  }, [appDataLoaded, debugDayOffset]); // runs once chores are loaded, then on each day change

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

  // MON-6 — the deferred-evolution navigation effect is gone: `pendingEvolution`
  // now feeds HomeScreen as `evolutionAutoOpen` (auto-opens the in-place confirm
  // modal), and HomeScreen clears the flag via `onConsumeAutoOpen`. No screen nav.

  // Fire deferred kid payout celebration when the kid switches back to their view
  useEffect(() => {
    if (viewMode === 'kid' && currentKidName && kidPayoutPending[currentKidName]) {
      setKidPayoutPending(prev => ({ ...prev, [currentKidName]: false }));
      setScreen('kidPayout' as any);
    }
  }, [viewMode, kidPayoutPending, currentKidName]);

  // Allow audio to play through iOS silent switch
  useEffect(() => { setAudioModeAsync({ playsInSilentMode: true }); }, []);
  const openDebug = () => { if (__DEV__) setDebugOpen(true); };

  // A chore whose id is '_'-prefixed exists only locally — it has no row in the
  // Supabase `chores` table yet, so sending its id to any completion write fails
  // with "invalid input syntax for type uuid". This resolves a chore to its real
  // Supabase UUID, lazily inserting it (and upgrading the local id) the first time
  // it's needed. Concurrent calls for the same local id are coalesced so we never
  // create duplicate rows.
  const choreIdUpgrades = useRef<Record<string, Promise<string | null>>>({});
  const ensureChoreInDb = useCallback((choreId: string): Promise<string | null> => {
    if (!choreId.startsWith('_')) return Promise.resolve(choreId);
    const inFlight = choreIdUpgrades.current[choreId];
    if (inFlight) return inFlight;
    const chore = managedChores.find(c => c.id === choreId);
    if (!chore) return Promise.resolve(null);
    const iconStr = serializeChoreIcon(chore.icon);
    const assignedIds = chore.assignedTo.map(name => setupChildren.find(c => c.name === name)?.id ?? name);
    const p = addChore({
      name: chore.name, icon: iconStr, frequency: chore.frequency,
      difficulty: chore.difficulty, assigned_to: assignedIds,
      completion_mode: chore.completionMode ?? null,
    }).then(row => {
      const newId = row?.id ?? null;
      if (newId) setManagedChores(prev => prev.map(c => c.id === choreId ? { ...c, id: newId } : c));
      delete choreIdUpgrades.current[choreId];
      return newId;
    }).catch(e => {
      console.warn('[DB] ensureChoreInDb error:', e);
      delete choreIdUpgrades.current[choreId];
      return null;
    });
    choreIdUpgrades.current[choreId] = p;
    return p;
  }, [managedChores, setupChildren]);

  const submitManagedChore = useCallback((id: string) => {
    const chore = managedChores.find(c => c.id === id);
    if (!chore) return;
    const choreStatus = getChoreStatus(chore, currentKidName);
    if (choreStatus !== 'active' && choreStatus !== 'rejected') return;
    // Hard weekly cap: never let a kid claim a chore more than its recurrence
    // target across all states (approved + pending). This is what keeps progress
    // from exceeding 100%.
    if (getClaimedCount(chore, currentKidName) >= frequencyToWeeklyTarget(chore.frequency)) return;
    const kidDbId = getKidDbId(currentKidName);
    const today = getSimulatedToday(debugDayOffset);
    // Once-per-day lock for daily chores: even if the tile reopened (a same-day
    // daily reset after a reload / on another device), don't allow a second
    // completion on the same calendar day.
    if (dailyDoneToday(chore, currentKidName, today)) return;
    const earnedCents = Math.round(baseRateCents(baseRate) * DIFFICULTY_MULTIPLIERS[chore.difficulty]);
    log('chore.submit', { choreId: id, kidId: kidDbId, difficulty: chore.difficulty, earnedCents, requireApproval });
    if (requireApproval) {
      // Shared "first to finish" chores: the moment one kid submits, lock it for
      // the whole household. The submitter goes 'pending' (awaiting approval);
      // every other eligible kid is marked 'approved' so it drops off their to-do
      // and reads as done — you'd never want two kids doing the same shared chore
      // just because the first is still awaiting approval. This also closes the
      // weekly-cap race: with the others locked out, the shared counter can't be
      // bumped past target by a second submission. (Independent chores stay per-kid.)
      const shared = !isIndependentChore(chore);
      const eligible = shared ? choreEligibleKids(chore, setupChildren.map(c => c.name)) : [];
      // Snapshot the XP this submission will pay on approval. The streak bonus
      // applies only to the first chore of a new day — the same rule as the
      // auto-approve path — so approval timing/batching can't multiply it.
      const km = kidMonsterState[currentKidName] ?? DEFAULT_KID_MONSTER_STATE;
      const isNewDay = km.lastChoreDate !== today;
      const newStreak = nextStreak(km.currentStreak, km.lastChoreDate, today);
      const baseXp = XP_BY_DIFFICULTY[chore.difficulty];
      let pendingXp = baseXp;
      if (isNewDay && newStreak > 0 && newStreak % 7 === 0) pendingXp += 25;          // +25 flat on 7-day
      else if (isNewDay && newStreak > 0 && newStreak % 3 === 0) pendingXp = Math.round(baseXp * 1.1); // +10% on 3-day
      setManagedChores(prev => prev.map(c => {
        if (c.id !== id) return c;
        const childStatus: Record<string, ChoreStatus> = { ...c.childStatus, [currentKidName]: 'pending' };
        if (shared) for (const k of eligible) if (k !== currentKidName) childStatus[k] = 'approved';
        return {
          ...c,
          childStatus,
          childRejectionNote: { ...c.childRejectionNote, [currentKidName]: '' },
          childSubmittedAt: { ...c.childSubmittedAt, [currentKidName]: new Date().toISOString() },
          // Pin this submission's pay/XP to the rate and streak in effect right now.
          childPendingCents: { ...c.childPendingCents, [currentKidName]: [...(c.childPendingCents?.[currentKidName] ?? []), earnedCents] },
          childPendingXp:    { ...c.childPendingXp,    [currentKidName]: [...(c.childPendingXp?.[currentKidName] ?? []), pendingXp] },
        };
      }));
      // The streak tracks the kid's activity, so it advances when they DO the
      // chore (submit), not when the parent later approves it. This keeps the
      // streak honest even if approvals are batched days later.
      setKidMonster(currentKidName, s =>
        s.lastChoreDate === today
          ? s
          : { ...s, currentStreak: nextStreak(s.currentStreak, s.lastChoreDate, today), lastChoreDate: today }
      );
      // Save to Supabase
      if (kidDbId) {
        ensureChoreInDb(id).then(realId => {
          if (realId) submitChoreCompletion({ choreId: realId, kidId: kidDbId, requiresApproval: true }).catch(e => console.warn('[DB] submitChoreCompletion error:', e));
        });
      }
    } else {
      const allKidNames = setupChildren.map(c => c.name);
      setManagedChores(prev => prev.map(c => c.id === id ? applyChoreCompletion(c, currentKidName, allKidNames) : c));
      // ── XP with streak bonus ──────────────────────────────────────────────────
      const earnedCoins = Math.round(baseRateCents(baseRate) * DIFFICULTY_MULTIPLIERS[chore.difficulty]);
      addKidCoins(currentKidName, earnedCoins);
      // Log to history so "earned this week" counts auto-approved chores too
      // (mirrors the parent-approval path; no-approval households relied on this).
      setChoreHistory(prev => [{
        id: `${id}-${currentKidName}-${Date.now()}-${(approvalSeq.current++)}`,
        choreName: chore.name,
        kidName: currentKidName,
        earnedCents,
        approvedAt: new Date(Date.now() + debugDayOffset * 86_400_000).toISOString(),
        icon: chore.icon,
        bg: chore.bg,
      }, ...prev]);
      setKidMonster(currentKidName, s => {
        const isNewDay = s.lastChoreDate !== today;
        const newStreak = nextStreak(s.currentStreak, s.lastChoreDate, today);
        const baseXp = XP_BY_DIFFICULTY[chore.difficulty];
        let earnedXp = baseXp;
        if (isNewDay && newStreak > 0 && newStreak % 7 === 0) earnedXp += 25;          // +25 flat on 7-day
        else if (isNewDay && newStreak > 0 && newStreak % 3 === 0) earnedXp = Math.round(earnedXp * 1.1); // +10% on 3-day
        const newXp = s.xp + earnedXp;
        return {
          ...s,
          xp: newXp,
          weeklyXp: s.weeklyXp + earnedXp,
          currentStreak: isNewDay ? newStreak : s.currentStreak,
          lastChoreDate: isNewDay ? today : s.lastChoreDate,
          // Updaters must stay pure (no setScreen here) — the pendingEvolution
          // effect fires the evolve screen once this state lands.
          pendingEvolution: (s.monsterIdx < MONSTERS.length - 1 && newXp >= MONSTERS[s.monsterIdx].needed) ? true : s.pendingEvolution,
        };
      });
      // Update active goal progress
      setKidGoals(currentKidName, prev => {
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
      // Save to Supabase (auto-approved)
      if (kidDbId) {
        ensureChoreInDb(id).then(realId => {
          if (!realId) return;
          submitChoreCompletion({ choreId: realId, kidId: kidDbId, requiresApproval: false, earnedCents }).catch(e => console.warn('[DB] submitChoreCompletion error:', e));
          approveChoreCompletion({ choreId: realId, kidId: kidDbId, earnedCents, choreName: chore.name, kidName: currentKidName, icon: typeof chore.icon === 'string' ? chore.icon : '✅' }).catch(e => console.warn('[DB] approveChoreCompletion error:', e));
        });
      }
    }
  }, [managedChores, baseRate, kidApprovalSettings, currentKidName, debugDayOffset, addKidCoins, setupChildren, kidMonsterState, ensureChoreInDb]);

  // ── Weekly reset (the chore board rolls over at the week boundary) ───────────
  // This is the ONLY place the chore board resets for a new week. It fires on the
  // first app open of a new week — anchored to Monday via getWeekMondayKey, but not
  // requiring the app to be open at midnight Monday — so a skipped Monday still
  // rolls over the next time the app opens. The boss battle no longer resets chores.
  useEffect(() => {
    if (!appDataLoaded) return; // wait until persisted state (incl. lastWeekReset) is hydrated
    const mondayKey = getWeekMondayKey(debugDayOffset);
    // First run / post-update with no stored marker: adopt the current week as
    // already-reset so we never wipe a kid's in-progress week on launch.
    if (!lastWeekReset) { setLastWeekReset(mondayKey); return; }
    if (lastWeekReset === mondayKey) return; // already reset for this week
    // Reset weekly chore completions and approval days
    setManagedChores(prev => prev.map(c => ({
      ...c,
      weeklyCompletions: 0,
      childCompletions: undefined,
      // childPendingCount is intentionally PRESERVED across the week boundary:
      // it's work the kid already did that's still awaiting review — wiping it
      // would silently drop their pay. Approving it later lands in the new
      // week's counts/history (same as any cross-day approval), and it keeps
      // counting toward the weekly cap until the parent resolves it.
      status: c.status === 'approved' || c.status === 'rejected' ? 'active' as const : c.status,
      rejectionNote: undefined,
      childStatus: c.childStatus
        ? Object.fromEntries(Object.entries(c.childStatus).map(([k, st]) =>
            [k, (st === 'approved' || st === 'rejected') ? 'active' as ChoreStatus : st]))
        : c.childStatus,
    })));
    // Reset per-kid weekly state for all kids.
    // NOTE: cumulative `xp` (progress toward the next evolution) intentionally
    // persists across weeks — only the weekly battle power (`weeklyXp`) and the
    // weekly chore/battle bookkeeping reset. This keeps leveling cumulative so a
    // kid doesn't lose evolution progress every Monday.
    setKidMonsterState(prev => {
      const next = { ...prev };
      for (const name of Object.keys(next)) {
        next[name] = {
          ...next[name],
          weeklyXp: 0,
          done: {},
          battleResult: null,
          weeklyShardsClaimed: false,
          // MON-84: the household boss now CARRIES OVER until the family captures
          // it, so the shared HP bar and participant ledger (`householdBoss.hpPct`
          // / `participants`) persist across the week boundary — only the weekly
          // power/chore bookkeeping resets here. A kid's `pendingCoopChest` (owed
          // from a family capture) also persists until they open it.
        };
      }
      return next;
    });
    setWeekApprovalDays([]);
    setLastWeekReset(mondayKey);
  }, [appDataLoaded, debugDayOffset, lastWeekReset]);

  // Persist the week-reset marker so a cold start mid-week doesn't wrongly wipe
  // chores that were already completed earlier in the same week.
  useEffect(() => {
    if (!appDataLoaded || !lastWeekReset) return;
    AsyncStorage.setItem('monstir:lastWeekReset', lastWeekReset).catch(() => {});
    saveAppState({ last_week_reset: lastWeekReset }).catch(e => console.warn('[DB] saveAppState (lastWeekReset) error:', e));
  }, [lastWeekReset, appDataLoaded]);

  // ── Milestone helper ─────────────────────────────────────────────────────────
  // Kid-milestone DB writes whose kid row id wasn't resolvable yet (e.g. kids not
  // fully synced at trigger time). Flushed by an effect once ids are available so
  // the write is never silently dropped (Finding B).
  const pendingMilestoneWrites = useRef<{ kidName: string; milestoneId: string }[]>([]);
  // (kidName:choreId) pairs that were rejected and are awaiting re-approval — drives
  // the Grudging Respect milestone. In-memory only (a moment trigger, not durable).
  const rejectedThenResubmitted = useRef<Set<string>>(new Set());

  const checkMilestone = useCallback(async (id: string, kidName?: string) => {
    const def = getMilestone(id);
    if (!def) return;
    // Parent milestones belong to the parent; kid milestones to a specific kid.
    const isParent = def.audience === 'parent';
    const name  = kidName ?? currentKidName;
    const owner = isParent ? PARENT_OWNER : name;
    const wasNew = await earnMilestone(owner, id);
    if (!wasNew) return;
    setToastMid(id);
    setActiveToast({ def, kidName: isParent ? undefined : name });
    if (isParent) {
      // Persist the full parent-milestone set to Supabase (Part 1 gap) so it
      // survives reinstall / new device, mirroring the other profile *_json state.
      const earned = await getEarnedMilestones(PARENT_OWNER);
      saveAppState({ parent_milestones_json: JSON.stringify(earned) })
        .catch(e => console.warn('[DB] saveAppState (parentMilestones) error:', e));
    } else {
      // Save kid milestones to Supabase under that kid; queue for retry if the
      // kid row id isn't resolvable yet (Finding B).
      const kidDbId = setupChildren.find(c => c.name === name)?.id;
      if (kidDbId) {
        saveMilestoneToDb({ kidId: kidDbId, milestoneId: id }).catch(e => console.warn('[DB] saveMilestoneToDb error:', e));
      } else {
        pendingMilestoneWrites.current.push({ kidName: name, milestoneId: id });
      }
    }
  }, [currentKidName, setupChildren]);

  // Flush queued kid-milestone writes once their kid row ids become available.
  useEffect(() => {
    if (pendingMilestoneWrites.current.length === 0) return;
    const stillPending: { kidName: string; milestoneId: string }[] = [];
    for (const w of pendingMilestoneWrites.current) {
      const kidDbId = setupChildren.find(c => c.name === w.kidName)?.id;
      if (kidDbId) {
        saveMilestoneToDb({ kidId: kidDbId, milestoneId: w.milestoneId }).catch(e => console.warn('[DB] saveMilestoneToDb (retry) error:', e));
      } else {
        stillPending.push(w);
      }
    }
    pendingMilestoneWrites.current = stillPending;
  }, [setupChildren]);

  // ── Trophy DB-write retry queue (Gap 6) ──────────────────────────────────────
  // Boss captures and collectibles are written to local storage on earn, but
  // their Supabase copy needs the kid's row id. If that id isn't resolved yet
  // (e.g. kids not fully synced at earn time) the write was previously dropped
  // silently. Queue it and flush once ids are available — mirrors the milestone
  // retry queue above so the durable copy is never lost.
  type PendingTrophyWrite =
    | { kind: 'boss'; kidName: string; bossName: string; xpEarned: number; coinsEarned: number; completionPct: number }
    | { kind: 'collectible'; kidName: string; collectibleId: string; rarity: string };
  const pendingTrophyWrites = useRef<PendingTrophyWrite[]>([]);

  const writeTrophyToDb = useCallback((w: PendingTrophyWrite, kidDbId: string) => {
    if (w.kind === 'boss') {
      // bossName is fixed game content (from BOSSES), not kid PII — safe to log.
      log('boss.capture', { kidId: kidDbId, bossName: w.bossName, xpEarned: w.xpEarned, coinsEarned: w.coinsEarned, completionPct: w.completionPct });
      saveBossCaptureToDb({ kidId: kidDbId, bossName: w.bossName, xpEarned: w.xpEarned, coinsEarned: w.coinsEarned, completionPct: w.completionPct })
        .catch(e => console.warn('[DB] saveBossCaptureToDb error:', e));
    } else {
      log('collectible.earn', { kidId: kidDbId, collectibleId: w.collectibleId, rarity: w.rarity });
      saveCollectibleToDb({ kidId: kidDbId, collectibleId: w.collectibleId, rarity: w.rarity })
        .catch(e => console.warn('[DB] saveCollectibleToDb error:', e));
    }
  }, []);

  const queueOrWriteTrophy = useCallback((w: PendingTrophyWrite) => {
    const kidDbId = setupChildren.find(c => c.name === w.kidName)?.id;
    if (kidDbId) writeTrophyToDb(w, kidDbId);
    else pendingTrophyWrites.current.push(w);
  }, [setupChildren, writeTrophyToDb]);

  // Flush queued trophy writes once their kid row ids become available.
  useEffect(() => {
    if (pendingTrophyWrites.current.length === 0) return;
    const stillPending: PendingTrophyWrite[] = [];
    for (const w of pendingTrophyWrites.current) {
      const kidDbId = setupChildren.find(c => c.name === w.kidName)?.id;
      if (kidDbId) writeTrophyToDb(w, kidDbId);
      else stillPending.push(w);
    }
    pendingTrophyWrites.current = stillPending;
  }, [setupChildren, writeTrophyToDb]);

  // Recompute every count/streak/total-derived milestone from durable history and
  // award any that are now satisfied. Idempotent (earnMilestone dedupes), so it's
  // safe to call liberally — after approvals, payouts, battles, and on load. The
  // event-only milestones (timestamps, one-shots) fire inline at their triggers.
  const runMilestoneSweep = useCallback(async () => {
    const today = getSimulatedToday(debugDayOffset);
    const todayIsSunday = new Date(today).getDay() === 0;
    const allKidNames = setupChildren.map(c => c.name);
    const toDay = (iso: string) => new Date(iso).toDateString();

    // ── Parent-scoped ──
    const parentEntries = choreHistory.map(e => ({ kidName: e.kidName, date: toDay(e.approvedAt) }));
    const lifetimePaidCents = payoutLog.reduce((s, p) => s + p.amount, 0);
    const everyKidHasChore = allKidNames.length > 0 &&
      allKidNames.every(n => managedChores.some(c => c.assignedTo.length === 0 || c.assignedTo.includes(n)));
    // Awaited so the read-modify-write inside earnMilestone can't race itself when
    // several milestones become earnable at once (e.g. on first load).
    for (const id of evalParentMilestones({ entries: parentEntries, allKidNames, lifetimePaidCents, everyKidHasChore })) {
      await checkMilestone(id);
    }

    // ── Per-kid-scoped ──
    // Monday key of the previous week, derived from the (debug-aware) today.
    const prevWeekMonday = (() => {
      const d = new Date(today); d.setDate(d.getDate() - 7);
      return weekMondayKeyForDate(d);
    })();

    for (const name of allKidNames) {
      const mine = choreHistory.filter(e => e.kidName === name);
      const approvalDates = mine.map(e => toDay(e.approvedAt));
      const lifetimeEarnedCents = mine.reduce((s, e) => s + e.earnedCents, 0);
      const [cols, caps] = await Promise.all([getCollectibles(name), getBossCaptures(name)]);

      const myChores = managedChores.filter(c => c.assignedTo.length === 0 || c.assignedTo.includes(name));
      const target = myChores.reduce((s, c) => s + frequencyToWeeklyTarget(c.frequency), 0);
      const doneThisWeek = myChores.reduce((s, c) => s + getChoreCompletions(c, name), 0);
      const weekTargetMet = target > 0 && doneThisWeek >= target;

      // Previous week (Mon–Sun) approvals from history, vs the current target (proxy
      // — historical assignment data isn't retained, so the live target stands in).
      const prevWeekApprovals = mine.filter(e => weekMondayKeyForDate(new Date(e.approvedAt)) === prevWeekMonday).length;
      const prevWeekTargetMet = target > 0 && prevWeekApprovals >= target;

      const todayCompletions = approvalDates.filter(d => d === today).length;
      const goal = getKidGoals(name)[0];
      const goalReached = !!goal && (() => {
        const targetCents = Math.round(parseFloat(goal.amount || '0') * 100);
        return targetCents > 0 && goal.savedCents >= targetCents;
      })();

      for (const id of evalKidMilestones({
        approvalDates,
        totalApproved: mine.length,
        lifetimeEarnedCents,
        collectibleCount: cols.length,
        bossCaptureCount: caps.length,
        // kid-undefeated (battle win streak) is awarded inline at battle end; the
        // sweep doesn't track it, so pass 0 to keep this callback stable across
        // XP changes (avoids per-XP AsyncStorage churn).
        battleWinStreak: 0,
        weekTargetMet,
        prevWeekTargetMet,
        goalReached,
        sundayCompletions: todayIsSunday ? todayCompletions : 0,
      })) {
        await checkMilestone(id, name);
      }
    }
  }, [choreHistory, payoutLog, managedChores, setupChildren, debugDayOffset, checkMilestone]);

  // Re-evaluate derived milestones whenever the durable data behind them changes.
  // Runs after the relevant setState commits, so the sweep sees fresh history.
  useEffect(() => {
    if (!appDataLoaded) return;
    runMilestoneSweep();
  }, [choreHistory, payoutLog, managedChores, appDataLoaded, runMilestoneSweep]);

  // Sunday Scaries — opened the app on the weekly boss-reveal day (Sunday).
  useEffect(() => {
    if (!appDataLoaded) return;
    if (new Date(getSimulatedToday(debugDayOffset)).getDay() === 0) checkMilestone('parent-sunday-scaries');
  }, [appDataLoaded, debugDayOffset, checkMilestone]);

  // Grant ONE day's approval for (chore, kidName): consumes a single pending
  // unit — backlog (a prior day's submission) first so today's fresh instance is
  // left intact — and awards that day's coins, XP, history entry, and milestones.
  // `unitIdx` is which queued unit this call pays out (0 = oldest). Batch
  // approval calls this in a loop with i = 0..n-1 against the same pre-click
  // snapshot of `managedChores`, so the index selects each unit's own amount.
  const grantChoreApproval = useCallback((id: string, kidName: string, unitIdx = 0) => {
    const chore = managedChores.find(c => c.id === id);
    if (!chore) return;
    const allKidNames = setupChildren.map(c => c.name);
    // Pay the amount snapshotted when the kid submitted; fall back to the
    // current rate for legacy submissions that predate the snapshot field.
    const earnedCents = chore.childPendingCents?.[kidName]?.[unitIdx]
      ?? Math.round(baseRateCents(baseRate) * DIFFICULTY_MULTIPLIERS[chore.difficulty]);
    const today = getSimulatedToday(debugDayOffset);
    const earnedCoins = earnedCents;
    // XP likewise: pay what was snapshotted at submit (streak bonus already
    // baked in, gated to the first chore of a new day). Legacy submissions
    // without a snapshot fall back to base XP plus a bonus from the kid's LIVE
    // streak — the stored value can be stale once a day is missed.
    const kmAtClick = kidMonsterState[kidName] ?? DEFAULT_KID_MONSTER_STATE;
    const legacyLiveStreak = liveStreak(kmAtClick.currentStreak, kmAtClick.lastChoreDate, today);
    let legacyXp = XP_BY_DIFFICULTY[chore.difficulty];
    if (legacyLiveStreak > 0 && legacyLiveStreak % 7 === 0) legacyXp += 25;
    else if (legacyLiveStreak > 0 && legacyLiveStreak % 3 === 0) legacyXp = Math.round(legacyXp * 1.1);
    const earnedXp = chore.childPendingXp?.[kidName]?.[unitIdx] ?? legacyXp;

    // Consume one pending unit. Backlog first (oldest), else today's live pending.
    setManagedChores(prev => prev.map(c => {
      if (c.id !== id) return c;
      const backlog = c.childPendingCount?.[kidName] ?? 0;
      const consumed = shiftPendingCents(c, kidName);
      if (backlog > 0) return decPendingBacklog(bumpCompletionCount(consumed, kidName), kidName);
      return applyChoreCompletion(consumed, kidName, allKidNames);
    }));

    setWeekApprovalDays(prev => prev.includes(today) ? prev : [...prev, today]);
    setChoreHistory(prev => [{
      id: `${id}-${kidName}-${Date.now()}-${(approvalSeq.current++)}`,
      choreName: chore.name,
      kidName,
      earnedCents,
      // Stamp with the simulated date so "earned this week" filters correctly when
      // debug-scrubbing days (identical to real time when debugDayOffset is 0).
      approvedAt: new Date(Date.now() + debugDayOffset * 86_400_000).toISOString(),
      icon: chore.icon,
      bg: chore.bg,
    }, ...prev]);
    addKidCoins(kidName, earnedCoins);
    setKidMonster(kidName, s => {
      // The streak already advanced when the kid submitted, so approval only
      // pays out the snapshotted XP/coins. Updaters must stay pure: crossing
      // the evolution threshold just raises pendingEvolution — the dedicated
      // effect shows the evolve screen when this kid is (or becomes) active.
      const newXp = s.xp + earnedXp;
      return {
        ...s,
        xp: newXp,
        weeklyXp: s.weeklyXp + earnedXp,
        pendingEvolution: (s.monsterIdx < MONSTERS.length - 1 && newXp >= MONSTERS[s.monsterIdx].needed) ? true : s.pendingEvolution,
      };
    });
    setKidGoals(kidName, prev => {
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

    // ── Milestone triggers ────────────────────────────────────────────────────
    // Count/streak/total-derived milestones (first-chore, chores-10/50, streak-3,
    // no-days-off, week-warrior, money-*, goal-getter, …) are awarded by
    // runMilestoneSweep, fired from the [choreHistory] effect once this approval
    // commits to durable state. Here we only fire the EVENT-only ones that need
    // the approval moment's context (timestamps, one-shots).
    checkMilestone('parent-first-approval');
    const hour = new Date().getHours();
    if (hour >= 22) checkMilestone('parent-night-owl');
    if (hour < 7)   checkMilestone('parent-morning-person');
    // Quick Draw — approved within 5 minutes of the kid's submission.
    const submittedAt = chore.childSubmittedAt?.[kidName];
    if (submittedAt && Date.now() - new Date(submittedAt).getTime() <= 5 * 60_000) {
      checkMilestone('parent-quick-draw');
    }
    // Grudging Respect — this (chore, kid) was rejected earlier, then resubmitted
    // and is now being approved.
    const rejectKey = `${kidName}:${id}`;
    if (rejectedThenResubmitted.current.has(rejectKey)) {
      rejectedThenResubmitted.current.delete(rejectKey);
      checkMilestone('grudging-respect', kidName);
    }

    // Save to Supabase
    const kidDbId = getKidDbId(kidName);
    if (kidDbId) {
      ensureChoreInDb(id).then(realId => {
        if (realId) approveChoreCompletion({ choreId: realId, kidId: kidDbId, earnedCents, choreName: chore.name, kidName, icon: typeof chore.icon === 'string' ? chore.icon : '✅' }).catch(e => console.warn('[DB] approveChoreCompletion error:', e));
      });
    }
  }, [managedChores, choreHistory, baseRate, viewMode, currentKidName, debugDayOffset, checkMilestone, kidCoins, kidMonsterState, addKidCoins, setupChildren, ensureChoreInDb]);

  // Approve a single day (the oldest pending submission).
  const approveManagedChore = useCallback((id: string, kidName: string) => {
    const chore = managedChores.find(c => c.id === id);
    if (!chore || getPendingCount(chore, kidName) <= 0) return;
    log('chore.approve', { choreId: id, kidId: getKidDbId(kidName), pending: getPendingCount(chore, kidName) });
    grantChoreApproval(id, kidName);
  }, [managedChores, grantChoreApproval]);

  // Approve every pending day at once — grants each day's pay/XP separately.
  const approveAllManagedChore = useCallback((id: string, kidName: string) => {
    const chore = managedChores.find(c => c.id === id);
    if (!chore) return;
    const n = getPendingCount(chore, kidName);
    for (let i = 0; i < n; i++) grantChoreApproval(id, kidName, i);
  }, [managedChores, grantChoreApproval]);

  const rejectManagedChore = useCallback((id: string, note: string, kidName: string) => {
    // Reject one pending unit — backlog (oldest) first, else today's live pending.
    setManagedChores(prev => prev.map(c => {
      if (c.id !== id) return c;
      const hasBacklog = (c.childPendingCount?.[kidName] ?? 0) > 0;
      // When today's submission is ALSO still pending, consume ONLY the backlog
      // unit and leave the live submission in the queue — touching the status
      // here would silently discard it (mirrors grantChoreApproval). The note is
      // dropped: it only renders while the kid's status is 'rejected'.
      if (hasBacklog && getChoreStatus(c, kidName) === 'pending') {
        return decPendingBacklog(shiftPendingCents(c, kidName), kidName);
      }
      // Otherwise surface the note and reopen the chore so the kid can redo it.
      const consumed = shiftPendingCents(c, kidName);
      const base = hasBacklog ? decPendingBacklog(consumed, kidName) : consumed;
      // Shared chores were locked for the whole household when this kid claimed it
      // (others marked 'approved'). A rejection unclaims it, so reopen it for every
      // eligible kid — not just the submitter — and clear their stand-in 'approved'.
      if (!isIndependentChore(c)) {
        const childStatus: Record<string, ChoreStatus> = { ...base.childStatus };
        for (const k of choreEligibleKids(c, setupChildren.map(x => x.name))) {
          childStatus[k] = (k === kidName && note) ? 'rejected' : 'active';
        }
        return {
          ...base,
          status: 'active' as ChoreStatus,
          childStatus,
          childRejectionNote: note ? { ...base.childRejectionNote, [kidName]: note } : base.childRejectionNote,
        };
      }
      return {
        ...base,
        childStatus: { ...base.childStatus, [kidName]: (note ? 'rejected' : 'active') as ChoreStatus },
        childRejectionNote: note ? { ...base.childRejectionNote, [kidName]: note } : base.childRejectionNote,
      };
    }));
    // Milestones: a real rejection (with a note) means the parent didn't just
    // rubber-stamp it, and marks this (chore, kid) so re-approval earns Grudging
    // Respect.
    if (note) {
      checkMilestone('parent-auditor');
      rejectedThenResubmitted.current.add(`${kidName}:${id}`);
    }
    // Save to Supabase
    const kidDbId = getKidDbId(kidName);
    if (kidDbId) {
      ensureChoreInDb(id).then(realId => {
        if (realId) rejectChoreCompletion({ choreId: realId, kidId: kidDbId, rejectionNote: note }).catch(e => console.warn('[DB] rejectChoreCompletion error:', e));
      });
    }
  }, [managedChores, setupChildren, ensureChoreInDb, checkMilestone]);

  const confirmPayout = useCallback((kidName: string) => {
    const amount = kidCoins[kidName] ?? 0;
    // Capture the per-week breakdown BEFORE logging this payout — the new payout
    // entry would otherwise move the "unpaid since" boundary and zero out the weeks.
    const weeks = getUnpaidWeeks(kidName, choreHistory, payoutLog);
    // Chores covered by THIS payout = everything in the unpaid weeks (a payout
    // can span multiple weeks; this week's completion tally would undercount).
    // Fall back to the weekly tally for legacy installs with no chore history.
    const historyCount = weeks.reduce((s, w) => s + w.choreCount, 0);
    const fallbackCount = managedChores
      .filter(c => c.assignedTo.length === 0 || c.assignedTo.includes(kidName))
      .reduce((sum, c) => sum + getChoreCompletions(c, kidName), 0);
    const completedCount = historyCount > 0 ? historyCount : fallbackCount;
    // Anything paid beyond the chore-history total is battle-capture bonus coins —
    // surface it so the weeks breakdown visibly adds up to the amount paid.
    const weeksCents = weeks.reduce((s, w) => s + w.earnedCents, 0);
    const battleBonus = historyCount > 0 && amount > weeksCents ? amount - weeksCents : null;
    setPayoutSnapshot(prev => ({ ...prev, [kidName]: { amount, completedCount, weeks, battleWon: battleBonus != null ? true : null, battleBonus } }));
    resetKidCoins(kidName);
    setPayoutLog(prev => [{ kidName, amount, paidAt: new Date().toISOString() }, ...prev]);
    setKidPayoutPending(prev => ({ ...prev, [kidName]: true }));
    showParentToast(`Paid ${kidName} ${fmtDollars(amount)} ✓`);

    // Milestones: first payout, and Clean Slate when no kid has an unpaid balance
    // left after this payout. (parent-triple-digits / running-tab are lifetime
    // totals handled by the sweep once payoutLog updates.)
    checkMilestone('parent-first-payout');
    const everyoneSettled = setupChildren.every(c => c.name === kidName || (kidCoins[c.name] ?? 0) === 0);
    if (everyoneSettled) checkMilestone('parent-clean-slate');

    // Save to Supabase
    const kidDbId = getKidDbId(kidName);
    log('payout.confirm', { kidId: kidDbId, amountCents: amount, completedCount, weeks: weeks.length, battleBonus });
    if (kidDbId) {
      savePayoutToDb({ kidId: kidDbId, kidName, amountCents: amount }).catch(e => console.warn('[DB] savePayoutToDb error:', e));
    }
  }, [kidCoins, resetKidCoins, choreHistory, payoutLog, managedChores, setupChildren, checkMilestone]);

  const openPayout = useCallback(() => {
    setParentScreen('parentPayout');
  }, []);

  const tierFromPct = (pct: number): ChestTier => {
    if (pct >= 90) return 'Legendary';
    if (pct >= 75) return 'Epic';
    if (pct >= 50) return 'Rare';
    return 'Common';
  };

    const handleBattleEnd = useCallback((result: 'captured' | 'got-away', shardsUsed: number, completionPctOverride?: number, bossOverride?: Boss, remainingBossHp?: number) => {
    const boss = bossOverride ?? activeKidBoss;
    let coinsEarned = 0;
    if (result === 'captured' && battleCoinBonusEnabled) {
      coinsEarned = Math.round(baseRateCents(baseRate) * battleCoinBonusMultiplier);
      addKidCoins(currentKidName, coinsEarned);
      setBonusCoins(coinsEarned);
    } else {
      setBonusCoins(0);
    }
    const xpSnapshot = weeklyXp;
    // Chore completion % — drives the chest tier and the weekly shard grant.
    let pct: number;
    if (completionPctOverride !== undefined) {
      pct = completionPctOverride;
    } else {
      const myChores = managedChores.filter(c => c.assignedTo.length === 0 || c.assignedTo.includes(currentKidName));
      const totalTarget = myChores.reduce((sum, c) => sum + frequencyToWeeklyTarget(c.frequency), 0) || 1;
      const totalDone   = myChores.reduce((sum, c) => sum + getChoreCompletions(c, currentKidName), 0);
      pct = Math.min(100, Math.round((totalDone / totalTarget) * 100));
    }
    setKidMonster(currentKidName, s => {
      // Bank unspent shards: the arena was seeded with the banked balance plus
      // this week's grant (if not yet claimed), so persist what's left after
      // spending — and mark the grant claimed so a re-entry can't re-farm it.
      const entryShards = Math.min(SHARD_CAP, s.shards + (s.weeklyShardsClaimed ? 0 : calcWeeklyShards(pct)));
      return {
        ...s,
        battleResult: result,
        lockedBossName: null,       // the shared bar now lives on the household, not the kid
        weeklyXp: 0,
        shards: Math.max(0, entryShards - shardsUsed),
        weeklyShardsClaimed: true,
        // Consecutive-win counter for the Undefeated milestone: bump on capture,
        // reset on escape.
        battleWinStreak: result === 'captured' ? (s.battleWinStreak ?? 0) + 1 : 0,
      };
    });
    // The battle consumes the week's power (weeklyXp) and hands out rewards, but it
    // does NOT reset the chore board — Sunday is still part of the current week, so
    // chores completed that day stay done. The chore board rolls over only at the
    // real week boundary, handled by the weekly reset effect.

    const now = new Date();
    const weekStart = new Date(now); weekStart.setDate(now.getDate() - now.getDay());
    const weekEnd   = new Date(weekStart); weekEnd.setDate(weekStart.getDate() + 6);
    const fmt = (d: Date) => d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    const weekLabel = `${fmt(weekStart)} – ${fmt(weekEnd)}`;

    if (result === 'got-away') {
      // This kid chipped the SHARED bar but didn't empty it. Lower the family's
      // HP and record them as a participant (with the completion % they fought
      // at) so they're owed a chest when the bar finally drops to zero. No chest
      // yet — they ran. `remainingBossHp` is on the kid's own tier-scaled bar, so
      // store it as a tier-independent fraction.
      const newHpPct = boss.hp > 0
        ? Math.max(0, Math.min(1, (remainingBossHp ?? boss.hp) / boss.hp))
        : 0;
      setHouseholdBoss(prev => {
        const others = prev.participants.filter(p => p.name !== currentKidName);
        return { ...prev, hpPct: newHpPct, participants: [...others, { name: currentKidName, completionPct: pct, xpSnapshot }] };
      });
      setScreen('result');
      return;
    }

    // result === 'captured' → this kid emptied the SHARED bar, so the FAMILY
    // captures the boss. The finisher gets their chest now; every OTHER kid who
    // wore him down this cycle is owed a co-op chest (sized to their own
    // completion %), shown the next time they open their profile.
    setCoopWin({ familyCaptured: true, fightsLeft: 0, totalFighters: householdKidNames.length, bossName: boss.name });

    const owed = householdBoss.participants.filter(p => householdKidNames.includes(p.name) && p.name !== currentKidName);
    for (const p of owed) {
      const pBoss  = bossForKid(householdIdentity, (kidMonsterState[p.name] ?? DEFAULT_KID_MONSTER_STATE).monsterIdx);
      const pCoins = battleCoinBonusEnabled ? Math.round(baseRateCents(baseRate) * battleCoinBonusMultiplier) : 0;
      if (pCoins > 0) addKidCoins(p.name, pCoins);
      checkMilestone('boss-slayer', p.name);
      saveBossCapture(p.name, {
        id:            `${Date.now()}-${boss.name}-${p.name}`,
        bossName:      boss.name,
        capturedAt:    now.toISOString(),
        weekLabel,
        weakness:      boss.weakness,
        threat:        boss.threat,
        completionPct: p.completionPct,
        coinsEarned:   pCoins,
        xpEarned:      p.xpSnapshot,
      }).catch(() => {});
      queueOrWriteTrophy({ kind: 'boss', kidName: p.name, bossName: boss.name, xpEarned: p.xpSnapshot, coinsEarned: pCoins, completionPct: p.completionPct });
      setKidMonster(p.name, s => ({
        ...s,
        pendingCoopChest: { bossName: boss.name, weakness: boss.weakness, threat: boss.threat, completionPct: p.completionPct, xpEarned: p.xpSnapshot, coinsEarned: pCoins },
      }));
    }

    // Rotate the family to a fresh, full-HP boss and clear the participant ledger.
    setHouseholdBoss(prev => {
      const next = pickHouseholdBoss(householdTier, debugDayOffset, prev.bossName || boss.name);
      return { bossName: next.name, hpPct: 1, participants: [] };
    });

    // The finisher's own chest (existing flow).
    setChorePctAtBattle(pct);
    const t = tierFromPct(pct);
    setChestTier(t);
    setChestCollectible(pickForTier(t));
    checkMilestone('boss-slayer', currentKidName);
    // Undefeated — 4 captures in a row with no escape. Compute the post-win
    // streak from the pre-battle value (state update above hasn't committed yet).
    const winStreak = ((kidMonsterState[currentKidName] ?? DEFAULT_KID_MONSTER_STATE).battleWinStreak ?? 0) + 1;
    if (winStreak >= 4) checkMilestone('kid-undefeated', currentKidName);

    saveBossCapture(currentKidName, {
      id:            `${Date.now()}-${boss.name}`,
      bossName:      boss.name,
      capturedAt:    now.toISOString(),
      weekLabel,
      weakness:      boss.weakness,
      threat:        boss.threat,
      completionPct: pct,
      coinsEarned,
      xpEarned:      xpSnapshot,
    }).catch(() => {});

    // Also save to Supabase — queued + retried if the kid row id isn't ready (Gap 6).
    queueOrWriteTrophy({ kind: 'boss', kidName: currentKidName, bossName: boss.name, xpEarned: xpSnapshot, coinsEarned, completionPct: pct });

    setScreen('chestReveal');
  }, [monsterIdx, activeKidBoss, householdBoss, householdIdentity, householdKidNames, householdTier, battleCoinBonusEnabled, battleCoinBonusMultiplier, baseRate, managedChores, weeklyXp, currentKidName, addKidCoins, debugDayOffset, kidMonsterState, checkMilestone]);

  const startBattle = useCallback(() => { setScreen('boss-intro'); }, []);

  const navTab = useCallback((t: Tab) => { setTab(t); setScreen(t); }, []);
  // Include 'trophyRoom' (the standalone trophy room opened from Wallet) so it keeps
  // the bottom nav like the Trophies tab does — otherwise drilling into a trophy and
  // backing out strands the user on a nav-less screen.
  const showTabBar = ['home', 'world', 'wallet', 'trophies', 'trophyRoom'].includes(screen);

  // Deliver a co-op chest the family earned while this kid was away: when the
  // bar was emptied by a sibling, this kid was owed a chest (sized to the
  // completion % they fought at). Fire it the next time they're back on a base
  // tab — never mid-battle — then clear the pending flag so it shows once.
  useEffect(() => {
    if (viewMode !== 'kid' || !currentKidName || !pendingCoopChest) return;
    if (!['home', 'world', 'wallet', 'trophies'].includes(screen)) return;
    const p = pendingCoopChest;
    const tier = tierFromPct(p.completionPct);
    setChorePctAtBattle(p.completionPct);
    setChestTier(tier);
    setChestCollectible(pickForTier(tier));
    setBonusCoins(p.coinsEarned);
    setCoopWin({ familyCaptured: true, fightsLeft: 0, totalFighters: householdKidNames.length, bossName: p.bossName });
    setKidMonster(currentKidName, s => ({ ...s, pendingCoopChest: null }));
    setScreen('chestReveal');
  }, [viewMode, currentKidName, pendingCoopChest, screen]);

  // MON-6 — commit the form advance. Called by HomeScreen once the in-place
  // moment's result modal is dismissed (we're already on the home screen, so no
  // navigation is needed). Clears `pendingEvolution` so it won't re-fire.
  const handleEvolveDone = useCallback(() => {
    setKidMonster(currentKidName, s => ({
      ...s,
      monsterIdx: Math.min(s.monsterIdx + 1, MONSTERS.length - 1) as MonsterIdx,
      // Carry excess XP into the next level rather than dropping it to 0,
      // so a kid who overshoots the threshold doesn't lose those points.
      xp: Math.max(0, s.xp - MONSTERS[s.monsterIdx].needed),
      pendingEvolution: false,
      done: {},
    }));
    // Awarded here — when the evolution actually completes — so every trigger
    // path (auto-approve, parent approval, deferred) earns it exactly once.
    checkMilestone('first-evolution', currentKidName);
    // Stage-based monster milestones. No variant/rarity system exists, so
    // "rare variant" is proxied by reaching the 2nd evolution (Zorphax, idx 5)
    // and "max level" by the final form (Vorthak, last index).
    const newIdx = Math.min((kidMonsterState[currentKidName] ?? DEFAULT_KID_MONSTER_STATE).monsterIdx + 1, MONSTERS.length - 1);
    if (newIdx >= 5) checkMilestone('rare-find', currentKidName);
    if (newIdx >= MONSTERS.length - 1) checkMilestone('full-power', currentKidName);
  }, [currentKidName, checkMilestone, kidMonsterState]);

  // Parent navigation — always track where we came from so back buttons work correctly
  const navParent = (s: ParentScreen) => {
    setPrevParentScreen(parentScreen);
    setParentScreen(s);
    // Keep bottom tab bar in sync
    if (s === 'parentHome')    setParentTab('home');
    else if (s === 'chores' || s === 'addChore' || s === 'editChore') setParentTab('chores');
    else if (s === 'choreLibrary') setParentTab('settings');
    else if (s === 'moneyLedger' || s === 'parentPayout') setParentTab('money');
    else if (s === 'settings' || s === 'payRates' || s === 'rateGuide' || s === 'rewards') setParentTab('settings');
    else if (s === 'kidMilestones') setParentTab('home');
    if (s === 'settings') checkMilestone('parent-read-manual'); // Read the Manual
  };
  const navParentTab = (t: ParentTab) => {
    setParentTab(t);
    // Tab bar taps are root navigations — there's no "back" from here
    setPrevParentScreen('parentHome');
    if (t === 'home')     setParentScreen('parentHome');
    if (t === 'chores')   setParentScreen('chores');
    if (t === 'money')    setParentScreen('moneyLedger');
    if (t === 'settings') { setParentScreen('settings'); checkMilestone('parent-read-manual'); }
  };
  const goBack = () => setParentScreen(prevParentScreen);
  const openEditChore = (chore: ManagedChore) => {
    setPrevParentScreen(parentScreen);
    setEditingChore(chore);
    setParentScreen('editChore');
  };
  const saveChore = (chore: ManagedChore) => {
    let isNew = false;
    setManagedChores(prev => {
      const exists = prev.find(c => c.id === chore.id);
      isNew = !exists;
      return exists ? prev.map(c => c.id === chore.id ? chore : c) : [...prev, chore];
    });
    // The Negotiator — parent created their first custom chore from the editor.
    if (isNew) checkMilestone('parent-negotiator');
    setParentScreen(prevParentScreen === 'choreLibrary' ? 'choreLibrary' : 'chores');

    const iconStr = serializeChoreIcon(chore.icon);
    const assignedIds = chore.assignedTo.map(name => setupChildren.find(c => c.name === name)?.id ?? name);
    const fields = { name: chore.name, icon: iconStr, frequency: chore.frequency, difficulty: chore.difficulty, assigned_to: assignedIds, completion_mode: chore.completionMode ?? null };

    // IDs prefixed with '_' are local-only (not yet in Supabase); bare UUIDs are already saved
    if (chore.id.startsWith('_')) {
      addChore(fields).then(row => {
        if (row?.id) setManagedChores(prev => prev.map(c => c.id === chore.id ? { ...c, id: row.id } : c));
      }).catch(e => console.warn('[DB] addChore error:', e));
    } else {
      updateChoreDb(chore.id, fields).catch(e => console.warn('[DB] updateChore error:', e));
    }
  };
  const deleteChore = (id: string) => {
    setManagedChores(prev => prev.filter(c => c.id !== id));
    setParentScreen(prevParentScreen === 'choreLibrary' ? 'choreLibrary' : 'chores');
    if (!id.startsWith('_')) deleteChoreDb(id).catch(e => console.warn('[DB] deleteChore error:', e));
  };

  const addGoal = useCallback((data: GoalData) => {
    const goal: SavedGoal = {
      id: Date.now().toString(),
      name: data.name,
      amount: data.amount,
      category: data.category,
      color: data.color,
      iconKey: data.iconKey,
      icon: goalIconSource(data.iconKey),
      savedCents: getKidCoins(currentKidName),   // credit whatever the kid has already earned
      milestones: ['Keep it up!', 'Halfway there!', 'Almost done!', 'Goal unlocked!'],
      activityFeed: [],
    };
    setKidGoals(currentKidName, prev => [...prev, goal]);
  }, [getKidCoins, currentKidName]);

  const editGoal = useCallback((updated: SavedGoal) => {
    setKidGoals(currentKidName, prev => prev.map(g => g.id === updated.id ? updated : g));
  }, [currentKidName]);

  const deleteGoal = useCallback((id: string) => {
    setKidGoals(currentKidName, prev => prev.filter(g => g.id !== id));
  }, [currentKidName]);

  // ── Parent PIN gate ─────────────────────────────────────────────────────
  // Switching from a kid into parent view; prompt for the PIN if one is set.
  const requestParentMode = useCallback(() => {
    if (parentPinEnabled && parentPin) setPinModalOpen(true);
    else setViewMode('parent');
  }, [parentPinEnabled, parentPin]);

  const saveParentPin = useCallback((pin: string) => {
    setParentPin(pin);
    setParentPinEnabled(true);
    saveProfile({ parent_pin: pin, parent_pin_enabled: true }).catch(e => console.warn('[DB] saveParentPin error:', e));
  }, []);

  const disableParentPin = useCallback(() => {
    setParentPin('');
    setParentPinEnabled(false);
    saveProfile({ parent_pin: null, parent_pin_enabled: false }).catch(e => console.warn('[DB] disableParentPin error:', e));
  }, []);

  const handleSignOut = useCallback(async () => {
    await supabase.auth.signOut();
    try {
      const allKeys = await AsyncStorage.getAllKeys();
      const toRemove = allKeys.filter(k => k.startsWith('monstir:'));
      if (toRemove.length > 0) await AsyncStorage.multiRemove(toRemove);
    } catch {}
    setSessionUser(null);
    familyIdRef.current = null;   // stop tagging debug-log flushes with the signed-out parent
    setSetupChildren([]);
    setKids([]);
    setManagedChores(DEFAULT_MANAGED_CHORES);
    setChoreHistory([]);
    setPayoutLog([]);
    setGoalsByKid({});
    setWeekApprovalDays([]);
    setKidApprovalSettings({});
    setKidMonsterState({});
    setKidCoins({});
    setPayoutSnapshot({});
    setKidPayoutPending({});
    setAppMode('landing');
  }, []);

  // Avatar index for the currently active kid (0 = fallback)
  const currentKidAvatarIdx = setupChildren.find(c => c.name === currentKidName)?.avatarIdx ?? 0;
  // Cash bonus paid on a boss win: a fraction of the base chore rate (in coins =
  // cents). 0 when the bonus is disabled. Shown as the battle "coins" stake.
  const battleBonusCoins = battleCoinBonusEnabled ? Math.round(baseRateCents(baseRate) * battleCoinBonusMultiplier) : 0;

  // DB ID for a kid by name (set after onboarding/load from Supabase).
  // Returns null unless the id is a real Supabase UUID — kids briefly carry a
  // temporary local id (Date.now()) before addKid/saveOnboardingSetup resolves,
  // and writing against that temp id is silently rejected by Supabase.
  const getKidDbId = (name: string): string | null => {
    const id = setupChildren.find(c => c.name === name)?.id;
    return id && isUUID(id) ? id : null;
  };

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
        <StatusBar barStyle="dark-content" />
        <OnboardingFlow
          onReady={() => setAppMode('roleSelect')}
        />
      </SafeAreaProvider>
    );
  }

  if (appMode === 'roleSelect') {
    return (
      <SafeAreaProvider>
        <StatusBar barStyle="dark-content" />
        <RoleSelectScreen
          onParent={() => setAppMode('landing')}
          onKid={() => setAppMode('kidPairing')}
        />
      </SafeAreaProvider>
    );
  }

  if (appMode === 'kidPairing') {
    return (
      <SafeAreaProvider>
        <StatusBar barStyle="dark-content" />
        <KidPairingScreen
          onBack={() => setAppMode('roleSelect')}
          onSubmit={() => {
            // Phase 1 scaffold: no backend validation — preview the kid setup.
            setKidWelcomeName('there');
            setKidWelcomePreview(true);
            setAppMode('kidWelcome');
          }}
        />
      </SafeAreaProvider>
    );
  }

  if (appMode === 'landing') {
    return (
      <SafeAreaProvider>
        <SafeAreaView style={{ flex: 1, backgroundColor: '#C5F215' }}>
          <StatusBar barStyle="dark-content" backgroundColor="#C5F215" />
          <LandingScreen
            onEmailPath={() => setAppMode('login')}
            // Social sign-in already established a Supabase session — hydrate from it
            // the same way email login does (loader routes into the app shell).
            onSocialSuccess={() => loadUserDataFromSupabase()}
            // Dev quick-login establishes a session the same way; hydrate identically.
            onDevSuccess={() => loadUserDataFromSupabase()}
          />
        </SafeAreaView>
      </SafeAreaProvider>
    );
  }

  if (appMode === 'login') {
    return (
      <SafeAreaProvider>
        <SafeAreaView style={{ flex: 1, backgroundColor: '#C5F215' }}>
          <StatusBar barStyle="dark-content" backgroundColor="#C5F215" />
          <LoginScreen
            onBack={() => setAppMode('landing')}
            onSuccess={() => loadUserDataFromSupabase()}
            onSignUp={() => setAppMode('signup')}
            onForgotPassword={() => setAppMode('forgotPassword')}
            onUnconfirmed={(email) => { setPendingAuthEmail(email); setCheckEmailMode('confirm'); setAppMode('checkEmail'); }}
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
            onLogin={() => setAppMode('login')}
            onConfirmPending={(user) => {
              setPendingAuthEmail(user.email);
              setPendingAuthName(user.name);
              setCheckEmailMode('confirm');
              setAppMode('checkEmail');
            }}
            initialName={pendingAuthName}
            initialEmail={pendingAuthEmail}
          />
        </SafeAreaView>
      </SafeAreaProvider>
    );
  }

  if (appMode === 'checkEmail') {
    return (
      <SafeAreaProvider>
        <SafeAreaView style={{ flex: 1, backgroundColor: '#C5F215' }}>
          <StatusBar barStyle="dark-content" backgroundColor="#C5F215" />
          <CheckEmailScreen
            email={pendingAuthEmail}
            mode={checkEmailMode}
            onBack={() => setAppMode(checkEmailMode === 'confirm' ? 'signup' : 'login')}
          />
        </SafeAreaView>
      </SafeAreaProvider>
    );
  }

  if (appMode === 'forgotPassword') {
    return (
      <SafeAreaProvider>
        <SafeAreaView style={{ flex: 1, backgroundColor: '#C5F215' }}>
          <StatusBar barStyle="dark-content" backgroundColor="#C5F215" />
          <ForgotPasswordScreen
            onBack={() => setAppMode('login')}
            onSent={(email) => { setPendingAuthEmail(email); setCheckEmailMode('reset'); setAppMode('checkEmail'); }}
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
          onComplete={async (setup) => {
            const names = setup.children.map(c => c.name.trim()).filter(Boolean);
            setSetupChildren(setup.children);
            setKids(names);
            setKidApprovalSettings(Object.fromEntries(names.map(k => [k, true])));
            if (names.length > 0) setCurrentKidName(names[0]);
            if (setup.parentRole) setParentRole(setup.parentRole);

            // MON-85: one shared chore set for the whole family. Each selected
            // chore becomes a single row assigned to everyone (assignedTo: []),
            // so kids added later inherit it too; parents reassign to specific
            // kids afterward.
            const newChores: ManagedChore[] = setup.sharedChoreIds
              .map(choreId => setup.choreMap[choreId])
              .filter((entry): entry is import('./src/screens/ParentOnboarding').ChoreMapEntry => !!entry)
              .map(entry => ({
                id: '_' + randomUUID(),
                name: entry.name,
                description: '',
                frequency: entry.frequency ?? 'Every day',
                icon: entry.icon,
                bg: entry.iconBg,
                status: 'active' as const,
                difficulty: (entry.difficulty === 'Hard' ? 3 : entry.difficulty === 'Medium' ? 2 : 1) as 1 | 2 | 3,
                assignedTo: [],
                completionMode: entry.completionMode,
                weeklyCompletions: 0,
              }));
            setManagedChores(newChores.length > 0 ? newChores : DEFAULT_MANAGED_CHORES);
            // Clear any stale chore data from a previous session
            AsyncStorage.removeItem('monstir:managedChores').catch(() => {});
            AsyncStorage.removeItem('monstir:choreHistory').catch(() => {});
            AsyncStorage.removeItem('monstir:weekApprovalDays').catch(() => {});

            setViewMode('parent');
            setAppMode('app');

            // Save to Supabase in background
            try {
              const choreIdToName = Object.fromEntries(
                Object.entries(setup.choreMap).map(([id, e]) => [id, { name: e.name, icon: id, difficulty: e.difficulty, frequency: e.frequency ?? 'Every day', completionMode: e.completionMode }])
              );
              const { kidIdMap, choreNameToId } = await saveOnboardingSetup(setup, choreIdToName);
              // Replace temporary local kid IDs with real Supabase UUIDs
              setSetupChildren(prev => prev.map(c => kidIdMap[c.name] ? { ...c, id: kidIdMap[c.name] } : c));
              // Replace _-prefixed local chore IDs with real Supabase UUIDs so kids
              // can submit completions immediately without hitting a UUID format error
              if (Object.keys(choreNameToId).length > 0) {
                setManagedChores(prev => prev.map(c => choreNameToId[c.name] ? { ...c, id: choreNameToId[c.name] } : c));
              }
            } catch (e) {
              console.warn('[DB] Failed to save onboarding setup:', e);
            }
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
              // Phase 1: reached via the stubbed pairing flow → preview only, no
              // profile write / app entry (no authenticated kid device yet).
              if (kidWelcomePreview) {
                setKidWelcomePreview(false);
                setAppMode('roleSelect');
                return;
              }
              const validId: MonsterId = (monsterId === 'slime' || monsterId === 'robot' || monsterId === 'flamer') ? monsterId : 'slime';
              setKidMonster(currentKidName, s => ({
                ...s,
                selectedMonsterId: validId,
                selectedMonsterName: monsterName,
              }));
              setKidOnboardingDone(prev => ({ ...prev, [currentKidName]: true }));
              // Persist monster choice and onboarding-done flag to Supabase. If
              // the kid's UUID hasn't landed yet, queue the write so it isn't
              // silently dropped (and the kid re-prompted) on the next reload.
              const welcomePayload = { monster_id: validId, monster_name: monsterName, kid_onboarding_done: true as const };
              const kidDbId = getKidDbId(currentKidName);
              if (kidDbId) {
                updateKid(kidDbId, welcomePayload).catch(e => console.warn('[DB] updateKid (kidWelcome) error:', e));
              } else {
                pendingKidWelcomeWrites.current[currentKidName] = welcomePayload;
              }
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
            {screen === 'home'     && <ErrorBoundary key={`home-${currentKidName}`}><HomeScreen   key={currentKidName} initialAvatarIdx={currentKidAvatarIdx} monsterIdx={monsterIdx} monsterName={effectiveMonsterName} xp={xp} coins={getKidCoins(currentKidName)} managedChores={managedChores} onCompleteManaged={submitManagedChore} currentKidName={currentKidName} onSwitchToParent={requestParentMode} onOpenDebug={openDebug} dbgMonsterSize={dbgMonsterSize} dbgMonsterY={dbgMonsterY} dbgPlatformSize={dbgPlatformSize} dbgPlatformY={dbgPlatformY} monsterImg={currentMonsterImg} platformImg={platformImg} platformAspect={platformAspect} baseRate={baseRate} parentRole={parentRole} requireApproval={requireApproval} onNavigateToWallet={() => { setTab('wallet'); setScreen('wallet'); }} onRenameMonster={(name: string) => {
                  setKidMonster(currentKidName, s => ({ ...s, selectedMonsterName: name }));
                  const kidDbId = getKidDbId(currentKidName);
                  if (kidDbId) updateKidStats(kidDbId, { monster_name: name }).catch(e => console.warn('[DB] rename monster error:', e));
                }} kidProfiles={setupChildren.map(c => ({ name: c.name, avatarColor: c.avatarColor, avatarIdx: c.avatarIdx }))} onSwitchToKid={switchToKid} nextMonsterImg={nextMonsterImg} evolutionAutoOpen={pendingEvolution} onConsumeAutoOpen={() => setKidMonster(currentKidName, s => ({ ...s, pendingEvolution: false }))} onEvolveComplete={handleEvolveDone} /></ErrorBoundary>}
            {screen === 'world'      && <ErrorBoundary key={`world-${currentKidName}`}><WorldScreen key={currentKidName} initialAvatarIdx={currentKidAvatarIdx} monsterIdx={monsterIdx} coins={getKidCoins(currentKidName)} done={done} xp={xp} weeklyXp={weeklyXp} managedChores={managedChores} onStartBattle={startBattle} onSwitchToParent={requestParentMode} onNavigateToWallet={() => { setTab('wallet'); setScreen('wallet'); }} monsterName={effectiveMonsterName} currentKidName={currentKidName} kidProfiles={setupChildren.map(c => ({ name: c.name, avatarColor: c.avatarColor, avatarIdx: c.avatarIdx }))} onSwitchToKid={switchToKid} currentBoss={activeKidBoss} debugDayOffset={debugDayOffset} weekApprovalDays={weekApprovalDays} parentRole={parentRole} battleCoinBonusEnabled={battleCoinBonusEnabled} battleBonusCoins={battleBonusCoins} bossHpPct={householdHpPct} totalFighters={householdKidNames.length} battledThisWeek={battleResult !== null} /></ErrorBoundary>}
            <Modal visible={screen === 'boss-intro'} animationType="fade" statusBarTranslucent transparent={false}>
              <ErrorBoundary><BossIntroScreen monsterIdx={monsterIdx} onReady={() => setScreen('arena')} bossOverride={dbgBattleActive ? BOSSES[dbgBossIdx] : activeKidBoss} battleCoinBonusEnabled={battleCoinBonusEnabled} battleBonusCoins={battleBonusCoins} /></ErrorBoundary>
            </Modal>
            {screen === 'arena'      && <ErrorBoundary key="arena">{(() => {
              if (dbgBattleActive) {
                const totalPower = calcPowerRating(dbgCompletionPct, monsterIdx, dbgWeaknessUnlocked ? 5 : 0);
                return <BattleArenaScreen
                  monsterIdx={monsterIdx} monsterImg={currentMonsterImg} monsterName={effectiveMonsterName} monsterId={selectedMonsterId}
                  totalPower={totalPower} completionPct={dbgCompletionPct} shards={dbgShards} weaknessUnlocked={dbgWeaknessUnlocked}
                  guaranteedWin={dbgCompletionPct >= 100} onBattleEnd={(r, u, remainingHp) => { setDbgBattleActive(false); handleBattleEnd(r, u, dbgCompletionPct, BOSSES[dbgBossIdx], remainingHp); }}
                  bossOverride={BOSSES[dbgBossIdx]}
                  initialBossHp={Math.round(householdHpPct * BOSSES[dbgBossIdx].hp)}
                />;
              }
              const myChores = managedChores.filter(c => c.assignedTo.length === 0 || c.assignedTo.includes(currentKidName));
              const totalWeeklyTarget = myChores.reduce((sum, c) => sum + frequencyToWeeklyTarget(c.frequency), 0) || 1;
              const totalWeeklyDone   = myChores.reduce((sum, c) => sum + getChoreCompletions(c, currentKidName), 0);
              const completionPct = Math.min(100, Math.round((totalWeeklyDone / totalWeeklyTarget) * 100));
              const totalPower = calcPowerRating(completionPct, monsterIdx, liveCurrentStreak);
              // The weekly grant is claimed once per week (first battle entry);
              // re-entering after an escape brings only the banked balance.
              const battleShards = Math.min(SHARD_CAP, shards + (weeklyShardsClaimed ? 0 : calcWeeklyShards(completionPct)));
              const weaknessUnlocked = completionPct >= 50 && liveCurrentStreak >= 5;
              const guaranteedWin = completionPct >= 100;
              const currentBoss = activeKidBoss;
              return <BattleArenaScreen
                monsterIdx={monsterIdx} monsterImg={currentMonsterImg} monsterName={effectiveMonsterName} monsterId={selectedMonsterId}
                totalPower={totalPower} completionPct={completionPct} shards={battleShards} weaknessUnlocked={weaknessUnlocked}
                guaranteedWin={guaranteedWin} onBattleEnd={(r, u, remainingHp) => handleBattleEnd(r, u, undefined, undefined, remainingHp)}
                bossOverride={currentBoss}
                initialBossHp={Math.round(householdHpPct * currentBoss.hp)}
              />;
            })()}</ErrorBoundary>}
            {screen === 'result'   && <ErrorBoundary key="result"><ResultScreen monsterIdx={monsterIdx} captured={battleResult === 'captured'} bonusCoins={bonusCoins} onDone={() => { setTab('home'); setScreen('home'); }} monsterImg={currentMonsterImg} bossName={householdIdentity.name} /></ErrorBoundary>}
            {screen === 'chestReveal' && (
              <ErrorBoundary key="chestReveal">
                <ChestReveal
                  tier={chestTier}
                  completionPct={chorePctAtBattle}
                  collectible={chestCollectible}
                  weekLabel={new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                  onDone={() => { setTrophyOrigin('home'); setScreen('trophyRoom'); }}
                  kidName={currentKidName}
                  kidDbId={getKidDbId(currentKidName)}
                  onQueueDbWrite={(kidName, collectibleId, rarity) => queueOrWriteTrophy({ kind: 'collectible', kidName, collectibleId, rarity })}
                  bossName={coopWin?.bossName}
                  coopFamilyCaptured={coopWin?.familyCaptured}
                  coopFightsLeft={coopWin?.fightsLeft}
                  coopTotalFighters={coopWin?.totalFighters}
                />
              </ErrorBoundary>
            )}
            {screen === 'trophyRoom' && (
              <ErrorBoundary key="trophyRoom">
                <TrophyRoom
                  monsterIdx={monsterIdx}
                  monsterImg={currentMonsterImg}
                  monsterName={effectiveMonsterName}
                  xp={xp}
                  currentKidName={currentKidName}
                  initialRelicKey={trophyInitialKey}
                  onBack={() => { setTrophyInitialKey(undefined); setTab(trophyOrigin); setScreen(trophyOrigin); }}
                />
              </ErrorBoundary>
            )}
            {screen === 'wallet'   && <ErrorBoundary key={`wallet-${currentKidName}`}><WalletScreen key={currentKidName} initialAvatarIdx={currentKidAvatarIdx} coins={getKidCoins(currentKidName)} weeklyEarnedCents={computeKidLedger(currentKidName, getKidCoins(currentKidName), choreHistory, payoutLog, debugDayOffset).earnedThisWeekCents} weeklyHistory={getKidWeeklyHistory(currentKidName, choreHistory, payoutLog, debugDayOffset)} done={done} battleResult={battleResult} monsterIdx={monsterIdx} baseRate={baseRate} goals={getKidGoals(currentKidName)} onAddGoal={addGoal} onOpenGoalFlow={() => setScreen('goalFlow')} currentStreak={liveCurrentStreak} onEditGoal={editGoal} onDeleteGoal={deleteGoal} monsterName={effectiveMonsterName} weeklyXp={weeklyXp} onSwitchToParent={requestParentMode} managedChores={managedChores} currentKidName={currentKidName} kidProfiles={setupChildren.map(c => ({ name: c.name, avatarColor: c.avatarColor, avatarIdx: c.avatarIdx }))} onSwitchToKid={switchToKid} onOpenTrophyRoom={() => { setTrophyInitialKey(undefined); setTrophyOrigin('wallet'); setScreen('trophyRoom'); }}
                onOpenRelicDetail={(key) => { setTrophyInitialKey(key); setTrophyOrigin('wallet'); setScreen('trophyRoom'); }} parentRole={parentRole} /></ErrorBoundary>}
            {screen === 'trophies' && <ErrorBoundary key={`trophies-${currentKidName}`}><TrophyRoom monsterIdx={monsterIdx} monsterImg={currentMonsterImg} monsterName={effectiveMonsterName} xp={xp} currentKidName={currentKidName} isTab header={
                <View style={[s.homeHeader, { backgroundColor: 'transparent' }]}>
                  <View style={s.homeHeaderLeft}>
                    <KidAvatarBadge idx={currentKidAvatarIdx} />
                    <View style={{ gap: 4 }}>
                      <ViewSwitcher
                        selected={currentKidName || 'Kid view'}
                        options={[
                          ...setupChildren.map(k => ({ label: k.name, emoji: '🧒', bg: k.avatarColor || '#EAE4FF', image: getAvatarImage(k.avatarIdx) })),
                          { label: 'Parent view', image: getParentAvatar(parentRole ?? ''), bg: '#C5F215' },
                        ]}
                        onSelect={(opt) => { if (opt.label === 'Parent view') requestParentMode(); else switchToKid(opt.label); }}
                      />
                    </View>
                  </View>
                  <View style={s.homeBalancePill}>
                    <Text style={s.homeBalanceText}>${(getKidCoins(currentKidName) / 100).toFixed(2)}</Text>
                    <Image source={require('./assets/icons/icon-coin.png')} style={{ width: scale(20), height: scale(20) }} resizeMode="contain" />
                  </View>
                </View>
              } currentBossName={householdIdentity.name} {...(() => { const { target, done } = householdChoreTotals(managedChores, setupChildren.map(c => c.name)); return { familyPowerPct: Math.min(100, Math.round((done / (target || 1)) * 100)), choresLeft: Math.max(0, target - done) }; })()} daysLeft={daysUntilSunday(debugDayOffset)} onViewBoss={() => { setTab('world'); setScreen('world'); }} onBack={() => { setTab('wallet'); setScreen('wallet'); }} /></ErrorBoundary>}
            {screen === 'goalFlow' && <GoalCreationFlow onDone={() => setScreen('home')} onCancel={() => setScreen('home')} onGoalCreated={addGoal} monsterName={effectiveMonsterName} />}
            {screen === 'kidPayout' && (() => { const lastPayout = payoutLog.find(p => p.kidName === currentKidName); const snap = payoutSnapshot[currentKidName]; return lastPayout ? <KidPayoutScreen amount={lastPayout.amount} completedCount={snap?.completedCount ?? 0} weeks={snap?.weeks ?? []} battleWon={snap?.battleWon ?? null} battleBonus={snap?.battleBonus ?? null} monsterImg={currentMonsterImg} monsterName={effectiveMonsterName} onDismiss={() => { setScreen('home'); setTab('home'); }} /> : null; })()}
            {showTabBar && <TabBar active={screen === 'trophyRoom' ? 'trophies' : tab} onNav={navTab} />}
            <ParentPinModal
              open={pinModalOpen}
              expectedPin={parentPin}
              onSuccess={() => { setPinModalOpen(false); setViewMode('parent'); }}
              onClose={() => setPinModalOpen(false)}
            />
          </>
        ) : (
          <View style={{ flex: 1 }}>
            {/* Persistent parent header — shows on all parent screens */}
            <View style={[p.homeHeader, { backgroundColor: '#FFFFFF', zIndex: 10 }]}>
              <View style={p.homeHeaderLeft}>
                <View style={p.homeAvatar}>
                  <Image source={getParentAvatar(parentRole)} style={{ width: '100%', height: '100%', borderRadius: 999 }} resizeMode="cover" />
                </View>
                <ViewSwitcher
                  selected="Parent view"
                  dark
                  options={[
                    { label: 'Parent view', image: getParentAvatar(parentRole ?? ''), bg: '#C5F215' },
                    ...setupChildren.map(k => ({ label: k.name, emoji: '🧒', bg: k.avatarColor || '#EAE4FF', image: getAvatarImage(k.avatarIdx) })),
                  ]}
                  onSelect={(opt) => { if (opt.label !== 'Parent view') switchToKid(opt.label); }}
                />
              </View>
              <TouchableOpacity style={p.homeBell} activeOpacity={0.7}>
                <Text style={{ fontSize: scale(22) }}>🔔</Text>
              </TouchableOpacity>
            </View>

            {parentScreen === 'parentHome' && <ErrorBoundary key="parentHome"><ParentHomeScreen onNav={navParent} onSwitchToKid={switchToKid} onAddKid={() => openKidModal(null)} onEditKid={k => { const full = setupChildren.find(c => c.name === k.name); if (full) openKidModal(full); }} managedChores={managedChores} onApprove={approveManagedChore} onApproveAll={approveAllManagedChore} onReject={rejectManagedChore} baseRate={baseRate} onPayKid={openPayout} onConfirmPayout={(kn) => { confirmPayout(kn); showParentToast(`✓ Paid ${kn}!`); }} kidName={currentKidName} totalCoins={Object.values(kidCoins).reduce((s, v) => s + v, 0)} kidProfiles={setupChildren.map(c => ({ name: c.name, avatarColor: c.avatarColor, avatarIdx: c.avatarIdx }))} kidCoins={kidCoins} choreHistory={choreHistory} payoutLog={payoutLog} weekApprovalDays={weekApprovalDays} debugDayOffset={debugDayOffset} currentBossName={householdIdentity.name} householdBossHpPct={householdHpPct} householdTotalFighters={householdKidNames.length} /></ErrorBoundary>}
            {parentScreen === 'parentPayout' && <ErrorBoundary key="parentPayout"><ParentPayoutScreen kidCoins={kidCoins} kidProfiles={setupChildren.map(c => ({ name: c.name, avatarColor: c.avatarColor, avatarIdx: c.avatarIdx }))} payoutLog={payoutLog} onConfirm={confirmPayout} onBack={goBack} /></ErrorBoundary>}
            {(parentScreen === 'chores' || parentScreen === 'addChore' || parentScreen === 'editChore') && <ErrorBoundary key="parentChores"><ParentChoresScreen chores={managedChores} history={choreHistory} onBack={goBack} showBack={prevParentScreen === 'settings'} onAdd={() => { setPrevParentScreen(parentScreen); setEditingChore(null); setParentScreen('addChore'); }} onEdit={openEditChore} baseRate={baseRate} onApprove={approveManagedChore} onApproveAll={approveAllManagedChore} onReject={rejectManagedChore} kidProfiles={setupChildren.map(c => ({ name: c.name, avatarColor: c.avatarColor, avatarIdx: c.avatarIdx }))} /></ErrorBoundary>}
            {parentScreen === 'choreLibrary' && <ErrorBoundary key="choreLibrary"><ChoreLibraryScreen chores={managedChores} onBack={goBack} onAdd={() => { setPrevParentScreen('choreLibrary'); setEditingChore(null); setParentScreen('addChore'); }} onEdit={(c) => { setPrevParentScreen('choreLibrary'); openEditChore(c); }} onDelete={deleteChore} baseRate={baseRate} /></ErrorBoundary>}
            {parentScreen === 'payRates'  && <ErrorBoundary key="payRates"><PayRatesScreen onBack={goBack} onRateGuide={() => { setPrevParentScreen('payRates'); setParentScreen('rateGuide'); }} baseRate={baseRate} setBaseRate={setBaseRate} /></ErrorBoundary>}
            {parentScreen === 'rateGuide' && <ErrorBoundary key="rateGuide"><RateGuideScreen onBack={goBack} /></ErrorBoundary>}
            {parentScreen === 'rewards'   && <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}><Text>Rewards coming soon</Text></View>}
            {parentScreen === 'moneyLedger' && <ErrorBoundary key="moneyLedger"><MoneyScreen kidCoins={kidCoins} kidProfiles={setupChildren.map(c => ({ name: c.name, avatarColor: c.avatarColor, avatarIdx: c.avatarIdx }))} choreHistory={choreHistory} payoutLog={payoutLog} baseRate={baseRate} debugDayOffset={debugDayOffset} onConfirm={(kidName) => { confirmPayout(kidName); showParentToast(`✓ Paid ${kidName}!`); }} /></ErrorBoundary>}
            {parentScreen === 'settings'         && <ErrorBoundary key="parentSettings"><ParentSettingsScreen onNav={navParent} baseRate={baseRate} battleCoinBonusEnabled={battleCoinBonusEnabled} setBattleCoinBonusEnabled={setBattleCoinBonusEnabled} battleCoinBonusMultiplier={battleCoinBonusMultiplier} setBattleCoinBonusMultiplier={setBattleCoinBonusMultiplier} onAddKid={() => openKidModal(null)} onEditKid={k => { const full = setupChildren.find(c => c.name === k.name); if (full) openKidModal(full); }} kids={kids} kidApprovalSettings={kidApprovalSettings} setKidApprovalSettings={setKidApprovalSettings} kidProfiles={setupChildren.map(c => ({ name: c.name, avatarColor: c.avatarColor, avatarIdx: c.avatarIdx }))} sessionUser={sessionUser} parentRole={parentRole} pinEnabled={parentPinEnabled} savedPin={parentPin} onSavePin={saveParentPin} onDisablePin={disableParentPin} onSaveName={(n) => { setSessionUser(prev => prev ? { ...prev, name: n } : prev); saveDisplayName(n).catch(e => console.warn('[DB] saveDisplayName error:', e)); }} onSignOut={handleSignOut} /></ErrorBoundary>}
            {parentScreen === 'parentMilestones' && <ErrorBoundary key="parentMilestones"><ParentMilestonesScreen onBack={goBack} /></ErrorBoundary>}
            {parentScreen === 'kidMilestones' && <ErrorBoundary key="kidMilestones"><ParentKidMilestonesScreen kidProfiles={setupChildren.map(c => ({ name: c.name, avatarIdx: c.avatarIdx }))} onBack={goBack} /></ErrorBoundary>}
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
          </View>
        )}
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

    {/* Milestone toast — rendered at root so it shows in BOTH parent and kid views
        (kid milestones earned during a parent's approval now actually surface). */}
    {activeToast && (
      <MilestoneToast
        milestone={activeToast.def}
        kidName={activeToast.kidName}
        onDismiss={() => setActiveToast(null)}
        onView={() => {
          const isKidMilestone = !!activeToast.kidName;
          setActiveToast(null);
          if (viewMode === 'kid') {
            setTrophyInitialKey(undefined);
            setTrophyOrigin(tab);
            setScreen('trophyRoom');
          } else {
            navParent(isKidMilestone ? 'kidMilestones' : 'parentMilestones');
          }
        }}
      />
    )}

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
                        onPress={() => { setKidMonster(currentKidName, s => ({ ...s, monsterIdx: i as MonsterIdx, xp: 0, done: {} })); setDebugOpen(false); }}
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
                      <TouchableOpacity key={`m${n}`} style={s.debugXpBtn} onPress={() => setKidMonster(currentKidName, s => ({ ...s, xp: Math.max(0, s.xp - n) }))}>
                        <Text style={s.debugXpBtnTxt}>−{n}</Text>
                      </TouchableOpacity>
                    ))}
                    {[1, 5, 10, 50].map(n => (
                      <TouchableOpacity key={`p${n}`} style={[s.debugXpBtn, s.debugXpBtnGreen]} onPress={() => setKidMonster(currentKidName, s => ({ ...s, xp: s.xp + n }))}>
                        <Text style={s.debugXpBtnTxt}>+{n}</Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                  <TouchableOpacity style={s.debugMaxBtn} onPress={() => { setKidMonster(currentKidName, s => ({ ...s, xp: need })); setDebugOpen(false); }}>
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
                <View style={{ gap: 12 }}>
                  <Text style={s.debugSectionLabel}>GO TO SCREEN</Text>
                  {([
                    { label: '👋  Onboarding',       mode: 'onboarding'       },
                    { label: '🙋  Role Select',       mode: 'roleSelect'       },
                    { label: '🔢  Kid Pairing',       mode: 'kidPairing'       },
                    { label: '🔑  Login',             mode: 'login'            },
                    { label: '📝  Sign Up',           mode: 'signup'           },
                    { label: '👨‍👩‍👧  Parent Setup',      mode: 'parentOnboarding' },
                    { label: '🧒  Kid Profile Setup', mode: 'kidProfile'       },
                    { label: '👾  Kid Welcome',       mode: 'kidWelcome'       },
                    { label: '📬  Check Email',       mode: 'checkEmail'       },
                    { label: '🔑  Forgot Password',   mode: 'forgotPassword'   },
                  ] as { label: string; mode: AppMode }[]).map(({ label, mode }) => (
                    <TouchableOpacity
                      key={mode}
                      style={s.debugResetBtn}
                      onPress={() => {
                        if (mode === 'kidWelcome') setKidWelcomeName('Henry');
                        if (mode === 'checkEmail') { setPendingAuthEmail('parent@monstir.app'); setCheckEmailMode('confirm'); }
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
                      setCoopWin(null); // debug chest: no co-op banner
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
                <View style={{ gap: 16 }}>
                  <Text style={s.debugSectionLabel}>PICK BOSS</Text>
                  <View style={s.debugGrid}>
                    {BOSSES.map((b, i) => {
                      const jar = getBossDisplay(b.name)?.jar;
                      return (
                        <TouchableOpacity
                          key={i}
                          style={[s.debugChip, dbgBossIdx === i && s.debugChipActive, { flexDirection: 'row', alignItems: 'center', gap: 8 }]}
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
                    <Toggle value={dbgWeaknessUnlocked} onValueChange={setDbgWeaknessUnlocked} />
                  </View>

                  {/* Computed preview */}
                  <View style={{ backgroundColor: '#1A1A1A', borderRadius: 10, padding: 12, gap: 4 }}>
                    <Text style={{ color: '#C5F215', fontSize: scale(12), fontFamily: 'Inter_700Bold' }}>
                      Power: {calcPowerRating(dbgCompletionPct, monsterIdx, dbgWeaknessUnlocked ? 5 : 0)}  ·  Boss HP: {BOSSES[dbgBossIdx].hp}  ·  Monster HP: {Math.round(50 + calcPowerRating(dbgCompletionPct, monsterIdx, 0) * 0.5)}
                    </Text>
                    <Text style={{ color: '#767676', fontSize: scale(12) }}>
                      Guaranteed win: {dbgCompletionPct >= 100 ? 'YES ✅' : 'no'}
                    </Text>
                  </View>

                  <TouchableOpacity
                    style={[s.debugMaxBtn, { backgroundColor: '#6B35F0' }]}
                    onPress={() => {
                      setDbgBattleActive(true);
                      setScreen('boss-intro');
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
                  // Progress is read from the (non-destructive, simulated-date-stamped)
                  // history log filtered to the simulated week — so scrubbing to ANY
                  // week shows what was actually approved then, both forward and back.
                  // The live weekly counters can't do this: they reset on the week
                  // boundary and don't restore when you scrub backward.
                  const simWeekStart = new Date(getWeekMondayKey(debugDayOffset));
                  const simWeekEnd   = new Date(simWeekStart); simWeekEnd.setDate(simWeekEnd.getDate() + 7);
                  const inSimWeek    = (iso: string) => { const d = new Date(iso); return d >= simWeekStart && d < simWeekEnd; };
                  const doneInSimWeek = (c: ManagedChore) =>
                    choreHistory.filter(e => e.choreName === c.name && inSimWeek(e.approvedAt)).length;
                  const willReset  = managedChores.filter(c => {
                    const target = frequencyToWeeklyTarget(c.frequency);
                    return (c.weeklyCompletions ?? 0) < target && (c.status === 'approved' || c.status === 'rejected');
                  });
                  return (
                    <View style={{ gap: 12 }}>
                      {/* Current simulated date */}
                      <View style={{ backgroundColor: '#1A1A1A', borderRadius: 10, padding: 12, alignItems: 'center' }}>
                        <Text style={{ color: '#767676', fontSize: scale(12), fontFamily: 'Inter_700Bold', letterSpacing: 1 }}>SIMULATED DATE</Text>
                        <Text style={{ color: '#C5F215', fontSize: scale(18), fontFamily: 'Inter_900Black', marginTop: 4 }}>{dayName} · {simDay}</Text>
                        {debugDayOffset !== 0 && (
                          <Text style={{ color: '#767676', fontSize: scale(12), marginTop: 4 }}>
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
                        const { target } = householdChoreTotals([c], setupChildren.map(k => k.name));
                        const done   = doneInSimWeek(c);
                        const pct    = Math.min(100, Math.round((done / (target || 1)) * 100));
                        return (
                          <View key={c.id} style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                            <View style={{ flex: 1 }}>
                              <Text style={{ color: '#FFFFFF', fontSize: scale(12), fontFamily: 'Inter_600SemiBold' }} numberOfLines={1}>{c.name}</Text>
                              <Text style={{ color: '#767676', fontSize: scale(12) }}>{c.frequency} · {done}/{target} · {c.status}</Text>
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
                            <Text key={c.id} style={{ color: '#F59E0B', fontSize: scale(12) }}>↺  {c.name} ({c.status})</Text>
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

// ─── Parent PIN modal ─────────────────────────────────────────────────────────
// Shown when a kid tries to enter parent view and a PIN is set.
function ParentPinModal({ open, expectedPin, onSuccess, onClose }: {
  open: boolean; expectedPin: string; onSuccess: () => void; onClose: () => void;
}) {
  const [entry, setEntry] = useState('');
  const [error, setError] = useState(false);
  useEffect(() => { if (open) { setEntry(''); setError(false); } }, [open]);

  const submit = () => {
    if (entry === expectedPin) onSuccess();
    else { setError(true); setEntry(''); }
  };

  return (
    <Modal visible={open} transparent animationType="fade" onRequestClose={onClose}>
      <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', justifyContent: 'center', paddingHorizontal: 28 }}>
        <View style={{ backgroundColor: '#FFFDF7', borderRadius: 18, borderWidth: 2, borderColor: '#111', padding: 24, gap: 20, ...SOLID_SHADOW }}>

          {/* Icon + heading */}
          <View style={{ alignItems: 'center', gap: 8 }}>
            <Image
              source={require('./assets/icons/IconLock.png')}
              style={{ width: scale(52), height: scale(52) }}
              resizeMode="contain"
            />
            <Text style={{ fontFamily: 'FredokaOne_400Regular', fontSize: fontSize.h2, color: '#111' }}>
              Enter parent PIN
            </Text>
            <Text style={{ fontFamily: nunitoFamily.semibold, fontSize: fontSize.md, color: '#888', textAlign: 'center' }}>
              Ask a grown-up to unlock parent mode.
            </Text>
          </View>

          {/* PIN field */}
          <FormField
            label="PIN"
            value={entry}
            onChangeText={(v) => { setEntry(v.replace(/[^0-9]/g, '').slice(0, 6)); setError(false); }}
            placeholder="····"
            keyboardType="number-pad"
            secureTextEntry
            autoCapitalize="none"
          />

          {error && (
            <Text style={{ fontFamily: interFamily.semibold, fontSize: fontSize.sm, color: '#E53935', textAlign: 'center', marginTop: -12 }}>
              Incorrect PIN. Try again.
            </Text>
          )}

          <View style={{ flexDirection: 'row', gap: 12 }}>
            <Button label="Cancel" variant="secondary" onPress={onClose} style={{ flex: 1 }} />
            <Button label="Unlock" onPress={submit} disabled={entry.length < 4} style={{ flex: 1 }} />
          </View>

        </View>
      </View>
    </Modal>
  );
}

function App() {
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
  return (
    <ErrorBoundary>
      <AppInner />
    </ErrorBoundary>
  );
}

export default App;

// ─── Styles ───────────────────────────────────────────────────────────────────

const SOLID_SHADOW = shadows.solid;
// Smaller solid drop shadow (0px 3px 0px #111) — matches the design-system --shadow-sm
const SOLID_SHADOW_SM = Platform.select({
  ios:     { shadowColor: '#111111', shadowOffset: { width: 0, height: 3 }, shadowOpacity: 1, shadowRadius: 0 },
  android: { elevation: 3 },
  default: {},
})!;

const s = StyleSheet.create({
  root:            { flex: 1, backgroundColor: C.surface },
  header:          { backgroundColor: C.surface, paddingHorizontal: 20, paddingVertical: 16, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderBottomWidth: 0.5, borderBottomColor: C.border },
  wordmark:        { fontSize: scale(18), fontFamily: 'Inter_900Black', color: C.text, letterSpacing: -0.4 },
  coinPill:        { backgroundColor: C.goldLight, borderWidth: 1, borderColor: C.goldBorder, borderRadius: 20, paddingHorizontal: 12, paddingVertical: 4 },
  coinText:        { fontSize: scale(12), fontFamily: 'Inter_700Bold', color: C.gold },
  hero:            { backgroundColor: C.surface, padding: 20, paddingBottom: 16, alignItems: 'center', borderBottomWidth: 0.5, borderBottomColor: C.border },
  lvChip:          { fontSize: scale(12), fontFamily: 'Inter_700Bold', letterSpacing: 1.8, color: C.muted, marginBottom: 4 },
  monsterName:     { fontSize: scale(22), fontFamily: 'Inter_900Black', color: C.text, letterSpacing: -0.5, marginBottom: 16 },
  monsterBubble:   { width: 100, height: 100, backgroundColor: C.bg, borderRadius: 50, alignItems: 'center', justifyContent: 'center', marginBottom: 12 },
  xpRow:           { width: '100%', flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 },
  xpLabel:         { fontSize: scale(12), fontFamily: 'Inter_700Bold', color: C.hint },
  xpTrack:         { width: '100%', height: 5, backgroundColor: C.border, borderRadius: 5, overflow: 'hidden' },
  xpFill:          { height: '100%', backgroundColor: C.accent, borderRadius: 5 },
  sectionLabel:    { fontSize: scale(12), fontFamily: 'Inter_700Bold', letterSpacing: 1.8, color: C.hint, paddingHorizontal: 20, paddingTop: 16, paddingBottom: 8, backgroundColor: C.bg },
  choreList:       { gap: 8, paddingHorizontal: 12 },
  choreRow:        { backgroundColor: C.surface, borderWidth: 0.5, borderColor: C.border, borderRadius: 14, padding: 12, paddingHorizontal: 12, flexDirection: 'row', alignItems: 'center', gap: 12 },
  choreRowDone:    { backgroundColor: C.bg },
  choreIcon:       { width: 36, height: 36, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  choreInfo:       { flex: 1 },
  choreName:       { fontSize: scale(12), fontFamily: 'Inter_700Bold', color: C.text },
  choreNameDone:   { color: C.hint, textDecorationLine: 'line-through' },
  choreSub:        { fontSize: scale(12), color: C.hint, marginTop: 0 },
  choreGold:       { color: C.gold, fontFamily: 'Inter_700Bold' },
  choreCheck:      { width: 22, height: 22, borderRadius: 11, borderWidth: 1.5, borderColor: '#DDDBD5', alignItems: 'center', justifyContent: 'center' },
  choreCheckDone:  { backgroundColor: C.accent, borderColor: C.accent },
  checkDot:        { width: 7, height: 7, borderRadius: 4, backgroundColor: 'white' },
  tabBar:          { position: 'absolute', bottom: 36, left: 12, right: 12 },
  tabBarInner:     { flexDirection: 'row', backgroundColor: '#fff', borderRadius: 100, borderWidth: 2, borderColor: '#1A1A1A', paddingVertical: 8, paddingHorizontal: 8, justifyContent: 'space-between', alignItems: 'center', ...Platform.select({ ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.12, shadowRadius: 12 }, android: { elevation: 8 } }) },
  tab:             { flex: 1, alignItems: 'center', gap: 4 },
  tabIconWrap:     { width: 86, borderRadius: 32, alignItems: 'center', justifyContent: 'center', paddingVertical: 8, gap: 4 },
  tabIconWrapActive: { backgroundColor: '#EAE4FF' }, // legacy static highlight — superseded by the animated tabPill
  tabPill:         { position: 'absolute', top: 8, bottom: 8, left: 0, borderRadius: 32, backgroundColor: '#EAE4FF' },
  tabIcon:         { width: 44, height: 44 },
  tabLabel:        { fontSize: scale(12), fontFamily: 'Inter_600SemiBold', color: '#767676', letterSpacing: 0.1 },
  tabLabelActive:  { color: '#6B35F0' },
  // home screen
  homeRoot:           { flex: 1, backgroundColor: 'transparent' },
  homeHeader:         { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingTop: 16, paddingBottom: 16 },
  homeHeaderLeft:     { flexDirection: 'row', alignItems: 'center', gap: 12 },
  homeKidView:        { fontSize: scale(18), fontFamily: 'Inter_700Bold', color: '#1A1A1A' },
  homeBalancePill:    { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', borderWidth: 2.5, borderColor: '#1A1A1A', borderRadius: 100, paddingHorizontal: 16, paddingVertical: 8, gap: 8 },
  homeBalanceText:    { fontSize: scale(18), fontFamily: 'Inter_700Bold', color: '#1A1A1A' },
  homeScroll:         { paddingHorizontal: 20, paddingBottom: 120, paddingTop: 12 },
  homeCharCard:       { backgroundColor: '#FFFFFF', borderRadius: 20, borderWidth: 2.5, borderColor: '#1A1A1A', marginBottom: 24, ...SOLID_SHADOW, overflow: 'visible' },
  homeCharImage:      { height: 340, alignItems: 'center', justifyContent: 'center', backgroundColor: '#FFFFFF', borderTopLeftRadius: 18, borderTopRightRadius: 18, overflow: 'visible' },
  homeCharInfo:       { padding: 16 },
  homeCharNameRow:    { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  homeCharName:       { fontSize: scale(28), fontFamily: 'Inter_900Black', color: '#1A1A1A' },
  homeCharLevel:      { fontSize: scale(16), fontFamily: 'Inter_800ExtraBold', color: '#6B35F0' },
  homeXpTrack:        { height: 16, backgroundColor: '#E0DCDC', borderRadius: 100, marginBottom: 4, overflow: 'hidden', borderWidth: 2, borderColor: '#1A1A1A' },
  homeXpFill:         { height: '100%', backgroundColor: '#6B35F0', borderRadius: 100 },
  homeXpText:         { fontSize: scale(12), fontFamily: 'Inter_500Medium', color: '#1A1A1A' },
  homeXpPopLayer:     { position: 'absolute', bottom: 200, left: 0, right: 0, alignItems: 'center', pointerEvents: 'none' } as any,
  homeXpPopPill:      { backgroundColor: '#FFFFFF', borderWidth: 3, borderColor: '#2D006E', borderRadius: 100, paddingHorizontal: 16, paddingVertical: 4 },
  homeXpPop:          { fontSize: scale(18), fontFamily: 'Inter_900Black', color: '#2D006E', letterSpacing: 0.2 },
  homeCoinPopPill:    { backgroundColor: '#FFFFFF', borderWidth: 3, borderColor: '#1A6600', borderRadius: 100, paddingHorizontal: 16, paddingVertical: 4 },
  homeCoinPop:        { fontSize: scale(18), fontFamily: 'Inter_900Black', color: '#1A6600', letterSpacing: 0.2 },
  homeQuestsHeader:   { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  homeQuestsTitle:    { fontSize: scale(22), fontFamily: 'Inter_800ExtraBold', color: '#1A1A1A' },
  homeLeftPill:       { backgroundColor: '#ADE9DF', borderRadius: 100, paddingHorizontal: 16, paddingVertical: 8, borderWidth: 2, borderColor: '#1A1A1A' },
  homeLeftText:       { fontSize: scale(16), fontFamily: 'Inter_700Bold', color: '#1A1A1A' },
  homeQuestCard:      { flexDirection: 'row', alignItems: 'center', backgroundColor: '#FAF9F4', borderRadius: 16, borderWidth: 2, borderColor: '#1A1A1A', padding: 12, marginBottom: 12, gap: 12, ...SOLID_SHADOW },
  homeQuestSweep:     { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: '#E8FFA0', borderRadius: 14 },
  homeQuestCardDone:  { opacity: 0.5 },
  homeQuestIcon:      { width: 58, height: 58, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  homeQuestInfo:      { flex: 1 },
  homeQuestTitle:     { fontSize: scale(18), fontFamily: 'Inter_700Bold', color: '#1A1A1A', marginBottom: 4 },
  homeQuestTitleDone: { textDecorationLine: 'line-through', color: '#767676' },
  homeQuestReward:    { fontSize: scale(16), fontFamily: 'Inter_600SemiBold', color: '#1A1A1A' },
  homeQuestCheck:     { width: 30, height: 30, borderRadius: 15, borderWidth: 2, borderColor: '#1A1A1A' },
  homeQuestCheckDone: { backgroundColor: '#6B35F0', borderColor: '#6B35F0', alignItems: 'center', justifyContent: 'center' },
  homeQuestCheckDot:  { width: 8, height: 8, borderRadius: 4, backgroundColor: 'white' },
  homeQuestCardPending: { borderColor: '#E6A817', backgroundColor: '#FFFBF0' },
  homeQuestSweepPending: { position: 'absolute' as const, top: 0, left: 0, right: 0, bottom: 0, backgroundColor: '#FFF3C4', borderRadius: 14 },
  homeQuestCardRejected: { borderColor: '#E84040', backgroundColor: '#FFF5F5' },
  // MON-25 Rev 2 (Option A "Sent It") — kid-facing pending chore card pieces.
  // Lime done-badge pinned bottom-right of the icon tile (~7px outward overlap).
  doneBadge:     { position: 'absolute' as const, bottom: -7, right: -7, width: 24, height: 24, borderRadius: 12, backgroundColor: '#D8F52F', borderWidth: 3, borderColor: '#111111', alignItems: 'center' as const, justifyContent: 'center' as const },
  doneBadgeMark: { fontSize: scale(12), fontFamily: 'Inter_900Black' as const, color: '#111111', lineHeight: scale(13) },
  // "SENT TO {parent} ✓" status pill under the title.
  sentPill:      { alignSelf: 'flex-start' as const, backgroundColor: '#D8F52F', borderWidth: 2.5, borderColor: '#111111', borderRadius: 999, paddingHorizontal: 8, paddingVertical: 4, marginTop: 0, marginBottom: 4 },
  sentPillText:  { fontSize: scale(12), fontFamily: 'SpaceMono_700Bold' as const, color: '#111111', letterSpacing: 0.2 },
  // Trailing "· locked in" mono tag on the pending reward row.
  lockedInTag:   { fontSize: scale(12), fontFamily: 'SpaceMono_700Bold' as const, color: '#777777' },
  // Right control on a submitted card: filled purple circle with a white check.
  submittedCheck:     { width: 30, height: 30, borderRadius: 15, borderWidth: 3, borderColor: '#111111', backgroundColor: '#7B3FF2', alignItems: 'center' as const, justifyContent: 'center' as const },
  submittedCheckMark: { fontSize: scale(16), fontFamily: 'Inter_900Black' as const, color: '#FFFFFF', lineHeight: scale(17) },
  rejectionBubble: { marginTop: 4, backgroundColor: '#FFE5E5', borderRadius: 8, paddingHorizontal: 8, paddingVertical: 4 },
  rejectionNote: { fontSize: scale(12), color: '#C00', fontStyle: 'italic' as const },
  retryLabel: { fontSize: scale(12), fontFamily: 'Inter_700Bold' as const, color: '#E84040', marginTop: 4 },
  allDoneCard:        { backgroundColor: '#FFFFFF', borderRadius: 20, borderWidth: 2.5, borderColor: '#1A1A1A', padding: 32, alignItems: 'center' as const, gap: 8, ...SOLID_SHADOW },
  allDoneEmoji:       { fontSize: scale(44), marginBottom: 4 },
  allDoneTitle:       { fontSize: scale(18), fontFamily: 'Inter_800ExtraBold' as const, color: '#1A1A1A', textAlign: 'center' as const },
  allDoneSub:         { fontSize: scale(16), fontFamily: 'Inter_500Medium' as const, color: '#767676', textAlign: 'center' as const },
  battleCard:      { backgroundColor: C.surface, borderWidth: 2, borderColor: '#1A1A1A', borderRadius: 14, padding: 16, paddingHorizontal: 16, ...SOLID_SHADOW },
  battleCardLabel: { fontSize: scale(12), fontFamily: 'Inter_700Bold', letterSpacing: 1.8, color: C.muted, marginBottom: 4 },
  battlePower:     { fontSize: scale(28), fontFamily: 'Inter_900Black', color: C.text, letterSpacing: -1, lineHeight: scale(36) },
  battleCardSub:   { fontSize: scale(12), color: C.muted, marginTop: 4 },
  pctRow:          { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 12 },
  pctTrack:        { flex: 1, height: 6, backgroundColor: C.border, borderRadius: 6, overflow: 'hidden' },
  pctFill:         { height: '100%', borderRadius: 6, backgroundColor: C.accent },
  pctLbl:          { fontSize: scale(12), fontFamily: 'Inter_700Bold', color: C.accent, minWidth: 30, textAlign: 'right' },
  bossCard:        { backgroundColor: C.surface, borderWidth: 2, borderColor: '#1A1A1A', borderRadius: 14, padding: 12, paddingHorizontal: 16, flexDirection: 'row', alignItems: 'center', gap: 12, ...SOLID_SHADOW },
  bossName:        { fontSize: scale(12), fontFamily: 'Inter_900Black', color: C.text },
  bossSub:         { fontSize: scale(12), color: C.muted, marginTop: 0 },
  bossPow:         { fontSize: scale(12), fontFamily: 'Inter_700Bold', color: C.text },
  oddsRow:         { flexDirection: 'row', gap: 8 },
  oddsCard:        { flex: 1, backgroundColor: C.bg, borderRadius: 12, borderWidth: 2, borderColor: '#1A1A1A', padding: 12, alignItems: 'center', ...SOLID_SHADOW },
  oddsVal:         { fontSize: scale(18), fontFamily: 'Inter_900Black', color: C.text },
  oddsLbl:         { fontSize: scale(12), color: C.muted, fontFamily: 'Inter_700Bold', letterSpacing: 0.5, marginTop: 4 },
  battleBtn:       { backgroundColor: '#1A1A1A', borderRadius: 100, paddingVertical: 20, alignItems: 'center', borderWidth: 2, borderColor: '#1A1A1A', ...SOLID_SHADOW },
  battleBtnText:   { fontSize: scale(18), fontFamily: 'Inter_900Black', color: 'white', letterSpacing: -0.3 },
  debugBtn:        { backgroundColor: C.bg, borderWidth: 0.5, borderColor: C.border, borderRadius: 10, padding: 12, alignItems: 'center' },
  debugBtnText:    { fontSize: scale(12), fontFamily: 'Inter_700Bold', color: C.muted, letterSpacing: 0.3 },
  arenaStage:      { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24, backgroundColor: C.surface },
  arenaVs:         { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 16, width: '100%' },
  arenaFighter:    { alignItems: 'center', gap: 8 },
  arenaName:       { fontSize: scale(12), fontFamily: 'Inter_700Bold', color: C.muted, letterSpacing: 0.5 },
  arenaVsLabel:    { fontSize: scale(22), fontFamily: 'Inter_900Black', color: C.border },
  arenaLog:        { width: '100%', backgroundColor: C.bg, borderRadius: 12, padding: 16, minHeight: 72, marginTop: 20 },
  arenaLogText:    { fontSize: scale(12), color: C.text, lineHeight: scale(20) },
  arenaLogBold:    { fontFamily: 'Inter_700Bold' },
  resultScreen:    { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24, backgroundColor: C.surface, gap: 8 },
  resultChip:      { fontSize: scale(12), fontFamily: 'Inter_700Bold', letterSpacing: 1.8, color: C.muted },
  resultH:         { fontSize: scale(28), fontFamily: 'Inter_900Black', color: C.text, letterSpacing: -0.5 },
  resultSub:       { fontSize: scale(12), color: C.muted, marginBottom: 8 },
  resultCoins:     { fontSize: scale(22), fontFamily: 'Inter_900Black', color: C.gold },
  resultCoinsLbl:  { fontSize: scale(12), color: C.muted, marginBottom: 20 },
  walletTotal:     { backgroundColor: C.surface, borderRadius: 14, borderWidth: 2, borderColor: '#1A1A1A', padding: 16, paddingBottom: 12, ...SOLID_SHADOW },
  walletLabel:     { fontSize: scale(12), fontFamily: 'Inter_700Bold', letterSpacing: 1.8, color: C.muted, marginBottom: 4 },
  walletAmount:    { fontSize: scale(28), fontFamily: 'Inter_900Black', color: C.text, letterSpacing: -1 },
  walletSub:       { fontSize: scale(12), color: C.muted, marginTop: 4 },
  walletRow:       { backgroundColor: C.surface, borderWidth: 2, borderColor: '#1A1A1A', borderRadius: 12, padding: 12, paddingHorizontal: 12, flexDirection: 'row', alignItems: 'center', gap: 12, ...SOLID_SHADOW },
  walletRowName:   { flex: 1, fontSize: scale(12), fontFamily: 'Inter_700Bold', color: C.text },
  walletRowCoins:  { fontSize: scale(12), fontFamily: 'Inter_900Black', color: C.gold },
  // ── Goal flow ──
  gfRoot:              { flex: 1, backgroundColor: '#FFFFFF' },
  gfBackRow:           { paddingHorizontal: 24, paddingTop: 16, paddingBottom: 4 },
  gfBackBtn:           { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  gfBackText:          { fontSize: scale(22), color: '#1A1A1A', fontFamily: 'Inter_600SemiBold' },
  gfScrollCenter:      { flexGrow: 1, alignItems: 'center', paddingHorizontal: 24, paddingBottom: 40, justifyContent: 'center' },
  gfScrollTop:         { flexGrow: 1, paddingHorizontal: 24, paddingBottom: 40, paddingTop: 8 },
  gfRobotCircle:       { width: 160, height: 160, borderRadius: 80, backgroundColor: '#EAE4FF', alignItems: 'center', justifyContent: 'center', marginBottom: 24 },
  gfBigTitle:          { fontSize: scale(28), fontFamily: 'Inter_900Black', color: '#1A1A1A', textAlign: 'center', lineHeight: scale(40), marginBottom: 8 },
  gfCreatedTitle:      { fontSize: scale(28), fontFamily: 'Inter_900Black', color: '#6B35F0', textAlign: 'center', marginBottom: 8 },
  gfSubtitle:          { fontSize: scale(16), color: '#767676', textAlign: 'center', marginBottom: 8 },
  gfScreenTitle:       { fontSize: scale(28), fontFamily: 'Inter_900Black', color: '#1A1A1A', marginBottom: 8 },
  gfScreenSub:         { fontSize: scale(16), color: '#767676', marginBottom: 16 },
  gfBtnPrimary:        { backgroundColor: '#6B35F0', borderRadius: 14, padding: 16, alignItems: 'center', width: '100%' },
  gfBtnPrimaryText:    { fontSize: scale(16), fontFamily: 'Inter_800ExtraBold', color: '#FFFFFF' },
  gfBtnOutline:        { borderRadius: 14, padding: 16, alignItems: 'center', width: '100%', borderWidth: 1.5, borderColor: '#ECEAE4', backgroundColor: '#FFFFFF' },
  gfBtnOutlineText:    { fontSize: scale(16), fontFamily: 'Inter_700Bold', color: '#1A1A1A' },
  gfSkipLink:          { fontSize: scale(16), fontFamily: 'Inter_600SemiBold', color: '#767676' },
  gfSearchRow:         { flexDirection: 'row', alignItems: 'center', backgroundColor: '#F5F3EF', borderRadius: 12, borderWidth: 2, borderColor: '#1A1A1A', paddingHorizontal: 12, paddingVertical: 12, gap: 8, marginBottom: 12 },
  gfSearchInput:       { flex: 1, fontSize: scale(16), color: '#1A1A1A', paddingVertical: 0 },
  gfSearchClear:       { padding: 4 },
  gfCategoryGrid:      { flexDirection: 'row', flexWrap: 'wrap', gap: 12, justifyContent: 'space-between', marginTop: 8 },
  gfCategoryCard:      { width: '31%', backgroundColor: '#FFFFFF', borderRadius: 14, borderWidth: 2, borderColor: '#1A1A1A', alignItems: 'center', paddingVertical: 16, paddingHorizontal: 8, ...SOLID_SHADOW },
  gfCategoryLabel:     { fontSize: scale(12), fontFamily: 'Inter_600SemiBold', color: '#1A1A1A', marginTop: 8, textAlign: 'center' },
  gfGoalRow:           { flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFFFFF', borderRadius: 14, borderWidth: 2, borderColor: '#1A1A1A', padding: 16, gap: 12, ...SOLID_SHADOW },
  gfGoalRowSelected:   { borderColor: '#6B35F0', borderWidth: 2 },
  gfGoalIconCircle:    { width: 56, height: 56, borderRadius: 28, backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: '#ECEAE4', alignItems: 'center', justifyContent: 'center' },
  gfGoalName:          { fontSize: scale(16), fontFamily: 'Inter_700Bold', color: '#1A1A1A' },
  gfGoalPrice:         { fontSize: scale(12), color: '#767676', marginTop: 4 },
  gfGoalCheck:         { width: 26, height: 26, borderRadius: 13, borderWidth: 2, borderColor: '#ECEAE4', alignItems: 'center', justifyContent: 'center' },
  gfGoalCheckSelected: { backgroundColor: '#6B35F0', borderColor: '#6B35F0' },
  gfGoalCheckDot:      { width: 8, height: 8, borderRadius: 4, backgroundColor: '#FFFFFF' },
  gfLabelRow:          { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  gfFieldLabel:        { fontSize: scale(12), fontFamily: 'Inter_700Bold', color: '#1A1A1A' },
  gfCharCount:         { fontSize: scale(12), color: '#767676' },
  gfInput:             { borderWidth: 2, borderColor: '#1A1A1A', borderRadius: 12, padding: 16, fontSize: scale(16), color: '#1A1A1A', backgroundColor: '#FFFFFF', justifyContent: 'center' },
  gfPhotoDash:         { borderWidth: 1.5, borderColor: '#D0CEC8', borderRadius: 12, padding: 20, alignItems: 'center', justifyContent: 'center', borderStyle: 'dashed', marginTop: 8, gap: 8 },
  gfPhotoText:         { fontSize: scale(12), color: '#767676' },
  gfPhotoPreview:      { marginTop: 20, borderRadius: 14, overflow: 'hidden', position: 'relative' },
  gfPhotoPlaceholder:  { height: 180, backgroundColor: '#EAE4FF', alignItems: 'center', justifyContent: 'center', borderRadius: 14 },
  gfPhotoRemove:       { position: 'absolute', top: 8, right: 8, width: 30, height: 30, borderRadius: 15, backgroundColor: 'rgba(0,0,0,0.5)', alignItems: 'center', justifyContent: 'center' },
  gfPhotoRemoveText:   { color: '#FFFFFF', fontSize: scale(12), fontFamily: 'Inter_700Bold' },
  gfAmountDisplay:     { fontSize: scale(44), fontFamily: 'Inter_900Black', color: '#6B35F0', textAlign: 'center', marginVertical: 16 },
  gfAmountHint:        { fontSize: scale(12), color: '#767676', textAlign: 'center', marginBottom: 24 },
  gfNumpad:            { flexDirection: 'row', flexWrap: 'wrap', gap: 12, justifyContent: 'center' },
  gfNumKey:            { width: '30%', backgroundColor: '#FFFFFF', borderRadius: 14, borderWidth: 2, borderColor: '#1A1A1A', paddingVertical: 20, alignItems: 'center', justifyContent: 'center', ...SOLID_SHADOW },
  gfNumKeyText:        { fontSize: scale(22), fontFamily: 'Inter_700Bold', color: '#1A1A1A' },
  gfColorGrid:         { flexDirection: 'row', flexWrap: 'wrap', gap: 16, justifyContent: 'center', marginTop: 16 },
  gfColorSwatch:       { width: 64, height: 64, borderRadius: 32, alignItems: 'center', justifyContent: 'center' },
  gfColorSwatchSelected: { borderWidth: 3, borderColor: '#1A1A1A' },
  gfColorCheck:        { fontSize: scale(22), color: '#FFFFFF', fontFamily: 'Inter_900Black' },
  gfPreviewCard:       { backgroundColor: '#FFFFFF', borderRadius: 16, borderWidth: 2, borderColor: '#1A1A1A', padding: 16, width: '100%', marginTop: 16, ...SOLID_SHADOW },
  gfPreviewName:       { fontSize: scale(22), fontFamily: 'Inter_800ExtraBold', color: '#1A1A1A', textAlign: 'center', marginBottom: 4 },
  gfPreviewAmount:     { fontSize: scale(16), color: '#767676', textAlign: 'center', marginBottom: 12 },
  gfProgressTrack:     { height: 8, backgroundColor: '#ECEAE4', borderRadius: 4, overflow: 'hidden', marginBottom: 4 },
  gfProgressFill:      { height: '100%', borderRadius: 4 },
  gfProgressPct:       { fontSize: scale(12), color: '#767676', textAlign: 'right' },
  gfRobotRow:          { flexDirection: 'row', alignItems: 'center', gap: 12, marginTop: 16, width: '100%' },
  gfSpeechBubble:      { flex: 1, backgroundColor: '#FFFFFF', borderRadius: 14, borderWidth: 2, borderColor: '#1A1A1A', padding: 12, ...SOLID_SHADOW },
  gfSpeechText:        { fontSize: scale(12), color: '#1A1A1A', lineHeight: scale(20) },
  gfConfettiDot:       { position: 'absolute', width: 10, height: 10, borderRadius: 5 },
  gfAllowanceLabel:    { fontSize: scale(12), color: '#767676', textAlign: 'center', marginBottom: 4 },
  gfAllowanceDate:     { fontSize: scale(28), fontFamily: 'Inter_900Black', color: '#6B35F0', textAlign: 'center', marginBottom: 4 },
  gfAllowanceDays:     { fontSize: scale(16), color: '#767676', textAlign: 'center' },
  // debug overlay
  debugScrim:        { position: 'absolute', top: 0, left: 0, right: 0, bottom: 120, backgroundColor: 'rgba(0,0,0,0.55)', justifyContent: 'flex-end' } as any,
  debugPanel:        { backgroundColor: '#1A1A1A', borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 20, gap: 12 },
  debugTabs:         { flexDirection: 'row', backgroundColor: '#2A2A2A', borderRadius: 10, padding: 4, gap: 4 },
  debugTab:          { flex: 1, paddingVertical: 8, borderRadius: 8, alignItems: 'center' },
  debugTabActive:    { backgroundColor: '#3A3A3A' },
  debugTabText:      { fontSize: scale(12), fontFamily: 'Inter_600SemiBold', color: '#666' },
  debugTabTextActive:{ color: '#FFFFFF' },
  debugResetBtn:     { backgroundColor: '#2A2A2A', borderRadius: 10, paddingVertical: 12, paddingHorizontal: 16 },
  debugResetTxt:     { fontSize: scale(12), fontFamily: 'Inter_600SemiBold', color: '#FFFFFF' },
  debugTitle:        { fontSize: scale(16), fontFamily: 'Inter_800ExtraBold', color: '#fff' },
  debugSub:          { fontSize: scale(12), color: '#888', marginTop: -6 },
  debugSectionLabel: { fontSize: scale(12), fontFamily: 'Inter_700Bold', color: '#FFFFFF', letterSpacing: 1.5, marginTop: 4 },
  debugGrid:         { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  debugChip:         { paddingHorizontal: 12, paddingVertical: 8, borderRadius: 20, backgroundColor: '#2E2E2E' },
  debugChipActive:   { backgroundColor: '#C5F215' },
  debugChipText:     { fontSize: scale(12), fontFamily: 'Inter_600SemiBold', color: '#aaa' },
  debugChipTextActive: { color: '#1A1A1A' },
  debugRow:          { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  debugXpBtn:        { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 10, backgroundColor: '#2E2E2E' },
  debugXpBtnGreen:   { backgroundColor: '#2A4A1A' },
  debugXpBtnTxt:     { fontSize: scale(12), fontFamily: 'Inter_700Bold', color: '#fff' },
  debugMaxBtn:       { backgroundColor: '#6B35F0', borderRadius: 12, padding: 16, alignItems: 'center' },
  debugMaxTxt:       { fontSize: scale(12), fontFamily: 'Inter_700Bold', color: '#fff' },
  debugCopyBtn:      { backgroundColor: '#6B35F0', borderRadius: 12, padding: 12, alignItems: 'center' },
  debugCopyTxt:      { fontSize: scale(12), fontFamily: 'Inter_700Bold', color: '#fff' },
  debugCloseBtn:     { backgroundColor: '#2E2E2E', borderRadius: 12, padding: 12, alignItems: 'center' },
  debugCloseTxt:     { fontSize: scale(12), fontFamily: 'Inter_600SemiBold', color: '#888' },
});

// ─── Parent Styles ────────────────────────────────────────────────────────────

const p = StyleSheet.create({
  // Tab bar
  tabBarWrap:       { position: 'absolute', bottom: 0, left: 0, right: 0, backgroundColor: '#FFFFFF', borderTopWidth: 1, borderTopColor: '#ECEAE4', paddingBottom: Platform.OS === 'ios' ? 20 : 10 },
  tabBarRow:        { flexDirection: 'row', justifyContent: 'space-around', alignItems: 'center', paddingTop: 12, paddingHorizontal: 8 },
  tabItem:          { flex: 1, alignItems: 'center' },
  tabPill:          { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 12, paddingVertical: 8, borderRadius: 20 },
  tabPillActive:    { backgroundColor: '#EAE4FF' },
  tabLabel:         { fontSize: scale(12), fontFamily: 'Inter_600SemiBold', color: C.muted },
  tabLabelActive:   { color: '#6B35F0', fontFamily: 'Inter_700Bold' },

  // Screen header
  screenHeader:     { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 16, borderBottomWidth: 1, borderBottomColor: '#ECEAE4', backgroundColor: '#FFFFFF' },
  screenTitle:      { fontSize: scale(18), fontFamily: 'Inter_800ExtraBold', color: '#1A1A1A', flex: 1, textAlign: 'center' },
  backBtn:          { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  backBtnText:      { fontSize: scale(22), color: '#1A1A1A', fontFamily: 'Inter_600SemiBold' },
  addBtn:           { width: 40, height: 40, borderRadius: 10, backgroundColor: '#C5F215', borderWidth: 2, borderColor: '#1A1A1A', alignItems: 'center', justifyContent: 'center' },
  addBtnText:       { fontSize: scale(22), color: '#1A1A1A', fontFamily: 'Inter_700Bold', lineHeight: scale(26) },

  // Parent home
  homeHeader:       { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingTop: 16, paddingBottom: 16, backgroundColor: '#F7F6F2' },
  homeHeaderLeft:   { flexDirection: 'row', alignItems: 'center', gap: 12 },
  homeAvatar:       { width: 48, height: 48, borderRadius: 24, backgroundColor: '#fff', borderWidth: 2, borderColor: '#1A1A1A', alignItems: 'center', justifyContent: 'center' },
  homeParentView:   { fontSize: scale(18), fontFamily: 'Inter_700Bold', color: '#1A1A1A' },
  homeBell:         { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },

  // Hero card
  heroCard:         { marginHorizontal: 16, marginTop: 8, borderRadius: 20, backgroundColor: '#C5F215', borderWidth: 2, borderColor: '#1A1A1A', ...SOLID_SHADOW },
  heroContent:     { flexDirection: 'row', alignItems: 'center', padding: 20, paddingBottom: 0 },
  heroTitle:        { fontSize: scale(28), fontFamily: 'Inter_900Black', color: '#1A1A1A', letterSpacing: -0.5, marginBottom: 8 },
  heroSub:          { fontSize: scale(12), color: '#1A1A1A', lineHeight: scale(20), opacity: 0.8 },
  heroCurve:        { height: 24, backgroundColor: '#FFFFFF', borderTopLeftRadius: 20, borderTopRightRadius: 20, marginTop: 12 },

  // Menu cards
  menuCard:         { backgroundColor: '#FFFFFF', borderRadius: 14, borderWidth: 2, borderColor: '#1A1A1A', padding: 16, flexDirection: 'row', alignItems: 'center', gap: 16, ...SOLID_SHADOW },
  menuCardIcon:     { width: 48, height: 48, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  menuCardTitle:    { fontSize: scale(16), fontFamily: 'Inter_700Bold', color: '#1A1A1A', marginBottom: 4 },
  menuCardSub:      { fontSize: scale(12), color: '#767676' },
  menuCardArrow:    { fontSize: scale(22), color: '#1A1A1A', fontFamily: 'Inter_300Light' },

  // Chore manage rows
  choreManageRow:   { backgroundColor: '#FFFFFF', borderRadius: 14, borderWidth: 2, borderColor: '#1A1A1A', padding: 12, flexDirection: 'row', alignItems: 'center', gap: 12, ...SOLID_SHADOW },
  choreManageIcon:  { width: 52, height: 52, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  choreManageName:  { fontSize: scale(16), fontFamily: 'Inter_700Bold', color: '#1A1A1A', marginBottom: 4 },
  choreManageFreq:  { fontSize: scale(12), color: '#767676' },
  choreManageRate:  { fontSize: scale(16), fontFamily: 'Inter_700Bold', color: '#3B8A3A' },
  choreManageDrag:  { fontSize: scale(18), color: '#767676', marginLeft: 8 },

  // Toggle pills
  toggleRow:        { flexDirection: 'row', gap: 12, paddingHorizontal: 16, paddingVertical: 12 },
  togglePill:       { paddingHorizontal: 20, paddingVertical: 8, borderRadius: 20, backgroundColor: '#F0EEE8' },
  togglePillActive: { backgroundColor: '#6B35F0' },
  toggleText:       { fontSize: scale(12), fontFamily: 'Inter_600SemiBold', color: '#767676' },
  toggleTextActive: { color: '#FFFFFF' },

  // Add/Edit chore form
  iconDisplay:      { width: 96, height: 96, borderRadius: 20, alignItems: 'center', justifyContent: 'center', position: 'relative' },
  iconEditBadge:    { position: 'absolute', bottom: 2, right: 2, width: 26, height: 26, borderRadius: 13, backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: '#ECEAE4', alignItems: 'center', justifyContent: 'center' },
  formCard:         { backgroundColor: '#FFFFFF', borderRadius: 14, borderWidth: 2, borderColor: '#1A1A1A', padding: 16, ...SOLID_SHADOW },
  formLabel:        { fontSize: scale(12), fontFamily: 'Inter_700Bold', color: '#767676', marginBottom: 8, textTransform: 'uppercase', letterSpacing: 0.5 },
  formInput:        { borderWidth: 2, borderColor: '#1A1A1A', borderRadius: 10, padding: 16, fontSize: scale(16), color: '#1A1A1A' },
  formDropdownRow:  { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderWidth: 2, borderColor: '#1A1A1A', borderRadius: 10, padding: 16 },
  formDropdownValue:{ fontSize: scale(16), color: '#1A1A1A' },
  rateDollarSign:   { fontSize: scale(18), fontFamily: 'Inter_600SemiBold', color: '#1A1A1A' },
  // Difficulty picker
  difficultyBtn:        { flex: 1, backgroundColor: '#F7F6F2', borderRadius: 12, borderWidth: 2, borderColor: '#ECEAE4', padding: 12, alignItems: 'center' as const, gap: 4 },
  difficultyBtnActive:  { backgroundColor: '#EAE4FF', borderColor: '#6B35F0' },
  difficultyStars:      { fontSize: scale(12) },
  difficultyLabel:      { fontSize: scale(12), fontFamily: 'Inter_700Bold' as const, color: '#767676' },
  difficultyLabelActive:{ color: '#6B35F0' },
  difficultyPay:        { fontSize: scale(12), fontFamily: 'Inter_700Bold' as const, color: '#767676' },
  difficultyPayActive:  { color: '#3B8A3A' },
  // Kid assignment pills
  kidPill:          { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 100, borderWidth: 2, borderColor: '#ECEAE4', backgroundColor: '#F7F6F2' },
  kidPillActive:    { backgroundColor: '#C5F215', borderColor: '#1A1A1A' },
  kidPillText:      { fontSize: scale(12), fontFamily: 'Inter_600SemiBold' as const, color: '#767676' },
  kidPillTextActive:{ color: '#1A1A1A' },
  // Completion-mode radio card
  modeCard:         { borderWidth: 2, borderColor: '#ECEAE4', borderRadius: 14, overflow: 'hidden', backgroundColor: '#FFFFFF' },
  modeRow:          { flexDirection: 'row', alignItems: 'flex-start', gap: 12, padding: 16, backgroundColor: '#FFFFFF' },
  modeRowDivider:   { borderTopWidth: 1, borderTopColor: '#ECEAE4' },
  modeRowActive:    { backgroundColor: '#F4F9E3', borderLeftWidth: 4, borderLeftColor: '#7B3FF2', paddingLeft: 12 },
  modeRadio:        { width: 22, height: 22, borderRadius: 11, borderWidth: 2, borderColor: '#C7C5BF', alignItems: 'center', justifyContent: 'center', marginTop: 0 },
  modeRadioActive:  { borderColor: '#7B3FF2' },
  modeRadioDot:     { width: 11, height: 11, borderRadius: 6, backgroundColor: '#7B3FF2' },
  modeTitle:        { fontSize: scale(16), fontFamily: 'Inter_700Bold' as const, color: '#1A1A1A', marginBottom: 4 },
  modeTitleActive:  { color: '#7B3FF2' },
  modeDesc:         { fontSize: scale(12), lineHeight: scale(18), fontFamily: 'Inter_500Medium' as const, color: '#4A4A4A' },
  iconPickerItem:   { width: 56, height: 56, borderRadius: 14, alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: 'transparent' },
  iconPickerSelected: { borderColor: '#6B35F0', backgroundColor: '#EAE4FF' },
  saveBtn:          { backgroundColor: '#C5F215', borderRadius: 14, borderWidth: 1.5, borderColor: '#1A1A1A', padding: 16, alignItems: 'center' },
  saveBtnText:      { fontSize: scale(16), fontFamily: 'Inter_800ExtraBold', color: '#1A1A1A' },
  cancelBtn:        { backgroundColor: '#FFFFFF', borderRadius: 14, borderWidth: 1.5, borderColor: '#1A1A1A', padding: 16, alignItems: 'center' },
  cancelBtnText:    { fontSize: scale(16), fontFamily: 'Inter_700Bold', color: '#1A1A1A' },

  // Pay rates
  sectionCard:      { backgroundColor: '#FFFFFF', borderRadius: 14, borderWidth: 2, borderColor: '#1A1A1A', padding: 16, ...SOLID_SHADOW },
  sectionCardTitle: { fontSize: scale(16), fontFamily: 'Inter_700Bold', color: '#1A1A1A', marginBottom: 4 },
  sectionCardSub:   { fontSize: scale(12), color: '#767676', marginBottom: 12 },
  dropdownRow:      { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderWidth: 2, borderColor: '#1A1A1A', borderRadius: 10, padding: 12, marginTop: 4 },
  dropdownValue:    { fontSize: scale(16), color: '#1A1A1A' },
  settingsRow:      { flexDirection: 'row', alignItems: 'center', gap: 12 },
  settingsRowLabel: { fontSize: scale(16), fontFamily: 'Inter_600SemiBold', color: '#1A1A1A', marginBottom: 4 },
  settingsRowSub:   { fontSize: scale(12), color: '#767676', lineHeight: scale(17) },
  rateInputPill:    { flexDirection: 'row', alignItems: 'center', backgroundColor: '#F7F6F2', borderRadius: 10, borderWidth: 2, borderColor: '#1A1A1A', paddingHorizontal: 12, paddingVertical: 8, gap: 4, minWidth: 80 },
  rateInput:        { fontSize: scale(16), fontFamily: 'Inter_700Bold', color: '#1A1A1A', minWidth: 48 },
  rateGuideLink:    { fontSize: scale(16), fontFamily: 'Inter_700Bold', color: '#6B35F0' },

  // Rate guide
  rateGuideCoinBadge: { width: 40, height: 40, borderRadius: 20, borderWidth: 2, borderColor: '#1A1A1A', backgroundColor: '#D8F52F', alignItems: 'center', justifyContent: 'center', ...SOLID_SHADOW_SM },
  rateInfoCard:     { backgroundColor: '#7B3FF2', borderRadius: 16, borderWidth: 2, borderColor: '#1A1A1A', padding: 16, flexDirection: 'row', alignItems: 'center', gap: 12, ...SOLID_SHADOW },
  rateInfoText:     { flex: 1, fontSize: scale(16), fontFamily: 'Inter_700Bold', color: '#FFFFFF', lineHeight: scale(22) },
  rateTableHead:    { backgroundColor: '#1A1A1A', flexDirection: 'row', paddingVertical: 12, paddingHorizontal: 16 },
  rateTableHeader:  { fontSize: scale(12), fontFamily: 'Inter_700Bold', color: '#D8F52F', letterSpacing: 1.2, textTransform: 'uppercase' },
  rateTableRow:     { flexDirection: 'row', alignItems: 'center', paddingVertical: 16, paddingHorizontal: 16 },
  rateTableCell:    { fontSize: scale(12), fontFamily: 'Inter_600SemiBold', color: '#1A1A1A' },
  rateDot:          { width: 12, height: 12, borderRadius: 6 },
  rateLimeCard:     { backgroundColor: '#D8F52F', borderRadius: 16, borderWidth: 2, borderColor: '#1A1A1A', padding: 16, flexDirection: 'row', alignItems: 'flex-start', gap: 12, ...SOLID_SHADOW },
  rateLimeText:     { flex: 1, fontSize: scale(16), fontFamily: 'Inter_700Bold', color: '#1A1A1A', lineHeight: scale(22) },
  noteCard:         { backgroundColor: '#FFFFFF', borderRadius: 14, borderWidth: 2, borderColor: '#1A1A1A', padding: 16, flexDirection: 'row', alignItems: 'flex-start', gap: 4, ...SOLID_SHADOW },
  noteText:         { flex: 1, fontSize: scale(12), color: '#1A1A1A', lineHeight: scale(20) },

  // Pending approval styles
  approveBtn:           { flex: 1, backgroundColor: '#C5F215', borderRadius: 10, borderWidth: 2, borderColor: '#1A1A1A', padding: 12, alignItems: 'center' as const },
  approveBtnText:       { fontSize: scale(12), fontFamily: 'Inter_800ExtraBold' as const, color: '#1A1A1A' },
  rejectBtn:            { flex: 1, backgroundColor: '#FFFFFF', borderRadius: 10, borderWidth: 2, borderColor: '#1A1A1A', padding: 12, alignItems: 'center' as const },
  rejectBtnText:        { fontSize: scale(12), fontFamily: 'Inter_700Bold' as const, color: '#E84040' },
  rejectConfirmBtn:     { flex: 1, backgroundColor: '#E84040', borderRadius: 10, padding: 12, alignItems: 'center' as const },
  rejectConfirmBtnText: { fontSize: scale(12), fontFamily: 'Inter_800ExtraBold' as const, color: '#FFFFFF' },
  pendingReviewCard:    { backgroundColor: '#FFFFFF', borderRadius: 14, borderWidth: 2, borderColor: '#E6A817', padding: 16, ...SOLID_SHADOW },
  pendingTabBadge:      { backgroundColor: '#E6A817', borderRadius: 10, minWidth: 20, height: 20, alignItems: 'center' as const, justifyContent: 'center' as const, paddingHorizontal: 4 },
  pendingTabBadgeText:  { fontSize: scale(12), fontFamily: 'Inter_800ExtraBold' as const, color: '#FFFFFF' },

  // Payout screen styles
  payoutBreakdownRow: { flexDirection: 'row' as const, alignItems: 'center' as const, justifyContent: 'space-between' as const, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#ECEAE4' },
  payoutBreakdownLabel: { fontSize: scale(16), color: '#1A1A1A', fontFamily: 'Inter_600SemiBold' as const },
  payoutBreakdownValue: { fontSize: scale(16), color: '#1A1A1A', fontFamily: 'Inter_700Bold' as const },
  payoutTotalLabel: { fontSize: scale(18), fontFamily: 'Inter_800ExtraBold' as const, color: '#1A1A1A' },
  payoutTotalValue: { fontSize: scale(18), fontFamily: 'Inter_900Black' as const, color: '#3B8A3A' },
  payoutCta: { backgroundColor: '#C5F215', borderRadius: 16, borderWidth: 2, borderColor: '#1A1A1A', padding: 20, alignItems: 'center' as const, ...SOLID_SHADOW },
  payoutCtaText: { fontSize: scale(18), fontFamily: 'Inter_900Black' as const, color: '#1A1A1A' },
});

// ─── Settings Styles (ps prefix) ─────────────────────────────────────────────

const ps = StyleSheet.create({
  sectionLabel:   { fontSize: scale(22), fontFamily: 'Inter_800ExtraBold', color: '#1A1A1A', paddingHorizontal: 20, paddingTop: 20, paddingBottom: 12 },
  version:        { fontSize: scale(12), fontFamily: 'Inter_500Medium', color: '#ABABAB', textAlign: 'center', paddingTop: 20, paddingBottom: 8 },
  group:          { marginHorizontal: 16, backgroundColor: '#FFFFFF', borderRadius: 16, borderWidth: 2, borderColor: '#1A1A1A', ...SOLID_SHADOW },
  divider:        { height: 1, backgroundColor: '#F0EEE8', marginLeft: 68 },
  row:            { flexDirection: 'row', alignItems: 'center', paddingVertical: 12, paddingHorizontal: 16, gap: 12 },
  rowIcon:        { width: 36, height: 36, borderRadius: 9, alignItems: 'center', justifyContent: 'center' },
  rowTitle:       { fontSize: scale(16), fontFamily: 'Inter_600SemiBold', color: '#1A1A1A' },
  rowSub:         { fontSize: scale(12), color: '#767676', marginTop: 0 },
  badge:          { backgroundColor: '#6B35F0', borderRadius: 10, paddingHorizontal: 8, paddingVertical: 4 },
  badgeText:      { fontSize: scale(12), fontFamily: 'Inter_700Bold', color: '#FFFFFF' },
  chevron:        { fontSize: scale(18), color: '#767676', fontFamily: 'Inter_300Light' },
  kidAvatar:      { width: 42, height: 42, borderRadius: 21, alignItems: 'center', justifyContent: 'center' },
  battleHero:     { backgroundColor: '#3D1FA3', borderRadius: 16, borderWidth: 2, borderColor: '#1A1A1A', padding: 20, flexDirection: 'row', alignItems: 'center', gap: 16, ...SOLID_SHADOW },
  battleHeroTitle:{ fontSize: scale(18), fontFamily: 'Inter_800ExtraBold', color: '#FFFFFF', marginBottom: 4 },
  battleHeroSub:  { fontSize: scale(12), color: 'rgba(255,255,255,0.7)', lineHeight: scale(18) },

  // ── Chore Approval (v2) ──────────────────────────────────────────────────
  apprHeaderCard:   { backgroundColor: '#7B3FF2', borderRadius: 18, borderWidth: 2, borderColor: '#111', padding: 16, flexDirection: 'row', alignItems: 'center', gap: 16, marginBottom: 4, ...SOLID_SHADOW },
  apprHeaderIcon:   { width: 52, height: 52, backgroundColor: '#D8F52F', borderWidth: 2, borderColor: '#111', borderRadius: 14, alignItems: 'center', justifyContent: 'center', ...SOLID_SHADOW },
  apprHeaderTitle:  { fontFamily: 'FredokaOne_400Regular', fontSize: scale(18), color: '#FFFFFF' },
  apprHeaderSub:    { fontSize: scale(12), color: 'rgba(255,255,255,0.85)', marginTop: 4, lineHeight: scale(18), fontFamily: 'Inter_600SemiBold' },
  apprSectionLabel: { fontSize: scale(12), fontFamily: 'Inter_700Bold', letterSpacing: 1.5, textTransform: 'uppercase', color: '#888', paddingTop: 20, paddingBottom: 12 },
  apprKidCard:      { backgroundColor: '#FFFFFF', borderWidth: 2, borderColor: '#111', borderRadius: 18, padding: 16, marginBottom: 12, ...SOLID_SHADOW },
  apprKidName:      { fontFamily: 'FredokaOne_400Regular', fontSize: scale(18), color: '#111' },
  apprBadge:        { alignSelf: 'flex-start', flexDirection: 'row', marginTop: 4, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 20, borderWidth: 2 },
  apprBadgeRequire: { backgroundColor: '#F0E8FF', borderColor: '#7B3FF2' },
  apprBadgeAuto:    { backgroundColor: '#EEFFD0', borderColor: '#B8D020' },
  apprBadgeText:    { fontSize: scale(12), fontFamily: 'Inter_800ExtraBold' },
  apprToggleMain:   { fontSize: scale(12), fontFamily: 'Inter_800ExtraBold', color: '#111' },
  apprToggleSub:    { fontSize: scale(12), color: '#888', fontFamily: 'Inter_600SemiBold', lineHeight: scale(17), marginTop: 4 },
  apprShortcutBtn:  { flex: 1, paddingVertical: 12, backgroundColor: '#FFFDF7', borderWidth: 2, borderColor: '#111', borderRadius: 12, alignItems: 'center', justifyContent: 'center', ...SOLID_SHADOW_SM },
  apprShortcutText: { fontSize: scale(12), fontFamily: 'Inter_800ExtraBold', color: '#111' },
  apprInfoBox:      { marginTop: 20, backgroundColor: '#F0E8FF', borderWidth: 2, borderColor: '#7B3FF2', borderRadius: 12, padding: 16, flexDirection: 'row', gap: 12, alignItems: 'flex-start' },
  apprInfoText:     { flex: 1, fontSize: scale(12), color: '#444', lineHeight: scale(19), fontFamily: 'Inter_600SemiBold' },
  sliderTrack:    { height: 6, backgroundColor: '#E0DCDC', borderRadius: 3, position: 'relative', marginBottom: 4 },
  sliderFill:     { position: 'absolute', left: 0, top: 0, bottom: 0, backgroundColor: '#6B35F0', borderRadius: 3 },
  sliderThumb:    { position: 'absolute', top: -7, marginLeft: -10, width: 20, height: 20, borderRadius: 10, backgroundColor: '#6B35F0', borderWidth: 3, borderColor: '#FFFFFF', shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.2, shadowRadius: 4 },
  sliderTickLabel:{ fontSize: scale(12), color: '#767676' },
  impactRow:      { flexDirection: 'row', alignItems: 'center', gap: 8 },
  impactCell:     { flex: 1, backgroundColor: '#F7F6F2', borderRadius: 10, padding: 12, alignItems: 'center', borderWidth: 2, borderColor: '#111111' },
  impactCellHighlight: { backgroundColor: '#EAE4FF' },
  impactLabel:    { fontSize: scale(12), fontFamily: 'Inter_700Bold', color: '#767676', letterSpacing: 0.5, marginBottom: 4, textTransform: 'uppercase' },
  impactValue:    { fontSize: scale(18), fontFamily: 'Inter_900Black', color: '#1A1A1A' },
  impactUnit:     { fontSize: scale(12), fontFamily: 'Inter_500Medium', color: '#767676' },
  impactArrow:    { fontSize: scale(18), color: '#767676', fontFamily: 'Inter_300Light' },
  cosmeticPill:   { backgroundColor: '#FFFFFF', borderRadius: 20, borderWidth: 1.5, borderColor: '#C4B5FD', paddingHorizontal: 12, paddingVertical: 4 },
  cosmeticText:   { fontSize: scale(12), fontFamily: 'Inter_600SemiBold', color: '#6B35F0' },
  accountAvatar:  { width: 72, height: 72, borderRadius: 36, backgroundColor: '#EAE4FF', alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: '#1A1A1A' },
  accountAvatarText: { fontSize: scale(28), fontFamily: 'Inter_800ExtraBold', color: '#6B35F0' },
  logoutBtn:      { margin: 16, marginTop: 20, backgroundColor: '#FFFFFF', borderRadius: 14, borderWidth: 2, borderColor: '#1A1A1A', padding: 16, alignItems: 'center', ...SOLID_SHADOW },
  logoutText:     { fontSize: scale(16), fontFamily: 'Inter_700Bold', color: '#E53935' },
});

// ─── Onboarding Styles (ob prefix) ───────────────────────────────────────────


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
    paddingHorizontal: 16, paddingVertical: 8,
    borderWidth: 2, borderColor: '#1A1A1A',
    margin: scale(14),
  },
  bossTagText: {
    color: '#fff', fontFamily: 'Inter_900Black', fontSize: scale(12), letterSpacing: 0.8,
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
  countdownNum: { fontFamily: 'FredokaOne_400Regular', fontSize: scale(28), color: '#1A1A1A', letterSpacing: 0 },
  countdownUnit: { fontSize: scale(12), fontFamily: 'Inter_600SemiBold', color: '#6B35F0', marginTop: 4 },

  // Section header (on green bg)
  sectionHeader: { fontSize: scale(22), fontFamily: 'Inter_800ExtraBold', color: '#1A1A1A', marginTop: scale(4) },

  // Intel row
  intelRow: { flexDirection: 'row', gap: scale(10) },
  intelChip: {
    backgroundColor: C.surface, borderRadius: 16, padding: scale(14),
    borderWidth: 2, borderColor: '#1A1A1A', ...SOLID_SHADOW,
  },
  intelLabel: { fontSize: scale(12), fontFamily: 'Inter_800ExtraBold', color: C.muted, letterSpacing: 1, marginBottom: 8 },
  intelValue: { fontSize: scale(22), fontFamily: 'Inter_900Black', color: '#1A1A1A' },
  weaknessBox: {
    width: 48, height: 48, borderRadius: 12, backgroundColor: '#FFF9E0',
    alignItems: 'center', justifyContent: 'center', marginBottom: 4,
  },
  weaknessPill: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: '#FFF9E0', borderRadius: 10, paddingHorizontal: 12, paddingVertical: 4,
    borderWidth: 2, borderColor: '#F0C040', alignSelf: 'flex-start',
  },
  weaknessIcon: { fontSize: scale(16) },
  weaknessText: { fontSize: scale(12), fontFamily: 'Inter_800ExtraBold', color: '#8B6800' },
  unlockArrow: {
    width: 28, height: 28, borderRadius: 14, backgroundColor: '#3AB56A',
    alignItems: 'center', justifyContent: 'center', alignSelf: 'flex-end', marginTop: 8,
  },
  threatPill: {
    alignSelf: 'flex-start', borderRadius: 100, paddingHorizontal: 16, paddingVertical: 4,
    borderWidth: 2, borderColor: '#1A1A1A',
  },
  threatPillText: { fontSize: scale(12), fontFamily: 'Inter_800ExtraBold', color: '#fff' },

  // Section card
  sectionCard: {
    backgroundColor: C.surface, borderRadius: 20, padding: scale(16),
    borderWidth: 2, borderColor: '#1A1A1A', ...SOLID_SHADOW,
  },
  sectionTitle: { fontSize: scale(12), fontFamily: 'Inter_900Black', color: '#1A1A1A', letterSpacing: 0.3 },

  // Readiness
  readinessRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  readinessLabel: { fontSize: scale(12), color: C.muted, fontFamily: 'Inter_600SemiBold' },
  readinessValue: { fontSize: scale(16), fontFamily: 'Inter_800ExtraBold', color: '#1A1A1A' },
  trackWrap: { height: 14, backgroundColor: '#E8E4F2', borderRadius: 100, overflow: 'hidden' },
  trackFill: { height: '100%', backgroundColor: '#6B35F0', borderRadius: 100 },
  forecastPill: {
    backgroundColor: '#F0EBFF', borderRadius: 14, padding: scale(10),
    borderWidth: 2, borderColor: '#C5B8E8',
  },
  forecastText: { fontSize: scale(12), color: '#5A2DB8', fontFamily: 'Inter_700Bold' },

  // What's at stake
  stakeRow: { flexDirection: 'row', justifyContent: 'space-around', paddingVertical: scale(8) },
  stakeItem: { alignItems: 'center', gap: scale(4) },
  stakeIcon: { width: scale(52), height: scale(52) },
  stakeVal: { fontSize: scale(16), fontFamily: 'Inter_900Black', color: '#1A1A1A' },
  stakeLbl: { fontSize: scale(12), color: C.muted, fontFamily: 'Inter_600SemiBold' },
  evolutionHint: {
    backgroundColor: '#FFF4E0', borderRadius: 12, padding: scale(10),
    borderWidth: 2, borderColor: '#F0C060', marginTop: 8,
  },
  evolutionHintText: { fontSize: scale(12), color: '#7A4800', fontFamily: 'Inter_700Bold', textAlign: 'center' },

  // Battle button
  battleBtnPurple: {
    backgroundColor: '#6B35F0', borderRadius: 100, paddingVertical: 20,
    alignItems: 'center', borderWidth: 2, borderColor: '#1A1A1A', ...SOLID_SHADOW,
  },
  battleBtnPurpleText: { fontSize: scale(18), fontFamily: 'Inter_900Black', color: '#fff', letterSpacing: -0.3 },

  // Legacy (kept for BossIntroScreen compatibility)
  countdownBox: { marginTop: scale(8), alignSelf: 'stretch', backgroundColor: 'rgba(255,255,255,0.92)', borderRadius: 14, paddingVertical: scale(10), borderWidth: 2, borderColor: '#1A1A1A' },
  countdownText: { color: '#1A1A1A', fontFamily: 'FredokaOne_400Regular', fontSize: scale(22), textAlign: 'center', letterSpacing: 2 },
});

// ─── Battle Flow Styles ───────────────────────────────────────────────────────

const bi = StyleSheet.create({
  badgePill: {
    alignSelf: 'center',
    backgroundColor: 'rgba(10,10,10,0.80)',
    borderRadius: 28, paddingHorizontal: 20, paddingVertical: 8,
    borderWidth: 1.5, borderColor: 'rgba(255,255,255,0.22)',
  },
  badgeText: {
    fontSize: scale(12), fontFamily: 'Inter_800ExtraBold', color: '#FFFFFF', letterSpacing: 1,
  },
  bossNameFallback: {
    fontSize: scale(72), fontFamily: 'Inter_900Black', color: '#FFFFFF',
    letterSpacing: -1, lineHeight: scale(76),
    textShadowColor: '#000', textShadowOffset: { width: 4, height: 5 }, textShadowRadius: 0,
  },
  tagline: {
    fontSize: scale(18), fontFamily: 'Inter_800ExtraBold', color: '#FFFFFF',
    letterSpacing: 0.3, lineHeight: scale(23), textAlign: 'center',
    textShadowColor: 'rgba(0,0,0,0.9)',
    textShadowOffset: { width: 2, height: 3 },
    textShadowRadius: 2,
  },
  rewardsPill: {
    alignSelf: 'center',
    backgroundColor: 'rgba(10,10,10,0.82)',
    borderRadius: 28, paddingHorizontal: 24, paddingVertical: 12,
    borderWidth: 1.5, borderColor: 'rgba(255,255,255,0.22)',
    marginBottom: -18,
    zIndex: 1,
  },
  rewardsPillText: {
    fontSize: scale(12), fontFamily: 'Inter_800ExtraBold', color: '#FFFFFF', letterSpacing: 2,
  },
  rewardsCard: {
    backgroundColor: '#FAF9F4', borderRadius: 20,
    borderWidth: 2.5, borderColor: '#1A1A1A',
    paddingTop: 32, paddingBottom: 24, paddingHorizontal: 16,
    flexDirection: 'row', justifyContent: 'space-around', alignItems: 'center',
    ...SOLID_SHADOW,
  },
  battleBtn: {
    backgroundColor: '#C5F215',
    borderRadius: 50, paddingVertical: 20, alignItems: 'center',
    borderWidth: 2.5, borderColor: '#1A1A1A',
    ...SOLID_SHADOW,
  },
  battleBtnText: {
    fontSize: scale(18), fontFamily: 'Inter_900Black', color: '#1A1A1A', letterSpacing: 0.5,
  },
});

const b = StyleSheet.create({
  // ── Battle Arena ──────────────────────────────────────────────────────────
  hpRow:           { flexDirection: 'row', gap: 8, paddingHorizontal: 12, paddingTop: 8, paddingBottom: 12 },
  hpCard:          { flex: 1, backgroundColor: C.surface, borderWidth: 2, borderColor: '#1A1A1A', borderRadius: 14, padding: 12, flexDirection: 'row', gap: 8, alignItems: 'center', ...SOLID_SHADOW },
  hpAvatarWell:    { width: 38, height: 38, borderRadius: 10, backgroundColor: C.warmBg, alignItems: 'center', justifyContent: 'center', borderWidth: 1.5, borderColor: C.border, flexShrink: 0 },
  hpName:          { fontSize: scale(12), fontFamily: 'Inter_700Bold', color: C.text },
  hpVal:           { fontSize: scale(12), fontFamily: 'Inter_700Bold', color: C.muted },
  hpTrack:         { height: 20, borderRadius: 100, backgroundColor: '#ECECEC', marginTop: 4, borderWidth: 2, borderColor: '#1A1A1A', padding: 4, overflow: 'hidden' },
  hpFill:          { flex: 1, borderRadius: 100, borderWidth: 2, borderColor: '#1A1A1A' },
  hpVs:            { fontSize: scale(12), fontFamily: 'Inter_900Black', color: C.border, alignSelf: 'center' },

  stage:           { flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-around', paddingHorizontal: 20, paddingBottom: 8, height: 160 },
  stageFighter:    { alignItems: 'center', gap: 8 },
  stageArtP:       { width: 100, height: 100, borderRadius: 16, backgroundColor: '#EAE4FF', borderWidth: 2, borderColor: '#1A1A1A', alignItems: 'center', justifyContent: 'center', ...SOLID_SHADOW },
  stageArtE:       { width: 100, height: 100, borderRadius: 16, backgroundColor: C.warmBg, borderWidth: 2, borderColor: '#1A1A1A', alignItems: 'center', justifyContent: 'center', ...SOLID_SHADOW },
  stageTag:        { fontSize: scale(12), fontFamily: 'Inter_700Bold', color: C.muted, backgroundColor: C.surface, borderRadius: 100, paddingHorizontal: 12, paddingVertical: 4, borderWidth: 1, borderColor: C.border },

  actionArea:      { flex: 1, paddingHorizontal: 16, justifyContent: 'flex-end', paddingBottom: 24, gap: 8 },
  spRow:           { flexDirection: 'row', gap: 8 },
  spCard:          { flex: 1, backgroundColor: C.surface, borderWidth: 2, borderColor: '#1A1A1A', borderRadius: 12, paddingVertical: 12, paddingHorizontal: 8, alignItems: 'center', gap: 4, ...SOLID_SHADOW },
  spCardZap:       { backgroundColor: '#EAF3FB' },
  spCardCharge:    { backgroundColor: '#F0F7F0' },
  spCardMega:      { backgroundColor: '#EAE4FF' },
  spOff:           { opacity: 0.35 },
  spEmoji:         { fontSize: scale(18) },
  spLabel:         { fontSize: scale(12), fontFamily: 'Inter_700Bold', color: C.text },
  spCost:          { fontSize: scale(12), fontFamily: 'Inter_700Bold', color: C.muted },
  coreRow:         { flexDirection: 'row', alignItems: 'center', gap: 8 },
  coreLabel:       { fontSize: scale(12), fontFamily: 'Inter_700Bold', letterSpacing: 1.5, color: '#6B35F0' },
  corePips:        { flex: 1, flexDirection: 'row', gap: 4 },
  corePip:         { flex: 1, height: 12, borderRadius: 3 },
  corePipOn:       { backgroundColor: '#6B35F0' },
  corePipOff:      { backgroundColor: C.border },
  coreCount:       { fontSize: scale(12), fontFamily: 'Inter_700Bold', color: '#6B35F0', minWidth: 20, textAlign: 'right' },

  // ── Mini-game shared ──────────────────────────────────────────────────────
  mgTitle:    { fontSize: scale(12), fontFamily: 'Inter_800ExtraBold', color: '#767676', letterSpacing: 1.5 },
  mgInstr:    { fontSize: scale(16), fontFamily: 'Inter_700Bold', color: '#1A1A1A', textAlign: 'center' },
  mgMainBtn:  { backgroundColor: '#6B35F0', borderRadius: 100, paddingHorizontal: scale(40), paddingVertical: scale(18), borderWidth: 2, borderColor: '#1A1A1A', ...SOLID_SHADOW },
  mgMainBtnText: { color: '#fff', fontFamily: 'Inter_900Black', fontSize: scale(18) },
  mgBigTap:   { width: scale(130), height: scale(130), borderRadius: scale(65), backgroundColor: '#6B35F0', borderWidth: 3, borderColor: '#1A1A1A', alignItems: 'center', justifyContent: 'center', ...SOLID_SHADOW },

  // ── Card hand ─────────────────────────────────────────────────────────────
  handGrid:   { flexDirection: 'row', flexWrap: 'wrap', gap: 8, justifyContent: 'center' },
  handCard:   { width: '47%', borderRadius: 14, borderWidth: 2, borderColor: '#1A1A1A', paddingVertical: scale(12), paddingHorizontal: scale(10), alignItems: 'center', gap: 8, minHeight: scale(110), justifyContent: 'center', backgroundColor: '#FAF9F4', ...SOLID_SHADOW },
  handEmoji:  { fontSize: scale(22) },
  handLabel:  { fontFamily: 'FredokaOne_400Regular', fontSize: scale(22), color: '#1A1A1A', textAlign: 'center', lineHeight: scale(26) },
  handCost:   { fontSize: scale(12), fontFamily: 'Inter_600SemiBold', color: '#767676' },
});

const auth = StyleSheet.create({
  backBtn:       { width: 44, height: 44, alignItems: 'center', justifyContent: 'center', marginBottom: 8 },
  backBtnText:   { fontSize: scale(22), color: '#1A1A1A', fontFamily: 'Inter_600SemiBold' },
  title:         { fontSize: scale(28), fontFamily: 'Inter_900Black', color: '#1A1A1A', marginBottom: 8 },
  subtitle:      { fontSize: scale(16), color: '#767676' },
  inputRow:      { flexDirection: 'row', alignItems: 'center', borderRadius: 14, borderWidth: 2, borderColor: '#1A1A1A', backgroundColor: '#FFFFFF', paddingHorizontal: 16, paddingVertical: 16, gap: 12 },
  inputIcon:     { fontSize: scale(18) },
  textInput:     { flex: 1, fontSize: scale(16), color: '#1A1A1A', padding: 0 },
  dividerRow:    { flexDirection: 'row', alignItems: 'center', gap: 12 },
  dividerLine:   { flex: 1, height: 1, backgroundColor: '#ECEAE4' },
  dividerText:   { fontSize: scale(12), color: '#767676', fontFamily: 'Inter_500Medium' },
  googleBtn:     { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 12, backgroundColor: '#FFFFFF', borderRadius: 14, borderWidth: 1.5, borderColor: '#ECEAE4', padding: 16 },
  googleBtnText: { fontSize: scale(16), fontFamily: 'Inter_700Bold', color: '#1A1A1A' },
  leafDecor:     { position: 'absolute', bottom: 60, left: -10, fontSize: scale(72), opacity: 0.5 },
  purpleBlob:    { position: 'absolute', bottom: 80, right: -20, borderRadius: 60, backgroundColor: '#6B35F0', opacity: 0.15, width: 120, height: 120 },
  sparkle:       { position: 'absolute', fontSize: scale(18), opacity: 0.6 },
});
