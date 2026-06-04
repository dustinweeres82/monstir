import React from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, ScrollView, Animated,
} from 'react-native';
import { colors, spacing, fontSize, interFamily, nunitoFamily, spaceMonoFamily, radii, scale, shadows } from '../design-system/tokens';
import { useScaleAnimation } from '../design-system/hooks';
import { ProgressBar } from '../design-system/components/ProgressBar';
import type { MilestoneDef } from '../data/milestones';
import type { EarnedMilestone } from '../storage/milestones';
import { MILESTONES } from '../data/milestones';

const PURPLE = '#7B3FF2';
const BORDER = '#111111';
const BG     = '#FFFDF7';
const LIME   = '#D8F52F';
const MUTED  = '#888888';

const CARD_SHADOW = {
  shadowColor: BORDER,
  shadowOffset: { width: 0, height: 6 },
  shadowOpacity: 1,
  shadowRadius: 0,
  elevation: 6,
};

const CATEGORY_BG: Record<string, string> = {
  Volume:  '#E8F8F0',
  Streak:  '#FFF3E0',
  Money:   '#FFF9E6',
  Battle:  '#EDE9FC',
  Monster: '#F3EEFF',
  Parent:  '#EAF3FB',
};

export interface MilestoneDetailProps {
  milestone:    MilestoneDef;
  earned:       EarnedMilestone | undefined;
  totalAllowance?: number;   // cents — for money milestones
  onBack:       () => void;
}

// Next milestone in the same category
function getNextMilestone(current: MilestoneDef): MilestoneDef | undefined {
  const same = MILESTONES.filter(m => m.category === current.category && m.audience === current.audience);
  const idx  = same.findIndex(m => m.id === current.id);
  return same[idx + 1];
}

// Money threshold from milestone id
const MONEY_THRESHOLDS: Record<string, number> = {
  'money-10':  1000,
  'money-25':  2500,
  'money-100': 10000,
};

export function MilestoneDetail({ milestone, earned, totalAllowance = 0, onBack }: MilestoneDetailProps) {
  const { scaleAnim: backScale, pressIn: backPI, pressOut: backPO } = useScaleAnimation({ toScale: 0.85 });
  const earnedDate = earned
    ? new Date(earned.earnedAt).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })
    : null;
  const categoryBg = CATEGORY_BG[milestone.category] ?? '#F3F3F3';
  const nextMilestone = getNextMilestone(milestone);
  const moneyThreshold = MONEY_THRESHOLDS[milestone.id];

  return (
    <View style={s.root}>

      {/* ── Header ── */}
      <View style={s.header}>
        <TouchableOpacity style={s.backBtn} onPress={onBack} onPressIn={backPI} onPressOut={backPO} activeOpacity={1}>
          <Animated.View style={{ transform: [{ scale: backScale }] }}>
            <Text style={s.backBtnText}>←</Text>
          </Animated.View>
        </TouchableOpacity>
        <Text style={s.headerTitle}>Milestone Trophy</Text>
        <View style={s.backBtn} />
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={s.scroll}>

        {/* ── Hero card ── */}
        <View style={[s.heroCard, { backgroundColor: categoryBg }, CARD_SHADOW]}>
          <View style={[s.heroTypeLabel, { borderColor: PURPLE + '88', backgroundColor: categoryBg }]}>
            <Text style={s.heroTypeLabelText}>MILESTONE TROPHY</Text>
          </View>
          <Text style={s.heroIcon}>{milestone.icon}</Text>
          <Text style={s.heroName}>{milestone.name}</Text>
          <Text style={s.heroTagline}>{milestone.tagline}</Text>
        </View>

        {/* ── Metadata strip ── */}
        <View style={[s.metaCard, CARD_SHADOW]}>
          <View style={s.metaCell}>
            <Text style={s.metaLabel}>Earned</Text>
            <Text style={s.metaValue}>{earnedDate ?? '—'}</Text>
          </View>
          <View style={s.metaDivider} />
          <View style={s.metaCell}>
            <Text style={s.metaLabel}>Category</Text>
            <Text style={[s.metaValue, { color: PURPLE }]}>{milestone.category}</Text>
          </View>
          <View style={s.metaDivider} />
          <View style={s.metaCell}>
            <Text style={s.metaLabel}>XP Earned</Text>
            <Text style={[s.metaValue, { color: PURPLE }]}>+{milestone.xpReward}</Text>
          </View>
        </View>

        {/* ── Money milestone: allowance hero ── */}
        {moneyThreshold != null && (
          <View style={[s.moneyCard, CARD_SHADOW]}>
            <Text style={s.moneyLabel}>ALLOWANCE EARNED</Text>
            <Text style={s.moneyAmount}>${(Math.min(totalAllowance, moneyThreshold) / 100).toFixed(2)}</Text>
            <View style={s.moneyBarWrap}>
              <ProgressBar
                value={Math.min(totalAllowance, moneyThreshold)}
                max={moneyThreshold}
                fillColor={'#996B00'}
                label={`$0 → $${(moneyThreshold / 100).toFixed(0)} ✓`}
                height={12}
              />
            </View>
          </View>
        )}

        {/* ── Rewards Earned ── */}
        <View style={s.section}>
          <Text style={s.sectionTitle}>🎁 REWARDS EARNED</Text>
          <View style={s.rewardsRow}>
            <View style={[s.rewardCell, CARD_SHADOW]}>
              <Text style={s.rewardEmoji}>🏆</Text>
              <Text style={s.rewardLabel}>Trophy</Text>
            </View>
            <View style={[s.rewardCell, CARD_SHADOW]}>
              <Text style={s.rewardEmoji}>⭐</Text>
              <Text style={s.rewardLabel}>+{milestone.xpReward} XP</Text>
            </View>
          </View>
        </View>

        {/* ── Next milestone ── */}
        {nextMilestone && (
          <View style={[s.nextCard, CARD_SHADOW]}>
            <Text style={s.nextLabel}>NEXT MILESTONE</Text>
            <View style={s.nextRow}>
              <Text style={s.nextIcon}>{nextMilestone.icon}</Text>
              <View style={s.nextInfo}>
                <Text style={s.nextName}>{nextMilestone.name}</Text>
                <Text style={s.nextTagline}>{nextMilestone.tagline}</Text>
              </View>
            </View>
          </View>
        )}

      </ScrollView>
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: BG },

  header: {
    flexDirection: 'row', alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg, paddingVertical: spacing.sm,
  },
  backBtn: {
    width: 44, height: 44, borderRadius: 12,
    borderWidth: 2, borderColor: BORDER,
    alignItems: 'center', justifyContent: 'center',
    backgroundColor: colors.white, ...CARD_SHADOW,
  },
  backBtnText: { fontSize: fontSize.xxl, color: BORDER, fontFamily: interFamily.bold },
  headerTitle: { fontFamily: 'FredokaOne_400Regular', fontSize: fontSize.xxl, color: BORDER },

  scroll: { paddingHorizontal: spacing.lg, gap: spacing.md, paddingBottom: spacing.xxxl },

  // Hero
  heroCard: {
    borderRadius: radii.xxl, borderWidth: 3, borderColor: BORDER,
    padding: spacing.xl, alignItems: 'center', gap: spacing.sm,
  },
  heroTypeLabel: {
    borderWidth: 1.5, borderRadius: radii.sm,
    paddingHorizontal: spacing.sm, paddingVertical: 3,
  },
  heroTypeLabelText: { fontFamily: interFamily.heavy, fontSize: fontSize.xs, color: PURPLE, letterSpacing: 0.5 },
  heroIcon:    { fontSize: scale(64), marginTop: spacing.xs },
  heroName:    { fontFamily: 'FredokaOne_400Regular', fontSize: fontSize.h2, color: BORDER, textAlign: 'center' },
  heroTagline: { fontFamily: nunitoFamily.regular, fontSize: fontSize.base, color: '#555', textAlign: 'center', lineHeight: fontSize.xl },

  // Metadata
  metaCard: {
    flexDirection: 'row', backgroundColor: colors.white,
    borderRadius: radii.lg, borderWidth: 2, borderColor: BORDER, overflow: 'hidden',
  },
  metaCell: { flex: 1, alignItems: 'center', paddingVertical: spacing.md, paddingHorizontal: 4, gap: 3 },
  metaDivider: { width: 1, backgroundColor: '#EEE', marginVertical: spacing.sm },
  metaLabel: { fontFamily: spaceMonoFamily.regular, fontSize: fontSize.xs, color: MUTED, textAlign: 'center' },
  metaValue: { fontFamily: 'FredokaOne_400Regular', fontSize: fontSize.sm, color: BORDER, textAlign: 'center', lineHeight: fontSize.base },

  // Money card
  moneyCard: {
    backgroundColor: '#FFF9E6', borderRadius: radii.lg,
    borderWidth: 2, borderColor: BORDER, padding: spacing.lg, gap: spacing.sm,
  },
  moneyLabel:  { fontFamily: spaceMonoFamily.regular, fontSize: fontSize.xs, color: '#996B00', letterSpacing: 0.5 },
  moneyAmount: { fontFamily: 'FredokaOne_400Regular', fontSize: fontSize.display, color: BORDER },
  moneyBarWrap: {},

  // Rewards
  section:      { gap: spacing.sm },
  sectionTitle: { fontFamily: 'FredokaOne_400Regular', fontSize: fontSize.base, color: BORDER, textTransform: 'uppercase', letterSpacing: 0.3 },
  rewardsRow:   { flexDirection: 'row', gap: spacing.sm },
  rewardCell: {
    flex: 1, backgroundColor: colors.white, borderWidth: 2, borderColor: BORDER,
    borderRadius: radii.lg, paddingVertical: spacing.md, alignItems: 'center', gap: 4,
  },
  rewardEmoji: { fontSize: fontSize.h2 },
  rewardLabel: { fontFamily: nunitoFamily.heavy, fontSize: fontSize.xs, color: '#555', textAlign: 'center' },

  // Next milestone
  nextCard: {
    backgroundColor: colors.white, borderRadius: radii.lg,
    borderWidth: 2, borderColor: BORDER, padding: spacing.lg, gap: spacing.sm,
  },
  nextLabel:   { fontFamily: spaceMonoFamily.regular, fontSize: fontSize.xs, color: MUTED, letterSpacing: 0.5 },
  nextRow:     { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  nextIcon:    { fontSize: scale(40) },
  nextInfo:    { flex: 1 },
  nextName:    { fontFamily: 'FredokaOne_400Regular', fontSize: fontSize.lg, color: BORDER },
  nextTagline: { fontFamily: nunitoFamily.regular, fontSize: fontSize.sm, color: MUTED, marginTop: 2 },
});
