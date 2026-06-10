import React, { useState, useRef, useEffect } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, TextInput,
  ScrollView, Image, Modal, Platform, ActionSheetIOS,
  Animated, Easing, KeyboardAvoidingView, PanResponder,
} from 'react-native';
import * as Haptics from 'expo-haptics';
import { SafeAreaView } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { colors, fontSize, fontWeight, radii, spacing, scale, interFamily, textStyles } from '../design-system/tokens';
import { Button } from '../design-system/components/Button';
import { CreamBg } from '../components/CreamBg';

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
}

export interface ChoreMapEntry {
  name: string;
  icon: ReturnType<typeof require>;
  iconBg: string;
  difficulty: 'Easy' | 'Medium' | 'Hard';
  frequency?: string;
}

export interface ParentSetupResult {
  children: OnboardingChild[];
  rewardType: string;
  parentRole: string;
  choreMap: Record<string, ChoreMapEntry>;
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
const FREDOKA_BOLD         = 'Fredoka_700Bold';

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

interface SuggestedChore {
  id: string;
  name: string;
  xp: number;
  difficulty: 'Easy' | 'Medium' | 'Hard';
  icon: ReturnType<typeof require>;
  iconBg: string;
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
const BASE_PAY_STEPS = [0.25, 0.50, 0.75, 1.00, 1.25, 1.50, 1.75, 2.00];
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

function makeChild(index: number): OnboardingChild {
  return {
    id: `child_${Date.now()}_${index}`,
    name: '',
    avatarColor: AVATAR_COLORS[index % AVATAR_COLORS.length],
    avatarIdx: index % AVATARS.length,
    ageRange: '7-9',
    difficulty: 'Medium',
    selectedChoreIds: CHORES_BY_AGE['7-9'].slice(0, 4).map(c => c.id),
  };
}

// ─── Shared sub-components ─────────────────────────────────────────────────

function StepDots({ step, total }: { step: number; total: number }) {
  return (
    <View style={{ flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 8, marginBottom: 12 }}>
      {Array.from({ length: total }).map((_, i) => {
        const active = i + 1 === step;
        return (
          <View
            key={i}
            style={{
              width: active ? 10 : 8,
              height: active ? 10 : 8,
              borderRadius: active ? 5 : 4,
              backgroundColor: active ? PURPLE : colors.inputBorder,
            }}
          />
        );
      })}
    </View>
  );
}

function StepHeader({ step, total, title, subtitle }: { step: number; total: number; title: string; subtitle: string }) {
  return (
    <View style={{ paddingHorizontal: 24, paddingTop: 48, paddingBottom: 4 }}>
      <StepDots step={step} total={total} />
      <Text style={s.heading}>{title}</Text>
      <Text style={s.subtitle}>{subtitle}</Text>
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
  value, onChange,
}: { value: OnboardingChild['ageRange']; onChange: (v: OnboardingChild['ageRange']) => void }) {
  const { open, openSheet, closeSheet, sheetY, scrimOpacity } = useBottomSheet();

  function handlePress() {
    openSheet();
  }

  return (
    <>
      <TouchableOpacity style={s.selectPill} onPress={handlePress} activeOpacity={0.7}>
        <Text style={s.selectPillLabel}>{value}</Text>
        <Text style={s.selectChevron}>▾</Text>
      </TouchableOpacity>

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
  avatarIdx, color, name, onChange,
}: { avatarIdx: number; color: string; name: string; onChange: (idx: number) => void }) {
  const { open, openSheet, closeSheet, sheetY, scrimOpacity } = useBottomSheet(400);

  return (
    <>
      <TouchableOpacity onPress={openSheet} activeOpacity={0.8} style={[s.avatarCircle, { width: 44, height: 44, borderRadius: 22, overflow: 'hidden' }]}>
        <Image source={AVATARS[avatarIdx]} style={{ width: '100%', height: '100%' }} resizeMode="cover" />
      </TouchableOpacity>

      <Modal visible={open} transparent animationType="none" onRequestClose={() => closeSheet()}>
        <Animated.View style={[s.sheetScrim, { opacity: scrimOpacity }]}>
          <TouchableOpacity style={{ flex: 1 }} activeOpacity={1} onPress={() => closeSheet()} />
          <Animated.View style={[s.sheet, { transform: [{ translateY: sheetY }] }]} onStartShouldSetResponder={() => true}>
            <View style={s.sheetHandle} />
            <Text style={s.sheetHeading}>Choose avatar</Text>
            <View style={s.avatarGrid}>
              {AVATARS.map((src, i) => (
                <TouchableOpacity
                  key={i}
                  style={[s.avatarGridCell, avatarIdx === i && s.avatarGridCellActive]}
                  onPress={() => { onChange(i); closeSheet(); }}
                  activeOpacity={0.8}
                >
                  <Image source={src} style={{ width: '100%', height: '100%' }} resizeMode="cover" />
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

// ─── Step 1: Add Children ──────────────────────────────────────────────────

function Step1AddChildren({
  children, setChildren, onNext,
}: {
  children: OnboardingChild[];
  setChildren: React.Dispatch<React.SetStateAction<OnboardingChild[]>>;
  onNext: () => void;
}) {
  const canContinue = children.every(c => c.name.trim().length > 0);

  const updateChild = (id: string, patch: Partial<OnboardingChild>) => {
    setChildren(prev => prev.map(c => c.id === id ? { ...c, ...patch } : c));
    if (patch.ageRange) {
      setChildren(prev => prev.map(c =>
        c.id === id
          ? { ...c, ...patch, selectedChoreIds: CHORES_BY_AGE[patch.ageRange!].slice(0, 4).map(ch => ch.id) }
          : c
      ));
    }
  };

  const removeChild = (id: string) => {
    if (children.length > 1) setChildren(prev => prev.filter(c => c.id !== id));
  };

  return (
    <CreamBg>
      <SafeAreaView style={{ flex: 1 }} edges={['top', 'bottom']}>
        <StepHeader step={1} total={5} title="Add your kids" subtitle="Each kid gets their own monster and chore list." />
        <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 16, gap: 12 }} showsVerticalScrollIndicator={false}>
          {children.map((child, i) => (
            <View key={child.id} style={s.childCard}>
              <View style={s.childCardHeader}>
                <AvatarPicker avatarIdx={child.avatarIdx} color={child.avatarColor} name={child.name} onChange={idx => updateChild(child.id, { avatarIdx: idx })} />
                <View style={{ flex: 1 }}>
                  <TextInput
                    style={s.childNameInput}
                    value={child.name}
                    onChangeText={v => updateChild(child.id, { name: v })}
                    placeholder={`Child ${i + 1}'s name`}
                    placeholderTextColor={colors.hint}
                    autoCapitalize="words"
                    returnKeyType="done"
                  />
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 2 }}>
                    <Text style={s.kidAgeLabel}>Age</Text>
                    <AgeRangePicker value={child.ageRange} onChange={v => updateChild(child.id, { ageRange: v })} />
                  </View>
                </View>
                {children.length > 1 && (
                  <TouchableOpacity onPress={() => removeChild(child.id)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                    <Text style={{ fontSize: scale(18), color: colors.muted }}>🗑</Text>
                  </TouchableOpacity>
                )}
              </View>
            </View>
          ))}

          <TouchableOpacity
            style={s.addChildBtn}
            onPress={() => setChildren(prev => [...prev, makeChild(prev.length)])}
            activeOpacity={0.7}
          >
            <Text style={s.addChildLabel}>+ Add another kid</Text>
          </TouchableOpacity>
        </ScrollView>

        <View style={s.footer}>
          <Button label="Continue" onPress={onNext} disabled={!canContinue} />
        </View>
      </SafeAreaView>
    </CreamBg>
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
  onBack,
}: {
  parentRole: string;
  setParentRole: (v: string) => void;
  onNext: () => void;
  onBack: () => void;
}) {
  const selectedCard = PARENT_CARDS.find(c => c.id === parentRole) ? parentRole : null;
  const selectedChip = PARENT_CHIPS.map(c => c.toLowerCase()).includes(parentRole.toLowerCase()) && !selectedCard ? parentRole : null;

  const selectCard = (id: string) => setParentRole(id);
  const selectChip = (label: string) => setParentRole(label.toLowerCase());

  return (
    <CreamBg>
      <SafeAreaView style={{ flex: 1 }} edges={['top', 'bottom']}>
        <StepHeader step={2} total={5} title="Who's the boss?" subtitle="Pick your role — this shows up when you leave notes for your kids." />

        <ScrollView style={{ flex: 1 }} contentContainerStyle={{ paddingHorizontal: 24, paddingTop: 16, gap: 24 }} showsVerticalScrollIndicator={false}>
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
          <Button label="Back" onPress={onBack} variant="secondary" />
        </View>
      </SafeAreaView>
    </CreamBg>
  );
}

// ─── Step 3: Assign Chores ─────────────────────────────────────────────────

function Step3AssignChores({
  children, setChildren, onNext, onBack,
}: {
  children: OnboardingChild[];
  setChildren: React.Dispatch<React.SetStateAction<OnboardingChild[]>>;
  onNext: () => void;
  onBack: () => void;
}) {
  const [activeTab, setActiveTab] = useState(0);
  const [customChores, setCustomChores] = useState<Record<string, SuggestedChore[]>>({});
  const [removedIds, setRemovedIds] = useState<Record<string, string[]>>({});
  const [choreInput, setChoreInput] = useState('');
  const [selectedIconIdx, setSelectedIconIdx] = useState(0);
  const { open: addSheetOpen, openSheet: openAddSheet, closeSheet: closeAddSheet, sheetY: addSheetY, scrimOpacity: addScrimOpacity } = useBottomSheet(380);

  const child = children[activeTab];
  const excluded = removedIds[child.id] ?? [];
  const suggested = CHORES_BY_AGE[child.ageRange].filter(c => !excluded.includes(c.id));
  const extras = (customChores[child.id] ?? []).filter(c => !excluded.includes(c.id));

  const removeChore = (choreId: string) => {
    setRemovedIds(prev => ({ ...prev, [child.id]: [...(prev[child.id] ?? []), choreId] }));
    setChildren(prev => prev.map((c, i) =>
      i === activeTab ? { ...c, selectedChoreIds: c.selectedChoreIds.filter(id => id !== choreId) } : c
    ));
  };

  const toggleChore = (choreId: string) => {
    setChildren(prev => prev.map((c, i) =>
      i === activeTab
        ? {
            ...c,
            selectedChoreIds: c.selectedChoreIds.includes(choreId)
              ? c.selectedChoreIds.filter(id => id !== choreId)
              : [...c.selectedChoreIds, choreId],
          }
        : c
    ));
  };

  const addCustomChore = () => {
    const name = choreInput.trim();
    if (!name) return;
    const id = `custom_${Date.now()}`;
    const { icon, bg } = CHORE_ICONS[selectedIconIdx];
    const chore: SuggestedChore = { id, name, xp: 15, difficulty: 'Easy', icon, iconBg: bg };
    setCustomChores(prev => ({ ...prev, [child.id]: [...(prev[child.id] ?? []), chore] }));
    setChildren(prev => prev.map((c, i) =>
      i === activeTab ? { ...c, selectedChoreIds: [...c.selectedChoreIds, id] } : c
    ));
    setChoreInput('');
    setSelectedIconIdx(0);
    closeAddSheet();
  };

  // age display: e.g. "Maya, 9" — use midpoint of range
  const ageLabel = (range: OnboardingChild['ageRange']) => {
    const map: Record<OnboardingChild['ageRange'], string> = { '5-6': '5-6', '7-9': '7-9', '10-12': '10-12', '13+': '13+' };
    return map[range];
  };

  return (
    <CreamBg>
      <SafeAreaView style={{ flex: 1 }} edges={['top', 'bottom']}>
        <View style={{ paddingHorizontal: 24, paddingTop: 48, paddingBottom: 4 }}>
          <StepDots step={3} total={5} />
          <Text style={s.heading}>Pick a few chores</Text>
          <Text style={s.subtitle}>Age-appropriate picks — grab what fits. You can always add more later.</Text>
          {/* Tab row per kid */}
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, paddingTop: 12, alignItems: 'center' }}>
            {children.map((c, i) => (
              <TouchableOpacity
                key={c.id}
                style={[s.choreTab, i === activeTab && s.choreTabActive]}
                onPress={() => setActiveTab(i)}
                activeOpacity={0.8}
              >
                <Text style={[s.choreTabLabel, i === activeTab && s.choreTabLabelActive]}>
                  {c.name || `Kid ${i + 1}`}{c.name ? `, ${ageLabel(c.ageRange)}` : ''}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>

        <ScrollView style={{ flex: 1 }} contentContainerStyle={{ paddingHorizontal: 16, paddingTop: 12, paddingBottom: 16 }} showsVerticalScrollIndicator={false}>
          <View style={{ gap: 10, marginTop: 4 }}>
            {[...suggested, ...extras].map(chore => {
              const checked = child.selectedChoreIds.includes(chore.id);
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
          <Button label="Back" onPress={onBack} variant="secondary" />
        </View>
      </SafeAreaView>
    </CreamBg>
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
    <CreamBg>
      <SafeAreaView style={{ flex: 1 }} edges={['top', 'bottom']}>
        <StepHeader step={4} total={5} title="Set your payout" subtitle="How much is a basic chore worth? Harder chores pay more automatically." />

        <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 16, gap: 16 }} showsVerticalScrollIndicator={false} scrollEnabled={!isDragging}>
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
          <Button label="Back" onPress={onBack} variant="secondary" />
        </View>
      </SafeAreaView>
    </CreamBg>
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
    <CreamBg>
      <SafeAreaView style={{ flex: 1 }} edges={['top', 'bottom']}>
        <StepDots step={5} total={5} />

        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={{ alignItems: 'center', paddingHorizontal: 24, paddingTop: 32, paddingBottom: 16, gap: 20 }}
          showsVerticalScrollIndicator={false}
        >
          {/* Bouncing emoji */}
          <Animated.Text style={[s.allSetEmoji, { transform: [{ translateY: bounceAnim }] }]}>
            🎉
          </Animated.Text>

          <Text style={[s.heading, { textAlign: 'center' }]}>You're all set!</Text>
          <Text style={[s.subtitle, { textAlign: 'center', marginTop: -12 }]}>
            Your monsters are waiting. Share your family code with your kids so they can join.
          </Text>

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
          <Button label="Back" onPress={onBack} variant="secondary" />
        </View>
      </SafeAreaView>
    </CreamBg>
  );
}

// ─── Main flow ─────────────────────────────────────────────────────────────

export function ParentOnboarding({ onComplete }: Props) {
  const [step, setStep]               = useState(0);
  const [children, setChildren]       = useState<OnboardingChild[]>([makeChild(0)]);
  const [rewardType, setRewardType]   = useState('payout:1');
  const [parentRole, setParentRole]   = useState('');
  const [submitError, setSubmitError] = useState('');

  // ── Draft persistence ─────────────────────────────────────────────────────
  useEffect(() => {
    AsyncStorage.getItem(DRAFT_KEY)
      .then(raw => {
        if (!raw) return;
        try {
          const draft = JSON.parse(raw) as { step: number; children: OnboardingChild[]; rewardType: string; parentRole?: string };
          if (draft.children?.length) setChildren(draft.children);
          if (draft.rewardType)       setRewardType(draft.rewardType);
          if (draft.parentRole)       setParentRole(draft.parentRole);
          if (typeof draft.step === 'number') setStep(draft.step);
        } catch {
          // ignore corrupt drafts
        }
      })
      .catch(() => undefined);
  }, []);

  useEffect(() => {
    AsyncStorage.setItem(DRAFT_KEY, JSON.stringify({ step, children, rewardType, parentRole })).catch(() => undefined);
  }, [step, children, rewardType, parentRole]);

  const next = () => setStep(s => s + 1);
  const back = () => setStep(s => s - 1);

  const finish = () => {
    setSubmitError('');
    try {
      AsyncStorage.removeItem(DRAFT_KEY).catch(() => undefined);
      // Build a flat lookup of every selected choreId → chore details
      const choreMap: Record<string, ChoreMapEntry> = {};
      for (const ageChores of Object.values(CHORES_BY_AGE)) {
        for (const c of ageChores) {
          if (!choreMap[c.id]) {
            choreMap[c.id] = { name: c.name, icon: c.icon, iconBg: c.iconBg, difficulty: c.difficulty, frequency: 'Every day' };
          }
        }
      }
      onComplete({ children, rewardType, parentRole, choreMap });
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : 'Something went wrong. Please try again.');
    }
  };

  switch (step) {
    case 0: return <Step1AddChildren children={children} setChildren={setChildren} onNext={next} />;
    case 1: return <Step2ParentIdentity parentRole={parentRole} setParentRole={setParentRole} onNext={next} onBack={back} />;
    case 2: return <Step3AssignChores children={children} setChildren={setChildren} onNext={next} onBack={back} />;
    case 3: return <Step4ChooseReward rewardType={rewardType} setRewardType={setRewardType} onNext={next} onBack={back} children={children} />;
    case 4: return <Step5AllSet children={children} rewardType={rewardType} onComplete={finish} onBack={back} submitError={submitError} />;
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
    ...textStyles.screenTitle,
  },
  subtitle: {
    ...textStyles.bodySecondary,
    marginTop: 4,
    marginBottom: 8,
  },

  // Footer
  footer: {
    paddingHorizontal: 24,
    paddingBottom: 8,
    gap: 12,
  },

  // Avatar
  avatarCircle: {
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: 'rgba(0,0,0,0.08)',
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

  // Child card (Step 1)
  childCard: {
    backgroundColor: colors.white,
    borderRadius: radii.xxl,
    borderWidth: 2,
    borderColor: BLACK,
    padding: 16,
    gap: 12,
    ...SOLID_SHADOW,
  },
  childCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  childNameInput: {
    fontSize: fontSize.xl,
    fontFamily: interFamily.bold,
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
    fontSize: fontSize.base,
    fontFamily: interFamily.semibold,
    color: PURPLE,
  },

  // Parent card (Step 2)
  parentCard: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.white,
    borderRadius: radii.xxl,
    borderWidth: 2.5,
    borderColor: BLACK,
    paddingVertical: 28,
    gap: 8,
    ...SOLID_SHADOW,
  },
  parentCardActive: {
    backgroundColor: LAVENDER,
    borderColor: PURPLE,
    ...Platform.select({
      ios:     { shadowColor: PURPLE, shadowOffset: { width: 4, height: 4 }, shadowOpacity: 1, shadowRadius: 0 },
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
    fontFamily: interFamily.semibold,
    color: colors.muted,
    textAlign: 'center',
    marginBottom: -6,
  },

  // Parent chips (Step 2)
  parentChip: {
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: radii.full,
    borderWidth: 1.5,
    borderColor: colors.border,
    backgroundColor: colors.white,
  },
  parentChipActive: {
    borderColor: PURPLE,
    backgroundColor: LAVENDER,
  },
  parentChipLabel: {
    fontSize: fontSize.base,
    fontFamily: interFamily.semibold,
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
    borderRadius: radii.lg,
    borderWidth: 1.5,
    borderColor: colors.border,
    padding: 14,
  },
  choreRowChecked: {
    borderColor: PURPLE,
    backgroundColor: CHORE_ROW_CHECKED_BG,
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxChecked: {
    backgroundColor: PURPLE,
    borderColor: PURPLE,
  },
  choreName: {
    flex: 1,
    fontSize: fontSize.base,
    fontFamily: interFamily.semibold,
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
    fontFamily: interFamily.bold,
  },

  // Pay card (Step 4)
  payCard: {
    backgroundColor: colors.white,
    borderRadius: radii.xxl,
    borderWidth: 2,
    borderColor: BLACK,
    padding: 20,
    gap: 8,
    ...SOLID_SHADOW,
  },
  payCardLabel: {
    fontSize: fontSize.base,
    fontFamily: interFamily.semibold,
    color: colors.muted,
    textAlign: 'center',
  },
  payAmount: {
    fontSize: scale(42),
    fontFamily: interFamily.semibold,
    color: PURPLE,
    textAlign: 'center',
    lineHeight: scale(50),
  },

  // Slider
  sliderTrack: {
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.trackBg,
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
    borderRadius: 4,
    backgroundColor: PURPLE,
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
    borderRadius: radii.lg,
    borderWidth: 1.5,
    borderColor: colors.border,
    padding: 14,
  },
  exampleName: {
    flex: 1,
    fontSize: fontSize.lg,
    fontFamily: interFamily.semibold,
    color: colors.black,
  },
  exampleAmt: {
    fontSize: fontSize.lg,
    fontFamily: interFamily.bold,
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
    borderRadius: radii.xxl,
    borderWidth: 2,
    borderColor: BLACK,
    padding: 16,
    ...SOLID_SHADOW,
  },
  infoChipEmoji: {
    fontSize: scale(24),
    lineHeight: scale(28),
  },
  infoChipText: {
    flex: 1,
    fontSize: fontSize.base,
    fontFamily: interFamily.regular,
    color: colors.black,
    lineHeight: scale(21),
  },
  infoChipTextBold: {
    fontFamily: interFamily.bold,
    color: BLACK,
  },
});
