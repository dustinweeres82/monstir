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
    <PressableShadow onPress={onPress} disabled={disabled} depth={disabled ? 0 : 6} style={[{ width: '100%' } as ViewStyle, style as ViewStyle]}>
      <View style={[s.btn, s[variant], disabled && s.disabled]}>
        <Text style={[s.label, variant === 'primary' ? s.labelLight : s.labelDark, disabled && s.labelDisabled]}>
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
  disabled:      { backgroundColor: '#DCDCDC', borderColor: '#C0C0C0' },
  label:         { fontFamily: 'Inter_700Bold', fontSize: scale(20) },
  labelLight:    { color: colors.white },
  labelDark:     { color: colors.black },
  labelDisabled: { color: '#888888' },
});
