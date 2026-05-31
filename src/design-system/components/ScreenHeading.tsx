/**
 * ScreenHeading
 *
 * Large Fredoka One heading with a solid black stroke + card-style drop shadow.
 *
 * ## Why width:'100%' on the stroke copies
 * Absolutely-positioned Text nodes in React Native are sized to their
 * intrinsic content width. That means textAlign:'center' has no effect
 * on them — the text just sits at the left edge. Adding width:'100%'
 * makes each copy span the full parent width so centering works, and
 * the left/top offset correctly shifts the text by exactly dx/dy pixels
 * relative to the centered fill layer.
 *
 * ## strokeRadius
 * Default 6px, tuned for the 64px heading size (≈9% of font size).
 * Pass a smaller value when using a smaller fontSize — e.g. strokeRadius={3}
 * at ~40px keeps the ring proportionate and avoids the bloated-stroke look.
 *
 * ## Drop shadow
 * The shadow offset should sit outside the stroke ring so it peeks out on
 * the bottom-right. Default (7, 10) works for the 64px / 6px-stroke combo.
 * Scale it down alongside strokeRadius for smaller headings.
 */

import React, { useMemo } from 'react';
import { StyleProp, Text, TextStyle, View, ViewStyle } from 'react-native';
import { textStyles, colors } from '../tokens';

function buildStrokeOffsets(radius: number): [number, number][] {
  const pts: [number, number][] = [];
  const r2 = radius * radius;
  for (let dx = -radius; dx <= radius; dx++) {
    for (let dy = -radius; dy <= radius; dy++) {
      if ((dx !== 0 || dy !== 0) && dx * dx + dy * dy <= r2) {
        pts.push([dx, dy]);
      }
    }
  }
  return pts;
}

interface Props {
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  textStyle?: TextStyle;
  /**
   * Stroke ring radius in pixels (default 6).
   * Rule of thumb: ~9% of fontSize.
   *   64px text → strokeRadius 6 (default)
   *   40px text → strokeRadius 4
   *   32px text → strokeRadius 3
   */
  strokeRadius?: number;
  /** Hard drop shadow offset. Defaults to { x: 7, y: 10 } at strokeRadius 6. */
  dropShadow?: { x: number; y: number };
  /** Force single-line with auto-shrink. Pass 1 to keep heading on one line. */
  numberOfLines?: number;
}

export function ScreenHeading({ children, style, textStyle, strokeRadius = 6, dropShadow, numberOfLines }: Props) {
  const shadow = dropShadow ?? { x: Math.round(strokeRadius * 1.2), y: Math.round(strokeRadius * 1.7) };

  const offsets = useMemo(() => buildStrokeOffsets(strokeRadius), [strokeRadius]);

  const base: TextStyle = {
    ...textStyles.screenHeading,
    ...textStyle,
  };

  return (
    <View style={style} accessible accessibilityRole="header">
      {offsets.map(([dx, dy], i) => (
        <Text
          key={i}
          accessible={false}
          adjustsFontSizeToFit
          minimumFontScale={0.5}
          numberOfLines={numberOfLines}
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

      <Text
        adjustsFontSizeToFit
        minimumFontScale={0.6}
        numberOfLines={numberOfLines}
        style={[
          base,
          {
            color: textStyle?.color ?? colors.white,
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
