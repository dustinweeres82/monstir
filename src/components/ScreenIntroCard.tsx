import React from 'react';
import { View, Text, StyleSheet, Platform } from 'react-native';
import { scale } from '../design-system/tokens';

// ─── MON-87: settings sub-screen intro banner ───────────────────────────────────
// The intro banner at the top of each settings sub-screen. Replaces three one-off
// banners (Chore Approval, Battle & bonuses, Pay rates) with one component.
// Behavioural source of truth: the Jun-16 prototype `monstir-intro-card.html`.

// Locked design tokens (MON-87).
const INK      = '#111111';
const PURPLE   = '#7B3FF2';   // Monstir Purple (brighter than the legacy #6B35F0)
const LIME     = '#D8F52F';   // Slime Lime — icon tile
const LAVENDER = '#E3D8FB';   // banner body copy

export interface ScreenIntroCardProps {
  /** Centred inside the lime icon tile (emoji Text, Image, or icon node). */
  icon:  React.ReactNode;
  title: string;
  body:  string;
}

export function ScreenIntroCard({ icon, title, body }: ScreenIntroCardProps) {
  return (
    <View style={s.card}>
      <View style={s.iconTile}>{icon}</View>
      <View style={{ flex: 1 }}>
        <Text style={s.title}>{title}</Text>
        <Text style={s.body}>{body}</Text>
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  card: {
    backgroundColor: PURPLE,
    borderRadius: 22,
    borderWidth: 3,
    borderColor: INK,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    // Locked offset shadow: 0px 7px 0px ink.
    ...Platform.select({
      ios:     { shadowColor: INK, shadowOffset: { width: 0, height: 7 }, shadowOpacity: 1, shadowRadius: 0 },
      android: { elevation: 7 },
      default: {},
    }),
  },
  iconTile: {
    width: 62,
    height: 62,
    backgroundColor: LIME,
    borderWidth: 3,
    borderColor: INK,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
    // Locked offset shadow: 0px 5px 0px ink.
    ...Platform.select({
      ios:     { shadowColor: INK, shadowOffset: { width: 0, height: 5 }, shadowOpacity: 1, shadowRadius: 0 },
      android: { elevation: 5 },
      default: {},
    }),
  },
  title: { fontFamily: 'FredokaOne_400Regular', fontSize: scale(25), color: '#FFFFFF' },
  body:  { fontFamily: 'Nunito_700Bold', fontSize: scale(15.5), color: LAVENDER, marginTop: 4, lineHeight: scale(21) },
});
