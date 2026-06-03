import React from 'react';
import { View, Text, StyleSheet, ViewStyle } from 'react-native';
import { colors, scale } from '../tokens';
import { PressableShadow } from './PressableShadow';

type Variant = 'primary' | 'secondary';

interface ButtonProps {
  label:     string;
  onPress:   () => void;
  variant?:  Variant;
  disabled?: boolean;
  style?:    ViewStyle;
}

export function Button({ label, onPress, variant = 'primary', disabled, style }: ButtonProps) {
  return (
    <PressableShadow onPress={onPress} disabled={disabled} style={[{ width: '100%' } as ViewStyle, style as ViewStyle]}>
      <View style={[s.btn, s[variant], disabled && s.disabled]}>
        <Text style={[s.label, variant === 'primary' ? s.labelLight : s.labelDark]}>
          {label}
        </Text>
      </View>
    </PressableShadow>
  );
}

const s = StyleSheet.create({
  btn: {
    borderRadius: 80,
    borderWidth: 3,
    borderColor: colors.black,
    paddingVertical: 18,
    alignItems: 'center',
  },
  primary:   { backgroundColor: colors.purple },
  secondary: { backgroundColor: colors.white },
  disabled:  { opacity: 0.45 },
  label:     { fontFamily: 'Inter_700Bold', fontSize: scale(20) },
  labelLight: { color: colors.white },
  labelDark:  { color: colors.black },
});
