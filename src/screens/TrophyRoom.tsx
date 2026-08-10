import React, { useEffect, useState } from 'react';
import {
  View, Text, StyleSheet, Image, ScrollView,
  TouchableOpacity, Dimensions, Animated, Modal, StatusBar,
} from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { colors, spacing, radii, scale, fontSize, interFamily } from '../design-system/tokens';
import { ScreenState } from '../design-system/components/ScreenState';
import { useScaleAnimation } from '../design-system/hooks';
import { ProgressBar } from '../design-system/components/ProgressBar';
import { getCollectibles, type CollectibleEntry } from '../storage/collectibles';
import { getBossCaptures, type BossCaptureEntry } from '../storage/bossCaptures';
import { COLLECTIBLES } from '../data/collectibles';
import { THREAT_STARS, getBossDisplay, BOSS_LOOKUP } from '../data/bossLookup';
import { BossDetail } from './BossDetail';
import { RelicDetail } from './RelicDetail';
import { MilestoneDetail } from './MilestoneDetail';
import { getEarnedMilestones, type EarnedMilestone } from '../storage/milestones';
import { MILESTONES, KID_MILESTONES, type MilestoneDef } from '../data/milestones';

const { width: W } = Dimensions.get('window');

// ─── Responsive column counts (phone vs iPad) ─────────────────────────────────
const BOSS_COLS  = W >= 768 ? 3 : 2;
const RELIC_COLS = W >= 768 ? 4 : 3;
const GAP = 10;

const EMPTY_JAR = require('../../assets/battleui/trophyitems/bossjars/boss=empty.png');

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

// Trophy cards are intentionally flat (no shadow). The shadowed card variant
// lives app-wide as SOLID_SHADOW (App.tsx) / shadows.solid (design tokens) — use
// that when a card should pop, rather than re-deriving a local shadow here.

const THREAT_RARITY: Record<string, string> = {
  Easy: 'common', Medium: 'uncommon', Hard: 'rare', Extreme: 'legendary',
};
const THREAT_STARS_COUNT: Record<string, number> = {
  Easy: 1, Medium: 2, Hard: 3, Extreme: 4,
};

// ─── Monster data ─────────────────────────────────────────────────────────────

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
  monsterIdx:        MonsterIdx;
  monsterImg:        number;
  monsterName:       string;
  xp:                number;
  currentKidName:    string;
  initialRelicKey?:  string;
  isTab?:            boolean;
  header?:           React.ReactNode;
  currentBossName?:  string;
  familyPowerPct?:   number;
  choresLeft?:       number;
  daysLeft?:         number;
  onViewBoss?:       () => void;
  onBack:            () => void;
}

// ─── Main screen ──────────────────────────────────────────────────────────────

export function TrophyRoom({
  monsterIdx, monsterImg, monsterName, xp, currentKidName,
  initialRelicKey, isTab, header,
  currentBossName, familyPowerPct = 0, choresLeft = 0, daysLeft = 0,
  onViewBoss, onBack,
}: TrophyRoomProps) {
  const { scaleAnim: backScale, pressIn: backPI, pressOut: backPO } = useScaleAnimation({ toScale: 0.85 });
  const [relics, setRelics]                       = useState<CollectibleEntry[]>([]);
  const [rawEntries, setRawEntries]               = useState<CollectibleEntry[]>([]);
  const [captures, setCaptures]                   = useState<BossCaptureEntry[]>([]);
  const [earnedMs, setEarnedMs]                   = useState<EarnedMilestone[]>([]);
  const [detailCaptureIdx, setDetailCaptureIdx]   = useState<number | null>(null);
  const [showAllBosses, setShowAllBosses]         = useState(false);
  const [showAllMilestones, setShowAllMilestones] = useState(false);
  const [detailIndex, setDetailIndex]             = useState<number | null>(null);
  const [detailMilestone, setDetailMs]            = useState<MilestoneDef | null>(null);
  const [loadState, setLoadState]                 = useState<'loading' | 'error' | 'idle'>('loading');
  const [loadError, setLoadError]                 = useState<string | undefined>(undefined);

  const loadData = () => {
    setLoadState('loading');
    setLoadError(undefined);
    Promise.all([getCollectibles(currentKidName), getBossCaptures(currentKidName), getEarnedMilestones(currentKidName)])
      .then(([all, caps, milestones]) => {
        setRawEntries(all);
        const seen = new Set<string>();
        const deduped = all.filter(e => { if (seen.has(e.itemKey)) return false; seen.add(e.itemKey); return true; });
        setRelics(deduped);
        if (initialRelicKey) {
          const idx = deduped.findIndex(e => e.itemKey === initialRelicKey);
          if (idx !== -1) setDetailIndex(idx);
        }
        setCaptures(caps);
        setEarnedMs(milestones);
        setLoadState('idle');
      })
      .catch((err: unknown) => {
        setLoadError(err instanceof Error ? err.message : 'Failed to load trophy data');
        setLoadState('error');
      });
  };

  useEffect(() => { loadData(); }, [currentKidName]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Derived layout values ────────────────────────────────────────────────────
  const CARD_W  = (W - spacing.lg * 2 - GAP * (BOSS_COLS - 1)) / BOSS_COLS;
  const COL3_W  = (W - spacing.lg * 2 - GAP * (RELIC_COLS - 1)) / RELIC_COLS;

  // ── Detail routing ───────────────────────────────────────────────────────────
  // Relic / boss-jar / milestone detail all render in a bottom sheet modal
  // below, not as a full-screen replace — see the <Modal>s at the end of the
  // main return. (Rendering as a modal instead of an early return also means
  // whatever was underneath — main grid or the "see all milestones" list —
  // just stays mounted, so back naturally returns to the right place.)

  // ── See All: Milestones ──────────────────────────────────────────────────────

  if (showAllMilestones) {
    const allKidMs   = KID_MILESTONES;
    const earnedList = allKidMs.filter(m => earnedMs.some(e => e.id === m.id));
    const lockedList = allKidMs.filter(m => !earnedMs.some(e => e.id === m.id));
    const earnedMap  = new Map(earnedMs.map(e => [e.id, e.earnedAt]));

    const renderMsRow = (def: MilestoneDef, earnedAt?: string) => (
      <TouchableOpacity
        key={def.id}
        onPress={() => setDetailMs(def)}
        activeOpacity={0.85}
        style={{
          flexDirection: 'row', alignItems: 'center', gap: 14,
          backgroundColor: earnedAt ? '#FFFFFF' : '#F3F1EC',
          borderRadius: 14, borderWidth: 2,
          borderColor: earnedAt ? '#1A1A1A' : '#D0CEC8',
          padding: 14, marginBottom: 10,
          opacity: earnedAt ? 1 : 0.5,
        }}
      >
        <View style={{
          width: 52, height: 52, borderRadius: 26,
          backgroundColor: earnedAt ? PURPLE : '#ECEAE4',
          alignItems: 'center', justifyContent: 'center',
          borderWidth: 2, borderColor: earnedAt ? '#1A1A1A' : '#D0CEC8',
          flexShrink: 0,
        }}>
          {def.image
            ? <Image source={def.image} style={{ width: 32, height: 32 }} resizeMode="contain" />
            : <Text style={{ fontSize: scale(24) }}>{def.icon}</Text>}
        </View>
        <View style={{ flex: 1 }}>
          <Text style={{ fontFamily: interFamily.heavy, fontSize: scale(15), color: '#1A1A1A', marginBottom: 2 }}>{def.name}</Text>
          <Text style={{ fontFamily: interFamily.regular, fontSize: scale(13), color: '#ABABAB', lineHeight: 17 }}>{def.tagline}</Text>
          {earnedAt && (
            <Text style={{ fontFamily: interFamily.semibold, fontSize: scale(11), color: '#3B6D11', marginTop: 4 }}>
              Earned {new Date(earnedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
            </Text>
          )}
        </View>
        {earnedAt && (
          <View style={{ backgroundColor: '#E8FBB4', borderRadius: 8, borderWidth: 1.5, borderColor: '#3B6D11', paddingHorizontal: 8, paddingVertical: 4 }}>
            <Text style={{ fontFamily: interFamily.bold, fontSize: scale(11), color: '#3B6D11' }}>✓</Text>
          </View>
        )}
      </TouchableOpacity>
    );

    return (
      <View style={s.root}>
        <View style={s.header}>
          <TouchableOpacity style={s.headerBtn} onPress={() => setShowAllMilestones(false)} activeOpacity={0.8}>
            <Text style={s.headerBtnText}>←</Text>
          </TouchableOpacity>
          <Text style={s.headerTitleText}>Your Milestones</Text>
          <View style={s.headerBtn} />
        </View>
        <ScrollView contentContainerStyle={{ paddingHorizontal: spacing.lg, paddingBottom: 120 }} showsVerticalScrollIndicator={false}>
          {/* Summary card */}
          <View style={{ backgroundColor: PURPLE, borderRadius: 16, borderWidth: 2, borderColor: '#1A1A1A', padding: 20, marginBottom: 24, marginTop: spacing.md, alignItems: 'center' }}>
            <Text style={{ fontFamily: interFamily.heavy, fontSize: scale(40), color: '#FFFFFF' }}>{earnedList.length}</Text>
            <Text style={{ fontFamily: interFamily.bold, fontSize: scale(14), color: 'rgba(255,255,255,0.75)', letterSpacing: 0.5 }}>of {allKidMs.length} milestones earned</Text>
          </View>

          {earnedList.length > 0 && (
            <>
              <Text style={{ fontFamily: interFamily.heavy, fontSize: scale(12), color: '#1A1A1A', letterSpacing: 1, textTransform: 'uppercase', marginBottom: 12 }}>EARNED</Text>
              {earnedList.map(m => renderMsRow(m, earnedMap.get(m.id)))}
              <View style={{ height: 20 }} />
            </>
          )}

          {lockedList.length > 0 && (
            <>
              <Text style={{ fontFamily: interFamily.heavy, fontSize: scale(12), color: '#1A1A1A', letterSpacing: 1, textTransform: 'uppercase', marginBottom: 12 }}>LOCKED</Text>
              {lockedList.map(m => renderMsRow(m))}
            </>
          )}
        </ScrollView>
      </View>
    );
  }

  // ── See All: Boss Captures ───────────────────────────────────────────────────

  if (showAllBosses) {
    const currentBossDisplay = currentBossName ? getBossDisplay(currentBossName) : null;
    const capturedBosses = BOSS_LOOKUP.filter(b => captures.some(c => c.bossName === b.name));
    const lockedBosses   = BOSS_LOOKUP.filter(b => !captures.some(c => c.bossName === b.name));
    const n = captures.length;
    const allCaptured = n === BOSS_LOOKUP.length;

    // State-based locked slot count
    const VISIBLE_LOCKED = n === 0 ? 0 : n <= 3 ? 3 : n <= 8 ? 2 : n <= 13 ? 1 : 0;
    const extraCount = Math.max(0, lockedBosses.length - VISIBLE_LOCKED);
    const streak = n;
    const showActiveBoss = !allCaptured && currentBossDisplay;

    const COL3 = (W - spacing.lg * 2 - GAP * (BOSS_COLS - 1)) / BOSS_COLS;

    return (
      <View style={s.root}>
        {/* Header */}
        <View style={s.header}>
          <TouchableOpacity style={s.headerBtn} onPress={() => setShowAllBosses(false)} activeOpacity={0.8}>
            <Text style={s.headerBtnText}>←</Text>
          </TouchableOpacity>
          <Text style={s.headerTitleText}>Boss Captures</Text>
          <View style={[s.headerBtn, { backgroundColor: PURPLE, borderColor: PURPLE, alignItems: 'center', justifyContent: 'center' }]}>
            <Text style={{ fontFamily: interFamily.heavy, fontSize: fontSize.sm, color: '#FFF' }}>{n}/{BOSS_LOOKUP.length}</Text>
          </View>
        </View>

        <ScrollView contentContainerStyle={{ paddingBottom: 120 }} showsVerticalScrollIndicator={false}>

          {/* State 4 — all captured */}
          {allCaptured && (
            <View style={[s.streakBanner, { backgroundColor: '#E8FBB4', borderColor: '#3B6D11', margin: spacing.lg }]}>
              <Text style={{ fontSize: scale(26) }}>🏆</Text>
              <View style={{ flex: 1 }}>
                <Text style={{ fontFamily: interFamily.black, fontSize: fontSize.base, color: '#1A3A0A' }}>Complete collection!</Text>
                <Text style={{ fontFamily: interFamily.regular, fontSize: fontSize.sm, color: '#3B6D11' }}>You've captured every boss. Legendary.</Text>
              </View>
            </View>
          )}

          {/* Active boss card */}
          {showActiveBoss && (
            <View style={s.activeBossCard}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 10 }}>
                <Text style={{ fontSize: scale(12), color: '#C5F215', fontFamily: interFamily.heavy, letterSpacing: 1 }}>⚔  THIS WEEK'S BOSS</Text>
              </View>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                <View style={{ width: 64, height: 64, borderRadius: 14, backgroundColor: PURPLE, alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: '#C5F215', overflow: 'hidden' }}>
                  {currentBossDisplay.image
                    ? <Image source={currentBossDisplay.image} style={{ width: 56, height: 56 }} resizeMode="contain" />
                    : <Text style={{ fontSize: scale(28) }}>👾</Text>}
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={{ fontFamily: interFamily.black, fontSize: fontSize.xl, color: '#FFF', marginBottom: 2 }}>{currentBossDisplay.name}</Text>
                  <Text style={{ fontFamily: interFamily.regular, fontSize: fontSize.sm, color: 'rgba(255,255,255,0.6)', marginBottom: 6 }}>
                    {daysLeft > 0 ? 'Battle ends Sunday' : 'Boss reveal today!'}
                  </Text>
                  <View style={{ height: 6, borderRadius: 3, backgroundColor: 'rgba(255,255,255,0.15)', overflow: 'hidden' }}>
                    <View style={{ width: `${familyPowerPct}%` as any, height: '100%', backgroundColor: '#C5F215', borderRadius: 3 }} />
                  </View>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 4 }}>
                    <Text style={{ fontFamily: interFamily.regular, fontSize: scale(10), color: 'rgba(255,255,255,0.5)' }}>Family power: {familyPowerPct}%</Text>
                    <Text style={{ fontFamily: interFamily.regular, fontSize: scale(10), color: 'rgba(255,255,255,0.5)' }}>{choresLeft} chores left</Text>
                  </View>
                </View>
                {daysLeft <= 1 && (
                  <View style={{ backgroundColor: '#C5F215', borderRadius: 20, paddingHorizontal: 10, paddingVertical: 6, alignItems: 'center' }}>
                    <Text style={{ fontFamily: interFamily.black, fontSize: scale(10), color: BORDER, textAlign: 'center', lineHeight: 13 }}>{'Sunday\nreveal!'}</Text>
                  </View>
                )}
              </View>
              <TouchableOpacity
                onPress={onViewBoss}
                activeOpacity={0.7}
                style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-end', marginTop: 10, gap: 4 }}
              >
                <Text style={{ fontFamily: interFamily.bold, fontSize: fontSize.sm, color: '#C5F215' }}>View boss →</Text>
              </TouchableOpacity>
            </View>
          )}

          {/* State 0 — no captures */}
          {n === 0 && (
            <View style={{ alignItems: 'center', paddingHorizontal: spacing.lg, paddingTop: 20 }}>
              <Text style={{ fontFamily: interFamily.regular, fontSize: fontSize.base, color: MUTED, textAlign: 'center' }}>
                Defeat your first boss Sunday to start your collection.
              </Text>
            </View>
          )}

          {/* Streak banner — States 1–3 */}
          {n > 0 && !allCaptured && (
            <View style={s.streakBanner}>
              <Text style={{ fontSize: scale(22) }}>🔥</Text>
              <View style={{ flex: 1 }}>
                <Text style={{ fontFamily: interFamily.black, fontSize: fontSize.base, color: BORDER }}>
                  {streak === 1 ? 'First capture!' : `${streak} boss${streak !== 1 ? 'es' : ''} captured!`}
                </Text>
                <Text style={{ fontFamily: interFamily.regular, fontSize: fontSize.sm, color: '#6B4A00' }}>
                  Keep completing chores to grow your collection
                </Text>
              </View>
            </View>
          )}

          {/* Captured section — States 1–4 */}
          {n > 0 && (
            <View style={{ paddingHorizontal: spacing.lg, marginTop: 20 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 12 }}>
                <Text style={{ fontFamily: interFamily.heavy, fontSize: fontSize.sm, color: MUTED, letterSpacing: 1, textTransform: 'uppercase' }}>
                  Captured ({n})
                </Text>
                <View style={{ flex: 1, height: 1, backgroundColor: '#E0DDD8' }} />
              </View>

              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: GAP }}>
                {/* Captured jars */}
                {capturedBosses.map(boss => {
                  const capture = captures.find(c => c.bossName === boss.name)!;
                  const date = new Date(capture.capturedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
                  return (
                    <TouchableOpacity key={boss.name} style={[s.bossCard, { width: COL3 }]} onPress={() => setDetailCaptureIdx(captures.indexOf(capture))} activeOpacity={0.85}>
                      <View style={[s.bossJarWrap, { position: 'relative' }]}>
                        <Image source={boss.jar} style={s.bossJarImg} resizeMode="contain" />
                        <View style={{ position: 'absolute', top: 6, right: 6, width: 10, height: 10, borderRadius: 5, backgroundColor: PURPLE, borderWidth: 2, borderColor: BORDER }} />
                      </View>
                      <View style={s.bossCardFooter}>
                        <Text style={s.bossCardName} numberOfLines={1}>{boss.name}</Text>
                        <Text style={s.bossCardDate}>{date}</Text>
                      </View>
                    </TouchableOpacity>
                  );
                })}

                {/* Locked slots */}
                {lockedBosses.slice(0, VISIBLE_LOCKED).map(boss => (
                  <View key={boss.name} style={[s.bossCard, s.bossCardLocked, { width: COL3 }]}>
                    <View style={s.bossJarWrap}>
                      <Image source={EMPTY_JAR} style={s.bossJarImg} resizeMode="contain" />
                    </View>
                    <View style={[s.bossCardFooter, { borderTopColor: '#CCC' }]}>
                      <Text style={[s.bossCardName, { color: '#BBB' }]} numberOfLines={1}>???</Text>
                      <Text style={[s.bossCardDate, { color: '#CCC' }]}>Locked</Text>
                    </View>
                  </View>
                ))}
              </View>

              {extraCount > 0 && (
                <Text style={{ fontFamily: interFamily.regular, fontSize: fontSize.sm, color: MUTED, textAlign: 'center', marginTop: 16 }}>
                  {extraCount} more boss{extraCount !== 1 ? 'es' : ''} to discover...
                </Text>
              )}
            </View>
          )}
        </ScrollView>
      </View>
    );
  }

  // ── Main Trophy Room ─────────────────────────────────────────────────────────

  const monster       = MONSTERS[monsterIdx] ?? MONSTERS[MONSTERS.length - 1];
  const totalTrophies = relics.length + captures.length + earnedMs.length;
  const missingCount  = COLLECTIBLES.length - relics.length;

  return (
    <View style={s.root}>

      {/* Header — tab header or back button */}
      {isTab && header}
      {!isTab && (
        <View style={s.header}>
          <TouchableOpacity style={s.headerBtn} onPress={onBack} onPressIn={backPI} onPressOut={backPO} activeOpacity={1}>
            <Animated.View style={{ transform: [{ scale: backScale }] }}>
              <Text style={s.headerBtnText}>←</Text>
            </Animated.View>
          </TouchableOpacity>
          <Text style={s.headerTitleText}>🏆 Trophy Room</Text>
          <View style={s.headerBtn} />
        </View>
      )}

      {/* Loading / Error */}
      {loadState !== 'idle' && (
        <ScreenState
          state={loadState === 'error' ? 'error' : 'loading'}
          skeletonVariant="card-list"
          skeletonCount={3}
          errorMessage={loadError}
          onRetry={loadData}
          style={{ flex: 1 }}
        />
      )}

      {loadState === 'idle' && (
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

            <View style={s.foundRow}>
              <View style={[s.foundCard, s.foundCardGreen]}>
                <Text style={s.foundNum}>{relics.length}</Text>
                <Text style={s.foundLabel}>Found</Text>
              </View>
              <View style={[s.foundCard, s.foundCardWhite]}>
                <Text style={s.foundNum}>{missingCount}</Text>
                <Text style={s.foundLabel}>Missing</Text>
              </View>
            </View>

            {/* 3-col grid — found + locked silhouettes */}
            <View style={s.threeColGrid}>
              {relics.slice(0, 6).map(e => {
                const def = COLLECTIBLES.find(c => c.key === e.itemKey);
                const col = RARITY_COLORS[e.rarity] ?? BORDER;
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
                        <Text style={[s.rarityPillText, { color: e.rarity === 'Legendary' ? BORDER : col }]}>{e.rarity}</Text>
                      </View>
                    </View>
                  </TouchableOpacity>
                );
              })}
              {/* Locked silhouette slots */}
              {Array.from({ length: Math.max(0, Math.min(6, 6 - relics.length)) }).map((_, i) => {
                const lockedDef = COLLECTIBLES[relics.length + i];
                const rarity = lockedDef?.rarity ?? 'Common';
                const col = RARITY_COLORS[rarity] ?? '#CCC';
                return (
                  <View key={`locked-${i}`} style={[s.relicCard, s.mysteryCard, { width: COL3_W }]}>
                    <View style={[s.relicImgWrap, { opacity: 0.25, backgroundColor: 'transparent' }]}>
                      {lockedDef
                        ? <Image source={lockedDef.image} style={[s.relicImg, { tintColor: '#888' }]} resizeMode="contain" />
                        : <View style={s.relicImgPlaceholder} />}
                    </View>
                    <View style={[s.relicBody, { backgroundColor: 'transparent' }]}>
                      <Text style={[s.relicName, { color: '#AAA' }]} numberOfLines={2}>???</Text>
                      <View style={[s.rarityPill, { borderColor: col }]}>
                        <Text style={[s.rarityPillText, { color: col }]}>{rarity}</Text>
                      </View>
                    </View>
                  </View>
                );
              })}
            </View>
          </View>

          {/* ── Boss Captures (horizontal carousel, max 5) ── */}
          <View style={s.section}>
            <View style={s.sectionHeader}>
              <Text style={s.sectionTitle}>Boss Captures</Text>
              <TouchableOpacity onPress={() => setShowAllBosses(true)} activeOpacity={0.7}>
                <Text style={s.seeAll}>See all &gt;</Text>
              </TouchableOpacity>
            </View>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 10 }}>
              {[
                ...BOSS_LOOKUP.filter(b => captures.some(c => c.bossName === b.name)),
                ...BOSS_LOOKUP.filter(b => !captures.some(c => c.bossName === b.name)),
              ].slice(0, 5).map(boss => {
                const capture = captures.find(c => c.bossName === boss.name);
                const BOSS_CARD_W = W * 0.36;
                if (capture) {
                  const date = new Date(capture.capturedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
                  return (
                    <TouchableOpacity key={boss.name} style={[s.bossCard, { width: BOSS_CARD_W }]} onPress={() => setDetailCaptureIdx(captures.indexOf(capture))} activeOpacity={0.85}>
                      <View style={s.bossJarWrap}>
                        <Image source={boss.jar} style={s.bossJarImg} resizeMode="contain" />
                      </View>
                      <View style={s.bossCardFooter}>
                        <Text style={s.bossCardName} numberOfLines={1}>{boss.name}</Text>
                        <Text style={s.bossCardDate}>{date}</Text>
                      </View>
                    </TouchableOpacity>
                  );
                }
                return (
                  <View key={boss.name} style={[s.bossCard, s.bossCardLocked, { width: BOSS_CARD_W }]}>
                    <View style={s.bossJarWrap}>
                      <Image source={EMPTY_JAR} style={s.bossJarImg} resizeMode="contain" />
                    </View>
                    <View style={[s.bossCardFooter, { borderTopColor: '#CCC' }]}>
                      <Text style={[s.bossCardName, { color: '#BBB' }]} numberOfLines={1}>???</Text>
                      <Text style={[s.bossCardDate, { color: '#CCC' }]}>Locked</Text>
                    </View>
                  </View>
                );
              })}
            </ScrollView>
          </View>

          {/* ── Milestones (horizontal carousel, max 10) ── */}
          <View style={s.section}>
            <View style={s.sectionHeader}>
              <Text style={s.sectionTitle}>Milestones</Text>
              <TouchableOpacity onPress={() => setShowAllMilestones(true)} activeOpacity={0.7}>
                <Text style={s.seeAll}>See all &gt;</Text>
              </TouchableOpacity>
            </View>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
              {[
                ...KID_MILESTONES.filter(m => earnedMs.some(e => e.id === m.id))
                  .sort((a, b) => {
                    const aAt = earnedMs.find(e => e.id === a.id)?.earnedAt ?? '';
                    const bAt = earnedMs.find(e => e.id === b.id)?.earnedAt ?? '';
                    return bAt.localeCompare(aAt);
                  }),
                ...KID_MILESTONES.filter(m => !earnedMs.some(e => e.id === m.id)),
              ].slice(0, 10).map(def => {
                const earned = earnedMs.find(e => e.id === def.id);
                return (
                  <TouchableOpacity
                    key={def.id}
                    style={[s.milestoneCard, !earned && s.milestoneCardLocked]}
                    onPress={() => setDetailMs(def)}
                    activeOpacity={0.85}
                  >
                    {def.image
                      ? <Image source={def.image} style={[s.milestoneImg, !earned && { opacity: 0.3 }]} resizeMode="contain" />
                      : <Text style={[s.milestoneIcon, !earned && { opacity: 0.3 }]}>{def.icon}</Text>}
                    <Text style={[s.milestoneName, !earned && { color: MUTED }]} numberOfLines={2}>{def.name}</Text>
                    {earned ? (
                      <Text style={s.milestoneDate}>
                        {new Date(earned.earnedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                      </Text>
                    ) : (
                      <Text style={[s.milestoneDate, { color: '#CCC' }]}>Locked</Text>
                    )}
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </View>

          {/* ── Empty state ── */}
          {totalTrophies === 0 && (
            <View style={s.emptyWrap}>
              <Image
                source={require('../../assets/icons/icon-trophy.png')}
                style={s.emptyIcon}
                resizeMode="contain"
              />
              <Text style={s.emptyTitle}>No trophies yet</Text>
              <Text style={s.emptyBody}>Complete your chores, win battles, and earn chests to start your collection.</Text>
            </View>
          )}

        </ScrollView>
      )}

      {/* Relic detail — slides up as a bottom sheet, mirrors the Add/Edit
          chore modal pattern elsewhere in the app. */}
      <Modal
        visible={detailIndex !== null}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setDetailIndex(null)}
      >
        <SafeAreaProvider>
          <StatusBar barStyle="dark-content" />
          {detailIndex !== null && (
            <RelicDetail
              entries={relics}
              initialIndex={detailIndex}
              rawEntries={rawEntries}
              captures={captures}
              onBack={() => setDetailIndex(null)}
              onOpenBoss={(c) => { setDetailIndex(null); setDetailCaptureIdx(captures.indexOf(c)); }}
            />
          )}
        </SafeAreaProvider>
      </Modal>

      {/* Boss jar detail — same bottom sheet treatment as relic detail. */}
      <Modal
        visible={detailCaptureIdx !== null}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setDetailCaptureIdx(null)}
      >
        <SafeAreaProvider>
          <StatusBar barStyle="dark-content" />
          {detailCaptureIdx !== null && (
            <BossDetail
              captures={captures}
              initialIndex={detailCaptureIdx}
              relics={relics}
              onBack={() => setDetailCaptureIdx(null)}
            />
          )}
        </SafeAreaProvider>
      </Modal>

      {/* Milestone detail — same bottom sheet treatment as relic detail. */}
      <Modal
        visible={detailMilestone !== null}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setDetailMs(null)}
      >
        <SafeAreaProvider>
          <StatusBar barStyle="dark-content" />
          {detailMilestone && (
            <MilestoneDetail
              milestone={detailMilestone}
              earned={earnedMs.find(e => e.id === detailMilestone.id)}
              allEarned={earnedMs}
              onBack={() => setDetailMs(null)}
            />
          )}
        </SafeAreaProvider>
      </Modal>
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: BG },

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

  scroll: { paddingBottom: 120 },

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
  },
  monsterAvatarImg: { width: 88, height: 88 },
  heroInfo: { flex: 1 },
  heroName: { fontFamily: 'FredokaOne_400Regular', fontSize: fontSize.h1, color: BORDER, marginBottom: 4 },
  heroLevelRow: { flexDirection: 'row', alignItems: 'baseline', gap: 8, marginBottom: 6 },
  heroLevel: { fontFamily: interFamily.heavy, fontSize: fontSize.lg, color: PURPLE },
  heroXpText: { fontFamily: interFamily.regular, fontSize: fontSize.sm, color: MUTED },

  section: { paddingHorizontal: spacing.lg, marginBottom: spacing.xl },
  sectionHeader: {
    flexDirection: 'row', alignItems: 'center',
    justifyContent: 'space-between', marginBottom: spacing.md,
  },
  sectionTitle: { fontFamily: interFamily.heavy, fontSize: scale(22), color: BORDER },
  seeAll: { fontFamily: interFamily.bold, fontSize: fontSize.base, color: PURPLE },

  foundRow: { flexDirection: 'row', gap: 8, marginBottom: spacing.md },
  foundCard: {
    flex: 1, borderRadius: 18, borderWidth: 3, borderColor: BORDER,
    paddingVertical: spacing.lg, alignItems: 'center', justifyContent: 'center',
  },
  foundCardGreen: { backgroundColor: '#D8F52F' },
  foundCardWhite: { backgroundColor: colors.white },
  foundNum:   { fontFamily: 'FredokaOne_400Regular', fontSize: fontSize.display + 16, color: BORDER },
  foundLabel: { fontFamily: interFamily.heavy, fontSize: fontSize.lg, color: BORDER, marginTop: 2 },

  twoColGrid:   { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  threeColGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },

  relicCard: {
    borderRadius: 18, borderWidth: 3, borderColor: BORDER,
    overflow: 'hidden', backgroundColor: colors.white,
  },
  relicImgWrap: {
    width: '100%', aspectRatio: 1, backgroundColor: colors.white,
    alignItems: 'center', justifyContent: 'center', padding: 8,
  },
  relicImg: { width: '85%', height: '85%' },
  relicImgPlaceholder: { width: '60%', aspectRatio: 1, borderRadius: 8, backgroundColor: '#EEE' },
  relicBody: { padding: 8, gap: 4, backgroundColor: colors.white },
  relicName: { fontFamily: interFamily.heavy, fontSize: fontSize.sm, color: BORDER, lineHeight: fontSize.md },
  rarityPill: { alignSelf: 'flex-start', borderWidth: 2, borderRadius: 20, paddingHorizontal: 8, paddingVertical: 2 },
  rarityPillText: { fontSize: fontSize.xs, fontFamily: interFamily.heavy },

  mysteryCard: {
    backgroundColor: '#F5F5F5', borderStyle: 'solid',
    borderColor: '#CCC', alignItems: 'center', justifyContent: 'center',
    shadowOpacity: 0, elevation: 0,
  } as any,

  bossCard: {
    backgroundColor: colors.white, borderWidth: 3, borderColor: BORDER,
    borderRadius: 18, overflow: 'hidden',
  },
  bossCardLocked: { opacity: 0.6, borderStyle: 'solid', borderColor: '#CCC' } as any,
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
  bossCardName: { fontFamily: interFamily.heavy, fontSize: fontSize.base, color: BORDER },
  bossCardDate: { fontSize: fontSize.xs, color: MUTED, fontFamily: interFamily.regular, marginTop: 2 },

  milestoneCard: {
    width: scale(100), backgroundColor: colors.white,
    borderRadius: radii.lg, borderWidth: 2, borderColor: BORDER,
    padding: spacing.sm, alignItems: 'center', gap: 4,
  },
  milestoneCardLocked: {
    width: scale(100), backgroundColor: '#F5F5F5',
    borderRadius: radii.lg, borderWidth: 2, borderColor: '#DDD',
    borderStyle: 'solid', padding: spacing.sm, alignItems: 'center', gap: 4,
  } as any,
  milestoneIcon: { fontSize: fontSize.xxxl },
  milestoneImg:  { width: scale(48), height: scale(48) },
  milestoneName: { fontFamily: interFamily.heavy, fontSize: fontSize.xs, color: BORDER, textAlign: 'center', lineHeight: fontSize.sm },
  milestoneDate: { fontSize: scale(9), color: MUTED, fontFamily: interFamily.bold },

  // ── Milestone list row (See All page) ────────────────────────────────────────
  milestoneRow: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    backgroundColor: colors.white, borderRadius: 14,
    borderWidth: 2, borderColor: BORDER, padding: 12,
  },
  milestoneRowLocked: { backgroundColor: '#F5F5F5', borderColor: '#DDD', shadowOpacity: 0, elevation: 0 },
  milestoneRowIcon: {
    width: 48, height: 48, borderRadius: 24,
    alignItems: 'center', justifyContent: 'center', flexShrink: 0,
    borderWidth: 2, borderColor: BORDER,
  },
  milestoneRowName:    { fontFamily: interFamily.heavy, fontSize: fontSize.base, color: BORDER, marginBottom: 2 },
  milestoneRowTagline: { fontFamily: interFamily.regular, fontSize: fontSize.xs, color: MUTED },
  milestoneRowDate:    { fontFamily: interFamily.bold, fontSize: fontSize.xs, color: MUTED },

  // ── Active boss card (See All bosses page) ────────────────────────────────────
  activeBossCard: {
    margin: spacing.lg,
    backgroundColor: '#1A1A2E',
    borderRadius: 18, borderWidth: 2, borderColor: PURPLE,
    padding: 16,
  },
  streakBanner: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    marginHorizontal: spacing.lg,
    backgroundColor: '#FFF3C4',
    borderRadius: 14, borderWidth: 2, borderColor: '#E6A817',
    padding: 14,
  },

  emptyWrap: {
    alignItems: 'center', paddingTop: spacing.xxxl * 2,
    paddingHorizontal: spacing.xxxl, gap: spacing.md,
  },
  emptyIcon:  { width: scale(64), height: scale(64) },
  emptyTitle: { fontFamily: 'FredokaOne_400Regular', fontSize: fontSize.h2, color: BORDER, textAlign: 'center' },
  emptyBody:  { fontFamily: interFamily.regular, fontSize: fontSize.base, color: colors.muted, textAlign: 'center', lineHeight: scale(20) },
});
