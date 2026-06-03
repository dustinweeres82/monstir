import React, { useEffect, useRef, useState } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity,
  Animated, Easing, Dimensions,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, fontSize, interFamily, nunitoFamily, spacing, radii, shadows, scale } from '../design-system/tokens';
import type { MilestoneDef } from '../data/milestones';

const { width: W } = Dimensions.get('window');

const PURPLE = '#7B3FF2';
const LIME   = '#D8F52F';
const BORDER = '#111111';

interface MilestoneToastProps {
  milestone: MilestoneDef;
  onView:    () => void;
  onDismiss: () => void;
}

export function MilestoneToast({ milestone, onView, onDismiss }: MilestoneToastProps) {
  const insets   = useSafeAreaInsets();
  const slideY   = useRef(new Animated.Value(-200)).current;
  const opacity  = useRef(new Animated.Value(0)).current;
  const isLarge  = milestone.size === 'large';
  const isMedium = milestone.size === 'medium';

  useEffect(() => {
    // Slide in
    Animated.parallel([
      Animated.spring(slideY, { toValue: 0, useNativeDriver: true, tension: 80, friction: 10 }),
      Animated.timing(opacity, { toValue: 1, duration: 200, useNativeDriver: true }),
    ]).start();

    // Auto-dismiss small + medium after 4s
    if (!isLarge) {
      const t = setTimeout(() => dismiss(), 4000);
      return () => clearTimeout(t);
    }
  }, []);

  const dismiss = () => {
    Animated.parallel([
      Animated.timing(slideY,  { toValue: -200, duration: 250, easing: Easing.in(Easing.quad), useNativeDriver: true }),
      Animated.timing(opacity, { toValue: 0,    duration: 200, useNativeDriver: true }),
    ]).start(onDismiss);
  };

  return (
    <Animated.View
      style={[
        s.wrapper,
        { top: insets.top + spacing.sm, opacity, transform: [{ translateY: slideY }] },
      ]}
      pointerEvents="box-none"
    >
      {/* ── Small ── */}
      {milestone.size === 'small' && (
        <View style={s.small}>
          <Text style={s.smallIcon}>{milestone.icon}</Text>
          <View style={s.smallInfo}>
            <Text style={s.smallName}>{milestone.name}</Text>
            <Text style={s.smallXp}>+{milestone.xpReward} XP</Text>
          </View>
          <TouchableOpacity onPress={() => { dismiss(); onView(); }} activeOpacity={0.7}>
            <Text style={s.viewLink}>View →</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* ── Medium ── */}
      {milestone.size === 'medium' && (
        <View style={[s.medium]}>
          <View style={s.mediumLeft}>
            <Text style={s.mediumIcon}>{milestone.icon}</Text>
          </View>
          <View style={s.mediumInfo}>
            <Text style={s.mediumName}>{milestone.name}</Text>
            <Text style={s.mediumTagline}>{milestone.tagline}</Text>
            <Text style={s.smallXp}>+{milestone.xpReward} XP</Text>
          </View>
          <TouchableOpacity onPress={() => { dismiss(); onView(); }} activeOpacity={0.7}>
            <Text style={s.viewLink}>View →</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* ── Large ── */}
      {milestone.size === 'large' && (
        <TouchableOpacity style={s.large} onPress={dismiss} activeOpacity={1}>
          {/* Purple header */}
          <View style={s.largeHeader}>
            <Text style={s.largeSparkle}>✦</Text>
            <Text style={s.largeIcon}>{milestone.icon}</Text>
            <Text style={s.largeName}>{milestone.name}</Text>
            <Text style={s.largeTagline}>{milestone.tagline}</Text>
            <Text style={s.largeSparkleR}>✦</Text>
          </View>
          {/* Rewards strip */}
          <View style={s.largeRewards}>
            <View style={s.largeRewardChip}>
              <Text style={s.largeRewardChipText}>⭐ +{milestone.xpReward} XP</Text>
            </View>
            <View style={s.largeRewardChip}>
              <Text style={s.largeRewardChipText}>🏆 Trophy</Text>
            </View>
            <TouchableOpacity
              style={s.largeViewBtn}
              onPress={() => { dismiss(); onView(); }}
              activeOpacity={0.85}
            >
              <Text style={s.largeViewBtnText}>View →</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      )}
    </Animated.View>
  );
}

const CARD_SHADOW = {
  shadowColor: BORDER,
  shadowOffset: { width: 0, height: 6 },
  shadowOpacity: 1,
  shadowRadius: 0,
  elevation: 6,
};

const s = StyleSheet.create({
  wrapper: {
    position: 'absolute',
    left: spacing.lg,
    right: spacing.lg,
    zIndex: 9999,
  },

  // Small
  small: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.sm,
    backgroundColor: colors.white,
    borderRadius: radii.xxl, borderWidth: 2.5, borderColor: BORDER,
    padding: spacing.md, paddingHorizontal: spacing.lg,
    ...CARD_SHADOW,
  },
  smallIcon: { fontSize: fontSize.xxxl },
  smallInfo: { flex: 1 },
  smallName: { fontFamily: 'FredokaOne_400Regular', fontSize: fontSize.base, color: BORDER },
  smallXp:   { fontFamily: nunitoFamily.semibold, fontSize: fontSize.xs, color: colors.muted },
  viewLink:  { fontFamily: nunitoFamily.bold, fontSize: fontSize.sm, color: PURPLE },

  // Medium
  medium: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.sm,
    backgroundColor: '#F3EEFF',
    borderRadius: radii.xxl, borderWidth: 2.5, borderColor: BORDER,
    padding: spacing.md, paddingHorizontal: spacing.lg,
    ...CARD_SHADOW,
  },
  mediumLeft: {},
  mediumIcon: { fontSize: scale(36) },
  mediumInfo: { flex: 1 },
  mediumName:    { fontFamily: 'FredokaOne_400Regular', fontSize: fontSize.lg, color: BORDER },
  mediumTagline: { fontFamily: nunitoFamily.regular, fontSize: fontSize.xs, color: '#555', marginTop: 1 },

  // Large
  large: {
    borderRadius: radii.xxl, borderWidth: 2.5, borderColor: BORDER,
    overflow: 'hidden', ...CARD_SHADOW,
  },
  largeHeader: {
    backgroundColor: PURPLE, padding: spacing.lg,
    alignItems: 'center', gap: spacing.xs, position: 'relative',
  },
  largeSparkle:  { position: 'absolute', top: 12, left: 16, fontSize: fontSize.lg, color: 'rgba(255,255,255,0.5)' },
  largeSparkleR: { position: 'absolute', top: 12, right: 16, fontSize: fontSize.lg, color: 'rgba(255,255,255,0.5)' },
  largeIcon:    { fontSize: scale(40) },
  largeName:    { fontFamily: 'FredokaOne_400Regular', fontSize: fontSize.h2, color: colors.white, textAlign: 'center' },
  largeTagline: { fontFamily: nunitoFamily.regular, fontSize: fontSize.sm, color: 'rgba(255,255,255,0.85)', textAlign: 'center' },
  largeRewards: {
    backgroundColor: colors.white, flexDirection: 'row',
    alignItems: 'center', padding: spacing.md, gap: spacing.sm,
  },
  largeRewardChip: {
    backgroundColor: '#F3EEFF', borderRadius: radii.full,
    borderWidth: 1.5, borderColor: PURPLE,
    paddingHorizontal: spacing.md, paddingVertical: 4,
  },
  largeRewardChipText: { fontFamily: nunitoFamily.bold, fontSize: fontSize.xs, color: PURPLE },
  largeViewBtn: {
    marginLeft: 'auto' as any,
    backgroundColor: LIME, borderRadius: radii.full,
    borderWidth: 2, borderColor: BORDER,
    paddingHorizontal: spacing.lg, paddingVertical: 6,
  },
  largeViewBtnText: { fontFamily: 'FredokaOne_400Regular', fontSize: fontSize.base, color: BORDER },
});
