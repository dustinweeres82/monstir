/**
 * SectionLabel
 *
 * Small all-caps Inter label used above form sections, bottom sheet headers,
 * and step counters. Maps to textStyles.sheetLabel.
 */

import React from 'react';
import { Text, type TextStyle } from 'react-native';
import { textStyles } from '../tokens';

interface Props {
  children: React.ReactNode;
  style?:   TextStyle;
}

export function SectionLabel({ children, style }: Props) {
  return (
    <Text style={[textStyles.sheetLabel, style]}>
      {children}
    </Text>
  );
}
