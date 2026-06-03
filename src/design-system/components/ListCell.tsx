import React from 'react';
import { View, Text, StyleSheet, ViewStyle } from 'react-native';
import { colors, fontSize, scale, radii, shadows } from '../tokens';
import { PressableShadow } from './PressableShadow';

interface ListCellProps {
  icon:      React.ReactNode;
  iconBg?:   string;
  title:     string;
  subtitle?: string;
  right?:    React.ReactNode;
  onPress?:  () => void;
  style?:    ViewStyle;
}

export function ListCell({ icon, iconBg = colors.cream, title, subtitle, right, onPress, style }: ListCellProps) {
  const inner = (
    <View style={[s.row, style]}>
      <View style={[s.iconWrap, { backgroundColor: iconBg }]}>{icon}</View>
      <View style={s.info}>
        <Text style={s.title} numberOfLines={1}>{title}</Text>
        {subtitle ? <Text style={s.subtitle} numberOfLines={1}>{subtitle}</Text> : null}
      </View>
      {right ? <View>{right}</View> : null}
    </View>
  );

  if (onPress) {
    return (
      <PressableShadow onPress={onPress}>
        {inner}
      </PressableShadow>
    );
  }

  return inner;
}

const s = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.cream,
    borderRadius: radii.xl,
    borderWidth: 2,
    borderColor: colors.black,
    padding: 12,
    gap: 12,
    ...shadows.solid,
  },
  iconWrap: {
    width: 58,
    height: 58,
    borderRadius: radii.lg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  info: {
    flex: 1,
  },
  title: {
    fontSize: fontSize.xl,
    fontFamily: 'Inter_700Bold',
    color: colors.black,
    marginBottom: 3,
  },
  subtitle: {
    fontSize: fontSize.sm,
    fontFamily: 'Inter_600SemiBold',
    color: colors.muted,
  },
});
