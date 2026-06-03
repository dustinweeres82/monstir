/**
 * ArrowButton
 *
 * White circle button with a directional arrow icon.
 * Used in carousels and monster-select screens.
 */

import React from 'react';
import { TouchableOpacity, Image, StyleSheet } from 'react-native';
import { scale, colors, shadows } from '../tokens';

interface Props {
  direction:   'left' | 'right';
  onPress:     () => void;
  disabled?:   boolean;
  size?:       number;
}

export function ArrowButton({ direction, onPress, disabled, size = 52 }: Props) {
  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={disabled}
      activeOpacity={0.75}
      style={[
        s.btn,
        { width: scale(size), height: scale(size), borderRadius: scale(size / 2) },
        disabled && s.disabled,
      ]}
    >
      <Image
        source={require('../../../assets/arrow_icon.png')}
        style={[s.icon, direction === 'left' && { transform: [{ scaleX: -1 }] }]}
        resizeMode="contain"
      />
    </TouchableOpacity>
  );
}

const s = StyleSheet.create({
  btn: {
    backgroundColor: colors.white,
    borderWidth:     2,
    borderColor:     colors.black,
    alignItems:      'center',
    justifyContent:  'center',
    ...shadows.solid,
  },
  icon: {
    width:  scale(24),
    height: scale(24),
  },
  disabled: {
    opacity: 0.3,
  },
});
