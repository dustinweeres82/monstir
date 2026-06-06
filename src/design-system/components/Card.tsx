import React from 'react';
import { View, StyleSheet, ViewStyle } from 'react-native';
import { colors, radii, borders, shadows } from '../tokens';

type Variant = 'default' | 'outlined' | 'subtle' | 'hero';

interface CardProps {
  children: React.ReactNode;
  variant?: Variant;
  style?: ViewStyle;
}

// default  — white, subtle 1px border (parent screens)
// outlined — cream, thick 2.5px black border (kid quest cards, character card)
// subtle   — white, 1px border + soft shadow (battle/wallet cards)
export function Card({ children, variant = 'default', style }: CardProps) {
  return (
    <View style={[s.base, s[variant], style]}>
      {children}
    </View>
  );
}

const s = StyleSheet.create({
  base: {
    borderRadius: radii.lg,
    padding: 16,
  },
  default: {
    backgroundColor: colors.white,
    ...borders.subtle,
  },
  outlined: {
    backgroundColor: colors.cream,
    borderWidth: 2.5,
    borderColor: colors.black,
  },
  subtle: {
    backgroundColor: colors.surface,
    borderWidth: 0.5,
    borderColor: colors.border,
    ...shadows.soft,
  },
  // Full-bleed hero card — purple bg, black border, solid shadow, larger radius
  // Note: no overflow:hidden so shadow renders correctly on iOS
  hero: {
    backgroundColor: colors.purple,
    borderWidth: 2.5,
    borderColor: colors.black,
    borderRadius: radii.xxxl,
    ...shadows.solid,
  },
});
