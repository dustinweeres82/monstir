import React from 'react';
import {
  View, Text, StyleSheet, Image, TouchableOpacity,
  ImageSourcePropType, ViewStyle,
} from 'react-native';
import { fontSize, interFamily, nunitoFamily, spaceMonoFamily, spacing, radii } from '../design-system/tokens';

const INK    = '#111111';
const PURPLE = '#7B3FF2';
const LIME   = '#D8F52F';
const MUTED  = '#888888';

// ─── RarityBadge ─────────────────────────────────────────────────────────────

const RARITY_COLORS = {
  rare:      { bg: PURPLE,   text: '#FFFFFF' },
  legendary: { bg: '#D4A000', text: '#222222' },
  common:    { bg: MUTED,    text: '#FFFFFF' },
  milestone: { bg: LIME,     text: INK },
} as const;

interface RarityBadgeProps {
  rarity: 'rare' | 'legendary' | 'common' | 'milestone';
  label?: string;
  /** Override the rarity-derived colors (e.g. collectible rarities that don't map
   *  to this component's threat-based palette). */
  bg?: string;
  textColor?: string;
}

export function RarityBadge({ rarity, label, bg, textColor }: RarityBadgeProps) {
  const colors = RARITY_COLORS[rarity];
  const displayLabel = label ?? rarity.charAt(0).toUpperCase() + rarity.slice(1);
  return (
    <View style={[b.pill, { backgroundColor: bg ?? colors.bg }]}>
      <Text style={[b.pillText, { color: textColor ?? colors.text }]}>{displayLabel}</Text>
    </View>
  );
}

const b = StyleSheet.create({
  pill: {
    borderRadius: 50,
    borderWidth: 2,
    borderColor: INK,
    paddingHorizontal: spacing.sm,
    paddingVertical: 3,
    alignSelf: 'flex-start',
  },
  pillText: {
    fontSize: fontSize.sm,
    fontFamily: interFamily.heavy,
    letterSpacing: 0.5,
  },
});

// ─── StatCard ─────────────────────────────────────────────────────────────────

interface StatCardProps {
  label: string;
  value: string;
  sublabel?: string;
  style?: ViewStyle;
  valueColor?: string;
}

export function StatCard({ label, value, sublabel, style, valueColor }: StatCardProps) {
  return (
    <View style={[sc.card, style]}>
      <Text style={sc.label}>{label.toUpperCase()}</Text>
      <Text style={[sc.value, valueColor ? { color: valueColor } : undefined]}>{value}</Text>
      {sublabel != null && <Text style={sc.sublabel}>{sublabel}</Text>}
    </View>
  );
}

const sc = StyleSheet.create({
  card: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderWidth: 2.5,
    borderColor: INK,
    borderRadius: radii.lg,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.sm,
    gap: 3,
    alignItems: 'center',
    shadowColor: INK,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 1,
    shadowRadius: 0,
    elevation: 4,
  },
  label: {
    fontSize: fontSize.sm,
    fontFamily: spaceMonoFamily.regular,
    color: MUTED,
    textAlign: 'center',
    letterSpacing: 0.4,
  },
  value: {
    fontSize: 22,
    fontFamily: 'FredokaOne_400Regular',
    color: INK,
    textAlign: 'center',
  },
  sublabel: {
    fontSize: fontSize.sm,
    color: MUTED,
    fontFamily: nunitoFamily.regular,
    textAlign: 'center',
    lineHeight: fontSize.base * 1.3,
  },
});

// ─── SourceCard ───────────────────────────────────────────────────────────────

const SOURCE_VARIANTS = {
  purple: { bg: '#F3EFFE', border: PURPLE, labelColor: PURPLE },
  lime:   { bg: '#F6FBD8', border: '#8fa800', labelColor: '#5a6b00' },
} as const;

interface SourceCardProps {
  variant: 'purple' | 'lime';
  label: string;
  value: string;
  sublabel?: string;
  style?: ViewStyle;
}

export function SourceCard({ variant, label, value, sublabel, style }: SourceCardProps) {
  const v = SOURCE_VARIANTS[variant];
  return (
    <View style={[src.card, { backgroundColor: v.bg, borderColor: v.border }, style]}>
      <Text style={[src.label, { color: v.labelColor }]}>{label.toUpperCase()}</Text>
      <Text style={src.value}>{value}</Text>
      {sublabel != null && <Text style={src.sublabel}>{sublabel}</Text>}
    </View>
  );
}

const src = StyleSheet.create({
  card: {
    flex: 1,
    borderWidth: 2,
    borderRadius: radii.lg,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.sm,
    gap: 3,
    alignItems: 'center',
    shadowColor: INK,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 1,
    shadowRadius: 0,
    elevation: 4,
  },
  label: {
    fontSize: fontSize.sm,
    fontFamily: spaceMonoFamily.regular,
    textAlign: 'center',
    letterSpacing: 0.4,
  },
  value: {
    fontSize: 22,
    fontFamily: 'FredokaOne_400Regular',
    color: INK,
    textAlign: 'center',
  },
  sublabel: {
    fontSize: fontSize.sm,
    color: MUTED,
    fontFamily: nunitoFamily.regular,
    textAlign: 'center',
  },
});

// ─── RewardCard ───────────────────────────────────────────────────────────────

interface RewardCardProps {
  rarity: 'rare' | 'legendary' | 'common' | 'milestone';
  /** Overrides the pill text (e.g. "Reward" for XP/coins, which aren't milestones). */
  badgeLabel?: string;
  /** Overrides the pill colors (e.g. a relic's real collectible rarity). */
  badgeColor?: string;
  badgeTextColor?: string;
  icon?: string;
  imageSrc?: ImageSourcePropType;
  name: string;
  onPress?: () => void;
}

export function RewardCard({ rarity, badgeLabel, badgeColor, badgeTextColor, icon, imageSrc, name, onPress }: RewardCardProps) {
  return (
    <TouchableOpacity
      style={rc.card}
      onPress={onPress}
      activeOpacity={onPress ? 0.75 : 1}
      disabled={!onPress}
    >
      <RarityBadge rarity={rarity} label={badgeLabel} bg={badgeColor} textColor={badgeTextColor} />
      {imageSrc
        ? <Image source={imageSrc} style={rc.image} resizeMode="contain" />
        : <Text style={rc.icon}>{icon ?? '✦'}</Text>}
      <Text style={rc.name} numberOfLines={2}>{name}</Text>
    </TouchableOpacity>
  );
}

const rc = StyleSheet.create({
  card: {
    flex: 1,
    minWidth: '45%',
    backgroundColor: '#FFFFFF',
    borderWidth: 2,
    borderColor: INK,
    borderRadius: radii.lg,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.sm,
    alignItems: 'center',
    gap: spacing.xs,
    shadowColor: INK,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 1,
    shadowRadius: 0,
    elevation: 3,
  },
  image: {
    width: 52,
    height: 52,
  },
  icon: {
    fontSize: 40,
  },
  name: {
    fontSize: fontSize.base,
    fontFamily: nunitoFamily.heavy,
    color: INK,
    textAlign: 'center',
    lineHeight: fontSize.lg,
  },
});
