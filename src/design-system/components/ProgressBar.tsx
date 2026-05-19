import React from 'react';
import { View, Text, StyleSheet, ViewStyle } from 'react-native';
import { colors, radii, fontSize, fontWeight } from '../tokens';

interface ProgressBarProps {
  value: number;     // current value
  max: number;       // max value
  fillColor?: string;
  label?: string;    // e.g. "250/500xp" — auto-generated if omitted
  height?: number;
  style?: ViewStyle;
}

export function ProgressBar({
  value,
  max,
  fillColor = colors.purple,
  label,
  height = 16,
  style,
}: ProgressBarProps) {
  const pct = Math.min(100, max > 0 ? Math.round((value / max) * 100) : 0);
  const displayLabel = label ?? `${value}/${max}xp`;

  return (
    <View style={style}>
      <View style={[s.track, { height }]}>
        <View style={[s.fill, { width: `${pct}%`, backgroundColor: fillColor }]} />
      </View>
      <Text style={s.label}>{displayLabel}</Text>
    </View>
  );
}

const s = StyleSheet.create({
  track: {
    backgroundColor: '#E0DCDC',
    borderRadius: radii.full,
    overflow: 'hidden',
    marginBottom: 5,
  },
  fill: {
    height: '100%',
    borderRadius: radii.full,
  },
  label: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.medium,
    color: colors.black,
  },
});
