import React, { useState, useRef, useEffect, useMemo } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, TextInput,
  ScrollView, Image, Modal, Platform, ActionSheetIOS,
  Animated, Easing, KeyboardAvoidingView, PanResponder,
} from 'react-native';
import * as Haptics from 'expo-haptics';
import { SafeAreaView } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { colors, fontSize, fontWeight, radii, spacing, scale, interFamily, textStyles } from '../design-system/tokens';
import { obc, cardShadow, DotGridBg, ObButton as Button, Helper } from './onboarding/obkit';

const DRAFT_KEY = 'monstir:parent-onboarding-draft';

// ─── Types ─────────────────────────────────────────────────────────────────

export interface OnboardingChild {
  id: string;
  name: string;
  avatarColor: string;
  avatarIdx: number;
  ageRange: '5-6' | '7-9' | '10-12' | '13+';
  difficulty: 'Easy' | 'Medium' | 'Hard';
  selectedChoreIds: string[];
  // Standing kid-device pairing code (kids.pairing_code); present after a DB load.
  pairingCode?: string;
}

export interface ChoreMapEntry {
  name: string;
  icon: ReturnType<typeof require>;
  iconBg: string;
  difficulty: 'Easy' | 'Medium' | 'Hard';
  frequency?: string;
  completionMode?: 'shared' | 'independent';
}

export interface ParentSetupResult {
  children: OnboardingChild[];
  rewardType: string;
  parentRole: string;
  choreMap: Record<string, ChoreMapEntry>;
  // MON-85: one shared chore set for the whole family. These become chores with
  // assigned_to: [] (everyone), and can be reassigned to specific kids later.
  sharedChoreIds: string[];
}

interface Props {
  onComplete: (setup: ParentSetupResult) => void;
}

// ─── Local style constants ──────────────────────────────────────────────────
// NOTE: These intentionally differ from design-system tokens:
// • PURPLE / LAVENDER are the onboarding-specific active-state palette (slightly
//   warmer than colors.purple / colors.lavender from tokens).
// • BLACK matches the Monstir solid-shadow spec (#111111, per tokens.ts comment)
//   which differs from colors.black (#1A1A1A used for text).
// • CHORE_ROW_CHECKED_BG — light purple tint for a checked chore row; no token.
// • AVATAR_INITIAL_COLOR — deep purple used for avatar initials; no token.
// • SUBMIT_ERROR_COLOR   — destructive red for inline form errors; no token.
// • FREDOKA_BOLD         — Fredoka (not FredokaOne) bold weight; no token in
//   tokens.ts (which only covers Inter, Nunito, SpaceMono, FredokaOne).

const PURPLE               = '#7B3FF2';
const LAVENDER             = '#EDE5FD';
const BLACK                = '#111111';
const CHORE_ROW_CHECKED_BG = '#F7F2FE';
const AVATAR_INITIAL_COLOR = '#3A2080';
const SUBMIT_ERROR_COLOR   = '#E53935';
// FredokaOne is the only Fredoka weight loaded at the app root; use it as the
// rounded display face (the variable "Fredoka_700Bold" was never bundled).
const FREDOKA_BOLD         = 'FredokaOne_400Regular';

// Difficulty badge tints — no token; these are specific to the difficulty
// spectrum and don't map to any existing design-system color.
const DIFF_EASY_BG    = '#E8FBB4';
const DIFF_EASY_TEXT  = '#3B6D11';
const DIFF_MED_BG     = '#FFF0C0';
const DIFF_MED_TEXT   = '#854F0B';
const DIFF_HARD_BG    = '#FAECE7';
const DIFF_HARD_TEXT  = '#993C1D';

const AGE_RANGES: OnboardingChild['ageRange'][] = ['5-6', '7-9', '10-12', '13+'];
const DIFFICULTIES: OnboardingChild['difficulty'][] = ['Easy', 'Medium', 'Hard'];

// MON-85 parent flow (prototype order): Identity → Add kid → Anyone else →
// Shared chores → Base pay → Pairing codes → Notifications → All set.

const AVATAR_COLORS = ['#E0D4FF', '#FFD6E4', '#C8EEFF', '#D6FFE8', '#FFF3C8', '#FFE0CC'];

const AVATARS = [
  require('../../assets/icons/Avatars/kidProfile1.png'),
  require('../../assets/icons/Avatars/kidProfile2.png'),
  require('../../assets/icons/Avatars/kidProfile3.png'),
  require('../../assets/icons/Avatars/kidProfile4.png'),
  require('../../assets/icons/Avatars/kidProfile5.png'),
  require('../../assets/icons/Avatars/kidProfile6.png'),
  require('../../assets/icons/Avatars/kidProfile7.png'),
  require('../../assets/icons/Avatars/kidProfile8.png'),
  require('../../assets/icons/Avatars/kidProfile9.png'),
  require('../../assets/icons/Avatars/kidProfile10.png'),
  require('../../assets/icons/Avatars/kidProfile11.png'),
  require('../../assets/icons/Avatars/kidProfile12.png'),
  require('../../assets/icons/Avatars/kidProfile13.png'),
  require('../../assets/icons/Avatars/kidProfile14.png'),
  require('../../assets/icons/Avatars/kidProfile15.png'),
  require('../../assets/icons/Avatars/kidProfile16.png'),
  require('../../assets/icons/Avatars/kidProfile17.png'),
  require('../../assets/icons/Avatars/kidProfile18.png'),
  require('../../assets/icons/Avatars/kidProfile19.png'),
  require('../../assets/icons/Avatars/kidProfile20.png'),
  require('../../assets/icons/Avatars/kidProfile21.png'),
];

// Avatar carousel cell pitch: cell width (72) + row gap (10).
const AVATAR_CELL_STRIDE = 82;

interface SuggestedChore {
  id: string;
  name: string;
  xp: number;
  difficulty: 'Easy' | 'Medium' | 'Hard';
  icon: ReturnType<typeof require>;
  iconBg: string;
  frequency?: string;
  completionMode?: 'shared' | 'independent';
}

const CHORES_BY_AGE: Record<OnboardingChild['ageRange'], SuggestedChore[]> = {
  '5-6': [
    { id: 'make_bed',     name: 'Make bed',        xp: 10, difficulty: 'Easy',   icon: require('../../assets/icons/chores/chore=iconBed.png'),     iconBg: colors.iconBed },
    { id: 'tidy_room',    name: 'Tidy room',        xp: 10, difficulty: 'Easy',   icon: require('../../assets/icons/chores/chore=iconBroom.png'),   iconBg: colors.iconBroom },
    { id: 'water_plants', name: 'Water plants',     xp: 10, difficulty: 'Easy',   icon: require('../../assets/icons/chores/chore=iconSoap.png'),    iconBg: colors.iconTrash },
    { id: 'put_clothes',  name: 'Put away clothes', xp: 10, difficulty: 'Easy',   icon: require('../../assets/icons/chores/chore=iconLaundry.png'), iconBg: colors.iconLaundry },
    { id: 'set_table',    name: 'Help set table',   xp: 15, difficulty: 'Medium', icon: require('../../assets/icons/chores/chore=iconDishes.png'),  iconBg: colors.iconDishes },
  ],
  '7-9': [
    { id: 'make_bed',      name: 'Make bed',          xp: 15, difficulty: 'Easy',   icon: require('../../assets/icons/chores/chore=iconBed.png'),     iconBg: colors.iconBed },
    { id: 'unload_dishes', name: 'Unload dishwasher', xp: 20, difficulty: 'Medium', icon: require('../../assets/icons/chores/chore=iconDishes.png'),  iconBg: colors.iconDishes },
    { id: 'take_trash',    name: 'Take out trash',    xp: 20, difficulty: 'Medium', icon: require('../../assets/icons/chores/chore=iconGarbage.png'), iconBg: colors.iconTrash },
    { id: 'pack_bag',      name: 'Pack school bag',   xp: 15, difficulty: 'Easy',   icon: require('../../assets/icons/chores/chore=iconBroom.png'),   iconBg: colors.iconBroom },
    { id: 'water_plants',  name: 'Water plants',      xp: 10, difficulty: 'Easy',   icon: require('../../assets/icons/chores/chore=iconSoap.png'),    iconBg: colors.iconTrash },
  ],
  '10-12': [
    { id: 'vacuum',      name: 'Vacuum',         xp: 25, difficulty: 'Medium', icon: require('../../assets/icons/chores/chore=iconVacuum.png'),  iconBg: colors.iconBlue },
    { id: 'laundry',     name: 'Do laundry',     xp: 30, difficulty: 'Hard',   icon: require('../../assets/icons/chores/chore=iconLaundry.png'), iconBg: colors.iconLaundry },
    { id: 'wash_dishes', name: 'Wash dishes',    xp: 20, difficulty: 'Medium', icon: require('../../assets/icons/chores/chore=iconDishes.png'),  iconBg: colors.iconDishes },
    { id: 'clean_bath',  name: 'Clean bathroom', xp: 25, difficulty: 'Hard',   icon: require('../../assets/icons/chores/chore=iconSoap.png'),    iconBg: colors.iconBlue },
    { id: 'take_trash',  name: 'Take out trash', xp: 20, difficulty: 'Easy',   icon: require('../../assets/icons/chores/chore=iconGarbage.png'), iconBg: colors.iconTrash },
  ],
  '13+': [
    { id: 'vacuum',     name: 'Vacuum',         xp: 25, difficulty: 'Medium', icon: require('../../assets/icons/chores/chore=iconVacuum.png'),  iconBg: colors.iconBlue },
    { id: 'laundry',    name: 'Do laundry',     xp: 30, difficulty: 'Hard',   icon: require('../../assets/icons/chores/chore=iconLaundry.png'), iconBg: colors.iconLaundry },
    { id: 'sweep',      name: 'Sweep floors',   xp: 20, difficulty: 'Easy',   icon: require('../../assets/icons/chores/chore=iconBroom.png'),   iconBg: colors.iconBroom },
    { id: 'clean_bath', name: 'Clean bathroom', xp: 30, difficulty: 'Hard',   icon: require('../../assets/icons/chores/chore=iconSoap.png'),    iconBg: colors.iconBlue },
    { id: 'take_trash', name: 'Take out trash', xp: 20, difficulty: 'Easy',   icon: require('../../assets/icons/chores/chore=iconGarbage.png'), iconBg: colors.iconTrash },
  ],
};

const CHORE_ICONS: { icon: ReturnType<typeof require>; bg: string }[] = [
  { icon: require('../../assets/icons/chores/chore=iconBed.png'),     bg: colors.iconBed },
  { icon: require('../../assets/icons/chores/chore=iconBroom.png'),   bg: colors.iconBroom },
  { icon: require('../../assets/icons/chores/chore=iconDishes.png'),  bg: colors.iconDishes },
  { icon: require('../../assets/icons/chores/chore=iconGarbage.png'), bg: colors.iconTrash },
  { icon: require('../../assets/icons/chores/chore=iconLaundry.png'), bg: colors.iconLaundry },
  { icon: require('../../assets/icons/chores/chore=iconSoap.png'),    bg: colors.iconBlue },
  { icon: require('../../assets/icons/chores/chore=iconVacuum.png'),  bg: colors.iconBlue },
];

// MON-85: the onboarding chore picker offers exactly this fixed starter set
// (not the age-derived union). Parents add more / reassign later.
const STARTER_CHORES: SuggestedChore[] = [
  { id: 'set_table',   name: 'Set the table', xp: 15, difficulty: 'Easy',   icon: require('../../assets/icons/chores/chore=iconDishes.png'), iconBg: colors.iconDishes, frequency: 'Every day',        completionMode: 'shared' },
  { id: 'make_bed',    name: 'Make bed',       xp: 10, difficulty: 'Easy',   icon: require('../../assets/icons/chores/chore=iconBed.png'),    iconBg: colors.iconBed,    frequency: 'Every day',        completionMode: 'independent' },
  { id: 'vacuum',      name: 'Vacuum',         xp: 20, difficulty: 'Medium', icon: require('../../assets/icons/chores/chore=iconVacuum.png'), iconBg: colors.iconBlue,   frequency: '2 times per week', completionMode: 'shared' },
  { id: 'wash_dishes', name: 'Wash dishes',    xp: 25, difficulty: 'Hard',   icon: require('../../assets/icons/chores/chore=iconSoap.png'),   iconBg: colors.iconBlue,   frequency: 'Every day',        completionMode: 'shared' },
];
// Default-checked on entry (Wash dishes starts unchecked).
const STARTER_DEFAULT_IDS = ['set_table', 'make_bed', 'vacuum'];

// Reward type still used in Step4ChooseReward (payout/slider) and persisted
const REWARD_TYPES = [
  { id: 'screen_time',        label: 'Screen time',       desc: 'e.g. 30 mins extra',   icon: '🎮' },
  { id: 'allowance',          label: 'Allowance',         desc: 'e.g. $5 per week',     icon: '💵' },
  { id: 'treats',             label: 'Treats',            desc: 'e.g. ice cream night',  icon: '🍦' },
  { id: 'special_activities', label: 'Special activities', desc: 'e.g. late bedtime',   icon: '⭐' },
  { id: 'custom',             label: 'Custom reward',     desc: 'You decide',            icon: '✏️' },
];

// ─── Slider helpers ────────────────────────────────────────────────────────

// Base pay range: $0.25 – $2.00 in $0.25 steps → 8 steps (index 0..7)
export const BASE_PAY_STEPS = [0.25, 0.50, 0.75, 1.00, 1.25, 1.50, 1.75, 2.00];
const MEDIUM_MULTIPLIER = 1.5;
const HARD_MULTIPLIER   = 2.0;

function fmtDollar(n: number) {
  return `$${n.toFixed(2)}`;
}

function difficultyAmounts(baseIdx: number) {
  const base = BASE_PAY_STEPS[baseIdx];
  return {
    easy:   base,
    medium: parseFloat((base * MEDIUM_MULTIPLIER).toFixed(2)),
    hard:   parseFloat((base * HARD_MULTIPLIER).toFixed(2)),
  };
}

// ─── Helpers ───────────────────────────────────────────────────────────────

// A random 8-digit standing pairing code, shown in onboarding (Step 5) and used
// as the kid's kids.pairing_code on insert. The DB enforces uniqueness; a
// collision (astronomically unlikely at 90M codes) falls back to the DB
// generator in saveOnboardingSetup, so onboarding never fails.
function gen8(): string {
  return String(Math.floor(10000000 + Math.random() * 90000000));
}

function makeChild(index: number): OnboardingChild {
  return {
    id: `child_${Date.now()}_${index}`,
    name: '',
    avatarColor: AVATAR_COLORS[index % AVATAR_COLORS.length],
    avatarIdx: index % AVATARS.length,
    ageRange: '7-9',
    difficulty: 'Medium',
    selectedChoreIds: CHORES_BY_AGE['7-9'].slice(0, 4).map(c => c.id),
    pairingCode: gen8(),
  };
}

// ─── Shared sub-components ─────────────────────────────────────────────────

// Prototype top bar: a single back chevron (no step dots). When `onBack` is
// omitted (the first parent step) we render an empty spacer to keep layout
// height consistent.
function ObTopBar({ onBack }: { onBack?: () => void }) {
  return (
    <View style={s.topBar}>
      {onBack ? (
        <TouchableOpacity onPress={onBack} hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }} activeOpacity={0.7}>
          <Text style={s.backChevron}>‹</Text>
        </TouchableOpacity>
      ) : null}
    </View>
  );
}

function AvatarCircle({ name, color, size = 44 }: { name: string; color: string; size?: number }) {
  const initial = (name.trim()[0] ?? '?').toUpperCase();
  return (
    <View style={[s.avatarCircle, { width: size, height: size, borderRadius: size / 2, backgroundColor: color }]}>
      <Text style={[s.avatarInitial, { fontSize: size * 0.42 }]}>{initial}</Text>
    </View>
  );
}

function useBottomSheet(height = 300) {
  const [open, setOpen] = useState(false);
  const sheetY       = useRef(new Animated.Value(height)).current;
  const scrimOpacity = useRef(new Animated.Value(0)).current;

  const openSheet = () => {
    setOpen(true);
    scrimOpacity.setValue(1);
    sheetY.setValue(height);
    Animated.spring(sheetY, { toValue: 0, useNativeDriver: true, tension: 65, friction: 11 }).start();
  };

  const closeSheet = (cb?: () => void) => {
    Animated.timing(sheetY, { toValue: height, duration: 220, useNativeDriver: true, easing: Easing.in(Easing.ease) }).start(() => {
      setOpen(false);
      cb?.();
    });
  };

  return { open, openSheet, closeSheet, sheetY, scrimOpacity };
}

function AgeRangePicker({
  value, onChange, fullWidth,
}: { value: OnboardingChild['ageRange']; onChange: (v: OnboardingChild['ageRange']) => void; fullWidth?: boolean }) {
  const { open, openSheet, closeSheet, sheetY, scrimOpacity } = useBottomSheet();

  function handlePress() {
    openSheet();
  }

  return (
    <>
      {fullWidth ? (
        <TouchableOpacity style={s.ageField} onPress={handlePress} activeOpacity={0.8}>
          <Text style={s.ageFieldLabel}>{value}</Text>
          <Text style={s.ageFieldChevron}>▾</Text>
        </TouchableOpacity>
      ) : (
        <TouchableOpacity style={s.selectPill} onPress={handlePress} activeOpacity={0.7}>
          <Text style={s.selectPillLabel}>{value}</Text>
          <Text style={s.selectChevron}>▾</Text>
        </TouchableOpacity>
      )}

      <Modal visible={open} transparent animationType="none" onRequestClose={() => closeSheet()}>
        <Animated.View style={[s.sheetScrim, { opacity: scrimOpacity }]}>
          <TouchableOpacity style={{ flex: 1 }} activeOpacity={1} onPress={() => closeSheet()} />
          <Animated.View style={[s.sheet, { transform: [{ translateY: sheetY }] }]} onStartShouldSetResponder={() => true}>
            <View style={s.sheetHandle} />
            <Text style={s.sheetHeading}>Age range</Text>
            {AGE_RANGES.map((range, i) => (
              <TouchableOpacity
                key={range}
                style={[s.sheetRow, i < AGE_RANGES.length - 1 && s.sheetRowBorder]}
                activeOpacity={0.7}
                onPress={() => closeSheet(() => onChange(range))}
              >
                <Text style={[s.sheetRowLabel, value === range && s.sheetRowLabelActive]}>{range}</Text>
                {value === range && <Text style={s.sheetCheck}>✓</Text>}
              </TouchableOpacity>
            ))}
            <View style={{ height: 24 }} />
          </Animated.View>
        </Animated.View>
      </Modal>
    </>
  );
}

function AvatarPicker({
  avatarIdx, onChange, size = 44,
}: { avatarIdx: number; onChange: (idx: number) => void; size?: number }) {
  const { open, openSheet, closeSheet, sheetY, scrimOpacity } = useBottomSheet(400);
  const scrollRef = useRef<ScrollView>(null);

  // Land the carousel on the current avatar each time it opens.
  useEffect(() => {
    if (open) {
      requestAnimationFrame(() =>
        scrollRef.current?.scrollTo({ x: Math.max(0, avatarIdx * AVATAR_CELL_STRIDE - AVATAR_CELL_STRIDE), animated: false })
      );
    }
  }, [open, avatarIdx]);

  return (
    <>
      <TouchableOpacity onPress={openSheet} activeOpacity={0.8} style={{ width: size, height: size }}>
        <View style={[s.avatarCircle, { width: size, height: size, borderRadius: size / 2, overflow: 'hidden', borderWidth: 3, borderColor: BLACK }]}>
          <Image source={AVATARS[avatarIdx]} style={{ width: '100%', height: '100%' }} resizeMode="cover" />
        </View>
        <View style={[s.avatarEditBadge, { width: size * 0.34, height: size * 0.34, borderRadius: size * 0.17 }]}>
          <Image source={require('../../assets/icons/icon-pencil.png')} style={{ width: size * 0.17, height: size * 0.17 }} resizeMode="contain" />
        </View>
      </TouchableOpacity>

      <Modal visible={open} transparent animationType="none" onRequestClose={() => closeSheet()}>
        <Animated.View style={[s.sheetScrim, { opacity: scrimOpacity }]}>
          <TouchableOpacity style={{ flex: 1 }} activeOpacity={1} onPress={() => closeSheet()} />
          <Animated.View style={[s.sheet, { transform: [{ translateY: sheetY }] }]} onStartShouldSetResponder={() => true}>
            <View style={s.sheetHandle} />
            <Text style={s.sheetHeading}>Choose avatar</Text>
            <ScrollView ref={scrollRef} horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.avatarRow}>
              {AVATARS.map((src, i) => (
                <TouchableOpacity
                  key={i}
                  style={[s.avatarCarouselCell, avatarIdx === i && s.avatarGridCellActive]}
                  onPress={() => { onChange(i); closeSheet(); }}
                  activeOpacity={0.8}
                >
                  <Image source={src} style={{ width: '100%', height: '100%' }} resizeMode="cover" />
                </TouchableOpacity>
              ))}
            </ScrollView>
            <View style={{ height: Platform.OS === 'ios' ? 28 : 12 }} />
          </Animated.View>
        </Animated.View>
      </Modal>
    </>
  );
}

// ─── Difficulty badge ──────────────────────────────────────────────────────

function DifficultyBadge({ difficulty }: { difficulty: 'Easy' | 'Medium' | 'Hard' }) {
  const style = difficulty === 'Easy'
    ? { bg: DIFF_EASY_BG, text: DIFF_EASY_TEXT }
    : difficulty === 'Medium'
    ? { bg: DIFF_MED_BG, text: DIFF_MED_TEXT }
    : { bg: DIFF_HARD_BG, text: DIFF_HARD_TEXT };
  return (
    <View style={[s.diffBadge, { backgroundColor: style.bg }]}>
      <Text style={[s.diffBadgeText, { color: style.text }]}>{difficulty}</Text>
    </View>
  );
}

// ─── Horizontal Slider — smooth drag, snaps to 25¢ on release ─────────────

const PAY_MIN = 0.25;
const PAY_MAX = 2.00;
const PAY_STEP = 0.25;

function snapToCents(raw: number): number {
  return Math.round(Math.max(PAY_MIN, Math.min(PAY_MAX, raw)) / PAY_STEP) * PAY_STEP;
}

function centsToIdx(cents: number): number {
  return Math.round((cents - PAY_MIN) / PAY_STEP);
}

function PaySlider({ value, onChange, onLiveChange, onDragging }: { value: number; onChange: (idx: number) => void; onLiveChange?: (dollars: number) => void; onDragging?: (isDragging: boolean) => void }) {
  const trackWidthRef = useRef(0);

  // Raw drag position (0–1 ratio) drives the visual; snapped value drives numbers
  const dragRatio   = useRef(value / (BASE_PAY_STEPS.length - 1)).current;
  const thumbX      = useRef(new Animated.Value(value / (BASE_PAY_STEPS.length - 1))).current;
  const thumbScale  = useRef(new Animated.Value(1)).current;

  // Live display value during drag (not snapped yet)
  const [liveValue, setLiveValue] = useState(BASE_PAY_STEPS[value]);

  const ratioToDollars = (ratio: number) =>
    PAY_MIN + ratio * (PAY_MAX - PAY_MIN);

  const lastSnappedRef = useRef<number | null>(null);

  const panResponder = useRef(
    PanResponder.create({
      // Capture immediately — prevents ScrollView from stealing the gesture
      onStartShouldSetPanResponder:        () => true,
      onStartShouldSetPanResponderCapture: () => true,
      onMoveShouldSetPanResponder:         () => true,
      onMoveShouldSetPanResponderCapture:  () => true,
      onPanResponderGrant: (e) => {
        onDragging?.(true);
        Animated.spring(thumbScale, { toValue: 1.25, useNativeDriver: false, tension: 300, friction: 8 }).start();
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        const ratio = Math.max(0, Math.min(1, e.nativeEvent.locationX / (trackWidthRef.current || 1)));
        thumbX.setValue(ratio);
        const raw = ratioToDollars(ratio);
        setLiveValue(raw); onLiveChange?.(raw);
      },
      onPanResponderMove: (e) => {
        const ratio = Math.max(0, Math.min(1, e.nativeEvent.locationX / (trackWidthRef.current || 1)));
        thumbX.setValue(ratio);
        const raw = ratioToDollars(ratio);
        setLiveValue(raw); onLiveChange?.(raw);
        // Haptic tick each time we cross a 25¢ boundary
        const snapped = snapToCents(raw);
        if (snapped !== lastSnappedRef.current) {
          lastSnappedRef.current = snapped;
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        }
      },
      onPanResponderRelease: (e) => {
        onDragging?.(false);
        Animated.spring(thumbScale, { toValue: 1, useNativeDriver: false, tension: 200, friction: 6 }).start();
        const ratio = Math.max(0, Math.min(1, e.nativeEvent.locationX / (trackWidthRef.current || 1)));
        const snapped = snapToCents(ratioToDollars(ratio));
        const snappedRatio = (snapped - PAY_MIN) / (PAY_MAX - PAY_MIN);
        Animated.spring(thumbX, { toValue: snappedRatio, useNativeDriver: false, tension: 280, friction: 9 }).start();
        setLiveValue(snapped); onLiveChange?.(snapped);
        onChange(centsToIdx(snapped));
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        lastSnappedRef.current = null;
      },
      onPanResponderTerminate: () => {
        onDragging?.(false);
        Animated.spring(thumbScale, { toValue: 1, useNativeDriver: false, tension: 200, friction: 6 }).start();
        lastSnappedRef.current = null;
      },
    }),
  ).current;

  // Sync thumbX when value changes externally (ratio 0–1)
  useEffect(() => {
    const snappedRatio = (BASE_PAY_STEPS[value] - PAY_MIN) / (PAY_MAX - PAY_MIN);
    Animated.spring(thumbX, { toValue: snappedRatio, useNativeDriver: false, tension: 280, friction: 9 }).start();
    setLiveValue(BASE_PAY_STEPS[value]); onLiveChange?.(BASE_PAY_STEPS[value]);
  }, [value]);

  const [trackWidth, setTrackWidth] = useState(0);
  const snappedDisplay = liveValue; // show raw during drag, parent snaps on release

  // Interpolate ratio → pixels once track width is known
  const w = trackWidth > 0 ? trackWidth : 1;
  const fillWidthAnim   = thumbX.interpolate({ inputRange: [0, 1], outputRange: [0, w] });
  const thumbTranslateX = thumbX.interpolate({ inputRange: [0, 1], outputRange: [-12, w - 12] });

  return (
    <View {...panResponder.panHandlers} style={{ paddingVertical: 12 }}>
      <View
        style={s.sliderTrack}
        onLayout={e => { const tw = e.nativeEvent.layout.width; trackWidthRef.current = tw; setTrackWidth(tw); }}
      >
        <Animated.View style={[s.sliderFill, { width: fillWidthAnim }]} />
        <Animated.View
          style={[s.sliderThumb, { position: 'absolute', left: 0, transform: [{ translateX: thumbTranslateX }, { scale: thumbScale }] }]}
          pointerEvents="none"
        />
      </View>
      <View style={s.sliderLabels}>
        {(['Easy', 'Medium', 'Hard'] as const).map(d => {
          const base = snappedDisplay;
          const amt = d === 'Easy' ? base : d === 'Medium' ? parseFloat((base * MEDIUM_MULTIPLIER).toFixed(2)) : parseFloat((base * HARD_MULTIPLIER).toFixed(2));
          return (
            <View key={d} style={{ alignItems: 'center', flex: 1 }}>
              <Text style={s.sliderLabelText}>{d}</Text>
              <Text style={s.sliderLabelAmt}>{fmtDollar(amt)}</Text>
            </View>
          );
        })}
      </View>
    </View>
  );
}

// ─── Add kid (single) ──────────────────────────────────────────────────────
// MON-85: the prototype splits kid setup into two screens — a single-kid form
// here (name + age + pairing note), then the "Anyone else?" roster. We edit a
// working draft; the parent flow commits it into `children` on Continue.

function AddKidScreen({
  draft, setDraft, isFirst, canRemove, onContinue, onRemove, onBack,
}: {
  draft: OnboardingChild;
  setDraft: React.Dispatch<React.SetStateAction<OnboardingChild | null>>;
  isFirst: boolean;
  canRemove: boolean;
  onContinue: (draft: OnboardingChild) => void;
  onRemove: () => void;
  onBack: () => void;
}) {
  const canContinue = draft.name.trim().length > 0;
  const patch = (p: Partial<OnboardingChild>) => setDraft(prev => (prev ? { ...prev, ...p } : prev));

  return (
    <DotGridBg>
      <SafeAreaView style={{ flex: 1 }} edges={['top', 'bottom']}>
        <ObTopBar onBack={onBack} />
        <ScrollView style={{ flex: 1 }} contentContainerStyle={{ paddingHorizontal: 24, paddingTop: 8, paddingBottom: 16 }} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
          <Helper text={isFirst ? 'Add your first kid. You can add the rest on the next step.' : 'Add another kid. They get their own Monstir too.'} />

          <View style={{ alignItems: 'center', marginTop: 12, marginBottom: 8 }}>
            <AvatarPicker avatarIdx={draft.avatarIdx} onChange={idx => patch({ avatarIdx: idx })} size={88} />
            <Text style={s.avatarHint}>Tap to choose avatar</Text>
          </View>

          <Text style={s.fieldLabel}>KID'S NAME</Text>
          <TextInput
            style={s.fieldInput}
            value={draft.name}
            onChangeText={v => patch({ name: v })}
            placeholder="Name"
            placeholderTextColor={colors.hint}
            autoCapitalize="words"
            returnKeyType="done"
          />

          <Text style={[s.fieldLabel, { marginTop: 20 }]}>AGE</Text>
          <AgeRangePicker value={draft.ageRange} onChange={v => patch({ ageRange: v })} fullWidth />

          <View style={s.pairingNote}>
            <Text style={s.pairingNoteText}>💡  They'll join with a pairing code. No email or password needed for the kid.</Text>
          </View>

          {canRemove && (
            <TouchableOpacity onPress={onRemove} activeOpacity={0.7} style={{ alignItems: 'center', paddingVertical: 10, marginTop: 8 }}>
              <Text style={s.removeKidLink}>Remove this kid</Text>
            </TouchableOpacity>
          )}
        </ScrollView>

        <View style={s.footer}>
          <Button label="Continue" onPress={() => onContinue(draft)} disabled={!canContinue} />
        </View>
      </SafeAreaView>
    </DotGridBg>
  );
}

// ─── Anyone else? (roster) ─────────────────────────────────────────────────

function AnyoneElseScreen({
  children, onAddAnother, onEdit, onContinue, onBack,
}: {
  children: OnboardingChild[];
  onAddAnother: () => void;
  onEdit: (child: OnboardingChild) => void;
  onContinue: () => void;
  onBack: () => void;
}) {
  return (
    <DotGridBg>
      <SafeAreaView style={{ flex: 1 }} edges={['top', 'bottom']}>
        <ObTopBar onBack={onBack} />
        <ScrollView style={{ flex: 1 }} contentContainerStyle={{ paddingHorizontal: 24, paddingTop: 8, paddingBottom: 16 }} showsVerticalScrollIndicator={false}>
          <Helper text="Got more kids? Add them all now. Chores come next." />
          <Text style={[s.heading, { marginBottom: 16 }]}>Anyone else?</Text>

          <View style={{ gap: 14 }}>
            {children.map(child => (
              <TouchableOpacity key={child.id} style={s.rosterCard} onPress={() => onEdit(child)} activeOpacity={0.85}>
                <View style={s.rosterAvatar}>
                  <Image source={AVATARS[child.avatarIdx]} style={{ width: '100%', height: '100%' }} resizeMode="cover" />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={s.rosterName}>{child.name}</Text>
                  <Text style={s.rosterSub}>Added</Text>
                </View>
                <View style={s.rosterCheck}>
                  <Text style={s.rosterCheckMark}>✓</Text>
                </View>
              </TouchableOpacity>
            ))}
          </View>

          <TouchableOpacity style={s.rosterAddBtn} onPress={onAddAnother} activeOpacity={0.8}>
            <Text style={s.rosterAddLabel}>+ Add another kid</Text>
          </TouchableOpacity>
        </ScrollView>

        <View style={s.footer}>
          <Button label="That's everyone" onPress={onContinue} disabled={children.length === 0} />
        </View>
      </SafeAreaView>
    </DotGridBg>
  );
}

// ─── Step 2: Parent Identity ───────────────────────────────────────────────

const PARENT_CARDS = [
  { id: 'mom', label: 'Mom', image: require('../../assets/icons/Avatars/parentProfileMom.png') },
  { id: 'dad', label: 'Dad', image: require('../../assets/icons/Avatars/parentProfileDad.png') },
] as const;

const PARENT_CHIPS = ['Guardian', 'Grandma', 'Grandpa', 'Caregiver'] as const;

function Step2ParentIdentity({
  parentRole,
  setParentRole,
  onNext,
}: {
  parentRole: string;
  setParentRole: (v: string) => void;
  onNext: () => void;
}) {
  const selectedCard = PARENT_CARDS.find(c => c.id === parentRole) ? parentRole : null;
  const selectedChip = PARENT_CHIPS.map(c => c.toLowerCase()).includes(parentRole.toLowerCase()) && !selectedCard ? parentRole : null;

  const selectCard = (id: string) => setParentRole(id);
  const selectChip = (label: string) => setParentRole(label.toLowerCase());

  return (
    <DotGridBg>
      <SafeAreaView style={{ flex: 1 }} edges={['top', 'bottom']}>
        <ObTopBar />

        <ScrollView style={{ flex: 1 }} contentContainerStyle={{ paddingHorizontal: 24, paddingTop: 8, gap: 24 }} showsVerticalScrollIndicator={false}>
          <Helper text="Pick your role. This shows up when you leave notes for your kids." />
          <Text style={s.heading}>Who's the boss?</Text>
          {/* 2-column avatar card grid */}
          <View style={{ flexDirection: 'row', gap: 14 }}>
            {PARENT_CARDS.map(card => {
              const active = selectedCard === card.id;
              return (
                <TouchableOpacity
                  key={card.id}
                  style={[s.parentCard, active && s.parentCardActive, { flex: 1 }]}
                  onPress={() => selectCard(card.id)}
                  activeOpacity={0.8}
                >
                  <Image source={card.image} style={s.parentCardEmoji} resizeMode="contain" />
                  <Text style={[s.parentCardLabel, active && s.parentCardLabelActive]}>{card.label}</Text>
                </TouchableOpacity>
              );
            })}
          </View>

          {/* "Or pick another title" label */}
          <Text style={s.orPickLabel}>Or pick another title</Text>

          {/* Chip row */}
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginTop: -10 }}>
            {PARENT_CHIPS.map(chip => {
              const active = selectedChip === chip.toLowerCase();
              return (
                <TouchableOpacity
                  key={chip}
                  style={[s.parentChip, active && s.parentChipActive]}
                  onPress={() => selectChip(chip)}
                  activeOpacity={0.8}
                >
                  <Text style={[s.parentChipLabel, active && s.parentChipLabelActive]}>{chip}</Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </ScrollView>

        <View style={s.footer}>
          <Button label="Continue" onPress={onNext} />
        </View>
      </SafeAreaView>
    </DotGridBg>
  );
}

// ─── Step 3: Assign Chores ─────────────────────────────────────────────────

function Step3AssignChores({
  children, sharedChoreIds, setSharedChoreIds, customChores, setCustomChores, onNext, onBack,
}: {
  children: OnboardingChild[];
  sharedChoreIds: string[];
  setSharedChoreIds: React.Dispatch<React.SetStateAction<string[]>>;
  customChores: SuggestedChore[];
  setCustomChores: React.Dispatch<React.SetStateAction<SuggestedChore[]>>;
  onNext: () => void;
  onBack: () => void;
}) {
  const [choreInput, setChoreInput] = useState('');
  const [selectedIconIdx, setSelectedIconIdx] = useState(0);
  const { open: addSheetOpen, openSheet: openAddSheet, closeSheet: closeAddSheet, sheetY: addSheetY, scrimOpacity: addScrimOpacity } = useBottomSheet(380);

  // One shared starter set for the whole family: a fixed list of starter chores,
  // plus any custom chores the parent adds.
  const allChores = [...STARTER_CHORES, ...customChores];

  const removeChore = (choreId: string) => {
    setSharedChoreIds(prev => prev.filter(id => id !== choreId));
    setCustomChores(prev => prev.filter(c => c.id !== choreId));
  };

  const toggleChore = (choreId: string) => {
    setSharedChoreIds(prev =>
      prev.includes(choreId) ? prev.filter(id => id !== choreId) : [...prev, choreId]
    );
  };

  const addCustomChore = () => {
    const name = choreInput.trim();
    if (!name) return;
    const id = `custom_${Date.now()}`;
    const { icon, bg } = CHORE_ICONS[selectedIconIdx];
    const chore: SuggestedChore = { id, name, xp: 15, difficulty: 'Easy', icon, iconBg: bg };
    setCustomChores(prev => [...prev, chore]);
    setSharedChoreIds(prev => [...prev, id]);
    setChoreInput('');
    setSelectedIconIdx(0);
    closeAddSheet();
  };

  return (
    <DotGridBg>
      <SafeAreaView style={{ flex: 1 }} edges={['top', 'bottom']}>
        <ObTopBar onBack={onBack} />

        <ScrollView style={{ flex: 1 }} contentContainerStyle={{ paddingHorizontal: 16, paddingTop: 8, paddingBottom: 16 }} showsVerticalScrollIndicator={false}>
          <View style={{ paddingHorizontal: 8 }}>
            <Helper text="These apply to everyone to start. You can add more and give them to specific kids later." />
            <Text style={[s.heading, { marginBottom: 12 }]}>Pick starter chores</Text>
          </View>
          <View style={{ gap: 10, marginTop: 4 }}>
            {allChores.map(chore => {
              const checked = sharedChoreIds.includes(chore.id);
              return (
                <TouchableOpacity
                  key={chore.id}
                  style={[s.choreRow, checked && s.choreRowChecked]}
                  onPress={() => toggleChore(chore.id)}
                  activeOpacity={0.8}
                >
                  <View style={[s.checkbox, checked && s.checkboxChecked]}>
                    {checked && <Text style={{ color: colors.white, fontSize: fontSize.sm, fontFamily: interFamily.bold }}>✓</Text>}
                  </View>
                  <Text style={s.choreName}>{chore.name}</Text>
                  <DifficultyBadge difficulty={chore.difficulty} />
                  <TouchableOpacity onPress={() => removeChore(chore.id)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }} activeOpacity={0.6}>
                    <Text style={s.choreRemove}>×</Text>
                  </TouchableOpacity>
                </TouchableOpacity>
              );
            })}
          </View>

          <TouchableOpacity style={[s.addChildBtn, { marginTop: 16 }]} onPress={openAddSheet} activeOpacity={0.7}>
            <Text style={s.addChildLabel}>+ Add a chore</Text>
          </TouchableOpacity>
        </ScrollView>

        {/* Add chore sheet */}
        <Modal visible={addSheetOpen} transparent animationType="none" onRequestClose={() => closeAddSheet()}>
          <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
            <Animated.View style={[s.sheetScrim, { opacity: addScrimOpacity }]}>
              <TouchableOpacity style={{ flex: 1 }} activeOpacity={1} onPress={() => { setChoreInput(''); closeAddSheet(); }} />
              <Animated.View style={[s.sheet, { transform: [{ translateY: addSheetY }] }]} onStartShouldSetResponder={() => true}>
                <View style={s.sheetHandle} />
                <Text style={s.sheetHeading}>Add a chore</Text>
                <View style={s.addChoreBody}>
                  <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.iconPickerRow}>
                    {CHORE_ICONS.map(({ icon, bg }, i) => (
                      <TouchableOpacity
                        key={i}
                        style={[s.iconPickerCell, { backgroundColor: bg }, selectedIconIdx === i && s.iconPickerCellActive]}
                        onPress={() => setSelectedIconIdx(i)}
                        activeOpacity={0.8}
                      >
                        <Image source={icon} style={{ width: 28, height: 28 }} resizeMode="contain" />
                      </TouchableOpacity>
                    ))}
                  </ScrollView>
                  <TextInput
                    style={s.addChoreInput}
                    value={choreInput}
                    onChangeText={setChoreInput}
                    placeholder="e.g. Clean the car"
                    placeholderTextColor={colors.hint}
                    autoFocus
                    autoCapitalize="sentences"
                    returnKeyType="done"
                    onSubmitEditing={addCustomChore}
                  />
                  <Button label="Add chore" onPress={addCustomChore} disabled={!choreInput.trim()} />
                </View>
                <View style={{ height: Platform.OS === 'ios' ? 28 : 16 }} />
              </Animated.View>
            </Animated.View>
          </KeyboardAvoidingView>
        </Modal>

        <View style={s.footer}>
          <Button label="Continue" onPress={onNext} />
        </View>
      </SafeAreaView>
    </DotGridBg>
  );
}

// ─── Step 4: Set Payout ────────────────────────────────────────────────────

function Step4ChooseReward({
  rewardType, setRewardType, onNext, onBack, children,
}: {
  rewardType: string;
  setRewardType: (v: string) => void;
  onNext: () => void;
  onBack: () => void;
  children: OnboardingChild[];
}) {
  // basePayIdx encodes the selected base pay step. We store it as the rewardType
  // string so we don't need to add new state to the top-level.
  // Format: "payout:N" where N is the step index. Fall back to index 1 ($0.50).
  const parseIdx = () => {
    const m = rewardType.match(/^payout:(\d+)$/);
    return m ? Math.min(parseInt(m[1], 10), BASE_PAY_STEPS.length - 1) : 1;
  };

  const [baseIdx, setBaseIdx] = useState(parseIdx);
  const amountPop = useRef(new Animated.Value(1)).current;

  const handleChange = (idx: number) => {
    setBaseIdx(idx);
    setRewardType(`payout:${idx}`);
    // Pop the amount display on each step change
    Animated.sequence([
      Animated.timing(amountPop, { toValue: 1.2, duration: 70, useNativeDriver: true }),
      Animated.spring(amountPop, { toValue: 1, useNativeDriver: true, tension: 300, friction: 7 }),
    ]).start();
  };

  const [liveDisplay, setLiveDisplay] = useState(BASE_PAY_STEPS[baseIdx]);
  const [isDragging, setIsDragging] = useState(false);
  const liveBase = liveDisplay; // raw during drag, snaps to 25¢ on release
  const amounts = {
    easy:   liveBase,
    medium: parseFloat((liveBase * MEDIUM_MULTIPLIER).toFixed(2)),
    hard:   parseFloat((liveBase * HARD_MULTIPLIER).toFixed(2)),
  };

  // Gather up to 3 example chores from across all kids (one per difficulty)
  const exampleChores: { name: string; difficulty: 'Easy' | 'Medium' | 'Hard' }[] = [];
  for (const diff of (['Easy', 'Medium', 'Hard'] as const)) {
    for (const ageRange of Object.keys(CHORES_BY_AGE) as OnboardingChild['ageRange'][]) {
      const c = CHORES_BY_AGE[ageRange].find(ch => ch.difficulty === diff);
      if (c && !exampleChores.find(e => e.difficulty === diff)) {
        exampleChores.push({ name: c.name, difficulty: diff });
      }
    }
  }

  return (
    <DotGridBg>
      <SafeAreaView style={{ flex: 1 }} edges={['top', 'bottom']}>
        <ObTopBar onBack={onBack} />

        <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 16, gap: 16 }} showsVerticalScrollIndicator={false} scrollEnabled={!isDragging}>
          <View style={{ paddingHorizontal: 8 }}>
            <Helper text="Set one base rate. Difficulty does the rest, you can change it later." />
            <Text style={s.heading}>Set your payout</Text>
          </View>
          {/* Slider card */}
          <View style={s.payCard}>
            <Text style={s.payCardLabel}>Base pay per chore</Text>
            <Animated.Text style={[s.payAmount, { transform: [{ scale: amountPop }] }]}>{fmtDollar(liveBase)}</Animated.Text>
            <PaySlider value={baseIdx} onChange={handleChange} onLiveChange={setLiveDisplay} onDragging={setIsDragging} />
          </View>

          {/* Example rows */}
          <View style={{ gap: 10 }}>
            {exampleChores.map(({ name, difficulty }) => {
              const amt = difficulty === 'Easy' ? amounts.easy : difficulty === 'Medium' ? amounts.medium : amounts.hard;
              return (
                <View key={difficulty} style={s.exampleRow}>
                  <Text style={s.exampleName}>{name}</Text>
                  <DifficultyBadge difficulty={difficulty} />
                  <Text style={s.exampleAmt}>{fmtDollar(amt)}</Text>
                </View>
              );
            })}
          </View>
        </ScrollView>

        <View style={s.footer}>
          <Button label="Looks good!" onPress={onNext} />
        </View>
      </SafeAreaView>
    </DotGridBg>
  );
}

// ─── Step 5: All Set ───────────────────────────────────────────────────────

const INFO_CHIPS = [
  { emoji: '👧', text: 'Have your kids open Monstir and enter your **family code** to join.' },
  { emoji: '✅', text: 'When they complete a chore, you\'ll get a **notification to approve** it.' },
  { emoji: '⚔️', text: 'Every Sunday, your family fights a **boss battle** together.' },
] as const;

function renderBoldText(text: string, baseStyle: object, boldStyle: object) {
  const parts = text.split(/\*\*(.*?)\*\*/g);
  return parts.map((part, i) =>
    i % 2 === 1
      ? <Text key={i} style={boldStyle}>{part}</Text>
      : <Text key={i} style={baseStyle}>{part}</Text>
  );
}

function Step5AllSet({
  children, rewardType, onComplete, onBack, submitError,
}: {
  children: OnboardingChild[];
  rewardType: string;
  onComplete: () => void;
  onBack: () => void;
  submitError?: string;
}) {
  const bounceAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(bounceAnim, { toValue: -16, duration: 400, useNativeDriver: true, easing: Easing.out(Easing.quad) }),
        Animated.timing(bounceAnim, { toValue: 0,   duration: 400, useNativeDriver: true, easing: Easing.in(Easing.quad) }),
        Animated.delay(600),
      ]),
    ).start();
  }, []);

  return (
    <DotGridBg>
      <SafeAreaView style={{ flex: 1 }} edges={['top', 'bottom']}>
        <ObTopBar onBack={onBack} />

        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={{ alignItems: 'center', paddingHorizontal: 24, paddingTop: 16, paddingBottom: 16, gap: 20 }}
          showsVerticalScrollIndicator={false}
        >
          {/* Bouncing emoji */}
          <Animated.Text style={[s.allSetEmoji, { transform: [{ translateY: bounceAnim }] }]}>
            🎉
          </Animated.Text>

          <Text style={[s.heading, { textAlign: 'center' }]}>You're all set!</Text>
          <View style={{ width: '100%' }}>
            <Helper text="Your Monstirs are waiting. Share your family code with your kids so they can join." />
          </View>

          {/* 3 info chips */}
          <View style={{ width: '100%', gap: 12, marginTop: 8 }}>
            {INFO_CHIPS.map((chip, i) => (
              <View key={i} style={s.infoChip}>
                <Text style={s.infoChipEmoji}>{chip.emoji}</Text>
                <Text style={s.infoChipText}>
                  {renderBoldText(chip.text, s.infoChipText, s.infoChipTextBold)}
                </Text>
              </View>
            ))}
          </View>
        </ScrollView>

        <View style={s.footer}>
          {!!submitError && (
            <Text style={{ fontSize: fontSize.md, color: SUBMIT_ERROR_COLOR, textAlign: 'center', fontFamily: interFamily.semibold, marginBottom: 4 }}>
              {submitError}
            </Text>
          )}
          <Button label="Go to home" onPress={onComplete} />
        </View>
      </SafeAreaView>
    </DotGridBg>
  );
}

// ─── Step 5: Pairing codes ─────────────────────────────────────────────────
// MON-85 Phase 2: each kid has one standing 8-digit code (child.pairingCode,
// generated in makeChild and stored as kids.pairing_code on insert). The kid
// types it on their own device to sign into this account, locked to their
// profile. Reusable — no expiry.

function StepPairingCodes({
  children, onNext, onBack,
}: {
  children: OnboardingChild[];
  onNext: () => void;
  onBack: () => void;
}) {
  // Group the 8 digits 4-4 for readability, e.g. 4829 1057.
  const fmt = (code?: string) => (code && code.length === 8 ? `${code.slice(0, 4)} ${code.slice(4)}` : code ?? '— — — —');

  return (
    <DotGridBg>
      <SafeAreaView style={{ flex: 1 }} edges={['top', 'bottom']}>
        <ObTopBar onBack={onBack} />

        <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 16, gap: 12 }} showsVerticalScrollIndicator={false}>
          <View style={{ paddingHorizontal: 8 }}>
            <Helper text="Each kid opens Monstir on their own device, taps “I’m a kid,” and enters their code to sign in. You can change a code later in Settings → Kids." />
            <Text style={[s.heading, { marginBottom: 4 }]}>Connect your kids</Text>
          </View>
          {children.map((child, i) => (
            <View key={child.id} style={s.pairCard}>
              <View style={{ flex: 1 }}>
                <Text style={s.pairKidName}>{child.name || `Kid ${i + 1}`}</Text>
                <Text style={s.pairHint}>Enter on their device</Text>
              </View>
              <Text style={s.pairCode}>{fmt(child.pairingCode)}</Text>
            </View>
          ))}
          <Text style={s.pairExpires}>🔒 Each code is unique and reusable — keep them private.</Text>
          <TouchableOpacity onPress={onNext} activeOpacity={0.7} style={{ alignItems: 'center', paddingVertical: 6 }}>
            <Text style={s.pairLink}>I'll connect their devices later</Text>
          </TouchableOpacity>
        </ScrollView>

        <View style={s.footer}>
          <Button label="Continue" onPress={onNext} />
        </View>
      </SafeAreaView>
    </DotGridBg>
  );
}

// ─── Step 6: Notification priming ──────────────────────────────────────────
// Value/priming screen only — `expo-notifications` isn't installed, so neither
// CTA requests an OS permission yet (real registration is follow-up infra).

const NOTIF_ROWS = [
  { emoji: '✅', text: 'When a kid finishes a chore, you get **one tap to approve**.' },
  { emoji: '⚔️', text: 'Sunday: a heads-up when the family **boss battle** is ready.' },
  { emoji: '🤫', text: "That's it. **We won't nag** you with anything else." },
] as const;

function StepNotifications({ onNext, onBack }: { onNext: () => void; onBack: () => void }) {
  return (
    <DotGridBg>
      <SafeAreaView style={{ flex: 1 }} edges={['top', 'bottom']}>
        <ObTopBar onBack={onBack} />

        <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 16, gap: 12 }} showsVerticalScrollIndicator={false}>
          <View style={{ paddingHorizontal: 8 }}>
            <Helper text="We'll ping you when there's something to do, and stay quiet the rest of the time." />
            <Text style={[s.heading, { marginBottom: 4 }]}>Stay in the loop</Text>
          </View>
          {NOTIF_ROWS.map((row, i) => (
            <View key={i} style={s.infoChip}>
              <Text style={s.infoChipEmoji}>{row.emoji}</Text>
              <Text style={s.infoChipText}>
                {renderBoldText(row.text, s.infoChipText, s.infoChipTextBold)}
              </Text>
            </View>
          ))}
        </ScrollView>

        <View style={s.footer}>
          <Button label="Turn on notifications" onPress={onNext} />
          <Button label="Maybe later" onPress={onNext} variant="secondary" />
        </View>
      </SafeAreaView>
    </DotGridBg>
  );
}

// ─── Main flow ─────────────────────────────────────────────────────────────

export function ParentOnboarding({ onComplete }: Props) {
  const [step, setStep]               = useState(0);
  const [children, setChildren]       = useState<OnboardingChild[]>([]);
  const [rewardType, setRewardType]   = useState('payout:1');
  const [parentRole, setParentRole]   = useState('');
  const [submitError, setSubmitError] = useState('');
  // MON-85: the "Add kid" screen edits a working draft; we commit it into
  // `children` on Continue. `kidDraftMode` distinguishes a brand-new kid from
  // editing one tapped on the roster.
  const [kidDraft, setKidDraft]         = useState<OnboardingChild | null>(null);
  const [kidDraftMode, setKidDraftMode] = useState<'new' | 'edit'>('new');
  // MON-85 shared chore set: one family list (+ any custom chores), seeded from
  // the default age band. Saved as chores assigned to everyone.
  const [sharedChoreIds, setSharedChoreIds] = useState<string[]>(() => [...STARTER_DEFAULT_IDS]);
  const [customChores, setCustomChores]     = useState<SuggestedChore[]>([]);

  // ── Draft persistence ─────────────────────────────────────────────────────
  useEffect(() => {
    AsyncStorage.getItem(DRAFT_KEY)
      .then(raw => {
        if (!raw) return;
        try {
          const draft = JSON.parse(raw) as { step: number; children: OnboardingChild[]; rewardType: string; parentRole?: string; sharedChoreIds?: string[]; customChores?: SuggestedChore[] };
          // Backfill standing pairing codes for drafts saved before they existed.
          if (draft.children?.length) setChildren(draft.children.map(c => c.pairingCode ? c : { ...c, pairingCode: gen8() }));
          if (draft.rewardType)       setRewardType(draft.rewardType);
          if (draft.parentRole)       setParentRole(draft.parentRole);
          if (draft.sharedChoreIds)   setSharedChoreIds(draft.sharedChoreIds);
          if (draft.customChores)     setCustomChores(draft.customChores);
          // The AddKid step (1) edits a non-persisted draft — if a resumed draft
          // lands there, route to the roster (or the first parent step) instead.
          if (typeof draft.step === 'number') {
            setStep(draft.step === 1 ? (draft.children?.length ? 2 : 0) : draft.step);
          }
        } catch {
          // ignore corrupt drafts
        }
      })
      .catch(() => undefined);
  }, []);

  useEffect(() => {
    AsyncStorage.setItem(DRAFT_KEY, JSON.stringify({ step, children, rewardType, parentRole, sharedChoreIds, customChores })).catch(() => undefined);
  }, [step, children, rewardType, parentRole, sharedChoreIds, customChores]);

  // ── Kid add/edit handlers ─────────────────────────────────────────────────
  // After ParentIdentity: go straight to the roster if kids already exist
  // (resumed draft), otherwise open the AddKid form for the first kid.
  const startKids = () => {
    if (children.length > 0) { setStep(2); return; }
    setKidDraft(makeChild(0));
    setKidDraftMode('new');
    setStep(1);
  };
  const openAddAnother = () => {
    setKidDraft(makeChild(children.length));
    setKidDraftMode('new');
    setStep(1);
  };
  const openEditKid = (child: OnboardingChild) => {
    setKidDraft(child);
    setKidDraftMode('edit');
    setStep(1);
  };
  const commitKid = (d: OnboardingChild) => {
    setChildren(prev => (kidDraftMode === 'edit' ? prev.map(c => (c.id === d.id ? d : c)) : [...prev, d]));
    setKidDraft(null);
    setStep(2);
  };
  const removeDraftKid = () => {
    if (kidDraft) setChildren(prev => prev.filter(c => c.id !== kidDraft.id));
    setKidDraft(null);
    setStep(2);
  };
  const addKidBack = () => {
    setKidDraft(null);
    setStep(children.length > 0 ? 2 : 0);
  };

  const finish = () => {
    setSubmitError('');
    try {
      AsyncStorage.removeItem(DRAFT_KEY).catch(() => undefined);
      // Flat lookup of every choreId → details, covering the suggested catalogue
      // plus any custom chores the parent added.
      const choreMap: Record<string, ChoreMapEntry> = {};
      for (const ageChores of Object.values(CHORES_BY_AGE)) {
        for (const c of ageChores) {
          if (!choreMap[c.id]) {
            choreMap[c.id] = { name: c.name, icon: c.icon, iconBg: c.iconBg, difficulty: c.difficulty, frequency: 'Every day' };
          }
        }
      }
      // Starter chores win over any same-id age entry (e.g. set_table = Easy),
      // and carry their own frequency + completion mode.
      for (const c of STARTER_CHORES) {
        choreMap[c.id] = { name: c.name, icon: c.icon, iconBg: c.iconBg, difficulty: c.difficulty, frequency: c.frequency ?? 'Every day', completionMode: c.completionMode };
      }
      for (const c of customChores) {
        choreMap[c.id] = { name: c.name, icon: c.icon, iconBg: c.iconBg, difficulty: c.difficulty, frequency: 'Every day' };
      }
      onComplete({ children, rewardType, parentRole, choreMap, sharedChoreIds });
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : 'Something went wrong. Please try again.');
    }
  };

  // Prototype order (chip strip): Parent → Add kid → Anyone else → Chores →
  // Base pay → Codes → Notif → Done.
  switch (step) {
    case 0: return <Step2ParentIdentity parentRole={parentRole} setParentRole={setParentRole} onNext={startKids} />;
    case 1:
      // kidDraft is always set when we navigate here; guard defensively.
      if (!kidDraft) { setStep(children.length > 0 ? 2 : 0); return null; }
      return (
        <AddKidScreen
          draft={kidDraft}
          setDraft={setKidDraft}
          isFirst={children.length === 0}
          canRemove={kidDraftMode === 'edit' && children.length > 1}
          onContinue={commitKid}
          onRemove={removeDraftKid}
          onBack={addKidBack}
        />
      );
    case 2: return <AnyoneElseScreen children={children} onAddAnother={openAddAnother} onEdit={openEditKid} onContinue={() => setStep(3)} onBack={() => setStep(0)} />;
    case 3: return <Step3AssignChores children={children} sharedChoreIds={sharedChoreIds} setSharedChoreIds={setSharedChoreIds} customChores={customChores} setCustomChores={setCustomChores} onNext={() => setStep(4)} onBack={() => setStep(2)} />;
    case 4: return <Step4ChooseReward rewardType={rewardType} setRewardType={setRewardType} onNext={() => setStep(5)} onBack={() => setStep(3)} children={children} />;
    case 5: return <StepPairingCodes children={children} onNext={() => setStep(6)} onBack={() => setStep(4)} />;
    case 6: return <StepNotifications onNext={() => setStep(7)} onBack={() => setStep(5)} />;
    case 7: return <Step5AllSet children={children} rewardType={rewardType} onComplete={finish} onBack={() => setStep(6)} submitError={submitError} />;
    default: return null;
  }
}

// ─── Styles ────────────────────────────────────────────────────────────────

const SOLID_SHADOW = Platform.select({
  ios:     { shadowColor: BLACK, shadowOffset: { width: 3, height: 4 }, shadowOpacity: 1, shadowRadius: 0 },
  android: { elevation: 4 },
  default: {},
})!;

const s = StyleSheet.create({
  // Header
  heading: {
    fontFamily: obc.display,
    fontSize: scale(27),
    lineHeight: scale(30),
    color: obc.ink,
  },
  subtitle: {
    fontFamily: obc.body,
    fontSize: scale(15),
    lineHeight: scale(20),
    color: obc.muted,
    marginTop: 6,
    marginBottom: 8,
  },

  // Footer
  footer: {
    paddingHorizontal: 24,
    paddingBottom: 8,
    gap: 12,
  },

  // Top bar (back chevron)
  topBar: {
    paddingHorizontal: 24,
    paddingTop: 8,
    height: 44,
    justifyContent: 'center',
  },
  backChevron: {
    fontFamily: obc.display,
    fontSize: scale(32),
    lineHeight: scale(34),
    color: BLACK,
  },

  // Form fields (AddKid)
  fieldLabel: {
    fontFamily: obc.bodyHeavy,
    fontSize: scale(13),
    letterSpacing: 0.8,
    color: BLACK,
    textTransform: 'uppercase',
    marginBottom: 8,
  },
  avatarHint: {
    fontFamily: obc.body,
    fontSize: scale(12),
    color: colors.hint,
    marginTop: 8,
  },
  fieldInput: {
    backgroundColor: colors.white,
    borderWidth: 3,
    borderColor: BLACK,
    borderRadius: obc.radius,
    paddingHorizontal: 18,
    paddingVertical: 16,
    fontSize: scale(20),
    fontFamily: obc.display,
    color: BLACK,
    ...cardShadow,
  },
  ageField: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.white,
    borderWidth: 3,
    borderColor: BLACK,
    borderRadius: obc.radius,
    paddingHorizontal: 18,
    paddingVertical: 16,
    ...cardShadow,
  },
  ageFieldLabel:   { fontFamily: obc.display, fontSize: scale(20), color: BLACK },
  ageFieldChevron: { fontFamily: obc.display, fontSize: scale(18), color: BLACK },

  pairingNote: {
    backgroundColor: obc.purpleSoft,
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 14,
    marginTop: 18,
  },
  pairingNoteText: {
    fontFamily: obc.bodyHeavy,
    fontSize: scale(15),
    lineHeight: scale(20),
    color: PURPLE,
  },
  removeKidLink: {
    fontFamily: obc.display,
    fontSize: scale(15),
    color: colors.muted,
    textDecorationLine: 'underline',
  },

  // Roster (Anyone else?)
  rosterCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    backgroundColor: colors.white,
    borderRadius: obc.radius,
    borderWidth: 3,
    borderColor: BLACK,
    paddingVertical: 14,
    paddingHorizontal: 16,
    ...cardShadow,
  },
  rosterAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    overflow: 'hidden',
    borderWidth: 2,
    borderColor: BLACK,
    backgroundColor: colors.bg,
  },
  rosterName: { fontFamily: obc.display, fontSize: scale(20), color: BLACK },
  rosterSub:  { fontFamily: obc.bodySemi, fontSize: scale(14), color: colors.muted, marginTop: 1 },
  rosterCheck: {
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: 3,
    borderColor: BLACK,
    backgroundColor: obc.lime,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rosterCheckMark: { fontFamily: obc.display, fontSize: scale(20), color: BLACK },
  rosterAddBtn: {
    backgroundColor: colors.white,
    borderWidth: 3,
    borderColor: BLACK,
    borderRadius: obc.radius,
    paddingVertical: 18,
    alignItems: 'center',
    marginTop: 14,
    ...cardShadow,
  },
  rosterAddLabel: { fontFamily: obc.display, fontSize: scale(18), color: BLACK },

  // Avatar
  avatarCircle: {
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: 'rgba(0,0,0,0.08)',
  },
  avatarEditBadge: {
    position: 'absolute',
    right: 0,
    bottom: 0,
    backgroundColor: '#FFFFFF',
    borderWidth: 2.5,
    borderColor: BLACK,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarInitial: {
    fontFamily: interFamily.black,
    color: AVATAR_INITIAL_COLOR,
  },

  // Kid avatar in Step1
  kidAvatarCircle: {
    width: 52,
    height: 52,
    borderRadius: 26,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: BLACK,
  },
  kidAvatarInitial: {
    fontSize: fontSize.xxxl,
    fontFamily: interFamily.bold,
    color: AVATAR_INITIAL_COLOR,
  },
  kidAgeLabel: {
    fontSize: fontSize.sm,
    fontFamily: interFamily.semibold,
    color: colors.muted,
  },

  // Age range pill
  selectPill: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: colors.border,
    borderRadius: radii.full,
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: colors.white,
    gap: 4,
    alignSelf: 'flex-start',
  },
  selectPillLabel: { fontSize: fontSize.sm, fontFamily: interFamily.semibold, color: colors.black },
  selectChevron:   { fontSize: fontSize.sm, color: colors.muted },

  // Bottom sheet
  sheetScrim:   { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'flex-end' },
  sheet:        { backgroundColor: colors.white, borderTopLeftRadius: radii.xxxl, borderTopRightRadius: radii.xxxl, borderWidth: 1.5, borderColor: colors.border, borderBottomWidth: 0, paddingTop: 12, overflow: 'hidden' },
  sheetHandle:  { width: 40, height: 4, borderRadius: 2, backgroundColor: colors.inputBorder, alignSelf: 'center', marginBottom: 8 },
  sheetHeading: { fontSize: fontSize.sm, fontFamily: interFamily.bold, color: colors.muted, letterSpacing: 0.8, textTransform: 'uppercase', paddingHorizontal: 16, paddingTop: 6, paddingBottom: 14 },
  sheetRow:       { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 16 },
  sheetRowBorder: { borderBottomWidth: 1, borderBottomColor: colors.border },
  sheetRowLabel:  { flex: 1, fontSize: fontSize.xl, fontFamily: interFamily.semibold, color: colors.black },
  sheetRowLabelActive: { color: PURPLE },
  sheetCheck:     { fontSize: fontSize.xl, color: PURPLE, fontFamily: interFamily.bold },

  // Add chore sheet
  addChoreBody:        { paddingHorizontal: 16, gap: 14 },
  iconPickerRow:       { gap: 10, paddingHorizontal: 2 },
  iconPickerCell:      { width: 52, height: 52, borderRadius: radii.lg, alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: 'transparent' },
  iconPickerCellActive: { borderColor: PURPLE },
  addChoreInput:       { borderWidth: 1.5, borderColor: colors.border, borderRadius: radii.lg, paddingHorizontal: 16, paddingVertical: 14, fontSize: fontSize.lg, fontFamily: interFamily.medium, color: colors.black, backgroundColor: colors.white },

  // Avatar grid in sheet
  avatarGrid:         { flexDirection: 'row', flexWrap: 'wrap', paddingHorizontal: 12, paddingBottom: 4 },
  avatarGridCell:     { width: '22%', margin: '1.5%', aspectRatio: 1, borderRadius: radii.lg, overflow: 'hidden', borderWidth: 2.5, borderColor: 'transparent', backgroundColor: colors.bg },
  avatarGridCellActive: { borderColor: PURPLE },
  avatarRow:          { flexDirection: 'row', gap: 10, paddingHorizontal: 16, paddingBottom: 4 },
  avatarCarouselCell: { width: 72, height: 72, borderRadius: radii.lg, overflow: 'hidden', borderWidth: 2.5, borderColor: 'transparent', backgroundColor: colors.bg },

  // Child card (Step 1)
  childCard: {
    backgroundColor: colors.white,
    borderRadius: obc.radius,
    borderWidth: 3,
    borderColor: BLACK,
    padding: 16,
    gap: 12,
    ...cardShadow,
  },
  childCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  childNameInput: {
    fontSize: fontSize.xl,
    fontFamily: obc.body,
    color: colors.black,
    paddingVertical: 4,
  },

  // Add child/kid button
  addChildBtn: {
    borderWidth: 2,
    borderColor: PURPLE,
    borderStyle: 'dashed',
    borderRadius: radii.xxl,
    paddingVertical: 16,
    alignItems: 'center',
  },
  addChildLabel: {
    fontSize: fontSize.lg,
    fontFamily: obc.display,
    color: PURPLE,
  },

  // Parent card (Step 2)
  parentCard: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.white,
    borderRadius: obc.radius,
    borderWidth: 3,
    borderColor: BLACK,
    paddingVertical: 28,
    gap: 8,
    ...cardShadow,
  },
  parentCardActive: {
    backgroundColor: obc.purpleSoft,
    borderColor: PURPLE,
    ...Platform.select({
      ios:     { shadowColor: PURPLE, shadowOffset: { width: 3, height: 3 }, shadowOpacity: 1, shadowRadius: 0 },
      android: { elevation: 4 },
      default: {},
    }),
  },
  parentCardEmoji: {
    width: scale(80),
    height: scale(80),
    borderRadius: scale(40),
  },
  parentCardLabel: {
    fontSize: fontSize.xl,
    fontFamily: FREDOKA_BOLD,
    color: BLACK,
  },
  parentCardLabelActive: {
    color: PURPLE,
  },
  orPickLabel: {
    fontSize: fontSize.sm,
    fontFamily: obc.bodySemi,
    color: colors.muted,
    textAlign: 'center',
    marginBottom: -6,
  },

  // Parent chips (Step 2)
  parentChip: {
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: radii.full,
    borderWidth: 2,
    borderColor: BLACK,
    backgroundColor: colors.white,
  },
  parentChipActive: {
    borderColor: PURPLE,
    backgroundColor: obc.purpleSoft,
  },
  parentChipLabel: {
    fontSize: fontSize.base,
    fontFamily: obc.bodyHeavy,
    color: colors.black,
  },
  parentChipLabelActive: {
    color: PURPLE,
  },

  // Chore tabs (Step 3)
  choreTab: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: radii.full,
    borderWidth: 1.5,
    borderColor: colors.border,
    backgroundColor: colors.white,
  },
  choreTabActive: {
    borderColor: PURPLE,
    backgroundColor: LAVENDER,
  },
  choreTabLabel: {
    fontSize: fontSize.base,
    fontFamily: interFamily.semibold,
    color: colors.muted,
  },
  choreTabLabelActive: {
    color: PURPLE,
  },

  // Chore row (Step 3)
  choreRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: colors.white,
    borderRadius: obc.radius,
    borderWidth: 3,
    borderColor: BLACK,
    padding: 13,
    ...cardShadow,
  },
  choreRowChecked: {
    borderColor: PURPLE,
    backgroundColor: obc.purpleSoft,
  },
  checkbox: {
    width: 30,
    height: 30,
    borderRadius: 15,
    borderWidth: 2,
    borderColor: BLACK,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.white,
  },
  checkboxChecked: {
    backgroundColor: PURPLE,
    borderColor: PURPLE,
  },
  choreName: {
    flex: 1,
    fontSize: scale(17),
    fontFamily: obc.display,
    color: colors.black,
  },
  choreRemove: {
    fontSize: scale(20),
    color: colors.muted,
    lineHeight: scale(22),
    marginLeft: 4,
  },

  // Difficulty badge
  diffBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: radii.full,
  },
  diffBadgeText: {
    fontSize: fontSize.xs,
    fontFamily: obc.bodyHeavy,
  },

  // Pay card (Step 4)
  payCard: {
    backgroundColor: colors.white,
    borderRadius: obc.radius,
    borderWidth: 3,
    borderColor: BLACK,
    padding: 20,
    gap: 8,
    ...cardShadow,
  },
  payCardLabel: {
    fontSize: fontSize.base,
    fontFamily: obc.body,
    color: colors.muted,
    textAlign: 'center',
  },
  payAmount: {
    fontSize: scale(48),
    fontFamily: obc.display,
    color: PURPLE,
    textAlign: 'center',
    lineHeight: scale(54),
  },

  // Slider
  sliderTrack: {
    height: 12,
    borderRadius: 999,
    borderWidth: 2,
    borderColor: BLACK,
    backgroundColor: colors.white,
    marginTop: 12,
    marginBottom: 4,
    position: 'relative',
    justifyContent: 'center',
  },
  sliderFill: {
    position: 'absolute',
    left: 0,
    top: 0,
    height: '100%',
    borderRadius: 999,
    backgroundColor: obc.lime,
  },
  sliderThumb: {
    position: 'absolute',
    top: -8,
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: colors.white,
    borderWidth: 2.5,
    borderColor: PURPLE,
    ...Platform.select({
      ios:     { shadowColor: colors.black, shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.2, shadowRadius: 2 },
      android: { elevation: 3 },
      default: {},
    }),
  },
  sliderLabels: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 16,
  },
  sliderLabelText: {
    fontSize: fontSize.sm,
    fontFamily: interFamily.semibold,
    color: colors.muted,
  },
  sliderLabelAmt: {
    fontSize: fontSize.lg,
    fontFamily: interFamily.bold,
    color: BLACK,
    marginTop: 2,
  },

  // Example row (Step 4)
  exampleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: colors.white,
    borderRadius: obc.radius,
    borderWidth: 3,
    borderColor: BLACK,
    padding: 13,
    ...cardShadow,
  },
  exampleName: {
    flex: 1,
    fontSize: fontSize.lg,
    fontFamily: obc.display,
    color: colors.black,
  },
  exampleAmt: {
    fontSize: scale(20),
    fontFamily: obc.display,
    color: PURPLE,
  },

  // All set (Step 5)
  allSetEmoji: {
    fontSize: scale(64),
    textAlign: 'center',
  },
  infoChip: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 14,
    backgroundColor: colors.white,
    borderRadius: obc.radius,
    borderWidth: 3,
    borderColor: BLACK,
    padding: 16,
    ...cardShadow,
  },
  infoChipEmoji: {
    fontSize: scale(24),
    lineHeight: scale(28),
  },
  infoChipText: {
    flex: 1,
    fontSize: fontSize.base,
    fontFamily: obc.bodySemi,
    color: colors.black,
    lineHeight: scale(21),
  },
  infoChipTextBold: {
    fontFamily: obc.bodyHeavy,
    color: BLACK,
  },

  // Pairing-code card (Step 5)
  pairCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    backgroundColor: '#FFFFFF',
    borderRadius: obc.radius,
    borderWidth: 3,
    borderColor: BLACK,
    paddingVertical: 16,
    paddingHorizontal: 18,
    ...cardShadow,
  },
  pairKidName: {
    fontSize: fontSize.xl,
    fontFamily: obc.display,
    color: colors.black,
  },
  pairHint: {
    fontSize: fontSize.sm,
    fontFamily: obc.bodySemi,
    color: colors.muted,
    marginTop: 2,
  },
  pairCode: {
    fontSize: scale(24),
    fontFamily: obc.display,
    letterSpacing: 3,
    color: PURPLE,
  },
  pairExpires: {
    fontFamily: obc.mono,
    fontSize: scale(13),
    color: colors.muted,
    textAlign: 'center',
    marginTop: 6,
  },
  pairLink: {
    fontFamily: obc.display,
    fontSize: scale(16),
    color: PURPLE,
    textDecorationLine: 'underline',
  },
});
