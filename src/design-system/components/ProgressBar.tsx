import React from 'react';
import { View, Text, StyleSheet, ViewStyle } from 'react-native';
import { colors, radii, fontSize } from '../tokens';

interface ProgressBarProps {
  value:      number;      // current value
  max:        number;      // max value
  fillColor?: string;
  label?:     string;      // shown below bar if provided
  height?:    number;
  style?:     ViewStyle;
}

/**
 * Monstir progress bar — pill shape, 2px black border, coloured fill.
 * Matches the home screen XP bar style throughout the app.
 */
export function ProgressBar({
  value,
  max,
  fillColor = colors.purple,
  label,
  height = 16,
  style,
}: ProgressBarProps) {
  const pct = Math.min(100, max > 0 ? Math.round((value / max) * 100) : 0);

  return (
    <View style={style}>
      <View style={[s.track, { height }]}>
        <View style={[s.fill, { width: `${pct}%` as any, backgroundColor: fillColor }]} />
      </View>
      {label ? <Text style={s.label}>{label}</Text> : null}
    </View>
  );
}

const s = StyleSheet.create({
  track: {
    backgroundColor: '#E0DCDC',
    borderRadius: radii.full,
    borderWidth: 2,
    borderColor: colors.black,
    overflow: 'hidden',
  },
  fill: {
    height: '100%',
    borderRadius: radii.full,
  },
  label: {
    fontSize: fontSize.sm,
    fontFamily: 'Inter_500Medium',
    color: colors.black,
    marginTop: 4,
  },
});
