import React from 'react';
import { View, Text, StyleSheet, ViewStyle } from 'react-native';
import { colors, radii, fontSize, fontWeight, borders, spacing, scale } from '../tokens';
import { IconBox } from './IconBox';
import { PressableShadow } from './PressableShadow';

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
    <PressableShadow
      style={[s.card, style] as unknown as ViewStyle}
      onPress={onPress}
      pressScale={0.97}
      depth={0}
    >
      <IconBox icon={icon} bg={iconBg} size="md" />
      <View style={s.info}>
        <Text style={s.title}>{title}</Text>
        <Text style={s.subtitle}>{subtitle}</Text>
      </View>
      <Text style={s.arrow}>›</Text>
    </PressableShadow>
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
    fontFamily: 'Inter_700Bold',
    color: colors.black,
    marginBottom: 3,
  },
  subtitle: {
    fontSize: fontSize.md,
    color: colors.muted,
  },
  arrow: {
    fontSize: scale(22),
    color: colors.black,
    fontFamily: 'Inter_400Regular',
  },
});
