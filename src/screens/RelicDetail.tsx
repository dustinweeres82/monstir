import React, { useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, Animated,
} from 'react-native';
import { colors, spacing, fontSize, scale, interFamily, spaceMonoFamily, radii } from '../design-system/tokens';
import { useScaleAnimation } from '../design-system/hooks';
import { MilestoneHero } from '../components/MilestoneHero';
import { StatCard, SourceCard } from '../components/TrophyCards';
import type { CollectibleEntry } from '../storage/collectibles';
import type { Rarity, CollectibleDef } from '../data/collectibles';
import { COLLECTIBLES } from '../data/collectibles';
import type { BossCaptureEntry } from '../storage/bossCaptures';

const PURPLE = '#7B3FF2';
const LIME   = '#D8F52F';
const BORDER = '#111111';
const BG     = '#FFFDF7';
const MUTED  = '#888888';

const CARD_SHADOW = {
  shadowColor: BORDER,
  shadowOffset: { width: 0, height: 6 },
  shadowOpacity: 1,
  shadowRadius: 0,
  elevation: 6,
};

function getLore(def: CollectibleDef | undefined, rarity: Rarity): string {
  // Prefer the relic's own unique tagline; fall back to a rarity template only
  // for any item that predates the per-relic taglines.
  if (def?.tagline) return `"${def.tagline}"`;
  switch (rarity) {
    case 'Legendary': return `"Nobody knows how it got so shiny. Nobody wants to know."`;
    case 'Epic':      return `"It hums faintly. It might be alive. It might just be the vibes."`;
    case 'Rare':      return `"Most kids drop it. The ones who keep it? They go far."`;
    default:          return `"Every great collection starts with something gross. This is yours."`;
  }
}

function relativeDate(iso: string): string {
  const then     = new Date(iso);
  const now      = new Date();
  const diffMs   = now.getTime() - then.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  if (diffDays === 0) return 'Today';
  if (diffDays === 1) return 'Yesterday';
  if (diffDays < 7)  return then.toLocaleDateString('en-US', { weekday: 'short' });
  return then.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

const DROP_PCT: Record<string, string> = {
  Common:    '40%',
  Rare:      '20%',
  Epic:      '10%',
  Legendary: '6%',
};

export interface RelicDetailProps {
  entries:      CollectibleEntry[];
  initialIndex: number;
  rawEntries:   CollectibleEntry[];
  captures:     BossCaptureEntry[];
  onBack:       () => void;
  onOpenBoss?:  (c: BossCaptureEntry) => void;
}

export function RelicDetail({ entries, initialIndex, rawEntries, captures, onBack, onOpenBoss }: RelicDetailProps) {
  const [idx, setIdx] = useState(initialIndex);
  const { scaleAnim: closeScale, pressIn: closePressIn, pressOut: closePressOut } = useScaleAnimation({ toScale: 0.85 });

  const entry       = entries[idx];
  const def         = COLLECTIBLES.find(c => c.key === entry.itemKey);
  const displayName = def?.name ?? entry.itemName;
  const rarity      = (def?.rarity ?? entry.rarity) as Rarity;

  const dupes      = rawEntries.filter(e => e.itemKey === entry.itemKey);
  const foundCount = dupes.length;
  const firstFound = dupes.reduce((a, b) => a.earnedAt < b.earnedAt ? a : b, dupes[0]);
  const mostRecent = dupes.reduce((a, b) => a.earnedAt > b.earnedAt ? a : b, dupes[0]);

  const firstFoundStr = new Date(firstFound.earnedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  const recentStr     = relativeDate(mostRecent.earnedAt);

  const dropPct   = DROP_PCT[rarity] ?? '?%';
  const lore      = getLore(def, rarity);
  const typePill  = `${rarity} Relic`;

  const dots = entries;

  return (
    <View style={s.root}>
      {/* Header — modal chrome: close button only, no back arrow */}
      <View style={s.header}>
        <View style={s.iconBtnSpacer} />
        <Text style={s.headerTitle}>Relic</Text>
        <TouchableOpacity
          style={s.iconBtn}
          onPress={onBack}
          onPressIn={closePressIn}
          onPressOut={closePressOut}
          activeOpacity={1}
        >
          <Animated.View style={{ transform: [{ scale: closeScale }] }}>
            <Text style={s.iconBtnText}>✕</Text>
          </Animated.View>
        </TouchableOpacity>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={s.scroll}>

        <MilestoneHero
          type="relic"
          items={entries.map(e => {
            const d = COLLECTIBLES.find(c => c.key === e.itemKey);
            const r = (d?.rarity ?? e.rarity) as Rarity;
            return {
              typePillLabel: `${r} Relic`,
              title: d?.name ?? e.itemName,
              footerText: getLore(d, r),
              artSrc: d?.image,
            };
          })}
          index={idx}
          onIndexChange={setIdx}
        />

        {/* Slide dots */}
        {dots.length > 1 && (
          <View style={s.dots}>
            {dots.map((_, i) => (
              <TouchableOpacity key={i} onPress={() => setIdx(i)}>
                <View style={[s.dot, i === idx && s.dotActive]} />
              </TouchableOpacity>
            ))}
          </View>
        )}

        {/* About section */}
        <Text style={s.sectionTitle}>About This Relic</Text>

        {/* Stat cards row */}
        <View style={s.row}>
          <StatCard
            label="Found"
            value={`${foundCount} Times`}
          />
          <StatCard
            label="First Found"
            value={firstFoundStr}
            sublabel={`Most recent: ${recentStr}`}
          />
        </View>

        {/* Source cards row */}
        <View style={s.row}>
          <SourceCard
            variant="purple"
            label="Dropped By"
            value="Boss Battles ⚔"
            sublabel="Win battles to earn more"
          />
          <SourceCard
            variant="lime"
            label="Drop Chance"
            value={dropPct}
            sublabel={`${rarity} rarity`}
          />
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
    shadowColor: BORDER, shadowOffset: { width: 0, height: 3 }, shadowOpacity: 1, shadowRadius: 0, elevation: 3,
  },
  iconBtnSpacer: { width: 44, height: 44 },
  iconBtnText: { fontSize: fontSize.xxl, color: BORDER, fontFamily: interFamily.bold },
  headerTitle: { fontFamily: 'FredokaOne_400Regular', fontSize: fontSize.xxl, color: BORDER },

  scroll: { paddingHorizontal: spacing.lg, gap: spacing.md, paddingBottom: 120 },

  dots: {
    flexDirection: 'row', justifyContent: 'center', gap: 6, marginTop: -spacing.xs,
  },
  dot:       { width: 8, height: 8, borderRadius: 4, backgroundColor: '#CCCCCC' },
  dotActive: { backgroundColor: PURPLE },

  sectionTitle: {
    fontFamily: interFamily.heavy,
    fontSize: scale(22),
    color: BORDER,
  },

  row: { flexDirection: 'row', gap: spacing.sm },

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
