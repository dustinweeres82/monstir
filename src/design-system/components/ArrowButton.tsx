import React from 'react';
import { View, Image, StyleSheet, TouchableOpacity } from 'react-native';
import { scale, colors } from '../tokens';
import { PressableShadow } from './PressableShadow';

interface Props {
  direction: 'left' | 'right';
  onPress:   () => void;
  disabled?: boolean;
  size?:     number;
}

export function ArrowButton({ direction, onPress, disabled, size = 52 }: Props) {
  const diameter = scale(size);
  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={disabled}
      activeOpacity={1}
      hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
      style={disabled ? s.disabled : undefined}
    >
      <PressableShadow
        onPress={onPress}
        disabled={disabled}
        pressScale={0.92}
      >
        {/*
         * White circle is inside PressableShadow so the shadow layer has an
         * opaque background to cast from (not the transparent arrow image).
         */}
        <View style={[s.circle, { width: diameter, height: diameter, borderRadius: diameter / 2 }]}>
          <Image
            source={require('../../../assets/arrow_icon.png')}
            style={[s.icon, direction === 'left' && { transform: [{ scaleX: -1 }] }]}
            resizeMode="contain"
          />
        </View>
      </PressableShadow>
    </TouchableOpacity>
  );
}

const s = StyleSheet.create({
  disabled: {
    opacity: 0.3,
  },
  circle: {
    backgroundColor: colors.white,
    borderWidth:     2,
    borderColor:     colors.black,
    alignItems:      'center',
    justifyContent:  'center',
  },
  icon: {
    width:  scale(24),
    height: scale(24),
  },
});
