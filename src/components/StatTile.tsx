import React from 'react';
import { View, Text } from 'react-native';
import { scale } from '../design-system/tokens';

const INK = '#1A1A1A';
// Flat: surfaces carry no shadow, only CTA buttons do. These inline props weren't
// platform-gated, so they were the one shadow that did render on web — the reason
// the stat tiles looked shadowed there while every other surface was flat.
const SOLID_SHADOW = {} as const;

export type StatTileVariant = 'purple' | 'lime' | 'white' | 'loss';

const VARIANT_BG: Record<StatTileVariant, string> = {
  purple: '#6B35F0',
  lime:   '#C5F215',
  white:  '#FFFFFF',
  loss:   '#FFE0E0',
};
const VARIANT_TEXT: Record<StatTileVariant, string> = {
  purple: '#FFFFFF',
  lime:   INK,
  white:  INK,
  loss:   INK,
};

/** One of the Weekly Home stat-trio cards (To Approve / Owed Out / Done). */
export function StatTile({ label, value, variant, badge, trailingGlyph }: {
  label: string;
  value: string;
  variant: StatTileVariant;
  /** Small alert count shown as a corner badge (e.g. a "backed up" queue). */
  badge?: number;
  /** Optional small glyph next to the value, e.g. '↗' on Owed Out. */
  trailingGlyph?: string;
}) {
  return (
    <View style={{
      flex: 1, borderRadius: scale(16), borderWidth: 2.5, borderColor: INK,
      backgroundColor: VARIANT_BG[variant], padding: scale(12), gap: scale(4), ...SOLID_SHADOW,
    }}>
      {badge != null && badge > 0 && (
        <View style={{
          position: 'absolute', top: -scale(8), right: -scale(8), minWidth: scale(22), height: scale(22),
          borderRadius: scale(11), borderWidth: 2, borderColor: INK, backgroundColor: '#FF5B5B',
          alignItems: 'center', justifyContent: 'center', paddingHorizontal: scale(4),
        }}>
          <Text style={{ fontSize: scale(11), fontFamily: 'Inter_800ExtraBold', color: '#FFFFFF' }}>{badge}</Text>
        </View>
      )}
      <Text style={{ fontSize: scale(11), fontFamily: 'Inter_800ExtraBold', letterSpacing: 0.6, textTransform: 'uppercase', color: VARIANT_TEXT[variant], opacity: 0.8 }}>
        {label}
      </Text>
      <View style={{ flexDirection: 'row', alignItems: 'flex-end', gap: scale(4) }}>
        <Text style={{ fontSize: scale(26), fontFamily: 'FredokaOne_400Regular', color: VARIANT_TEXT[variant] }}>{value}</Text>
        {trailingGlyph && <Text style={{ fontSize: scale(16), color: VARIANT_TEXT[variant], marginBottom: scale(3) }}>{trailingGlyph}</Text>}
      </View>
    </View>
  );
}
