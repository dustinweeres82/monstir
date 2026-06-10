import React, { useEffect, useRef } from 'react';
import { Animated, StyleSheet, TouchableOpacity } from 'react-native';
import { shadows } from '../tokens';

// Monstir lime toggle — chunky ink-bordered track, dark thumb, solid drop shadow.
const INK      = '#111111';
const LIME     = '#D8F52F';
const OFF_TRACK = '#E0E0E0';

interface Props {
  value: boolean;
  onValueChange: (next: boolean) => void;
  disabled?: boolean;
  /** Track height in px (track width and thumb scale from this). Default 30. */
  size?: number;
}

export function Toggle({ value, onValueChange, disabled, size = 30 }: Props) {
  const BORDER = 2;
  const height = size;
  const width  = Math.round(size * 1.87);          // 56:30 ratio
  const inset  = 3;                                 // padding inside the track
  const thumb  = height - BORDER * 2 - 4;           // fit inside borders with breathing room
  const travel = width - BORDER * 2 - inset * 2 - thumb;

  const anim = useRef(new Animated.Value(value ? 1 : 0)).current;
  useEffect(() => {
    Animated.timing(anim, {
      toValue: value ? 1 : 0,
      duration: 200,
      useNativeDriver: false,
    }).start();
  }, [value, anim]);

  return (
    <TouchableOpacity
      activeOpacity={0.8}
      disabled={disabled}
      onPress={() => onValueChange(!value)}
      style={[
        s.track,
        {
          width,
          height,
          borderRadius: height,
          paddingHorizontal: inset,
          backgroundColor: value ? LIME : OFF_TRACK,
          opacity: disabled ? 0.45 : 1,
        },
      ]}
    >
      <Animated.View
        style={[
          s.thumb,
          {
            width: thumb,
            height: thumb,
            borderRadius: thumb / 2,
            transform: [{ translateX: anim.interpolate({ inputRange: [0, 1], outputRange: [0, travel] }) }],
          },
        ]}
      />
    </TouchableOpacity>
  );
}

const s = StyleSheet.create({
  track: {
    borderWidth: 2,
    borderColor: INK,
    justifyContent: 'center',
    ...shadows.solidSm,
  },
  thumb: {
    backgroundColor: INK,
  },
});
