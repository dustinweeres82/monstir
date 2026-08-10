import React from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet, ViewStyle, KeyboardTypeOptions,
} from 'react-native';
import { colors, radii, fontSize, spacing, shadows } from '../tokens';

const INK  = '#1A1A1A';
const MUTED = '#ABABAB';
const HINT  = '#C0BEB8';
const WHITE = '#FFFFFF';

// Monstir solid drop-shadow (smaller variant for form elements)
// Flat: form fields are surfaces, not buttons.
const FIELD_SHADOW = {};

// ─── FormField ────────────────────────────────────────────────────────────────
// Self-contained card: white bg, 2px ink border, solid shadow, label + input.
// Matches the app's formCard/formInput visual language.

interface FormFieldProps {
  label: string;
  value: string;
  onChangeText?: (v: string) => void;
  placeholder?: string;
  keyboardType?: KeyboardTypeOptions;
  secureTextEntry?: boolean;
  autoCapitalize?: 'none' | 'sentences' | 'words' | 'characters';
  /** Prefix symbol inside the input (e.g. "$") */
  prefix?: string;
  /** Allow multiple lines of text input */
  multiline?: boolean;
  numberOfLines?: number;
  /** Disable editing (read-only display) */
  editable?: boolean;
  style?: ViewStyle;
}

export function FormField({
  label, value, onChangeText, placeholder, keyboardType,
  secureTextEntry, autoCapitalize, prefix, multiline, numberOfLines, editable = true, style,
}: FormFieldProps) {
  return (
    <View style={[s.card, style]}>
      <Text style={s.label}>{label}</Text>
      <View style={[s.inputRow, prefix ? s.inputRowPrefixed : null, !editable && s.inputRowDisabled]}>
        {prefix ? <Text style={s.prefix}>{prefix}</Text> : null}
        <TextInput
          style={[s.input, prefix ? s.inputPrefixed : null, multiline && s.inputMultiline]}
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder}
          placeholderTextColor={HINT}
          keyboardType={keyboardType}
          secureTextEntry={secureTextEntry}
          autoCapitalize={autoCapitalize}
          multiline={multiline}
          numberOfLines={numberOfLines}
          editable={editable}
        />
      </View>
    </View>
  );
}

// ─── DropdownField ────────────────────────────────────────────────────────────
// Same card chrome as FormField; tapping anywhere opens the picker.

interface DropdownFieldProps {
  label: string;
  value: string;
  onPress: () => void;
  style?: ViewStyle;
}

export function DropdownField({ label, value, onPress, style }: DropdownFieldProps) {
  return (
    <View style={[s.card, style]}>
      <Text style={s.label}>{label}</Text>
      <TouchableOpacity style={s.dropdown} onPress={onPress} activeOpacity={0.7}>
        <Text style={s.dropdownValue}>{value}</Text>
        <Text style={s.caret}>▾</Text>
      </TouchableOpacity>
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const s = StyleSheet.create({
  card: {
    backgroundColor: WHITE,
    borderRadius: radii.lg,       // 14
    borderWidth: 2,
    borderColor: INK,
    padding: spacing.md,          // 16
    gap: spacing.sm,              // 8
    ...FIELD_SHADOW,
  },
  label: {
    fontSize: fontSize.sm,        // 12
    fontFamily: 'Inter_700Bold',
    color: MUTED,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  inputRow: {
    borderWidth: 2,
    borderColor: INK,
    borderRadius: radii.sm,       // 8
    backgroundColor: WHITE,
  },
  inputRowPrefixed: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingLeft: 14,
  },
  inputRowDisabled: {
    backgroundColor: '#F7F6F2',
    borderColor: '#D0CEC8',
  },
  prefix: {
    fontSize: fontSize.lg,        // 16
    fontFamily: 'Inter_600SemiBold',
    color: INK,
  },
  input: {
    padding: 14,
    fontSize: fontSize.lg,        // 16
    fontFamily: 'Inter_600SemiBold',
    color: INK,
    flex: 1,
  },
  inputPrefixed: {
    paddingLeft: spacing.sm,
  },
  inputMultiline: {
    textAlignVertical: 'top',
    minHeight: 80,
  },
  dropdown: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 2,
    borderColor: INK,
    borderRadius: radii.sm,
    padding: 14,
    backgroundColor: WHITE,
  },
  dropdownValue: {
    fontSize: fontSize.lg,
    fontFamily: 'Inter_600SemiBold',
    color: INK,
    flex: 1,
  },
  caret: {
    fontSize: fontSize.base,
    color: MUTED,
  },
});
