/**
 * DebugPanel — floating drag-and-drop positioning tool for dev builds.
 *
 * Renders nothing in production (__DEV__ === false).
 *
 * Usage:
 *   const [headingTop, setHeadingTop] = useState(28);
 *   const [monsterSize, setMonsterSize] = useState(200);
 *
 *   <DebugPanel controls={[
 *     { label: 'Heading top',   value: headingTop,   onChange: setHeadingTop,   min: 0,   max: 120 },
 *     { label: 'Monster size',  value: monsterSize,  onChange: setMonsterSize,  min: 80,  max: 400 },
 *   ]} />
 *
 * Tap the ⚙ pill to expand. Drag the header bar to reposition the panel.
 * Tap "📋 Values" to see a formatted block you can paste here.
 */

import React, { useRef, useState } from 'react';
import {
  Animated,
  Dimensions,
  PanResponder,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';

const { width: SW, height: SH } = Dimensions.get('window');

// ─── Public types ─────────────────────────────────────────────────────────────

export interface DebugControl {
  /** Display label shown in the panel */
  label: string;
  /** Current value */
  value: number;
  /** Called when the user adjusts the value */
  onChange: (v: number) => void;
  /** Smallest allowed value (default −9999) */
  min?: number;
  /** Largest allowed value (default 9999) */
  max?: number;
  /** How much ±1 / ±10 buttons change value by (default 1) */
  step?: number;
  /** Decimal places shown (default 0) */
  decimals?: number;
}

interface Props {
  controls: DebugControl[];
  /** Panel title (default "Debug") */
  title?: string;
  /** Starting position from right edge (default 16) */
  initialRight?: number;
  /** Starting position from top (default 120) */
  initialTop?: number;
}

// ─── Component ────────────────────────────────────────────────────────────────

export function DebugPanel({
  controls,
  title = 'Debug',
  initialRight = 16,
  initialTop = 120,
}: Props) {
  if (!__DEV__) return null;

  const [expanded, setExpanded] = useState(false);
  const [showValues, setShowValues] = useState(false);

  // Draggable position — starts top-right, can be dragged anywhere
  const pos = useRef(
    new Animated.ValueXY({ x: SW - 180 - initialRight, y: initialTop })
  ).current;

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onPanResponderGrant: () => {
        pos.setOffset({
          x: (pos.x as any)._value,
          y: (pos.y as any)._value,
        });
        pos.setValue({ x: 0, y: 0 });
      },
      onPanResponderMove: Animated.event(
        [null, { dx: pos.x, dy: pos.y }],
        { useNativeDriver: false }
      ),
      onPanResponderRelease: () => {
        pos.flattenOffset();
      },
    })
  ).current;

  // ── Value adjustment ──
  function adjust(ctrl: DebugControl, delta: number) {
    const step = ctrl.step ?? 1;
    const raw  = ctrl.value + delta * step;
    const clamped = Math.max(ctrl.min ?? -9999, Math.min(ctrl.max ?? 9999, raw));
    ctrl.onChange(clamped);
  }

  // ── Formatted output for copy-paste ──
  const formattedValues = controls
    .map((c) => {
      const dp   = c.decimals ?? 0;
      const val  = c.value.toFixed(dp);
      return `${c.label}: ${val}`;
    })
    .join('\n');

  // ─── Render ───────────────────────────────────────────────────────────────

  return (
    <Animated.View
      style={[
        s.panel,
        expanded ? s.panelExpanded : s.panelCollapsed,
        { transform: pos.getTranslateTransform() },
      ]}
      pointerEvents="box-none"
    >
      {/* ── Drag handle / header ── */}
      <View style={s.header} {...panResponder.panHandlers}>
        <Text style={s.gripDots}>⠿</Text>
        <Text style={s.title} numberOfLines={1}>{title}</Text>
        <TouchableOpacity
          onPress={() => { setExpanded(!expanded); setShowValues(false); }}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <Text style={s.toggle}>{expanded ? '▾' : '▸'}</Text>
        </TouchableOpacity>
      </View>

      {/* ── Controls ── */}
      {expanded && (
        <>
          <ScrollView
            style={{ maxHeight: SH * 0.55 }}
            contentContainerStyle={s.body}
            showsVerticalScrollIndicator={false}
            nestedScrollEnabled
          >
            {controls.map((ctrl, i) => {
              const dp  = ctrl.decimals ?? 0;
              const val = ctrl.value.toFixed(dp);
              return (
                <View key={i} style={s.row}>
                  <Text style={s.label} numberOfLines={1}>{ctrl.label}</Text>
                  <View style={s.stepper}>
                    <StepBtn label="−10" onPress={() => adjust(ctrl, -10)} />
                    <StepBtn label="−1"  onPress={() => adjust(ctrl, -1)}  />
                    <Text style={s.val}>{val}</Text>
                    <StepBtn label="+1"  onPress={() => adjust(ctrl, 1)}   />
                    <StepBtn label="+10" onPress={() => adjust(ctrl, 10)}  />
                  </View>
                </View>
              );
            })}
          </ScrollView>

          {/* ── Copy output ── */}
          <TouchableOpacity
            style={s.copyBtn}
            onPress={() => setShowValues(!showValues)}
            activeOpacity={0.8}
          >
            <Text style={s.copyBtnTxt}>
              {showValues ? '▾  Hide values' : '📋  Show values'}
            </Text>
          </TouchableOpacity>

          {showValues && (
            <View style={s.valuesBox}>
              <Text style={s.valuesText} selectable>
                {formattedValues}
              </Text>
            </View>
          )}
        </>
      )}
    </Animated.View>
  );
}

// ─── Step button ─────────────────────────────────────────────────────────────

function StepBtn({ label, onPress }: { label: string; onPress: () => void }) {
  return (
    <TouchableOpacity style={s.stepBtn} onPress={onPress} activeOpacity={0.7}>
      <Text style={s.stepBtnTxt}>{label}</Text>
    </TouchableOpacity>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const s = StyleSheet.create({
  panel: {
    position:        'absolute',
    zIndex:          9999,
    elevation:       9999,
    backgroundColor: 'rgba(20,20,20,0.93)',
    borderRadius:    12,
    borderWidth:     1,
    borderColor:     'rgba(255,255,255,0.15)',
    overflow:        'hidden',
  },
  panelCollapsed: {
    width:  160,
  },
  panelExpanded: {
    width:  260,
  },

  // ── Header
  header: {
    flexDirection:   'row',
    alignItems:      'center',
    paddingVertical:  8,
    paddingHorizontal: 10,
    gap:              6,
    backgroundColor: 'rgba(255,255,255,0.07)',
  },
  gripDots: {
    fontSize: 14,
    color:    'rgba(255,255,255,0.4)',
    width:    14,
  },
  title: {
    flex:       1,
    fontSize:   12,
    fontWeight: '700',
    color:      '#fff',
    letterSpacing: 0.6,
  },
  toggle: {
    fontSize: 14,
    color:    'rgba(255,255,255,0.7)',
  },

  // ── Body
  body: {
    paddingVertical:   6,
    paddingHorizontal: 10,
    gap:               8,
  },
  row: {
    gap: 4,
  },
  label: {
    fontSize:   10,
    fontWeight: '600',
    color:      'rgba(255,255,255,0.55)',
    letterSpacing: 0.4,
    textTransform: 'uppercase',
  },
  stepper: {
    flexDirection:  'row',
    alignItems:     'center',
    gap:             4,
  },
  stepBtn: {
    backgroundColor: 'rgba(255,255,255,0.12)',
    borderRadius:    5,
    paddingVertical:  3,
    paddingHorizontal: 6,
  },
  stepBtnTxt: {
    fontSize:   11,
    fontWeight: '700',
    color:      '#fff',
  },
  val: {
    flex:       1,
    textAlign:  'center',
    fontSize:   13,
    fontWeight: '800',
    color:      '#C5F215',   // lime green — easy to read
    fontVariant: ['tabular-nums'],
  },

  // ── Copy section
  copyBtn: {
    margin:           10,
    marginTop:         4,
    backgroundColor:  'rgba(255,255,255,0.1)',
    borderRadius:     7,
    paddingVertical:   8,
    alignItems:       'center',
  },
  copyBtnTxt: {
    fontSize:   12,
    fontWeight: '700',
    color:      '#fff',
  },
  valuesBox: {
    backgroundColor:  'rgba(0,0,0,0.5)',
    marginHorizontal: 10,
    marginBottom:     10,
    borderRadius:     7,
    padding:          10,
  },
  valuesText: {
    fontSize:    11,
    color:       '#C5F215',
    lineHeight:  18,
    fontFamily:  'monospace',
  },
});
