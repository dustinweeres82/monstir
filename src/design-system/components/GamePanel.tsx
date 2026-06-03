/**
 * GamePanel
 *
 * Cream-background card used by battle mini-games.
 * Rounded corners, 2.5px black border, hard shadow, consistent padding.
 */

import React from 'react';
import { View, StyleSheet, type ViewStyle } from 'react-native';
import { scale, colors, radii, shadows } from '../tokens';

interface Props {
  children: React.ReactNode;
  style?:   ViewStyle;
  padding?: number;
}

export function GamePanel({ children, style, padding = 20 }: Props) {
  return (
    <View style={[s.panel, { padding: scale(padding) }, style]}>
      {children}
    </View>
  );
}

const s = StyleSheet.create({
  panel: {
    backgroundColor: colors.cream,
    borderRadius:    scale(20),
    borderWidth:     2.5,
    borderColor:     colors.black,
    alignItems:      'center',
    gap:             scale(16),
    ...shadows.solid,
  },
});
