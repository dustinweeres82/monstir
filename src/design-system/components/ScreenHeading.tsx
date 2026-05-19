/**
 * ScreenHeading
 *
 * Large Fredoka One heading with a solid 6-px black stroke + card-style
 * drop shadow.
 *
 * ## Why width:'100%' on the stroke copies
 * Absolutely-positioned Text nodes in React Native are sized to their
 * intrinsic content width. That means textAlign:'center' has no effect
 * on them — the text just sits at the left edge. Adding width:'100%'
 * makes each copy span the full parent width so centering works, and
 * the left/top offset correctly shifts the text by exactly dx/dy pixels
 * relative to the centered fill layer.
 *
 * ## Drop shadow
 * offset (5,6) has magnitude ≈7.8 px, comfortably outside the 6-px
 * stroke radius, so it peeks out on the bottom-right matching the hard
 * card shadow direction (same 3:4 ratio as the card's 3,4 offset).
 */

import React from 'react';
import { StyleProp, Text, TextStyle, View, ViewStyle } from 'react-native';
import { textStyles, colors } from '../tokens';

// All integer (dx, dy) with dx²+dy² ≤ 36 — fills a solid 6-px ring.
const STROKE_OFFSETS: [number, number][] = (() => {
  const pts: [number, number][] = [];
  for (let dx = -6; dx <= 6; dx++) {
    for (let dy = -6; dy <= 6; dy++) {
      if ((dx !== 0 || dy !== 0) && dx * dx + dy * dy <= 36) {
        pts.push([dx, dy]);
      }
    }
  }
  return pts;
})();

interface Props {
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  textStyle?: TextStyle;
  /** Hard drop shadow offset (default { x: 5, y: 6 }) */
  dropShadow?: { x: number; y: number };
}

export function ScreenHeading({ children, style, textStyle, dropShadow }: Props) {
  const shadow = dropShadow ?? { x: 7, y: 10 };
  const base: TextStyle = {
    ...textStyles.screenHeading,
    ...textStyle,
  };

  return (
    <View style={style} accessible accessibilityRole="header">
      {/*
       * Stroke copies.
       * width:'100%' is the critical fix — it makes textAlign:'center'
       * work on absolute nodes so they center in the same position as
       * the fill text. left/top then shift by exactly dx/dy px.
       */}
      {STROKE_OFFSETS.map(([dx, dy], i) => (
        <Text
          key={i}
          accessible={false}
          style={[base, {
            position: 'absolute',
            width: '100%',
            color: colors.black,
            left: dx,
            top: dy,
          }]}
        >
          {children}
        </Text>
      ))}

      {/*
       * Fill layer — normal flow, sizes the View.
       * Drop shadow at (5,6): magnitude ≈7.8, outside the 6-px stroke
       * so it shows as a visible hard shadow on the bottom-right.
       */}
      <Text
        style={[
          base,
          {
            color: colors.white,
            textShadowColor: colors.black,
            textShadowOffset: { width: shadow.x, height: shadow.y },
            textShadowRadius: 0,
          },
        ]}
      >
        {children}
      </Text>
    </View>
  );
}
