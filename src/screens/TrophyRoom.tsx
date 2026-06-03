import React, { useEffect, useState } from 'react';
import {
  View, Text, StyleSheet, Image, ScrollView,
  TouchableOpacity, Dimensions,
} from 'react-native';
import { colors, spacing, radii, scale, fontSize, interFamily, shadows } from '../design-system/tokens';
import { ProgressBar } from '../design-system/components/ProgressBar';
import { getCollectibles, type CollectibleEntry } from '../storage/collectibles';
import { getBossCaptures, type BossCaptureEntry } from '../storage/bossCaptures';
import { COLLECTIBLES } from '../data/collectibles';
import { THREAT_STARS, getBossDisplay } from '../data/bossLookup';
import { BossDetail } from './BossDetail';
import { RelicDetail } from './RelicDetail';
import { MilestoneDetail } from './MilestoneDetail';
import { getEarnedMilestones, type EarnedMilestone } from '../storage/milestones';
import { MILESTONES, KID_MILESTONES, type MilestoneDef } from '../data/milestones';

const { width: W } = Dimensions.get('window');

type MonsterIdx = 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7;

// ─── Design tokens ────────────────────────────────────────────────────────────

const PURPLE = '#7B3FF2';
const BG     = '#FFFDF7';
const BORDER = '#111111';
const MUTED  = '#888888';

const RARITY_COLORS: Record<string, string> = {
  Common:    '#666666',
  Rare:      '#1A6BB5',
  Epic:      PURPLE,
  Legendary: '#7A5300',
};

const RARITY_BG: Record<string, string> = {
  Common:    '#F3F3F3',
  Rare:      '#EAF3FB',
  Epic:      '#EDE9FC',
  Legendary: '#FFF3C4',
};

const CARD_SHADOW = {
  shadowColor: BORDER,
  shadowOffset: { width: 0, height: 4 },
  shadowOpacity: 1,
  shadowRadius: 0,
  elevation: 5,
};

// ─── Monster data (mirrors App.tsx) ──────────────────────────────────────────

interface MonsterMeta { name: string; level: number; needed: number; }
const MONSTERS: MonsterMeta[] = [
  { name: 'Grumble',  level: 1, needed: 100 },
  { name: 'Fanglet',  level: 2, needed: 150 },
  { name: 'Bristor',  level: 3, needed: 250 },
  { name: 'Vexling',  level: 4, needed: 300 },
  { name: 'Thornax',  level: 5, needed: 400 },
  { name: 'Zorphax',  level: 6, needed: 500 },
  { name: 'Dreadmaw', level: 7, needed: 600 },
  { name: 'Vorthak',  level: 8, needed: 700 },
];

// ─── Props ────────────────────────────────────────────────────────────────────

export interface TrophyRoomProps {
  monsterIdx:       MonsterIdx;
  monsterImg:       number;
  monsterName:      string;
  xp:               number;
  initialRelicKey?: string;
  onBack:           () => void;
}


// ─── Main screen ──────────────────────────────────────────────────────────────

export function TrophyRoom({ monsterIdx, monsterImg, monsterName, xp, initialRelicKey, onBack }: TrophyRoomProps) {
  const [relics, setRelics]               = useState<CollectibleEntry[]>([]);
  const [rawEntries, setRawEntries]       = useState<CollectibleEntry[]>([]);
  const [captures, setCaptures]           = useState<BossCaptureEntry[]>([]);
  const [earnedMs, setEarnedMs]           = useState<EarnedMilestone[]>([]);
  const [detailCapture, setDetail]        = useState<BossCaptureEntry | null>(null);
  const [detailIndex, setDetailIndex]     = useState<number | null>(null);
  const [detailMilestone, setDetailMs]    = useState<MilestoneDef | null>(null);

  useEffect(() => {
    getCollectibles().then(all => {
      setRawEntries(all);
      const seen = new Set<string>();
      const deduped = all.filter(e => { if (seen.has(e.itemKey)) return false; seen.add(e.itemKey); return true; });
      setRelics(deduped);
      if (initialRelicKey) {
        const idx = deduped.findIndex(e => e.itemKey === initialRelicKey);
        if (idx !== -1) setDetailIndex(idx);
      }
    });
    getBossCaptures().then(setCaptures);
    getEarnedMilestones().then(setEarnedMs);
  }, []);

  // ── Detail routing ───────────────────────────────────────────────────────────

  if (detailCapture) {
    const matchRelic = relics.find(r => r.weekLabel === detailCapture.weekLabel);
    const relicDef   = matchRelic ? COLLECTIBLES.find(c => c.key === matchRelic.itemKey) : undefined;
    return (
      <BossDetail
        capture={detailCapture}
        relicName={matchRelic?.itemName}
        relicImage={relicDef?.image}
        onBack={() => setDetail(null)}
      />
    );
  }

  if (detailIndex !== null) {
    return (
      <RelicDetail
        entries={relics}
        initialIndex={detailIndex}
        rawEntries={rawEntries}
        captures={captures}
        onBack={() => setDetailIndex(null)}
        onOpenBoss={(c) => { setDetailIndex(null); setDetail(c); }}
      />
    );
  }

  if (detailMilestone) {
    const earned = earnedMs.find(e => e.id === detailMilestone.id);
    return (
      <MilestoneDetail
        milestone={detailMilestone}
        earned={earned}
        onBack={() => setDetailMs(null)}
      />
    );
  }

  const monster      = MONSTERS[monsterIdx] ?? MONSTERS[MONSTERS.length - 1];
  const xpPct        = Math.min(1, xp / monster.needed);
  const totalTrophies = relics.length + captures.length + earnedMs.length;
  const missingCount  = COLLECTIBLES.length - relics.length;
  const mostRecent    = relics[0];
  const CARD_W        = (W - spacing.lg * 2 - 8) / 2;
  const COL3_W        = (W - spacing.lg * 2 - 8 * 2) / 3;

  return (
    <View style={s.root}>

      {/* ── Header ── */}
      <View style={s.header}>
        <TouchableOpacity style={s.headerBtn} onPress={onBack} activeOpacity={0.7}>
          <Text style={s.headerBtnText}>←</Text>
        </TouchableOpacity>
        <Text style={s.headerTitleText}>🏆 Trophy Room</Text>
        <View style={s.headerBtn} />
      </View>

      <ScrollView style={{ flex: 1 }} contentContainerStyle={s.scroll} showsVerticalScrollIndicator={false}>

        {/* ── Hero ── */}
        <View style={s.hero}>
          <View style={s.monsterAvatar}>
            <Image source={monsterImg} style={s.monsterAvatarImg} resizeMode="contain" />
          </View>
          <View style={s.heroInfo}>
            <Text style={s.heroName}>{monsterName}</Text>
            <View style={s.heroLevelRow}>
              <Text style={s.heroLevel}>Level {monster.level}</Text>
              <Text style={s.heroXpText}>{xp.toLocaleString()}/{monster.needed.toLocaleString()} XP</Text>
            </View>
            <ProgressBar value={xp} max={monster.needed} fillColor={PURPLE} style={{ marginBottom: 4 }} />
          </View>
        </View>

        {/* ── Collectibles ── */}
        <View style={s.section}>
          <View style={s.sectionHeader}>
            <Text style={s.sectionTitle}>Collectibles</Text>
            <TouchableOpacity activeOpacity={0.7}>
              <Text style={s.seeAll}>See all &gt;</Text>
            </TouchableOpacity>
          </View>

          {/* Found / Missing pills */}
          <View style={s.foundRow}>
            <View style={[s.foundCard, s.foundCardGreen, CARD_SHADOW]}>
              <Text style={s.foundNum}>{relics.length}</Text>
              <Text style={s.foundLabel}>Found</Text>
            </View>
            <View style={[s.foundCard, s.foundCardWhite, CARD_SHADOW]}>
              <Text style={s.foundNum}>{missingCount}</Text>
              <Text style={s.foundLabel}>Missing</Text>
            </View>
          </View>

          {/* 3-col relic grid */}
          {relics.length > 0 && (
            <View style={s.threeColGrid}>
              {relics.map(e => {
                const def = COLLECTIBLES.find(c => c.key === e.itemKey);
                const col = RARITY_COLORS[e.rarity] ?? BORDER;
                const rBg = e.rarity === 'Legendary' ? '#D8F52F' : RARITY_BG[e.rarity] ?? '#FFF';
                const pillBg = e.rarity === 'Legendary' ? '#D8F52F' : 'transparent';
                return (
                  <TouchableOpacity
                    key={e.id}
                    style={[s.relicCard, { width: COL3_W }]}
                    onPress={() => setDetailIndex(relics.indexOf(e))}
                    activeOpacity={0.85}
                  >
                    <View style={s.relicImgWrap}>
                      {def
                        ? <Image source={def.image} style={s.relicImg} resizeMode="contain" />
                        : <View style={s.relicImgPlaceholder} />}
                    </View>
                    <View style={s.relicBody}>
                      <Text style={s.relicName} numberOfLines={2}>{def?.name ?? e.itemName}</Text>
                      <View style={[s.rarityPill, { borderColor: col, backgroundColor: pillBg }]}>
                        <Text style={[s.rarityPillText, { color: e.rarity === 'Legendary' ? BORDER : col }]}>
                          {e.rarity}
                        </Text>
                      </View>
                    </View>
                  </TouchableOpacity>
                );
              })}
              {/* Mystery placeholders for visual balance */}
              {relics.length === 0 && [0, 1, 2].map(i => (
                <View key={i} style={[s.relicCard, s.mysteryCard, { width: COL3_W }]}>
                  <Text style={s.mysteryText}>?</Text>
                </View>
              ))}
            </View>
          )}
        </View>

        {/* ── Boss Captures ── */}
        <View style={s.section}>
          <View style={s.sectionHeader}>
            <Text style={s.sectionTitle}>Boss Captures</Text>
            <TouchableOpacity activeOpacity={0.7}>
              <Text style={s.seeAll}>See all &gt;</Text>
            </TouchableOpacity>
          </View>

          {captures.length > 0 ? (
            <View style={s.twoColGrid}>
              {captures.map(c => {
                const disp = getBossDisplay(c.bossName);
                const date = new Date(c.capturedAt).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
                return (
                  <TouchableOpacity
                    key={c.id}
                    style={[s.bossCard, { width: CARD_W }]}
                    onPress={() => setDetail(c)}
                    activeOpacity={0.85}
                  >
                    <View style={s.bossJarWrap}>
                      {disp?.jar
                        ? <Image source={disp.jar} style={s.bossJarImg} resizeMode="contain" />
                        : <Text style={s.bossJarEmoji}>🫙</Text>}
                    </View>
                    <View style={s.bossCardFooter}>
                      <Text style={s.bossCardName} numberOfLines={1}>{c.bossName}</Text>
                      <Text style={s.bossCardDate}>Caught {date}</Text>
                    </View>
                  </TouchableOpacity>
                );
              })}
            </View>
          ) : (
            <View style={[s.emptySection, CARD_SHADOW]}>
              <Text style={s.emptySectionText}>Win battles to capture bosses</Text>
            </View>
          )}
        </View>

        {/* ── Milestones ── */}
        {earnedMs.length > 0 && (
          <View style={s.section}>
            <View style={s.sectionHeader}>
              <Text style={s.sectionTitle}>Milestones</Text>
              <Text style={s.seeAll}>{earnedMs.length} earned</Text>
            </View>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
              {earnedMs.map(em => {
                const def = MILESTONES.find(m => m.id === em.id);
                if (!def) return null;
                return (
                  <TouchableOpacity
                    key={em.id}
                    style={[s.milestoneCard, CARD_SHADOW]}
                    onPress={() => setDetailMs(def)}
                    activeOpacity={0.85}
                  >
                    <Text style={s.milestoneIcon}>{def.icon}</Text>
                    <Text style={s.milestoneName} numberOfLines={2}>{def.name}</Text>
                    <Text style={s.milestoneDate}>
                      {new Date(em.earnedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </View>
        )}

        {/* ── Most Recent ── */}
        {mostRecent && (
          <View style={s.section}>
            <Text style={s.sectionTitle}>Most Recent</Text>
            <TouchableOpacity
              style={[s.recentCard, CARD_SHADOW]}
              onPress={() => setDetailIndex(relics.findIndex(r => r.itemKey === mostRecent.itemKey))}
              activeOpacity={0.85}
            >
              {(() => {
                const def = COLLECTIBLES.find(c => c.key === mostRecent.itemKey);
                const col = RARITY_COLORS[mostRecent.rarity] ?? BORDER;
                return (
                  <View style={s.recentRow}>
                    <View style={[s.recentImgWrap, { backgroundColor: RARITY_BG[mostRecent.rarity] ?? '#F5F5F5' }]}>
                      {def && <Image source={def.image} style={s.recentImg} resizeMode="contain" />}
                    </View>
                    <View style={s.recentInfo}>
                      <Text style={s.recentName}>{def?.name ?? mostRecent.itemName}</Text>
                      <Text style={s.recentWeek}>{mostRecent.weekLabel}</Text>
                    </View>
                    <View style={[s.rarityPill, { borderColor: col }]}>
                      <Text style={[s.rarityPillText, { color: col }]}>{mostRecent.rarity}</Text>
                    </View>
                  </View>
                );
              })()}
            </TouchableOpacity>
          </View>
        )}

        {/* ── Empty state ── */}
        {totalTrophies === 0 && (
          <View style={s.emptyWrap}>
            <Text style={s.emptyIcon}>🏆</Text>
            <Text style={s.emptyTitle}>No trophies yet</Text>
            <Text style={s.emptyBody}>Complete your chores, win battles, and earn chests to start your collection.</Text>
          </View>
        )}

      </ScrollView>
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: BG },

  // ── Header ──────────────────────────────────────────────────────────────────
  header: {
    flexDirection: 'row', alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg, paddingBottom: 0,
  },
  headerBtn: {
    width: 36, height: 36, borderRadius: 10,
    borderWidth: 2, borderColor: BORDER,
    alignItems: 'center', justifyContent: 'center',
  },
  headerBtnText: { fontSize: fontSize.xxl, color: BORDER, fontFamily: interFamily.semibold },
  headerTitleText: { fontFamily: 'FredokaOne_400Regular', fontSize: fontSize.xxl, color: BORDER },

  scroll: { paddingBottom: spacing.xxxl },

  // ── Hero ────────────────────────────────────────────────────────────────────
  hero: {
    flexDirection: 'row', alignItems: 'center',
    gap: spacing.md, paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg, paddingBottom: spacing.lg,
  },
  monsterAvatar: {
    width: 100, height: 100, backgroundColor: '#EDE9FC',
    borderRadius: 20, borderWidth: 3, borderColor: BORDER,
    alignItems: 'center', justifyContent: 'center',
    flexShrink: 0, overflow: 'hidden',
    ...CARD_SHADOW,
  },
  monsterAvatarImg: { width: 88, height: 88 },
  heroInfo: { flex: 1 },
  heroName: {
    fontFamily: 'FredokaOne_400Regular', fontSize: fontSize.h1,
    color: BORDER, marginBottom: 4,
  },
  heroLevelRow: { flexDirection: 'row', alignItems: 'baseline', gap: 8, marginBottom: 6 },
  heroLevel: { fontFamily: interFamily.heavy, fontSize: fontSize.lg, color: PURPLE },
  heroXpText: { fontFamily: interFamily.regular, fontSize: fontSize.sm, color: MUTED },
  xpBarTrack: {
    backgroundColor: '#E8E0FF', borderRadius: 20, height: 12,
    borderWidth: 2, borderColor: BORDER, overflow: 'hidden',
  },
  xpBarFill: { backgroundColor: PURPLE, height: '100%', borderRadius: 20 },

  // ── Section ─────────────────────────────────────────────────────────────────
  section: { paddingHorizontal: spacing.lg, marginBottom: spacing.xl },
  sectionHeader: {
    flexDirection: 'row', alignItems: 'center',
    justifyContent: 'space-between', marginBottom: spacing.md,
  },
  sectionTitle: {
    fontFamily: interFamily.black, fontSize: scale(20), color: BORDER,
  },
  seeAll: {
    fontFamily: interFamily.bold, fontSize: fontSize.base, color: PURPLE,
  },

  // ── Found / Missing ─────────────────────────────────────────────────────────
  foundRow: { flexDirection: 'row', gap: 8, marginBottom: spacing.md },
  foundCard: {
    flex: 1, borderRadius: 18, borderWidth: 3, borderColor: BORDER,
    paddingVertical: spacing.lg, alignItems: 'center', justifyContent: 'center',
  },
  foundCardGreen: { backgroundColor: '#D8F52F' },
  foundCardWhite: { backgroundColor: colors.white },
  foundNum:   { fontFamily: 'FredokaOne_400Regular', fontSize: fontSize.display + 16, color: BORDER },
  foundLabel: { fontFamily: interFamily.heavy, fontSize: fontSize.lg, color: BORDER, marginTop: 2 },

  // ── Grids ───────────────────────────────────────────────────────────────────
  twoColGrid:   { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  threeColGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },

  // ── Relic card ──────────────────────────────────────────────────────────────
  relicCard: {
    borderRadius: 18, borderWidth: 3, borderColor: BORDER,
    overflow: 'hidden', backgroundColor: colors.white, ...CARD_SHADOW,
  },
  relicImgWrap: {
    width: '100%', aspectRatio: 1,
    backgroundColor: colors.white,
    alignItems: 'center', justifyContent: 'center', padding: 8,
  },
  relicImg: { width: '85%', height: '85%' },
  relicImgPlaceholder: { width: '60%', aspectRatio: 1, borderRadius: 8, backgroundColor: '#EEE' },
  relicBody: { padding: 8, gap: 4, backgroundColor: colors.white },
  relicName: {
    fontFamily: interFamily.heavy, fontSize: fontSize.sm,
    color: BORDER, lineHeight: fontSize.md,
  },
  rarityPill: {
    alignSelf: 'flex-start', borderWidth: 2, borderRadius: 20,
    paddingHorizontal: 8, paddingVertical: 2,
  },
  rarityPillText: { fontSize: fontSize.xs, fontFamily: interFamily.heavy },

  // Mystery placeholder
  mysteryCard: {
    backgroundColor: '#F5F5F5', borderStyle: 'dashed',
    borderColor: '#CCC', alignItems: 'center', justifyContent: 'center',
    shadowOpacity: 0, elevation: 0,
  } as any,
  mysteryText: { fontSize: fontSize.xl, color: '#BBB', fontFamily: interFamily.heavy },

  // ── Boss card ───────────────────────────────────────────────────────────────
  bossCard: {
    backgroundColor: colors.white, borderWidth: 3, borderColor: BORDER,
    borderRadius: 18, overflow: 'hidden', ...CARD_SHADOW,
  },
  bossJarWrap: {
    width: '100%', aspectRatio: 1,
    alignItems: 'center', justifyContent: 'center',
    backgroundColor: '#F5F5F5', padding: 8,
  },
  bossJarImg:    { width: '90%', height: '90%' },
  bossJarEmoji:  { fontSize: fontSize.display },
  bossCardFooter: {
    backgroundColor: colors.white, padding: 10,
    borderTopWidth: 2, borderTopColor: BORDER,
  },
  bossCardName:  { fontFamily: interFamily.heavy, fontSize: fontSize.base, color: BORDER },
  bossCardDate:  { fontSize: fontSize.xs, color: MUTED, fontFamily: interFamily.regular, marginTop: 2 },

  // Empty boss section
  emptySection: {
    backgroundColor: colors.white, borderRadius: 18,
    borderWidth: 3, borderColor: BORDER,
    padding: spacing.xl, alignItems: 'center',
  },
  emptySectionText: { fontFamily: interFamily.regular, fontSize: fontSize.base, color: MUTED },

  // ── Milestones ──────────────────────────────────────────────────────────────
  milestoneCard: {
    width: scale(100), backgroundColor: colors.white,
    borderRadius: radii.lg, borderWidth: 2, borderColor: BORDER,
    padding: spacing.sm, alignItems: 'center', gap: 4,
  },
  milestoneIcon: { fontSize: fontSize.xxxl },
  milestoneName: {
    fontFamily: interFamily.heavy, fontSize: fontSize.xs,
    color: BORDER, textAlign: 'center', lineHeight: fontSize.sm,
  },
  milestoneDate: { fontSize: scale(9), color: MUTED, fontFamily: interFamily.bold },

  // ── Most Recent ─────────────────────────────────────────────────────────────
  recentCard: {
    backgroundColor: colors.white, borderWidth: 3,
    borderColor: BORDER, borderRadius: 18, padding: 12,
  },
  recentRow:   { flexDirection: 'row', alignItems: 'center', gap: 12 },
  recentImgWrap: {
    width: 56, height: 56, borderRadius: 12,
    alignItems: 'center', justifyContent: 'center',
  },
  recentImg:   { width: 44, height: 44 },
  recentInfo:  { flex: 1 },
  recentName:  { fontFamily: interFamily.heavy, fontSize: fontSize.base, color: BORDER },
  recentWeek:  { fontSize: fontSize.xs, color: MUTED, fontFamily: interFamily.regular, marginTop: 2 },

  // ── Empty state ─────────────────────────────────────────────────────────────
  emptyWrap: {
    alignItems: 'center', paddingTop: spacing.xxxl * 2,
    paddingHorizontal: spacing.xxxl, gap: spacing.md,
  },
  emptyIcon:  { fontSize: scale(56) },
  emptyTitle: { fontFamily: 'FredokaOne_400Regular', fontSize: fontSize.h2, color: BORDER, textAlign: 'center' },
  emptyBody:  { fontFamily: interFamily.regular, fontSize: fontSize.base, color: colors.muted, textAlign: 'center', lineHeight: scale(20) },
});
