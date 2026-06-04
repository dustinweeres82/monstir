import React, { useRef } from 'react';
import { View, Text, TouchableOpacity, Animated, StyleSheet, ViewStyle } from 'react-native';
import { colors, fontSize, fontWeight, borders, spacing, radii, scale } from '../tokens';

interface ScreenHeaderProps {
  title: string;
  onBack?: () => void;
  right?: React.ReactNode;   // custom right slot
  onAdd?: () => void;        // convenience: renders a green "+" button
  onDelete?: () => void;     // convenience: renders a 🗑 button
  style?: ViewStyle;
}

function ScalePress({ onPress, style, children }: { onPress?: () => void; style?: any; children: React.ReactNode }) {
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const pressIn  = () => Animated.timing(scaleAnim, { toValue: 0.88, duration: 80, useNativeDriver: true }).start();
  const pressOut = () => Animated.spring(scaleAnim,  { toValue: 1, useNativeDriver: true, tension: 280, friction: 10 }).start();
  return (
    <TouchableOpacity onPress={onPress} onPressIn={pressIn} onPressOut={pressOut} activeOpacity={1} style={style}>
      <Animated.View style={{ transform: [{ scale: scaleAnim }] }}>{children}</Animated.View>
    </TouchableOpacity>
  );
}

export function ScreenHeader({ title, onBack, right, onAdd, onDelete, style }: ScreenHeaderProps) {
  const rightSlot = right ?? (
    onAdd ? (
      <ScalePress style={s.addBtn} onPress={onAdd}>
        <Text style={s.addBtnText}>+</Text>
      </ScalePress>
    ) : onDelete ? (
      <ScalePress style={s.iconBtn} onPress={onDelete}>
        <Text style={{ fontSize: scale(22) }}>🗑️</Text>
      </ScalePress>
    ) : (
      <View style={s.placeholder} />
    )
  );

  return (
    <View style={[s.root, style]}>
      {onBack ? (
        <ScalePress style={s.backBtn} onPress={onBack}>
          <Text style={s.backArrow}>←</Text>
        </ScalePress>
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
    fontFamily: 'Inter_800ExtraBold',
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
    fontSize: scale(22),
    color: colors.black,
    fontFamily: 'Inter_600SemiBold',
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
    fontSize: scale(22),
    color: colors.black,
    fontFamily: 'Inter_700Bold',
    lineHeight: scale(26),
  },
});
