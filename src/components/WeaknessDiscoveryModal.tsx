import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Platform } from 'react-native';
import { scale } from '../design-system/tokens';

// ─── Reward popup modal ─────────────────────────────────────────────────────────
// A reusable celebratory popup (lime tile, ink border, offset shadow) styled off
// the evolve-result modal + ScreenIntroCard. Used for the MON-82 weakness
// discovery and the MON-19 random shard drop.

const INK    = '#111111';
const CREAM  = '#FFFDF7';
const PURPLE = '#7B3FF2';
const LIME   = '#D8F52F';
const MUTED  = '#5A5A5A';

const shadow = (h: number) =>
  Platform.select({
    ios:     { shadowColor: INK, shadowOffset: { width: 0, height: h }, shadowOpacity: 1, shadowRadius: 0 },
    android: { elevation: h },
    default: {},
  })!;

// Generic reward popup. `body` is a ReactNode so callers can highlight words
// with <RewardModalStrong>.
export interface RewardModalProps {
  visible: boolean;
  icon:    string;
  title:   string;
  body:    React.ReactNode;
  onClose: () => void;
}

// Rendered as an in-tree absolute overlay (NOT a native <Modal>) on purpose: a
// transparent RN Modal can leave a residual UITransitionView on iOS that swallows
// touches after dismissal — which froze chore taps. An in-tree View unmounts
// cleanly, so touches pass straight through once it's gone.
export function RewardModal({ visible, icon, title, body, onClose }: RewardModalProps) {
  if (!visible) return null;
  return (
    <View style={s.overlay}>
      <View style={s.card}>
        <View style={s.iconTile}>
          <Text style={s.iconEmoji}>{icon}</Text>
        </View>

        <Text style={s.title}>{title}</Text>

        <Text style={s.body}>{body}</Text>

        <TouchableOpacity style={s.okBtn} onPress={onClose} activeOpacity={0.85}>
          <Text style={s.okText}>OK</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

// Bold/coloured run for use inside a RewardModal `body`.
export function RewardModalStrong({ children }: { children: React.ReactNode }) {
  return <Text style={s.bodyStrong}>{children}</Text>;
}

export interface WeaknessDiscoveryModalProps {
  visible:      boolean;
  bossName:     string;
  weaknessName: string;
  weaknessIcon: string;
  onClose:      () => void;
}

export function WeaknessDiscoveryModal({ visible, bossName, weaknessName, weaknessIcon, onClose }: WeaknessDiscoveryModalProps) {
  return (
    <RewardModal
      visible={visible}
      icon={weaknessIcon}
      title="Weakness discovered!"
      onClose={onClose}
      body={<>{bossName} is weak to <RewardModalStrong>{weaknessName}</RewardModalStrong>.{'\n'}Use it in your next boss battle!</>}
    />
  );
}

const s = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFill,
    zIndex: 1000, elevation: 1000,
    backgroundColor: 'rgba(0,0,0,0.55)',
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  card: {
    backgroundColor: CREAM,
    borderRadius: 24,
    borderWidth: 3,
    borderColor: INK,
    padding: 24,
    gap: 16,
    alignItems: 'center',
    ...shadow(7),
  },
  iconTile: {
    width: 88,
    height: 88,
    backgroundColor: LIME,
    borderWidth: 3,
    borderColor: INK,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    ...shadow(5),
  },
  iconEmoji: { fontSize: scale(44), lineHeight: scale(52) },
  title: { fontFamily: 'FredokaOne_400Regular', fontSize: scale(25), color: INK, textAlign: 'center' },
  body: { fontFamily: 'Nunito_700Bold', fontSize: scale(15.5), lineHeight: scale(22), color: MUTED, textAlign: 'center' },
  bodyStrong: { fontFamily: 'Nunito_800ExtraBold', color: PURPLE },
  okBtn: {
    alignSelf: 'stretch',
    backgroundColor: PURPLE,
    borderRadius: 16,
    borderWidth: 3,
    borderColor: INK,
    paddingVertical: 16,
    alignItems: 'center',
    ...shadow(5),
  },
  okText: { fontFamily: 'Nunito_800ExtraBold', fontSize: scale(17), color: '#FFFFFF' },
});
