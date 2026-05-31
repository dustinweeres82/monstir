import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ViewStyle } from 'react-native';
import { colors, radii, fontSize, fontWeight, spacing } from '../tokens';

interface Option<T extends string> {
  id: T;
  label: string;
}

interface TogglePillsProps<T extends string> {
  options: Option<T>[];
  active: T;
  onSelect: (id: T) => void;
  style?: ViewStyle;
}

export function TogglePills<T extends string>({ options, active, onSelect, style }: TogglePillsProps<T>) {
  return (
    <View style={[s.row, style]}>
      {options.map(opt => {
        const isActive = opt.id === active;
        return (
          <TouchableOpacity
            key={opt.id}
            style={[s.pill, isActive && s.pillActive]}
            onPress={() => onSelect(opt.id)}
            activeOpacity={0.7}
          >
            <Text style={[s.label, isActive && s.labelActive]}>{opt.label}</Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

const s = StyleSheet.create({
  row: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  pill: {
    paddingHorizontal: 20,
    paddingVertical: 8,
    borderRadius: radii.full,
    backgroundColor: '#F0EEE8',
  },
  pillActive: {
    backgroundColor: colors.purple,
  },
  label: {
    fontSize: fontSize.base,
    fontFamily: 'Inter_600SemiBold',
    color: colors.muted,
  },
  labelActive: {
    color: colors.white,
    fontFamily: 'Inter_700Bold',
  },
});
