import React, { useRef, useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, Image, ImageSourcePropType, Animated, Platform,
} from 'react-native';
import Svg, { Defs, RadialGradient, Stop, Circle } from 'react-native-svg';
import { fontSize, interFamily, spacing } from '../design-system/tokens';
import { ArrowButton } from '../design-system/components/ArrowButton';

export type MilestoneHeroType = 'milestone-kid' | 'relic' | 'boss';

export interface HeroItem {
  typePillLabel: string;
  title: string;
  footerText: string;
  artSrc?: ImageSourcePropType;
  milestoneIcon?: string;
  milestoneImage?: ImageSourcePropType;
  locked?: boolean;
}

export interface MilestoneHeroProps {
  type: MilestoneHeroType;
  items: HeroItem[];
  index: number;
  onIndexChange: (i: number) => void;
  /** Override the hero background colour */
  bgOverride?: string;
}

const PURPLE   = '#7B3FF2';
const LAVENDER = '#EAE4FF';   // non-boss hero bg — matches world-tab countdown card
const INK      = '#111111';

const ART_SIZE  = 150;
const GLOW_SIZE = 210;

const CARD_SHADOW = {
  shadowColor: INK,
  shadowOffset: { width: 0, height: 6 },
  shadowOpacity: 1,
  shadowRadius: 0,
  elevation: 6,
};

const FOOTER_SHADOW = Platform.select({
  ios:     { shadowColor: INK, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 1, shadowRadius: 0 },
  android: { elevation: 4 },
  default: {},
})!;

export function MilestoneHero({ type, items, index, onIndexChange, bgOverride }: MilestoneHeroProps) {
  const [displayIdx, setDisplayIdx] = useState(index);

  const slideAnim = useRef(new Animated.Value(0)).current;
  const fadeAnim  = useRef(new Animated.Value(1)).current;
  const busy      = useRef(false);

  useEffect(() => {
    if (index !== displayIdx) transition(index > displayIdx ? 'next' : 'prev', index);
  }, [index]);

  function transition(direction: 'prev' | 'next', toIdx: number) {
    if (busy.current) return;
    busy.current = true;

    const outX = direction === 'next' ? -30 : 30;
    const inX  = direction === 'next' ?  30 : -30;

    Animated.parallel([
      Animated.timing(fadeAnim,  { toValue: 0, duration: 110, useNativeDriver: true }),
      Animated.timing(slideAnim, { toValue: outX, duration: 110, useNativeDriver: true }),
    ]).start(() => {
      slideAnim.setValue(inX);
      setDisplayIdx(toIdx);
      Animated.parallel([
        Animated.spring(slideAnim, { toValue: 0, useNativeDriver: true, tension: 240, friction: 20 }),
        Animated.timing(fadeAnim,  { toValue: 1, duration: 140, useNativeDriver: true }),
      ]).start(() => { busy.current = false; });
    });
  }

  function handlePrev() {
    if (displayIdx <= 0 || busy.current) return;
    const next = displayIdx - 1;
    transition('prev', next);
    onIndexChange(next);
  }

  function handleNext() {
    if (displayIdx >= items.length - 1 || busy.current) return;
    const next = displayIdx + 1;
    transition('next', next);
    onIndexChange(next);
  }

  const item      = items[displayIdx] ?? items[0];
  const isBoss    = type === 'boss';
  const bgColor   = bgOverride ?? (isBoss ? PURPLE : LAVENDER);
  const pillBg    = isBoss ? '#D8F52F' : PURPLE;
  const pillText  = isBoss ? INK       : '#FFFFFF';
  const titleColor = isBoss ? '#FFFFFF' : INK;
  const canPrev   = displayIdx > 0;
  const canNext   = displayIdx < items.length - 1;
  const multi     = items.length > 1;

  return (
    // Outer wrapper must NOT clip children so the footer can overlap below
    <View>
      {/* ── Main card ── */}
      <View style={[s.shadow, CARD_SHADOW]}>
        <View style={s.card}>
          <View style={[s.heroBg, { backgroundColor: bgColor }]}>

            {/* Type pill */}
            <Animated.View style={[s.pill, { backgroundColor: pillBg }, { opacity: fadeAnim }]}>
              <Text style={[s.pillText, { color: pillText }]}>{item.typePillLabel}</Text>
            </Animated.View>

            {/* Art with radial glow */}
            <View style={s.artRow}>
              <ArrowButton
                direction="left"
                onPress={handlePrev}
                disabled={!canPrev || !multi}
                size={48}
              />

              <Animated.View
                style={[
                  s.artInner,
                  item.locked && s.artLocked,
                  { opacity: fadeAnim, transform: [{ translateX: slideAnim }] },
                ]}
              >
                <View style={s.glow} pointerEvents="none">
                  <Svg width={GLOW_SIZE} height={GLOW_SIZE}>
                    <Defs>
                      <RadialGradient id="heroGlow" cx="50%" cy="50%" r="50%">
                        <Stop offset="0%"   stopColor="#FFFFFF" stopOpacity="0.55" />
                        <Stop offset="45%"  stopColor="#FFFFFF" stopOpacity="0.28" />
                        <Stop offset="75%"  stopColor="#FFFFFF" stopOpacity="0.08" />
                        <Stop offset="100%" stopColor="#FFFFFF" stopOpacity="0" />
                      </RadialGradient>
                    </Defs>
                    <Circle cx={GLOW_SIZE / 2} cy={GLOW_SIZE / 2} r={GLOW_SIZE / 2} fill="url(#heroGlow)" />
                  </Svg>
                </View>

                {type === 'milestone-kid' ? (
                  item.milestoneImage
                    ? <Image source={item.milestoneImage} style={s.artImg} resizeMode="contain" />
                    : <Text style={s.artEmoji}>{item.milestoneIcon ?? '🏆'}</Text>
                ) : (
                  item.artSrc
                    ? <Image source={item.artSrc} style={s.artImg} resizeMode="contain" />
                    : <Text style={s.artEmoji}>✦</Text>
                )}
              </Animated.View>

              <ArrowButton
                direction="right"
                onPress={handleNext}
                disabled={!canNext || !multi}
                size={48}
              />
            </View>

            {/* Title — FredokaOne 32, screen-title weight */}
            <Animated.Text
              style={[s.title, { color: titleColor, opacity: fadeAnim, transform: [{ translateX: slideAnim }] }]}
              numberOfLines={2}
            >
              {item.title}
            </Animated.Text>

            {/* Pager counter */}
            {multi && (
              <Text style={[s.counterText, { color: isBoss ? 'rgba(255,255,255,0.6)' : 'rgba(0,0,0,0.4)' }]}>
                {displayIdx + 1} of {items.length}
              </Text>
            )}
          </View>
        </View>
      </View>

      {/* ── Footer clip — overlaps the card bottom ── */}
      <Animated.View style={[s.footer, FOOTER_SHADOW, { opacity: fadeAnim }]}>
        <Text style={s.footerText} numberOfLines={3}>
          {item.footerText}
        </Text>
      </Animated.View>
    </View>
  );
}

const s = StyleSheet.create({
  shadow: {
    borderRadius: 18,
  },
  card: {
    borderWidth: 3,
    borderColor: INK,
    borderRadius: 18,
    overflow: 'hidden',
  },
  heroBg: {
    paddingTop: spacing.lg,
    paddingBottom: spacing.xl,   // extra bottom padding makes room for overlap
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.lg,
  },

  pill: {
    borderRadius: 50,
    borderWidth: 2,
    borderColor: INK,
    paddingHorizontal: spacing.md,
    paddingVertical: 4,
  },
  pillText: {
    fontSize: fontSize.sm,
    fontFamily: interFamily.heavy,
    letterSpacing: 0.5,
  },

  artRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: spacing.xs,
  },

  artInner: {
    width: ART_SIZE,
    height: ART_SIZE,
    alignItems: 'center',
    justifyContent: 'center',
  },
  glow: {
    position: 'absolute',
    top:  (ART_SIZE - GLOW_SIZE) / 2,
    left: (ART_SIZE - GLOW_SIZE) / 2,
    width: GLOW_SIZE,
    height: GLOW_SIZE,
    alignItems: 'center',
    justifyContent: 'center',
  },
  artLocked: { opacity: 0.4 },
  artImg:    { width: ART_SIZE, height: ART_SIZE },   // 150×150
  artEmoji:  { fontSize: 84 },

  title: {
    fontFamily: 'FredokaOne_400Regular',
    fontSize: fontSize.display,    // scale(32) — matches screen title
    textAlign: 'center',
    lineHeight: fontSize.display * 1.1,
  },

  counterText: {
    fontSize: fontSize.sm,
    fontFamily: interFamily.semibold,
    textAlign: 'center',
  },

  // Footer clip — sits below the card, pulls up to overlap it
  footer: {
    marginTop: -20,
    marginHorizontal: 16,
    zIndex: 2,
    backgroundColor: '#FFFFFF',
    borderWidth: 2,
    borderColor: INK,
    borderRadius: 14,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
  footerText: {
    fontSize: fontSize.base,
    fontFamily: interFamily.bold,
    color: INK,
    textAlign: 'center',
    lineHeight: fontSize.lg * 1.3,
  },
});
