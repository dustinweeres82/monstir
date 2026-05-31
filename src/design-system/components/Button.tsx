import React from 'react';
import { TouchableOpacity, Text, StyleSheet, ViewStyle, Platform } from 'react-native';
import { colors, fontSize, fontWeight, scale } from '../tokens';

type Variant = 'primary' | 'secondary';

interface ButtonProps {
  label: string;
  onPress: () => void;
  variant?: Variant;
  disabled?: boolean;
  style?: ViewStyle;
}

export function Button({ label, onPress, variant = 'primary', disabled, style }: ButtonProps) {
  return (
    <TouchableOpacity
      style={[s.base, s[variant], disabled && s.disabled, style]}
      onPress={onPress}
      activeOpacity={0.85}
      disabled={disabled}
    >
      <Text style={labelStyle[variant]}>{label}</Text>
    </TouchableOpacity>
  );
}

const s = StyleSheet.create({
  base: {
    width: '100%',
    borderRadius: 80,
    paddingVertical: 18,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: colors.black,
    ...Platform.select({
      ios:     { shadowColor: '#1A1A1A', shadowOffset: { width: 4, height: 4 }, shadowOpacity: 1, shadowRadius: 0 },
      android: { elevation: 8 },
      default: {},
    }),
  },
  primary:   { backgroundColor: colors.purple },
  secondary: { backgroundColor: colors.white },
  disabled:  { opacity: 0.45 },
});

const labelStyle = StyleSheet.create({
  primary:   { fontFamily: 'Inter_700Bold', fontSize: scale(20), color: colors.white },
  secondary: { fontFamily: 'Inter_700Bold', fontSize: scale(20), color: colors.black },
});
