import React, { useEffect, useRef, useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, Image, Dimensions,
  Animated, Easing, StatusBar, Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ScreenHeading } from '../design-system/components/ScreenHeading';
import { Button } from '../design-system/components/Button';
import { textStyles, scale } from '../design-system/tokens';
import { saveCollectible, type CollectibleEntry } from '../storage/collectibles';
import { saveCollectibleToDb } from '../lib/db';

const { width: W, height: H } = Dimensions.get('window');

// ─── Types ────────────────────────────────────────────────────────────────────

export type ChestTier = 'Common' | 'Rare' | 'Epic' | 'Legendary';

type Phase = 'preOpen' | 'cracking' | 'burst' | 'suspense' | 'collectible';

export interface CollectibleItem {
  key: string;
  name: string;
  rarity: ChestTier;
  image: ReturnType<typeof require>;
}

export interface ChestRevealProps {
  tier: ChestTier;
  completionPct: number;       // for the "X% of your chores" copy
  collectible: CollectibleItem;
  weekLabel: string;
  onDone: () => void;
  kidName: string;             // owning kid profile (local per-kid storage)
  kidDbId?: string | null;     // Supabase kid ID for DB persistence
  /** Fallback when kidDbId isn't resolved yet: hand the DB write up to be
   *  queued + retried once the kid row id is available (Gap 6). */
  onQueueDbWrite?: (kidName: string, collectibleId: string, rarity: string) => void;
}

// ─── Chest frame sequences ────────────────────────────────────────────────────
//
// 6 frames total:
//   chest-1 = closed / pre-open
//   chest-2..5 = crack stages
//   chest-6 = burst
//
// Each tier uses the pre-open frame, then a slice of the crack frames,
// then the burst on the final tap.

const CHEST_FRAMES = [
  require('../../assets/battleui/chest-1.png'),
  require('../../assets/battleui/chest-2.png'),
  require('../../assets/battleui/chest-3.png'),
  require('../../assets/battleui/chest-4.png'),
  require('../../assets/battleui/chest-5.png'),
  require('../../assets/battleui/chest-6.png'),
];

const BURST_FRAME = CHEST_FRAMES[5]; // chest-6

// Crack frames per tap count per tier.
// crackFrames[i] is the frame shown after tap i+1 (before the final burst tap).
const CRACK_FRAMES: Record<ChestTier, (typeof CHEST_FRAMES[number])[]> = {
  Common:    [CHEST_FRAMES[1]],
  Rare:      [CHEST_FRAMES[1], CHEST_FRAMES[2]],
  Epic:      [CHEST_FRAMES[1], CHEST_FRAMES[2], CHEST_FRAMES[3]],
  Legendary: [CHEST_FRAMES[1], CHEST_FRAMES[2], CHEST_FRAMES[3], CHEST_FRAMES[4]],
};

const TAPS_TO_OPEN: Record<ChestTier, number> = {
  Common: 2, Rare: 3, Epic: 4, Legendary: 5,
};

// ─── Tier visual identity ─────────────────────────────────────────────────────

const TIER_COLORS: Record<ChestTier, string> = {
  Common:    '#666666',
  Rare:      '#1A6BB5',
  Epic:      '#6B35F0',
  Legendary: '#B8600A',
};

// ─── Tier meter ──────────────────────────────────────────────────────────────

const TIERS: ChestTier[] = ['Common', 'Rare', 'Epic', 'Legendary'];

const METER_COLORS: Record<ChestTier, string> = {
  Common:    '#9CA3AF',
  Rare:      '#10B981',
  Epic:      '#F59E0B',
  Legendary: '#6B35F0',
};

function TierMeter({ activeTier }: { activeTier: ChestTier }) {
  const activeIdx = TIERS.indexOf(activeTier);
  // Indicator sits centered on the active segment: 12.5%, 37.5%, 62.5%, 87.5%
  const indicatorLeft = `${activeIdx * 25 + 12.5}%`;

  return (
    <View style={{ width: '100%', gap: scale(6) }}>
      {/* Segmented bar */}
      <View style={{ position: 'relative' }}>
        <View style={{ flexDirection: 'row', gap: scale(4), height: scale(18) }}>
          {TIERS.map(t => (
            <View key={t} style={{ flex: 1, backgroundColor: METER_COLORS[t], borderRadius: scale(100), borderWidth: 2, borderColor: '#1A1A1A' }} />
          ))}
        </View>
        {/* Active indicator circle */}
        <View style={{
          position: 'absolute',
          top: -scale(10),
          left: indicatorLeft as any,
          marginLeft: -scale(14),
          width: scale(28), height: scale(28),
          borderRadius: scale(14),
          backgroundColor: METER_COLORS[activeTier],
          borderWidth: 2.5, borderColor: '#1A1A1A',
          alignItems: 'center', justifyContent: 'center',
          shadowColor: '#1A1A1A', shadowOffset: { width: 2, height: 2 }, shadowOpacity: 1, shadowRadius: 0,
        }}>
          <View style={{ width: scale(10), height: scale(10), borderRadius: scale(5), backgroundColor: '#FFFFFF' }} />
        </View>
      </View>
      {/* Labels */}
      <View style={{ flexDirection: 'row' }}>
        {TIERS.map((t, i) => (
          <Text key={t} style={{
            flex: 1,
            textAlign: 'center',
            fontFamily: 'Inter_700Bold',
            fontSize: scale(11),
            color: i === activeIdx ? METER_COLORS[t] : '#ABABAB',
          }}>{t}</Text>
        ))}
      </View>
    </View>
  );
}

// ─── ChestReveal component ────────────────────────────────────────────────────

export function ChestReveal({ tier, completionPct, collectible, weekLabel, onDone, kidName, kidDbId, onQueueDbWrite }: ChestRevealProps) {
  const [phase, setPhase]       = useState<Phase>('preOpen');
  const [tapCount, setTapCount] = useState(0);
  const [saved, setSaved]       = useState(false);

  const totalTaps    = TAPS_TO_OPEN[tier];
  const crackFrames  = CRACK_FRAMES[tier];

  // Current chest frame shown during cracking (0-indexed into crackFrames).
  // tapCount 0 = pre-open (not shown in cracking phase), 1..n-1 = crack stages.
  const currentCrackIdx = tapCount - 1; // first tap lands on crackFrames[0]

  // Animated values
  const chestScale   = useRef(new Animated.Value(1)).current;
  const chestRotate  = useRef(new Animated.Value(0)).current;
  const tapSideRef   = useRef(1); // alternates hit direction: 1 = right tilt, -1 = left tilt
  const burstOpacity = useRef(new Animated.Value(0)).current;
  const burstScale   = useRef(new Animated.Value(0.5)).current;
  const itemY        = useRef(new Animated.Value(60)).current;
  const itemOpacity  = useRef(new Animated.Value(0)).current;
  const itemScale    = useRef(new Animated.Value(0.7)).current;
  const cardOpacity  = useRef(new Animated.Value(0)).current;

  const handleStartCracking = useCallback(() => {
    setPhase('cracking');
  }, []);

  const handleTap = useCallback(() => {
    if (phase !== 'cracking') return;

    const nextTap = tapCount + 1;

    // Hit feedback — scale bounce + rotation tilt, alternating direction each tap
    const side = tapSideRef.current;
    tapSideRef.current *= -1;

    Animated.parallel([
      Animated.sequence([
        Animated.timing(chestScale, { toValue: 1.12, duration: 60, useNativeDriver: true, easing: Easing.out(Easing.quad) }),
        Animated.timing(chestScale, { toValue: 0.95, duration: 60, useNativeDriver: true, easing: Easing.out(Easing.quad) }),
        Animated.timing(chestScale, { toValue: 1,    duration: 80, useNativeDriver: true, easing: Easing.out(Easing.quad) }),
      ]),
      Animated.sequence([
        Animated.timing(chestRotate, { toValue: side * 8,  duration: 70,  useNativeDriver: true, easing: Easing.out(Easing.quad) }),
        Animated.timing(chestRotate, { toValue: side * -4, duration: 60,  useNativeDriver: true, easing: Easing.out(Easing.quad) }),
        Animated.timing(chestRotate, { toValue: 0,         duration: 90,  useNativeDriver: true, easing: Easing.out(Easing.elastic(1)) }),
      ]),
    ]).start();

    if (nextTap >= totalTaps) {
      // Final tap → burst
      setTapCount(nextTap);
      setPhase('burst');

      Animated.parallel([
        Animated.timing(burstOpacity, { toValue: 1, duration: 150, useNativeDriver: true }),
        Animated.spring(burstScale,   { toValue: 1, useNativeDriver: true, tension: 120, friction: 6 }),
        Animated.spring(chestScale,   { toValue: 1.2, useNativeDriver: true, tension: 100, friction: 5 }),
      ]).start(() => {
        // Held suspense pause (600ms) before resolving collectible
        setTimeout(() => {
          setPhase('suspense');
          setTimeout(() => {
            setPhase('collectible');
            Animated.parallel([
              Animated.timing(itemOpacity, { toValue: 1, duration: 400, useNativeDriver: true }),
              Animated.spring(itemY,       { toValue: 0, useNativeDriver: true, tension: 80, friction: 8 }),
              Animated.spring(itemScale,   { toValue: 1, useNativeDriver: true, tension: 90, friction: 7 }),
            ]).start();
            setTimeout(() => {
              Animated.timing(cardOpacity, { toValue: 1, duration: 300, useNativeDriver: true }).start();
            }, 350);
          }, 200); // brief internal delay after suspense phase starts
        }, 620);
      });
    } else {
      setTapCount(nextTap);
    }
  }, [phase, tapCount, totalTaps, chestScale, chestRotate, burstOpacity, burstScale, itemY, itemOpacity, itemScale, cardOpacity]);

  // Persist collectible when card resolves
  useEffect(() => {
    if (phase !== 'collectible' || saved) return;
    setSaved(true);
    const entry: CollectibleEntry = {
      id:        `${Date.now()}-${collectible.key}`,
      itemKey:   collectible.key,
      itemName:  collectible.name,
      rarity:    collectible.rarity,
      earnedAt:  new Date().toISOString(),
      weekLabel,
    };
    saveCollectible(kidName, entry).catch(() => {});

    // Also save to Supabase — if the kid row id isn't ready, hand it up to be
    // queued + retried so the durable copy isn't silently dropped (Gap 6).
    if (kidDbId) {
      saveCollectibleToDb({ kidId: kidDbId, collectibleId: collectible.key, rarity: collectible.rarity }).catch(e => console.warn('[DB] saveCollectibleToDb error:', e));
    } else {
      onQueueDbWrite?.(kidName, collectible.key, collectible.rarity);
    }
  }, [phase, saved, collectible, weekLabel, kidName, kidDbId, onQueueDbWrite]);

  const tierColor = TIER_COLORS[tier];
  const insets = useSafeAreaInsets();
  const topBleed = insets.top + (Platform.OS === 'android' ? (StatusBar.currentHeight ?? 0) : 0);
  const chestRotateDeg = chestRotate.interpolate({ inputRange: [-360, 360], outputRange: ['-360deg', '360deg'] });

  // Which chest frame to show
  const chestSource = (() => {
    if (phase === 'preOpen') return CHEST_FRAMES[0];
    if (phase === 'burst' || phase === 'suspense' || phase === 'collectible') return BURST_FRAME;
    // cracking: advance through crack frames on each tap
    const idx = Math.min(currentCrackIdx, crackFrames.length - 1);
    return idx >= 0 ? crackFrames[idx] : CHEST_FRAMES[0];
  })();

  const showTierLabel = phase === 'preOpen' || phase === 'cracking';
  const tapsLeft = totalTaps - tapCount;

  return (
    <View style={styles.root}>
      <Image
        source={require('../../assets/battleui/successbg.png')}
        style={[styles.bgImg, { top: -topBleed }]}
        resizeMode="cover"
      />

      {/* ── Pre-open screen ── */}
      {phase === 'preOpen' && (
        <View style={styles.preOpen}>

          {/* Top: heading + subline */}
          <View style={styles.preOpenTop}>
            <ScreenHeading style={{ width: '100%' }} numberOfLines={2} textStyle={{ fontSize: scale(56), lineHeight: scale(60), color: '#FFFFFF' }} strokeRadius={5}>
              {'You got a\nbonus!'}
            </ScreenHeading>
            <Text style={styles.subLine}>
              {'YOU GOT A '}
              <Text style={{ color: tierColor }}>{tier.toUpperCase()}</Text>
              {` CHEST FOR DOING ${Math.round(completionPct)}% OF YOUR CHORES`}
            </Text>
          </View>

          {/* Centre: chest — absolutely centred, same position as cracking phase */}
          <Animated.View style={[styles.preOpenChest, { transform: [{ scale: chestScale }] }]}>
            <Image source={CHEST_FRAMES[0]} style={styles.chestImg} resizeMode="contain" />
          </Animated.View>

          {/* Bottom: button + meter */}
          <View style={styles.preOpenBottom}>
          <Button label="Break it open!" onPress={handleStartCracking} style={{ width: '100%' }} />

          {/* Tier meter card */}
          <View style={styles.meterCard}>
            <Text style={styles.meterTitle}>More chores done = better chest</Text>
            <TierMeter activeTier={tier} />
          </View>
          </View>{/* end preOpenBottom */}
        </View>
      )}

      {/* ── Cracking phase ── */}
      {phase === 'cracking' && (
        <TouchableOpacity style={styles.crackArea} onPress={handleTap} activeOpacity={1}>
          <View style={styles.tierLabelWrap}>
            <Text style={styles.tierPill}>{tier.toUpperCase()}</Text>
          </View>

          <Animated.View style={{ transform: [{ scale: chestScale }, { rotate: chestRotateDeg }] }}>
            <Image source={chestSource} style={styles.chestImg} resizeMode="contain" />
          </Animated.View>

          <Text style={styles.tapHint}>
            {tapsLeft <= 1 ? 'One more!' : `Tap to crack  (${tapsLeft} left)`}
          </Text>
        </TouchableOpacity>
      )}

      {/* ── Burst + suspense phase ── */}
      {(phase === 'burst' || phase === 'suspense') && (
        <View style={styles.burstArea}>
          <View style={styles.tierLabelWrap}>
            <Text style={styles.tierPill}>{tier.toUpperCase()}</Text>
          </View>

          <Animated.View style={{ transform: [{ scale: chestScale }], alignItems: 'center' }}>
            <Animated.View style={{ opacity: burstOpacity, transform: [{ scale: burstScale }] }}>
              <Image source={BURST_FRAME} style={styles.chestImg} resizeMode="contain" />
            </Animated.View>
          </Animated.View>
        </View>
      )}

      {/* ── Collectible card ── */}
      {phase === 'collectible' && (
        <View style={styles.collectibleArea}>
          <Animated.View style={[styles.itemWrap, { opacity: itemOpacity, transform: [{ translateY: itemY }, { scale: itemScale }] }]}>
            <Image source={collectible.image} style={styles.itemImg} resizeMode="contain" />
          </Animated.View>

          <Animated.View style={[styles.card, { opacity: cardOpacity }]}>
            <Text style={[styles.cardRarity, { color: tierColor }]}>{collectible.rarity.toUpperCase()}</Text>
            <ScreenHeading style={{ width: '100%' }} textStyle={{ fontSize: scale(32), lineHeight: scale(34), color: '#FFFFFF' }} strokeRadius={3}>
              {collectible.name}
            </ScreenHeading>
            <Text style={styles.cardConfirm}>Added to your collection ✓</Text>
          </Animated.View>

          <Animated.View style={{ opacity: cardOpacity, width: '100%', paddingHorizontal: 32, marginTop: 24 }}>
            <Button label="See my trophy room" onPress={onDone} />
          </Animated.View>
        </View>
      )}
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  root: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  bgImg: {
    ...StyleSheet.absoluteFillObject,
  },

  // Pre-open
  preOpen: {
    flex: 1,
    width: '100%',
  },
  preOpenTop: {
    position: 'absolute',
    top: scale(24),
    left: scale(24),
    right: scale(24),
    alignItems: 'center',
    gap: scale(8),
  },
  preOpenChest: {
    position: 'absolute',
    top: 0, left: 0, right: 0, bottom: 0,
    alignItems: 'center',
    justifyContent: 'center',
  },
  preOpenBottom: {
    position: 'absolute',
    bottom: scale(24),
    left: scale(24),
    right: scale(24),
    gap: scale(10),
  },
  subLine: {
    fontFamily: 'Inter_800ExtraBold',
    fontSize: scale(16),
    color: '#1A1A1A',
    textAlign: 'center',
    lineHeight: scale(22),
    marginBottom: scale(4),
  },
  meterCard: {
    width: '100%',
    backgroundColor: '#FFFFFF',
    borderRadius: scale(16),
    borderWidth: 2,
    borderColor: '#1A1A1A',
    paddingHorizontal: scale(16),
    paddingTop: scale(14),
    paddingBottom: scale(12),
    gap: scale(16),
    marginTop: scale(8),
    shadowColor: '#1A1A1A',
    shadowOffset: { width: 3, height: 3 },
    shadowOpacity: 1,
    shadowRadius: 0,
    elevation: 5,
  },
  meterTitle: {
    fontFamily: 'Inter_800ExtraBold',
    fontSize: scale(14),
    color: '#1A1A1A',
    textAlign: 'center',
  },

  // Chest image (shared)
  chestImg: {
    width: scale(220),
    height: scale(220),
  },

  // Cracking
  crackArea: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
    gap: scale(24),
  },
  tierLabelWrap: {
    position: 'absolute',
    top: scale(60),
    alignItems: 'center',
  },
  tierPill: {
    fontSize: scale(12),
    fontFamily: 'Inter_800ExtraBold',
    letterSpacing: 2,
    borderWidth: 2,
    borderRadius: scale(20),
    paddingHorizontal: scale(14),
    paddingVertical: scale(5),
    backgroundColor: '#1A1A1A',
    color: '#C5F215',
    borderColor: '#1A1A1A',
  },
  tapHint: {
    ...textStyles.secondaryText,
    marginTop: scale(16),
  },

  // Burst
  burstArea: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
  },

  // Collectible
  collectibleArea: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
    paddingHorizontal: scale(32),
    gap: scale(4),
  },
  itemWrap: {
    marginBottom: scale(12),
  },
  itemImg: {
    width: scale(180),
    height: scale(180),
  },
  card: {
    backgroundColor: '#1A1A1A',
    borderRadius: scale(16),
    borderWidth: 2.5,
    borderColor: '#1A1A1A',
    paddingHorizontal: scale(28),
    paddingVertical: scale(20),
    alignItems: 'center',
    gap: scale(6),
    width: '100%',
  },
  cardRarity: {
    ...textStyles.secondaryText,
  },
  cardConfirm: {
    ...textStyles.secondaryText,
    color: '#C5F215',
    marginTop: 4,
  },
});
