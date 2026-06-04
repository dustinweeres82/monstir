import React from 'react';
import {
  View, Text, StyleSheet, Image, ScrollView,
  TouchableOpacity, Animated,
} from 'react-native';
import { colors, spacing, scale, fontSize, interFamily } from '../design-system/tokens';
import { useScaleAnimation } from '../design-system/hooks';
import { getBossDisplay, THREAT_STARS } from '../data/bossLookup';
import type { BossCaptureEntry } from '../storage/bossCaptures';

const PURPLE = '#7B3FF2';
const BORDER = '#111111';
const MUTED  = '#888888';
const BG     = '#FFFDF7';

const CARD_SHADOW = {
  shadowColor: BORDER,
  shadowOffset: { width: 0, height: 4 },
  shadowOpacity: 1,
  shadowRadius: 0,
  elevation: 5,
};

interface BossDetailProps {
  capture: BossCaptureEntry;
  relicName?: string;
  relicImage?: ReturnType<typeof require>;
  onBack: () => void;
}

function MetaCell({ label, value, purple }: { label: string; value: string; purple?: boolean }) {
  return (
    <View style={s.metaCell}>
      <Text style={s.metaLabel}>{label}</Text>
      <Text style={[s.metaValue, purple && { color: PURPLE }]}>{value}</Text>
    </View>
  );
}

export function BossDetail({ capture, relicName, relicImage, onBack }: BossDetailProps) {
  const { scaleAnim: backScale, pressIn: backPI, pressOut: backPO } = useScaleAnimation({ toScale: 0.85 });
  const boss   = getBossDisplay(capture.bossName);
  const stars  = THREAT_STARS[capture.threat] ?? '★';

  const captureDate = new Date(capture.capturedAt);
  const dateStr = captureDate.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
  const dayStr  = captureDate.toLocaleDateString('en-US', { weekday: 'long' });

  return (
    <View style={s.root}>

      {/* ── Header ── */}
      <View style={s.header}>
        <TouchableOpacity style={s.backBtn} onPress={onBack} onPressIn={backPI} onPressOut={backPO} activeOpacity={1}>
          <Animated.View style={{ transform: [{ scale: backScale }] }}>
            <Text style={s.backBtnText}>←</Text>
          </Animated.View>
        </TouchableOpacity>
        <Text style={s.headerTitle}>Boss Trophy</Text>
        <View style={s.backBtn} />
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={s.scroll}>

        {/* ── Hero card ── */}
        <View style={s.heroCard}>
          <View style={s.heroTop}>
            {/* Boss jar art */}
            <View style={s.heroArtWrap}>
              {boss?.jar ? (
                <Image source={boss.jar} style={s.heroArt} resizeMode="contain" />
              ) : boss?.image ? (
                <Image source={boss.image} style={s.heroArt} resizeMode="contain" />
              ) : (
                <Text style={s.heroJar}>🫙</Text>
              )}
            </View>
            <View style={s.heroInfo}>
              <View style={s.bossTrophyLabel}>
                <Text style={s.bossTrophyLabelText}>BOSS TROPHY</Text>
              </View>
              <Text style={s.bossName}>{capture.bossName}</Text>
              <View style={s.starsRow}>
                <Text style={s.stars}>{stars}</Text>
                <Text style={s.threatLabel}>{capture.threat} Boss</Text>
              </View>
              {boss?.tagline && (
                <Text style={s.tagline}>{boss.tagline}</Text>
              )}
            </View>
          </View>
        </View>

        {/* ── Metadata strip ── */}
        <View style={[s.metaCard, CARD_SHADOW]}>
          <MetaCell label="Captured" value={`${dateStr}\n${dayStr}`} />
          <View style={s.metaDivider} />
          <MetaCell label="Completion" value={`${capture.completionPct}%`} purple />
          <View style={s.metaDivider} />
          <MetaCell label="Threat" value={stars} purple />
          <View style={s.metaDivider} />
          <MetaCell label="Weakness" value={capture.weakness} purple />
        </View>

        {/* ── Rewards Earned ── */}
        <View style={s.section}>
          <Text style={s.sectionTitle}>🎁 REWARDS EARNED</Text>
          <View style={s.rewardsRow}>
            {/* Relic drop */}
            <View style={s.rewardCell}>
              {relicImage ? (
                <Image source={relicImage} style={s.rewardImg} resizeMode="contain" />
              ) : (
                <Text style={s.rewardEmoji}>🫙</Text>
              )}
              <Text style={s.rewardLabel}>{relicName ?? 'Relic'}</Text>
            </View>
            {/* Jar decoration */}
            {boss?.jar && (
              <View style={s.rewardCell}>
                <Image source={boss.jar} style={s.rewardImg} resizeMode="contain" />
                <Text style={s.rewardLabel}>Jar</Text>
              </View>
            )}
            {/* XP */}
            <View style={s.rewardCell}>
              <Text style={s.rewardEmoji}>⭐</Text>
              <Text style={s.rewardLabel}>+{capture.xpEarned} XP</Text>
            </View>
            {/* Coins */}
            <View style={s.rewardCell}>
              <Text style={s.rewardEmoji}>🟡</Text>
              <Text style={s.rewardLabel}>+{capture.coinsEarned} coins</Text>
            </View>
          </View>
        </View>

        {/* ── Memory card ── */}
        <View style={[s.memoryCard, CARD_SHADOW]}>
          <Text style={s.memoryLabel}>MEMORY 💜</Text>
          <Text style={s.memoryText}>
            {`Captured ${capture.bossName} on ${dayStr}, ${dateStr} — after completing ${capture.completionPct}% of their chores that week. Weakness: ${capture.weakness}.`}
          </Text>
          <Text style={s.memoryWeek}>{capture.weekLabel}</Text>
        </View>

      </ScrollView>
    </View>
  );
}

const s = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: BG,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
  },
  backBtn: {
    width: 36,
    height: 36,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: BORDER,
    alignItems: 'center',
    justifyContent: 'center',
  },
  backBtnText: {
    fontSize: fontSize.xxl,
    color: BORDER,
    fontFamily: interFamily.semibold,
  },
  headerTitle: {
    fontFamily: 'FredokaOne_400Regular',
    fontSize: fontSize.xxl,
    color: BORDER,
  },

  scroll: {
    paddingHorizontal: spacing.lg,
    gap: spacing.md,
  },

  // Hero card
  heroCard: {
    backgroundColor: '#F3EEFF',
    borderRadius: 16,
    borderWidth: 3,
    borderColor: BORDER,
    overflow: 'hidden',
    ...CARD_SHADOW,
  },
  heroTop: {
    flexDirection: 'row',
    gap: 12,
    padding: 14,
  },
  heroArtWrap: {
    width: 90,
    height: 90,
    backgroundColor: '#EDE9FC',
    borderRadius: 14,
    borderWidth: 3,
    borderColor: BORDER,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  heroArt: {
    width: 76,
    height: 76,
  },
  heroJar: {
    fontSize: fontSize.display,
  },
  heroInfo: {
    flex: 1,
    gap: 3,
  },
  bossTrophyLabel: {
    alignSelf: 'flex-start',
    backgroundColor: '#EDE9FC',
    borderWidth: 1.5,
    borderColor: '#C4B0F8',
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  bossTrophyLabelText: {
    fontSize: fontSize.xs,
    fontFamily: interFamily.heavy,
    color: PURPLE,
    letterSpacing: 0.5,
  },
  bossName: {
    fontFamily: 'FredokaOne_400Regular',
    fontSize: fontSize.xxxl,
    color: BORDER,
  },
  starsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  stars: {
    color: PURPLE,
    fontSize: fontSize.base,
  },
  threatLabel: {
    fontFamily: 'FredokaOne_400Regular',
    fontSize: fontSize.base,
    color: PURPLE,
  },
  tagline: {
    fontSize: fontSize.sm,
    color: '#555',
    fontFamily: interFamily.regular,
    lineHeight: fontSize.lg,
    marginTop: 2,
  },

  // Metadata strip
  metaCard: {
    flexDirection: 'row',
    backgroundColor: colors.white,
    borderRadius: 14,
    borderWidth: 2,
    borderColor: BORDER,
    overflow: 'hidden',
  },
  metaCell: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 4,
    gap: 3,
  },
  metaDivider: {
    width: 1,
    backgroundColor: '#EEE',
    marginVertical: 8,
  },
  metaLabel: {
    fontSize: fontSize.xs,
    color: MUTED,
    fontFamily: interFamily.heavy,
    textAlign: 'center',
  },
  metaValue: {
    fontSize: fontSize.sm,
    color: BORDER,
    fontFamily: 'FredokaOne_400Regular',
    textAlign: 'center',
    lineHeight: fontSize.base,
  },

  // Rewards
  section: {
    gap: 10,
  },
  sectionTitle: {
    fontFamily: 'FredokaOne_400Regular',
    fontSize: fontSize.base,
    color: BORDER,
    textTransform: 'uppercase',
    letterSpacing: 0.3,
  },
  rewardsRow: {
    flexDirection: 'row',
    gap: 8,
  },
  rewardCell: {
    flex: 1,
    backgroundColor: colors.white,
    borderWidth: 2,
    borderColor: BORDER,
    borderRadius: 10,
    paddingVertical: 8,
    alignItems: 'center',
    gap: 4,
    ...CARD_SHADOW,
  },
  rewardImg: {
    width: scale(36),
    height: scale(36),
  },
  rewardEmoji: {
    fontSize: fontSize.h2,
  },
  rewardLabel: {
    fontSize: fontSize.xs,
    fontFamily: interFamily.heavy,
    color: '#555',
    textAlign: 'center',
  },

  // Memory card
  memoryCard: {
    backgroundColor: colors.white,
    borderWidth: 2,
    borderColor: BORDER,
    borderRadius: 14,
    padding: 12,
    gap: 4,
    marginBottom: spacing.sm,
  },
  memoryLabel: {
    fontSize: fontSize.xs,
    fontFamily: interFamily.heavy,
    color: PURPLE,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  memoryText: {
    fontSize: fontSize.sm,
    color: '#333',
    fontFamily: interFamily.regular,
    lineHeight: fontSize.xl,
  },
  memoryWeek: {
    fontSize: fontSize.xs,
    color: MUTED,
    fontFamily: interFamily.bold,
  },
});
