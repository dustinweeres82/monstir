import React, { useEffect, useRef, useState } from 'react';
import {
  View, Image, Text, StyleSheet, Dimensions, TouchableOpacity,
  type ImageSourcePropType,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Svg, {
  Defs, LinearGradient as SvgGrad, Stop, Polygon, Circle, Ellipse, Line,
} from 'react-native-svg';
import { scale } from '../design-system/tokens';

const { width: W, height: H } = Dimensions.get('window');
const CX        = W / 2;
const MONSTER_Y = H * 0.50; // monster + rings centre
const BEAM_Y    = H * 0.583 - 20; // fixed landing point (monster feet)

interface Props {
  monsterBefore: ImageSourcePropType;
  monsterAfter:  ImageSourcePropType;
  onComplete:    () => void;
  visible:       boolean;
}
type Ring     = { r: number; alpha: number; id: number };
type Particle = { id: number; x: number; y: number; vx: number; vy: number; r: number; color: string; alpha: number };

// Pure easing functions
const easeOut   = (t: number) => 1 - (1 - t) ** 2;
const easeInOut = (t: number) => t < 0.5 ? 2 * t * t : 1 - (-2 * t + 2) ** 2 / 2;
const easeOut5  = (t: number) => 1 - (1 - t) ** 5;

export function EvolutionAnimation({ monsterBefore, monsterAfter, onComplete, visible }: Props) {
  // All animation state lives in a mutable ref — driven by the RAF loop via setTick
  const v = useRef({
    t: 0, bobActive: false,
    bgDark: 0, chargeRing: 0,
    beamH: 0, beamI: 0, flare: 0,
    purpleFlash: 0, whiteFlash: 0,
    shakeX: 0, shakeY: 0,
    beforeOp: 1, afterOp: 0, afterSc: 0,
    bannerOp: 0, ctaOp: 0,
  }).current;

  const [particles, setParticles] = useState<Particle[]>([]);
  const [rings,     setRings]     = useState<Ring[]>([]);
  const [, setTick] = useState(0);
  const idRef     = useRef(0);
  const isMounted = useRef(true);
  useEffect(() => () => { isMounted.current = false; }, []);

  // RAF frame loop — keeps SVG in sync at 60fps
  useEffect(() => {
    if (!visible) return;
    let running = true;
    const frame = () => {
      if (!running) return;
      v.t += 0.025;
      setParticles(p =>
        p.map(q => ({ ...q, x: q.x + q.vx, y: q.y + q.vy, vy: q.vy + 0.08, alpha: q.alpha - 0.011 }))
          .filter(q => q.alpha > 0)
      );
      setRings(r =>
        r.map(q => ({ ...q, r: q.r + 2.8, alpha: q.alpha - 0.016 }))
          .filter(q => q.alpha > 0)
      );
      if (isMounted.current) setTick(n => n + 1);
      requestAnimationFrame(frame);
    };
    requestAnimationFrame(frame);
    return () => { running = false; };
  }, [visible]);

  const delay = (ms: number) => new Promise<void>(r => setTimeout(r, ms));

  // RAF-driven tween — updates v property smoothly, RAF loop renders it
  const animV = (setter: (val: number) => void, from: number, to: number, ms: number, ease = easeOut): Promise<void> =>
    new Promise(resolve => {
      const start = Date.now();
      const step = () => {
        const raw = Math.min(1, (Date.now() - start) / ms);
        setter(from + (to - from) * ease(raw));
        if (raw < 1) requestAnimationFrame(step);
        else resolve();
      };
      requestAnimationFrame(step);
    });

  const doShake = (amp: number, duration: number) => {
    const start = Date.now();
    const tick = () => {
      if (!isMounted.current || Date.now() - start >= duration) {
        v.shakeX = 0; v.shakeY = 0; return;
      }
      const decay = 1 - (Date.now() - start) / duration;
      v.shakeX = (Math.random() - 0.5) * amp * 2 * decay;
      v.shakeY = (Math.random() - 0.5) * amp * 2 * decay;
      setTimeout(tick, 28);
    };
    tick();
  };

  const spawnRing = () => {
    if (!isMounted.current) return;
    setRings(prev => [...prev, { r: 8, alpha: 0.9, id: idRef.current++ }]);
  };

  const spawnParticles = () => {
    if (!isMounted.current) return;
    const cols = ['#a855f7', '#9333ea', '#7c3aed', '#c084fc', '#d8b4fe', '#ffffff', '#e9d5ff', '#6d28d9', '#c5f215'];
    const batch: Particle[] = [];
    for (let i = 0; i < 30; i++) {
      const a = (i / 30) * Math.PI * 2, spd = 6 + Math.random() * 12;
      batch.push({ id: idRef.current++, x: CX, y: BEAM_Y, vx: Math.cos(a) * spd, vy: Math.sin(a) * spd - 4, r: 5 + Math.random() * 10, color: cols[i % cols.length], alpha: 1 });
    }
    for (let i = 0; i < 22; i++) {
      batch.push({ id: idRef.current++, x: CX + (Math.random() - 0.5) * 130, y: BEAM_Y - Math.random() * 90, vx: (Math.random() - 0.5) * 5, vy: -(8 + Math.random() * 11), r: 3 + Math.random() * 7, color: cols[Math.floor(Math.random() * cols.length)], alpha: 1 });
    }
    for (let i = 0; i < 12; i++) {
      const a = Math.random() * Math.PI * 2, spd = 2 + Math.random() * 5;
      batch.push({ id: idRef.current++, x: CX + (Math.random() - 0.5) * 50, y: BEAM_Y + (Math.random() - 0.5) * 50, vx: Math.cos(a) * spd, vy: Math.sin(a) * spd - 1, r: 10 + Math.random() * 11, color: i % 2 === 0 ? '#7c3aed' : '#a855f7', alpha: 0.85 });
    }
    setParticles(prev => [...prev, ...batch]);
  };

  // Main sequence
  useEffect(() => {
    if (!visible) return;

    Object.assign(v, {
      t: 0, bobActive: false,
      bgDark: 0, chargeRing: 0, beamH: 0, beamI: 0, flare: 0,
      purpleFlash: 0, whiteFlash: 0, shakeX: 0, shakeY: 0,
      beforeOp: 1, afterOp: 0, afterSc: 0, bannerOp: 0, ctaOp: 0,
    });
    setParticles([]);
    setRings([]);

    (async () => {
      // Phase 1: Atmosphere + charge (1300ms)
      animV(x => { v.bgDark = x; },     0, 1,   1300, easeInOut);
      animV(x => { v.chargeRing = x; }, 0, 1,   1300, easeOut);
      animV(x => { v.flare = x; },      0, 0.4,  900, easeOut);
      await delay(1300);

      // Rings cut off, brief beat before beam
      v.chargeRing = 0;
      await delay(180);

      // Phase 2: Beam fires (210ms)
      animV(x => { v.beamH = x; }, 0, BEAM_Y, 210, easeOut5);
      animV(x => { v.beamI = x; }, 0, 0.75,   195, easeOut);
      animV(x => { v.flare = x; }, 0.4, 1,    195, easeOut);
      await delay(220);

      // Phase 3: Hold + shake
      doShake(5, 700);
      spawnRing(); spawnRing();
      await delay(200);
      spawnRing();
      animV(x => { v.beamI = x; }, 0.75, 1, 200, easeOut);
      await delay(200);
      spawnRing();
      await delay(200);

      // Phase 4: Purple pre-flash → white MEGA-FLASH
      doShake(34, 900);
      animV(x => { v.purpleFlash = x; }, 0, 1,    80, easeOut5);
      animV(x => { v.beamI = x; },       1, 2.5,  80, easeOut);
      animV(x => { v.flare = x; },       1, 2.2,  80, easeOut);
      await delay(80);

      animV(x => { v.whiteFlash = x; },  0, 1,   100, easeOut5);
      animV(x => { v.purpleFlash = x; }, 1, 0,   100, easeOut);
      animV(x => { v.beamI = x; },       2.5, 0, 100, easeOut);
      animV(x => { v.flare = x; },       2.2, 0, 100, easeOut);
      animV(x => { v.beforeOp = x; },    1, 0,   100, easeOut);
      await delay(100);

      spawnParticles(); spawnParticles();
      for (let i = 0; i < 6; i++) spawnRing();
      await delay(80);

      // Phase 5: Reveal evolved monster (spring-like overshoot)
      animV(x => { v.whiteFlash = x; }, 1, 0,   750, easeOut);
      animV(x => { v.chargeRing = x; }, 1, 0,   400, easeOut);
      animV(x => { v.bgDark = x; },     1, 0.3, 800, easeOut);
      await delay(40);
      animV(x => { v.afterOp = x; }, 0, 1, 450, easeOut);
      await animV(x => { v.afterSc = x; }, 0, 1.2, 280, easeOut5);
      await animV(x => { v.afterSc = x; }, 1.2, 1, 380, easeOut);
      v.bobActive = true;
      await delay(200);

      // Phase 6: Banner + CTA
      await animV(x => { v.bannerOp = x; }, 0, 1, 420, easeOut);
      await delay(460);
      await animV(x => { v.ctaOp = x; }, 0, 1, 300, easeOut);
    })().catch(() => {});
  }, [visible]);

  if (!visible) return null;

  const { t, chargeRing: cr } = v;
  const bh     = Math.max(0, v.beamH);
  const biOver = Math.max(0, v.beamI); // can exceed 1 during overdrive

  return (
    <View style={[StyleSheet.absoluteFill, styles.root, { transform: [{ translateX: v.shakeX }, { translateY: v.shakeY }] }]}>

      {/* Layer 0: Static dark base */}
      <View style={[StyleSheet.absoluteFill, { backgroundColor: '#0a0814' }]} />

      {/* Layer 1: Animated dark overlay */}
      <View style={[StyleSheet.absoluteFill, { backgroundColor: '#000000', opacity: v.bgDark }]} />

      {/* Layer 2: Atmosphere gradient */}
      <LinearGradient
        colors={['rgba(120,40,220,0.4)', 'transparent']}
        start={{ x: 0.5, y: 0 }}
        end={{ x: 0.5, y: 1 }}
        style={[StyleSheet.absoluteFill, { height: H * 0.65 }]}
        pointerEvents="none"
      />

      {/* Layer 3a: SVG — rings and tendrils (below beam) */}
      <Svg width={W} height={H} style={StyleSheet.absoluteFill} pointerEvents="none">
        {/* Charge rings — centred on monster */}
        {[0, 1, 2, 3, 4, 5].map(i => (
          <Circle key={i} cx={CX} cy={MONSTER_Y}
            r={70 + i * 18 + Math.sin(t * 4 + i) * 5}
            fill="none"
            stroke={`rgba(190,140,255,${cr * (0.28 - i * 0.04)})`}
            strokeWidth={2.5 + i * 0.4}
          />
        ))}

        {/* Energy tendrils — centred on monster */}
        {Array.from({ length: 12 }, (_, i) => {
          const a = (i / 12) * Math.PI * 2 + t * 1.2;
          const d = 135 + cr * 22;
          return (
            <Line key={i}
              x1={CX + Math.cos(a) * d} y1={MONSTER_Y + Math.sin(a) * d}
              x2={CX + Math.cos(a) * 52} y2={MONSTER_Y + Math.sin(a) * 52}
              stroke={`rgba(220,180,255,${cr * 0.55})`} strokeWidth={2}
            />
          );
        })}

        {/* Ground shockwave rings — at beam landing */}
        {rings.map(r => (
          <Circle key={r.id} cx={CX} cy={BEAM_Y + 20} r={r.r}
            fill="none" stroke={`rgba(168,85,247,${r.alpha})`} strokeWidth={2.5}
          />
        ))}

        {/* Source flare at top edge — in bottom layer so beam overlaps it */}
        <Ellipse cx={CX} cy={0} rx={Math.min(W * 0.92, 160 + v.flare * 140)} ry={Math.min(220, 160 + v.flare * 140)} fill="rgba(155,75,250,1)" opacity={Math.min(0.65, v.flare * 0.55)} />
        <Ellipse cx={CX} cy={0} rx={90 + v.flare * 65} ry={90 + v.flare * 65} fill="rgba(220,170,255,1)" opacity={Math.min(0.85, v.flare * 0.8)} />
        <Circle  cx={CX} cy={0} r={36} fill="rgba(255,255,255,1)" opacity={Math.min(1, v.flare)} />

        {/* Anamorphic horizontal streak */}
        <Line x1={0} y1={3} x2={W} y2={3} stroke="rgba(255,255,255,1)" strokeWidth={2.5} opacity={Math.min(0.75, v.flare * 0.7)} />
        <Line x1={0} y1={3} x2={W} y2={3} stroke="rgba(200,160,255,1)" strokeWidth={18}  opacity={Math.min(0.35, v.flare * 0.3)} />
      </Svg>

      {/* Layer 3b: SVG — beam, bloom, particles (above everything) */}
      <Svg width={W} height={H} style={StyleSheet.absoluteFill} pointerEvents="none">
        <Defs>
          {/* Wide beam: transparent purple → white centre → transparent purple */}
          <SvgGrad id="beamH" x1={CX - 140} y1="0" x2={CX + 140} y2="0" gradientUnits="userSpaceOnUse">
            <Stop offset="0"    stopColor="#6d28d9" stopOpacity="0" />
            <Stop offset="0.28" stopColor="#a855f7" stopOpacity="0.55" />
            <Stop offset="0.44" stopColor="#e9d5ff" stopOpacity="0.9" />
            <Stop offset="0.5"  stopColor="#ffffff"  stopOpacity="1" />
            <Stop offset="0.56" stopColor="#e9d5ff" stopOpacity="0.9" />
            <Stop offset="0.72" stopColor="#a855f7" stopOpacity="0.55" />
            <Stop offset="1"    stopColor="#6d28d9" stopOpacity="0" />
          </SvgGrad>
          {/* Beam core: solid white centre strip */}
          <SvgGrad id="beamCore" x1={CX - 28} y1="0" x2={CX + 28} y2="0" gradientUnits="userSpaceOnUse">
            <Stop offset="0"   stopColor="#a855f7" stopOpacity="0" />
            <Stop offset="0.3" stopColor="#e9d5ff" stopOpacity="0.9" />
            <Stop offset="0.5" stopColor="#ffffff"  stopOpacity="1" />
            <Stop offset="0.7" stopColor="#e9d5ff" stopOpacity="0.9" />
            <Stop offset="1"   stopColor="#a855f7" stopOpacity="0" />
          </SvgGrad>
        </Defs>

        {/* Impact bloom */}
        {bh > 0 && <>
          <Ellipse cx={CX} cy={bh} rx={200} ry={58}  fill="rgba(168,85,247,1)" opacity={Math.min(1, biOver * 0.42)} />
          <Ellipse cx={CX} cy={bh} rx={100} ry={30}  fill="rgba(220,180,255,1)" opacity={Math.min(1, biOver * 0.72)} />
          <Ellipse cx={CX} cy={bh} rx={44}  ry={16}  fill="rgba(255,255,255,1)" opacity={Math.min(1, biOver * 0.95)} />
        </>}

        {/* Beam wide glow */}
        {bh > 0 && (
          <Polygon
            points={`${CX - 4},0 ${CX + 4},0 ${CX + 140},${bh} ${CX - 140},${bh}`}
            fill="url(#beamH)"
            opacity={Math.min(1, biOver)}
          />
        )}
        {/* Beam core — opaque centre strip on top */}
        {bh > 0 && (
          <Polygon
            points={`${CX - 2},0 ${CX + 2},0 ${CX + 28},${bh} ${CX - 28},${bh}`}
            fill="url(#beamCore)"
            opacity={Math.min(1, biOver)}
          />
        )}

        {/* Particles */}
        {particles.map(p => (
          <Circle key={p.id} cx={p.x} cy={p.y} r={p.r} fill={p.color} opacity={Math.max(0, p.alpha)} />
        ))}
      </Svg>

      {/* Layer 4: Monster glow halo */}
      <LinearGradient
        colors={['transparent', 'rgba(168,85,247,0.35)', 'rgba(107,53,240,0.18)', 'transparent']}
        start={{ x: 0.5, y: 0 }}
        end={{ x: 0.5, y: 1 }}
        style={styles.monsterGlow}
        pointerEvents="none"
      />

      {/* Layer 5: Old monster */}
      <View style={[styles.monsterWrap, { top: MONSTER_Y - 230, opacity: v.beforeOp }]}>
        <Image
          source={monsterBefore}
          style={[styles.monsterImg, { mixBlendMode: 'screen' } as any]}
          resizeMode="contain"
        />
      </View>

      {/* Layer 6: New monster */}
      <View style={[styles.monsterWrap, { top: MONSTER_Y - 240, opacity: v.afterOp, transform: [{ scale: Math.max(0.001, v.afterSc) }, { translateY: v.bobActive ? Math.sin(v.t * 2.1) * 8 : 0 }] }]}>
        <Image
          source={monsterAfter}
          style={[styles.monsterImg, { mixBlendMode: 'screen' } as any]}
          resizeMode="contain"
        />
      </View>

      {/* Layer 7: Purple pre-flash */}
      <View style={[StyleSheet.absoluteFill, { backgroundColor: '#6d28d9', opacity: v.purpleFlash }]} pointerEvents="none" />

      {/* Layer 8: White mega-flash */}
      <View style={[StyleSheet.absoluteFill, { backgroundColor: '#ffffff', opacity: v.whiteFlash }]} pointerEvents="none" />

      {/* Layer 9: EVOLVED! banner */}
      <View style={[styles.banner, { opacity: v.bannerOp }]} pointerEvents="none">
        <Text style={styles.bannerText}>EVOLVED!</Text>
      </View>

      {/* Layer 10: Continue CTA */}
      <View style={[styles.cta, { opacity: v.ctaOp }]}>
        <TouchableOpacity style={styles.ctaBtn} onPress={onComplete} activeOpacity={0.85}>
          <Text style={styles.ctaBtnText}>Continue</Text>
        </TouchableOpacity>
      </View>

    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    zIndex: 999,
  },
  monsterWrap: {
    position: 'absolute',
    left: CX - 150,
    width: 300,
    height: 300,
    alignItems: 'center',
    justifyContent: 'center',
  },
  monsterImg: {
    width: 300,
    height: 300,
  },
  monsterGlow: {
    position: 'absolute',
    left: CX - 200,
    top: MONSTER_Y - 300,
    width: 400,
    height: 500,
  },
  banner: {
    position: 'absolute',
    bottom: 210,
    left: 0,
    right: 0,
    alignItems: 'center',
  },
  bannerText: {
    fontSize: scale(56),
    fontFamily: 'Inter_900Black',
    color: '#C5F215',
    letterSpacing: -1.5,
  },
  cta: {
    position: 'absolute',
    bottom: 60,
    left: 24,
    right: 24,
  },
  ctaBtn: {
    backgroundColor: '#C5F215',
    borderRadius: 14,
    borderWidth: 2,
    borderColor: '#1A1A1A',
    padding: 16,
    alignItems: 'center',
  },
  ctaBtnText: {
    fontSize: scale(16),
    fontFamily: 'Inter_900Black',
    color: '#1A1A1A',
  },
});
