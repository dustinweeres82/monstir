import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ViewStyle } from 'react-native';
import { colors, radii, fontSize, fontWeight, borders, spacing } from '../tokens';
import { IconBox } from './IconBox';

interface MenuCardProps {
  icon: string;
  iconBg: string;
  title: string;
  subtitle: string;
  onPress?: () => void;
  style?: ViewStyle;
}

export function MenuCard({ icon, iconBg, title, subtitle, onPress, style }: MenuCardProps) {
  return (
    <TouchableOpacity
      style={[s.card, style]}
      onPress={onPress}
      activeOpacity={0.8}
    >
      <IconBox icon={icon} bg={iconBg} size="md" />
      <View style={s.info}>
        <Text style={s.title}>{title}</Text>
        <Text style={s.subtitle}>{subtitle}</Text>
      </View>
      <Text style={s.arrow}>›</Text>
    </TouchableOpacity>
  );
}

const s = StyleSheet.create({
  card: {
    backgroundColor: colors.white,
    borderRadius: radii.lg,
    ...borders.thin,
    padding: spacing.lg,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  info: {
    flex: 1,
  },
  title: {
    fontSize: fontSize.lg,
    fontWeight: fontWeight.bold,
    color: colors.black,
    marginBottom: 3,
  },
  subtitle: {
    fontSize: fontSize.md,
    color: colors.muted,
  },
  arrow: {
    fontSize: 22,
    color: colors.black,
    fontWeight: fontWeight.regular,
  },
});
