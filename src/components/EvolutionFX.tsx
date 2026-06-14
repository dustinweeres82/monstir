import React, { useEffect, useRef, useState } from 'react';
import {
  View, Image, Text, StyleSheet, type LayoutChangeEvent,
  type ImageSourcePropType,
} from 'react-native';
import Svg, {
  Defs, RadialGradient, Stop, Circle, Rect as SvgRect,
} from 'react-native-svg';
import * as Haptics from 'expo-haptics';
import { scale } from '../design-system/tokens';

/**
 * MON-6 — in-place evolution moment FX.
 *
 * Rendered as an absolute-fill child of the real monster card, so it lines up
 * with the card by construction (no measured overlay, no coordinate-space drift).
 * It turns the card's background cosmic, cross-fades the old form out and the new
 * form in (the creature never moves), swells a glow, bursts a ring, rains
 * confetti, and drives the stat-plate states (name → "Evolving…" → new name,
 * level bump, lime status bar 0→100%). The host renders the full-screen chrome
 * dim + apex flash; this component calls `onApex` so the host can fire the flash,
 * and `onResolve` once the moment settles so the host opens the result modal.
 *
 * Animation is RAF-driven against a mutable ref — the pattern the rest of this
 * codebase uses for these set-piece moments.
 */

const CHARGE = 1600;            // cosmic backdrop + glow swell + old form fades out
const APEX   = 150;             // ring burst (host flashes)
const REVEAL = 1400;            // new form fades in
const TOTAL  = CHARGE + APEX + REVEAL;
const NAME_SWAP = CHARGE + APEX + REVEAL * 0.55; // name/level flip ~55% through reveal

// Pure easing
const easeOut    = (t: number) => 1 - (1 - t) ** 2;
const easeInOut  = (t: number) => (t < 0.5 ? 2 * t * t : 1 - (-2 * t + 2) ** 2 / 2);

const CONFETTI_COLORS = ['#C5F215', '#6B35F0', '#FFFFFF', '#FAF9F4', '#EAE4FF'];

interface Props {
  monsterAreaH:    number;        // fixed monster-area height at the top of the card (px)
  oldImg:          ImageSourcePropType;
  newImg:          ImageSourcePropType;
  platformImg:     ImageSourcePropType;
  platformAspect:  number;
  monsterSize:     number;
  monsterY:        number;
  platformSize:    number;
  platformY:       number;
  oldName:         string;
  newName:         string;
  oldLevel:        number;
  newLevel:        number;
  onApex:          () => void;
  onResolve:       () => void;
}

type Ring     = { id: number; r: number; alpha: number };
type Confetto = { id: number; x: number; y: number; vx: number; vy: number; rot: number; vr: number; w: number; h: number; color: string };

export function EvolutionFX({
  monsterAreaH,
  oldImg, newImg, platformImg, platformAspect,
  monsterSize, monsterY, platformSize, platformY,
  oldName, newName, oldLevel, newLevel,
  onApex, onResolve,
}: Props) {
  // Self-measured card size (no window coords → perfect alignment with the card).
  const [size, setSize] = useState({ w: 0, h: 0 });
  const onLayout = (e: LayoutChangeEvent) => {
    const { width, height } = e.nativeEvent.layout;
    setSize(prev => (prev.w === width && prev.h === height ? prev : { w: width, h: height }));
  };

  // Tweened scalars in a ref; the RAF loop re-renders via setTick.
  const v = useRef({
    cosmic: 0, glow: 0,
    oldOp: 1, newOp: 0, levelBump: 1,
    status: 0, swapped: false,
  }).current;

  const [, setTick]  = useState(0);
  const [rings,    setRings]    = useState<Ring[]>([]);
  const [confetti, setConfetti] = useState<Confetto[]>([]);
  const idRef     = useRef(0);
  const isMounted = useRef(true);
  useEffect(() => () => { isMounted.current = false; }, []);

  // RAF frame loop — advances ring/confetti physics and keeps the view in sync.
  useEffect(() => {
    let running = true;
    const frame = () => {
      if (!running) return;
      setRings(rs => rs.map(r => ({ ...r, r: r.r + 4, alpha: r.alpha - 0.02 })).filter(r => r.alpha > 0));
      setConfetti(cs =>
        cs.map(c => ({ ...c, x: c.x + c.vx, y: c.y + c.vy, vx: c.vx * 0.985, vy: c.vy + 0.35, rot: c.rot + c.vr }))
          .filter(c => c.y < monsterAreaH + 320)
      );
      if (isMounted.current) setTick(n => n + 1);
      requestAnimationFrame(frame);
    };
    requestAnimationFrame(frame);
    return () => { running = false; };
  }, []);

  const delay = (ms: number) => new Promise<void>(r => setTimeout(r, ms));
  const animV = (set: (x: number) => void, from: number, to: number, ms: number, ease = easeOut): Promise<void> =>
    new Promise(resolve => {
      const start = Date.now();
      const step = () => {
        const raw = Math.min(1, (Date.now() - start) / ms);
        set(from + (to - from) * ease(raw));
        if (raw < 1) requestAnimationFrame(step); else resolve();
      };
      requestAnimationFrame(step);
    });

  // A radial burst from the monster's centre — particles shoot outward in every
  // direction (upward-biased so they arc), then gravity + drag bring them down.
  const spawnConfetti = (w: number) => {
    if (!isMounted.current) return;
    const cx = w / 2;
    const cy = monsterAreaH * 0.46;
    const batch: Confetto[] = [];
    for (let i = 0; i < 78; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 5 + Math.random() * 13;
      batch.push({
        id: idRef.current++,
        x: cx,
        y: cy,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed - (3 + Math.random() * 4), // upward bias for the arc
        rot: Math.random() * 360,
        vr: (Math.random() - 0.5) * 32,
        w: 6 + Math.random() * 7,
        h: 9 + Math.random() * 9,
        color: CONFETTI_COLORS[i % CONFETTI_COLORS.length],
      });
    }
    setConfetti(prev => [...prev, ...batch]);
  };

  // Main choreography — runs once on mount.
  useEffect(() => {
    (async () => {
      // Charge: card background turns cosmic, glow swells, old form fades out.
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
      animV(x => { v.cosmic = x; }, 0, 1, CHARGE * 0.7, easeOut);
      animV(x => { v.glow = x; },   0, 1, CHARGE, easeInOut);
      animV(x => { v.oldOp = x; },  1, 0, CHARGE * 0.85, easeInOut);
      animV(x => { v.status = x; }, 0, 1, TOTAL, easeInOut); // status bar fills across the whole moment
      await delay(CHARGE);

      // Apex: ring burst + host flash. Heavy haptic.
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy).catch(() => {});
      onApex();
      setRings(prev => [...prev, { id: idRef.current++, r: 10, alpha: 0.95 }]);
      animV(x => { v.glow = x; }, 1, 0.5, REVEAL, easeOut);

      // Reveal: new form fades in.
      await animV(x => { v.newOp = x; }, 0, 1, REVEAL * 0.6, easeOut);
    })().catch(() => {});

    // Name/level swap + confetti at the locked timing, independent of the await chain.
    const swapAt = setTimeout(() => {
      if (!isMounted.current) return;
      v.swapped = true;
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
      animV(x => { v.levelBump = x; }, 1, 1.35, 160, easeOut)
        .then(() => animV(x => { v.levelBump = x; }, 1.35, 1, 220, easeOut));
      spawnConfetti(size.w || 320);
    }, NAME_SWAP);

    const resolveAt = setTimeout(() => { if (isMounted.current) onResolve(); }, TOTAL + 200);

    return () => { clearTimeout(swapAt); clearTimeout(resolveAt); };
  }, []);

  const cx = size.w / 2;
  const cy = monsterAreaH * 0.46;
  const displayName  = v.swapped ? newName : (v.cosmic > 0.05 ? 'Evolving…' : oldName);
  const displayLevel = v.swapped ? newLevel : oldLevel;

  return (
    <View style={StyleSheet.absoluteFill} onLayout={onLayout} pointerEvents="none">
      {/* Cosmic card background — fills the card, rounded to match its corners */}
      <View style={[StyleSheet.absoluteFill, styles.cosmicBg, { opacity: v.cosmic }]}>
        {size.w > 0 && (
          <Svg width={size.w} height={size.h} style={StyleSheet.absoluteFill}>
            <Defs>
              <RadialGradient id="cosmicBg" cx="50%" cy="36%" r="80%">
                <Stop offset="0"    stopColor="#3A1B6B" />
                <Stop offset="0.55" stopColor="#1C1040" />
                <Stop offset="1"    stopColor="#0A0814" />
              </RadialGradient>
            </Defs>
            <SvgRect x={0} y={0} width={size.w} height={size.h} fill="url(#cosmicBg)" />
            {STAR_DOTS.map((s, i) => (
              <Circle key={i} cx={s.x * size.w} cy={s.y * size.h} r={s.r}
                fill="#FFFFFF" opacity={0.45 + 0.45 * Math.abs(Math.sin(Date.now() / 600 + i))} />
            ))}
          </Svg>
        )}
      </View>

      {/* Monster area — glow, ring, both forms, confetti */}
      <View style={[styles.monsterArea, { height: monsterAreaH }]}>
        {size.w > 0 && (
          <Svg width={size.w} height={monsterAreaH} style={StyleSheet.absoluteFill}>
            <Defs>
              <RadialGradient id="glow" cx="50%" cy="46%" r="50%">
                <Stop offset="0"   stopColor="#B98CFF" stopOpacity={0.85} />
                <Stop offset="0.5" stopColor="#7B3FF2" stopOpacity={0.35} />
                <Stop offset="1"   stopColor="#7B3FF2" stopOpacity={0} />
              </RadialGradient>
            </Defs>
            <Circle cx={cx} cy={cy} r={70 + v.glow * 60} fill="url(#glow)" opacity={v.glow} />
            {rings.map(r => (
              <Circle key={r.id} cx={cx} cy={cy} r={r.r} fill="none"
                stroke={`rgba(197,242,21,${r.alpha})`} strokeWidth={4} />
            ))}
            {rings.map(r => (
              <Circle key={`w${r.id}`} cx={cx} cy={cy} r={r.r * 0.7} fill="none"
                stroke={`rgba(255,255,255,${r.alpha * 0.9})`} strokeWidth={2} />
            ))}
          </Svg>
        )}

        <MonsterSlot img={oldImg} opacity={v.oldOp}
          monsterSize={monsterSize} monsterY={monsterY}
          platformImg={platformImg} platformSize={platformSize} platformY={platformY} platformAspect={platformAspect} />
        <MonsterSlot img={newImg} opacity={v.newOp}
          monsterSize={monsterSize} monsterY={monsterY}
          platformImg={platformImg} platformSize={platformSize} platformY={platformY} platformAspect={platformAspect} />
      </View>

      {/* Stat plate — same geometry as the real one, on the cosmic background */}
      <View style={[styles.statArea, { top: monsterAreaH }]}>
        <View style={styles.statNameRow}>
          <Text style={styles.statName} numberOfLines={1}>{displayName}</Text>
          <View style={{ transform: [{ scale: v.levelBump }] }}>
            <Text style={styles.statLevel}>LEVEL {displayLevel}</Text>
          </View>
        </View>
        <View style={styles.statTrack}>
          <View style={[styles.statFill, { width: `${Math.round(v.status * 100)}%` }]} />
        </View>
      </View>

      {/* Confetti — full-card layer so the burst can travel past the monster area */}
      {size.w > 0 && (
        <Svg width={size.w} height={size.h} style={StyleSheet.absoluteFill} pointerEvents="none">
          {confetti.map(c => (
            <SvgRect key={c.id} x={-c.w / 2} y={-c.h / 2} width={c.w} height={c.h} rx={1.5}
              fill={c.color} opacity={0.95}
              transform={`translate(${c.x}, ${c.y}) rotate(${c.rot})`} />
          ))}
        </Svg>
      )}
    </View>
  );
}

// A single monster on its platform, rendered in the shared normalized slot so
// every form shares proportions/anchor (the creature never moves between forms).
function MonsterSlot({ img, opacity, monsterSize, monsterY, platformImg, platformSize, platformY, platformAspect }: {
  img: ImageSourcePropType; opacity: number;
  monsterSize: number; monsterY: number;
  platformImg: ImageSourcePropType; platformSize: number; platformY: number; platformAspect: number;
}) {
  return (
    <View style={[StyleSheet.absoluteFill, { alignItems: 'center', justifyContent: 'center', opacity }]} pointerEvents="none">
      <View style={{ alignItems: 'center' }}>
        <View style={{ transform: [{ translateY: monsterY }], zIndex: 2 }}>
          <Image source={img} style={{ width: monsterSize, height: monsterSize }} resizeMode="contain" />
        </View>
        <Image source={platformImg}
          style={{ width: platformSize, height: platformSize / platformAspect, marginTop: -60, zIndex: 1, transform: [{ translateY: platformY }] }}
          resizeMode="contain" />
      </View>
    </View>
  );
}

const STAR_DOTS = [
  { x: 0.18, y: 0.16, r: 1.6 }, { x: 0.74, y: 0.12, r: 2.0 }, { x: 0.86, y: 0.34, r: 1.4 },
  { x: 0.12, y: 0.44, r: 1.8 }, { x: 0.62, y: 0.52, r: 1.3 }, { x: 0.30, y: 0.62, r: 1.6 },
  { x: 0.88, y: 0.62, r: 1.5 }, { x: 0.46, y: 0.20, r: 1.2 },
];

const styles = StyleSheet.create({
  cosmicBg:    { borderRadius: 18, overflow: 'hidden' },
  monsterArea: { position: 'absolute', top: 0, left: 0, right: 0, overflow: 'hidden' },
  statArea:    { position: 'absolute', left: 0, right: 0, bottom: 0, paddingHorizontal: 14, paddingTop: 14 },
  statNameRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  statName:    { fontSize: scale(30), fontFamily: 'Inter_900Black', color: '#FAF9F4', flexShrink: 1 },
  statLevel:   { fontSize: scale(15), fontFamily: 'Inter_800ExtraBold', color: '#C5F215' },
  statTrack:   { height: 16, backgroundColor: '#1A1A1A', borderRadius: 100, overflow: 'hidden', borderWidth: 2, borderColor: '#1A1A1A' },
  statFill:    { height: '100%', backgroundColor: '#C5F215', borderRadius: 100 },
});
