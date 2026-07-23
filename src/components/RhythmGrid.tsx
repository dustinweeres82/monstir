import React from 'react';
import { View, Text } from 'react-native';
import { scale } from '../design-system/tokens';

const INK = '#1A1A1A';

export type CellStatus = 'done' | 'partial' | 'missed' | 'future';

export interface RhythmKidRow {
  name: string;
  emoji: string;
  autoApprove: boolean;
  /** Monday → Sunday, exactly 7 entries. */
  days: CellStatus[];
}

const DAY_LABELS = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];
const SUNDAY_IDX = 6;

const CELL_FILL: Record<Exclude<CellStatus, 'future'>, string> = {
  done:    '#C5F215',
  partial: '#EAF2C0',
  missed:  '#E2DFD7',
};

const LEGEND: { status: CellStatus; label: string }[] = [
  { status: 'done',    label: 'All done' },
  { status: 'partial', label: 'Partial' },
  { status: 'missed',  label: 'Missed' },
  { status: 'future',  label: 'Ahead' },
];

function Cell({ status, accent }: { status: CellStatus; accent?: boolean }) {
  const size = scale(26);
  if (status === 'future') {
    return (
      <View style={{
        width: size, height: size, borderRadius: scale(7), borderWidth: 2, borderStyle: 'dashed',
        borderColor: accent ? '#6B35F0' : '#C9C6BE', backgroundColor: 'transparent',
      }} />
    );
  }
  return (
    <View style={{
      width: size, height: size, borderRadius: scale(7), borderWidth: 2, borderColor: INK,
      backgroundColor: CELL_FILL[status],
    }} />
  );
}

/** The Weekly Rhythm card: one 7-day (Mon–Sun) completion row per kid. */
export function RhythmGrid({ kids }: { kids: RhythmKidRow[] }) {
  return (
    <View style={{ backgroundColor: '#FAF9F4', borderRadius: scale(18), borderWidth: 2.5, borderColor: INK, padding: scale(14), gap: scale(12) }}>
      <Text style={{ fontSize: scale(13), fontFamily: 'Inter_800ExtraBold', letterSpacing: 0.6, textTransform: 'uppercase', color: INK }}>
        Weekly Rhythm
      </Text>

      {/* Day-label header — aligned with the kid-name column below */}
      <View style={{ flexDirection: 'row', alignItems: 'center' }}>
        <View style={{ width: scale(84) }} />
        <View style={{ flex: 1, flexDirection: 'row', justifyContent: 'space-between' }}>
          {DAY_LABELS.map((label, i) => (
            <Text key={i} style={{
              width: scale(26), textAlign: 'center', fontSize: scale(11), fontFamily: 'SpaceMono_700Bold',
              color: i === SUNDAY_IDX ? '#6B35F0' : '#767676',
            }}>
              {label}
            </Text>
          ))}
        </View>
      </View>

      {/* One row per kid */}
      <View style={{ gap: scale(10) }}>
        {kids.map(k => (
          <View key={k.name} style={{ flexDirection: 'row', alignItems: 'center' }}>
            <View style={{ width: scale(84), flexDirection: 'row', alignItems: 'center', gap: scale(6) }}>
              <Text style={{ fontSize: scale(14) }}>{k.emoji}</Text>
              <Text numberOfLines={1} style={{ flexShrink: 1, fontSize: scale(13), fontFamily: 'Inter_700Bold', color: INK }}>{k.name}</Text>
            </View>
            <View style={{ flex: 1, flexDirection: 'row', justifyContent: 'space-between' }}>
              {k.days.map((status, i) => <Cell key={i} status={status} accent={i === SUNDAY_IDX} />)}
            </View>
          </View>
        ))}
      </View>

      {/* Legend */}
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: scale(12), marginTop: scale(2) }}>
        {LEGEND.map(l => (
          <View key={l.status} style={{ flexDirection: 'row', alignItems: 'center', gap: scale(6) }}>
            <Cell status={l.status} />
            <Text style={{ fontSize: scale(11), fontFamily: 'Inter_600SemiBold', color: '#767676' }}>{l.label}</Text>
          </View>
        ))}
      </View>
    </View>
  );
}
