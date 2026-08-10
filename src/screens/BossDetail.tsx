import React, { useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, Animated,
} from 'react-native';
import { colors, spacing, fontSize, scale, interFamily, radii, hardShadow } from '../design-system/tokens';
import { useScaleAnimation } from '../design-system/hooks';
import { MilestoneHero } from '../components/MilestoneHero';
import { StatCard, RewardCard } from '../components/TrophyCards';
import { getBossDisplay } from '../data/bossLookup';
import { COLLECTIBLES } from '../data/collectibles';
import type { BossCaptureEntry } from '../storage/bossCaptures';
import type { CollectibleEntry } from '../storage/collectibles';

const PURPLE = '#7B3FF2';
const BORDER = '#111111';
const BG     = '#FFFDF7';

type RewardRarity = 'rare' | 'legendary' | 'common' | 'milestone';

const THREAT_TO_RARITY: Record<string, RewardRarity> = {
  Easy:    'common',
  Medium:  'rare',
  Hard:    'rare',
  Extreme: 'legendary',
};

const THREAT_STARS: Record<string, string> = {
  Easy:    '★',
  Medium:  '★★',
  Hard:    '★★★',
  Extreme: '★★★★',
};

export interface BossDetailProps {
  captures:      BossCaptureEntry[];
  initialIndex:  number;
  relics:        CollectibleEntry[];
  onBack:        () => void;
}

// Canonical collectible-rarity colors (mirrors TrophyRoom). The boss-jar palette
// in RewardCard is threat-based, so relics carry their own rarity color here.
const RELIC_RARITY_COLOR: Record<string, string> = {
  Common:    '#666666',
  Rare:      '#1A6BB5',
  Epic:      '#7B3FF2',
  Legendary: '#7A5300',
};

function relicForCapture(capture: BossCaptureEntry, relics: CollectibleEntry[]) {
  const match = relics.find(r => r.weekLabel === capture.weekLabel);
  const def   = match ? COLLECTIBLES.find(c => c.key === match.itemKey) : undefined;
  return { relicName: match?.itemName, relicImage: def?.image, relicRarity: match?.rarity };
}

export function BossDetail({ captures, initialIndex, relics, onBack }: BossDetailProps) {
  const [idx, setIdx] = useState(initialIndex);
  const { scaleAnim: closeScale, pressIn: closePI, pressOut: closePO } = useScaleAnimation({ toScale: 0.85 });

  const capture     = captures[idx];
  const boss        = getBossDisplay(capture.bossName);
  const captureDate = new Date(capture.capturedAt);
  const dateStr     = captureDate.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
  const dayStr      = captureDate.toLocaleDateString('en-US', { weekday: 'long' });
  const stars       = THREAT_STARS[capture.threat] ?? '★';
  const threat      = capture.threat ?? 'Easy';
  const jarRarity   = THREAT_TO_RARITY[threat] ?? 'common';
  const artSrc      = boss?.jar ?? boss?.image;
  // MON-82: show the boss's proper battle weakness (name + icon), not the stored
  // counter-chore string. Looked up by boss name so it's correct for old captures too.
  const weaknessText = boss?.battleWeakness ? `${boss.battleWeakness.icon}  ${boss.battleWeakness.name}` : capture.weakness;
  const footerText  = boss?.tagline ?? `Captured on ${dayStr}.`;
  const { relicName, relicImage, relicRarity } = relicForCapture(capture, relics);

  const heroItems = captures.map(c => {
    const b        = getBossDisplay(c.bossName);
    const t        = c.threat ?? 'Easy';
    const src      = b?.jar ?? b?.image;
    const day      = new Date(c.capturedAt).toLocaleDateString('en-US', { weekday: 'long' });
    return {
      typePillLabel: `${t} Boss`,
      title:         c.bossName,
      footerText:    b?.tagline ?? `Captured on ${day}.`,
      artSrc:        src,
    };
  });

  return (
    <View style={s.root}>
      {/* Header — modal chrome: close button only, no back arrow */}
      <View style={s.header}>
        <View style={s.iconBtnSpacer} />
        <Text style={s.headerTitle}>Boss Trophy</Text>
        <TouchableOpacity style={s.iconBtn} onPress={onBack} onPressIn={closePI} onPressOut={closePO} activeOpacity={1}>
          <Animated.View style={{ transform: [{ scale: closeScale }] }}>
            <Text style={s.iconBtnText}>✕</Text>
          </Animated.View>
        </TouchableOpacity>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={s.scroll}>

        <MilestoneHero
          type="boss"
          items={heroItems}
          index={idx}
          onIndexChange={setIdx}
        />

        {/* Stats row 1 */}
        <View style={s.row}>
          <StatCard label="Captured" value={dateStr} sublabel={dayStr} />
          <StatCard label="Completion" value={`${capture.completionPct}%`} valueColor={PURPLE} />
        </View>

        {/* Stats row 2 */}
        <View style={s.row}>
          <StatCard label="Weakness" value={weaknessText} valueColor={PURPLE} />
          <StatCard label="Threat" value={stars} sublabel={`${threat} difficulty`} />
        </View>

        {/* Rewards section */}
        <Text style={s.sectionTitle}>🎁 Rewards Earned</Text>

        <View style={s.rewardsGrid}>
          {boss?.jar && (
            <RewardCard
              rarity={jarRarity}
              imageSrc={boss.jar}
              name={`${capture.bossName} Jar`}
            />
          )}
          {/* Only render the relic when a collectible actually matched this
              capture's week — otherwise the card was an empty "Relic ✦" placeholder. */}
          {relicName && (
            <RewardCard
              rarity="common"
              badgeLabel={relicRarity}
              badgeColor={relicRarity ? RELIC_RARITY_COLOR[relicRarity] : undefined}
              badgeTextColor="#FFFFFF"
              imageSrc={relicImage}
              name={relicName}
            />
          )}
          {/* XP and coins are battle rewards, not milestones — label them "Reward"
              and use the app's real coin/star assets instead of emoji. Show the
              real earned XP; hide the card if none (never fabricate a fallback). */}
          {(capture.xpEarned ?? 0) > 0 && (
            <RewardCard
              rarity="milestone"
              badgeLabel="Reward"
              imageSrc={require('../../assets/icons/icon-star.png')}
              name={`+${capture.xpEarned} XP`}
            />
          )}
          {/* Coins only when a cash bonus was actually paid (battle-money setting on
              at capture time → coinsEarned > 0); hidden otherwise. */}
          {(capture.coinsEarned ?? 0) > 0 && (
            <RewardCard
              rarity="milestone"
              badgeLabel="Reward"
              imageSrc={require('../../assets/icons/icon-coin.png')}
              name={`+${capture.coinsEarned} coins`}
            />
          )}
        </View>

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
  iconBtn: {
    width: 44, height: 44, borderRadius: 22,
    borderWidth: 2, borderColor: BORDER,
    backgroundColor: colors.white,
    alignItems: 'center', justifyContent: 'center',
    ...hardShadow(3),
  },
  iconBtnSpacer: { width: 44, height: 44 },
  iconBtnText: { fontSize: fontSize.xxl, color: BORDER, fontFamily: interFamily.bold },
  headerTitle: { fontFamily: 'FredokaOne_400Regular', fontSize: fontSize.xxl, color: BORDER },

  scroll: { paddingHorizontal: spacing.lg, gap: spacing.md, paddingBottom: 120 },

  row: { flexDirection: 'row', gap: spacing.sm },

  sectionTitle: {
    fontFamily: interFamily.heavy,
    fontSize: scale(22),
    color: BORDER,
    marginTop: spacing.xs,
  },

  rewardsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },

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
