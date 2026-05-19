import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ViewStyle } from 'react-native';
import { colors, radii, fontSize, fontWeight, borders, spacing } from '../tokens';
import { IconBox } from './IconBox';

interface ChoreCardProps {
  icon: string;
  iconBg: string;
  title: string;
  reward: string;      // formatted string e.g. "$0.50"
  done?: boolean;
  onPress?: () => void;
  style?: ViewStyle;
}

export function ChoreCard({ icon, iconBg, title, reward, done, onPress, style }: ChoreCardProps) {
  return (
    <TouchableOpacity
      style={[s.card, done && s.cardDone, style]}
      onPress={done ? undefined : onPress}
      activeOpacity={0.7}
    >
      <IconBox icon={icon} bg={iconBg} size="lg" />
      <View style={s.info}>
        <Text style={[s.title, done && s.titleDone]}>{title}</Text>
        <View style={s.rewardRow}>
          <Text style={s.coinEmoji}>🪙</Text>
          <Text style={s.reward}>{reward}</Text>
        </View>
      </View>
      <View style={[s.checkbox, done && s.checkboxDone]}>
        {done && <View style={s.checkDot} />}
      </View>
    </TouchableOpacity>
  );
}

const s = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.cream,
    borderRadius: radii.xl,
    ...borders.medium,
    padding: spacing.md,
    gap: spacing.md,
  },
  cardDone: {
    opacity: 0.5,
  },
  info: {
    flex: 1,
  },
  title: {
    fontSize: fontSize.xl,
    fontWeight: fontWeight.bold,
    color: colors.black,
    marginBottom: 3,
  },
  titleDone: {
    textDecorationLine: 'line-through',
    color: colors.muted,
  },
  rewardRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  coinEmoji: {
    fontSize: fontSize.base,
  },
  reward: {
    fontSize: fontSize.base,
    fontWeight: fontWeight.semibold,
    color: colors.black,
  },
  checkbox: {
    width: 30,
    height: 30,
    borderRadius: radii.full,
    borderWidth: 2,
    borderColor: colors.black,
  },
  checkboxDone: {
    backgroundColor: colors.purple,
    borderColor: colors.purple,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.white,
  },
});
