import React, { useEffect, useRef } from 'react';
import { Animated, StyleSheet, View, ViewStyle } from 'react-native';
import { colors, radii } from '../tokens';

interface SkeletonProps {
  width?: number | `${number}%`;
  height?: number;
  borderRadius?: number;
  style?: ViewStyle;
}

/**
 * Animated shimmer skeleton block. Sweeps left-to-right on a loop.
 * Use width/height to match the shape of the content it replaces.
 */
export function Skeleton({ width = '100%', height = 20, borderRadius = radii.md, style }: SkeletonProps) {
  const shimmer = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const anim = Animated.loop(
      Animated.sequence([
        Animated.timing(shimmer, {
          toValue: 1,
          duration: 1100,
          useNativeDriver: true,
        }),
        Animated.timing(shimmer, {
          toValue: 0,
          duration: 0,
          useNativeDriver: true,
        }),
      ])
    );
    anim.start();
    return () => anim.stop();
  }, [shimmer]);

  // Translate from -width to +width so the highlight sweeps left-to-right.
  // We use a fixed large offset (400) that covers any realistic component width.
  const translateX = shimmer.interpolate({
    inputRange: [0, 1],
    outputRange: [-400, 400],
  });

  return (
    <View
      style={[
        s.base,
        { width: width as any, height, borderRadius },
        style,
      ]}
    >
      <Animated.View
        style={[
          s.shimmer,
          { transform: [{ translateX }] },
        ]}
      />
    </View>
  );
}

// ─── Convenience presets ──────────────────────────────────────────────────────

/** A skeleton row matching the height of a ChoreCard (~68px) */
export function ChoreCardSkeleton({ style }: { style?: ViewStyle }) {
  return (
    <View style={[s.choreCard, style]}>
      {/* Icon box */}
      <Skeleton width={48} height={48} borderRadius={radii.lg} />
      {/* Text lines */}
      <View style={s.choreCardLines}>
        <Skeleton width="60%" height={16} borderRadius={radii.full} />
        <Skeleton width="35%" height={13} borderRadius={radii.full} style={{ marginTop: 6 }} />
      </View>
      {/* Checkbox placeholder */}
      <Skeleton width={30} height={30} borderRadius={radii.full} />
    </View>
  );
}

/** A skeleton row for a generic list cell (~52px) */
export function ListRowSkeleton({ style }: { style?: ViewStyle }) {
  return (
    <View style={[s.listRow, style]}>
      <Skeleton width={36} height={36} borderRadius={radii.lg} />
      <View style={s.listRowLines}>
        <Skeleton width="55%" height={14} borderRadius={radii.full} />
        <Skeleton width="35%" height={11} borderRadius={radii.full} style={{ marginTop: 5 }} />
      </View>
    </View>
  );
}

/** A skeleton card (title + body lines) matching a ~100px panel */
export function CardSkeleton({ style }: { style?: ViewStyle }) {
  return (
    <View style={[s.card, style]}>
      <Skeleton width="45%" height={15} borderRadius={radii.full} />
      <Skeleton width="100%" height={12} borderRadius={radii.full} style={{ marginTop: 10 }} />
      <Skeleton width="80%" height={12} borderRadius={radii.full} style={{ marginTop: 6 }} />
    </View>
  );
}

const s = StyleSheet.create({
  base: {
    backgroundColor: colors.border,
    overflow: 'hidden',
  },
  shimmer: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    width: 200,
    backgroundColor: 'rgba(255,255,255,0.55)',
    // Skew to make the edge look diagonal
    transform: [{ skewX: '-20deg' }],
  },
  choreCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.cream,
    borderRadius: radii.xl,
    borderWidth: 2,
    borderColor: colors.border,
    padding: 12,
    gap: 12,
  },
  choreCardLines: {
    flex: 1,
  },
  listRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 12,
    gap: 12,
  },
  listRowLines: {
    flex: 1,
  },
  card: {
    backgroundColor: colors.surface,
    borderRadius: radii.xxl,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 16,
  },
});
