import React, { useState, useRef, useEffect } from 'react';
import {
  View, Text, StyleSheet, Image, ScrollView,
  TouchableOpacity, Dimensions, Animated, Easing,
} from 'react-native';
import { colors, spacing, fontSize, interFamily, scale, borders, shadows } from '../design-system/tokens';
import { ProgressBar } from '../design-system/components/ProgressBar';
import { PressableShadow } from '../design-system/components/PressableShadow';
import type { CollectibleEntry } from '../storage/collectibles';
import type { CollectibleDef, Rarity } from '../data/collectibles';
import { COLLECTIBLES } from '../data/collectibles';
import type { BossCaptureEntry } from '../storage/bossCaptures';
import { getBossDisplay } from '../data/bossLookup';

const { width: W } = Dimensions.get('window');

const GREEN  = colors.green;   // #C5F215
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

// ─── Rarity helpers ───────────────────────────────────────────────────────────

const RARITY_STARS: Record<string, number> = {
  Common: 1, Rare: 2, Epic: 3, Legendary: 4,
};

function getLore(name: string, rarity: Rarity): string {
  switch (rarity) {
    case 'Legendary': return `"Nobody knows how the ${name} got so shiny. Nobody wants to know."`;
    case 'Epic':      return `"The ${name} hums faintly. It might be alive. It might just be the vibes."`;
    case 'Rare':      return `"Most kids drop it. The ones who keep it? They go far."`;
    default:          return `"Every great collection starts with something gross. This is yours."`;
  }
}

function relativeDate(iso: string): string {
  const then  = new Date(iso);
  const now   = new Date();
  const diffMs = now.getTime() - then.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  if (diffDays === 0) return 'TODAY';
  if (diffDays === 1) return 'YESTERDAY';
  if (diffDays < 7)  return then.toLocaleDateString('en-US', { weekday: 'short' }).toUpperCase();
  return then.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }).toUpperCase();
}

// ─── Props ────────────────────────────────────────────────────────────────────

export interface RelicDetailProps {
  entries:      CollectibleEntry[];   // deduplicated — for ◄ ► navigation
  initialIndex: number;
  rawEntries:   CollectibleEntry[];   // all (including duplicates) — for count/dates
  captures:     BossCaptureEntry[];
  onBack:       () => void;
  onOpenBoss?:  (c: BossCaptureEntry) => void;
}

// ─── Component ───────────────────────────────────────────────────────────────

export function RelicDetail({ entries, initialIndex, rawEntries, captures, onBack, onOpenBoss }: RelicDetailProps) {
  const [idx, setIdx] = useState(initialIndex);

  // Hover animation — same as monster bob on home screen
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
  const entry       = entries[idx];
  const def         = COLLECTIBLES.find(c => c.key === entry.itemKey);
  const displayName = def?.name ?? entry.itemName;   // always prefer catalog name
  const rarity      = (def?.rarity ?? entry.rarity) as Rarity;

  // Count / date stats from raw entries
  const dupes     = rawEntries.filter(e => e.itemKey === entry.itemKey);
  const foundCount = dupes.length;
  const firstFound = dupes.reduce((a, b) => a.earnedAt < b.earnedAt ? a : b, dupes[0]);
  const mostRecent = dupes.reduce((a, b) => a.earnedAt > b.earnedAt ? a : b, dupes[0]);

  // Source boss
  const sourceBoss = captures.find(c => c.weekLabel === entry.weekLabel);
  const bossDisplay = sourceBoss ? getBossDisplay(sourceBoss.bossName) : undefined;

  // Collection progress for this rarity
  const totalOfRarity = COLLECTIBLES.filter(c => c.rarity === rarity).length;
  const ownedOfRarity = entries.filter(e => e.rarity === rarity).length;
  const progressPct   = totalOfRarity > 0 ? ownedOfRarity / totalOfRarity : 0;

  // Stars
  const starCount = RARITY_STARS[rarity] ?? 1;
  const stars     = Array.from({ length: 5 }, (_, i) => i < starCount ? '★' : '☆').join(' ');

  // Nav
  const canPrev = idx > 0;
  const canNext = idx < entries.length - 1;

  return (
    <View style={s.root}>

      {/* ── Header ── */}
      <View style={s.header}>
        <TouchableOpacity style={s.iconBtn} onPress={onBack} activeOpacity={0.7}>
          <Text style={s.iconBtnText}>←</Text>
        </TouchableOpacity>

        {/* Share placeholder */}
        <View style={s.iconBtn}>
          <Text style={s.iconBtnText}>↑</Text>
        </View>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={s.scroll}>

        {/* ── Hero card ── */}
        <View style={[s.heroCard, CARD_SHADOW]}>
          <View style={s.heroBg}>
            {/* Rarity pill */}
            <View style={[s.rarityPill, { backgroundColor: PURPLE }]}>
              <Text style={s.rarityPillText}>{rarity.toUpperCase()}</Text>
            </View>

            {/* Sparkle decorations */}
            <Text style={[s.sparkle, { top: 18, left: 24 }]}>✦</Text>
            <Text style={[s.sparkle, { top: 10, left: 60 }]}>✧</Text>
            <Text style={[s.sparkle, { top: 28, right: 28 }]}>✦</Text>
            <Text style={[s.sparkle, { top: 8,  right: 70 }]}>✧</Text>
            <Text style={[s.sparkle, { bottom: 60, left: 16 }]}>✦</Text>
            <Text style={[s.sparkle, { bottom: 40, right: 20 }]}>✧</Text>

            {/* Item name */}
            <Text style={s.heroTitle} numberOfLines={2}>{displayName.toUpperCase()}</Text>
            <Text style={s.heroStars}>{stars}</Text>

            {/* Navigation arrows + art */}
            <View style={s.heroArtRow}>
              <PressableShadow
                onPress={() => canPrev && setIdx(idx - 1)}
                disabled={!canPrev}
                style={[s.navArrow, !canPrev ? s.navArrowDisabled : undefined] as any}
              >
                <Text style={s.navArrowText}>◄</Text>
              </PressableShadow>

              <Animated.View style={[s.heroArtWrap, { transform: [{ translateY: bobTranslate }] }]}>
                {def
                  ? <Image source={def.image} style={s.heroArt} resizeMode="contain" />
                  : <Text style={s.heroArtFallback}>✦</Text>}
              </Animated.View>

              <PressableShadow
                onPress={() => canNext && setIdx(idx + 1)}
                disabled={!canNext}
                style={[s.navArrow, !canNext ? s.navArrowDisabled : undefined] as any}
              >
                <Text style={s.navArrowText}>►</Text>
              </PressableShadow>
            </View>
          </View>

          {/* Quote */}
          <View style={s.quoteWrap}>
            <Text style={s.quoteText}>{getLore(displayName, rarity)}</Text>
          </View>
        </View>

        {/* ── Stats row ── */}
        <View style={s.statsRow}>
          <View style={[s.statCard, CARD_SHADOW]}>
            <Text style={s.statLabel}>FOUND</Text>
            <View style={s.statValueRow}>
              <Text style={s.statNum}>{foundCount}</Text>
              <Image source={require('../../assets/icons/icon-trophy.png')} style={s.statIcon} resizeMode="contain" />
            </View>
            <Text style={s.statSub}>TIMES</Text>
          </View>

          <View style={[s.statCard, CARD_SHADOW]}>
            <Text style={s.statLabel}>FIRST FOUND</Text>
            <Image source={require('../../assets/icons/icon-calendar.png')} style={s.statIconMid} resizeMode="contain" />
            <Text style={s.statDate}>
              {new Date(firstFound.earnedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }).toUpperCase()}
            </Text>
          </View>

          <View style={[s.statCard, CARD_SHADOW]}>
            <Text style={s.statLabel}>MOST RECENT</Text>
            <Image source={require('../../assets/icons/icon-timer.png')} style={s.statIconMid} resizeMode="contain" />
            <Text style={s.statDate}>{relativeDate(mostRecent.earnedAt)}</Text>
          </View>
        </View>

        {/* ── Source row ── */}
        <View style={s.sourceRow}>
          {/* Dropped by */}
          <TouchableOpacity
            style={[s.sourceCard, { backgroundColor: '#EDE9FC' }, CARD_SHADOW]}
            onPress={() => sourceBoss && onOpenBoss && onOpenBoss(sourceBoss)}
            activeOpacity={sourceBoss && onOpenBoss ? 0.85 : 1}
          >
            <Text style={[s.sourceLabel, { color: PURPLE }]}>DROPPED BY</Text>
            {bossDisplay?.image
              ? <Image source={bossDisplay.image} style={s.bossImg} resizeMode="contain" />
              : <Text style={s.bossEmoji}>🫙</Text>}
            <Text style={s.sourceName}>{sourceBoss?.bossName ?? 'CHEST DROP'}</Text>
            {sourceBoss && <Text style={s.sourceSubtitle}>{sourceBoss.threat.toUpperCase()} BOSS</Text>}
          </TouchableOpacity>

          {/* Rewarded for */}
          <View style={[s.sourceCard, { backgroundColor: '#E0F0FF' }, CARD_SHADOW]}>
            <Text style={[s.sourceLabel, { color: '#1A6BB5' }]}>REWARDED FOR</Text>
            <Image source={require('../../assets/icons/icon-star.png')} style={s.rewardStar} resizeMode="contain" />
            <Text style={s.sourceName}>{Math.round(progressPct * 100)}%</Text>
            <Text style={s.sourceSubtitle}>COLLECTION</Text>
          </View>
        </View>

        {/* ── Collection progress ── */}
        <View style={[s.progressCard, CARD_SHADOW]}>
          <View style={s.progressHeader}>
            <Text style={s.progressTitle}>COLLECTION PROGRESS</Text>
            <Text style={s.progressPct}>{Math.round(progressPct * 100)}%</Text>
          </View>
          <ProgressBar value={ownedOfRarity} max={totalOfRarity} fillColor={PURPLE} label={`${ownedOfRarity} / ${totalOfRarity}`} height={12} />
          <Text style={s.progressSub}>
            YOU OWN: {ownedOfRarity} / {totalOfRarity} {rarity.toUpperCase()} TROPHIES
          </Text>
        </View>

        {/* ── CTA ── */}
        <TouchableOpacity style={[s.ctaBtn, CARD_SHADOW]} onPress={onBack} activeOpacity={0.85}>
          <Image source={require('../../assets/icons/icon-trophy.png')} style={s.ctaIcon} resizeMode="contain" />
          <Text style={s.ctaText}>SHOW IN TROPHY CASE</Text>
        </TouchableOpacity>

      </ScrollView>
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: BG },

  // Header
  header: {
    flexDirection: 'row', alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg, paddingVertical: spacing.sm,
  },
  iconBtn: {
    width: 44, height: 44, borderRadius: 12,
    borderWidth: 2, borderColor: BORDER,
    backgroundColor: colors.white,
    alignItems: 'center', justifyContent: 'center',
    ...CARD_SHADOW,
  },
  iconBtnText: { fontSize: fontSize.xxl, color: BORDER, fontFamily: interFamily.bold },
  rarityPill: {
    borderRadius: 20, paddingHorizontal: spacing.lg, paddingVertical: spacing.xs,
    borderWidth: 2, borderColor: BORDER,
  },
  rarityPillText: {
    fontFamily: interFamily.heavy, fontSize: fontSize.sm,
    color: colors.white, letterSpacing: 1,
  },

  scroll: { paddingHorizontal: spacing.lg, gap: spacing.md, paddingBottom: spacing.xxxl },

  // Hero
  heroCard: {
    borderRadius: 20, borderWidth: 2.5, borderColor: BORDER, overflow: 'hidden',
    backgroundColor: colors.white,
  },
  heroBg: {
    backgroundColor: GREEN, paddingTop: spacing.lg,
    paddingBottom: spacing.xl, alignItems: 'center',
  },
  sparkle: {
    position: 'absolute', fontSize: fontSize.xxl,
    color: colors.white, opacity: 0.7,
  },
  heroTitle: {
    fontFamily: 'FredokaOne_400Regular', fontSize: fontSize.h1,
    color: BORDER, textAlign: 'center',
    paddingHorizontal: spacing.xxxl, lineHeight: fontSize.h1 * 1.1,
    marginTop: spacing.md,
  },
  heroStars: {
    fontSize: fontSize.xl, color: PURPLE,
    letterSpacing: 4, marginTop: spacing.xs,
  },
  heroArtRow: {
    flexDirection: 'row', alignItems: 'center',
    gap: spacing.md, marginTop: spacing.md,
    paddingHorizontal: spacing.sm,
  },
  navArrow: {
    width: 44, height: 44, borderRadius: 10,
    backgroundColor: PURPLE, borderWidth: 2, borderColor: BORDER,
    alignItems: 'center', justifyContent: 'center',
    ...CARD_SHADOW,
  },
  navArrowDisabled: { opacity: 0.3 },
  navArrowText: { fontSize: fontSize.lg, color: colors.white, fontFamily: interFamily.heavy },
  heroArtWrap: {
    flex: 1, aspectRatio: 1, alignItems: 'center', justifyContent: 'center',
  },
  heroArt: { width: '90%', height: '90%' },
  heroArtFallback: { fontSize: fontSize.display, color: BORDER },
  quoteWrap: {
    backgroundColor: colors.white, paddingHorizontal: spacing.xl,
    paddingVertical: spacing.lg,
  },
  quoteText: {
    fontFamily: interFamily.medium, fontSize: fontSize.base,
    color: BORDER, textAlign: 'center', fontStyle: 'italic',
    lineHeight: fontSize.xxl,
  },

  // Stats row
  statsRow: { flexDirection: 'row', gap: spacing.sm },
  statCard: {
    flex: 1, backgroundColor: colors.white, borderRadius: 14,
    borderWidth: 2, borderColor: BORDER,
    paddingVertical: spacing.md, paddingHorizontal: spacing.sm,
    alignItems: 'center', gap: 2,
  },
  statLabel: {
    fontFamily: interFamily.heavy, fontSize: fontSize.xs,
    color: MUTED, textAlign: 'center', letterSpacing: 0.3,
  },
  statValueRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  statNum: { fontFamily: 'FredokaOne_400Regular', fontSize: fontSize.h1, color: BORDER },
  statIcon: { width: scale(28), height: scale(28) },
  statIconMid: { width: scale(26), height: scale(26), marginVertical: 2 },
  statSub: { fontFamily: interFamily.heavy, fontSize: fontSize.xs, color: MUTED },
  statDate: { fontFamily: 'FredokaOne_400Regular', fontSize: fontSize.lg, color: BORDER, textAlign: 'center' },

  // Source row
  sourceRow: { flexDirection: 'row', gap: spacing.sm },
  sourceCard: {
    flex: 1, borderRadius: 14, borderWidth: 2, borderColor: BORDER,
    paddingVertical: spacing.md, paddingHorizontal: spacing.sm,
    alignItems: 'center', gap: 4,
  },
  sourceLabel: {
    fontFamily: interFamily.heavy, fontSize: fontSize.xs,
    letterSpacing: 0.5, textAlign: 'center',
  },
  bossImg:   { width: scale(52), height: scale(52) },
  bossEmoji: { fontSize: fontSize.h2 },
  rewardStar:{ width: scale(44), height: scale(44) },
  sourceName: {
    fontFamily: 'FredokaOne_400Regular', fontSize: fontSize.lg,
    color: BORDER, textAlign: 'center',
  },
  sourceSubtitle: {
    fontFamily: interFamily.heavy, fontSize: fontSize.xs,
    color: MUTED, textAlign: 'center',
  },

  // Progress
  progressCard: {
    backgroundColor: colors.white, borderRadius: 14,
    borderWidth: 2, borderColor: BORDER, padding: spacing.lg, gap: spacing.sm,
  },
  progressHeader: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
  },
  progressTitle: {
    fontFamily: interFamily.heavy, fontSize: fontSize.sm,
    color: BORDER, letterSpacing: 0.5,
  },
  progressPct: {
    fontFamily: 'FredokaOne_400Regular', fontSize: fontSize.xl, color: PURPLE,
  },
  progressSub: {
    fontFamily: interFamily.heavy, fontSize: fontSize.xs,
    color: MUTED, letterSpacing: 0.3,
  },

  // CTA
  ctaBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: spacing.sm, backgroundColor: GREEN,
    borderRadius: 16, borderWidth: 2.5, borderColor: BORDER,
    paddingVertical: spacing.lg,
  },
  ctaIcon: { width: scale(28), height: scale(28) },
  ctaText: {
    fontFamily: 'FredokaOne_400Regular', fontSize: fontSize.xl,
    color: BORDER, letterSpacing: 0.5,
  },
});
