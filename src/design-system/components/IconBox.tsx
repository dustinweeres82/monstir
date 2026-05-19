import React from 'react';
import { View, Text, StyleSheet, ViewStyle } from 'react-native';
import { radii } from '../tokens';

type Size = 'sm' | 'md' | 'lg' | 'xl';

interface IconBoxProps {
  icon: string;
  bg: string;
  size?: Size;
  style?: ViewStyle;
}

const dimensions: Record<Size, { box: number; font: number; radius: number }> = {
  sm: { box: 36, font: 17, radius: radii.sm  },
  md: { box: 52, font: 28, radius: radii.md  },
  lg: { box: 58, font: 30, radius: radii.md  },
  xl: { box: 96, font: 52, radius: radii.xl  },
};

export function IconBox({ icon, bg, size = 'md', style }: IconBoxProps) {
  const d = dimensions[size];
  return (
    <View style={[
      s.base,
      { width: d.box, height: d.box, borderRadius: d.radius, backgroundColor: bg },
      style,
    ]}>
      <Text style={{ fontSize: d.font }}>{icon}</Text>
    </View>
  );
}

const s = StyleSheet.create({
  base: {
    alignItems: 'center',
    justifyContent: 'center',
  },
});
