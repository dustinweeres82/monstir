/**
 * BottomSheet
 *
 * Reusable chrome for modal sheets — rounded top corners, drag handle,
 * black border (no bottom border), solid shadow.
 *
 * Wrap your sheet content in this; pair with an Animated.View for the
 * slide-up animation at the call site.
 */

import React from 'react';
import { View, StyleSheet, type ViewStyle } from 'react-native';
import { colors, radii, shadows } from '../tokens';

interface Props {
  children: React.ReactNode;
  style?:   ViewStyle;
}

export function BottomSheet({ children, style }: Props) {
  return (
    <View style={[s.sheet, style]}>
      <View style={s.handle} />
      {children}
    </View>
  );
}

const s = StyleSheet.create({
  sheet: {
    backgroundColor:     colors.white,
    borderTopLeftRadius:  radii.xxl,
    borderTopRightRadius: radii.xxl,
    borderWidth:         2,
    borderBottomWidth:   0,
    borderColor:         colors.black,
    paddingTop:          12,
    overflow:            'hidden',
    ...shadows.solid,
  },
  handle: {
    width:           40,
    height:          4,
    borderRadius:    2,
    backgroundColor: colors.inputBorder,
    alignSelf:       'center',
    marginBottom:    8,
  },
});
