import React from 'react';
import { View, Text, StyleSheet, Image, ViewStyle } from 'react-native';
import { scale } from '../design-system/tokens';
import { PressableShadow } from '../design-system/components/PressableShadow';

// ─── MON-87: shared parent-facing list row ──────────────────────────────────────
// One row, swappable slots. Same grid everywhere so titles always start at the
// same x and rows never drift. Behavioural source of truth: the Jun-16 prototype
// `monstir-cell-component.html` (four consumers: Family Status, Chores, Settings,
// Kids' Achievements).
//
// Typography rule (locked, MON-87): everything inside the cell uses Nunito —
// title 800, subtitle/tag 700/800, stat values 800. Space Mono is reserved for
// the small uppercase micro-labels in the trailing stat.

// Locked design tokens (from the prototype, not the older app palette).
const INK      = '#111111';
const CREAM    = '#FFFDF7';
const PURPLE   = '#7B3FF2';
const AMBER    = '#E8A11C';
const MUTED    = '#7A7A7A';
const DATE_GRN = '#3B8A3A';
const TRACK    = '#ECEAE4';

const MEDIA_BOX = 52; // fixed leading box — shape varies, box size does not.

type LeadingShape = 'avatar' | 'tile' | 'badge';

export interface CellProps {
  /** Leading media content (Image, emoji Text, icon). Rendered inside a fixed 52px box. */
  leading?:      React.ReactNode;
  /** avatar = circle, tile = rounded square (14px), badge = circle (achievement icons). */
  leadingShape?: LeadingShape;
  /** Fill colour for tile/badge shapes. */
  leadingBg?:    string;

  /** Attribution tag above the title (e.g. which kid earned an achievement). */
  tag?: { avatar?: React.ReactNode; name: string };

  title:     string;
  subtitle?: string;

  /** 0..1 — purple progress fill between title and subtitle (kid rows only). */
  progress?: number;

  /** Trailing content. Use one of the Cell.* helpers (Stat/Pill/Date/Chevron). */
  trailing?: React.ReactNode;

  onPress?: () => void;
  style?:   ViewStyle;
}

export function Cell({
  leading, leadingShape = 'tile', leadingBg = CREAM,
  tag, title, subtitle, progress, trailing, onPress, style,
}: CellProps) {
  const shapeStyle: ViewStyle =
    leadingShape === 'avatar' ? { borderRadius: MEDIA_BOX / 2 }
    : leadingShape === 'badge' ? { borderRadius: MEDIA_BOX / 2, backgroundColor: leadingBg }
    : { borderRadius: 14, backgroundColor: leadingBg };

  const inner = (
    <View style={[s.row, style]}>
      {leading != null && (
        <View style={[s.media, shapeStyle]}>{leading}</View>
      )}

      <View style={s.body}>
        {tag && (
          <View style={s.tag}>
            {tag.avatar != null && <View style={s.tagAvatar}>{tag.avatar}</View>}
            <Text style={s.tagName} numberOfLines={1}>{tag.name}</Text>
          </View>
        )}

        <Text style={s.title} numberOfLines={2}>{title}</Text>

        {progress != null && (
          <View style={s.progressTrack}>
            <View style={[s.progressFill, { width: `${Math.max(0, Math.min(1, progress)) * 100}%` }]} />
          </View>
        )}

        {subtitle ? <Text style={s.subtitle} numberOfLines={1}>{subtitle}</Text> : null}
      </View>

      {trailing != null && <View style={s.trailing}>{trailing}</View>}
    </View>
  );

  if (onPress) {
    return <PressableShadow onPress={onPress} depth={6}>{inner}</PressableShadow>;
  }
  return inner;
}

// ─── Trailing helpers ───────────────────────────────────────────────────────────

/** Two-line stat, e.g. "$3.75 owed" (amber) + "26 remaining" (muted). */
export function CellStat({ value, valueColor = AMBER, sub }: { value: string; valueColor?: string; sub?: string }) {
  return (
    <View style={{ alignItems: 'flex-end' }}>
      <Text style={[s.statValue, { color: valueColor }]} numberOfLines={1}>{value}</Text>
      {sub ? <Text style={s.statSub} numberOfLines={1}>{sub}</Text> : null}
    </View>
  );
}

/** Status pill, e.g. "Not done" / "Approved". Micro-label treatment (Space Mono). */
export function CellPill({ label, color = INK, bg = CREAM }: { label: string; color?: string; bg?: string }) {
  return (
    <View style={[s.pill, { backgroundColor: bg }]}>
      <Text style={[s.pillText, { color }]}>{label}</Text>
    </View>
  );
}

/** Date / time stamp, e.g. "Today" (green). */
export function CellDate({ label, color = DATE_GRN }: { label: string; color?: string }) {
  return <Text style={[s.date, { color }]} numberOfLines={1}>{label}</Text>;
}

export function CellChevron() {
  return <Text style={s.chevron}>›</Text>;
}

const s = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: CREAM,
    borderRadius: 18,
    borderWidth: 3,
    borderColor: INK,
    padding: 12,
    gap: 12,
    // Locked offset shadow: 0px 6px 0px ink.
    shadowColor: INK, shadowOffset: { width: 0, height: 6 }, shadowOpacity: 1, shadowRadius: 0, elevation: 6,
  },
  media: {
    width: MEDIA_BOX,
    height: MEDIA_BOX,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    flexShrink: 0,
  },
  body: { flex: 1 },
  tag: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 4 },
  tagAvatar: { width: 22, height: 22, borderRadius: 11, overflow: 'hidden' },
  tagName: { fontFamily: 'Nunito_800ExtraBold', fontSize: scale(12), color: PURPLE, flexShrink: 1 },
  title: { fontFamily: 'Nunito_800ExtraBold', fontSize: scale(18), lineHeight: scale(22), color: INK },
  subtitle: { fontFamily: 'Nunito_700Bold', fontSize: scale(13.5), color: MUTED, marginTop: 2 },
  progressTrack: { height: 8, borderRadius: 4, backgroundColor: TRACK, marginTop: 6, marginBottom: 2, overflow: 'hidden' },
  progressFill: { height: '100%', borderRadius: 4, backgroundColor: PURPLE },
  trailing: { flexShrink: 0, alignItems: 'flex-end', justifyContent: 'center' },
  statValue: { fontFamily: 'Nunito_800ExtraBold', fontSize: scale(15), color: AMBER },
  statSub: { fontFamily: 'Nunito_700Bold', fontSize: scale(12), color: MUTED, marginTop: 2 },
  pill: {
    borderRadius: 999, borderWidth: 2, borderColor: INK,
    paddingHorizontal: 10, paddingVertical: 5,
  },
  pillText: { fontFamily: 'SpaceMono_700Bold', fontSize: scale(10), letterSpacing: 0.5, textTransform: 'uppercase' },
  date: { fontFamily: 'Nunito_700Bold', fontSize: scale(13), color: DATE_GRN },
  chevron: { fontFamily: 'Nunito_700Bold', fontSize: scale(22), color: MUTED },
});
