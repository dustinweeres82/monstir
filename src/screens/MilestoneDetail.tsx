import React, { useState } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, ScrollView, Animated, Image,
} from 'react-native';
import { colors, spacing, fontSize, interFamily, nunitoFamily, radii } from '../design-system/tokens';
import { useScaleAnimation } from '../design-system/hooks';
import { MilestoneHero } from '../components/MilestoneHero';
import { StatCard } from '../components/TrophyCards';
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

function getNextMilestone(current: MilestoneDef): MilestoneDef | undefined {
  const same = MILESTONES.filter(m => m.category === current.category && m.audience === current.audience);
  const idx  = same.findIndex(m => m.id === current.id);
  return same[idx + 1];
}

export interface MilestoneDetailProps {
  milestone:    MilestoneDef;
  earned:       EarnedMilestone | undefined;
  totalAllowance?: number;
  onBack:       () => void;
  allEarned?:   EarnedMilestone[];
}

export function MilestoneDetail({
  milestone,
  earned,
  onBack,
  allEarned = [],
}: MilestoneDetailProps) {
  const { scaleAnim: closeScale, pressIn: closePI, pressOut: closePO } = useScaleAnimation({ toScale: 0.85 });

  // Build ordered list of kid milestones that have been earned
  const kidMilestoneDefs = MILESTONES.filter(m => m.audience === 'kid');
  const earnedKidDefs = kidMilestoneDefs
    .filter(m => allEarned.some(e => e.id === m.id))
    .sort((a, b) => {
      const aAt = allEarned.find(e => e.id === a.id)?.earnedAt ?? '';
      const bAt = allEarned.find(e => e.id === b.id)?.earnedAt ?? '';
      return bAt.localeCompare(aAt);
    });

  // If no earned milestones or current not in earned list, show just current
  const useCarousel = earnedKidDefs.length > 0;
  const initialIdx = useCarousel
    ? Math.max(0, earnedKidDefs.findIndex(m => m.id === milestone.id))
    : 0;

  const [carouselIdx, setCarouselIdx] = useState(initialIdx);

  const activeMilestone = useCarousel && earnedKidDefs.length > 0
    ? earnedKidDefs[carouselIdx]
    : milestone;

  const activeEarned = allEarned.find(e => e.id === activeMilestone.id);

  const earnedDate = activeEarned
    ? new Date(activeEarned.earnedAt).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })
    : null;

  const nextMilestone = getNextMilestone(activeMilestone);

  const carouselTotal = useCarousel ? earnedKidDefs.length : (earned ? 1 : 0);
  const carouselIndex = useCarousel ? carouselIdx + 1 : (earned ? 1 : 1);

  const dots = useCarousel ? earnedKidDefs : (earned ? [milestone] : []);

  return (
    <View style={s.root}>
      {/* Header — modal chrome: close button only, no back arrow */}
      <View style={s.header}>
        <View style={s.backBtnSpacer} />
        <Text style={s.headerTitle}>Trophies</Text>
        <TouchableOpacity style={s.backBtn} onPress={onBack} onPressIn={closePI} onPressOut={closePO} activeOpacity={1}>
          <Animated.View style={{ transform: [{ scale: closeScale }] }}>
            <Text style={s.backBtnText}>✕</Text>
          </Animated.View>
        </TouchableOpacity>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={s.scroll}>

        <MilestoneHero
          type="milestone-kid"
          items={useCarousel && earnedKidDefs.length > 0
            ? earnedKidDefs.map(m => ({
                typePillLabel: 'Milestone',
                title: m.name,
                footerText: m.tagline,
                milestoneImage: m.image,
                milestoneIcon: m.icon,
                locked: false,
              }))
            : [{
                typePillLabel: 'Milestone',
                title: milestone.name,
                footerText: milestone.tagline,
                milestoneImage: milestone.image,
                milestoneIcon: milestone.icon,
                locked: !earned,
              }]
          }
          index={useCarousel ? carouselIdx : 0}
          onIndexChange={setCarouselIdx}
        />

        {/* Slide dots */}
        {dots.length > 1 && (
          <View style={s.dots}>
            {dots.map((_, i) => (
              <TouchableOpacity key={i} onPress={() => setCarouselIdx(i)}>
                <View style={[s.dot, i === carouselIdx && s.dotActive]} />
              </TouchableOpacity>
            ))}
          </View>
        )}

        {/* Stats row */}
        <View style={s.row}>
          <StatCard
            label="Earned"
            value={earnedDate ?? 'Not yet earned'}
            style={earnedDate ? undefined : { opacity: 0.6 }}
          />
          <StatCard
            label="XP Reward"
            value={`+${activeMilestone.xpReward} XP`}
            valueColor={PURPLE}
          />
        </View>

        {/* Next Milestone */}
        {nextMilestone && (
          <View style={[s.nextCard, CARD_SHADOW]}>
            <Text style={s.nextLabel}>NEXT MILESTONE</Text>
            <View style={s.nextRow}>
              {nextMilestone.image
                ? <Image source={nextMilestone.image} style={s.nextImg} resizeMode="contain" />
                : <Text style={s.nextIcon}>{nextMilestone.icon}</Text>}
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
    width: 44, height: 44, borderRadius: 22,
    borderWidth: 2, borderColor: BORDER,
    alignItems: 'center', justifyContent: 'center',
    backgroundColor: colors.white,
    shadowColor: BORDER, shadowOffset: { width: 0, height: 3 }, shadowOpacity: 1, shadowRadius: 0, elevation: 3,
  },
  backBtnSpacer: { width: 44, height: 44 },
  backBtnText: { fontSize: fontSize.xxl, color: BORDER, fontFamily: interFamily.bold },
  headerTitle: { fontFamily: 'FredokaOne_400Regular', fontSize: fontSize.xxl, color: BORDER },

  scroll: { paddingHorizontal: spacing.lg, gap: spacing.md, paddingBottom: 120 },

  dots: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 6,
    marginTop: -spacing.xs,
  },
  dot: {
    width: 8, height: 8, borderRadius: 4,
    backgroundColor: '#CCCCCC',
  },
  dotActive: {
    backgroundColor: PURPLE,
  },

  row: {
    flexDirection: 'row',
    gap: spacing.sm,
  },

  nextCard: {
    backgroundColor: colors.white,
    borderRadius: radii.lg,
    borderWidth: 2.5,
    borderColor: BORDER,
    padding: spacing.lg,
    gap: spacing.sm,
  },
  nextLabel: {
    fontSize: fontSize.sm,
    fontFamily: interFamily.heavy,
    color: PURPLE,
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  nextRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  nextImg:  { width: 44, height: 44 },
  nextIcon: { fontSize: 40 },
  nextInfo: { flex: 1 },
  nextName: { fontFamily: 'FredokaOne_400Regular', fontSize: fontSize.xl, color: BORDER },
  nextTagline: { fontSize: fontSize.base, color: MUTED, fontFamily: nunitoFamily.regular, marginTop: 2 },

  ctaBtn: {
    backgroundColor: PURPLE,
    borderRadius: 50,
    borderWidth: 3,
    borderColor: BORDER,
    paddingVertical: spacing.lg,
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  ctaText: {
    fontFamily: 'FredokaOne_400Regular',
    fontSize: 18,
    color: '#FFFFFF',
  },
});
