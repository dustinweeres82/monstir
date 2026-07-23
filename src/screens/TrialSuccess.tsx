// ─── Trial success (screen 6D) ────────────────────────────────────────────────
// Shown once control returns to the app after Apple's own StoreKit sheet (6B)
// and Face ID / side-button confirm (6C) complete a purchase. Purely a
// celebration + hand-off screen — no StoreKit calls happen here.
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { PressableShadow } from '../design-system/components/PressableShadow';
import { scale } from '../design-system/tokens';

const INK  = '#1A1A1A';
const LIME = '#C5F215';

export interface TrialSuccessProps {
  trialEndsAt: Date | null;
  onContinue: () => void;
}

export function TrialSuccess({ trialEndsAt, onContinue }: TrialSuccessProps) {
  const dateLabel = trialEndsAt
    ? trialEndsAt.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })
    : null;

  return (
    <View style={s.root}>
      <Text style={s.emoji}>🎉</Text>
      <Text style={s.title}>You're in!</Text>
      <Text style={s.subtitle}>Trial started</Text>
      <Text style={s.body}>
        {dateLabel
          ? <>Premium is on for the whole family through <Text style={s.bodyStrong}>{dateLabel}</Text>.</>
          : 'Premium is on for the whole family.'}
      </Text>

      <PressableShadow onPress={onContinue} depth={6} style={s.ctaOuter}>
        <View style={s.ctaInner}>
          <Text style={s.ctaText}>Continue</Text>
        </View>
      </PressableShadow>
    </View>
  );
}

const s = StyleSheet.create({
  root: {
    flex: 1, backgroundColor: '#6B35F0',
    alignItems: 'center', justifyContent: 'center',
    paddingHorizontal: scale(32),
  },
  emoji: { fontSize: scale(64), marginBottom: scale(16) },
  title: { fontFamily: 'FredokaOne_400Regular', fontSize: scale(36), color: '#FFFFFF', textAlign: 'center' },
  subtitle: { fontFamily: 'Inter_800ExtraBold', fontSize: scale(16), color: LIME, letterSpacing: 0.5, marginTop: scale(4), marginBottom: scale(18) },
  body: { fontFamily: 'Inter_500Medium', fontSize: scale(15), lineHeight: scale(22), color: 'rgba(255,255,255,0.9)', textAlign: 'center', marginBottom: scale(40) },
  bodyStrong: { fontFamily: 'Inter_800ExtraBold', color: '#FFFFFF' },
  ctaOuter: { width: '100%' },
  ctaInner: {
    backgroundColor: LIME, borderRadius: 100, borderWidth: 2.5, borderColor: INK,
    paddingVertical: scale(17), alignItems: 'center', justifyContent: 'center',
  },
  ctaText: { fontFamily: 'Inter_800ExtraBold', fontSize: scale(17), color: INK },
});
