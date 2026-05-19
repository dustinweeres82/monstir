import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ViewStyle } from 'react-native';
import { colors, fontSize, fontWeight, borders, spacing, radii } from '../tokens';

interface ScreenHeaderProps {
  title: string;
  onBack?: () => void;
  right?: React.ReactNode;   // custom right slot
  onAdd?: () => void;        // convenience: renders a green "+" button
  onDelete?: () => void;     // convenience: renders a 🗑 button
  style?: ViewStyle;
}

export function ScreenHeader({ title, onBack, right, onAdd, onDelete, style }: ScreenHeaderProps) {
  const rightSlot = right ?? (
    onAdd ? (
      <TouchableOpacity style={s.addBtn} onPress={onAdd} activeOpacity={0.8}>
        <Text style={s.addBtnText}>+</Text>
      </TouchableOpacity>
    ) : onDelete ? (
      <TouchableOpacity style={s.iconBtn} onPress={onDelete} activeOpacity={0.7}>
        <Text style={{ fontSize: 22 }}>🗑️</Text>
      </TouchableOpacity>
    ) : (
      <View style={s.placeholder} />
    )
  );

  return (
    <View style={[s.root, style]}>
      {onBack ? (
        <TouchableOpacity style={s.backBtn} onPress={onBack} activeOpacity={0.7}>
          <Text style={s.backArrow}>←</Text>
        </TouchableOpacity>
      ) : (
        <View style={s.placeholder} />
      )}
      <Text style={s.title} numberOfLines={1}>{title}</Text>
      {rightSlot}
    </View>
  );
}

const s = StyleSheet.create({
  root: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    backgroundColor: colors.white,
  },
  title: {
    flex: 1,
    fontSize: fontSize.xxl,
    fontWeight: fontWeight.heavy,
    color: colors.black,
    textAlign: 'center',
  },
  backBtn: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  backArrow: {
    fontSize: 22,
    color: colors.black,
    fontWeight: fontWeight.semibold,
  },
  placeholder: {
    width: 40,
  },
  iconBtn: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  addBtn: {
    width: 40,
    height: 40,
    borderRadius: radii.sm + 2,
    backgroundColor: colors.green,
    ...borders.medium,
    alignItems: 'center',
    justifyContent: 'center',
  },
  addBtnText: {
    fontSize: 22,
    color: colors.black,
    fontWeight: fontWeight.bold,
    lineHeight: 26,
  },
});
