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

// ─── Tier ladder ─────────────────────────────────────────────────────────────

const TIERS: ChestTier[] = ['Common', 'Rare', 'Epic', 'Legendary'];

function TierLadder({ activeTier }: { activeTier: ChestTier }) {
  return (
    <View style={ladder.row}>
      {TIERS.map((t, i) => {
        const isActive = t === activeTier;
        const isPast   = TIERS.indexOf(t) < TIERS.indexOf(activeTier);
        return (
          <React.Fragment key={t}>
            {i > 0 && (
              <View style={[ladder.dash, (isPast || isActive) && { backgroundColor: TIER_COLORS[activeTier] }]} />
            )}
            <View style={[ladder.dot, { borderColor: TIER_COLORS[t], backgroundColor: isActive ? TIER_COLORS[t] : 'transparent' }]}>
              {isActive && <View style={ladder.dotInner} />}
            </View>
            <Text style={[ladder.label, { color: isActive ? TIER_COLORS[t] : '#555' }, isActive && ladder.labelActive]}>
              {t}
            </Text>
          </React.Fragment>
        );
      })}
    </View>
  );
}

const ladder = StyleSheet.create({
  row:         { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 4, flexWrap: 'wrap' },
  dash:        { width: 16, height: 2, backgroundColor: 'rgba(0,0,0,0.25)', borderRadius: 1 },
  dot:         { width: 10, height: 10, borderRadius: 5, borderWidth: 2, alignItems: 'center', justifyContent: 'center' },
  dotInner:    { width: 4, height: 4, borderRadius: 2, backgroundColor: '#1A1A1A' },
  label:       { fontSize: scale(11), fontFamily: 'Inter_700Bold', letterSpacing: 0.5, marginLeft: 2, marginRight: 6 },
  labelActive: { fontSize: scale(13) },
});

// ─── ChestReveal component ────────────────────────────────────────────────────

export function ChestReveal({ tier, completionPct, collectible, weekLabel, onDone }: ChestRevealProps) {
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
    saveCollectible(entry).catch(() => {});
  }, [phase, saved, collectible, weekLabel]);

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
          <Text style={styles.gotText}>YOU GOT A</Text>
          <ScreenHeading style={{ width: '100%' }} textStyle={{ fontSize: scale(44), lineHeight: scale(48), color: '#FFFFFF' }} strokeRadius={4}>
            {tier + '\nChest'}
          </ScreenHeading>
          <Text style={styles.pctText}>for doing {Math.round(completionPct)}% of your chores</Text>

          <View style={styles.ladderWrap}>
            <TierLadder activeTier={tier} />
          </View>

          <Animated.View style={{ transform: [{ scale: chestScale }], marginTop: -50 }}>
            <Image source={CHEST_FRAMES[0]} style={styles.chestImg} resizeMode="contain" />
          </Animated.View>

          <Button label="Break it open!" onPress={handleStartCracking} style={{ width: '100%' }} />
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
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
    gap: 8,
    width: '100%',
  },
  gotText: {
    ...textStyles.secondaryText,
    marginBottom: 2,
  },
  pctText: {
    ...textStyles.secondaryText,
    marginBottom: 8,
  },
  ladderWrap: {
    marginBottom: 28,
  },

  // Chest image (shared)
  chestImg: {
    width: 220,
    height: 220,
  },

  // Cracking
  crackArea: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
    gap: 24,
  },
  tierLabelWrap: {
    position: 'absolute',
    top: 60,
    alignItems: 'center',
  },
  tierPill: {
    fontSize: scale(12),
    fontFamily: 'Inter_800ExtraBold',
    letterSpacing: 2,
    borderWidth: 2,
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 5,
    backgroundColor: '#1A1A1A',
    color: '#C5F215',
    borderColor: '#1A1A1A',
  },
  tapHint: {
    ...textStyles.secondaryText,
    marginTop: 16,
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
    paddingHorizontal: 32,
    gap: 4,
  },
  itemWrap: {
    marginBottom: 12,
  },
  itemImg: {
    width: 180,
    height: 180,
  },
  card: {
    backgroundColor: '#1A1A1A',
    borderRadius: 16,
    borderWidth: 2.5,
    borderColor: '#1A1A1A',
    paddingHorizontal: 28,
    paddingVertical: 20,
    alignItems: 'center',
    gap: 6,
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
