import React from 'react';
import { View, Text, StyleSheet, ViewStyle } from 'react-native';
import { colors, borders } from '../tokens';

type Size = 'sm' | 'md' | 'lg';

interface AvatarProps {
  emoji: string;
  size?: Size;
  bordered?: boolean;
  style?: ViewStyle;
}

const dimensions: Record<Size, { box: number; font: number; radius: number }> = {
  sm: { box: 36, font: 18, radius: 18 },
  md: { box: 50, font: 26, radius: 25 },
  lg: { box: 64, font: 34, radius: 32 },
};

export function Avatar({ emoji, size = 'md', bordered = true, style }: AvatarProps) {
  const d = dimensions[size];
  return (
    <View style={[
      s.base,
      { width: d.box, height: d.box, borderRadius: d.radius },
      bordered && s.bordered,
      style,
    ]}>
      <Text style={{ fontSize: d.font }}>{emoji}</Text>
    </View>
  );
}

const s = StyleSheet.create({
  base: {
    backgroundColor: colors.white,
    alignItems: 'center',
    justifyContent: 'center',
  },
  bordered: {
    ...borders.thick,
  },
});
