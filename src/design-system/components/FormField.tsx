import React from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ViewStyle, KeyboardTypeOptions } from 'react-native';
import { colors, radii, fontSize, fontWeight, spacing } from '../tokens';

interface FormFieldProps {
  label: string;
  value: string;
  onChangeText?: (v: string) => void;
  placeholder?: string;
  keyboardType?: KeyboardTypeOptions;
  prefix?: string;          // e.g. "$" for rate input
  style?: ViewStyle;
}

interface DropdownFieldProps {
  label: string;
  value: string;
  onPress: () => void;
  style?: ViewStyle;
}

export function FormField({ label, value, onChangeText, placeholder, keyboardType, prefix, style }: FormFieldProps) {
  return (
    <View style={[s.wrap, style]}>
      <Text style={s.label}>{label}</Text>
      <View style={[s.inputRow, prefix ? s.inputRowWithPrefix : null]}>
        {prefix ? <Text style={s.prefix}>{prefix}</Text> : null}
        <TextInput
          style={[s.input, prefix ? s.inputWithPrefix : null]}
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder}
          placeholderTextColor={colors.hint}
          keyboardType={keyboardType}
        />
      </View>
    </View>
  );
}

export function DropdownField({ label, value, onPress, style }: DropdownFieldProps) {
  return (
    <View style={[s.wrap, style]}>
      <Text style={s.label}>{label}</Text>
      <TouchableOpacity style={s.dropdown} onPress={onPress} activeOpacity={0.7}>
        <Text style={s.dropdownValue}>{value}</Text>
        <Text style={s.caret}>▾</Text>
      </TouchableOpacity>
    </View>
  );
}

const s = StyleSheet.create({
  wrap: {
    gap: spacing.sm,
  },
  label: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.bold,
    color: colors.muted,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  inputRow: {
    borderWidth: 1.5,
    borderColor: colors.inputBorder,
    borderRadius: radii.md,
  },
  inputRowWithPrefix: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingLeft: 14,
  },
  prefix: {
    fontSize: fontSize.xl,
    fontWeight: fontWeight.semibold,
    color: colors.black,
  },
  input: {
    padding: 14,
    fontSize: fontSize.lg,
    color: colors.black,
    flex: 1,
  },
  inputWithPrefix: {
    paddingLeft: spacing.sm,
  },
  dropdown: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1.5,
    borderColor: colors.inputBorder,
    borderRadius: radii.md,
    padding: 14,
  },
  dropdownValue: {
    fontSize: fontSize.lg,
    color: colors.black,
  },
  caret: {
    fontSize: fontSize.base,
    color: colors.muted,
  },
});
