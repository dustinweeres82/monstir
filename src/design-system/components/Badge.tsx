import React from 'react';
import { View, Text, StyleSheet, ViewStyle } from 'react-native';
import { colors, radii, fontSize, fontWeight } from '../tokens';

type Variant = 'balance' | 'counter' | 'level';

interface BadgeProps {
  label: string;
  variant?: Variant;
  prefix?: string;    // e.g. "$" for balance
  suffix?: string;    // e.g. "🪙" for balance
  style?: ViewStyle;
}

// balance — white pill with thick black border (kid header balance)
// counter — teal pill (quests left)
// level   — plain text, purple bold (character level)
export function Badge({ label, variant = 'balance', prefix, suffix, style }: BadgeProps) {
  if (variant === 'level') {
    return <Text style={s.levelText}>{label}</Text>;
  }

  return (
    <View style={[s.base, s[variant], style]}>
      {prefix ? <Text style={[s.text, textStyle[variant]]}>{prefix}</Text> : null}
      <Text style={[s.text, textStyle[variant]]}>{label}</Text>
      {suffix ? <Text style={[s.text, textStyle[variant]]}>{suffix}</Text> : null}
    </View>
  );
}

const s = StyleSheet.create({
  base: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: radii.full,
    paddingHorizontal: 14,
    paddingVertical: 8,
    gap: 6,
  },
  balance: {
    backgroundColor: colors.white,
    borderWidth: 2.5,
    borderColor: colors.black,
  },
  counter: {
    backgroundColor: colors.teal,
  },
  text: {
    fontSize: fontSize.xxl,
    fontWeight: fontWeight.bold,
  },
  levelText: {
    fontSize: fontSize.base,
    fontWeight: fontWeight.heavy,
    color: colors.purple,
  },
});

const textStyle = {
  balance: { color: colors.black, fontSize: fontSize.xxl, fontWeight: fontWeight.bold } as const,
  counter: { color: colors.black, fontSize: fontSize.base, fontWeight: fontWeight.bold } as const,
  level:   {} as const,
};
