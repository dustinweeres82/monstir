import React from 'react';
import { View, Text, Switch, StyleSheet, ViewStyle } from 'react-native';
import { colors, fontSize, fontWeight, spacing, scale } from '../tokens';

interface SettingsRowProps {
  title: string;
  subtitle?: string;
  right: React.ReactNode;
  style?: ViewStyle;
}

export function SettingsRow({ title, subtitle, right, style }: SettingsRowProps) {
  return (
    <View style={[s.row, style]}>
      <View style={s.text}>
        <Text style={s.title}>{title}</Text>
        {subtitle ? <Text style={s.subtitle}>{subtitle}</Text> : null}
      </View>
      {right}
    </View>
  );
}

interface ToggleRowProps {
  title: string;
  subtitle?: string;
  value: boolean;
  onValueChange: (v: boolean) => void;
  style?: ViewStyle;
}

export function ToggleRow({ title, subtitle, value, onValueChange, style }: ToggleRowProps) {
  return (
    <SettingsRow
      title={title}
      subtitle={subtitle}
      style={style}
      right={
        <Switch
          value={value}
          onValueChange={onValueChange}
          trackColor={{ false: colors.border, true: colors.green }}
          thumbColor={colors.white}
        />
      }
    />
  );
}

const s = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  text: {
    flex: 1,
  },
  title: {
    fontSize: fontSize.base,
    fontFamily: 'Inter_600SemiBold',
    color: colors.black,
    marginBottom: 2,
  },
  subtitle: {
    fontSize: fontSize.sm,
    color: colors.muted,
    lineHeight: scale(17),
  },
});
