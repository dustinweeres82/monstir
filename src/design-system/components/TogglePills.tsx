import React, { useRef } from 'react';
import { View, Text, TouchableOpacity, Animated, StyleSheet, ViewStyle } from 'react-native';
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

function PillItem<T extends string>({ opt, isActive, onSelect }: { opt: Option<T>; isActive: boolean; onSelect: (id: T) => void }) {
  const scaleAnim = useRef(new Animated.Value(1)).current;

  const pressIn  = () => Animated.timing(scaleAnim, { toValue: 0.92, duration: 80, useNativeDriver: true }).start();
  const pressOut = () => Animated.spring(scaleAnim,  { toValue: 1, useNativeDriver: true, tension: 280, friction: 10 }).start();

  return (
    <TouchableOpacity
      onPress={() => onSelect(opt.id)}
      onPressIn={pressIn}
      onPressOut={pressOut}
      activeOpacity={1}
    >
      <Animated.View style={[s.pill, isActive && s.pillActive, { transform: [{ scale: scaleAnim }] }]}>
        <Text style={[s.label, isActive && s.labelActive]}>{opt.label}</Text>
      </Animated.View>
    </TouchableOpacity>
  );
}

export function TogglePills<T extends string>({ options, active, onSelect, style }: TogglePillsProps<T>) {
  return (
    <View style={[s.row, style]}>
      {options.map(opt => (
        <PillItem key={opt.id} opt={opt} isActive={opt.id === active} onSelect={onSelect} />
      ))}
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
