// ─── Onboarding design kit (MON-85 re-skin) ─────────────────────────────────
// Shared building blocks that match the children-first HTML prototype
// (~/Downloads/monstir-signup-frontloaded.html). Scoped to the onboarding flow
// ONLY — we never mutate the app-wide Button / CreamBg / PressableShadow, which
// are used across the whole app. Display font reuses FredokaOne (already loaded
// at the app root); body = Nunito; codes/numerals = Space Mono.

import React, { useEffect, useRef } from 'react';
import {
  View, Text, StyleSheet, Animated, Easing, TouchableOpacity,
  Platform, ViewStyle, StyleProp,
} from 'react-native';
import Svg, { Defs, Pattern, Circle, Rect, Path } from 'react-native-svg';
import { scale } from '../../design-system/tokens';
import { PressableShadow } from '../../design-system/components/PressableShadow';

// ─── Tokens ──────────────────────────────────────────────────────────────────

export const obc = {
  purple:     '#7B3FF2',
  lime:       '#D8F52F',
  ink:        '#111111',
  cream:      '#FFFDF7',
  purpleSoft: '#EFE8FE',
  lavender:   '#E9E4F5',
  muted:      '#8A82A0',
  hint:       '#BDB6CC',
  white:      '#FFFFFF',
  radius:     18,
  // Font families (loaded at the app root useFonts call)
  display:     'FredokaOne_400Regular',
  body:        'Nunito_700Bold',
  bodySemi:    'Nunito_600SemiBold',
  bodyHeavy:   'Nunito_800ExtraBold',
  bodyReg:     'Nunito_400Regular',
  mono:        'SpaceMono_700Bold',
} as const;

export const cardShadow = Platform.select({
  ios:     { shadowColor: obc.ink, shadowOffset: { width: 3, height: 3 }, shadowOpacity: 1, shadowRadius: 0 },
  android: { elevation: 4 },
  default: {},
})!;

// ─── Dot-grid lavender background ────────────────────────────────────────────
// Prototype: background:#E9E4F5 + radial-gradient dot pattern, 22px tile.

export function DotGridBg({ children, style }: { children?: React.ReactNode; style?: StyleProp<ViewStyle> }) {
  return (
    <View style={[{ flex: 1, backgroundColor: obc.lavender }, style]}>
      <Svg style={StyleSheet.absoluteFill} width="100%" height="100%">
        <Defs>
          <Pattern id="obDots" x="0" y="0" width="22" height="22" patternUnits="userSpaceOnUse">
            <Circle cx="1.6" cy="1.6" r="1.1" fill={obc.ink} opacity={0.9} />
          </Pattern>
        </Defs>
        <Rect x="0" y="0" width="100%" height="100%" fill="url(#obDots)" />
      </Svg>
      {children}
    </View>
  );
}

// ─── Button (purple / lime / ghost) ──────────────────────────────────────────

type ObVariant = 'purple' | 'lime' | 'ghost' | 'secondary';

export function ObButton({
  label, onPress, variant = 'purple', disabled, style,
}: {
  label: string;
  onPress: () => void;
  variant?: ObVariant;
  disabled?: boolean;
  style?: StyleProp<ViewStyle>;
}) {
  // 'secondary' is an alias for the ghost (cream) treatment used by Back buttons.
  const ghost = variant === 'ghost' || variant === 'secondary';
  const bg    = variant === 'lime' ? obc.lime : ghost ? obc.cream : obc.purple;
  const color = variant === 'purple' ? obc.white : obc.ink;
  return (
    <PressableShadow onPress={onPress} disabled={disabled} depth={disabled ? 0 : 5} style={[{ width: '100%' } as ViewStyle, style as ViewStyle]}>
      <View style={[obs.btn, { backgroundColor: disabled ? '#DCDCDC' : bg, borderColor: disabled ? '#C0C0C0' : obc.ink }]}>
        <Text style={[obs.btnLabel, { color: disabled ? '#888888' : color }]}>{label}</Text>
      </View>
    </PressableShadow>
  );
}

// ─── Speech-bubble helper (purple monster head + lime bubble) ────────────────

export function Helper({ text, style }: { text: string; style?: StyleProp<ViewStyle> }) {
  return (
    <View style={[obs.helper, style]}>
      <Svg width={34} height={40} viewBox="0 0 34 40" style={{ marginTop: 4 }}>
        <Path d="M4 38 L8 14 L17 2 L26 14 L30 38 Z" fill={obc.purple} stroke={obc.ink} strokeWidth={3} strokeLinejoin="round" />
        <Circle cx={13} cy={20} r={2.4} fill="#fff" />
        <Circle cx={21} cy={20} r={2.4} fill="#fff" />
      </Svg>
      <View style={obs.helperBub}>
        <Text style={obs.helperText}>{text}</Text>
      </View>
    </View>
  );
}

// ─── Step dots (elongated active pill) ───────────────────────────────────────

export function StepDots({ step, total, style }: { step: number; total: number; style?: StyleProp<ViewStyle> }) {
  return (
    <View style={[obs.dots, style]}>
      {Array.from({ length: total }).map((_, i) => (
        <View key={i} style={[obs.dot, i + 1 === step && obs.dotOn]} />
      ))}
    </View>
  );
}

// ─── Lime tag / pill ─────────────────────────────────────────────────────────

export function Tag({ label, purple }: { label: string; purple?: boolean }) {
  return (
    <View style={[obs.tag, purple && { backgroundColor: obc.purple }]}>
      <Text style={[obs.tagText, purple && { color: '#fff' }]}>{label}</Text>
    </View>
  );
}

// ─── Top-right info dot ──────────────────────────────────────────────────────

export function InfoDot() {
  return (
    <View style={obs.infoDot}>
      <Text style={obs.infoDotText}>i</Text>
    </View>
  );
}

// ─── 6-cell code display ─────────────────────────────────────────────────────

export function CodeCells({ code, length = 6 }: { code: string; length?: number }) {
  return (
    <View style={obs.codeCells}>
      {Array.from({ length }).map((_, i) => (
        <View key={i} style={[obs.cell, !!code[i] && obs.cellFill]}>
          <Text style={obs.cellText}>{code[i] ?? ''}</Text>
        </View>
      ))}
    </View>
  );
}

// ─── Numeric keypad ──────────────────────────────────────────────────────────

export function Keypad({ onKey, onDelete }: { onKey: (d: string) => void; onDelete: () => void }) {
  const keys = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '', '0', 'del'];
  return (
    <View style={obs.keypad}>
      {keys.map((k, i) => {
        if (k === '') return <View key={i} style={obs.keyBlank} />;
        const del = k === 'del';
        return (
          <TouchableOpacity key={i} style={obs.key} activeOpacity={0.7} onPress={() => (del ? onDelete() : onKey(k))}>
            <Text style={obs.keyText}>{del ? '⌫' : k}</Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

// ─── Entrance animations (port of the prototype CSS keyframes) ───────────────

/** Whole-screen slide-in: opacity + translateX 14→0 (~280ms). */
export function ScreenEnter({ children, style }: { children: React.ReactNode; style?: StyleProp<ViewStyle> }) {
  const a = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.timing(a, { toValue: 1, duration: 280, easing: Easing.out(Easing.ease), useNativeDriver: true }).start();
  }, []);
  return (
    <Animated.View style={[{ flex: 1, opacity: a, transform: [{ translateX: a.interpolate({ inputRange: [0, 1], outputRange: [14, 0] }) }] }, style]}>
      {children}
    </Animated.View>
  );
}

/** Staggered element entrance — riseIn (translateY) or popIn (scale+overshoot). */
export function Rise({ children, delay = 0, pop = false, style }: { children: React.ReactNode; delay?: number; pop?: boolean; style?: StyleProp<ViewStyle> }) {
  const a = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.timing(a, {
      toValue: 1,
      duration: pop ? 460 : 400,
      delay,
      easing: pop ? Easing.out(Easing.back(1.4)) : Easing.out(Easing.ease),
      useNativeDriver: true,
    }).start();
  }, []);
  const transform = pop
    ? [{ scale: a.interpolate({ inputRange: [0, 1], outputRange: [0.82, 1] }) }, { translateY: a.interpolate({ inputRange: [0, 1], outputRange: [16, 0] }) }]
    : [{ translateY: a.interpolate({ inputRange: [0, 1], outputRange: [14, 0] }) }];
  return <Animated.View style={[{ opacity: a, transform }, style]}>{children}</Animated.View>;
}

// ─── Shared text styles ──────────────────────────────────────────────────────

export const obText = StyleSheet.create({
  title:    { fontFamily: obc.display, fontSize: scale(30), lineHeight: scale(33), color: obc.ink },
  titleSm:  { fontFamily: obc.display, fontSize: scale(24), lineHeight: scale(27), color: obc.ink },
  sub:      { fontFamily: obc.body, fontSize: scale(16), lineHeight: scale(22), color: obc.muted },
  logoWord: { fontFamily: obc.display, fontSize: scale(34), color: obc.ink, textAlign: 'center' },
});

// ─── Styles ──────────────────────────────────────────────────────────────────

const obs = StyleSheet.create({
  btn: {
    borderWidth: 3,
    borderColor: obc.ink,
    borderRadius: obc.radius,
    paddingVertical: 16,
    alignItems: 'center',
  },
  btnLabel: { fontFamily: obc.display, fontSize: scale(19), letterSpacing: 0.3 },

  // Helper bubble
  helper:    { flexDirection: 'row', gap: 10, alignItems: 'flex-start', marginBottom: 16 },
  helperBub: { flex: 1, backgroundColor: obc.lime, borderWidth: 3, borderColor: obc.ink, borderRadius: 16, paddingHorizontal: 14, paddingVertical: 12, ...cardShadow },
  helperText:{ fontFamily: obc.display, fontSize: scale(15), lineHeight: scale(19), color: obc.ink },

  // Step dots
  dots:  { flexDirection: 'row', gap: 8, justifyContent: 'center', alignItems: 'center', marginBottom: 14 },
  dot:   { width: 9, height: 9, borderRadius: 5, borderWidth: 2, borderColor: obc.ink, backgroundColor: '#fff' },
  dotOn: { width: 26, borderRadius: 6, backgroundColor: obc.purple },

  // Tag
  tag:     { alignSelf: 'flex-start', backgroundColor: obc.lime, borderWidth: 2, borderColor: obc.ink, borderRadius: 999, paddingHorizontal: 13, paddingVertical: 6 },
  tagText: { fontFamily: obc.display, fontSize: scale(14), color: obc.ink },

  // Info dot
  infoDot:     { width: 30, height: 30, borderRadius: 15, backgroundColor: '#CFC8E0', alignItems: 'center', justifyContent: 'center' },
  infoDotText: { color: '#fff', fontFamily: obc.bodyHeavy, fontStyle: 'italic', fontSize: scale(15) },

  // Code cells
  codeCells: { flexDirection: 'row', gap: 9, justifyContent: 'center', marginVertical: 18 },
  cell:      { width: 42, height: 54, borderWidth: 3, borderColor: obc.ink, borderRadius: 12, backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center', ...cardShadow },
  cellFill:  { backgroundColor: obc.purpleSoft },
  cellText:  { fontFamily: obc.display, fontSize: scale(28), color: obc.purple },

  // Keypad
  keypad:   { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', rowGap: 11 },
  key:      { width: '31%', borderWidth: 3, borderColor: obc.ink, borderRadius: 14, backgroundColor: obc.purpleSoft, paddingVertical: 13, alignItems: 'center', ...cardShadow },
  keyBlank: { width: '31%' },
  keyText:  { fontFamily: obc.display, fontSize: scale(26), color: obc.ink },
});
